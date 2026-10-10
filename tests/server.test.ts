import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { route } from '../server/router.ts'
import { extractJson } from '../server/gemini.ts'

const xml = readFileSync(new URL('./fixtures/efetch-epilepsy.xml', import.meta.url), 'utf8')
const GOOD_QUOTE = 'We rated the evidence for all outcomes as low to very low certainty.'

const synthesisJson = (quote: string, pmid = '32588435') =>
  JSON.stringify({
    stance: 'supports',
    stanceRationale: 'x',
    findings: [{ statement: 'La certeza fue baja a muy baja.', outcome: 'certeza', direction: 'unclear', support: [{ pmid, quote }] }],
    paraclinical: [],
    certainty: { reportedGrade: [], limitations: [] },
    applicability: { summary: 's', safetyConcerns: [], monitoring: [] },
    evidenceGaps: [],
  })

let geminiBodies: string[] = []
function stubFetch(geminiReplies: (string | number)[]) {
  geminiBodies = []
  let g = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url)
      if (u.includes('esearch.fcgi'))
        return new Response(JSON.stringify({ esearchresult: { idlist: ['32588435', '42214220'], count: '2', querytranslation: 'translated' } }))
      if (u.includes('efetch.fcgi')) return new Response(xml)
      if (u.includes('generativelanguage.googleapis.com')) {
        geminiBodies.push(String(init?.body))
        const reply = geminiReplies[Math.min(g++, geminiReplies.length - 1)]!
        if (typeof reply === 'number') return new Response('{}', { status: reply })
        return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: reply }] } }] }))
      }
      throw new Error('fetch no simulado: ' + u)
    }),
  )
}

const req = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init)
const pico = { population: 'p', intervention: 'i', comparison: 'c', outcome: 'o', question: 'q' }
const post = (body: unknown) => req('/api/synthesize', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } })

beforeEach(() => {
  process.env.GEMINI_API_KEY = 'test-key'
  delete process.env.ACCESS_CODE
  delete process.env.LLM_ENABLED
  process.env.GEMINI_MODEL = 'test-model'
  process.env.SYNTH_RATE_MAX = '1000'
  delete process.env.GEMINI_API_KEY_BACKUP
})
afterEach(() => vi.unstubAllGlobals())

describe('/api/health', () => {
  it('informa si hay LLM configurado y no expone la clave', async () => {
    const r = await route(req('/api/health'))
    const j = await r.json()
    expect(j.llm).toBe('configured')
    expect(JSON.stringify(j)).not.toContain('test-key')
  })
  it('LLM_ENABLED=false apaga la IA', async () => {
    process.env.LLM_ENABLED = 'false'
    expect((await (await route(req('/api/health'))).json()).llm).toBe('off')
  })
})

describe('/api/search', () => {
  it('devuelve registros clasificados y el registro de búsqueda', async () => {
    stubFetch([])
    const r = await route(req('/api/search?q=' + encodeURIComponent('ketogenic AND epilepsy test1')))
    expect(r.status).toBe(200)
    const j = await r.json()
    expect(j.searchLog.queryTranslation).toBe('translated')
    expect(j.records).toHaveLength(2)
    expect(j.records[0].designTier).toBe(1)
  })
  it('rechaza consultas vacías', async () => {
    expect((await route(req('/api/search?q=a'))).status).toBe(400)
  })
  it('exige el código de acceso cuando está configurado', async () => {
    process.env.ACCESS_CODE = 'clase'
    expect((await route(req('/api/search?q=abc'))).status).toBe(401)
  })
})

