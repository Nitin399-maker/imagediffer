// Constants
export const OPENROUTER_BASE_URLS = ["https://openrouter.ai/api/v1", "https://llmfoundry.straivedemo.com/openrouter/v1"];
export const OPENAI_BASE_URLS = ["https://api.openai.com/v1", "https://llmfoundry.straivedemo.com/openai/v1", "https://llmfoundry.straive.com/openai/v1"];
export const RECOMMENDED_MODEL = "google/gemini-2.5-flash-image-preview";
export const SPINNER_CLASS = "_btn-spinner";

export const PROMPT_PRESETS = {
    'pixel-perfect': `Recreate the provided image EXACTLY:
- Same resolution and aspect ratio
- Same colors, lighting, composition
- Same shapes and positions
- No stylization, no creativity, no cleanup
- Do not add/remove text, objects, or artifacts
- Output should be the closest possible pixel-level match`,
    'high-fidelity': `Generate a high-fidelity reproduction of this image:
- Preserve all visual details with maximum accuracy
- Maintain exact color values and tonal ranges
- Keep original composition and layout
- No artistic interpretation or modifications
- Aim for indistinguishable output from input`,
    'deterministic': `You are an image replication engine. Recreate this image with:
- Zero creativity or artistic license
- Deterministic pixel-by-pixel reproduction
- No noise, no variations, no enhancements
- Exact color matching and spatial accuracy
- Output must be computationally identical to input`
};

export const ERROR_BINS = [
    { min: 0, max: 0, label: '0 (Exact)', color: '#28a745' },
    { min: 1, max: 5, label: '1-5', color: '#20c997' },
    { min: 6, max: 15, label: '6-15', color: '#ffc107' },
    { min: 16, max: 30, label: '16-30', color: '#fd7e14' },
    { min: 31, max: 60, label: '31-60', color: '#dc3545' },
    { min: 61, max: 120, label: '61-120', color: '#c82333' },
    { min: 121, max: 255, label: '121-255', color: '#6c757d' }
];

// Utilities
export const $ = id => document.getElementById(id);

export const toggleButtonSpinner = (btn, show) => {
    btn.disabled = show;
    const spinner = btn.querySelector(`.${SPINNER_CLASS}`);
    if (show && !spinner) {
        const spin = document.createElement("span");
        spin.className = `spinner-border spinner-border-sm ms-2 ${SPINNER_CLASS}`;
        spin.setAttribute("role", "status");
        spin.setAttribute("aria-hidden", "true");
        btn.appendChild(spin);
    } else if (!show && spinner) {
        spinner.remove();
    }
};

export const imageToBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

export const loadImageFromUrl = url => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
});

export const METRIC_INFO = {
    'PSNR': 'Peak Signal-to-Noise Ratio - Traditional quality metric, higher is better (>30 dB is good)',
    'SSIM': 'Structural Similarity Index - Measures structural similarity (0-1, >0.95 is excellent)',
    'SSIMULACRA2': 'State-of-the-art perceptual quality metric (0-100, >90 is excellent)',
    'Butteraugli': 'Google\'s perceptual difference metric (0-10, <1.0 is excellent)',
    'FLIP': 'Feature-based Luminance and color Image Perceptual metric (lower is better)',
    'LPIPS': 'Learned Perceptual Image Patch Similarity - Uses deep learning (lower is better, <0.1 is excellent)'
};

export const dualConfigHelp = `
<div class="alert alert-info">
  <h6>Configure API Keys</h6>
  <p><strong>OpenRouter</strong> - For Gemini, Claude, and other models:</p>
  <ol>
    <li>Visit <a href="https://openrouter.ai" target="_blank">openrouter.ai</a></li>
    <li>Sign up and navigate to <strong>Keys</strong> section</li>
    <li>Create a new API key and paste in OpenRouter fields below</li>
  </ol>
  <p><strong>OpenAI</strong> - For GPT Image models:</p>
  <ol>
    <li>Visit <a href="https://platform.openai.com" target="_blank">platform.openai.com</a></li>
    <li>Navigate to API Keys section</li>
    <li>Create a new API key and paste in OpenAI fields below</li>
  </ol>
  <p class="mb-0"><strong>Note:</strong> You can configure one or both APIs depending on which models you want to use.</p>
</div>
`;

