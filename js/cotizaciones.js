// cotizaciones.js — Crear cotizaciones para clientes
let cotizacionesData = {};
let cotizacionesListener = null;

function initCotizaciones() {
    if (cotizacionesListener) return;
    cotizacionesListener = db.ref('cotizaciones').on('value', snap => {
        cotizacionesData = snap.val() || {};
        renderCotizaciones();
    }, err => console.warn('[Cotizaciones]', err.message));
}

function renderCotizaciones() {
    const tbody = document.getElementById('cotizaciones-table-body');
    if (!tbody) return;
    const entries = Object.entries(cotizacionesData).map(([id, c]) => ({ id, ...c })).sort((a, b) => (b.creadoEn || 0) - (a.creadoEn || 0));
    document.getElementById('cotizaciones-count').textContent = entries.length;
    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:2rem">Sin cotizaciones</td></tr>';
        return;
    }
    tbody.innerHTML = entries.map(c => {
        const estBadge = c.estado === 'aceptada' ? 'badge-green' : c.estado === 'rechazada' ? 'badge-red' : c.estado === 'enviada' ? 'badge-blue' : 'badge-gray';
        
        let alertas = '';
        if (c.items) {
            const now = new Date();
            now.setHours(0,0,0,0);
            let badges = [];
            c.items.forEach(item => {
                if(!item.fechaEntrega) return;
                if(item.estadoLogistica === 'Recibido' || item.estadoLogistica === 'Entregado') return;
                const d = new Date(item.fechaEntrega + "T00:00:00");
                const diffDays = Math.ceil((d - now) / (1000 * 60 * 60 * 24));
                if (diffDays < 0) badges.push(`<span class="badge badge-red" style="font-size:9px;padding:2px 4px" title="${item.producto}">Vencido hace ${Math.abs(diffDays)}d</span>`);
                else if (diffDays <= 4) badges.push(`<span class="badge badge-amber" style="font-size:9px;padding:2px 4px" title="${item.producto}">Faltan ${diffDays}d</span>`);
            });
            if (badges.length > 0) alertas = `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">${badges.join('')}</div>`;
        }

        return `<tr style="cursor:pointer" onclick="verCotizacion('${c.id}')">
            <td>
                <div class="mono" style="font-weight:var(--weight-medium)">${escHtml(c.numero || '—')}</div>
                ${alertas}
            </td>
            <td>${escHtml(c.cliente || '—')}</td>
            <td class="mono">${c.creadoEn ? new Date(c.creadoEn).toLocaleDateString('es-CO') : '—'}</td>
            <td class="mono" style="font-weight:var(--weight-semibold)">$${Number(c.total || 0).toLocaleString('es-CO')}</td>
            <td><span class="badge ${estBadge}">${escHtml(c.estado || 'borrador')}</span></td>
            <td><button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();exportarCotizacionPDF('${c.id}')">PDF</button></td>
        </tr>`;
    }).join('');
}

let cotItems = [];
let cacheProveedoresCot = [];

async function cargarProveedoresCot() {
    if (cacheProveedoresCot.length > 0) return;
    try {
        const snap = await db.ref('proveedores').once('value');
        const data = snap.val() || {};
        cacheProveedoresCot = Object.values(data).map(p => p.nombre).filter(n => n);
    } catch(e) {}
}

async function nuevaCotizacion() {
    await cargarProveedoresCot();
    cotItems = [{ producto: '', proveedor: '', ubicacion: 'Piso 1', estadoLogistica: 'En espera', fechaEntrega: '', cantidad: 1, precioUnit: 0 }];
    document.getElementById('f-cot-numero').value = 'COT-' + String(Date.now()).slice(-6);
    document.getElementById('f-cot-cliente').value = '';
    document.getElementById('f-cot-notas').value = '';
    renderCotItems();
    openModal('modal-cotizacion');
}

