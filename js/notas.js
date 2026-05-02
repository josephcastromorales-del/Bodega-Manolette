// notas.js — Notas rapidas estilo Notion
let notasData = {};
let notasListener = null;

function initNotas() {
    if (notasListener) return;
    notasListener = db.ref('notas').on('value', snap => {
        notasData = snap.val() || {};
        renderNotas();
    }, err => console.warn('[Notas]', err.message));
}

function renderNotas() {
    const container = document.getElementById('notas-grid');
    if (!container) return;
    const busqueda = (document.getElementById('buscar-nota')?.value || '').toLowerCase();
    const catFiltro = document.getElementById('filtro-nota-cat')?.value || '';
    let entries = Object.entries(notasData).map(([id, n]) => ({ id, ...n }));
    if (busqueda) entries = entries.filter(n => (n.titulo || '').toLowerCase().includes(busqueda) || (n.contenido || '').toLowerCase().includes(busqueda));
    if (catFiltro) entries = entries.filter(n => n.categoria === catFiltro);
    entries.sort((a, b) => (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || (b.editadoEn || b.creadoEn || 0) - (a.editadoEn || a.creadoEn || 0));
    document.getElementById('notas-count').textContent = entries.length;
    if (entries.length === 0) {
        container.innerHTML = '<div class="empty-state"><h4>Sin notas</h4><p>Crea tu primera nota para empezar</p></div>';
        return;
    }
    container.innerHTML = entries.map(n => {
        const catBadge = n.categoria === 'contrato' ? 'badge-blue' : n.categoria === 'proveedor' ? 'badge-amber' : n.categoria === 'urgente' ? 'badge-red' : 'badge-gray';
        return `<div class="card" style="cursor:pointer;transition:border var(--t)" onclick="editarNota('${n.id}')" onmouseover="this.style.borderColor='var(--border-default)'" onmouseout="this.style.borderColor=''">
            <div class="card-body" style="padding:14px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                    <h4 style="font-size:var(--fz-sm);font-weight:var(--weight-semibold);margin:0">${escHtml(n.titulo || 'Sin titulo')}</h4>
                    ${n.pin ? '<svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="1.75" width="14" height="14"><path d="M12 17v5M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 2-2H6a2 2 0 0 0 2 2 1 1 0 0 1 1 1z"/></svg>' : ''}
                </div>
                <p style="font-size:var(--fz-xs);color:var(--text-tertiary);line-height:1.5;margin-bottom:8px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${escHtml((n.contenido || '').slice(0, 120))}</p>
                <div style="display:flex;justify-content:space-between;align-items:center">
                    ${n.categoria ? `<span class="badge ${catBadge}">${escHtml(n.categoria)}</span>` : '<span></span>'}
                    <span style="font-size:10px;color:var(--text-tertiary);font-family:var(--font-mono)">${n.editadoEn ? timeAgo(n.editadoEn) : ''}</span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function nuevaNota() {
    document.getElementById('f-nota-id').value = '';
    document.getElementById('form-nota').reset();
    openModal('modal-nota');
}

function editarNota(id) {
    const n = notasData[id]; if (!n) return;
    document.getElementById('f-nota-id').value = id;
    document.getElementById('f-nota-titulo').value = n.titulo || '';
    document.getElementById('f-nota-contenido').value = n.contenido || '';
    document.getElementById('f-nota-categoria').value = n.categoria || 'general';
    document.getElementById('f-nota-pin').checked = !!n.pin;
    openModal('modal-nota');
}

async function guardarNota(e) {
    e.preventDefault();
    const id = document.getElementById('f-nota-id').value;
    const datos = {
        titulo: document.getElementById('f-nota-titulo')?.value.trim(),
        contenido: document.getElementById('f-nota-contenido')?.value.trim(),
        categoria: document.getElementById('f-nota-categoria')?.value || 'general',
        pin: document.getElementById('f-nota-pin')?.checked || false,
        editadoEn: Date.now()
    };
    if (!datos.titulo) { showToast('El titulo es obligatorio', 'error'); return; }
    try {
        if (id) { await db.ref(`notas/${id}`).update(datos); showToast('Nota actualizada'); }
        else { datos.creadoEn = Date.now(); datos.creadoPor = window.userEmail || ''; await db.ref('notas').push(datos); showToast('Nota creada'); }
        closeModal('modal-nota');
    } catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function eliminarNotaActual() {
    const id = document.getElementById('f-nota-id').value;
    if (!id) { closeModal('modal-nota'); return; }
    const ok = await confirmDialog('Eliminar nota?', 'Esta accion no se puede deshacer.');
    if (!ok) return;
    await db.ref(`notas/${id}`).remove(); closeModal('modal-nota'); showToast('Nota eliminada', 'warning');
}

function timeAgo(ts) {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return 'ahora';
    if (diff < 3600) return Math.floor(diff / 60) + 'min';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return Math.floor(diff / 86400) + 'd';
}

window.onSection_notas = initNotas;
