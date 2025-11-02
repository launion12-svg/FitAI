# FitAI listo para Vercel (todo hecho)
No tienes que tocar código.

1) Descarga el ZIP y súbelo a un repositorio en GitHub (tal cual).
2) En Vercel, importa el repo y en Build Settings pon:
   - Build Command: `echo "No build needed"`
   - Output Directory: `.`
   - Install Command: (vacío)
3) En Environment Variables añade:
   - GEMINI_API_KEY = tu clave de Google AI Studio
4) Deploy.

Este paquete ya incluye:
- vercel.json correcto (Node 20 + rewrites)
- /api/gemini.js en CommonJS
- App del Sprint 3 completa (index.html, sw.js, manifest, assets)
