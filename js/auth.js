// auth.js — Autenticación, roles, y redirect entre login/app

window.currentUser = null;
window.userRole    = 'empleado';
window.userEmail   = '';
window.userName    = '';

/* ── Escuchar estado de sesión ── */
auth.onAuthStateChanged(async (user) => {
    const onLogin = window.location.pathname.includes('index') || window.location.pathname === '/' || window.location.pathname.endsWith('index.html');
    const onApp   = window.location.pathname.includes('app');

    if (user) {
        window.currentUser = user;
        window.userEmail   = user.email;

        // Obtener datos del usuario
        const snap = await db.ref(`usuarios/${user.uid}`).once('value');
        const data = snap.val() || {};
        window.userRole = data.rol || 'empleado';
        window.userName = data.nombre || user.email.split('@')[0];

        if (onLogin) {
            window.location.href = 'app.html';
            return;
        }

        // Actualizar UI del sidebar
        updateUserUI();

        // Aplicar restricciones de rol
        applyRoleRestrictions();

        // Iniciar migración si es dueño (una sola vez)
        if (window.userRole === 'dueño' && typeof runMigrationIfNeeded === 'function') {
            runMigrationIfNeeded();
        }

    } else {
        window.currentUser = null;
        if (onApp) {
            window.location.href = 'index.html';
        }
    }
});

function updateUserUI() {
    const emailEl  = document.getElementById('user-email');
    const roleEl   = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar');
    const badgeEl  = document.getElementById('topbar-role-badge');
    
    const formattedRole = userRole.charAt(0).toUpperCase() + userRole.slice(1);

    if (emailEl)  emailEl.textContent  = userEmail;
    if (roleEl)   roleEl.textContent   = formattedRole;
    if (avatarEl) avatarEl.textContent = getInitial(userEmail);
    if (badgeEl)  badgeEl.textContent  = formattedRole;
}

function applyRoleRestrictions() {
    // Ocultar elementos según rol
    const isOwner      = userRole === 'dueño';
    const isSupervisor = userRole === 'supervisor' || isOwner;

    document.querySelectorAll('[data-role="owner"]').forEach(el => {
        el.style.display = isOwner ? '' : 'none';
    });
    document.querySelectorAll('[data-role="supervisor"]').forEach(el => {
        el.style.display = isSupervisor ? '' : 'none';
    });

    // Ocultar nav items según rol
    const navInventario = document.getElementById('nav-inventario');
    const navReportes   = document.getElementById('nav-reportes');
    const navConfig     = document.getElementById('nav-config');
    if (navInventario) navInventario.style.display = isSupervisor ? '' : 'none';
    if (navReportes)   navReportes.style.display   = isSupervisor ? '' : 'none';
    if (navConfig)     navConfig.style.display     = isOwner      ? '' : 'none';
}

/* ── Logout ── */
function logout() {
    confirmDialog('¿Cerrar sesión?', 'Se cerrará tu sesión actual.').then(ok => {
        if (ok) auth.signOut();
    });
}

/* ── Login (index.html) ── */
function initLoginPage() {
    const loginForm    = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authError    = document.getElementById('authError');

    if (!loginForm) return; // no estamos en index.html

    // Tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.target;
            document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.auth-form').forEach(f => f.style.display = 'none');
            const form = document.getElementById(target);
            if (form) form.style.display = 'block';
            if (authError) authError.textContent = '';
        });
    });

    // Toggle password visibility
    document.querySelectorAll('.toggle-pass').forEach(btn => {
        btn.addEventListener('click', () => {
            const inputId = btn.dataset.input;
            const input   = document.getElementById(inputId);
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            btn.innerHTML = input.type === 'password'
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61M2 2l20 20"/></svg>';
        });
    });

    // LOGIN
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value.trim();
        const pass  = document.getElementById('loginPass').value;
        const btn   = document.getElementById('btnLogin');
        authError.textContent = '';
        btn.disabled = true;
        btn.textContent = 'Verificando...';
        try {
            await auth.signInWithEmailAndPassword(email, pass);
        } catch (err) {
            authError.textContent = 'Credenciales incorrectas. Revisa tu email y contraseña.';
            btn.disabled = false;
            btn.textContent = 'Iniciar sesión';
        }
    };

    // REGISTRO
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const email  = document.getElementById('regEmail').value.trim();
        const pass   = document.getElementById('regPass').value;
        const nombre = document.getElementById('regNombre').value.trim();
        const rol    = document.getElementById('regRol').value;
        const btn    = document.getElementById('btnReg');
        authError.textContent = '';

        if (pass.length < 6) {
            authError.textContent = 'La contraseña debe tener mínimo 6 caracteres.';
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Creando cuenta...';
        try {
            const result = await auth.createUserWithEmailAndPassword(email, pass);
            await db.ref(`usuarios/${result.user.uid}`).set({
                email, rol, nombre, activo: true, creadoEn: Date.now()
            });
        } catch (err) {
            const msg = err.code === 'auth/email-already-in-use'
                ? 'Ya existe una cuenta con este email.'
                : 'Error al registrar: ' + err.message;
            authError.textContent = msg;
            btn.disabled = false;
            btn.textContent = 'Crear cuenta';
        }
    };
}

// Iniciar al cargar la página de login
document.addEventListener('DOMContentLoaded', initLoginPage);
