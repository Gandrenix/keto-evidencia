/**
 * Renderizador mínimo de Markdown → HTML para la ficha de entrega (solo el subconjunto que genera export-markdown.ts):
 * títulos, párrafos, listas con salto de línea, tablas, citas, negrita, cursiva, código y enlaces https.
 * Todo el texto se escapa antes de aplicar formato, así que el contenido del usuario no puede inyectar HTML.
 */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(raw: string): string {
  let s = esc(raw)
  s = s.replace(/`([^`]+)`/g, '<code>$1</code>')
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_m, t: string, u: string) => `<a href="${u}" target="_blank" rel="noreferrer">${t}</a>`)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[\s(])_([^_]+)_(?=[\s).,:;]|$)/g, '$1<em>$2</em>')
  return s
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'))

export function renderMarkdown(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i] ?? ''
    if (!line.trim()) {
      i++
      continue
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      const lvl = h[1]!.length
      out.push(`<h${lvl}>${inline(h[2]!)}</h${lvl}>`)
      i++
      continue
    }
    if (/^---+$/.test(line.trim())) {
      out.push('<hr />')
      i++
      continue
    }
    if (line.startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && (lines[i] ?? '').startsWith('|')) {
        if (!/^\|\s*:?-{2,}/.test(lines[i]!)) rows.push(cells(lines[i]!))
        i++
      }
      const [head, ...body] = rows
      out.push(
        `<table><thead><tr>${(head ?? []).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body
          .map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`,
      )
      continue
    }
    if (line.startsWith('>')) {
      const q: string[] = []
      while (i < lines.length && (lines[i] ?? '').startsWith('>')) {
        q.push(inline((lines[i] ?? '').replace(/^>\s?/, '')))
        i++
      }
      out.push(`<blockquote>${q.join('<br />')}</blockquote>`)
      continue
    }
    if (line.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && (lines[i] ?? '').startsWith('- ')) {
        const parts = [(lines[i] ?? '').slice(2)]
        i++
        while (i < lines.length && /^ {2,}\S/.test(lines[i] ?? '')) {
          parts.push((lines[i] ?? '').trim())
          i++
        }
        items.push(`<li>${parts.map((x) => inline(x.trim())).join('<br />')}</li>`)
      }
      out.push(`<ul>${items.join('')}</ul>`)
      continue
    }
    const p: string[] = []
    while (i < lines.length && (lines[i] ?? '').trim() && !/^(#{1,3}\s|- |\||>|---)/.test(lines[i] ?? '')) {
      p.push(inline((lines[i] ?? '').trim()))
      i++
    }
    out.push(`<p>${p.join('<br />')}</p>`)
  }
  return out.join('\n')
}
