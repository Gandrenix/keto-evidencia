import { readFileSync } from 'node:fs'
const [,, caseId, ...ids] = process.argv
const d = JSON.parse(readFileSync(`data/work/caso-${caseId}.json`, 'utf8'))
for (const id of ids) {
  const r = d.records.find((x: { pmid: string }) => x.pmid === id)
  if (!r) { console.log('NO ENCONTRADO', id); continue }
  console.log(`\n=== PMID ${r.pmid} | ${r.designLabel} | ${r.year} | ${r.journal}\n${r.title}`)
  for (const s of r.abstractSections) console.log(`[${s.label}] ${s.text}`)
}
