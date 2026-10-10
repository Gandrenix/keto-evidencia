import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const current = (): Theme => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light')

/** Tema claro/oscuro: lo inicia /theme-init.js (sin parpadeo); aquí solo se lee, se alterna y se recuerda. */
export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() => (typeof document === 'undefined' ? 'light' : current()))

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      let stored: string | null = null
      try {
        stored = localStorage.getItem('keto.theme')
      } catch {
        /* noop */
      }
      if (stored === 'light' || stored === 'dark') return
      apply(mq.matches ? 'dark' : 'light', false)
      setTheme(mq.matches ? 'dark' : 'light')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const toggle = useCallback(() => {
    const next: Theme = current() === 'dark' ? 'light' : 'dark'
    apply(next, true)
    setTheme(next)
  }, [])

  return [theme, toggle]
}

function apply(t: Theme, persist: boolean) {
  document.documentElement.setAttribute('data-theme', t)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#06101e' : '#eef3f5')
  if (persist) {
    try {
      localStorage.setItem('keto.theme', t)
    } catch {
      /* sin almacenamiento */
    }
  }
}
