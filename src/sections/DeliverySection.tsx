import { Check, ClipboardCopy, Download, Printer } from 'lucide-react'
import { CLINICAL_DISCLAIMER } from '../shared/export-markdown.ts'
import { Button, Notice, Section } from '../components/ui.tsx'

interface Props {
  html: string
  missingReasons: number
  copied: boolean
  onCopy: () => void
  onDownload: () => void
}

export function DeliverySection({ html, missingReasons, copied, onCopy, onDownload }: Props) {
  return (
    <Section n={6} printable title="Entrega" hint="Ficha PICO, registro de búsqueda, artículos con su motivo y síntesis: lista para pegar en Moodle o imprimir.">
      <div className="no-print mb-4 flex flex-wrap gap-2.5">
        <Button variant="primary" onClick={onCopy} className="w-full sm:w-auto">
          {copied ? <Check size={18} aria-hidden /> : <ClipboardCopy size={18} aria-hidden />} {copied ? 'Copiado' : 'Copiar entrega'}
        </Button>
        <Button onClick={onDownload}>
          <Download size={17} aria-hidden /> Descargar .md
        </Button>
        <Button onClick={() => window.print()}>
          <Printer size={17} aria-hidden /> Imprimir o guardar PDF
        </Button>
      </div>
      {missingReasons > 0 && (
        <div className="no-print mb-4">
          <Notice tone="gold">Faltan los motivos de selección de {missingReasons} artículo(s). Tu docente los pide en el registro de búsqueda.</Notice>
        </div>
      )}
      <div className="inset p-2.5 sm:p-5">
        <article id="print-doc" className="paper mx-auto max-w-[52rem] p-5 sm:p-9" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
      <p className="no-print mt-4 max-w-[72ch] text-[0.84rem] text-ink-2">{CLINICAL_DISCLAIMER}</p>
    </Section>
  )
}
