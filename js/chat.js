/**
 * chat.js — Sección de Chat simple con IA
 * Usa ApiKeyManager para el proveedor activo.
 * Manolette Business Platform
 */

const CHAT_STORAGE_KEY = 'simple_chat_history';
const CHAT_SYSTEM = `Eres NOX, el asistente estratégico de Manolette — empresa colombiana especializada en productos personalizados y regalos corporativos (termos, vasos, kits, artículos de marca).

Responde SIEMPRE en español, sin importar el idioma del usuario.
Sé directo, práctico y usa Markdown cuando sea útil (listas, negritas, tablas).
Si el usuario pregunta sobre temas del negocio (ventas, marketing, finanzas, logística), dá consejos accionables orientados al mercado colombiano.`;

let _chatHistory = [];
let _chatReady = false;

/* ─── Historial ─── */

function _chatLoad() {
    try { _chatHistory = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]'); } catch { _chatHistory = []; }
}
function _chatSave() {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(_chatHistory.slice(-60)));
}
function _chatClearHistory() {
    _chatHistory = [];
    localStorage.removeItem(CHAT_STORAGE_KEY);
}

/* ─── Estado del proveedor ─── */

function _chatUpdateStatus() {
    const has = window.ApiKeyManager?.hasActiveProvider('chat');
    const cfg = has ? window.ApiKeyManager.getActiveConfig('chat') : null;

    const keyBtn = document.getElementById('chat-key-btn');
    if (keyBtn) {
        if (cfg) {
            keyBtn.innerHTML = `<span class="nox-key-btn-icon">${cfg.provider.icon}</span>${cfg.provider.shortName}`;
            keyBtn.classList.add('nox-key-ok');
        } else {
            keyBtn.innerHTML = `<span class="nox-key-btn-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg></span>Configurar IA`;
            keyBtn.classList.remove('nox-key-ok');
        }
    }

    const label = document.getElementById('chat-provider-label');
    if (label) {
        label.textContent = cfg ? `${cfg.model || cfg.provider.name}` : 'Sin proveedor configurado';
    }

    const sendBtn = document.getElementById('chat-send');
    if (sendBtn) sendBtn.disabled = !has;

    const input = document.getElementById('chat-input');
    if (input) {
        input.placeholder = has
            ? 'Escribe tu consulta...'
            : 'Configura un proveedor de IA para chatear →';
    }
}

/* ─── Markdown renderer (mínimo) ─── */

