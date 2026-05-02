// reports.js — Generador de reportes, export CSV, print

let reportContrato = null;
let reportOrdenes  = [];

function initReportes() {
    db.ref('contratos').once('value', snap => {
        const data = snap.val() || {};
        const sel  = document.getElementById('reporte-contrato-sel');
        if (!sel) return;
        sel.innerHTML = '<option value="">Selecciona un contrato...</option>' +
            Object.entries(data).map(([id, c]) =>
                `<option value="${id}">${escHtml(c.numero)} — ${escHtml(c.cliente)}</option>`
            ).join('');
        sel.onchange = () => cargarReporte(sel.value, data);
    });
}

function cargarReporte(contratoId, contratosMap) {
    const previewEl = document.getElementById('report-preview');
    if (!previewEl) return;

    if (!contratoId) {
        previewEl.innerHTML = '<div class="empty-state" style="padding:3rem"><p>Selecciona un contrato para generar el reporte.</p></div>';
        return;
    }

    reportContrato = contratosMap[contratoId];
    previewEl.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--text-sm)">Cargando datos...</div>';

    db.ref('ordenes').orderByChild('contratoId').equalTo(contratoId).once('value', snap => {
        const data = snap.val() || {};
        reportOrdenes = Object.values(data);
        renderReportPreview(reportContrato, reportOrdenes, previewEl);
    });
}

