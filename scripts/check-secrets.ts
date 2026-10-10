// Falla si hay claves de API en el build (dist/) o en archivos versionables. Uso: npm run secrets:check
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PATTERNS: [string, RegExp][] = [
  ['Google API key', /AIza[0-9A-Za-z_-]{30,}/],
  ['Google AI Studio key (formato AQ.)', /AQ\.[0-9A-Za-z_-]{30,}/],
  ['Anthropic key', /sk-ant-[0-9A-Za-z_-]{20,}/],
  ['OpenAI-style key', /sk-[0-9A-Za-z]{32,}/],
]
const roots = ['dist', 'src', 'server', 'netlify', 'data', 'scripts', 'tests', 'docs', '.env.example']
const bad: string[] = []
function walk(p: string) {
  if (!existsSync(p)) return
  const s = statSync(p)
  if (s.isDirectory()) return readdirSync(p).forEach((f) => walk(join(p, f)))
  if (s.size > 5_000_000) return
  const txt = readFileSync(p, 'utf8')
  for (const [name, re] of PATTERNS) if (re.test(txt)) bad.push(`${p}: ${name}`)
}
roots.forEach(walk)
if (bad.length) {
  console.error('✘ Posibles secretos encontrados:\n' + bad.map((b) => '  - ' + b).join('\n'))
  process.exit(1)
}
console.log('✔ Sin claves de API en dist/ ni en el código versionable.')
