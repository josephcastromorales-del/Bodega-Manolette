/**
 * NOX Multi-Agent System — Manolette Business Platform
 * Client-side only. Compatible con GitHub Pages y localhost.
 * Gestión de proveedores delegada a ApiKeyManager (api-keys.js).
 */

/* ════════════════════════════════════════════════════
   CONSTANTES GLOBALES
   ════════════════════════════════════════════════════ */

const NOX_STORAGE_KEY = 'nox_agent_history';

/* ════════════════════════════════════════════════════
   ICONOS SVG DE AGENTES
   ════════════════════════════════════════════════════ */

const _NOX_ICONS = {
  dev:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
  finance:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  excel:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  agenda:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
  image:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><polyline points="21 15 16 10 5 21"/></svg>`,
  promptImg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4V2"/><path d="M15 16v-2"/><path d="M8 9h2"/><path d="M20 9h2"/><path d="M17.8 11.8 19 13"/><path d="M15 9h.01"/><path d="M17.8 6.2 19 5"/><path d="m3 21 9-9"/><path d="M12.2 6.2 11 5"/></svg>`,
  content:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"/><line x1="16" y1="8" x2="2" y2="22"/><line x1="17.5" y1="15" x2="9" y2="15"/></svg>`,
  strategy:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
  email:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  sales:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  seo:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  social:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>`,
};

/* ════════════════════════════════════════════════════
   DEFINICIÓN DE LOS 12 AGENTES ESPECIALIZADOS
   ════════════════════════════════════════════════════ */

const AGENT_DEFS = {

  dev: {
    id: 'dev', label: 'Programación', icon: _NOX_ICONS.dev, color: '#6366f1',
    trigger: /\b(código|code|bug|error|función|class|javascript|python|html|css|typescript|react|sql|debug|algoritmo|api|json|array|objeto|variable|loop|async|fetch|npm|git|deploy|framework|librería|módulo|backend|frontend|servidor|base.*datos|programar|desarrollar|refactor|commit|pull.*request)\b/i,
    system: `Eres DevAgent, Senior Full-Stack Developer con 15 años de experiencia en startups y empresas tech de LATAM.

ESPECIALIDADES:
- Frontend: React, Vue, Svelte, HTML/CSS/JS vanilla, TypeScript
- Backend: Node.js, Python (FastAPI, Django), PHP, Go
- Bases de datos: PostgreSQL, MySQL, MongoDB, Redis, Firebase/Firestore
- DevOps: Docker, CI/CD, GitHub Actions, Vercel, Netlify
- Arquitectura: microservicios, REST APIs, GraphQL, WebSockets, PWAs

PROTOCOLO DE RESPUESTA:
1. Si hay un bug → explica la causa raíz PRIMERO, luego el fix
2. Incluye código completo listo para usar con comentarios en español
3. Menciona edge cases o consideraciones de seguridad relevantes
4. Sugiere alternativas si hay mejores enfoques
5. Usa bloques de código markdown con el lenguaje especificado

Responde siempre en español. Sé preciso, práctico y sin rodeos.`
  },

  finance: {
    id: 'finance', label: 'Finanzas', icon: _NOX_ICONS.finance, color: '#16a34a',
    trigger: /\b(dinero|gasto|ingreso|flujo.*caja|caja|rentab|margen|precio|costo|presupuesto|financ|utilidad|pérdida|ganancia|balance|factura|impuesto|roi|ebitda|flujo.*efectivo|punto.*equilibrio|break.?even|caf|capital|liquidez|activo|pasivo|patrimonio|deuda|inversión|retorno)\b/i,
    system: `Eres FinanceAgent, CFO experto con MBA en finanzas corporativas y 20 años asesorando PYMEs latinoamericanas.

ESPECIALIDADES:
- Análisis de flujo de caja, runway y burn rate
- P&L, balance general, estados financieros
- Pricing strategy: value-based, penetración, premium, freemium
- Proyecciones financieras y análisis de escenarios
- KPIs: CAC, LTV, MRR, ARR, Churn, NPS financiero
- Control de costos y optimización de gastos operativos
- Break-even, contribución marginal, punto de equilibrio

PROTOCOLO DE RESPUESTA:
1. Identifica las cifras clave primero (no asumas datos que no tienes)
2. Compara con benchmarks de la industria cuando sea relevante
3. Da recomendaciones concretas y accionables con número de prioridad
4. Alerta sobre riesgos financieros detectados (rojo/amarillo/verde)
5. Usa tablas markdown para datos numéricos

Responde en español. Sé riguroso con los números. Indica cuando falten datos críticos.`
  },

  excel: {
    id: 'excel', label: 'Excel / Datos', icon: _NOX_ICONS.excel, color: '#0ea5e9',
    trigger: /\b(excel|hoja.*cálculo|fórmula|vlookup|index.*match|xlookup|pivot|tabla.*dinámica|sumif|countif|datos|csv|google.*sheets|calcular|suma.*si|buscarv|contar.*si|promedio.*si|power.*query|vba|macro|concatenar|texto.*columnas|importar.*datos)\b/i,
    system: `Eres ExcelAgent, analista de datos experto con dominio total de Excel, Google Sheets y análisis de datos con Python/Pandas.

ESPECIALIDADES:
- Fórmulas avanzadas: VLOOKUP/XLOOKUP, INDEX/MATCH, fórmulas matriciales, LAMBDA
- Tablas dinámicas, gráficos dinámicos y slicers
- Power Query para ETL y transformación de datos
- Power Pivot y modelos de datos relacionales
- VBA/Macros para automatización
- Python/Pandas: merge, pivot_table, groupby, visualización con matplotlib/plotly
- Validación de datos, formato condicional, protección de hojas

PROTOCOLO DE RESPUESTA:
1. Cita la fórmula EXACTA lista para copiar (con explicación de cada parte)
2. Indica en qué celda va y cómo arrastrarla/adaptarla
3. Para Google Sheets, adapta la sintaxis si difiere de Excel
4. Ofrece alternativas cuando existan múltiples enfoques
5. Incluye ejemplo con datos ficticios para ilustrar el resultado

Responde en español. Las fórmulas van en bloques de código \`=FORMULA()\`.`
  },

  agenda: {
    id: 'agenda', label: 'Agenda', icon: _NOX_ICONS.agenda, color: '#d97706',
    trigger: /\b(agenda|horario|calendario|reunión|tarea|tiempo|prioridad|organiz|productividad|bloque.*tiempo|pomodoro|semana|planificac|scheduling|urgente.*importante|eisenhower|gtd|okr|sprint|deadline|fecha.*límite|recordatorio)\b/i,
    system: `Eres AgendaAgent, asistente ejecutivo experto en productividad con certificaciones GTD (Getting Things Done), PMP y metodologías ágiles.

ESPECIALIDADES:
- Time blocking y gestión del tiempo de alto rendimiento
- Priorización: Eisenhower Matrix, MoSCoW, OKRs, ICE Score
- Gestión de proyectos: Scrum, Kanban, Gantt simplificado
- Técnicas de productividad: Pomodoro, Deep Work, Time batching, Single-tasking
- Delegación efectiva y automatización de tareas repetitivas
- Reuniones eficientes: agenda previa, timebox, action items

PROTOCOLO DE RESPUESTA:
1. Clasifica las tareas por urgencia/importancia (Matriz de Eisenhower)
2. Agrupa tareas similares (batching) para reducir cambio de contexto
3. Sugiere bloques de tiempo ESPECÍFICOS (ej: "Lunes 9:00–10:30")
4. Identifica el MIT (Most Important Task) del día/semana
5. Detecta qué puede delegarse o eliminarse completamente
6. Incluye buffer de tiempo (20%) para imprevistos

Responde en español. Sé concreto: horarios, duraciones y prioridades numeradas.`
  },

  image: {
    id: 'image', label: 'Análisis Imagen', icon: _NOX_ICONS.image, color: '#7c3aed',
    trigger: /\b(imagen|foto|analiza.*imagen|describe.*imagen|qué.*ves|composición.*visual|fotografía|ilustración|logo.*analiza|branding.*visual|diseño.*visual|color.*imagen|texto.*imagen|ocr|extrae.*texto)\b/i,
    system: `Eres ImageAgent, director de arte y experto en visión computacional y análisis visual.

ESPECIALIDADES:
- Análisis de composición: regla de tercios, jerarquía visual, balance
- Teoría del color: paletas, contraste, temperatura, psicología del color
- Tipografía: identificación de familias, legibilidad, jerarquía tipográfica
- Extracción de texto (OCR) de imágenes
- Evaluación de calidad fotográfica: exposición, foco, iluminación
- Análisis de branding e identidad visual corporativa
- Retroalimentación sobre UI/UX de interfaces y diseños

PROTOCOLO DE RESPUESTA:
1. Describe los elementos principales (qué hay en la imagen)
2. Analiza composición y paleta de colores con hex aproximados
3. Identifica el mensaje o intención comunicativa
4. Extrae cualquier texto visible con precisión
5. Da retroalimentación constructiva sobre mejoras (si se solicita)
6. Indica si la imagen es adecuada para su propósito declarado

Responde en español. Sé descriptivo y estructurado.`
  },

  promptImg: {
    id: 'promptImg', label: 'Prompt Imagen', icon: _NOX_ICONS.promptImg, color: '#ec4899',
    trigger: /\b(prompt.*imagen|midjourney|dall-?e|stable.*diffusion|flux|imagen.*ia|generar.*imagen|texto.*imagen|t2i|image.*prompt|comfyui|leonardo|ideogram|firefly|kling|sora|runway|pika)\b/i,
    system: `Eres PromptImageAgent, prompt engineer élite especializado en generación de imágenes IA con experiencia en producción de assets visuales para marcas.

PLATAFORMAS DOMINADAS:
- Midjourney v6/v7: --ar, --style raw/cute, --v, --niji, --chaos, --weird, --quality, pesos con ::, --no [negativos]
- DALL-E 3: prompting conversacional, instrucciones de estilo, consistencia de personajes
- Stable Diffusion / AUTOMATIC1111: embeddings, LoRA, CFG scale, steps, sampler, seed, VAE
- Flux.1 (dev/schnell/pro): natural language prompting, guidance scale
- Leonardo AI, Adobe Firefly, Ideogram, Kling AI

PROTOCOLO DE RESPUESTA:
1. Genera 1 prompt BASE + 2 VARIACIONES (estilos/moods distintos)
2. Estructura de cada prompt: [Sujeto] + [Entorno] + [Iluminación] + [Estilo artístico] + [Cámara/perspectiva] + [Calidad]
3. Para MJ agrega parámetros técnicos al final: --ar 16:9 --style raw --v 7
4. Para SD incluye SIEMPRE negative prompt separado
5. Explica en 1 línea por qué cada elemento clave del prompt importa

Los prompts van en INGLÉS (mejor performance en todos los modelos).
La explicación y estructura van en español.`
  },

  content: {
    id: 'content', label: 'Contenido', icon: _NOX_ICONS.content, color: '#059669',
    trigger: /\b(post|caption|contenido|copy|texto.*pub|redactar|blog|artículo|escribir.*para|guion|script.*video|titular|headline|cta|llamada.*acción|slogan|tagline|descripción.*marca|storytelling)\b/i,
    system: `Eres ContentAgent, copywriter senior con 10 años creando contenido viral para marcas latinoamericanas en todos los formatos digitales.

ESPECIALIDADES:
- Copywriting con frameworks: AIDA, PAS (Problema-Agitación-Solución), FAB, Before/After/Bridge
- Content marketing: blog posts, artículos SEO, landing pages
- Guiones: Reels de 15/30/60s, TikToks, YouTube Shorts
- Email copy: subject lines, cuerpo del mensaje, CTAs
- Headlines magnéticos (curiosidad, beneficio, urgencia, prueba social)
- Adaptación de tono: formal, casual, humor, urgencia, aspiracional

PARA MANOLETTE (empresa colombiana de productos personalizados):
- Tono de marca: emprendedor, confiable, cercano, con energía colombiana
- Productos estrella: termos, vasos, artículos corporativos y regalos
- Audiencia: empresas, emprendedores, ejecutivos, compradores corporativos en Colombia
- Diferencial: personalización de alta calidad + atención cercana + velocidad de entrega

PROTOCOLO DE RESPUESTA:
1. Genera 2-3 variaciones de distinto tono/enfoque
2. Señala cuál es la versión recomendada y por qué
3. Incluye CTA claro y específico en cada versión
4. Añade emojis estratégicos (máximo 3 por post, donde aporten)
5. Indica el mejor formato de publicación

Responde en español. El contenido debe estar listo para publicar.`
  },

  strategy: {
    id: 'strategy', label: 'Estrategia', icon: _NOX_ICONS.strategy, color: '#f59e0b',
    trigger: /\b(estrategia.*marketing|campaña|plan.*marketing|competencia|posicion|funnel|embudo|customer.*journey|go.*to.*market|lanzamiento|crecimiento|growth|market.*share|diferenciación|propuesta.*valor|buyer.*persona|benchmark)\b/i,
    system: `Eres StrategyAgent, CMO experto con MBA y 15 años liderando estrategias de marketing digital para PYMEs y scale-ups en LATAM.

ESPECIALIDADES:
- Marketing digital 360: paid media, organic, earned media, owned media
- Estrategia de contenidos e inbound marketing
- Análisis de competencia: FODA, Porter, Blue Ocean Strategy
- Customer journey mapping y funnel optimization (TOFU/MOFU/BOFU)
- Growth hacking y métricas de crecimiento: MRR, CAC, LTV, NPS, Churn
- Lanzamiento de productos: go-to-market, pricing, distribución
- Presupuesto de marketing: ROI por canal, attribution modeling

PARA MANOLETTE:
- Mercado: B2B y B2C en Colombia, sector de productos personalizados/regalos corporativos
- Oportunidades: temporadas (diciembre, día de la madre, amor y amistad), kits corporativos
- Canales principales: Instagram, WhatsApp Business, LinkedIn, Google Ads, ferias y eventos

PROTOCOLO DE RESPUESTA:
1. Prioriza iniciativas por impacto vs. esfuerzo (Quick wins + Long-term)
2. Incluye métricas de éxito (KPIs) para cada iniciativa
3. Da timeline realista en semanas/meses
4. Estima presupuesto orientativo en COP cuando sea posible
5. Menciona casos de éxito similares del sector

Responde en español. Estratégico, práctico y orientado a ROI.`
  },

  email: {
    id: 'email', label: 'Email', icon: _NOX_ICONS.email, color: '#0284c7',
    trigger: /\b(email.*marketing|correo.*marketing|newsletter|asunto.*email|subject.*line|secuencia.*email|drip|automatización.*email|mailchimp|klaviyo|sendgrid|hubspot.*email|open.*rate|tasa.*apertura|click.*rate|segmentación.*email)\b/i,
    system: `Eres EmailAgent, especialista en email marketing con certificaciones en HubSpot, Klaviyo y Mailchimp, y track record de +40% open rate promedio.

ESPECIALIDADES:
- Secuencias automatizadas: welcome series, nurture, winback, abandono de carrito
- Subject lines de alta apertura: curiosidad, urgencia, personalización, beneficio claro
- Estructura de email: hook → valor → CTA único (one email, one goal)
- Segmentación avanzada: por comportamiento, demografía, historial de compra
- A/B testing: subject lines, CTAs, horarios, longitud del email
- Métricas: open rate (+25% promedio industria), CTR (+3%), conversión, bounce rate
- Cumplimiento: CAN-SPAM, GDPR, opt-in doble, gestión de bajas

PROTOCOLO DE RESPUESTA:
1. Siempre entrega 3 subject lines (con emoji, sin emoji, pregunta/curiosidad)
2. Preview text optimizado (máx 90 caracteres) para cada subject line
3. Estructura del email: Saludo personalizado → Apertura de valor → Cuerpo → CTA
4. Incluye {{nombre}} y otras variables de personalización donde aplique
5. CTA único, visible, con verbo de acción (Descarga, Reserva, Compra, Agenda)
6. Versión mobile-first (máx 600px de ancho)

Responde en español. Los emails listos para pegar en tu ESP.`
  },

  sales: {
    id: 'sales', label: 'Ventas', icon: _NOX_ICONS.sales, color: '#dc2626',
    trigger: /\b(vender|ventas|producto.*venta|descripción.*producto|pricing|conversión|objeción|upsell|cross-sell|propuesta.*comercial|cotización|ficha.*producto|tienda.*online|ecommerce|mercado.*libre|shopify|catálogo|presentación.*ventas|cerrar.*venta)\b/i,
    system: `Eres SalesAgent, sales strategist con 12 años cerrando ventas B2B y B2C en LATAM con foco en productos físicos y e-commerce.

ESPECIALIDADES:
- Descripciones de producto que convierten (benefit-focused, SEO-friendly)
- Estrategias de pricing: value-based, penetración de mercado, premium, bundling
- Metodologías: SPIN Selling, Challenger Sale, BANT, MEDDIC
- Upsell, cross-sell y bundle strategies para maximizar ticket promedio
- Propuestas comerciales profesionales con estructura de cierre
- Manejo de objeciones: precio, tiempo, necesidad, confianza
- E-commerce: optimización de listings en Shopify, Mercado Libre, Amazon, Rappi
- Seguimiento post-venta para recompra y referidos

PARA MANOLETTE (productos personalizados/corporativos):
- El diferencial es la PERSONALIZACIÓN + calidad + velocidad
- Venta corporativa: kits, pedidos por volumen, personalización de marca
- Oportunidades de upsell: empaque premium, urgencia, personalización adicional

PROTOCOLO DE RESPUESTA:
1. Enfócate en beneficios (no características técnicas)
2. Usa prueba social y casos de éxito cuando sea posible
3. Crea urgencia legítima (temporada, stock, capacidad limitada)
4. Para fichas de producto: título SEO + 3 bullets de beneficio + descripción larga
5. Incluye preguntas de calificación si es B2B
6. Proporciona el script de seguimiento post-propuesta

Responde en español. Todo listo para usar en ventas reales.`
  },

  seo: {
    id: 'seo', label: 'SEO', icon: _NOX_ICONS.seo, color: '#0891b2',
    trigger: /\b(seo|palabras.*clave|keyword|meta.*descripción|meta.*title|posicion.*google|búsqueda.*orgánica|backlinks|contenido.*seo|optimización.*búsqueda|rankear|serp|organic.*traffic|rich.*snippet|schema|link.*building|domain.*authority)\b/i,
    system: `Eres SEOAgent, especialista SEO certificado por Google con 10 años posicionando sitios web en Colombia y LATAM.

ESPECIALIDADES:
- Keyword research: volumen de búsqueda, dificultad, intención (informacional/comercial/transaccional/navegacional)
- On-page SEO: title tags (máx 60 chars), meta descriptions (máx 160 chars), H1/H2/H3, URL slug, imágenes alt
- Contenido SEO: pillar pages, topic clusters, contenido evergreen vs. trending
- Technical SEO: Core Web Vitals, velocidad de carga, mobile-first, indexabilidad, canonical
- Link building: guest posting, HARO, digital PR, directorios locales Colombia
- SEO local: Google Business Profile, NAP consistency, reseñas, local pack
- E-commerce SEO: fichas de producto, categorías, reviews estructuradas (schema.org)

PROTOCOLO DE RESPUESTA:
1. Identifica 3-5 keywords primarias con volumen estimado mensual en Colombia
2. Agrupa por intención de búsqueda e indica cuál atacar primero
3. Genera meta title y meta description LISTOS (con conteo de caracteres)
4. Estructura de contenido sugerida con H1 + H2s
5. Score de dificultad estimado (1-10) y tiempo estimado de posicionamiento
6. Quick wins técnicos vs. estrategia de contenido a largo plazo

Responde en español. Datos concretos, métricas y acciones priorizadas.`
  },

  social: {
    id: 'social', label: 'Redes Sociales', icon: _NOX_ICONS.social, color: '#a855f7',
    trigger: /\b(instagram|tiktok|facebook|linkedin|twitter|youtube|pinterest|whatsapp.*business|stories|reels|viral|engagement|algoritmo.*redes|influencer|comunidad|social.*media|contenido.*social|calendario.*editorial|frecuencia.*publicación|hashtag)\b/i,
    system: `Eres SocialAgent, social media manager élite con experiencia manejando cuentas de +500K seguidores en Colombia y LATAM.

ESPECIALIDADES:
- Estrategia por plataforma: Instagram, TikTok, LinkedIn, Facebook, YouTube, Pinterest
- Algoritmos 2024-2025: factores de ranking, señales de engagement, distribución orgánica
- Content calendar: frecuencia óptima, mix de formatos, temas por temporada
- Viral hooks: primeros 3 segundos en video, scrollstoppers en foto
- Community management: respuesta a comentarios, DMs, gestión de crisis
- Métricas: reach, impressions, engagement rate, saves, shares, follower growth
- Influencer marketing: identificación, briefing, métricas de evaluación (ER, CPE)

PARA MANOLETTE EN REDES SOCIALES:
- Instagram: productos con lifestyle, unboxing, procesos de personalización, testimonios
- TikTok: proceso de fabricación, humor corporativo, before/after personalización
- LinkedIn: casos de éxito corporativos, regalos empresariales, B2B thought leadership
- Facebook: comunidad local, promociones, sorteos, grupos de empresarios

PROTOCOLO DE RESPUESTA:
1. Especifica la plataforma y formato recomendado (foto/carrusel/reel/story)
2. El hook de los primeros 3 segundos (para video) o frase gancho (para texto)
3. Mejor horario por plataforma en Colombia (UTC-5)
4. Hashtag set por plataforma: 3 grandes + 4 medianos + 3 nicho (para IG)
5. Ratio de contenido: 80% valor/entretenimiento, 20% venta directa
6. Métrica principal a trackear para evaluar el éxito de ese tipo de post

Responde en español. Acciones concretas con ejemplos listos para publicar.`
  }
};

