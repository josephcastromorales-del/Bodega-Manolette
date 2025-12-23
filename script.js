// script.js

// Importaciones de Firebase y tu archivo de configuración
import { productosRef, historialRef } from "./firebase-config.js";
import {
    addDoc,
    onSnapshot,
    doc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    getDocs // Necesario para clearHistorial
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const PASSWORD = "12345678";

// =====================
// ESTADO GLOBAL
// Estos arrays serán poblados y actualizados por los listeners de Firebase
// =====================
let productos = [];
let historial = [];
let searchIndex = {}; // Índice para búsqueda optimizada

// ==========================================
// ESCUCHA EN TIEMPO REAL PARA PRODUCTOS
// Se activa cada vez que hay un cambio en la colección 'productos'
// ==========================================
onSnapshot(query(productosRef, orderBy("timestamp", "desc")), (snapshot) => {
    productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Productos actualizados desde Firebase:", productos);

    // Reconstruye el índice y renderiza con los datos actualizados
    construirIndice();
    renderProductos();
    renderDashboard();
});

// ==========================================
// ESCUCHA EN TIEMPO REAL PARA HISTORIAL
// Se activa cada vez que hay un cambio en la colección 'historial'
// ==========================================
onSnapshot(query(historialRef, orderBy("timestamp", "desc")), (snapshot) => {
    historial = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log("Historial actualizado desde Firebase:", historial);

    // Limitar historial a los últimos 100 registros en el front-end si es necesario
    // (en Firebase puedes configurar reglas o Cloud Functions para limpiar en el backend)
    if (historial.length > 100) historial = historial.slice(0, 100);
    renderHistorial();
});


// =====================
// NAVEGACIÓN
// =====================
function cambiarSeccion(target) {
    console.log("cambiarSeccion llamado con target:", target); 

    document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(section => section.classList.remove('active'));
   
    const targetMenuItem = document.querySelector(`[data-target="${target}"]`);
    const targetContentSection = document.getElementById(target);

    if (targetMenuItem) {
        targetMenuItem.classList.add('active');
    } else {
        console.warn(`Elemento de menú con data-target="${target}" no encontrado.`); 
    }

    if (targetContentSection) {
        targetContentSection.classList.add('active');
    } else {
        console.warn(`Sección de contenido con id="${target}" no encontrado.`); 
    }
   
    if (target === 'dashboard') renderDashboard();
}

document.querySelectorAll('.menu-item').forEach(item => {
    item.onclick = () => {
        const target = item.dataset.target;
        console.log("Click en item de menú, target:", target); 
        if (target === 'agregar') {
            document.getElementById('modalPassword').classList.add('active');
            console.log("Intentando abrir modal de contraseña."); 
        } else {
            cambiarSeccion(target);
        }
    };
});

// =====================
// MODAL DE CONTRASEÑA
// =====================
function closePasswordModal() {
    console.log("closePasswordModal llamado."); 
    document.getElementById('modalPassword').classList.remove('active');
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordError').style.display = 'none';
}
// Exportar la función closePasswordModal para que sea global
window.closePasswordModal = closePasswordModal; // <--- ¡CAMBIO AQUÍ!


function checkPassword() {
    console.log("checkPassword llamado."); 
    const input = document.getElementById('passwordInput');
    if (!input) { 
        console.error("Input de contraseña (#passwordInput) no encontrado.");
        return;
    }
    console.log("Valor ingresado en passwordInput:", input.value); 

    if (input.value === PASSWORD) {
        console.log("Contraseña correcta."); 
        closePasswordModal();
        cambiarSeccion('agregar'); // Esto debería cambiar a la sección de agregar producto
    } else {
        console.log("Contraseña incorrecta."); 
        const passwordError = document.getElementById('passwordError');
        if (passwordError) { 
            passwordError.style.display = 'block';
        } else {
            console.error("Elemento de error de contraseña (#passwordError) no encontrado.");
        }
    }
}
// Exportar la función checkPassword para que sea global
window.checkPassword = checkPassword; // <--- ¡CAMBIO AQUÍ!


// =====================
// ALGORITMO DE BÚSQUEDA CON ÍNDICE INVERTIDO
// Se construye con los datos que provienen de Firebase
// =====================
function construirIndice() {
    searchIndex = {};
    productos.forEach((producto, idx) => {
        const palabras = producto.nombre.toLowerCase().split(' ');
        palabras.forEach(palabra => {
            if (!searchIndex[palabra]) searchIndex[palabra] = [];
            searchIndex[palabra].push(idx);
        });
    });
}

function buscarConIndice(query) {
    if (!query) return productos;
   
    const palabras = query.toLowerCase().split(' ').filter(p => p.length > 0);
    if (palabras.length === 0) return productos;
   
    let resultados = new Set();
    palabras.forEach((palabra, i) => {
        const matches = new Set();
        Object.keys(searchIndex).forEach(key => {
            if (key.includes(palabra)) {
                searchIndex[key].forEach(idx => matches.add(idx));
            }
        });
       
        if (i === 0) {
            resultados = matches;
        } else {
            resultados = new Set([...resultados].filter(x => matches.has(x)));
        }
    });
   
    return [...resultados].map(idx => productos[idx]);
}

// =====================
// ALGORITMO DE ORDENAMIENTO OPTIMIZADO
// Ajustado para manejar Timestamps de Firebase
// =====================
function ordenarProductos(lista, criterio) {
    if (lista.length <= 1) return lista;
   
    const sorted = [...lista];
   
    switch(criterio) {
        case 'fecha':
            return sorted.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0));
        case 'nombre':
            return sorted.sort((a, b) => a.nombre.localeCompare(b.nombre));
        case 'cantidad':
            return sorted.sort((a, b) => b.cantidad - a.cantidad);
        case 'prioridad':
            const prioridades = { espera: 3, llegaron: 2, listos: 1 };
            return sorted.sort((a, b) => {
                const diffPrioridad = prioridades[b.estado] - prioridades[a.estado];
                if (diffPrioridad !== 0) return diffPrioridad;
                return (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0);
            });
        default:
            return sorted;
    }
}

