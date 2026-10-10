import { z } from 'zod'
import { KETO_INTERVENTION_TERMS } from './query-builder.ts'
import type { Pico } from './schemas.ts'

export const TermsSchema = z.object({
  population: z.array(z.string()).max(12),
  intervention: z.array(z.string()).max(12),
  comparison: z.array(z.string()).max(12),
})
export type Terms = z.infer<typeof TermsSchema>

const SAFE = /^[A-Za-z0-9 "'\-[\]/.,()]+$/
const BOOLEAN_WORD = /\b(AND|OR|NOT)\b/

/** Limpia términos de búsqueda propuestos (por IA o por el usuario): sin operadores sueltos, sin símbolos raros, máx. 8. */
export function cleanTerms(raw: unknown, max = 8): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const x of raw) {
    if (typeof x !== 'string') continue
    let t = x.replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
    if (t.length < 2 || t.length > 80 || !SAFE.test(t) || BOOLEAN_WORD.test(t.replace(/"[^"]*"/g, ''))) continue
    if (/\s/.test(t) && !/["[\]()]/.test(t)) t = `"${t}"`
    if (!out.some((o) => o.toLowerCase() === t.toLowerCase())) out.push(t)
    if (out.length >= max) break
  }
  return out
}

type Block = 'population' | 'intervention' | 'comparison'
interface Entry {
  block: Block
  re: RegExp
  terms: string[]
}

/** Glosario ES→EN para sugerir términos sin IA (siempre disponible). */
const GLOSSARY: Entry[] = [
  { block: 'population', re: /obesidad|obeso|sobrepeso/i, terms: ['obesity', '"Obesity"[Mesh]', 'overweight'] },
  { block: 'population', re: /prediabetes/i, terms: ['prediabetes', '"Prediabetic State"[Mesh]'] },
  { block: 'population', re: /diabetes\s*(mellitus\s*)?(tipo\s*(2|ii)|2)\b|\bdm\s*2\b|dm2/i, terms: ['"type 2 diabetes"', '"Diabetes Mellitus, Type 2"[Mesh]'] },
  { block: 'population', re: /diabetes\s*(mellitus\s*)?(tipo\s*(1|i)|1)\b/i, terms: ['"type 1 diabetes"', '"Diabetes Mellitus, Type 1"[Mesh]'] },
  { block: 'population', re: /s[ií]ndrome metab[oó]lico/i, terms: ['"metabolic syndrome"', '"Metabolic Syndrome"[Mesh]'] },
  { block: 'population', re: /\bmasld\b|\bnafld\b|h[ií]gado graso|esteatosis|esteat[oó]sica/i, terms: ['MASLD', 'NAFLD', '"fatty liver"', '"steatotic liver disease"'] },
  { block: 'population', re: /ovario poliqu[ií]stico|\bsop\b|\bpcos\b/i, terms: ['"polycystic ovary syndrome"', 'PCOS'] },
  { block: 'population', re: /hipertensi[oó]n|presi[oó]n arterial alta/i, terms: ['hypertension', '"Hypertension"[Mesh]'] },
  { block: 'population', re: /dislipid|hipercolesterol|colesterol alto|triglic[eé]ridos altos/i, terms: ['dyslipidemia', 'hypercholesterolemia', '"Dyslipidemias"[Mesh]'] },
  { block: 'population', re: /migra[ñn]a|cefalea/i, terms: ['migraine', '"Migraine Disorders"[Mesh]'] },
  { block: 'population', re: /alzheimer|demencia|deterioro cognitivo/i, terms: ['"Alzheimer disease"', 'dementia', '"cognitive impairment"'] },
  { block: 'population', re: /parkinson/i, terms: ['"Parkinson disease"', '"Parkinson Disease"[Mesh]'] },
  { block: 'population', re: /esclerosis m[uú]ltiple/i, terms: ['"multiple sclerosis"', '"Multiple Sclerosis"[Mesh]'] },
  { block: 'population', re: /autis/i, terms: ['autism', '"Autism Spectrum Disorder"[Mesh]'] },
  { block: 'population', re: /depresi[oó]n/i, terms: ['depression', '"Depressive Disorder"[Mesh]'] },
  { block: 'population', re: /c[aá]ncer|tumor|neoplasia|oncol[oó]g|glioma|glioblastoma/i, terms: ['cancer', '"Neoplasms"[Mesh]'] },
  { block: 'intervention', re: /cetog[eé]nic|keto|atkins|muy baj[oa] en carbohidratos|vlckd|cetosis/i, terms: KETO_INTERVENTION_TERMS },
  { block: 'intervention', re: /baj[oa] en carbohidratos|low.?carb/i, terms: ['"low carbohydrate diet"', '"Diet, Carbohydrate-Restricted"[Mesh]'] },
  { block: 'intervention', re: /ayuno|intermitente/i, terms: ['"intermittent fasting"', '"Intermittent Fasting"[Mesh]'] },
  { block: 'comparison', re: /hipocal[oó]ric|restricci[oó]n cal[oó]rica|baja en calor[ií]as/i, terms: ['"caloric restriction"', '"low calorie diet"', '"energy restriction"'] },
  { block: 'comparison', re: /baj[oa] en grasa|bajo en grasa/i, terms: ['"low fat diet"', '"Diet, Fat-Restricted"[Mesh]'] },
  { block: 'comparison', re: /mediterr[aá]ne/i, terms: ['"Mediterranean diet"', '"Diet, Mediterranean"[Mesh]'] },
]

const EPILEPSY = /epilepsia|crisis epil[eé]pticas|convulsi/i
const RESISTANT = /farmacorresist|refractari|resistente|drug.?resistant/i

export interface TermSuggestion extends Terms {
  /** Qué bloques se pudieron inferir del texto (para avisar al usuario de lo que falta). */
  found: { population: boolean; intervention: boolean; comparison: boolean }
  /** Otras condiciones detectadas en P que NO se usaron (OR las amplía); el usuario decide si las agrega. */
  ignoredPopulation: string[]
}

/**
 * PICO en español → términos de búsqueda en inglés, con glosario (sin IA).
 * Población: solo la condición principal (la primera que aparece en el texto). Unir condiciones con OR
 * ampliaría la búsqueda a personas que solo tienen una de ellas (p. ej. «DM2 y sobrepeso»).
 */
export function suggestTermsFromPico(pico: Pico): TermSuggestion {
  const text: Record<Block, string> = { population: `${pico.population} ${pico.question}`, intervention: pico.intervention, comparison: pico.comparison }
  const out: Terms = { population: [], intervention: [], comparison: [] }
  const add = (block: Block, terms: string[]) => terms.forEach((t) => !out[block].includes(t) && out[block].push(t))

  // Población: candidatos con su posición en el texto
  const popCandidates: { index: number; terms: string[] }[] = GLOSSARY.filter((e) => e.block === 'population')
    .map((e) => ({ index: text.population.search(e.re), terms: e.terms }))
    .filter((c) => c.index >= 0)
  const epIdx = text.population.search(EPILEPSY)
  if (epIdx >= 0) {
    popCandidates.push({
      index: epIdx,
      terms: RESISTANT.test(text.population) ? ['"drug resistant epilepsy"', '"refractory epilepsy"'] : ['epilepsy', '"Epilepsy"[Mesh]'],
    })
  }
  popCandidates.sort((a, b) => a.index - b.index)
  if (popCandidates[0]) add('population', popCandidates[0].terms)

  for (const e of GLOSSARY) {
    if (e.block === 'population') continue
    // «bajo en carbohidratos» no debe duplicar la rama cetogénica
    if (e.block === 'intervention' && e.terms[0] === '"low carbohydrate diet"' && out.intervention.includes(KETO_INTERVENTION_TERMS[0]!)) continue
    if (e.re.test(text[e.block])) add(e.block, e.terms)
  }
  return {
    population: cleanTerms(out.population),
    intervention: cleanTerms(out.intervention),
    comparison: cleanTerms(out.comparison),
    found: { population: out.population.length > 0, intervention: out.intervention.length > 0, comparison: out.comparison.length > 0 },
    ignoredPopulation: popCandidates.slice(1).map((c) => c.terms[0]!.replace(/"/g, '')),
  }
}
