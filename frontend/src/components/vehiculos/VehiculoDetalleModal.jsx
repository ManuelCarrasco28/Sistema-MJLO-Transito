import { QRCodeSVG } from 'qrcode.react'
import { Icon } from '../ui/Icon'
import { StatusBadge } from '../ui/StatusBadge'
import { PlacaBadge } from '../ui/PlacaBadge'
import { BotonCerrarModal } from '../ui/ModalControls'

const COLORES_ESTADO = {
  VIGENTE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  APROBADO: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  VENCIDO: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  DESAPROBADO: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  RECHAZADO: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  ANULADO: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  ANULADA: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  OBSERVADO: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  EN_TRAMITE: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
  SIN_REGISTRO: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
}

function InsigniaEstado({ estado }) {
  const clave = String(estado || 'SIN_REGISTRO').toUpperCase().replace(/\s+/g, '_')
  const clases = COLORES_ESTADO[clave] || COLORES_ESTADO.SIN_REGISTRO
  return (
    <span className={`rounded-full border px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wide ${clases}`}>
      {clave.replace(/_/g, ' ')}
    </span>
  )
}

export function VehiculoDetalleModal({
  selectedVehiculo,
  onClose,
  isVehiculoFormal,
  buildVehiculoQrValue,
  getVehiculoDocumento,
}) {
  if (!selectedVehiculo) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs animate-enter sm:p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">

        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="car" className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <PlacaBadge placa={selectedVehiculo.placa} size="sm" />
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                    isVehiculoFormal(selectedVehiculo)
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                  }`}
                >
                  {isVehiculoFormal(selectedVehiculo) ? 'FORMAL' : 'INFORMAL'}
                </span>
                <StatusBadge status={selectedVehiculo.estado || 'ACTIVO'} />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ficha Vehicular Municipal • {selectedVehiculo.marca || ''} {selectedVehiculo.modelo || ''}
              </p>
            </div>
          </div>

          <BotonCerrarModal onClick={onClose} title="Cerrar ficha" />
        </div>


        <div className="max-h-[calc(92vh-84px)] space-y-4 overflow-y-auto p-5">

          <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-[var(--border)] dark:bg-slate-950">
              <QRCodeSVG
                value={buildVehiculoQrValue(selectedVehiculo)}
                size={180}
                level="Q"
                marginSize={4}
                bgColor="#ffffff"
                fgColor="#000000"
                title={`Código QR del vehículo ${selectedVehiculo.placa}`}
              />
              <span className="mt-2 font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400">
                Escanea para identificar el vehículo
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-[var(--border)] dark:bg-slate-900/50">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className="inline-flex rounded-md bg-blue-100 px-2.5 py-1 text-xs font-extrabold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {selectedVehiculo.tipo}
                  </span>
                  <h4 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {selectedVehiculo.marca} {selectedVehiculo.modelo}
                  </h4>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-right dark:border-[var(--border)] dark:bg-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Código QR</p>
                  <p className="font-mono text-xs font-black text-slate-700 dark:text-slate-200">{selectedVehiculo.codigoQr || 'N/A'}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-[var(--border)] dark:bg-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Placa</p>
                  <div className="mt-1">
                    <PlacaBadge placa={selectedVehiculo.placa} size="lg" />
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-[var(--border)] dark:bg-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Color</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.color || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-[var(--border)] dark:bg-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Año fabricación</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.anio || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-[var(--border)] dark:bg-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Categoría</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.categoria || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-[var(--border)] dark:bg-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Carrocería</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.carroceria || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-[var(--border)] dark:bg-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sede de registro</p>
                  <p className="text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.sedeRegistro || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-[var(--border)] dark:bg-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipo de carrocería</p>
                  <p className="font-mono text-sm font-black text-slate-800 dark:text-slate-100">{selectedVehiculo.tipoCarroceria || 'N/A'}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-[var(--border)] dark:bg-slate-950">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Condición Legal</p>
                  <StatusBadge status={isVehiculoFormal(selectedVehiculo) ? 'FORMAL' : 'INFORMAL'} className="mt-1" />
                </div>
              </div>
            </div>
          </div>


          <div className="grid gap-3 text-xs lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-slate-950">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Propietario Registrado</p>
              <p className="mt-1 text-sm font-extrabold text-slate-800 dark:text-white">{selectedVehiculo.propietario}</p>
              <p className="text-slate-500 font-mono">DNI: {selectedVehiculo.propietarioTipoDocumento === 'DNI' ? selectedVehiculo.propietarioDni || 'N/A' : 'N/A'}</p>
              <p className="text-slate-500 font-mono">RUC: {selectedVehiculo.asociacionRuc || 'N/A'}</p>
              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-[var(--border)]">
                <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Asociación del vehículo</p>
                <p className="mt-1 font-bold text-slate-800 dark:text-cyan-300">{isVehiculoFormal(selectedVehiculo) ? selectedVehiculo.asociacion : 'Sin Asociación (Vehículo Informal)'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-slate-950">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Documentos del Vehículo</p>
              {[
                ['Tarjeta de propiedad', getVehiculoDocumento(selectedVehiculo, 'TARJETA_PROPIEDAD')],
                ['SOAT', getVehiculoDocumento(selectedVehiculo, 'SOAT')],
              ].map(([label, documento]) => (
                <div key={label} className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#1C2438]">
                  <span className="font-bold text-slate-600 dark:text-slate-300">{label}</span>
                  <span className="flex items-center gap-2 text-right font-mono font-black text-slate-800 dark:text-white">
                    {documento?.codigo || 'N/A'}
                    <InsigniaEstado estado={documento?.estado} />
                  </span>
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-cyan-50 px-3 py-2 dark:bg-cyan-950/30">
                <span className="font-bold text-slate-600 dark:text-slate-300">CERTICAV</span>
                <span className="flex items-center gap-2 text-right font-mono font-black text-slate-800 dark:text-white">
                  {selectedVehiculo.certicav?.numeroSerieCerticav || selectedVehiculo.certicav?.numeroRegistro || 'N/A'}
                  <InsigniaEstado estado={selectedVehiculo.certicav?.resultado || selectedVehiculo.certicav?.estado} />
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-slate-950">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Número de Serie (Chasis)</p>
              <p className="mt-1 font-mono font-bold text-slate-700 dark:text-slate-200">{selectedVehiculo.numeroSerie || 'N/A'}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-slate-950">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Serie del Motor</p>
              <p className="mt-1 font-mono font-bold text-slate-700 dark:text-slate-200">{selectedVehiculo.serieMotor || selectedVehiculo.numeroMotor || 'N/A'}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-slate-950 lg:col-span-2">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Historial de papeletas del vehículo</p>
              {(() => {
                const historial = selectedVehiculo.historialPapeletas || []
                const pendientes = historial.filter((p) => p.estado === 'PENDIENTE_PAGO')
                const pagadas = historial.filter((p) => p.estado === 'PAGADA')
                const anuladas = historial.filter((p) => p.estado === 'ANULADA')
                const deuda = pendientes.reduce((sum, p) => sum + Number(p.montoTotal || 0), 0)
                const pagado = pagadas.reduce((sum, p) => sum + Number(p.montoTotal || 0), 0)

                if (historial.length === 0) {
                  return (
                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500 dark:bg-[#1C2438] dark:text-slate-400">
                      Sin papeletas registradas.
                    </div>
                  )
                }

                return (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-2 sm:grid-cols-4">
                      <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#1C2438]">
                        <p className="text-[10px] font-black uppercase text-slate-400">Total</p>
                        <p className="font-mono text-base font-black text-slate-900 dark:text-white">{historial.length}</p>
                      </div>
                      <div className="rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
                        <p className="text-[10px] font-black uppercase text-amber-600 dark:text-amber-300">Debe</p>
                        <p className="font-mono text-base font-black text-amber-700 dark:text-amber-300">S/ {deuda.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 px-3 py-2 dark:bg-emerald-950/40">
                        <p className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-300">Pagado</p>
                        <p className="font-mono text-base font-black text-emerald-700 dark:text-emerald-300">S/ {pagado.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-[#1C2438]">
                        <p className="text-[10px] font-black uppercase text-slate-400">Anuladas</p>
                        <p className="font-mono text-base font-black text-slate-700 dark:text-slate-300">{anuladas.length}</p>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-[var(--border)]">
                      {historial.map((papeleta) => {
                        const pagada = papeleta.estado === 'PAGADA'
                        const anulada = papeleta.estado === 'ANULADA'
                        return (
                          <div key={papeleta.numeroPapeleta} className="grid gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-[var(--border)] sm:grid-cols-[140px_1fr_110px_120px] sm:items-center">
                            <div>
                              <p className="font-mono text-xs font-black text-rose-700 dark:text-rose-300">{papeleta.numeroPapeleta}</p>
                              <p className="text-[10px] font-bold text-slate-400">{papeleta.fechaHora ? new Date(papeleta.fechaHora).toLocaleDateString() : 'Sin fecha'}</p>
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-black text-slate-800 dark:text-slate-100">{papeleta.codigoInfraccion || 'SIN CODIGO'} · {papeleta.gravedad || 'SIN GRAVEDAD'}</p>
                              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400" title={papeleta.tipoInfraccion}>{papeleta.tipoInfraccion || papeleta.lugar || 'Infracción no especificada'}</p>
                            </div>
                            <p className="font-mono text-xs font-black text-slate-800 dark:text-slate-100">S/ {Number(papeleta.montoTotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                            <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${pagada ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : anulada ? 'bg-slate-200 text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'}`}>
                              <span className="size-1.5 rounded-full bg-current" />
                              {pagada ? 'PAGADA' : anulada ? 'ANULADA' : 'DEBE'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })()}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-slate-950 lg:col-span-2">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Historial de internamientos al depósito</p>
              {(() => {
                const internamientos = selectedVehiculo.historialInternamientos || []

                if (internamientos.length === 0) {
                  return (
                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500 dark:bg-[#1C2438] dark:text-slate-400">
                      Sin internamientos registrados.
                    </div>
                  )
                }

                return (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 dark:border-[var(--border)]">
                    {internamientos.map((int) => {
                      return (
                        <div key={int.numero_orden} className="grid gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-[var(--border)] sm:grid-cols-[140px_1fr_120px] sm:items-center">
                          <div>
                            <p className="font-mono text-xs font-black text-rose-700 dark:text-rose-300">{int.numero_orden}</p>
                            <p className="text-[10px] font-bold text-slate-400">{int.fecha_ingreso ? new Date(int.fecha_ingreso).toLocaleDateString() : 'Sin fecha'}</p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-100">{int.motivo || 'Sin motivo'}</p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{int.lugar_intervencion || 'Sin lugar'}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${
                              int.estado === 'LIBERADO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' :
                              'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-300'
                            }`}>
                              <span className="size-1.5 rounded-full bg-current" />
                              {int.estado}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-[var(--border)] dark:bg-slate-950 lg:col-span-2">
              <p className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Historial de propietarios</p>
              {(() => {
                const historial = selectedVehiculo.historialPropietarios || []

                if (historial.length === 0) {
                  return (
                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-sm font-bold text-slate-500 dark:bg-[#1C2438] dark:text-slate-400">
                      Sin historial de propietarios registrado.
                    </div>
                  )
                }

                return (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-100 dark:border-[var(--border)]">
                    {historial.map((prop, index) => {
                      const activo = prop.estado === 'ACTIVO' && !prop.fecha_fin
                      return (
                        <div key={`${prop.dni}-${prop.fecha_inicio}-${index}`} className="grid gap-2 border-b border-slate-100 px-3 py-2 last:border-b-0 dark:border-[var(--border)] sm:grid-cols-[1fr_170px_100px] sm:items-center">
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-100">{prop.nombre}</p>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 font-mono">DNI: {prop.dni || 'S/D'}</p>
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {prop.fecha_inicio ? new Date(prop.fecha_inicio).toLocaleDateString() : '—'}
                            {' → '}
                            {prop.fecha_fin ? new Date(prop.fecha_fin).toLocaleDateString() : 'Actualidad'}
                          </p>
                          <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${activo ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : 'bg-slate-200 text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300'}`}>
                            <span className="size-1.5 rounded-full bg-current" />
                            {activo ? 'PROPIETARIO ACTUAL' : 'ANTERIOR'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>


          <div className="flex justify-end border-t border-slate-100 pt-4 dark:border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-6 py-2.5 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ backgroundColor: 'oklch(71.2% 0.194 13.428)' }}
            >
              Cerrar Ficha
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
