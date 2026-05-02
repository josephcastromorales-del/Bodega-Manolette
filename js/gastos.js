// gastos.js — Registro de gastos operativos
let gastosData = {};
let gastosListener = null;
const CATEGORIAS_GASTO = ['Transporte','Materiales','Servicios','Nomina','Alimentacion','Arriendo','Marketing','Otros'];

function initGastos() {
    if (gastosListener) return;
    gastosListener = db.ref('gastos').on('value', snap => {
        gastosData = snap.val() || {};
        renderGastos();
    }, err => console.warn('[Gastos]', err.message));
}

function renderGastos() {
    const tbody = document.getElementById('gastos-table-body');
    if (!tbody) return;
    const entries = Object.entries(gastosData).map(([id, g]) => ({ id, ...g })).sort((a, b) => (b.fecha || 0) - (a.fecha || 0));
    const mesActual = new Date().getMonth();
    const totalMes = entries.filter(g => new Date(g.fecha).getMonth() === mesActual).reduce((s, g) => s + Number(g.monto || 0), 0);
    const totalGeneral = entries.reduce((s, g) => s + Number(g.monto || 0), 0);
    document.getElementById('gastos-total-mes').textContent = '$' + totalMes.toLocaleString('es-CO');
    document.getElementById('gastos-total-general').textContent = '$' + totalGeneral.toLocaleString('es-CO');
    document.getElementById('gastos-count').textContent = entries.length;
    if (entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state" style="padding:2rem">Sin gastos registrados</td></tr>';
        return;
    }
    tbody.innerHTML = entries.slice(0, 50).map(g => {
        const catColor = g.categoria === 'Transporte' ? 'badge-blue' : g.categoria === 'Materiales' ? 'badge-amber' : g.categoria === 'Nomina' ? 'badge-purple' : 'badge-gray';
        return `<tr>
            <td class="mono">${g.fecha ? new Date(g.fecha).toLocaleDateString('es-CO') : '—'}</td>
            <td>${escHtml(g.concepto || '—')}</td>
            <td><span class="badge ${catColor}">${escHtml(g.categoria || '—')}</span></td>
            <td class="mono" style="font-weight:var(--weight-semibold)">$${Number(g.monto || 0).toLocaleString('es-CO')}</td>
            <td style="font-size:var(--fz-xs);color:var(--text-tertiary)">${escHtml(g.responsable || '—')}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="eliminarGasto('${g.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="14" height="14"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button></td>
        </tr>`;
    }).join('');
}

function nuevoGasto() {
    document.getElementById('form-gasto').reset();
    document.getElementById('f-gasto-fecha').valueAsDate = new Date();
    const catSel = document.getElementById('f-gasto-categoria');
    if (catSel) catSel.innerHTML = CATEGORIAS_GASTO.map(c => `<option value="${c}">${c}</option>`).join('');
    openModal('modal-gasto');
}

async function guardarGasto(e) {
    e.preventDefault();
    const datos = {
        concepto: document.getElementById('f-gasto-concepto')?.value.trim(),
        monto: Number(document.getElementById('f-gasto-monto')?.value) || 0,
        categoria: document.getElementById('f-gasto-categoria')?.value,
        fecha: new Date(document.getElementById('f-gasto-fecha')?.value).getTime(),
        responsable: window.userEmail || '',
        creadoEn: Date.now()
    };
    if (!datos.concepto || !datos.monto) { showToast('Concepto y monto son obligatorios', 'error'); return; }
    try { await db.ref('gastos').push(datos); closeModal('modal-gasto'); showToast('Gasto registrado'); }
    catch (err) { showToast('Error: ' + err.message, 'error'); }
}

async function eliminarGasto(id) {
    const ok = await confirmDialog('Eliminar gasto?', 'Esta accion no se puede deshacer.');
    if (!ok) return;
    await db.ref(`gastos/${id}`).remove(); showToast('Gasto eliminado', 'warning');
}

window.onSection_gastos = initGastos;
