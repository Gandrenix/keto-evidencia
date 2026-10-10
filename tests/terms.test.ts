import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanTerms, suggestTermsFromPico } from '../src/shared/terms.ts'
import { buildQuery } from '../src/shared/query-builder.ts'
import { PRESETS } from '../src/shared/presets.ts'
import { route } from '../server/router.ts'

const pico = (over: Partial<Record<'population' | 'intervention' | 'comparison' | 'outcome' | 'question', string>> = {}) => ({
  population: '',
  intervention: '',
  comparison: '',
  outcome: '',
  question: '',
  ...over,
})

describe('suggestTermsFromPico (glosario sin IA)', () => {
  it('Caso A: obesidad + cetogénica + hipocalórica', () => {
    const s = suggestTermsFromPico(PRESETS[0]!.pico)
    expect(s.population).toContain('obesity')
    expect(s.intervention).toContain('"ketogenic diet"')
    expect(s.comparison).toContain('"caloric restriction"')
  })
  it('Caso C: epilepsia farmacorresistente usa los términos del profesor', () => {
    const s = suggestTermsFromPico(PRESETS[2]!.pico)
    expect(s.population).toEqual(expect.arrayContaining(['"drug resistant epilepsy"', '"refractory epilepsy"']))
    expect(s.intervention).toEqual(expect.arrayContaining(['"ketogenic diet"', '"ketogenic dietary therapy"']))
  })
  it('SOP, DM2 y MASLD se reconocen', () => {
    expect(suggestTermsFromPico(pico({ population: 'Mujeres con síndrome de ovario poliquístico' })).population).toContain('"polycystic ovary syndrome"')
    expect(suggestTermsFromPico(pico({ population: 'Adultos con diabetes mellitus tipo 2' })).population).toContain('"type 2 diabetes"')
    expect(suggestTermsFromPico(pico({ population: 'Hombre con hígado graso' })).population).toContain('NAFLD')
  })
  it('«bajo en carbohidratos» sin cetogénica no duplica ramas', () => {
    const s = suggestTermsFromPico(pico({ population: 'obesidad', intervention: 'dieta baja en carbohidratos' }))
    expect(s.intervention).toContain('"low carbohydrate diet"')
    expect(s.intervention).not.toContain('"ketogenic diet"')
  })
  it('si no reconoce nada lo dice (found=false) en vez de inventar', () => {
    const s = suggestTermsFromPico(pico({ population: 'xyzzy', intervention: 'plugh' }))
    expect(s.found.population).toBe(false)
    expect(s.found.intervention).toBe(false)
  })
  it('usa solo la condición principal: «DM2 y sobrepeso» no amplía a obesidad', () => {
    const s = suggestTermsFromPico(PRESETS[1]!.pico)
    expect(s.population).toEqual(['"type 2 diabetes"', '"Diabetes Mellitus, Type 2"[Mesh]'])
    expect(s.ignoredPopulation).toContain('obesity')
    const q = buildQuery({ population: s.population, intervention: s.intervention, comparison: [], designs: ['sr', 'ma', 'rct'] })
    expect(q).toMatch(/^\(\"type 2 diabetes\" OR/)
    expect(q).not.toContain('obesity')
  })
  it('Caso D: MASLD es la condición principal aunque mencione obesidad central', () => {
    const s = suggestTermsFromPico(PRESETS[3]!.pico)
    expect(s.population).toContain('MASLD')
    expect(s.population).not.toContain('obesity')
  })
})

describe('cleanTerms (entrada de IA o del usuario)', () => {
  it('quita operadores, símbolos raros y duplicados; pone comillas a frases', () => {
    expect(cleanTerms(['type 2 diabetes', 'a AND b', 'x; DROP', '"Obesity"[Mesh]', 'obesity', 'OBESITY', 5, '', 'ok-term'])).toEqual(['"type 2 diabetes"', '"Obesity"[Mesh]', 'obesity', 'ok-term'])
  })
  it('no es array → vacío; respeta el máximo', () => {
    expect(cleanTerms('x')).toEqual([])
    expect(cleanTerms(Array.from({ length: 20 }, (_, i) => `term${i}`))).toHaveLength(8)
  })
})

describe('/api/terms', () => {
  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'k'
    process.env.GEMINI_MODEL = 'm'
    delete process.env.LLM_ENABLED
    delete process.env.ACCESS_CODE
  })
  afterEach(() => vi.unstubAllGlobals())
  const post = (b: unknown) => route(new Request('http://x/api/terms', { method: 'POST', body: JSON.stringify(b), headers: { 'content-type': 'application/json' } }))
  const p = pico({ population: 'Adultos con SOP', intervention: 'Dieta cetogénica', question: 'q-terms-1' })
  const stub = (text: string) =>
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }))))

  it('devuelve términos limpios y descarta los peligrosos', async () => {
    stub(JSON.stringify({ population: ['polycystic ovary syndrome', 'PCOS', 'a OR b; drop'], intervention: ['"ketogenic diet"'], comparison: [] }))
    const r = await post({ pico: p })
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.population).toEqual(['"polycystic ovary syndrome"', 'PCOS'])
    expect(j.intervention).toEqual(['"ketogenic diet"'])
  })
  it('respuesta sin términos útiles → 502', async () => {
    stub(JSON.stringify({ population: [], intervention: [], comparison: [] }))
    expect((await post({ pico: { ...p, question: 'q-terms-2' } })).status).toBe(502)
  })
  it('IA apagada → 503 y no llama al proveedor', async () => {
    process.env.LLM_ENABLED = 'false'
    expect((await post({ pico: p })).status).toBe(503)
  })
  it('entrada inválida → 400', async () => {
    expect((await post({ nada: 1 })).status).toBe(400)
  })
})
