import { openaiConfig } from "https://cdn.jsdelivr.net/npm/bootstrap-llm-provider@1";
import { bootstrapAlert } from "https://cdn.jsdelivr.net/npm/bootstrap-alert@1";
import { OPENROUTER_BASE_URLS,RECOMMENDED_MODEL, PROMPT_PRESETS, $,
    toggleButtonSpinner, imageToBase64, loadImageFromUrl, getModelDisplayName,getDualConfig, saveDualConfig, getConfigForModel,generateDualConfigDialogHTML, generateModelCheckboxHTML, generateModelSelectorOptionHTML,
    generateBinsTableRowHTML, generateUploadPreviewHTML, generateModelImagesHTML,
    generateComparisonTableRowHTML, generateBestModelsHTML, generateDemoCardHTML,
    compareImages } from "./utils.js";

const state = {
    uploadedImage: null,
    generatedImages: {}, 
    availableModels: [],
    selectedModels: [], 
    comparisonData: null,
    currentPrompt: '',
    metricsResults: {} 
};

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
    DOM.exportTableBtn = $('export-table-btn');
};

const showDualConfigDialog = async () => {
    const config = getDualConfig();
    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'modal fade';
        modal.innerHTML = generateDualConfigDialogHTML(config);
        document.body.appendChild(modal);
        const bsModal = new bootstrap.Modal(modal);
        modal.querySelector('#save-config-btn').addEventListener('click', () => {
            const newConfig = {
                openrouter: {
                    baseUrl: modal.querySelector('#or-url').value.trim(),
                    apiKey: modal.querySelector('#or-key').value.trim()
                },
                openai: {
                    baseUrl: modal.querySelector('#oa-url').value.trim(),
                    apiKey: modal.querySelector('#oa-key').value.trim()
                }
            };
            saveDualConfig(newConfig);
            bootstrapAlert({ title: "Configuration Saved", body: "API keys and URLs have been saved successfully.", color: "success" });
            bsModal.hide();
            resolve(newConfig);
        });
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
            resolve(null);
        });
        bsModal.show();
    });
};

const loadModels = async () => {
    try {
        const dualConfig = getDualConfig();
        let allModels = [];
        if (dualConfig.openrouter.apiKey) {
            const orConfig = await openaiConfig({ defaultBaseUrls: OPENROUTER_BASE_URLS });
            if (orConfig.models?.length) {
                allModels.push(...orConfig.models.filter(m => 
                    /gemini.*2\.5.*flash.*image.*preview/i.test(m) && !/gemini.*3.*pro/i.test(m)
                ));
            }
        }
        
        if (dualConfig.openai.apiKey) { allModels.push('gpt-image-1.5','chatgpt-image-latest','gpt-image-1','gpt-image-1-mini');}
        if (!allModels.length) {
            bootstrapAlert({ title: "No Models", body: "Please configure at least one API key to load models.", color: "warning" });
            return;
        }
        state.availableModels = allModels.sort((a, b) => (b === RECOMMENDED_MODEL) - (a === RECOMMENDED_MODEL));
        if (!DOM.modelCheckboxes) return;
        DOM.modelCheckboxes.innerHTML = state.availableModels.map((m, i) => 
            generateModelCheckboxHTML(m, i, RECOMMENDED_MODEL)
        ).join('');
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
        bootstrapAlert({ title: "Model Loading Error", body: "Failed to load available models.", color: "warning" });
    }
};

const generateClone = async (imageBase64, promptText, model, originalDimensions) => {
    const config = getConfigForModel(model);
    if (!config.apiKey) throw new Error(`API key missing for ${model}. Please configure your keys.`);
    const { apiKey, baseUrl } = config;
    const isOpenAI = /^(gpt-image|chatgpt-image)/i.test(model);
    const dims = originalDimensions ? `${originalDimensions.width}x${originalDimensions.height}` : 'same as input';
    const fullPrompt = `You are a precise image replication engine. Recreate this image with EXACT specifications:\n1. DIMENSIONS: ${dims} pixels (NO resizing/scaling)\n2. CONTENT: Match every detail identically\n3. COLORS: Exact colors, lighting, composition\n4. STRUCTURE: Preserve all shapes and positions\n5. NO modifications or artistic interpretation\n\nUser Request: ${promptText}\n\nReturn ONLY the final image with exact dimensions.`;

    if (isOpenAI) {
        const blob = await fetch(imageBase64).then(r => r.blob());
        const formData = new FormData();
        formData.append('model', model);
        formData.append('prompt', fullPrompt);
        formData.append('n', '1');
        formData.append('image', blob, 'image.png');
        const response = await fetch(`${baseUrl}/images/edits`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData
        });
        
        if (!response.ok) throw new Error(`API request failed (${response.status}): ${await response.text()}`);
        const data = await response.json();
        const b64 = data.data?.[0]?.b64_json;
        if (b64) return `data:image/png;base64,${b64}`;
        if (data.data?.[0]?.url) return data.data[0].url;
        throw new Error('No image data received from OpenAI API');
    }
    
    const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
            model: model,
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

