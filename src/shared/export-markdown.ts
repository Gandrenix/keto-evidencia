import type { EvidenceRecord, Pico, SearchLog, Synthesis, SynthesisLayer } from './schemas.ts'
import { LAYER_LABELS } from './schemas.ts'
import type { ExtractiveSummary } from './extractive.ts'

export const CLINICAL_DISCLAIMER =
  'Apoyo educativo para revisión de literatura. No sustituye el juicio clínico ni genera indicaciones individuales. No uses esta herramienta con pacientes reales sin verificar primero la evidencia en los textos completos y con un profesional cualificado.'

export interface ExportInput {
  caseTitle: string
  pico: Pico
  searchLog: SearchLog | null
  selected: { record: EvidenceRecord; reason: string }[]
  layer: SynthesisLayer | null
  synthesis: Synthesis | null
  extractive: ExtractiveSummary | null
  droppedCount: number
  now?: Date
}

const cite = (r: EvidenceRecord) => `${r.firstAuthor} et al., ${r.year}. ${r.journal}`
const pm = (id: string) => `https://pubmed.ncbi.nlm.nih.gov/${id}/`
const clean = (s: string) => s.replace(/\|/g, '\\|').replace(/\s+/g, ' ')
const refs = (support: { pmid: string; quote: string }[]) => support.map((s) => `[PMID ${s.pmid}](${pm(s.pmid)}): «${s.quote}»`).join(' · ')

const DIRECTION: Record<string, string> = { benefit: 'beneficio', no_difference: 'sin diferencia', harm: 'daño', unclear: 'poco claro' }
const STANCE: Record<string, string> = {
  supports: 'La evidencia respalda la pregunta',
  mixed: 'Evidencia mixta',
  insufficient: 'Evidencia insuficiente o no concluyente',
  against: 'La evidencia no respalda la pregunta',
}

export function exportMarkdown(i: ExportInput): string {
  const when = (i.now ?? new Date()).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })
  const L: string[] = []
  L.push(`# Ficha PICO — ${i.caseTitle || 'Caso propio'}`, `Fecha de elaboración: ${when}`, '')
  L.push('## P — Población', i.pico.population || '—', '', '## I — Intervención', i.pico.intervention || '—', '')
  L.push('## C — Comparación', i.pico.comparison || '—', '', '## O — Resultado', i.pico.outcome || '—', '')
  L.push('**Pregunta clínica formulada por el equipo:**', i.pico.question || '—', '')

  L.push('## Registro de búsqueda')
  if (i.searchLog) {
    L.push(
      `- Fecha y hora de la búsqueda: ${new Date(i.searchLog.executedAt).toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short' })}`,
      `- Base de datos: ${i.searchLog.database} (Cochrane Library: consultar con la misma estrategia)`,
      `- Ecuación de búsqueda: \`${i.searchLog.query}\``,
      `- Traducción de PubMed: \`${i.searchLog.queryTranslation}\``,
      `- Resultados totales: ${i.searchLog.totalCount}`,
    )
  } else L.push('- No se ejecutó búsqueda en vivo en esta sesión.')
  L.push('', '## Artículos seleccionados')
  if (i.selected.length) {
    L.push('| PMID | Cita | Diseño | Motivo de selección |', '|---|---|---|---|')
    i.selected.forEach(({ record: r, reason }) =>
      L.push(`| [${r.pmid}](${pm(r.pmid)}) | ${clean(r.title)} — ${clean(cite(r))} | ${r.designLabel} | ${clean(reason) || '—'} |`),
    )
  } else L.push('Ninguno.')

  L.push('', '## Síntesis de la evidencia')
  if (i.layer) L.push(`_Origen: ${LAYER_LABELS[i.layer]}_`, '')
  if (i.synthesis) {
    const s = i.synthesis
    L.push(`**${STANCE[s.stance]}.** ${s.stanceRationale}`, '', '### Hallazgos')
    s.findings.length
      ? s.findings.forEach((f) => L.push(`- ${f.statement} _(${DIRECTION[f.direction]})_  \n  ${refs(f.support)}`))
      : L.push('- Sin hallazgos verificables.')
    L.push('', '### Mecanismo y paraclínicos')
    s.paraclinical.length
      ? s.paraclinical.forEach((p) => L.push(`- **${p.parameter}:** ${p.observation}  \n  ${refs(p.support)}`))
      : L.push('- No reportado en los abstracts seleccionados.')
    L.push('', '### Certeza y limitaciones')
    s.certainty.reportedGrade.length
      ? s.certainty.reportedGrade.forEach((g) => L.push(`- GRADE reportado: ${g.text} — [PMID ${g.pmid}](${pm(g.pmid)}): «${g.quote}»`))
      : L.push('- Certeza GRADE no reportada en los abstracts seleccionados.')
    s.certainty.limitations.forEach((l) => L.push(`- ${l.text}${l.support ? `  \n  ${refs([l.support])}` : ''}`))
    L.push('', '### Aplicabilidad al caso', s.applicability.summary)
    s.applicability.safetyConcerns.forEach((c) => L.push(`- Seguridad: ${c.text}  \n  ${refs([c.support])}`))
    s.applicability.monitoring.forEach((m) => L.push(`- Monitoreo: ${m.text}${m.support ? `  \n  ${refs([m.support])}` : ''}`))
    if (s.evidenceGaps.length) L.push('', '### Brechas de evidencia', ...s.evidenceGaps.map((g) => `- ${g}`))
    if (i.droppedCount) L.push('', `_${i.droppedCount} afirmación(es) fueron omitidas por no poder verificarse contra los abstracts._`)
  } else if (i.extractive) {
    const c = i.extractive.counts
    L.push(`Se revisaron ${c.total} artículo(s): ${c.systematicReviews} revisión(es) sistemática(s)/meta-análisis, ${c.rcts} ECA, ${c.other} de otros diseños.`, '')
    i.extractive.entries.forEach((e) => {
      L.push(`### ${e.firstAuthor} et al., ${e.year} — ${e.designLabel} ([PMID ${e.pmid}](${pm(e.pmid)}))`)
      e.keySections.forEach((s) => L.push(`**${s.label}:** ${s.text}`, ''))
      e.keySentences.forEach((s) => L.push(`> ${s}`))
      L.push('')
    })
  } else L.push('Sin síntesis generada.')

  L.push('', '---', `> ${CLINICAL_DISCLAIMER}`, '> Generado con ayuda de IA a partir de abstracts de PubMed; verificar en los textos completos.')
  return L.join('\n')
}