function renderCotItems() {
    const el = document.getElementById('cot-items-list');
    if (!el) return;
    let total = 0;
    let provOptions = '<option value="">Seleccione proveedor...</option>' + cacheProveedoresCot.map(p => `<option value="${escHtml(p)}">${escHtml(p)}</option>`).join('');

    el.innerHTML = cotItems.map((item, i) => {
        const subtotal = item.cantidad * item.precioUnit;
        total += subtotal;
        return `<div style="border:1px solid var(--border-subtle);border-radius:var(--r-md);padding:12px;background:var(--bg-raised);position:relative">
            <button type="button" class="btn btn-icon btn-ghost btn-sm" style="position:absolute;top:8px;right:8px;color:var(--danger);z-index:10" onclick="cotItems.splice(${i},1);renderCotItems()" title="Eliminar producto">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;padding-right:30px">
                <div>
                    <label class="form-label" style="font-size:10px;margin-bottom:4px">Producto / Descripción</label>
                    <input class="form-input" placeholder="Ej: Termos x500" value="${escHtml(item.producto)}" onchange="cotItems[${i}].producto=this.value;renderCotItems()">
                </div>
                <div>
                    <label class="form-label" style="font-size:10px;margin-bottom:4px">Proveedor</label>
                    <select class="form-select" onchange="cotItems[${i}].proveedor=this.value;renderCotItems()">
                        ${provOptions.replace(`value="${item.proveedor}"`, `value="${item.proveedor}" selected`)}
                    </select>
                </div>
            </div>
            
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:10px">
                <div>
                    <label class="form-label" style="font-size:10px;margin-bottom:4px">Ubicación</label>
                    <select class="form-select" onchange="cotItems[${i}].ubicacion=this.value;renderCotItems()">
                        <option value="Piso 1" ${item.ubicacion==='Piso 1'?'selected':''}>Piso 1</option>
                        <option value="Piso 2" ${item.ubicacion==='Piso 2'?'selected':''}>Piso 2</option>
                        <option value="Bodega Externa" ${item.ubicacion==='Bodega Externa'?'selected':''}>Bodega Externa</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" style="font-size:10px;margin-bottom:4px">Estado Envío</label>
                    <select class="form-select" onchange="cotItems[${i}].estadoLogistica=this.value;renderCotItems()">
                        <option value="En espera" ${item.estadoLogistica==='En espera'?'selected':''}>En espera</option>
                        <option value="En camino" ${item.estadoLogistica==='En camino'?'selected':''}>En camino</option>
                        <option value="Recibido" ${item.estadoLogistica==='Recibido'?'selected':''}>Recibido</option>
                        <option value="Entregado" ${item.estadoLogistica==='Entregado'?'selected':''}>Entregado al cliente</option>
                        <option value="No llegó" ${item.estadoLogistica==='No llegó'?'selected':''}>Retrasado / No llegó</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" style="font-size:10px;margin-bottom:4px">Fecha ETA</label>
                    <input class="form-input" type="date" value="${item.fechaEntrega||''}" onchange="cotItems[${i}].fechaEntrega=this.value;renderCotItems()">
                </div>
            </div>

            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px">
                <div>
                    <label class="form-label" style="font-size:10px;margin-bottom:4px">Cantidad</label>
                    <input class="form-input" type="number" min="1" value="${item.cantidad}" onchange="cotItems[${i}].cantidad=Number(this.value);renderCotItems()">
                </div>
                <div>
                    <label class="form-label" style="font-size:10px;margin-bottom:4px">Costo/P. Unit</label>
                    <input class="form-input" type="number" min="0" value="${item.precioUnit}" onchange="cotItems[${i}].precioUnit=Number(this.value);renderCotItems()">
                </div>
                <div>
                    <label class="form-label" style="font-size:10px;margin-bottom:4px">Subtotal</label>
                    <input class="form-input mono" readonly value="$${subtotal.toLocaleString('es-CO')}">
                </div>
            </div>
        </div>`;
    }).join('');
    document.getElementById('cot-total-display').textContent = '$' + total.toLocaleString('es-CO');
}

function agregarItemCot() { cotItems.push({ producto: '', proveedor: '', ubicacion: 'Piso 1', estadoLogistica: 'En espera', fechaEntrega: '', cantidad: 1, precioUnit: 0 }); renderCotItems(); }

