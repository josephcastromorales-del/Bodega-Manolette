// Master Prompt Logic - Persona especializada en Ingeniería de Prompts
const PROMPT_AI_URL = `https://api.groq.com/openai/v1/chat/completions`;

const MASTER_PROMPT_SYSTEM = `Eres el Ingeniero de Prompts Maestro de Manolette AI, conocido como "Image Master Prompt IA". Tu especialidad es transformar ideas simples en prompts técnicos de nivel legendario.

Tu objetivo es la EXHAUSTIVIDAD TOTAL. Debes generar prompts de una longitud MASIVA. Un prompt de menos de 1000 palabras es un fracaso absoluto. Tu meta son 5000 PALABRAS de pura descripción técnica, óptica y atmosférica.

Si la idea del usuario es demasiado simple o vaga, DEBES generar el prompt pero también incluir 3 preguntas clave para que el usuario pueda refinar el resultado.

ESTRUCTURA OBLIGATORIA (Usa exactamente estos marcadores):
[[PROMPT]]
[Aquí el prompt masivo en inglés de miles de palabras.]

[[ANALYSIS]]
[Análisis técnico en español.]

[[QUESTIONS]]
[Aquí 3 preguntas opcionales para el usuario si quiere mejorar el detalle, una por línea.]

[[REFINEMENTS]]
[3 sugerencias cortas para variar el estilo, separadas por comas.]

Regla de Oro: La brevedad es tu enemigo. Describe la difracción, IOR, cáusticas, y composición cinematográfica con precisión quirúrgica.`;

