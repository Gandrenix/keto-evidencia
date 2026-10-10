/** Caché en memoria con TTL (por instancia de la función). El CDN de Netlify cachea además /api/search (GET). */
export class TtlCache<V> {
  private store = new Map<string, { v: V; exp: number }>()
  constructor(
    private ttlMs: number,
    private max = 200,
  ) {}
  get(k: string): V | undefined {
    const e = this.store.get(k)
    if (!e) return undefined
    if (e.exp < Date.now()) return void this.store.delete(k)
    return e.v
  }
  set(k: string, v: V): void {
    if (this.store.size >= this.max) this.store.delete(this.store.keys().next().value as string)
    this.store.set(k, { v, exp: Date.now() + this.ttlMs })
  }
}

export async function sha1Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
