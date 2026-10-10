# 05 · Plan de implementación

Estimaciones asumen desarrollo asistido por agente y un desarrollador revisando. Son **orientativas**; el plan está hecho
para que el orden importe más que el reloj. Cada fase termina con un criterio de salida comprobable; no se avanza sin él.

## 0. Cortes de entrega (qué se entrega si el tiempo se acaba)

| Corte | Contenido | Estado esperado |
|-------|-----------|-----------------|
| **Corte 1 — "Demo-safe"** | Fases 0–4 + **2B (acceso por cohorte, cupos, apagado)** + 6 mínima: SPA + 4 casos + PICO + ecuación + PubMed en vivo vía BFF + ranking + selección con motivo + registro de búsqueda + síntesis IA anclada + snapshots + exportación Markdown + despliegue | Usable en clase aunque falle cualquier servicio externo. **Es la meta de esta noche.** |
| **Corte 2 — Endurecido** | Fase 5: e2e completo, accesibilidad, carga ligera, código de acceso, RIS/CSV, persistencia local, ensayo general | Sábado temprano, antes de que lleguen los estudiantes |
| **Corte 3 — Post-clase** | RF-17..20: comparador de casos, `.docx`, Europe PMC, otros LLM, streaming | Con calma, tras ver cómo lo usaron |

> Si a la medianoche no se alcanzó el final de la Fase 4, se **recorta alcance** (se difiere RF-14/15/16) antes que
> recortar la verificación de citas (Fase 3) o los snapshots (Fase 6): esas dos son lo que hace seguro el producto.

## Fase 0 · Cimientos y spikes de riesgo  (≈ 45–60 min)

Objetivo: eliminar incertidumbre externa **antes** de escribir producto.

| # | Tarea | Salida / criterio |
|---|-------|--------------------|
| 0.1 | Confirmar con el usuario las preguntas abiertas de `00` (git, Netlify, keys, badge, código de acceso). | Respuestas anotadas en `00`. |
| 0.2 | `git init` en `WienerProbe`, `.gitignore` (node_modules, dist, .env, .netlify), commit inicial con `docs/`. | Repo propio. |
| 0.3 | Scaffold Vite + React + TS strict; instalar dependencias con versiones fijadas; ESLint/Prettier/Vitest; `npm run dev` abre. | Pantalla base compila; `tsc` y `vitest` corren. |
| 0.4 | **Spike NCBI:** script que ejecuta `esearch`+`efetch` (POST) para Caso C; grabar XML real como fixture. Registrar `tool`/`email`. | Fixture en `tests/fixtures/ncbi/`; parser prototipo extrae título, autores, año, pubtypes, abstract por secciones. |
| 0.5 | **Spike LLM + mini-evaluación de modelos** (cuentas de **pago** del operador, ver `07`): para cada candidato (p. ej. Sonnet 5.5, Haiku 5.5, Gemini 3.5 Flash-Lite) probar una llamada con esquema JSON sobre los 4 casos; medir tokens reales (incl. razonamiento), latencia y costo; % de ítems que pasan el grounding; revisión humana de legibilidad (1–5). Para Gemini decidir `generateContent` vs Interactions API. | Tabla comparativa en `07` §2 con modelo elegido, costo por síntesis medido, latencia. |
| 0.5b | **MODO COSTO CERO (vigente, `08`):** sin cuentas de pago. El usuario crea la key gratuita de AI Studio **sin facturación**; probar con `provider:probe` (5 abstracts reales → JSON válido, % anclado, latencia); leer los límites reales en AI Studio. Respaldos opcionales (OpenRouter `:free`, Cloudflare) solo si hace falta cupo. Esto sustituye al tope de gasto de proveedor y a la mini-evaluación de pago de 0.5 hasta que haya presupuesto. | Nota con límites reales y resultado del probe; ninguna key en archivos. |
| 0.6 | **Spike Caso D:** barrer variantes de búsqueda MASLD/NAFLD + cetogénica/low-carb/VLCKD; anotar qué existe realmente. | Lista de PMIDs candidatos + conclusión "evidencia suficiente / escasa". |
| 0.7 | Verificar "33 estudios/1.019" y "13 ensayos/932" contra los abstracts de las lecturas del curso. | Marca ✔ o ✘ en `02` §5. |
| 0.8 | `netlify.toml` mínimo + `netlify dev` sirviendo una función `health`. | `/api/health` responde en local. |

