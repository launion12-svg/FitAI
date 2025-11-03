// @vercel/node — Google Gemini JSON out (GET health, POST infer), CORS friendly
const fetch = require('node-fetch');

function setCORS(res){
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
}

const MODEL_FALLBACK = ['gemini-1.5-flash','gemini-1.5-pro','gemini-1.0-pro'];

function extractJson(text){
  if(!text || typeof text !== 'string') return null;
  let m = text.match(/```json\s*([\s\S]*?)```/i);
  if(m){ try { return JSON.parse(m[1]); } catch{} }
  m = text.match(/\{[\s\S]*\}/);
  if(m){ try { return JSON.parse(m[0]); } catch{} }
  return null;
}

module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method === 'GET') {
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.status(200).json({ ok: true, endpoint: '/api/gemini', method: 'POST', body: { prompt: 'string' }, env: { GEMINI_API_KEY: hasKey } });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try{
    const key = process.env.GEMINI_API_KEY;
    if(!key){ res.status(500).json({ error:'Falta GEMINI_API_KEY' }); return; }

    const body = req.body || {};
    const prompt = body.prompt || 'Genera un plan de entrenamiento+nutrición+lista (JSON con exercises[], nutrition, shopping_list[]).';

    let lastErr = null;
    for(const model of MODEL_FALLBACK){
      try{
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const payload = {
          contents: [{ role:'user', parts:[{ text: prompt }]}],
          generationConfig: {
            temperature: 0.7, topK: 40, topP: 0.95, maxOutputTokens: 1024,
            responseMimeType: "application/json"
          }
        };
        const r = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if(!r.ok){ lastErr = new Error(`Modelo ${model} status ${r.status}`); continue; }
        const j = await r.json();
        let text = j?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        let parsed;
        try{ parsed = JSON.parse(text); } catch{ parsed = extractJson(text); }
        if(!parsed){ res.status(200).json({ text }); return; }
        res.status(200).json(parsed); return;
      }catch(err){ lastErr = err; continue; }
    }
    res.status(502).json({ error:'No fue posible obtener respuesta del modelo.', details: String(lastErr||'') });
  }catch(e){
    res.status(500).json({ error:'Error interno en /api/gemini', details: String(e) });
  }
};
