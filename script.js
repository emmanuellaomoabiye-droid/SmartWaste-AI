'use strict';

// ── Config ─────────────────────────────────────────────────────────────────
const MODEL_URL   = './Model/model.json';
const METADATA_URL = './Model/metadata.json';
const MAX_BYTES   = 10 * 1024 * 1024; // 10 MB
const ACCEPT      = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

// ── State ───────────────────────────────────────────────────────────────────
let model        = null;
let modelReady   = false;
let classifying  = false;

// ── DOM refs ─────────────────────────────────────────────────────────────────
const el = (id) => document.getElementById(id);
const uploadZone      = el('upload-zone');
const fileInput       = el('file-input');
const previewSection  = el('preview-section');
const previewImage    = el('preview-image');
const imgPlaceholder  = el('img-placeholder');
const removeBtn       = el('remove-btn');
const errorMsg        = el('error-msg');
const classifyBtn     = el('classify-btn');
const loadingSection  = el('loading-section');
const loadingText     = el('loading-text');
const resultSection   = el('result-section');
const resultClass     = el('result-class');
const resultConf      = el('result-conf');
const addToLogBtn     = el('add-to-log-btn');
const resetBtn        = el('reset-btn');
const globalError     = el('global-error');
const globalErrorText = el('global-error-text');
const modelStatus     = el('model-status');
// ── Live camera controls ──
const cameraStartBtn = el('camera-start-btn');
const cameraScanBtn  = el('camera-scan-btn');
const cameraStopBtn  = el('camera-stop-btn');
const cameraVideo    = el('camera-video');
const cameraView     = el('camera-view');
const cameraError    = el('camera-error');

let cameraStream = null;

// ── Model loading ────────────────────────────────────────────────────────────
async function loadModel() {
  setStatus('Loading model…', '');
  try {
    if (typeof tmImage === 'undefined') {
      throw new Error('Teachable Machine library not loaded. Check your internet connection.');
    }
    model = await tmImage.load(MODEL_URL, METADATA_URL);
    modelReady = true;
    setStatus('Model ready', 'ready');
    console.log('[SmartWaste] Model loaded. Classes:', model.getTotalClasses());
  } catch (err) {
    modelReady = false;
    setStatus('Model failed to load', 'error');
    showGlobalError(
      'Could not load the AI model. Make sure you are serving the project through a local HTTP server ' +
      '(e.g. VS Code Live Server or "python -m http.server") and that the Model/ folder is present.'
    );
    console.error('[SmartWaste] Model load error:', err);
  }
}
// ── Live camera functions ─────────────────────────────
async function startCamera() {
  
  try {
    cameraError.hidden = true;

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    cameraVideo.srcObject = cameraStream;
    cameraView.hidden = false;
    await cameraVideo.play();
  } catch (err) {
    cameraError.textContent =
      'Camera could not open. Please allow camera permission and try again.';
    cameraError.hidden = false;
    console.error('Camera error:', err);
  }
}

async function scanCamera() {
  if (!modelReady) {
    cameraError.textContent = 'Please wait for the AI model to load.';
    cameraError.hidden = false;
    return;
  }

  try {
    cameraScanBtn.disabled = true;
    cameraScanBtn.textContent = '🔍 Scanning...';

    const predictions = await model.predict(cameraVideo);
    const best = predictions.reduce((a, b) =>
      a.probability > b.probability ? a : b
    );

    const pct = (best.probability * 100).toFixed(1);

    resultClass.textContent = best.className;
    resultConf.textContent = `Confidence: ${pct}%`;
    addToLogBtn.hidden = false;
    addToLogBtn.disabled = false;

    showState('result');
  } catch (err) {
    cameraError.textContent = 'Scan failed. Please try again.';
    cameraError.hidden = false;
    console.error('Camera scan error:', err);
  } finally {
    cameraScanBtn.disabled = false;
    cameraScanBtn.textContent = '♻️ Scan Waste';
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }

  cameraVideo.srcObject = null;
  cameraView.hidden = true;
}
function setStatus(text, cls) {
  modelStatus.textContent = text;
  modelStatus.className   = 'model-status ' + cls;
}

// ── File handling ─────────────────────────────────────────────────────────────
function handleFile(file) {
  if (!file) return;
  if (!ACCEPT.includes(file.type)) {
    return showInlineError('Please upload a JPG, PNG, or WEBP image.');
  }
  if (file.size > MAX_BYTES) {
    return showInlineError(`File too large (${(file.size / 1e6).toFixed(1)} MB). Max 10 MB.`);
  }
  hideInlineError();
  showPreview(file);
}

