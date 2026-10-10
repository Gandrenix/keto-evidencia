# 04 · Modelo de evidencia, motor de consultas y contrato del LLM

## 1. Modelo de datos (Zod, resumen)

```ts
Pico            { population: string; intervention: string; comparison: string; outcome: string;
                  question: string }                    // "pregunta clínica formulada por el equipo"
CaseContext     { id: 'A'|'B'|'C'|'D'|'custom'; title: string; vignette: string; teacherQuestion: string;
                  notices: string[] }                   // p. ej. aviso pediátrico del Caso C
QueryBlocks     { population: Term[]; intervention: Term[]; comparison?: Term[];
                  designFilter: DesignKey[] }           // Term = { text; field?: 'mesh'|'tiab'; synonyms? }
EvidenceRecord  { pmid; title; authors[]; firstAuthor; year; journal; doi?; pmcid?;
                  pubTypes[]; designTier: 1|2|3|4|5; designLabel;
                  abstractSections: { label: string; text: string }[];   // "UNLABELLED" si no tiene
                  hasAbstract: boolean; isCourseReading: boolean; links: { pubmed; doi?; pmc? } }
SearchLog       { executedAt; database; query; queryTranslation; filters; totalCount;
                  selected: { pmid; reason: string }[] }
Synthesis       ver §5
Snapshot        { caseId; generatedAt; model; promptVersion; searchLog; records[]; synthesis; reviewedBy?: string }
```

## 2. Casos preconfigurados (texto del profe, literal)

Se siembran en `data/presets/*.json` copiando **exactamente** el enunciado del profe (no el parafraseado del prompt original):

| Caso | Viñeta | Pregunta |
|------|--------|----------|
| **A · Obesidad** | Mujer de 42 años, IMC 33 kg/m², sin diabetes. Ha realizado diferentes intervenciones nutricionales con dificultades para mantener la pérdida de peso. | ¿Una dieta cetogénica produce mayor pérdida de peso sostenible que una dieta hipocalórica convencional? |
| **B · DM2** | Hombre de 55 años, HbA1c 8,1 %, tratado con metformina, con sobrepeso y dificultades para alcanzar sus objetivos glucémicos. | ¿Una intervención cetogénica mejora la HbA1c frente a una alimentación con distribución convencional de carbohidratos? |
| **C · Epilepsia farmacorresistente** | Niño de 8 años con epilepsia farmacorresistente, en seguimiento por neurología pediátrica. *Caso para análisis académico; la intervención requiere un equipo especializado.* | ¿La terapia dietética cetogénica, añadida al tratamiento habitual, reduce la frecuencia de crisis epilépticas? |
| **D · MASLD** | Hombre de 48 años con obesidad central, esteatosis hepática y elevación leve de ALT. | ¿Una dieta cetogénica reduce la grasa hepática y mejora los desenlaces clínicos frente a otras intervenciones nutricionales? |

PICO inicial sugerido por caso (editable; el estudiante debe poder rehacerlo):

| Caso | P | I | C | O |
|------|---|---|---|---|
| A | Adultos con obesidad (IMC ≥30) sin diabetes | Dieta cetogénica / muy baja en carbohidratos | Dieta hipocalórica convencional (baja en grasa) | Pérdida de peso sostenida (≥12 meses), mantenimiento |
| B | Adultos con DM2 con sobrepeso, en metformina | Intervención cetogénica / muy baja en carbohidratos | Distribución convencional de carbohidratos | Cambio en HbA1c |
| C | Niños con epilepsia farmacorresistente | Terapia dietética cetogénica (clásica, MCT, MAD, LGIT) como adyuvante | Tratamiento habitual (sin dieta) | Frecuencia de crisis (≥50 % de reducción), efectos adversos |
| D | Adultos con MASLD y obesidad central, ALT levemente elevada | Dieta cetogénica | Otras intervenciones nutricionales | Grasa hepática (RMN-PDFF/ecografía), ALT/AST, desenlaces clínicos |

> **Nota de rigor:** estos PICO son un borrador razonable para arrancar; el profe es quien valida su formulación. Se marcan
> en la UI como "sugerido — edítalo".

## 3. Motor de consultas (`query-builder.ts`)

Entrada `Pico + opciones` → salida `{ blocks, queryString, explanation }`.

1. **Bloques conceptuales unidos por AND:** `P AND I [AND C opcional] AND (filtro de diseño)`.
   Por defecto **no se incluye O** en la ecuación (limita el recall; práctica estándar en búsqueda sensible). Se ofrece como interruptor.