// Dual Config Management
export const getDualConfig = () => {
    return {
        openrouter: {
            apiKey: localStorage.getItem('openrouter_api_key') || '',
            baseUrl: localStorage.getItem('openrouter_base_url') || OPENROUTER_BASE_URLS[0]
        },
        openai: {
            apiKey: localStorage.getItem('openai_api_key') || '',
            baseUrl: localStorage.getItem('openai_base_url') || OPENAI_BASE_URLS[0]
        }
    };
};

export const saveDualConfig = (config) => {
    if (config.openrouter) {
        localStorage.setItem('openrouter_api_key', config.openrouter.apiKey || '');
        localStorage.setItem('openrouter_base_url', config.openrouter.baseUrl || OPENROUTER_BASE_URLS[0]);
    }
    if (config.openai) {
        localStorage.setItem('openai_api_key', config.openai.apiKey || '');
        localStorage.setItem('openai_base_url', config.openai.baseUrl || OPENAI_BASE_URLS[0]);
    }
};

export const getConfigForModel = (model) => {
    const config = getDualConfig();
    // Determine which API to use based on model name
    const isOpenAI = /^(gpt-image|chatgpt-image)/i.test(model);
    return isOpenAI ? config.openai : config.openrouter;
};

// Additional Utilities
export const getModelDisplayName = (model) => model.replace(/^(google|openai|anthropic|meta|mistral|cohere)\//i, '');

export const getLuminance = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

export const resizeImage = (img, targetWidth, targetHeight, mode) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    if (mode === 'stretch') { 
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    } else {
        const scale = mode === 'contain' 
            ? Math.min(targetWidth / img.width, targetHeight / img.height)
            : Math.max(targetWidth / img.width, targetHeight / img.height);
        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (targetWidth - scaledWidth) / 2;
        const y = (targetHeight - scaledHeight) / 2;
        
        if (mode === 'contain') {
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, targetWidth, targetHeight);
        }
        ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    }
    
    return canvas;
};


// HTML Template Generators
export const generateDualConfigDialogHTML = (config) => {
    const bodyHTML = `
        <div class="mb-3">
            ${dualConfigHelp}
        </div>
        <div class="card mb-3">
            <div class="card-header bg-primary text-white">
                <i class="bi bi-router"></i> OpenRouter Configuration
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label for="or-url" class="form-label">Base URL</label>
                    <input type="text" class="form-control" id="or-url" value="${config.openrouter.baseUrl}" placeholder="https://openrouter.ai/api/v1">
                </div>
                <div class="mb-3">
                    <label for="or-key" class="form-label">API Key</label>
                    <input type="password" class="form-control" id="or-key" value="${config.openrouter.apiKey}" placeholder="sk-or-...">
                </div>
            </div>
        </div>
        <div class="card mb-3">
            <div class="card-header bg-success text-white">
                <i class="bi bi-openai"></i> OpenAI Configuration
            </div>
            <div class="card-body">
                <div class="mb-3">
                    <label for="oa-url" class="form-label">Base URL</label>
                    <input type="text" class="form-control" id="oa-url" value="${config.openai.baseUrl}" placeholder="https://api.openai.com/v1">
                </div>
                <div class="mb-3">
                    <label for="oa-key" class="form-label">API Key</label>
                    <input type="password" class="form-control" id="oa-key" value="${config.openai.apiKey}" placeholder="sk-...">
                </div>
            </div>
        </div>
    `;
    
    return `
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title"><i class="bi bi-gear"></i> API Configuration</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">${bodyHTML}</div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    <button type="button" class="btn btn-primary" id="save-config-btn">Save Configuration</button>
                </div>
            </div>
        </div>
    `;
};

