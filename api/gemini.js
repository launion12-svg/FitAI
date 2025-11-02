export default async function handler(req, res){
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try{
    const { input, system } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(200).json({ output: 'Modo demo sin IA (falta GEMINI_API_KEY).' });

    const prompt = (system? (system + "\n\n") : "") + String(input||"");
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key='+apiKey, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        contents:[{ role:'user', parts:[{ text: prompt }]}],
        generationConfig:{ temperature:0.6, maxOutputTokens:800 }
      })
    });
    if (!resp.ok){
      return res.status(200).json({ output: 'IA no disponible ('+resp.status+'). Fallback demo.' });
    }
    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';
    res.status(200).json({ output: text.trim() });
  }catch(e){
    res.status(200).json({ output: 'IA no disponible. Fallback demo.' });
  }
}
