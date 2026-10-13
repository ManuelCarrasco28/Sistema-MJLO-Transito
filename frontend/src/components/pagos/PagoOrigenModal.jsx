import { BotonCerrarModal } from '../ui/ModalControls'
import { StatusBadge } from '../ui/StatusBadge'
import { ResolucionPermisoPrint } from '../documentos/TarjetaOperatividadPrint'

const CAMPOS = {
  CURSO: [['Código', 'codigo'], ['Curso', 'titulo'], ['Inicio', 'fecha'], ['Fin', 'fechaFin'], ['Horario', 'horario'], ['Lugar', 'lugar'], ['Instructor', 'instructor'], ['Cupos', 'cuposTotales'], ['Inscritos', 'cuposInscritos']],
  INTERNAMIENTO: [['N° boleta', 'numeroBoleta'], ['Placa', 'vehiculoPlaca'], ['Depósito', 'deposito'], ['Motivo', 'motivo'], ['Ingreso', 'fechaIngreso'], ['Salida', 'fechaSalida'], ['Conductor', 'conductorNombre'], ['Documento conductor', 'conductorDni'], ['Interesado', 'interesadoNombre'], ['Documento interesado', 'interesadoDni'], ['Autoridad', 'autoridadQueDispone'], ['Remisor', 'remisorNombre'], ['Orden de libertad', 'numeroOrdenLibertad']],
  TRAMITE: [['Expediente', 'expediente'], ['Procedimiento', 'procedimientoNombre'], ['Solicitante', 'solicitanteNombre'], ['Documento', 'solicitanteDocumento'], ['Placa', 'vehiculoPlaca'], ['Autorización', 'numeroAutorizacion'], ['Fecha solicitud', 'fechaSolicitud'], ['Vigencia hasta', 'fechaFinVigencia']],
}

export function PagoOrigenModal({ tipo, registro, onClose }) {
  const titulo = { CURSO: 'Vista del curso', INTERNAMIENTO: 'Vista del internamiento', TRAMITE: 'Vista del trámite' }[tipo]
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-label={titulo} className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-[#1C2438]">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700"><h2 className="text-lg font-bold text-slate-900 dark:text-white">{titulo}</h2><BotonCerrarModal onClick={onClose} title="Cerrar vista" /></header>
      <div className="min-h-0 overflow-y-auto p-5 space-y-5">
        {registro.estado && <StatusBadge status={registro.estado} />}
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{CAMPOS[tipo].map(([label, key]) => <div key={key} className="min-w-0 rounded-xl border border-slate-200 p-3 dark:border-slate-700"><dt className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-semibold text-slate-900 dark:text-white">{registro[key] ?? ''}</dd></div>)}</dl>
        {registro.observaciones && <div className="text-sm whitespace-pre-wrap text-slate-700 dark:text-slate-200"><h3 className="mb-2 font-bold">Observaciones</h3>{registro.observaciones}</div>}
        {tipo === 'CURSO' && <div><h3 className="mb-3 font-bold text-slate-900 dark:text-white">Participantes</h3><div className="divide-y divide-slate-200 dark:divide-slate-700">{(registro.participantes || []).map(p => <div key={p.uuid || p.idInscripcion} className="flex flex-wrap justify-between gap-2 py-3 text-sm text-slate-900 dark:text-white"><span>{[p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ')}<span className="ml-2 text-xs text-slate-500 dark:text-slate-400">DNI: {p.dni}</span></span><StatusBadge status={p.estado} /></div>)}</div></div>}
        {tipo === 'INTERNAMIENTO' && registro.inventario?.length > 0 && <div><h3 className="mb-2 font-bold dark:text-white">Inventario</h3>{registro.inventario.map((item, i) => <p key={item.id || i} className="py-1 text-sm dark:text-slate-200">{item.nombre || item.descripcion || item.elemento} {item.estado}</p>)}</div>}
        {tipo === 'TRAMITE' && registro.contenido && <div className="overflow-auto rounded-xl bg-white p-4 text-slate-900"><ResolucionPermisoPrint data={registro} /></div>}
      </div>
    </section>
  </div>
}