function renderReportPreview(contrato, ordenes, container) {
    if (!contrato) return;

    const byEstado = {
        recibido: ordenes.filter(o => o.estado === 'recibido').length,
        empaque:  ordenes.filter(o => o.estado === 'empaque').length,
        calidad:  ordenes.filter(o => o.estado === 'calidad').length,
        listo:    ordenes.filter(o => o.estado === 'listo').length,
        enviado:  ordenes.filter(o => o.estado === 'enviado').length
    };

    const now = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });

    container.innerHTML = `<div class="report-preview-inner" id="print-area">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
            <div>
                <h2>Reporte de Contrato</h2>
                <p class="subtitle">Generado el ${now}</p>
            </div>
            <div style="text-align:right">
                <strong style="font-size:1.1rem">${escHtml(contrato.numero || '—')}</strong><br>
                <span style="color:var(--text-sm);font-size:.9rem">${escHtml(contrato.cliente || '—')}</span>
            </div>
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem;font-size:.9rem">
            <tr style="background:var(--bg)">
                <td style="padding:.5rem .75rem;border:1px solid var(--border)"><strong>Inicio</strong></td>
                <td style="padding:.5rem .75rem;border:1px solid var(--border)">${formatDate(contrato.fechaInicio)}</td>
                <td style="padding:.5rem .75rem;border:1px solid var(--border)"><strong>Límite</strong></td>
                <td style="padding:.5rem .75rem;border:1px solid var(--border)">${formatDate(contrato.fechaLimite)}</td>
            </tr>
            <tr>
                <td style="padding:.5rem .75rem;border:1px solid var(--border)"><strong>Estado</strong></td>
                <td style="padding:.5rem .75rem;border:1px solid var(--border)">${escHtml(contrato.estado || '—')}</td>
                <td style="padding:.5rem .75rem;border:1px solid var(--border)"><strong>Responsable</strong></td>
                <td style="padding:.5rem .75rem;border:1px solid var(--border)">${escHtml(contrato.responsable || '—')}</td>
            </tr>
        </table>

        <h3 style="margin-bottom:.75rem;font-size:1rem">Resumen de Órdenes</h3>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:.75rem;margin-bottom:1.5rem">
            ${Object.entries(byEstado).map(([estado, count]) => `
                <div style="text-align:center;padding:.75rem;border:1px solid var(--border);border-radius:8px;background:var(--bg)">
                    <div style="font-size:1.5rem;font-weight:800">${count}</div>
                    <div style="font-size:.75rem;color:var(--text-sm);text-transform:capitalize">${estado}</div>
                </div>`).join('')}
        </div>

        <h3 style="margin-bottom:.75rem;font-size:1rem">Detalle de Órdenes (${ordenes.length})</h3>
        <table style="width:100%;border-collapse:collapse;font-size:.85rem">
            <thead>
                <tr style="background:var(--bg)">
                    <th style="padding:.5rem .75rem;border:1px solid var(--border);text-align:left">Número</th>
                    <th style="padding:.5rem .75rem;border:1px solid var(--border);text-align:left">Producto</th>
                    <th style="padding:.5rem .75rem;border:1px solid var(--border);text-align:left">Cantidad</th>
                    <th style="padding:.5rem .75rem;border:1px solid var(--border);text-align:left">Estado</th>
                    <th style="padding:.5rem .75rem;border:1px solid var(--border);text-align:left">Prioridad</th>
                    <th style="padding:.5rem .75rem;border:1px solid var(--border);text-align:left">Límite</th>
                </tr>
            </thead>
            <tbody>
                ${ordenes.length === 0 ? `<tr><td colspan="6" style="padding:.75rem;text-align:center;color:var(--text-sm)">Sin órdenes en este contrato</td></tr>` :
                ordenes.map(o => `<tr>
                    <td style="padding:.5rem .75rem;border:1px solid var(--border);font-family:monospace">${escHtml(o.numero || '—')}</td>
                    <td style="padding:.5rem .75rem;border:1px solid var(--border)">${escHtml(o.nombreProducto || '—')}</td>
                    <td style="padding:.5rem .75rem;border:1px solid var(--border)">${escHtml(String(o.cantidad||''))} ${escHtml(o.unidad||'')}</td>
                    <td style="padding:.5rem .75rem;border:1px solid var(--border)">${escHtml(o.estado || '—')}</td>
                    <td style="padding:.5rem .75rem;border:1px solid var(--border)">${escHtml(o.prioridad || 'normal')}</td>
                    <td style="padding:.5rem .75rem;border:1px solid var(--border)">${formatDate(o.fechaLimite)}</td>
                </tr>`).join('')}
            </tbody>
        </table>

        ${contrato.instruccionesEspeciales ? `<div style="margin-top:1.5rem;padding:1rem;background:var(--accent-subtle);border-radius:8px;border:1px solid var(--border-subtle)">
            <strong style="font-size:.85rem;color:var(--accent)">INSTRUCCIONES ESPECIALES</strong>
            <p style="font-size:.9rem;color:var(--text-primary);margin-top:.25rem">${escHtml(contrato.instruccionesEspeciales)}</p>
        </div>` : ''}

        <p style="margin-top:2rem;font-size:.75rem;color:var(--text-xs);text-align:center">
            Manolette Business Platform · Reporte generado el ${now}
        </p>
    </div>`;
}

function exportarCSV() {
    if (!reportContrato || reportOrdenes.length === 0) {
        showToast('Primero genera un reporte seleccionando un contrato', 'warning');
        return;
    }

    const headers = ['Número', 'Producto', 'Cantidad', 'Unidad', 'Estado', 'Prioridad', 'Asignado', 'Fecha Límite', 'Notas'];
    const rows = reportOrdenes.map(o => [
        o.numero || '', o.nombreProducto || '', o.cantidad || '', o.unidad || '',
        o.estado || '', o.prioridad || '', o.asignadoA || '',
        o.fechaLimite ? formatDate(o.fechaLimite) : '',
        o.notas || ''
    ].map(cell => `"${String(cell).replace(/"/g, '""')}"`));

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `reporte_${reportContrato.numero || 'contrato'}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV exportado correctamente');
}

function imprimirReporte() {
    if (!reportContrato) {
        showToast('Primero genera un reporte', 'warning');
        return;
    }
    window.print();
}

window.onSection_reportes = initReportes;
