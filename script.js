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

// CONFIGURACIÓN DE ROLES (Cambia esto por el correo del dueño)
const OWNER_EMAIL = "dueño@empresa.com"; 

/* ESTADO GLOBAL */
let productos = [];
let historial = [];
let currentUser = null;
let isOwner = false;

/* --- SISTEMA DE AUTENTICACIÓN --- */

// Escuchar cambios de sesión
auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        isOwner = (user.email === OWNER_EMAIL);
        
        // UI Roles
        document.getElementById("userDisplay").innerText = `Usuario: ${user.email} (${isOwner ? 'Dueño' : 'Empleado'})`;
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

// Login
document.getElementById("loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const pass = document.getElementById("loginPass").value;
    const btn = document.getElementById("btnLogin");
    const errorEl = document.getElementById("loginError");

    btn.innerText = "Entrando...";
    errorEl.style.display = "none";

    try {
        await auth.signInWithEmailAndPassword(email, pass);
    } catch (error) {
        errorEl.innerText = "Error: Correo o contraseña inválidos";
        errorEl.style.display = "block";
        btn.innerText = "Entrar al Sistema";
    }
};

// Logout
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

/* --- RENDERIZADO --- */

function render() {
    const filters = {
        busqueda: document.getElementById("buscador").value.toLowerCase(),
        piso: document.getElementById("filtroPiso").value
    };

    // Limpiar contenedores
    ["llegaron", "espera", "listos"].forEach(est => {
        document.getElementById(`estado-${est}`).innerHTML = "";
        document.getElementById(`count-${est}`).innerText = "0";
    });

    const counts = { llegaron: 0, espera: 0, listos: 0 };

    productos.forEach(p => {
        // Filtros
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
            <small>Por: ${p.quien} • ${p.hora}</small>
            
            <div class="actions">
                <button title="Mover a Llegaron" onclick="cambiarEstado('${p.id}','llegaron')">🆕</button>
                <button title="Mover a Espera" onclick="cambiarEstado('${p.id}','espera')">⏳</button>
                <button title="Mover a Listo" onclick="cambiarEstado('${p.id}','listos')">✅</button>
                ${isOwner ? `<button title="Borrar" class="danger" onclick="borrarProducto('${p.id}')">🗑</button>` : ''}
            </div>
        `;
        document.getElementById(`estado-${p.estado}`).appendChild(card);
    });

    // Actualizar contadores
    Object.keys(counts).forEach(est => {
        document.getElementById(`count-${est}`).innerText = counts[est];
    });
}

function renderHistorial() {
    const list = document.getElementById("historial");
    list.innerHTML = historial.map(h => `
        <li class="historial-item">
            <span><b>${h.accion}:</b> ${h.nombre}</span>
            <small>${h.hora}</small>
        </li>
    `).join("");
}

/* --- ACCIONES --- */

function showToast(msg) {
    const t = document.getElementById("toast");
    t.innerText = msg;
    t.style.display = "block";
    setTimeout(() => t.style.display = "none", 3000);
}

function logAccion(accion, nombre) {
    db.ref("historial").push({
        accion,
        nombre,
        hora: new Date().toLocaleString(),
        user: currentUser.email
    });
}

async function cambiarEstado(id, nuevoEstado) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    
    try {
        await db.ref(`productos/${id}`).update({ estado: nuevoEstado });
        logAccion(`Cambió a ${nuevoEstado}`, p.nombre);
        showToast("Estado actualizado");
    } catch (e) {
        showToast("Error al actualizar");
    }
}

async function borrarProducto(id) {
    if (!isOwner) return showToast("No tienes permiso");
    const p = productos.find(x => x.id === id);
    if (!p) return;

    if (confirm(`¿Seguro que quieres eliminar ${p.nombre}?`)) {
        try {
            await db.ref(`productos/${id}`).remove();
            logAccion("Eliminado", p.nombre);
            showToast("Producto eliminado");
        } catch (e) {
            showToast("Error al eliminar");
        }
    }
}

document.getElementById("productForm").onsubmit = async (e) => {
    e.preventDefault();
    if (!isOwner) return showToast("Solo el dueño puede agregar");

    const nuevo = {
        nombre: document.getElementById("nombre").value,
        quien: document.getElementById("quien").value,
        hora: new Date().toLocaleString(),
        estado: document.getElementById("estado").value,
        piso: document.getElementById("piso").value,
        tipoCantidad: document.getElementById("tipoCantidad").value,
        cantidad: document.getElementById("cantidad").value
    };

    try {
        await db.ref("productos").push(nuevo);
        logAccion("Agregado", nuevo.nombre);
        showToast("Producto guardado");
        e.target.reset();
        showSection('dashboardView');
    } catch (error) {
        showToast("Error al guardar");
    }
};

/* --- NAVEGACIÓN --- */
function showSection(id) {
    document.querySelectorAll(".content-section").forEach(s => s.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
    
    document.getElementById(id).classList.add("active");
    // Marcar item del menú (esto es una simplificación)
    const items = document.querySelectorAll(".nav-item");
    if(id === 'dashboardView') items[0].classList.add("active");
    if(id === 'addView') items[1].classList.add("active");
    if(id === 'historyView') items[2].classList.add("active");
}

document.getElementById("buscador").oninput = render;
document.getElementById("filtroPiso").onchange = render;
