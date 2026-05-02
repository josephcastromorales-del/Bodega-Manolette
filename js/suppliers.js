// suppliers.js — Directorio de proveedores

let proveedoresData = {};
let proveedoresListener = null;
let _provBusqueda  = '';
let _provCategoria = '';

const PROV_CATEGORIAS = [
    'General', 'Termos', 'Regalos Corporativos',
    'Cajas y Empaques', 'Materiales de Empaque', 'Transporte y Logística',
    'Imprenta y Papelería', 'Plásticos', 'Metales', 'Textiles'
];

function initProveedores() {
    if (proveedoresListener) return;

    // Poblar select de categorías del filtro
    const sel = document.getElementById('filtro-prov-categoria');
    if (sel) {
        sel.innerHTML = '<option value="">Todas las categorías</option>' +
            PROV_CATEGORIAS.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    proveedoresListener = db.ref('proveedores').on('value', snap => {
        proveedoresData = snap.val() || {};
        renderProveedores();
    }, err => console.warn('[Proveedores]', err.message));
}

function renderProveedores() {
    const container = document.getElementById('proveedores-grid');
    const counter   = document.getElementById('prov-count');
    if (!container) return;

    const list = Object.entries(proveedoresData)
        .map(([id, p]) => ({ id, ...p }))
        .filter(p => {
            const matchCat = !_provCategoria || p.categoria === _provCategoria;
            const matchQ   = !_provBusqueda  ||
                [p.nombre, p.ciudad, p.productos, p.contacto].some(f =>
                    (f || '').toLowerCase().includes(_provBusqueda.toLowerCase()));
            return matchCat && matchQ;
        })
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    if (counter) counter.textContent = list.length;

    if (list.length === 0) {
        container.innerHTML = `<div class="empty-state" style="grid-column:1/-1;padding:3rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <h4>Sin proveedores registrados</h4>
            <p>Agrega proveedores para construir tu directorio de contactos.</p>
            <button class="btn btn-primary" onclick="nuevoProveedor()" style="margin-top:.75rem">Agregar proveedor</button>
        </div>`;
        return;
    }

    const badgeColor = {
        'Termos': 'badge-blue', 'Regalos Corporativos': 'badge-purple',
        'Cajas y Empaques': 'badge-amber', 'Materiales de Empaque': 'badge-amber',
        'Transporte y Logística': 'badge-gray', 'Imprenta y Papelería': 'badge-green'
    };

    container.innerHTML = list.map(p => {
        const initials = (p.nombre || '?').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
        const cat      = p.categoria || 'General';
        const bColor   = badgeColor[cat] || 'badge-gray';
        const isEmail  = (p.contacto || '').includes('@');
        const hasPhone = (p.contacto || '').match(/\d{7,}/);

        return `<div class="proveedor-card card">
            <div class="proveedor-card-header">
                <div class="proveedor-avatar">${escHtml(initials)}</div>
                <div class="proveedor-info">
                    <div class="proveedor-name">${escHtml(p.nombre || '—')}</div>
                    <div class="proveedor-city">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="11" height="11"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${escHtml(p.ciudad || 'Sin ciudad')}
                    </div>
                </div>
                <span class="badge ${bColor}">${escHtml(cat)}</span>
            </div>
            <div class="proveedor-card-body">
                ${p.productos  ? `<div class="prov-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4Z"/></svg><span>${escHtml(p.productos)}</span></div>` : ''}
                ${p.contacto   ? `<div class="prov-field"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 11a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.93 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg><span>${escHtml(p.contacto)}</span></div>` : ''}
                ${(p.direccion || p.ciudad) ? `
                <div class="prov-map-thumbnail" onclick="window.open('https://www.google.com/maps/search/${encodeURIComponent(p.direccion + ' ' + p.ciudad)}', '_blank')">
                    <div class="prov-map-overlay">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                        <span>Ver en Maps</span>
                    </div>
                    <div class="prov-map-addr-label">${escHtml(p.direccion || p.ciudad)}</div>
                </div>` : ''}
                ${p.notas      ? `<div class="prov-notes">${escHtml(p.notas)}</div>` : ''}
            </div>
            <div class="proveedor-card-footer">
                <button class="btn btn-sm btn-secondary" onclick="editarProveedor('${p.id}')">Editar</button>
                <button class="btn btn-sm btn-danger"    onclick="eliminarProveedor('${p.id}')">Eliminar</button>
                ${isEmail  ? `<a href="mailto:${p.contacto}" class="btn btn-sm btn-success" style="margin-left:auto">Email</a>` : ''}
                ${hasPhone && !isEmail ? `<a href="tel:${p.contacto.replace(/\s/g,'')}" class="btn btn-sm btn-success" style="margin-left:auto">Llamar</a>` : ''}
            </div>
        </div>`;
    }).join('');
}

function nuevoProveedor() {
    document.getElementById('f-prov-id').value = '';
    document.getElementById('form-proveedor').reset();
    document.getElementById('modal-proveedor-title').textContent = 'Nuevo Proveedor';
    // Poblar select categorías del modal
    const sel = document.getElementById('f-prov-categoria');
    if (sel && sel.options.length <= 1) {
        PROV_CATEGORIAS.forEach(c => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = c;
            sel.appendChild(opt);
        });
    }
    openModal('modal-proveedor');
}

