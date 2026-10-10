import type { RefObject } from 'react'
import { ArrowDown, BookOpen, Check, ChevronDown, ExternalLink, FileX, Layers, Plus } from 'lucide-react'
import type { EvidenceRecord, SearchLog } from '../shared/schemas.ts'
import { Badge, Button, Notice, Section, pubmed } from '../components/ui.tsx'
import { EmptyIllustration, PyramidLegend, TierMark } from '../components/brand.tsx'
import { Pager } from '../components/Pager.tsx'
import { MAX_SELECT, type Work } from '../lib/work.ts'

interface Props {
  work: Work
  searching: boolean
  searchError: string | null
  pageRecords: EvidenceRecord[]
  page: number
  pageSize: number
  listTop: RefObject<HTMLDivElement | null>
  onPage: (p: number) => void
  onToggle: (pmid: string) => void
  onReason: (pmid: string, reason: string) => void
  selectedCount: number
  missingReasons: number
  onGoSynthesis: () => void
}

const TIER_TONE = { 1: 'accent', 2: 'gold', 3: 'muted', 4: 'muted', 5: 'muted' } as const

function Stats({ log, shown, fromSnapshot }: { log: SearchLog; shown: number; fromSnapshot: boolean }) {
  return (
    <div className="inset mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
      <p className="tnum text-[0.95rem] text-ink">
        <strong className="font-display text-[1.5rem] font-bold leading-none text-accent">{log.totalCount}</strong> <span className="text-ink-2">estudios en PubMed</span>
      </p>
      <p className="text-[0.9rem] text-ink-2">
        {shown < log.totalCount ? (
          <>
            Se revisan los <strong className="tnum text-ink">{shown}</strong> mejores, ordenados por diseño y relevancia. Si algo no aparece, afina la ecuación.
          </>
        ) : (
          <>Se muestran todos.</>
        )}
      </p>
      <p className="tnum ml-auto text-[0.82rem] text-ink-2">
        {fromSnapshot ? 'Búsqueda pregrabada' : 'Búsqueda'} · {new Date(log.executedAt).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
      </p>
    </div>
  )
}

function Skeleton() {
  return (
    <div className="space-y-3" aria-live="polite" aria-busy="true">
      <span className="sr-only">Buscando en PubMed…</span>
      {[0, 1, 2].map((i) => (
        <div key={i} className="shimmer relative flex gap-3.5 overflow-hidden rounded-2xl border border-line bg-panel p-4">
          <div className="h-9 w-9 shrink-0 rounded-lg bg-panel-2" />
          <div className="flex-1 space-y-2.5">
            <div className="h-3.5 w-1/3 rounded bg-panel-2" />
            <div className="h-4 w-11/12 rounded bg-panel-2" />
            <div className="h-3 w-1/2 rounded bg-panel-2" />
          </div>
        </div>
      ))}
    </div>
  )
}

function Card({ r, i, selected, reason, full, onToggle, onReason }: { r: EvidenceRecord; i: number; selected: boolean; reason: string; full: boolean; onToggle: () => void; onReason: (s: string) => void }) {
  return (
    <li className={`enter rounded-2xl border p-4 transition-[border-color,background-color] duration-200 sm:p-5 ${selected ? 'border-accent bg-accent-soft' : 'border-line bg-panel'}`} style={{ ['--i' as string]: i }}>
      <div>
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <TierMark tier={r.designTier} size={46} />
            <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Badge tone={TIER_TONE[r.designTier]}>{r.designLabel}</Badge>
            {r.isCourseReading && (
              <Badge tone="gold">
                <BookOpen size={13} aria-hidden /> Lectura del curso
              </Badge>
            )}
            {!r.hasAbstract && (
              <Badge tone="danger">
                <FileX size={13} aria-hidden /> Sin abstract
              </Badge>
            )}
            </div>
          </div>
          <h3 className="mt-3 text-[1.06rem] font-semibold leading-snug text-ink">
            <a href={pubmed(r.pmid)} target="_blank" rel="noreferrer" className="underline-offset-2 hover:text-accent hover:underline">
              {r.title}
            </a>
          </h3>
          <p className="mt-1 text-[0.86rem] text-ink-2">
            {r.firstAuthor} et al. {r.journal}. <span className="tnum">{r.year}</span>
          </p>
          <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[0.86rem]">
            <a className="tnum inline-flex min-h-8 items-center gap-1 font-semibold text-accent underline-offset-2 hover:underline" href={pubmed(r.pmid)} target="_blank" rel="noreferrer">
              PMID {r.pmid} <ExternalLink size={13} aria-hidden />
            </a>
            {r.doi && (
              <a className="inline-flex min-h-8 items-center font-semibold text-accent underline-offset-2 hover:underline" href={`https://doi.org/${r.doi}`} target="_blank" rel="noreferrer">
                DOI
              </a>
            )}
            {r.pmcid && (
              <a className="inline-flex min-h-8 items-center font-semibold text-accent underline-offset-2 hover:underline" href={`https://pmc.ncbi.nlm.nih.gov/articles/${r.pmcid}/`} target="_blank" rel="noreferrer">
                Texto completo gratuito
              </a>
            )}
          </p>
          {r.hasAbstract && (
            <details className="mt-1.5">
              <summary className="flex min-h-11 w-fit list-none items-center gap-1.5 text-[0.9rem] font-semibold text-ink">
                Ver abstract <ChevronDown size={16} className="chev text-ink-2" aria-hidden />
              </summary>
              <div className="max-w-[72ch] space-y-2 pb-1 text-[0.93rem] text-ink-2">
                {r.abstractSections.map((s, k) => (
                  <p key={k}>
                    {s.label && <strong className="font-semibold text-ink">{s.label}. </strong>}
                    {s.text}
                  </p>
                ))}
              </div>
            </details>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-line/80 pt-3">
        <Button variant={selected ? 'primary' : 'ghost'} aria-pressed={selected} onClick={onToggle} disabled={!selected && full} className="w-full sm:w-auto">
          {selected ? <Check size={17} strokeWidth={3} aria-hidden /> : <Plus size={17} aria-hidden />}
          {selected ? 'Seleccionado' : 'Seleccionar'}
        </Button>
        <div className="fold" data-open={selected}>
          <div>
            <label htmlFor={`why-${r.pmid}`} className="mb-1 mt-3 block text-[0.88rem] font-semibold text-ink">
              Motivo de selección <span className="font-normal text-ink-2">· lo pide tu docente</span>
            </label>
            <input id={`why-${r.pmid}`} className="field" maxLength={300} value={reason} onChange={(e) => onReason(e.target.value)} placeholder="Ej.: es la revisión Cochrane más reciente" tabIndex={selected ? 0 : -1} />
          </div>
        </div>
      </div>
    </li>
  )
}

export function EvidenceSection({ work, searching, searchError, pageRecords, page, pageSize, listTop, onPage, onToggle, onReason, selectedCount, missingReasons, onGoSynthesis }: Props) {
  const full = selectedCount >= MAX_SELECT
  return (
    <Section n={4} title="Evidencia encontrada" hint={`Ordenada por diseño de estudio y relevancia. Selecciona hasta ${MAX_SELECT} artículos y anota por qué los eliges.`}>
      <div ref={listTop} className="scroll-mt-24" />

      {searchError && (
        <div className="mb-4">
          <Notice tone={work.fromSnapshot ? 'gold' : 'danger'}>{searchError}</Notice>
        </div>
      )}

      {searching && <Skeleton />}

      {!searching && work.records.length === 0 && !searchError && (
        <div className="grid place-items-center gap-3 px-4 py-8 text-center">
          <EmptyIllustration className="w-44" />
          <p className="font-display text-[1.15rem] font-semibold text-ink">Aún no hay evidencia</p>
          <p className="max-w-[40ch] text-[0.95rem] text-ink-2">Revisa tu ecuación en el paso anterior y pulsa «Buscar evidencia en PubMed».</p>
        </div>
      )}

      {!searching && work.searchLog && work.records.length > 0 && (
        <>
          <Stats log={work.searchLog} shown={work.records.length} fromSnapshot={work.fromSnapshot} />
          <details className="mb-1">
            <summary className="flex min-h-11 w-fit list-none items-center gap-2 text-[0.92rem] font-semibold text-ink">
              <Layers size={17} className="text-accent" aria-hidden /> Cómo leer el nivel de evidencia <ChevronDown size={16} className="chev text-ink-2" aria-hidden />
            </summary>
            <div className="mb-3 mt-1">
              <PyramidLegend />
            </div>
          </details>
          <details className="mb-1">
            <summary className="flex min-h-11 w-fit list-none items-center gap-2 text-[0.92rem] font-semibold text-ink">
              Cómo interpretó PubMed la ecuación <ChevronDown size={16} className="chev text-ink-2" aria-hidden />
            </summary>
            <code className="field-code mt-1 block break-words rounded-lg bg-panel-2 p-3 text-[0.78rem] text-ink-2">{work.searchLog.queryTranslation}</code>
          </details>

          <Pager page={page} pageSize={pageSize} count={work.records.length} onPage={onPage} />
          <ul key={page} className="space-y-3">
            {pageRecords.map((r, i) => (
              <Card key={r.pmid} r={r} i={i} selected={r.pmid in work.selected} reason={work.selected[r.pmid] ?? ''} full={full} onToggle={() => onToggle(r.pmid)} onReason={(s) => onReason(r.pmid, s)} />
            ))}
          </ul>
          <Pager page={page} pageSize={pageSize} count={work.records.length} onPage={onPage} />
        </>
      )}

      {selectedCount > 0 && (
        <div className="no-print pointer-events-none sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-20 mt-4">
          <div className="pop pointer-events-auto flex items-center gap-3 rounded-2xl bg-ink p-2.5 pl-4 text-bg shadow-[var(--shadow-2)]">
            <p className="tnum min-w-0 flex-1 text-[0.92rem] font-semibold leading-tight">
              {selectedCount} de {MAX_SELECT} seleccionados
              {missingReasons > 0 && <span className="block text-[0.8rem] font-normal opacity-80">Faltan {missingReasons} motivo(s)</span>}
            </p>
            <button type="button" onClick={onGoSynthesis} className="btn btn-primary !min-h-11 shrink-0">
              Síntesis <ArrowDown size={16} aria-hidden />
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}

