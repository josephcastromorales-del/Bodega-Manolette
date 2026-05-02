let canvas = null;          // instancia Fabric
let designPages = [null];   // Array de estados JSON (null para la primera vez)
let currentPageIndex = 0;
let activeDesignTool = 'select';
let designInitialized = false;

const CANVAS_PRESETS = {
    square:    { w: 800,  h: 800,  label: 'Cuadrado 800×800' },
    instagram: { w: 1080, h: 1080, label: 'Instagram 1080×1080' },
    termo:     { w: 600,  h: 400,  label: 'Etiqueta Termo 600×400' },
    banner:    { w: 1200, h: 400,  label: 'Banner 1200×400' },
    a4v:       { w: 794,  h: 1123, label: 'A4 Vertical' },
    portada:   { w: 1000, h: 1000, label: 'Portada Producto 1000×1000' },
    tarjeta:   { w: 1050, h: 600,  label: 'Tarjeta Presentación' },
};

const DESIGN_FONTS = [
    'Inter', 'Arial', 'Georgia', 'Playfair Display', 'Oswald',
    'Lato', 'Pacifico', 'Roboto Mono', 'Montserrat', 'Raleway'
];

/* ── Inicializar ── */
function initDeseno() {
    if (designInitialized) return;
    designInitialized = true;

    // Poblar select de fuentes
    const fontSel = document.getElementById('prop-font-family');
    if (fontSel) {
        fontSel.innerHTML = DESIGN_FONTS.map(f =>
            `<option value="${f}" style="font-family:${f}">${f}</option>`).join('');
    }

    // Inicializar canvas
    canvas = new fabric.Canvas('design-canvas', {
        backgroundColor: '#ffffff',
        preserveObjectStacking: true,
        selection: true,
    });

    applyCanvasPreset('square');
    
    // Listeners
    canvas.on('selection:created', updateFloatingToolbar);
    canvas.on('selection:updated', updateFloatingToolbar);
    canvas.on('selection:cleared', () => {
        document.getElementById('cv-element-toolbar').style.display = 'none';
    });

    canvas.on('object:modified', () => { saveUndoState(); autoSaveDesign(); });
    canvas.on('object:added',    () => { saveUndoState(); autoSaveDesign(); });
    canvas.on('object:removed',  () => { saveUndoState(); autoSaveDesign(); });

    loadAutoSavedDesign();
    renderTemplates();
}

/* ── Gestión de Páginas ── */
function updatePageIndicator() {
    const el = document.getElementById('cv-page-indicator');
    if (el) el.innerText = `Página ${currentPageIndex + 1} / ${designPages.length}`;
}

function addNewPage() {
    // Guardar página actual
    designPages[currentPageIndex] = JSON.stringify(canvas);
    
    // Crear nueva página limpia
    designPages.push(null);
    currentPageIndex = designPages.length - 1;
    
    canvas.clear();
    canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
    
    updatePageIndicator();
    saveUndoState();
}

function prevPage() {
    if (currentPageIndex > 0) switchPage(currentPageIndex - 1);
}

function nextPage() {
    if (currentPageIndex < designPages.length - 1) switchPage(currentPageIndex + 1);
}

function switchPage(index) {
    // Guardar actual
    designPages[currentPageIndex] = JSON.stringify(canvas);
    
    currentPageIndex = index;
    const state = designPages[index];
    
    if (state) {
        canvas.loadFromJSON(state, () => {
            canvas.renderAll();
            updatePageIndicator();
        });
    } else {
        canvas.clear();
        canvas.setBackgroundColor('#ffffff', canvas.renderAll.bind(canvas));
        updatePageIndicator();
    }
}

/* ── UI Contextual ── */
function switchCanvasPanel(panelId) {
    // Nav rail
    document.querySelectorAll('.cv-rail-item').forEach(btn => {
        const isTarget = btn.getAttribute('onclick').includes(panelId);
        btn.classList.toggle('active', isTarget);
    });

    // Content
    document.querySelectorAll('.cv-panel-content').forEach(p => {
        p.classList.toggle('active', p.id === `cv-panel-${panelId}`);
    });
}