// =====================
// FILTRADO Y BÚSQUEDA
// =====================
function filtrarProductos() {
    const busqueda = document.getElementById('buscador').value;
    const estado = document.getElementById('filtroEstado').value;
    const piso = document.getElementById('filtroPiso').value;
    const ordenamiento = document.getElementById('sortBy').value;
   
    let lista = busqueda ? buscarConIndice(busqueda) : [...productos];
   
    if (estado) lista = lista.filter(p => p.estado === estado);
    if (piso) lista = lista.filter(p => p.piso === piso);
   
    return ordenarProductos(lista, ordenamiento);
}

// =====================
// ALGORITMO DE DETECCIÓN DE ALERTAS
// Ajustado para manejar Timestamps de Firebase
// =====================
function calcularPrioridad(producto) {
    const ahora = new Date();
    // Usa .toDate() para convertir el Timestamp de Firebase a objeto Date
    const creacion = producto.timestamp ? producto.timestamp.toDate() : new Date();
    const horasEspera = (ahora - creacion) / (1000 * 60 * 60);
   
    if (producto.estado === 'espera' && horasEspera > 24) return '🚨 Urgente';
    if (producto.estado === 'espera' && horasEspera > 12) return '⚠️ Atención';
    return null;
}

// =====================
// RENDERIZAR PRODUCTOS
// =====================
function renderProductos() {
    const lista = filtrarProductos();
   
    ['llegaron', 'espera', 'listos', 'enviados'].forEach(estado => {
        const container = document.getElementById(`cards${estado.charAt(0).toUpperCase() + estado.slice(1)}`);
        const filtrados = lista.filter(p => p.estado === estado);
       
        document.getElementById(`badge${estado.charAt(0).toUpperCase() + estado.slice(1)}`).textContent = filtrados.length;
       
        if (filtrados.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><p>No hay productos en esta categoría</p></div>';
            return;
        }
       
        container.innerHTML = filtrados.map(p => {
            const alerta = calcularPrioridad(p);
            // Convierte fechaEnvio de Firebase Timestamp a Date para calcularTiempoEnviado
            const fechaEnvioDate = p.fechaEnvio ? p.fechaEnvio.toDate() : null;
            const tiempoEnviado = (estado === 'enviados' && fechaEnvioDate) ? calcularTiempoEnviado(fechaEnvioDate) : null;
           
            return `
                <div class="product-card">
                    <div class="product-header">
                        <div class="product-name">${p.nombre}</div>
                        ${alerta ? `<span class="alert-badge">${alerta}</span>` : ''}
                    </div>
                    <div class="product-info">
                        <div>📦 <strong>${p.cantidad}</strong> ${p.tipoCantidad}</div>
                        <div>🏢 <strong>${p.piso === 'piso1' ? 'Piso 1' : 'Piso 2'}</strong></div>
                        <div>👤 Recibió: <strong>${p.quien}</strong></div>
                        <div>🕐 ${formatearFecha(p.timestamp ? p.timestamp.toDate() : new Date())}</div>
                        ${tiempoEnviado ? `<div style="margin-top: 10px; padding: 8px; background: #f5f5f5; border-radius: 6px; font-weight: bold;">🚚 Enviado: ${tiempoEnviado}</div>` : ''}
                    </div>
                    <div class="product-actions">
                        ${p.estado !== 'llegaron' ? `<button class="btn btn-success" onclick="cambiarEstado('${p.id}', 'llegaron')">✅ Llegó</button>` : ''}
                        ${p.estado !== 'espera' ? `<button class="btn btn-warning" onclick="cambiarEstado('${p.id}', 'espera')">⏳ Espera</button>` : ''}
                        ${p.estado !== 'listos' ? `<button class="btn btn-primary" onclick="cambiarEstado('${p.id}', 'listos')">🎁 Listo</button>` : ''}
                        ${p.estado !== 'enviados' ? `<button class="btn btn-enviar" onclick="cambiarEstado('${p.id}', 'enviados')">🚚 Enviar</button>` : ''}
                        <button class="btn btn-danger" onclick="eliminarProducto('${p.id}')">🗑️</button>
                    </div>
                </div>
            `;
        }).join('');
    });
}

