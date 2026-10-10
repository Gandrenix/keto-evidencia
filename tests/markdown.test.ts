import { describe, expect, it } from 'vitest'
import { renderMarkdown } from '../src/lib/markdown.ts'
import { exportMarkdown } from '../src/shared/export-markdown.ts'
import { SnapshotSchema } from '../src/shared/schemas.ts'
import { readFileSync } from 'node:fs'

describe('renderMarkdown', () => {
  it('títulos, negrita, código y enlaces https', () => {
    const h = renderMarkdown('# Título\n\n**Pregunta:** ver `x` y [PubMed](https://pubmed.ncbi.nlm.nih.gov/1/)')
    expect(h).toContain('<h1>Título</h1>')
    expect(h).toContain('<strong>Pregunta:</strong>')
    expect(h).toContain('<code>x</code>')
    expect(h).toContain('<a href="https://pubmed.ncbi.nlm.nih.gov/1/"')
  })
  it('tablas con encabezado y filas (sin la línea separadora)', () => {
    const h = renderMarkdown('| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 \\| 5 |')
    expect(h).toContain('<th>A</th>')
    expect(h.match(/<tr>/g)).toHaveLength(3)
    expect(h).toContain('<td>4 | 5</td>')
    expect(h).not.toContain('---')
  })
  it('listas con línea de continuación y citas', () => {
    const h = renderMarkdown('- hallazgo  \n  [PMID 1](https://x.org/1): «cita»\n- otro\n\n> aviso')
    expect(h).toContain('<ul><li>hallazgo<br />')
    expect(h).toContain('<blockquote>aviso</blockquote>')
  })
  it('escapa HTML y rechaza enlaces que no sean http(s): no se puede inyectar nada', () => {
    const h = renderMarkdown('<script>alert(1)</script> [x](javascript:alert(1)) <img src=x onerror=alert(1)>')
    expect(h).not.toContain('<script')
    expect(h).not.toContain('<img')
    expect(h).not.toContain('href="javascript')
    expect(h).toContain('&lt;script&gt;')
  })
  it('la ficha real del Caso C se renderiza completa y sin símbolos Markdown sueltos', () => {
    const snap = SnapshotSchema.parse(JSON.parse(readFileSync(new URL('../data/snapshots/caso-c.json', import.meta.url), 'utf8')))
    const md = exportMarkdown({
      caseTitle: 'Caso C',
      pico: { population: 'P', intervention: 'I', comparison: 'C', outcome: 'O', question: 'Q' },
      searchLog: snap.searchLog,
      selected: snap.records.slice(0, 2).map((record) => ({ record, reason: 'motivo | con barra' })),
      layer: 'L0',
      synthesis: snap.synthesis,
      extractive: null,
      droppedCount: 0,
    })
    const h = renderMarkdown(md)
    expect(h).toContain('<h1>Ficha PICO')
    expect(h).toContain('<table>')
    expect(h.match(/<h2>/g)!.length).toBeGreaterThanOrEqual(6)
    const text = h.replace(/<[^>]+>/g, '')
    expect(text).not.toMatch(/\*\*|^#{1,3} |^\|/m)
  })
})
