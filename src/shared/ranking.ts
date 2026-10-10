import type { EvidenceRecord } from './schemas.ts'

/** Cada nivel de diseño "cuesta" este número de posiciones de relevancia de PubMed. */
export const TIER_WEIGHT = 4

/**
 * Puntaje = posición de relevancia que dio PubMed (Best Match, 0 = mejor) + TIER_WEIGHT × (nivel de diseño − 1).
 * Así una revisión sistemática pesa más que un ECA a igual relevancia, pero una revisión tangencial
 * (p. ej. otra enfermedad) no desplaza a un ECA muy pertinente. Sin abstract → al final. Empate → año más reciente.
 * `records` debe venir en el orden de relevancia original de PubMed.
 */
export function rankRecords(records: EvidenceRecord[]): EvidenceRecord[] {
  const score = (r: EvidenceRecord, i: number) => i + TIER_WEIGHT * (r.designTier - 1)
  return records
    .map((r, i) => ({ r, s: score(r, i) }))
    .sort((a, b) => {
      if (a.r.hasAbstract !== b.r.hasAbstract) return a.r.hasAbstract ? -1 : 1
      if (a.s !== b.s) return a.s - b.s
      return Number(b.r.year) - Number(a.r.year)
    })
    .map((x) => x.r)
}