function updateFloatingToolbar() {
    const activeObj = canvas.getActiveObject();
    const toolbar = document.getElementById('cv-element-toolbar');
    const textTools = document.getElementById('cv-text-tools');
    const shapeTools = document.getElementById('cv-shape-tools');

    if (!activeObj) {
        toolbar.style.display = 'none';
        return;
    }

    toolbar.style.display = 'flex';
    
    // Posicionar toolbar cerca del objeto
    const bound = activeObj.getBoundingRect();
    toolbar.style.top = `${bound.top - 60}px`;
    
    if (activeObj.type === 'textbox' || activeObj.type === 'i-text') {
        textTools.style.display = 'flex';
        shapeTools.style.display = 'none';
        
        // Sincronizar valores
        document.getElementById('prop-font-family').value = activeObj.fontFamily;
        document.getElementById('prop-font-size').value = Math.round(activeObj.fontSize);
        document.getElementById('prop-text-color').value = activeObj.fill;
    } else {
        textTools.style.display = 'none';
        shapeTools.style.display = 'flex';
        
        document.getElementById('prop-fill-color').value = activeObj.fill || '#000000';
    }
}

/* ── Presets de tamaño ── */
function applyCanvasPreset(key) {
    const p = CANVAS_PRESETS[key];
    if (!p || !canvas) return;

    const area = document.getElementById('design-canvas-area');
    const maxW = (area?.clientWidth || 700) - 64;
    const maxH = (area?.clientHeight || 500) - 64;
    const scale = Math.min(1, maxW / p.w, maxH / p.h);

    canvas.setDimensions({ width: p.w * scale, height: p.h * scale });
    canvas.setZoom(scale);
    canvas._realWidth  = p.w;
    canvas._realHeight = p.h;
    canvas._currentScale = scale;
    canvas.renderAll();
    
    document.getElementById('cv-zoom-label').innerText = Math.round(scale * 100) + '%';
    
    autoSaveDesign();
}

function zoomCanvas(action) {
    if (!canvas) return;
    let zoom = canvas.getZoom();
    const step = 0.1;
    if (action === 'in') zoom += step;
    else if (action === 'out') zoom -= step;
    
    zoom = Math.min(Math.max(0.1, zoom), 5);
    canvas.setZoom(zoom);
    canvas.setWidth((canvas._realWidth || 800) * zoom);
    canvas.setHeight((canvas._realHeight || 800) * zoom);
    canvas.renderAll();
    
    document.getElementById('cv-zoom-label').innerText = Math.round(zoom * 100) + '%';
}

/* ── Herramientas de elementos ── */
function addText(type = 'body') {
    if (!canvas) return;
    
    let fontSize = 24;
    let text = 'Texto de cuerpo';
    let fontWeight = 'normal';

    if (type === 'heading') {
        fontSize = 52;
        text = 'Agregar título';
        fontWeight = 'bold';
    } else if (type === 'subheading') {
        fontSize = 32;
        text = 'Agregar subtítulo';
        fontWeight = '600';
    }

    const t = new fabric.Textbox(text, {
        left: (canvas._realWidth  || canvas.width)  / 2,
        top:  (canvas._realHeight || canvas.height) / 2,
        fontSize:    fontSize,
        fontFamily:  'Inter',
        fill:        '#0f172a',
        fontWeight:  fontWeight,
        textAlign:   'center',
        originX: 'center',
        originY: 'center',
        width: 400,
        splitByGrapheme: true,
        lockScalingFlip: true,
    });

    canvas.add(t);
    canvas.setActiveObject(t);
    canvas.renderAll();
    t.enterEditing();
}

function addShape(type) {
    if (!canvas) return;
    const cx = (canvas._realWidth  || canvas.width)  / 2;
    const cy = (canvas._realHeight || canvas.height) / 2;
    let shape;

    const common = {
        left: cx, top: cy,
        originX: 'center', originY: 'center',
        fill: '#3b82f6',
        lockScalingFlip: true
    };

    if (type === 'rect') {
        shape = new fabric.Rect({ ...common, width: 200, height: 120, rx: 8, ry: 8 });
    } else if (type === 'circle') {
        shape = new fabric.Circle({ ...common, radius: 80 });
    } else if (type === 'triangle') {
        shape = new fabric.Triangle({ ...common, width: 160, height: 140 });
    }

    if (shape) {
        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.renderAll();
    }
}

function deleteSelected() {
    if (!canvas) return;
    const active = canvas.getActiveObjects();
    if (active.length) {
        active.forEach(obj => canvas.remove(obj));
        canvas.discardActiveObject();
        canvas.renderAll();
    }
}

/* ── Propiedades ── */
function updateTextProp(prop, val) {
    const obj = canvas?.getActiveObject();
    if (!obj || !obj.set) return;
    obj.set(prop, val);
    canvas.renderAll();
}

function updateShapeProp(prop, val) {
    const obj = canvas?.getActiveObject();
    if (!obj || !obj.set) return;
    obj.set(prop, val);
    canvas.renderAll();
}

