// config-section.js — Sección de Configuración (solo dueño)

let usersData = {};
let usersListener = null;

function initConfig() {
    if (usersListener) return;
    usersListener = db.ref('usuarios').on('value', snap => {
        usersData = snap.val() || {};
        renderUsersList();
    }, err => console.warn('[Config]', err.message));
    loadCompanyInfo();
}

function renderUsersList() {
    const container = document.getElementById('users-list');
    if (!container) return;

    const all     = Object.entries(usersData).map(([uid, u]) => ({ uid, ...u }));
    const pending = all.filter(u => u.pendiente === true);
    const active  = all.filter(u => !u.pendiente);

    let html = '';

    // ── Solicitudes pendientes ────────────────────────────────────────
    if (pending.length > 0) {
        html += `
        <div style="margin-bottom:1.25rem">
            <div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.75rem">
                <span style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-tertiary)">Solicitudes pendientes</span>
                <span style="background:var(--warning-subtle);color:var(--warning);font-size:11px;font-weight:700;padding:1px 7px;border-radius:4px;border:1px solid transparent">${pending.length}</span>
            </div>
            ${pending.map(u => `
            <div class="user-row" style="background:var(--warning-subtle);border:1px solid rgba(245,158,11,0.2);border-radius:var(--r-lg);padding:.75rem 1rem;margin-bottom:.5rem">
                <div class="user-row-left">
                    <div class="user-row-avatar" style="background:var(--warning-subtle);color:var(--warning)">${getInitial(u.email)}</div>
                    <div>
                        <div class="user-row-email">${escHtml(u.nombre || u.email)}</div>
                        <div class="user-row-meta">${escHtml(u.email)} · Solicitud pendiente · ${_formatDate(u.creadoEn)}</div>
                    </div>
                </div>
                <div style="display:flex;gap:.5rem;align-items:center">
                    <select class="form-select" id="rol-select-${u.uid}" style="width:auto;font-size:12px;padding:4px 8px;height:28px">
                        <option value="empleado">Empleado</option>
                        <option value="supervisor">Supervisor</option>
                        <option value="dueño">Dueño</option>
                    </select>
                    <button class="btn btn-sm" style="background:var(--success);color:white;border-color:var(--success)"
                            onclick="aprobarUsuario('${u.uid}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M20 6 9 17l-5-5"/></svg>
                        Aprobar
                    </button>
                    <button class="btn btn-sm btn-ghost" style="color:var(--danger)"
                            onclick="rechazarUsuario('${u.uid}', '${escHtml(u.nombre || u.email)}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><path d="M18 6 6 18M6 6l12 12"/></svg>
                        Rechazar
                    </button>
                </div>
            </div>`).join('')}
        </div>`;
    }

    // ── Usuarios activos / rechazados ─────────────────────────────────
    html += `
    <div>
        <div style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-tertiary);margin-bottom:.75rem">
            Equipo activo${active.length ? ` (${active.length})` : ''}
        </div>
        ${active.length === 0
            ? '<p style="color:var(--text-tertiary);font-size:13px">Sin usuarios activos aún.</p>'
            : active.map(u => `
        <div class="user-row">
            <div class="user-row-left">
                <div class="user-row-avatar">${getInitial(u.email)}</div>
                <div>
                    <div class="user-row-email">${escHtml(u.nombre || u.email)}</div>
                    <div class="user-row-meta">${escHtml(u.email)} · ${escHtml(u.rol || 'empleado')}${u.rechazado ? ' · <span style="color:var(--danger)">rechazado</span>' : ''}</div>
                </div>
            </div>
            <div style="display:flex;gap:.5rem;align-items:center">
                ${u.uid !== window.currentUser?.uid ? `
                <select class="form-select" style="width:auto;font-size:12px;padding:4px 8px;height:28px"
                        onchange="cambiarRol('${u.uid}', this.value)">
                    <option value="empleado"   ${u.rol==='empleado'   ? 'selected':''}>Empleado</option>
                    <option value="supervisor" ${u.rol==='supervisor' ? 'selected':''}>Supervisor</option>
                    <option value="dueño"      ${u.rol==='dueño'      ? 'selected':''}>Dueño</option>
                </select>
                <button class="btn btn-sm btn-ghost" style="color:var(--danger)"
                        onclick="desactivarUsuario('${u.uid}', '${escHtml(u.nombre || u.email)}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93l14.14 14.14"/></svg>
                    Desactivar
                </button>` : `<span class="badge badge-blue">Tú</span>`}
            </div>
        </div>`).join('')}
    </div>`;

    container.innerHTML = html || '<p style="color:var(--text-tertiary);font-size:13px">Sin usuarios registrados.</p>';
}

