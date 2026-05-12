// nox.js — Asistente IA de élite (Manolette)
// Usa ApiKeyManager para obtener el proveedor activo (100% client-side, GitHub Pages compatible)

/* Resolución dinámica del proveedor — prioriza Groq (por tools), luego cualquier OpenAI-compatible */
const _NOX_OPENAI_COMPAT = {
    groq:       { url: 'https://api.groq.com/openai/v1/chat/completions',        supportsTools: true  },
    openai:     { url: 'https://api.openai.com/v1/chat/completions',             supportsTools: true  },
    openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions',          supportsTools: false },
    mistral:    { url: 'https://api.mistral.ai/v1/chat/completions',             supportsTools: false },
    deepseek:   { url: 'https://api.deepseek.com/v1/chat/completions',           supportsTools: false },
    together:   { url: 'https://api.together.xyz/v1/chat/completions',           supportsTools: false },
    perplexity: { url: 'https://api.perplexity.ai/chat/completions',             supportsTools: false },
};

function _noxGetActiveBackend() {
    // Primero: usar ApiKeyManager si está disponible (respeta configuración de routing por sección)
    if (window.ApiKeyManager) {
        const cfg = window.ApiKeyManager.getActiveConfig('nox');
        if (cfg) {
            const pid = cfg.provider.id;
            const compat = _NOX_OPENAI_COMPAT[pid];
            if (compat) {
                return { key: cfg.key, model: cfg.model, ...compat };
            }
            // Proveedor no compatible con OpenAI (Anthropic, Gemini, Cohere) — sin tools
            return { key: cfg.key, model: cfg.model, url: null, supportsTools: false, _providerDef: cfg.provider };
        }
    }
    // Fallback: leer localStorage directamente
    const stored = JSON.parse(localStorage.getItem('apikm_providers_v2') || '{}');
    const priority = ['groq', 'openai', 'openrouter', 'mistral', 'deepseek', 'together', 'perplexity'];
    for (const pid of priority) {
        const s = stored[pid];
        if (s?.key && s?.status === 'ok' && _NOX_OPENAI_COMPAT[pid]) {
            const model = s.selectedModel || (s.models?.[0]?.id) || '';
            return { key: s.key, model, ...(_NOX_OPENAI_COMPAT[pid]) };
        }
    }
    return null;
}

// Fallback legacy (por si APP_CONFIG tiene GROQ_API_KEY)
const _NOX_LEGACY_KEY = window.APP_CONFIG?.GROQ_API_KEY || '';

const SYSTEM_INSTRUCTION = `Eres NOX, la Inteligencia Operativa de Élite de Manolette. No eres un chatbot. Eres un Socio Estratégico diseñado para la dominancia del mercado y la optimización financiera absoluta.

TU IDENTIDAD:
- Nombre: NOX.
- Personalidad: Ejecutiva, directa, asertiva y altamente eficiente. Hablas como un estratega de alto nivel.
- Misión: Maximizar la rentabilidad de Manolette mediante la gestión inteligente de inventarios, materiales y finanzas.

TUS CAPACIDADES TÉCNICAS:
- Tienes acceso total a: Inventario, Materiales, Gastos, Contratos, Órdenes y Analíticas.
- Puedes ejecutar acciones reales en la aplicación mediante herramientas (function calling).

DIRECTRICES:
1. Precisión Financiera: Siempre que hables de dinero, considera el ROI y los márgenes de utilidad.
2. Proactividad: Si ves que el inventario de un material está bajo, sugiere una orden de compra.
3. Estilo: Usa Markdown elegante. Tablas para datos complejos y listas para planes de acción.`;