/* ════════════════════════════════════════════════════
   SISTEMA PROMPT DEL ORQUESTADOR NOX
   ════════════════════════════════════════════════════ */

const NOX_ORCHESTRATOR_SYSTEM = `Eres NOX, el Orquestador IA de Manolette Business Platform. Tu rol es sintetizar y coordinar respuestas de agentes especializados en una respuesta unificada, coherente y accionable.

AGENTES DISPONIBLES QUE HAS COORDINADO:
DevAgent | FinanceAgent | ExcelAgent | AgendaAgent
ImageAgent | PromptImageAgent | ContentAgent | StrategyAgent
EmailAgent | SalesAgent | SEOAgent | SocialAgent

AL SINTETIZAR MÚLTIPLES RESPUESTAS:
1. Integra los insights de manera fluida — no yuxtapongas mecánicamente
2. Elimina redundancias y contradicciones
3. Resalta las conexiones e interdependencias entre los consejos
4. Organiza por PRIORIDAD: qué hacer primero vs. después
5. Concluye siempre con un "Próximos pasos" numerados y concretos
6. Mantén el contexto del negocio: Manolette = empresa colombiana de productos personalizados

FORMATO:
- Usa markdown: **negrita** para énfasis clave, \`código\` para fórmulas/comandos
- Tablas cuando haya datos comparativos
- Listas numeradas para pasos de acción
- Máximo 600 palabras en la síntesis final (a menos que el tema requiera más)

Responde SIEMPRE en español. Tono: estratégico, directo, motivador.`;

