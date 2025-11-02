module.exports = async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (req.method === 'GET' && String(req.query?.ping) === '1') {
    if (!apiKey) return res.status(200).json({ ok: false, reason: 'NO_API_KEY' });
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1/models?key=' + apiKey);
      return res.status(200).json({ ok: r.ok, status: r.status });
    } catch (e) {
      return res.status(200).json({ ok: false, reason: 'FETCH_ERROR' });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { input, system } = req.body || {};
    if (!apiKey) return res.status(200).json({ output: 'Modo demo: añade GEMINI_API_KEY en Vercel.' });

    const prompt = (system ? system + '\n\n' : '') + String(input || '');
    const urls = [
      'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
      'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent'
    ];

    let text = '';
    for (const url of urls) {
      const resp = await fetch(url + '?key=' + apiKey, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 900 }
        })
      });
      if (!resp.ok) {
        if (resp.status === 401 || resp.status === 403) return res.status(200).json({ output: 'Clave inválida o sin permisos (fallback demo).' });
        continue;
      }
      const data = await resp.json().catch(()=>({}));
      text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (text) break;
    }

    if (!text) text = 'IA no disponible temporalmente. Modo demo.';
    return res.status(200).json({ output: text });
  } catch (e) {
    return res.status(200).json({ output: 'Error interno. Modo demo.' });
  }
};