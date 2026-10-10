import { useEffect, useState } from 'react'

/**
 * Entrada de secciones al hacer scroll. Falla abierto: el contenido es visible por defecto y solo se oculta
 * cuando JS confirma que puede revelarlo; además, un temporizador de seguridad lo muestra todo.
 * Solo anima opacity y transform. Con «reducir movimiento» no hace nada (CSS lo desactiva y no se oculta nada).
 */
export function useReveal(): void {
  useEffect(() => {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const root = document.documentElement
    const els = [...document.querySelectorAll<HTMLElement>('[data-reveal]')]
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }),
      { rootMargin: '0px 0px -6% 0px', threshold: 0.04 },
    )
    root.classList.add('reveal-ready')
    els.forEach((el) => io.observe(el))
    const failOpen = window.setTimeout(() => els.forEach((el) => el.classList.add('is-in')), 2500)
    return () => {
      window.clearTimeout(failOpen)
      io.disconnect()
      root.classList.remove('reveal-ready')
    }
  }, [])
}

/** Paso visible en pantalla (para resaltar el riel de pasos). */
export function useActiveStep(ids: string[]): string {
  const [active, setActive] = useState(ids[0] ?? '')
  const key = ids.join('|')
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return
    const visible = new Map<string, number>()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => (e.isIntersecting ? visible.set(e.target.id, e.intersectionRatio) : visible.delete(e.target.id)))
        const first = ids.find((id) => visible.has(id))
        if (first) setActive(first)
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0, 0.01, 0.2] },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) io.observe(el)
    })
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return active
}
