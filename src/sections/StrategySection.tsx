import { Check, ClipboardCopy, ExternalLink, Search, Sparkles, Undo2 } from 'lucide-react'
import { DESIGN_OPTIONS, cochraneUrl, parseTermList, pubmedUrl } from '../shared/query-builder.ts'
import { Button, Label, LinkButton, Notice, Section } from '../components/ui.tsx'
import type { Work } from '../lib/work.ts'

interface Props {
  work: Work
  query: string
  patch: (p: Partial<Work>) => void
  generateTerms: () => void
  suggesting: boolean
  suggestNote: { tone: 'accent' | 'gold' | 'danger'; text: string } | null
  llmOn: boolean
  runSearch: () => void
  searching: boolean
  copied: string | null
  onCopy: (key: string, text: string) => void
}

function Pill({ tone, children }: { tone: 'p' | 'i' | 'c' | 'd'; children: React.ReactNode }) {
  const cls = { p: 'bg-accent-soft text-accent', i: 'bg-gold-soft text-gold', c: 'bg-panel-2 text-ink-2 ring-1 ring-inset ring-line', d: 'bg-panel-2 text-ink-2 ring-1 ring-inset ring-line' }[tone]
  return <span className={`tnum rounded-lg px-2.5 py-1.5 text-[0.84rem] font-semibold ${cls}`}>{children}</span>
}