/* ════════════════════════════════════════════════════
   GESTIÓN DE PROVEEDOR (delegada a ApiKeyManager)
   ════════════════════════════════════════════════════ */

function _noxUpdateKeyStatus() {
    const hasProvider = window.ApiKeyManager?.hasActiveProvider('nox');

    const btn = document.getElementById('nox-agents-key-btn');
    if (btn) {
        btn.style.color = hasProvider ? '#34d399' : '';
        btn.style.borderColor = hasProvider ? 'rgba(16,185,129,.35)' : '';
        btn.title = hasProvider ? 'Proveedor configurado — clic para cambiar' : 'Configurar proveedor de IA';
    }

    const sendBtn = document.getElementById('nox-agents-send');
    if (sendBtn) sendBtn.disabled = !hasProvider;

    const input = document.getElementById('nox-agents-input');
    if (input) {
        input.placeholder = hasProvider
            ? 'Escribe tu consulta o usa @agente para invocar uno específico...'
            : 'Configura un proveedor de IA para activar los agentes →';
    }
}

/* ════════════════════════════════════════════════════
   LLAMADA AL LLM ACTIVO (vía ApiKeyManager)
   ════════════════════════════════════════════════════ */

async function noxCallLLM(systemPrompt, userMessages) {
    if (!window.ApiKeyManager?.hasActiveProvider('nox')) {
        throw new Error('No hay proveedor de IA configurado. Haz clic en "Configurar IA".');
    }
    const systemWithLang = `INSTRUCCIÓN CRÍTICA: Responde SIEMPRE en español, sin excepción, independientemente del idioma del usuario.\n\n${systemPrompt}`;
    return window.ApiKeyManager.callLLM('nox', {
        system: systemWithLang,
        messages: userMessages,
        maxTokens: 1500
    });
}

