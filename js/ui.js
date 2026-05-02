// ui.js — Toast, Modal, Drawer, Sidebar, Utilidades

/* ── Toast ── */
function showToast(message, type = 'success') {
    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
        error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>',
        warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 22h16a2 2 0 0 0 1.73-4Z"/><path d="M12 9v4M12 17h.01"/></svg>',
        info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>'
    };
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icons[type] || icons.info}${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'none';
        toast.style.opacity = '0';
        toast.style.transition = '0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

/* ── Modal ── */
function openModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.add('open');
    document.body.style.overflow = 'hidden';
    el.addEventListener('click', function handler(e) {
        if (e.target === el) { closeModal(id); el.removeEventListener('click', handler); }
    });
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.remove('open');
    document.body.style.overflow = '';
}

/* ── Drawer ── */
function openDrawer(id) {
    const overlay = document.getElementById(id + '-overlay');
    const drawer  = document.getElementById(id);
    if (overlay) overlay.classList.add('open');
    if (drawer)  drawer.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDrawer(id) {
    const overlay = document.getElementById(id + '-overlay');
    const drawer  = document.getElementById(id);
    if (overlay) overlay.classList.remove('open');
    if (drawer)  drawer.classList.remove('open');
    document.body.style.overflow = '';
}

/* ── Sidebar (mobile) ── */
function toggleSidebar() {
    const sidebar  = document.querySelector('.sidebar');
    const overlay  = document.querySelector('.sidebar-overlay');
    const isOpen   = sidebar.classList.contains('open');
    if (isOpen) {
        sidebar.classList.remove('open');
        overlay.classList.remove('open');
        document.body.style.overflow = '';
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

/* ── Confirm Dialog ── */
function confirmDialog(message, subtitle = '') {
    return new Promise(resolve => {
        let box = document.getElementById('confirm-overlay');
        if (!box) {
            box = document.createElement('div');
            box.id = 'confirm-overlay';
            box.className = 'confirm-overlay';
            box.innerHTML = `
                <div class="confirm-box">
                    <h3 id="confirm-title">¿Confirmar acción?</h3>
                    <p id="confirm-subtitle"></p>
                    <div class="confirm-actions">
                        <button class="btn btn-secondary" id="confirm-cancel">Cancelar</button>
                        <button class="btn btn-danger"    id="confirm-ok">Confirmar</button>
                    </div>
                </div>`;
            document.body.appendChild(box);
        }
        document.getElementById('confirm-title').textContent    = message;
        document.getElementById('confirm-subtitle').textContent = subtitle;
        box.classList.add('open');

        const ok     = document.getElementById('confirm-ok');
        const cancel = document.getElementById('confirm-cancel');

        function cleanup() { box.classList.remove('open'); ok.replaceWith(ok.cloneNode(true)); cancel.replaceWith(cancel.cloneNode(true)); }
        document.getElementById('confirm-ok').onclick     = () => { cleanup(); resolve(true); };
        document.getElementById('confirm-cancel').onclick = () => { cleanup(); resolve(false); };
    });
}

/* ── Input Dialog ── */
function inputDialog(title, placeholder = '') {
    return new Promise(resolve => {
        let box = document.getElementById('input-dialog-overlay');
        if (!box) {
            box = document.createElement('div');
            box.id = 'input-dialog-overlay';
            box.className = 'confirm-overlay';
            box.innerHTML = `
                <div class="confirm-box" style="max-width:400px">
                    <h3 id="input-dialog-title" style="margin-bottom:1rem"></h3>
                    <input type="text" id="input-dialog-field" class="form-input" style="margin-bottom:1.5rem">
                    <div class="confirm-actions">
                        <button class="btn btn-secondary" id="input-dialog-cancel">Cancelar</button>
                        <button class="btn btn-primary"   id="input-dialog-ok">Continuar</button>
                    </div>
                </div>`;
            document.body.appendChild(box);
        }
        document.getElementById('input-dialog-title').textContent = title;
        const field = document.getElementById('input-dialog-field');
        field.value = '';
        field.placeholder = placeholder;
        box.classList.add('open');
        setTimeout(() => field.focus(), 100);

        const ok     = document.getElementById('input-dialog-ok');
        const cancel = document.getElementById('input-dialog-cancel');

        function cleanup() { box.classList.remove('open'); ok.replaceWith(ok.cloneNode(true)); cancel.replaceWith(cancel.cloneNode(true)); }
        document.getElementById('input-dialog-ok').onclick     = () => { resolve(field.value); cleanup(); };
        document.getElementById('input-dialog-cancel').onclick = () => { resolve(null); cleanup(); };
        field.onkeydown = (e) => { if(e.key === 'Enter') { resolve(field.value); cleanup(); } if(e.key === 'Escape') { resolve(null); cleanup(); } };
    });
}

/* ── Date Utilities ── */
function formatDate(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(ts) {
    if (!ts) return '—';
    return new Date(ts).toLocaleString('es-CO', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function daysUntil(ts) {
    if (!ts) return null;
    const now  = new Date(); now.setHours(0,0,0,0);
    const then = new Date(ts); then.setHours(0,0,0,0);
    return Math.round((then - now) / 86400000);
}

function deadlineBadge(ts) {
    const days = daysUntil(ts);
    if (days === null) return '';
    if (days < 0)  return `<span class="badge badge-red">Vencido hace ${Math.abs(days)}d</span>`;
    if (days === 0)return `<span class="badge badge-red">Vence hoy</span>`;
    if (days <= 3) return `<span class="badge badge-amber">${days}d restantes</span>`;
    if (days <= 7) return `<span class="badge badge-amber">${days}d restantes</span>`;
    return `<span class="badge badge-green">${days}d restantes</span>`;
}

/* ── User Avatar Initial ── */
function getInitial(email) {
    return (email || '?').charAt(0).toUpperCase();
}

/* ── Escape HTML ── */
function escHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

/* ── Generate ID ── */
function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}
