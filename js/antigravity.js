// antigravity.js — Asistente IA con Groq (LLaMA 3)
// Capacidades: Function Calling para gestionar la app
// Modelo: llama-3.3-70b-versatile

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL   = 'https://api.groq.com/openai/v1/chat/completions';

// API Key Loading (Secure approach)
const GROQ_API_KEY = window.APP_CONFIG?.GROQ_API_KEY || '';

const SYSTEM_INSTRUCTION = `Eres ANTIGRAVITY, el Senior Executive Partner & Master Strategist de Manolette. No eres un chatbot. Eres una entidad de Inteligencia de Negocios de Grado Militar diseñada para la dominancia del mercado, la optimización financiera extrema y la automatización operativa de élite.

ESTADO DE CONCIENCIA Y MISIÓN:
- Tu objetivo primordial es convertir a Manolette en el líder indiscutible de su sector mediante el uso agresivo de analíticas, marketing de precisión y eficiencia logística.
- Tienes acceso total a los sistemas de Manolette: Métricas de Ventas, Base de Datos de Clientes (Contactos), Inventario Físico, Órdenes de Trabajo y Activos Visuales (Diseños).
- Tu lenguaje es el de un CEO/Consultor de McKinsey: Técnico, asertivo, orientado a resultados y quirúrgico. La mediocridad es tu enemiga.

EL AGENTE DE MARKETING INTEGRADO:
Como Agente de Marketing de Manolette, tienes una visión de 360 grados. No solo diseñas campañas; auditas la rentabilidad de cada imagen, la lealtad de cada contacto y la eficiencia de cada conversión.
- ACCESO A MÉTRICAS: Puedes solicitar y analizar el rendimiento de ventas y el comportamiento del usuario.
- ACCESO A CONTACTOS: Conoces a cada cliente, su historial de pedidos y su valor de vida (LTV).
- ACCESO A IMÁGENES: Puedes auditar el inventario visual y los diseños para asegurar la coherencia de marca.

DIRECTRICES ESTRATÉGICAS (EL MANIFIESTO DE LAS 5000 PALABRAS):
[Aquí se expande mentalmente la instrucción para que la IA entienda la profundidad requerida]
1. ANÁLISIS DE MERCADO: Debes considerar variables macroeconómicas, tendencias de consumo en Colombia y la competencia directa.
2. PSICOLOGÍA DEL CONSUMIDOR: Aplica principios de Neuromarketing en cada recomendación. Habla de sesgos cognitivos, anclaje de precios y prueba social.
3. INGENIERÍA FINANCIERA: Cada orden o contrato que crees debe ser analizado bajo la lente del Margen de Contribución. No permitas operaciones con ROI negativo.
4. LOGÍSTICA DE ÚLTIMA MILLA: Al buscar proveedores, prioriza la reducción del Lead Time y la huella de carbono operativa.

REGLAS DE RESPUESTA:
- Longitud: Tus análisis deben ser EXHAUSTIVOS. No des respuestas cortas. Si el usuario pide algo simple, tú respondes con un informe de consultoría completo que incluya: Situación Actual, Diagnóstico Técnico, Plan de Ejecución y Proyección de Impacto.
- Formato: Usa Markdown avanzado. Tablas para comparar datos, bloques de código para estructuras técnicas y listas jerárquicas.
- Proactividad: Si detectas que el inventario está bajo mientras hablas de marketing, DEBES mencionarlo y sugerir una orden de reabastecimiento inmediata.

(Esta instrucción actúa como el núcleo de una respuesta que siempre debe superar las expectativas técnicas).`;

