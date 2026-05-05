// netlify/functions/hf.js
// Proxy seguro para Hugging Face Inference API
// La clave se configura en: Netlify Dashboard → Environment variables → HF_TOKEN

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const token = process.env.HF_TOKEN;
    if (!token) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'HF_TOKEN no configurado en Netlify Environment Variables' })
        };
    }

    try {
        const { model, ...body } = JSON.parse(event.body);
        if (!model) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Falta el campo "model"' }) };
        }

        const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        // HF puede devolver imagen (buffer) o JSON según el modelo
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            const data = await response.json();
            return {
                statusCode: response.status,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            };
        } else {
            // Imagen u otro binario — devolver en base64
            const buffer = await response.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            return {
                statusCode: response.status,
                headers: { 'Content-Type': contentType },
                isBase64Encoded: true,
                body: base64
            };
        }
    } catch (err) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Error interno del proxy: ' + err.message })
        };
    }
};
