# KetoEvidencia — Plan de proyecto

> Micro app de síntesis de evidencia clínica sobre terapia cetogénica, para el taller PICO del Diplomado
> de Terapia Cetogénica (UIS · Escuela de Nutrición y Dietética).
> Estado: **PLANIFICACIÓN — no hay código todavía.** Fecha del plan: 2026-10-09 (viernes, noche).
> Uso real: sábado 2026-10-10 en la mañana, con estudiantes en vivo.

## Cómo leer estos documentos

| # | Archivo | Para qué |
|---|---------|----------|
| 00 | `00-README.md` | Este índice, decisiones clave y preguntas abiertas |
| 01 | [`01-requisitos.md`](01-requisitos.md) | Quién lo usa, qué debe hacer, qué NO hace, criterios de éxito |
| 02 | [`02-investigacion-verificada.md`](02-investigacion-verificada.md) | Hechos comprobados hoy (APIs, límites, PMIDs) y **correcciones al prompt original** |
| 03 | [`03-arquitectura.md`](03-arquitectura.md) | Stack, capas, estructura de carpetas, contratos de API, ADRs |
| 04 | [`04-modelo-de-evidencia-y-llm.md`](04-modelo-de-evidencia-y-llm.md) | Modelo PICO, motor de consultas, ranking, contrato del LLM, anti-alucinación, snapshots |
| 05 | [`05-plan-de-implementacion.md`](05-plan-de-implementacion.md) | Fases, tareas, criterios de salida, corte mínimo para el sábado |
| 06 | [`06-calidad-y-riesgos.md`](06-calidad-y-riesgos.md) | Estrategia de pruebas, runbook de la demo, riesgos y mitigaciones |
| 07 | [`07-modelo-operativo-acceso-y-costos.md`](07-modelo-operativo-acceso-y-costos.md) | Ruta a producto con presupuesto: LLM de pago, costos, cupos, identidad, monetización y cumplimiento |
| 08 | [`08-modo-costo-cero.md`](08-modo-costo-cero.md) | **Vigente hoy (sin presupuesto):** tres capas (snapshots verificados · extractivo sin LLM · LLM gratuito con topes), opciones gratuitas investigadas |

## Resumen en 10 líneas

1. **Qué es:** el estudiante elige (o escribe) un caso → la app arma el PICO y la ecuación de búsqueda → consulta PubMed
   en vivo → rankea la evidencia por diseño de estudio → una IA sintetiza **solo a partir de los abstracts recuperados**
   → cada afirmación queda anclada a un PMID y a una cita textual verificable.
2. **Arquitectura:** SPA (Vite + React + TypeScript + Tailwind) + **Netlify Functions como BFF** (NCBI y Gemini se llaman
   desde el servidor, nunca desde el navegador del estudiante). Dominio puro compartido y validado con Zod.
3. **Por qué BFF y no `fetch` directo desde el navegador:** 30 estudiantes salen por la misma IP de la universidad →
   NCBI limita a **3 req/s por IP** sin key. Con key en servidor + caché, una clase entera cuesta ~1 llamada por caso.
4. **Anti-alucinación como requisito de primer orden:** el LLM no inventa referencias ni cifras; el servidor verifica
   que cada PMID citado exista en lo recuperado y que cada cita sea subcadena literal del abstract. Lo que no pasa, se descarta.
5. **Modo a prueba de fallos real:** los "resultados predeterminados" **no se escriben a mano**; se generan corriendo el
   pipeline real offline (`npm run snapshot`), se revisan y se versionan. Si falla red/NCBI/Gemini, la app muestra el
   snapshot con un aviso explícito de fecha.
6. **Lo que el profe pidió y el prompt original omitía:** registro de búsqueda (fecha, términos, filtros, **motivo de
   selección por artículo**) y la ficha PICO con el formato del `.docx` entregado.
7. **El prompt original tenía 3 errores técnicos** (modelo Gemini restringido, `sort=pub_date` no trae la mejor evidencia,
   la key de Gemini en el navegador). Detalle en `02`.
8. **Casos:** A obesidad, B DM2, C epilepsia farmacorresistente, D MASLD. El D tiene evidencia escasa en la primera
   búsqueda: la app debe poder decir **"evidencia insuficiente"** — es parte de la lección del profe.
9. **Plan por cortes:** *Corte 1* (demo-safe, esta noche) → *Corte 2* (endurecimiento, antes de la clase) →
   *Corte 3* (post-clase). Si se acaba el tiempo, se entrega el Corte 1 y es presentable.
10. **No hay recomendación terapéutica individual.** La app resume evidencia y aplicabilidad; el caso pediátrico lleva
    aviso de que requiere equipo especializado (así lo dice el enunciado del profe).
