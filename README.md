# 🖼️ ImageDiff — Multi-Model AI Image Reproduction Evaluation

A **powerful single-page web application** for evaluating how well different AI models reproduce images using advanced perceptual quality metrics. Compare Gemini 2.5 Flash, GPT Image models, and more with state-of-the-art image similarity algorithms.

---

## ✨ Key Features

### 🤖 Dual API Support
- **OpenRouter API**: Access to Gemini 2.5 Flash Image Preview (recommended)
- **OpenAI API**: GPT Image models (gpt-image-1.5, chatgpt-image-latest, gpt-image-1, gpt-image-1-mini)
- Automatic model filtering and intelligent selection
- Batch processing: test multiple models simultaneously

### 📊 Advanced Perceptual Metrics
State-of-the-art image quality assessment with 8 metrics:

#### Best Human Perception Alignment ⭐⭐⭐⭐⭐
- **SSIM** (Structural Similarity) - 0-1, higher is better (>0.95 excellent)
- **MS-SSIM** (Multi-Scale SSIM) - 0-1, higher is better (>0.95 excellent)
- **SSIMULACRA2** - 0-100, higher is better (>90 excellent) - *State-of-the-art*
- **LPIPS** (Learned Perceptual) - Lower is better (<0.1 excellent)

#### Additional Quality Metrics
- **Butteraugli** - 0-10, lower is better (<1.0 excellent)
- **FLIP** - Feature-based metric, lower is better (<0.05 excellent)
- **PSNR** - Peak Signal-to-Noise Ratio, >30 dB is good
- **MAE/MSE** - Mean Absolute/Squared Error per RGB channel

### 🎯 Smart Comparison Features
1. **Multi-model batch processing** - Test up to 5+ models at once
2. **Automatic best model identification** - Per metric and overall
3. **Visual difference maps** - Color-coded error heatmaps
4. **Distribution analysis** - 7-bin error histogram with percentages
5. **Demo sessions** - Pre-configured test cases with auto-load

### 🎨 User Experience
- **Drag-and-drop** image upload with instant preview
- **Three prompt presets**: Pixel-Perfect, High-Fidelity, Deterministic
- **Adjustable threshold** slider (0-50) for difference sensitivity
- **Responsive Bootstrap 5** UI with dark mode support
- **Auto-comparison** on demo load for instant results

---

## 📁 Project Structure

```
imagediffer/
├── index.html          # Bootstrap 5 UI with 349 lines
├── app.js              # Main logic (~440 lines, optimized)
├── utils.js            # Utilities & metrics (~491 lines)
├── config.json         # Demo session configurations
└── images/             # Generated/demo images storage
```

### File Responsibilities
- **index.html**: Upload zone, model selection, metrics display, comparison tables
- **app.js**: API calls, state management, batch processing, DOM updates
- **utils.js**: Metric calculations (SSIM, LPIPS, etc.), HTML generators, helpers

---

## 🚀 Quick Start

### 1. Run Local Server

**Python:**
```bash
python -m http.server 8000
# Open http://localhost:8000
```

**Node.js:**
```bash
npx serve .
# Open http://localhost:3000
```

**VS Code:**
- Install "Live Server" extension
- Right-click `index.html` → "Open with Live Server"

### 2. Configure APIs

Click **⚙️ Config API** button and enter:

