const firebaseConfig = {
  apiKey: "AIzaSyAE5pMe0loRrtKbKirQlG9H1rSBaoF4viQ",
  authDomain: "sistemaempresa-8b933.firebaseapp.com",
  projectId: "sistemaempresa-8b933",
  storageBucket: "sistemaempresa-8b933.firebasestorage.app",
  messagingSenderId: "992528113878",
  appId: "1:992528113878:web:324dc4f0ed9d49fcad6977",
  measurementId: "G-5RWR0JW8Y4"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const PASSWORD = "123";

/* ELEMENTOS */
const menuItems = document.querySelectorAll(".menu-item");
const contents = document.querySelectorAll(".content");
const modalPassword = document.getElementById("modalPassword");
const passwordInput = document.getElementById("passwordInput");
const passwordBtn = document.getElementById("passwordBtn");
const passwordError = document.getElementById("passwordError");
const btnAtras = document.getElementById("btnAtras");

const buscador = document.getElementById("buscador");
const filtroEstado = document.getElementById("filtroEstado");
const filtroPiso = document.getElementById("filtroPiso");

const productForm = document.getElementById("productForm");
const historialList = document.getElementById("historial");
const horaInput = document.getElementById("hora");

/* DATA */
let productos = [];
let historial = [];

/* ESCUCHAR CAMBIOS EN TIEMPO REAL */
db.ref("productos").on("value", (snapshot) => {
    const data = snapshot.val();
    productos = data ? Object.keys(data).map(key => ({ id: key, ...data[key] })) : [];
    render();
});

db.ref("historial").limitToFirst(20).on("value", (snapshot) => {
    const data = snapshot.val();
    historial = data ? Object.values(data).reverse() : [];
    renderHistorial();
});

/* MENU */
menuItems.forEach(item => {
    item.onclick = () => {
        if (item.dataset.target === "agregar") {
            modalPassword.style.display = "flex";
            return;
        }
        cambiarSeccion(item.dataset.target);
    };
});

function cambiarSeccion(id) {
    menuItems.forEach(i => i.classList.remove("active"));
    contents.forEach(c => c.classList.remove("active"));

    document.querySelector(`[data-target="${id}"]`)?.classList.add("active");
    document.getElementById(id).classList.add("active");
}

/* PASSWORD */
passwordBtn.onclick = () => {
    if (passwordInput.value === PASSWORD) {
        modalPassword.style.display = "none";
        passwordError.style.display = "none";
        passwordInput.value = "";
        cambiarSeccion("agregar");
    } else {
        passwordError.style.display = "block";
    }
};

btnAtras.onclick = () => {
    modalPassword.style.display = "none";
};

/* RENDER */
function render() {
    document.querySelectorAll(".cards").forEach(c => c.innerHTML = "");

    let lista = [...productos];

    if (buscador.value)
        lista = lista.filter(p => p.nombre.toLowerCase().includes(buscador.value.toLowerCase()));
    if (filtroEstado.value)
        lista = lista.filter(p => p.estado === filtroEstado.value);
    if (filtroPiso.value)
        lista = lista.filter(p => p.piso === filtroPiso.value);

    lista.forEach(p => {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <b>${p.nombre}</b><br>
            ${p.cantidad} ${p.tipoCantidad}<br>
            ${p.piso}<br>
            <small>${p.quien} - ${p.hora}</small>
            <div class="actions">
                <button onclick="cambiar('${p.id}','llegaron')">Llegó</button>
                <button onclick="cambiar('${p.id}','espera')">Espera</button>
                <button onclick="cambiar('${p.id}','listos')">Listo</button>
                <button class="danger" onclick="borrar('${p.id}')">🗑</button>
            </div>
        `;
        const container = document.getElementById(`estado-${p.estado}`);
        if(container) container.appendChild(card);
    });
}

function renderHistorial() {
    historialList.innerHTML = historial
        .map(h => `<li>${h.hora} — ${h.accion}: <b>${h.nombre}</b></li>`)
        .join("");
}

/* ACCIONES FIREBASE */
function log(accion, nombre) {
    db.ref("historial").push({
        accion,
        nombre,
        hora: new Date().toLocaleString()
    });
}

function cambiar(id, estado) {
    db.ref(`productos/${id}`).update({ estado: estado });
    const p = productos.find(x => x.id === id);
    if (p) log("Cambio estado", p.nombre);
}

function borrar(id) {
    const p = productos.find(x => x.id === id);
    if (p) {
        log("Eliminado", p.nombre);
        db.ref(`productos/${id}`).remove();
    }
}

/* AGREGAR */
productForm.onsubmit = e => {
    e.preventDefault();
    const ahora = new Date().toLocaleString();
    
    const nuevoProducto = {
        nombre: document.getElementById("nombre").value,
        quien: document.getElementById("quien").value,
        hora: ahora,
        estado: document.getElementById("estado").value,
        piso: document.getElementById("piso").value,
        tipoCantidad: document.getElementById("tipoCantidad").value,
        cantidad: document.getElementById("cantidad").value
    };

    db.ref("productos").push(nuevoProducto);
    log("Agregado", nuevoProducto.nombre);
    
    productForm.reset();
    cambiarSeccion("llegaron");
};

/* FILTROS */
buscador.oninput = filtroEstado.onchange = filtroPiso.onchange = render;
