import type { ReactNode } from 'react'
import { ChevronDown, ClipboardList, Compass, FlaskConical, Gauge, ShieldCheck, ShieldQuestion, ShieldX, Scale } from 'lucide-react'
import type { ExtractiveSummary } from '../shared/extractive.ts'
import { SYNTHESIS_NOTE, type EvidenceRecord, type Support, type Synthesis } from '../shared/schemas.ts'
import { Badge, Notice, pubmed } from './ui.tsx'
import { TierMark } from './brand.tsx'

const STANCE = {
  supports: { label: 'La evidencia respalda la pregunta', tone: 'accent' as const, Icon: ShieldCheck, box: 'bg-accent-soft', text: 'text-accent' },
  mixed: { label: 'Evidencia mixta', tone: 'gold' as const, Icon: Scale, box: 'bg-gold-soft', text: 'text-gold' },
  insufficient: { label: 'Evidencia insuficiente o no concluyente', tone: 'gold' as const, Icon: ShieldQuestion, box: 'bg-gold-soft', text: 'text-gold' },
  against: { label: 'La evidencia no respalda la pregunta', tone: 'danger' as const, Icon: ShieldX, box: 'bg-danger-soft', text: 'text-danger' },
}
const DIRECTION = { benefit: 'Beneficio', no_difference: 'Sin diferencia', harm: 'Daño', unclear: 'Poco claro' }
const DIR_TONE = { benefit: 'accent', no_difference: 'muted', harm: 'danger', unclear: 'gold' } as const

function Refs({ support, records }: { support: Support[]; records: Map<string, EvidenceRecord> }) {
  // Varias citas del mismo artículo se agrupan en una sola fila.
  const groups = new Map<string, string[]>()
  support.forEach((s) => groups.set(s.pmid, [...(groups.get(s.pmid) ?? []), s.quote]))
  return (
    <ul className="mt-2 space-y-1.5">
      {[...groups].map(([pmid, quotes]) => {
        const r = records.get(pmid)
        return (
          <li key={pmid}>
            <details className="rounded-lg bg-panel-2 text-[0.84rem]">
              <summary className="flex min-h-11 list-none items-center gap-2 px-3 py-2">
                <a href={pubmed(pmid)} target="_blank" rel="noreferrer" className="tnum shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 font-semibold text-accent underline-offset-2 hover:underline">
                  PMID {pmid}
                </a>
                <span className="min-w-0 flex-1 truncate text-ink-2">{r ? `${r.firstAuthor} et al., ${r.year}` : ''}</span>
                <span className="flex shrink-0 items-center gap-1 text-ink-2">
                  <span className="hidden sm:inline">{quotes.length > 1 ? `${quotes.length} citas literales` : 'Cita literal'}</span>
                  <span className="sm:hidden">{quotes.length > 1 ? `${quotes.length} citas` : 'Cita'}</span> <ChevronDown size={15} className="chev" aria-hidden />
                </span>
              </summary>
              <div className="space-y-2 px-3 pb-3">
                {quotes.map((q, i) => (
                  <blockquote key={i} className="text-[0.88rem] italic leading-relaxed text-ink">
                    «{q}»
                  </blockquote>
                ))}
              </div>
            </details>
          </li>
        )
      })}
    </ul>
  )
}