const displayMetrics = (m, bins) => {
    [['metric-total', m.totalPixels.toLocaleString()], ['metric-diff', m.differentPixels.toLocaleString()],
     ['metric-percent', `${m.percentDifferent}%`], ['metric-psnr', `${m.psnr} dB`],
     ['metric-mae-r', m.maeR], ['metric-mae-g', m.maeG], ['metric-mae-b', m.maeB],
     ['metric-mse', m.mse], ['metric-ssim', m.ssim], ['metric-msssim', m.msssim],
     ['metric-butteraugli', m.butteraugli], ['metric-flip', m.flip],
     ['metric-lpips', m.lpips], ['metric-ssimulacra2', m.ssimulacra2]
    ].forEach(([id, val]) => { const el = $(id); if (el) el.textContent = val; });
    if (DOM.binsTable && bins) DOM.binsTable.innerHTML = bins.map(b => 
        generateBinsTableRowHTML(b, ((b.count / m.totalPixels) * 100).toFixed(2), m)
    ).join('');
};

const handleFileUpload = async (file) => {
    if (!file?.type.startsWith('image/')) return bootstrapAlert({ title: "Invalid File", body: "Please upload a valid image file.", color: "warning" });
    state.uploadedImage = file;
    const base64 = await imageToBase64(file);
    $('upload-preview').innerHTML = generateUploadPreviewHTML(base64, file.name, file.size);
    DOM.generateBtn.disabled = false;
    bootstrapAlert({ title: "Image Uploaded", body: "Ready to generate clone!", color: "success" });
};

const handleGenerate = async () => {
    if (!state.uploadedImage) return bootstrapAlert({ title: "No Image", body: "Please upload an image first.", color: "warning" });
    const promptText = $('prompt-text').value.trim();
    if (!promptText) return bootstrapAlert({ title: "No Prompt", body: "Please enter a prompt.", color: "warning" });
    const selectedOptions = Array.from(document.querySelectorAll('.model-checkbox:checked')).map(cb => cb.value);
    if (!selectedOptions.length) return bootstrapAlert({ title: "No Model", body: "Please select at least one model.", color: "warning" });
    const btn = $('generate-btn');
    toggleButtonSpinner(btn, true);
    try {
        const imageBase64 = await imageToBase64(state.uploadedImage);
        state.currentPrompt = promptText;
        state.generatedImages = {};
        const originalImg = await loadImageFromUrl(imageBase64);
        const originalDimensions = {
            width: originalImg.width,
            height: originalImg.height
        };
        bootstrapAlert({ title: "Generating", body: `Starting batch generation for ${selectedOptions.length} model(s)...`, color: "info" });
        const results = await Promise.allSettled(selectedOptions.map(model => 
            generateClone(imageBase64, promptText, model, originalDimensions)
                .then(imageUrl => ({ model, imageUrl, success: true }))
                .catch(error => ({ model, error: error.message, success: false }))
        ));
        const failedModels = [];
        results.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
                state.generatedImages[result.value.model] = result.value.imageUrl;
            } else {
                failedModels.push(selectedOptions[index]);
                console.error(`Failed to generate for ${selectedOptions[index]}:`, result.reason || result.value?.error);
            }
        });
        state.selectedModels = Object.keys(state.generatedImages);
        const successCount = state.selectedModels.length;
        if (successCount > 0) {
            DOM.compareBtn.disabled = false;
            const msg = failedModels.length ? `Generated ${successCount} clone(s). Failed: ${failedModels.map(m => getModelDisplayName(m)).join(', ')}` : `Generated ${successCount} clone(s) successfully in batch! Click Compare to analyze.`;
            bootstrapAlert({ title: failedModels.length ? "Partial Success" : "Success", body: msg, color: failedModels.length ? "warning" : "success" });
            await handleCompare();
        } else {
            bootstrapAlert({ title: "Generation Failed", body: `All ${selectedOptions.length} model(s) failed to generate images. Check console for details.`, color: "danger" });
        }
    } catch (error) {
        console.error('Generation error:', error);
        bootstrapAlert({ title: "Generation Error", body: error.message, color: "danger" });
    } finally {
        toggleButtonSpinner(btn, false);
    }
};

