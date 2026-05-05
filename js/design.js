let canvas = null;          // instancia Fabric
let designPages = [null];   // Array de estados JSON (null para la primera vez)
let currentPageIndex = 0;
let activeDesignTool = 'select';
let designInitialized = false;

// ── Canva-like UI functions ──────────────────────────────────────

function switchDesignTab(tab, btn) {
    document.querySelectorAll('.canva-ptab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.canva-tab-pane').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const pane = document.getElementById('dtab-' + tab);
    if (pane) pane.classList.add('active');
}

function updateObjPosition(prop, val) {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set(prop, parseFloat(val));
    canvas.renderAll();
}
function updateObjSize(prop, val) {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    const scaleProp = prop === 'width' ? 'scaleX' : 'scaleY';
    const orig = prop === 'width' ? obj.width : obj.height;
    obj.set(scaleProp, parseFloat(val) / orig);
    canvas.renderAll();
}
function updateCommonProp(prop, val) {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.set(prop, val);
    canvas.renderAll();
}
function duplicateSelected() {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (!obj) return;
    obj.clone(cloned => {
        cloned.set({ left: obj.left + 20, top: obj.top + 20 });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
    });
}
function bringForward() {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) { canvas.bringToFront(obj); canvas.renderAll(); saveToHistory(); }
}
function sendBackward() {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) { canvas.sendToBack(obj); canvas.renderAll(); saveToHistory(); }
}
function setTextAlign(align) {
    if (!canvas) return;
    const obj = canvas.getActiveObject();
    if (obj) { obj.set('textAlign', align); canvas.renderAll(); }
}
function saveToHistory() { saveUndoState(); autoSaveDesign(); }

function addTextPreset(type) {
    if (!canvas) return;
    const presets = {
        h1:   { text: 'Título principal', fontSize: 48, fontWeight: 'bold',   fontFamily: 'Inter' },
        h2:   { text: 'Subtítulo',        fontSize: 28, fontWeight: '600',     fontFamily: 'Inter' },
        body: { text: 'Texto normal. Haz clic para editar.', fontSize: 16, fontWeight: 'normal', fontFamily: 'Inter' }
    };
    const p = presets[type];
    const t = new fabric.IText(p.text, {
        left: canvas.width / 2,
        top:  canvas.height / 2,
        originX: 'center', originY: 'center',
        fontSize: p.fontSize, fontWeight: p.fontWeight,
        fontFamily: p.fontFamily, fill: '#000000'
    });
    canvas.add(t);
    canvas.setActiveObject(t);
    canvas.renderAll();
    saveToHistory();
}

function addFrame(type) {
    if (!canvas) return;
    if (type === 'rect-frame') {
        const r = new fabric.Rect({ left: 100, top: 100, width: 200, height: 150, fill: 'transparent', stroke: '#000000', strokeWidth: 3, rx: 4, ry: 4 });
        canvas.add(r); canvas.setActiveObject(r);
    } else if (type === 'circle-frame') {
        const c = new fabric.Circle({ left: 100, top: 100, radius: 80, fill: 'transparent', stroke: '#000000', strokeWidth: 3 });
        canvas.add(c); canvas.setActiveObject(c);
    }
    canvas.renderAll(); saveToHistory();
}

function setCanvasBackground(color) {
    if (!canvas) return;
    canvas.setBackgroundColor(color, canvas.renderAll.bind(canvas));
    saveToHistory();
}

