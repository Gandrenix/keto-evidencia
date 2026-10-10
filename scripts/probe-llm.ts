// Uso: npm run llm:probe   (carga .env; NUNCA imprime la clave)
// 1) Lista los modelos que tu clave puede usar con generateContent. 2) Corre una síntesis REAL del Caso C
// con las 3 lecturas del curso por el mismo código que usa el servidor y muestra cuántos ítems pasan la verificación.
import { route } from '../server/router.ts'

const key = process.env.GEMINI_API_KEY
if (!key) {
  console.error('✘ GEMINI_API_KEY está vacía en .env')
  process.exit(1)
}

const list = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key } })
if (!list.ok) {
  console.error(`✘ La clave no fue aceptada (HTTP ${list.status}). Revisa que la copiaste completa.`)
  process.exit(1)
}
const models = ((await list.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }).models ?? []
const usable = models.filter((m) => m.supportedGenerationMethods?.includes('generateContent')).map((m) => m.name.replace('models/', ''))
const flash = usable.filter((n) => /flash/.test(n) && !/(image|tts|live|audio|preview|exp|thinking)/.test(n))
console.log(`✔ Clave válida. Modelos con generateContent: ${usable.length}. Candidatos flash estables: ${flash.slice(0, 12).join(', ') || '(ninguno)'}`)
console.log(`  Modelo configurado: ${process.env.GEMINI_MODEL} → ${usable.includes(process.env.GEMINI_MODEL ?? '') ? 'DISPONIBLE' : 'NO aparece en tu lista (cámbialo en .env)'}`)

const t0 = Date.now()
const res = await route(
  new Request('http://localhost/api/synthesize', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      pico: {
        population: 'Niños con epilepsia farmacorresistente',
        intervention: 'Terapia dietética cetogénica como adyuvante',
        comparison: 'Tratamiento habitual',
        outcome: 'Frecuencia de crisis',
        question: '¿La terapia dietética cetogénica reduce la frecuencia de crisis?',
      },
      pmids: ['32588435', '42391224', '42214220'],
    }),
  }),
)
const body = (await res.json()) as any
if (!res.ok) {
  console.error(`✘ Síntesis falló: HTTP ${res.status} ${body?.error?.code} — ${body?.error?.message}`)
  process.exit(1)
}
const s = body.synthesis
console.log(`✔ Síntesis real en ${((Date.now() - t0) / 1000).toFixed(1)} s · modelo ${body.meta.model} · postura: ${s.stance}`)
console.log(`  Hallazgos verificados: ${s.findings.length} · parámetros: ${s.paraclinical.length} · ítems descartados por no verificables: ${body.dropped.length}`)
s.findings.slice(0, 3).forEach((f: any) => console.log(`   - ${f.statement}`))
