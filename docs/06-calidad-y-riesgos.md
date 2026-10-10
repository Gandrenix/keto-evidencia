# 06 · Calidad, runbook de la demo y riesgos

## 1. Estrategia de pruebas

| Nivel | Herramienta | Qué cubre | Red |
|-------|-------------|-----------|-----|
| Unidad (dominio) | Vitest | `design-tier`, `ranking`, `query-builder` (+golden), `grounding` (adversarial), `prompt`, `export-markdown` | No |
| Unidad (infra) | Vitest + reloj simulado | limitador NCBI, caché con TTL, reintentos/backoff, access code | No |
| Contrato | Vitest + fixtures | Parser `efetch` XML real; respuesta Gemini válida/ inválida / 429; forma de error uniforme | No |
| Integración | Vitest / `netlify dev` | `/api/search` y `/api/synthesize` con NCBI y LLM simulados | No |
| E2E | Playwright (+axe) | 4 casos × {OK, NCBI 429, Gemini 500, offline}; móvil y escritorio; aviso clínico presente; exportación | Simulada |
| Humo en vivo | script `smoke:live` | 1 búsqueda real + 1 síntesis real tras desplegar | Sí (manual) |
| Datos | `verify-pmids`, test de snapshots | PMIDs reales y coincidencia de título; citas ⊂ abstracts | PMIDs: sí; snapshots: no |
| Seguridad | `check-secrets` | Sin claves en `dist/` | No |
| Carga | autocannon/k6 | 30 VU sobre rutas cacheadas | Sí (prod) |

**Pruebas adversariales de `grounding` (obligatorias):** PMID que no se envió; cita con una palabra cambiada; cita de otro
PMID atribuida a éste; cifra en `statement` ausente de la cita; cita demasiado corta; comillas/guiones tipográficos;
`support: []`; abstract con texto tipo "ignore previous instructions" (no debe alterar el resultado validado).

**Compuerta de calidad previa a desplegar:** `tsc --noEmit` · `eslint` · `vitest run` · `playwright test` · `check-secrets` · `verify-pmids`.

## 2. Revisión clínica (no automatizable)

Lo que ninguna prueba cubre y alguien con criterio clínico debe leer:

- [ ] Cada snapshot: ¿los hallazgos reflejan lo que dicen los abstracts? ¿el `stance` es razonable?
- [ ] Caso C: ¿el aviso pediátrico/"equipo especializado" está visible y bien redactado?
- [ ] Caso D: ¿dice "insuficiente/indirecta" si es lo que hay, sin adornos?
- [ ] El texto no suena a prescripción ("debe", "se recomienda iniciar") — es lenguaje de evidencia.
- [ ] Terminología correcta (*farmacorresistente*, *MASLD*, *respondedores*, *HbA1c*, *β-hidroxibutirato*).
- [ ] El profe valida los PICO sugeridos o los marca como borrador.

## 3. Runbook de la demo (sábado)

**T-60 min (antes de que lleguen):**
1. Abrir `https://<sitio>.netlify.app/api/health` → `ok: true`, `llm: configured`.
2. Pasar los 4 casos completos en el celular **con datos móviles** y en el portátil **con wifi de la UIS** (si es posible).
3. Pre-calentar caché (búsqueda + síntesis de los 4 casos con el código de acceso).
4. Verificar saldo/tope de gasto en la consola del proveedor del LLM, que `LLM_ENABLED=true` y que la key de NCBI esté activa.
5. Tener a mano: código de cohorte, URL, QR de la URL, versión local (`npm run preview` / `netlify dev`) como plan B.

**Durante la clase:**
- Proyectar primero el **Caso C** (evidencia sólida, lecturas del curso) y luego el **D** (evidencia escasa) → contraste pedagógico.
- Mostrar un chip PMID → cita literal → enlace a PubMed (la trazabilidad es el diferenciador).
- Mostrar el registro de búsqueda y explicar que es lo que el profe pidió entregar.
- Vigilar logs de Netlify (pestaña Functions): errores 429 o latencia alta.

**Si algo falla:**

| Síntoma | Acción inmediata |
|---------|-----------------|
| Síntesis no disponible / lenta | Es esperado el modo degradado: usar "Ver ejemplo pregrabado"; explicar que es el resultado generado el {fecha}. |
| NCBI 429 | Los resultados cacheados siguen; esperar 10 s o mostrar snapshot. No refrescar masivamente. |
| El link se filtró y hay tráfico raro | Revocar el código de cohorte (`cohort:revoke`) o poner `LLM_ENABLED=false`; la app sigue en modo "solo evidencia". Emitir un código nuevo en clase. |
| El gasto sube más rápido de lo esperado | Mirar el ledger; bajar cupos o apagar el LLM; el tope duro del proveedor es la última barrera. |
| Sitio caído | Plan B: `netlify dev`/`npm run preview` local sobre snapshots; o abrir directamente PubMed con la ecuación copiada. |
| Estudiante pregunta algo clínico fuera del alcance | Responder que la app es de apoyo educativo; derivar al profe. |

