import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { PlacaBadge } from '../ui/PlacaBadge'
import { StandaloneVehiculoFormModal } from '../vehiculos/StandaloneVehiculoFormModal'
import { FloatingSelect } from '../ui/FormInputs'
import { BotonCancelar, BotonCerrarModal } from '../ui/ModalControls'

export function ConvertirReporteModal({
  reporteToConvert,
  onClose,
  onSubmit,
  vehiculos,
  convertForm,
  setConvertForm,
  tiposInfraccion,
  isProcessingAction,
  onVerImagen,
  onReloadVehiculos,
}) {
  const [showVehiculoModal, setShowVehiculoModal] = useState(false)
  const placaReporte = String(reporteToConvert?.placa || reporteToConvert?.placa_visual || '').toUpperCase()

  // Al registrar el vehículo que faltaba, la lista se recarga y se elige solo (sin pedir nada más).
  useEffect(() => {
    if (convertForm.vehiculoId || !placaReporte) return
    const registrado = vehiculos.find((v) => String(v.placa || '').toUpperCase() === placaReporte)
    if (registrado) setConvertForm((prev) => ({ ...prev, vehiculoId: String(registrado.id) }))
  }, [vehiculos, placaReporte, convertForm.vehiculoId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!reporteToConvert) return null

  return (
    <>
    <div className="fixed inset-0 z-[50] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <form onSubmit={onSubmit} className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438]">
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 bg-emerald-50 px-6 py-4 dark:border-[var(--border)] dark:bg-emerald-950/30">
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">Generar papeleta desde reporte</h3>
            <p className="text-xs font-bold text-slate-500">Revisa la evidencia y completa la infracción.</p>
          </div>
          <BotonCerrarModal onClick={onClose} title="Cerrar" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl bg-slate-50 p-5 text-sm border border-slate-200 dark:bg-[var(--bg-subtle)] dark:border-[var(--border)] shadow-sm transition hover:shadow-md">
              <div className="mb-3 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 border-b border-slate-200/50 pb-2 dark:border-slate-700/50">
                <Icon name="file-text" className="size-5" />
                <h4 className="font-black text-sm uppercase tracking-wider">Reporte N° {reporteToConvert.id}</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-slate-400 font-black text-[10px] tracking-wider uppercase block mb-1">Placa</span>
                  <PlacaBadge placa={reporteToConvert.placa_visual} size="lg" />
                </div>
                <p><span className="text-slate-400 font-black text-[10px] tracking-wider uppercase block mb-0.5">Lugar</span><span className="font-semibold text-slate-700 dark:text-slate-300 leading-snug">{reporteToConvert.lugar}</span></p>
                <p><span className="text-slate-400 font-black text-[10px] tracking-wider uppercase block mb-0.5">Observación del Inspector</span><span className="font-semibold text-rose-600 dark:text-rose-400 italic leading-snug">"{reporteToConvert.observaciones}"</span></p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5 text-sm border border-slate-200 dark:bg-[var(--bg-subtle)] dark:border-[var(--border)] shadow-sm transition hover:shadow-md">
              <div className="mb-3 flex items-center gap-2 text-sky-600 dark:text-sky-400 border-b border-slate-200/50 pb-2 dark:border-slate-700/50">
                <Icon name="info" className="size-5" />
                <h4 className="font-black text-sm uppercase tracking-wider">Datos del vehículo</h4>
              </div>
              <div className="space-y-3">
                <p><span className="text-slate-400 font-black text-[10px] tracking-wider uppercase block mb-0.5">Condición</span><span className={`font-black text-[11px] px-2 py-1 rounded tracking-wide ${reporteToConvert.tipoInfractor === 'FORMAL' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50' : 'bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50'}`}>{reporteToConvert.tipoInfractor}</span></p>
                {(reporteToConvert.vehiculo_marca || reporteToConvert.vehiculo_modelo || reporteToConvert.vehiculo_color) && (
                  <p><span className="text-slate-400 font-black text-[10px] tracking-wider uppercase block mb-0.5">Vehículo</span><span className="font-semibold text-slate-700 dark:text-slate-300">{[reporteToConvert.vehiculo_marca, reporteToConvert.vehiculo_modelo, reporteToConvert.vehiculo_color].filter(Boolean).join(' / ')}</span></p>
                )}
                {reporteToConvert.propietarioNombre && reporteToConvert.propietarioNombre !== 'No Registrado' && (
                  <p><span className="text-slate-400 font-black text-[10px] tracking-wider uppercase block mb-0.5">{reporteToConvert.tipoInfractor === 'FORMAL' ? 'Titular / Asociación' : 'Propietario'}</span><span className="font-semibold text-slate-700 dark:text-slate-300 leading-snug">{reporteToConvert.propietarioNombre} <br/><span className="text-xs text-slate-500 font-medium">DNI: {reporteToConvert.propietarioDni}</span></span></p>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 text-sm border border-slate-200 dark:bg-[var(--bg-subtle)] dark:border-[var(--border)] shadow-sm">
            <div className="mb-3 flex items-center gap-2 border-b border-slate-200/50 pb-2 text-rose-600 dark:border-slate-700/50 dark:text-rose-400">
              <Icon name="user" className="size-5" />
              <h4 className="font-black text-sm uppercase tracking-wider">Datos del infractor</h4>
            </div>
            {reporteToConvert.conductorNombre && reporteToConvert.conductorNombre !== 'No identificado' ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <p><span className="mb-0.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Nombre</span><span className="font-semibold leading-snug text-slate-700 dark:text-slate-300">{reporteToConvert.conductorNombre}</span></p>
                <p><span className="mb-0.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">DNI</span><span className="font-semibold text-slate-700 dark:text-slate-300">{reporteToConvert.conductorDni && reporteToConvert.conductorDni !== 'S/D' ? reporteToConvert.conductorDni : '—'}</span></p>
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-400">El inspector no identificó al infractor.</p>
            )}
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200 dark:bg-[var(--bg-subtle)] dark:border-[var(--border)] shadow-sm">
            {reporteToConvert.loadingFotos ? (
              <div className="flex items-center gap-3 text-slate-400 py-2">
                <div className="size-5 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600 dark:border-slate-700 dark:border-t-emerald-500"></div>
                <p className="text-xs font-black uppercase tracking-wider">Cargando fotos...</p>
              </div>
            ) : reporteToConvert.fotos && reporteToConvert.fotos.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Icon name="camera" className="size-4" />
                  <h4 className="font-black text-xs uppercase tracking-wider">Fotos del inspector ({reporteToConvert.fotos.length})</h4>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3 custom-scrollbar">
                  {reporteToConvert.fotos.map((foto) => (
                    <button type="button" key={foto.id} onClick={() => onVerImagen(foto.foto)} className="shrink-0 relative group block overflow-hidden rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-black/5 cursor-pointer">
                      <img src={foto.foto} alt="Evidencia" className="h-32 w-48 object-cover transition-transform duration-300 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center backdrop-blur-[0px] group-hover:backdrop-blur-[2px]">
                        <Icon name="maximize" className="text-white opacity-0 group-hover:opacity-100 drop-shadow-lg size-8 transition-opacity duration-300" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-slate-400 py-2">
                <Icon name="image-off" className="size-5" />
                <p className="text-xs font-black uppercase tracking-wider">No hay fotos adjuntas.</p>
              </div>
            )}
          </div>

        {!convertForm.vehiculoId && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
              El vehículo <b>{placaReporte || 'del reporte'}</b> aún no está registrado. Regístralo para poder generar la papeleta.
            </p>
            <button
              type="button"
              onClick={() => setShowVehiculoModal(true)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-emerald-500 cursor-pointer"
            >
              <span>+</span><span>Registrar vehículo</span>
            </button>
          </div>
        )}

          <fieldset className="min-w-0 border border-slate-200 rounded-xl p-4 dark:border-[var(--border)]">
            <legend className="text-[11px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 px-2 ml-2 bg-white dark:bg-[#1C2438]">Infracciones y Observaciones</legend>
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Infracciones</span>
                {convertForm.infraccionesIds.map((infId, idx) => (
                  <div key={idx} className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <FloatingSelect
                        id={`conv_inf_${idx}`}
                        label={convertForm.infraccionesIds.length > 1 ? `Infracción ${idx + 1}` : 'Infracción'}
                        value={infId}
                        multilineOptions
                        onChange={(e) => {
                          const newIds = [...convertForm.infraccionesIds]
                          newIds[idx] = e.target.value
                          setConvertForm({ ...convertForm, infraccionesIds: newIds })
                        }}
                        options={[
                          { value: '', label: 'Selecciona la infracción...' },
                          ...tiposInfraccion.map((tipo) => ({ value: String(tipo.id), label: `${tipo.codigo} — ${tipo.descripcion}` })),
                        ]}
                      />
                    </div>
                    {convertForm.infraccionesIds.length > 1 && (
                      <button type="button" onClick={() => {
                        const newIds = [...convertForm.infraccionesIds]
                        newIds.splice(idx, 1)
                        setConvertForm({ ...convertForm, infraccionesIds: newIds })
                      }} className="flex items-center justify-center rounded-xl bg-rose-100 px-3 py-2 text-rose-600 hover:bg-rose-200 font-bold transition dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setConvertForm({ ...convertForm, infraccionesIds: [...convertForm.infraccionesIds, ''] })} className="text-xs font-black text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 mt-2 block">
                  + Añadir otra infracción
                </button>
              </div>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Observaciones</span>
                <textarea value={convertForm.observacionesAutoridad} onChange={(e) => setConvertForm({ ...convertForm, observacionesAutoridad: e.target.value })} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-rose-500 focus:bg-white dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:bg-[var(--bg-subtle)]" />
              </label>
            </div>
          </fieldset>
        </div>
        <div className="shrink-0 flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-5 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
          <BotonCancelar onClick={onClose} />
          <button disabled={isProcessingAction} className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed">Generar papeleta</button>
        </div>
      </form>
    </div>

    {showVehiculoModal && (
      <StandaloneVehiculoFormModal 
        placaInicial={placaReporte}
        onClose={() => setShowVehiculoModal(false)}
        onSuccess={() => {
          if (onReloadVehiculos) onReloadVehiculos()
        }}
      />
    )}
    </>
  )
}
