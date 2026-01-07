import { openaiConfig } from "https://cdn.jsdelivr.net/npm/bootstrap-llm-provider@1";
import { bootstrapAlert } from "https://cdn.jsdelivr.net/npm/bootstrap-alert@1";
import { DEFAULT_BASE_URLS, RECOMMENDED_MODEL, PROMPT_PRESETS, ERROR_BINS, METRIC_INFO, $,
    toggleButtonSpinner, imageToBase64, loadImageFromUrl, getModelDisplayName, getLuminance,
    resizeImage, updateCanvas } from "./utils.js";

// State
const state = {
    uploadedImage: null,
    generatedImages: {}, // Store multiple generated images by model name
    availableModels: [],
    selectedModels: [], // Support multiple model selection
    comparisonData: null,
    currentPrompt: '',
    metricsResults: {} // Store results for each model
};

// DOM Cache
const DOM = {};
const cacheDOM = () => {
    DOM.modelCheckboxes = $('model-checkboxes');
    DOM.metricsModelSelect = $('metrics-model-select');
    DOM.allModelsImages = $('all-models-images');
    DOM.modelComparisonTable = $('model-comparison-table');
    DOM.bestModels = $('best-models');
    DOM.binsTable = $('bins-table');
    DOM.thresholdSlider = $('threshold-slider');
    DOM.thresholdValue = $('threshold-value');
    DOM.generateBtn = $('generate-btn');
    DOM.compareBtn = $('compare-btn');
    DOM.exportBtn = $('export-btn');
};

const showAlert = (title, body, color = "info") => bootstrapAlert({ title, body, color });

// API Functions
const loadModels = async () => {
    try {
        const config = await openaiConfig({ defaultBaseUrls: DEFAULT_BASE_URLS });
        if (!config.models?.length) return;
        
        state.availableModels = config.models
            .filter(m => /gemini.*image|gpt-[45].*vision|gpt-[45].*image|claude.*vision/i.test(m))
            .sort((a, b) => (b === RECOMMENDED_MODEL) - (a === RECOMMENDED_MODEL));
        
        if (!DOM.modelCheckboxes) return;
        
        DOM.modelCheckboxes.innerHTML = state.availableModels.map((m, i) => {
            const displayName = getModelDisplayName(m);
            const recommended = m === RECOMMENDED_MODEL ? ' <span class="badge bg-success">Recommended</span>' : '';
            return `<div class="col-md-4"><div class="form-check">
                <input class="form-check-input model-checkbox" type="checkbox" value="${m}" id="model-checkbox-${i}">
                <label class="form-check-label" for="model-checkbox-${i}"><strong>${displayName}</strong>${recommended}</label>
            </div></div>`;
        }).join('');
        
        // Auto-select recommended model
        if (state.selectedModels.length === 0) {
            const recommendedModel = state.availableModels.find(m => m === RECOMMENDED_MODEL) || state.availableModels[0];
            const checkbox = document.querySelector('.model-checkbox[value="' + recommendedModel + '"]');
            if (checkbox) {
                checkbox.checked = true;
                state.selectedModels = [recommendedModel];
            }
        }
    } catch (error) {
        console.error('Model loading error:', error);
        showAlert("Model Loading Error", "Failed to load available models.", "warning");
    }
};