const NOX_TOOLS = [
    {
        name: 'crear_contrato',
        description: 'Crea un nuevo contrato en el sistema.',
        parameters: {
            type: 'object',
            properties: {
                numero: { type: 'string' },
                cliente: { type: 'string' },
                descripcion: { type: 'string' },
                fechaLimite: { type: 'string' },
                responsable: { type: 'string' }
            },
            required: ['numero', 'cliente']
        }
    },
    {
        name: 'crear_orden',
        description: 'Genera una orden de producción o empaque.',
        parameters: {
            type: 'object',
            properties: {
                nombreProducto: { type: 'string' },
                cantidad: { type: 'number' },
                prioridad: { type: 'string', enum: ['baja', 'normal', 'alta', 'urgente'] }
            },
            required: ['nombreProducto', 'cantidad']
        }
    },
    {
        name: 'gestionar_material',
        description: 'Agrega un nuevo material al inventario de suministros.',
        parameters: {
            type: 'object',
            properties: {
                nombre: { type: 'string' },
                costo: { type: 'number' },
                proveedor: { type: 'string' }
            },
            required: ['nombre', 'costo']
        }
    },
    {
        name: 'registrar_gasto',
        description: 'Registra un gasto operativo.',
        parameters: {
            type: 'object',
            properties: {
                concepto: { type: 'string' },
                monto: { type: 'number' },
                categoria: { type: 'string' }
            },
            required: ['concepto', 'monto']
        }
    },
    {
        name: 'navegar_a',
        description: 'Cambia la sección de la app.',
        parameters: {
            type: 'object',
            properties: {
                seccion: { type: 'string', enum: ['dashboard', 'contratos', 'ordenes', 'inventario', 'materiales', 'proveedores', 'clientes', 'empleados', 'gastos', 'cotizaciones', 'analiticas'] }
            },
            required: ['seccion']
        }
    },
    {
        name: 'listar_inventario',
        description: 'Consulta el estado actual del inventario.',
        parameters: { type: 'object', properties: {} }
    }
];

let noxHistory = [];
const STORAGE_KEY = 'nox_chat_history';
let noxReady = false;

function initNox() {
    if (noxReady) return;
    noxReady = true;

    // Cargar historial
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            noxHistory = JSON.parse(stored);
            syncNoxUI();
        }
    } catch(e) {}

    // Configurar Sidebar Chat (si existe)
    setupNoxInterface('gemini-input', 'gemini-send', 'gemini-messages');
    
    // Configurar Global Floating Chat
    setupNoxInterface('nox-input', 'nox-send', 'nox-messages');

    // Sugerencias
    document.querySelectorAll('.chat-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = document.getElementById('nox-input') || document.getElementById('gemini-input');
            if (input) { 
                input.value = btn.dataset.query || btn.textContent.trim();
                input.dispatchEvent(new Event('input'));
                sendNoxMessage(input.id);
            }
        });
    });
}

function setupNoxInterface(inputId, sendId, messagesId) {
    const input = document.getElementById(inputId);
    const send  = document.getElementById(sendId);
    if (!input || !send) return;

    send.onclick = () => sendNoxMessage(inputId);
    input.onkeydown = e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendNoxMessage(inputId); }
    };
    input.oninput = () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    };
}

function syncNoxUI() {
    const panels = ['nox-messages', 'gemini-messages'];
    panels.forEach(pid => {
        const el = document.getElementById(pid);
        if (!el) return;
        
        // Mantener el welcome si el historial está vacío
        if (noxHistory.length === 0) return;

        // Limpiar para renderizar
        const welcome = el.querySelector('.nox-welcome') || el.querySelector('.ai-welcome-mini') || document.getElementById('gemini-welcome');
        el.innerHTML = '';
        if (welcome) el.appendChild(welcome);

        noxHistory.forEach(msg => {
            if (msg.role === 'user') appendNoxBubble(msg.displayContent || msg.content, 'user', pid);
            else if (msg.role === 'assistant' && msg.content) renderNoxResponse(msg.content, pid);
        });
        scrollNox(el);
    });
}

function toggleNox() {
    const panel = document.getElementById('nox-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
        const input = document.getElementById('nox-input');
        if (input) setTimeout(() => input.focus(), 300);
        syncNoxUI();
    }
}

