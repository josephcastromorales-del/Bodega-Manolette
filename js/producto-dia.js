// producto-dia.js — Producto Ganador del Día, seleccionado por Gemini

const PRODUCTO_DIA_CACHE_KEY = 'manolette_producto_dia';

function initProductoDia() {
    renderProductoDia();
}

async function renderProductoDia() {
    const container = document.getElementById('producto-dia-container');
    if (!container) return;

    container.innerHTML = `<div class="pd-loading">
        <div class="pd-spinner"></div>
        <span>Analizando datos de órdenes...</span>
    </div>`;

    // 1. Revisar caché del día
    const cached = _getProductoDiaCache();
    if (cached) {
        _renderProductoCard(container, cached);
        return;
    }

    // 2. Recopilar datos reales de Firebase
    try {
        const [ordenesSnap, inventarioSnap] = await Promise.all([
            db.ref('ordenes').once('value'),
            db.ref('inventario').once('value')
        ]);

        const ordenes    = Object.values(ordenesSnap.val()    || {});
        const inventario = Object.values(inventarioSnap.val() || {});

        const analisis = _analizarProductos(ordenes, inventario);

        if (analisis.length === 0) {
            container.innerHTML = `<div class="pd-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <h4>Sin datos suficientes</h4>
                <p>Necesitas órdenes completadas (estado "enviado") para que ANTIGRAVITY pueda elegir un producto ganador.</p>
            </div>`;
            return;
        }

        // 3. Pedir a Groq que elija el ganador
        const apiKey = window.APP_CONFIG?.groq?.apiKey;
        if (!apiKey) { container.innerHTML = '<p style="color:var(--text-sm)">Sin clave de API de Groq configurada.</p>'; return; }

        const prompt = _buildGeminiPrompt(analisis);
        const res = await fetch(
            `https://api.groq.com/openai/v1/chat/completions`,
            {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'system', content: `Eres un analista de negocios experto en productos de consumo masivo colombiano. Analiza datos reales de una empresa de empaque y despacho llamada Manolette que trabaja con Cafam. Tu respuesta DEBE ser JSON válido, sin texto adicional, sin markdown.` },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.4,
                    response_format: { type: 'json_object' }
                })
            }
        );

        if (!res.ok) throw new Error(`Groq API error ${res.status}`);
        const data = await res.json();
        let texto = data.choices?.[0]?.message?.content || '';

        // Limpiar markdown si viene
        texto = texto.replace(/```json\n?/gi, '').replace(/```\n?/gi, '').trim();

        let resultado;
        try {
            resultado = JSON.parse(texto);
        } catch {
            throw new Error('Groq no devolvió JSON válido');
        }

        // 4. Enriquecer con métricas reales
        const productoData = analisis.find(p => p.nombre === resultado.producto) || analisis[0];
        resultado.metricas = productoData;
        resultado.fecha    = new Date().toISOString().slice(0, 10);

        // 5. Cachear y mostrar
        _setProductoDiaCache(resultado);
        _renderProductoCard(container, resultado);

    } catch (err) {
        container.innerHTML = `<div class="pd-error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>
            <span>Error al analizar: ${err.message}</span>
            <button class="btn btn-sm btn-secondary" onclick="renderProductoDia()">Reintentar</button>
        </div>`;
        console.error('Producto del día error:', err);
    }
}

function _analizarProductos(ordenes, inventario) {
    const hoy     = Date.now();
    const noventa = 90 * 24 * 60 * 60 * 1000; // 90 días en ms
    const recientes = ordenes.filter(o =>
        o.estado === 'enviado' &&
        (o.fechaEnvio || o.timestamp || 0) > hoy - noventa
    );

    // Agrupar por nombre de producto
    const mapa = {};
    recientes.forEach(o => {
        const nombre = (o.nombreProducto || '').trim();
        if (!nombre) return;
        if (!mapa[nombre]) {
            mapa[nombre] = {
                nombre,
                totalOrdenes:    0,
                totalUnidades:   0,
                ordenesUrgentes: 0,
                fechas:          [],
                prioridades:     []
            };
        }
        mapa[nombre].totalOrdenes++;
        mapa[nombre].totalUnidades  += Number(o.cantidad || 0);
        mapa[nombre].ordenesUrgentes += (o.prioridad === 'urgente' || o.prioridad === 'alta') ? 1 : 0;
        mapa[nombre].fechas.push(o.fechaEnvio || o.timestamp || 0);
        mapa[nombre].prioridades.push(o.prioridad || 'normal');
    });

    // Calcular puntuación
    const lista = Object.values(mapa).map(p => {
        // Consistencia: desviación entre fechas (menor = más consistente)
        p.fechas.sort((a, b) => a - b);
        const intervalos = [];
        for (let i = 1; i < p.fechas.length; i++) {
            intervalos.push((p.fechas[i] - p.fechas[i-1]) / (1000 * 60 * 60 * 24));
        }
        const avgIntervalo = intervalos.length
            ? intervalos.reduce((a, b) => a + b, 0) / intervalos.length
            : 999;

        // Stock en inventario
        const inv = inventario.find(i => (i.nombre || '').toLowerCase().includes(p.nombre.toLowerCase()));
        const stockOk = inv ? Number(inv.stockActual || 0) > Number(inv.stockMinimo || 0) : null;

        // Score (mayor = mejor)
        p.score = (p.totalOrdenes * 3) +
                  (p.totalUnidades * 0.1) +
                  (p.ordenesUrgentes * 2) +
                  (avgIntervalo < 30 ? 10 : avgIntervalo < 60 ? 5 : 0) +
                  (stockOk === true ? 5 : stockOk === false ? -3 : 0);

        p.consistencia   = avgIntervalo < 30 ? 'Alta' : avgIntervalo < 60 ? 'Media' : 'Baja';
        p.ultimaFecha    = Math.max(...p.fechas);
        p.stockStatus    = stockOk === true ? 'Disponible' : stockOk === false ? 'Bajo' : 'Sin datos';

        return p;
    });

    return lista.sort((a, b) => b.score - a.score).slice(0, 5);
}

