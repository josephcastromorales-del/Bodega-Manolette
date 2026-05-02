// clientes.js — Directorio de clientes con historial
let clientesData = {};
let clientesListener = null;

function initClientes() {
    if (clientesListener) return;
    clientesListener = db.ref('clientes').on('value', snap => {
        clientesData = snap.val() || {};
        renderClientes();
    }, err => console.warn('[Clientes]', err.message));
}

function renderClientes() {
    const container = document.getElementById('clientes-grid');
    if (!container) return;
    const busqueda = (document.getElementById('buscar-cliente')?.value || '').toLowerCase();
    const entries = Object.entries(clientesData).filter(([, c]) =>
        !busqueda || (c.nombre || '').toLowerCase().includes(busqueda) || (c.empresa || '').toLowerCase().includes(busqueda)
    );
    document.getElementById('clientes-count').textContent = entries.length;
    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state"><h4>Sin clientes registrados</h4><p>Agrega tu primer cliente para empezar</p></div>';
        return;
    }
    container.innerHTML = entries.map(([id, c]) => `
        <div class="supplier-card" onclick="verCliente('${id}')">
            <div class="supplier-card-header">
                <div class="supplier-avatar">${(c.nombre || '?')[0].toUpperCase()}</div>
                <div>
                    <div class="supplier-name">${escHtml(c.nombre || '—')}</div>
                    <div class="supplier-city">${escHtml(c.empresa || '')} ${c.ciudad ? '· ' + escHtml(c.ciudad) : ''}</div>
                </div>
            </div>
            <div class="supplier-card-body">
                ${c.telefono ? `<div class="supplier-info-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="14" height="14"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>${escHtml(c.telefono)}</div>` : ''}
                ${c.email ? `<div class="supplier-info-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="14" height="14"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>${escHtml(c.email)}</div>` : ''}
                ${c.prioridad ? `<div style="margin-top:6px"><span class="badge ${c.prioridad === 'alta' ? 'badge-red' : c.prioridad === 'media' ? 'badge-amber' : 'badge-gray'}">${escHtml(c.prioridad)}</span></div>` : ''}
            </div>
        </div>`).join('');
}

function nuevoCliente() { document.getElementById('f-cliente-id').value = ''; document.getElementById('form-cliente').reset(); openModal('modal-cliente'); }

function verCliente(id) {
    const c = clientesData[id]; if (!c) return;
    document.getElementById('drawer-cliente-title').textContent = c.nombre || '—';
    document.getElementById('drawer-cliente-body').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
            <div class="contract-detail-item"><strong>Empresa</strong><span>${escHtml(c.empresa || '—')}</span></div>
            <div class="contract-detail-item"><strong>Ciudad</strong><span>${escHtml(c.ciudad || '—')}</span></div>
            <div class="contract-detail-item"><strong>Telefono</strong><span>${escHtml(c.telefono || '—')}</span></div>
            <div class="contract-detail-item"><strong>Email</strong><span>${escHtml(c.email || '—')}</span></div>
            <div class="contract-detail-item"><strong>NIT/CC</strong><span class="mono">${escHtml(c.nit || '—')}</span></div>
            <div class="contract-detail-item"><strong>Prioridad</strong><span>${escHtml(c.prioridad || 'normal')}</span></div>
        </div>
        ${c.direccion ? `<div class="contract-detail-item"><strong>Direccion</strong><span>${escHtml(c.direccion)}</span></div>` : ''}
        ${c.notas ? `<div class="alert-strip info" style="margin-top:1rem"><p>${escHtml(c.notas)}</p></div>` : ''}
        <div class="divider"></div>
        <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="editarCliente('${id}')">Editar</button>
            <button class="btn btn-danger btn-sm" onclick="eliminarCliente('${id}')">Eliminar</button>
        </div>`;
    openDrawer('drawer-cliente');
}

function editarCliente(id) {
    const c = clientesData[id]; if (!c) return; closeDrawer('drawer-cliente');
    document.getElementById('f-cliente-id').value = id;
    ['nombre','empresa','telefono','email','ciudad','direccion','nit','notas'].forEach(f => {
        const el = document.getElementById('f-cliente-' + f); if (el) el.value = c[f] || '';
    });
    const prio = document.getElementById('f-cliente-prioridad'); if (prio) prio.value = c.prioridad || 'normal';
    openModal('modal-cliente');
}

async function guardarCliente(e) {
    e.preventDefault();
    const id = document.getElementById('f-cliente-id').value;
    const datos = {};
    ['nombre','empresa','telefono','email','ciudad','direccion','nit','notas'].forEach(f => {
        datos[f] = (document.getElementById('f-cliente-' + f)?.value || '').trim();
    });
    datos.prioridad = document.getElementById('f-cliente-prioridad')?.value || 'normal';
    if (!datos.nombre) { showToast('El nombre es obligatorio', 'error'); return; }
    try {
        if (id) { await db.ref(`clientes/${id}`).update(datos); showToast('Cliente actualizado'); }
        else { datos.creadoEn = Date.now(); datos.creadoPor = window.userEmail || ''; await db.ref('clientes').push(datos); showToast('Cliente creado'); }
        closeModal('modal-cliente');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function eliminarCliente(id) {
    const c = clientesData[id]; if (!c) return;
    const ok = await confirmDialog('Eliminar cliente?', `${c.nombre} — Esta accion no se puede deshacer.`);
    if (!ok) return; closeDrawer('drawer-cliente');
    await db.ref(`clientes/${id}`).remove(); showToast('Cliente eliminado', 'warning');
}

window.onSection_clientes = initClientes;
