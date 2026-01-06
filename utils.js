// Constants
export const DEFAULT_BASE_URLS = ["https://openrouter.ai/api/v1", "https://llmfoundry.straivedemo.com/openrouter/v1"];
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

export const openrouterHelp = `
<div class="alert alert-info">
  <h6>Getting Started with OpenRouter</h6>
  <ol>
    <li>Visit <a href="https://openrouter.ai" target="_blank">openrouter.ai</a></li>
    <li>Sign up or log in to your account</li>
    <li>Navigate to <strong>Keys</strong> section</li>
    <li>Create a new API key</li>
    <li>Copy and paste it here</li>
  </ol>
  <p class="mb-0"><strong>Recommended Model:</strong> google/gemini-2.5-flash-image-preview (Nano Banana)</p>
</div>
`;