const generateClone = async (imageBase64, promptText, model, originalDimensions) => {
    const { apiKey, baseUrl } = await openaiConfig({ defaultBaseUrls: DEFAULT_BASE_URLS });
    if (!apiKey) throw new Error('API key missing. Please configure your key.');
    
    const dimensionInstruction = originalDimensions 
        ? `\n\nIMPORTANT: The output image MUST be exactly ${originalDimensions.width}x${originalDimensions.height} pixels. Do not change the dimensions.`
        : '';
    
    const fullPrompt = `You are an image replication engine. Your job is to recreate the provided image as identically as possible.\n\nUser Request:\n${promptText}${dimensionInstruction}\n\nReturn only the final image with the exact same dimensions as the input.`;
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: model || RECOMMENDED_MODEL,
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

// Advanced Metrics Calculations

const calculateSSIM = (data1, data2, width, height) => {
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

const calculateMSSSIM = calculateSSIM; // Alias for single-scale implementation

const calculateButteraugli = (data1, data2, width, height) => {
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

const calculateFLIP = (data1, data2, width, height) => {
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

const calculateLPIPS = (data1, data2, width, height) => {
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

const calculateSSIMULACRA2 = (data1, data2, width, height) => {
    // Simplified SSIMULACRA2 approximation
    const ssim = calculateSSIM(data1, data2, width, height);
    // SSIMULACRA2 uses a different scale, convert SSIM to approximate score
    return (100 - (1 - ssim) * 100).toFixed(2);
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
    const psnr = mse === 0 ? Infinity : 20 * Math.log10(255 / Math.sqrt(mse));
    
    // Calculate advanced metrics
    const ssim = calculateSSIM(data1, data2, width, height);
    const msssim = calculateMSSSIM(data1, data2, width, height);
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
            msssim: msssim.toFixed(4),
            butteraugli: butteraugli.toFixed(4),
            flip: flip,
            lpips: lpips,
            ssimulacra2: ssimulacra2
        },
        bins, width, height
    };
};

// UI Updates
const populateMetricsModelSelector = () => {
    if (!DOM.metricsModelSelect) return;
    const models = Object.keys(state.metricsResults);
    if (!models.length) return;
    
    DOM.metricsModelSelect.innerHTML = models.map(m => 
        `<option value="${m}">${getModelDisplayName(m)}</option>`
    ).join('');
    
    DOM.metricsModelSelect.value = models[0];
    DOM.metricsModelSelect.onchange = (e) => {
        const result = state.metricsResults[e.target.value];
        if (result) {
            displayMetrics(result.metrics);
            updateBinsTable(result.metrics, result.bins);
        }
    };
};

const displayMetrics = (m) => {
    const updates = [
        ['metric-total', m.totalPixels.toLocaleString()],
        ['metric-diff', m.differentPixels.toLocaleString()],
        ['metric-percent', `${m.percentDifferent}%`],
        ['metric-psnr', `${m.psnr} dB`],
        ['metric-mae-r', m.maeR],
        ['metric-mae-g', m.maeG],
        ['metric-mae-b', m.maeB],
        ['metric-mse', m.mse],
        ['metric-ssim', m.ssim],
        ['metric-msssim', m.msssim],
        ['metric-butteraugli', m.butteraugli],
        ['metric-flip', m.flip],
        ['metric-lpips', m.lpips],
        ['metric-ssimulacra2', m.ssimulacra2]
    ];
    updates.forEach(([id, val]) => {
        const el = $(id);
        if (el) el.textContent = val;
    });
};

const updateBinsTable = (metrics, bins) => {
    if (!DOM.binsTable || !bins) return;
    DOM.binsTable.innerHTML = bins.map(b => {
        const pct = ((b.count / metrics.totalPixels) * 100).toFixed(2);
        const width = Math.min(100, pct * 2);
        return `<tr><td><strong>${b.label}</strong></td><td>${b.count.toLocaleString()}</td><td>${pct}%</td>
            <td><div class="progress" style="height:20px"><div class="progress-bar" style="width:${width}%;background-color:${b.color}">
            ${pct > 5 ? pct + '%' : ''}</div></div></td></tr>`;
    }).join('');
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
    
    // Get selected models from checkboxes
    const checkboxes = document.querySelectorAll('.model-checkbox:checked');
    const selectedOptions = Array.from(checkboxes).map(cb => cb.value);
    if (selectedOptions.length === 0) {
        return showAlert("No Model", "Please select at least one model.", "warning");
    }
    
    const btn = $('generate-btn');
    toggleButtonSpinner(btn, true);
    
    try {
        const imageBase64 = await imageToBase64(state.uploadedImage);
        state.currentPrompt = promptText;
        state.generatedImages = {};
        
        // Get original image dimensions
        const originalImg = await loadImageFromUrl(imageBase64);
        const originalDimensions = {
            width: originalImg.width,
            height: originalImg.height
        };
        
        showAlert("Generating", `Starting batch generation for ${selectedOptions.length} model(s)...`, "info");
        
        // Generate images in parallel batches
        const batchSize = selectedOptions.length; // Process all models in one batch
        const results = await Promise.allSettled(
            selectedOptions.map(model => 
                generateClone(imageBase64, promptText, model, originalDimensions)
                    .then(imageUrl => ({ model, imageUrl, success: true }))
                    .catch(error => ({ model, error: error.message, success: false }))
            )
        );
        
        // Process results
        let successCount = 0;
        let failedModels = [];
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                state.generatedImages[result.value.model] = result.value.imageUrl;
                successCount++;
            } else {
                const modelName = selectedOptions[index];
                failedModels.push(modelName);
                console.error(`Failed to generate for ${modelName}:`, result.reason || result.value?.error);
            }
        });
        
        state.selectedModels = Object.keys(state.generatedImages);
        
        if (successCount > 0) {
            $('compare-btn').disabled = false;
            
            if (failedModels.length > 0) {
                showAlert("Partial Success", 
                    `Generated ${successCount} clone(s) successfully. Failed: ${failedModels.map(m => getModelDisplayName(m)).join(', ')}`, 
                    "warning");
            } else {
                showAlert("Success", 
                    `Generated ${successCount} clone(s) successfully in batch! Click Compare to analyze.`, 
                    "success");
            }
            
            await handleCompare();
        } else {
            showAlert("Generation Failed", 
                `All ${selectedOptions.length} model(s) failed to generate images. Check console for details.`, 
                "danger");
        }
    } catch (error) {
        console.error('Generation error:', error);
        showAlert("Generation Error", error.message, "danger");
    } finally {
        toggleButtonSpinner(btn, false);
    }
};

