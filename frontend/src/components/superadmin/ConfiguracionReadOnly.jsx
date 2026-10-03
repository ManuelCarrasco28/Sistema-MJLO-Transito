import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { FloatingInput } from '../ui/FormInputs'
import { apiFetch } from '../../config/api'
import { showToast, showSuccess, showError, showConfirm } from '../../utils/SwalUtil'
import { BotonGuardar } from '../ui/ModalControls'
import { BotonAccion, BotonPrimario, CLASE_TABLA_ENCABEZADO } from '../ui/ToolbarButtons'

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
        showToast('Datos de la municipalidad guardados correctamente', 'editar')
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
        showToast('Año fiscal eliminado correctamente', 'eliminar')
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
        showToast(isEdit ? 'Año actualizado correctamente' : 'Año registrado correctamente', isEdit ? 'editar' : 'crear')
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

  const tituloSeccion = 'px-5 py-3 border-b border-slate-100 dark:border-[var(--border)] text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200'
  const tarjeta = 'rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden'

  return (
    <div className="space-y-4">
      <div className={`${tarjeta} flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between`}>
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
            <Icon name="deviceMobile" className="size-4.5" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Permiso general móvil</h3>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Permite a los inspectores aplicar papeletas desde la app móvil.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
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
            <span className="h-5 w-9 rounded-full bg-slate-300 transition-colors peer-checked:bg-violet-600 peer-disabled:opacity-60 dark:bg-slate-700"></span>
            <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4"></span>
          </label>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className={tarjeta}>
          <h3 className={tituloSeccion}>Datos institucionales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-4">
            <FloatingInput id="mun_ruc" label="RUC" value={formData.ruc} onChange={(e) => setFormData({...formData, ruc: e.target.value})} maxLength={11} required />
            <div className="sm:col-span-2">
              <FloatingInput id="mun_razon" label="Razón social" value={formData.razon_social} onChange={(e) => setFormData({...formData, razon_social: e.target.value})} required />
            </div>
            <FloatingInput id="mun_abrev" label="Nombre abreviado" value={formData.nombre_abreviado} onChange={(e) => setFormData({...formData, nombre_abreviado: e.target.value})} />
            <FloatingInput id="mun_sigla" label="Sigla oficial" value={formData.sigla} onChange={(e) => setFormData({...formData, sigla: e.target.value})} />
            <FloatingInput id="mun_logo" label="Logo (URL)" value={formData.logo} onChange={(e) => setFormData({...formData, logo: e.target.value})} />
          </div>
        </div>

        <div className={tarjeta}>
          <h3 className={tituloSeccion}>Contacto y ubicación</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 p-4">
            <div className="sm:col-span-2 lg:col-span-3">
              <FloatingInput id="mun_dir" label="Dirección fiscal" value={formData.direccion_fiscal} onChange={(e) => setFormData({...formData, direccion_fiscal: e.target.value})} required />
            </div>
            <FloatingInput id="mun_dep" label="Departamento" value={formData.departamento} onChange={(e) => setFormData({...formData, departamento: e.target.value})} />
            <FloatingInput id="mun_prov" label="Provincia" value={formData.provincia} onChange={(e) => setFormData({...formData, provincia: e.target.value})} />
            <FloatingInput id="mun_dist" label="Distrito" value={formData.distrito} onChange={(e) => setFormData({...formData, distrito: e.target.value})} />
            <FloatingInput id="mun_tel" label="Teléfono de contacto" value={formData.telefono} onChange={(e) => setFormData({...formData, telefono: e.target.value})} />
            <FloatingInput id="mun_email" label="Correo oficial" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            <FloatingInput id="mun_mesa" label="Mesa de partes" value={formData.mesa_partes} onChange={(e) => setFormData({...formData, mesa_partes: e.target.value})} />
          </div>
        </div>

        <div className="flex justify-end">
          <BotonGuardar disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar datos institucionales'}
          </BotonGuardar>
        </div>
      </form>

      <div className={tarjeta}>
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-5 py-3 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">Configuración UIT (años fiscales)</h3>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Valor de la UIT que se usa para calcular las papeletas de cada año.</p>
          </div>
          <BotonPrimario
            onClick={() => {
              setAnioForm({ id: '', anio: String(new Date().getFullYear()), nombre: '', uit: '', token: '' })
              setAnioModalOpen(true)
            }}
          >
            <span className="text-base leading-none font-black">+</span>
            <span>Nuevo año</span>
          </BotonPrimario>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className={CLASE_TABLA_ENCABEZADO}>
              <tr>
                <th className="px-4 py-3 text-center">Año</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3 text-center">Valor UIT</th>
                <th className="px-4 py-3 text-center">Token</th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
              {municipalidadAnios.length > 0 ? municipalidadAnios.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-[var(--bg-subtle)]">
                  <td className="px-4 py-3 text-center text-xs font-bold text-slate-800 dark:text-slate-200">{item.anio}</td>
                  <td className="px-4 py-3 text-xs font-medium text-slate-700 dark:text-slate-300">{item.nombre}</td>
                  <td className="px-4 py-3 text-center font-mono text-xs font-black text-slate-800 dark:text-white">
                    S/ {Number(item.uit || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {item.tokenConfigurado ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200/80 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400">Configurado</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-rose-200/80 bg-rose-50/70 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400">Falta token</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <BotonAccion
                        tipo="edit"
                        title="Editar año fiscal"
                        onClick={() => {
                          setAnioForm({ id: item.id, anio: item.anio, nombre: item.nombre, uit: item.uit, token: '' })
                          setAnioModalOpen(true)
                        }}
                      />
                      <BotonAccion tipo="del" title="Eliminar año fiscal" onClick={() => handleDeleteAnio(item)} />
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="p-12 text-center">
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
              <BotonGuardar>
                Guardar Año Fiscal
              </BotonGuardar>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}



