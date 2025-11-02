# FitAI – Sprint 3
- Selector de fecha para el log (Plan y Nutrición).
- Exportar día / Exportar todo / Importar (JSON).
- Resumen diario con adherencia (nutrición y entrenamiento).
- Mantiene PWA (manifest + sw), endpoint /api/gemini y despliegue para Vercel.

## Deploy rápido
1) Sube este repo a GitHub.
2) En Vercel: Importa el repo → Project Settings → Environment Variables:
   - `GEMINI_API_KEY` = tu clave de Google AI Studio.
3) Deploy. (SPA via `vercel.json` + `/api/gemini` listo).
