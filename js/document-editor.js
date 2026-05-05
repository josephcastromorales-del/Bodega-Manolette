// document-editor.js — Editor de documentos tipo Word con Quill

let _quill = null;
let _docInit = false;

function initDocumento() {
    if (_docInit) return;
    _docInit = true;

    if (typeof Quill === 'undefined') {
        document.getElementById('doc-editor').innerHTML = '<p style="color:#999">Quill no cargó. Verifica tu conexión.</p>';
        return;
    }

    const toolbarOptions = [
        [{ 'font': ['', 'serif', 'monospace'] }],
        [{ 'header': [1, 2, 3, 4, false] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'script': 'sub' }, { 'script': 'super' }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'direction': 'rtl' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
    ];

    _quill = new Quill('#doc-editor', {
        modules: { toolbar: { container: toolbarOptions, handlers: {} } },
        theme: 'snow',
        placeholder: 'Comienza a escribir tu documento...'
    });

    // Move toolbar to our container
    const toolbar = document.querySelector('.ql-toolbar');
    const toolbarContainer = document.getElementById('doc-toolbar');
    if (toolbar && toolbarContainer) {
        toolbarContainer.appendChild(toolbar);
    }

    // Styling overrides for dark theme toolbar
    const style = document.createElement('style');
    style.textContent = `
        .ql-toolbar.ql-snow { border: none !important; background: transparent; flex-wrap: wrap; }
        .ql-container.ql-snow { border: none !important; }
        .ql-snow .ql-stroke { stroke: var(--text-secondary) !important; }
        .ql-snow .ql-fill { fill: var(--text-secondary) !important; }
        .ql-snow .ql-picker { color: var(--text-secondary) !important; }
        .ql-snow .ql-picker-options { background: var(--bg-overlay) !important; border-color: var(--border-default) !important; }
        .ql-toolbar button:hover .ql-stroke, .ql-toolbar button.ql-active .ql-stroke { stroke: var(--accent-hover) !important; }
        .ql-toolbar button:hover .ql-fill, .ql-toolbar button.ql-active .ql-fill { fill: var(--accent-hover) !important; }
    `;
    document.head.appendChild(style);
}

function docExportPDF() {
    window.print();
}

function docExportDOCX() {
    if (!_quill) return;
    const content = _quill.root.innerHTML;
    const blob = new Blob([`<html><body style="font-family:'Times New Roman';font-size:12pt;margin:2cm">${content}</body></html>`], { type: 'application/msword' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'documento-manolette.doc';
    a.click();
}

window.onSection_documento = initDocumento;