function Block({ title, Icon, children }: { title: string; Icon: typeof ClipboardList; children: ReactNode }) {
  return (
    <section className="inset p-4 sm:p-5">
      <h3 className="mb-3 flex items-center gap-2.5 text-[1.02rem] font-semibold text-ink">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-panel text-accent ring-1 ring-inset ring-line">
          <Icon size={18} aria-hidden />
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

const SubHead = ({ children }: { children: ReactNode }) => <h4 className="mb-1.5 mt-4 text-[0.82rem] font-semibold uppercase tracking-wide text-ink-2">{children}</h4>

export function SynthesisView({ synthesis: s, records, droppedCount = 0 }: { synthesis: Synthesis; records: EvidenceRecord[]; droppedCount?: number }) {
  const map = new Map(records.map((r) => [r.pmid, r]))
  const st = STANCE[s.stance]
  return (
    <div className="space-y-3.5">
      <div className={`flex gap-3.5 rounded-2xl p-4 sm:p-5 ${st.box}`}>
        <st.Icon size={28} className={`mt-0.5 shrink-0 ${st.text}`} aria-hidden />
        <div className="min-w-0">
          <p className={`font-display text-[1.15rem] font-semibold leading-snug ${st.text}`}>{st.label}</p>
          <p className="mt-1 text-[0.97rem] text-ink">{s.stanceRationale}</p>
        </div>
      </div>

      <Block title="Hallazgos" Icon={ClipboardList}>
        {s.findings.length === 0 ? (
          <p className="text-[0.95rem] text-ink-2">No hay hallazgos que se puedan verificar contra los abstracts seleccionados.</p>
        ) : (
          <ul className="space-y-5">
            {s.findings.map((f, i) => (
              <li key={i} className="enter text-[0.97rem]" style={{ ['--i' as string]: Math.min(i, 8) }}>
                <p className="flex flex-wrap items-start gap-x-2.5 gap-y-1.5">
                  <span className="min-w-0 flex-1 basis-[16rem] text-ink">{f.statement}</span>
                  <Badge tone={DIR_TONE[f.direction]}>{DIRECTION[f.direction]}</Badge>
                </p>
                <Refs support={f.support} records={map} />
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Mecanismo y paraclínicos" Icon={FlaskConical}>
        {s.paraclinical.length === 0 ? (
          <p className="text-[0.95rem] text-ink-2">No se reporta en los abstracts seleccionados.</p>
        ) : (
          <ul className="space-y-5">
            {s.paraclinical.map((p, i) => (
              <li key={i} className="text-[0.97rem]">
                <strong className="font-semibold text-ink">{p.parameter}.</strong> {p.observation}
                <Refs support={p.support} records={map} />
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Certeza y limitaciones" Icon={Gauge}>
        {s.certainty.reportedGrade.length === 0 ? (
          <p className="text-[0.95rem] text-ink-2">Los abstracts seleccionados no reportan el grado de certeza (GRADE). {SYNTHESIS_NOTE}</p>
        ) : (
          <ul className="space-y-4">
            {s.certainty.reportedGrade.map((g, i) => (
              <li key={i} className="text-[0.97rem]">
                <strong className="font-semibold text-ink">GRADE reportado.</strong> {g.text}
                <Refs support={[{ pmid: g.pmid, quote: g.quote }]} records={map} />
              </li>
            ))}
          </ul>
        )}
        {s.certainty.limitations.length > 0 && (
          <>
            <SubHead>Limitaciones</SubHead>
            <ul className="list-disc space-y-3 pl-5 text-[0.95rem] marker:text-ink-2">
              {s.certainty.limitations.map((l, i) => (
                <li key={i}>
                  {l.text}
                  {l.support && <Refs support={[l.support]} records={map} />}
                </li>
              ))}
            </ul>
          </>
        )}
      </Block>

      <Block title="Aplicabilidad al caso" Icon={Compass}>
        <p className="max-w-[68ch] text-[0.97rem]">{s.applicability.summary}</p>
        <p className="mt-2 text-[0.85rem] text-ink-2">Resumen de evidencia, no una indicación clínica.</p>
        {s.applicability.safetyConcerns.length > 0 && (
          <>
            <SubHead>Seguridad</SubHead>
            <ul className="list-disc space-y-3 pl-5 text-[0.95rem] marker:text-ink-2">
              {s.applicability.safetyConcerns.map((c, i) => (
                <li key={i}>
                  {c.text}
                  <Refs support={[c.support]} records={map} />
                </li>
              ))}
            </ul>
          </>
        )}
        {s.applicability.monitoring.length > 0 && (
          <>
            <SubHead>Monitoreo</SubHead>
            <ul className="list-disc space-y-3 pl-5 text-[0.95rem] marker:text-ink-2">
              {s.applicability.monitoring.map((m, i) => (
                <li key={i}>
                  {m.text}
                  {m.support && <Refs support={[m.support]} records={map} />}
                </li>
              ))}
            </ul>
          </>
        )}
        {s.evidenceGaps.length > 0 && (
          <>
            <SubHead>Lo que falta por saber</SubHead>
            <ul className="list-disc space-y-1.5 pl-5 text-[0.95rem] marker:text-ink-2">
              {s.evidenceGaps.map((g, i) => (
                <li key={i}>{g}</li>
              ))}
            </ul>
          </>
        )}
      </Block>

      {droppedCount > 0 && (
        <Notice tone="gold">
          Se omitieron {droppedCount} afirmación(es) del modelo porque no se pudieron comprobar contra los abstracts (PMID o cita literal inexistentes).
        </Notice>
      )}
    </div>
  )
}

export function ExtractiveView({ summary }: { summary: ExtractiveSummary }) {
  const c = summary.counts
  return (
    <div className="space-y-3.5">
      <p className="text-[0.97rem] text-ink-2">
        <strong className="tnum text-ink">{c.total}</strong> artículo(s): <strong className="tnum text-ink">{c.systematicReviews}</strong> revisión(es) sistemática(s) o meta-análisis,{' '}
        <strong className="tnum text-ink">{c.rcts}</strong> ECA y <strong className="tnum text-ink">{c.other}</strong> de otros diseños
        {c.withoutAbstract > 0 && <>; {c.withoutAbstract} sin abstract</>}.
      </p>
      {summary.entries.map((e, i) => (
        <article key={e.pmid} className="inset enter p-4 sm:p-5" style={{ ['--i' as string]: Math.min(i, 8) }}>
          <div className="flex items-start gap-3">
            <TierMark tier={e.designTier as 1 | 2 | 3 | 4 | 5} size={34} />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[0.82rem] text-ink-2">
                <span className="font-semibold text-ink">{e.designLabel}</span>
                <a href={pubmed(e.pmid)} target="_blank" rel="noreferrer" className="tnum font-semibold text-accent underline-offset-2 hover:underline">
                  PMID {e.pmid}
                </a>
              </p>
              <h4 className="mt-0.5 text-[1rem] font-semibold leading-snug text-ink">{e.title}</h4>
              <p className="mt-0.5 text-[0.84rem] text-ink-2">
                {e.firstAuthor} et al. {e.journal}. <span className="tnum">{e.year}</span>
              </p>
            </div>
          </div>
          {e.keySections.map((s, k) => (
            <p key={k} className="mt-3 max-w-[70ch] text-[0.95rem]">
              <strong className="font-semibold text-gold">{s.label || 'Texto'}.</strong> {s.text}
            </p>
          ))}
          {e.keySections.length === 0 && e.keySentences.length === 0 && <p className="mt-3 text-[0.92rem] text-ink-2">Sin secciones de resultados reconocibles en el abstract.</p>}
          {e.keySentences.length > 0 && (
            <ul className="mt-3 space-y-1.5 rounded-lg bg-panel px-4 py-3 text-[0.93rem] italic text-ink ring-1 ring-inset ring-line">
              {e.keySentences.map((k, j) => (
                <li key={j}>{k}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  )
}