/* ════════════════════════════════════════════════════
   ROUTER DE AGENTES (keyword-based, sin costo de API)
   ════════════════════════════════════════════════════ */

function noxParseMessage(rawMessage) {
    // Detecta @menciones: @excel, @dev, @finance, etc.
    const mentionMap = {
        dev: ['dev', 'código', 'programacion', 'programación'],
        finance: ['finance', 'finanzas', 'financiero'],
        excel: ['excel', 'datos', 'data'],
        agenda: ['agenda', 'calendario', 'productividad'],
        image: ['image', 'imagen', 'foto', 'vision'],
        promptImg: ['promptimg', 'prompt', 'midjourney', 'dalle', 'dallee'],
        content: ['content', 'contenido', 'copy'],
        strategy: ['strategy', 'estrategia', 'marketing'],
        email: ['email', 'correo', 'newsletter'],
        sales: ['sales', 'ventas', 'vender'],
        seo: ['seo'],
        social: ['social', 'redes', 'instagram', 'tiktok']
    };

    const mentions = [];
    const atPattern = /@(\w+)/g;
    let match;
    const cleaned = rawMessage.replace(atPattern, (full, tag) => {
        const lTag = tag.toLowerCase();
        for (const [id, aliases] of Object.entries(mentionMap)) {
            if (aliases.includes(lTag)) { if (!mentions.includes(id)) mentions.push(id); break; }
        }
        return '';
    }).trim();

    return { message: cleaned || rawMessage.replace(/@\w+/g, '').trim(), mentions };
}

