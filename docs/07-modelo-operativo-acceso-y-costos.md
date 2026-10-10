# 07 · Modelo operativo: acceso, costos, identidad y cumplimiento

> **Premisa corregida (2026-10-09):** los usuarios son **profesionales de la salud**. Nadie va a crear una API key de
> Google/Anthropic. Por tanto **el operador (nosotros) pone el LLM** y la herramienta debe poder sostenerse sola:
> cobrar, limitar o ser patrocinada, sin que un uso abusivo queme dinero y sin riesgos legales evitables.
> Este documento reemplaza cualquier mención previa a BYOK (traer tu propia key) y al "modo gratuito de Gemini".

> **Actualización:** mientras no haya presupuesto rige [`08-modo-costo-cero.md`](08-modo-costo-cero.md) (cero pagos: snapshots
> verificados + resumen extractivo sin LLM + LLM gratuito con topes). Este documento describe la ruta a producto **cuando** exista
> quien pague o patrocine; sus conclusiones sobre tier de pago, términos y cumplimiento siguen vigentes para ese momento.

## 1. Conclusión corta

1. **Es viable y barato.** Una síntesis cuesta del orden de **US$ 0,003 – 0,07** según el modelo (cálculo en §3). Mil
   síntesis al mes ≈ **US$ 3–70**. El costo del LLM no es el obstáculo; lo son **(a) el abuso, (b) la identidad del usuario,
   (c) los términos del proveedor para uso médico/privacidad y (d) quién paga**.
2. **El nivel gratuito de Gemini queda descartado para uso profesional:** en el tier gratuito Google puede usar los
   prompts/respuestas para mejorar sus productos, revisores humanos pueden leerlos y sus términos dicen "no envíes
   información sensible, confidencial o personal". Hace falta **proyecto con facturación activa** (tier de pago): ahí
   los datos *no* se usan para mejorar productos.
3. **La app se divide en dos niveles de servicio:**
   - **Gratis y casi sin costo variable:** formular PICO, construir ecuación, buscar en PubMed, ranking por diseño,
     selección con motivo, registro de búsqueda, exportación (RF-01…08, 13, 14). Costo ≈ 0 (solo NCBI + caché).
   - **Medido:** *síntesis con IA* (RF-09…11). Consume un cupo ("créditos de síntesis") por usuario/cohorte.
4. **Acceso por etapas** para no bloquear la clase del sábado y a la vez ser un producto real:
   - **Etapa A (sábado):** *códigos de cohorte* (un código por grupo/clase) con tope de síntesis por código y por
     dispositivo, más presupuesto global y botón de apagado. Sin cuentas.
   - **Etapa B (producto):** cuentas (email + enlace mágico / Google) con cupo mensual por usuario y tableros de uso.
   - **Etapa C (negocio):** planes de pago (créditos/suscripción) y licencias institucionales por cohorte.
5. **Posicionamiento legal:** herramienta de **apoyo a la revisión de literatura y educación**, para profesionales
   cualificados que verifican el resultado; **no** de diagnóstico ni de indicación terapéutica individual; **sin datos
   identificables de pacientes**. Es lo que permite cumplir los términos de los proveedores (§6).

## 2. Proveedor de LLM: qué se verificó y cómo decidir

Interfaz `LlmProvider` ya prevista en `03`. Candidatos (precios por 1 M de tokens; **verificar de nuevo el día de contratar**):

| Modelo | Entrada | Salida | Datos en tier de pago | Notas |
|--------|--------:|-------:|-----------------------|-------|
| Claude Haiku 5.5 (`claude-haiku-5-5`) | US$ 0,10 | US$ 0,50 | Política de Anthropic (ver §6) | Muy barato; JSON estructurado; razonamiento adaptativo activado por defecto (esfuerzo `medium`) → fijar `low` para extracción. Precios válidos hasta 100K tokens de prompt. |
| Claude Sonnet 5.5 (`claude-sonnet-5-5`) | US$ 2 | US$ 10 | ídem | Más calidad de redacción/juicio; caché de lectura US$ 0,20. |
| Gemini 3.5 Flash-Lite | US$ 0,30 | US$ 2,50 | No se usan para mejorar productos (tier de pago) | Estable; recomendado por Google para proyectos nuevos. |
| Gemini 3.8 Flash | US$ 0,75 (2026) → 1,50 (2027) | US$ 3,75 → 7,50 | ídem | **El precio se duplica el 1-ene-2027** según la página oficial. |

