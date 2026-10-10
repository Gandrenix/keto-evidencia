// Genera un PDF REAL de la ficha de entrega con Edge/Chrome headless (mismo motor de impresión que usa el usuario).
// Uso: node --experimental-strip-types scripts/print-pdf.ts [A|B|C|D] [urlBase] [salida.pdf]
// Requiere la app servida (npm run preview) y Edge o Chrome instalados.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { presetById } from '../src/shared/presets.ts'

const caseId = (process.argv[2] ?? 'C').toUpperCase()
const base = process.argv[3] ?? 'http://localhost:4173/'
const out = process.argv[4] ?? `ficha-${caseId}.pdf`
const preset = presetById(caseId)!
const snap = JSON.parse(readFileSync(`data/snapshots/caso-${caseId.toLowerCase()}.json`, 'utf8'))

const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync)
if (!browser) throw new Error('No encontré Edge ni Chrome')

const work = {
  caseId,
  pico: preset.pico,
  popTerms: preset.blocks.population.join('; '),
  intTerms: preset.blocks.intervention.join('; '),
  compTerms: '',
  useComparison: false,
  designs: preset.blocks.designs,
  queryOverride: null,
  searchLog: snap.searchLog,
  records: snap.records,
  fromSnapshot: false,
  selected: Object.fromEntries(snap.records.slice(0, 4).map((r: { pmid: string }, i: number) => [r.pmid, ['Mejor revisión sistemática disponible para la pregunta', 'Meta-análisis reciente con certeza GRADE reportada', 'ECA relevante con población similar | incluye barra', 'Lectura del curso indicada por el docente'][i]])),
}

const profile = mkdtempSync(join(tmpdir(), 'pdf-'))
const proc = spawn(browser, ['--headless=new', '--disable-gpu', '--remote-debugging-port=9333', `--user-data-dir=${profile}`, '--no-first-run', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
try {
  let ready = false
  for (let i = 0; i < 40 && !ready; i++) {
    try {
      ready = (await fetch('http://127.0.0.1:9333/json/version')).ok
    } catch {
      await sleep(250)
    }
  }
  const target = (await (await fetch(`http://127.0.0.1:9333/json/new?${base}`, { method: 'PUT' })).json()) as { webSocketDebuggerUrl: string }
  const ws = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((r) => (ws.onopen = r))
  let id = 0
  const pending = new Map<number, (v: any) => void>()
  ws.onmessage = (m) => {
    const d = JSON.parse(String(m.data))
    if (d.id && pending.has(d.id)) pending.get(d.id)!(d)
  }
  const send = (method: string, params: object = {}) =>
    new Promise<any>((res) => {
      const i = ++id
      pending.set(i, res)
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  await send('Page.enable')
  await sleep(1500)
  await send('Runtime.evaluate', { expression: `localStorage.setItem('keto.work.v1', ${JSON.stringify(JSON.stringify(work))})` })
  await send('Page.reload')
  await sleep(2500)
  const r = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true })
  writeFileSync(out, Buffer.from(r.result.data, 'base64'))
  console.log(`✔ PDF escrito en ${out} (${Math.round(r.result.data.length * 0.75 / 1024)} KB)`)
  ws.close()
} finally {
  proc.kill()
}
