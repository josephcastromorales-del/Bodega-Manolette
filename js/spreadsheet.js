// spreadsheet.js — Hoja de cálculo con Luckysheet

let _sheetInit = false;

function initHojaCalc() {
    if (_sheetInit) return;
    _sheetInit = true;

    const options = {
        container: 'luckysheet',
        title: 'Manolette — Hoja de Cálculo',
        lang: 'es',
        showinfobar: false,
        showstatisticBar: false,
        sheetRightClickConfig: {
            delete: true,
            copy: true,
            rename: true,
            color: true,
            hide: true,
            move: true
        },
        cellRightClickConfig: {
            copy: true,
            copyAs: true,
            paste: true,
            insertRow: true,
            insertColumn: true,
            deleteRow: true,
            deleteColumn: true,
            deleteCell: true,
            hideRow: true,
            hideColumn: true,
            rowHeight: true,
            columnWidth: true,
            clear: true,
            matrix: true,
            sort: true,
            filter: true,
            chart: true,
            image: true,
            link: true,
            data: true,
            cellFormat: true
        },
        data: [{
            name: 'Ventas',
            color: '',
            status: 1,
            order: 0,
            data: null,
            config: {},
            index: 0
        }, {
            name: 'Inventario',
            color: '',
            status: 0,
            order: 1,
            data: null,
            config: {},
            index: 1
        }, {
            name: 'Gastos',
            color: '',
            status: 0,
            order: 2,
            data: null,
            config: {},
            index: 2
        }],
        hook: {}
    };

    try {
        luckysheet.create(options);
    } catch(e) {
        const el = document.getElementById('luckysheet');
        if (el) el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-tertiary);font-size:14px">Error al cargar la hoja de cálculo. Verifica la conexión a internet.</div>';
    }
}

window.onSection_hojaCalc = initHojaCalc;
