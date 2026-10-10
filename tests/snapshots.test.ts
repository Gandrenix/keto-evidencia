import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { groundSynthesis } from '../src/shared/grounding.ts'
import { SnapshotSchema } from '../src/shared/schemas.ts'
import { PRESETS } from '../src/shared/presets.ts'

const dir = new URL('../data/snapshots/', import.meta.url)
const files = readdirSync(dir).filter((f) => f.endsWith('.json'))

describe('snapshots L0 (síntesis verificadas)', () => {
  it('existe un snapshot por cada caso preconfigurado', () => {
    expect(files.map((f) => f.replace(/^caso-|\.json$/g, '').toUpperCase()).sort()).toEqual(PRESETS.map((p) => p.id).sort())
  })

  for (const f of files) {
    describe(f, () => {
      const snap = SnapshotSchema.parse(JSON.parse(readFileSync(new URL(f, dir), 'utf8')))
      it('cumple el esquema y no tiene ítems sin verificar', () => {
        const { dropped, synthesis } = groundSynthesis(snap.synthesis, snap.records)
        expect(dropped).toEqual([])
        expect(synthesis).toEqual(snap.synthesis)
      })
      it('todas las referencias citadas están en los artículos del snapshot', () => {
        const ids = new Set(snap.records.map((r) => r.pmid))
        const cited = JSON.stringify(snap.synthesis).match(/"pmid":"(\d+)"/g) ?? []
        cited.forEach((c) => expect(ids.has(c.replace(/\D/g, ''))).toBe(true))
      })
      it('declara su origen y no se presenta como revisado si nadie lo revisó', () => {
        expect(snap.source).toBe('assistant-authored')
        if (!snap.reviewedBy) expect(snap.reviewedBy).toBeNull()
      })
    })
  }

  it('el Caso C incluye las tres lecturas del curso con las cifras que cita el docente', () => {
    const c = SnapshotSchema.parse(JSON.parse(readFileSync(new URL('caso-c.json', dir), 'utf8')))
    const ids = c.records.map((r) => r.pmid)
    ;['32588435', '42391224', '42214220'].forEach((p) => expect(ids).toContain(p))
    const text = JSON.stringify(c.synthesis)
    expect(text).toContain('13 studies with 932 participants')
    expect(text).toContain('1019 people with DRE')
  })
})