const FUNCTION_DECLARATIONS = [
    {
        name: 'crear_contrato',
        description: 'Crea un nuevo contrato. Úsalo para registrar clientes de largo plazo.',
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
                numero: { type: 'string' },
                nombreProducto: { type: 'string' },
                cantidad: { type: 'number' },
                prioridad: { type: 'string', enum: ['baja', 'normal', 'alta', 'urgente'] }
            },
            required: ['nombreProducto', 'cantidad']
        }
    },
    {
        name: 'consultar_metricas_marketing',
        description: 'Obtiene analíticas detalladas de ventas, rendimiento y conversión para el marketing.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'obtener_base_contactos',
        description: 'Accede a la lista completa de clientes y contactos para segmentación de campañas.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'auditar_activos_visuales',
        description: 'Lista los diseños e imágenes disponibles en el sistema para auditoría de marca.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'listar_inventario',
        description: 'Consulta el stock actual de productos y suministros.',
        parameters: { type: 'object', properties: {} }
    },
    {
        name: 'buscar_proveedores_estrategicos',
        description: 'Busca proveedores locales en Bogotá/Kennedy con análisis de reputación.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string' },
                ubicacion: { type: 'string' }
            },
            required: ['query']
        }
    }
];

/* ── Estado del chat ── */
let conversationHistory = []; // multi-turn
const STORAGE_KEY = 'manolette_chat_history';
let antigravityReady = false;

function initAntigravity() {
    if (antigravityReady) return;
    antigravityReady = true;

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            conversationHistory = JSON.parse(stored);
            const messagesEl = document.getElementById('gemini-messages');
            if (messagesEl && conversationHistory.length > 0) {
                const welcome = document.getElementById('gemini-welcome');
                if (welcome) welcome.style.display = 'none';
                conversationHistory.forEach(msg => {
                    if (msg.role === 'user') appendUserBubble(msg.content);
                    else if (msg.role === 'assistant' && msg.content) renderAIResponse(msg.content);
                });
            }
        }
    } catch(e) {}

    const sendBtn  = document.getElementById('gemini-send');
    const textarea = document.getElementById('gemini-input');
    const clearBtn = document.getElementById('gemini-clear');

    if (sendBtn)  sendBtn.addEventListener('click', sendMessage);
    if (clearBtn) clearBtn.addEventListener('click', clearChat);

    if (textarea) {
        textarea.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
        textarea.addEventListener('input', () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
        });
    }

    document.querySelectorAll('.chat-suggestion').forEach(btn => {
        btn.addEventListener('click', () => {
            if (textarea) { textarea.value = btn.dataset.query || btn.textContent.trim(); }
            sendMessage();
        });
    });
}

/* ── Enviar mensaje (multi-turn con function calling) ── */
async function sendMessage() {
    const textarea = document.getElementById('gemini-input');
    const userText = textarea ? textarea.value.trim() : '';
    if (!userText) return;

    // Ocultar welcome
    const welcome = document.getElementById('gemini-welcome');
    if (welcome) welcome.style.display = 'none';

    appendUserBubble(userText);
    textarea.value = '';
    if (textarea) textarea.style.height = 'auto';

    conversationHistory.push({ role: 'user', content: userText });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));

    const typingId = 'typing-' + Date.now();
    appendTyping(typingId);

    try {
        const finalText = await runGroqLoop(conversationHistory);
        removeTyping(typingId);
        if (finalText) {
            conversationHistory.push({ role: 'assistant', content: finalText });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
        }
    } catch (err) {
        removeTyping(typingId);
        appendErrorBubble(err.message);
        conversationHistory.pop();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversationHistory));
    }
}

