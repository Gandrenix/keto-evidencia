import type { EvidenceRecord, Support, Synthesis } from './schemas.ts'

export type DropReason = 'PMID_NOT_IN_INPUT' | 'QUOTE_NOT_FOUND' | 'QUOTE_LENGTH' | 'NUMBER_NOT_IN_QUOTE' | 'NO_VALID_SUPPORT'
export interface Dropped {
  path: string
  reason: DropReason
}

export const MIN_QUOTE = 20
export const MAX_QUOTE = 400

/** Normaliza para comparar texto: Unicode, minúsculas, comillas/guiones tipográficos unificados, espacios colapsados. */
export function normalize(s: string): string {
  return s
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

const NUM = /\d+(?:[.,]\d+)?/g
const isYear = (n: string) => /^(19|20)\d{2}$/.test(n)
const numbersIn = (s: string) => (s.match(NUM) ?? []).map((n) => n.replace(',', '.'))

/** ¿La cita es subcadena literal (normalizada) de alguna sección del abstract del registro? */
export function quoteInRecord(quote: string, record: EvidenceRecord): 'ok' | 'length' | 'missing' {
  const q = normalize(quote)
  if (q.length < MIN_QUOTE || q.length > MAX_QUOTE || q.includes('...') || q.includes('…')) return 'length'
  return record.abstractSections.some((sec) => normalize(sec.text).includes(q)) ? 'ok' : 'missing'
}

interface Ctx {
  byPmid: Map<string, EvidenceRecord>
  dropped: Dropped[]
}

/** Filtra los soportes válidos de un ítem; registra los motivos de descarte. */
function validSupports(supports: Support[], path: string, ctx: Ctx): Support[] {
  const ok: Support[] = []
  supports.forEach((s, i) => {
    const rec = ctx.byPmid.get(s.pmid)
    if (!rec) return void ctx.dropped.push({ path: `${path}.support[${i}]`, reason: 'PMID_NOT_IN_INPUT' })
    const r = quoteInRecord(s.quote, rec)
    if (r === 'length') return void ctx.dropped.push({ path: `${path}.support[${i}]`, reason: 'QUOTE_LENGTH' })
    if (r === 'missing') return void ctx.dropped.push({ path: `${path}.support[${i}]`, reason: 'QUOTE_NOT_FOUND' })
    ok.push(s)
  })
  return ok
}

/** Todas las cifras del texto (salvo años) deben aparecer en alguna de las citas del ítem. */
function numbersSupported(text: string, supports: Support[]): boolean {
  const inQuotes = new Set(supports.flatMap((s) => numbersIn(normalize(s.quote))))
  return numbersIn(text)
    .filter((n) => !isYear(n))
    .every((n) => inQuotes.has(n))
}

export interface GroundingResult {
  synthesis: Synthesis
  dropped: Dropped[]
}

/**
 * Verificación posterior obligatoria (docs/04 §6): conserva solo lo que se puede comprobar contra los
 * abstracts realmente enviados. Si no queda ningún hallazgo, la postura se fuerza a "insufficient".
 */
export function groundSynthesis(input: Synthesis, records: EvidenceRecord[]): GroundingResult {
  const ctx: Ctx = { byPmid: new Map(records.map((r) => [r.pmid, r])), dropped: [] }

  const findings = input.findings.flatMap((f, i) => {
    const path = `findings[${i}]`
    const support = validSupports(f.support, path, ctx)
    if (support.length === 0) return (ctx.dropped.push({ path, reason: 'NO_VALID_SUPPORT' }), [])
    if (!numbersSupported(f.statement, support)) return (ctx.dropped.push({ path, reason: 'NUMBER_NOT_IN_QUOTE' }), [])
    return [{ ...f, support }]
  })

  const paraclinical = input.paraclinical.flatMap((p, i) => {
    const path = `paraclinical[${i}]`
    const support = validSupports(p.support, path, ctx)
    if (support.length === 0) return (ctx.dropped.push({ path, reason: 'NO_VALID_SUPPORT' }), [])
    if (!numbersSupported(p.observation, support)) return (ctx.dropped.push({ path, reason: 'NUMBER_NOT_IN_QUOTE' }), [])
    return [{ ...p, support }]
  })

  const reportedGrade = input.certainty.reportedGrade.flatMap((g, i) => {
    const path = `certainty.reportedGrade[${i}]`
    const support = validSupports([{ pmid: g.pmid, quote: g.quote }], path, ctx)
    return support.length ? [g] : []
  })

  const limitations = input.certainty.limitations.flatMap((l, i) => {
    if (!l.support) return [l]
    const path = `certainty.limitations[${i}]`
    const support = validSupports([l.support], path, ctx)
    if (support.length === 0) return (ctx.dropped.push({ path, reason: 'NO_VALID_SUPPORT' }), [])
    return [{ ...l, support: support[0]! }]
  })

  const safetyConcerns = input.applicability.safetyConcerns.flatMap((c, i) => {
    const path = `applicability.safetyConcerns[${i}]`
    const support = validSupports([c.support], path, ctx)
    if (support.length === 0) return (ctx.dropped.push({ path, reason: 'NO_VALID_SUPPORT' }), [])
    return [{ ...c, support: support[0]! }]
  })

  const monitoring = input.applicability.monitoring.flatMap((m, i) => {
    if (!m.support) return [m]
    const path = `applicability.monitoring[${i}]`
    const support = validSupports([m.support], path, ctx)
    if (support.length === 0) return (ctx.dropped.push({ path, reason: 'NO_VALID_SUPPORT' }), [])
    return [{ ...m, support: support[0]! }]
  })

  const synthesis: Synthesis = {
    ...input,
    stance: findings.length === 0 ? 'insufficient' : input.stance,
    findings,
    paraclinical,
    certainty: { reportedGrade, limitations },
    applicability: { ...input.applicability, safetyConcerns, monitoring },
  }
  return { synthesis, dropped: ctx.dropped }
}
