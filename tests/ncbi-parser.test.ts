import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parsePubmedXml } from '../server/ncbi.ts'
import { EvidenceRecordSchema } from '../src/shared/schemas.ts'

const xml = readFileSync(new URL('./fixtures/efetch-epilepsy.xml', import.meta.url), 'utf8')

describe('parsePubmedXml (fixture real de NCBI)', () => {
  const recs = parsePubmedXml(xml)
  it('devuelve los dos registros válidos según el esquema', () => {
    expect(recs.map((r) => r.pmid).sort()).toEqual(['32588435', '42214220'])
    recs.forEach((r) => expect(EvidenceRecordSchema.safeParse(r).success).toBe(true))
  })
  it('el Cochrane 2020 se clasifica como revisión sistemática y tiene abstract estructurado', () => {
    const c = recs.find((r) => r.pmid === '32588435')!
    expect(c.designTier).toBe(1)
    expect(c.journal).toMatch(/Cochrane/i)
    expect(c.year).toBe('2020')
    expect(c.abstractSections.map((s) => s.label)).toContain('MAIN RESULTS')
    expect(c.doi).toBeTruthy()
  })
  it('la revisión de Seizure 2026 se parsea con título y año', () => {
    const s = recs.find((r) => r.pmid === '42214220')!
    expect(s.title.length).toBeGreaterThan(20)
    expect(s.year).toBe('2026')
    expect(s.hasAbstract).toBe(true)
  })
})
