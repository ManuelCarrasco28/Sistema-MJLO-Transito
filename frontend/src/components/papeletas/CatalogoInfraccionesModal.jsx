import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { FloatingInput, FloatingSelect, FloatingTextarea } from '../ui/FormInputs'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../ui/ModalControls'
import { apiFetch, sanitizarMensaje } from '../../config/api'
import { showConfirm, showError, showToast } from '../../utils/SwalUtil'

const GRAVEDADES = [
  { value: 'LEVE', label: 'Leve' },
  { value: 'GRAVE', label: 'Grave' },
  { value: 'MUY GRAVE', label: 'Muy grave' },
]
const ESTADOS = [
  { value: 'ACTIVO', label: 'Activa (se ofrece en papeletas nuevas)' },
  { value: 'INACTIVO', label: 'Inactiva' },
]
const FORM_VACIO = { id: null, codigo: '', descripcion: '', gravedad: 'LEVE', porcentajeUit: '', estado: 'ACTIVO' }

const estiloGravedad = (g) => (
  g === 'MUY GRAVE'
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
    : g === 'GRAVE'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300'
      : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-300'
)

/**
 * Catálogo de infracciones: alta, edición y baja de los tipos de infracción y su multa (porcentaje de UIT).
 * Cambiar una multa solo afecta a las papeletas nuevas; las ya emitidas conservan su monto.
 * `editarCodigo`: abre directamente la edición de esa infracción (desde el cuadro de detalle).
 */
