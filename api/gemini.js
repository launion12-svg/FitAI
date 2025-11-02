// /api/gemini.js — Vercel Serverless (CommonJS)
module.exports = async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  // Comprobación rápida de clave: GET /api/gemini?ping=1
  if (req.method === 'GET' && String(req.query?.ping) === '1') {
    if (!apiKey) return res.status(200).json({ ok: false, reason: 'NO_API_KEY' });
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + apiKey);
      const text = await r.text();
      return res.status(200).json({ ok: r.ok, status: r.status, preview: text.slice(0, 800) });
    } catch {
      return res.status(200).json({ ok: false, reason: 'FETCH_ERROR' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { input, system } = req.body || {};
    if (!apiKey) return res.status(200).json({ output: 'Modo demo sin IA (falta GEMINI_API_KEY).' });

    const prompt = (system ? system + '\n\n' : '') + String(input || '');

    // 👉 Prioriza 2.5 (tu cuenta lo tiene), con fallbacks
    const endpoints = [
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-latest:generateContent',
      // Fallbacks 1.5 por si acaso
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent',
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
      // Compatibilidad antigua
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent'
    ];

    let text = '';
    for (const url of endpoints) {
      const resp = await fetch(url + '?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 800 }
        })
      });

      if (!resp.ok) {
        // 401/403: clave sin permisos
        if (resp.status === 401 || resp.status === 403) {
          return res.status(200).json({ output: 'IA no disponible (clave inválida o permisos). Fallback demo.' });
        }
        // 404: prueba siguiente endpoint
        if (resp.status === 404) continue;
        // Otros: error genérico + fallback
        return res.status(200).json({ output: `IA no disponible (${resp.status}). Fallback demo.` });
      }

      const data = await resp.json().catch(() => ({}));
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (text) break;
    }

    if (!text) return res.status(200).json({ output: 'IA no disponible (modelo/ruta). Fallback demo.' });
    return res.status(200).json({ output: text });
  } catch {
    return res.status(200).json({ output: 'IA no disponible. Fallback demo.' });
  }
};
