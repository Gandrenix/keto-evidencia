import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { CircleAlert, Info, TriangleAlert } from 'lucide-react'

export const pubmed = (pmid: string) => `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`

/** Panel de un paso del flujo. El número comunica la secuencia (el riel lateral marca cuáles ya están hechos). */
export function Section({
  n,
  title,
  hint,
  children,
  printable = false,
}: {
  n: number
  title: string
  hint?: string
  children: ReactNode
  printable?: boolean
}) {
  return (
    <section id={`paso-${n}`} data-reveal className={`${printable ? 'print-section' : 'no-print'} panel p-4 sm:p-6`} aria-labelledby={`h-paso-${n}`}>
      <header className="section-head mb-5 flex items-start gap-3.5">
        <span className="tnum grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent-soft text-[0.95rem] font-bold text-accent">{n}</span>
        <div className="min-w-0">
          <h2 id={`h-paso-${n}`} className="text-[1.3rem] font-semibold text-ink sm:text-[1.45rem]">
            {title}
          </h2>
          {hint && <p className="mt-1 max-w-[62ch] text-[0.95rem] text-ink-2">{hint}</p>}
        </div>
      </header>
      {children}
    </section>
  )
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'gold' | 'quiet' }
export function Button({ variant = 'ghost', className = '', ...p }: BtnProps) {
  return <button type="button" {...p} className={`btn btn-${variant} ${className}`} />
}

export function LinkButton({ href, children, className = '' }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className={`btn btn-ghost ${className}`}>
      {children}
    </a>
  )
}

const BADGE = {
  muted: 'bg-panel-2 text-ink-2 ring-1 ring-inset ring-line',
  accent: 'bg-accent-soft text-accent',
  gold: 'bg-gold-soft text-gold',
  danger: 'bg-danger-soft text-danger',
}
export function Badge({ children, tone = 'muted', className = '' }: { children: ReactNode; tone?: keyof typeof BADGE; className?: string }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.78rem] font-semibold leading-none ${BADGE[tone]} ${className}`}>{children}</span>
}

const NOTICE = {
  gold: { box: 'bg-gold-soft text-ink', icon: 'text-gold', Icon: TriangleAlert },
  accent: { box: 'bg-accent-soft text-ink', icon: 'text-accent', Icon: Info },
  danger: { box: 'bg-danger-soft text-ink', icon: 'text-danger', Icon: CircleAlert },
}
export function Notice({ tone = 'gold', children, className = '' }: { tone?: keyof typeof NOTICE; children: ReactNode; className?: string }) {
  const t = NOTICE[tone]
  return (
    <div role="note" className={`flex gap-3 rounded-xl px-4 py-3 text-[0.94rem] leading-relaxed ${t.box} ${className}`}>
      <t.Icon size={19} className={`mt-0.5 shrink-0 ${t.icon}`} aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  )
}

export function Label({ children, htmlFor, hint }: { children: ReactNode; htmlFor: string; hint?: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block">
      <span className="block text-[0.92rem] font-semibold text-ink">{children}</span>
      {hint && <span className="mt-0.5 block text-[0.84rem] font-normal text-ink-2">{hint}</span>}
    </label>
  )
}
