# 02 · Investigación verificada (2026-10-09)

Todo lo de este documento se comprobó hoy con llamadas reales o con la documentación oficial. Lo que **no** pudo
comprobarse está marcado como `⚠ por verificar` y tiene una tarea en el spike de la Fase 0 (`05`).

## 1. APIs de PubMed (NCBI E-utilities)

| Hecho | Evidencia | Consecuencia de diseño |
|-------|-----------|------------------------|
| CORS abierto: `Access-Control-Allow-Origin: *` en `esearch`. | Prueba directa con `curl -D -` + cabecera `Origin`. | Técnicamente se podría llamar desde el navegador… |
| Respuesta incluye `X-RateLimit-Limit: 3` / `X-RateLimit-Remaining`. | Misma prueba. | …pero el límite es **3 req/s por IP**, y toda el aula comparte IP de la universidad. |
| Límite: 3 req/s sin API key, 10 req/s con key; cuenta solicitudes *iniciadas*, todas las E-utilities juntas. | Política NCBI (Bookshelf NBK25497; soporte NLM; blog de API keys). | Todo NCBI pasa por el servidor, con **limitador/cola**, key y caché. |
| Parámetros `tool` y `email` recomendados; deben estar **registrados** en NCBI para que sirvan si bloquean la IP. | Misma política. | Registrar `tool=ketoevidencia` + email del desarrollador. Tarea en Fase 0. |
| Recomendado usar POST para listas largas de IDs. | Política NCBI. | `esummary`/`efetch` por POST desde el servidor. |
| `efetch` XML da abstracts **estructurados** con etiquetas (`BACKGROUND`, `OBJECTIVES`, `MAIN RESULTS`, `AUTHORS' CONCLUSIONS`…), `PublicationType` y `ArticleId` (doi, pmc). | `efetch` sobre PMID 32588435. | Parser XML propio; el diseño de estudio sale de `PublicationType`; el abstract por secciones permite citas precisas. |
| Los reviews Cochrane (CDSR) **están indexados en PubMed**. | PMID 32588435 devuelto con `Cochrane Database Syst Rev`. | La búsqueda en PubMed ya cubre Cochrane; Cochrane Library queda como enlace de salida (no tiene API pública). |

## 2. Europe PMC

- CORS abierto (`Access-Control-Allow-Origin: *`) — probado.
- Documentación oficial devolvió 403 a la herramienta de lectura; `⚠ por verificar` en Fase 0 si se quiere usar:
  filtro `OPEN_ACCESS:y`, `fullTextXML`, paginación `cursorMark`, límites.
- **Decisión:** fuera del Corte 1/2. Entra en Corte 3 (RF-19) para marcar "texto completo gratuito".
  Para v1, el `pmcid` que ya entrega PubMed basta para enlazar a PMC.

## 3. Netlify Functions (docs oficiales, página *Configuration*)

| Límite | Valor |
|--------|-------|
| Ejecución síncrona | **60 s** (no configurable) |
| Ejecución en background | 15 min (payload 256 KB) |
| Memoria | 1024 MB por defecto |
| Payload bufferizado | 6 MB; streaming hasta 20 MB |
| Forma de la función | `netlify/functions/*.mts`, `export default async (req: Request, ctx: Context) => Response`, ruta vía `export const config = { path: "/api/..." }`, tipos de `@netlify/functions` |

Corrección importante: el plan previo hablaba de "timeout de 10 s". La doc actual dice **60 s síncronos**. Una síntesis de
5–8 abstracts cabe holgadamente; no se necesita background function ni streaming en v1 (streaming queda como mejora UX).

## 4. Gemini API

