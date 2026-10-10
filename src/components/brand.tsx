import type { SVGProps } from 'react'
import { DESIGN_LABELS, type DesignTier } from '../shared/schemas.ts'

/* ───────── Marca ───────── */
export function Logo({ size = 36, ...p }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="KetoEvidencia" {...p}>
      <rect width="64" height="64" rx="15" fill="var(--panel)" stroke="var(--line)" />
      <path d="M32 9 51.6 20.3v23.4L32 55 12.4 43.7V20.3z" fill="none" stroke="var(--accent)" strokeWidth="3.4" strokeLinejoin="round" />
      <path d="M32 21.5 40.5 38h-17z" fill="var(--accent)" />
      <path d="M27 43.5h10" stroke="var(--gold-fill)" strokeWidth="3.4" strokeLinecap="round" />
    </svg>
  )
}

/* ───────── Pirámide de evidencia (gesto propio) ─────────
   Cinco niveles de diseño de estudio: 1 = revisiones sistemáticas / meta-análisis (cima) … 5 = otros (base). */
const Y = [2, 8.4, 14.8, 21.2, 27.6, 34]
const xAt = (y: number) => 18 * ((y - 2) / 32)
const band = (i: number, gap = 0.7) => {
  const y0 = (Y[i] ?? 0) + gap
  const y1 = (Y[i + 1] ?? 0) - gap
  return `${20 - xAt(y0)},${y0} ${20 + xAt(y0)},${y0} ${20 + xAt(y1)},${y1} ${20 - xAt(y1)},${y1}`
}
export const tierColor = (tier: number) => (tier === 1 ? 'var(--accent)' : tier === 2 ? 'var(--gold-fill)' : 'var(--ink-2)')

export function TierMark({ tier, size = 34, animate = false }: { tier: DesignTier; size?: number; animate?: boolean }) {
  return (
    <svg width={size} height={(size * 36) / 40} viewBox="0 0 40 36" role="img" aria-label={`Nivel de evidencia ${tier} de 5: ${DESIGN_LABELS[tier]}`} className={animate ? 'pop' : undefined}>
      {[1, 2, 3, 4, 5].map((t) => (
        <polygon key={t} points={band(t - 1)} fill={t === tier ? tierColor(t) : 'var(--line-strong)'} opacity={t === tier ? 1 : 0.9} />
      ))}
    </svg>
  )
}

const LEGEND: { tier: DesignTier; title: string; text: string }[] = [
  { tier: 1, title: 'Revisión sistemática o meta-análisis', text: 'Reúne y analiza muchos estudios con un método explícito. Es el punto de partida.' },
  { tier: 2, title: 'Ensayo clínico aleatorizado (ECA)', text: 'Compara grupos asignados al azar; es la mejor prueba de un solo estudio.' },
  { tier: 3, title: 'Otro ensayo o estudio comparativo', text: 'Compara, pero sin asignación aleatoria completa.' },
  { tier: 4, title: 'Estudio observacional', text: 'Cohortes y casos y controles: observan sin intervenir.' },
  { tier: 5, title: 'Revisión narrativa u otro', text: 'Opinión o descripción; útil para contexto, no para decidir.' },
]

export function PyramidLegend() {
  return (
    <div className="inset grid items-center gap-5 p-4 sm:grid-cols-[9rem_1fr] sm:p-5">
      <svg viewBox="0 0 40 36" className="mx-auto w-36 sm:w-full" aria-hidden>
        {LEGEND.map(({ tier }) => (
          <polygon key={tier} points={band(tier - 1, 0.55)} fill={tierColor(tier)} opacity={tier <= 2 ? 1 : 0.5 + (5 - tier) * 0.08} />
        ))}
      </svg>
      <ol className="space-y-2.5">
        {LEGEND.map((l) => (
          <li key={l.tier} className="flex gap-3 text-sm">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md text-xs font-bold text-accent-ink" style={{ background: tierColor(l.tier) }}>
              {l.tier}
            </span>
            <span>
              <strong className="font-semibold text-ink">{l.title}.</strong> <span className="text-ink-2">{l.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ───────── Ilustración de estado vacío ───────── */
export function EmptyIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 150" className={className} aria-hidden>
      <g opacity="0.9">
        {[1, 2, 3, 4, 5].map((t) => {
          const ys = [24, 44, 64, 84, 104, 124]
          const y0 = ys[t - 1] ?? 0
          const y1 = ys[t] ?? 0
          const half = (y: number) => 64 * ((y - 24) / 100) + 6
          return (
            <polygon
              key={t}
              points={`${96 - half(y0)},${y0 + 1.5} ${96 + half(y0)},${y0 + 1.5} ${96 + half(y1)},${y1 - 1.5} ${96 - half(y1)},${y1 - 1.5}`}
              fill={t === 1 ? 'var(--accent)' : t === 2 ? 'var(--gold-fill)' : 'var(--line-strong)'}
              opacity={t <= 2 ? 0.95 : 0.7}
            />
          )
        })}
      </g>
      <circle cx="150" cy="86" r="30" fill="var(--panel)" fillOpacity="0.85" stroke="var(--ink)" strokeWidth="5" />
      <path d="m172 108 24 24" stroke="var(--ink)" strokeWidth="9" strokeLinecap="round" />
      <path d="M137 80a14 14 0 0 1 12-9" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" fill="none" />
    </svg>
  )
}