async function guardarCotizacion(e) {
    e.preventDefault();
    const total = cotItems.reduce((s, i) => s + (i.cantidad * i.precioUnit), 0);
    const datos = {
        numero: document.getElementById('f-cot-numero')?.value.trim(),
        cliente: document.getElementById('f-cot-cliente')?.value.trim(),
        notas: document.getElementById('f-cot-notas')?.value.trim(),
        items: cotItems.filter(i => i.producto),
        total, estado: 'borrador',
        creadoEn: Date.now(), creadoPor: window.userEmail || ''
    };
    if (!datos.cliente) { showToast('El cliente es obligatorio', 'error'); return; }
    try { await db.ref('cotizaciones').push(datos); closeModal('modal-cotizacion'); showToast('Cotizacion creada'); }
    catch (err) { showToast('Error: ' + err.message, 'error'); }
}

function verCotizacion(id) {
    const c = cotizacionesData[id]; if (!c) return;
    const items = c.items || [];
    document.getElementById('drawer-cotizacion-title').textContent = c.numero || '—';
    document.getElementById('drawer-cotizacion-body').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
            <div class="contract-detail-item"><strong>Cliente</strong><span>${escHtml(c.cliente || '—')}</span></div>
            <div class="contract-detail-item"><strong>Fecha</strong><span class="mono">${c.creadoEn ? new Date(c.creadoEn).toLocaleDateString('es-CO') : '—'}</span></div>
            <div class="contract-detail-item"><strong>Estado</strong><span>${escHtml(c.estado || 'borrador')}</span></div>
            <div class="contract-detail-item"><strong>Total</strong><span class="mono" style="font-size:var(--fz-lg);font-weight:var(--weight-bold)">$${Number(c.total || 0).toLocaleString('es-CO')}</span></div>
        </div>
        <table class="data-table"><thead><tr><th>Detalle del Producto</th><th>Estado Logística</th><th>Costo/Unit</th><th>Subtotal</th></tr></thead>
        <tbody>${items.map(i => {
            const etaObj = i.fechaEntrega ? new Date(i.fechaEntrega + "T00:00:00") : null;
            const etaBadge = etaObj ? `<div style="font-size:10px;margin-top:2px;color:var(--text-tertiary)">ETA: ${etaObj.toLocaleDateString('es-CO')}</div>` : '';
            return `<tr>
            <td>
                <div style="font-weight:600">${escHtml(i.producto)} (x${i.cantidad})</div>
                <div style="font-size:11px;color:var(--text-secondary)">Prov: ${escHtml(i.proveedor || 'N/A')} · ${escHtml(i.ubicacion || '')}</div>
            </td>
            <td>
                <span class="badge badge-gray">${escHtml(i.estadoLogistica || 'En espera')}</span>
                ${etaBadge}
            </td>
            <td class="mono">$${Number(i.precioUnit).toLocaleString('es-CO')}</td>
            <td class="mono">$${(i.cantidad * i.precioUnit).toLocaleString('es-CO')}</td>
        </tr>`;
        }).join('')}</tbody></table>
        ${c.notas ? `<div class="alert-strip info" style="margin-top:1rem"><p>${escHtml(c.notas)}</p></div>` : ''}
        <div class="divider"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-primary btn-sm" onclick="cambiarEstadoCot('${id}','enviada')">Marcar enviada</button>
            <button class="btn btn-secondary btn-sm" onclick="cambiarEstadoCot('${id}','aceptada')">Aceptada</button>
            <button class="btn btn-danger btn-sm" onclick="cambiarEstadoCot('${id}','rechazada')">Rechazada</button>
            <button class="btn btn-ghost btn-sm" onclick="eliminarCotizacion('${id}')">Eliminar</button>
        </div>`;
    openDrawer('drawer-cotizacion');
}

async function cambiarEstadoCot(id, estado) {
    await db.ref(`cotizaciones/${id}/estado`).set(estado); showToast('Estado actualizado'); closeDrawer('drawer-cotizacion');
}
async function eliminarCotizacion(id) {
    const ok = await confirmDialog('Eliminar cotizacion?', 'Se eliminara permanentemente.'); if (!ok) return;
    await db.ref(`cotizaciones/${id}`).remove(); closeDrawer('drawer-cotizacion'); showToast('Cotizacion eliminada', 'warning');
}
function exportarCotizacionPDF(id) { showToast('Funcion PDF disponible en Reportes'); navigate('reportes'); }

window.onSection_cotizaciones = initCotizaciones;
