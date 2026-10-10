export type DesignKey = 'sr' | 'ma' | 'rct'

export interface QueryBlocks {
  /** Términos de población/problema en inglés (se unen con OR). */
  population: string[]
  /** Términos de intervención en inglés (se unen con OR). */
  intervention: string[]
  /** Términos de comparador (opcional; se unen con OR). Por defecto no se usa. */
  comparison: string[]
  designs: DesignKey[]
}

export const KETO_INTERVENTION_TERMS = [
  '"ketogenic diet"',
  '"ketogenic dietary therapy"',
  '"Diet, Ketogenic"[Mesh]',
  '"very low carbohydrate ketogenic diet"',
]

const DESIGN_TERMS: Record<DesignKey, string[]> = {
  sr: ['"systematic review"'],
  ma: ['"meta-analysis"'],
  rct: ['"randomized controlled trial"'],
}
export const DESIGN_OPTIONS: { key: DesignKey; label: string }[] = [
  { key: 'sr', label: 'Revisión sistemática' },
  { key: 'ma', label: 'Meta-análisis' },
  { key: 'rct', label: 'Ensayo aleatorizado' },
]

/** Escapa lo mínimo para que el texto libre del usuario no rompa la sintaxis de PubMed. */
export function sanitizeTerm(raw: string): string {
  return raw.replace(/[“”]/g, '"').replace(/[\r\n\t]+/g, ' ').trim()
}

/** Convierte "a; b; c" (o una línea por término) en términos; agrega comillas a frases con espacios que no las tengan. */
export function parseTermList(raw: string): string[] {
  return raw
    .split(/[;\n]/)
    .map(sanitizeTerm)
    .filter(Boolean)
    .map((t) => (/\s/.test(t) && !/["\[\]()]/.test(t) ? `"${t}"` : t))
}

const group = (terms: string[]) => (terms.length === 0 ? '' : terms.length === 1 ? terms[0]! : `(${terms.join(' OR ')})`)

/** PICO → ecuación booleana. P AND I [AND C] AND (diseños). El desenlace (O) no se incluye: limita el recall. */
export function buildQuery(blocks: QueryBlocks): string {
  const designTerms = blocks.designs.flatMap((d) => DESIGN_TERMS[d])
  return [group(blocks.population), group(blocks.intervention), group(blocks.comparison), group(designTerms)]
    .filter(Boolean)
    .join(' AND ')
}

export const pubmedUrl = (query: string) => `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(query)}`
export const cochraneUrl = (query: string) =>
  `https://www.cochranelibrary.com/search?searchBy=1&searchText=${encodeURIComponent(query)}`