// =====================
// DASHBOARD CON ESTADÍSTICAS
// =====================
function renderDashboard() {
    const stats = calcularEstadisticas();
   
    const statsHTML = `
        <div class="stat-card">
            <div class="stat-number">${stats.total}</div>
            <div class="stat-label">Total Productos</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.llegaron}</div>
            <div class="stat-label">✅ Llegaron</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.espera}</div>
            <div class="stat-label">⏳ En Espera</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.listos}</div>
            <div class="stat-label">🎁 Listos</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.enviados}</div>
            <div class="stat-label">🚚 Enviados</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.piso1}</div>
            <div class="stat-label">Piso 1</div>
        </div>
        <div class="stat-card">
            <div class="stat-number">${stats.piso2}</div>
            <div class="stat-label">Piso 2</div>
        </div>
    `;
   
    document.getElementById('statsGrid').innerHTML = statsHTML;
   
    const urgentes = productos.filter(p => {
        const alerta = calcularPrioridad(p);
        return alerta && alerta.includes('🚨');
    });
   
    const alertasHTML = urgentes.length > 0 ? `
        <div style="background: white; padding: 20px; border-radius: 12px; margin-top: 20px; border-left: 4px solid #f44336;">
            <h3 style="color: #f44336; margin-bottom: 15px;">🚨 Productos urgentes (más de 24h en espera)</h3>
            ${urgentes.map(p => `
                <div style="padding: 10px; background: #fff5f5; margin-bottom: 8px; border-radius: 6px;">
                    <strong>${p.nombre}</strong> - ${p.piso === 'piso1' ? 'Piso 1' : 'Piso 2'} - Recibió: ${p.quien}
                </div>
            `).join('')}
        </div>
    ` : '';
   
    document.getElementById('alertasContainer').innerHTML = alertasHTML;
}

function calcularEstadisticas() {
    return {
        total: productos.length,
        llegaron: productos.filter(p => p.estado === 'llegaron').length,
        espera: productos.filter(p => p.estado === 'espera').length,
        listos: productos.filter(p => p.estado === 'listos').length,
        enviados: productos.filter(p => p.estado === 'enviados').length,
        piso1: productos.filter(p => p.piso === 'piso1').length,
        piso2: productos.filter(p => p.piso === 'piso2').length
    };
}

