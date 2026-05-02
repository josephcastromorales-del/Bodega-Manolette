// analiticas.js — Graficas y analisis de negocio
let analiticasChart = null;

function initAnaliticas() { loadAnalyticData(); }

async function loadAnalyticData() {
    try {
        const [contrSnap, ordSnap, gastosSnap] = await Promise.all([
            db.ref('contratos').once('value'),
            db.ref('ordenes').once('value'),
            db.ref('gastos').once('value')
        ]);
        const contratos = Object.values(contrSnap.val() || {});
        const ordenes = Object.values(ordSnap.val() || {});
        const gastos = Object.values(gastosSnap.val() || {});
        renderAnaliticasData(contratos, ordenes, gastos);
    } catch (err) { console.warn('[Analiticas]', err.message); }
}

function renderAnaliticasData(contratos, ordenes, gastos) {
    const mesActual = new Date().getMonth();
    const anioActual = new Date().getFullYear();

    // Ingresos: sum of contratos activos valor
    const ingresosMes = contratos
        .filter(c => c.estado === 'activo')
        .reduce((s, c) => s + Number(c.valor || 0), 0);

    // Gastos del mes
    const gastosMes = gastos
        .filter(g => { const d = new Date(g.fecha); return d.getMonth() === mesActual && d.getFullYear() === anioActual; })
        .reduce((s, g) => s + Number(g.monto || 0), 0);

    // Margen
    const margen = ingresosMes > 0 ? Math.round(((ingresosMes - gastosMes) / ingresosMes) * 100) : 0;

    // Update KPIs
    const elMargen = document.getElementById('analiticas-margen');
    const elIngresos = document.getElementById('analiticas-ingresos');
    const elGastos = document.getElementById('analiticas-gastos');
    if (elMargen) elMargen.textContent = margen + '%';
    if (elIngresos) elIngresos.textContent = '$' + ingresosMes.toLocaleString('es-CO');
    if (elGastos) elGastos.textContent = '$' + gastosMes.toLocaleString('es-CO');

    // Chart: ordenes por mes (ultimos 6 meses)
    const mesesLabels = [];
    const mesesData = [];
    const gastosData = [];
    const ahora = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(ahora.getFullYear(), ahora.getMonth() - i, 1);
        const label = d.toLocaleDateString('es-CO', { month: 'short' });
        const mes = d.getMonth();
        const anio = d.getFullYear();
        mesesLabels.push(label);
        mesesData.push(ordenes.filter(o => { const od = new Date(o.fecha); return od.getMonth() === mes && od.getFullYear() === anio; }).length);
        gastosData.push(gastos.filter(g => { const gd = new Date(g.fecha); return gd.getMonth() === mes && gd.getFullYear() === anio; }).reduce((s, g) => s + Number(g.monto || 0), 0));
    }

    // Render Chart.js bar chart
    const canvas = document.getElementById('analiticasChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (analiticasChart) { analiticasChart.destroy(); }
    const ctx = canvas.getContext('2d');
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#315640';
    const warningColor = getComputedStyle(document.documentElement).getPropertyValue('--warning').trim() || '#f59e0b';
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim() || '#71717a';
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--border-subtle').trim() || '#1f1f1f';

    analiticasChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: mesesLabels,
            datasets: [
                {
                    label: 'Ordenes',
                    data: mesesData,
                    backgroundColor: accentColor + '99',
                    borderColor: accentColor,
                    borderWidth: 1,
                    borderRadius: 4
                },
                {
                    label: 'Gastos (miles)',
                    data: gastosData.map(v => Math.round(v / 1000)),
                    backgroundColor: warningColor + '66',
                    borderColor: warningColor,
                    borderWidth: 1,
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: textColor, font: { family: 'Inter', size: 11 } } } },
            scales: {
                x: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } },
                y: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor }, beginAtZero: true }
            }
        }
    });
}

window.onSection_analiticas = initAnaliticas;