11. **Presupuesto = $0 (restricción vigente).** Nadie trae su propia key y no se paga nada. Solución en tres capas (`08`):
    **L0** snapshots verificados de los 4 casos (0 llamadas), **L1** resumen extractivo sin LLM (siempre disponible, no puede
    alucinar), **L2** LLM *gratuito* con router, cupos y circuit breaker. Las cuentas gratuitas se crean **sin tarjeta**, así que el
    gasto es 0 por construcción.
12. **Trade-off asumido:** los tiers gratuitos pueden usar lo enviado para mejorar productos → válido solo para el taller (viñetas
    ficticias + abstracts públicos; la app bloquea datos de pacientes). Para uso profesional con pacientes reales hace falta
    tier de pago (ruta en `07`: ≈ US$ 0,003–0,07 por síntesis) o quedarse en L0/L1.
13. **Acceso por etapas:** A) códigos de cohorte (sábado, sin cuentas) → B) cuentas con cupo individual →
    C) planes de pago / licencias. B y C quedan **bloqueadas hasta que haya presupuesto o patrocinador**.

## Decisiones tomadas (con justificación en `03`)

| Tema | Decisión |
|------|----------|
| Frontend | Vite + React 19 + TypeScript (strict) + Tailwind v4 |
| Backend | Netlify Functions v2 (`.mts`), 2 endpoints de negocio + `health` |
| Validación | Zod, esquemas compartidos cliente/servidor |
| Fuentes | PubMed E-utilities (principal). Cochrane Library = solo enlace de salida (no tiene API pública). Europe PMC = fase posterior |
| LLM (hoy, costo cero) | L0 snapshots verificados + L1 extractivo sin LLM + L2 **Gemini gratuito** (key de AI Studio, sin tarjeta) con respaldos opcionales (OpenRouter `:free`, Cloudflare Workers AI) tras un router con circuit breaker; todo desde el servidor y con grounding obligatorio |
| LLM (futuro, con presupuesto) | Tier de pago, proveedor-neutral (Anthropic Sonnet/Haiku 5.5, Gemini 3.5/3.8); modelo elegido por mini-evaluación (`07`) |
| Acceso y costos | Etapa A: códigos de cohorte + tope por dispositivo + presupuesto global + interruptor de apagado. Etapa B: cuentas (Supabase Auth candidato). Tope duro también en el proveedor |
| Caché | Netlify Blobs: búsquedas (24 h) y síntesis (clave = hash de PICO + PMIDs + modelo + versión de prompt) |
| Persistencia del estudiante | `localStorage` + exportación (Markdown, imprimir/PDF); sin cuentas |
| Idioma | UI en español (es-CO); abstracts en inglés tal cual; síntesis en español con cita original en inglés |
| Pruebas | Vitest (unidad/contrato con fixtures), Playwright (e2e de los 4 casos), runbook manual |

## Preguntas abiertas para el usuario (bloquean o afinan el plan)

1. **¿Cuenta de Netlify y repo?** El despliegue requiere que tú inicies sesión (`netlify login`) — yo no puedo hacerlo por ti.
   Además, `C:\Users\Asus\Desktop\WienerProbe` hoy cuelga de un repo git que es tu carpeta de usuario completa
   (todo aparece como "untracked"). Propongo `git init` dentro de `WienerProbe` para que sea su propio repo. ¿Ok?
2. **¿Creas la key gratuita de Google AI Studio?** (sin tarjeta y **sin activar facturación**; ver `08` §10). Va solo en las
   variables de entorno de Netlify. Si prefieres cero IA el sábado, alcanza con L0 + L1. Opcional: key de NCBI (gratis, sube el
   límite a 10 req/s).
3. **¿Aceptas la condición del modo gratuito?** Solo viñetas ficticias y abstracts públicos en el taller; nada de pacientes reales.
4. **¿Quién revisa los snapshots L0** antes de la clase? (los redacto yo desde abstracts reales y el validador los verifica; falta
   un ojo clínico humano).
4. **¿Marca?** El prompt original pedía estética "Wiener Hound" (fondo `#071324`, acento `#00E5BE`, dorado `#FBBF24`) con
   badge institucional UIS. ¿Va el badge de UIS/Diplomado? Es el contexto del profe, pero usar nombre/identidad de una
   institución en un sitio público conviene que él lo apruebe. Plan por defecto: badge textual discreto "Taller PICO —
   Diplomado en Terapia Cetogénica" sin logos oficiales.
5. **¿Alcance de "descargar archivos" (nota original de Alberto)?** Plan: v1 exporta referencias (RIS/CSV) y enlaza
   texto completo gratuito (PMC/DOI). Descarga/lectura automática de PDFs queda fuera (muros de pago, derechos, límites
   serverless). ¿De acuerdo?
6. **¿Quién revisa los snapshots clínicamente?** Los generamos con el pipeline real, pero alguien con criterio clínico
   (tú o el profe) debería leerlos antes de la clase. Ver `06`.