// =====================
// HISTORIAL (Integrado con Firestore)
// =====================
async function agregarHistorial(accion, producto) {
    const historialItem = {
        accion,
        producto: producto.nombre,
        quien: producto.quien,
        timestamp: serverTimestamp() // Usa el timestamp del servidor de Firebase
    };
    await addDoc(historialRef, historialItem);
    // El onSnapshot se encargará de actualizar el array 'historial' y renderizar
}

function renderHistorial() {
    const container = document.getElementById('historialList');
   
    if (historial.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📋</div><p>No hay movimientos registrados</p></div>';
        return;
    }
   
    container.innerHTML = historial.map(h => `
        <li class="historial-item">
            <div class="time">${formatearFecha(h.timestamp ? h.timestamp.toDate() : new Date())}</div> 
            <div class="action">${h.accion}: <strong>${h.producto}</strong></div>
            <div style="color: #999; font-size: 12px;">Por: ${h.quien}</div>
        </li>
    `).join('');
}

async function clearHistorial() {
    if (confirm('¿Seguro que deseas limpiar todo el historial?')) {
        // Obtener todos los documentos de la colección de historial
        const allHistorialDocs = await getDocs(historialRef);
        // Eliminar cada documento
        const deletePromises = allHistorialDocs.docs.map(d => deleteDoc(doc(historialRef, d.id)));
        await Promise.all(deletePromises); // Esperar a que todas las eliminaciones se completen
        // El onSnapshot se encargará de actualizar el array 'historial' y renderizar
        mostrarNotificacion('🗑️ Historial limpiado exitosamente');
    }
}
// Exportar la función clearHistorial para que sea global (si tienes un botón en HTML)
window.clearHistorial = clearHistorial; // <--- ¡CAMBIO AQUÍ!


// =====================
// ACCIONES DE PRODUCTOS (Integrado con Firestore)
// =====================
const accionesEstados = { // <--- Definición global sugerida en la respuesta anterior
    llegaron: '✅ Producto llegó',
    espera: '⏳ Producto en espera',
    listos: '🎁 Producto listo',
    enviados: '🚚 Producto enviado'
};

async function cambiarEstado(id, nuevoEstado) {
    const producto = productos.find(p => p.id === id);
    if (!producto) return;
   
    const productoDocRef = doc(productosRef, id); // Referencia al documento específico
    const estadoAnterior = producto.estado;

    let updateData = {
        estado: nuevoEstado,
        timestamp: serverTimestamp() // Actualiza el timestamp del producto a la fecha del servidor
    };
   
    if (nuevoEstado === 'enviados' && !producto.fechaEnvio) {
        updateData.fechaEnvio = serverTimestamp(); // Registra fecha de envío solo si no existe
    } else if (estadoAnterior === 'enviados' && nuevoEstado !== 'enviados') {
        updateData.fechaEnvio = null; // Elimina la fecha de envío si el estado cambia de 'enviados'
    }
   
    await updateDoc(productoDocRef, updateData); // Actualiza el documento en Firestore
   
    agregarHistorial(accionesEstados[nuevoEstado], producto); // Usa el objeto de acciones
    // El onSnapshot se encargará de actualizar la UI
}
// Exportar la función cambiarEstado para que sea global (si tienes botones en HTML)
window.cambiarEstado = cambiarEstado; // <--- ¡CAMBIO AQUÍ!


async function eliminarProducto(id) {
    const producto = productos.find(p => p.id === id);
    if (!confirm(`¿Eliminar "${producto.nombre}"?`)) return;
   
    const productoDocRef = doc(productosRef, id);
    await deleteDoc(productoDocRef); // Elimina el documento de Firestore
   
    agregarHistorial('🗑️ Producto eliminado', producto);
    // El onSnapshot se encargará de actualizar la UI
}
// Exportar la función eliminarProducto para que sea global (si tienes botones en HTML)
window.eliminarProducto = eliminarProducto; // <--- ¡CAMBIO AQUÍ!


