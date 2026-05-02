// inventory.js — CRUD inventario + migración de datos V1 → V2

let inventarioData = {};
let inventarioListener = null;

function initInventario() {
    if (inventarioListener) return;
    inventarioListener = db.ref('inventario').on('value', snap => {
        inventarioData = snap.val() || {};
        renderInventarioTable();
    }, err => console.warn('[Inventario]', err.message));
}

function renderInventarioTable(busqueda = '') {
    const tbody = document.getElementById('inventario-tbody');
    if (!tbody) return;

    const list = Object.entries(inventarioData)
        .map(([id, item]) => ({ id, ...item }))
        .filter(item => !busqueda || item.nombre.toLowerCase().includes(busqueda.toLowerCase()))
        .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:2rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
            <h4>Sin productos en inventario</h4>
            <p>Agrega productos usando el botón "Agregar Producto".</p>
        </div></td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(item => {
        const stock = Number(item.stockActual || 0);
        const min   = Number(item.stockMinimo || 0);
        let stockBadge;
        if (stock === 0)     stockBadge = '<span class="badge badge-red">Agotado</span>';
        else if (stock <= min) stockBadge = '<span class="badge badge-amber">Bajo</span>';
        else                   stockBadge = '<span class="badge badge-green">Suficiente</span>';

        return `<tr>
            <td><strong>${escHtml(item.nombre || '—')}</strong></td>
            <td style="font-family:monospace;font-size:.8rem">${escHtml(item.sku || '—')}</td>
            <td>${escHtml(item.categoria || '—')}</td>
            <td>${stock} <small>${escHtml(item.unidad || '')}</small> ${stockBadge}</td>
            <td>${min}</td>
            <td>${escHtml(item.ubicacion || '—')}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-primary"   onclick="registrarMovimiento('${item.id}')">+ / −</button>
                    <button class="btn btn-sm btn-secondary" onclick="editarItem('${item.id}')">Editar</button>
                    <button class="btn btn-sm btn-danger"    onclick="eliminarItem('${item.id}')">Eliminar</button>
                </div>
            </td>
        </tr>`;
    }).join('');
}

function nuevoItem() {
    document.getElementById('f-item-id').value      = '';
    document.getElementById('form-inventario').reset();
    document.getElementById('modal-inventario-title').textContent = 'Agregar Producto';
    openModal('modal-inventario');
}

function editarItem(id) {
    const item = inventarioData[id];
    if (!item) return;
    document.getElementById('f-item-id').value          = id;
    document.getElementById('f-item-nombre').value      = item.nombre   || '';
    document.getElementById('f-item-sku').value         = item.sku      || '';
    document.getElementById('f-item-categoria').value   = item.categoria|| '';
    document.getElementById('f-item-stock').value       = item.stockActual || 0;
    document.getElementById('f-item-minimo').value      = item.stockMinimo || 0;
    document.getElementById('f-item-unidad').value      = item.unidad   || '';
    document.getElementById('f-item-ubicacion').value   = item.ubicacion|| '';
    document.getElementById('modal-inventario-title').textContent = 'Editar Producto';
    openModal('modal-inventario');
}