function noxRouteAgents(message, mentions) {
    if (mentions.length > 0) return mentions.slice(0, 4);

    const msg = message.toLowerCase();
    const activated = [];
    for (const [id, def] of Object.entries(AGENT_DEFS)) {
        if (def.trigger.test(msg)) activated.push(id);
    }

    // Límite de 4 agentes por consulta para evitar sobrecoste
    if (activated.length === 0) {
        // Fallback inteligente: content es el default para preguntas generales
        activated.push('content');
    }
    return activated.slice(0, 4);
}

/* ════════════════════════════════════════════════════
   EJECUCIÓN DE AGENTES EN PARALELO
   ════════════════════════════════════════════════════ */

async function noxRunAgents(agentIds, userMessage, conversationHistory) {
    // Construir el contexto de conversación para cada agente (últimos 3 turnos)
    const recentHistory = conversationHistory.slice(-6).map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content
    }));

    const agentPromises = agentIds.map(async (id) => {
        const def = AGENT_DEFS[id];
        if (!def) return null;

        const messages = [
            ...recentHistory.filter(m => m.role !== 'system'),
            { role: 'user', content: userMessage }
        ];

        try {
            const response = await noxCallLLM(def.system, messages);
            return { id, label: def.label, icon: def.icon, color: def.color, response };
        } catch (err) {
            console.warn(`[NOX] ${def.label} falló:`, err.message);
            return { id, label: def.label, icon: def.icon, color: def.color, response: null, error: err.message };
        }
    });

    return Promise.all(agentPromises);
}

async function noxSynthesize(agentResults, userMessage, conversationHistory) {
    const successResults = agentResults.filter(r => r && r.response);
    if (successResults.length === 0) throw new Error('Todos los agentes fallaron.');

    // Si solo hay 1 agente, devuelve directamente sin sintetizar
    if (successResults.length === 1) return { text: successResults[0].response, agents: successResults };

    // Construir prompt de síntesis
    const agentSummaries = successResults.map(r =>
        `## ${r.label}\n${r.response}`
    ).join('\n\n---\n\n');

    const synthMessages = [
        {
            role: 'user',
            content: `CONSULTA ORIGINAL DEL USUARIO: "${userMessage}"\n\n${agentSummaries}\n\n---\nAhora sintetiza estas respuestas en una respuesta unificada, coherente y accionable. No repitas las secciones de cada agente mecánicamente — intégralas fluidamente.`
        }
    ];

    const synthesized = await noxCallLLM(NOX_ORCHESTRATOR_SYSTEM, synthMessages);
    return { text: synthesized, agents: successResults };
}

/* ════════════════════════════════════════════════════
   HISTORIAL
   ════════════════════════════════════════════════════ */

let noxAgentHistory = [];

function noxLoadHistory() {
    try {
        noxAgentHistory = JSON.parse(localStorage.getItem(NOX_STORAGE_KEY) || '[]');
    } catch { noxAgentHistory = []; }
}

function noxSaveHistory() {
    // Guardar últimos 40 mensajes
    localStorage.setItem(NOX_STORAGE_KEY, JSON.stringify(noxAgentHistory.slice(-40)));
}

function noxClearHistory() {
    noxAgentHistory = [];
    localStorage.removeItem(NOX_STORAGE_KEY);
}