// =====================
// FORMULARIO CON NAVEGACIÓN AUTOMÁTICA (Integrado con Firestore)
// =====================
document.getElementById('productForm').onsubmit = async (e) => {
    e.preventDefault();
   
    const estadoSeleccionado = document.getElementById('estado').value;
   
    const nuevoProducto = {
        nombre: document.getElementById('nombre').value,
        quien: document.getElementById('quien').value,
        estado: estadoSeleccionado,
        piso: document.getElementById('piso').value,
        cantidad: parseInt(document.getElementById('cantidad').value),
        tipoCantidad: document.getElementById('tipoCantidad').value,
        timestamp: serverTimestamp() // Usa el timestamp del servidor de Firebase para la creación
    };
   
    await addDoc(productosRef, nuevoProducto); // Agrega el producto a Firestore
   
    agregarHistorial('➕ Producto agregado', nuevoProducto);
   
    // Limpiar filtros para ver el producto recién agregado (opcional, Firebase ya lo mostrará)
    document.getElementById('buscador').value = '';
    document.getElementById('filtroEstado').value = '';
    document.getElementById('filtroPiso').value = '';
   
    document.getElementById('productForm').reset();
   
    mostrarNotificacion('✅ Producto agregado exitosamente');
   
    setTimeout(() => {
        cambiarSeccion(estadoSeleccionado);
    }, 300);
};

// =====================
// NOTIFICACIÓN DE ÉXITO
// =====================
function mostrarNotificacion(mensaje) {
    const notificacion = document.createElement('div');
    notificacion.className = 'success-notification';
    notificacion.textContent = mensaje;
    document.body.appendChild(notificacion);
   
    setTimeout(() => {
        notificacion.remove();
    }, 3000);
}

// =====================
// UTILIDADES (Ajustadas para manejar objetos Date, ya convertidos de Firebase Timestamp)
// =====================
function calcularTiempoEnviado(dateSent) { // Recibe un objeto Date
    if (!dateSent) return 'Fecha no registrada';
   
    const ahora = new Date();
    const diff = ahora - dateSent;
   
    const minutos = Math.floor(diff / (1000 * 60));
    const horas = Math.floor(diff / (1000 * 60 * 60));
    const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
   
    if (minutos < 1) return 'Hace menos de 1 minuto';
    if (minutos < 60) return `Hace ${minutos} minuto${minutos > 1 ? 's' : ''}`;
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
    if (dias < 7) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
   
    const semanas = Math.floor(dias / 7);
    return `Hace ${semanas} semana${semanas > 1 ? 's' : ''}`;
}

function formatearFecha(date) { // Recibe un objeto Date directamente
    const ahora = new Date();
    const diff = ahora - date;
    const horas = Math.floor(diff / (1000 * 60 * 60));
   
    if (horas < 1) return 'Hace menos de 1 hora';
    if (horas < 24) return `Hace ${horas} hora${horas > 1 ? 's' : ''}`;
   
    const dias = Math.floor(horas / 24);
    if (dias < 7) return `Hace ${dias} día${dias > 1 ? 's' : ''}`;
   
    return date.toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// =====================
// EVENT LISTENERS PARA FILTROS
// =====================
document.getElementById('buscador').oninput = renderProductos;
document.getElementById('filtroEstado').onchange = renderProductos;
document.getElementById('filtroPiso').onchange = renderProductos;
document.getElementById('sortBy').onchange = renderProductos;

// =====================
// INICIALIZACIÓN
// Los onSnapshot se encargan de la carga inicial y las actualizaciones
// =====================


// =====================
// LÓGICA DE MENÚ MÓVIL
// =====================
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('sidebarOverlay');

if (menuToggle && sidebar && overlay) { 
    function toggleMenu() {
        console.log("toggleMenu llamado."); 
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    menuToggle.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', toggleMenu);

    const originalCambiarSeccion = cambiarSeccion;
    cambiarSeccion = function(target) {
        originalCambiarSeccion(target);
        if (window.innerWidth <= 500) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
            console.log("Menú móvil cerrado después de cambiar sección."); 
        }
    };
} else {
    console.warn("Elementos de menú móvil (menuToggle, sidebar, overlay) no encontrados, la lógica móvil no se aplicará."); 
}
