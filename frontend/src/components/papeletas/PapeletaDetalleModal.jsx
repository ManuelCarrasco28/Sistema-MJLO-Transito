import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { PlacaBadge } from '../ui/PlacaBadge'
import { BotonCancelar, BotonCerrarModal } from '../ui/ModalControls'
import { resolverUrlArchivo } from '../../config/api'

const dinero = (valor) => (parseFloat(valor) || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Seccion({ titulo, children, className = '' }) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-[var(--border)] dark:bg-slate-900/40 ${className}`}>
      <h4 className="mb-3 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
        <span className="size-1.5 rounded-full bg-rose-500" />
        {titulo}
      </h4>
      {children}
    </section>
  )
}

function Dato({ etiqueta, children, className = '' }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-400">{etiqueta}</p>
      <div className="mt-0.5 break-words text-sm font-bold leading-snug text-slate-800 dark:text-white">{children}</div>
    </div>
  )
}

export function PapeletaDetalleModal({
  selectedPapeleta,
  onClose,
  onImprimir,
  renderOrigen,
  loadingPapeletaFotos,
  selectedPapeletaFotos,
  onVerImagen,
}) {
  if (!selectedPapeleta) return null

  const detallesList = selectedPapeleta.detalles?.length > 0
    ? selectedPapeleta.detalles
    : [
        {
          codigo: selectedPapeleta.tipoInfraccionCodigo || 'G01',
          gravedad: selectedPapeleta.tipoInfraccionGravedad || 'LEVE',
          descripcion: selectedPapeleta.tipoInfraccionDescripcion || 'Infracción al Reglamento Nacional de Tránsito',
          monto: selectedPapeleta.montoTotal,
          descuento: 0,
        },
      ]

  const montoBaseTotal = selectedPapeleta.detalles?.length > 0
    ? selectedPapeleta.detalles.reduce((acc, d) => acc + (parseFloat(d.monto) || 0), 0)
    : (parseFloat(selectedPapeleta.montoTotal) || 0)

  const descuentoTotal = selectedPapeleta.detalles?.length > 0
    ? selectedPapeleta.detalles.reduce((acc, d) => acc + (parseFloat(d.descuento) || 0), 0)
    : 0

  const estadoPago = selectedPapeleta.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : selectedPapeleta.estado
  const firmaEstado = selectedPapeleta.firmaConductorEstado || 'PENDIENTE'
  const claseFirma = firmaEstado === 'FIRMADO'
    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
    : firmaEstado === 'SE_NEGO_A_FIRMAR'
      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
      : firmaEstado === 'NO_PRESENTE'
        ? 'bg-slate-200 text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300'
        : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs animate-enter sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
        {/* Cabecera: número, estado de pago y total siempre a la vista */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-rose-600/20 bg-rose-50 px-5 py-3.5 dark:bg-rose-950/30">
          <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
            <h3 className="text-xl font-black text-rose-700 dark:text-rose-400">{selectedPapeleta.numeroPapeleta}</h3>
            <StatusBadge status={estadoPago} />
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Total a pagar</p>
              <p className="font-mono text-lg font-black leading-none text-rose-600 dark:text-rose-400">S/ {dinero(selectedPapeleta.montoTotal)}</p>
            </div>
            <BotonCerrarModal onClick={onClose} title="Cerrar" />
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {/* Infracciones */}
          <Seccion titulo={detallesList.length > 1 ? `Infracciones imputadas (${detallesList.length})` : 'Identificación de la falta'}>
            <div className="grid gap-2.5 md:grid-cols-2">
              {detallesList.map((det, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                  <div className="mb-2 flex items-center justify-between gap-2 border-b border-slate-100 pb-2 dark:border-[var(--border)]">
                    <div className="flex items-center gap-2">
                      <span className="rounded-lg border border-rose-200/60 bg-rose-50 px-2 py-0.5 font-mono text-sm font-black text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/60 dark:text-rose-400">
                        {det.codigo || 'SIN CÓDIGO'}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
                        (det.gravedad || '').includes('MUY')
                          ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                          : (det.gravedad || '').includes('GRAVE')
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                      }`}>
                        {det.gravedad || 'LEVE'}
                      </span>
                    </div>
                    <span className="font-mono text-sm font-black text-slate-800 dark:text-white">S/ {dinero(det.monto)}</span>
                  </div>
                  <p className="text-[13px] font-medium leading-relaxed text-slate-700 dark:text-slate-300">
                    {det.descripcion || 'Sin descripción registrada'}
                  </p>
                </div>
              ))}
            </div>
            {descuentoTotal > 0 && (
              <p className="mt-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                Monto base S/ {dinero(montoBaseTotal)} · Descuento <span className="text-emerald-600 dark:text-emerald-400">− S/ {dinero(descuentoTotal)}</span>
              </p>
            )}
          </Seccion>

          <div className="grid items-start gap-4 lg:grid-cols-2">
            {/* Columna izquierda */}
            <div className="space-y-4">
              <Seccion titulo="Lugar y fecha">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Dato etiqueta="Fecha y hora">{new Date(selectedPapeleta.fechaHora).toLocaleString('es-PE')}</Dato>
                  <Dato etiqueta="Origen"><div className="mt-0.5 font-normal">{renderOrigen(selectedPapeleta)}</div></Dato>
                  <Dato etiqueta="Ubicación" className="col-span-2">{selectedPapeleta.lugar || '—'}</Dato>
                  <Dato etiqueta="Observaciones del inspector" className="col-span-2">
                    <span className="font-medium italic text-slate-600 dark:text-slate-300">
                      {selectedPapeleta.observacionesAutoridad ? `“${selectedPapeleta.observacionesAutoridad}”` : 'Sin observaciones por parte de la autoridad.'}
                    </span>
                  </Dato>
                  <Dato etiqueta="Observaciones del conductor" className="col-span-2">
                    <span className="font-medium italic text-slate-600 dark:text-slate-300">
                      {selectedPapeleta.observacionesConductor ? `“${selectedPapeleta.observacionesConductor}”` : 'Sin observaciones registradas por el conductor.'}
                    </span>
                  </Dato>
                </div>
              </Seccion>

              <Seccion titulo="Firma del conductor">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Dato etiqueta="Estado">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${claseFirma}`}>
                      <span className="size-2 rounded-full bg-current" />
                      {firmaEstado.replaceAll('_', ' ')}
                    </span>
                  </Dato>
                  <Dato etiqueta="Fecha y hora de firma">
                    {selectedPapeleta.firmaConductorFecha ? new Date(selectedPapeleta.firmaConductorFecha).toLocaleString('es-PE') : 'Sin fecha registrada'}
                  </Dato>
                  {selectedPapeleta.firmaConductorImg && (
                    <div className="col-span-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-[var(--border)] dark:bg-slate-950">
                      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Firma registrada</p>
                      <img src={selectedPapeleta.firmaConductorImg} alt="Firma del conductor" className="max-h-24 rounded-lg object-contain" />
                    </div>
                  )}
                </div>
              </Seccion>
            </div>

            {/* Columna derecha */}
            <Seccion titulo="Intervinientes y vehículo">
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Dato etiqueta="Propietario">
                  {selectedPapeleta.propietarioNombre || 'No registrado'}
                  <span className="block font-mono text-[11px] font-normal text-slate-400">DNI/RUC: {selectedPapeleta.propietarioDni || 'S/D'}</span>
                </Dato>
                <Dato etiqueta="Infractor">
                  {selectedPapeleta.conductorNombre || selectedPapeleta.infractor}
                  <span className="block font-mono text-[11px] font-normal text-slate-400">DNI: {selectedPapeleta.conductorDni || 'S/D'}</span>
                </Dato>
                <Dato etiqueta="Vehículo">
                  <PlacaBadge placa={selectedPapeleta.vehiculoPlaca} />
                  <span className="mt-1 block text-[11px] font-normal text-slate-500 dark:text-slate-400">{selectedPapeleta.vehiculoCaracteristicas}</span>
                </Dato>
                <Dato etiqueta="Tipo de infractor">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${selectedPapeleta.tipoInfractor === 'FORMAL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'}`}>
                    {selectedPapeleta.tipoInfractor || 'INFORMAL'}
                  </span>
                </Dato>
                <Dato etiqueta="Inspector" className="col-span-2">
                  {selectedPapeleta.inspector}
                  {selectedPapeleta.inspectorDocumento ? <span className="font-mono text-[11px] font-normal text-slate-400"> · Doc. {selectedPapeleta.inspectorDocumento}</span> : null}
                </Dato>
              </div>
            </Seccion>
          </div>

          {/* Evidencia */}
          <Seccion titulo="Evidencia fotográfica">
            <div className="text-xs">
              {loadingPapeletaFotos ? (
                <div className="flex animate-pulse gap-4 overflow-x-auto pb-2">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-28 w-40 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />
                  ))}
                </div>
              ) : selectedPapeletaFotos.length > 0 ? (
                <div className="custom-scrollbar flex gap-3 overflow-x-auto pb-2">
                  {selectedPapeletaFotos.map((foto) => (
                    <button type="button" key={foto.id} onClick={() => onVerImagen(resolverUrlArchivo(foto.foto))} className="group relative block shrink-0 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-black/5 shadow-sm dark:border-slate-700">
                      <img src={resolverUrlArchivo(foto.foto)} alt="Evidencia" className="h-36 w-52 object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                        <Icon name="maximize" className="size-7 text-white opacity-0 drop-shadow-lg transition-opacity duration-300 group-hover:opacity-100" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-100/50 py-6 text-center dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                  <Icon name="image-off" className="mx-auto mb-1.5 size-7 text-slate-400 opacity-50" />
                  <p className="font-bold text-slate-500">Sin evidencia fotográfica</p>
                  <p className="mt-0.5 text-[10px] text-slate-400">Esta papeleta no tiene fotos adjuntas</p>
                </div>
              )}
            </div>
          </Seccion>
        </div>

        {/* Acciones siempre visibles */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-3 dark:border-[var(--border)]">
          <button onClick={onImprimir} className="cursor-pointer rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800">Imprimir Boleta</button>
          <BotonCancelar onClick={onClose}>Cerrar</BotonCancelar>
        </div>
      </div>
    </div>
  )
}