Fuentes: tabla de modelos de Anthropic (caché local del skill `claude-api`, 2026-10-06) y `ai.google.dev/gemini-api/docs/pricing` (hoy).

**Decisión de modelo = resultado de una evaluación, no de una opinión.** En la Fase 0 se corre una mini-evaluación
sobre los 4 casos con 2–3 modelos candidatos y se compara:
1. % de ítems que **pasan el grounding** (PMID válido + cita literal + números respaldados).
2. Legibilidad/utilidad clínica (revisión humana ciega, escala 1–5).
3. Latencia y costo medido (con `usage` real, incluyendo tokens de razonamiento).
Valor provisional hasta medir: **Sonnet 5.5** para producción (calidad en texto clínico; sigue costando centavos) con
**Haiku 5.5** como modo económico, y Gemini 3.5 Flash-Lite como alternativa/respaldo entre proveedores.
La pasarela entre proveedores (failover) es opcional y se difiere.

## 3. Economía unitaria (estimación a validar con `usage` real)

Supuestos de una síntesis: 6 abstracts seleccionados ≈ 3.000 tokens + instrucciones y esquema ≈ 1.500 + PICO ≈ 300 →
**≈ 5–6 K tokens de entrada**; salida JSON ≈ **2 K tokens**; razonamiento interno (facturado como salida) **0–4 K**.

| Modelo | Sin razonamiento | Con 3 K de razonamiento | 1.000 síntesis |
|--------|-----------------:|------------------------:|---------------:|
| Haiku 5.5 | ≈ US$ 0,0016 | ≈ US$ 0,003 | **≈ US$ 2–3** |
| Gemini 3.5 Flash-Lite | ≈ US$ 0,007 | ≈ US$ 0,015 | ≈ US$ 7–15 |
| Gemini 3.8 Flash | ≈ US$ 0,012 | ≈ US$ 0,023 | ≈ US$ 12–23 (el doble en 2027) |
| Sonnet 5.5 | ≈ US$ 0,032 | ≈ US$ 0,062 | **≈ US$ 30–60** |

Reductores: **caché de síntesis** por hash (misma pregunta + mismos PMIDs → 0 costo; una clase de 30 sobre el mismo caso ≈ 1
llamada), **caché de prompt** del prefijo fijo (instrucciones + esquema), y tope de 8 artículos.

**Costos fijos mensuales previsibles (pilot):** Netlify Free (300 créditos; Personal US$ 9 con 1.000) · NCBI key US$ 0 ·
Supabase Free US$ 0 (**se pausa tras 1 semana sin actividad**) o Pro desde US$ 25 · dominio ~US$ 12/año. → **US$ 0 – 35/mes**
más el variable del LLM. (`⚠` Netlify: la página de precios no aclara si el plan gratuito se pausa al agotar créditos —verificar
antes de depender de él en producción.)

## 4. Control de gasto y abuso (defensa en profundidad)

Orden de las barreras, de la más externa a la más interna. **Todas** deben existir antes de abrir a usuarios fuera de la clase.

| Capa | Mecanismo | Qué evita |
|------|-----------|-----------|
| 1 | **Tope duro en el proveedor** (límite de gasto mensual del proyecto/workspace: Google AI Studio tiene *Project Spend Cap*; en Anthropic, límite de gasto por workspace en la consola — `⚠ verificar` el procedimiento exacto; con retardo de aplicación de unos minutos) | Un bug o ataque no puede gastar más que X al mes |
| 2 | **Presupuesto global diario/mensual propio** (contador en BD) + **interruptor de apagado** (`LLM_ENABLED=false` o flag en BD) | Corta antes que el proveedor; cambia a modo "solo PubMed" sin redeploy |
| 3 | **Cupo por usuario** (Etapa B) o **por código de cohorte + dispositivo** (Etapa A): p. ej. 10 síntesis/día, 60/mes | Un usuario no consume el pozo común |
| 4 | **Límite de ritmo por IP/token** (p. ej. 6 síntesis por 10 min) | Ráfagas/scripts |
| 5 | **Caché** de búsqueda y síntesis | La mayor parte del tráfico legítimo no toca el LLM |
| 6 | **Topes de entrada/salida** (≤ 8 PMIDs, `max_tokens` acotado, texto PICO ≤ N caracteres) | Prompts gigantes |
| 7 | **Anti-bot en registro** (Cloudflare Turnstile u otro; Etapa B) | Cuentas falsas masivas |
| 8 | **Alertas**: aviso al superar 50/80 % del presupuesto (correo/push) | Sorpresas a fin de mes |

