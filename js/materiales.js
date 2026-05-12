// materiales.js — Gestión de materias primas y costos
let materialesData = {};
let materialesListener = null;

function initMateriales() {
    if (materialesListener) return;
    materialesListener = db.ref('materiales').on('value', snap => {
        materialesData = snap.val() || {};
        renderMateriales();
    }, err => console.warn('[Materiales]', err.message));
}

function renderMateriales() {
    const container = document.getElementById('materiales-grid');
    if (!container) return;

    const entries = Object.entries(materialesData).map(([id, m]) => ({ id, ...m }));

    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state"><h4>Sin materiales registrados</h4><p>Agrega materiales para calcular tus costos de producción</p></div>';
        return;
    }

    container.innerHTML = entries.map(m => `
        <div class="supplier-card" style="display: flex; flex-direction: column; padding: 10px">
            <div style="height: 120px; background: var(--bg-raised); border-radius: var(--r-md); overflow: hidden; margin-bottom: 12px; display: flex; align-items: center; justify-content: center;">
                ${m.imagen ? `<img src="${m.imagen}" style="width: 100%; height: 100%; object-fit: cover;">` : `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" style="color: var(--text-tertiary)">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    </svg>
                `}
            </div>
            <div style="flex: 1;">
                <div class="supplier-name" style="font-size: var(--fz-base);">${escHtml(m.nombre || '—')}</div>
                <div class="supplier-city" style="color: var(--accent); font-weight: 600; margin: 4px 0;">${formatCOP(m.costo || 0)} <small style="color: var(--text-tertiary); font-weight: 400;">/ unidad</small></div>
                <div class="supplier-info-row" style="font-size: var(--fz-xs);">Prov: ${escHtml(m.proveedor || 'N/A')}</div>
            </div>
            <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button class="btn btn-secondary btn-sm" style="flex: 1;" onclick="editarMaterial('${m.id}')">Editar</button>
                <button class="btn btn-danger btn-sm" style="padding: 0 10px;" onclick="eliminarMaterial('${m.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

function nuevoMaterial() {
    document.getElementById('f-material-id').value = '';
    document.getElementById('form-material').reset();
    document.getElementById('f-material-img-preview').src = '';
    document.getElementById('f-material-img-preview').style.display = 'none';
    openModal('modal-material');
}

function editarMaterial(id) {
    const m = materialesData[id];
    if (!m) return;
    document.getElementById('f-material-id').value = id;
    document.getElementById('f-material-nombre').value = m.nombre || '';
    document.getElementById('f-material-costo').value = m.costo ? new Intl.NumberFormat('es-CO').format(m.costo) : '0';
    document.getElementById('f-material-proveedor').value = m.proveedor || '';

    const preview = document.getElementById('f-material-img-preview');
    if (m.imagen) {
        preview.src = m.imagen;
        preview.style.display = 'block';
    } else {
        preview.style.display = 'none';
    }

    openModal('modal-material');
}

async function guardarMaterial(e) {
    e.preventDefault();
    const id = document.getElementById('f-material-id').value;
    const imgPreview = document.getElementById('f-material-img-preview').src;

    const datos = {
        nombre: document.getElementById('f-material-nombre').value.trim(),
        costo: parseCOP(document.getElementById('f-material-costo').value),
        proveedor: document.getElementById('f-material-proveedor').value.trim(),
        imagen: imgPreview.startsWith('data:') ? imgPreview : (materialesData[id]?.imagen || ''),
        actualizadoEn: Date.now()
    };

    if (!datos.nombre) { showToast('El nombre es obligatorio', 'error'); return; }

    try {
        if (id) {
            await db.ref(`materiales/${id}`).update(datos);
            showToast('Material actualizado');
        } else {
            await db.ref('materiales').push(datos);
            showToast('Material agregado');
        }
        closeModal('modal-material');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function eliminarMaterial(id) {
    const m = materialesData[id];
    const ok = await confirmDelete(m?.nombre || 'Este material', 'Esto afectará el cálculo de costos de los productos vinculados.');
    if (!ok) return;
    await db.ref(`materiales/${id}`).remove();
    showToast('Material eliminado', 'warning');
}

// Helper para previsualizar imagen
function handleMaterialImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.getElementById('f-material-img-preview');
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(input.files[0]);
    }
}

window.onSection_materiales = initMateriales;
