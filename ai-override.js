
/**
 * ai-override.js
 * - Fuerza a que TODAS las llamadas a https://generativelanguage.googleapis.com
 *   vayan al endpoint local /api/gemini (server-side, usando GEMINI_API_KEY).
 * - Mantiene la interfaz de respuesta que espera tu código:
 *   { candidates:[{ content:{ parts:[{ text: "<JSON string>" }]}}] }
 * - Inyecta loader si existe #fitai-loader-overlay
 */
(function(){
  const originalFetch = window.fetch.bind(window);

  function showLoader(){
    const el = document.getElementById('fitai-loader-overlay');
    if (el) el.style.display = 'flex';
    document.dispatchEvent(new CustomEvent('fitai:loading'));
  }
  function hideLoader(){
    const el = document.getElementById('fitai-loader-overlay');
    if (el) el.style.display = 'none';
    document.dispatchEvent(new CustomEvent('fitai:done'));
  }

  // Truco para que el front no exija clave en localStorage
  try { localStorage.setItem('gemini_api_key', 'USE_SERVER'); } catch(_){}

  window.fetch = async function(url, opts){
    try {
      const u = (typeof url === 'string') ? url : String(url);
      const isGemini = u.includes('generativelanguage.googleapis.com');
      if (!isGemini) return originalFetch(url, opts);

      // Interceptamos y reenviamos al backend propio
      showLoader();
      let prompt = '';
      try {
        const body = opts && opts.body ? JSON.parse(opts.body) : {};
        // Google style body: contents[0].parts[0].text
        prompt = body?.contents?.[0]?.parts?.[0]?.text || body?.prompt || '';
      } catch (e) {}

      const r = await originalFetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      const ct = r.headers.get('content-type') || '';
      let plan;
      if (ct.includes('application/json')) plan = await r.json();
      else {
        const txt = await r.text();
        try { plan = JSON.parse(txt); } catch { plan = { text: txt }; }
      }

      // Adaptar al formato que el front espera desde Google
      const text = typeof plan === 'string' ? plan : JSON.stringify(plan);
      const mockGoogle = {
        candidates: [ { content: { parts: [ { text } ] } } ]
      };
      const blob = new Blob([JSON.stringify(mockGoogle)], { type: 'application/json' });
      return new Response(blob, { status: 200, headers: { 'Content-Type': 'application/json' } });
    } finally {
      hideLoader();
    }
  };
})();
