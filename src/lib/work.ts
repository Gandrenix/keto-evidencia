import { presetById } from '../shared/presets.ts'
import type { DesignKey } from '../shared/query-builder.ts'
import type { EvidenceRecord, Pico, SearchLog, Synthesis } from '../shared/schemas.ts'

export type CaseId = 'A' | 'B' | 'C' | 'D' | 'custom'

export const EMPTY_PICO: Pico = { population: '', intervention: '', comparison: '', outcome: '', question: '' }
export const MAX_SELECT = 8
/** Candidatos que se traen de PubMed (ordenados por diseño y relevancia) y tamaño de página en pantalla. */
export const CANDIDATES = 50
export const PAGE_SIZE = 10
export const join = (t: string[]) => t.join('; ')

export interface Work {
  caseId: CaseId
  pico: Pico
  popTerms: string
  intTerms: string
  compTerms: string
  useComparison: boolean
  designs: DesignKey[]
  queryOverride: string | null
  searchLog: SearchLog | null
  records: EvidenceRecord[]
  fromSnapshot: boolean
  selected: Record<string, string>
}

export function workFor(caseId: CaseId): Work {
  const p = caseId === 'custom' ? null : presetById(caseId)
  return {
    caseId,
    pico: p ? { ...p.pico } : { ...EMPTY_PICO },
    popTerms: p ? join(p.blocks.population) : '',
    intTerms: p ? join(p.blocks.intervention) : '"ketogenic diet"; "ketogenic dietary therapy"; "Diet, Ketogenic"[Mesh]',
    compTerms: p ? join(p.blocks.comparison) : '',
    useComparison: false,
    designs: p ? [...p.blocks.designs] : ['sr', 'ma', 'rct'],
    queryOverride: null,
    searchLog: null,
    records: [],
    fromSnapshot: false,
    selected: {},
  }
}

export type L2State =
  | { status: 'idle' | 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; synthesis: Synthesis; records: EvidenceRecord[]; dropped: number; model: string; cache: string }
