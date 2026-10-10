// Uso: node --experimental-strip-types scripts/build-snapshot.ts C
// Lee data/work/caso-x.json (resultado real de PubMed) + data/authoring/caso-x.json (síntesis redactada con asistencia de IA),
// verifica TODA cita contra los abstracts con grounding.ts y solo entonces escribe data/snapshots/caso-x.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { groundSynthesis } from '../src/shared/grounding.ts'
import { SnapshotSchema, SynthesisSchema, EvidenceRecordSchema } from '../src/shared/schemas.ts'
import { presetById } from '../src/shared/presets.ts'

const id = (process.argv[2] ?? '').toUpperCase()
const preset = presetById(id)
if (!preset) throw new Error('Uso: build-snapshot.ts <A|B|C|D>')
const lower = id.toLowerCase()

const work = JSON.parse(readFileSync(`data/work/caso-${lower}.json`, 'utf8'))
const authoring = JSON.parse(readFileSync(`data/authoring/caso-${lower}.json`, 'utf8')) as {
  pmids: string[]
  model: string
  synthesis: unknown
}

const records = authoring.pmids.map((p) => {
  const r = work.records.find((x: { pmid: string }) => x.pmid === p)
  if (!r) throw new Error(`PMID ${p} no está en data/work/caso-${lower}.json (corre case:fetch)`)
  return EvidenceRecordSchema.parse({ ...r, isCourseReading: preset.courseReadings.includes(p) })
})

const synthesis = SynthesisSchema.parse(authoring.synthesis)
const { synthesis: grounded, dropped } = groundSynthesis(synthesis, records)
if (dropped.length) {
  console.error(`✘ Caso ${id}: ${dropped.length} elemento(s) NO verificables contra los abstracts:`)
  dropped.forEach((d) => console.error(`   - ${d.path}  [${d.reason}]`))
  process.exit(1)
}

const snapshot = SnapshotSchema.parse({
  caseId: id,
  generatedAt: new Date().toISOString(),
  source: 'assistant-authored',
  model: authoring.model,
  reviewedBy: null,
  searchLog: { executedAt: work.executedAt, database: 'PubMed', query: work.query, queryTranslation: work.queryTranslation, totalCount: work.totalCount },
  records,
  synthesis: grounded,
})
mkdirSync('data/snapshots', { recursive: true })
writeFileSync(`data/snapshots/caso-${lower}.json`, JSON.stringify(snapshot, null, 2))
console.log(`✔ Caso ${id}: snapshot escrito (${records.length} artículos, ${grounded.findings.length} hallazgos, todo verificado).`)
