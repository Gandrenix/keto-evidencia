import { z } from 'zod'
import { rankRecords } from '../src/shared/ranking.ts'
import { groundSynthesis } from '../src/shared/grounding.ts'
import { buildUserPrompt, PROMPT_VERSION } from '../src/shared/prompt.ts'
import { PicoSchema, SynthesizeRequestSchema, type EvidenceRecord, type SearchResponse } from '../src/shared/schemas.ts'
import { suggestTermsWithLlm } from './terms.ts'
import { esearch, fetchRecords } from './ncbi.ts'
import { TtlCache, sha1Hex } from './cache.ts'
import { generateSynthesis, llmEnabled, llmKeyCount, llmModel, LlmError } from './gemini.ts'

const searchCache = new TtlCache<SearchResponse>(6 * 3600_000)
const recordCache = new TtlCache<EvidenceRecord>(24 * 3600_000, 500)
const synthCache = new TtlCache<unknown>(24 * 3600_000)

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } })
const fail = (status: number, code: string, message: string, retryAfterSec?: number) =>
  json({ error: { code, message, ...(retryAfterSec ? { retryAfterSec } : {}) } }, status, retryAfterSec ? { 'retry-after': String(retryAfterSec) } : {})

function authorized(req: Request): boolean {
  const code = process.env.ACCESS_CODE
  return !code || req.headers.get('x-access-code') === code
}

/* Límite simple de ritmo por IP para la síntesis con IA (las instancias son efímeras: es una barrera básica). */
const hits = new Map<string, number[]>()
function limited(req: Request, max = 6, windowMs = 600_000, bucket = 'synth'): boolean {
  const ip = `${bucket}|${req.headers.get('x-nf-client-connection-ip') ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local'}`
  const now = Date.now()
  const arr = (hits.get(ip) ?? []).filter((t) => now - t < windowMs)
  if (arr.length >= max) return true
  arr.push(now)
  hits.set(ip, arr)
  return false
}

const termsCache = new TtlCache<unknown>(24 * 3600_000)
async function handleTerms(req: Request): Promise<Response> {
  if (!llmEnabled()) return fail(503, 'LLM_DISABLED', 'La IA no está activada en este sitio.')
  if (limited(req, Number(process.env.TERMS_RATE_MAX) || 60, 600_000, 'terms')) return fail(429, 'RATE_LIMITED', 'Demasiadas solicitudes seguidas. Espera unos minutos.', 120)
  let parsed
  try {
    parsed = z.object({ pico: PicoSchema }).strict().safeParse(await req.json())
  } catch {
    return fail(400, 'BAD_REQUEST', 'Cuerpo JSON inválido.')
  }
  if (!parsed.success) return fail(400, 'BAD_REQUEST', 'Solicitud inválida.')
  const { pico } = parsed.data
  try {
    const key = await sha1Hex(JSON.stringify(['terms-v1', llmModel(), pico]))
    const cached = termsCache.get(key)
    if (cached) return json({ ...(cached as object), cache: 'hit' })
    const terms = await suggestTermsWithLlm(pico)
    const out = { ...terms, source: 'ai', model: llmModel() }
    termsCache.set(key, out)
    return json({ ...out, cache: 'miss' })
  } catch (e) {
    if (e instanceof LlmError) {
      const status = e.code === 'LLM_RATE_LIMITED' ? 429 : e.code === 'LLM_DISABLED' ? 503 : 502
      return fail(status, e.code, e.message, e.retryAfterSec)
    }
    return fail(502, 'UPSTREAM', e instanceof Error ? e.message : 'Error desconocido')
  }
}