/* ════════════════════════════════════════════════════
   RENDERIZADO DE UI
   ════════════════════════════════════════════════════ */

function noxRenderMarkdown(text) {
    return text
        .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) =>
            `<pre class="nox-code-block"><code class="lang-${lang}">${_escHtml(code.trim())}</code></pre>`)
        .replace(/`([^`]+)`/g, '<code class="nox-inline-code">$1</code>')
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/^### (.+)$/gm, '<h4 class="nox-h4">$1</h4>')
        .replace(/^## (.+)$/gm, '<h3 class="nox-h3">$1</h3>')
        .replace(/^# (.+)$/gm, '<h2 class="nox-h2">$1</h2>')
        .replace(/^---$/gm, '<hr class="nox-hr">')
        .replace(/^\| (.+) \|$/gm, (line) => {
            if (line.includes('---')) return '';
            const cells = line.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
            return `<tr>${cells}</tr>`;
        })
        .replace(/((<tr>.*<\/tr>\s*)+)/gs, '<table class="nox-table"><tbody>$1</tbody></table>')
        .replace(/^\d+\. (.+)$/gm, '<li class="nox-li-num">$1</li>')
        .replace(/^[-•✓✗→] (.+)$/gm, '<li class="nox-li">$1</li>')
        .replace(/((<li[^>]*>.*<\/li>\s*)+)/gs, '<ul class="nox-ul">$1</ul>')
        .replace(/\n\n/g, '</p><p class="nox-p">')
        .replace(/\n/g, '<br>')
        .replace(/^(.+)$(?!<\/p>)/gm, (line) =>
            line.startsWith('<') ? line : `<span>${line}</span>`
        );
}

function _escHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function noxAppendBubble(role, htmlContent, agentsUsed = []) {
    const msgs = document.getElementById('nox-agents-messages');
    if (!msgs) return;

    const welcome = document.getElementById('nox-agents-welcome');
    if (welcome) welcome.style.display = 'none';

    const wrap = document.createElement('div');
    wrap.className = `nox-ag-bubble nox-ag-bubble--${role}`;

    if (role === 'user') {
        wrap.innerHTML = `<div class="nox-ag-user-text">${_escHtml(htmlContent)}</div>`;
    } else {
        const agentTags = agentsUsed.length
            ? `<div class="nox-ag-tags">${agentsUsed.map(a =>
                `<span class="nox-ag-tag" style="--agent-color:${a.color}"><span class="nox-ag-tag-icon">${a.icon}</span>${a.label}</span>`
              ).join('')}</div>`
            : '';
        wrap.innerHTML = `
            <div class="nox-ag-ai-header">
                <div class="nox-ag-avatar">N</div>
                <span class="nox-ag-name">NOX</span>
            </div>
            ${agentTags}
            <div class="nox-ag-content">${htmlContent}</div>`;
    }

    msgs.appendChild(wrap);
    msgs.scrollTop = msgs.scrollHeight;
    return wrap;
}

function noxAppendTyping() {
    const msgs = document.getElementById('nox-agents-messages');
    if (!msgs) return null;
    const el = document.createElement('div');
    el.className = 'nox-ag-bubble nox-ag-bubble--ai nox-ag-typing';
    el.id = 'nox-typing-indicator';
    el.innerHTML = `
        <div class="nox-ag-ai-header"><div class="nox-ag-avatar">N</div><span class="nox-ag-name">NOX</span></div>
        <div class="nox-typing-dots"><span></span><span></span><span></span></div>`;
    msgs.appendChild(el);
    msgs.scrollTop = msgs.scrollHeight;
    return el;
}

function noxRemoveTyping() {
    document.getElementById('nox-typing-indicator')?.remove();
}

function noxShowActiveAgents(agentIds) {
    const bar = document.getElementById('nox-active-bar');
    if (!bar) return;
    bar.innerHTML = agentIds.map(id => {
        const def = AGENT_DEFS[id];
        if (!def) return '';
        return `<div class="nox-active-agent" style="--agent-color:${def.color}">
            <span class="nox-active-agent-icon">${def.icon}</span>
            <span>${def.label}</span>
            <span class="nox-active-dots"><span></span><span></span><span></span></span>
        </div>`;
    }).join('');
    bar.style.display = 'flex';
}

function noxHideActiveAgents() {
    const bar = document.getElementById('nox-active-bar');
    if (bar) { bar.innerHTML = ''; bar.style.display = 'none'; }
}

function noxShowToast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = `nox-toast nox-toast--${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('nox-toast--show'), 10);
    setTimeout(() => { t.classList.remove('nox-toast--show'); setTimeout(() => t.remove(), 300); }, 3000);
}

/* ════════════════════════════════════════════════════
   ENVÍO DE MENSAJES — LÓGICA PRINCIPAL
   ════════════════════════════════════════════════════ */

async function noxAgentSend() {
    const input = document.getElementById('nox-agents-input');
    const sendBtn = document.getElementById('nox-agents-send');
    if (!input || !sendBtn) return;

    const rawMessage = input.value.trim();
    if (!rawMessage) return;

    if (!window.ApiKeyManager?.hasActiveProvider('nox')) {
        window.ApiKeyManager?.openProviderPicker('nox');
        return;
    }

    // Parse @menciones
    const { message, mentions } = noxParseMessage(rawMessage);

    // Agregar mensaje del usuario al historial y UI
    input.value = '';
    input.style.height = 'auto';
    noxAppendBubble('user', rawMessage);
    noxAgentHistory.push({ role: 'user', content: message });

    // Routing
    const agentIds = noxRouteAgents(message, mentions);

    // UI: mostrar agentes activos y typing
    noxShowActiveAgents(agentIds);
    const typingEl = noxAppendTyping();
    sendBtn.disabled = true;

    try {
        // Ejecutar agentes en paralelo
        const agentResults = await noxRunAgents(agentIds, message, noxAgentHistory);

        // Sintetizar si hay múltiples agentes exitosos
        const { text, agents } = await noxSynthesize(agentResults, message, noxAgentHistory);

        // Guardar en historial
        noxAgentHistory.push({ role: 'assistant', content: text });
        noxSaveHistory();

        // Renderizar respuesta
        noxRemoveTyping();
        noxHideActiveAgents();
        const rendered = noxRenderMarkdown(text);
        noxAppendBubble('ai', rendered, agents);

        // Actualizar sugerencias según agente activo
        _noxUpdateSuggestions(agentIds[0]);

    } catch (err) {
        noxRemoveTyping();
        noxHideActiveAgents();
        const errMsg = err.message.includes('proveedor') || err.message.includes('provider')
            ? err.message : `Lo sentimos, ocurrió un error: ${err.message}`;
        noxAppendBubble('ai', `<p style="color:#f87171"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14" style="display:inline;vertical-align:middle;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>${_escHtml(errMsg)}</p>`, []);
        if (err.message.includes('proveedor') || err.message.includes('Configurar')) {
            window.ApiKeyManager?.openProviderPicker('nox');
        }
    } finally {
        sendBtn.disabled = false;
        input.focus();
    }
}

