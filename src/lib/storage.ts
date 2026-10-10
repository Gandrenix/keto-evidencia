const KEY = 'keto.work.v1'

export function loadWork<T>(): T | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function saveWork(w: unknown): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(w))
  } catch {
    /* sin almacenamiento: la app funciona igual */
  }
}

export function clearWork(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}
