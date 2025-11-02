// api/gemini.js
module.exports = async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  // Healthcheck
  if (req.method === 'GET' && String(req.query?.ping) === '1') {
    if (!apiKey) return res.status(200).json({ ok: false, reason: 'NO_API_KEY' });
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + apiKey);
      return res.status(200).json({ ok: r.ok, status: r.status });
    } catch (e) {
      return res.status(200).json({ ok: false, reason: 'FETCH_ERROR', debug: String(e) });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!apiKey) return res.status(200).json({ output: 'Modo demo: falta GEMINI_API_KEY en Vercel.' });

    const { input, system } = req.body || {};
    const prompt = (system ? system + '\n\n' : '') + String(input || '');

    const endpoints = [
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent'
    ];

    for (const url of endpoints) {
      const resp = await fetch(url + '?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 900,
            responseMimeType: "application/json"
          }
        })
      });

      // Si el endpoint falla, devolvemos info útil
      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        // 404: modelo no disponible para tu cuenta/proyecto
        if (resp.status === 404) continue;
        // 401/403: clave inválida o sin permisos
        return res.status(200).json({
          output: `IA no disponible (${resp.status}).`,
          debug: { status: resp.status, body }
        });
      }

      const data = await resp.json().catch(() => ({}));
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (text) return res.status(200).json({ output: text });
    }

    return res.status(200).json({ output: 'IA no disponible (modelos no válidos).', debug: { note: 'Todos los endpoints devolvieron 404' } });
  } catch (e) {
    return res.status(200).json({ output: 'Error interno. Modo demo.', debug: String(e) });
  }
};