async function guardarItem(e) {
    e.preventDefault();
    const id = document.getElementById('f-item-id').value;
    const datos = {
        nombre:       document.getElementById('f-item-nombre').value.trim(),
        sku:          document.getElementById('f-item-sku').value.trim(),
        categoria:    document.getElementById('f-item-categoria').value.trim(),
        stockActual:  Number(document.getElementById('f-item-stock').value) || 0,
        stockMinimo:  Number(document.getElementById('f-item-minimo').value) || 0,
        unidad:       document.getElementById('f-item-unidad').value.trim(),
        ubicacion:    document.getElementById('f-item-ubicacion').value.trim(),
        ultimaActualizacion: Date.now(),
        actualizadoPor: window.userEmail
    };

    if (!datos.nombre) {
        showToast('El nombre del producto es obligatorio', 'error');
        return;
    }

    try {
        if (id) {
            await db.ref(`inventario/${id}`).update(datos);
            logActivity('inventario_editado', `${datos.nombre} actualizado`, 'inventario', id);
            showToast('Producto actualizado');
        } else {
            datos.creadoEn  = Date.now();
            datos.creadoPor = window.userEmail;
            const ref = await db.ref('inventario').push(datos);
            logActivity('inventario_agregado', `${datos.nombre} agregado al inventario`, 'inventario', ref.key);
            showToast('Producto agregado');
        }
        closeModal('modal-inventario');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

async function eliminarItem(id) {
    const item = inventarioData[id];
    if (!item) return;
    const ok = await confirmDialog('¿Eliminar producto?', `"${item.nombre}" será eliminado del inventario.`);
    if (!ok) return;
    await db.ref(`inventario/${id}`).remove();
    logActivity('inventario_eliminado', `${item.nombre} eliminado del inventario`, 'inventario', id);
    showToast('Producto eliminado', 'warning');
}

/* ── Migración V1 → V2 ── */
async function runMigrationIfNeeded() {
    try {
        const migSnap = await db.ref('configuracion/migracionV2').once('value');
        if (migSnap.val()) return; // ya migrado

        const prodSnap = await db.ref('productos').once('value');
        const prods    = prodSnap.val();
        if (!prods) {
            await db.ref('configuracion/migracionV2').set(true);
            return;
        }

        const entries = Object.entries(prods);
        if (entries.length === 0) {
            await db.ref('configuracion/migracionV2').set(true);
            return;
        }

        const batch = {};
        entries.forEach(([oldId, p]) => {
            const newKey = db.ref('inventario').push().key;
            batch[`inventario/${newKey}`] = {
                nombre:       p.nombre || 'Sin nombre',
                sku:          '',
                categoria:    'General',
                stockActual:  Number(p.cantidad) || 0,
                stockMinimo:  0,
                unidad:       p.tipoCantidad || 'unidades',
                ubicacion:    p.piso || '',
                creadoEn:     Date.now(),
                creadoPor:    p.quien || 'migración',
                ultimaActualizacion: Date.now()
            };
        });
        batch['configuracion/migracionV2'] = true;

        await db.ref().update(batch);
        showToast(`${entries.length} producto(s) migrado(s) al nuevo inventario`, 'info');
    } catch (err) {
        console.error('Error en migración:', err);
    }
}

function buscarInventario(val) {
    renderInventarioTable(val);
}

/* ── Movimientos de stock ── */
function registrarMovimiento(id) {
    const item = inventarioData[id];
    if (!item) return;
    document.getElementById('f-mov-id').value = id;
    document.getElementById('f-mov-nombre').textContent  = item.nombre || '—';
    document.getElementById('f-mov-actual').textContent  = item.stockActual || 0;
    document.getElementById('f-mov-unidad').textContent  = item.unidad || 'unidades';
    document.getElementById('form-movimiento').reset();
    document.getElementById('f-mov-id').value = id; // reset borra el hidden
    openModal('modal-movimiento');
}

async function guardarMovimiento(e) {
    e.preventDefault();
    const id       = document.getElementById('f-mov-id').value;
    const tipo     = document.getElementById('f-mov-tipo').value;
    const cantidad = Number(document.getElementById('f-mov-cantidad').value) || 0;
    const razon    = document.getElementById('f-mov-razon').value.trim();

    if (cantidad <= 0) { showToast('Ingresa una cantidad válida', 'error'); return; }

    const item = inventarioData[id];
    if (!item) return;

    const stockActual = Number(item.stockActual || 0);
    const nuevoStock  = tipo === 'entrada' ? stockActual + cantidad : stockActual - cantidad;

    if (nuevoStock < 0) {
        showToast(`Stock insuficiente. Disponible: ${stockActual}`, 'error');
        return;
    }

    const movimiento = {
        tipo, cantidad, razon: razon || '—',
        stockAntes: stockActual, stockDespues: nuevoStock,
        usuario: window.userEmail, timestamp: Date.now()
    };

    try {
        await db.ref(`inventario/${id}`).update({
            stockActual: nuevoStock,
            ultimaActualizacion: Date.now(),
            actualizadoPor: window.userEmail
        });
        await db.ref(`movimientos/${id}`).push(movimiento);
        const label = tipo === 'entrada' ? `+${cantidad}` : `-${cantidad}`;
        logActivity('stock_movimiento', `${label} ${item.nombre} → stock: ${nuevoStock}`, 'inventario', id);
        showToast(`${tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${cantidad} registrada`);
        closeModal('modal-movimiento');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

window.onSection_inventario = initInventario;
