// bitacora.js — Log completo de actividad del sistema
let bitacoraData = {};
let bitacoraListener = null;

function initBitacora() {
    if (bitacoraListener) return;
    bitacoraListener = db.ref('actividad').orderByChild('timestamp').limitToLast(100).on('value', snap => {
        bitacoraData = snap.val() || {};
        renderBitacora();
    }, err => console.warn('[Bitacora]', err.message));
}

function renderBitacora() {
    const tbody = document.getElementById('bitacora-table-body');
    if (!tbody) return;
    const filtroModulo = document.getElementById('bitacora-modulo')?.value || '';
    let entries = Object.entries(bitacoraData).map(([id, a]) => ({ id, ...a }));
    if (filtroModulo) entries = entries.filter(a => (a.tipo || '').includes(filtroModulo) || (a.entidadTipo || '').includes(filtroModulo));
    entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state" style="padding:2rem;text-align:center">Sin actividad registrada</td></tr>';
        return;
    }
    tbody.innerHTML = entries.slice(0, 80).map(a => {
        const modulo = a.tipo || a.entidadTipo || '—';
        const moduloBadge = modulo.includes('contrato') ? 'badge-blue' : modulo.includes('orden') ? 'badge-green' : modulo.includes('gasto') ? 'badge-amber' : 'badge-gray';
        return `<tr>
            <td class="mono" style="font-size:var(--fz-xs);white-space:nowrap">${a.timestamp ? formatDateTime(a.timestamp) : '—'}</td>
            <td style="font-size:var(--fz-xs);color:var(--text-secondary)">${escHtml(a.userEmail || a.usuario || 'Sistema')}</td>
            <td><span class="badge ${moduleBadge}">${escHtml(modulo)}</span></td>
            <td style="color:var(--text-primary)">${escHtml(a.descripcion || a.accion || '—')}</td>
            <td style="font-size:var(--fz-xs);color:var(--text-tertiary)">${escHtml(a.entidadId || a.detalle || '')}</td>
        </tr>`;
    }).join('');
}

// Funcion global para registrar actividad desde cualquier seccion
function registrarActividad(tipo, accion, datos = {}) {
    try {
        db.ref('actividad').push({
            tipo, accion, ...datos,
            usuario: window.userEmail || '',
            timestamp: Date.now()
        });
    } catch (e) { console.warn('[Bitacora] Error registrando:', e.message); }
}

window.onSection_bitacora = initBitacora;
window.registrarActividad = registrarActividad;
