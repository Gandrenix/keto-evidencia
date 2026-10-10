import { z } from 'zod'

/* ───────── PICO ───────── */
const text = (max: number) => z.string().max(max)

export const PicoSchema = z
  .object({
    population: text(600),
    intervention: text(600),
    comparison: text(600),
    outcome: text(600),
    question: text(800),
  })
  .strict()
export type Pico = z.infer<typeof PicoSchema>

/* ───────── Evidencia ───────── */
export const DESIGN_LABELS = {
  1: 'Revisión sistemática / meta-análisis',
  2: 'Ensayo clínico aleatorizado',
  3: 'Otro ensayo / estudio comparativo',
  4: 'Estudio observacional',
  5: 'Revisión narrativa u otro',
} as const
export type DesignTier = 1 | 2 | 3 | 4 | 5

export const AbstractSectionSchema = z.object({ label: z.string(), text: z.string() })
export type AbstractSection = z.infer<typeof AbstractSectionSchema>

export const EvidenceRecordSchema = z.object({
  pmid: z.string().regex(/^\d{1,9}$/),
  title: z.string(),
  authors: z.array(z.string()),
  firstAuthor: z.string(),
  year: z.string(),
  journal: z.string(),
  doi: z.string().nullable(),
  pmcid: z.string().nullable(),
  pubTypes: z.array(z.string()),
  designTier: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  designLabel: z.string(),
  abstractSections: z.array(AbstractSectionSchema),
  hasAbstract: z.boolean(),
  isCourseReading: z.boolean().default(false),
})
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>

export const SearchLogSchema = z.object({
  executedAt: z.string(),
  database: z.string(),
  query: z.string(),
  queryTranslation: z.string(),
  totalCount: z.number(),
})
export type SearchLog = z.infer<typeof SearchLogSchema>

export const SearchResponseSchema = z.object({
  searchLog: SearchLogSchema,
  records: z.array(EvidenceRecordSchema),
})
export type SearchResponse = z.infer<typeof SearchResponseSchema>

/* ───────── Síntesis ───────── */
export const SupportSchema = z.object({ pmid: z.string(), quote: z.string() })
export type Support = z.infer<typeof SupportSchema>

const supports = z.array(SupportSchema).min(1).max(4)

export const FindingSchema = z.object({
  statement: z.string().max(400),
  outcome: z.string().max(200),
  direction: z.enum(['benefit', 'no_difference', 'harm', 'unclear']),
  support: supports,
})
export type Finding = z.infer<typeof FindingSchema>

export const ParaclinicalSchema = z.object({
  parameter: z.string().max(120),
  observation: z.string().max(400),
  support: supports,
})

export const SynthesisSchema = z.object({
  stance: z.enum(['supports', 'mixed', 'insufficient', 'against']),
  stanceRationale: z.string().max(600),
  findings: z.array(FindingSchema).max(12), // el prompt pide ≤ 8 al modelo; el tope mayor admite snapshots redactados a mano
  paraclinical: z.array(ParaclinicalSchema).max(8),
  certainty: z.object({
    reportedGrade: z.array(z.object({ pmid: z.string(), text: z.string().max(300), quote: z.string() })).max(6),
    limitations: z.array(z.object({ text: z.string().max(400), support: SupportSchema.optional() })).max(8),
  }),
  applicability: z.object({
    summary: z.string().max(900),
    safetyConcerns: z.array(z.object({ text: z.string().max(400), support: SupportSchema })).max(8),
    monitoring: z.array(z.object({ text: z.string().max(400), support: SupportSchema.optional() })).max(8),
  }),
  evidenceGaps: z.array(z.string().max(300)).max(8),
})
export type Synthesis = z.infer<typeof SynthesisSchema>

export const SYNTHESIS_NOTE = 'El grado GRADE no se infiere de abstracts: solo se muestra cuando el abstract lo reporta.'

/* ───────── Capas de síntesis ───────── */
export type SynthesisLayer = 'L0' | 'L1' | 'L2'
export const LAYER_LABELS: Record<SynthesisLayer, string> = {
  L0: 'Síntesis verificada (elaborada con asistencia de IA y comprobada contra los abstracts)',
  L1: 'Resumen extractivo (texto literal de los abstracts, sin IA)',
  L2: 'Síntesis generada por IA gratuita (verificada automáticamente; revisar siempre)',
}

/* ───────── Snapshots ───────── */
export const SnapshotSchema = z.object({
  caseId: z.string(),
  generatedAt: z.string(),
  source: z.enum(['assistant-authored', 'pipeline-llm']),
  model: z.string(),
  reviewedBy: z.string().nullable(),
  searchLog: SearchLogSchema,
  records: z.array(EvidenceRecordSchema),
  synthesis: SynthesisSchema,
})
export type Snapshot = z.infer<typeof SnapshotSchema>

/* ───────── API ───────── */
export const SynthesizeRequestSchema = z
  .object({ pico: PicoSchema, pmids: z.array(z.string().regex(/^\d{1,9}$/)).min(1).max(8) })
  .strict()
export type SynthesizeRequest = z.infer<typeof SynthesizeRequestSchema>

export const ApiErrorSchema = z.object({
  error: z.object({ code: z.string(), message: z.string(), retryAfterSec: z.number().optional() }),
})
export type ApiError = z.infer<typeof ApiErrorSchema>
