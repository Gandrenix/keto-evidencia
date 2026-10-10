# 01 · Requisitos

## 1. Contexto

- **Cliente final:** Dr. Alberto Ángel Martín (docente, Diplomado de Terapia Cetogénica, UIS). Pidió una "micro app" el
  viernes 9/10 ~9 pm para usarla el sábado 10/10 en la mañana. Los **usuarios reales** son los estudiantes del taller,
  agrupados en equipos; cada equipo recibe un caso distinto.
- **Objetivo pedagógico (del profe):** mostrar que *la solidez de la evidencia sobre terapia cetogénica depende de la
  indicación clínica y del desenlace evaluado*. La app no debe "dar la respuesta bonita" a todo; debe hacer visible
  la diferencia de calidad de evidencia entre casos.
- **Objetivo del desarrollador:** entregar algo sólido que demuestre capacidad técnica (y reabra la propuesta pendiente
  de Nicole). Por tanto: confiable en vivo > vistoso pero frágil.
- **Insumos entregados por el profe** (fuente de verdad del dominio):
  - 4 casos clínicos A–D con su pregunta (texto literal en `04` §2, a sembrar en `data/presets/`).
  - Estrategia de ejemplo (epilepsia): `("ketogenic diet" OR "ketogenic dietary therapy") AND ("drug resistant epilepsy" OR "refractory epilepsy") AND ("systematic review" OR "randomized controlled trial")`.
  - Requisito de búsqueda: usar **PubMed y Cochrane Library**; registrar **fecha de búsqueda, términos, filtros y motivos
    de selección** del artículo.
  - 3 lecturas del curso (epilepsia): Cochrane 2020, PLOS ONE 2026, Seizure 2026 (PMIDs verificados en `02`).
  - Ficha `pregunta PICO.docx`: P — Población · I — Intervención · C — Comparación · O — Resultado · "Pregunta clínica
    formulada por el equipo" (ejemplo: caso Obesidad).

## 2. Usuarios y escenarios

| Rol | Escenario principal |
|-----|---------------------|
| Estudiante (equipo) | Abre el link en su celular/portátil, elige su caso, completa/ajusta el PICO, ejecuta la búsqueda, selecciona artículos y anota por qué, genera la síntesis, exporta la entrega para Moodle. |
| Docente | Proyecta la app en el aula; alterna entre casos para comparar fortaleza de evidencia; muestra el *registro de búsqueda* y la trazabilidad PMID/cita. |
| Desarrollador | Despliega, monitorea la clase (`/api/health`), regenera snapshots, cambia modelo/clave sin redeploy de código. |

## 3. Requisitos funcionales

Prioridad: **M** = Must (Corte 1), **S** = Should (Corte 2), **C** = Could (Corte 3).

