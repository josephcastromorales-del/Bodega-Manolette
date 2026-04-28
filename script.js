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

/* ESTADO GLOBAL */
let productos = [];
let historial = [];
let currentUser = null;
let userRole = 'empleado'; // Por defecto

/* --- SISTEMA DE AUTENTICACIÓN --- */

// Cambiar entre Login y Registro
function toggleAuth(showRegister) {
    document.getElementById("loginFormContainer").style.display = showRegister ? "none" : "block";
    document.getElementById("registerFormContainer").style.display = showRegister ? "block" : "none";
    document.getElementById("authError").style.display = "none";
}

// Escuchar cambios de sesión
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        
        // Obtener Rol del Usuario desde la base de datos
        const roleSnap = await db.ref(`usuarios/${user.uid}/rol`).once('value');
        userRole = roleSnap.val() || 'empleado';

        // UI según el Rol
        const isOwner = (userRole === 'dueño');
        document.getElementById("userDisplay").innerText = `${user.email} (${userRole.toUpperCase()})`;
        document.querySelectorAll(".owner-only").forEach(el => el.style.display = isOwner ? "block" : "none");
        document.getElementById("quien").value = user.email.split('@')[0];

        // Cambiar pantalla
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("appInterface").style.display = "block";
        
        initData();
    } else {
        document.getElementById("loginScreen").style.display = "flex";
        document.getElementById("appInterface").style.display = "none";
    }
});

// LOGIN
document.getElementById("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPass").value;
    const btn = document.getElementById("btnLogin");
    const errorEl = document.getElementById("authError");

    btn.innerText = "Cargando...";
    errorEl.style.display = "none";

    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error) {
        errorEl.innerText = "Error: Acceso denegado. Revisa tus datos.";
        errorEl.style.display = "block";
        btn.innerText = "Entrar";
    }
};

// REGISTRO
document.getElementById("registerForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("regEmail").value;
    const pass = document.getElementById("regPass").value;
    const rol = document.getElementById("regRol").value;
    const btn = document.getElementById("btnReg");
    const errorEl = document.getElementById("authError");

    if (pass.length < 6) {
        errorEl.innerText = "La contraseña debe tener al menos 6 caracteres";
        errorEl.style.display = "block";
        return;
    }

    btn.innerText = "Creando cuenta...";
    errorEl.style.display = "none";

    try {
        const result = await auth.createUserWithEmailAndPassword(email, pass);
        // Guardar el rol en la base de datos
        await db.ref(`usuarios/${result.user.uid}`).set({
            email: email,
            rol: rol
        });
        showToast("Cuenta creada exitosamente");
    } catch (error) {
        errorEl.innerText = "Error al registrar: " + error.message;
        errorEl.style.display = "block";
        btn.innerText = "Registrarse";
    }
};

function logout() {
    auth.signOut();
}

/* --- GESTIÓN DE DATOS --- */

function initData() {
    db.ref("productos").on("value", (snapshot) => {
        const data = snapshot.val();
        productos = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
        render();
    });

    db.ref("historial").limitToLast(30).on("value", (snapshot) => {
        const data = snapshot.val();
        historial = data ? Object.values(data).reverse() : [];
        renderHistorial();
    });
}

function render() {
    const filters = {
        busqueda: document.getElementById("buscador").value.toLowerCase(),
        piso: document.getElementById("filtroPiso").value
    };

    ["llegaron", "espera", "listos"].forEach(est => {
        document.getElementById(`estado-${est}`).innerHTML = "";
        document.getElementById(`count-${est}`).innerText = "0";
    });

    const counts = { llegaron: 0, espera: 0, listos: 0 };
    const isOwner = (userRole === 'dueño');

    productos.forEach(p => {
        if (filters.busqueda && !p.nombre.toLowerCase().includes(filters.busqueda)) return;
        if (filters.piso && p.piso !== filters.piso) return;

        counts[p.estado]++;
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <b>${p.nombre}</b>
            <div style="font-size: 0.85rem; margin-bottom: 8px;">
                📦 ${p.cantidad} ${p.tipoCantidad} | 📍 ${p.piso}
            </div>
            <small>${p.quien} • ${p.hora}</small>
            <div class="actions">
                <button onclick="cambiarEstado('${p.id}','llegaron')">🆕</button>
                <button onclick="cambiarEstado('${p.id}','espera')">⏳</button>
                <button onclick="cambiarEstado('${p.id}','listos')">✅</button>
                ${isOwner ? `<button class="danger" onclick="borrarProducto('${p.id}')">🗑</button>` : ''}
            </div>
        `;
        document.getElementById(`estado-${p.estado}`).appendChild(card);
    });

    Object.keys(counts).forEach(est => {
        document.getElementById(`count-${est}`).innerText = counts[est];
    });
}

function renderHistorial() {
    document.getElementById("historial").innerHTML = historial.map(h => `
        <li class="historial-item">
            <span><b>${h.accion}:</b> ${h.nombre}</span>
            <small>${h.hora}</small>
        </li>
    `).join("");
}

/* --- ACCIONES --- */

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg; t.style.display = "block";
    setTimeout(() => t.style.display = "none", 3000);
}

async function cambiarEstado(id, nuevoEstado) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    await db.ref(`productos/${id}`).update({ estado: nuevoEstado });
    db.ref("historial").push({ accion: `Movió a ${nuevoEstado}`, nombre: p.nombre, hora: new Date().toLocaleString() });
    showToast("Estado actualizado");
}

async function borrarProducto(id) {
    if (userRole !== 'dueño') return;
    const p = productos.find(x => x.id === id);
    if (confirm(`¿Eliminar ${p.nombre}?`)) {
        await db.ref(`productos/${id}`).remove();
        db.ref("historial").push({ accion: "Eliminado", nombre: p.nombre, hora: new Date().toLocaleString() });
        showToast("Producto eliminado");
    }
}

document.getElementById("productForm").onsubmit = async (e) => {
    e.preventDefault();
    const nuevo = {
        nombre: document.getElementById("nombre").value,
        quien: document.getElementById("quien").value,
        hora: new Date().toLocaleString(),
        estado: document.getElementById("estado").value,
        piso: document.getElementById("piso").value,
        tipoCantidad: document.getElementById("tipoCantidad").value,
        cantidad: document.getElementById("cantidad").value
    };
    await db.ref("productos").push(nuevo);
    db.ref("historial").push({ accion: "Agregado", nombre: nuevo.nombre, hora: nuevo.hora });
    showToast("Guardado");
    e.target.reset();
    showSection('dashboardView');
};

function showSection(id) {
    document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function toggleVisibility(id) {
    const input = document.getElementById(id);
    input.type = input.type === "password" ? "text" : "password";
}

document.getElementById("buscador").oninput = render;
document.getElementById("filtroPiso").onchange = render;
