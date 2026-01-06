import { openaiConfig } from "https://cdn.jsdelivr.net/npm/bootstrap-llm-provider@1";
import { bootstrapAlert } from "https://cdn.jsdelivr.net/npm/bootstrap-alert@1";
import { DEFAULT_BASE_URLS, RECOMMENDED_MODEL, PROMPT_PRESETS, ERROR_BINS, $,
    toggleButtonSpinner, imageToBase64, loadImageFromUrl } from "./utils.js";

// State
const state = {
    uploadedImage: null,
    generatedImage: null,
    availableModels: [],
    selectedModel: null,
    comparisonData: null,
    currentPrompt: ''
};

const showAlert = (title, body, color = "info") => bootstrapAlert({ title, body, color });

// API Functions
const loadModels = async () => {
    try {
        const config = await openaiConfig({ defaultBaseUrls: DEFAULT_BASE_URLS });
        if (!config.models?.length) return;
        
        state.availableModels = config.models
            .filter(m => /gemini.*image|gpt-4.*vision|claude.*vision/i.test(m))
            .sort((a, b) => (b === RECOMMENDED_MODEL) - (a === RECOMMENDED_MODEL));
        
        const select = $('model-select');
        if (!select) return;
        
        select.innerHTML = '<option value="">Select Model...</option>' +
            state.availableModels.map(m => 
                `<option value="${m}">${m}${m === RECOMMENDED_MODEL ? ' (Recommended - Nano Banana)' : ''}</option>`
            ).join('');
        
        if (!state.selectedModel) {
            state.selectedModel = state.availableModels.find(m => m === RECOMMENDED_MODEL) || state.availableModels[0];
            if (state.selectedModel) select.value = state.selectedModel;
        }
    } catch (error) {
        console.error('Model loading error:', error);
        showAlert("Model Loading Error", "Failed to load available models.", "warning");
    }
};

const generateClone = async (imageBase64, promptText) => {
    const { apiKey, baseUrl } = await openaiConfig({ defaultBaseUrls: DEFAULT_BASE_URLS });
    if (!apiKey) throw new Error('API key missing. Please configure your key.');
    
    const fullPrompt = `You are an image replication engine. Your job is to recreate the provided image as identically as possible.\n\nUser Request:\n${promptText}\n\nReturn only the final image.`;
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: state.selectedModel || RECOMMENDED_MODEL,
            messages: [{
                role: "user",
                content: [
                    { type: "text", text: fullPrompt },
                    { type: "image_url", image_url: { url: imageBase64 } }
                ]
            }]
        })
    });
    
    if (!response.ok) throw new Error(`API request failed (${response.status}): ${await response.text()}`);
    
    const { choices } = await response.json();
    const message = choices?.[0]?.message;
    
    if (!message) throw new Error('No message received from API');
    if (message.images?.[0]?.image_url?.url) return message.images[0].image_url.url;
    if (message.content?.includes('data:image')) return message.content;
    if (message.content) throw new Error(`No image generated. API returned: ${message.content.substring(0, 200)}...`);
    
    throw new Error('No image or content received from API');
};

// Image Processing
const resizeImage = (img, targetWidth, targetHeight, mode) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    if (mode === 'stretch') { ctx.drawImage(img, 0, 0, targetWidth, targetHeight);}
    else {
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

const compareImages = (img1, img2, options = {}) => {
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
            psnr: mse === 0 ? '∞' : (20 * Math.log10(255 / Math.sqrt(mse))).toFixed(2)
        },
        bins, width, height
    };
};

// UI Updates
const updateCanvas = (canvasId, canvas, width, height) => {
    const el = $(canvasId);
    el.width = width;
    el.height = height;
    el.getContext('2d').drawImage(canvas, 0, 0);
};

const displayComparison = (comparisonData) => {
    const { canvas1, canvas2, diffCanvas, metrics, bins, width, height } = comparisonData;
    
    updateCanvas('original-canvas', canvas1, width, height);
    updateCanvas('generated-canvas', canvas2, width, height);
    updateCanvas('diff-canvas', diffCanvas, width, height);
    
    $('original-info').textContent = `${width} × ${height} pixels`;
    $('generated-info').textContent = `${width} × ${height} pixels`;
    $('diff-info').textContent = `Threshold: ${$('threshold-slider').value}`;
    
    Object.entries({
        'metric-total': metrics.totalPixels.toLocaleString(),
        'metric-diff': metrics.differentPixels.toLocaleString(),
        'metric-percent': `${metrics.percentDifferent}%`,
        'metric-psnr': `${metrics.psnr} dB`,
        'metric-mae-r': metrics.maeR,
        'metric-mae-g': metrics.maeG,
        'metric-mae-b': metrics.maeB,
        'metric-mse': metrics.mse
    }).forEach(([id, value]) => $(id).textContent = value);
    
    $('bins-table').innerHTML = bins.map(bin => {
        const percentage = ((bin.count / metrics.totalPixels) * 100).toFixed(2);
        const barWidth = Math.min(100, percentage * 2);
        return `<tr>
            <td><strong>${bin.label}</strong></td>
            <td>${bin.count.toLocaleString()}</td>
            <td>${percentage}%</td>
            <td><div class="progress" style="height: 20px;">
                <div class="progress-bar" style="width: ${barWidth}%; background-color: ${bin.color};">
                    ${percentage > 5 ? percentage + '%' : ''}
                </div>
            </div></td>
        </tr>`;
    }).join('');
    
    state.comparisonData = { metrics, bins, width, height };
    $('export-btn').disabled = false;
};