/* ── Aprobar usuario ─────────────────────────────────────────────── */
async function aprobarUsuario(uid) {
    const selectEl = document.getElementById(`rol-select-${uid}`);
    const rol = selectEl ? selectEl.value : 'empleado';
    try {
        await db.ref(`usuarios/${uid}`).update({
            pendiente: false,
            activo:    true,
            rol,
            aprobadoEn:  Date.now(),
            aprobadoPor: window.currentUser?.uid || 'desconocido'
        });
        showToast(`Usuario aprobado como ${rol}`, 'success');
    } catch (err) {
        showToast('Error al aprobar: ' + err.message, 'error');
    }
}

/* ── Rechazar usuario ────────────────────────────────────────────── */
async function rechazarUsuario(uid, nombre) {
    const ok = await confirmDialog(
        'Rechazar solicitud',
        `¿Rechazar el acceso de "${nombre}"? El usuario no podrá iniciar sesión.`
    );
    if (!ok) return;
    try {
        await db.ref(`usuarios/${uid}`).update({
            pendiente:    false,
            activo:       false,
            rechazado:    true,
            rechazadoEn:  Date.now()
        });
        showToast('Solicitud rechazada', 'warning');
    } catch (err) {
        showToast('Error al rechazar: ' + err.message, 'error');
    }
}

/* ── Desactivar usuario activo ───────────────────────────────────── */
async function desactivarUsuario(uid, nombre) {
    const ok = await confirmDialog(
        'Desactivar usuario',
        `¿Desactivar a "${nombre}"? No podrá iniciar sesión hasta que lo reactives.`
    );
    if (!ok) return;
    try {
        await db.ref(`usuarios/${uid}`).update({ activo: false, pendiente: false });
        showToast('Usuario desactivado', 'warning');
    } catch (err) {
        showToast('Error al desactivar: ' + err.message, 'error');
    }
}

/* ── Cambiar rol ─────────────────────────────────────────────────── */
async function cambiarRol(uid, nuevoRol) {
    try {
        await db.ref(`usuarios/${uid}/rol`).set(nuevoRol);
        showToast('Rol actualizado');
    } catch (err) {
        showToast('Error al cambiar rol: ' + err.message, 'error');
    }
}

/* ── Info empresa ────────────────────────────────────────────────── */
async function loadCompanyInfo() {
    const snap = await db.ref('configuracion').once('value');
    const data = snap.val() || {};
    const nameEl = document.getElementById('f-empresa-nombre');
    const contEl = document.getElementById('f-empresa-contacto');
    if (nameEl) nameEl.value = data.empresa  || '';
    if (contEl) contEl.value = data.contacto || '';
}

async function guardarEmpresa(e) {
    e.preventDefault();
    const nombre   = document.getElementById('f-empresa-nombre').value.trim();
    const contacto = document.getElementById('f-empresa-contacto').value.trim();
    try {
        await db.ref('configuracion').update({ empresa: nombre, contacto });
        showToast('Información de empresa guardada');
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
}

/* ── Helper: formato de fecha ────────────────────────────────────── */
function _formatDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

window.onSection_config = initConfig;