| Hecho | Fuente | Consecuencia |
|-------|--------|--------------|
| Lista de modelos vigentes (resumen de la página de modelos): estables `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`; preview `gemini-3.1-pro-preview`, `gemini-3-flash-preview`. | ai.google.dev/gemini-api/docs/models | El modelo se lee de `GEMINI_MODEL` (env); default propuesto `gemini-3.5-flash-lite` (rápido/barato) con `gemini-3.8-flash` como alternativa de mayor calidad. |
| **`gemini-2.5-flash`** (el del prompt original): "no deprecado pero acceso limitado a quienes ya lo usaban"; `gemini-2.0-flash` está **apagado**. | Misma página. | **Error del prompt original.** Una cuenta nueva podría recibir 404/403 en plena clase. No se usa. |
| La página de *structured output* documenta ahora la **Interactions API** (`POST /v1beta/interactions`, `response_format: {type:"text", mime_type:"application/json", schema}`), con subconjunto de JSON Schema (`enum`, `anyOf`, `minItems`, `required`, etc.). Valores aún requieren validación propia. | ai.google.dev/gemini-api/docs/structured-output | `⚠ por verificar` en Fase 0: si `generateContent` + `responseSchema` sigue disponible para el modelo elegido o hay que usar Interactions. La capa `LlmProvider` aísla esto. |
| Límites: por proyecto (no por key), RPM/TPM/RPD; los valores del tier gratuito **solo se ven en AI Studio** (`aistudio.google.com/rate-limit`). | ai.google.dev/gemini-api/docs/rate-limits | Revisar cuota real de la key del usuario en Fase 0; la caché de síntesis es la defensa principal. |
| Un LLM con key en el navegador (modal ⚙️ del prompt original) expone la key en la pantalla proyectada y en DevTools. | Principio de seguridad. | La key vive solo en variable de entorno del servidor. **BYOK descartado**: los usuarios son profesionales de la salud (`07`). |
| **Tier gratuito:** el contenido enviado se usa para mejorar productos de Google, puede ser leído por revisores y los términos piden no enviar información sensible/personal. **Tier de pago** (proyecto con facturación activa): no se usa para mejorar productos; se registra un tiempo limitado para seguridad/abuso. | ai.google.dev/gemini-api/terms y página de precios | Solo tier de pago para usuarios reales. |
| Los términos de Gemini API dicen que el servicio **no puede usarse en práctica clínica ni para dar consejo médico**; mayores de 18. | Misma página | Posicionamiento como herramienta de literatura/educación; sin datos de pacientes; ver `07` §6. |
| Existen **topes de gasto por proyecto** en Google AI Studio (bloquean llamadas al alcanzarlos; aplicación con retardo de minutos según fuentes secundarias). | blog.google, docs de Cloud Billing, prensa (`⚠` confirmar cifra del retardo) | Capa 1 del control de gasto, no la única (`07` §4). |
| Precios (por 1 M tokens, pago estándar): 3.5 Flash-Lite US$ 0,30 / 2,50; 3.1 Flash-Lite US$ 0,25 / 1,50; 3.8 y 3.6 Flash US$ 0,75 / 3,75 en 2026 y **el doble desde 2027**. | ai.google.dev/gemini-api/docs/pricing | Entrada al cálculo de `07` §3. |

### 4.1 Anthropic (alternativa de proveedor, de pago)

| Hecho | Fuente | Consecuencia |
|-------|--------|--------------|
| Haiku 5.5: US$ 0,10 entrada / 0,50 salida; Sonnet 5.5: US$ 2 / 10 (lectura de caché US$ 0,20). Soportan salida estructurada por esquema; Haiku 5.5 razona por defecto con esfuerzo `medium`. | Caché local del skill `claude-api` (2026-10-06) | Candidatos en la mini-evaluación de Fase 0. Verificar precios al contratar. |
| La política de uso permite uso médico; **diagnosticar o recomendar/ajustar tratamiento** es *alto riesgo* y exige **revisión por humano cualificado** y **aviso de uso de IA**. Educación general en salud/nutrición queda fuera. | anthropic.com/legal/aup | Compatible con el diseño (apoyo a literatura, profesional verifica, aviso de IA, lenguaje no prescriptivo). |

### 4.2 Infraestructura de acceso (para `07`)

| Hecho | Fuente |
|-------|--------|
| Netlify: Free US$ 0 (300 créditos), Personal US$ 9 (1.000), Pro US$ 20 (3.000). Créditos se consumen por deploys de producción (15), cómputo (10/GB-h), ancho de banda (20/GB), peticiones web (2 por 10.000). | netlify.com/pricing |
| Supabase: Free (50.000 MAU de Auth, 500 MB BD; **proyectos gratuitos se pausan tras 1 semana sin actividad**), Pro desde US$ 25. | supabase.com/pricing |
| Wompi (Colombia): documenta tokenización de tarjeta/Nequi para cobros recurrentes. Stripe en Colombia: fuentes contradictorias (`⚠` no se asume). | docs.wompi.co y artículos de terceros |

## 5. Las tres lecturas del curso — verificadas en PubMed

| Rol | PMID | Revista · año | Título (PubMed) | Notas |
|-----|------|---------------|-----------------|-------|
| Cochrane (13 ensayos, 932 participantes según el profe) | **32588435** | Cochrane Database Syst Rev · 2020 Jun 24 | *Ketogenic diets for drug-resistant epilepsy.* | Tipos: SR, MA. Abstract estructurado disponible. |
| Revisión sistemática PLOS ONE 2026 | **42391224** | PLoS One · 2026 | *Ketogenic diet therapies for the treatment of drug-resistant epilepsy in children and adults: A systematic review.* | Tipos: SR, MA. |
| SR/MA adolescentes y adultos 2026 (33 estudios, 1.019 participantes según el profe) | **42214220** | Seizure · 2026 Aug | *The efficacy and safety of ketogenic diet therapy among adolescents and adults with drug resistant epilepsy: A systematic review a[nd meta-analysis]* | Tipos: SR, MA. El profe la usa para enseñar que "% de respondedores ≠ efecto comparativo vs control". |