**Criterio de salida:** tenemos fixtures reales, un modelo de pago que responde JSON válido, un costo por síntesis medido,
un tope de gasto activo y el flujo local corriendo. Si 0.5 falla (sin acceso a modelos o sin cuenta de pago) → plan B: demo con
snapshots + PubMed en vivo (modo "solo evidencia"), y se avisa al usuario.

## Fase 1 · Dominio puro  (≈ 60–75 min)

TDD: pruebas primero con los fixtures de la Fase 0. Todo en `src/shared/`.

| # | Tarea | Criterio |
|---|-------|----------|
| 1.1 | `schemas.ts` (Pico, EvidenceRecord, Synthesis, SearchRequest/Response, errores). | Compila; tests de parseo válido/inválido. |
| 1.2 | `design-tier.ts` + tests con tabla de `PublicationType` reales (incluye Cochrane, NMA, "Review"). | Cada fila de la tabla de `04` §4 cubierta. |
| 1.3 | `ranking.ts` + tests (orden tier → relevancia → año; sin abstract al final). | Ordenamiento determinista. |
| 1.4 | `query-builder.ts` + diccionario + golden files de los 4 presets + "ecuación del profe". | Goldens revisados a ojo contra el ejemplo del profe. |
| 1.5 | `grounding.ts` + tests adversariales (PMID inventado, cita alterada por 1 palabra, cifra ajena, comillas tipográficas). | 100 % de casos adversariales descartados; citas legítimas pasan. |
| 1.6 | `prompt.ts` (versión `v1`) + test de snapshot del prompt. | Prompt generado estable. |
| 1.7 | `export-markdown.ts` + test de formato. | Coincide con plantilla de `04` §8. |
| 1.8 | `extractive.ts`: resumen L1 sin LLM (secciones textuales, frases con cifras, tabla de estudios) (`08` §2). | Cada fragmento mostrado es subcadena del abstract (test). |

**Salida:** `vitest` verde, cobertura de `src/shared/` ≥ 90 % en líneas.

## Fase 2 · Servidor (BFF)  (≈ 75–90 min)

| # | Tarea | Criterio |
|---|-------|----------|
| 2.1 | `_lib/ncbi.ts`: cliente con cola/limitador (3/10 rps), `tool`/`email`/`api_key`, backoff ante 429/5xx, POST para lotes, parser XML → EvidenceRecord. | Tests con fixtures y reloj simulado: nunca > N req/s. |
| 2.2 | `_lib/cache.ts` sobre Blobs con TTL, y un adaptador en memoria para pruebas locales. | Tests de hit/miss/expiración. |
| 2.3 | `search.mts`: valida (Zod) → caché → NCBI → clasifica/rankea → `SearchLog`. | Contrato probado con fixtures; errores uniformes. |
| 2.4 | `_lib/llm/provider.ts` + `gemini.ts` (reintento 1×, timeout 45 s, JSON-schema). | Test con respuesta simulada válida / inválida / 429. |
| 2.4b | `FreeTierRouter` + circuit breaker por proveedor + `npm run provider:probe` (`08` §4). | Tests con proveedores simulados (429, JSON inválido, timeout) → cae a L1. |
| 2.5 | `synthesize.mts`: PMIDs → abstracts (caché o `efetch`) → prompt → LLM → Zod → **grounding** → caché por hash → respuesta con `dropped[]`. | Test de integración con LLM simulado: ítems con PMID falso son descartados. |
| 2.6 | `log.ts` estructurado; `health.mts`. | Logs con requestId, duración, caché. |
| 2B.1 | `access.ts`: códigos de cohorte (vigencia, habilitado, tope por dispositivo/día y total) + `x-device-id`; script `cohort:create`. | Sin código válido → 401; código vencido → 401 con mensaje. |
| 2B.2 | `quota.ts`: cupos, límite de ritmo por IP/ventana, **presupuesto global** (suma del costo estimado) e **interruptor `LLM_ENABLED`**. | Con presupuesto 0 o apagado: 0 llamadas al LLM, respuesta `LLM_DISABLED`. |
| 2B.3 | `ledger.ts`: registro de cada llamada (modelo, tokens, costo estimado, caché) sin texto de PICO; alertas al 50/80 %. | Test: el ledger nunca contiene el PICO ni abstracts. |
| 2B.4 | Cliente: contador de cupo visible, modo "solo evidencia" cuando `QUOTA_EXCEEDED`/`LLM_DISABLED`; detección básica de datos de paciente (RF-26). | Playwright: agotar cupo → la app sigue útil. |
| 2B.5 | Términos, privacidad y descargo clínico (textos únicos reutilizados) + aceptación al primer uso. | Visible en pie y exportación. |
| 2.7 | `scripts/check-secrets.ts`. | Falla si pone una clave falsa en `dist/`. |

