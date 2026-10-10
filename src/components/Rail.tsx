import { useEffect, useRef } from 'react'
import { Check, Moon, RotateCcw, Sun } from 'lucide-react'
import { Logo } from './brand.tsx'
import type { Theme } from '../lib/theme.ts'

export interface Step {
  n: number
  id: string
  label: string
  short: string
  note: string
  done: boolean
}

export function ThemeToggle({ theme, onToggle, className = '' }: { theme: Theme; onToggle: () => void; className?: string }) {
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`btn btn-quiet !min-h-11 !min-w-11 !px-3 ${className}`}
      aria-label={dark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      aria-pressed={dark}
      title={dark ? 'Tema claro' : 'Tema oscuro'}
    >
      {dark ? <Sun size={19} aria-hidden /> : <Moon size={19} aria-hidden />}
    </button>
  )
}

const go = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault()
  document.getElementById(id)?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}

/** Riel lateral (escritorio): marca, pasos con estado, tema y reinicio. */
export function StepRail({ steps, active, theme, onTheme, onReset }: { steps: Step[]; active: string; theme: Theme; onTheme: () => void; onReset: () => void }) {
  return (
    <aside className="no-print sticky top-6 hidden h-[calc(100dvh-3rem)] flex-col lg:flex" aria-label="Navegación del flujo">
      <div className="flex items-center gap-3">
        <Logo size={44} />
        <div>
          <p className="font-display text-[1.25rem] font-bold leading-none text-ink">KetoEvidencia</p>
          <p className="mt-1.5 text-[0.82rem] leading-tight text-ink-2">Taller PICO y evidencia en PubMed</p>
        </div>
      </div>

      <nav className="mt-9 flex-1" aria-label="Pasos">
        <ol className="relative">
          {steps.map((s, i) => {
            const isActive = active === s.id
            const next = steps[i + 1]
            return (
              <li key={s.id} className="relative pb-6 last:pb-0">
                {next && (
                  <span aria-hidden className="absolute left-[15px] top-9 h-[calc(100%-2.25rem)] w-0.5 overflow-hidden rounded bg-line">
                    <span className={`block h-full w-full origin-top bg-accent transition-transform duration-500 ease-out ${s.done ? 'scale-y-100' : 'scale-y-0'}`} />
                  </span>
                )}
                <a
                  href={`#${s.id}`}
                  onClick={go(s.id)}
                  aria-current={isActive ? 'step' : undefined}
                  className={`group flex items-start gap-3.5 rounded-xl py-1 pr-2 transition-colors duration-150 ${isActive ? 'text-ink' : 'text-ink-2 hover:text-ink'}`}
                >
                  <span
                    className={`tnum grid h-8 w-8 shrink-0 place-items-center rounded-full text-[0.9rem] font-bold ring-2 ring-inset transition-colors duration-200 ${
                      s.done ? 'bg-accent text-accent-ink ring-accent' : isActive ? 'bg-accent-soft text-accent ring-accent' : 'bg-panel text-ink-2 ring-line-strong'
                    }`}
                  >
                    {s.done ? <Check size={16} strokeWidth={3} aria-hidden /> : s.n}
                  </span>
                  <span className="min-w-0 pt-0.5">
                    <span className={`block text-[0.98rem] leading-tight ${isActive ? 'font-semibold' : 'font-medium'}`}>{s.label}</span>
                    <span className="mt-0.5 block truncate text-[0.82rem] text-ink-2">{s.note}</span>
                  </span>
                </a>
              </li>
            )
          })}
        </ol>
      </nav>

      <div className="mt-6 flex items-center gap-1 border-t border-line pt-4">
        <ThemeToggle theme={theme} onToggle={onTheme} />
        <button type="button" onClick={onReset} className="btn btn-quiet !min-h-11 flex-1 !justify-start !px-3" title="Borra el trabajo guardado en este navegador">
          <RotateCcw size={17} aria-hidden /> Nuevo trabajo
        </button>
      </div>
    </aside>
  )
}

/** Barra superior (móvil): marca, tema y tira de pasos deslizable que queda fija. */
export function MobileBar({ steps, active, theme, onTheme, onReset }: { steps: Step[]; active: string; theme: Theme; onTheme: () => void; onReset: () => void }) {
  const strip = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('[aria-current="step"]')
    if (el && strip.current) strip.current.scrollTo({ left: el.offsetLeft - 16, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [active])

  return (
    <div className="no-print lg:hidden">
      <header className="flex items-center gap-3 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <Logo size={40} />
        <div className="min-w-0 flex-1">
          <p className="font-display text-[1.2rem] font-bold leading-none text-ink">KetoEvidencia</p>
          <p className="mt-1 truncate text-[0.8rem] text-ink-2">Taller PICO y evidencia en PubMed</p>
        </div>
        <button type="button" onClick={onReset} className="btn btn-quiet !min-h-11 !min-w-11 !px-3" aria-label="Nuevo trabajo" title="Borra el trabajo guardado en este navegador">
          <RotateCcw size={18} aria-hidden />
        </button>
        <ThemeToggle theme={theme} onToggle={onTheme} />
      </header>
      <nav aria-label="Pasos" className="sticky top-0 z-30 -mx-4 border-b border-line bg-bg px-4 sm:-mx-6 sm:px-6">
        <div ref={strip} className="flex snap-x gap-2 overflow-x-auto py-2.5 [scrollbar-width:none]">
          {steps.map((s) => {
            const isActive = active === s.id
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={go(s.id)}
                aria-current={isActive ? 'step' : undefined}
                className={`tnum flex min-h-11 shrink-0 snap-start items-center gap-2 rounded-full px-3.5 text-[0.9rem] font-semibold transition-colors duration-150 ${
                  isActive ? 'bg-accent text-accent-ink' : s.done ? 'bg-accent-soft text-accent' : 'bg-panel text-ink-2 ring-1 ring-inset ring-line'
                }`}
              >
                {s.done ? <Check size={15} strokeWidth={3} aria-hidden /> : <span className="opacity-80">{s.n}</span>}
                {s.short}
              </a>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