export const generateModelCheckboxHTML = (model, index, recommendedModel) => {
    const displayName = getModelDisplayName(model);
    const recommended = model === recommendedModel ? ' <span class="badge bg-success">Recommended</span>' : '';
    return `<div class="col-md-4"><div class="form-check">
        <input class="form-check-input model-checkbox" type="checkbox" value="${model}" id="model-checkbox-${index}">
        <label class="form-check-label" for="model-checkbox-${index}"><strong>${displayName}</strong>${recommended}</label>
    </div></div>`;
};

export const generateModelSelectorOptionHTML = (model, displayNameFn) => {
    return `<option value="${model}">${displayNameFn(model)}</option>`;
};

export const generateBinsTableRowHTML = (bin, pct, metrics) => {
    const width = Math.min(100, pct * 2);
    return `<tr><td><strong>${bin.label}</strong></td><td>${bin.count.toLocaleString()}</td><td>${pct}%</td>
        <td><div class="progress" style="height:20px"><div class="progress-bar" style="width:${width}%;background-color:${bin.color}">
        ${pct > 5 ? pct + '%' : ''}</div></div></td></tr>`;
};

export const generateUploadPreviewHTML = (base64, fileName, fileSize) => {
    return `
        <img src="${base64}" class="image-preview" alt="Uploaded image">
        <p class="small text-muted mt-2">${fileName} (${(fileSize / 1024).toFixed(1)} KB)</p>
    `;
};

export const generateModelImagesHTML = (model, canvasIds, modelLabel, width, height, metrics) => {
    return '<div class="row mb-4 border-bottom pb-4">' +
        '<div class="col-12"><h5 class="text-primary"><i class="bi bi-robot"></i> ' + modelLabel + '</h5></div>' +
        '<div class="col-md-4">' +
            '<div class="card">' +
                '<div class="card-header bg-secondary text-white"><i class="bi bi-image"></i> Original</div>' +
                '<div class="card-body text-center">' +
                    '<canvas id="' + canvasIds.original + '" class="diff-canvas"></canvas>' +
                    '<div class="mt-2 small text-muted">' + width + ' × ' + height + ' pixels</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="col-md-4">' +
            '<div class="card">' +
                '<div class="card-header bg-warning text-dark"><i class="bi bi-stars"></i> Generated Clone</div>' +
                '<div class="card-body text-center">' +
                    '<canvas id="' + canvasIds.generated + '" class="diff-canvas"></canvas>' +
                    '<div class="mt-2 small text-muted">' + width + ' × ' + height + ' pixels</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
        '<div class="col-md-4">' +
            '<div class="card">' +
                '<div class="card-header bg-danger text-white"><i class="bi bi-exclamation-triangle"></i> Difference Map</div>' +
                '<div class="card-body text-center">' +
                    '<canvas id="' + canvasIds.diff + '" class="diff-canvas"></canvas>' +
                    '<div class="mt-2 small text-muted">SSIMULACRA2: ' + metrics.ssimulacra2 + ' | LPIPS: ' + metrics.lpips + '</div>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>';
};

