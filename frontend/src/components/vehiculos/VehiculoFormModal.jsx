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
  handleSunarpSearch,
  isSearchingSunarp,
  propietariosEncontrados = [],
  selectedOwnerIndex = 0,
  onSelectOwner,
  onOpenPersonaRapida,
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-enter">
      <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
        <div className="relative w-full max-w-5xl rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
          <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
            <div className="flex items-center gap-2.5">
              <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                <Icon name="vehicle" className="size-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
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
            className="space-y-2.5 p-4 sm:p-5"
          >

            <fieldset className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
              <legend className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 px-1 mb-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-blue-600" />
                Identificación de la Unidad
              </legend>
              <div className="space-y-2.5">
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 min-w-0">
                      <FloatingInput
                        id="veh_placa"
                        label="Placa de Rodaje"
                        required
                        maxLength={15}
                        value={formData.placa}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          if (/[^A-Z0-9-]/.test(val)) return;
                          setFormData({ ...formData, placa: val });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSunarpSearch?.();
                          }
                        }}
                        inputClassName="font-black uppercase tracking-wider"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSunarpSearch}
                      disabled={isSearchingSunarp}
                      title="Consultar datos de la placa"
                      className="shrink-0 h-[46px] w-[46px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center hover:shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 cursor-pointer mt-[2px] disabled:opacity-60 disabled:cursor-not-allowed shadow-xs"
                    >
                      {isSearchingSunarp ? (
                        <span className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Icon name="search" className="size-5" />
                      )}
                    </button>
                  </div>

                  <FloatingSelect
                    id="veh_tipo"
                    label="Tipo de Vehículo"
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    options={[
                      { value: '', label: 'Seleccionar...' },
                      { value: 'Mototaxi', label: 'Mototaxi' },
                      { value: 'Automóvil', label: 'Automóvil' },
                      { value: 'Camioneta Rural', label: 'Camioneta Rural' },
                      { value: 'Moto Lineal', label: 'Moto Lineal' },
                    ]}
                  />

                  <FloatingInput
                    id="veh_marca"
                    label="Marca"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  />
                </div>

                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  <FloatingInput
                    id="veh_modelo"
                    label="Modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                  />

                  <FloatingInput
                    id="veh_color"
                    label="Color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />

                  <FloatingInput
                    id="veh_anio"
                    type="number"
                    label="Año de Fabricación"
                    value={formData.anio}
                    onChange={(e) => setFormData({ ...formData, anio: e.target.value })}
                  />
                </div>

                <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-2 lg:grid-cols-4">
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
              </div>
            </fieldset>


            <fieldset className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
              <legend className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 px-1 mb-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-cyan-500" />
                Datos Técnicos y Registro
              </legend>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                <FloatingInput
                  id="veh_serie"
                  label="Número de Serie (VIN)"
                  value={formData.numeroSerie}
                  onChange={(e) => setFormData({ ...formData, numeroSerie: e.target.value.toUpperCase() })}
                  inputClassName="font-mono"
                />

                <FloatingInput
                  id="veh_motor"
                  label="Serie del Motor"
                  value={formData.serieMotor}
                  onChange={(e) => setFormData({ ...formData, serieMotor: e.target.value.toUpperCase() })}
                  inputClassName="font-mono"
                />

                <FloatingInput
                  id="veh_partida"
                  label="Partida Registral"
                  value={formData.partidaRegistral}
                  onChange={(e) => setFormData({ ...formData, partidaRegistral: e.target.value })}
                  inputClassName="font-mono"
                />
              </div>
            </fieldset>


            <fieldset className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
              <legend className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 px-1 mb-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500" />
                Titular & Asociación Autorizada
              </legend>

              {/* Selector de Titulares encontrados en el registro oficial */}
              {propietariosEncontrados && propietariosEncontrados.length > 0 && (
                <div className="mb-3 rounded-2xl border border-blue-200/90 bg-gradient-to-br from-blue-50/80 via-indigo-50/40 to-slate-50/70 p-3 dark:border-blue-900/40 dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-slate-900/40 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="grid size-5.5 place-items-center rounded-lg bg-blue-600 text-white">
                        <Icon name="people" className="size-3.5" />
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        Titulares detectados en el registro vehicular ({propietariosEncontrados.length})
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      Selecciona quién figurará como titular ante la municipalidad:
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {propietariosEncontrados.map((prop, idx) => {
                      const isSelected = selectedOwnerIndex === idx
                      const isRegistrado = Boolean(prop.matchedPersona)
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onSelectOwner?.(idx)}
                          className={`group relative flex items-start gap-2.5 rounded-xl p-2.5 text-left border transition-all cursor-pointer text-xs ${
                            isSelected
                              ? 'border-blue-500 bg-white shadow-sm ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-slate-800'
                              : 'border-slate-200/80 bg-white/70 hover:bg-white hover:border-slate-300 dark:border-slate-700/80 dark:bg-slate-900/60 dark:hover:bg-slate-800'
                          }`}
                        >
                          <span
                            className={`mt-1 size-2.5 rounded-full shrink-0 ${
                              isRegistrado ? 'bg-emerald-500 shadow-xs' : 'bg-amber-400'
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-extrabold text-slate-900 dark:text-white uppercase tracking-tight text-[11.5px] truncate">
                                {prop.nombre}
                              </span>
                              {prop.esPrimero ? (
                                <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  Titular actual
                                </span>
                              ) : (
                                <span className="rounded-md bg-indigo-100 px-1.5 py-0.5 text-[9px] font-black uppercase text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                                  Cónyuge / Copropietario
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {isRegistrado ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                                  ✓ Registrado en padrón (DNI: {prop.matchedPersona.numeroDocumento})
                                </span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-400 font-semibold">
                                  ⚠ No figura en el padrón local
                                </span>
                              )}
                            </p>
                          </div>
                          {isSelected && (
                            <span className="text-blue-600 dark:text-blue-400 shrink-0">
                              <Icon name="check" className="size-4" />
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {propietariosEncontrados[selectedOwnerIndex] && !propietariosEncontrados[selectedOwnerIndex].matchedPersona && (
                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200/90 bg-amber-50/90 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
                      <div className="flex items-center gap-2">
                        <Icon name="alert" className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                        <span>
                          <strong>{propietariosEncontrados[selectedOwnerIndex].nombre}</strong> no está en Personas.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onOpenPersonaRapida?.(propietariosEncontrados[selectedOwnerIndex].nombre)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1.5 text-xs font-black text-white hover:from-blue-700 hover:to-indigo-700 shadow-xs cursor-pointer active:scale-95 transition-all"
                      >
                        <Icon name="people" className="size-3.5" />
                        <span>+ Registrar Persona</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="grid gap-2.5 lg:grid-cols-2 items-start">
                <div className="relative" data-combobox="vehiculo">
                  <div className="flex items-center justify-between pb-1 px-0.5">
                    <label htmlFor="veh_propietario" className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                      Propietario en Padrón <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => onOpenPersonaRapida?.('')}
                      className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline cursor-pointer"
                    >
                      <Icon name="people" className="size-3.5" />
                      <span>+ Registrar Persona</span>
                    </button>
                  </div>

                  <FloatingInput
                    id="veh_propietario"
                    label="Buscar por DNI o Nombre"
                    required
                    value={propietarioSearch}
                    onFocus={() => setShowPropietarioResults(true)}
                    onChange={(e) => {
                      const value = e.target.value
                      setPropietarioSearch(value)
                      setFormData({
                        ...formData,
                        propietarioDni: '',
                        propietario: ''
                      })
                      setShowPropietarioResults(true)
                    }}
                  />
                  {showPropietarioResults && (
                    <div className="absolute left-0 right-0 bottom-[calc(100%+0.35rem)] z-50 max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)]">
                      {propietarioResults.length ? (
                        propietarioResults.map((persona) => {
                          const documento = persona.numeroDocumento || ''
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
                              className="flex w-full flex-col rounded-xl px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
                            >
                              <span className="font-mono text-xs font-black text-blue-700 dark:text-blue-300">{documento}</span>
                              <span className="truncate text-xs font-bold text-slate-800 dark:text-white">{nombre || 'Sin nombre'}</span>
                            </button>
                          )
                        })
                      ) : (
                        <div className="px-3 py-2 text-xs font-semibold text-amber-600 flex items-center justify-between gap-2">
                          <span>No se encontró a esa persona en el padrón.</span>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              onOpenPersonaRapida?.(propietarioSearch)
                            }}
                            className="px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10.5px] cursor-pointer shrink-0"
                          >
                            + Registrarla
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  {formData.propietarioDni && (
                    <p className="px-3 pt-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      Seleccionado: {formData.propietarioDni} — {formData.propietario}
                    </p>
                  )}
                  {!personas.length && (
                    <p className="px-3 pt-1 text-xs font-semibold text-amber-600">
                      No hay personas cargadas. Registra primero al propietario en el padrón.
                    </p>
                  )}
                </div>

                <div className="relative" data-combobox="vehiculo">
                  <FloatingInput
                    id="veh_org"
                    label="Empresa o Asociación"
                    value={asociacionSearch}
                    onFocus={() => setShowAsociacionResults(true)}
                    onChange={(e) => {
                      const value = e.target.value
                      setAsociacionSearch(value)
                      setFormData({
                        ...formData,
                        asociacion: ''
                      })
                      setShowAsociacionResults(true)
                    }}
                  />
                  {showAsociacionResults && (
                    <div className="absolute left-0 right-0 bottom-[calc(100%+0.35rem)] z-50 max-h-44 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)]">
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
                            className="flex w-full flex-col rounded-xl px-3 py-1.5 text-left hover:bg-blue-50 dark:hover:bg-[var(--bg-subtle)] cursor-pointer"
                          >
                            <span className="truncate text-xs font-bold text-slate-800 dark:text-white">{org.razonSocial}</span>
                            <span className="font-mono text-[10px] font-black text-blue-700 dark:text-blue-300">RUC: {org.ruc || 'S/D'}</span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2.5 text-xs font-semibold text-amber-600">
                          No se encontró asociación. Si el vehículo no pertenece a una asociación, déjalo vacío.
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-2 px-3 pt-1 text-xs">
                    {formData.asociacion ? (
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                        Formal: {formData.asociacion}
                      </span>
                    ) : (
                      <span className="font-semibold text-amber-600">
                        Sin asociación: vehículo informal
                      </span>
                    )}
                    {formData.asociacion && (
                      <button type="button" onClick={clearAsociacion} className="font-bold text-rose-500 hover:text-rose-700 cursor-pointer">
                        Quitar asociación
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </fieldset>


            {isEditing && (
              <fieldset className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                <legend className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 px-1 mb-2 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Estado del Vehículo
                </legend>
                <div className="grid gap-2.5 sm:grid-cols-1">
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
              </fieldset>
            )}


            <div className="mt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-3 dark:border-[var(--border)]">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-[var(--border-strong)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="rounded-xl bg-linear-to-r from-blue-600 to-cyan-600 px-6 py-2 text-xs font-black text-white hover:from-blue-700 hover:to-cyan-700 shadow-md shadow-blue-600/25 transition-all cursor-pointer"
              >
                {isEditing ? 'Guardar Cambios' : 'Registrar Vehículo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
