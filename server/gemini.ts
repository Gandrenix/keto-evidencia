import { SynthesisSchema, type Synthesis } from '../src/shared/schemas.ts'
import { SYSTEM_PROMPT } from '../src/shared/prompt.ts'

export class LlmError extends Error {
  constructor(
    public code: 'LLM_DISABLED' | 'LLM_UNAVAILABLE' | 'LLM_BAD_OUTPUT' | 'LLM_RATE_LIMITED' | 'LLM_AUTH',
    message: string,
    public retryAfterSec?: number,
  ) {
    super(message)
  }
}

/** Claves en orden de preferencia: principal y respaldo (idealmente de proyectos/cuentas de Google distintos: la cuota gratuita es por proyecto). */
const apiKeys = (): string[] => [process.env.GEMINI_API_KEY, process.env.GEMINI_API_KEY_BACKUP].map((k) => k?.trim() ?? '').filter(Boolean)
export const llmKeyCount = () => apiKeys().length
export const llmEnabled = () => apiKeys().length > 0 && process.env.LLM_ENABLED !== 'false'
export const llmModel = () => process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'

/** Extrae el primer objeto JSON de un texto (tolera ```json ... ```). */
export function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  const start = t.indexOf('{')
  const end = t.lastIndexOf('}')
  if (start < 0 || end <= start) throw new Error('sin JSON')
  return JSON.parse(t.slice(start, end + 1))
}

/** Claves "en pausa" tras un 429/403/5xx: se prueban al final, no se descartan. */
const cooldown = new Map<string, number>()

/** Llama al modelo con la clave principal; si su cupo se agotó o falla, pasa a la de respaldo. */
export async function callGemini(userPrompt: string, system: string = SYSTEM_PROMPT, maxOutputTokens = 6000): Promise<string> {
  const now = Date.now()
  const keys = apiKeys()
  const ordered = [...keys.filter((k) => (cooldown.get(k) ?? 0) <= now), ...keys.filter((k) => (cooldown.get(k) ?? 0) > now)]
  let last: LlmError | null = null
  for (const key of ordered) {
    try {
      return await callWithKey(key, userPrompt, system, maxOutputTokens)
    } catch (e) {
      if (e instanceof LlmError && (e.code === 'LLM_RATE_LIMITED' || e.code === 'LLM_AUTH' || e.code === 'LLM_UNAVAILABLE')) {
        cooldown.set(key, Date.now() + (e.code === 'LLM_AUTH' ? 600_000 : 60_000))
        last = e
        continue
      }
      throw e
    }
  }
  throw last ?? new LlmError('LLM_DISABLED', 'La IA no está configurada.')
}

async function callWithKey(key: string, userPrompt: string, system: string, maxOutputTokens: number): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${llmModel()}:generateContent`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.1, maxOutputTokens },
    }),
    signal: AbortSignal.timeout(45_000),
  })
  if (res.status === 429) throw new LlmError('LLM_RATE_LIMITED', 'Cupo gratuito del modelo agotado por ahora.', 60)
  if (res.status === 401 || res.status === 403) throw new LlmError('LLM_AUTH', 'La clave del modelo fue rechazada.')
  if (!res.ok) throw new LlmError('LLM_UNAVAILABLE', `El modelo respondió HTTP ${res.status}.`)
  const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) throw new LlmError('LLM_BAD_OUTPUT', 'Respuesta vacía del modelo.')
  return text
}

/** Pide la síntesis; valida con Zod; un reintento de reparación si el JSON o el esquema fallan. */
export async function generateSynthesis(userPrompt: string): Promise<Synthesis> {
  if (!llmEnabled()) throw new LlmError('LLM_DISABLED', 'La síntesis con IA no está activada.')
  let prompt = userPrompt
  let lastErr = ''
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const parsed = SynthesisSchema.safeParse(extractJson(await callGemini(prompt)))
      if (parsed.success) return parsed.data
      lastErr = parsed.error.issues.slice(0, 5).map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    } catch (e) {
      if (e instanceof LlmError) throw e
      lastErr = e instanceof Error ? e.message : String(e)
    }
    prompt = `${userPrompt}\n\nTU RESPUESTA ANTERIOR NO CUMPLIÓ EL ESQUEMA (${lastErr}). Responde de nuevo SOLO con el JSON válido.`
  }
  throw new LlmError('LLM_BAD_OUTPUT', 'El modelo no devolvió una síntesis válida.')
}