function editarProveedor(id) {
    const p = proveedoresData[id];
    if (!p) return;
    nuevoProveedor(); // sets up modal
    document.getElementById('f-prov-id').value        = id;
    document.getElementById('f-prov-nombre').value    = p.nombre    || '';
    document.getElementById('f-prov-ciudad').value    = p.ciudad    || '';
    document.getElementById('f-prov-categoria').value = p.categoria || '';
    document.getElementById('f-prov-contacto').value  = p.contacto  || '';
    document.getElementById('f-prov-direccion').value = p.direccion || '';
    document.getElementById('f-prov-productos').value = p.productos || '';
    document.getElementById('f-prov-notas').value     = p.notas     || '';
    document.getElementById('modal-proveedor-title').textContent = 'Editar Proveedor';
}

async function guardarProveedor(e) {
    e.preventDefault();
    const id = document.getElementById('f-prov-id').value;
    const datos = {
        nombre:    document.getElementById('f-prov-nombre').value.trim(),
        ciudad:    document.getElementById('f-prov-ciudad').value.trim(),
        categoria: document.getElementById('f-prov-categoria').value || 'General',
        contacto:  document.getElementById('f-prov-contacto').value.trim(),
        direccion: document.getElementById('f-prov-direccion').value.trim(),
        productos: document.getElementById('f-prov-productos').value.trim(),
        notas:     document.getElementById('f-prov-notas').value.trim(),
        actualizadoEn: Date.now(),
        actualizadoPor: window.userEmail
    };

    if (!datos.nombre) { showToast('El nombre es obligatorio', 'error'); return; }

    try {
        if (id) {
            await db.ref(`proveedores/${id}`).update(datos);
            logActivity('proveedor_editado', `Proveedor "${datos.nombre}" actualizado`, 'proveedor', id);
            showToast('Proveedor actualizado');
        } else {
            datos.creadoEn  = Date.now();
            datos.creadoPor = window.userEmail;
            const ref = await db.ref('proveedores').push(datos);
            logActivity('proveedor_creado', `Proveedor "${datos.nombre}" agregado`, 'proveedor', ref.key);
            showToast('Proveedor agregado');
        }
        closeModal('modal-proveedor');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function eliminarProveedor(id) {
    const p = proveedoresData[id];
    if (!p) return;
    const ok = await confirmDialog('¿Eliminar proveedor?', `"${p.nombre}" será eliminado del directorio permanentemente.`);
    if (!ok) return;
    await db.ref(`proveedores/${id}`).remove();
    logActivity('proveedor_eliminado', `Proveedor "${p.nombre}" eliminado`, 'proveedor', id);
    showToast('Proveedor eliminado', 'warning');
}

function buscarProveedores(val) {
    _provBusqueda = val;
    renderProveedores();
}

function filtrarProvCategoria(val) {
    _provCategoria = val;
    renderProveedores();
}

window.onSection_proveedores = initProveedores;
