// netlify/functions/groq.js
// Proxy seguro para Groq API — la clave nunca llega al browser
// La clave se configura en: Netlify Dashboard → Site → Environment variables → GROQ_API_KEY

exports.handler = async (event) => {
    // Solo aceptar POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'GROQ_API_KEY no configurada en Netlify Environment Variables' })
        };
    }

    try {
        const body = JSON.parse(event.body);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        return {
            statusCode: response.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        };
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del proxy: ' + err.message })
        };
    }
};
