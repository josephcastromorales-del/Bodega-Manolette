/**
 * ApiKeyManager — Gestor Multi-Proveedor de API Keys
 * Soporta 10 proveedores de IA con verificación de clave y carga de modelos.
 * Compatible con GitHub Pages (solo client-side, localStorage).
 */

/* ═══════════════════════════════════════════════════════════
   ICONOS SVG (Lucide-style, stroke-based)
   ═══════════════════════════════════════════════════════════ */

/* ── Logos de proveedores: filled, estilo marca, misma visual weight ── */
/* ── Iconos de UI: stroke, estilo Lucide ── */
/* Logos oficiales vía Simple Icons CDN (simpleicons.org) */
const _siIcon = (slug, hex, size = 22) =>
  `<img src="https://cdn.simpleicons.org/${slug}/${hex}" width="${size}" height="${size}" style="display:block;pointer-events:none;flex-shrink:0" alt="${slug}" onerror="this.style.display='none'">`;

const _ICON = {
  /* LOGOS DE PROVEEDORES — Simple Icons CDN */
  anthropic:  _siIcon('anthropic',    'cc785c'),
  openai:     _siIcon('openai',       '10a37f'),
  gemini:     _siIcon('googlegemini', '4285f4'),
  groq:       _siIcon('groq',         'f55036'),
  openrouter: _siIcon('openrouter',   '7c3aed'),
  mistral:    _siIcon('mistralai',    'ff7000'),
  cohere:     _siIcon('cohere',       '39d353'),
  deepseek:   _siIcon('deepseek',     '1677ff'),
  together:   _siIcon('togetherai',   '0f6cbd'),
  perplexity: _siIcon('perplexity',   '20b2aa'),

  /* ICONOS DE UI — stroke Lucide */
  key:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>`,
  check:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  cpu:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M9 2v2M15 20v2M9 20v2M2 15h2M2 9h2M20 15h2M20 9h2"/></svg>`,
  palette:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="19" cy="17" r="2.5"/><circle cx="6.5" cy="17.5" r="2.5"/><path d="M13.5 9a6.5 6.5 0 0 1 0 13H6.5a6.5 6.5 0 0 1 0-13h7z"/></svg>`,
  zap:        `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  trash:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  close:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  plus:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`,
};

/* ═══════════════════════════════════════════════════════════
   DEFINICIÓN DE PROVEEDORES
   ═══════════════════════════════════════════════════════════ */

const PROVIDER_DEFS = {
  anthropic: {
    id: 'anthropic', name: 'Anthropic', shortName: 'Claude',
    icon: _ICON.anthropic, color: '#cc785c',
    keyPlaceholder: 'sk-ant-api03-...',
    docs: 'console.anthropic.com › API Keys',
    modelsUrl: () => 'https://api.anthropic.com/v1/models',
    getHeaders: (key) => ({
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    }),
    parseModels: (data) => (data.data || []).map(m => ({ id: m.id, name: m.display_name || m.id })),
    chatUrl: () => 'https://api.anthropic.com/v1/messages',
    buildBody: (model, messages, system, maxTokens) => ({
      model, max_tokens: maxTokens || 1500, system,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    }),
    parseResponse: (data) => data.content?.[0]?.text || ''
  },

  openai: {
    id: 'openai', name: 'OpenAI', shortName: 'ChatGPT',
    icon: _ICON.openai, color: '#10a37f',
    keyPlaceholder: 'sk-proj-...',
    docs: 'platform.openai.com › API Keys',
    modelsUrl: () => 'https://api.openai.com/v1/models',
    getHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    }),
    parseModels: (data) => (data.data || [])
      .filter(m => /^(gpt|o1|o3|chatgpt)/.test(m.id))
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 20)
      .map(m => ({ id: m.id, name: m.id })),
    chatUrl: () => 'https://api.openai.com/v1/chat/completions',
    buildBody: (model, messages, system, maxTokens) => ({
      model, max_tokens: maxTokens || 1500,
      messages: [{ role: 'system', content: system }, ...messages]
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ''
  },

  gemini: {
    id: 'gemini', name: 'Google Gemini', shortName: 'Gemini',
    icon: _ICON.gemini, color: '#4285f4',
    keyPlaceholder: 'AIzaSy...',
    docs: 'aistudio.google.com › API Key',
    modelsUrl: (key) => `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
    getHeaders: () => ({ 'Content-Type': 'application/json' }),
    parseModels: (data) => (data.models || [])
      .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
      .map(m => ({ id: m.name, name: m.displayName || m.name.split('/').pop() })),
    chatUrl: (key, model) => `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${key}`,
    buildBody: (_model, messages, system, maxTokens) => ({
      system_instruction: { parts: [{ text: system }] },
      contents: messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      })),
      generationConfig: { maxOutputTokens: maxTokens || 1500 }
    }),
    parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || ''
  },

  groq: {
    id: 'groq', name: 'Groq', shortName: 'Groq',
    icon: _ICON.groq, color: '#f55036',
    keyPlaceholder: 'gsk_...',
    docs: 'console.groq.com › API Keys',
    modelsUrl: () => 'https://api.groq.com/openai/v1/models',
    getHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    }),
    parseModels: (data) => (data.data || [])
      .filter(m => m.active !== false)
      .map(m => ({ id: m.id, name: m.id })),
    chatUrl: () => 'https://api.groq.com/openai/v1/chat/completions',
    buildBody: (model, messages, system, maxTokens) => ({
      model, max_tokens: maxTokens || 1500,
      messages: [{ role: 'system', content: system }, ...messages]
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ''
  },

  openrouter: {
    id: 'openrouter', name: 'OpenRouter', shortName: 'Router',
    icon: _ICON.openrouter, color: '#7c3aed',
    keyPlaceholder: 'sk-or-v1-...',
    docs: 'openrouter.ai › Keys',
    modelsUrl: () => 'https://openrouter.ai/api/v1/models',
    getHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Manolette AI'
    }),
    parseModels: (data) => (data.data || [])
      .slice(0, 60)
      .map(m => ({ id: m.id, name: m.name || m.id })),
    chatUrl: () => 'https://openrouter.ai/api/v1/chat/completions',
    buildBody: (model, messages, system, maxTokens) => ({
      model, max_tokens: maxTokens || 1500,
      messages: [{ role: 'system', content: system }, ...messages]
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ''
  },

  mistral: {
    id: 'mistral', name: 'Mistral AI', shortName: 'Mistral',
    icon: _ICON.mistral, color: '#ff7000',
    keyPlaceholder: 'API key de Mistral...',
    docs: 'console.mistral.ai › API Keys',
    modelsUrl: () => 'https://api.mistral.ai/v1/models',
    getHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    }),
    parseModels: (data) => (data.data || []).map(m => ({ id: m.id, name: m.id })),
    chatUrl: () => 'https://api.mistral.ai/v1/chat/completions',
    buildBody: (model, messages, system, maxTokens) => ({
      model, max_tokens: maxTokens || 1500,
      messages: [{ role: 'system', content: system }, ...messages]
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ''
  },

  cohere: {
    id: 'cohere', name: 'Cohere', shortName: 'Cohere',
    icon: _ICON.cohere, color: '#39d353',
    keyPlaceholder: 'API key de Cohere...',
    docs: 'dashboard.cohere.com › API Keys',
    modelsUrl: () => 'https://api.cohere.ai/v1/models',
    getHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    }),
    parseModels: (data) => (data.models || []).map(m => ({ id: m.name, name: m.name })),
    chatUrl: () => 'https://api.cohere.ai/v2/chat',
    buildBody: (model, messages, system, maxTokens) => ({
      model, max_tokens: maxTokens || 1500, system,
      messages: messages.map(m => ({ role: m.role, content: m.content }))
    }),
    parseResponse: (data) => data.message?.content?.[0]?.text || ''
  },

  deepseek: {
    id: 'deepseek', name: 'DeepSeek', shortName: 'DeepSeek',
    icon: _ICON.deepseek, color: '#1677ff',
    keyPlaceholder: 'sk-...',
    docs: 'platform.deepseek.com › API Keys',
    modelsUrl: () => 'https://api.deepseek.com/v1/models',
    getHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    }),
    parseModels: (data) => (data.data || []).map(m => ({ id: m.id, name: m.id })),
    chatUrl: () => 'https://api.deepseek.com/v1/chat/completions',
    buildBody: (model, messages, system, maxTokens) => ({
      model, max_tokens: maxTokens || 1500,
      messages: [{ role: 'system', content: system }, ...messages]
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ''
  },

  together: {
    id: 'together', name: 'Together AI', shortName: 'Together',
    icon: _ICON.together, color: '#0f6cbd',
    keyPlaceholder: 'API key de Together AI...',
    docs: 'api.together.ai › Settings',
    modelsUrl: () => 'https://api.together.xyz/v1/models',
    getHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    }),
    parseModels: (data) => (Array.isArray(data) ? data : data.data || [])
      .filter(m => m.type === 'chat' || m.display_type === 'chat')
      .slice(0, 30)
      .map(m => ({ id: m.id, name: m.display_name || m.id })),
    chatUrl: () => 'https://api.together.xyz/v1/chat/completions',
    buildBody: (model, messages, system, maxTokens) => ({
      model, max_tokens: maxTokens || 1500,
      messages: [{ role: 'system', content: system }, ...messages]
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ''
  },

  perplexity: {
    id: 'perplexity', name: 'Perplexity', shortName: 'Perplexity',
    icon: _ICON.perplexity, color: '#20b2aa',
    keyPlaceholder: 'pplx-...',
    docs: 'perplexity.ai › API › Keys',
    modelsUrl: null,
    fallbackModels: [
      { id: 'llama-3.1-sonar-small-128k-online', name: 'Sonar Small Online' },
      { id: 'llama-3.1-sonar-large-128k-online', name: 'Sonar Large Online' },
      { id: 'llama-3.1-sonar-huge-128k-online',  name: 'Sonar Huge Online'  },
      { id: 'llama-3.1-8b-instruct',              name: 'Llama 3.1 8B'       },
      { id: 'llama-3.1-70b-instruct',             name: 'Llama 3.1 70B'      }
    ],
    getHeaders: (key) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    }),
    parseModels: () => [],
    chatUrl: () => 'https://api.perplexity.ai/chat/completions',
    buildBody: (model, messages, system, maxTokens) => ({
      model, max_tokens: maxTokens || 1500,
      messages: [{ role: 'system', content: system }, ...messages]
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ''
  }
};