**Modo degradado "solo evidencia":** si 1–4 cortan el LLM, la app **sigue siendo útil** (búsqueda, ranking, selección,
registro de búsqueda, exportación, y los abstracts estructurados). Es una función de primera clase, no un error.

## 5. Identidad, datos y arquitectura mínima por etapas

### Etapa A — Códigos de cohorte (sábado; reemplaza al "access code" único)

- Tabla/colección `cohorts`: `{ code, name, expiresAt, maxSynthPerDevicePerDay, maxSynthTotal, enabled }` (Blobs o archivo
  de configuración en variables de entorno; sin BD nueva).
- El cliente genera un `deviceId` aleatorio en `localStorage` (no es identidad, solo reparte cupo).
- Cabecera `x-cohort-code` + `x-device-id`; el servidor valida, cuenta y registra en un *ledger* de uso (clave
  `usage:{cohort}:{yyyy-mm-dd}:{device}` en Blobs con operaciones atómicas o, si no alcanza, BD).
- Códigos creados/revocados por el operador desde un script (`npm run cohort:create`).

### Etapa B — Cuentas y cupos individuales

- **Auth:** email con enlace mágico/OTP + opcional Google. Candidato por defecto: **Supabase Auth** (50.000 usuarios activos
  mensuales gratis; Postgres incluido para el ledger). Alternativa a evaluar en spike: base de datos propia de Netlify
  (aparece en su plan gratuito; detalles no verificados). Evitar construir autenticación propia.
- **Datos que se guardan (mínimos):** `user(id, email, createdAt, plan)`, `usage_ledger(userId, ts, kind, model,
  inputTokens, outputTokens, costUsd, cacheHit, requestId)`, `entitlements`. **No se guarda el texto del PICO ni los
  abstracts por usuario**: la clave de caché es un *hash*; el trabajo del usuario vive en su navegador y en sus exportaciones.
  (Si luego se ofrece "historial en la nube", será opt-in, cifrado y con su propia política.)
- **Verificación de profesión (opcional):** campo declarativo (nutricionista, médico, estudiante…) + aceptación de términos;
  no se valida tarjeta profesional en v1.
- **Panel mínimo del operador:** consumo por día/cohorte/usuario, costo estimado, tasa de caché, descartes de grounding.
  Puede ser un script/consulta SQL al inicio.

### Etapa C — Monetización

| Modelo | Cómo funciona | Cuándo encaja |
|--------|---------------|---------------|
| **Patrocinado** | El operador o una institución absorbe el costo; cupos generosos | Piloto, diplomados, demostración |
| **Licencia por cohorte/institución** | Pago único o anual por grupo (p. ej. un diplomado); código de cohorte con N síntesis incluidas | **Encaja con el canal actual (UIS y círculo del profe)**; factura simple; sin pasarela recurrente |
| **Créditos prepago** | Paquetes de síntesis que no caducan o caducan en 12 meses | Usuarios individuales ocasionales |
| **Suscripción** | Cupo mensual + renovación | Usuarios frecuentes (investigadores, docentes) |

Pasarela de pagos (`⚠ decisión y verificación pendientes`): en Colombia, **Wompi** (Bancolombia) documenta tokenización de
tarjetas/Nequi para cobros recurrentes y soporta PSE/Nequi; la disponibilidad directa de Stripe en Colombia aparece con
información contradictoria en las fuentes consultadas, así que **no se asume**. Para cobros internacionales en USD podría
evaluarse un comercio-de-registro (tipo Paddle/Lemon Squeezy) —no investigado aún. Etapa C **no** se construye antes de
validar que alguien pague; el diseño solo deja el *ledger* y los *entitlements* listos.

Regla de negocio sugerida (a validar con datos reales de costo, §3): con COGS de LLM ≈ US$ 0,01–0,06 por síntesis, un
plan de **40 síntesis/mes** cuesta ≈ **US$ 0,4–2,5** de LLM; el margen lo decide el precio, no la infraestructura.

## 6. Cumplimiento y términos de los proveedores (leer antes de lanzar)

> No soy asesor legal. Esto resume lo verificado en las páginas oficiales y marca lo que debe confirmar un abogado.