function toggleBold() {
    const obj = canvas?.getActiveObject();
    if (!obj || !obj.set) return;
    const isBold = obj.fontWeight === 'bold';
    obj.set('fontWeight', isBold ? 'normal' : 'bold');
    canvas.renderAll();
    updateFloatingToolbar();
}

function toggleItalic() {
    const obj = canvas?.getActiveObject();
    if (!obj || !obj.set) return;
    const isItalic = obj.fontStyle === 'italic';
    obj.set('fontStyle', isItalic ? 'normal' : 'italic');
    canvas.renderAll();
    updateFloatingToolbar();
}

/* ── Export / Save ── */
function exportDesign(format = 'png') {
    if (!canvas) return;
    const dataURL = canvas.toDataURL({
        format: format === 'jpg' ? 'jpeg' : 'png',
        quality: 0.95,
        multiplier: 2 // High res
    });
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `manolette-design.${format}`;
    link.click();
    showToast(`Diseño exportado como ${format.toUpperCase()}`);
}

let undoStack = [];
let redoStack = [];

function saveUndoState() {
    if (!canvas) return;
    const json = JSON.stringify(canvas);
    if (undoStack.length > 0 && undoStack[undoStack.length - 1] === json) return;
    undoStack.push(json);
    if (undoStack.length > 50) undoStack.shift();
    redoStack = []; // Reset redo on new action
}

function undo() {
    if (undoStack.length <= 1) return;
    redoStack.push(undoStack.pop());
    const state = undoStack[undoStack.length - 1];
    canvas.loadFromJSON(state, () => {
        canvas.renderAll();
        showToast('Deshecho');
    });
}

function redo() {
    if (redoStack.length === 0) return;
    const state = redoStack.pop();
    undoStack.push(state);
    canvas.loadFromJSON(state, () => {
        canvas.renderAll();
        showToast('Rehecho');
    });
}

/* ── Persistencia ── */
function autoSaveDesign() {
    if (!canvas) return;
    const json = JSON.stringify(canvas);
    localStorage.setItem('cv_design_autosave', json);
    document.querySelector('.cv-save-status').innerText = 'Cambios guardados';
}

function loadAutoSavedDesign() {
    const saved = localStorage.getItem('cv_design_autosave');
    if (saved && canvas) {
        canvas.loadFromJSON(saved, () => {
            canvas.renderAll();
            updatePageIndicator();
        });
    }
}

/* ── Templates Mock ── */
function renderTemplates() {
    const list = document.getElementById('template-list');
    if (!list) return;
    
    const mocks = [
        { name: 'Publicidad Termo', color: '#1e3a8a' },
        { name: 'Etiqueta Vaso', color: '#065f46' },
        { name: 'Banner Evento', color: '#991b1b' },
        { name: 'Tarjeta Regalo', color: '#854d0e' }
    ];

    list.innerHTML = mocks.map(m => `
        <div class="cv-shape-btn" style="background:${m.color}; color:white; font-size:10px; padding:10px; text-align:center" onclick="showToast('Aplicando plantilla...')">
            ${m.name}
        </div>
    `).join('');
}

/* ── Uploads ── */
function triggerImageUpload() {
    document.getElementById('image-upload-input').click();
}

document.getElementById('image-upload-input')?.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (f) => {
        fabric.Image.fromURL(f.target.result, (img) => {
            img.scaleToWidth(300);
            canvas.add(img);
            canvas.centerObject(img);
            canvas.renderAll();
        });
    };
    reader.readAsDataURL(file);
});

/* ── Generación de Imagen IA (Hugging Face) ── */

