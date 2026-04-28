// CONFIGURACIÓN FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyAE5pMe0loRrtKbKirQlG9H1rSBaoF4viQ",
    authDomain: "sistemaempresa-8b933.firebaseapp.com",
    projectId: "sistemaempresa-8b933",
    storageBucket: "sistemaempresa-8b933.firebasestorage.app",
    messagingSenderId: "992528113878",
    appId: "1:992528113878:web:324dc4f0ed9d49fcad6977",
    measurementId: "G-5RWR0JW8Y4"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

/* ─── ESTADO GLOBAL ─── */
let productos = [];
let historial = [];
let currentUser = null;
let userRole = 'empleado';

/* ─── AUTENTICACIÓN ─── */

function toggleAuth(showRegister) {
    document.getElementById("loginFormContainer").style.display  = showRegister ? "none"  : "block";
    document.getElementById("registerFormContainer").style.display = showRegister ? "block" : "none";
    document.getElementById("authError").style.display = "none";
}

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;

        const roleSnap = await db.ref(`usuarios/${user.uid}/rol`).once('value');
        userRole = roleSnap.val() || 'empleado';

        const isOwner = (userRole === 'dueño');
        const emailShort = user.email.split('@')[0];

        document.getElementById("userEmail").innerText = user.email;
        document.getElementById("userRole").innerText  = isOwner ? '👑 Administrador' : '👤 Empleado';
        document.getElementById("quien").value = emailShort;

        document.querySelectorAll(".owner-only").forEach(el => {
            el.style.display = isOwner ? "flex" : "none";
        });

        document.getElementById("loginScreen").style.display  = "none";
        document.getElementById("appInterface").style.display = "block";

        initData();
    } else {
        document.getElementById("loginScreen").style.display  = "flex";
        document.getElementById("appInterface").style.display = "none";
    }
});

// LOGIN
document.getElementById("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const email    = document.getElementById("loginEmail").value;
    const pass     = document.getElementById("loginPass").value;
    const btn      = document.getElementById("btnLogin");
    const errorEl  = document.getElementById("authError");

    btn.innerText = "Verificando...";
    errorEl.style.display = "none";

    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch {
        errorEl.innerText = "Acceso denegado. Revisa tu correo y contraseña.";
        errorEl.style.display = "block";
        btn.innerText = "Iniciar Sesión";
    }
};

// REGISTRO
document.getElementById("registerForm").onsubmit = async (e) => {
    e.preventDefault();
    const email   = document.getElementById("regEmail").value;
    const pass    = document.getElementById("regPass").value;
    const rol     = document.getElementById("regRol").value;
    const btn     = document.getElementById("btnReg");
    const errorEl = document.getElementById("authError");

    if (pass.length < 6) {
        errorEl.innerText = "La contraseña debe tener al menos 6 caracteres.";
        errorEl.style.display = "block";
        return;
    }

    btn.innerText = "Creando cuenta...";
    errorEl.style.display = "none";

    try {
        const result = await auth.createUserWithEmailAndPassword(email, pass);
        await db.ref(`usuarios/${result.user.uid}`).set({ email, rol });
        showToast("✅ Cuenta creada exitosamente");
    } catch (error) {
        errorEl.innerText = "Error al registrar: " + error.message;
        errorEl.style.display = "block";
        btn.innerText = "Crear Cuenta";
    }
};

function logout() {
    auth.signOut();
}

/* ─── DATOS ─── */

function initData() {
    db.ref("productos").on("value", (snapshot) => {
        const data = snapshot.val();
        productos = data
            ? Object.keys(data).map(key => ({ id: key, ...data[key] }))
            : [];
        render();
    });

    db.ref("historial").limitToLast(30).on("value", (snapshot) => {
        const data = snapshot.val();
        historial = data ? Object.values(data).reverse() : [];
        renderHistorial();
    });
}

