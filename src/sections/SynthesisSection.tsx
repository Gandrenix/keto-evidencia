import { FileText, ShieldCheck, Sparkles } from 'lucide-react'
import type { ExtractiveSummary } from '../shared/extractive.ts'
import { LAYER_LABELS, type SynthesisLayer } from '../shared/schemas.ts'
import type { Snapshot } from '../shared/schemas.ts'
import { Button, Notice, Section } from '../components/ui.tsx'
import { ExtractiveView, SynthesisView } from '../components/SynthesisView.tsx'
import type { L2State } from '../lib/work.ts'

interface Props {
  layer: SynthesisLayer
  setLayer: (l: SynthesisLayer) => void
  snapshot: Snapshot | undefined
  l1: ExtractiveSummary
  usingTopFive: boolean
  l2: L2State
  llmOn: boolean
  selectedWithAbstract: number
  runL2: () => void
}

const TABS: { id: SynthesisLayer; label: string; short: string; Icon: typeof FileText }[] = [
  { id: 'L0', label: 'Verificada', short: 'Verificada', Icon: ShieldCheck },
  { id: 'L1', label: 'Resumen extractivo', short: 'Extractivo', Icon: FileText },
  { id: 'L2', label: 'IA gratuita', short: 'IA gratis', Icon: Sparkles },
]

export function SynthesisSection({ layer, setLayer, snapshot, l1, usingTopFive, l2, llmOn, selectedWithAbstract, runL2 }: Props) {
  const visible = TABS.filter((t) => (t.id === 'L0' ? !!snapshot : t.id === 'L2' ? llmOn : true))
  const current = layer === 'L0' && !snapshot ? 'L1' : layer
  return (
    <Section n={5} title="Síntesis de la evidencia" hint="Elige cómo leer la evidencia. Cada capa dice de dónde viene el texto.">
      <div role="tablist" aria-label="Tipo de síntesis" className="inset mb-4 flex w-full gap-1 p-1 sm:inline-flex sm:w-auto">
        {visible.map((t) => {
          const on = current === t.id
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={on}
              onClick={() => setLayer(t.id)}
              className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] px-3 text-[0.92rem] font-semibold transition-[background-color,color,transform] duration-150 active:scale-[0.97] sm:flex-none sm:px-4 ${
                on ? 'bg-panel text-ink shadow-[var(--shadow-1)] ring-1 ring-inset ring-line' : 'text-ink-2 hover:text-ink'
              }`}
            >
              <t.Icon size={17} className={on ? 'text-accent' : ''} aria-hidden />
              <span className="whitespace-nowrap sm:hidden">{t.short}</span>
              <span className="hidden whitespace-nowrap sm:inline">{t.label}</span>
            </button>
          )
        })}
      </div>
      <p className="mb-4 max-w-[70ch] text-[0.88rem] text-ink-2">{LAYER_LABELS[current]}</p>

      <div key={current} className="enter">
        {current === 'L0' && snapshot && (
          <div className="space-y-3.5">
            <Notice tone={snapshot.reviewedBy ? 'accent' : 'gold'}>
              {snapshot.reviewedBy ? `Revisada por ${snapshot.reviewedBy}.` : 'Generada con asistencia de IA; pendiente de revisión clínica humana.'} Elaborada el{' '}
              {new Date(snapshot.generatedAt).toLocaleDateString('es-CO', { dateStyle: 'long' })} con {snapshot.records.length} artículo(s) de PubMed.
            </Notice>
            <SynthesisView synthesis={snapshot.synthesis} records={snapshot.records} />
          </div>
        )}

        {current === 'L1' &&
          (l1.entries.length === 0 ? (
            <p className="text-[0.95rem] text-ink-2">Busca evidencia en el paso 4 para ver el resumen extractivo.</p>
          ) : (
            <div className="space-y-3.5">
              {usingTopFive && <p className="text-[0.88rem] text-ink-2">No has seleccionado artículos: se muestran los 5 primeros con abstract.</p>}
              <ExtractiveView summary={l1} />
            </div>
          ))}

        {current === 'L2' && (
          <div className="space-y-4">
            <Notice tone="gold">
              IA gratuita: el texto de los abstracts seleccionados se envía a un proveedor externo con plan gratuito, que puede usarlo para mejorar sus productos. No incluyas datos de pacientes en el PICO.
            </Notice>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="gold" onClick={runL2} disabled={selectedWithAbstract === 0 || l2.status === 'loading'} className="w-full sm:w-auto">
                <Sparkles size={18} aria-hidden /> {l2.status === 'loading' ? 'Generando…' : `Generar síntesis (${selectedWithAbstract} artículo${selectedWithAbstract === 1 ? '' : 's'})`}
              </Button>
              {selectedWithAbstract === 0 && <p className="text-[0.88rem] text-ink-2">Selecciona al menos un artículo con abstract en el paso 4.</p>}
            </div>
            {l2.status === 'loading' && (
              <div className="space-y-3" aria-live="polite" aria-busy="true">
                <span className="sr-only">Generando la síntesis…</span>
                {[0, 1, 2].map((i) => (
                  <div key={i} className="shimmer inset relative h-24 overflow-hidden" />
                ))}
              </div>
            )}
            {l2.status === 'error' && <Notice tone="danger">{l2.message}</Notice>}
            {l2.status === 'ok' && (
              <>
                <p className="text-[0.84rem] text-ink-2">
                  Modelo: {l2.model} · {l2.cache === 'hit' ? 'resultado en caché' : 'generado ahora'}
                </p>
                <SynthesisView synthesis={l2.synthesis} records={l2.records} droppedCount={l2.dropped} />
              </>
            )}
          </div>
        )}
      </div>
    </Section>
  )
}
