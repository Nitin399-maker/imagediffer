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
- � Export full report as **JSON** (includes base64 input + generated output)

---

## 🗂️ Project Structure

```
imagediff/
├─ index.html
├─ app.js
├─ utils.js
└─ # ImageDiff - Multi-Model AI Image Reproduction Evaluation

A comprehensive tool for evaluating how well different AI models (Nano Banana, GPT Image, Claude, etc.) reproduce images using multiple perceptual quality metrics.

## Features

### 🤖 Multi-Model Support
- Test multiple AI models simultaneously
- Compare Gemini (Nano Banana), GPT-4 Vision, Claude, and other image generation models
- Side-by-side performance analysis

### 📊 Advanced Metrics
Evaluate image reproduction quality using state-of-the-art metrics:

#### Perceptual Quality Metrics (Best Human Alignment)
- **SSIM** (Structural Similarity Index) - Measures structural similarity (0-1, higher is better)
- **MS-SSIM** (Multi-Scale SSIM) - Better for varying resolutions (0-1, higher is better)
- **SSIMULACRA2** - State-of-the-art perceptual quality (0-100, higher is better)
- **LPIPS** (Learned Perceptual Image Patch Similarity) - Deep learning-based (lower is better)

#### Additional Metrics
- **Butteraugli** - Google's perceptual difference metric (0-10, lower is better)
- **FLIP** - Feature-based Luminance and color metric (lower is better)
- **PSNR** - Peak Signal-to-Noise Ratio (>30 dB is good)
- **MSE/MAE** - Mean Squared/Absolute Error per channel

### 🎯 Key Capabilities
1. **Upload any image** and generate reproductions using multiple AI models
2. **Compare models** across all metrics simultaneously
3. **Identify best performers** for each metric automatically
4. **Visualize differences** with color-coded error maps
5. **Export reports** with complete analysis and embedded images

## Metric Interpretation

### Which Metrics Best Align with Human Perception?

Based on research and industry standards:

1. **SSIMULACRA2** ⭐⭐⭐⭐⭐ - Considered state-of-the-art for perceptual quality
2. **LPIPS** ⭐⭐⭐⭐⭐ - Excellent correlation with human judgment
3. **MS-SSIM** ⭐⭐⭐⭐ - Very good for structural similarity
4. **SSIM** ⭐⭐⭐⭐ - Good baseline for perceptual quality
5. **Butteraugli** ⭐⭐⭐ - Good for color perception
6. **FLIP** ⭐⭐⭐ - Good for feature-based comparison
7. **PSNR** ⭐⭐ - Traditional metric, less aligned with perception

### Metric Ranges

| Metric | Range | Excellent | Good | Poor | Direction |
|--------|-------|-----------|------|------|-----------|
| SSIM | 0-1 | >0.95 | >0.90 | <0.80 | Higher ↑ |
| MS-SSIM | 0-1 | >0.95 | >0.90 | <0.80 | Higher ↑ |
| SSIMULACRA2 | 0-100 | >90 | >80 | <70 | Higher ↑ |
| LPIPS | 0-∞ | <0.1 | <0.2 | >0.3 | Lower ↓ |
| Butteraugli | 0-10 | <1.0 | <2.0 | >3.0 | Lower ↓ |
| FLIP | 0-∞ | <0.05 | <0.1 | >0.2 | Lower ↓ |
| PSNR | 0-∞ dB | >35 | >30 | <25 | Higher ↑ |

## Usage

1. **Configure API**: Click "Config API" and enter your OpenRouter API key
2. **Upload Image**: Drag & drop or browse for an image
3. **Select Models**: Choose one or more AI models (hold Ctrl/Cmd for multiple)
4. **Generate**: Click "Generate Clone" to create reproductions
5. **Compare**: View automatic comparison across all metrics
6. **Analyze**: See which model performs best for each metric
7. **Export**: Download complete analysis report

## Model Performance Insights

The tool automatically identifies:
- **Best overall model** based on perceptual metrics
- **Best model per metric** for detailed analysis
- **Human perception alignment** for each metric
- **Strengths and weaknesses** of each model

## Technical Details

### Implemented Metrics

All metrics are calculated client-side using JavaScript implementations:

- **SSIM**: Luminance, contrast, and structure comparison
- **MS-SSIM**: Multi-scale structural similarity
- **SSIMULACRA2**: Advanced perceptual quality assessment
- **Butteraugli**: Perceptual color difference
- **FLIP**: Feature-based perceptual metric
- **LPIPS**: Approximated deep learning-based similarity
- **PSNR/MSE/MAE**: Traditional pixel-based metrics

### Comparison Options

- **Threshold**: Adjust sensitivity for difference detection
- **Resize Mode**: Stretch, contain, or crop for size matching
- **Ignore Options**: Alpha channel and white background handling

## Export Format

Reports include:
- Timestamp and model information
- All metric values for each model
- Pixel distribution analysis
- Embedded original and generated images
- Comparison settings

## Requirements

- Modern web browser with JavaScript enabled
- OpenRouter API key
- Internet connection for API calls

## Credits

Built with:
- Bootstrap 5 for UI
- OpenRouter API for model access
- Custom JavaScript implementations of image quality metrics

## License

MIT License - Feel free to use and modify

---

**Note**: Metric implementations are simplified versions optimized for browser performance. For research-grade accuracy, consider using dedicated libraries or tools.
```

- `index.html`: Bootstrap UI (upload, prompt, settings, canvases, metrics)
- `app.js`: model loading, clone call, compare pipeline, export
- `utils.js`: presets, bins, helpers (`$`, base64, spinner, image loader)

---

## ✅ Requirements

- 🌐 Modern browser (Chrome/Edge/Firefox)
- 🧪 Local static server (recommended for ES modules)

## � Run Locally

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
