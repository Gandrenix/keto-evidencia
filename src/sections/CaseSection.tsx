import { Check, PencilLine, Quote } from 'lucide-react'
import { PRESETS, type CasePreset } from '../shared/presets.ts'
import { Notice, Section } from '../components/ui.tsx'
import type { CaseId } from '../lib/work.ts'
import overweight from '../assets/health/overweight-outline.svg?raw'
import diabetes from '../assets/health/diabetes-measure-outline.svg?raw'
import neurology from '../assets/health/neurology-outline.svg?raw'
import liver from '../assets/health/liver-outline.svg?raw'

/** Pictogramas de Health Icons (MIT): una imagen del órgano o condición de cada caso. */
const GLYPH: Record<string, string> = { A: overweight, B: diabetes, C: neurology, D: liver }

function Glyph({ id }: { id: string }) {
  const svg = GLYPH[id]
  return svg ? (
    <span className="[&>svg]:h-full [&>svg]:w-full h-9 w-9 shrink-0 text-accent" aria-hidden dangerouslySetInnerHTML={{ __html: svg }} />
  ) : (
    <PencilLine size={34} strokeWidth={1.5} className="shrink-0 text-gold" aria-hidden />
  )
}

export function CaseSection({ caseId, preset, onChoose }: { caseId: CaseId; preset: CasePreset | null; onChoose: (id: CaseId) => void }) {
  const cards: { id: CaseId; name: string; sub: string }[] = [...PRESETS.map((p) => ({ id: p.id as CaseId, name: p.short, sub: `Caso ${p.id}` })), { id: 'custom', name: 'Caso propio', sub: 'Escribe el tuyo' }]
  return (
    <Section n={1} title="Elige el caso clínico" hint="Cada equipo trabaja un caso. Si el docente da uno nuevo, usa «Caso propio».">
      <div role="radiogroup" aria-label="Caso clínico" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {cards.map((c) => {
          const on = caseId === c.id
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChoose(c.id)}
              className={`group relative flex min-h-[5.5rem] flex-col items-start gap-2.5 rounded-2xl border p-3.5 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 active:scale-[0.97] ${
                on ? 'border-accent bg-accent-soft shadow-[0_0_0_1px_var(--accent)]' : 'border-line bg-panel hover:border-line-strong'
              } ${c.id === 'custom' ? 'border-dashed' : ''}`}
            >
              <Glyph id={c.id} />
              <span className="block">
                <span className="block text-[1.02rem] font-semibold leading-tight text-ink">{c.name}</span>
                <span className="mt-0.5 block text-[0.8rem] text-ink-2">{c.sub}</span>
              </span>
              {on && (
                <span key={`on-${c.id}`} className="pop absolute right-2.5 top-2.5 grid h-6 w-6 place-items-center rounded-full bg-accent text-accent-ink">
                  <Check size={14} strokeWidth={3.2} aria-hidden />
                </span>
              )}
            </button>
          )
        })}
      </div>

      {preset ? (
        <div key={preset.id} className="enter mt-5 grid gap-3 lg:grid-cols-[1.1fr_1fr]">
          <div className="inset p-4 sm:p-5">
            <h3 className="mb-1.5 text-[0.82rem] font-semibold uppercase tracking-wide text-ink-2">Paciente (ficticio)</h3>
            <p className="max-w-[60ch] text-[1rem] text-ink">{preset.vignette}</p>
          </div>
          <figure className="rounded-[14px] bg-accent-soft p-4 sm:p-5">
            <Quote size={22} className="text-accent" aria-hidden />
            <figcaption className="mt-1.5 text-[0.82rem] font-semibold uppercase tracking-wide text-ink-2">Pregunta del docente</figcaption>
            <p className="mt-1 text-[1.02rem] font-medium leading-snug text-ink">{preset.teacherQuestion}</p>
          </figure>
          {preset.notices.map((n) => (
            <div key={n} className="lg:col-span-2">
              <Notice tone="accent">{n}</Notice>
            </div>
          ))}
        </div>
      ) : (
        <p className="enter mt-5 max-w-[62ch] text-[0.97rem] text-ink-2">Escribe tu caso en los campos del paso siguiente. La herramienta te ayuda a convertirlo en términos de búsqueda en inglés.</p>
      )}
    </Section>
  )
}
