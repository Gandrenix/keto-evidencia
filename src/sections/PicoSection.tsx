import { CircleHelp, ChevronDown } from 'lucide-react'
import type { Pico } from '../shared/schemas.ts'
import { Section } from '../components/ui.tsx'

type Key = 'population' | 'intervention' | 'comparison' | 'outcome'

const FIELDS: { key: Key; letter: string; name: string; help: string; example: string; chip: string }[] = [
  { key: 'population', letter: 'P', name: 'Población', help: '¿Quiénes son? Edad, condición o problema de salud.', example: 'Niños con epilepsia farmacorresistente', chip: 'bg-accent text-accent-ink' },
  { key: 'intervention', letter: 'I', name: 'Intervención', help: '¿Qué se hace o se evalúa?', example: 'Dieta cetogénica como tratamiento adicional', chip: 'bg-gold-fill text-[#1d1300]' },
  { key: 'comparison', letter: 'C', name: 'Comparación', help: '¿Frente a qué se compara? Es el grupo control.', example: 'Tratamiento habitual', chip: 'bg-ink-2 text-bg' },
  { key: 'outcome', letter: 'O', name: 'Resultado', help: '¿Qué resultado se mide para saber si funcionó?', example: 'Frecuencia de crisis', chip: 'bg-ink text-bg' },
]

export function PicoSection({ pico, preset, onPatch }: { pico: Pico; preset: boolean; onPatch: (p: Partial<Pico>) => void }) {
  return (
    <Section n={2} title="Formula la pregunta PICO" hint={preset ? 'Es un borrador sugerido. Edítalo con tu equipo y valídalo con tu docente.' : 'Cuatro piezas que ordenan tu pregunta clínica. Escríbelas en español.'}>
      <div className="grid gap-4 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`pico-${f.key}`} className="mb-1.5 flex items-start gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-[1.15rem] font-bold ${f.chip}`} aria-hidden>
                {f.letter}
              </span>
              <span className="min-w-0">
                <span className="block text-[1rem] font-semibold leading-tight text-ink">{f.name}</span>
                <span className="mt-0.5 block text-[0.84rem] leading-snug text-ink-2">{f.help}</span>
              </span>
            </label>
            <textarea id={`pico-${f.key}`} className="field min-h-[5.25rem]" maxLength={600} placeholder={`Ej.: ${f.example}`} value={pico[f.key]} onChange={(e) => onPatch({ [f.key]: e.target.value })} />
          </div>
        ))}
      </div>

      <div className="mt-5">
        <label htmlFor="pico-question" className="mb-1.5 block">
          <span className="block text-[1rem] font-semibold text-ink">Pregunta clínica formulada por el equipo</span>
          <span className="mt-0.5 block text-[0.84rem] text-ink-2">Junta P, I, C y O en una sola frase.</span>
        </label>
        <textarea id="pico-question" className="field min-h-[4.5rem]" maxLength={800} value={pico.question} onChange={(e) => onPatch({ question: e.target.value })} />
      </div>

      <details className="group mt-4 rounded-xl bg-panel-2">
        <summary className="flex min-h-11 list-none items-center gap-2.5 px-4 py-2.5 text-[0.94rem] font-semibold text-ink">
          <CircleHelp size={18} className="text-accent" aria-hidden />
          <span className="flex-1">¿Qué es el comparador (C) y por qué importa?</span>
          <ChevronDown size={17} className="chev text-ink-2" aria-hidden />
        </summary>
        <div className="max-w-[68ch] space-y-2 px-4 pb-4 text-[0.94rem] text-ink-2">
          <p>
            Es lo que se compara contra la intervención: el <strong className="text-ink">grupo control</strong>. Sin comparador no se puede saber si la intervención funciona mejor que otra opción. Ejemplos: dieta cetogénica frente a dieta hipocalórica,
            un fármaco frente a placebo, o un tratamiento nuevo frente al habitual.
          </p>
          <p>
            En la búsqueda casi nunca se incluye, porque los estudios rara vez lo nombran con las mismas palabras y se pierden artículos buenos. Sirve más adelante para juzgar si cada estudio comparó contra algo apropiado.
          </p>
        </div>
      </details>
    </Section>
  )
}
