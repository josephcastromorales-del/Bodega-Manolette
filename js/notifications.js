// notifications.js — Sistema de notificaciones en tiempo real

let _notifData = { contratos: [], ordenes: [], inventario: [] };
let _notifOpen = false;
let _dismissedNotifs = JSON.parse(localStorage.getItem('manolette_dismissed_notifs') || '[]');

function _saveDismissed() {
    localStorage.setItem('manolette_dismissed_notifs', JSON.stringify(_dismissedNotifs));
}

function borrarNotificacion(type, id, event) {
    if (event) event.stopPropagation();
    const key = `${type}-${id}`;
    if (!_dismissedNotifs.includes(key)) {
        _dismissedNotifs.push(key);
        _saveDismissed();
        _updateNotifBadge();
    }
}

function borrarTodasNotificaciones() {
    const items = _getUrgentItems(true);
    items.forEach(item => {
        const key = `${item.type}-${item.id}`;
        if (!_dismissedNotifs.includes(key)) _dismissedNotifs.push(key);
    });
    _saveDismissed();
    _updateNotifBadge();
}

function initNotifications() {
    const _nErr = err => console.warn('[Notif]', err.message);
    db.ref('contratos').on('value', snap => {
        const d = snap.val() || {};
        _notifData.contratos = Object.entries(d).map(([id, c]) => ({ id, ...c }));
        _updateNotifBadge();
    }, _nErr);
    db.ref('ordenes').on('value', snap => {
        const d = snap.val() || {};
        _notifData.ordenes = Object.entries(d).map(([id, o]) => ({ id, ...o }));
        _updateNotifBadge();
    }, _nErr);
    db.ref('inventario').on('value', snap => {
        const d = snap.val() || {};
        _notifData.inventario = Object.entries(d).map(([id, item]) => ({ id, ...item }));
        _updateNotifBadge();
    }, _nErr);

    document.addEventListener('click', e => {
        if (!e.target.closest('#notif-btn') && !e.target.closest('#notif-dropdown')) {
            _closeNotifDropdown();
        }
    });

    // Offline/online detection
    const banner = document.getElementById('offline-banner');
    function setOnline(online) {
        if (banner) banner.style.display = online ? 'none' : 'flex';
    }
    window.addEventListener('online',  () => setOnline(true));
    window.addEventListener('offline', () => setOnline(false));
    setOnline(navigator.onLine);
}

function _getUrgentItems(includeDismissed = false) {
    const items = [];
    const isDismissed = (type, id) => !includeDismissed && _dismissedNotifs.includes(`${type}-${id}`);

    _notifData.contratos.forEach(c => {
        if (isDismissed('contrato', c.id)) return;
        if (c.estado === 'completado' || c.estado === 'cancelado') return;
        const days = daysUntil(c.fechaLimite);
        if (days !== null && days <= 5) {
            items.push({
                id: c.id,
                type: 'contrato',
                title: `Contrato ${c.numero || '—'}`,
                subtitle: days < 0 ? `Vencido hace ${Math.abs(days)}d` : days === 0 ? 'Vence HOY' : `Vence en ${days}d`,
                urgent: days <= 1,
                section: 'contratos'
            });
        }
    });

    _notifData.ordenes.forEach(o => {
        if (isDismissed('orden', o.id)) return;
        if (o.estado === 'enviado') return;
        const days = daysUntil(o.fechaLimite);
        if (days !== null && days <= 3) {
            items.push({
                id: o.id,
                type: 'orden',
                title: `${o.numero || o.nombreProducto || '—'}`,
                subtitle: days < 0 ? `Vencida hace ${Math.abs(days)}d` : days === 0 ? 'Vence HOY' : `Vence en ${days}d`,
                urgent: days <= 0,
                section: 'ordenes'
            });
        }
    });

    _notifData.inventario.forEach(item => {
        if (isDismissed('stock', item.id)) return;
        const stock = Number(item.stockActual || 0);
        const min   = Number(item.stockMinimo || 0);
        if (min > 0 && stock <= min) {
            items.push({
                id: item.id,
                type: 'stock',
                title: item.nombre || '—',
                subtitle: stock === 0 ? 'Sin stock disponible' : `Stock bajo: ${stock} / mín ${min}`,
                urgent: stock === 0,
                section: 'inventario'
            });
        }
    });

    return items.sort((a, b) => b.urgent - a.urgent);
}

function _updateNotifBadge() {
    const items  = _getUrgentItems();
    const badge  = document.getElementById('notif-badge');
    const btn    = document.getElementById('notif-btn');
    if (!badge || !btn) return;

    if (items.length > 0) {
        badge.textContent = items.length > 9 ? '9+' : items.length;
        badge.style.display = 'flex';
        btn.classList.toggle('notif-urgent-pulse', items.some(i => i.urgent));
    } else {
        badge.style.display = 'none';
        btn.classList.remove('notif-urgent-pulse');
    }
    if (_notifOpen) _renderNotifList();
}

function toggleNotifDropdown() {
    _notifOpen = !_notifOpen;
    const dd = document.getElementById('notif-dropdown');
    if (!dd) return;
    if (_notifOpen) { _renderNotifList(); dd.classList.add('open'); }
    else            { dd.classList.remove('open'); }
}

function _closeNotifDropdown() {
    _notifOpen = false;
    const dd = document.getElementById('notif-dropdown');
    if (dd) dd.classList.remove('open');
}

function _renderNotifList() {
    const list  = document.getElementById('notif-list');
    if (!list) return;
    const items = _getUrgentItems();

    if (items.length === 0) {
        list.innerHTML = `<div class="notif-empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36" height="36"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <p>Todo en orden</p>
        </div>`;
        return;
    }

    const iconMap = {
        contrato: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 10h8M8 14h5"/></svg>`,
        orden:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4Z"/></svg>`,
        stock:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/></svg>`
    };

    list.innerHTML = items.map(item => `
        <div class="notif-item ${item.urgent ? 'notif-item-urgent' : ''}"
             onclick="navigate('${item.section}');_closeNotifDropdown()">
            <div class="notif-item-icon notif-type-${item.type}">${iconMap[item.type] || ''}</div>
            <div class="notif-item-body">
                <div class="notif-item-title">${escHtml(item.title)}</div>
                <div class="notif-item-sub">${escHtml(item.subtitle)}</div>
            </div>
            <div class="notif-item-actions">
                ${item.urgent ? `<div class="notif-item-dot-red"></div>` : ''}
                <button class="notif-item-del" onclick="borrarNotificacion('${item.type}','${item.id}', event)" title="Borrar notificación">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
            </div>
        </div>`).join('');
}
