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

    const users = Object.entries(usersData).map(([uid, u]) => ({ uid, ...u }));

    if (users.length === 0) {
        container.innerHTML = '<p style="color:var(--text-sm);font-size:.9rem">Sin usuarios registrados.</p>';
        return;
    }

    container.innerHTML = users.map(u => `
        <div class="user-row">
            <div class="user-row-left">
                <div class="user-row-avatar">${getInitial(u.email)}</div>
                <div>
                    <div class="user-row-email">${escHtml(u.nombre || u.email)}</div>
                    <div class="user-row-meta">${escHtml(u.email)} · ${escHtml(u.rol || 'empleado')}</div>
                </div>
            </div>
            <div style="display:flex;gap:.5rem;align-items:center">
                ${u.uid !== window.currentUser?.uid ? `
                <select class="form-select" style="width:auto;font-size:.8rem;padding:.25rem .5rem"
                        onchange="cambiarRol('${u.uid}', this.value)">
                    <option value="empleado"   ${u.rol==='empleado'   ? 'selected':''}>Empleado</option>
                    <option value="supervisor" ${u.rol==='supervisor' ? 'selected':''}>Supervisor</option>
                    <option value="dueño"      ${u.rol==='dueño'      ? 'selected':''}>Dueño</option>
                </select>` : `<span class="badge badge-blue">Tú</span>`}
            </div>
        </div>`).join('');
}

async function cambiarRol(uid, nuevoRol) {
    try {
        await db.ref(`usuarios/${uid}/rol`).set(nuevoRol);
        showToast('Rol actualizado correctamente');
    } catch (err) {
        showToast('Error al cambiar rol: ' + err.message, 'error');
    }
}

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

window.onSection_config = initConfig;
