import { useState } from 'react'
import { apiFetch, leerMensajeError } from '../../config/api'
import { FloatingInput } from '../ui/FormInputs'
import { BotonCancelar } from '../ui/ModalControls'

export function EditarPapeletaModal({ papeleta, onClose, onSaved }) {
  const [form, setForm] = useState({ lugar: papeleta.lugar || '', observacionesAutoridad: papeleta.observacionesAutoridad || '', observacionesConductor: papeleta.observacionesConductor || '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await apiFetch(`/papeletas/${papeleta.uuid || papeleta.id}`, { method: 'PUT', body: form })
      if (!response.ok) throw new Error(await leerMensajeError(response, 'No se pudo actualizar la papeleta.'))
      onSaved()
    } catch (err) { setError(err.message || 'No se pudo conectar con el servidor.') }
    finally { setSaving(false) }
  }
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <form onSubmit={save} className="sin-scrollbar max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="editar-papeleta-titulo">
        <h2 id="editar-papeleta-titulo" className="text-lg font-bold">Editar papeleta {papeleta.numeroPapeleta}</h2>
        <p className="mb-5 mt-2 text-sm text-slate-500">Solo se modifica el lugar y las observaciones. Las infracciones y los importes se conservan.</p>
        <div className="space-y-4">
          <FloatingInput id="editar-papeleta-lugar" label="Lugar" required value={form.lugar} onChange={e => setForm({ ...form, lugar: e.target.value })} />
          <label className="block text-sm">Observaciones de autoridad<textarea className="mt-1 w-full rounded-lg border p-3 dark:bg-slate-800" rows={3} value={form.observacionesAutoridad} onChange={e => setForm({ ...form, observacionesAutoridad: e.target.value })} /></label>
          <label className="block text-sm">Observaciones del conductor<textarea className="mt-1 w-full rounded-lg border p-3 dark:bg-slate-800" rows={3} value={form.observacionesConductor} onChange={e => setForm({ ...form, observacionesConductor: e.target.value })} /></label>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-3"><BotonCancelar disabled={saving} onClick={onClose}>Cancelar</BotonCancelar><button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </form>
    </div>
  )
}
