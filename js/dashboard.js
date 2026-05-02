// dashboard.js — KPIs, Chart.js pipeline + mensual, alertas, actividad reciente

let pipelineChart = null;
let monthlyChart  = null;
let _prevEnviados = null;

function initDashboard() {
    listenDashboardData();
    initActivityFeed('activity-feed');
}

function listenDashboardData() {
    const _onErr = err => console.warn('[Dashboard]', err.message);

    // Contratos
    db.ref('contratos').on('value', snap => {
        const data = snap.val() || {};
        const contratos = Object.values(data);
        const activos   = contratos.filter(c => c.estado === 'activo' || c.estado === 'en_riesgo');
        updateKPI('kpi-contratos', activos.length);
        renderContratoAlerts(contratos);
    }, _onErr);

    // Órdenes
    db.ref('ordenes').on('value', snap => {
        const data = snap.val() || {};
        const ordenes = Object.values(data);

        const enProceso = ordenes.filter(o => !['enviado'].includes(o.estado)).length;
        const enviados  = ordenes.filter(o => {
            if (o.estado !== 'enviado') return false;
            const d = new Date(o.fechaEnvio || o.timestamp || 0);
            const now = new Date();
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        }).length;

        const pendientes = ordenes.filter(o => o.estado === 'recibido').length;

        updateKPI('kpi-ordenes', enProceso);
        updateKPI('kpi-pendientes', pendientes);

        // Trend: enviados este mes vs mes anterior
        const prevMonth = ordenes.filter(o => {
            if (o.estado !== 'enviado') return false;
            const d   = new Date(o.fechaEnvio || o.timestamp || 0);
            const now = new Date();
            const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
        }).length;

        updateKPI('kpi-enviados', enviados);
        updateKPITrend('kpi-enviados-trend', enviados, prevMonth);

        updatePipelineChart(ordenes);
        updateMonthlyChart(ordenes);
        renderOrdenAlerts(ordenes);
    }, _onErr);
}

function updateKPI(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function updateKPITrend(id, current, previous) {
    const el = document.getElementById(id);
    if (!el) return;
    if (previous === 0 && current === 0) { el.textContent = ''; return; }
    const pct = previous === 0 ? 100 : Math.round(((current - previous) / previous) * 100);
    const up  = pct >= 0;
    el.innerHTML = `<span style="color:${up ? 'var(--green)' : 'var(--red)'}">
        ${up ? '▲' : '▼'} ${Math.abs(pct)}% vs mes anterior
    </span>`;
}

function updateMonthlyChart(ordenes) {
    const canvas = document.getElementById('monthly-chart');
    if (!canvas) return;

    const now    = new Date();
    const labels = [];
    const data   = [];
    const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        labels.push(months[d.getMonth()]);
        data.push(ordenes.filter(o => {
            if (o.estado !== 'enviado') return false;
            const fd = new Date(o.fechaEnvio || 0);
            return fd.getMonth() === d.getMonth() && fd.getFullYear() === d.getFullYear();
        }).length);
    }

    if (monthlyChart) monthlyChart.destroy();
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#315640';
    const textClr = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#71717a';
    const gridClr = getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() || '#1f1f1f';
    monthlyChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Ordenes enviadas',
                data,
                backgroundColor: data.map((_, i) => i === 5 ? accent : accent + '77'),
                borderRadius: 6,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: {
                label: ctx => ` ${ctx.parsed.y} orden(es) enviada(s)`
            }}},
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0, color: textClr }, grid: { color: gridClr } },
                x: { ticks: { color: textClr }, grid: { display: false } }
            }
        }
    });
}

function updatePipelineChart(ordenes) {
    const counts = {
        'Recibido':  ordenes.filter(o => o.estado === 'recibido').length,
        'Empaque':   ordenes.filter(o => o.estado === 'empaque').length,
        'Calidad':   ordenes.filter(o => o.estado === 'calidad').length,
        'Listo':     ordenes.filter(o => o.estado === 'listo').length,
        'Enviado':   ordenes.filter(o => o.estado === 'enviado').length
    };

    const canvas = document.getElementById('pipeline-chart');
    if (!canvas) return;

    if (pipelineChart) pipelineChart.destroy();
    const bgSurface = getComputedStyle(document.documentElement).getPropertyValue('--bg-surface').trim() || '#0a0a0a';
    const txtClr = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#a1a1aa';
    pipelineChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: Object.keys(counts),
            datasets: [{
                data: Object.values(counts),
                backgroundColor: ['#315640','#f59e0b','#8b5cf6','#22c55e','#64748b'],
                borderWidth: 2,
                borderColor: bgSurface
            }]
        },
        options: {
            cutout: '65%',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: txtClr, font: { family: 'Inter', size: 12 }, padding: 12 }
                }
            }
        }
    });
}

function renderContratoAlerts(contratos) {
    const alertsEl = document.getElementById('deadline-alerts');
    if (!alertsEl) return;

    const urgent = contratos.filter(c => {
        if (c.estado === 'completado' || c.estado === 'cancelado') return false;
        const days = daysUntil(c.fechaLimite);
        return days !== null && days <= 5;
    });

    if (urgent.length === 0) {
        alertsEl.innerHTML = '';
        return;
    }

    alertsEl.innerHTML = urgent.map(c => {
        const days = daysUntil(c.fechaLimite);
        const cls  = days < 0 ? 'danger' : 'warning';
        const msg  = days < 0
            ? `Vencido hace ${Math.abs(days)} día(s)`
            : days === 0 ? 'Vence HOY'
            : `Vence en ${days} día(s)`;
        return `<div class="alert-strip ${cls}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 22h16a2 2 0 0 0 1.73-4Z"/><path d="M12 9v4M12 17h.01"/></svg>
            <div>
                <p><strong>Contrato ${escHtml(c.numero || '—')}</strong> — ${escHtml(c.cliente || '')}</p>
                <small>${msg} · ${formatDate(c.fechaLimite)}</small>
            </div>
        </div>`;
    }).join('');
}

function renderOrdenAlerts(ordenes) {
    const alertsEl = document.getElementById('orden-alerts');
    if (!alertsEl) return;

    const urgentes = ordenes.filter(o => {
        if (o.estado === 'enviado') return false;
        const days = daysUntil(o.fechaLimite);
        return days !== null && days <= 2;
    });

    if (urgentes.length === 0) {
        alertsEl.innerHTML = '';
        return;
    }

    const msg = urgentes.length === 1
        ? `La orden <strong>${escHtml(urgentes[0].numero || '—')}</strong> vence pronto.`
        : `${urgentes.length} órdenes con fecha límite inminente.`;

    alertsEl.innerHTML = `<div class="alert-strip warning">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
        <p>${msg}</p>
    </div>`;
}

// Hook del router
window.onSection_dashboard = initDashboard;