const handleCompare = async () => {
    if (!state.uploadedImage || !Object.keys(state.generatedImages).length) {
        return bootstrapAlert({ title: "Missing Images", body: "Please upload and generate images first.", color: "warning" });
    }
    toggleButtonSpinner(DOM.compareBtn, true);
    try {
        const originalImg = await imageToBase64(state.uploadedImage).then(loadImageFromUrl);
        const options = { threshold: DOM.thresholdSlider ? parseInt(DOM.thresholdSlider.value) : 10, ignoreAlpha: false, ignoreWhite: false, resizeMode: 'stretch' };
        state.metricsResults = {};
        for (const [modelName, imageUrl] of Object.entries(state.generatedImages)) {
            state.metricsResults[modelName] = compareImages(originalImg, await loadImageFromUrl(imageUrl), options);
        }
        displayAllModelImages();
        const models = Object.keys(state.metricsResults);
        if (DOM.metricsModelSelect && models.length) {
            DOM.metricsModelSelect.innerHTML = models.map(m => generateModelSelectorOptionHTML(m, getModelDisplayName)).join('');
            DOM.metricsModelSelect.value = models[0];
            DOM.metricsModelSelect.onchange = (e) => {
                const r = state.metricsResults[e.target.value];
                if (r) displayMetrics(r.metrics, r.bins);
            };
        }
        const firstResult = state.metricsResults[models[0]];
        displayMetrics(firstResult.metrics, firstResult.bins);
        displayModelComparison();
        bootstrapAlert({ title: "Comparison Complete", body: "Pixel analysis finished for all models!", color: "success" });
    } catch (error) {
        console.error('Comparison error:', error);
        bootstrapAlert({ title: "Comparison Error", body: error.message, color: "danger" });
    } finally {
        toggleButtonSpinner(DOM.compareBtn, false);
    }
};

const displayAllModelImages = () => {
    if (!DOM.allModelsImages) return;
    const models = Object.keys(state.metricsResults);
    if (!models.length) return;
    const getCanvasIds = model => {
        const sanitized = model.replace(/[^a-zA-Z0-9]/g, '-');
        return {
            original: `model-original-${sanitized}`,
            generated: `model-generated-${sanitized}`,
            diff: `model-diff-${sanitized}`
        };
    };
    DOM.allModelsImages.innerHTML = models.map(model => {
        const {metrics, width, height} = state.metricsResults[model];
        return generateModelImagesHTML(model, getCanvasIds(model), getModelDisplayName(model), width, height, metrics);
    }).join('');
    models.forEach(model => {
        const {canvas1, canvas2, diffCanvas, width, height} = state.metricsResults[model];
        const canvasIds = getCanvasIds(model);
        const drawCanvas = (id, canvas) => {
            const el = $(id);
            if (el) {
                el.width = width;
                el.height = height;
                el.getContext('2d').drawImage(canvas, 0, 0);
            }
        };
        drawCanvas(canvasIds.original, canvas1);
        drawCanvas(canvasIds.generated, canvas2);
        drawCanvas(canvasIds.diff, diffCanvas);
    });
};

const displayModelComparison = () => {
    if (!DOM.modelComparisonTable) return;
    const models = Object.keys(state.metricsResults);
    if (!models.length) return;
    DOM.modelComparisonTable.innerHTML = models.map(model => 
        generateComparisonTableRowHTML(model, state.metricsResults[model].metrics, getModelDisplayName)
    ).join('');
    displayBestModels();
    if (DOM.exportTableBtn) DOM.exportTableBtn.disabled = false;
};