async function handleSearch(url: URL): Promise<Response> {
  const q = (url.searchParams.get('q') ?? '').trim()
  const n = Math.min(Math.max(Number(url.searchParams.get('n') ?? 20) || 20, 1), 60)
  if (q.length < 3 || q.length > 2000) return fail(400, 'BAD_REQUEST', 'La ecuación de búsqueda debe tener entre 3 y 2000 caracteres.')
  const key = `${n}|${q}`
  const hit = searchCache.get(key)
  if (hit) return json(hit, 200, { 'x-cache': 'hit', 'netlify-cdn-cache-control': 'public, s-maxage=21600, stale-while-revalidate=86400' })
  try {
    const es = await esearch(q, n)
    const records = await fetchRecords(es.pmids)
    records.forEach((r) => recordCache.set(r.pmid, r))
    const out: SearchResponse = {
      searchLog: { executedAt: new Date().toISOString(), database: 'PubMed', query: q, queryTranslation: es.queryTranslation, totalCount: es.totalCount },
      records: rankRecords(records),
    }
    searchCache.set(key, out)
    return json(out, 200, { 'x-cache': 'miss', 'netlify-cdn-cache-control': 'public, s-maxage=21600, stale-while-revalidate=86400' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return fail(/inválida/.test(msg) ? 400 : 502, /inválida/.test(msg) ? 'BAD_QUERY' : 'UPSTREAM_NCBI', msg)
  }
}

async function handleSynthesize(req: Request): Promise<Response> {
  if (!llmEnabled()) return fail(503, 'LLM_DISABLED', 'La síntesis con IA no está activada en este sitio.')
  if (limited(req, Number(process.env.SYNTH_RATE_MAX) || 6)) return fail(429, 'RATE_LIMITED', 'Demasiadas síntesis seguidas. Espera unos minutos.', 120)
  let parsed
  try {
    parsed = SynthesizeRequestSchema.safeParse(await req.json())
  } catch {
    return fail(400, 'BAD_REQUEST', 'Cuerpo JSON inválido.')
  }
  if (!parsed.success) return fail(400, 'BAD_REQUEST', 'Solicitud inválida.')
  const { pico, pmids } = parsed.data
  try {
    const missing = pmids.filter((id) => !recordCache.get(id))
    if (missing.length) (await fetchRecords(missing)).forEach((r) => recordCache.set(r.pmid, r))
    const records = pmids.flatMap((id) => {
      const r = recordCache.get(id)
      return r && r.hasAbstract ? [r] : []
    })
    if (records.length === 0) return fail(400, 'NO_ABSTRACTS', 'Ninguno de los artículos seleccionados tiene abstract.')
    const key = await sha1Hex(JSON.stringify([PROMPT_VERSION, llmModel(), pico, records.map((r) => r.pmid).sort()]))
    const cached = synthCache.get(key)
    if (cached) return json({ ...(cached as object), cache: 'hit' })
    const raw = await generateSynthesis(buildUserPrompt(pico, records))
    const { synthesis, dropped } = groundSynthesis(raw, records)
    const out = { synthesis, dropped, records, meta: { model: llmModel(), promptVersion: PROMPT_VERSION, generatedAt: new Date().toISOString() }, cache: 'miss' }
    synthCache.set(key, out)
    return json(out)
  } catch (e) {
    if (e instanceof LlmError) {
      const status = e.code === 'LLM_RATE_LIMITED' ? 429 : e.code === 'LLM_DISABLED' ? 503 : 502
      return fail(status, e.code, e.message, e.retryAfterSec)
    }
    return fail(502, 'UPSTREAM', e instanceof Error ? e.message : 'Error desconocido')
  }
}

export async function route(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const path = url.pathname.replace(/\/+$/, '')
  if (path === '/api/health')
    return json({ ok: true, llm: llmEnabled() ? 'configured' : 'off', model: llmEnabled() ? llmModel() : null, backupKey: llmKeyCount() > 1, time: new Date().toISOString() })
  if (!authorized(req)) return fail(401, 'UNAUTHORIZED', 'Código de acceso requerido.')
  if (path === '/api/search' && req.method === 'GET') return handleSearch(url)
  if (path === '/api/synthesize' && req.method === 'POST') return handleSynthesize(req)
  if (path === '/api/terms' && req.method === 'POST') return handleTerms(req)
  return fail(404, 'NOT_FOUND', 'Ruta no encontrada.')
}
