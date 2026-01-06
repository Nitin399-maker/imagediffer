# 🖼️ ImageDiff — Image Clone + Pixel Diff (Gemini “Nano Banana”)

A **single-page web app** that:
- 📤 uploads an image
- ✨ generates an AI clone Image
- 📊 runs pixel-wise diff + metrics (MAE/MSE/PSNR)
- 🧾 exports a JSON report (metrics + settings + images)

---

## ✨ Features

- 🧠 Multimodal clone generation with prompt presets
- 🧩 Model picker (recommended: `google/gemini-2.5-flash-image-preview` 🍌)
- 🎚️ Advanced settings: threshold, resize mode, ignore-white
- 🖼️ Three canvases: Original / Generated / Diff map
- 📈 Metrics: Total pixels, % different, MAE(R/G/B), MSE, PSNR
- 🧱 Error distribution bins with progress bars
- 📦 Export full report as **JSON** (includes base64 input + generated output)

---

## 🗂️ Project Structure

```
imagediff/
├─ index.html
├─ app.js
├─ utils.js
└─ README.md
```

- `index.html`: Bootstrap UI (upload, prompt, settings, canvases, metrics)
- `app.js`: model loading, clone call, compare pipeline, export
- `utils.js`: presets, bins, helpers (`$`, base64, spinner, image loader)

---

## ✅ Requirements

- 🌐 Modern browser (Chrome/Edge/Firefox)
- 🧪 Local static server (recommended for ES modules)

## 🚀 Run Locally

### Option A — Python

```bash
python -m http.server 8000
```

### Option B — Node

```bash
npx serve .
```

---

## 🔐 Configure API

Click **⚙️ Config API** and enter:
- 🔑 API key
- 🌍 Base URL (OpenRouter / LLM Foundry )
- 🧠 Choose a model from the dropdown


---

## 🧠 How Clone Generation Works

`app.js` sends:

- `POST {baseUrl}/chat/completions`
- `Authorization: Bearer {apiKey}`

Payload includes one **user** message with:
- 📝 prompt text
- 🖼️ `{ type: "image_url", image_url: { url: <base64-data-url> } }`

The app accepts output as either:
- ✅ `message.images[0].image_url.url`
- ✅ a `data:image/...` string in `message.content`

---

## 📊 Comparison + Export

- Comparison resizes both images using **Stretch / Contain / Crop**
- Diff heatmap marks pixels above threshold in red, else grayscale
- Export creates a downloadable `image-clone-report-<timestamp>.json` with:
  - prompt + model
  - settings
  - metrics + bins
  - input (base64) + output (url/data-url)



## 📜 License

Internal / demo use (update as needed).