| ID | Requisito | Prio |
|----|-----------|------|
| RF-01 | Selector de 4 casos preconfigurados (A–D) que autocompleta caso, PICO y pregunta con el texto exacto del profe. | M |
| RF-02 | Modo libre: caso en blanco con formulario PICO editable (P, I, C, O + "pregunta formulada" en una frase). | M |
| RF-03 | Constructor de ecuación booleana a partir del PICO: bloques por concepto (P / I / C opcional / filtros de diseño), sinónimos y MeSH, **editable a mano**. Muestra la consulta y la *query translation* real de PubMed. | M |
| RF-04 | Copiar ecuación + abrir la misma búsqueda en PubMed (nueva pestaña) + abrir búsqueda equivalente en Cochrane Library (enlace de salida). | M |
| RF-05 | Búsqueda en vivo en PubMed vía servidor: devuelve N candidatos (≈20), con metadatos y abstract estructurado. | M |
| RF-06 | Ranking determinista por jerarquía de diseño (MA/RS > ECA > cohorte/caso-control > otros), luego pertinencia/recencia; badge de diseño por artículo. El diseño sale de `PublicationType` de PubMed, **no del LLM**. | M |
| RF-07 | El usuario selecciona/descarta artículos y escribe **motivo de selección** por cada uno. | M |
| RF-08 | **Registro de búsqueda** generado automáticamente: fecha/hora, base(s), ecuación exacta, filtros, n.º de resultados, artículos seleccionados con motivo. | M |
| RF-09 | Síntesis asistida por IA solo desde los artículos seleccionados, con salida estructurada en 4 bloques: *Hallazgos*, *Mecanismo y paraclínicos*, *Certeza y limitaciones*, *Aplicabilidad al caso*. | M |
| RF-10 | Trazabilidad: cada afirmación lleva chips de PMID y la cita literal del abstract (visible al pasar/tocar). Lo no verificable no se muestra como hallazgo. | M |
| RF-11 | Estado explícito de **"evidencia insuficiente / no concluyente"** cuando corresponda. | M |
| RF-12 | **Modo degradado:** si falla NCBI, Gemini o la red, se muestra el *snapshot* del caso (si existe) con banner "Resultado pregrabado del {fecha}"; nunca pantalla rota. | M |
| RF-13 | Exportar entrega: Markdown (copiar) y vista imprimible/PDF con PICO, registro de búsqueda, artículos con motivo, síntesis y avisos. Estructura alineada con la ficha `.docx` del profe. | M |
| RF-14 | Exportar referencias (RIS y CSV). | S |
| RF-15 | Persistir el trabajo del equipo en `localStorage` (recuperar tras recargar); botón "nuevo caso". | S |
| RF-16 | **Acceso por código de cohorte** (cabeceras `x-cohort-code` + `x-device-id`), validado en servidor: vigencia, habilitado/revocado, tope por dispositivo/día y total (`07` §5, Etapa A). | **M** |
| RF-21 | **Cupos de síntesis con IA** visibles al usuario ("te quedan N hoy") y mensaje claro al agotarse. | M |
| RF-22 | **Presupuesto global y interruptor de apagado** del LLM (variable/flag) sin redeploy; al activarse, la app pasa a modo "solo evidencia". | M |
| RF-23 | **Modo "solo evidencia"** de primera clase: búsqueda, ranking, selección, registro y exportación funcionan sin LLM. | M |
| RF-24 | **Ledger de uso** (fecha, cohorte/usuario, modelo, tokens entrada/salida, costo estimado, caché) y alerta al 50/80 % del presupuesto. | S |
| RF-25 | **Términos, aviso de privacidad y descargo clínico** accesibles desde el pie; aceptación al primer uso. | M |
| RF-26 | **Detección básica de datos de paciente** en campos de texto (documento, teléfono, correo, fecha de nacimiento) con advertencia/bloqueo antes de enviar al servidor. | S |
| RF-29 | **Resumen extractivo sin LLM (L1)** disponible para cualquier búsqueda: secciones textuales, conclusiones de los autores, frases con cifras, tabla de estudios (`08`). | M |
| RF-30 | **Router de LLM gratuito** con circuit breaker y cupos por proveedor/dispositivo; cadena configurable; cae a L1 si falla (`08` §4). | S |
| RF-31 | **Etiqueta de capa** en cada bloque y en la exportación (L0 verificado / L1 extractivo / L2 IA gratuita) y banner de "no ingreses datos de pacientes reales". | M |
| RF-27 | **Cuentas de usuario** (email con enlace mágico / Google) con cupo mensual individual (`07` Etapa B). | C |
| RF-28 | **Planes de pago / licencias por cohorte** (créditos o suscripción; pasarela por decidir) (`07` Etapa C). | C |
| RF-17 | Comparador de casos para el docente: tabla A–D con n.º de revisiones/ECA, tipo de mejor evidencia y estado (concluyente / mixto / insuficiente), alimentada de los snapshots. | C |
| RF-18 | Exportar a `.docx` replicando la ficha PICO. | C |
| RF-19 | Enriquecimiento Europe PMC (flag de texto completo abierto, PMCID, citas). | C |
| RF-20 | Proveedor LLM alternativo (OpenAI/Anthropic) por la misma interfaz. | C |

## 4. Requisitos no funcionales