## 4. Registro de riesgos

Probabilidad (P) e impacto (I): A/M/B. Dueño: **D** = desarrollador.

| # | Riesgo | P | I | Mitigación | Plan B |
|---|--------|---|---|------------|--------|
| R1 | La cuenta de pago del LLM no está lista o el modelo previsto no está disponible | M | A | Spike 0.5; proveedor-neutral; caché de síntesis; pre-calentar | Snapshots + PubMed en vivo (modo "solo evidencia"); mostrar síntesis pregrabada con fecha |
| R15 | **Costo descontrolado** (abuso, bug, bucle de reintentos) | M | A | Tope duro en el proveedor + presupuesto propio + cupos + límite de ritmo + caché + interruptor; alertas 50/80 % | Apagar el LLM |
| R16 | **Incumplimiento de términos del proveedor** (uso clínico/consejo médico, datos de pacientes, tier gratuito) | M | A | Solo tier de pago; posicionamiento de literatura/educación; lenguaje no prescriptivo; aviso de IA; detección de datos de paciente (`07` §6) | Cambiar de proveedor (interfaz neutral) o limitar funciones |
| R17 | **Habeas data / privacidad** al recolectar correos (Etapa B) | M | M | Etapa A sin datos personales; política de tratamiento; minimización (sin texto de PICO en servidor); asesoría legal antes de Etapa B | Mantener solo Etapa A |
| R18 | **Nadie paga / sin modelo de negocio claro** | M | M | Patrocinio inicial; licencias por cohorte (canal UIS); Etapa C solo con demanda comprobada | Mantener como herramienta patrocinada |
| R19 | Dependencia de un proveedor y de sus cambios de precio (p. ej. Gemini duplica precios en 2027) | A | B | Interfaz neutral; costos medidos en el ledger; mini-evaluación repetible | Cambiar de modelo |
| R2 | NCBI bloquea/limita por IP | M | M | BFF + key + cola + caché; `tool`/`email` registrados | Caché de 24 h; snapshots |
| R3 | El LLM produce cifras/citas inexactas | A | A | Grounding obligatorio (PMID, subcadena, números); descarte transparente; revisión clínica de snapshots | Mostrar solo lo verificado; `insufficient` |
| R4 | Caso D sin evidencia fuerte y el equipo espera "una respuesta" | A | M | Estado `insufficient` de primera clase; framing pedagógico | — |
| R5 | El PICO/ecuación del constructor devuelve 0 o miles de resultados | M | M | Mostrar conteo y `querytranslation`; ecuación editable; modo "ecuación del profe" | Copiar ecuación y usar PubMed |
| R6 | Fuga de secretos (key al navegador o al repo) | B | A | Solo servidor; `.gitignore`; `check-secrets`; sin BYOK | Rotar keys |
| R7 | Tiempo insuficiente esta noche | A | M | Cortes 1/2/3; camino crítico claro; recortar alcance, no verificación | Entregar Corte 1 |
| R8 | Link filtrado → gasto de cuota o abuso | M | M | Código de acceso, límite por IP, caché | Rotar código |
| R9 | Responsabilidad clínica: alguien usa la salida como indicación | B | A | Avisos persistentes; lenguaje no prescriptivo; sin dosis; pediátrico con aviso | Retirar el sitio |
| R10 | Uso del nombre/identidad de la UIS sin autorización | M | M | Solo texto descriptivo, sin logos; pedir visto bueno al profe | Quitar badge |
| R11 | Documentación del proveedor cambia (Gemini Interactions vs generateContent) | M | M | `LlmProvider` aislado; spike 0.5 | Cambiar solo `gemini.ts` |
| R12 | Netlify/Blobs no disponible en local o en un plan | B | M | Adaptador de caché en memoria; la app funciona sin caché (más lenta) | — |
| R13 | Confusión de repo git (está dentro del repo del home) | M | B | `git init` propio en `WienerProbe` | — |
| R14 | Copyright de abstracts | B | B | Se muestran/citan fragmentos breves con atribución y enlace al original; no se redistribuye texto completo | — |

## 5. Métricas de éxito (post-clase)

- % de equipos que completaron PICO + búsqueda + síntesis + exportación.
- Errores 4xx/5xx en logs; tasa de `cache hit`; latencia p95.
- N.º de afirmaciones descartadas por grounding (indicador de calidad del prompt).
- Comentarios del profe: ¿la app evidenció que la solidez depende de la indicación? (objetivo pedagógico).