function _chatEsc(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function _chatMd(text) {
    return text
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
            `<pre class="nox-code-block"><code>${_chatEsc(code.trim())}</code></pre>`)
        .replace(/`([^`]+)`/g, '<code class="nox-inline-code">$1</code>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h4 class="nox-h4">$1</h4>')
        .replace(/^## (.+)$/gm,  '<h3 class="nox-h3">$1</h3>')
        .replace(/^# (.+)$/gm,   '<h2 class="nox-h2">$1</h2>')
        .replace(/^---$/gm, '<hr class="nox-hr">')
        .replace(/^\| (.+) \|$/gm, line => {
            if (line.includes('---')) return '';
            const cells = line.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
            return `<tr>${cells}</tr>`;
        })
        .replace(/((<tr>.*<\/tr>\s*)+)/gs, '<table class="nox-table"><tbody>$1</tbody></table>')
        .replace(/^\d+\. (.+)$/gm, '<li class="nox-li-num">$1</li>')
        .replace(/^[-•] (.+)$/gm,   '<li class="nox-li">$1</li>')
        .replace(/((<li[^>]*>.*<\/li>\s*)+)/gs, '<ul class="nox-ul">$1</ul>')
        .replace(/\n\n/g, '</p><p class="nox-p">')
        .replace(/\n/g, '<br>');
}

/* ─── UI helpers ─── */

function _chatAppendBubble(role, content) {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;

    const welcome = document.getElementById('chat-welcome');
    if (welcome) welcome.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = `nox-ag-bubble nox-ag-bubble--${role}`;

    if (role === 'user') {
        wrap.innerHTML = `<div class="nox-ag-user-text">${_chatEsc(content)}</div>`;
    } else {
        wrap.innerHTML = `
            <div class="nox-ag-ai-header">
                <div class="nox-ag-avatar">N</div>
                <span class="nox-ag-name">NOX</span>
            </div>
            <div class="nox-ag-content">${content}</div>`;
    }

    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
}

function _chatShowTyping() {
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    const el = document.createElement('div');
    el.className = 'nox-ag-bubble nox-ag-bubble--ai nox-ag-typing';
    el.id = 'chat-typing';
    el.innerHTML = `
        <div class="nox-ag-ai-header"><div class="nox-ag-avatar">N</div><span class="nox-ag-name">NOX</span></div>
        <div class="nox-typing-dots"><span></span><span></span><span></span></div>`;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
}

function _chatHideTyping() {
    document.getElementById('chat-typing')?.remove();
}

function _chatRestoreHistory() {
    const welcome = document.getElementById('chat-welcome');
    if (_chatHistory.length === 0) {
        if (welcome) welcome.style.display = '';
        return;
    }
    if (welcome) welcome.style.display = 'none';
    const recent = _chatHistory.slice(-20);
    recent.forEach(m => {
        if (m.role === 'user') _chatAppendBubble('user', m.content);
        else if (m.role === 'assistant') _chatAppendBubble('ai', _chatMd(m.content));
    });
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
}

/* ─── Enviar mensaje ─── */

async function chatSend() {
    const input = document.getElementById('chat-input');
    const sendBtn = document.getElementById('chat-send');
    if (!input || !sendBtn) return;

    const text = input.value.trim();
    if (!text) return;

    if (!window.ApiKeyManager?.hasActiveProvider('chat')) {
        window.ApiKeyManager?.openProviderPicker('chat');
        return;
    }

    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;

    _chatAppendBubble('user', text);
    _chatHistory.push({ role: 'user', content: text });

    _chatShowTyping();

    try {
        const messages = _chatHistory.slice(-20).map(m => ({ role: m.role, content: m.content }));
        const reply = await window.ApiKeyManager.callLLM('chat', {
            system: `INSTRUCCIÓN CRÍTICA: Responde SIEMPRE en español.\n\n${CHAT_SYSTEM}`,
            messages,
            maxTokens: 1500
        });

        _chatHideTyping();
        _chatHistory.push({ role: 'assistant', content: reply });
        _chatSave();
        _chatAppendBubble('ai', _chatMd(reply));
    } catch (err) {
        _chatHideTyping();
        const msg = err.message.includes('proveedor') || err.message.includes('API')
            ? err.message : `Error: ${err.message}`;
        _chatAppendBubble('ai', `<p style="color:#f87171"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${_chatEsc(msg)}</p>`);
        if (err.message.includes('proveedor') || err.message.includes('Configurar')) {
            window.ApiKeyManager?.openProviderPicker('chat');
        }
    } finally {
        sendBtn.disabled = !window.ApiKeyManager?.hasActiveProvider('chat');
        input.focus();
    }
}

function chatClear() {
    _chatClearHistory();
    const msgs = document.getElementById('chat-messages');
    if (msgs) {
        msgs.innerHTML = `<div id="chat-welcome" class="nox-ag-welcome">
            <div class="nox-ag-welcome-avatar">N</div>
            <h3>Chat con NOX</h3>
            <p>Tu asistente de IA personal para Manolette.<br>
               Pregunta sobre ventas, marketing, finanzas, logística o cualquier cosa.</p>
        </div>`;
    }
}

/* ─── Inicialización ─── */

function initChat() {
    if (_chatReady) {
        // Re-entrada: solo actualizar estado
        _chatUpdateStatus();
        return;
    }
    _chatReady = true;

    _chatLoad();

    const input = document.getElementById('chat-input');
    if (input) {
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 160) + 'px';
        });
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatSend(); }
        });
        input.addEventListener('click', () => {
            if (!window.ApiKeyManager?.hasActiveProvider('chat')) {
                window.ApiKeyManager?.openProviderPicker('chat');
            }
        });
    }

    document.getElementById('chat-send')?.addEventListener('click', chatSend);
    document.getElementById('chat-clear-btn')?.addEventListener('click', chatClear);
    document.getElementById('chat-key-btn')?.addEventListener('click', () => window.ApiKeyManager?.openProviderPicker('chat'));

    window.addEventListener('apikm:providerChanged', _chatUpdateStatus);
    window.addEventListener('apikm:providerAdded',   _chatUpdateStatus);
    window.addEventListener('apikm:providerRemoved', _chatUpdateStatus);
    window.addEventListener('apikm:modelChanged',    _chatUpdateStatus);

    _chatUpdateStatus();
    _chatRestoreHistory();
}

window.onSection_chat = initChat;
window.chatSend = chatSend;
window.chatClear = chatClear;