describe('/api/synthesize', () => {
  it('conserva la cita literal y descarta lo inventado (grounding en el servidor)', async () => {
    stubFetch([synthesisJson(GOOD_QUOTE)])
    const ok = await (await route(post({ pico, pmids: ['32588435'] }))).json()
    expect(ok.synthesis.findings).toHaveLength(1)
    expect(ok.dropped).toHaveLength(0)

    stubFetch([synthesisJson('This sentence was invented by the model and is not in the abstract.')])
    const bad = await (await route(post({ pico: { ...pico, question: 'q2' }, pmids: ['32588435'] }))).json()
    expect(bad.synthesis.findings).toHaveLength(0)
    expect(bad.synthesis.stance).toBe('insufficient')
    expect(bad.dropped.length).toBeGreaterThan(0)
  })
  it('un PMID que no se envió se descarta', async () => {
    stubFetch([synthesisJson(GOOD_QUOTE, '42214220')])
    const j = await (await route(post({ pico: { ...pico, question: 'q3' }, pmids: ['32588435'] }))).json()
    expect(j.synthesis.findings).toHaveLength(0)
  })
  it('reintenta una vez si el JSON no cumple el esquema', async () => {
    stubFetch(['{"nada": true}', synthesisJson(GOOD_QUOTE)])
    const r = await route(post({ pico: { ...pico, question: 'q4' }, pmids: ['32588435'] }))
    expect(r.status).toBe(200)
    expect(geminiBodies).toHaveLength(2)
  })
  it('traduce el 429 del proveedor a un error claro', async () => {
    stubFetch([429])
    const r = await route(post({ pico: { ...pico, question: 'q5' }, pmids: ['32588435'] }))
    expect(r.status).toBe(429)
    expect((await r.json()).error.code).toBe('LLM_RATE_LIMITED')
  })
  it('responde 503 si la IA está apagada y no llama al proveedor', async () => {
    process.env.LLM_ENABLED = 'false'
    stubFetch([synthesisJson(GOOD_QUOTE)])
    const r = await route(post({ pico, pmids: ['32588435'] }))
    expect(r.status).toBe(503)
    expect(geminiBodies).toHaveLength(0)
  })
  it('valida la entrada (sin PMIDs → 400) y no acepta texto de abstracts del cliente', async () => {
    expect((await route(post({ pico, pmids: [] }))).status).toBe(400)
    expect((await route(post({ pico, pmids: ['1'], abstracts: 'texto del cliente' }))).status).toBe(400)
  })
})

describe('clave de respaldo', () => {
  const replyOk = () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: synthesisJson(GOOD_QUOTE) }] } }] }))
  function stubByKey(handlers: Record<string, () => Response>, seen: string[]) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url)
        if (u.includes('esearch.fcgi')) return new Response(JSON.stringify({ esearchresult: { idlist: ['32588435'], count: '1', querytranslation: 't' } }))
        if (u.includes('efetch.fcgi')) return new Response(xml)
        const key = (init?.headers as Record<string, string>)['x-goog-api-key']!
        seen.push(key)
        return handlers[key]!()
      }),
    )
  }
  it('si la principal agota su cupo (429), usa la de respaldo y el usuario no nota el fallo', async () => {
    process.env.GEMINI_API_KEY = 'K-PRIMARIA'
    process.env.GEMINI_API_KEY_BACKUP = 'K-RESPALDO'
    const seen: string[] = []
    stubByKey({ 'K-PRIMARIA': () => new Response('{}', { status: 429 }), 'K-RESPALDO': replyOk }, seen)
    const r = await route(post({ pico: { ...pico, question: 'respaldo-1' }, pmids: ['32588435'] }))
    expect(r.status).toBe(200)
    expect(seen).toEqual(['K-PRIMARIA', 'K-RESPALDO'])
    expect((await r.json()).synthesis.findings).toHaveLength(1)
  })
  it('una clave rechazada (403) también pasa a la de respaldo, y la pausada se prueba al final', async () => {
    process.env.GEMINI_API_KEY = 'K-MALA'
    process.env.GEMINI_API_KEY_BACKUP = 'K-BUENA'
    const seen: string[] = []
    stubByKey({ 'K-MALA': () => new Response('{}', { status: 403 }), 'K-BUENA': replyOk }, seen)
    expect((await route(post({ pico: { ...pico, question: 'respaldo-2' }, pmids: ['32588435'] }))).status).toBe(200)
    seen.length = 0
    expect((await route(post({ pico: { ...pico, question: 'respaldo-3' }, pmids: ['32588435'] }))).status).toBe(200)
    expect(seen[0]).toBe('K-BUENA') // la mala quedó en pausa: no se vuelve a intentar primero
  })
  it('si fallan las dos claves, devuelve el error del proveedor', async () => {
    process.env.GEMINI_API_KEY = 'K-1'
    process.env.GEMINI_API_KEY_BACKUP = 'K-2'
    stubByKey({ 'K-1': () => new Response('{}', { status: 429 }), 'K-2': () => new Response('{}', { status: 429 }) }, [])
    const r = await route(post({ pico: { ...pico, question: 'respaldo-4' }, pmids: ['32588435'] }))
    expect(r.status).toBe(429)
  })
  it('/api/health indica si hay respaldo pero nunca expone las claves', async () => {
    process.env.GEMINI_API_KEY = 'K-1'
    process.env.GEMINI_API_KEY_BACKUP = 'K-2'
    const body = await (await route(req('/api/health'))).text()
    expect(JSON.parse(body).backupKey).toBe(true)
    expect(body).not.toMatch(/K-1|K-2/)
  })
})

describe('extractJson', () => {
  it('tolera bloques de código', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })
})
