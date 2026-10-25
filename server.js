// Reel.ai local server — no dependencies. Needs Node 18+.  Run: node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const PORT=process.env.PORT||3000,KF=path.join(__dirname,'keys.json');
const load=()=>{try{return JSON.parse(fs.readFileSync(KF,'utf8'))}catch{return[]}};
const save=k=>fs.writeFileSync(KF,JSON.stringify(k,null,2));
const dead=new Map(),cool=new Map();           // temporary bans: bad keys / rate-limited models
const GEM=['gemini-2.5-flash','gemini-2.0-flash','gemini-2.5-flash-lite','gemini-flash-latest'];
const ORF=['deepseek/deepseek-chat-v3.1:free','meta-llama/llama-3.3-70b-instruct:free','qwen/qwen3-coder:free','openai/gpt-oss-20b:free'];
let orCache={t:0,list:[]};
async function orModels(){                      // keep OpenRouter's free list fresh automatically
  if(Date.now()-orCache.t<36e5&&orCache.list.length)return orCache.list;
  try{
    const j=await(await fetch('https://openrouter.ai/api/v1/models',{signal:AbortSignal.timeout(8000)})).json();
    const pref=n=>{const i=['coder','deepseek','gpt-oss','qwen','llama','gemini','glm'].findIndex(w=>n.includes(w));return i<0?99:i};
    const l=j.data.map(m=>m.id).filter(id=>/:free$/.test(id)).sort((a,b)=>pref(a)-pref(b)).slice(0,8);
    if(l.length){orCache={t:Date.now(),list:l};return l}
  }catch{}
  return ORF;
}
async function call(k,model,system,msg){
  let r;
  if(k.provider==='gemini'){
    r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(k.key)}`,{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),
      body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:msg}]}],generationConfig:{maxOutputTokens:16384,...(/2\.5-flash/.test(model)?{thinkingConfig:{thinkingBudget:0}}:{})}})});
  }else{
    r=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+k.key},signal:AbortSignal.timeout(45000),
      body:JSON.stringify({model,max_tokens:8000,messages:[{role:'system',content:system},{role:'user',content:msg}]})});
  }
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error){const e=new Error(j.error?.message||('HTTP '+r.status));e.status=r.status;throw e}
  const t=k.provider==='gemini'?(j.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join(''):(j.choices?.[0]?.message?.content||'');
  if(!t.trim())throw new Error('Empty response');
  return t;
}
function clean(t){
  const m=t.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);t=(m?m[1]:t.replace(/```\w*/g,'')).trim();
  if(!/function\s+draw|draw\s*=/.test(t))throw new Error('No draw() function in reply');
  return t;
}
async function generate(system,msg,emit=()=>{}){
  const keys=load().filter(k=>k.enabled!==false);
  if(!keys.length)return[400,{error:'NOKEYS'}];
  const fails=[];
  for(const k of keys){                          // 1) next key  2) next model — all automatic
    if((dead.get(k.id)||0)>Date.now()){fails.push((k.label||k.provider)+': key rejected');continue}
    const models=k.provider==='gemini'?GEM:await orModels();
    for(const m of models){
      if((cool.get(k.id+m)||0)>Date.now())continue;
      try{const code=clean(await call(k,m,system,msg));console.log('✓',k.provider,m);return[200,{code,via:k.provider+'/'+m}]}
      catch(e){
        console.log('✗',k.provider,m,String(e.message).slice(0,100));
        fails.push(k.provider+'/'+m.split('/').pop()+': '+String(e.message).slice(0,70));emit({switch:1});
        if(e.status===401||(k.provider==='gemini'&&e.status===403)||/api key not valid|invalid api key/i.test(e.message)){dead.set(k.id,Date.now()+6e5);break}
        if(e.status===429)cool.set(k.id+m,Date.now()+6e4);
      }
    }
  }
  return[502,{error:'All keys/models failed → '+fails.slice(0,4).join(' | ')}];
}
const body=req=>new Promise(r=>{let b='';req.on('data',c=>b+=c);req.on('end',()=>{try{r(JSON.parse(b||'{}'))}catch{r({})}})});
const send=(res,s,o)=>{res.writeHead(s,{'Content-Type':'application/json'});res.end(JSON.stringify(o))};
http.createServer(async(req,res)=>{
  const u=req.url.split('?')[0];
  try{
    if(req.method==='GET'&&u==='/api/keys')return send(res,200,load().map(k=>({id:k.id,provider:k.provider,label:k.label,masked:k.key.slice(0,4)+'…'+k.key.slice(-4),status:(dead.get(k.id)||0)>Date.now()?'rejected':'ok'})));
    if(req.method==='POST'&&u==='/api/keys'){
      const b=await body(req);if(!b.key||!['gemini','openrouter'].includes(b.provider))return send(res,400,{error:'bad request'});
      const ks=load();ks.push({id:crypto.randomUUID().slice(0,8),provider:b.provider,key:String(b.key).trim(),label:String(b.label||'').slice(0,40)});save(ks);return send(res,200,{ok:1});
    }
    if(req.method==='DELETE'&&u.startsWith('/api/keys/')){save(load().filter(k=>k.id!==u.split('/').pop()));return send(res,200,{ok:1})}
    if(req.method==='POST'&&u==='/api/generate'){const b=await body(req);res.writeHead(200,{'Content-Type':'application/x-ndjson'});const ping=setInterval(()=>res.write('{"ping":1}\n'),4000);const[st,o]=await generate(String(b.system||''),String(b.msg||''),ev=>res.write(JSON.stringify(ev)+'\n'));clearInterval(ping);return res.end(JSON.stringify({final:1,status:st,...o})+'\n')}
    if(req.method==='GET'&&(u==='/'||u==='/index.html')){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,'public','index.html')))}
    send(res,404,{error:'not found'});
  }catch(e){send(res,500,{error:String(e.message)})}
}).listen(PORT,'127.0.0.1',()=>console.log('\n  Reel.ai running →  http://localhost:'+PORT+'\n'));