export function CatalogoInfraccionesModal({ onClose, onChanged, editarCodigo = null }) {
  const [filas, setFilas] = useState([])
  const [uit, setUit] = useState(0)
  const [anioUit, setAnioUit] = useState(new Date().getFullYear())
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const cargar = (abrirCodigo = null) => {
    setCargando(true)
    return apiFetch('/catalogo-infracciones')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((payload) => {
        const lista = payload.data || []
        setFilas(lista)
        setUit(Number(payload.uit || 0))
        if (payload.anio) setAnioUit(Number(payload.anio))
        if (abrirCodigo) {
          const objetivo = lista.find((f) => f.codigo === abrirCodigo)
          if (objetivo) setForm({ ...objetivo, porcentajeUit: String(objetivo.porcentajeUit) })
        }
      })
      .catch(() => showError('Error', 'No se pudo cargar el catálogo de infracciones.'))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar(editarCodigo) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const multaEstimada = Number(form?.porcentajeUit || 0) > 0 ? (uit * Number(form.porcentajeUit)) / 100 : 0
  // La UIT se toma de Configuración UIT (Superadmin) del año vigente.
  const cambiarMulta = (valor) => {
    const soles = Number(valor)
    setForm((prev) => ({ ...prev, porcentajeUit: valor === '' || !(uit > 0) ? '' : String(Math.round((soles / uit) * 10000) / 100) }))
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const esEdicion = Boolean(form.id)
      const res = await apiFetch(esEdicion ? `/catalogo-infracciones/${form.id}` : '/catalogo-infracciones', {
        method: esEdicion ? 'PUT' : 'POST',
        body: {
          codigo: form.codigo,
          descripcion: form.descripcion,
          gravedad: form.gravedad,
          porcentajeUit: Number(form.porcentajeUit),
          estado: form.estado,
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'No se pudo guardar la infracción.')
      showToast(esEdicion ? 'Infracción actualizada' : 'Infracción registrada', esEdicion ? 'editar' : 'crear')
      setForm(null)
      await cargar()
      onChanged?.()
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo guardar la infracción.'))
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (fila) => {
    const resultado = await showConfirm(
      '¿Eliminar infracción?',
      fila.usos > 0
        ? `La infracción ${fila.codigo} ya se usó en ${fila.usos} papeletas: no se borra, se desactiva y deja de ofrecerse en papeletas nuevas. El historial se conserva.`
        : `Se eliminará la infracción ${fila.codigo}. Esta acción no se puede deshacer.`,
      fila.usos > 0 ? 'Sí, desactivar' : 'Sí, eliminar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' },
    )
    if (!resultado.isConfirmed) return
    try {
      const res = await apiFetch(`/catalogo-infracciones/${fila.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'No se pudo eliminar la infracción.')
      showToast(data.desactivada ? 'Infracción desactivada' : 'Infracción eliminada', 'eliminar')
      await cargar()
      onChanged?.()
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo eliminar la infracción.'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-xs animate-enter sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !guardando) onClose() }}>
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-[var(--border)]">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300">
              <Icon name="scale" className="size-4.5" />
            </span>
            <div>
              <h3 className="text-base font-bold leading-tight text-slate-900 dark:text-white">{form ? (form.id ? `Editar infracción ${form.codigo}` : 'Nueva infracción') : 'Catálogo de infracciones'}</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">UIT {anioUit}: S/ {uit.toLocaleString('es-PE', { minimumFractionDigits: 2 })} (de Configuración UIT) · multa = UIT × porcentaje</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!form && (
              <button
                type="button"
                onClick={() => setForm({ ...FORM_VACIO })}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer"
                style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
              >
                <span className="text-base leading-none font-black">+</span><span>Nueva infracción</span>
              </button>
            )}
            <BotonCerrarModal onClick={() => !guardando && onClose()} title="Cerrar" />
          </div>
        </div>

        {form ? (
          <form onSubmit={guardar} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <FloatingInput id="inf_codigo" label="Código (ej. M-01)" required maxLength={20} value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} />
                <FloatingSelect id="inf_gravedad" label="Gravedad" value={form.gravedad} options={GRAVEDADES} onChange={(e) => setForm({ ...form, gravedad: e.target.value })} />
                <FloatingInput id="inf_pct" label={`% de la UIT ${anioUit}`} type="number" min="0.01" max="1000" step="0.01" required value={form.porcentajeUit} onChange={(e) => setForm({ ...form, porcentajeUit: e.target.value })} />
                <FloatingInput id="inf_multa" label="o la multa en soles (S/)" type="number" min="0" step="0.01" value={multaEstimada > 0 ? String(Math.round(multaEstimada * 100) / 100) : ''} onChange={(e) => cambiarMulta(e.target.value)} />
              </div>
              <FloatingTextarea id="inf_desc" label="Descripción de la infracción" required rows={3} maxLength={300} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
              <FloatingSelect id="inf_estado" label="Estado" value={form.estado} options={ESTADOS} onChange={(e) => setForm({ ...form, estado: e.target.value })} />
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Multa resultante</span>
                <span className="text-lg font-black text-emerald-700 dark:text-emerald-300">S/ {multaEstimada.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              {form.id && form.usos > 0 && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Esta infracción ya se usó en {form.usos} papeletas. Si cambias el porcentaje, esas papeletas conservan el monto con el que se emitieron; el cambio rige para las nuevas.</p>
              )}
            </div>
            <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <BotonCancelar onClick={() => !guardando && (editarCodigo ? onClose() : setForm(null))} />
              <BotonGuardar disabled={guardando}>{guardando ? 'Guardando...' : (form.id ? 'Guardar cambios' : 'Registrar infracción')}</BotonGuardar>
            </div>
          </form>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <table className="w-full table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[9%]" />
                <col className="w-[37%]" />
                <col className="w-[11%]" />
                <col className="w-[8%]" />
                <col className="w-[11%]" />
                <col className="w-[8%]" />
                <col className="w-[16%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:bg-[#1C2438] dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5 text-center">Código</th>
                  <th className="px-3 py-2.5">Descripción</th>
                  <th className="px-3 py-2.5 text-center">Gravedad</th>
                  <th className="px-3 py-2.5 text-center">% UIT</th>
                  <th className="px-3 py-2.5 text-center">Multa (S/)</th>
                  <th className="px-3 py-2.5 text-center">Usos</th>
                  <th className="px-3 py-2.5 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                {cargando && filas.length === 0 ? (
                  <tr><td colSpan={7} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                ) : filas.map((f) => (
                  <tr key={f.id} className={f.estado === 'INACTIVO' ? 'opacity-55' : ''}>
                    <td className="px-3 py-2.5 text-center">
                      <span className="inline-flex rounded-md border border-rose-200/70 bg-rose-50 px-2 py-0.5 font-mono text-xs font-black text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">{f.codigo}</span>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700 dark:text-slate-200">
                      <span className="line-clamp-2 leading-snug" title={f.descripcion}>{f.descripcion}</span>
                      {f.estado === 'INACTIVO' && <span className="text-[10px] font-bold uppercase text-slate-400">Inactiva</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[10px] font-extrabold uppercase ${estiloGravedad(f.gravedad)}`}>{f.gravedad}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-200">{f.porcentajeUit}%</td>
                    <td className="px-3 py-2.5 text-center font-mono font-black text-slate-900 dark:text-white">{Number(f.montoBase).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{f.usos}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setForm({ ...f, porcentajeUit: String(f.porcentajeUit) })}
                          className="size-8 shrink-0 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-edit-bg)] border-[var(--action-edit-border)] text-[var(--action-edit-text)] hover:bg-[var(--action-edit-hover)] hover:border-[var(--action-edit-hover)] hover:text-white"
                          title="Editar infracción"
                        >
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => eliminar(f)}
                          className="size-8 shrink-0 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-del-bg)] border-[var(--action-del-border)] text-[var(--action-del-text)] hover:bg-[var(--action-del-hover)] hover:border-[var(--action-del-hover)] hover:text-white"
                          title={f.usos > 0 ? 'Desactivar (ya se usó en papeletas)' : 'Eliminar infracción'}
                        >
                          <Icon name="trash" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
