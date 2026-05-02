// orders.js — CRUD órdenes, Kanban 5 columnas, timeline

const ORDEN_ESTADOS = [
    { key: 'recibido', label: 'Recibido',    dot: 'dot-blue',   icon: '' },
    { key: 'empaque',  label: 'En Empaque',  dot: 'dot-amber',  icon: '' },
    { key: 'calidad',  label: 'Calidad',     dot: 'dot-purple', icon: '' },
    { key: 'listo',    label: 'Listo',       dot: 'dot-green',  icon: '' },
    { key: 'enviado',  label: 'Enviado',     dot: 'dot-gray',   icon: '' }
];

let ordenesData = {};
let ordenesListener = null;
let filtroContrato = '';
let filtroEstado   = '';
let _draggedId     = null;

function initOrdenes() {
    if (ordenesListener) return;
    ordenesListener = db.ref('ordenes').on('value', snap => {
        ordenesData = snap.val() || {};
        renderKanban();
    }, err => console.warn('[Órdenes]', err.message));

    // Cargar contratos en el select del filtro y del formulario
    db.ref('contratos').once('value', snap => {
        const data = snap.val() || {};
        const options = Object.entries(data).map(([id, c]) =>
            `<option value="${id}">${escHtml(c.numero)} — ${escHtml(c.cliente)}</option>`
        ).join('');
        const selects = ['filtro-contrato-orden', 'f-orden-contrato'];
        selects.forEach(selId => {
            const sel = document.getElementById(selId);
            if (sel) sel.innerHTML = '<option value="">Todos los contratos</option>' + options;
        });
    });
}

function renderKanban() {
    const ordenes = Object.entries(ordenesData)
        .map(([id, o]) => ({ id, ...o }))
        .filter(o => {
            if (filtroContrato && o.contratoId !== filtroContrato) return false;
            return true;
        });

    ORDEN_ESTADOS.forEach(est => {
        const cardsEl  = document.getElementById(`kanban-cards-${est.key}`);
        const countEl  = document.getElementById(`kanban-count-${est.key}`);
        if (!cardsEl) return;

        const filtradas = ordenes.filter(o => o.estado === est.key);
        if (countEl) countEl.textContent = filtradas.length;

        if (filtradas.length === 0) {
            cardsEl.innerHTML = `<div style="text-align:center;padding:1.5rem;color:var(--text-xs);font-size:.8rem">Sin órdenes</div>`;
            return;
        }

        cardsEl.innerHTML = filtradas
            .sort((a, b) => (a.fechaLimite || 0) - (b.fechaLimite || 0))
            .map(o => {
                const prioClass   = o.prioridad === 'urgente' ? 'priority-urgente'
                                  : o.prioridad === 'alta'    ? 'priority-alta' : '';
                const days        = daysUntil(o.fechaLimite);
                const urgentClass = days !== null && days <= 2 && o.estado !== 'enviado' ? 'badge-red' : 'badge-gray';
                return `<div class="kanban-card ${prioClass}"
                             draggable="true"
                             ondragstart="handleDragStart(event,'${o.id}')"
                             ondragend="handleDragEnd(event)"
                             onclick="verOrden('${o.id}')">
                    <div class="kanban-card-title">${escHtml(o.nombreProducto || '—')}</div>
                    <div class="kanban-card-meta">${escHtml(o.cantidad || '')} ${escHtml(o.unidad || '')}</div>
                    ${o.asignadoA ? `<div class="kanban-card-assignee">${escHtml(o.asignadoA)}</div>` : ''}
                    <div class="kanban-card-footer">
                        <span class="order-number">${escHtml(o.numero || '—')}</span>
                        ${o.fechaLimite ? `<span class="badge ${urgentClass}">${deadlineBadge(o.fechaLimite)}</span>` : ''}
                    </div>
                </div>`;
            }).join('');
    });
}