**OpenRouter (for Gemini models):**
- Base URL: `https://openrouter.ai/api/v1`
- API Key: Get from [openrouter.ai](https://openrouter.ai)

**OpenAI (for GPT Image models):**
- Base URL: `https://api.openai.com/v1`
- API Key: Get from [platform.openai.com](https://platform.openai.com)

*You can configure one or both APIs depending on which models you want to use.*

### 3. Generate & Compare

1. **Upload** an image (drag & drop or browse)
2. **Select** one or more AI models from checkboxes
3. **Choose** a prompt preset or write your own
4. **Click** "Generate Clone" for batch processing
5. **View** automatic comparison across all metrics
6. **Analyze** which model performs best

---

## 📊 Understanding the Metrics

### Human Perception Alignment Ranking

1. **SSIMULACRA2** ⭐⭐⭐⭐⭐ - State-of-the-art, best overall
2. **LPIPS** ⭐⭐⭐⭐⭐ - Deep learning-based, excellent correlation
3. **MS-SSIM** ⭐⭐⭐⭐ - Multi-scale structural analysis
4. **SSIM** ⭐⭐⭐⭐ - Robust structural similarity
5. **Butteraugli** ⭐⭐⭐ - Google's perceptual difference
6. **FLIP** ⭐⭐⭐ - Feature-based luminance/color
7. **PSNR** ⭐⭐ - Traditional, less perceptual

### Metric Reference Table

| Metric | Range | Excellent | Good | Poor | Better |
|--------|-------|-----------|------|------|--------|
| SSIM | 0-1 | >0.95 | >0.90 | <0.80 | Higher ↑ |
| MS-SSIM | 0-1 | >0.95 | >0.90 | <0.80 | Higher ↑ |
| SSIMULACRA2 | 0-100 | >90 | >80 | <70 | Higher ↑ |
| LPIPS | 0-∞ | <0.1 | <0.2 | >0.3 | Lower ↓ |
| Butteraugli | 0-10 | <1.0 | <2.0 | >3.0 | Lower ↓ |
| FLIP | 0-∞ | <0.05 | <0.1 | >0.2 | Lower ↓ |
| PSNR | dB | >35 | >30 | <25 | Higher ↑ |

---

## 🎯 Use Cases

### Research & Evaluation
- Compare AI model image generation quality
- Benchmark new models against established ones
- Validate perception-aligned metrics vs traditional metrics

### Quality Assurance
- Test image processing pipelines
- Verify compression/encoding quality
- Detect visual degradation

### Model Selection
- Choose the best AI model for your use case
- Understand model strengths per metric
- Make data-driven decisions

---

## 🔧 Technical Implementation

### Dual API Architecture
```javascript
// OpenRouter API (Gemini models)
POST https://openrouter.ai/api/v1/chat/completions
{
  model: "google/gemini-2.5-flash-image-preview",
  messages: [{ role: "user", content: [text, image_url] }]
}

// OpenAI API (GPT Image models)
POST https://api.openai.com/v1/images/edits
FormData: { model, prompt, image, n: 1 }
```

### Client-Side Metric Calculations
All metrics computed in browser using Canvas API:
- **SSIM**: Luminance × Contrast × Structure comparison
- **MS-SSIM**: 5-level Gaussian pyramid analysis
- **SSIMULACRA2**: Frequency-domain perceptual modeling
- **Butteraugli**: XYB color space + psychovisual masking
- **FLIP**: Multi-scale luminance & chrominance difference
- **LPIPS**: Approximated VGG-style feature distance

### Performance Optimizations
- DOM caching for frequent elements
- Batch Promise.allSettled for parallel model calls
- Inline function calls (bootstrapAlert)
- Condensed event listeners
- Helper function extraction

---

## 🎨 Prompt Engineering

### Built-in Presets

**Pixel-Perfect** (Default):
```
Recreate the provided image EXACTLY:
- Same resolution and aspect ratio
- Same colors, lighting, composition
- No stylization, no creativity, no cleanup
- Output should be the closest possible pixel-level match
```

**High-Fidelity**:
```
Generate a high-fidelity reproduction:
- Preserve all visual details with maximum accuracy
- Maintain exact color values and tonal ranges
- No artistic interpretation or modifications
```

**Deterministic**:
```
Image replication engine with:
- Zero creativity or artistic license
- Deterministic pixel-by-pixel reproduction
- Exact color matching and spatial accuracy
```

---

## 📦 Demo Sessions

Load pre-configured test scenarios with:
- Original image
- Multiple model outputs
- Pre-calculated metrics
- Threshold settings

**Auto-behavior**: Clicking a demo card automatically triggers comparison after 100ms delay.

---

## 🛠️ Configuration Storage

API keys stored in browser's `localStorage`:
```javascript
{
  openrouter: { baseUrl, apiKey },
  openai: { baseUrl, apiKey }
}
```

*Keys never leave your browser - all API calls direct from client.*

---

## 🎓 Model Insights

### Recommended Model
**google/gemini-2.5-flash-image-preview** 🍌
- Fast inference speed
- Good perceptual quality
- Excellent for batch comparisons

### Excluded Models
- Gemini 3 Pro variants (filtered out via regex)

### Available GPT Models
- gpt-image-1.5
- chatgpt-image-latest
- gpt-image-1
- gpt-image-1-mini

---

## 📋 Requirements

- **Browser**: Modern Chrome/Edge/Firefox with ES6 module support
- **APIs**: OpenRouter and/or OpenAI API keys
- **Server**: Static file server for local development
- **Connection**: Internet access for API calls

---

## 🤝 Credits & Technologies

**UI Framework**: Bootstrap 5.3.0 with dark theme support  
**Icons**: Bootstrap Icons 1.11.3  
**API Providers**: OpenRouter, OpenAI  
**Metric Implementations**: Custom JavaScript (client-side)  
**Architecture**: ES6 Modules, Promise-based async operations

---

## 📜 License

MIT License - Free to use and modify for personal and commercial projects.

---

## 🔬 Research Note

Metric implementations are optimized for browser performance. For research-grade accuracy in academic settings, consider using dedicated libraries like:
- Python: `scikit-image`, `pytorch-msssim`, `lpips`
- MATLAB: Image Processing Toolbox
- Command-line: `butteraugli`, `flip`

**This tool is ideal for**: Rapid prototyping, model comparison, visual QA, and educational purposes.

---

## 📞 Support

For issues or questions:
1. Check browser console for errors
2. Verify API key configuration
3. Ensure CORS is properly handled
4. Test with demo sessions first

**Tip**: Use browser DevTools Network tab to inspect API requests/responses.

---

**Last Updated**: January 2026  
**Version**: 2.0 (Optimized, Dual API, Multi-Metric)