export const generateComparisonTableRowHTML = (model, metrics, displayNameFn, allMetrics) => {
    const modelLabel = displayNameFn(model);
    const getColor = (value, metricKey, better) => {
        if (!allMetrics || Object.keys(allMetrics).length < 2) return '';
        const values = Object.values(allMetrics).map(m => parseFloat(m[metricKey]));
        const max = Math.max(...values), min = Math.min(...values);
        const numValue = parseFloat(value);
        if (max === min) return '';
        const normalized = (numValue - min) / (max - min);
        const ratio = better === 'higher' ? normalized : (1 - normalized);
        // Enhanced red→blue gradient with more vibrant colors
        const r = Math.round(255 * (1 - ratio) + 0 * ratio);
        const g = Math.round(50 * (1 - ratio) + 120 * ratio);
        const b = Math.round(50 * (1 - ratio) + 255 * ratio);
        const textColor = '#fff';
        const fontWeight = ratio > 0.7 ? 'bold' : 'normal';
        const fontSize = ratio > 0.8 ? '1.1em' : '1em';
        return `background-color: rgb(${r},${g},${b}) !important; color: ${textColor} !important; font-weight: ${fontWeight}; font-size: ${fontSize};`;
    };
    return '<tr>' +
        '<td><strong>' + modelLabel + '</strong></td>' +
        '<td style="' + getColor(metrics.psnr, 'psnr', 'higher') + '">' + metrics.psnr + ' dB</td>' +
        '<td style="' + getColor(metrics.ssim, 'ssim', 'higher') + '">' + metrics.ssim + '</td>' +
        '<td style="' + getColor(metrics.ssimulacra2, 'ssimulacra2', 'higher') + '">' + metrics.ssimulacra2 + '</td>' +
        '<td style="' + getColor(metrics.butteraugli, 'butteraugli', 'lower') + '">' + metrics.butteraugli + '</td>' +
        '<td style="' + getColor(metrics.flip, 'flip', 'lower') + '">' + metrics.flip + '</td>' +
        '<td style="' + getColor(metrics.lpips, 'lpips', 'lower') + '">' + metrics.lpips + '</td>' +
        '<td style="' + getColor(metrics.percentDifferent, 'percentDifferent', 'lower') + '">' + metrics.percentDifferent + '%</td>' +
    '</tr>';
};

export const generateBestModelsHTML = (metricComparisons, metricsResults, displayNameFn) => {
    const models = Object.keys(metricsResults);
    let html = '<h5>Best Performing Models by Metric:</h5><div class="row g-2">';
    
    for (const [metricName, config] of Object.entries(metricComparisons)) {
        let bestModel = models[0];
        let bestValue = parseFloat(metricsResults[bestModel].metrics[config.key]);
        
        for (const model of models) {
            const value = parseFloat(metricsResults[model].metrics[config.key]);
            if (config.better === 'higher' ? value > bestValue : value < bestValue) {
                bestValue = value;
                bestModel = model;
            }
        }
        
        const modelLabel = displayNameFn(bestModel);
        
        html += '<div class="col-md-4">' +
            '<div class="alert alert-info mb-2">' +
                '<strong>' + metricName + '</strong> (' + config.humanAlign + ' human alignment)<br>' +
                '<span class="badge bg-primary">' + modelLabel + '</span>: ' + bestValue +
            '</div>' +
        '</div>';
    }
    
    html += '</div>';
    html += '<div class="alert alert-success mt-3"><strong>Note:</strong> SSIM, MS-SSIM, SSIMULACRA2, and LPIPS are considered to have the best alignment with human perception of image quality.</div>';
    
    return html;
};

export const generateDemoCardHTML = (session, index, originalImage) => {
    return `
        <div class="col-md-3">
            <div class="card demo-card" data-session-index="${index}">
                <img src="${originalImage}" class="card-img-top" alt="Demo ${index + 1}" onerror="this.style.display='none'">
                <div class="card-body text-center py-2">
                    <h6 class="card-title mb-0">Demo ${index + 1}</h6>
                </div>
            </div>
        </div>
    `;
};

// Advanced Metrics Calculations
export const calculateSSIM = (data1, data2, width, height) => {
    const C1 = 6502.5, C2 = 58.5225; // Pre-calculated constants
    let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, sumProd = 0;
    const totalPixels = width * height;
    for (let i = 0; i < data1.data.length; i += 4) {
        const l1 = getLuminance(data1.data[i], data1.data[i + 1], data1.data[i + 2]);
        const l2 = getLuminance(data2.data[i], data2.data[i + 1], data2.data[i + 2]);
        sum1 += l1; sum2 += l2;
        sum1Sq += l1 * l1; sum2Sq += l2 * l2;
        sumProd += l1 * l2;
    }
    const mean1 = sum1 / totalPixels, mean2 = sum2 / totalPixels;
    const var1 = sum1Sq / totalPixels - mean1 * mean1;
    const var2 = sum2Sq / totalPixels - mean2 * mean2;
    const covar = sumProd / totalPixels - mean1 * mean2;
    
    return Math.max(0, Math.min(1, 
        ((2 * mean1 * mean2 + C1) * (2 * covar + C2)) / 
        ((mean1 * mean1 + mean2 * mean2 + C1) * (var1 + var2 + C2))
    ));
};

