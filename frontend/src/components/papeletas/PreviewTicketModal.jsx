import { PapeletaOficialPrint } from './PapeletaOficialPrint'

// Compatibilidad con llamadas anteriores: la impresión vigente es la papeleta A4.
export function PreviewTicketModal({ selectedPapeleta, onClose }) {
  return <PapeletaOficialPrint papeleta={selectedPapeleta} onClose={onClose} />
}