function showPreview(file) {
  const url = URL.createObjectURL(file);
  previewImage.onload  = () => URL.revokeObjectURL(url);
  previewImage.onerror = () => { showInlineError('Could not display image.'); URL.revokeObjectURL(url); };
  previewImage.src = url;
  previewImage.alt = file.name;
  // Show the image, hide the placeholder
  previewImage.hidden  = false;
  imgPlaceholder.hidden = true;
  showState('preview');
}

// ── Classification ────────────────────────────────────────────────────────────
async function classify() {
  if (classifying) return;
  if (!modelReady) return showInlineError('Model is not ready yet. Please wait.');
  if (!previewImage.complete || previewImage.naturalWidth === 0) {
    return showInlineError('Image not fully loaded. Try again in a moment.');
  }

  classifying = true;
  classifyBtn.disabled = true;
  loadingText.textContent = 'Analyzing image…';
  showState('loading');

  try {
    const preds = await model.predict(previewImage);
    console.log('[SmartWaste] Predictions:', preds);
    const best  = preds.reduce((a, b) => a.probability > b.probability ? a : b);
    const pct   = (best.probability * 100).toFixed(1);

    resultClass.textContent = best.className;
    resultConf.textContent  = `Confidence: ${pct}%`;
    addToLogBtn.hidden = false;
addToLogBtn.disabled = false;
    showState('result');
  } catch (err) {
    console.error('[SmartWaste] Classification error:', err);
    showInlineError('Classification failed. See browser console for details.');
    showState('preview');
  } finally {
    classifying = false;
    classifyBtn.disabled = false;
  }
}

// ── Reset ─────────────────────────────────────────────────────────────────────
function reset() {
  previewImage.src    = '';
  previewImage.alt    = '';
  previewImage.hidden = true;
  imgPlaceholder.hidden = false;
  fileInput.value  = '';
  addToLogBtn.hidden = true;
addToLogBtn.disabled = false;
addToLogBtn.textContent = '♻️ Add to Log';
  hideInlineError();
  classifying = false;
  classifyBtn.disabled = false;
  showState('upload');
}

// ── UI state ──────────────────────────────────────────────────────────────────
function showState(state) {
  uploadZone.hidden     = state !== 'upload';
  
  // Keep the preview section visible when showing results so the user can see what was classified
  previewSection.hidden = (state !== 'preview' && state !== 'result');
  
  // Hide the Classify button while loading or showing results
  classifyBtn.hidden    = (state === 'loading' || state === 'result');
  
  loadingSection.hidden = state !== 'loading';
  resultSection.hidden  = state !== 'result';
}

// ── Errors ────────────────────────────────────────────────────────────────────
function showInlineError(msg) { errorMsg.textContent = msg; errorMsg.hidden = false; }
function hideInlineError()    { errorMsg.textContent = ''; errorMsg.hidden = true; }
function showGlobalError(msg) { globalErrorText.textContent = msg; globalError.hidden = false; }

// ── Events ────────────────────────────────────────────────────────────────────
fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

// Click on zone (but not the label/button inside it) → open file picker
uploadZone.addEventListener('click', (e) => {
  if (e.target.closest('label') || e.target.tagName === 'LABEL') return;
  fileInput.click();
});
uploadZone.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

// Drag and drop
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', (e) => {
  if (!uploadZone.contains(e.relatedTarget)) uploadZone.classList.remove('drag-over');
});
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

removeBtn.addEventListener('click', reset);
classifyBtn.addEventListener('click', classify);
resetBtn.addEventListener('click', reset);
cameraStartBtn.addEventListener('click', startCamera);
cameraScanBtn.addEventListener('click', scanCamera);
cameraStopBtn.addEventListener('click', stopCamera);
addToLogBtn.addEventListener('click', () => {
  const label = resultClass.textContent.trim().toLowerCase();

  let type = '';
  if (label.includes('plastic')) type = 'Plastic';
  else if (label.includes('paper')) type = 'Paper';
  else if (label.includes('metal')) type = 'Metal';

  if (!type) {
    showInlineError('Please classify plastic, paper, or metal first.');
    return;
  }

  const typeInput = el('eco-type');
  const quantityInput = el('eco-quantity');
  const recordButton = el('eco-record-button');

  if (!typeInput || !quantityInput || !recordButton) {
    showInlineError('Dashboard form not found. Please refresh the page.');
    return;
  }

  typeInput.value = type;
  quantityInput.value = '1';
  recordButton.click();

  addToLogBtn.disabled = true;
  addToLogBtn.textContent = '✅ Added to Log';
});
// ── Init ──────────────────────────────────────────────────────────────────────
showState('upload');
loadModel();
