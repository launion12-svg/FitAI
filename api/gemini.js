// /api/gemini.js — Vercel (Node 18/20, CommonJS)
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const { input, system } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Sin clave: modo demo
      return res.status(200).json({ output: 'Modo demo sin IA (falta GEMINI_API_KEY).' });
    }

    const prompt = (system ? system + "\n\n" : "") + String(input || "");

    // Secuencia de endpoints “a prueba de 404”
    const endpoints = [
      // Recomendado (estable)
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash-latest:generateContent",
      // Alternativo estable
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent",
      // Compatibilidad AI Studio antiguo
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent",
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
    ];

    let text = "";
    for (const url of endpoints) {
      const resp = await fetch(url + "?key=" + apiKey, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 800 }
        })
      });

      if (!resp.ok) {
        // Si es 401/403, la clave está mal o no habilitada en el proyecto
        if (resp.status === 401 || resp.status === 403) {
          return res.status(200).json({ output: "IA no disponible (clave inválida o permisos). Fallback demo." });
        }
        // Si es 404 probamos el siguiente endpoint
        if (resp.status === 404) continue;
        // Otros errores HTTP: pasamos a fallback demo
        return res.status(200).json({ output: `IA no disponible (${resp.status}). Fallback demo.` });
      }

      const data = await resp.json().catch(() => ({}));
      text = (data && data.candidates && data.candidates[0] &&
              data.candidates[0].content && data.candidates[0].content.parts &&
              data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || "";
      if (text.trim()) break; // tenemos respuesta válida
    }

    if (!text.trim()) {
      return res.status(200).json({ output: "IA no disponible (modelo/ruta). Fallback demo." });
    }

    return res.status(200).json({ output: text.trim() });
  } catch (e) {
    return res.status(200).json({ output: "IA no disponible. Fallback demo." });
  }
};