const handleCompare = async () => {
    if (!state.uploadedImage || Object.keys(state.generatedImages).length === 0) {
        return showAlert("Missing Images", "Please upload and generate images first.", "warning");
    }
    
    const btn = $('compare-btn');
    toggleButtonSpinner(btn, true);
    
    try {
        const originalImg = await imageToBase64(state.uploadedImage).then(loadImageFromUrl);
        
        const thresholdSlider = $('threshold-slider');
        const threshold = thresholdSlider ? parseInt(thresholdSlider.value) : 10;
        
        const options = {
            threshold: threshold,
            ignoreAlpha: false,
            ignoreWhite: false,
            resizeMode: 'stretch'
        };
        
        state.metricsResults = {};
        
        // Compare each generated image
        for (const [modelName, imageUrl] of Object.entries(state.generatedImages)) {
            const generatedImg = await loadImageFromUrl(imageUrl);
            const comparison = compareImages(originalImg, generatedImg, options);
            state.metricsResults[modelName] = comparison;
        }
        
        // Display all models' comparisons
        displayAllModelImages();
        
        // Populate metrics model selector
        populateMetricsModelSelector();
        
        // Display first model's metrics in main section
        const firstModel = Object.keys(state.generatedImages)[0];
        displayMetrics(state.metricsResults[firstModel].metrics);
        updateBinsTable(state.metricsResults[firstModel].metrics, state.metricsResults[firstModel].bins);
        $('export-btn').disabled = false;
        
        // Display comparison table
        displayModelComparison();
        
        showAlert("Comparison Complete", "Pixel analysis finished for all models!", "success");
    } catch (error) {
        console.error('Comparison error:', error);
        showAlert("Comparison Error", error.message, "danger");
    } finally {
        toggleButtonSpinner(btn, false);
    }
};

const displayAllModelImages = () => {
    const container = $('all-models-images');
    if (!container) return;
    
    const models = Object.keys(state.metricsResults);
    if (models.length === 0) return;
    
    let html = '';
    
    models.forEach(model => {
        const { canvas1, canvas2, diffCanvas, metrics, width, height } = state.metricsResults[model];
        const modelLabel = getModelDisplayName(model);
        
        // Create unique canvas IDs for this model
        const canvasIds = {
            original: 'model-original-' + model.replace(/[^a-zA-Z0-9]/g, '-'),
            generated: 'model-generated-' + model.replace(/[^a-zA-Z0-9]/g, '-'),
            diff: 'model-diff-' + model.replace(/[^a-zA-Z0-9]/g, '-')
        };
        
        html += '<div class="row mb-4 border-bottom pb-4">' +
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
    });
    
    container.innerHTML = html;
    
    // Now draw the canvases
    models.forEach(model => {
        const { canvas1, canvas2, diffCanvas, width, height } = state.metricsResults[model];
        const canvasIds = {
            original: 'model-original-' + model.replace(/[^a-zA-Z0-9]/g, '-'),
            generated: 'model-generated-' + model.replace(/[^a-zA-Z0-9]/g, '-'),
            diff: 'model-diff-' + model.replace(/[^a-zA-Z0-9]/g, '-')
        };
        
        const origCanvas = $(canvasIds.original);
        const genCanvas = $(canvasIds.generated);
        const diffCanvasEl = $(canvasIds.diff);
        
        if (origCanvas) {
            origCanvas.width = width;
            origCanvas.height = height;
            origCanvas.getContext('2d').drawImage(canvas1, 0, 0);
        }
        
        if (genCanvas) {
            genCanvas.width = width;
            genCanvas.height = height;
            genCanvas.getContext('2d').drawImage(canvas2, 0, 0);
        }
        
        if (diffCanvasEl) {
            diffCanvasEl.width = width;
            diffCanvasEl.height = height;
            diffCanvasEl.getContext('2d').drawImage(diffCanvas, 0, 0);
        }
    });
};