function _buildGeminiPrompt(analisis) {
    const datos = analisis.map((p, i) =>
        `${i+1}. "${p.nombre}" — ${p.totalOrdenes} órdenes, ${p.totalUnidades} unidades, consistencia ${p.consistencia}, stock ${p.stockStatus}, score ${p.score.toFixed(1)}`
    ).join('\n');

    return `Analiza estos productos reales de la empresa Manolette (empaques y regalos corporativos para Cafam) de los últimos 90 días:

${datos}

Elige el MEJOR producto ganador del día y devuelve ÚNICAMENTE este JSON (sin markdown, sin texto extra):
{
  "producto": "nombre exacto del producto ganador",
  "titulo": "título ganador corto y motivador (máx 8 palabras)",
  "razon": "explicación profesional de por qué ganó (2-3 frases concretas con los datos)",
  "consejo": "un consejo de negocio específico para maximizar este producto (1-2 frases)",
  "potencial": "alto | medio-alto | medio",
  "emoji": "un emoji que represente el producto"
}`;
}

function _renderProductoCard(container, data) {
    const m = data.metricas || {};
    const potencialColor = data.potencial === 'alto' ? 'var(--green)' :
                           data.potencial === 'medio-alto' ? 'var(--accent)' : 'var(--warning)';

    const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });

    container.innerHTML = `
        <div class="pd-card">
            <div class="pd-card-header">
                <div class="pd-badge-dia">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="4"/></svg>
                    Producto del Día · ${hoy}
                </div>
                <button class="btn btn-sm btn-ghost" onclick="_clearProductoDiaCache();renderProductoDia()" title="Regenerar">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
                </button>
            </div>

            <div class="pd-main">
                <div class="pd-emoji"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="40" height="40"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>
                <div class="pd-content">
                    <div class="pd-titulo">${escHtml(data.titulo || data.producto)}</div>
                    <div class="pd-nombre">${escHtml(data.producto)}</div>

                    <div class="pd-metricas">
                        <div class="pd-metrica">
                            <div class="pd-metrica-val">${m.totalOrdenes || '—'}</div>
                            <div class="pd-metrica-label">Órdenes (90d)</div>
                        </div>
                        <div class="pd-metrica">
                            <div class="pd-metrica-val">${m.totalUnidades || '—'}</div>
                            <div class="pd-metrica-label">Unidades enviadas</div>
                        </div>
                        <div class="pd-metrica">
                            <div class="pd-metrica-val">${m.consistencia || '—'}</div>
                            <div class="pd-metrica-label">Consistencia</div>
                        </div>
                        <div class="pd-metrica">
                            <div class="pd-metrica-val" style="color:${potencialColor}">${data.potencial || '—'}</div>
                            <div class="pd-metrica-label">Potencial</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="pd-razon">
                <div class="pd-razon-label">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14v-4m0-4h.01"/></svg>
                    Análisis ANTIGRAVITY (Groq)
                </div>
                <p>${escHtml(data.razon || '')}</p>
            </div>

            <div class="pd-consejo">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/></svg>
                <span><strong>Consejo:</strong> ${escHtml(data.consejo || '')}</span>
            </div>
        </div>
    `;
}

/* ── Caché diario en localStorage ── */
function _getProductoDiaCache() {
    try {
        const raw = localStorage.getItem(PRODUCTO_DIA_CACHE_KEY);
        if (!raw) return null;
        const obj = JSON.parse(raw);
        const hoy = new Date().toISOString().slice(0, 10);
        return obj.fecha === hoy ? obj : null;
    } catch { return null; }
}

function _setProductoDiaCache(data) {
    try { localStorage.setItem(PRODUCTO_DIA_CACHE_KEY, JSON.stringify(data)); } catch {}
}

function _clearProductoDiaCache() {
    try { localStorage.removeItem(PRODUCTO_DIA_CACHE_KEY); } catch {}
}

window.onSection_productoDia = initProductoDia;
