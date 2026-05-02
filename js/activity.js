// activity.js — Log de actividad en /actividad

const ACTIVITY_LIMIT = 50;

function logActivity(tipo, descripcion, entidadTipo, entidadId) {
    if (!window.auth || !auth.currentUser) return;
    db.ref('actividad').push({
        tipo,
        descripcion,
        entidadTipo: entidadTipo || '',
        entidadId:   entidadId   || '',
        usuario:     auth.currentUser.uid,
        userEmail:   auth.currentUser.email,
        timestamp:   Date.now()
    });
}

function renderActivityFeed(events, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!events || events.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:1.5rem">
            <p>Sin actividad reciente</p>
        </div>`;
        return;
    }

    const _si = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="16" height="16"><path d="${d}"/></svg>`;
    const ACTIVITY_ICONS = {
        contrato_creado:    _si('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8'),
        contrato_actualizado:_si('M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'),
        contrato_eliminado: _si('M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'),
        orden_creada:       _si('M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z'),
        orden_movida:       _si('M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2'),
        orden_eliminada:    _si('M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'),
        inventario_agregado:_si('M5 12h14M12 5v14'),
        inventario_editado: _si('M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z'),
        inventario_eliminado:_si('M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'),
        login:              _si('M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3'),
        default:            _si('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6')
    };

    container.innerHTML = events.slice(0, 20).map(e => {
        const icon = ACTIVITY_ICONS[e.tipo] || ACTIVITY_ICONS.default;
        return `<div class="activity-item">
            <div class="activity-icon">${icon}</div>
            <div class="activity-text">
                <strong>${escHtml(e.descripcion || '—')}</strong>
                <p>${escHtml(e.userEmail || 'Sistema')}</p>
            </div>
            <div class="activity-time">${formatDateTime(e.timestamp)}</div>
            <button class="activity-del-btn" onclick="eliminarActividad('${e.id}')" title="Borrar registro">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
        </div>`;
    }).join('');
}

function initActivityFeed(containerId) {
    db.ref('actividad').orderByChild('timestamp').limitToLast(ACTIVITY_LIMIT)
        .on('value', snap => {
            const data = snap.val();
            const events = data
                ? Object.entries(data).map(([id, val]) => ({ id, ...val })).reverse()
                : [];
            renderActivityFeed(events, containerId);
        });
}

async function eliminarActividad(id) {
    const ok = await confirmDialog('¿Eliminar este registro?', 'Esta acción borrará la entrada de la bitácora permanentemente.');
    if (!ok) return;
    try {
        await db.ref(`actividad/${id}`).remove();
        showToast('Registro eliminado');
    } catch (err) {
        showToast('Error al eliminar: ' + err.message, 'error');
    }
}