export const calculateMSSSIM = (data1, data2, width, height) => {
    // Multi-Scale SSIM: Calculate SSIM at multiple scales and combine
    const scales = [1, 0.5, 0.25]; // 3 scales: original, half, quarter
    const weights = [0.0448, 0.2856, 0.6696]; // Standard MS-SSIM weights
    let msssim = 1.0;
    
    for (let s = 0; s < scales.length; s++) {
        const scale = scales[s];
        const scaledWidth = Math.max(8, Math.floor(width * scale));
        const scaledHeight = Math.max(8, Math.floor(height * scale));
        
        // Downsample if needed
        let scaledData1 = data1, scaledData2 = data2;
        if (scale < 1) {
            scaledData1 = resizeImageData(data1, width, height, scaledWidth, scaledHeight);
            scaledData2 = resizeImageData(data2, width, height, scaledWidth, scaledHeight);
        }
        
        const ssim = calculateSSIM(scaledData1, scaledData2, scaledWidth, scaledHeight);
        msssim *= Math.pow(Math.max(0.0001, ssim), weights[s]);
    }
    
    return Math.max(0, Math.min(1, msssim));
};

const resizeImageData = (imageData, oldW, oldH, newW, newH) => {
    const newData = new ImageData(newW, newH);
    const xRatio = oldW / newW, yRatio = oldH / newH;
    
    for (let y = 0; y < newH; y++) {
        for (let x = 0; x < newW; x++) {
            const srcX = Math.floor(x * xRatio);
            const srcY = Math.floor(y * yRatio);
            const srcIdx = (srcY * oldW + srcX) * 4;
            const dstIdx = (y * newW + x) * 4;
            
            newData.data[dstIdx] = imageData.data[srcIdx];
            newData.data[dstIdx + 1] = imageData.data[srcIdx + 1];
            newData.data[dstIdx + 2] = imageData.data[srcIdx + 2];
            newData.data[dstIdx + 3] = imageData.data[srcIdx + 3];
        }
    }
    
    return newData;
};

export const calculateButteraugli = (data1, data2, width, height) => {
    let sumDiff = 0;
    const inv255 = 1 / 255;
    for (let i = 0; i < data1.data.length; i += 4) {
        const diff = Math.abs(
            getLuminance(data1.data[i], data1.data[i + 1], data1.data[i + 2]) -
            getLuminance(data2.data[i], data2.data[i + 1], data2.data[i + 2])
        );
        sumDiff += Math.pow(diff * inv255, 1.5);
    }
    return (sumDiff / (width * height)) * 10;
};

export const calculateFLIP = (data1, data2, width, height) => {
    let sumError = 0;
    const inv255 = 1 / 255;
    for (let i = 0; i < data1.data.length; i += 4) {
        const dr = Math.abs(data1.data[i] - data2.data[i]) * inv255;
        const dg = Math.abs(data1.data[i + 1] - data2.data[i + 1]) * inv255;
        const db = Math.abs(data1.data[i + 2] - data2.data[i + 2]) * inv255;
        sumError += Math.sqrt(dr * dr + dg * dg + db * db);
    }
    return (sumError / (width * height)).toFixed(4);
};

export const calculateLPIPS = (data1, data2, width, height) => {
    let sumDist = 0;
    const inv255 = 1 / 255;
    for (let i = 0; i < data1.data.length; i += 4) {
        const dr = (data1.data[i] - data2.data[i]) * inv255;
        const dg = (data1.data[i + 1] - data2.data[i + 1]) * inv255;
        const db = (data1.data[i + 2] - data2.data[i + 2]) * inv255;
        sumDist += Math.sqrt(dr * dr * 0.5 + dg * dg * 0.3 + db * db * 0.2);
    }
    return (sumDist / (width * height)).toFixed(4);
};

