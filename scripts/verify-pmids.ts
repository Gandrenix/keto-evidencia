// Comprueba contra PubMed que cada PMID de los snapshots existe y que el título guardado coincide. Uso: npm run pmids:verify
import { readdirSync, readFileSync } from 'node:fs'
import { ncbiSlot } from '../server/ncbi.ts'

const dir = 'data/snapshots'
const all = new Map<string, string>()
for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
  const s = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')) as { records: { pmid: string; title: string }[] }
  s.records.forEach((r) => all.set(r.pmid, r.title))
}
await ncbiSlot()
const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&tool=ketoevidencia&id=${[...all.keys()].join(',')}`
const res = (await (await fetch(url)).json()) as { result: Record<string, { title?: string; error?: string }> }
const norm = (s: string) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
let bad = 0
for (const [pmid, title] of all) {
  const remote = res.result[pmid]?.title
  if (!remote || norm(remote) !== norm(title)) {
    bad++
    console.error(`✘ PMID ${pmid}: guardado «${title.slice(0, 70)}» vs PubMed «${(remote ?? 'NO EXISTE').slice(0, 70)}»`)
  }
}
if (bad) process.exit(1)
console.log(`✔ ${all.size} PMID verificados contra PubMed (existen y los títulos coinciden).`)
