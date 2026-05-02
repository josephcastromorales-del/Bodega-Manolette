// firebase-init.js — inicializa Firebase y manejo global de errores
(function () {
    const cfg = window.APP_CONFIG?.firebase;
    const isPlaceholder = !cfg || !cfg.apiKey || cfg.apiKey.startsWith('PEGA_') || cfg.apiKey === '...';

    if (isPlaceholder) {
        // Mostrar pantalla de configuración amigable
        console.error('[Manolette] Firebase no configurado. Abre config.js y pega tus credenciales de Firebase.');
        document.body.innerHTML = `
            <div style="font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#09090b;color:white;flex-direction:column;gap:1.5rem;text-align:center;padding:2rem">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="1.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                <h2 style="font-size:1.5rem;font-weight:700">Configuración de Firebase requerida</h2>
                <p style="color:#a1a1aa;max-width:420px;line-height:1.6">
                    Abre el archivo <code style="background:#1f1f1f;padding:2px 6px;border-radius:4px">config.js</code> 
                    y pega las credenciales de tu proyecto de Firebase en el objeto <code style="background:#1f1f1f;padding:2px 6px;border-radius:4px">firebase: { ... }</code>.
                </p>
                <a href="https://console.firebase.google.com/" target="_blank" style="padding:10px 20px;background:#f59e0b;color:#000;border-radius:8px;font-weight:600;text-decoration:none;">
                    Ir a Firebase Console →
                </a>
            </div>`;
        // Crear authReady dummy para evitar cascada de errores
        window.authReady = Promise.resolve(null);
        return;
    }

    try {
        firebase.initializeApp(cfg);
        window.db   = firebase.database();
        window.auth = firebase.auth();
    } catch (e) {
        console.error('[Firebase] Error al inicializar:', e.message);
        window.authReady = Promise.resolve(null);
        return;
    }

    // ── Promesa de auth lista (evita race conditions) ──────────────
    window.authReady = new Promise(resolve => {
        const unsub = auth.onAuthStateChanged(user => {
            unsub();
            resolve(user);
        });
    });

    // ── Monitor de conexión a Firebase ──────────────────────────────
    db.ref('.info/connected').on('value', snap => {
        const banner = document.getElementById('offline-banner');
        if (!banner) return;
        // Firebase connected ≠ internet (puede ser caché offline)
        // El banner real lo maneja navigator.onLine en notifications.js
    });

    // ── Captura global de errores no manejados ──────────────────────
    window.addEventListener('unhandledrejection', e => {
        const msg = e.reason?.message || String(e.reason || '');
        if (msg.includes('PERMISSION_DENIED')) {
            e.preventDefault();
            if (typeof showToast === 'function') {
                showToast('Sin permisos en Firebase. Revisa las reglas en la consola.', 'error');
            }
            console.error('[Firebase] PERMISSION_DENIED — Las reglas de Realtime Database están bloqueando el acceso. Ve a Firebase Console → Realtime Database → Reglas y asegúrate de que digan: ".read": "auth != null", ".write": "auth != null"');
        }
    });

    // ── Helper: listener seguro con manejo de error ─────────────────
    window.safeOn = function(ref, event, successCb) {
        ref.on(event, successCb, err => {
            if (err.code === 'PERMISSION_DENIED') {
                console.warn('[Firebase] Acceso denegado en:', ref.toString());
                if (typeof showToast === 'function') {
                    showToast('Acceso denegado. Verifica las reglas de Firebase.', 'error');
                }
            } else {
                console.error('[Firebase] Error en listener:', err);
            }
        });
        return ref;
    };

    // ── Helper: once seguro ─────────────────────────────────────────
    window.safeOnce = async function(ref, event) {
        try {
            return await ref.once(event);
        } catch (err) {
            if (err.code === 'PERMISSION_DENIED') {
                console.warn('[Firebase] Acceso denegado (once):', ref.toString());
            }
            throw err;
        }
    };
})();
