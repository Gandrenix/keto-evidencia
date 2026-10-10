import { callGemini, extractJson, llmEnabled, LlmError } from './gemini.ts'
import { cleanTerms, type Terms } from '../src/shared/terms.ts'
import type { Pico } from '../src/shared/schemas.ts'

const SYSTEM = `Eres un bibliotecario médico experto en estrategias de búsqueda para PubMed.
Recibes una pregunta PICO escrita en español y devuelves términos de búsqueda EN INGLÉS para tres bloques: population, intervention y comparison.

REGLAS
1. Cada bloque es una lista de 2 a 6 términos que se unirán con OR: sinónimos, variantes y, cuando exista, el descriptor MeSH con el formato "Nombre MeSH"[Mesh].
2. Las frases de varias palabras van entre comillas dobles. Sin operadores AND/OR/NOT dentro de un término.
3. En population usa SOLO la condición o problema principal. No combines comorbilidades con OR (por ejemplo, para «diabetes tipo 2 y sobrepeso» usa solo los términos de diabetes tipo 2), porque unirlas ampliaría la búsqueda a personas que solo tienen una de ellas.
4. Usa terminología médica estándar en inglés (por ejemplo "type 2 diabetes", "drug resistant epilepsy"). No incluyas el desenlace (outcome).
5. Si el comparador es "tratamiento habitual", "placebo" o similar y no tiene un término de búsqueda útil, deja comparison como lista vacía.
6. Responde SOLO con un objeto JSON: {"population": [...], "intervention": [...], "comparison": [...]}. Sin texto adicional.`

export async function suggestTermsWithLlm(pico: Pico): Promise<Terms> {
  if (!llmEnabled()) throw new LlmError('LLM_DISABLED', 'La IA no está activada.')
  const user = `P: ${pico.population}\nI: ${pico.intervention}\nC: ${pico.comparison}\nO: ${pico.outcome}\nPregunta: ${pico.question}`
  const parsed = extractJson(await callGemini(user, SYSTEM, 800)) as Record<string, unknown>
  const terms: Terms = { population: cleanTerms(parsed.population), intervention: cleanTerms(parsed.intervention), comparison: cleanTerms(parsed.comparison) }
  if (terms.population.length === 0 && terms.intervention.length === 0) throw new LlmError('LLM_BAD_OUTPUT', 'La IA no devolvió términos utilizables.')
  return terms
}
