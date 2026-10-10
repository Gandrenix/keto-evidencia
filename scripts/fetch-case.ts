// Uso: npm run case:fetch -- C [maxCandidates]
// Corre el pipeline real (PubMed) para un caso y escribe data/work/caso-X.json (insumo para redactar y revisar el snapshot).
import { mkdirSync, writeFileSync } from 'node:fs'
import { buildQuery } from '../src/shared/query-builder.ts'
import { presetById } from '../src/shared/presets.ts'
import { rankRecords } from '../src/shared/ranking.ts'
import { esearch, fetchRecords } from '../server/ncbi.ts'

const id = (process.argv[2] ?? 'C').toUpperCase()
const n = Number(process.argv[3] ?? 20)
const preset = presetById(id)
if (!preset) throw new Error(`Caso desconocido: ${id}`)

const query = buildQuery(preset.blocks)
console.log(`Caso ${id}\nQuery: ${query}`)
const es = await esearch(query, n)
console.log(`Total PubMed: ${es.totalCount} · candidatos: ${es.pmids.length}`)
const extra = preset.courseReadings.filter((p) => !es.pmids.includes(p))
const records = (await fetchRecords([...es.pmids, ...extra])).map((r) => ({ ...r, isCourseReading: preset.courseReadings.includes(r.pmid) }))
const ranked = rankRecords(records)
mkdirSync('data/work', { recursive: true })
writeFileSync(
  `data/work/caso-${id.toLowerCase()}.json`,
  JSON.stringify({ query, queryTranslation: es.queryTranslation, totalCount: es.totalCount, executedAt: new Date().toISOString(), records: ranked }, null, 2),
)
for (const r of ranked) console.log(`[T${r.designTier}] ${r.pmid} ${r.year} ${r.journal.slice(0, 28).padEnd(28)} ${r.hasAbstract ? 'abs' : '---'} ${r.title.slice(0, 95)}`)
