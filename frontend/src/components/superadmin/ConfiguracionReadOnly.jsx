import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { FloatingInput } from '../ui/FormInputs'
import { apiFetch } from '../../config/api'
import { showSuccess, showError, showConfirm } from '../../utils/SwalUtil'

export function ConfiguracionReadOnly({
  municipalidad,
  municipalidadAnios,
  mobilePermitePapeleta,
  savingConfigSistema,
  onToggleMobilePermitePapeleta,
  loading,
  onReload
}) {
  const [formData, setFormData] = useState({
    ruc: '',
    razon_social: '',
    nombre_abreviado: '',
    sigla: '',
    direccion_fiscal: '',
    departamento: '',
    provincia: '',
    distrito: '',
    telefono: '',
    email: '',
    mesa_partes: '',
    logo: ''
  })

  useEffect(() => {
    if (municipalidad) {
      setFormData({
        ruc: municipalidad.ruc || '',
        razon_social: municipalidad.razon_social || '',
        nombre_abreviado: municipalidad.nombre_abreviado || '',
        sigla: municipalidad.sigla || '',
        direccion_fiscal: municipalidad.direccion_fiscal || '',
        departamento: municipalidad.departamento || '',
        provincia: municipalidad.provincia || '',
        distrito: municipalidad.distrito || '',
        telefono: municipalidad.telefono || '',
        email: municipalidad.email || '',
        mesa_partes: municipalidad.mesa_partes || '',
        logo: municipalidad.logo || ''
      })
    }
  }, [municipalidad])

  const [saving, setSaving] = useState(false)
  const [anioModalOpen, setAnioModalOpen] = useState(false)
  const [anioForm, setAnioForm] = useState({ id: '', anio: '', nombre: '', uit: '', token: '' })

  const handleSave = async (e) => {
    e.preventDefault()
    if (!municipalidad?.id) return
    setSaving(true)
    try {
      const res = await apiFetch(`/municipalidad/${municipalidad.id}`, {
        method: 'PUT',
        body: formData
      })
      if (res.ok) {
        showSuccess('Datos de la municipalidad guardados correctamente')
        onReload()
      } else {
        const error = await res.json()
        showError(error.message || 'Error al guardar los datos')
      }
    } catch (err) {
      showError('Error de red al guardar los datos')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAnio = async (item) => {
    const result = await showConfirm(
      '¿Eliminar año fiscal?',
      `Se eliminará "${item.nombre}" (${item.anio}) y su valor de UIT. Las papeletas ya emitidas no se ven afectadas.`,
      'Sí, eliminar',
      'Cancelar'
    )
    if (!result.isConfirmed) return

    try {
      const res = await apiFetch(`/municipalidad/anios/${item.id}`, { method: 'DELETE' })
      if (res.ok) {
        showSuccess('Año fiscal eliminado correctamente')
        onReload()
      } else {
        const error = await res.json().catch(() => ({}))
        showError(error.message || error.messages?.error || 'Error al eliminar el año')
      }
    } catch (err) {
      showError('Error de red al eliminar el año')
    }
  }

  const handleSaveAnio = async (e) => {
    e.preventDefault()
    if (!municipalidad?.id) return
    try {
      const isEdit = !!anioForm.id
      const url = '/municipalidad/anios'
      const method = 'POST'

      const payload = { ...anioForm, id_municipalidad: municipalidad.id }
      if (isEdit) delete payload.id

      const res = await apiFetch(url, {
        method,
        body: payload
      })
      if (res.ok) {
        showSuccess(isEdit ? 'Año actualizado correctamente' : 'Año registrado correctamente')
        setAnioModalOpen(false)
        onReload()
      } else {
        const error = await res.json()
        showError(error.message || 'Error al guardar año')
      }
    } catch (err) {
      showError('Error de red al guardar año')
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="rounded-3xl border border-violet-200/90 bg-gradient-to-r from-violet-50/90 via-purple-50/70 to-indigo-50/80 p-5 shadow-sm dark:border-[var(--border)] dark:bg-none dark:bg-[var(--bg-subtle)]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`grid size-12 shrink-0 place-items-center rounded-2xl text-white shadow-md transition-all ${
              mobilePermitePapeleta === null
                ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                : mobilePermitePapeleta
                  ? 'bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-500/25'
                  : 'bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25'
            }`}>
              <Icon name="deviceMobile" className="size-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Permiso general móvil
                </h3>
              </div>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
                Control general para permitir a los inspectores aplicar papeletas en la app móvil.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            <span className="text-xs font-extrabold text-slate-600 dark:text-slate-300">
              {mobilePermitePapeleta === null ? 'Cargando...' : savingConfigSistema ? 'Guardando...' : mobilePermitePapeleta ? 'Activo' : 'Inactivo'}
            </span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={mobilePermitePapeleta === true}
                disabled={savingConfigSistema || mobilePermitePapeleta === null}
                onChange={(e) => onToggleMobilePermitePapeleta && onToggleMobilePermitePapeleta(e.target.checked)}
                className="peer sr-only"
              />
              <span className="h-7 w-12 rounded-full bg-slate-300 transition-colors peer-checked:bg-violet-600 peer-disabled:opacity-60 dark:bg-slate-700"></span>
              <span className="absolute left-1 top-1 size-5 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-5"></span>
            </label>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]/50">
            <span className="grid size-8 place-items-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">
              <Icon name="building" className="size-4.5" />
            </span>
            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">
              Datos Institucionales
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            <FloatingInput id="mun_ruc" label="RUC" value={formData.ruc} onChange={(e) => setFormData({...formData, ruc: e.target.value})} maxLength={11} required />
            <div className="sm:col-span-2">
              <FloatingInput id="mun_razon" label="Razón Social" value={formData.razon_social} onChange={(e) => setFormData({...formData, razon_social: e.target.value})} required />
            </div>

            <FloatingInput id="mun_abrev" label="Nombre Abreviado" value={formData.nombre_abreviado} onChange={(e) => setFormData({...formData, nombre_abreviado: e.target.value})} />
            <FloatingInput id="mun_sigla" label="Sigla Oficial" value={formData.sigla} onChange={(e) => setFormData({...formData, sigla: e.target.value})} />
            <FloatingInput id="mun_logo" label="Logo URL" value={formData.logo} onChange={(e) => setFormData({...formData, logo: e.target.value})} />
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/50 px-5 py-4 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]/50"><span className="grid size-8 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400"><Icon name="mapPin" className="size-4.5" /></span><h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">
            Contacto y Ubicación
          </h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
            <div className="sm:col-span-3">
              <FloatingInput id="mun_dir" label="Dirección Fiscal" value={formData.direccion_fiscal} onChange={(e) => setFormData({...formData, direccion_fiscal: e.target.value})} required />
            </div>
            <FloatingInput id="mun_dep" label="Departamento" value={formData.departamento} onChange={(e) => setFormData({...formData, departamento: e.target.value})} />
            <FloatingInput id="mun_prov" label="Provincia" value={formData.provincia} onChange={(e) => setFormData({...formData, provincia: e.target.value})} />
            <FloatingInput id="mun_dist" label="Distrito" value={formData.distrito} onChange={(e) => setFormData({...formData, distrito: e.target.value})} />

            <FloatingInput id="mun_tel" label="Teléfono de Contacto" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
            <FloatingInput id="mun_email" label="Correo Oficial" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <FloatingInput id="mun_mesa" label="Mesa de Partes" value={formData.mesa_partes} onChange={(e) => setFormData({...formData, mesa_partes: e.target.value})} />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 px-6 py-2.5 text-sm font-bold text-white shadow-xs active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Icon name="save" className="size-4" />
            {saving ? 'Guardando...' : 'Guardar Datos Institucionales'}
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs dark:bg-[var(--bg-surface)] dark:border-[var(--border)] mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">Configuración UIT (Años Fiscales)</h3>
            <p className="text-xs font-semibold text-slate-500">Valores de la Unidad Impositiva Tributaria para el cálculo de papeletas.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setAnioForm({ id: '', anio: String(new Date().getFullYear()), nombre: '', uit: '', token: '' })
              setAnioModalOpen(true)
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3 py-2 text-xs font-black text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
          >
            <Icon name="add" className="size-4" />
            <span>Nuevo Año</span>
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-[var(--border)]">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5 text-center">Año</th>
                <th className="px-5 py-3.5">Nombre</th>
                <th className="px-5 py-3.5 text-center">Valor UIT</th>
                <th className="px-5 py-3.5 text-center">Token</th>
                <th className="px-5 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
              {municipalidadAnios.length > 0 ? municipalidadAnios.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[var(--bg-subtle)] transition-colors">
                  <td className="px-5 py-3.5 text-center font-bold text-slate-700 dark:text-slate-300">{item.anio}</td>
                  <td className="px-5 py-3.5 font-medium">{item.nombre}</td>
                  <td className="px-5 py-3.5 text-center font-mono font-black text-blue-600 dark:text-blue-400">
                    S/ {Number(item.uit || 0).toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {item.tokenConfigurado ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">✓ Configurado</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-900/50 dark:text-rose-300">✗ Falta token</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setAnioForm({ id: item.id, anio: item.anio, nombre: item.nombre, uit: item.uit, token: '' })
                          setAnioModalOpen(true)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 transition-colors cursor-pointer"
                      >
                        <Icon name="edit" className="size-3.5" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteAnio(item)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 transition-colors cursor-pointer"
                      >
                        <Icon name="trash" className="size-3.5" />
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="4" className="p-12 text-center">
                    <Icon name="receiptCheck" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No hay registros de UIT</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {anioModalOpen && (
        <Modal title={anioForm.id ? "Editar Año Fiscal" : "Nuevo Año Fiscal"} icon="receiptCheck" onClose={() => setAnioModalOpen(false)}>
          <form onSubmit={handleSaveAnio} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 mt-2">
              <FloatingInput id="anio_val" label="Año" required value={anioForm.anio} onChange={(e) => setAnioForm({...anioForm, anio: e.target.value})} />
              <FloatingInput id="anio_nombre" label="Denominación (Opcional)" value={anioForm.nombre} onChange={(e) => setAnioForm({...anioForm, nombre: e.target.value})} />
              <FloatingInput id="anio_uit" label="Valor UIT (S/)" required type="number" step="0.01" value={anioForm.uit} onChange={(e) => setAnioForm({...anioForm, uit: e.target.value})} inputClassName="font-mono font-bold text-blue-700 dark:text-blue-400" />
              <FloatingInput id="anio_token" label={anioForm.id ? 'Token API (dejar en blanco para no cambiarlo)' : 'Token API (MTC / PIDE)'} value={anioForm.token} onChange={(e) => setAnioForm({...anioForm, token: e.target.value})} />
              {anioForm.id && (
                <p className="text-xs font-semibold text-slate-400 -mt-2">
                  Por seguridad, el token guardado no se muestra aquí. Déjalo en blanco para conservar el actual, o escribe uno nuevo para reemplazarlo.
                </p>
              )}
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-black text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer"
              >
                Guardar Año Fiscal
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}