function verOrden(id) {
    const o = ordenesData[id];
    if (!o) return;

    const prevIdx = ORDEN_ESTADOS.findIndex(e => e.key === o.estado);
    const nextEstado = prevIdx < ORDEN_ESTADOS.length - 1 ? ORDEN_ESTADOS[prevIdx + 1] : null;
    const prevEstado = prevIdx > 0 ? ORDEN_ESTADOS[prevIdx - 1] : null;

    const isSup = window.userRole === 'supervisor' || window.userRole === 'dueño';
    const isOwn = window.userRole === 'dueño';

    document.getElementById('drawer-orden-title').textContent = `Orden ${o.numero || '—'}`;
    document.getElementById('drawer-orden-body').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
            <div class="contract-detail-item"><strong>Producto</strong><span>${escHtml(o.nombreProducto || '—')}</span></div>
            <div class="contract-detail-item"><strong>Cantidad</strong><span>${escHtml(String(o.cantidad || ''))} ${escHtml(o.unidad || '')}</span></div>
            <div class="contract-detail-item"><strong>Estado actual</strong><span>${escHtml(o.estado || '—')}</span></div>
            <div class="contract-detail-item"><strong>Prioridad</strong><span>${escHtml(o.prioridad || 'normal')}</span></div>
            <div class="contract-detail-item"><strong>Fecha límite</strong><span>${formatDate(o.fechaLimite)} ${deadlineBadge(o.fechaLimite)}</span></div>
            <div class="contract-detail-item"><strong>Asignado a</strong><span>${escHtml(o.asignadoA || '—')}</span></div>
            ${o.proveedorId ? `<div class="contract-detail-item" id="orden-prov-name-${id}"><strong>Proveedor</strong><span>Cargando...</span></div>` : ''}
        </div>
        ${o.notas ? `<div class="alert-strip info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><p>${escHtml(o.notas)}</p></div>` : ''}

        <div class="divider"></div>
        <h5 style="margin-bottom:.75rem">Mover orden</h5>
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">
            ${ORDEN_ESTADOS.map(est => `
                <button class="btn btn-sm ${est.key === o.estado ? 'btn-primary' : 'btn-secondary'}"
                        onclick="moverOrden('${id}','${est.key}')"
                        ${est.key === o.estado ? 'disabled' : ''}>
                    ${est.icon} ${est.label}
                </button>`).join('')}
        </div>

        <div class="divider"></div>
        <h5 style="margin-bottom:.75rem">Historial</h5>
        <div class="timeline">
            ${renderTimeline(o.timeline)}
        </div>

        ${isOwn ? `<div class="divider"></div>
        <button class="btn btn-danger btn-sm" onclick="eliminarOrden('${id}')">Eliminar orden</button>` : ''}
    `;

    openDrawer('drawer-orden');

    if (o.proveedorId) {
        db.ref(`proveedores/${o.proveedorId}`).once('value').then(s => {
            const el = document.getElementById(`orden-prov-name-${id}`);
            if(el) el.querySelector('span').textContent = s.val()?.nombre || o.proveedorId;
        });
    }
}

function renderTimeline(timeline) {
    if (!timeline) return '<p style="font-size:.8rem;color:var(--text-xs)">Sin historial de movimientos.</p>';
    const events = Object.values(timeline).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    return events.map((ev, i) => `
        <div class="timeline-item">
            <div class="timeline-dot ${i === events.length-1 ? 'active' : ''}"></div>
            <div class="timeline-content">
                <div class="timeline-label">${escHtml(ev.estado || '—')}</div>
                <div class="timeline-meta">${escHtml(ev.usuario || '')} · ${formatDateTime(ev.timestamp)}</div>
                ${ev.nota ? `<div style="font-size:.8rem;color:var(--text-md);margin-top:2px">${escHtml(ev.nota)}</div>` : ''}
            </div>
        </div>`).join('');
}

async function moverOrden(id, nuevoEstado) {
    const o = ordenesData[id];
    if (!o || o.estado === nuevoEstado) return;

    const update = {
        estado: nuevoEstado,
        [`timeline/${Date.now()}`]: {
            estado:    nuevoEstado,
            usuario:   window.userEmail,
            timestamp: Date.now()
        }
    };

    if (nuevoEstado === 'enviado') update.fechaEnvio = Date.now();

    await db.ref(`ordenes/${id}`).update(update);
    logActivity('orden_movida', `Orden ${o.numero} → ${nuevoEstado}`, 'orden', id);
    showToast(`Orden movida a "${nuevoEstado}"`);
    closeDrawer('drawer-orden');
}

function nuevaOrden() {
    document.getElementById('f-orden-id').value          = '';
    document.getElementById('form-orden').reset();
    // Recargar contratos
    db.ref('contratos').once('value', snap => {
        const data = snap.val() || {};
        const sel  = document.getElementById('f-orden-contrato');
        if (sel) sel.innerHTML = '<option value="">Sin contrato</option>' +
            Object.entries(data).map(([id, c]) =>
                `<option value="${id}">${escHtml(c.numero)} — ${escHtml(c.cliente)}</option>`).join('');
    });
    db.ref('proveedores').once('value', snap => {
        const data = snap.val() || {};
        const sel  = document.getElementById('f-orden-proveedor');
        if (sel) sel.innerHTML = '<option value="">Sin proveedor</option>' +
            Object.entries(data).map(([id, p]) =>
                `<option value="${id}">${escHtml(p.nombre)}</option>`).join('');
    });
    openModal('modal-orden');
}

async function guardarOrden(e) {
    e.preventDefault();
    const id = document.getElementById('f-orden-id').value;

    let fechaLimiteVal = null;
    const dateInput = document.getElementById('f-orden-limite').value;
    const timeInput = document.getElementById('f-orden-hora') ? document.getElementById('f-orden-hora').value : '';
    
    if (dateInput) {
        const timeStr = timeInput || '23:59'; // Default to end of day if no time specified
        fechaLimiteVal = new Date(`${dateInput}T${timeStr}`).getTime();
    }

    const datos = {
        numero:         document.getElementById('f-orden-num').value.trim(),
        nombreProducto: document.getElementById('f-orden-producto').value.trim(),
        cantidad:       document.getElementById('f-orden-cantidad').value,
        unidad:         document.getElementById('f-orden-unidad').value,
        contratoId:     document.getElementById('f-orden-contrato').value,
        proveedorId:    document.getElementById('f-orden-proveedor') ? document.getElementById('f-orden-proveedor').value : '',
        estado:         document.getElementById('f-orden-estado').value || 'recibido',
        prioridad:      document.getElementById('f-orden-prioridad').value || 'normal',
        asignadoA:      document.getElementById('f-orden-asignado').value.trim(),
        fechaLimite:    fechaLimiteVal,
        notas:          document.getElementById('f-orden-notas').value.trim()
    };

    if (!datos.nombreProducto) {
        showToast('El nombre del producto es obligatorio', 'error');
        return;
    }

    if (!id) {
        datos.timestamp = Date.now();
        datos.creadoPor = window.userEmail;
        datos.timeline  = {
            [Date.now()]: {
                estado:    datos.estado,
                usuario:   window.userEmail,
                timestamp: Date.now(),
                nota:      'Orden creada'
            }
        };
    }

    try {
        if (id) {
            await db.ref(`ordenes/${id}`).update(datos);
            logActivity('orden_actualizada', `Orden ${datos.numero} actualizada`, 'orden', id);
            showToast('Orden actualizada');
        } else {
            const ref = await db.ref('ordenes').push(datos);
            logActivity('orden_creada', `Orden ${datos.numero || datos.nombreProducto} creada`, 'orden', ref.key);
            showToast('Orden creada');
        }
        closeModal('modal-orden');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function eliminarOrden(id) {
    const o = ordenesData[id];
    if (!o) return;
    const ok = await confirmDialog('¿Eliminar orden?', `Orden ${o.numero || o.nombreProducto} — Esta acción no se puede deshacer.`);
    if (!ok) return;
    closeDrawer('drawer-orden');
    await db.ref(`ordenes/${id}`).remove();
    logActivity('orden_eliminada', `Orden ${o.numero} eliminada`, 'orden', id);
    showToast('Orden eliminada', 'warning');
}

function filtrarOrdenesContrato(contratoId) {
    filtroContrato = contratoId;
    renderKanban();
}

/* ── Drag & Drop ── */
function handleDragStart(e, id) {
    _draggedId = id;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { if (e.target) e.target.classList.add('dragging'); }, 0);
}

function handleDragEnd(e) {
    if (e.target) e.target.classList.remove('dragging');
    document.querySelectorAll('.kanban-cards').forEach(c => c.classList.remove('drag-over'));
    _draggedId = null;
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) {
        e.currentTarget.classList.remove('drag-over');
    }
}

function handleDrop(e, nuevoEstado) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    if (_draggedId && ordenesData[_draggedId]?.estado !== nuevoEstado) {
        moverOrden(_draggedId, nuevoEstado);
    }
}

window.onSection_ordenes = initOrdenes;
