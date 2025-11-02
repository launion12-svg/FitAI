// /api/gemini.js — Vercel Serverless (CommonJS, Node 18/20)
module.exports = async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  // --- DEBUG PING: GET /api/gemini?ping=1 -> comprueba tu clave rápidamente
  if (req.method === 'GET' && String(req.query?.ping) === '1') {
    if (!apiKey) return res.status(200).json({ ok: false, reason: 'NO_API_KEY' });
    try {
      const r = await fetch(
        'https://generativelanguage.googleapis.com/v1/models?key=' + apiKey
      );
      const text = await r.text();
      return res
        .status(200)
        .json({ ok: r.ok, status: r.status, preview: text.slice(0, 500) });
    } catch (e) {
      return res.status(200).json({ ok: false, reason: 'FETCH_ERROR' });
    }
  }

  // --- POST normal: genera respuesta
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { input, system } = req.body || {};
    if (!apiKey) {
      return res
        .status(200)
        .json({ output: 'Modo demo sin IA (falta GEMINI_API_KEY).' });
    }

    const prompt = (system ? system + '\n\n' : '') + String(input || '');

    // Endpoints a probar (ordenados)
    const endpoints = [
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent',
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro-latest:generateContent',
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-8b:generateContent',
      // Compatibilidad antigua:
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'
    ];

    let finalText = '';
    let lastStatus = 0;
    let lastBody = '';

    for (const url of endpoints) {
      const resp = await fetch(url + '?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 800 }
        })
      });

      lastStatus = resp.status;
      lastBody = await resp.text().catch(() => '');

      if (!resp.ok) {
        // 401/403: clave mal o sin permisos
        if (resp.status === 401 || resp.status === 403) {
          return res.status(200).json({
            output:
              'IA no disponible (clave inválida o permisos). Fallback demo.',
            debug: { status: resp.status, body: lastBody.slice(0, 300) }
          });
        }
        // 404: probamos siguiente endpoint
        if (resp.status === 404) continue;
        // Otros: salimos con info
        return res.status(200).json({
          output: `IA no disponible (${resp.status}). Fallback demo.`,
          debug: { endpoint: url, status: resp.status, body: lastBody.slice(0, 300) }
        });
      }

      // Si ok, intentamos leer texto
      try {
        const data = JSON.parse(lastBody);
        finalText =
          data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      } catch {
        finalText = (lastBody || '').trim();
      }
      if (finalText) break;
    }

    if (!finalText) {
      return res.status(200).json({
        output: 'IA no disponible (modelo/ruta). Fallback demo.',
        debug: { lastStatus, body: (lastBody || '').slice(0, 300) }
      });
    }

    return res.status(200).json({ output: finalText });
  } catch (e) {
    return res.status(200).json({ output: 'IA no disponible. Fallback demo.' });
  }
};
