// router.js — Hash-based routing y navegación del sidebar

const SECTIONS = {
    dashboard:    { id: 'dashboardSection',    label: 'Dashboard',      nav: 'nav-dashboard' },
    contratos:    { id: 'contratosSection',    label: 'Contratos',      nav: 'nav-contratos' },
    ordenes:      { id: 'ordenesSection',      label: 'Órdenes',        nav: 'nav-ordenes' },
    inventario:   { id: 'inventarioSection',   label: 'Inventario',     nav: 'nav-inventario' },
    proveedores:  { id: 'proveedoresSection',  label: 'Proveedores',    nav: 'nav-proveedores' },
    clientes:     { id: 'clientesSection',     label: 'Clientes',       nav: 'nav-clientes' },
    empleados:    { id: 'empleadosSection',    label: 'Empleados',      nav: 'nav-empleados' },
    gastos:       { id: 'gastosSection',       label: 'Gastos',         nav: 'nav-gastos' },
    cotizaciones: { id: 'cotizacionesSection', label: 'Cotizaciones',   nav: 'nav-cotizaciones' },
    productoDia:  { id: 'productoDiaSection',  label: 'Producto del Día', nav: 'nav-productoDia' },
    gemini:       { id: 'geminiSection',       label: 'Asistente IA',   nav: 'nav-gemini' },
    analiticas:   { id: 'analiticasSection',   label: 'Analíticas',     nav: 'nav-analiticas' },
    diseno:       { id: 'disenoSection',       label: 'Diseño',         nav: 'nav-diseno' },
    calendario:   { id: 'calendarioSection',   label: 'Calendario',     nav: 'nav-calendario' },
    reportes:     { id: 'reportesSection',     label: 'Reportes',       nav: 'nav-reportes' },
    notas:        { id: 'notasSection',        label: 'Notas',          nav: 'nav-notas' },
    bitacora:     { id: 'bitacoraSection',     label: 'Bitácora',       nav: 'nav-bitacora' },
    config:       { id: 'configSection',       label: 'Configuración',  nav: 'nav-config' },
    prompts:      { id: 'promptsSection',      label: 'Image Master Prompt IA',  nav: 'nav-prompts' }
};

let currentSection = 'dashboard';

function navigate(section) {
    if (!SECTIONS[section]) section = 'dashboard';
    currentSection = section;

    // Ocultar todas las secciones
    Object.values(SECTIONS).forEach(s => {
        const el = document.getElementById(s.id);
        if (el) el.classList.remove('active');
        const nav = document.getElementById(s.nav);
        if (nav) nav.classList.remove('active');
    });

    // Mostrar sección activa
    const target = SECTIONS[section];
    const sectionEl = document.getElementById(target.id);
    if (sectionEl) sectionEl.classList.add('active');

    // La sección Diseño necesita quitar padding del content-area
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        if (section === 'diseno') {
            contentArea.style.padding = '0';
            contentArea.style.maxWidth = 'none';
        } else {
            contentArea.style.padding = '';
            contentArea.style.maxWidth = '';
        }
    }

    const navEl = document.getElementById(target.nav);
    if (navEl) navEl.classList.add('active');

    // Actualizar título en topbar
    const titleEl = document.getElementById('page-title');
    if (titleEl) titleEl.textContent = target.label;

    // Actualizar hash
    window.location.hash = '#' + section;

    // Cerrar sidebar en móvil
    const sidebar = document.querySelector('.sidebar');
    if (sidebar && sidebar.classList.contains('open')) toggleSidebar();

    // Llamar hook de sección si existe
    const hookName = 'onSection_' + section;
    if (typeof window[hookName] === 'function') window[hookName]();
}

function initRouter() {
    // Bind nav items
    Object.keys(SECTIONS).forEach(key => {
        const nav = document.getElementById(SECTIONS[key].nav);
        if (nav) nav.addEventListener('click', () => navigate(key));
    });

    // Leer hash inicial
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    navigate(hash);

    // Escuchar cambios de hash
    window.addEventListener('hashchange', () => {
        const h = window.location.hash.replace('#', '');
        if (SECTIONS[h]) navigate(h);
    });
}