function applyGradientBg(cssGradient) {
    if (!canvas) return;
    const colors = cssGradient.match(/#[0-9a-fA-F]{6}/g) || ['#ffffff', '#000000'];
    const gradient = new fabric.Gradient({
        type: 'linear',
        gradientUnits: 'pixels',
        coords: { x1: 0, y1: 0, x2: canvas.width, y2: canvas.height },
        colorStops: [{ offset: 0, color: colors[0] }, { offset: 1, color: colors[1] }]
    });
    canvas.setBackgroundColor(gradient, canvas.renderAll.bind(canvas));
    saveToHistory();
}

function askDesignAI() {
    const input = document.getElementById('design-ai-input');
    const msgs  = document.getElementById('design-ai-messages');
    if (!input || !msgs) return;
    const text = input.value.trim();
    if (!text) return;
    const userBubble = document.createElement('div');
    userBubble.style.cssText = 'background:var(--accent-subtle);border-radius:8px;padding:6px 10px;font-size:12px;color:var(--text-primary)';
    userBubble.textContent = text;
    msgs.appendChild(userBubble);
    input.value = '';
    // Use Gemini if available
    if (typeof askGemini === 'function') {
        askGemini(text).then(resp => {
            const aiBubble = document.createElement('div');
            aiBubble.style.cssText = 'background:var(--bg-raised);border-radius:8px;padding:6px 10px;font-size:12px;color:var(--text-secondary)';
            aiBubble.textContent = resp || 'Sin respuesta.';
            msgs.appendChild(aiBubble);
            msgs.scrollTop = msgs.scrollHeight;
        }).catch(() => {});
    }
    msgs.scrollTop = msgs.scrollHeight;
}

function _initCanvaUI() {
    // Background colors
    const bgColors = ['#ffffff','#000000','#1a1a2e','#16213e','#0f3460','#533483','#e94560','#f5a623','#7ed321','#417505','#9013fe','#4a90e2','#50e3c2','#b8e986','#ffd6e0','#c8e6c9'];
    const bgGrid = document.getElementById('bg-colors-grid');
    if (bgGrid) {
        bgGrid.innerHTML = bgColors.map(c => `<div class="canva-bg-swatch" style="background:${c}" onclick="setCanvasBackground('${c}')" title="${c}"></div>`).join('');
    }
    // Gradients
    const gradients = [
        { name: 'Atardecer', css: 'linear-gradient(135deg, #f093fb, #f5576c)' },
        { name: 'Océano',    css: 'linear-gradient(135deg, #4facfe, #00f2fe)' },
        { name: 'Bosque',    css: 'linear-gradient(135deg, #43e97b, #38f9d7)' },
        { name: 'Noche',     css: 'linear-gradient(135deg, #30cfd0, #330867)' },
        { name: 'Fuego',     css: 'linear-gradient(135deg, #f7971e, #ffd200)' },
        { name: 'Rosa',      css: 'linear-gradient(135deg, #f953c6, #b91d73)' },
    ];
    const gradGrid = document.getElementById('gradients-grid');
    if (gradGrid) {
        gradGrid.innerHTML = gradients.map(g => `<div class="canva-gradient-item" style="background:${g.css}" title="${g.name}" onclick="applyGradientBg('${g.css}')"></div>`).join('');
    }
    // Templates
    _renderTemplateCards();
    // Upload input handler
    const uploadInput = document.getElementById('image-upload-input');
    if (uploadInput) {
        uploadInput.addEventListener('change', function(e) {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (f) => {
                    fabric.Image.fromURL(f.target.result, (img) => {
                        img.scaleToWidth(300);
                        canvas.add(img);
                        canvas.centerObject(img);
                        canvas.renderAll();
                        // Add to uploaded grid
                        const grid = document.getElementById('uploaded-images-grid');
                        if (grid) {
                            const div = document.createElement('div');
                            div.className = 'canva-uploaded-img';
                            div.innerHTML = `<img src="${f.target.result}" onclick="addImageToCanvas('${f.target.result}')">`;
                            grid.appendChild(div);
                        }
                    });
                };
                reader.readAsDataURL(file);
            });
        });
    }
}

function addImageToCanvas(url) {
    if (!canvas) return;
    fabric.Image.fromURL(url, (img) => {
        img.scaleToWidth(300);
        canvas.add(img);
        canvas.centerObject(img);
        canvas.renderAll();
    });
}

const TEMPLATES = [
    { name: 'Etiqueta Termo',  bg: '#1a1a2e', textColor: '#ffffff', text: 'Termo Premium\nManolette', size: [600,400] },
    { name: 'Etiqueta Regalo', bg: '#f5a623', textColor: '#1a1a2e', text: '¡Feliz Ocasión!\nManolette', size: [400,400] },
    { name: 'Portada Pro',     bg: '#533483', textColor: '#ffffff', text: 'Manolette\nBusiness Platform', size: [800,600] },
    { name: 'Tarjeta',         bg: '#0f3460', textColor: '#ffffff', text: 'Manolette S.A.S.\nContacto: manolette.co', size: [800,450] },
    { name: 'Banner Web',      bg: '#16213e', textColor: '#f5a623', text: 'Manolette\nSoluciones Empresariales', size: [1200,400] },
    { name: 'Post Cuadrado',   bg: '#e94560', textColor: '#ffffff', text: '¡Nuevo Producto!\nManolette', size: [800,800] },
];

