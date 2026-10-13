import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { PlacaBadge } from '../ui/PlacaBadge'
import { StandaloneVehiculoFormModal } from '../vehiculos/StandaloneVehiculoFormModal'
import { FloatingSelect } from '../ui/FormInputs'
import { BotonCancelar, BotonCerrarModal } from '../ui/ModalControls'
import { apiFetch, resolverUrlArchivo } from '../../config/api'

export function ConvertirReporteModal({
  reporteToConvert,
  onClose,
  onSubmit,
  vehiculos = [],
  convertForm,
  setConvertForm,
  tiposInfraccion,
  isProcessingAction,
  onVerImagen,
  onReloadVehiculos,
}) {
  const [showVehiculoModal, setShowVehiculoModal] = useState(false)
  const [vehiculoSearch, setVehiculoSearch] = useState('')
  const [vehiculoResults, setVehiculoResults] = useState([])
  const [isSearchingVehiculos, setIsSearchingVehiculos] = useState(false)
  const [showVehiculoDropdown, setShowVehiculoDropdown] = useState(false)
  const [selectedVehiculoData, setSelectedVehiculoData] = useState(null)
  const [haCambiadoManualmente, setHaCambiadoManualmente] = useState(false)
  const [vehiculoOriginalReporte, setVehiculoOriginalReporte] = useState(null)
  const [vehiculosFallback, setVehiculosFallback] = useState([])

  const placaReporte = String(reporteToConvert?.placa || reporteToConvert?.placa_visual || '').toUpperCase()

  // Si cambia el reporte, reiniciar banderas de selección manual
  useEffect(() => {
    setHaCambiadoManualmente(false)
    setVehiculoOriginalReporte(null)
  }, [reporteToConvert?.id])

  // Guardar referencia al vehículo del reporte si está en la lista o se cargó
  useEffect(() => {
    if (vehiculoOriginalReporte || !placaReporte || placaReporte.startsWith('SIN-PLACA')) return
    const encontrado = (vehiculos || []).find((v) => String(v.placa || '').toUpperCase() === placaReporte)
    if (encontrado) {
      setVehiculoOriginalReporte(encontrado)
    }
  }, [vehiculos, placaReporte, vehiculoOriginalReporte])

  useEffect(() => {
    if (!vehiculoOriginalReporte && selectedVehiculoData && String(selectedVehiculoData.placa || '').toUpperCase() === placaReporte) {
      setVehiculoOriginalReporte(selectedVehiculoData)
    }
  }, [selectedVehiculoData, placaReporte, vehiculoOriginalReporte])

  const vehiculoReporteDisponible =
    vehiculoOriginalReporte ||
    (vehiculos || []).find((v) => String(v.placa || '').toUpperCase() === placaReporte)

  // Al abrir o si cambia la lista, buscar si el vehículo ya está registrado por placa (solo si no se desvinculó manualmente)
  useEffect(() => {
    if (haCambiadoManualmente || convertForm.vehiculoId || !placaReporte || placaReporte.startsWith('SIN-PLACA')) return
    const registrado = (vehiculos || []).find((v) => String(v.placa || '').toUpperCase() === placaReporte)
    if (registrado) {
      setConvertForm((prev) => ({ ...prev, vehiculoId: String(registrado.id) }))
      setSelectedVehiculoData(registrado)
      setVehiculoOriginalReporte(registrado)
    }
  }, [vehiculos, placaReporte, convertForm.vehiculoId, haCambiadoManualmente]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sincronizar datos completos del vehículo seleccionado si no están en la lista local
  useEffect(() => {
    if (!convertForm.vehiculoId) {
      setSelectedVehiculoData(null)
      return
    }
    const inList = (vehiculos || []).find((v) => String(v.id) === String(convertForm.vehiculoId))
    if (inList) {
      setSelectedVehiculoData(inList)
    } else {
      apiFetch(`/vehiculos/${convertForm.vehiculoId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          if (res?.data) {
            setSelectedVehiculoData(res.data)
          }
        })
        .catch(() => {})
    }
  }, [convertForm.vehiculoId, vehiculos])

  // Cargar lista alternativa si vehiculos llega vacío al abrir el selector
  useEffect(() => {
    if ((!vehiculos || vehiculos.length === 0) && showVehiculoDropdown && vehiculosFallback.length === 0) {
      apiFetch('/vehiculos?page=1&porPagina=20&ligero=1')
        .then((r) => (r.ok ? r.json() : null))
        .then((res) => {
          if (res?.data) setVehiculosFallback(res.data)
        })
        .catch(() => {})
    }
  }, [showVehiculoDropdown, vehiculos, vehiculosFallback.length])

  // Búsqueda en vivo de vehículos por placa o propietario
  useEffect(() => {
    const q = vehiculoSearch.trim()
    if (!q || q.length < 2) {
      setVehiculoResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearchingVehiculos(true)
      try {
        const res = await apiFetch(`/vehiculos?page=1&porPagina=15&ligero=1&buscar=${encodeURIComponent(q)}`)
        if (res.ok) {
          const data = await res.json()
          setVehiculoResults(data.data || [])
        }
      } catch {
        // ignore
      } finally {
        setIsSearchingVehiculos(false)
      }
    }, 250)
    return () => clearTimeout(timer)
  }, [vehiculoSearch])

  const listaBase = vehiculos && vehiculos.length > 0 ? vehiculos : vehiculosFallback
  const vehiculoActivo = selectedVehiculoData || listaBase.find((v) => String(v.id) === String(convertForm.vehiculoId))
  const vehiculosParaMostrar = vehiculoSearch.trim().length >= 2 ? vehiculoResults : (listaBase || []).slice(0, 15)

  const handleSelectVehiculo = (veh) => {
    setHaCambiadoManualmente(true)
    setConvertForm((prev) => ({ ...prev, vehiculoId: String(veh.id) }))
    setSelectedVehiculoData(veh)
    setShowVehiculoDropdown(false)
    setVehiculoSearch('')
    if (onReloadVehiculos) onReloadVehiculos(veh)
  }

  const handleCambiarVehiculo = () => {
    setHaCambiadoManualmente(true)
    setConvertForm((prev) => ({ ...prev, vehiculoId: '' }))
    setSelectedVehiculoData(null)
    setShowVehiculoDropdown(true)
    setVehiculoSearch('')
  }

  const handleRestaurarVehiculoReporte = () => {
    setHaCambiadoManualmente(false)
    if (vehiculoReporteDisponible) {
      setConvertForm((prev) => ({ ...prev, vehiculoId: String(vehiculoReporteDisponible.id) }))
      setSelectedVehiculoData(vehiculoReporteDisponible)
      setShowVehiculoDropdown(false)
      setVehiculoSearch('')
    }
  }

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
                  <p>
                    <span className="text-slate-400 font-black text-[10px] tracking-wider uppercase block mb-0.5">{reporteToConvert.tipoInfractor === 'FORMAL' ? 'Titular / Asociación' : 'Propietario'}</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 leading-snug">
                      {reporteToConvert.propietarioNombre}
                      {reporteToConvert.propietarioDni && reporteToConvert.propietarioDni.toUpperCase() !== 'S/D' && (
                        <>
                          <br/>
                          <span className="text-xs text-slate-500 font-medium">DNI: {reporteToConvert.propietarioDni}</span>
                        </>
                      )}
                    </span>
                  </p>
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
            {(reporteToConvert.observaciones_conductor || reporteToConvert.observacionesConductor) && (
              <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60">
                <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wider text-slate-400">Manifestación del conductor en campo</span>
                <p className="text-xs italic text-slate-700 dark:text-slate-300 font-medium">“{reporteToConvert.observaciones_conductor || reporteToConvert.observacionesConductor}”</p>
              </div>
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
                    <button type="button" key={foto.id} onClick={() => onVerImagen(resolverUrlArchivo(foto.foto))} className="shrink-0 relative group block overflow-hidden rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 bg-black/5 cursor-pointer">
                      <img src={resolverUrlArchivo(foto.foto)} alt="Evidencia" className="h-32 w-48 object-cover transition-transform duration-300 group-hover:scale-105" />
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

        {/* SECCIÓN VEHÍCULO VINCULADO / SELECCIONADO */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-slate-200/50 pb-2 dark:border-slate-700/50">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Icon name="truck" className="size-5" />
              <h4 className="font-black text-sm uppercase tracking-wider">Vehículo para la papeleta</h4>
            </div>
            <div className="flex items-center gap-3">
              {vehiculoReporteDisponible && String(convertForm.vehiculoId) !== String(vehiculoReporteDisponible.id) && (
                <button
                  type="button"
                  onClick={handleRestaurarVehiculoReporte}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 underline cursor-pointer flex items-center gap-1"
                  title="Volver al vehículo detectado en el reporte"
                >
                  <Icon name="rotate-ccw" className="size-3" />
                  <span>Volver a {placaReporte}</span>
                </button>
              )}
              {convertForm.vehiculoId && (
                <button
                  type="button"
                  onClick={handleCambiarVehiculo}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300 underline cursor-pointer"
                >
                  Cambiar vehículo
                </button>
              )}
            </div>
          </div>

          {convertForm.vehiculoId && vehiculoActivo ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30">
              <div className="flex items-center gap-4">
                <PlacaBadge placa={vehiculoActivo.placa} size="lg" />
                <div className="space-y-0.5">
                  <p className="font-black text-sm text-slate-800 dark:text-slate-100">
                    {[vehiculoActivo.marca, vehiculoActivo.modelo, vehiculoActivo.color].filter(Boolean).join(' · ') || 'Vehículo registrado'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Propietario: <span className="font-semibold text-slate-700 dark:text-slate-300">{vehiculoActivo.propietario || 'No especificado'}</span>
                    {vehiculoActivo.propietarioDni ? ` (DNI: ${vehiculoActivo.propietarioDni})` : ''}
                  </p>
                  {vehiculoActivo.asociacion && (
                    <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {vehiculoActivo.asociacion}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/10 px-3 py-1 text-xs font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                  <Icon name="check-circle" className="size-3.5" /> Vinculado a la papeleta
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-200">
                    {haCambiadoManualmente && vehiculoReporteDisponible ? (
                      <>Has desvinculado el vehículo reportado (<b>{placaReporte}</b>).</>
                    ) : placaReporte && !placaReporte.startsWith('SIN-PLACA') ? (
                      <>El vehículo <b>{placaReporte}</b> aún no está registrado en el sistema.</>
                    ) : (
                      <>El reporte no tiene un vehículo identificado o registrado.</>
                    )}
                  </p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-300">
                    {haCambiadoManualmente && vehiculoReporteDisponible
                      ? 'Elige otro vehículo de la lista, busca por placa / propietario o vuelve al reportado.'
                      : 'Elige un vehículo registrado de la lista o registra uno nuevo para continuar.'}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {haCambiadoManualmente && vehiculoReporteDisponible && (
                    <button
                      type="button"
                      onClick={handleRestaurarVehiculoReporte}
                      className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-sky-500 cursor-pointer shadow-sm"
                    >
                      <Icon name="rotate-ccw" className="size-3.5" />
                      <span>Volver a {placaReporte}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowVehiculoModal(true)}
                    className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-emerald-500 cursor-pointer shadow-sm"
                  >
                    <span>+</span><span>Registrar vehículo</span>
                  </button>
                </div>
              </div>

              {/* Buscador / Selector de vehículo registrado */}
              <div className="relative">
                <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Elegir vehículo registrado
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Buscar por placa, propietario o marca..."
                      value={vehiculoSearch}
                      onChange={(e) => {
                        setVehiculoSearch(e.target.value)
                        setShowVehiculoDropdown(true)
                      }}
                      onFocus={() => setShowVehiculoDropdown(true)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold placeholder-slate-400 outline-none focus:border-emerald-500 dark:border-[var(--border-strong)] dark:bg-[var(--bg-card)] dark:text-white"
                    />
                    {isSearchingVehiculos && (
                      <div className="absolute right-3 top-2.5 size-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-600" />
                    )}
                  </div>
                  {vehiculoSearch && (
                    <button
                      type="button"
                      onClick={() => { setVehiculoSearch(''); setShowVehiculoDropdown(true); }}
                      className="rounded-lg bg-slate-200 px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 cursor-pointer"
                      title="Limpiar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowVehiculoDropdown((prev) => !prev)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-slate-500 hover:bg-slate-100 dark:border-[var(--border-strong)] dark:bg-[var(--bg-card)] dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                    title={showVehiculoDropdown ? 'Ocultar sugerencias' : 'Ver sugerencias'}
                  >
                    <Icon name={showVehiculoDropdown ? 'chevron-up' : 'chevron-down'} className="size-4" />
                  </button>
                </div>

                {/* Dropdown de lista de vehículos */}
                {showVehiculoDropdown && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[var(--border-strong)] dark:bg-[#1E293B]">
                    {vehiculosParaMostrar.length > 0 ? (
                      vehiculosParaMostrar.map((v) => (
                        <button
                          type="button"
                          key={v.id}
                          onClick={() => handleSelectVehiculo(v)}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            <PlacaBadge placa={v.placa} size="sm" />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">
                                {[v.marca, v.modelo].filter(Boolean).join(' ') || 'Vehículo'}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                {v.propietario ? `Prop: ${v.propietario}` : (v.asociacion || 'Sin propietario')}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400">
                            Elegir →
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="py-3 text-center text-xs text-slate-400">
                        {isSearchingVehiculos ? 'Buscando vehículos...' : 'No se encontraron vehículos. Usa "+ Registrar vehículo" para darlo de alta.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

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
                          ...tiposInfraccion.map((tipo) => ({ value: String(tipo.id), label: `${tipo.codigo} — ${tipo.descripcion || ''} · S/ ${Number(tipo.montoBase || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` })),
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

                <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-[var(--border-strong)] dark:bg-[var(--bg-card)]">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Costo Estimado Total</span>
                  <span className="text-base font-black text-rose-600 dark:text-rose-400">
                    S/ {convertForm.infraccionesIds.reduce((sum, id) => {
                      if (!id) return sum
                      const tipo = tiposInfraccion.find((t) => String(t.id) === String(id))
                      return sum + (tipo ? Number(tipo.montoBase || 0) : 0)
                    }, 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Observaciones de la autoridad</span>
                <textarea value={convertForm.observacionesAutoridad || ''} onChange={(e) => setConvertForm({ ...convertForm, observacionesAutoridad: e.target.value })} rows={2} placeholder="Observaciones ingresadas por la autoridad o inspector..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-rose-500 focus:bg-white dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:bg-[var(--bg-subtle)]" />
              </label>

              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">Observaciones del conductor (Opcional)</span>
                <textarea value={convertForm.observacionesConductor || ''} onChange={(e) => setConvertForm({ ...convertForm, observacionesConductor: e.target.value })} rows={2} placeholder="Manifestación, descargo o comentarios expresados por el conductor..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold outline-none focus:border-rose-500 focus:bg-white dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:bg-[var(--bg-subtle)]" />
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
        placaInicial={placaReporte.startsWith('SIN-PLACA') ? '' : placaReporte}
        onClose={() => setShowVehiculoModal(false)}
        onSuccess={(nuevoVehiculo) => {
          if (nuevoVehiculo && nuevoVehiculo.id) {
            setHaCambiadoManualmente(true)
            setConvertForm((prev) => ({ ...prev, vehiculoId: String(nuevoVehiculo.id) }))
            setSelectedVehiculoData(nuevoVehiculo)
            setShowVehiculoDropdown(false)
          }
          if (onReloadVehiculos) onReloadVehiculos(nuevoVehiculo)
        }}
      />
    )}
    </>
  )
}
