import { useCallback, useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { FilaCargando } from '../components/ui/FilaCargando'
import { Cargando } from '../components/ui/Cargando'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { FloatingInput, FloatingSelect, FloatingTextarea, RoundedSelect } from '../components/ui/FormInputs'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'
import { StatusBadge } from '../components/ui/StatusBadge'
import { apiFetch, invalidateCache, leerMensajeError } from '../config/api'
import { puedeEliminarRegistros } from '../config/roles'
import { showConfirm, showToast } from '../utils/SwalUtil'

const NUEVO = { codigo: '', nombre: '', descripcion: '', costo: '', estado: 'ACTIVO', tipoTramite: 'INICIAL', plazoAtencion: '', baseLegal: '' }
const TIPOS = [{ value: 'INICIAL', label: 'Inicial' }, { value: 'RENOVACION', label: 'Renovación' }, { value: 'DUPLICADO', label: 'Duplicado' }]
const ESTADOS = [{ value: 'ACTIVO', label: 'Activo' }, { value: 'INACTIVO', label: 'Inactivo' }]
const normalizar = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const moneda = (value) => value === null || value === undefined || value === '' ? 'Sin tarifa vigente' : 'S/ ' + Number(value).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function Ventana({ titulo, onClose, children, busy = false }) {
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const escape = (event) => { if (event.key === 'Escape' && !busy) onClose() }
    document.addEventListener('keydown', escape)
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', escape) }
  }, [busy, onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-label={titulo} className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-[var(--border)]">
          <h2 className="font-bold text-slate-900 dark:text-white">{titulo}</h2>
          <BotonCerrarModal onClick={onClose} disabled={busy} />
        </div>
        {children}
      </div>
    </div>
  )
}