async function executeHFGeneration() {
    const promptArea = document.getElementById('hf-prompt');
    const prompt = promptArea?.value.trim();
    if (!prompt) return;

    const model = document.getElementById('hf-model').value;
    const style = document.getElementById('hf-style').value;
    const negative = document.getElementById('hf-negative').value;
    const aspect = document.querySelector('input[name="hf-aspect"]:checked')?.value || '1:1';
    
    const fullPrompt = `${prompt}${style}`;
    const btn = document.getElementById('btn-generate-hf');
    const historyEl = document.getElementById('hf-chat-history');

    // UI Feedback
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generando...';
    
    const userMsg = createHFChatBubble('user', prompt);
    historyEl.appendChild(userMsg);
    scrollHFChat();

    const aiMsg = createHFChatBubble('ai', 'Procesando tu solicitud en el servidor neural...');
    historyEl.appendChild(aiMsg);
    scrollHFChat();

    try {
        const token = window.APP_CONFIG?.HF_TOKEN;
        if (!token || token.includes('TU_HF_TOKEN')) {
            throw new Error('Hugging Face Token no configurado en config.js');
        }

        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
            headers: { 
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            method: "POST",
            body: JSON.stringify({
                inputs: fullPrompt,
                parameters: {
                    negative_prompt: negative,
                    guidance_scale: 7.5,
                    num_inference_steps: 50
                }
            }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);

        // Update AI bubble
        aiMsg.innerHTML = `
            <div class="hf-result-card">
                <img src="${imageUrl}" class="hf-result-img" onclick="addToCanvas('${imageUrl}')">
                <div class="hf-result-actions">
                    <button class="btn btn-primary btn-sm" onclick="addToCanvas('${imageUrl}')">Insertar en Diseño</button>
                    <button class="btn btn-secondary btn-sm" onclick="downloadBlob('${imageUrl}')">Descargar</button>
                </div>
            </div>
        `;
        
        addToHFGallery(imageUrl, prompt);
        promptArea.value = '';
        
    } catch (err) {
        aiMsg.innerHTML = `<div class="alert alert-error"><strong>Fallo en la generación:</strong> ${err.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Generar Activo';
        scrollHFChat();
    }
}

function createHFChatBubble(role, content) {
    const div = document.createElement('div');
    div.className = `hf-bubble hf-bubble-${role}`;
    div.innerHTML = `
        <div class="hf-bubble-content">${content}</div>
        <div class="hf-bubble-meta">${role === 'user' ? 'Tú' : 'Asistente Creativo'} • ${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
    `;
    return div;
}

function scrollHFChat() {
    const el = document.getElementById('hf-chat-history');
    if (el) el.scrollTop = el.scrollHeight;
}

function clearHFChat() {
    const history = document.getElementById('hf-chat-history');
    if (history) history.innerHTML = '<div class="hf-welcome"><h1>Nueva Sesión Creativa</h1><p>¿Qué vamos a diseñar hoy?</p></div>';
    showToast('Historial limpiado');
}

function addToHFGallery(url, prompt) {
    const gal = document.getElementById('hf-gallery');
    if (!gal) return;
    
    // Remove empty state
    const empty = gal.querySelector('.empty-state');
    if (empty) empty.remove();

    const item = document.createElement('div');
    item.className = 'hf-gallery-item';
    item.innerHTML = `
        <img src="${url}" title="${prompt}" onclick="addToCanvas('${url}')">
        <div class="hf-item-overlay">
            <button onclick="addToCanvas('${url}')">+</button>
        </div>
    `;
    gal.prepend(item);
    
    const countEl = document.getElementById('hf-gal-count');
    if (countEl) countEl.innerText = `${gal.querySelectorAll('.hf-gallery-item').length} items`;
}

function addToCanvas(url) {
    if (!canvas) return;
    fabric.Image.fromURL(url, (img) => {
        const scale = Math.min(400 / img.width, 400 / img.height);
        img.scale(scale);
        canvas.add(img);
        canvas.centerObject(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveUndoState();
        showToast('Imagen insertada en el canvas');
        closeModal('modal-hf-generator');
    }, { crossOrigin: 'anonymous' });
}

function downloadBlob(url) {
    const link = document.createElement('a');
    link.href = url;
    link.download = `manolette-ia-asset-${Date.now()}.png`;
    link.click();
}

/* ── Tab switching ── */
function switchDesignTab(tab) {
    document.querySelectorAll('.dtab').forEach((t) => {
        const isThis = t.getAttribute('onclick').includes(`'${tab}'`);
        t.classList.toggle('active', isThis);
    });
    document.querySelectorAll('.design-tab-content').forEach(el => {
        el.classList.toggle('active', el.id === `dtab-${tab}`);
    });
}

/* ── Keyboard shortcuts ── */
document.addEventListener('keydown', e => {
    if (!canvas || document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
    const section = document.getElementById('disenoSection');
    if (!section || !section.classList.contains('active')) return;

    if (e.key === 'Delete' || e.key === 'Backspace') {
        const obj = canvas.getActiveObject();
        if (obj && obj.type !== 'textbox' && !obj.isEditing) { deleteSelected(); e.preventDefault(); }
    }
    if (e.ctrlKey && e.key === 'z') { undoDesign(); e.preventDefault(); }
    if (e.ctrlKey && e.key === 'y') { redoDesign(); e.preventDefault(); }
});

window.onSection_diseno = initDeseno;