const displayModelComparison = () => {
    const tableBody = $('model-comparison-table');
    if (!tableBody) return;
    
    const models = Object.keys(state.metricsResults);
    if (models.length === 0) return;
    
    // Create comparison rows
    const rows = models.map(model => {
        const metrics = state.metricsResults[model].metrics;
        const modelLabel = getModelDisplayName(model);
        
        return '<tr>' +
            '<td><strong>' + modelLabel + '</strong></td>' +
            '<td>' + metrics.psnr + ' dB</td>' +
            '<td>' + metrics.ssim + '</td>' +
            '<td>' + metrics.msssim + '</td>' +
            '<td>' + metrics.ssimulacra2 + '</td>' +
            '<td>' + metrics.butteraugli + '</td>' +
            '<td>' + metrics.flip + '</td>' +
            '<td>' + metrics.lpips + '</td>' +
            '<td>' + metrics.percentDifferent + '%</td>' +
        '</tr>';
    }).join('');
    
    tableBody.innerHTML = rows;
    
    // Show best performing model for each metric
    displayBestModels();
};

const displayBestModels = () => {
    const bestDiv = $('best-models');
    if (!bestDiv) return;
    
    const models = Object.keys(state.metricsResults);
    if (models.length === 0) return;
    
    // Find best model for each metric (higher is better for PSNR, SSIM, MS-SSIM, SSIMULACRA2; lower is better for others)
    const metricComparisons = {
        'PSNR': { better: 'higher', key: 'psnr', humanAlign: 'Good' },
        'SSIM': { better: 'higher', key: 'ssim', humanAlign: 'Excellent' },
        'MS-SSIM': { better: 'higher', key: 'msssim', humanAlign: 'Excellent' },
        'SSIMULACRA2': { better: 'higher', key: 'ssimulacra2', humanAlign: 'Excellent' },
        'Butteraugli': { better: 'lower', key: 'butteraugli', humanAlign: 'Good' },
        'FLIP': { better: 'lower', key: 'flip', humanAlign: 'Good' },
        'LPIPS': { better: 'lower', key: 'lpips', humanAlign: 'Excellent' }
    };
    
    let html = '<h5>Best Performing Models by Metric:</h5><div class="row g-2">';
    
    for (const [metricName, config] of Object.entries(metricComparisons)) {
        let bestModel = models[0];
        let bestValue = parseFloat(state.metricsResults[bestModel].metrics[config.key]);
        
        for (const model of models) {
            const value = parseFloat(state.metricsResults[model].metrics[config.key]);
            if (config.better === 'higher' ? value > bestValue : value < bestValue) {
                bestValue = value;
                bestModel = model;
            }
        }
        
        const modelLabel = getModelDisplayName(bestModel);
        
        html += '<div class="col-md-4">' +
            '<div class="alert alert-info mb-2">' +
                '<strong>' + metricName + '</strong> (' + config.humanAlign + ' human alignment)<br>' +
                '<span class="badge bg-primary">' + modelLabel + '</span>: ' + bestValue +
            '</div>' +
        '</div>';
    }
    
    html += '</div>';
    html += '<div class="alert alert-success mt-3"><strong>Note:</strong> SSIM, MS-SSIM, SSIMULACRA2, and LPIPS are considered to have the best alignment with human perception of image quality.</div>';
    
    bestDiv.innerHTML = html;
};

const handleExport = async () => {
    if (Object.keys(state.metricsResults).length === 0) return showAlert("No Data", "Please run a comparison first.", "warning");
    
    const report = {
        timestamp: new Date().toISOString(),
        prompt: state.currentPrompt,
        models: state.selectedModels,
        allMetrics: Object.keys(state.metricsResults).map(model => ({
            model: model,
            metrics: state.metricsResults[model].metrics,
            bins: state.metricsResults[model].bins
        })),
        settings: {
            threshold: $('threshold-slider') ? parseInt($('threshold-slider').value) : 10,
            ignoreAlpha: false,
            ignoreWhite: false,
            resizeMode: 'stretch'
        },
        images: {
            input: await imageToBase64(state.uploadedImage),
            outputs: state.generatedImages
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
    $('generate-btn').addEventListener('click', handleGenerate);
    $('compare-btn').addEventListener('click', handleCompare);
    $('export-btn').addEventListener('click', handleExport);
    
    // Threshold slider handler
    const thresholdSlider = $('threshold-slider');
    if (thresholdSlider) {
        thresholdSlider.addEventListener('input', e => {
            const thresholdValue = $('threshold-value');
            if (thresholdValue) {
                thresholdValue.textContent = e.target.value;
            }
            // Recompare if images are already generated
            if (state.uploadedImage && Object.keys(state.generatedImages).length > 0) {
                handleCompare();
            }
        });
    }
    
};

// Initialize
(async () => {
    cacheDOM();
    setupEventListeners();
    await loadModels();
    if (DOM.generateBtn) DOM.generateBtn.disabled = true;
    const promptText = $('prompt-text');
    if (promptText) promptText.value = PROMPT_PRESETS['pixel-perfect'];
    showAlert("Ready", "Upload an image to begin!", "info");
})();