/* ═══════════════════════════════════════════════════════════
   ALMACENAMIENTO (localStorage)
   ═══════════════════════════════════════════════════════════ */

const APIKM_STORAGE = 'apikm_providers_v2';
const APIKM_ROUTING = 'apikm_routing_v2';

function _apikm_load() {
  try { return JSON.parse(localStorage.getItem(APIKM_STORAGE) || '{}'); } catch { return {}; }
}

function _apikm_save(data) {
  localStorage.setItem(APIKM_STORAGE, JSON.stringify(data));
}

function _apikm_loadRouting() {
  try {
    return JSON.parse(localStorage.getItem(APIKM_ROUTING) || 'null') || {
      mode: 'auto',
      sections: { nox: '', diseno: '', default: '' }
    };
  } catch { return { mode: 'auto', sections: { nox: '', diseno: '', default: '' } }; }
}

function _apikm_saveRouting(r) {
  localStorage.setItem(APIKM_ROUTING, JSON.stringify(r));
}

/* ═══════════════════════════════════════════════════════════
   MANAGER PRINCIPAL
   ═══════════════════════════════════════════════════════════ */

window.ApiKeyManager = {

  providers: PROVIDER_DEFS,

  getAll() {
    const stored = _apikm_load();
    return Object.values(PROVIDER_DEFS).map(def => ({
      ...def,
      key: stored[def.id]?.key || '',
      models: stored[def.id]?.models || (def.fallbackModels || []),
      selectedModel: stored[def.id]?.selectedModel || '',
      status: stored[def.id]?.status || 'unconfigured'
    }));
  },

  save(providerId, { key, models, selectedModel, status }) {
    const data = _apikm_load();
    data[providerId] = { key, models: models || [], selectedModel: selectedModel || '', status: status || 'unconfigured' };
    _apikm_save(data);
  },

  getActiveConfig(sectionId = 'nox') {
    const routing = _apikm_loadRouting();
    const stored = _apikm_load();
    let providerId = '';

    if (routing.mode === 'manual') {
      providerId = routing.sections[sectionId] || routing.sections.default || '';
    } else {
      const preferred = routing.sections[sectionId] || routing.sections.default;
      if (preferred && stored[preferred]?.status === 'ok') {
        providerId = preferred;
      } else {
        providerId = Object.keys(stored).find(id => stored[id]?.status === 'ok') || '';
      }
    }

    if (!providerId || !stored[providerId]) return null;
    const s = stored[providerId];
    const def = PROVIDER_DEFS[providerId];
    if (!def || !s.key || s.status !== 'ok') return null;

    return {
      provider: def,
      key: s.key,
      model: s.selectedModel || (s.models[0]?.id || ''),
      models: s.models
    };
  },

  hasActiveProvider(sectionId = 'nox') {
    return !!this.getActiveConfig(sectionId);
  },

  getConfiguredProviders() {
    const stored = _apikm_load();
    return Object.values(PROVIDER_DEFS)
      .filter(def => stored[def.id]?.status === 'ok')
      .map(def => ({
        ...def,
        selectedModel: stored[def.id]?.selectedModel || stored[def.id]?.models?.[0]?.id || ''
      }));
  },

  getRouting()    { return _apikm_loadRouting(); },
  saveRouting(r)  { _apikm_saveRouting(r); },

  async verifyKey(providerId, key) {
    const def = PROVIDER_DEFS[providerId];
    if (!def) throw new Error('Proveedor desconocido');

    if (!def.modelsUrl) {
      const res = await fetch(def.chatUrl(), {
        method: 'POST',
        headers: def.getHeaders(key),
        body: JSON.stringify(def.buildBody(
          def.fallbackModels[0].id,
          [{ role: 'user', content: 'hi' }],
          'You are a test.', 10
        ))
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Error ${res.status}`);
      }
      return def.fallbackModels || [];
    }

    const modelsUrl = typeof def.modelsUrl === 'function' ? def.modelsUrl(key) : def.modelsUrl;
    const res = await fetch(modelsUrl, { method: 'GET', headers: def.getHeaders(key) });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.message || `Error ${res.status}`);
    }
    const data = await res.json();
    const models = def.parseModels(data);
    return models.length ? models : (def.fallbackModels || []);
  },

  async callLLM(sectionId = 'nox', { system, messages, maxTokens } = {}) {
    const cfg = this.getActiveConfig(sectionId);
    if (!cfg) throw new Error('No hay proveedor activo configurado. Ve a API Keys para configurarlo.');

    const { provider: def, key, model } = cfg;
    const url = (def.id === 'gemini') ? def.chatUrl(key, model) : def.chatUrl();
    const res = await fetch(url, {
      method: 'POST',
      headers: def.getHeaders(key),
      body: JSON.stringify(def.buildBody(model, messages, system, maxTokens))
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error?.message || err?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return def.parseResponse(data);
  },

  openProviderPicker(sectionId = 'nox') {
    _apikm_openProviderModal(sectionId);
  }
};

/* ═══════════════════════════════════════════════════════════
   MODAL SELECTOR DE PROVEEDOR
   ═══════════════════════════════════════════════════════════ */

function _apikm_openProviderModal(sectionId) {
  document.getElementById('apikm-picker-modal')?.remove();

  const configured = ApiKeyManager.getConfiguredProviders();
  const routing = ApiKeyManager.getRouting();
  const current = routing.sections[sectionId] || '';

  const modal = document.createElement('div');
  modal.id = 'apikm-picker-modal';
  modal.className = 'apikm-overlay';
  modal.innerHTML = `
    <div class="apikm-picker-box">
      <div class="apikm-picker-header">
        <span class="apikm-picker-header-icon">${_ICON.key}</span>
        <div>
          <h3>Proveedor de IA</h3>
          <p>Selecciona el proveedor para esta sección</p>
        </div>
        <button class="apikm-close-btn" onclick="document.getElementById('apikm-picker-modal').remove()">
          ${_ICON.close}
        </button>
      </div>
      <div class="apikm-picker-body">
        ${configured.length === 0 ? `
          <div class="apikm-picker-empty">
            <div class="apikm-picker-empty-icon">${_ICON.key}</div>
            <p>No tienes proveedores configurados.</p>
            <button class="apikm-btn-primary" onclick="document.getElementById('apikm-picker-modal').remove(); window._navToApiKeys?.()">
              Ir a Gestión de API Keys
              <span class="apikm-btn-arrow">${_ICON.arrowRight}</span>
            </button>
          </div>
        ` : `
          <p class="apikm-picker-hint">Proveedores verificados disponibles:</p>
          <div class="apikm-picker-grid">
            ${configured.map(p => `
              <button class="apikm-provider-chip ${current === p.id ? 'active' : ''}"
                onclick="_apikm_selectForSection('${sectionId}', '${p.id}')"
                style="--provider-color:${p.color}">
                <span class="apikm-chip-icon" style="color:${p.color}">${p.icon}</span>
                <span class="apikm-chip-name">${p.name}</span>
                <span class="apikm-chip-model">${p.selectedModel || ''}</span>
                ${current === p.id ? `<span class="apikm-chip-check">${_ICON.check}</span>` : ''}
              </button>
            `).join('')}
          </div>
          <div class="apikm-picker-actions">
            <button class="apikm-btn-secondary" onclick="document.getElementById('apikm-picker-modal').remove(); window._navToApiKeys?.()">
              <span>${_ICON.plus}</span>
              Agregar proveedor
            </button>
          </div>
        `}
      </div>
    </div>`;
  document.body.appendChild(modal);
  let _mdOnBackdrop = false;
  modal.addEventListener('mousedown', e => { _mdOnBackdrop = (e.target === modal); });
  modal.addEventListener('click', e => { if (e.target === modal && _mdOnBackdrop) modal.remove(); _mdOnBackdrop = false; });
}

function _apikm_selectForSection(sectionId, providerId) {
  const routing = ApiKeyManager.getRouting();
  routing.sections[sectionId] = providerId;
  ApiKeyManager.saveRouting(routing);
  document.getElementById('apikm-picker-modal')?.remove();
  window.dispatchEvent(new CustomEvent('apikm:providerChanged', { detail: { sectionId, providerId } }));
  const def = PROVIDER_DEFS[providerId];
  _apikm_showToast(`Proveedor actualizado: ${def ? def.name : providerId}`);
}

/* ═══════════════════════════════════════════════════════════
   SECCIÓN DE GESTIÓN COMPLETA
   ═══════════════════════════════════════════════════════════ */

function apikm_initSection() {
  const wrap = document.getElementById('apiKeysSection');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="apikm-section">
      <div class="apikm-header">
        <div>
          <h1 class="apikm-title">Gestión de API Keys</h1>
          <p class="apikm-subtitle">Conecta múltiples proveedores de IA y configura el enrutamiento automático</p>
        </div>
      </div>
      <div class="apikm-tabs">
        <button class="apikm-tab active" onclick="apikm_switchTab('providers', this)">Proveedores</button>
        <button class="apikm-tab" onclick="apikm_switchTab('routing', this)">Enrutamiento</button>
        <button class="apikm-tab" onclick="apikm_switchTab('status', this)">Estado del Sistema</button>
      </div>
      <div id="apikm-panel-providers" class="apikm-panel">
        <div class="apikm-providers-grid" id="apikm-providers-grid"></div>
      </div>
      <div id="apikm-panel-routing" class="apikm-panel" style="display:none">
        <div class="apikm-routing-card">
          <h3 class="apikm-routing-title">Modo de enrutamiento</h3>
          <div class="apikm-routing-modes" id="apikm-routing-modes"></div>
        </div>
        <div class="apikm-routing-card">
          <h3 class="apikm-routing-title">Asignación por sección</h3>
          <p class="apikm-routing-hint">Define qué proveedor usa cada módulo de la plataforma.</p>
          <div class="apikm-section-assignments" id="apikm-section-assignments"></div>
        </div>
      </div>
      <div id="apikm-panel-status" class="apikm-panel" style="display:none">
        <div class="apikm-status-grid" id="apikm-status-grid"></div>
      </div>
    </div>`;

  apikm_renderProviders();
  apikm_renderRouting();
  apikm_renderStatus();
}

function apikm_switchTab(name, btn) {
  document.querySelectorAll('.apikm-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.apikm-panel').forEach(p => p.style.display = 'none');
  btn.classList.add('active');
  document.getElementById(`apikm-panel-${name}`).style.display = '';
}

/* ─── Proveedores ─── */

function apikm_renderProviders() {
  const grid = document.getElementById('apikm-providers-grid');
  if (!grid) return;
  const stored = _apikm_load();

  grid.innerHTML = Object.values(PROVIDER_DEFS).map(def => {
    const s = stored[def.id] || {};
    const status = s.status || 'unconfigured';
    const models = s.models || def.fallbackModels || [];
    const selectedModel = s.selectedModel || models[0]?.id || '';

    const statusClass = { ok: 'apikm-status-ok', error: 'apikm-status-error', unconfigured: 'apikm-status-none' }[status];
    const statusLabel = { ok: 'Conectado', error: 'Error', unconfigured: 'Sin configurar' }[status];
    const dotClass   = { ok: 'apikm-dot--ok', error: 'apikm-dot--error', unconfigured: 'apikm-dot--none' }[status];

    const maskedKey = s.key ? '••••••••' + s.key.slice(-4) : '';

    return `
    <div class="apikm-provider-card" id="apikm-card-${def.id}" style="--pc:${def.color}">
      <div class="apikm-card-top">
        <div class="apikm-card-icon">${def.icon}</div>
        <div class="apikm-card-info">
          <div class="apikm-card-name">${def.name}</div>
          <div class="apikm-card-docs">${def.docs}</div>
        </div>
        <div class="apikm-card-badge ${statusClass}">
          <span class="apikm-status-dot ${dotClass}"></span>
          ${statusLabel}
        </div>
      </div>

      ${status === 'ok' ? `
      <div class="apikm-card-verified-row" id="apikm-verified-${def.id}">
        <span class="apikm-verified-key">${maskedKey}</span>
        <button class="apikm-edit-key-btn" onclick="apikm_editProvider('${def.id}')">Editar clave</button>
      </div>
      <div class="apikm-card-input-row" id="apikm-input-row-${def.id}" style="display:none">
        <input type="password" class="apikm-key-input" id="apikm-key-${def.id}"
          placeholder="${def.keyPlaceholder}" value="${s.key || ''}"
          autocomplete="off" spellcheck="false">
        <button class="apikm-verify-btn" onclick="apikm_verifyProvider('${def.id}')" id="apikm-verify-${def.id}">
          Verificar
        </button>
      </div>
      ` : `
      <div class="apikm-card-input-row" id="apikm-input-row-${def.id}">
        <input type="password" class="apikm-key-input" id="apikm-key-${def.id}"
          placeholder="${def.keyPlaceholder}" value="${s.key || ''}"
          autocomplete="off" spellcheck="false">
        <button class="apikm-verify-btn" onclick="apikm_verifyProvider('${def.id}')" id="apikm-verify-${def.id}">
          Verificar
        </button>
      </div>
      `}

      ${status === 'ok' && models.length > 0 ? `
      <div class="apikm-card-model-row">
        <label class="apikm-model-label">Modelo activo:</label>
        <select class="apikm-model-select" onchange="apikm_selectModel('${def.id}', this.value)">
          ${models.map(m => `<option value="${m.id}" ${m.id === selectedModel ? 'selected' : ''}>${m.name}</option>`).join('')}
        </select>
      </div>` : ''}
      ${status === 'error' ? `
      <div class="apikm-card-error">${s.errorMsg || 'Verificación fallida. Revisa tu API key.'}</div>` : ''}
      ${status === 'ok' ? `
      <div class="apikm-card-footer">
        <span class="apikm-models-count">${models.length} modelo${models.length !== 1 ? 's' : ''} disponible${models.length !== 1 ? 's' : ''}</span>
        <button class="apikm-remove-btn" onclick="apikm_removeProvider('${def.id}')">
          <span class="apikm-remove-icon">${_ICON.trash}</span>
          Eliminar
        </button>
      </div>` : ''}
    </div>`;
  }).join('');
}

async function apikm_verifyProvider(providerId) {
  const input = document.getElementById(`apikm-key-${providerId}`);
  const btn   = document.getElementById(`apikm-verify-${providerId}`);
  const key   = input?.value?.trim();

  if (!key) {
    input?.focus();
    input?.classList.add('apikm-input-shake');
    setTimeout(() => input?.classList.remove('apikm-input-shake'), 600);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Verificando...';

  try {
    const models = await ApiKeyManager.verifyKey(providerId, key);
    const selectedModel = models[0]?.id || '';
    ApiKeyManager.save(providerId, { key, models, selectedModel, status: 'ok' });
    _apikm_showToast(`${PROVIDER_DEFS[providerId].name} conectado — ${models.length} modelos disponibles`);
    apikm_renderProviders();
    apikm_renderStatus();
    window.dispatchEvent(new CustomEvent('apikm:providerAdded', { detail: { providerId } }));
  } catch (err) {
    const existing = _apikm_load()[providerId] || {};
    ApiKeyManager.save(providerId, {
      key, models: existing.models || [],
      selectedModel: existing.selectedModel || '',
      status: 'error'
    });
    const data = _apikm_load();
    data[providerId].errorMsg = err.message;
    _apikm_save(data);
    _apikm_showToast(`Error: ${err.message}`, 'error');
    apikm_renderProviders();
  }

  btn.disabled = false;
  btn.textContent = 'Verificar';
}

function apikm_editProvider(providerId) {
  const verified = document.getElementById(`apikm-verified-${providerId}`);
  const inputRow = document.getElementById(`apikm-input-row-${providerId}`);
  if (verified) verified.style.display = 'none';
  if (inputRow) inputRow.style.display = '';
  document.getElementById(`apikm-key-${providerId}`)?.focus();
}

function apikm_selectModel(providerId, modelId) {
  const data = _apikm_load();
  if (data[providerId]) {
    data[providerId].selectedModel = modelId;
    _apikm_save(data);
    window.dispatchEvent(new CustomEvent('apikm:modelChanged', { detail: { providerId, modelId } }));
  }
}

function apikm_removeProvider(providerId) {
  const data = _apikm_load();
  delete data[providerId];
  _apikm_save(data);

  const routing = ApiKeyManager.getRouting();
  Object.keys(routing.sections).forEach(k => {
    if (routing.sections[k] === providerId) routing.sections[k] = '';
  });
  ApiKeyManager.saveRouting(routing);

  apikm_renderProviders();
  apikm_renderRouting();
  apikm_renderStatus();
  window.dispatchEvent(new CustomEvent('apikm:providerRemoved', { detail: { providerId } }));
  _apikm_showToast('Proveedor eliminado');
}

/* ─── Enrutamiento ─── */

function apikm_renderRouting() {
  const modesEl  = document.getElementById('apikm-routing-modes');
  const assignEl = document.getElementById('apikm-section-assignments');
  if (!modesEl || !assignEl) return;

  const routing    = ApiKeyManager.getRouting();
  const configured = ApiKeyManager.getConfiguredProviders();

  modesEl.innerHTML = `
    <label class="apikm-mode-option ${routing.mode === 'auto' ? 'active' : ''}">
      <input type="radio" name="apikm-mode" value="auto" ${routing.mode === 'auto' ? 'checked' : ''}
        onchange="apikm_setRoutingMode('auto')">
      <div class="apikm-mode-body">
        <div class="apikm-mode-title">Automatico</div>
        <div class="apikm-mode-desc">El sistema elige el mejor proveedor disponible según la sección.</div>
      </div>
    </label>
    <label class="apikm-mode-option ${routing.mode === 'manual' ? 'active' : ''}">
      <input type="radio" name="apikm-mode" value="manual" ${routing.mode === 'manual' ? 'checked' : ''}
        onchange="apikm_setRoutingMode('manual')">
      <div class="apikm-mode-body">
        <div class="apikm-mode-title">Manual</div>
        <div class="apikm-mode-desc">Tú decides exactamente qué proveedor usa cada sección.</div>
      </div>
    </label>`;

  const sections = [
    { id: 'nox',    label: 'NOX Agents',           icon: _ICON.cpu },
    { id: 'diseno', label: 'Diseño IA',             icon: _ICON.palette },
    { id: 'default', label: 'Por defecto (resto)',  icon: _ICON.zap }
  ];

  const providerOptions = [
    '<option value="">— Auto (mejor disponible) —</option>',
    ...configured.map(p => `<option value="${p.id}">${p.name} — ${p.selectedModel || ''}</option>`)
  ].join('');

  assignEl.innerHTML = sections.map(sec => `
    <div class="apikm-assign-row">
      <div class="apikm-assign-label">
        <span class="apikm-assign-icon">${sec.icon}</span>
        <span>${sec.label}</span>
      </div>
      <select class="apikm-assign-select" onchange="apikm_setSectionProvider('${sec.id}', this.value)">
        ${providerOptions.replace(`value="${routing.sections[sec.id] || ''}"`, `value="${routing.sections[sec.id] || ''}" selected`)}
      </select>
    </div>
  `).join('');
}

function apikm_setRoutingMode(mode) {
  const routing = ApiKeyManager.getRouting();
  routing.mode = mode;
  ApiKeyManager.saveRouting(routing);
  document.querySelectorAll('.apikm-mode-option').forEach(el => {
    el.classList.toggle('active', el.querySelector('input').value === mode);
  });
}

function apikm_setSectionProvider(sectionId, providerId) {
  const routing = ApiKeyManager.getRouting();
  routing.sections[sectionId] = providerId;
  ApiKeyManager.saveRouting(routing);
  window.dispatchEvent(new CustomEvent('apikm:providerChanged', { detail: { sectionId, providerId } }));
}

/* ─── Estado del sistema ─── */

function apikm_renderStatus() {
  const grid = document.getElementById('apikm-status-grid');
  if (!grid) return;
  const stored  = _apikm_load();
  const routing = ApiKeyManager.getRouting();

  const rows = Object.values(PROVIDER_DEFS).map(def => {
    const s      = stored[def.id] || {};
    const status = s.status || 'unconfigured';
    const model  = s.selectedModel || s.models?.[0]?.id || '—';
    const dotClass = { ok: 'apikm-dot--ok', error: 'apikm-dot--error', unconfigured: 'apikm-dot--none' }[status];
    const statusText = { ok: 'Activo', error: 'Error', unconfigured: 'No configurado' }[status];

    return `
    <div class="apikm-status-row">
      <div class="apikm-status-provider">
        <span class="apikm-status-picon" style="color:${def.color}">${def.icon}</span>
        <span class="apikm-status-name">${def.name}</span>
      </div>
      <div class="apikm-status-indicator">
        <span class="apikm-status-dot ${dotClass}"></span>
        ${statusText}
      </div>
      <div class="apikm-status-model">${status === 'ok' ? model : '—'}</div>
      <div class="apikm-status-sections">
        ${Object.entries(routing.sections)
          .filter(([, pid]) => pid === def.id)
          .map(([sid]) => `<span class="apikm-section-tag">${sid}</span>`)
          .join('') || '<span style="color:var(--color-text-muted)">—</span>'}
      </div>
    </div>`;
  }).join('');

  grid.innerHTML = `
    <div class="apikm-status-head">
      <div>Proveedor</div><div>Estado</div><div>Modelo activo</div><div>Secciones asignadas</div>
    </div>
    ${rows}`;
}

/* ─── Toast ─── */

function _apikm_showToast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = `apikm-toast apikm-toast-${type}`;
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add('apikm-toast-show'));
  setTimeout(() => { t.classList.remove('apikm-toast-show'); setTimeout(() => t.remove(), 300); }, 3200);
}

/* ─── Hook de sección ─── */

window.onSection_apikeys = function () {
  apikm_initSection();
};