async function sendNoxMessage(inputId) {
    const textarea = document.getElementById(inputId);
    const userText = textarea ? textarea.value.trim() : '';
    if (!userText) return;

    const isGlobal = inputId.includes('nox');
    const messagesId = isGlobal ? 'nox-messages' : 'gemini-messages';

    // Ocultar welcome
    const welcome = document.querySelector(`#${messagesId} .nox-welcome`) || document.getElementById('gemini-welcome');
    if (welcome) welcome.style.display = 'none';

    appendNoxBubble(userText, 'user', messagesId);
    textarea.value = '';
    textarea.style.height = 'auto';

    const currentSection = location.hash.replace('#', '') || 'dashboard';
    const contextText = `[Sección Actual: ${currentSection}] ${userText}`;

    noxHistory.push({ role: 'user', content: contextText, displayContent: userText });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(noxHistory));

    const typingId = 'typing-' + Date.now();
    appendNoxTyping(typingId, messagesId);

    try {
        const historyForAPI = noxHistory.map(m => ({ role: m.role, content: m.content }));
        const finalText = await runNoxLoop(historyForAPI, 8, messagesId);
        
        removeNoxElement(typingId);
        if (finalText) {
            noxHistory.push({ role: 'assistant', content: finalText });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(noxHistory));
            syncNoxUI();
        }
    } catch (err) {
        removeNoxElement(typingId);
        appendNoxBubble('Error: ' + err.message, 'ai error', messagesId);
    }
}