function _renderTemplateCards() {
    const grid = document.getElementById('templates-grid');
    if (!grid) return;
    grid.innerHTML = TEMPLATES.map((t, i) => `
        <div class="canva-template-card" onclick="applyTemplate2(${i})" style="background:${t.bg}">
            <div style="display:flex;align-items:center;justify-content:center;height:100%;padding:12px;text-align:center;color:${t.textColor};font-size:10px;font-weight:600;white-space:pre-line">${t.text}</div>
            <div class="canva-template-label">${t.name}</div>
        </div>`).join('');
}

function applyTemplate2(idx) {
    if (!canvas) return;
    const t = TEMPLATES[idx];
    if (!t) return;
    canvas.setWidth(t.size[0]);
    canvas.setHeight(t.size[1]);
    canvas.clear();
    canvas.setBackgroundColor(t.bg, () => {
        const lines = t.text.split('\n');
        lines.forEach((line, i) => {
            const txt = new fabric.IText(line, {
                left: t.size[0] / 2,
                top:  (t.size[1] / 2) + (i - (lines.length-1)/2) * 60,
                originX: 'center', originY: 'center',
                fontSize: i === 0 ? 48 : 28,
                fontWeight: i === 0 ? 'bold' : 'normal',
                fontFamily: 'Inter', fill: t.textColor
            });
            canvas.add(txt);
        });
        canvas.renderAll();
    });
}

function _updateRightPanel() {
    const obj = canvas ? canvas.getActiveObject() : null;
    const noSel   = document.getElementById('canva-no-sel');
    const props   = document.getElementById('canva-props');
    const txtP    = document.getElementById('canva-text-props');
    const shapeP  = document.getElementById('canva-shape-props');
    if (!noSel || !props) return;
    if (!obj) {
        noSel.style.display = 'flex';
        props.style.display = 'none';
        return;
    }
    noSel.style.display = 'none';
    props.style.display = 'block';
    // Position & size
    const x = document.getElementById('prop-x');
    const y = document.getElementById('prop-y');
    const w = document.getElementById('prop-w');
    const h = document.getElementById('prop-h');
    if (x) x.value = Math.round(obj.left);
    if (y) y.value = Math.round(obj.top);
    if (w) w.value = Math.round(obj.getScaledWidth());
    if (h) h.value = Math.round(obj.getScaledHeight());
    // Opacity
    const opEl = document.getElementById('prop-opacity');
    const opVal = document.getElementById('prop-opacity-val');
    if (opEl) { opEl.value = Math.round((obj.opacity || 1) * 100); if (opVal) opVal.textContent = opEl.value + '%'; }
    // Rotation
    const rotEl = document.getElementById('prop-rotation');
    const rotVal = document.getElementById('prop-rotation-val');
    if (rotEl) { rotEl.value = Math.round(obj.angle || 0); if (rotVal) rotVal.textContent = rotEl.value + '°'; }
    // Type-specific
    const isText = obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox';
    if (txtP)   txtP.style.display   = isText ? 'block' : 'none';
    if (shapeP) shapeP.style.display = isText ? 'none' : 'block';
    if (isText) {
        const fontEl = document.getElementById('prop-font');
        const sizeEl = document.getElementById('prop-fontsize');
        const colorEl = document.getElementById('prop-text-color');
        if (fontEl)  fontEl.value  = obj.fontFamily || 'Inter';
        if (sizeEl)  sizeEl.value  = obj.fontSize || 16;
        if (colorEl) colorEl.value = obj.fill || '#000000';
    } else {
        const fillEl   = document.getElementById('prop-fill-color');
        const strokeEl = document.getElementById('prop-stroke-color');
        const strokeW  = document.getElementById('prop-stroke-w');
        if (fillEl)   fillEl.value   = obj.fill   || '#3b82f6';
        if (strokeEl) strokeEl.value = obj.stroke || '#000000';
        if (strokeW)  strokeW.value  = obj.strokeWidth || 0;
    }
}

