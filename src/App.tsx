import { useEffect, useMemo, useRef, useState } from 'react'
import { presetById } from './shared/presets.ts'
import { buildQuery, parseTermList } from './shared/query-builder.ts'
import { extractiveSummary } from './shared/extractive.ts'
import { CLINICAL_DISCLAIMER, exportMarkdown } from './shared/export-markdown.ts'
import type { Pico, SynthesisLayer } from './shared/schemas.ts'
import { suggestTermsFromPico } from './shared/terms.ts'
import { ApiError, health, searchEvidence, suggestTerms, synthesize } from './lib/api.ts'
import { SNAPSHOTS } from './lib/snapshots.ts'
import { clearWork, copyText, loadWork, saveWork } from './lib/storage.ts'
import { renderMarkdown } from './lib/markdown.ts'
import { useTheme } from './lib/theme.ts'
import { useActiveStep, useReveal } from './lib/motion.ts'
import { CANDIDATES, MAX_SELECT, PAGE_SIZE, join, workFor, type CaseId, type L2State, type Work } from './lib/work.ts'
import { Notice } from './components/ui.tsx'
import { MobileBar, StepRail, type Step } from './components/Rail.tsx'
import { CaseSection } from './sections/CaseSection.tsx'
import { PicoSection } from './sections/PicoSection.tsx'
import { StrategySection } from './sections/StrategySection.tsx'
import { EvidenceSection } from './sections/EvidenceSection.tsx'
import { SynthesisSection } from './sections/SynthesisSection.tsx'
import { DeliverySection } from './sections/DeliverySection.tsx'

