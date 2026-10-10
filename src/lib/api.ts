import { SearchResponseSchema, type EvidenceRecord, type Pico, type SearchResponse, type Synthesis } from '../shared/schemas.ts'

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 0,
    public retryAfterSec?: number,
  ) {
    super(message)
  }
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  let code = ''
  try {
    code = localStorage.getItem('keto.accessCode') ?? ''
  } catch {
    /* sin almacenamiento */
  }
  return { ...(code ? { 'x-access-code': code } : {}), ...extra }
}

async function parse<T>(res: Response): Promise<T> {
  let body: any = null
  try {
    body = await res.json()
  } catch {
    /* cuerpo no JSON */
  }
  if (!res.ok) {
    const e = body?.error
    throw new ApiError(e?.code ?? 'HTTP', e?.message ?? `Error ${res.status}`, res.status, e?.retryAfterSec)
  }
  return body as T
}

async function request(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, { ...init, signal: AbortSignal.timeout(60_000) })
  } catch {
    throw new ApiError('NETWORK', 'Sin conexión con el servidor.')
  }
}

export async function searchEvidence(query: string, n = 20): Promise<SearchResponse> {
  const res = await request(`/api/search?${new URLSearchParams({ q: query, n: String(n) })}`, { headers: headers() })
  return SearchResponseSchema.parse(await parse(res))
}

export interface SynthesizeResult {
  synthesis: Synthesis
  dropped: { path: string; reason: string }[]
  records: EvidenceRecord[]
  meta: { model: string; promptVersion: string; generatedAt: string }
  cache: 'hit' | 'miss'
}

export async function synthesize(pico: Pico, pmids: string[]): Promise<SynthesizeResult> {
  const res = await request('/api/synthesize', {
    method: 'POST',
    headers: headers({ 'content-type': 'application/json' }),
    body: JSON.stringify({ pico, pmids }),
  })
  return parse<SynthesizeResult>(res)
}

export interface TermsResult {
  population: string[]
  intervention: string[]
  comparison: string[]
}

/** PICO en español → términos de búsqueda en inglés (IA). Lanza ApiError si la IA no está disponible. */
export async function suggestTerms(pico: Pico): Promise<TermsResult> {
  const res = await request('/api/terms', { method: 'POST', headers: headers({ 'content-type': 'application/json' }), body: JSON.stringify({ pico }) })
  return parse<TermsResult>(res)
}

export async function health(): Promise<{ ok: boolean; llm: 'configured' | 'off'; model: string | null }> {
  const res = await request('/api/health')
  return parse(res)
}
