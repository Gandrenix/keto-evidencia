import { SnapshotSchema, type Snapshot } from '../shared/schemas.ts'

const modules = import.meta.glob('../../data/snapshots/*.json', { eager: true, import: 'default' })

/** Snapshots (L0) empaquetados en el build, validados con el esquema. Los inválidos se ignoran. */
export const SNAPSHOTS: Record<string, Snapshot> = Object.fromEntries(
  Object.values(modules).flatMap((m) => {
    const p = SnapshotSchema.safeParse(m)
    return p.success ? [[p.data.caseId, p.data] as const] : []
  }),
)
