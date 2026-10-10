import { DESIGN_LABELS, type DesignTier } from './schemas.ts'

const has = (types: string[], ...needles: string[]) =>
  types.some((t) => needles.some((n) => t.toLowerCase() === n.toLowerCase()))

/** Clasifica el diseño del estudio a partir de los PublicationType de PubMed (determinista, sin IA). */
export function classifyDesign(pubTypes: string[], title = ''): { tier: DesignTier; label: string } {
  let tier: DesignTier
  if (has(pubTypes, 'Systematic Review', 'Meta-Analysis', 'Network Meta-Analysis')) tier = 1
  else if (has(pubTypes, 'Randomized Controlled Trial', 'Pragmatic Clinical Trial')) tier = 2
  else if (
    has(pubTypes, 'Clinical Trial', 'Controlled Clinical Trial', 'Comparative Study', 'Clinical Trial, Phase II', 'Clinical Trial, Phase III') ||
    /\brandomi[sz]ed\b/i.test(title)
  )
    tier = 3
  else if (has(pubTypes, 'Observational Study', 'Cohort Studies', 'Case-Control Studies') || /\b(cohort|case-control|cross-sectional)\b/i.test(title))
    tier = 4
  else tier = 5

  let label: string = DESIGN_LABELS[tier]
  if (tier === 1 && /umbrella|overview of (systematic )?reviews|review of (systematic )?reviews/i.test(title)) label = 'Revisión de revisiones (umbrella)'
  if (tier === 1 && has(pubTypes, 'Network Meta-Analysis')) label = 'Meta-análisis en red'
  return { tier, label }
}