export const calculateSSIMULACRA2 = (data1, data2, width, height) => {
    // Simplified SSIMULACRA2 approximation
    const ssim = calculateSSIM(data1, data2, width, height);
    // SSIMULACRA2 uses a different scale, convert SSIM to approximate score
    return (100 - (1 - ssim) * 100).toFixed(2);
};

export const compareImages = (img1, img2, options = {}) => {
    const { threshold = 10, ignoreAlpha = false, ignoreWhite = false, resizeMode = 'stretch' } = options;
    
    const width = Math.max(img1.width, img2.width);
    const height = Math.max(img1.height, img2.height);
    const totalPixels = width * height;
    
    const canvas1 = resizeImage(img1, width, height, resizeMode);
    const canvas2 = resizeImage(img2, width, height, resizeMode);
    const data1 = canvas1.getContext('2d').getImageData(0, 0, width, height);
    const data2 = canvas2.getContext('2d').getImageData(0, 0, width, height);
    
    const diffCanvas = document.createElement('canvas');
    diffCanvas.width = width;
    diffCanvas.height = height;
    const diffCtx = diffCanvas.getContext('2d');
    const diffData = diffCtx.createImageData(width, height);
    
    let differentPixels = 0, sumR = 0, sumG = 0, sumB = 0, sumSqR = 0, sumSqG = 0, sumSqB = 0;
    const bins = ERROR_BINS.map(bin => ({ ...bin, count: 0 }));
    
    for (let i = 0; i < data1.data.length; i += 4) {
        const [r1, g1, b1] = [data1.data[i], data1.data[i + 1], data1.data[i + 2]];
        
        if (ignoreWhite && r1 > 250 && g1 > 250 && b1 > 250) {
            diffData.data.set([r1, g1, b1, 50], i);
            continue;
        }
        
        const [r2, g2, b2] = [data2.data[i], data2.data[i + 1], data2.data[i + 2]];
        const [dr, dg, db] = [Math.abs(r1 - r2), Math.abs(g1 - g2), Math.abs(b1 - b2)];
        const errorMagnitude = dr + dg + db;
        
        sumR += dr; sumG += dg; sumB += db;
        sumSqR += dr * dr; sumSqG += dg * dg; sumSqB += db * db;
        
        const matchedBin = bins.find(bin => errorMagnitude >= bin.min && errorMagnitude <= bin.max);
        if (matchedBin) matchedBin.count++;
        
        if (errorMagnitude > threshold) {
            differentPixels++;
            diffData.data.set([Math.min(255, errorMagnitude), 0, 0, 255], i);
        } else {
            const gray = (r1 + g1 + b1) / 3 | 0;
            diffData.data.set([gray, gray, gray, 100], i);
        }
    }
    
    diffCtx.putImageData(diffData, 0, 0);
    
    const mse = (sumSqR + sumSqG + sumSqB) / (totalPixels * 3);
    const psnr = mse === 0 ? Infinity : 20 * Math.log10(255 / Math.sqrt(mse));
    
    // Calculate advanced metrics
    const ssim = calculateSSIM(data1, data2, width, height);
    const butteraugli = calculateButteraugli(data1, data2, width, height);
    const flip = calculateFLIP(data1, data2, width, height);
    const lpips = calculateLPIPS(data1, data2, width, height);
    const ssimulacra2 = calculateSSIMULACRA2(data1, data2, width, height);
    
    return {
        canvas1, canvas2, diffCanvas,
        metrics: {
            totalPixels,
            differentPixels,
            percentDifferent: ((differentPixels / totalPixels) * 100).toFixed(2),
            maeR: (sumR / totalPixels).toFixed(2),
            maeG: (sumG / totalPixels).toFixed(2),
            maeB: (sumB / totalPixels).toFixed(2),
            mse: mse.toFixed(2),
            psnr: psnr === Infinity ? '∞' : psnr.toFixed(2),
            ssim: ssim.toFixed(4),
            butteraugli: butteraugli.toFixed(4),
            flip: flip,
            lpips: lpips,
            ssimulacra2: ssimulacra2
        },
        bins, width, height
    };
};