| ID | Requisito | Medida |
|----|-----------|--------|
| RNF-01 | **Disponibilidad en vivo.** Con ~30 usuarios simultáneos no se rompe. | Prueba de carga ligera (k6/autocannon) con 30 VU sobre preset cacheado: 0 errores 5xx. |
| RNF-02 | **Latencia.** Búsqueda con caché < 1,5 s; sin caché < 6 s; síntesis con caché < 1 s; sin caché < 40 s (límite sync de Netlify = 60 s). | Logs de función + e2e. |
| RNF-03 | **Cumplir políticas de NCBI:** ≤ 3 req/s sin key (≤ 10 con key), parámetros `tool` y `email`, preferir POST para listas largas de IDs. | Cliente NCBI con cola/limitador; test unitario del limitador. |
| RNF-04 | **Secretos solo en servidor.** Ninguna API key llega al bundle del navegador. | Búsqueda del string de la key en `dist/` en CI; revisión manual. |
| RNF-05 | **Honestidad clínica.** Aviso persistente: apoyo educativo, no sustituye juicio clínico; no genera prescripciones individuales. | Revisión de textos + test e2e que verifica el aviso. |
| RNF-06 | **Responsive** (móvil primero; los estudiantes usarán celular). | Playwright en viewport 390×844 y 1280×800. |
| RNF-07 | **Accesibilidad básica:** contraste AA, foco visible, navegación por teclado en selector de casos y modales, `prefers-reduced-motion` respetado. | Axe en e2e. |
| RNF-08 | **Observabilidad mínima:** logs estructurados por request (id, duración, caché hit/miss, errores upstream) y `/api/health`. | Revisión de logs de Netlify durante la clase. |
| RNF-09 | **Reproducibilidad:** snapshots registran modelo, versión de prompt, fecha y PMIDs; los tests no dependen de la red. | Fixtures grabadas. |
| RNF-10 | **Privacidad:** en Etapa A sin cuentas ni datos personales del usuario; en ninguna etapa datos identificables de pacientes. Aviso de no ingresar datos identificables de pacientes. | Texto en UI. |
| RNF-12 | **Costo acotado.** El gasto de LLM nunca supera el tope mensual configurado, ni siquiera ante un bug o ataque (tope duro en el proveedor + presupuesto propio). | Prueba de agotamiento: simular presupuesto 0 → 0 llamadas al LLM y modo "solo evidencia". |
| RNF-13 | **Cumplimiento de proveedor.** Solo tier de pago; ningún dato identificable de pacientes enviado; lenguaje no prescriptivo; aviso de uso de IA visible (`07` §6). | Revisión de textos + prueba de detección de datos de paciente. |
| RNF-14 | **Minimización de datos.** El servidor no persiste texto de PICO ni abstracts por usuario (solo hashes y contadores). | Revisión del esquema del ledger y de los logs. |
| RNF-11 | **Mantenibilidad:** TypeScript estricto, lint/format, dominio puro sin dependencias de React ni de `fetch`. | `tsc --noEmit`, ESLint en CI local. |

## 5. Fuera de alcance (explícito)

- Scraping de HTML de PubMed/Cochrane/editoriales.
- Descarga automática de PDFs o lectura de texto completo en v1.
- Meta-análisis propio (poolear efectos). La app **resume lo que reportan** las revisiones; no calcula estadística nueva.
- Asignación automática de GRADE. Solo se **extrae** la certeza GRADE si el abstract la reporta (p. ej. Cochrane); si no, se indica "no reportada en el abstract".
- **BYOK** (que el usuario traiga su propia API key): descartado, los usuarios son profesionales de la salud, no desarrolladores.
- Uso del **tier gratuito** de cualquier proveedor de LLM con usuarios reales (los datos pueden usarse para mejorar productos).
- Cuentas de usuario y panel de administración en el Corte 1 (entran en Etapa B, ver `07`); base de datos relacional solo cuando llegue la Etapa B.
- Recomendaciones terapéuticas individualizadas, dosis, protocolos clínicos.
- Cobertura de otras terapias distintas de la cetogénica (el motor puede generalizarse después, no ahora).

## 6. Criterios de aceptación globales (definición de "hecho")

1. Los 4 casos corren de principio a fin **con red** (en vivo) y **sin red** (snapshot) sin errores en consola.
2. Cada PMID mostrado resuelve en `https://pubmed.ncbi.nlm.nih.gov/{PMID}/` y coincide con el título mostrado (script `verify-pmids`).
3. Ninguna cita de la síntesis falla el chequeo de subcadena contra su abstract (test automático sobre los 4 snapshots).
4. El caso D no fuerza una conclusión positiva si la evidencia recuperada no la sostiene.
5. La exportación Markdown pegada en un editor contiene: PICO, ecuación, fecha, motivos de selección, hallazgos con PMID y aviso clínico.
6. `npm run build` + `npm test` + `npm run e2e` verdes; despliegue en Netlify accesible por URL pública; `/api/health` OK.
7. Ensayo general (runbook de `06`) ejecutado una vez completa antes de la clase.