| Tema | Hallazgo | Consecuencia |
|------|----------|--------------|
| **Gemini API — datos** | Gratis: contenido usado para mejorar productos, revisión humana posible, "no enviar información sensible". Pago (proyecto con facturación): no se usa para mejorar productos; se registra por un periodo limitado solo para seguridad/abuso. | Usar **solo tier de pago**. Nunca el gratuito para usuarios. |
| **Gemini API — uso médico** | Los términos dicen que el servicio **no puede usarse en práctica clínica ni para dar consejo médico**, ni confiarse para consejo médico. Mayores de 18. | Si se usa Gemini, el producto debe ser **herramienta de revisión de literatura/educación**, nunca de decisión clínica. Riesgo mayor que con Anthropic si el posicionamiento se vuelve "recomienda tratamiento". |
| **Anthropic — política de uso** | Uso médico **no está prohibido**; "recomendar/iniciar/ajustar tratamiento, diagnosticar" es *alto riesgo* y exige **revisión por humano cualificado** y **aviso de uso de IA**; educación general en salud/nutrición queda fuera de esos requisitos. | Nuestro diseño (apoyo a lectura de literatura, avisos, usuario profesional que verifica) es compatible; **mantener el aviso de IA y evitar lenguaje de prescripción**. |
| **Datos de pacientes** | Ningún proveedor debe recibir datos identificables. | Aviso en la UI + detección básica de patrones (documento, teléfono, correo) en los campos de texto con advertencia/bloqueo. |
| **Habeas Data (Colombia, Ley 1581 de 2012)** | Se recolectan correos/nombres en Etapa B. | Política de tratamiento de datos, aviso de privacidad, consentimiento, canal de consultas; revisar con asesor si aplica el registro ante la SIC (RNBD). Etapa A no recolecta datos personales. |
| **Producto de salud regulado** | Una herramienta que apoya decisiones clínicas individuales podría caer en regulación de dispositivos/software médico. | Posicionar y diseñar como **búsqueda y resumen de literatura**, sin entrada de datos de pacientes ni salida prescriptiva. |
| **Derechos de abstracts** | Citas breves con atribución y enlace al original. | No redistribuir textos completos. |

Documentos a producir antes de la Etapa B: **Términos de uso**, **Aviso de privacidad / política de datos**, **Descargo
clínico** (texto único reutilizado en la UI, en la exportación y en el pie), **Política de IA** (qué hace y qué no).

## 7. Cambios que esto introduce en el resto del plan

| Doc | Cambio |
|-----|--------|
| `00` | Se retira la pregunta "¿tienes key de Gemini?"; nuevas preguntas: quién paga, qué cuenta de proveedor, etapa inicial. |
| `01` | RF-16 pasa a **Must** y se amplía (códigos de cohorte); nuevos RF-21…26 (cupos, apagado, ledger, modo "solo evidencia", términos/privacidad, detección de datos de paciente). Se declara explícitamente *fuera de alcance* el BYOK. |
| `02` | Nueva sección de términos de datos y precios; corrección sobre el tier gratuito. |
| `03` | `LlmProvider` neutral (Anthropic/Gemini); componente de acceso/cupos/ledger; nuevos endpoints (`/api/usage`, admin); ADR 11–13. |
| `05` | Nueva Fase 2B (acceso, cupos, apagado) dentro del Corte 1; Fase 0 incluye mini-evaluación de modelos; Etapas B y C como fases post-clase. |
| `06` | Nuevos riesgos de costo, cumplimiento y dependencia de proveedor. |

## 8. Decisiones que necesito del operador (con recomendación)

1. **¿Quién paga el LLM al inicio?** Recomendado: tú, con tope duro de **US$ 20–30/mes** al comienzo (cubre cientos de
   síntesis incluso con Sonnet). Alternativa: que el profe o la UIS patrocine el piloto.
2. **¿Con qué cuenta?** Recomendado: abrir cuenta de pago en **Anthropic** (prepago con tope) y/o proyecto de Google con
   facturación (tier de pago). Las keys las pones tú en Netlify; yo nunca las veo ni las escribo en archivos.
3. **¿Empezamos con Etapa A (códigos de cohorte) y dejamos cuentas para después de ver el uso real?** Recomendado: sí.
4. **¿Intención de cobrar?** Define si Etapa C se diseña ya o se difiere hasta que haya demanda comprobada.
