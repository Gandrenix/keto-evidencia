import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  page: number
  pageSize: number
  count: number
  onPage: (p: number) => void
}

/** Navegación por páginas (anterior / números / siguiente): objetivos táctiles de 44 px y teclado. */
export function Pager({ page, pageSize, count, onPage }: Props) {
  const pages = Math.max(1, Math.ceil(count / pageSize))
  if (pages <= 1) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(count, page * pageSize)
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1)
  const btn = 'tnum grid h-11 min-w-11 place-items-center rounded-xl border px-2 text-[0.95rem] transition-[background-color,border-color,color,transform] duration-150 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <nav aria-label="Páginas de resultados" className="my-4 flex flex-wrap items-center justify-between gap-3">
      <p className="tnum text-[0.88rem] text-ink-2" aria-live="polite">
        Artículos {from}–{to} de {count}
      </p>
      <div className="flex items-center gap-1.5">
        <button className={`${btn} border-line-strong bg-panel text-ink hover:border-accent`} onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Página anterior">
          <ChevronLeft size={18} aria-hidden />
        </button>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1.5">
            {i > 0 && n - (nums[i - 1] ?? 0) > 1 && <span className="px-0.5 text-ink-2">…</span>}
            <button
              className={`${btn} ${n === page ? 'border-accent bg-accent font-bold text-accent-ink' : 'border-line-strong bg-panel text-ink hover:border-accent'}`}
              onClick={() => onPage(n)}
              aria-label={`Página ${n}`}
              aria-current={n === page ? 'page' : undefined}
            >
              {n}
            </button>
          </span>
        ))}
        <button className={`${btn} border-line-strong bg-panel text-ink hover:border-accent`} onClick={() => onPage(page + 1)} disabled={page >= pages} aria-label="Página siguiente">
          <ChevronRight size={18} aria-hidden />
        </button>
      </div>
    </nav>
  )
}