export function ProcedimientosTarifas() {
  const [procedimientos, setProcedimientos] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('TODOS')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState(null)
  const [historyError, setHistoryError] = useState('')
  const gestionar = puedeEliminarRegistros()

  const cargar = useCallback(async (signal) => {
    const response = await apiFetch('/catalogo-procedimientos', { signal })
    if (!response.ok) throw new Error(await leerMensajeError(response, 'No se pudo cargar el catálogo.'))
    const result = await response.json()
    if (!Array.isArray(result.data)) throw new Error('El catálogo recibido no tiene el formato esperado.')
    if (!signal?.aborted) { setProcedimientos(result.data); setError('') }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    cargar(controller.signal)
      .catch((err) => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [cargar])

  useEffect(() => {
    if (!selected) return
    const controller = new AbortController()
    setHistory(null)
    setHistoryError('')
    apiFetch('/catalogo-procedimientos/' + selected.id, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await leerMensajeError(response, 'No se pudo cargar el historial.'))
        const result = await response.json()
        if (!controller.signal.aborted) setHistory(result.data?.tarifas || [])
      })
      .catch((err) => { if (!controller.signal.aborted) setHistoryError(err.message) })
    return () => controller.abort()
  }, [selected])

  const filtrados = procedimientos.filter((proc) =>
    normalizar(proc.codigo + ' ' + proc.nombre + ' ' + (proc.descripcion || '')).includes(normalizar(busqueda).trim())
    && (estado === 'TODOS' || proc.estado === estado))
  const pagina = Math.min(page, Math.max(1, Math.ceil(filtrados.length / pageSize)))
  const visibles = filtrados.slice((pagina - 1) * pageSize, pagina * pageSize)
  const cambiar = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const abrir = (row = null) => {
    setFormError('')
    setForm(row ? { ...NUEVO, ...row, costo: row.costo ?? '', plazoAtencion: row.plazoAtencion ?? '' } : { ...NUEVO })
  }

  async function guardar(event) {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setFormError('')
    try {
      const response = await apiFetch('/catalogo-procedimientos' + (form.id ? '/' + form.id : ''), { method: form.id ? 'PUT' : 'POST', body: form })
      if (!response.ok) throw new Error(await leerMensajeError(response, 'No se pudo guardar el procedimiento.'))
      invalidateCache('/procedimientos-admin')
      invalidateCache('/permisos')
      setForm(null)
      showToast('Procedimiento guardado correctamente.', 'success')
      try { await cargar() } catch (err) { setError('Se guardó el procedimiento, pero no se pudo actualizar la lista. ' + err.message) }
    } catch (err) {
      setFormError(err.message)
    } finally { setSaving(false) }
  }

  async function eliminar(row) {
    const answer = await showConfirm('¿Eliminar procedimiento?', 'Se eliminará ' + row.codigo + ' y sus tarifas. Si tiene trámites asociados, la eliminación será bloqueada.', 'Sí, eliminar', 'Cancelar')
    if (!answer.isConfirmed) return
    setDeleting(row.id)
    try {
      const response = await apiFetch('/catalogo-procedimientos/' + row.id, { method: 'DELETE' })
      if (!response.ok) throw new Error(await leerMensajeError(response, 'No se pudo eliminar el procedimiento.'))
      invalidateCache('/procedimientos-admin')
      setProcedimientos((rows) => rows.filter((item) => item.id !== row.id))
      showToast('Procedimiento eliminado.', 'success')
    } catch (err) { showToast(err.message, 'warning') }
    finally { setDeleting(null) }
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center gap-3">
        <Icon name="document" className="size-7 shrink-0 text-indigo-600 dark:text-indigo-400" />
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">Procedimientos y tarifas</h1>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[var(--border)] dark:bg-[#1C2438]">
        <div className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[180px] flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input aria-label="Buscar procedimiento" type="search" value={busqueda} onChange={(e) => { setBusqueda(e.target.value); setPage(1) }} placeholder="Buscar por código o procedimiento" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-white" />
          </div>
          <RoundedSelect value={estado} onChange={(value) => { setEstado(value); setPage(1) }} options={[{ value: 'TODOS', label: 'Todos los estados' }, ...ESTADOS]} />
          {gestionar && <button type="button" onClick={() => abrir()} className="inline-flex h-[42px] items-center gap-2 whitespace-nowrap rounded-xl bg-blue-600 px-4 !text-xs !font-semibold text-white hover:bg-blue-700"><Icon name="plus" className="size-4" />Nuevo procedimiento</button>}
        </div>
        {error && <div className="px-4 pb-3"><PageLoadError message={error} /></div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[145px]" />
              <col />
              <col className="w-[110px]" />
              <col className="w-[150px]" />
              <col className="w-[130px]" />
              <col className="w-[150px]" />
            </colgroup>
            <thead className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              <tr>{['Código', 'Procedimiento', 'Tipo', 'Tarifa vigente', 'Estado', 'Acciones'].map((label) => <th key={label} className="px-4 py-3 font-bold uppercase">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {isLoading ? <FilaCargando colSpan={6} /> : !visibles.length ? <tr><td colSpan={6} className="p-8 text-center text-slate-500">No se encontraron procedimientos.</td></tr> : visibles.map((row) => (
                <tr key={row.id} className="bg-[var(--bg-surface)] text-[var(--text)] transition-colors hover:bg-[var(--bg-subtle)]">
                  <td className="break-all px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-300">{row.codigo}</td>
                  <td className="px-4 py-3"><p className="whitespace-normal break-words font-semibold leading-relaxed">{row.nombre}</p></td>
                  <td className="px-4 py-3">{TIPOS.find((tipo) => tipo.value === row.tipoTramite)?.label || row.tipoTramite}</td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{moneda(row.costo)}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.estado} /></td>
                  <td className="px-4 py-3"><div className="flex items-center gap-2">
                    <button type="button" onClick={() => setSelected(row)} title="Ver procedimiento" aria-label={'Ver ' + row.codigo} className="grid size-8 shrink-0 place-items-center rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 dark:text-cyan-300"><Icon name="eye" className="size-4" /></button>
                    {gestionar && <>
                      <button type="button" onClick={() => abrir(row)} title="Editar procedimiento" aria-label={'Editar ' + row.codigo} className="grid size-8 shrink-0 place-items-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-300"><Icon name="edit" className="size-4" /></button>
                      <button type="button" disabled={deleting !== null} onClick={() => eliminar(row)} title="Eliminar procedimiento" aria-label={'Eliminar ' + row.codigo} className="grid size-8 shrink-0 place-items-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 disabled:opacity-40"><Icon name="trash" className="size-4" /></button>
                    </>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 px-4 py-3 dark:border-[var(--border)]"><Pagination currentPage={pagina} totalItems={filtrados.length} itemsPerPage={pageSize} onPageChange={setPage} onItemsPerPageChange={(value) => { setPageSize(value); setPage(1) }} /></div>
      </div>
      {form && <Ventana titulo={form.id ? 'Editar procedimiento' : 'Nuevo procedimiento'} onClose={() => { if (!saving) setForm(null) }} busy={saving}>
        <form onSubmit={guardar} className="flex min-h-0 flex-col">
          <div className="space-y-4 overflow-y-auto p-5">
            {formError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{formError}</p>}
            <div className="grid gap-4 sm:grid-cols-2">
              <FloatingInput id="proc_codigo" label="Código" value={form.codigo} required maxLength={50} onChange={(e) => cambiar('codigo', e.target.value.toUpperCase())} />
              <FloatingSelect id="proc_tipo" label="Tipo de trámite" value={form.tipoTramite} options={TIPOS} onChange={(e) => cambiar('tipoTramite', e.target.value)} />
              <div className="sm:col-span-2"><FloatingInput id="proc_nombre" label="Nombre del procedimiento" value={form.nombre} required maxLength={200} onChange={(e) => cambiar('nombre', e.target.value)} /></div>
              <FloatingInput id="proc_costo" label="Tarifa vigente (S/)" type="number" min="0" max="9999999999.99" step="0.01" value={form.costo} required onChange={(e) => cambiar('costo', e.target.value)} />
              <FloatingSelect id="proc_estado" label="Estado" value={form.estado} options={ESTADOS} onChange={(e) => cambiar('estado', e.target.value)} />
              <FloatingInput id="proc_plazo" label="Plazo de atención (días hábiles)" type="number" min="0" max="3650" step="1" value={form.plazoAtencion} optional onChange={(e) => cambiar('plazoAtencion', e.target.value)} />
            </div>
            <FloatingTextarea id="proc_descripcion" label="Descripción" value={form.descripcion || ''} maxLength={10000} onChange={(e) => cambiar('descripcion', e.target.value)} />
            <FloatingTextarea id="proc_base" label="Base legal / norma que sustenta la tarifa" value={form.baseLegal || ''} maxLength={10000} onChange={(e) => cambiar('baseLegal', e.target.value)} />
            <p className="text-xs text-slate-500 dark:text-slate-400">Los cambios de importe se aplican desde hoy y conservan el historial. No alteran los pagos ya registrados. Registra únicamente tarifas con sustento normativo.</p>
          </div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-5 py-4 dark:border-[var(--border)]"><BotonCancelar onClick={() => setForm(null)} disabled={saving} /><BotonGuardar disabled={saving}>{saving ? 'Guardando…' : 'Guardar procedimiento'}</BotonGuardar></div>
        </form>
      </Ventana>}
      {selected && <Ventana titulo={'Procedimiento ' + selected.codigo} onClose={() => setSelected(null)}>
        <div className="space-y-4 overflow-y-auto p-5 text-sm text-slate-700 dark:text-slate-200">
          <h3 className="text-lg font-bold">{selected.nombre}</h3>
          <div className="flex flex-wrap items-center gap-4"><StatusBadge status={selected.estado} /><strong>{moneda(selected.costo)}</strong><span>{selected.usos} trámites asociados</span></div>
          {selected.descripcion && <p className="whitespace-pre-wrap">{selected.descripcion}</p>}
          {selected.baseLegal && <div><h4 className="mb-1 font-bold">Base legal</h4><p className="whitespace-pre-wrap">{selected.baseLegal}</p></div>}
          <h4 className="font-bold">Historial de tarifas</h4>
          {historyError ? <PageLoadError message={historyError} /> : history === null ? <Cargando className="py-8" /> : !history.length ? <p>Sin tarifas registradas.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr>{['Importe', 'Desde', 'Hasta', 'Estado'].map((label) => <th key={label} className="p-2">{label}</th>)}</tr></thead><tbody>{history.map((tarifa, index) => <tr key={index} className="border-t border-slate-200 dark:border-slate-700"><td className="p-2">{moneda(tarifa.costo)}</td><td className="p-2">{tarifa.fechaInicio}</td><td className="p-2">{tarifa.fechaFin || 'Sin fecha de término'}</td><td className="p-2"><StatusBadge status={tarifa.estado} /></td></tr>)}</tbody></table></div>}
        </div>
      </Ventana>}
    </section>
  )
}