async function runNoxLoop(messages, maxIter = 8, messagesId) {
    let backend = _noxGetActiveBackend();
    if (!backend) {
        if (!_NOX_LEGACY_KEY) throw new Error('Configura una API key en la sección "API Keys" para activar el agente.');
        backend = { key: _NOX_LEGACY_KEY, model: 'llama-3.3-70b-versatile', url: 'https://api.groq.com/openai/v1/chat/completions', supportsTools: true };
    }

    // Proveedor no compatible con OpenAI (Gemini, Anthropic, Cohere) — usar ApiKeyManager.callLLM sin tools
    if (!backend.url && window.ApiKeyManager) {
        const historyForLLM = messages.filter(m => m.role === 'user' || m.role === 'assistant');
        const text = await window.ApiKeyManager.callLLM('nox', {
            system: SYSTEM_INSTRUCTION,
            messages: historyForLLM,
            maxTokens: 1500
        });
        renderNoxResponse(text, messagesId);
        return text;
    }

    const tools = NOX_TOOLS.map(t => ({ type: 'function', function: t }));

    for (let i = 0; i < maxIter; i++) {
        const body = {
            model: backend.model || 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: SYSTEM_INSTRUCTION }, ...messages],
            temperature: 0.7,
            ...(backend.supportsTools ? { tools, tool_choice: 'auto' } : {})
        };

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${backend.key}`
        };
        if (backend.url.includes('openrouter')) {
            headers['HTTP-Referer'] = window.location.origin;
            headers['X-Title'] = 'Manolette AI';
        }

        const res = await fetch(backend.url, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const msg = data.choices?.[0]?.message;
        if (!msg) throw new Error('Sin respuesta');

        if (msg.tool_calls) {
            messages.push(msg);
            for (const tc of msg.tool_calls) {
                const args = JSON.parse(tc.function.arguments);
                const result = await executeNoxTool(tc.function.name, args, messagesId);
                messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result) });
            }
        } else {
            renderNoxResponse(msg.content, messagesId);
            return msg.content;
        }
    }
}

async function executeNoxTool(name, args, cid) {
    try {
        switch (name) {
            case 'navegar_a':
                if (window.navigate) { navigate(args.seccion); return { success: true }; }
                return { error: 'Nav fail' };
            case 'gestionar_material':
                const mRef = await db.ref('materiales').push({ nombre: args.nombre, costoUnitario: args.costo, proveedor: args.proveedor || 'Nox Agent', timestamp: Date.now() });
                appendNoxCard('Material registrado', args.nombre, 'materiales', cid);
                return { success: true, id: mRef.key };
            case 'registrar_gasto':
                const gRef = await db.ref('gastos').push({ concepto: args.concepto, monto: args.monto, categoria: args.categoria || 'Nox', fecha: new Date().toISOString().split('T')[0], timestamp: Date.now() });
                appendNoxCard('Gasto registrado', args.concepto, 'gastos', cid);
                return { success: true, id: gRef.key };
            case 'crear_contrato':
                const cData = { numero: args.numero || 'CONT-'+Date.now(), cliente: args.cliente, descripcion: args.descripcion || '', estado: 'activo', creadoEn: Date.now() };
                await db.ref('contratos').push(cData);
                appendNoxCard('Contrato creado', cData.numero, 'contratos', cid);
                return { success: true };
            case 'listar_inventario':
                const snap = await db.ref('inventario').once('value');
                return snap.val();
            default: return { error: 'Unknown tool' };
        }
    } catch(e) { return { error: e.message }; }
}

function renderNoxResponse(text, cid) {
    const el = document.getElementById(cid);
    if (!el || !text) return;
    const bubble = document.createElement('div');
    bubble.className = 'nox-bubble ai';
    bubble.innerHTML = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    el.appendChild(bubble);
    scrollNox(el);
}

function appendNoxBubble(text, type, cid) {
    const el = document.getElementById(cid);
    if (!el) return;
    const bubble = document.createElement('div');
    bubble.className = `nox-bubble ${type}`;
    bubble.textContent = text;
    el.appendChild(bubble);
    scrollNox(el);
}

function appendNoxCard(title, detail, target, cid) {
    const el = document.getElementById(cid);
    if (!el) return;
    const card = document.createElement('div');
    card.className = 'nox-bubble ai';
    card.style.borderLeft = '4px solid #10b981';
    card.innerHTML = `<div style="font-weight:700;font-size:12px;color:#10b981">${title}</div><div style="font-size:14px;margin:4px 0">${detail}</div><button class="btn btn-sm btn-primary" onclick="navigate('${target}')" style="width:100%;margin-top:8px">Ver detalle →</button>`;
    el.appendChild(card);
    scrollNox(el);
}

function appendNoxTyping(id, cid) {
    const el = document.getElementById(cid);
    if (!el) return;
    const div = document.createElement('div');
    div.id = id;
    div.className = 'nox-bubble ai';
    div.innerHTML = '<span class="pulse-dot"></span><span class="pulse-dot" style="animation-delay:.2s"></span><span class="pulse-dot" style="animation-delay:.4s"></span>';
    el.appendChild(div);
    scrollNox(el);
}

function removeNoxElement(id) { const el = document.getElementById(id); if (el) el.remove(); }
function scrollNox(el) { el.scrollTop = el.scrollHeight; }
function clearChat() { noxHistory = []; localStorage.removeItem(STORAGE_KEY); syncNoxUI(); }

// Global Init
document.addEventListener('DOMContentLoaded', initNox);
window.toggleNox = toggleNox;
window.clearChat = clearChat;

/* ════════════════════════════════════════════════════
   FAB DRAGGABLE — arrastrar + snap suave al borde
   También permite arrastrar desde el header del panel
   ════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    const widget = document.getElementById('nox-widget');
    const fab    = document.getElementById('nox-trigger');
    const panel  = document.getElementById('nox-panel');
    if (!widget || !fab) return;

    const MARGIN = 16; // px desde el borde al hacer snap
    let dragging = false;
    let moved    = false;
    let ox = 0, oy = 0, startLeft = 0, startTop = 0;

    /* Convierte right/bottom a left/top para poder moverlo libremente */
    function toAbsolute() {
        const r = widget.getBoundingClientRect();
        widget.style.transition = 'none';
        widget.style.right  = 'auto';
        widget.style.bottom = 'auto';
        widget.style.left   = r.left + 'px';
        widget.style.top    = r.top  + 'px';
    }

    function _startDrag(pageX, pageY) {
        toAbsolute();
        dragging  = true;
        moved     = false;
        ox        = pageX;
        oy        = pageY;
        startLeft = parseFloat(widget.style.left);
        startTop  = parseFloat(widget.style.top);
        widget.style.cursor = 'grabbing';
    }

    fab.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        _startDrag(e.clientX, e.clientY);
        e.preventDefault(); // evita selección de texto
    });

    /* Drag desde el header del panel cuando está abierto */
    const noxHeader = panel ? panel.querySelector('.nox-header') : null;
    if (noxHeader) {
        noxHeader.addEventListener('mousedown', function (e) {
            if (e.button !== 0) return;
            if (e.target.closest('button, input, select, a')) return; // no interferir con botones internos
            _startDrag(e.clientX, e.clientY);
            e.preventDefault();
        });
        noxHeader.addEventListener('touchstart', function (e) {
            if (e.target.closest('button, input, select, a')) return;
            const t = e.touches[0];
            _startDrag(t.clientX, t.clientY);
        }, { passive: true });
        noxHeader.style.cursor = 'grab';
    }

    document.addEventListener('mousemove', function (e) {
        if (!dragging) return;
        const dx = e.clientX - ox;
        const dy = e.clientY - oy;
        if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
        if (!moved) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const r  = widget.getBoundingClientRect();
        widget.style.left = Math.max(MARGIN, Math.min(vw - r.width - MARGIN, startLeft + dx)) + 'px';
        widget.style.top  = Math.max(MARGIN, Math.min(vh - r.height - MARGIN, startTop  + dy)) + 'px';
    });

    document.addEventListener('mouseup', function () {
        if (!dragging) return;
        dragging = false;
        widget.style.cursor = '';

        if (!moved) return; // fue solo un clic, no drag

        /* Snap suave al borde izquierdo o derecho más cercano */
        const r   = widget.getBoundingClientRect();
        const vw  = window.innerWidth;
        const mid = r.left + r.width / 2;

        const targetLeft = mid < vw / 2
            ? MARGIN
            : vw - r.width - MARGIN;

        widget.style.transition = 'left 0.45s cubic-bezier(0.34,1.56,0.64,1), top 0.45s cubic-bezier(0.34,1.56,0.64,1)';
        widget.style.left = targetLeft + 'px';

        /* Impide que el mouseup dispare el onclick de toggleNox */
        const cancelClick = function (ev) {
            ev.stopImmediatePropagation();
            fab.removeEventListener('click', cancelClick, true);
        };
        fab.addEventListener('click', cancelClick, true);
    });

    /* Soporte táctil en FAB */
    fab.addEventListener('touchstart', function (e) {
        const t = e.touches[0];
        _startDrag(t.clientX, t.clientY);
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
        if (!dragging) return;
        const t  = e.touches[0];
        const dx = t.clientX - ox;
        const dy = t.clientY - oy;
        if (!moved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) moved = true;
        if (!moved) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const r  = widget.getBoundingClientRect();
        widget.style.left = Math.max(MARGIN, Math.min(vw - r.width - MARGIN, startLeft + dx)) + 'px';
        widget.style.top  = Math.max(MARGIN, Math.min(vh - r.height - MARGIN, startTop  + dy)) + 'px';
        e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', function () {
        if (!dragging) return;
        dragging = false;
        if (!moved) return;

        const r   = widget.getBoundingClientRect();
        const vw  = window.innerWidth;
        const mid = r.left + r.width / 2;
        const targetLeft = mid < vw / 2 ? MARGIN : vw - r.width - MARGIN;

        widget.style.transition = 'left 0.45s cubic-bezier(0.34,1.56,0.64,1), top 0.45s cubic-bezier(0.34,1.56,0.64,1)';
        widget.style.left = targetLeft + 'px';
    });
});
