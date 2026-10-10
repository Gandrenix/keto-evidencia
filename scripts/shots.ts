// Capturas de verificación visual con Edge/Chrome headless: una imagen por sección, en el tamaño y tema pedidos.
// Uso: node --experimental-strip-types scripts/shots.ts <urlBase> <salidaDir> <ancho>x<alto>[m] <light|dark> [prefijo] [reduce]
//   ejemplo: ... http://localhost:5174/ out 1280x800 light desk
//   sufijo "m" = emulación móvil (táctil). "reduce" = emula prefers-reduced-motion.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { presetById } from '../src/shared/presets.ts'

const [base = 'http://localhost:5174/', outDir = 'shots', size = '1280x800', theme = 'light', prefix = 'shot', reduce = ''] = process.argv.slice(2)
const mobile = size.endsWith('m')
const [W, H] = size.replace('m', '').split('x').map(Number) as [number, number]
mkdirSync(outDir, { recursive: true })

const preset = presetById('C')!
const snap = JSON.parse(readFileSync('data/snapshots/caso-c.json', 'utf8'))
const work = {
  caseId: 'C',
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
  selected: Object.fromEntries(snap.records.slice(0, 2).map((r: { pmid: string }, i: number) => [r.pmid, i === 0 ? 'Mejor revisión sistemática disponible' : ''])),
}

const browser = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(existsSync)
if (!browser) throw new Error('No encontré Edge ni Chrome')

const port = 9340 + Math.floor(Math.random() * 50)
const proc = spawn(browser, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), 'shot-'))}`, '--no-first-run', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
try {
  for (let i = 0; i < 40; i++) {
    try {
      if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break
    } catch {
      await sleep(250)
    }
  }
  const target = (await (await fetch(`http://127.0.0.1:${port}/json/new?${base}`, { method: 'PUT' })).json()) as { webSocketDebuggerUrl: string }
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
  const evalJs = async (expression: string) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result?.result?.value

  await send('Page.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: mobile ? 2 : 1, mobile })
  if (mobile) await send('Emulation.setTouchEmulationEnabled', { enabled: true })
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }, ...(reduce ? [{ name: 'prefers-reduced-motion', value: 'reduce' }] : [])] })
  await sleep(1200)
  await evalJs(`localStorage.setItem('keto.theme', '${theme}'); localStorage.setItem('keto.work.v1', ${JSON.stringify(JSON.stringify(work))}); true`)
  await send('Page.reload')
  await sleep(3500)

  const shot = async (name: string, clip?: { x: number; y: number; width: number; height: number }) => {
    const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!clip, ...(clip ? { clip: { ...clip, scale: 1 } } : {}) })
    writeFileSync(join(outDir, `${prefix}-${name}.png`), Buffer.from(r.result.data, 'base64'))
  }

  await shot('00-arriba') // primera pantalla tal como la ve la persona
  const info = await evalJs(`JSON.stringify({ overflowX: document.documentElement.scrollWidth > innerWidth, docH: document.documentElement.scrollHeight, font: getComputedStyle(document.body).fontFamily.slice(0,40) })`)
  console.log('info:', info)
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const rect = JSON.parse(await evalJs(`(() => { const e = document.getElementById('paso-${n}'); if (!e) return 'null'; const r = e.getBoundingClientRect(); return JSON.stringify({ x: r.left, y: r.top + scrollY, width: r.width, height: Math.min(r.height, 2600) }) })()`))
    if (!rect) continue
    await shot(`paso-${n}`, rect)
  }
  console.log(`✔ capturas en ${outDir}/ (${prefix}-*, ${W}x${H}${mobile ? ' móvil' : ''}, tema ${theme})`)
  ws.close()
} finally {
  proc.kill()
}
