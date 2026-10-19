import { Icon } from '../ui/Icon'
import { FloatingInput, FloatingSelect, FloatingTextarea } from '../ui/FormInputs'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../ui/ModalControls'
import { abrirConsultaLicenciaMtc } from '../../utils/consultaLicenciaMtc'

export function PersonaFormModal({
  isEditing,
  formData,
  setFormData,
  fieldErrors = {},
  onClearFieldError,
  handlePhotoUpload,
  handleClearPhoto,
  tipoDocOptions,
  handleReniecSearch,
  isSearchingReniec = false,
  handleUsarFotoReniec,
  isFetchingFotoReniec = false,
  estadoCivilOptions,
  estadoOptions,
  onSubmit,
  onClose,
}) {
  const isDni = formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD'
  const dniValido = isDni && /^\d{8}$/.test(formData.numeroDocumento || '')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") onClose(); e.currentTarget.dataset.downOnOverlay = "" }}>
      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="people" className="size-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Editar persona' : 'Nueva persona'}
            </h3>
          </div>
          <BotonCerrarModal onClick={onClose} title="Cerrar" />
        </div>

        <form onSubmit={onSubmit} autoComplete="off" className="flex flex-col">
          <div className="p-4 sm:p-4.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="w-full sm:w-[172px] shrink-0 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 flex flex-col items-center justify-center gap-2 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] shadow-xs">
                <div className="relative shrink-0">
                {formData.fotoImg ? (
                  <img
                    src={formData.fotoImg}
                    alt="Vista previa"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nombres || 'P')}+${encodeURIComponent(formData.apellidoPaterno || 'P')}&background=f1f5f9&color=475569&bold=true`
                    }}
                    className="w-[140px] h-[196px] rounded-xl object-cover border-2 border-slate-200 dark:border-[var(--border-strong)] shadow-xs bg-slate-100 dark:bg-[var(--bg-subtle)]"
                  />
                ) : (
                  <div className="w-[140px] h-[196px] rounded-xl font-bold flex flex-col items-center justify-center text-lg uppercase select-none border border-slate-200 bg-slate-800 text-white shrink-0 shadow-xs">
                    <span>{formData.nombres?.[0] || '?'}{formData.apellidoPaterno?.[0] || ''}</span>
                    <span className="text-[9px] text-slate-400 font-normal tracking-wide mt-0.5">Sin foto</span>
                  </div>
                )}
                  {formData.fotoImg && (
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      title="Quitar foto"
                      aria-label="Quitar foto"
                      className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-lg bg-rose-600 text-white shadow-sm hover:bg-rose-700 cursor-pointer"
                    >
                      <Icon name="trash" className="size-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 w-full justify-center">
                  <label title="Seleccionar foto" className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white dark:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                    <Icon name="camera" className="size-3.5 shrink-0" />
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="Seleccionar foto"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                {handleUsarFotoReniec && dniValido && (
                  <button
                    type="button"
                    onClick={handleUsarFotoReniec}
                    disabled={isFetchingFotoReniec}
                    title="Cargar la foto registrada para este documento (solo si la persona no trae foto propia)"
                    aria-label="Cargar foto del documento"
                    className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white dark:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] text-slate-600 dark:text-slate-300 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                  >
                    {isFetchingFotoReniec ? (
                      <span className="size-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                    ) : (
                      <Icon name="image" className="size-4" />
                    )}
                  </button>
                )}
                </div>
              </div>

              <div className="flex-1 min-w-0 space-y-2.5">
              <div className="relative z-20 min-w-0 space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                  Datos Personales
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4">
                    <FloatingSelect
                      id="per_tipo_doc"
                      label="Tipo de documento"
                      value={formData.tipoDocumento}
                      onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                      options={tipoDocOptions}
                    />
                  </div>
                  <div className="sm:col-span-5 flex items-start gap-1.5">
                    <div className="flex-1 min-w-0">
                      <FloatingInput
                        id="per_num_doc"
                        label="Número de documento"
                        required
                        maxLength={(formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD') ? 8 : 15}
                        minLength={(formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD') ? 8 : undefined}
                        pattern={(formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD') ? '\\d{8}' : undefined}
                        title={(formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD') ? 'El DNI debe tener exactamente 8 dígitos.' : undefined}
                        value={formData.numeroDocumento}
                        error={fieldErrors.numeroDocumento}
                        inputClassName="font-mono font-bold"
                        onChange={(e) => {
                          const val = e.target.value;
                          const isDni = formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD';
                          if (isDni && !/^\d*$/.test(val)) return;
                          setFormData({ ...formData, numeroDocumento: val })
                          onClearFieldError?.('numeroDocumento')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleReniecSearch?.();
                          }
                        }}
                      />
                    </div>
                    {(formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD') && (
                      <button
                        type="button"
                        onClick={handleReniecSearch}
                        disabled={isSearchingReniec}
                        title="Consultar número de documento"
                        className="shrink-0 h-[42px] px-3 gap-1.5 rounded-xl text-xs font-bold text-white flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                        style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                      >
                        {isSearchingReniec ? (
                          <span className="size-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Icon name="search" className="size-4" />
                        )}
                        <span>{isSearchingReniec ? 'Buscando…' : 'Buscar'}</span>
                      </button>
                    )}
                  </div>
                  <div className="sm:col-span-3">
                    <FloatingSelect
                      id="per_estado_civil"
                      hideEmptyOption
                      label="Estado civil"
                      value={formData.estadoCivil || ''}
                      onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })}
                      options={estadoCivilOptions}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-6">
                    <FloatingInput
                      id="per_nombres"
                      label="Nombres"
                      required
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <FloatingInput
                      id="per_paterno"
                      label="Apellido paterno"
                      required
                      value={formData.apellidoPaterno}
                      onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <FloatingInput
                      id="per_materno"
                      label="Apellido materno"
                      required
                      value={formData.apellidoMaterno}
                      onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-3">
                    <FloatingSelect
                      id="per_sexo"
                      hideEmptyOption
                      label="Sexo"
                      value={formData.sexo || ''}
                      onChange={(e) => setFormData({ ...formData, sexo: e.target.value })}
                      options={[{ value: '', label: '' }, { value: 'M', label: 'Masculino' }, { value: 'F', label: 'Femenino' }]}
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <FloatingInput
                      id="per_nacimiento"
                      label="Fecha de nacimiento"
                      type="date"
                      optional
                      max={new Date().toISOString().slice(0, 10)}
                      value={formData.fechaNacimiento || ''}
                      onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-10 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                  Licencia y contacto
                </h4>

                <div className={`grid grid-cols-1 sm:grid-cols-2 ${isEditing ? 'lg:grid-cols-3' : ''} gap-3`}>
                  <div className="col-span-full grid min-w-0 grid-cols-1 items-start gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                    <div className="min-w-0 flex-1">
                      <FloatingInput
                        id="per_licencia"
                        label="Número de licencia"
                        optional
                        maxLength={11}
                        value={formData.numeroLicencia}
                        error={fieldErrors.numeroLicencia}
                        inputClassName="font-mono font-bold uppercase"
                        onChange={(e) => { setFormData({ ...formData, numeroLicencia: e.target.value.toUpperCase() }); onClearFieldError?.('numeroLicencia') }}
                      />
                    </div>
                    <button
                      type="button"
                      title="Consultar licencia en el portal del MTC"
                      aria-label="Validar licencia en MTC (abre una ventana nueva)"
                      onClick={() => abrirConsultaLicenciaMtc()}
                      className="inline-flex !h-[42px] !min-h-0 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl border border-[#595959] bg-[#595959] px-4 !py-0 !text-xs !font-semibold !leading-none text-white transition-colors hover:border-[#e30613] hover:bg-[#e30613] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e30613]"
                    >
                      <img src="/img/mtc-logo.png" alt="" aria-hidden="true" className="size-7 shrink-0 rounded-md object-contain" />
                      <span>Validar en MTC</span>
                    </button>
                  </div>

                  <FloatingInput
                    id="per_celular"
                    label="Celular"
                    optional
                    type="tel"
                    maxLength={9}
                    value={formData.celular}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!/^\d*$/.test(val)) return;
                      setFormData({ ...formData, celular: val });
                    }}
                  />

                  <FloatingInput
                    id="per_telefono"
                    label="Teléfono fijo"
                    optional
                    type="tel"
                    maxLength={15}
                    value={formData.telefono || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!/^[0-9\- ]*$/.test(val)) return;
                      setFormData({ ...formData, telefono: val });
                    }}
                  />

                  {isEditing && (
                    <FloatingSelect
                      id="per_estado"
                      label="Estado del registro"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                      options={estadoOptions}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
                  <div className="sm:col-span-7">
                    <FloatingTextarea
                      id="per_direccion"
                      label="Dirección"
                      required
                      maxLength={250}
                      value={formData.direccion || ''}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    />
                  </div>
                  <div className="sm:col-span-5">
                    <FloatingInput
                      id="per_email"
                      label="Correo electrónico"
                      optional
                      type="email"
                      maxLength={150}
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-[var(--border)] dark:bg-slate-900/80 rounded-b-3xl">
            <BotonCancelar onClick={onClose} />
            <BotonGuardar>
              {isEditing ? 'Actualizar persona' : 'Guardar persona'}
            </BotonGuardar>
          </div>
        </form>
      </div>
    </div>
  )
}