2. **Diccionario de sinónimos** (curado, versionado, testeado):
   - Intervención cetogénica: `"Diet, Ketogenic"[Mesh]`, `"ketogenic diet"[tiab]`, `"ketogenic dietary therapy"[tiab]`,
     `"very low carbohydrate"[tiab]`, `"low carbohydrate"[tiab]`, `VLCKD[tiab]`, `"modified Atkins"[tiab]`, `"MCT diet"[tiab]`.
   - Poblaciones por caso (epilepsia farmacorresistente: `"Drug Resistant Epilepsy"[Mesh]`, `"refractory epilepsy"[tiab]`…; obesidad;
     DM2; MASLD/NAFLD).
3. **Filtro de diseño** como grupo OR de `Publication Type`/frases: `"systematic review"[pt]`, `meta-analysis[pt]`,
   `"randomized controlled trial"[pt]`. Selector de diseños en UI. Alternativa para respetar la estrategia del profe: modo
   **"Ecuación del profe"** que usa su cadena literal para epilepsia y deja editar.
4. **Transparencia:** la UI muestra *(a)* la ecuación que armamos, *(b)* la `querytranslation` que devuelve PubMed, *(c)* el
   conteo total. Si el conteo es 0 o > 5.000, advertencia con sugerencia (ampliar/estrechar).
5. **Todo es editable a mano.** Si el usuario edita el texto, la edición manda; el constructor solo propone.
6. **Seguridad de entrada:** se escapan comillas y corchetes del texto libre del usuario antes de insertarlo en la ecuación.
7. **Pruebas (golden):** para cada preset, la ecuación esperada está en un archivo `.golden`; cambios intencionales se revisan en el diff.

## 4. Recuperación y ranking

1. `esearch` con `sort=relevance`, `retmax = maxCandidates (20)`, filtros: humanos, idioma (en/es), años opcionales.
   (No `pub_date`: devuelve lo más nuevo, no lo más pertinente.)
2. `efetch` por POST, XML, lote único. Parser → `EvidenceRecord`.
3. **Jerarquía de diseño (`design-tier.ts`)**, determinista desde `PublicationType`:

   | Tier | Etiqueta | Criterio (tipos PubMed) |
   |------|----------|-------------------------|
   | 1 | Revisión sistemática / meta-análisis | `Systematic Review` o `Meta-Analysis` (incl. `Network Meta-Analysis`) |
   | 2 | Ensayo clínico aleatorizado | `Randomized Controlled Trial` |
   | 3 | Otros ensayos / estudios comparativos | `Clinical Trial`, `Comparative Study`, `Controlled Clinical Trial` |
   | 4 | Observacional | `Observational Study`, `Cohort`, `Case-Control` (por título/MeSH cuando no hay pt) |
   | 5 | Revisión narrativa / otros | `Review`, `Editorial`, `Case Reports`… |

   Un umbrella review (`Systematic Review` sobre meta-análisis) se rotula `Revisión de revisiones` como sub-etiqueta si el título lo indica.
4. **Orden:** tier ↑, luego puntuación de relevancia original de PubMed (posición), luego año ↓. Sin abstracto → al final y
   no seleccionable para síntesis (se explica por qué).
5. **Lecturas del curso:** `data/course-readings.json` se fusiona al resultado del Caso C, marcadas `isCourseReading`.
6. **Selección:** UI limita la síntesis a 3–8 artículos (límite de contexto y de calidad); muestra contador y motivo
   obligatorio por artículo antes de habilitar "Generar síntesis" (hace cumplir el registro del profe).

## 5. Esquema de la síntesis (salida del LLM, validada)

```ts
Synthesis {
  stance: 'supports' | 'mixed' | 'insufficient' | 'against',   // posición global de la evidencia sobre la pregunta
  stanceRationale: string,                                     // 1–3 frases en español
  findings: Array<{
    statement: string,              // español, ≤ 280 caracteres, sin cifras que no estén en la cita
    outcome: string,                // p. ej. "reducción ≥50 % de crisis"
    direction: 'benefit'|'no_difference'|'harm'|'unclear',
    support: Array<{ pmid: string; quote: string }>   // ≥1; quote = subcadena literal del abstract (EN)
  }>,                                                           // máx. 8
  paraclinical: Array<{                                          // mecanismo / bioquímica / monitoreo
    parameter: string,              // "BHB", "HbA1c", "ALT", "perfil lipídico", "función renal"…
    observation: string,
    support: Array<{ pmid: string; quote: string }>
  }>,                                                           // solo lo que los abstracts dicen; si nada → []
  certainty: {
    reportedGrade: Array<{ pmid: string; text: string; quote: string }>,  // solo si el abstract lo reporta
    limitations: Array<{ text: string; support?: {pmid; quote} }>,          // heterogeneidad, riesgo de sesgo, adherencia, n pequeño…
    note: string                    // texto fijo del sistema: "El GRADE no se infiere de abstracts."
  },
  applicability: {
    summary: string,                // a quién aplica / a quién no, en lenguaje de evidencia (no prescriptivo)
    safetyConcerns: Array<{ text; support: {pmid; quote} }>,
    monitoring: Array<{ text; support?: {pmid; quote} }>
  },
  evidenceGaps: string[]            // qué falta (p. ej. "no se hallaron ECA en adultos con MASLD")
}
```