/* ════════════════════════════════════════════════════
   SUGERENCIAS DINÁMICAS
   ════════════════════════════════════════════════════ */

const NOX_SUGGESTIONS = {
    default: [
        { text: '¿Cómo vender más termos en Instagram?', agents: ['content', 'social', 'sales'] },
        { text: 'Crea un post para el día de la madre', agents: ['content', 'social'] },
        { text: 'Analiza el margen de mis productos', agents: ['finance'] },
        { text: 'Escríbeme un email de bienvenida para clientes', agents: ['email'] },
        { text: '¿Cómo posicionar mi tienda en Google?', agents: ['seo', 'strategy'] },
    ],
    dev: [
        { text: 'Cómo hacer un fetch con async/await en JS', agents: ['dev'] },
        { text: 'Revisa este código y encuentra el bug', agents: ['dev'] },
        { text: 'Explícame la diferencia entre let, const y var', agents: ['dev'] },
    ],
    finance: [
        { text: '¿Cuál es el margen mínimo que debo tener?', agents: ['finance'] },
        { text: 'Cómo calcular el punto de equilibrio', agents: ['finance'] },
        { text: 'Estrategia de pricing para productos nuevos', agents: ['finance', 'sales'] },
    ],
    content: [
        { text: 'Crea 3 captions para Instagram de mis termos', agents: ['content', 'social'] },
        { text: 'Guion de TikTok de 30 segundos para mi marca', agents: ['content', 'social'] },
        { text: 'Slogan para Manolette', agents: ['content', 'strategy'] },
    ],
    seo: [
        { text: 'Palabras clave para termos personalizados Colombia', agents: ['seo'] },
        { text: 'Escribe una meta descripción para mi tienda', agents: ['seo'] },
        { text: 'Cómo estructurar mi blog para posicionar en Google', agents: ['seo', 'content'] },
    ]
};

function _noxUpdateSuggestions(primaryAgentId) {
    const container = document.getElementById('nox-suggestions-bar');
    if (!container) return;
    const suggestions = NOX_SUGGESTIONS[primaryAgentId] || NOX_SUGGESTIONS.default;
    container.innerHTML = suggestions.map(s =>
        `<button class="nox-suggestion-chip" onclick="noxUseSuggestion(this)">${s.text}</button>`
    ).join('');
}

function noxUseSuggestion(btn) {
    const input = document.getElementById('nox-agents-input');
    if (input) { input.value = btn.textContent; input.focus(); noxAgentSend(); }
}

/* ════════════════════════════════════════════════════
   PANEL DE AGENTES (sidebar colapsable)
   ════════════════════════════════════════════════════ */

function noxToggleAgentsPanel() {
    const panel = document.getElementById('nox-agents-panel');
    if (!panel) return;
    const isOpen = panel.classList.toggle('nox-panel-open');
    const btn = document.getElementById('nox-toggle-panel-btn');
    if (btn) btn.setAttribute('aria-expanded', isOpen);
}

function noxRenderAgentsPanel() {
    const list = document.getElementById('nox-agents-list');
    if (!list) return;
    list.innerHTML = Object.values(AGENT_DEFS).map(def => `
        <div class="nox-agent-item" onclick="noxInvokeAgent('${def.id}')">
            <div class="nox-agent-icon" style="background:${def.color}20;color:${def.color}">${def.icon}</div>
            <div class="nox-agent-info">
                <div class="nox-agent-name">${def.label}</div>
                <div class="nox-agent-hint">@${def.id}</div>
            </div>
            <div class="nox-agent-status-dot nox-agent-idle"></div>
        </div>`).join('');
}

function noxInvokeAgent(agentId) {
    const def = AGENT_DEFS[agentId];
    if (!def) return;
    const input = document.getElementById('nox-agents-input');
    if (input) {
        input.value = `@${agentId} `;
        input.focus();
    }
}

/* ════════════════════════════════════════════════════
   LIMPIAR CHAT
   ════════════════════════════════════════════════════ */

function noxAgentClear() {
    noxClearHistory();
    const msgs = document.getElementById('nox-agents-messages');
    if (msgs) {
        msgs.innerHTML = `<div id="nox-agents-welcome" class="nox-ag-welcome">
            ${_buildWelcomeHTML()}
        </div>`;
    }
    _noxUpdateSuggestions('default');
    noxHideActiveAgents();
}

function _buildWelcomeHTML() {
    return `
        <div class="nox-ag-welcome-avatar">N</div>
        <h3>Sistema de Agentes NOX</h3>
        <p>12 agentes especializados coordinados por NOX para respuestas integrales.<br>
           Usa <code>@agente</code> para invocar uno específico.</p>
        <div class="nox-welcome-agents-grid">
            ${Object.values(AGENT_DEFS).map(d =>
                `<div class="nox-welcome-agent-pill" onclick="noxInvokeAgent('${d.id}')" style="--agent-color:${d.color}">
                    <span class="nox-pill-icon">${d.icon}</span>${d.label}
                </div>`
            ).join('')}
        </div>`;
}