function undoDesign() { undo(); }
function redoDesign() { redo(); }

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
        const tb = document.getElementById('cv-element-toolbar');
        if (tb) tb.style.display = 'none';
    });

    canvas.on('object:modified', () => { saveUndoState(); autoSaveDesign(); });
    canvas.on('object:added',    () => { saveUndoState(); autoSaveDesign(); });
    canvas.on('object:removed',  () => { saveUndoState(); autoSaveDesign(); });

    canvas.on('selection:created', _updateRightPanel);
    canvas.on('selection:updated', _updateRightPanel);
    canvas.on('selection:cleared', _updateRightPanel);
    canvas.on('object:modified', _updateRightPanel);
    _initCanvaUI();

    loadAutoSavedDesign();
}

/* ── Gestión de Páginas ── */
function updatePageIndicator() {
    const el = document.getElementById('cv-page-indicator');
    if (el) el.textContent = `Página ${currentPageIndex + 1} / ${designPages.length}`;
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

    const area = document.getElementById('design-canvas-wrap') || document.getElementById('design-canvas-area');
    const maxW = (area?.clientWidth || 700) - 64;
    const maxH = (area?.clientHeight || 500) - 64;
    const scale = Math.min(1, maxW / p.w, maxH / p.h);

    canvas.setDimensions({ width: p.w * scale, height: p.h * scale });
    canvas.setZoom(scale);
    canvas._realWidth  = p.w;
    canvas._realHeight = p.h;
    canvas._currentScale = scale;
    canvas.renderAll();

    const zoomLabel = document.getElementById('cv-zoom-label');
    if (zoomLabel) zoomLabel.innerText = Math.round(scale * 100) + '%';

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
    } else if (type === 'star') {
        const points = [];
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? 80 : 35;
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            points.push({ x: 100 + r * Math.cos(angle), y: 100 + r * Math.sin(angle) });
        }
        shape = new fabric.Polygon(points, { left: cx, top: cy, originX: 'center', originY: 'center', fill: '#f5a623' });
    } else if (type === 'line') {
        shape = new fabric.Line([50, 100, 350, 100], { stroke: '#000000', strokeWidth: 3, left: cx, top: cy, originX: 'center', originY: 'center' });
    } else if (type === 'arrow') {
        const arrowPath = 'M 0 20 L 120 20 M 100 5 L 120 20 L 100 35';
        shape = new fabric.Path(arrowPath, { stroke: '#000000', strokeWidth: 3, fill: '', left: cx, top: cy, originX: 'center', originY: 'center' });
    } else if (type === 'heart') {
        shape = new fabric.Path('M 100 30 A 40 40 0 0 1 180 30 A 40 40 0 0 1 260 30 Q 260 80 180 140 Q 100 80 100 30', { fill: '#e94560', stroke: 'transparent', left: cx, top: cy, originX: 'center', originY: 'center' });
    } else if (type === 'rounded-rect') {
        shape = new fabric.Rect({ ...common, width: 200, height: 150, rx: 20, ry: 20 });
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
    const saveStatus = document.querySelector('.cv-save-status');
    if (saveStatus) saveStatus.innerText = 'Cambios guardados';
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

// Upload handler is registered in _initCanvaUI() after canvas is ready

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
        const _isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

        let response;
        if (_isLocal) {
            const token = window.APP_CONFIG?.HF_TOKEN;
            if (!token || token.includes('TU_HF_TOKEN')) {
                throw new Error('Hugging Face Token no configurado en config.js');
            }
            response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: fullPrompt,
                    parameters: { negative_prompt: negative, guidance_scale: 7.5, num_inference_steps: 50 }
                })
            });
        } else {
            // Producción: proxy seguro de Netlify (clave nunca llega al browser)
            response = await fetch('/.netlify/functions/hf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    inputs: fullPrompt,
                    parameters: { negative_prompt: negative, guidance_scale: 7.5, num_inference_steps: 50 }
                })
            });
        }

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

/* ── Tab switching (legacy, replaced by Canva UI version above) ── */

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