export default function App() {
  const [work, setWork] = useState<Work>(() => ({ ...workFor('C'), ...(loadWork<Work>() ?? {}) }))
  const [page, setPage] = useState(1)
  const listTop = useRef<HTMLDivElement>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestNote, setSuggestNote] = useState<{ tone: 'accent' | 'gold' | 'danger'; text: string } | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [layer, setLayer] = useState<SynthesisLayer>('L0')
  const [l2, setL2] = useState<L2State>({ status: 'idle' })
  const [llmOn, setLlmOn] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [needsCode, setNeedsCode] = useState(false)
  const [theme, toggleTheme] = useTheme()

  useReveal()
  useEffect(() => saveWork(work), [work])
  useEffect(() => {
    health()
      .then((h) => setLlmOn(h.llm === 'configured'))
      .catch(() => setLlmOn(false))
  }, [])

  const preset = work.caseId === 'custom' ? null : (presetById(work.caseId) ?? null)
  const snapshot = work.caseId === 'custom' ? undefined : SNAPSHOTS[work.caseId]
  const patch = (p: Partial<Work>) => setWork((w) => ({ ...w, ...p }))
  const patchPico = (p: Partial<Pico>) => setWork((w) => ({ ...w, pico: { ...w.pico, ...p } }))

  const autoQuery = useMemo(
    () =>
      buildQuery({
        population: parseTermList(work.popTerms),
        intervention: parseTermList(work.intTerms),
        comparison: work.useComparison ? parseTermList(work.compTerms) : [],
        designs: work.designs,
      }),
    [work.popTerms, work.intTerms, work.compTerms, work.useComparison, work.designs],
  )
  const query = work.queryOverride ?? autoQuery

  /** PICO (español) → términos en inglés. IA si está disponible; si no, glosario. Siempre editable. */
  async function generateTerms() {
    setSuggesting(true)
    setSuggestNote(null)
    const fromGlossary = () => {
      const g = suggestTermsFromPico(work.pico)
      if (!g.found.population && !g.found.intervention) {
        setSuggestNote({ tone: 'gold', text: 'No reconocí los términos de tu PICO sin IA. Escríbelos en inglés (separados por «;») o completa mejor P e I.' })
        return
      }
      patch({ popTerms: join(g.population), intTerms: join(g.intervention), compTerms: join(g.comparison), useComparison: g.comparison.length > 0, queryOverride: null })
      setSuggestNote({
        tone: 'gold',
        text: `Términos sugeridos con el glosario (sin IA)${g.found.population ? '' : '; no reconocí la población: escríbela en inglés'}. Usé solo la condición principal${g.ignoredPopulation.length ? ` y dejé fuera «${g.ignoredPopulation.join('», «')}» para no ampliar de más la búsqueda (agrégala a mano si la necesitas)` : ''}. Revísalos y edítalos.`,
      })
    }
    try {
      if (!llmOn) return fromGlossary()
      const t = await suggestTerms(work.pico)
      patch({ popTerms: join(t.population), intTerms: join(t.intervention), compTerms: join(t.comparison), useComparison: t.comparison.length > 0, queryOverride: null })
      setSuggestNote({ tone: 'accent', text: 'Términos sugeridos por IA a partir de tu PICO. Revísalos y edítalos: la ecuación se actualizó sola.' })
    } catch {
      fromGlossary()
    } finally {
      setSuggesting(false)
    }
  }

  function chooseCase(id: CaseId) {
    setWork(workFor(id))
    setL2({ status: 'idle' })
    setSearchError(null)
    setSuggestNote(null)
    setPage(1)
    setLayer(id !== 'custom' && SNAPSHOTS[id] ? 'L0' : 'L1')
  }

  async function runSearch() {
    setSearching(true)
    setSearchError(null)
    try {
      const res = await searchEvidence(query, CANDIDATES)
      const course = new Set(preset?.courseReadings ?? [])
      let records = res.records.map((r) => ({ ...r, isCourseReading: course.has(r.pmid) }))
      if (snapshot) {
        const have = new Set(records.map((r) => r.pmid))
        records = [...records, ...snapshot.records.filter((r) => course.has(r.pmid) && !have.has(r.pmid)).map((r) => ({ ...r, isCourseReading: true }))]
      }
      patch({ searchLog: res.searchLog, records, fromSnapshot: false, selected: {} })
      setPage(1)
      setL2({ status: 'idle' })
    } catch (e) {
      const err = e instanceof ApiError ? e : null
      if (err?.code === 'UNAUTHORIZED') setNeedsCode(true)
      if (snapshot && err?.code !== 'BAD_QUERY' && err?.code !== 'UNAUTHORIZED') {
        patch({ searchLog: snapshot.searchLog, records: snapshot.records, fromSnapshot: true, selected: {} })
        setPage(1)
        setSearchError('No se pudo consultar PubMed en vivo. Se muestran los resultados pregrabados de este caso.')
      } else setSearchError(err?.message ?? 'No se pudo completar la búsqueda.')
    } finally {
      setSearching(false)
    }
  }

  function toggle(pmid: string) {
    setWork((w) => {
      const sel = { ...w.selected }
      if (pmid in sel) delete sel[pmid]
      else if (Object.keys(sel).length < MAX_SELECT) sel[pmid] = ''
      return { ...w, selected: sel }
    })
  }
  const setReason = (pmid: string, reason: string) => setWork((w) => ({ ...w, selected: { ...w.selected, [pmid]: reason } }))

  const totalPages = Math.max(1, Math.ceil(work.records.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageRecords = work.records.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  function goPage(p: number) {
    setPage(Math.min(Math.max(1, p), totalPages))
    listTop.current?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
  }

  const selectedRecords = work.records.filter((r) => r.pmid in work.selected)
  const selectedWithAbstract = selectedRecords.filter((r) => r.hasAbstract)
  const missingReasons = selectedRecords.filter((r) => !work.selected[r.pmid]?.trim()).length

  async function runL2() {
    setL2({ status: 'loading' })
    try {
      const res = await synthesize(work.pico, selectedWithAbstract.map((r) => r.pmid))
      setL2({ status: 'ok', synthesis: res.synthesis, records: res.records, dropped: res.dropped.length, model: res.meta.model, cache: res.cache })
    } catch (e) {
      const err = e instanceof ApiError ? e : null
      if (err?.code === 'UNAUTHORIZED') setNeedsCode(true)
      const msg =
        err?.code === 'LLM_RATE_LIMITED' || err?.code === 'RATE_LIMITED'
          ? 'El cupo gratuito de IA está agotado por ahora. Usa el resumen extractivo mientras tanto.'
          : (err?.message ?? 'No se pudo generar la síntesis.')
      setL2({ status: 'error', message: `${msg} (Puedes seguir con el resumen extractivo.)` })
    }
  }

  const l1Pool = selectedWithAbstract.length ? selectedWithAbstract : work.records.filter((r) => r.hasAbstract).slice(0, 5)
  const l1 = useMemo(() => extractiveSummary(l1Pool), [l1Pool])

  const active = useMemo(() => {
    if (layer === 'L0' && snapshot) return { layer: 'L0' as const, synthesis: snapshot.synthesis, records: snapshot.records, dropped: 0 }
    if (layer === 'L2' && l2.status === 'ok') return { layer: 'L2' as const, synthesis: l2.synthesis, records: l2.records, dropped: l2.dropped }
    return null
  }, [layer, snapshot, l2])

  const markdown = useMemo(
    () =>
      exportMarkdown({
        caseTitle: preset?.title ?? 'Caso propio',
        pico: work.pico,
        searchLog: work.searchLog,
        selected: selectedRecords.map((record) => ({ record, reason: work.selected[record.pmid] ?? '' })),
        layer: active ? active.layer : l1.entries.length ? 'L1' : null,
        synthesis: active?.synthesis ?? null,
        extractive: active ? null : l1.entries.length ? l1 : null,
        droppedCount: active?.dropped ?? 0,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [work, active, l1],
  )
  const deliveryHtml = useMemo(() => renderMarkdown(markdown), [markdown])

  async function doCopy(key: string, text: string) {
    if (await copyText(text)) {
      setCopied(key)
      setTimeout(() => setCopied(null), 1800)
    }
  }

  function download() {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ficha-pico-${work.caseId}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function reset() {
    clearWork()
    chooseCase('C')
  }

  const picoFilled = [work.pico.population, work.pico.intervention, work.pico.comparison, work.pico.outcome, work.pico.question].filter((v) => v.trim()).length
  const steps: Step[] = [
    { n: 1, id: 'paso-1', label: 'Caso clínico', short: 'Caso', note: preset ? `Caso ${preset.id} · ${preset.short}` : 'Caso propio', done: true },
    { n: 2, id: 'paso-2', label: 'Pregunta PICO', short: 'PICO', note: `${picoFilled} de 5 campos`, done: picoFilled === 5 },
    { n: 3, id: 'paso-3', label: 'Búsqueda', short: 'Ecuación', note: work.searchLog ? `${work.searchLog.totalCount} en PubMed` : 'Sin ejecutar', done: !!work.searchLog },
    { n: 4, id: 'paso-4', label: 'Evidencia', short: 'Evidencia', note: selectedRecords.length ? `${selectedRecords.length} seleccionados` : 'Sin selección', done: selectedRecords.length > 0 && missingReasons === 0 },
    { n: 5, id: 'paso-5', label: 'Síntesis', short: 'Síntesis', note: active ? (active.layer === 'L0' ? 'Verificada' : 'IA gratuita') : l1.entries.length ? 'Extractiva' : 'Pendiente', done: selectedRecords.length > 0 && (!!active || l1.entries.length > 0) },
    { n: 6, id: 'paso-6', label: 'Entrega', short: 'Entrega', note: selectedRecords.length && missingReasons === 0 ? 'Lista' : 'Faltan motivos', done: selectedRecords.length > 0 && missingReasons === 0 && (!!active || l1.entries.length > 0) },
  ]
  const activeStep = useActiveStep(steps.map((s) => s.id))

  return (
    <div className="shell mx-auto max-w-[78rem] px-4 pb-20 sm:px-6 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-12 lg:px-10">
      <StepRail steps={steps} active={activeStep} theme={theme} onTheme={toggleTheme} onReset={reset} />
      <MobileBar steps={steps} active={activeStep} theme={theme} onTheme={toggleTheme} onReset={reset} />

      <main className="min-w-0 space-y-5 pt-5 lg:pt-8">
        <div className="no-print">
          <Notice tone="gold">
            <strong className="font-semibold">Uso educativo.</strong> No ingreses datos de pacientes reales.{' '}
            <details className="mt-0.5">
              <summary className="inline-flex min-h-8 items-center font-semibold underline underline-offset-2">Qué significa esto</summary>
              <p className="mt-1">
                Esta herramienta no sirve para decidir tratamientos: verifica la evidencia en los textos completos y con un profesional cualificado. Las síntesis de IA pueden equivocarse, por eso cada afirmación trae su PMID y su cita literal para comprobarla.
              </p>
            </details>
          </Notice>
        </div>

        {needsCode && (
          <div className="no-print">
            <Notice tone="accent">
              <label className="flex flex-wrap items-center gap-3">
                <span className="font-semibold">Este sitio pide un código de acceso:</span>
                <input
                  className="field max-w-52"
                  type="password"
                  autoComplete="off"
                  onChange={(e) => {
                    try {
                      localStorage.setItem('keto.accessCode', e.target.value)
                    } catch {
                      /* noop */
                    }
                  }}
                />
                <span className="text-[0.86rem] text-ink-2">Después repite la acción.</span>
              </label>
            </Notice>
          </div>
        )}

        <CaseSection caseId={work.caseId} preset={preset} onChoose={chooseCase} />
        <PicoSection pico={work.pico} preset={!!preset} onPatch={patchPico} />
        <StrategySection
          work={work}
          query={query}
          patch={patch}
          generateTerms={generateTerms}
          suggesting={suggesting}
          suggestNote={suggestNote}
          llmOn={llmOn}
          runSearch={runSearch}
          searching={searching}
          copied={copied}
          onCopy={doCopy}
        />
        <EvidenceSection
          work={work}
          searching={searching}
          searchError={searchError}
          pageRecords={pageRecords}
          page={safePage}
          pageSize={PAGE_SIZE}
          listTop={listTop}
          onPage={goPage}
          onToggle={toggle}
          onReason={setReason}
          selectedCount={selectedRecords.length}
          missingReasons={missingReasons}
          onGoSynthesis={() => document.getElementById('paso-5')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })}
        />
        <SynthesisSection
          layer={layer}
          setLayer={setLayer}
          snapshot={snapshot}
          l1={l1}
          usingTopFive={selectedWithAbstract.length === 0}
          l2={l2}
          llmOn={llmOn}
          selectedWithAbstract={selectedWithAbstract.length}
          runL2={runL2}
        />
        <DeliverySection html={deliveryHtml} missingReasons={missingReasons} copied={copied === 'md'} onCopy={() => doCopy('md', markdown)} onDownload={download} />

        <footer className="no-print space-y-2 pt-4 text-[0.84rem] text-ink-2">
          <p className="max-w-[72ch]">{CLINICAL_DISCLAIMER}</p>
          <p>
            Fuente de la evidencia:{' '}
            <a className="font-semibold text-accent underline-offset-2 hover:underline" href="https://pubmed.ncbi.nlm.nih.gov/" target="_blank" rel="noreferrer">
              PubMed / NCBI
            </a>
            . Las revisiones Cochrane están indexadas en PubMed. Pictogramas: Health Icons (MIT).
          </p>
        </footer>
      </main>
    </div>
  )
}