**Salida:** con `netlify dev`, `curl` a `/api/search` (Caso C) devuelve registros reales y `/api/synthesize` devuelve una
síntesis anclada. Latencias medidas y anotadas.

## Fase 3 · Interfaz  (≈ 90–120 min)

Orden por flujo del usuario, cada pantalla funcional antes de pulirla.

| # | Tarea | Criterio |
|---|-------|----------|
| 3.1 | Tokens de diseño (paleta Wiener Hound), tipografía Inter local/Google Fonts, componentes base (Button, Badge, Card, Modal, Skeleton, Toast). | Storybook-less: página `/ui` interna opcional. |
| 3.2 | Shell + navegación por pasos (1 Caso → 2 PICO → 3 Ecuación → 4 Evidencia → 5 Síntesis → 6 Entrega) con progreso visible; aviso clínico persistente. | Móvil y escritorio. |
| 3.3 | Selector de casos A–D (tarjetas) + modo libre. | RF-01/02: un clic autocompleta. |
| 3.4 | Formulario PICO + pregunta formulada; marcas "sugerido — edítalo". | RF-02. |
| 3.5 | Panel de ecuación: bloques, texto editable, copiar, enlaces PubMed y Cochrane, *query translation* y conteo tras buscar. | RF-03/04. |
| 3.6 | Resultados: tarjetas con badge de diseño, autores/año/revista, enlace PubMed/DOI/PMC, "lectura del curso", selección + motivo, contador 3–8. | RF-05/06/07. |
| 3.7 | Registro de búsqueda (vista y datos). | RF-08. |
| 3.8 | Panel de síntesis: skeleton, 4 bloques, chips PMID con cita en tooltip/bottom-sheet móvil, estado `insufficient`, aviso de descartes. | RF-09/10/11. |
| 3.9 | Estados de error/degradado según matriz de `03` §6; banner de snapshot. | RF-12. |
| 3.10 | Exportar: copiar Markdown, vista imprimible (`@media print`). | RF-13. |

**Salida:** los 4 casos recorridos a mano en móvil y escritorio, con red y con modo avión (snapshots).

## Fase 4 · Snapshots y datos  (≈ 45–60 min, parcialmente paralela a la 3)

| # | Tarea | Criterio |
|---|-------|----------|
| 4.1 | Sembrar `data/presets/*.json` con el texto literal del profe y `course-readings.json`. | Diff contra el mensaje original = idéntico. |
| 4.2 | Generar los 4 snapshots **sin costo** (`08` §5): abstracts reales vía pipeline → síntesis redactada por el asistente en el formato de `04` §5 → validada por `grounding.ts`; campo `source: "assistant-authored"`. (`scripts/snapshot.ts` con LLM queda para cuando haya presupuesto.) | 4 archivos, todos válidos y anclados. |
| 4.3 | `scripts/verify-pmids.ts`: PMID existe y título coincide. | 0 discrepancias. |
| 4.4 | **Revisión clínica humana** de cada snapshot (usuario o profe): marcar `reviewedBy`. | Al menos los casos C y A revisados; D y B si hay tiempo; los no revisados muestran "pendiente de revisión". |
| 4.5 | Cableado del cliente para usar snapshots como respaldo. | Prueba: bloquear red → flujo completo. |

## Fase 5 · Endurecimiento  (≈ 60–90 min)  — Corte 2