const exportMetricsTable = () => {
    const models = Object.keys(state.metricsResults);
    if (!models.length) return;
    const csv = ['Model,PSNR,SSIM,MS-SSIM,SSIMULACRA2,Butteraugli,FLIP,LPIPS,% Diff'];
    models.forEach(model => {
        const m = state.metricsResults[model].metrics;
        csv.push(`${getModelDisplayName(model)},${m.psnr},${m.ssim},${m.msssim},${m.ssimulacra2},${m.butteraugli},${m.flip},${m.lpips},${m.percentDifferent}`);
    });
    const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `metrics-comparison-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    bootstrapAlert({ title: "Exported!", body: "Metrics comparison table exported as CSV.", color: "success" });
};

const displayBestModels = () => {
    if (!DOM.bestModels || !Object.keys(state.metricsResults).length) return;
    DOM.bestModels.innerHTML = generateBestModelsHTML({
        'PSNR': { better: 'higher', key: 'psnr', humanAlign: 'Good' },
        'SSIM': { better: 'higher', key: 'ssim', humanAlign: 'Excellent' },
        'MS-SSIM': { better: 'higher', key: 'msssim', humanAlign: 'Excellent' },
        'SSIMULACRA2': { better: 'higher', key: 'ssimulacra2', humanAlign: 'Excellent' },
        'Butteraugli': { better: 'lower', key: 'butteraugli', humanAlign: 'Good' },
        'FLIP': { better: 'lower', key: 'flip', humanAlign: 'Good' },
        'LPIPS': { better: 'lower', key: 'lpips', humanAlign: 'Excellent' }
    }, state.metricsResults, getModelDisplayName);
};

window.setPromptPreset = preset => {
    $('prompt-text').value = PROMPT_PRESETS[preset] || PROMPT_PRESETS['pixel-perfect'];
};

const setupEventListeners = () => {
    const dropZone = $('drop-zone'), fileInput = $('file-input');
    const uploadFile = (file) => file && handleFileUpload(file);
    dropZone.addEventListener('click', () => fileInput.click());
    ['dragover', 'drop'].forEach(evt => dropZone.addEventListener(evt, e => {
        e.preventDefault();
        dropZone.classList.toggle('dragover', evt === 'dragover');
        if (evt === 'drop') uploadFile(e.dataTransfer.files[0]);
    }));
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    fileInput.addEventListener('change', e => uploadFile(e.target.files[0]));
    $('config-btn').addEventListener('click', async () => { await showDualConfigDialog(); await loadModels(); });
    DOM.generateBtn.addEventListener('click', handleGenerate);
    DOM.compareBtn.addEventListener('click', handleCompare);
    if (DOM.exportTableBtn) DOM.exportTableBtn.addEventListener('click', exportMetricsTable);
    if (DOM.thresholdSlider) DOM.thresholdSlider.addEventListener('input', e => {
        if (DOM.thresholdValue) DOM.thresholdValue.textContent = e.target.value;
        if (state.uploadedImage && Object.keys(state.generatedImages).length) handleCompare();
    });
};

const loadDemoSessions = async () => {
    try {
        const response = await fetch('config.json');
        if (!response.ok) { console.warn('config.json not found.'); return []; }
        const sessions = await response.json();
        return Array.isArray(sessions) ? sessions : [sessions];
    } catch (error) { console.warn('Failed to load demo sessions:', error); return []; }
};

const displayDemoSessions = async () => {
    const container = $('demo-sessions-container'), card = $('demo-sessions-card');
    if (!container || !card) return;
    const sessions = await loadDemoSessions();
    console.log(`Loaded ${sessions.length} session(s) from config.json`);
    if (!sessions.length) { card.style.display = 'none'; return; }
    card.style.display = 'block';
    container.innerHTML = sessions.map((session, index) => {
        try { return generateDemoCardHTML(session, index, session.images?.original?.path || ''); }
        catch (err) { console.error(`Error rendering session ${index}:`, err); return ''; }
    }).filter(html => html).join('');
    document.querySelectorAll('.demo-card').forEach(card => card.addEventListener('click', async function() {
        await loadSessionIntoUI(sessions[parseInt(this.dataset.sessionIndex)]);
        document.querySelectorAll('.demo-card').forEach(c => c.classList.remove('active'));
        this.classList.add('active');
    }));
};

const tryLoadImage = async (path) => {
    for (const p of [path, path.startsWith('images/') ? path : `images/${path}`, path.startsWith('images/') ? path.replace('images/', '') : path]) {
        try { const r = await fetch(p); if (r.ok) return await r.blob(); } catch (err) { continue; }
    }
    throw new Error(`Could not load image from: ${path}`);
};

const loadSessionIntoUI = async (session) => {
    try {
        bootstrapAlert({ title: "Loading Session", body: "Loading saved session data...", color: "info" });
        const promptText = $('prompt-text');
        if (promptText && session.prompt) promptText.value = state.currentPrompt = session.prompt;
        if (DOM.thresholdSlider && session.threshold) {
            DOM.thresholdSlider.value = session.threshold;
            if (DOM.thresholdValue) DOM.thresholdValue.textContent = session.threshold;
        }
        if (session.images?.original?.path) try {
            const blob = await tryLoadImage(session.images.original.path);
            state.uploadedImage = new File([blob], session.images.original.name || 'original.jpg', { type: blob.type });
            const preview = $('upload-preview');
            if (preview) preview.innerHTML = `<img src="${URL.createObjectURL(state.uploadedImage)}" class="image-preview mt-2" alt="Original">`;
        } catch (err) { console.warn('Failed to load original image:', err); }
        state.generatedImages = {};
        if (session.images?.generated) for (const [modelName, modelData] of Object.entries(session.images.generated)) {
            try { state.generatedImages[modelName] = URL.createObjectURL(await tryLoadImage(modelData.path)); }
            catch (err) { console.warn(`Failed to load generated image for ${modelName}:`, err); }
        }
        state.metricsResults = {};
        if (session.pixelDifferenceAnalysis) {
            const originalImg = await imageToBase64(state.uploadedImage).then(loadImageFromUrl);
            for (const [modelName, analysis] of Object.entries(session.pixelDifferenceAnalysis)) if (state.generatedImages[modelName]) {
                const createCanvas = () => { const c = document.createElement('canvas'); c.width = analysis.dimensions.width; c.height = analysis.dimensions.height; return c; };
                const [canvas1, canvas2, diffCanvas] = [createCanvas(), createCanvas(), createCanvas()];
                canvas1.getContext('2d').drawImage(originalImg, 0, 0, canvas1.width, canvas1.height);
                canvas2.getContext('2d').drawImage(await loadImageFromUrl(state.generatedImages[modelName]), 0, 0, canvas2.width, canvas2.height);
                state.metricsResults[modelName] = { canvas1, canvas2, diffCanvas, metrics: analysis.metrics, bins: analysis.errorDistribution, width: analysis.dimensions.width, height: analysis.dimensions.height };
            }
        }
        state.selectedModels = session.models || [];
        if (Object.keys(state.generatedImages).length) {
            DOM.compareBtn.disabled = false;
            displayAllModelImages();
            const models = Object.keys(state.metricsResults);
            if (DOM.metricsModelSelect && models.length) {
                DOM.metricsModelSelect.innerHTML = models.map(m => generateModelSelectorOptionHTML(m, getModelDisplayName)).join('');
                DOM.metricsModelSelect.value = models[0];
                DOM.metricsModelSelect.onchange = (e) => { const r = state.metricsResults[e.target.value]; if (r) displayMetrics(r.metrics, r.bins); };
                if (models[0] && state.metricsResults[models[0]]) displayMetrics(state.metricsResults[models[0]].metrics, state.metricsResults[models[0]].bins);
            }
            displayModelComparison();
            bootstrapAlert({ title: "Session Loaded!", body: `Successfully loaded session with ${state.selectedModels.length} model(s).`, color: "success" });
            setTimeout(() => DOM.compareBtn?.click(), 100);
        } else bootstrapAlert({ title: "Partial Load", body: "Session loaded but images couldn't be retrieved. Check if image files exist.", color: "warning" });
    } catch (error) {
        console.error('Failed to load session:', error);
        bootstrapAlert({ title: "Load Failed", body: `Failed to load session: ${error.message}`, color: "danger" });
    }
};

(async () => {
    cacheDOM();
    setupEventListeners();
    await loadModels();
    await displayDemoSessions();
    if (DOM.generateBtn) DOM.generateBtn.disabled = true;
    const promptText = $('prompt-text');
    if (promptText) promptText.value = PROMPT_PRESETS['pixel-perfect'];
    bootstrapAlert({ title: "Ready", body: "Upload an image to begin or load a saved session!", color: "info" });
})();
