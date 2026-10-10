import type { AbstractSection, EvidenceRecord } from './schemas.ts'

export interface ExtractiveEntry {
  pmid: string
  title: string
  firstAuthor: string
  year: string
  journal: string
  designLabel: string
  designTier: number
  /** Secciones textuales que resumen resultados/conclusiones (copia literal). */
  keySections: AbstractSection[]
  /** Frases literales con cifras y términos de desenlace. */
  keySentences: string[]
}

export interface ExtractiveSummary {
  entries: ExtractiveEntry[]
  counts: { total: number; systematicReviews: number; rcts: number; other: number; withoutAbstract: number }
}

const KEY_LABEL = /(main results?|results?|findings|conclusions?|authors'? conclusions?|interpretation|outcomes?)/i
const OUTCOME_TERMS =
  /(reduc|improv|decreas|increas|seizure|weight|hba1c|glyc|ketone|hydroxybutyr|alt\b|liver|fat|lipid|cholesterol|adverse|safety|withdraw|response|responder|remission)/i

/** Divide en frases sin alterar el texto (cada frase es subcadena del original). */
export function splitSentences(text: string): string[] {
  const out: string[] = []
  const re = /[^.!?]*[.!?](?=\s|$)|[^.!?]+$/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const s = m[0].trim()
    if (s) out.push(s)
  }
  return out
}

export function extractRecord(r: EvidenceRecord): ExtractiveEntry {
  const keySections = r.abstractSections.filter((s) => KEY_LABEL.test(s.label))
  const pool = (keySections.length ? keySections : r.abstractSections).flatMap((s) => splitSentences(s.text))
  const keySentences = pool.filter((s) => /\d/.test(s) && OUTCOME_TERMS.test(s)).slice(0, 4)
  return {
    pmid: r.pmid,
    title: r.title,
    firstAuthor: r.firstAuthor,
    year: r.year,
    journal: r.journal,
    designLabel: r.designLabel,
    designTier: r.designTier,
    keySections,
    keySentences,
  }
}

/** Resumen L1: sin IA. Todo lo que muestra es texto literal de los abstracts. */
export function extractiveSummary(records: EvidenceRecord[]): ExtractiveSummary {
  return {
    entries: records.map(extractRecord),
    counts: {
      total: records.length,
      systematicReviews: records.filter((r) => r.designTier === 1).length,
      rcts: records.filter((r) => r.designTier === 2).length,
      other: records.filter((r) => r.designTier > 2).length,
      withoutAbstract: records.filter((r) => !r.hasAbstract).length,
    },
  }
}