| # | Tarea | Criterio |
|---|-------|----------|
| 5.1 | Playwright: 4 casos × (red simulada OK / NCBI 429 / Gemini 500 / sin red) con fixtures; viewport móvil y escritorio. | Verde. |
| 5.2 | Axe en las vistas clave; arreglar violaciones serias/críticas. | 0 críticas. |
| 5.3 | Carga ligera: 30 usuarios virtuales sobre `/api/search` y `/api/synthesize` con claves cacheadas. | 0 errores 5xx; p95 dentro de RNF-02. |
| 5.4 | RIS/CSV (RF-14), persistencia local (RF-15), código de acceso en UI (RF-16). | Pruebas unitarias + e2e. |
| 5.5 | CSP y cabeceras en `netlify.toml`; revisar que la app funciona con la CSP puesta. | Sin errores de CSP en consola. |
| 5.6 | Pase de textos clínicos (avisos, lenguaje no prescriptivo), ortografía es-CO. | Lista de verificación firmada por el usuario. |

## Fase 6 · Despliegue y ensayo  (≈ 30–45 min)

| # | Tarea | Criterio |
|---|-------|----------|
| 6.1 | Crear sitio en Netlify (requiere login del usuario), variables de entorno (`LLM_PROVIDER`, `<PROVEEDOR>_API_KEY`, `LLM_MODEL`, `LLM_ENABLED`, `LLM_BUDGET_USD_MONTH`, `NCBI_API_KEY`, `NCBI_EMAIL`, cohortes). Las pone el usuario; nunca en archivos. | `https://<sitio>.netlify.app/api/health` → `ok`. |
| 6.2 | Ensayo general en producción según runbook (`06` §3): 4 casos en móvil real. | Checklist completa. |
| 6.3 | Pre-calentar caché: ejecutar búsqueda+síntesis de los 4 casos con el código de acceso. | Cache `hit` en la segunda ejecución. |
| 6.4 | Dejar listo "plan B": URL de respaldo / versión local, instrucciones de una línea para el usuario. | Documentado en `06`. |

## Dependencias y camino crítico

```
0.4 ─┬─ 1.2/1.3/1.4 ─ 2.1 ─ 2.3 ─┐
0.5 ─┴─ 1.5/1.6 ─────── 2.4 ─ 2.5 ─┼─ 3.x ─ 4.x ─ 5.x ─ 6.x
0.2/0.3 ─ 1.1 ────────────────────┘
```

Camino crítico: **0.5 (cuenta de pago del LLM + topes)** → 2.4/2.5 → 2B (cupos y apagado) → snapshots. Si 0.5 se bloquea,
todo lo demás avanza igual y los snapshots se generan cuando se desbloquee (o se entrega solo PubMed en vivo + estructura PICO).

## Fases posteriores (post-clase; no bloquean el sábado)

| Fase | Contenido | Disparador para empezar |
|------|-----------|-------------------------|
| **7 · Etapa B — Cuentas** | Spike Supabase Auth vs base de datos de Netlify; email con enlace mágico/Google; tabla `user`, `usage_ledger`, `entitlements`; cupo mensual por usuario; Turnstile anti-bot; panel mínimo de consumo; Términos/Privacidad/Política de IA revisados por un abogado; cumplimiento de habeas data (`07` §6). | Hay usuarios fuera de las cohortes o el uso real supera lo que el código de cohorte puede repartir. |
| **8 · Etapa C — Monetización** | Decidir modelo (licencia por cohorte / créditos / suscripción) y pasarela (Wompi u otra); facturación; *entitlements* conectados a cupos. | Evidencia de que alguien pagaría (conversaciones con el profe/UIS y primeras cohortes). |
| **9 · Corte 3 funcional** | RF-17..20 (comparador de casos, `.docx`, Europe PMC, otros proveedores LLM y failover). | Retroalimentación de la primera clase. |

## Definición de terminado por tarea

- Tipos y lint pasan; pruebas nuevas escritas **y** ejecutadas; sin `any` sin justificar.
- Ningún archivo nuevo sin propósito en la estructura de `03` §4.
- Commit atómico por tarea o grupo coherente (mensaje en español o inglés, consistente).