function render() {
    const busqueda = document.getElementById("buscador").value.toLowerCase();
    const piso     = document.getElementById("filtroPiso").value;
    const isOwner  = (userRole === 'dueño');

    ["llegaron", "espera", "listos"].forEach(est => {
        document.getElementById(`estado-${est}`).innerHTML = "";
    });

    const counts = { llegaron: 0, espera: 0, listos: 0 };

    productos.forEach(p => {
        if (busqueda && !p.nombre.toLowerCase().includes(busqueda)) return;
        if (piso && p.piso !== piso) return;

        counts[p.estado]++;

        const pisoLabel = p.piso === 'piso1' ? 'Piso 1' : 'Piso 2';
        const card = document.createElement("div");
        card.className = `card card-${p.estado}`;
        card.innerHTML = `
            <div class="card-name">${p.nombre}</div>
            <div class="card-meta">
                <span>📦 ${p.cantidad} ${p.tipoCantidad}</span>
                <span>📍 ${pisoLabel}</span>
            </div>
            <div class="card-footer">${p.quien} · ${p.hora}</div>
            <div class="card-actions ${isOwner ? 'with-delete' : ''}">
                <button onclick="cambiarEstado('${p.id}','llegaron')" title="Llegaron">📥</button>
                <button onclick="cambiarEstado('${p.id}','espera')"   title="En Espera">⏳</button>
                <button onclick="cambiarEstado('${p.id}','listos')"   title="Listos">✅</button>
                ${isOwner ? `<button class="danger" onclick="borrarProducto('${p.id}')" title="Eliminar">🗑</button>` : ''}
            </div>
        `;
        document.getElementById(`estado-${p.estado}`).appendChild(card);
    });

    // Actualizar contadores (stats bar y badges de columna)
    ["llegaron", "espera", "listos"].forEach(est => {
        const n = counts[est];
        const statEl  = document.getElementById(`count-${est}`);
        const badgeEl = document.getElementById(`badge-${est}`);
        if (statEl)  statEl.innerText  = n;
        if (badgeEl) badgeEl.innerText = n;
    });
}

function renderHistorial() {
    const el = document.getElementById("historial");
    if (!historial.length) {
        el.innerHTML = `<li style="color: var(--text-muted); text-align: center; padding: 2rem;">Sin actividad reciente.</li>`;
        return;
    }
    el.innerHTML = historial.map(h => `
        <li class="historial-item">
            <span><span class="accion">${h.accion}</span> — ${h.nombre}</span>
            <small style="color: var(--text-muted);">${h.hora}</small>
        </li>
    `).join("");
}

/* ─── ACCIONES ─── */

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.style.display = "block";
    setTimeout(() => t.style.display = "none", 3000);
}

async function cambiarEstado(id, nuevoEstado) {
    const p = productos.find(x => x.id === id);
    if (!p || p.estado === nuevoEstado) return;
    await db.ref(`productos/${id}`).update({ estado: nuevoEstado });
    db.ref("historial").push({
        accion: `Movió a ${nuevoEstado}`,
        nombre: p.nombre,
        hora: new Date().toLocaleString('es-CO')
    });
    showToast(`📦 Movido a ${nuevoEstado}`);
}

async function borrarProducto(id) {
    if (userRole !== 'dueño') return;
    const p = productos.find(x => x.id === id);
    if (!p) return;
    if (confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) {
        await db.ref(`productos/${id}`).remove();
        db.ref("historial").push({
            accion: "Eliminado",
            nombre: p.nombre,
            hora: new Date().toLocaleString('es-CO')
        });
        showToast("🗑 Producto eliminado");
    }
}

document.getElementById("productForm").onsubmit = async (e) => {
    e.preventDefault();
    const nuevo = {
        nombre:       document.getElementById("nombre").value.trim(),
        quien:        document.getElementById("quien").value,
        hora:         new Date().toLocaleString('es-CO'),
        estado:       document.getElementById("estado").value,
        piso:         document.getElementById("piso").value,
        tipoCantidad: document.getElementById("tipoCantidad").value,
        cantidad:     document.getElementById("cantidad").value
    };
    await db.ref("productos").push(nuevo);
    db.ref("historial").push({ accion: "Agregado", nombre: nuevo.nombre, hora: nuevo.hora });
    showToast("✅ Producto guardado");
    e.target.reset();
    document.getElementById("quien").value = currentUser.email.split('@')[0];
    showSection('dashboardView');
};

function showSection(id) {
    document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    const map = {
        dashboardView: 0,
        addView: 1,
        historyView: 2
    };
}

function toggleVisibility(id) {
    const input = document.getElementById(id);
    input.type = input.type === "password" ? "text" : "password";
}

document.getElementById("buscador").oninput    = render;
document.getElementById("filtroPiso").onchange = render;