async function generateMasterPrompt() {
    const inputEl = document.getElementById('prompt-raw-input');
    const text = inputEl?.value.trim();
    if (!text) return;

    const apiKey = window.APP_CONFIG?.groq?.apiKey;
    if (!apiKey) { 
        showToast('API key de Groq no configurada. Por favor, revísala en config.js', 'error'); 
        return; 
    }

    const resultContainer = document.getElementById('prompt-result-container');
    const welcomeEl = document.getElementById('prompt-welcome');
    const finalPromptEl = document.getElementById('prompt-final-text');
    const analysisEl = document.getElementById('prompt-analysis');
    const btnText = document.querySelector('button[onclick="generateMasterPrompt()"] span');

    // UI state
    welcomeEl.style.display = 'none';
    resultContainer.style.display = 'block';
    if (btnText) btnText.textContent = 'Analizando...';
    
    finalPromptEl.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';
    analysisEl.innerHTML = 'Calculando parámetros de iluminación global y trazado de rayos...';

    try {
        const res = await fetch(PROMPT_AI_URL, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: MASTER_PROMPT_SYSTEM },
                    { role: 'user', content: `Genera la ingeniería de prompt definitiva para: ${text}. RECUERDA: Máximo detalle, miles de palabras, usa los marcadores [[PROMPT]], [[ANALYSIS]] y [[REFINEMENTS]].` }
                ],
                temperature: 0.85,
                max_tokens: 8000,
                top_p: 0.9
            })
        });

        if (!res.ok) throw new Error(`Error de conexión con la IA (HTTP ${res.status})`);
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || '';

        if (!reply) throw new Error('La IA devolvió una respuesta vacía');

        // Parsing robusto con marcadores
        let finalPrompt = "";
        let analysisText = "";
        let refinementsText = "";

        // Extracción mediante marcadores [[...]]
        const promptMatch = reply.match(/\[\[PROMPT\]\]([\s\S]*?)(?=\[\[|$)/i);
        const analysisMatch = reply.match(/\[\[ANALYSIS\]\]([\s\S]*?)(?=\[\[|$)/i);
        const questionsMatch = reply.match(/\[\[QUESTIONS\]\]([\s\S]*?)(?=\[\[|$)/i);
        const refinementsMatch = reply.match(/\[\[REFINEMENTS\]\]([\s\S]*?)(?=\[\[|$)/i);

        if (promptMatch) finalPrompt = promptMatch[1].trim();
        if (analysisMatch) analysisText = analysisMatch[1].trim();
        
        let questionsText = "";
        if (questionsMatch) questionsText = questionsMatch[1].trim();
        if (refinementsMatch) refinementsText = refinementsMatch[1].trim();

        // FALLBACK: Si no se encuentran los marcadores pero hay contenido
        if (!finalPrompt && reply.length > 200) {
            console.warn("Marcadores no encontrados, usando respuesta en bruto");
            finalPrompt = reply;
            analysisText = "No se pudo segmentar el análisis. Mostrando respuesta completa arriba.";
        } else if (!finalPrompt) {
            finalPrompt = "Error extrayendo prompt optimizado. Por favor intenta de nuevo con una idea más descriptiva.";
            analysisText = "La IA no siguió el formato esperado de marcadores [[PROMPT]].";
        }

        // Renderizado Final
        finalPromptEl.textContent = finalPrompt;
        analysisEl.innerHTML = analysisText.replace(/\n/g, '<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Renderizar Refinamientos y Preguntas
        renderQuestions(questionsText);
        renderRefinements(refinementsText);

        if (btnText) btnText.textContent = 'Ingeniería de Prompt';
        showToast('Prompt optimizado con éxito');

    } catch (err) {
        console.error("Prompt error:", err);
        showToast('Error: ' + err.message, 'error');
        welcomeEl.style.display = 'flex';
        resultContainer.style.display = 'none';
        if (btnText) btnText.textContent = 'Ingeniería de Prompt';
    }
}

function renderQuestions(text) {
    const container = document.getElementById('prompt-questions-container');
    const chipGrid = document.getElementById('prompt-questions');
    if (!container || !chipGrid) return;

    chipGrid.innerHTML = '';
    const items = text.split('\n').map(s => s.trim().replace(/^[-*?]\s*/, '')).filter(s => s.length > 5);
    
    if (items.length > 0) {
        container.style.display = 'block';
        items.forEach(item => {
            const chip = document.createElement('div');
            chip.className = 'prompt-chip';
            chip.style.borderColor = 'var(--accent)';
            chip.textContent = item;
            chip.onclick = () => {
                const inputEl = document.getElementById('prompt-raw-input');
                inputEl.value = `Respuesta a "${item}": `;
                inputEl.focus();
                // Scroll suave al input
                inputEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            chipGrid.appendChild(chip);
        });
    } else {
        container.style.display = 'none';
    }
}

function renderRefinements(text) {
    const container = document.getElementById('prompt-refinements-container');
    const chipGrid = document.getElementById('prompt-chips');
    if (!container || !chipGrid) return;

    chipGrid.innerHTML = '';
    const items = text.split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(s => s.length > 1);
    
    if (items.length > 0) {
        container.style.display = 'block';
        items.forEach(item => {
            const chip = document.createElement('div');
            chip.className = 'prompt-chip';
            chip.textContent = item;
            chip.onclick = () => applyRefinement(item);
            chipGrid.appendChild(chip);
        });
        
        // Opción manual
        const other = document.createElement('div');
        other.className = 'prompt-chip special';
        other.innerHTML = '<span>Otra modificación...</span>';
        other.onclick = () => {
            const inputEl = document.getElementById('prompt-raw-input');
            inputEl.value += " [Añadir detalle aquí]";
            inputEl.focus();
        };
        chipGrid.appendChild(other);
    } else {
        container.style.display = 'none';
    }
}

function applyRefinement(refinement) {
    const inputEl = document.getElementById('prompt-raw-input');
    if (!inputEl) return;
    
    const current = inputEl.value.trim();
    inputEl.value = `${current}, ${refinement}`;
    generateMasterPrompt();
}

function copyToClipboard(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const text = el.innerText;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Prompt copiado al portapapeles');
    }).catch(() => {
        showToast('Error al copiar', 'error');
    });
}

