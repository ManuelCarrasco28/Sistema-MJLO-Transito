import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../ui/Icon'
import { FloatingInput, FloatingSelect } from '../ui/FormInputs'

export function VehiculoFormModal({
  isEditing,
  formData,
  setFormData,
  onSubmit,
  onClose,
  propietarioSearch,
  setPropietarioSearch,
  showPropietarioResults,
  setShowPropietarioResults,
  propietarioResults,
  getPersonaNombre,
  selectPropietario,
  personas,
  asociacionSearch,
  setAsociacionSearch,
  showAsociacionResults,
  setShowAsociacionResults,
  asociacionResults,
  selectAsociacion,
  clearAsociacion,
  onBuscarSunarp,
  isBuscandoSunarp,
  titularDetectado,
  onOpenPersonaRapida,
}) {
  const propietarioRef = useRef(null)
  const asociacionRef = useRef(null)
  const modalBodyRef = useRef(null)
  const [propietarioDropdownPos, setPropietarioDropdownPos] = useState(null)
  const [asociacionDropdownPos, setAsociacionDropdownPos] = useState(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        propietarioRef.current && !propietarioRef.current.contains(e.target) &&
        !e.target.closest('[data-dropdown="propietario"]')
      ) {
        setShowPropietarioResults(false)
      }
      if (
        asociacionRef.current && !asociacionRef.current.contains(e.target) &&
        !e.target.closest('[data-dropdown="asociacion"]')
      ) {
        setShowAsociacionResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setShowPropietarioResults, setShowAsociacionResults])

  // El desplegable de resultados se renderiza vía portal (fuera del cuerpo
  // scrolleable del modal) para que no quede recortado por su overflow.
  // Recalculamos la posición al abrir y la cerramos si el usuario hace
  // scroll dentro del modal, para no arrastrar un desplegable desalineado.
  useEffect(() => {
    if (showPropietarioResults && propietarioRef.current) {
      const rect = propietarioRef.current.getBoundingClientRect()
      setPropietarioDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    } else {
      setPropietarioDropdownPos(null)
    }
  }, [showPropietarioResults])

  useEffect(() => {
    if (showAsociacionResults && asociacionRef.current) {
      const rect = asociacionRef.current.getBoundingClientRect()
      setAsociacionDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
    } else {
      setAsociacionDropdownPos(null)
    }
  }, [showAsociacionResults])

  useEffect(() => {
    const body = modalBodyRef.current
    if (!body) return
    const handleScroll = () => {
      setShowPropietarioResults(false)
      setShowAsociacionResults(false)
    }
    body.addEventListener('scroll', handleScroll)
    return () => body.removeEventListener('scroll', handleScroll)
  }, [setShowPropietarioResults, setShowAsociacionResults])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") onClose(); e.currentTarget.dataset.downOnOverlay = "" }}>
      <div className="relative flex max-h-[96vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-2.5 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2">
            <span className="grid size-7.5 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="vehicle" className="size-4" />
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Editar Vehículo' : 'Registrar Vehículo'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            <Icon name="close" className="size-5" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          autoComplete="off"
          onMouseDown={(event) => {
            if (!event.target.closest('[data-combobox="vehiculo"]')) {
              setShowPropietarioResults(false)
              setShowAsociacionResults(false)
            }
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div ref={modalBodyRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 sm:p-4">
            {/* 1. Identificación & Datos Técnicos de la Unidad */}
            <fieldset className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 sm:p-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
              <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-1 mb-1.5 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-slate-900 dark:bg-white" />
                Identificación & Datos Técnicos de la Unidad
              </legend>
              <div className="space-y-2">
                {/* Fila 1: Placa, Tipo, Marca */}
                <div className="grid gap-2 sm:grid-cols-12">
                  <div className="sm:col-span-4 flex items-end gap-1.5">
                    <div className="flex-1 min-w-0">
                      <FloatingInput
                        id="veh_placa"
                        label="Placa de Rodaje"
                        required
                        maxLength={6}
                        minLength={6}
                        pattern="[A-Z0-9]{6}"
                        title="La placa debe tener exactamente 6 caracteres (letras y números)."
                        value={formData.placa}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
                          setFormData({ ...formData, placa: val });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            onBuscarSunarp?.();
                          }
                        }}
                        inputClassName="font-black uppercase tracking-wider"
                      />
                    </div>
                    {onBuscarSunarp && (
                      <button
                        type="button"
                        onClick={onBuscarSunarp}
                        disabled={isBuscandoSunarp}
                        title="Consultar datos de la placa"
                        className="shrink-0 size-[42px] rounded-xl text-white flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                      >
                        {isBuscandoSunarp ? (
                          <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Icon name="search" className="size-4" />
                        )}
                      </button>
                    )}
                  </div>

                  <div className="sm:col-span-4">
                    <FloatingSelect
                      id="veh_tipo"
                      label="Tipo de Vehículo"
                      value={formData.tipo}
                      onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                      options={[
                        { value: '', label: 'Seleccionar tipo' },
                        { value: 'Mototaxi', label: 'Mototaxi' },
                        { value: 'Automóvil', label: 'Automóvil' },
                        { value: 'Camioneta Rural', label: 'Camioneta Rural' },
                        { value: 'Moto Lineal', label: 'Moto Lineal' },
                      ]}
                    />
                  </div>

                  <div className="sm:col-span-4">
                    <FloatingInput
                      id="veh_marca"
                      label="Marca"
                      value={formData.marca}
                      onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    />
                  </div>
                </div>

                {/* Fila 2: Modelo, Color, Año, Estado (si edita) */}
                <div className="grid gap-2 sm:grid-cols-12">
                  <div className={isEditing ? 'sm:col-span-4' : 'sm:col-span-4'}>
                    <FloatingInput
                      id="veh_modelo"
                      label="Modelo"
                      value={formData.modelo}
                      onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    />
                  </div>

                  <div className={isEditing ? 'sm:col-span-3' : 'sm:col-span-4'}>
                    <FloatingInput
                      id="veh_color"
                      label="Color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>

                  <div className={isEditing ? 'sm:col-span-2' : 'sm:col-span-4'}>
                    <FloatingInput
                      id="veh_anio"
                      type="number"
                      label="Año Fabricación"
                      min={1950}
                      max={new Date().getFullYear() + 1}
                      value={formData.anio || ''}
                      onChange={(e) => {
                        const val = e.target.value.slice(0, 4);
                        setFormData({ ...formData, anio: val });
                      }}
                    />
                  </div>

                  {isEditing && (
                    <div className="sm:col-span-3">
                      <FloatingSelect
                        id="veh_estado"
                        label="Estado"
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        options={[
                          { value: 'ACTIVO', label: 'ACTIVO' },
                          { value: 'INACTIVO', label: 'INACTIVO' }
                        ]}
                      />
                    </div>
                  )}
                </div>

                {/* Fila 3: Categoría, Carrocería, Tipo Carrocería, Sede */}
                <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                  <FloatingInput
                    id="veh_categoria"
                    label="Categoría"
                    value={formData.categoria || ''}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value.toUpperCase() })}
                    inputClassName="uppercase"
                  />

                  <FloatingInput
                    id="veh_carroceria"
                    label="Carrocería"
                    value={formData.carroceria || ''}
                    onChange={(e) => setFormData({ ...formData, carroceria: e.target.value.toUpperCase() })}
                    inputClassName="uppercase"
                  />

                  <FloatingInput
                    id="veh_tipo_carroceria"
                    label="Tipo Carrocería"
                    value={formData.tipoCarroceria || ''}
                    onChange={(e) => setFormData({ ...formData, tipoCarroceria: e.target.value.toUpperCase() })}
                    inputClassName="uppercase font-mono"
                  />

                  <FloatingInput
                    id="veh_sede"
                    label="Sede de Registro"
                    value={formData.sedeRegistro || ''}
                    onChange={(e) => setFormData({ ...formData, sedeRegistro: e.target.value.toUpperCase() })}
                    inputClassName="uppercase"
                  />
                </div>

                {/* Fila 4: Datos Técnicos (Número de Serie, Serie del Motor) */}
                <div className="grid gap-2 sm:grid-cols-2">
                  <FloatingInput
                    id="veh_serie"
                    label="Número de Serie (Chasis)"
                    maxLength={30}
                    value={formData.numeroSerie || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setFormData({ ...formData, numeroSerie: val });
                    }}
                    inputClassName="font-mono uppercase"
                  />

                  <FloatingInput
                    id="veh_motor"
                    label="Serie del Motor"
                    maxLength={30}
                    value={formData.serieMotor || ''}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                      setFormData({ ...formData, serieMotor: val });
                    }}
                    inputClassName="font-mono uppercase"
                  />
                </div>
              </div>
            </fieldset>

            {/* 2. Titular & Asociación Autorizada */}
            <fieldset className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-2.5 sm:p-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
              <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-1 mb-1.5 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-slate-900 dark:bg-white" />
                Titular & Asociación Autorizada
              </legend>

              {/* Banner solo si hay que registrar persona o aviso inline */}
              {titularDetectado && titularDetectado.nombre && (
                !titularDetectado.matchedPersona ? (
                  <div className="mb-2 rounded-xl border border-amber-300 bg-amber-50/90 dark:border-amber-900/60 dark:bg-amber-950/40 p-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-amber-500 text-white">
                        <Icon name="alert" className="size-3.5" />
                      </span>
                      <p className="text-xs text-amber-900 dark:text-amber-200 truncate">
                        Titular detectado: <strong>{titularDetectado.nombre}</strong> (No registrado en Personas)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenPersonaRapida?.(titularDetectado)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white hover:opacity-90 active:scale-95 transition-all shrink-0"
                      style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                    >
                      <Icon name="people" className="size-3.5" />
                      <span>+ Registrar Persona</span>
                    </button>
                  </div>
                ) : null
              )}

              <div className="grid gap-2 sm:grid-cols-2 items-start">
                <div className="relative" ref={propietarioRef}>
                  <FloatingInput
                    id="veh_propietario"
                    label="Propietario Legal"
                    required
                    value={propietarioSearch}
                    onFocus={() => {
                      setShowPropietarioResults(true)
                      setShowAsociacionResults(false)
                    }}
                    onChange={(e) => {
                      const value = e.target.value
                      setPropietarioSearch(value)
                      setFormData((prev) => ({
                        ...prev,
                        propietarioDni: '',
                        propietario: ''
                      }))
                      setShowPropietarioResults(true)
                      setShowAsociacionResults(false)
                    }}
                  />
                  {showPropietarioResults && propietarioDropdownPos && createPortal(
                    <div
                      data-dropdown="propietario"
                      style={{ position: 'fixed', top: propietarioDropdownPos.top, left: propietarioDropdownPos.left, width: propietarioDropdownPos.width }}
                      className="z-[100] max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)]"
                    >
                      {propietarioResults.length ? (
                        propietarioResults.map((persona) => {
                          const documento = persona.numeroDocumento || persona.numero || persona.dni || ''
                          const nombre = getPersonaNombre(persona)
                          return (
                            <button
                              key={persona.id || documento}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                selectPropietario(persona)
                              }}
                              className="flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-[var(--bg-subtle)] cursor-pointer transition-colors"
                            >
                              <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300">{documento}</span>
                              <span className="truncate text-xs font-bold text-slate-800 dark:text-white">{nombre || 'Sin nombre'}</span>
                            </button>
                          )
                        })
                      ) : (
                        <div className="px-2.5 py-2 text-xs font-semibold text-amber-600">
                          No se encontró persona con ese DNI o nombre.
                        </div>
                      )}
                    </div>,
                    document.body
                  )}
                  {formData.propietarioDni && (
                    <p className="px-2 pt-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                      Seleccionado: {formData.propietarioDni} — {formData.propietario}
                    </p>
                  )}
                </div>

                <div className="relative" ref={asociacionRef}>
                  <FloatingInput
                    id="veh_org"
                    label="Empresa o Asociación"
                    value={asociacionSearch}
                    onFocus={() => {
                      setShowAsociacionResults(true)
                      setShowPropietarioResults(false)
                    }}
                    onChange={(e) => {
                      const value = e.target.value
                      setAsociacionSearch(value)
                      setFormData((prev) => ({
                        ...prev,
                        asociacion: ''
                      }))
                      setShowAsociacionResults(true)
                      setShowPropietarioResults(false)
                    }}
                  />
                  {showAsociacionResults && asociacionDropdownPos && createPortal(
                    <div
                      data-dropdown="asociacion"
                      style={{ position: 'fixed', top: asociacionDropdownPos.top, left: asociacionDropdownPos.left, width: asociacionDropdownPos.width }}
                      className="z-[100] max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)]"
                    >
                      {asociacionResults.length ? (
                        asociacionResults.map((org) => (
                          <button
                            key={org.id || org.ruc || org.razonSocial}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault()
                              event.stopPropagation()
                              selectAsociacion(org)
                            }}
                            className="flex w-full flex-col rounded-lg px-2.5 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
                          >
                            <span className="truncate text-xs font-bold text-slate-800 dark:text-white">{org.razonSocial}</span>
                            <span className="font-mono text-[10px] font-black text-blue-700 dark:text-blue-300">RUC: {org.ruc || 'S/D'}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-2.5 py-2 text-xs font-semibold text-amber-600">
                          No se encontró asociación.
                        </div>
                      )}
                    </div>,
                    document.body
                  )}
                  {formData.asociacion && (
                    <div className="flex items-center justify-between gap-2 px-2 pt-0.5 text-[11px]">
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300 truncate">
                        {formData.asociacion}
                      </span>
                      <button type="button" onClick={clearAsociacion} className="font-bold text-rose-500 hover:text-rose-700 cursor-pointer shrink-0">
                        Quitar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </fieldset>
          </div>

          {/* Footer Modal */}
          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-2.5 dark:border-[var(--border)] dark:bg-slate-900/80">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-5 py-2 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ backgroundColor: 'oklch(71.2% 0.194 13.428)' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl px-6 py-2 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer"
              style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
            >
              {isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