// Event Handlers
const handleFileUpload = async (file) => {
    if (!file?.type.startsWith('image/')) {
        showAlert("Invalid File", "Please upload a valid image file.", "warning");
        return;
    }
    
    state.uploadedImage = file;
    const base64 = await imageToBase64(file);
    $('upload-preview').innerHTML = `
        <img src="${base64}" class="image-preview" alt="Uploaded image">
        <p class="small text-muted mt-2">${file.name} (${(file.size / 1024).toFixed(1)} KB)</p>
    `;
    $('generate-btn').disabled = false;
    showAlert("Image Uploaded", "Ready to generate clone!", "success");
};

const handleGenerate = async () => {
    if (!state.uploadedImage) return showAlert("No Image", "Please upload an image first.", "warning");
    
    const promptText = $('prompt-text').value.trim();
    if (!promptText) return showAlert("No Prompt", "Please enter a prompt.", "warning");
    
    const btn = $('generate-btn');
    toggleButtonSpinner(btn, true);
    
    try {
        const imageBase64 = await imageToBase64(state.uploadedImage);
        state.generatedImage = await generateClone(imageBase64, promptText);
        state.currentPrompt = promptText;
        
        $('compare-btn').disabled = false;
        
        showAlert("Success", "Clone generated successfully! Click Compare to analyze.", "success");
        await handleCompare();
    } catch (error) {
        console.error('Generation error:', error);
        showAlert("Generation Error", error.message, "danger");
    } finally {
        toggleButtonSpinner(btn, false);
    }
};

const handleCompare = async () => {
    if (!state.uploadedImage || !state.generatedImage) {
        return showAlert("Missing Images", "Please upload and generate images first.", "warning");
    }
    
    const btn = $('compare-btn');
    toggleButtonSpinner(btn, true);
    
    try {
        const [originalImg, generatedImg] = await Promise.all([
            imageToBase64(state.uploadedImage).then(loadImageFromUrl),
            loadImageFromUrl(state.generatedImage)
        ]);
        
        const options = {
            threshold: parseInt($('threshold-slider').value),
            ignoreAlpha: $('ignore-alpha').checked,
            ignoreWhite: $('ignore-white').checked,
            resizeMode: $('resize-mode').value
        };
        
        displayComparison(compareImages(originalImg, generatedImg, options));
        showAlert("Comparison Complete", "Pixel analysis finished!", "success");
    } catch (error) {
        console.error('Comparison error:', error);
        showAlert("Comparison Error", error.message, "danger");
    } finally {
        toggleButtonSpinner(btn, false);
    }
};

const handleExport = async () => {
    if (!state.comparisonData) return showAlert("No Data", "Please run a comparison first.", "warning");
    
    const report = {
        timestamp: new Date().toISOString(),
        prompt: state.currentPrompt,
        model: state.selectedModel,
        metrics: state.comparisonData.metrics,
        bins: state.comparisonData.bins.map(b => ({
            range: b.label,
            count: b.count,
            percentage: ((b.count / state.comparisonData.metrics.totalPixels) * 100).toFixed(2)
        })),
        settings: {
            threshold: parseInt($('threshold-slider').value),
            ignoreAlpha: $('ignore-alpha').checked,
            ignoreWhite: $('ignore-white').checked,
            resizeMode: $('resize-mode').value
        },
        images: {
            input: await imageToBase64(state.uploadedImage),
            output: state.generatedImage
        }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `image-clone-report-${Date.now()}.json`
    });
    document.body.appendChild(a).click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showAlert("Export Complete", "Report downloaded successfully!", "success");
};

window.setPromptPreset = preset => {
    $('prompt-text').value = PROMPT_PRESETS[preset] || PROMPT_PRESETS['pixel-perfect'];
};

// Event Listeners Setup
const setupEventListeners = () => {
    const dropZone = $('drop-zone');
    const fileInput = $('file-input');
    
    // File upload handlers
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleFileUpload(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', e => {
        if (e.target.files[0]) handleFileUpload(e.target.files[0]);
    });
    
    // Button handlers
    $('config-btn').addEventListener('click', async () => {
        await openaiConfig({ defaultBaseUrls: DEFAULT_BASE_URLS, show: true });
        await loadModels();
    });
    $('model-select').addEventListener('change', e => state.selectedModel = e.target.value);
    $('generate-btn').addEventListener('click', handleGenerate);
    $('compare-btn').addEventListener('click', handleCompare);
    $('export-btn').addEventListener('click', handleExport);
    
    // Comparison option handlers
    const recompare = () => {
        if (state.uploadedImage && state.generatedImage) handleCompare();
    };
    
    $('threshold-slider').addEventListener('input', e => {
        $('threshold-value').textContent = e.target.value;
        recompare();
    });
    $('resize-mode').addEventListener('change', recompare);
    ['ignore-alpha', 'ignore-white'].forEach(id => $(id).addEventListener('change', recompare));
};

// Initialize
(async () => {
    setupEventListeners();
    await loadModels();
    $('generate-btn').disabled = true;
    $('prompt-text').value = PROMPT_PRESETS['pixel-perfect'];
    showAlert("Ready", "Upload an image to begin!", "info");
})();