/* ════════════════════════════════════════════════════
   @MENTION DROPDOWN
   ════════════════════════════════════════════════════ */

let _noxMentionIndex = -1;

function _noxGetMentionQuery(input) {
    const val = input.value;
    const pos = input.selectionStart;
    const before = val.slice(0, pos);
    const m = before.match(/@(\w*)$/);
    return m ? m[1].toLowerCase() : null;
}

function _noxHandleMentionInput(input) {
    const query = _noxGetMentionQuery(input);
    if (query === null) { _noxHideMention(); return; }

    const agents = Object.values(AGENT_DEFS).filter(d =>
        d.id.includes(query) ||
        d.label.toLowerCase().includes(query)
    );
    if (agents.length === 0) { _noxHideMention(); return; }

    _noxShowMention(agents, input);
}

function _noxShowMention(agents, input) {
    const dd = document.getElementById('nox-mention-dropdown');
    if (!dd) return;
    _noxMentionIndex = -1;

    const items = agents.map((def, i) => `
        <div class="nox-mention-item" data-id="${def.id}" tabindex="-1">
            <div class="nox-mention-item-icon" style="background:${def.color}18;color:${def.color}">${def.icon}</div>
            <span class="nox-mention-item-name">${def.label}</span>
            <span class="nox-mention-item-hint">@${def.id}</span>
        </div>`).join('');

    dd.innerHTML = `<div class="nox-mention-header">Invocar agente</div>${items}`;
    dd.style.display = 'block';

    dd.querySelectorAll('.nox-mention-item').forEach(item => {
        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            _noxSelectMention(item.dataset.id, input);
        });
    });
}

function _noxHideMention() {
    const dd = document.getElementById('nox-mention-dropdown');
    if (dd) dd.style.display = 'none';
    _noxMentionIndex = -1;
}

function _noxSelectMention(agentId, input) {
    const val = input.value;
    const pos = input.selectionStart;
    const before = val.slice(0, pos);
    const after  = val.slice(pos);
    const replaced = before.replace(/@\w*$/, `@${agentId} `);
    input.value = replaced + after;
    input.selectionStart = input.selectionEnd = replaced.length;
    input.focus();
    _noxHideMention();
}

function _noxHandleMentionKeydown(e, input) {
    const dd = document.getElementById('nox-mention-dropdown');
    if (!dd || dd.style.display === 'none') return false;

    const items = dd.querySelectorAll('.nox-mention-item');
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        _noxMentionIndex = Math.min(_noxMentionIndex + 1, items.length - 1);
        items.forEach((el, i) => el.classList.toggle('nox-mention-active', i === _noxMentionIndex));
        return true;
    }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        _noxMentionIndex = Math.max(_noxMentionIndex - 1, 0);
        items.forEach((el, i) => el.classList.toggle('nox-mention-active', i === _noxMentionIndex));
        return true;
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
        if (_noxMentionIndex >= 0 && items[_noxMentionIndex]) {
            e.preventDefault();
            _noxSelectMention(items[_noxMentionIndex].dataset.id, input);
            return true;
        }
    }
    if (e.key === 'Escape') { _noxHideMention(); return true; }
    return false;
}

// Close mention dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('#nox-mention-dropdown') && !e.target.closest('#nox-agents-input')) {
        _noxHideMention();
    }
});

/* ════════════════════════════════════════════════════
   INICIALIZACIÓN
   ════════════════════════════════════════════════════ */

function initNoxAgents() {
    noxLoadHistory();
    noxRenderAgentsPanel();
    _noxUpdateKeyStatus();
    _noxUpdateSuggestions('default');

    // Auto-resize textarea + @mention dropdown + disabled click
    const input = document.getElementById('nox-agents-input');
    if (input) {
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 160) + 'px';
            _noxHandleMentionInput(input);
        });
        input.addEventListener('keydown', (e) => {
            if (_noxHandleMentionKeydown(e, input)) return;
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); noxAgentSend(); }
        });
        // Disabled input click → open provider picker
        input.addEventListener('click', () => {
            if (!window.ApiKeyManager?.hasActiveProvider('nox')) {
                window.ApiKeyManager?.openProviderPicker('nox');
            }
        });
    }

    // Enviar con botón
    const sendBtn = document.getElementById('nox-agents-send');
    if (sendBtn) sendBtn.addEventListener('click', noxAgentSend);

    // Limpiar
    const clearBtn = document.getElementById('nox-agents-clear');
    if (clearBtn) clearBtn.addEventListener('click', noxAgentClear);

    // Toggle panel
    const toggleBtn = document.getElementById('nox-toggle-panel-btn');
    if (toggleBtn) toggleBtn.addEventListener('click', noxToggleAgentsPanel);

    // Key button → abre selector de proveedor
    const keyBtn = document.getElementById('nox-agents-key-btn');
    if (keyBtn) keyBtn.addEventListener('click', () => window.ApiKeyManager?.openProviderPicker('nox'));

    // Escuchar cambios de proveedor desde ApiKeyManager
    window.addEventListener('apikm:providerChanged', _noxUpdateKeyStatus);
    window.addEventListener('apikm:providerAdded', _noxUpdateKeyStatus);
    window.addEventListener('apikm:providerRemoved', _noxUpdateKeyStatus);
    window.addEventListener('apikm:modelChanged', _noxUpdateKeyStatus);

    // Función para navegar a API Keys desde modal picker
    window._navToApiKeys = () => {
        document.getElementById('nav-apikeys')?.click();
    };

    // Restaurar historial visual si existe
    if (noxAgentHistory.length > 0) {
        const welcome = document.getElementById('nox-agents-welcome');
        if (welcome) welcome.style.display = 'none';
        // Solo muestra los últimos 10 mensajes al restaurar (para no saturar el DOM)
        const recent = noxAgentHistory.slice(-10);
        recent.forEach(m => {
            if (m.role === 'user') {
                noxAppendBubble('user', m.content);
            } else {
                noxAppendBubble('ai', noxRenderMarkdown(m.content), []);
            }
        });
    }
}

// Registrar como inicializador de sección
window.onSection_gemini = initNoxAgents;
