// empleados.js — Gestion del equipo
let empleadosData = {};
let empleadosListener = null;

function initEmpleados() {
    if (empleadosListener) return;
    empleadosListener = db.ref('usuarios').on('value', snap => {
        empleadosData = snap.val() || {};
        renderEmpleados();
    }, err => console.warn('[Empleados]', err.message));
}

function renderEmpleados() {
    const container = document.getElementById('empleados-table-body');
    if (!container) return;
    const entries = Object.entries(empleadosData);
    document.getElementById('empleados-count').textContent = entries.length;
    if (entries.length === 0) {
        container.innerHTML = '<tr><td colspan="5" class="empty-state" style="padding:2rem">Sin empleados registrados</td></tr>';
        return;
    }
    container.innerHTML = entries.map(([uid, u]) => {
        const rolBadge = u.rol === 'dueño' ? 'badge-purple' : u.rol === 'supervisor' ? 'badge-blue' : 'badge-gray';
        return `<tr>
            <td><div style="display:flex;align-items:center;gap:10px">
                <div class="supplier-avatar" style="width:32px;height:32px;font-size:12px">${(u.email || '?')[0].toUpperCase()}</div>
                <div><div style="font-weight:var(--weight-medium);color:var(--text-primary)">${escHtml(u.nombre || u.email || '—')}</div>
                <div style="font-size:var(--fz-xs);color:var(--text-tertiary)">${escHtml(u.email || '')}</div></div>
            </div></td>
            <td><span class="badge ${rolBadge}">${escHtml(u.rol || 'empleado')}</span></td>
            <td class="mono">${u.ultimoAcceso ? formatDateTime(u.ultimoAcceso) : '—'}</td>
            <td>${u.activo !== false ? '<span class="dot dot-green"></span> Activo' : '<span class="dot dot-gray"></span> Inactivo'}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="verEmpleado('${uid}')">Ver</button></td>
        </tr>`;
    }).join('');
}

function verEmpleado(uid) {
    const u = empleadosData[uid]; if (!u) return;
    document.getElementById('drawer-empleado-title').textContent = u.nombre || u.email || '—';
    document.getElementById('drawer-empleado-body').innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">
            <div class="contract-detail-item"><strong>Email</strong><span>${escHtml(u.email || '—')}</span></div>
            <div class="contract-detail-item"><strong>Rol</strong><span>${escHtml(u.rol || 'empleado')}</span></div>
            <div class="contract-detail-item"><strong>Telefono</strong><span>${escHtml(u.telefono || '—')}</span></div>
            <div class="contract-detail-item"><strong>Ultimo acceso</strong><span class="mono">${u.ultimoAcceso ? formatDateTime(u.ultimoAcceso) : '—'}</span></div>
        </div>
        ${window.userRole === 'dueño' ? `<div class="divider"></div>
        <div class="form-group"><label class="form-label">Cambiar rol</label>
            <select class="form-select" id="edit-rol-${uid}" onchange="cambiarRol('${uid}', this.value)">
                <option value="empleado" ${u.rol === 'empleado' ? 'selected' : ''}>Empleado</option>
                <option value="supervisor" ${u.rol === 'supervisor' ? 'selected' : ''}>Supervisor</option>
                <option value="dueño" ${u.rol === 'dueño' ? 'selected' : ''}>Dueño</option>
            </select></div>` : ''}`;
    openDrawer('drawer-empleado');
}

async function cambiarRol(uid, nuevoRol) {
    try { await db.ref(`usuarios/${uid}/rol`).set(nuevoRol); showToast(`Rol actualizado a ${nuevoRol}`); }
    catch (err) { showToast('Error: ' + err.message, 'error'); }
}

window.onSection_empleados = initEmpleados;
