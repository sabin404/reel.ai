<div align="center">

# 🎬 Reel.ai

**Free, credit-less AI video generator that runs on your own computer.**

Describe a video → AI writes the animation → get a downloadable MP4/WebM.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Providers](https://img.shields.io/badge/AI-Gemini%20%7C%20OpenRouter-7c5cff)

<img src="images/screenshot.png" alt="Reel.ai screenshot" width="720">

</div>

---

## ✨ Features

- 🆓 **Free and credit-less**: use the free tiers of Gemini or OpenRouter
- 🔑 **Multiple API keys**: add and remove keys from the web UI
- 🔁 **Automatic fallback**: if a model fails or hits its limit, it switches to the next model, then the next key
- 🎞️ **Background rendering**: the AI code is rendered and recorded behind the scenes; you only see the finished video
- ⬇️ **One-click download** as MP4 or WebM
- 📦 **Zero dependencies**: just Node.js
- 🔒 **Private**: keys stay on your machine and the server listens on `127.0.0.1` only

## 🚀 Quick start

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO.git
cd YOUR-REPO
node server.js
```

Then open **http://localhost:3000** in Chrome or Edge.

1. Click **🔑 API keys** and add a free key
2. Type a prompt, choose size and length
3. Click **Generate** and download your video

## 🔑 Get a free API key

| Provider | Link | Note |
|---|---|---|
| Google Gemini | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) | Free tier |
| OpenRouter | [openrouter.ai/keys](https://openrouter.ai/keys) | Enable free models at [privacy settings](https://openrouter.ai/settings/privacy) |

## ⚙️ How it works

```
Prompt → Gemini / OpenRouter writes canvas code → rendered in a hidden canvas
       → recorded with MediaRecorder → video ready to download
```

## 🛠 Troubleshooting

| Problem | Fix |
|---|---|
| Stuck on "Imagining…" | Check the terminal: it prints a ✓ or ✗ for every model tried |
| "All keys/models failed" | Free quota used up, or the key doesn't match the provider. Wait or add another key |
| Black or empty video | Keep the browser tab visible while it renders |
| Can't reach the app | Make sure `node server.js` is still running |

## 📄 License

MIT. See [LICENSE](LICENSE).