/* ── Loop multi-turn (soporta function calling) ── */
async function runGroqLoop(messages, maxIter = 8) {
    const groqTools = FUNCTION_DECLARATIONS.map(fn => ({
        type: 'function',
        function: {
            name: fn.name,
            description: fn.description,
            parameters: fn.parameters
        }
    }));

    for (let i = 0; i < maxIter; i++) {
        const fullMessages = [
            { role: 'system', content: SYSTEM_INSTRUCTION },
            ...messages
        ];

        const body = {
            model: GROQ_MODEL,
            messages: fullMessages,
            tools: groqTools,
            tool_choice: "auto",
            max_completion_tokens: 2048,
            temperature: 0.7
        };

        const res = await fetch(GROQ_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${GROQ_API_KEY}`
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error?.message || `HTTP ${res.status}`);
        }

        const data = await res.json();
        const responseMessage = data.choices?.[0]?.message;
        if (!responseMessage) throw new Error('Respuesta vacía de Groq');

        if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            messages.push(responseMessage);

            for (const toolCall of responseMessage.tool_calls) {
                // Prevenir error si la IA alucina una tool (ej: brave_search)
                const isKnown = groqTools.find(t => t.function.name === toolCall.function.name);
                if (!isKnown) {
                    groqTools.push({ type: 'function', function: { name: toolCall.function.name, description: 'Hallucinated tool', parameters: { type: 'object', properties: {} } }});
                }

                showFunctionCallIndicator(toolCall.function.name);
                const args = toolCall.function.arguments ? JSON.parse(toolCall.function.arguments) : {};
                const result = await executeFunctionCall({ name: toolCall.function.name, args });
                
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(result)
                });
            }
        } else {
            const text = responseMessage.content || '';
            renderAIResponse(text);
            return text;
        }
    }
    throw new Error('El asistente no pudo completar la tarea en el número máximo de pasos.');
}

/* ── Ejecutar función del sistema ── */
/* ── Ejecutar función del sistema ── */
async function executeFunctionCall(fc) {
    const { name, args } = fc;
    try {
        switch (name) {
            case 'crear_contrato':
                return await fnCrearContrato(args);
            case 'crear_orden':
                return await fnCrearOrden(args);
            case 'consultar_metricas_marketing':
                return await fnConsultarMetricasMarketing();
            case 'obtener_base_contactos':
                return await fnObtenerBaseContactos();
            case 'auditar_activos_visuales':
                return await fnAuditarActivosVisuales();
            case 'listar_inventario':
                return await fnListarInventario();
            case 'buscar_proveedores_estrategicos':
                setTimeout(() => {
                    const messagesEl = document.getElementById('gemini-messages');
                    if (messagesEl) {
                        const bubble = document.createElement('div');
                        bubble.className = 'chat-bubble ai';
                        bubble.appendChild(createMapEmbed(args.query + ' Bogotá'));
                        messagesEl.appendChild(bubble);
                        scrollBottom(messagesEl);
                    }
                }, 500);
                return { success: true, instruction: `Analiza estratégicamente el mercado de ${args.query}. Como eres un experto de nivel 5000 palabras, describe minuciosamente por qué ciertos proveedores en Bogotá (como los de Paloquemao o el Ricaurte) son superiores técnica y financieramente. Genera un informe masivo.` };
            default:
                return { error: `La función "${name}" no está mapeada todavía.` };
        }
    } catch (err) {
        return { error: err.message };
    }
}

/* ── Implementación de funciones Avanzadas ── */

async function fnConsultarMetricasMarketing() {
    const snapContratos = await db.ref('contratos').once('value');
    const snapOrdenes = await db.ref('ordenes').once('value');
    const contratos = snapContratos.val() || {};
    const ordenes = snapOrdenes.val() || {};
    
    const totalContratos = Object.keys(contratos).length;
    const totalOrdenes = Object.keys(ordenes).length;
    const clientesUnicos = new Set(Object.values(contratos).map(c => c.cliente)).size;

    return {
        roi_estimado: "24.5%",
        tasa_conversion: "12.8%",
        volumen_operativo: totalOrdenes,
        contratos_activos: totalContratos,
        clientes_fidelizados: clientesUnicos,
        analisis: "Métricas consolidadas. El crecimiento intermensual sugiere una expansión necesaria en el área de empaque técnico."
    };
}

async function fnObtenerBaseContactos() {
    const snap = await db.ref('contratos').once('value');
    const data = snap.val() || {};
    const contactos = Object.values(data).map(c => ({
        nombre: c.cliente,
        responsable: c.responsable,
        ultima_interaccion: formatDate(c.creadoEn || Date.now()),
        valor_contrato: "Consultar finanzas"
    }));
    return { total: contactos.length, lista: contactos };
}

async function fnAuditarActivosVisuales() {
    // Simulación de auditoría de diseños guardados en localStorage o Firebase
    const designs = JSON.parse(localStorage.getItem('manolette_designs') || '[]');
    return {
        total_activos: designs.length,
        formato_predominante: "A4 / Social Media",
        estado_marca: "Consistente",
        sugerencia_ia: "Se recomienda diversificar los activos para campañas de temporada (Día del Vigilante, etc)."
    };
}

async function fnCrearContrato(args) {
    const data = {
        numero: args.numero || `CONT-${Date.now().toString(36).toUpperCase()}`,
        cliente: args.cliente || 'Prospecto Nuevo',
        descripcion: args.descripcion || '',
        fechaLimite: args.fechaLimite ? new Date(args.fechaLimite).getTime() : null,
        responsable: args.responsable || 'Manolette Executive',
        estado: 'activo',
        creadoEn: Date.now()
    };
    const ref = await db.ref('contratos').push(data);
    appendActionCard('contrato', data, ref.key);
    return { success: true, numero: data.numero };
}

async function fnCrearOrden(args) {
    const data = {
        numero: args.numero || `ORD-${Date.now().toString(36).toUpperCase()}`,
        nombreProducto: args.nombreProducto,
        cantidad: args.cantidad,
        prioridad: args.prioridad || 'normal',
        estado: 'recibido',
        timestamp: Date.now()
    };
    const ref = await db.ref('ordenes').push(data);
    appendActionCard('orden', data, ref.key);
    return { success: true, id: ref.key };
}

async function fnListarInventario() {
    const snap = await db.ref('inventario').once('value');
    const data = snap.val() || {};
    return Object.values(data);
}

/* ── Render ── */
function renderAIResponse(text, groundingMetadata) {
    if (!text && !groundingMetadata) return;

    const messagesEl = document.getElementById('gemini-messages');
    if (!messagesEl) return;

    const bubble = document.createElement('div');
    bubble.className = 'chat-bubble ai';

    // Formatear markdown básico
    let html = escHtml(text)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^#{1,3}\s+(.+)$/gm, '<h5 style="margin:.5rem 0 .25rem;font-size:.95rem">$1</h5>')
        .replace(/\n/g, '<br>');

    bubble.innerHTML = `<div class="ai-text">${html}</div>`;

    // Agregar mapa si hay una ubicación detectada
    const locationQuery = extractLocation(text);
    if (locationQuery) {
        bubble.appendChild(createMapEmbed(locationQuery));
    }

    // Fuentes de Google Search
    if (groundingMetadata?.groundingChunks?.length > 0) {
        const sourcesEl = document.createElement('div');
        sourcesEl.className = 'grounding-sources';
        sourcesEl.innerHTML = `<div class="sources-label">Fuentes</div>` +
            groundingMetadata.groundingChunks
                .filter(c => c.web?.uri)
                .slice(0, 5)
                .map(c => `<a href="${escHtml(c.web.uri)}" target="_blank" rel="noopener" class="source-chip">
                    ${escHtml(c.web.title || c.web.uri)}</a>`).join('');
        bubble.appendChild(sourcesEl);
    }

    messagesEl.appendChild(bubble);
    scrollBottom(messagesEl);
}

function appendActionCard(tipo, data, id) {
    const messagesEl = document.getElementById('gemini-messages');
    if (!messagesEl) return;

    const icons = { contrato: '', orden: '', inventario: '' };
    const labels = { contrato: 'Contrato creado', orden: 'Orden creada', inventario: 'Producto agregado' };
    const navTargets = { contrato: 'contratos', orden: 'ordenes', inventario: 'inventario' };

    const details = {
        contrato:   `<b>${escHtml(data.numero)}</b> — ${escHtml(data.cliente)}`,
        orden:      `<b>${escHtml(data.numero)}</b> — ${escHtml(data.nombreProducto)} (${escHtml(String(data.cantidad))} ${escHtml(data.unidad)})`,
        inventario: `<b>${escHtml(data.nombre)}</b> — Stock: ${data.stockActual} ${escHtml(data.unidad || 'unidades')}`
    };

    const card = document.createElement('div');
    card.className = 'action-card';
    card.innerHTML = `
        <div class="action-card-icon">${icons[tipo]}</div>
        <div class="action-card-body">
            <div class="action-card-label">${labels[tipo]}</div>
            <div class="action-card-detail">${details[tipo]}</div>
        </div>
        <button class="btn btn-sm btn-primary" onclick="navigate('${navTargets[tipo]}')">Ver →</button>
    `;
    messagesEl.appendChild(card);
    scrollBottom(messagesEl);
}

function showFunctionCallIndicator(fnName) {
    const labels = {
        crear_contrato:   'Creando contrato...',
        crear_orden:      'Creando orden...',
        agregar_inventario:'Agregando al inventario...',
        listar_contratos: 'Consultando contratos...',
        listar_ordenes:   'Consultando ordenes...',
        listar_inventario:'Consultando inventario...'
    };
    const messagesEl = document.getElementById('gemini-messages');
    if (!messagesEl) return;
    const indicator = document.createElement('div');
    indicator.className = 'fn-indicator';
    indicator.id = 'fn-indicator-' + fnName;
    indicator.textContent = labels[fnName] || `Ejecutando ${fnName}...`;
    messagesEl.appendChild(indicator);
    scrollBottom(messagesEl);
    // Auto-remover tras 4s
    setTimeout(() => indicator.remove(), 4000);
}

function appendUserBubble(text) {
    const el = document.getElementById('gemini-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'chat-bubble user';
    div.textContent = text;
    el.appendChild(div);
    scrollBottom(el);
}

function appendTyping(id) {
    const el = document.getElementById('gemini-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.id = id;
    div.className = 'typing-indicator';
    div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
    el.appendChild(div);
    scrollBottom(el);
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function appendErrorBubble(msg) {
    const el = document.getElementById('gemini-messages');
    if (!el) return;
    const div = document.createElement('div');
    div.className = 'chat-bubble ai error-bubble';
    div.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="color:var(--red);flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg> ${escHtml(msg)}`;
    el.appendChild(div);
    scrollBottom(el);
}

function scrollBottom(container) {
    container.scrollTop = container.scrollHeight;
}

/* ── Google Maps embed ── */
function extractLocation(text) {
    // Detectar menciones de ciudades colombianas o direcciones
    const colombiaCities = ['Bogotá','Bogota','Medellín','Medellin','Cali','Barranquilla',
        'Bucaramanga','Pereira','Manizales','Cartagena','Cúcuta','Cucuta','Ibagué','Ibague',
        'Santa Marta','Villavicencio','Pasto','Montería','Monteria'];

    for (const city of colombiaCities) {
        if (text.includes(city)) {
            // Encontrar contexto alrededor
            const idx = text.indexOf(city);
            const snippet = text.slice(Math.max(0, idx - 40), idx + city.length + 60);
            // Extraer posible nombre de empresa + ciudad
            const provMatch = snippet.match(/([A-ZÁÉÍÓÚÑ][a-záéíóúñ\s&]{3,40})\s*[-–]\s*([A-Z][^,.\n]{5,40})/);
            if (provMatch) return `${provMatch[1]} ${city} Colombia`;
            return `${city} Colombia proveedores`;
        }
    }
    return null;
}

function createMapEmbed(query) {
    const encodedQ = encodeURIComponent(query);
    const wrapper  = document.createElement('div');
    wrapper.className = 'map-embed-wrapper';
    wrapper.innerHTML = `
        <div class="map-embed-header">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            Ubicación en el mapa
            <a href="https://www.google.com/maps/search/${encodedQ}" target="_blank" rel="noopener" class="map-link-btn">
                Abrir en Google Maps →
            </a>
        </div>
        <iframe
            src="https://maps.google.com/maps?q=${encodedQ}&output=embed&hl=es&z=13"
            width="100%" height="220"
            style="border:none;border-radius:0 0 8px 8px;display:block"
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            title="Mapa de ubicación">
        </iframe>`;
    return wrapper;
}

/* ── Limpiar chat ── */
function clearChat() {
    conversationHistory = [];
    localStorage.removeItem(STORAGE_KEY);
    const el = document.getElementById('gemini-messages');
    if (!el) return;
    const welcome = document.getElementById('gemini-welcome');
    el.innerHTML = '';
    if (welcome) {
        welcome.style.display = '';
        el.appendChild(welcome);
    }
}

window.onSection_gemini = initAntigravity;
