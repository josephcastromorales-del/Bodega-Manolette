// calendar-view.js — Calendario de deadlines y entregas

let _calDate   = new Date();
let _calEvents = {}; // 'YYYY-MM-DD' => [{type, title, urgent, section}]

const _MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                 'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const _DAYS   = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];

function initCalendario() {
    loadCalendarData();
}

function loadCalendarData() {
    _calEvents = {};
    let loaded = 0;
    const check = () => { if (++loaded === 2) renderCalendar(); };

    db.ref('contratos').once('value', snap => {
        const data = snap.val() || {};
        Object.entries(data).forEach(([id, c]) => {
            if (!c.fechaLimite || c.estado === 'completado' || c.estado === 'cancelado') return;
            const key  = _tsToKey(c.fechaLimite);
            const days = daysUntil(c.fechaLimite);
            (_calEvents[key] = _calEvents[key] || []).push({
                type: 'contrato', urgent: days !== null && days <= 3,
                title: `${c.numero || c.cliente || '—'}`, section: 'contratos'
            });
        });
        check();
    });

    db.ref('ordenes').once('value', snap => {
        const data = snap.val() || {};
        Object.entries(data).forEach(([id, o]) => {
            if (!o.fechaLimite || o.estado === 'enviado') return;
            const key  = _tsToKey(o.fechaLimite);
            const days = daysUntil(o.fechaLimite);
            (_calEvents[key] = _calEvents[key] || []).push({
                type: 'orden', urgent: days !== null && days <= 2,
                title: `${o.numero || o.nombreProducto || '—'}`, section: 'ordenes'
            });
        });
        check();
    });
}

function _tsToKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function renderCalendar() {
    const year  = _calDate.getFullYear();
    const month = _calDate.getMonth();

    const labelEl = document.getElementById('cal-month-label');
    if (labelEl) labelEl.textContent = `${_MONTHS[month]} ${year}`;

    const grid = document.getElementById('cal-grid');
    if (!grid) return;

    const firstDay  = new Date(year, month, 1);
    const lastDay   = new Date(year, month + 1, 0);
    const startDow  = (firstDay.getDay() + 6) % 7; // Mon=0 … Sun=6
    const todayKey  = _tsToKey(Date.now());

    // Count events in month for legend
    let totalEvents = 0;
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const k = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        totalEvents += (_calEvents[k] || []).length;
    }
    const legendEl = document.getElementById('cal-legend-count');
    if (legendEl) legendEl.textContent = `${totalEvents} evento(s) este mes`;

    let html = _DAYS.map(d => `<div class="cal-day-header">${d}</div>`).join('');

    // Blank leading cells
    for (let i = 0; i < startDow; i++) html += '<div class="cal-cell cal-empty"></div>';

    for (let d = 1; d <= lastDay.getDate(); d++) {
        const key     = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const events  = _calEvents[key] || [];
        const isToday = key === todayKey;
        const isPast  = new Date(year, month, d) < new Date(new Date().setHours(0,0,0,0));
        const hasUrgent = events.some(e => e.urgent);

        html += `<div class="cal-cell${isToday ? ' cal-today' : ''}${isPast && !isToday ? ' cal-past' : ''}${hasUrgent ? ' cal-urgent' : events.length ? ' cal-has-events' : ''}">
            <div class="cal-day-num">${d}</div>
            <div class="cal-events-wrap">
                ${events.slice(0, 3).map(ev => `
                    <div class="cal-event cal-event-${ev.type === 'contrato' ? 'blue' : ev.urgent ? 'red' : 'amber'}"
                         onclick="navigate('${ev.section}')" title="${escHtml(ev.title)}">
                        ${escHtml(ev.title.length > 18 ? ev.title.slice(0,17) + '…' : ev.title)}
                    </div>`).join('')}
                ${events.length > 3 ? `<div class="cal-event-more">+${events.length - 3} más</div>` : ''}
            </div>
        </div>`;
    }

    grid.innerHTML = html;
}

function calPrevMonth() {
    _calDate = new Date(_calDate.getFullYear(), _calDate.getMonth() - 1, 1);
    loadCalendarData();
}
function calNextMonth() {
    _calDate = new Date(_calDate.getFullYear(), _calDate.getMonth() + 1, 1);
    loadCalendarData();
}
function calGoToday() {
    _calDate = new Date();
    loadCalendarData();
}

window.onSection_calendario = initCalendario;
