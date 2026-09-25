import { Icon } from '../ui/Icon'
import { FloatingInput, FloatingSelect } from '../ui/FormInputs'

export function PersonaFormModal({
  isEditing,
  formData,
  setFormData,
  handlePhotoUpload,
  handleClearPhoto,
  tipoDocOptions,
  handleReniecSearch,
  estadoCivilOptions,
  estadoOptions,
  onSubmit,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
              <Icon name="people" className="size-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {isEditing ? 'Editar persona' : 'Nueva persona'}
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

        <form onSubmit={onSubmit} autoComplete="off" className="flex flex-col">
          <div className="p-4 sm:p-4.5 space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="w-full sm:w-[102px] shrink-0 rounded-2xl border border-slate-200/80 bg-slate-50/70 p-2.5 flex flex-col items-center justify-center gap-2 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] shadow-xs">
                {formData.fotoImg ? (
                  <img
                    src={formData.fotoImg}
                    alt="Vista previa"
                    onError={(e) => {
                      e.currentTarget.onerror = null
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.nombres || 'P')}+${encodeURIComponent(formData.apellidoPaterno || 'P')}&background=f1f5f9&color=475569&bold=true`
                    }}
                    className="w-[78px] h-[98px] rounded-xl object-cover border-2 border-slate-200 dark:border-[var(--border-strong)] shadow-xs bg-slate-100 dark:bg-[var(--bg-subtle)]"
                  />
                ) : (
                  <div className="w-[78px] h-[98px] rounded-xl font-bold flex flex-col items-center justify-center text-lg uppercase select-none border border-slate-200 bg-slate-800 text-white shrink-0 shadow-xs">
                    <span>{formData.nombres?.[0] || '?'}{formData.apellidoPaterno?.[0] || ''}</span>
                    <span className="text-[9px] text-slate-400 font-normal tracking-wide mt-0.5">Sin foto</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 w-full justify-center">
                  <label className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white dark:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200 shadow-xs hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer">
                    <Icon name="camera" className="size-3" />
                    <span>{formData.fotoImg ? 'Cambiar' : 'Subir'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </label>
                  {formData.fotoImg && (
                    <button
                      type="button"
                      onClick={handleClearPhoto}
                      title="Quitar foto"
                      className="rounded-lg border border-rose-200 bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-400 cursor-pointer"
                    >
                      <Icon name="trash" className="size-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative z-20 flex-1 min-w-0 space-y-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-600" />
                  Datos Personales
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <FloatingSelect
                      id="per_tipo_doc"
                      label="Tipo de documento"
                      value={formData.tipoDocumento}
                      onChange={(e) => setFormData({ ...formData, tipoDocumento: e.target.value })}
                      options={tipoDocOptions}
                    />
                  </div>
                  <div className="sm:col-span-7 flex gap-2 items-start">
                    <div className="flex-1">
                      <FloatingInput
                        id="per_num_doc"
                        label="Número de documento"
                        required
                        maxLength={(formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD') ? 8 : 15}
                        value={formData.numeroDocumento}
                        inputClassName="font-mono font-bold"
                        onChange={(e) => {
                          const val = e.target.value;
                          const isDni = formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD';
                          if (isDni && !/^\d*$/.test(val)) return;
                          setFormData({ ...formData, numeroDocumento: val })
                        }}
                      />
                    </div>
                    {(formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD') && (
                      <button
                        type="button"
                        onClick={handleReniecSearch}
                        title="Buscar DNI"
                        className="shrink-0 h-[46px] w-[46px] rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center hover:shadow-md hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-95 cursor-pointer mt-[2px]"
                      >
                        <Icon name="search" className="size-5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                  <div className="sm:col-span-2">
                    <FloatingInput
                      id="per_nombres"
                      label="Nombres"
                      required
                      value={formData.nombres}
                      onChange={(e) => setFormData({ ...formData, nombres: e.target.value })}
                    />
                  </div>
                  <FloatingInput
                    id="per_paterno"
                    label="Apellido paterno"
                    required
                    value={formData.apellidoPaterno}
                    onChange={(e) => setFormData({ ...formData, apellidoPaterno: e.target.value })}
                  />
                  <FloatingInput
                    id="per_materno"
                    label="Apellido materno"
                    required
                    value={formData.apellidoMaterno}
                    onChange={(e) => setFormData({ ...formData, apellidoMaterno: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="sm:col-span-1">
                    <FloatingSelect
                      id="per_estado_civil"
                      label="Estado civil"
                      value={formData.estadoCivil || ''}
                      onChange={(e) => setFormData({ ...formData, estadoCivil: e.target.value })} options={estadoCivilOptions}

                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-600" />
                Licencia y contacto
              </h4>

              <div className={`grid grid-cols-1 sm:grid-cols-2 ${isEditing ? 'md:grid-cols-4' : 'md:grid-cols-3'} gap-2.5`}>
                <FloatingInput
                  id="per_licencia"
                  label="Número de licencia"
                  required
                  maxLength={9}
                  value={formData.numeroLicencia}
                  inputClassName="font-mono font-bold uppercase"
                  onChange={(e) => setFormData({ ...formData, numeroLicencia: e.target.value.toUpperCase() })}
                />

                <FloatingInput
                  id="per_celular"
                  label="Celular"
                  required
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <FloatingInput
                  id="per_direccion"
                  label="Dirección"
                  required
                  maxLength={250}
                  value={formData.direccion || ''}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
                <FloatingInput
                  id="per_email"
                  label="Correo electrónico"
                  required
                  type="email"
                  maxLength={150}
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-[var(--border)] dark:bg-slate-900/80 rounded-b-3xl">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200 active:scale-95 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 px-5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
            >
              {isEditing ? 'Actualizar persona' : 'Guardar persona'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
