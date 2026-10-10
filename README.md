# KetoEvidencia

Apoyo educativo para formular la pregunta PICO y revisar la evidencia sobre terapia cetogénica en PubMed
(taller del Diplomado de Terapia Cetogénica). Plan completo en [`docs/`](docs/00-README.md).

**Qué hace:** caso (A–D o propio) → PICO → ecuación booleana editable → búsqueda en vivo en PubMed (vía servidor) →
ranking por diseño de estudio → selección con motivo → síntesis → entrega (Markdown / PDF) con registro de búsqueda.

**Tres capas de síntesis (sin costo):**
- **L0 · Verificada** — `data/snapshots/*.json`: redactadas con asistencia de IA a partir de abstracts reales y comprobadas por
  código (PMID + cita literal + cifras). Marcadas «pendiente de revisión» hasta que alguien ponga `reviewedBy`.
- **L1 · Extractiva** — texto literal de los abstracts, sin IA. Siempre disponible.
- **L2 · IA gratuita (opcional)** — Gemini con tu clave gratuita de AI Studio; toda salida pasa por la misma verificación.

## Uso local

```bash
npm install
npm run dev          # http://localhost:5173 (sirve también /api/* con el mismo código que Netlify)
npm test             # 51 pruebas (dominio, verificación de citas, parser PubMed, snapshots, servidor)
npm run build        # typecheck + build de producción
```

Variables (copia `.env.example` a `.env`; nunca subas `.env`):
`GEMINI_API_KEY` (opcional, clave gratuita de https://aistudio.google.com **sin activar facturación**), `GEMINI_MODEL`,
`LLM_ENABLED`, `NCBI_API_KEY`/`NCBI_EMAIL` (opcionales), `ACCESS_CODE` (opcional).

## Despliegue en Netlify

```bash
npx netlify-cli login
npx netlify-cli init            # crea/vincula el sitio
npx netlify-cli env:set GEMINI_API_KEY "<tu clave>"      # opcional
npx netlify-cli deploy --build --prod
```
El plan gratuito da 300 créditos/mes y cada despliegue a producción cuesta 15: desplegar pocas veces.

## Scripts de datos

| Script | Para qué |
|--------|----------|
| `npm run case:fetch -- C` | Corre el pipeline real de PubMed para un caso → `data/work/` |
| `node --experimental-strip-types scripts/build-snapshot.ts C` | Verifica `data/authoring/caso-c.json` contra los abstracts y escribe el snapshot |
| `npm run pmids:verify` | Comprueba en PubMed que cada PMID de los snapshots existe y su título coincide |
| `npm run secrets:check` | Falla si hay claves en `dist/` o en el código |

Revisión clínica de un snapshot: poner `"reviewedBy": "Nombre"` en `data/snapshots/caso-x.json` (y en el `build-snapshot` si se regenera).