export function StrategySection({ work, query, patch, generateTerms, suggesting, suggestNote, llmOn, runSearch, searching, copied, onCopy }: Props) {
  const nP = parseTermList(work.popTerms).length
  const nI = parseTermList(work.intTerms).length
  const nC = work.useComparison ? parseTermList(work.compTerms).length : 0
  const noun = (n: number) => `${n} ${n === 1 ? 'término' : 'términos'}`

  return (
    <Section n={3} title="Estrategia de búsqueda" hint="PubMed busca en inglés. Genera los términos desde tu PICO, revísalos y la ecuación se arma sola.">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="gold" onClick={generateTerms} disabled={suggesting || (!work.pico.population.trim() && !work.pico.intervention.trim())}>
          <Sparkles size={18} aria-hidden /> {suggesting ? 'Generando…' : 'Generar términos desde mi PICO'}
        </Button>
        <span className="text-[0.86rem] text-ink-2">{llmOn ? 'Usa IA y, si no está disponible, un glosario.' : 'Usa un glosario de términos comunes.'}</span>
      </div>
      {suggestNote && (
        <div className="enter mt-3">
          <Notice tone={suggestNote.tone}>{suggestNote.text}</Notice>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="terms-pop" hint="Separa con «;». Ej.: obesity; &quot;type 2 diabetes&quot;">
            Población (inglés)
          </Label>
          <textarea id="terms-pop" className="field field-code min-h-[5.5rem]" value={work.popTerms} onChange={(e) => patch({ popTerms: e.target.value, queryOverride: null })} spellCheck={false} />
        </div>
        <div>
          <Label htmlFor="terms-int" hint="Sinónimos de lo que se evalúa, unidos con «;».">
            Intervención (inglés)
          </Label>
          <textarea id="terms-int" className="field field-code min-h-[5.5rem]" value={work.intTerms} onChange={(e) => patch({ intTerms: e.target.value, queryOverride: null })} spellCheck={false} />
        </div>
      </div>

      <div className="mt-4">
        <label htmlFor="use-comp" className="flex min-h-11 items-center gap-3 text-[0.95rem] font-semibold text-ink">
          <input id="use-comp" type="checkbox" className="h-5 w-5 accent-[var(--accent)]" checked={work.useComparison} onChange={(e) => patch({ useComparison: e.target.checked, queryOverride: null })} />
          <span>
            Incluir el comparador (C) en la ecuación <span className="font-normal text-ink-2">· reduce los resultados</span>
          </span>
        </label>
        <div className="fold" data-open={work.useComparison}>
          <div>
            <textarea
              id="terms-comp"
              aria-label="Términos de comparación en inglés"
              className="field field-code mt-2 min-h-[4.25rem]"
              value={work.compTerms}
              onChange={(e) => patch({ compTerms: e.target.value, queryOverride: null })}
              placeholder={'"caloric restriction"; "low fat diet"'}
              spellCheck={false}
              tabIndex={work.useComparison ? 0 : -1}
            />
          </div>
        </div>
      </div>

      <fieldset className="mt-4">
        <legend className="mb-2 text-[0.92rem] font-semibold text-ink">Diseños de estudio a incluir</legend>
        <div className="flex flex-wrap gap-2">
          {DESIGN_OPTIONS.map((d) => {
            const on = work.designs.includes(d.key)
            return (
              <button
                key={d.key}
                type="button"
                aria-pressed={on}
                onClick={() => patch({ designs: on ? work.designs.filter((x) => x !== d.key) : [...work.designs, d.key], queryOverride: null })}
                className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[0.94rem] font-semibold transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.96] ${
                  on ? 'border-accent bg-accent-soft text-accent' : 'border-line-strong bg-panel text-ink-2 hover:border-accent'
                }`}
              >
                <span className={`grid size-[18px] place-items-center rounded-full ${on ? 'bg-accent text-accent-ink' : 'ring-1 ring-inset ring-line-strong'}`}>
                  {on && <Check size={12} strokeWidth={3.4} aria-hidden />}
                </span>
                {d.label}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-6">
        <div className="mb-2 flex flex-wrap items-center gap-2" aria-label="Estructura de la ecuación">
          <Pill tone="p">P · {noun(nP)}</Pill>
          <span className="text-[0.78rem] font-bold text-ink-2" aria-hidden>
            AND
          </span>
          <Pill tone="i">I · {noun(nI)}</Pill>
          {nC > 0 && (
            <>
              <span className="text-[0.78rem] font-bold text-ink-2" aria-hidden>
                AND
              </span>
              <Pill tone="c">C · {noun(nC)}</Pill>
            </>
          )}
          <span className="text-[0.78rem] font-bold text-ink-2" aria-hidden>
            AND
          </span>
          <Pill tone="d">Diseños · {work.designs.length}</Pill>
        </div>

        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
          <label htmlFor="query" className="text-[0.92rem] font-semibold text-ink">
            Ecuación booleana final {work.queryOverride !== null && <span className="ml-1.5 rounded-full bg-gold-soft px-2 py-0.5 text-[0.75rem] font-semibold text-gold">editada a mano</span>}
          </label>
          {work.queryOverride !== null && (
            <button type="button" className="inline-flex min-h-11 items-center gap-1.5 px-1 text-[0.86rem] font-semibold text-accent underline-offset-2 hover:underline" onClick={() => patch({ queryOverride: null })}>
              <Undo2 size={15} aria-hidden /> Volver a la generada
            </button>
          )}
        </div>
        <textarea id="query" className="field field-code min-h-28" value={query} onChange={(e) => patch({ queryOverride: e.target.value })} spellCheck={false} />
      </div>

      <div className="mt-5 flex flex-wrap gap-2.5">
        <Button variant="primary" className="w-full sm:w-auto sm:min-w-[16rem]" onClick={runSearch} disabled={searching || query.trim().length < 3}>
          <Search size={18} aria-hidden /> {searching ? 'Buscando…' : 'Buscar evidencia en PubMed'}
        </Button>
        <Button onClick={() => onCopy('query', query)}>
          {copied === 'query' ? <Check size={17} aria-hidden /> : <ClipboardCopy size={17} aria-hidden />} {copied === 'query' ? 'Copiada' : 'Copiar ecuación'}
        </Button>
        <LinkButton href={pubmedUrl(query)}>
          <ExternalLink size={16} aria-hidden /> PubMed
        </LinkButton>
        <LinkButton href={cochraneUrl(query)}>
          <ExternalLink size={16} aria-hidden /> Cochrane Library
        </LinkButton>
      </div>
    </Section>
  )
}

