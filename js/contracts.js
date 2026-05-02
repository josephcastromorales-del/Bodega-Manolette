// contracts.js — CRUD de contratos en /contratos

let contratosData = {};
let contratosListener = null;

function initContratos() {
    if (contratosListener) return;
    contratosListener = db.ref('contratos').on('value', snap => {
        contratosData = snap.val() || {};
        renderContratosTable();
    }, err => console.warn('[Contratos]', err.message));
}

function renderContratosTable() {
    const tbody = document.getElementById('contratos-tbody');
    if (!tbody) return;

    const list = Object.entries(contratosData)
        .map(([id, c]) => ({ id, ...c }))
        .sort((a, b) => (b.fechaLimite || 0) - (a.fechaLimite || 0));

    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="padding:2rem">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 10h8M8 14h4"/></svg>
            <h4>Sin contratos</h4><p>Crea el primer contrato usando el botón "Nuevo Contrato".</p>
        </div></td></tr>`;
        return;
    }

    tbody.innerHTML = list.map(c => {
        const estadoBadge = {
            activo:     '<span class="badge badge-blue">Activo</span>',
            en_riesgo:  '<span class="badge badge-amber">En Riesgo</span>',
            completado: '<span class="badge badge-green">Completado</span>',
            cancelado:  '<span class="badge badge-gray">Cancelado</span>'
        }[c.estado] || '<span class="badge badge-gray">—</span>';

        const isSup = window.userRole === 'supervisor' || window.userRole === 'dueño';
        const isOwn = window.userRole === 'dueño';

        return `<tr>
            <td><span class="contract-number">${escHtml(c.numero || '—')}</span></td>
            <td><strong>${escHtml(c.cliente || '—')}</strong></td>
            <td>${formatDate(c.fechaInicio)}</td>
            <td>${formatDate(c.fechaLimite)} ${deadlineBadge(c.fechaLimite)}</td>
            <td>${estadoBadge}</td>
            <td>${escHtml(c.responsable || '—')}</td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-sm btn-secondary" onclick="verContrato('${c.id}')">Ver</button>
                    ${isSup ? `<button class="btn btn-sm btn-ghost" onclick="editarContrato('${c.id}')">Editar</button>` : ''}
                    ${isOwn ? `<button class="btn btn-sm btn-danger" onclick="eliminarContrato('${c.id}')">Eliminar</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

function verContrato(id) {
    const c = contratosData[id];
    if (!c) return;

    document.getElementById('drawer-contrato-title').textContent = `Contrato ${c.numero || '—'}`;

    document.getElementById('drawer-contrato-body').innerHTML = `
        <div class="contract-card-detail-grid">
            <div class="contract-detail-item">
                <strong>Número</strong>
                <span class="contract-number">${escHtml(c.numero || '—')}</span>
            </div>
            <div class="contract-detail-item">
                <strong>Cliente</strong>
                <span>${escHtml(c.cliente || '—')}</span>
            </div>
            <div class="contract-detail-item">
                <strong>Inicio</strong>
                <span>${formatDate(c.fechaInicio)}</span>
            </div>
            <div class="contract-detail-item">
                <strong>Límite</strong>
                <span>${formatDate(c.fechaLimite)} ${deadlineBadge(c.fechaLimite)}</span>
            </div>
            <div class="contract-detail-item">
                <strong>Estado</strong>
                <span>${c.estado || '—'}</span>
            </div>
            <div class="contract-detail-item">
                <strong>Responsable</strong>
                <span>${escHtml(c.responsable || '—')}</span>
            </div>
        </div>

        ${c.descripcion ? `<div class="form-group"><label class="form-label">Descripción</label><p style="font-size:.9rem;color:var(--text-md)">${escHtml(c.descripcion)}</p></div>` : ''}
        ${c.instruccionesEspeciales ? `<div class="alert-strip info"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg><div><p><strong>Instrucciones especiales</strong></p><small>${escHtml(c.instruccionesEspeciales)}</small></div></div>` : ''}
        ${c.notas ? `<div class="form-group"><label class="form-label">Notas</label><p style="font-size:.9rem;color:var(--text-md)">${escHtml(c.notas)}</p></div>` : ''}

        <div class="divider"></div>
        <p style="font-size:.75rem;color:var(--text-xs)">Creado: ${formatDateTime(c.creadoEn)}</p>
    `;

    openDrawer('drawer-contrato');
}

function editarContrato(id) {
    const c = contratosData[id] || {};
    document.getElementById('modal-contrato-title').textContent = id ? 'Editar Contrato' : 'Nuevo Contrato';
    document.getElementById('f-contrato-id').value      = id || '';
    document.getElementById('f-contrato-num').value     = c.numero   || '';
    document.getElementById('f-contrato-cliente').value = c.cliente  || 'Cafam';
    document.getElementById('f-contrato-desc').value    = c.descripcion || '';
    document.getElementById('f-contrato-inicio').value  = c.fechaInicio ? new Date(c.fechaInicio).toISOString().slice(0,10) : '';
    document.getElementById('f-contrato-limite').value  = c.fechaLimite ? new Date(c.fechaLimite).toISOString().slice(0,10) : '';
    document.getElementById('f-contrato-resp').value    = c.responsable || '';
    document.getElementById('f-contrato-inst').value    = c.instruccionesEspeciales || '';
    document.getElementById('f-contrato-notas').value   = c.notas || '';
    document.getElementById('f-contrato-estado').value  = c.estado || 'activo';
    openModal('modal-contrato');
}

function nuevoContrato() {
    editarContrato(null);
}

async function guardarContrato(e) {
    e.preventDefault();
    const id = document.getElementById('f-contrato-id').value;
    const datos = {
        numero:     document.getElementById('f-contrato-num').value.trim(),
        cliente:    document.getElementById('f-contrato-cliente').value.trim(),
        descripcion:document.getElementById('f-contrato-desc').value.trim(),
        fechaInicio:new Date(document.getElementById('f-contrato-inicio').value).getTime() || null,
        fechaLimite:new Date(document.getElementById('f-contrato-limite').value).getTime() || null,
        responsable:document.getElementById('f-contrato-resp').value.trim(),
        instruccionesEspeciales: document.getElementById('f-contrato-inst').value.trim(),
        notas:      document.getElementById('f-contrato-notas').value.trim(),
        estado:     document.getElementById('f-contrato-estado').value
    };

    if (!datos.numero || !datos.cliente) {
        showToast('Número y cliente son obligatorios', 'error');
        return;
    }

    try {
        if (id) {
            await db.ref(`contratos/${id}`).update(datos);
            logActivity('contrato_actualizado', `Contrato ${datos.numero} actualizado`, 'contrato', id);
            showToast('Contrato actualizado');
        } else {
            datos.creadoEn = Date.now();
            datos.creadoPor = window.userEmail;
            const ref = await db.ref('contratos').push(datos);
            logActivity('contrato_creado', `Contrato ${datos.numero} creado`, 'contrato', ref.key);
            showToast('Contrato creado');
        }
        closeModal('modal-contrato');
    } catch (err) {
        showToast('Error al guardar: ' + err.message, 'error');
    }
}

async function eliminarContrato(id) {
    const c = contratosData[id];
    if (!c) return;
    const ok = await confirmDialog('¿Eliminar contrato?', `Contrato ${c.numero} — Esta acción no se puede deshacer.`);
    if (!ok) return;
    await db.ref(`contratos/${id}`).remove();
    logActivity('contrato_eliminado', `Contrato ${c.numero} eliminado`, 'contrato', id);
    showToast('Contrato eliminado', 'warning');
}

// Filtro de búsqueda
function filtrarContratos(val) {
    const rows = document.querySelectorAll('#contratos-tbody tr');
    rows.forEach(row => {
        row.style.display = row.textContent.toLowerCase().includes(val.toLowerCase()) ? '' : 'none';
    });
}

// Hook del router
window.onSection_contratos = initContratos;