`⚠ por verificar` (Fase 0): que "33 estudios / 1.019 participantes" y "13 ensayos / 932" aparezcan en los abstracts
(se contrastará con el texto real; no se afirmará nada en la app que el abstract no diga).

**Uso en el producto:** para el Caso C estas 3 referencias se anclan como *"Lecturas del curso"* (siempre visibles, aunque
la búsqueda en vivo devuelva otra cosa), marcadas aparte de los resultados de la búsqueda.

## 6. Candidatos de evidencia para los otros casos (existen en PubMed; **contenido aún no leído**)

Solo se verificó que el PMID exista y su título/tipo. Ninguna cifra de estos trabajos debe entrar a la app hasta leer el abstract.

| Caso | PMID | Revista · año | Tipo / título corto |
|------|------|---------------|---------------------|
| A Obesidad | 23651522 | Br J Nutr · 2013 | MA de ECA: VLCKD vs dieta baja en grasa, pérdida de peso a largo plazo |
| A Obesidad | 37231411 | BMC Med · 2023 | Umbrella review de MA de ECA sobre dieta cetogénica y desenlaces de salud |
| B DM2 | 33441384 | BMJ · 2021 | SR/MA de ECA: dietas bajas y muy bajas en carbohidratos y remisión de DM2 |
| B DM2 | 36064937 | Diabetes Obes Metab · 2022 | SR/MA de ECA: dietas muy bajas en carbohidratos (cetogénicas) en DM2 |
| B DM2 | 33257645 | Nutr Diabetes · 2020 | SR/MA: cetogénica, control glucémico, resistencia a insulina y lípidos en DM2 |
| B DM2 | 40930317 | Diabetes Res Clin Pract · 2025 | SR/MA de ECA: dietas bajas en carbohidratos en DM2 |
| B DM2 | 37513574 | Nutrients · 2023 | SR con meta-análisis en red: enfoques dietarios y control glucémico en DM2 |
| D MASLD | — | — | **Sin hallazgo dedicado en la primera búsqueda** (solo revisiones narrativas y un estudio tipo "very low energy ketogenic therapy" en MASLD con obesidad, PMID 41408292, sin tipo ECA/SR). Requiere búsqueda más amplia en Fase 0 (`MASLD`/`NAFLD`, `intrahepatic fat`, `low-carbohydrate`, `VLCKD`). |

Lectura pedagógica: el Caso D probablemente sea el ejemplo de **evidencia escasa o indirecta** → la app tiene que saber
mostrarlo sin disfrazarlo. Esto no es un bug del buscador; es el resultado clínico honesto y encaja con el objetivo del profe.

## 7. Correcciones al prompt original (resumen)

| # | Prompt original | Problema | Corrección en este plan |
|---|-----------------|----------|-------------------------|
| 1 | Un solo `index.html`, sin build | Imposible probar, mantener o endurecer; Tailwind CDN no es producción | Vite + React + TS, build reproducible, pruebas |
| 2 | Llamar NCBI desde el navegador | 3 req/s por IP compartida del aula → bloqueos; sin caché | BFF en Netlify con key NCBI, cola y caché |
| 3 | `sort=pub_date&retmax=4` | Trae lo más **nuevo**, no lo **mejor**; 4 resultados no sirven para comparar | Recuperar ~20 por relevancia con filtros de diseño; rankeo determinista por jerarquía de diseño; mostrar top 5–8 |
| 4 | Modelo `gemini-2.5-flash` | Acceso limitado a cuentas nuevas | Modelo por env var; verificar en Fase 0 |
| 5 | Key de Gemini pegada en un modal del navegador | Fuga de secreto; además los usuarios son profesionales, no desarrolladores | Key del operador en servidor, tier de pago, cupos y tope de gasto; sin BYOK (`07`) |
| 5b | (implícito) usar la cuota gratuita de Gemini | Los datos pueden usarse para mejorar productos y revisarse por humanos | Solo tier de pago |
| 6 | "Matrices predeterminadas" escritas a mano con "Cochrane 2020, PLOS ONE 2026…" | Riesgo de cifras inventadas en un contexto clínico | Snapshots generados por el pipeline real, revisados y trazables (`04` §7) |
| 7 | Veredicto "recomendada o no" + GRADE asignado por la IA | El GRADE no se deduce de un abstract; recomendación individual es indebida | Se **extrae** el GRADE si el abstract lo reporta; "aplicabilidad" en vez de "recomendación"; avisos |
| 8 | Sin registro de búsqueda | El profe exige fecha, términos, filtros y motivo de selección | RF-07/08 como Must |
| 9 | Sin ficha PICO oficial | El `.docx` del profe define la entrega | Exportación alineada a P/I/C/O + pregunta formulada |
| 10 | "Timeout de 10 s" en Netlify | Dato desactualizado (hoy 60 s síncronos) | Diseño de síntesis síncrona sin background |
