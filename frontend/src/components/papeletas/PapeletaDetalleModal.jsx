import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
        <div className="flex items-center justify-between border-b border-rose-600/20 bg-rose-50 p-5 dark:bg-rose-950/30">
          <div>
            <h3 className="text-xl font-black text-rose-700 dark:text-rose-400">{selectedPapeleta.numeroPapeleta}</h3>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-white cursor-pointer">✕</button>
        </div>
        <div className="p-6 overflow-y-auto max-h-[80vh]">

          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-[var(--border)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Identificación de la Falta</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Código</p>
                  <p className="font-extrabold text-slate-800 dark:text-white text-sm">{selectedPapeleta.tipoInfraccionCodigo || selectedPapeleta.detalles?.[0]?.codigo || 'G01'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Calificación</p>
                  <p className="font-extrabold text-slate-800 dark:text-white">{selectedPapeleta.tipoInfraccionGravedad || selectedPapeleta.detalles?.[0]?.gravedad || 'LEVE'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400">Descripción</p>
                  <p className="font-medium text-slate-700 dark:text-slate-300">{selectedPapeleta.tipoInfraccionDescripcion || selectedPapeleta.detalles?.[0]?.descripcion || 'Infracción al Reglamento'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-[var(--border)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Lugar y Fecha</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Fecha y Hora</p>
                  <p className="font-bold text-slate-800 dark:text-white">{new Date(selectedPapeleta.fechaHora).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-400">Ubicación</p>
                  <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.lugar}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400">Origen</p>
                  <div className="mt-1">{renderOrigen(selectedPapeleta)}</div>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400">Observaciones del Inspector</p>
                  <p className="font-medium text-rose-600 dark:text-rose-400 italic">"{selectedPapeleta.observacionesAutoridad || 'Sin observaciones por parte de la autoridad.'}"</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-[var(--border)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Intervinientes y Vehículo</h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400">Propietario</p>
                  <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.propietarioNombre || 'No Registrado'}</p>
                  <p className="font-mono text-[11px] text-slate-400">DNI/RUC: {selectedPapeleta.propietarioDni || 'S/D'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Infractor</p>
                  <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.conductorNombre || selectedPapeleta.infractor}</p>
                  <p className="font-mono text-[11px] text-slate-400">DNI: {selectedPapeleta.conductorDni || 'S/D'}</p>
                </div>
                <div>
                  <p className="text-slate-400">Vehículo</p>
                  <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.vehiculoPlaca}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{selectedPapeleta.vehiculoCaracteristicas}</p>
                </div>
                <div>
                  <p className="text-slate-400">Tipo Infractor</p>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${selectedPapeleta.tipoInfractor === 'FORMAL' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'}`}>
                    {selectedPapeleta.tipoInfractor || 'INFORMAL'}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400">Inspector</p>
                  <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.inspector} {selectedPapeleta.inspectorCIP ? `(CIP: ${selectedPapeleta.inspectorCIP})` : ''}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-[var(--border)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Estado Económico</h4>
              <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                <div>
                  <p className="text-slate-400">Monto Base</p>
                  <p className="font-bold text-slate-800 dark:text-white">S/ {parseFloat(selectedPapeleta.detalles?.[0]?.monto || selectedPapeleta.montoTotal).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Descuento</p>
                  <p className="font-bold text-emerald-600">S/ {parseFloat(selectedPapeleta.detalles?.[0]?.descuento || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-slate-400">Estado de Pago</p>
                  <StatusBadge status={selectedPapeleta.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : selectedPapeleta.estado} />
                </div>
                <div>
                  <p className="text-slate-400">Total</p>
                  <p className="font-mono font-black text-base text-rose-600 dark:text-rose-400">S/ {selectedPapeleta.montoTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-[var(--border)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Evidencia fotográfica</h4>
              <div className="text-xs">
                {loadingPapeletaFotos ? (
                  <div className="flex animate-pulse gap-4 overflow-x-auto pb-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-28 w-40 shrink-0 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    ))}
                  </div>
                ) : selectedPapeletaFotos.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-3 custom-scrollbar">
                    {selectedPapeletaFotos.map((foto) => (
                      <button type="button" key={foto.id} onClick={() => onVerImagen(foto.foto)} className="shrink-0 relative group block overflow-hidden rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-black/5 cursor-pointer">
                        <img src={foto.foto} alt="Evidencia" className="h-32 w-48 object-cover transition-transform duration-300 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center backdrop-blur-[0px] group-hover:backdrop-blur-[2px]">
                          <Icon name="maximize" className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg size-8 transition-opacity duration-300" />
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-100/50 py-8 text-center dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                    <Icon name="image-off" className="mx-auto mb-2 size-8 text-slate-400 opacity-50" />
                    <p className="font-bold text-slate-500">Sin evidencia fotográfica</p>
                    <p className="mt-1 text-[10px] text-slate-400">Esta papeleta no tiene fotos adjuntas</p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-[var(--border)]">
              <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-2">Firma del conductor</h4>
              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <p className="text-slate-400">Estado</p>
                  <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${selectedPapeleta.firmaConductorEstado === 'FIRMADO'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                      : selectedPapeleta.firmaConductorEstado === 'SE_NEGO_A_FIRMAR'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                        : selectedPapeleta.firmaConductorEstado === 'NO_PRESENTE'
                          ? 'bg-slate-200 text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300'
                    }`}>
                    <span className="size-2 rounded-full bg-current" />
                    {selectedPapeleta.firmaConductorEstado || 'PENDIENTE'}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400">Fecha y hora de firma</p>
                  <p className="font-bold text-slate-800 dark:text-white">
                    {selectedPapeleta.firmaConductorFecha
                      ? new Date(selectedPapeleta.firmaConductorFecha).toLocaleString()
                      : 'Sin fecha registrada'}
                  </p>
                </div>
                {selectedPapeleta.firmaConductorImg && (
                  <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-white p-3 dark:border-[var(--border)] dark:bg-slate-950">
                    <p className="mb-2 text-slate-400">Firma registrada</p>
                    <img
                      src={selectedPapeleta.firmaConductorImg}
                      alt="Firma del conductor"
                      className="max-h-24 rounded-lg object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 mt-2 border-t border-slate-100 dark:border-[var(--border)]">
            <button onClick={onImprimir} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white cursor-pointer hover:bg-slate-800 transition">Imprimir Boleta</button>
            <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition">Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