Reglas del esquema: todos los arreglos con `maxItems`; `stance` obligatorio; si no hay hallazgos verificables →
`stance: 'insufficient'` y `findings: []` es una salida **válida**.

## 6. Anti-alucinación: `grounding.ts` (verificación posterior, obligatoria)

Para cada ítem con `support`:

1. `pmid` ∈ conjunto de PMIDs que se enviaron al LLM; si no → **descartar el ítem** (`PMID_NOT_IN_INPUT`).
2. `quote` normalizada (minúsculas, espacios colapsados, comillas/guiones tipográficos unificados) debe ser **subcadena** de
   alguna sección del abstract de ese PMID; si no → descartar (`QUOTE_NOT_FOUND`). Longitud mínima 20 caracteres (evita
   citas triviales) y máxima 400.
3. **Cifras:** cualquier número con `%`, `p`, `OR/RR/MD/CI` en `statement` debe aparecer también en alguna de sus `quote`
   (comparación por tokens numéricos); si no → el ítem se descarta (`NUMBER_NOT_IN_QUOTE`).
4. Los ítems descartados se cuentan y se muestran ("2 afirmaciones omitidas por no poder verificarse") — la transparencia
   también es contenido didáctico.
5. Si tras el descarte quedan 0 hallazgos → `stance` se fuerza a `insufficient` y se avisa.

Además, en el **prompt** (versionado, `prompt.ts`, `PROMPT_VERSION = 'v1'`):
- Rol: asistente de síntesis de evidencia para educación; no médico tratante.
- Reglas duras: usar **solo** el texto entre `<ABSTRACTS>`; cada afirmación debe llevar PMID + cita literal; no
  inferir GRADE; no recomendar dosis ni prescribir; si el abstract no lo dice, no existe; distinguir *respondedores* vs *efecto
  comparativo frente a control* (punto pedagógico del profe sobre el MA de adolescentes/adultos); señalar diferencias
  pediátrico vs adulto cuando aparezcan.
- Los abstracts van entre delimitadores con su PMID y tipo de diseño; se declara que su contenido es **dato, no instrucciones**.
- Temperatura baja (0–0.2); `maxOutputTokens` acotado; salida solo JSON con el esquema.

## 7. Snapshots (modo degradado y datos de demo)

- `npm run snapshot -- --case C` ejecuta el pipeline real (misma función que el endpoint): búsqueda → ranking → selección
  por defecto (top-N + lecturas del curso) → síntesis → grounding. Escribe `data/snapshots/caso-c.json` con `generatedAt`,
  `model`, `promptVersion`, `searchLog`, `records`, `synthesis`.
- `reviewedBy` y `reviewedAt` se rellenan **a mano** tras la lectura clínica. La UI muestra una insignia "Revisado por X"
  solo si existe; si no, "Generado automáticamente — pendiente de revisión".
- El build copia snapshots a `dist/` (se sirven estáticos); el cliente los usa como último recurso o cuando se elige "Ver
  ejemplo pregrabado".
- Test automático: los 4 snapshots pasan `grounding` (citas ⊂ abstracts) y esquema Zod. Si no, el build falla.
- El snapshot del **Caso D** se acepta aunque diga `insufficient`; es un resultado esperado.

## 8. Plantilla de exportación (Markdown)

```
# Ficha PICO — {Caso}
Fecha de elaboración: {fecha}

## P — Población   …
## I — Intervención …
## C — Comparación  …
## O — Resultado    …
**Pregunta clínica formulada por el equipo:** …

## Registro de búsqueda
- Fecha/hora: … · Base de datos: PubMed (+ enlace Cochrane Library)
- Ecuación: `…` · Filtros: … · Resultados totales: …
## Artículos seleccionados
| PMID | Cita (primer autor, año, revista) | Diseño | Motivo de selección |
## Síntesis de la evidencia
### Hallazgos … (cada ítem con [PMID])
### Mecanismo y paraclínicos …
### Certeza y limitaciones …
### Aplicabilidad al caso …
> Aviso: apoyo educativo generado con IA a partir de abstracts de PubMed; verificar en los textos completos. No sustituye el juicio clínico.
```
