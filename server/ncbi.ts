import { XMLParser } from 'fast-xml-parser'
import { classifyDesign } from '../src/shared/design-tier.ts'
import type { AbstractSection, EvidenceRecord } from '../src/shared/schemas.ts'

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const TOOL = 'ketoevidencia'

/* ───────── limitador: NCBI permite 3 req/s sin key y 10 con key ───────── */
let nextSlot = 0
export async function ncbiSlot(): Promise<void> {
  const rps = process.env.NCBI_API_KEY ? 9 : 3
  const gap = Math.ceil(1000 / rps) + 20
  const now = Date.now()
  const at = Math.max(now, nextSlot)
  nextSlot = at + gap
  if (at > now) await new Promise((r) => setTimeout(r, at - now))
}

function params(extra: Record<string, string>): URLSearchParams {
  const p = new URLSearchParams({ db: 'pubmed', tool: TOOL, ...extra })
  if (process.env.NCBI_EMAIL) p.set('email', process.env.NCBI_EMAIL)
  if (process.env.NCBI_API_KEY) p.set('api_key', process.env.NCBI_API_KEY)
  return p
}

async function ncbiFetch(url: string, init?: RequestInit, attempts = 3): Promise<Response> {
  let last: unknown
  for (let i = 0; i < attempts; i++) {
    await ncbiSlot()
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(20_000) })
      if (res.ok) return res
      last = new Error(`NCBI HTTP ${res.status}`)
      if (res.status !== 429 && res.status < 500) break
    } catch (e) {
      last = e
    }
    await new Promise((r) => setTimeout(r, 600 * (i + 1) ** 2))
  }
  throw last instanceof Error ? last : new Error('NCBI no disponible')
}

export interface EsearchResult {
  pmids: string[]
  totalCount: number
  queryTranslation: string
}

export async function esearch(query: string, retmax: number): Promise<EsearchResult> {
  const p = params({ term: query, retmode: 'json', sort: 'relevance', retmax: String(retmax) })
  const res = await ncbiFetch(`${BASE}/esearch.fcgi?${p}`)
  const json = (await res.json()) as {
    esearchresult?: { idlist?: string[]; count?: string; querytranslation?: string; ERROR?: string }
  }
  const r = json.esearchresult
  if (!r || r.ERROR) throw new Error(`Consulta inválida para PubMed${r?.ERROR ? `: ${r.ERROR}` : ''}`)
  return { pmids: r.idlist ?? [], totalCount: Number(r.count ?? 0), queryTranslation: r.querytranslation ?? query }
}

export async function efetchXml(pmids: string[]): Promise<string> {
  const body = params({ id: pmids.join(','), retmode: 'xml', rettype: 'abstract' })
  const res = await ncbiFetch(`${BASE}/efetch.fcgi`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body,
  })
  return res.text()
}

/* ───────── parser ───────── */
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  isArray: (name) => ['PubmedArticle', 'Author', 'AbstractText', 'PublicationType', 'ArticleId'].includes(name),
  processEntities: true,
  htmlEntities: true,
})

type Node = unknown
/** Concatena el texto de un nodo, incluyendo etiquetas en línea (<i>, <sub>…). */
function textOf(n: Node): string {
  if (n == null) return ''
  if (typeof n === 'string' || typeof n === 'number') return String(n)
  if (Array.isArray(n)) return n.map(textOf).join('')
  if (typeof n === 'object') {
    return Object.entries(n as Record<string, Node>)
      .filter(([k]) => !k.startsWith('@_'))
      .map(([, v]) => textOf(v))
      .join('')
  }
  return ''
}
const norm = (s: string) => s.replace(/\s+/g, ' ').trim()
const g = (o: any, path: string): any => path.split('.').reduce((a, k) => (a == null ? undefined : a[k]), o)

export function parsePubmedXml(xml: string): EvidenceRecord[] {
  const doc = parser.parse(xml)
  const articles: any[] = g(doc, 'PubmedArticleSet.PubmedArticle') ?? []
  return articles.map((a) => {
    const cit = a.MedlineCitation
    const art = cit?.Article
    const pmid = norm(textOf(cit?.PMID))
    const title = norm(textOf(art?.ArticleTitle))
    const authors: string[] = (art?.AuthorList?.Author ?? []).map((au: any) =>
      au.CollectiveName ? norm(textOf(au.CollectiveName)) : norm(`${textOf(au.LastName)} ${textOf(au.Initials)}`),
    )
    const pub = art?.Journal?.JournalIssue?.PubDate
    const year =
      norm(textOf(pub?.Year)) ||
      (norm(textOf(pub?.MedlineDate)).match(/\d{4}/)?.[0] ?? '') ||
      norm(textOf(art?.ArticleDate?.Year)) ||
      ''
    const pubTypes: string[] = (art?.PublicationTypeList?.PublicationType ?? []).map((t: Node) => norm(textOf(t)))
    const sections: AbstractSection[] = (art?.Abstract?.AbstractText ?? [])
      .map((t: any): AbstractSection => ({
        label: typeof t === 'object' && t?.['@_Label'] ? String(t['@_Label']) : '',
        text: norm(textOf(t)),
      }))
      .filter((s: AbstractSection) => s.text)
    const ids: any[] = a.PubmedData?.ArticleIdList?.ArticleId ?? []
    const idOf = (type: string) => {
      const f = ids.find((x) => x?.['@_IdType'] === type)
      return f ? norm(textOf(f)) : null
    }
    const { tier, label } = classifyDesign(pubTypes, title)
    return {
      pmid,
      title,
      authors,
      firstAuthor: authors[0] ?? 'Anónimo',
      year,
      journal: norm(textOf(art?.Journal?.Title)),
      doi: idOf('doi'),
      pmcid: idOf('pmc'),
      pubTypes,
      designTier: tier,
      designLabel: label,
      abstractSections: sections,
      hasAbstract: sections.length > 0,
      isCourseReading: false,
    }
  })
}

/** Trae registros por PMID respetando el orden pedido. */
export async function fetchRecords(pmids: string[]): Promise<EvidenceRecord[]> {
  if (pmids.length === 0) return []
  const records = parsePubmedXml(await efetchXml(pmids))
  const byId = new Map(records.map((r) => [r.pmid, r]))
  return pmids.flatMap((id) => {
    const r = byId.get(id)
    return r ? [r] : []
  })
}
