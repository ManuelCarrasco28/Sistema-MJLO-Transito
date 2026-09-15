import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

const initialForm = {
  nombre: '',
  lugar: '',
  fecha: new Date().toISOString().split('T')[0],
  hora_inicio: '08:00',
  hora_fin: '',
  estado: 'PROGRAMADO',
  observacion: '',
  inspectores: [],
}

export function Operativos({ user }) {
  const cached = getCachedData('/operativos')
  const [operativos, setOperativos] = useState(cached || [])
  const [personal, setPersonal] = useState([])
  const [loading, setLoading] = useState(!cached)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('TODOS')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  const loadOperativos = async () => {
    const response = await apiFetch('/operativos')
    if (!response.ok) throw response
    const payload = await response.json()
    const data = payload.data || []
    setOperativos(data)
    setCachedData('/operativos', data)
  }

  useEffect(() => {
    loadOperativos().catch(() => {}).finally(() => setLoading(false))
    apiFetch('/personal')
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((r) => setPersonal((r.data || []).filter((p) => p.estado === 'ACTIVO')))
      .catch(() => setPersonal([]))
  }, [])

  useEffect(() => setPage(1), [search, estado])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return operativos.filter((op) => {
      const text = `${op.nombre || ''} ${op.lugar || ''} ${op.fecha || ''}`.toLowerCase()
      return text.includes(q) && (estado === 'TODOS' || op.estado === estado)
    })
  }, [operativos, search, estado])

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const activos = operativos.filter((op) => ['PROGRAMADO', 'EN_CURSO'].includes(op.estado)).length
  const finalizados = operativos.filter((op) => op.estado === 'FINALIZADO').length
  const papeletas = operativos.reduce((acc, op) => acc + Number(op.total_papeletas || 0), 0)

  const openCreate = () => {
    setForm(initialForm)
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (op) => {
    setForm({
      nombre: op.nombre || '',
      lugar: op.lugar || '',
      fecha: op.fecha || initialForm.fecha,
      hora_inicio: (op.hora_inicio || '08:00').slice(0, 5),
      hora_fin: (op.hora_fin || '').slice(0, 5),
      estado: op.estado || 'PROGRAMADO',
      observacion: op.observacion || '',
      inspectores: (op.inspectores || []).map((i) => String(i.id_inspector)),
    })
    setEditing(op)
    setModalOpen(true)
  }

  const toggleInspector = (id) => {
    const value = String(id)
    setForm((prev) => ({
      ...prev,
      inspectores: prev.inspectores.includes(value)
        ? prev.inspectores.filter((item) => item !== value)
        : [...prev.inspectores, value],
    }))
  }

  const save = async (event) => {
    event.preventDefault()
    if (!form.nombre.trim() || !form.lugar.trim() || !form.fecha || !form.hora_inicio) {
      alert('Completa nombre, lugar, fecha y hora de inicio.')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        id_usuario_registra: user?.id || null,
        inspectores: form.inspectores.map(Number),
      }
      const response = await apiFetch(editing ? `/operativos/${editing.id}` : '/operativos', {
        method: editing ? 'PUT' : 'POST',
        body: payload,
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || result.messages?.error || 'No se pudo guardar el operativo.')
      await loadOperativos()
      setModalOpen(false)
    } catch (error) {
      alert(error.message || 'No se pudo guardar el operativo.')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar este operativo? Las papeletas vinculadas quedarán como servicio normal.')) return
    const response = await apiFetch(`/operativos/${id}`, { method: 'DELETE' })
    if (response.ok) {
      const next = operativos.filter((op) => op.id !== id)
      setOperativos(next)
      setCachedData('/operativos', next)
    }
  }

  const openDetail = async (op) => {
    const response = await apiFetch(`/operativos/${op.id}`)
    if (!response.ok) return
    const result = await response.json()
    setDetail(result.data)
  }

  const badgeClass = (value) => ({
    PROGRAMADO: 'bg-blue-100 text-blue-800',
    EN_CURSO: 'bg-amber-100 text-amber-800',
    FINALIZADO: 'bg-emerald-100 text-emerald-800',
    CANCELADO: 'bg-rose-100 text-rose-800',
  }[value] || 'bg-slate-100 text-slate-700')

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-rose-600 to-orange-500 text-white shadow-lg shadow-rose-500/30">
            <Icon name="operations" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Operativos</h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">Programación, asignación de inspectores e historial de papeletas.</p>
          </div>
        </div>
        <button onClick={openCreate} className="rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-4 py-2.5 text-sm font-extrabold text-white shadow-md shadow-rose-500/20 hover:brightness-105">
          + Nuevo operativo
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Total operativos', operativos.length, '📍'],
          ['Activos', activos, '🚦'],
          ['Finalizados', finalizados, '✅'],
          ['Papeletas vinculadas', papeletas, '🎫'],
        ].map(([label, value, icon]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</span>
              <span className="grid size-8 place-items-center rounded-lg bg-rose-50 text-sm">{icon}</span>
            </div>
            <p className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, lugar o fecha..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white">
            <option value="TODOS">Todos los estados</option>
            <option value="PROGRAMADO">Programado</option>
            <option value="EN_CURSO">En curso</option>
            <option value="FINALIZADO">Finalizado</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                <th className="px-4 py-3">Operativo</th>
                <th className="px-4 py-3">Fecha / hora</th>
                <th className="px-4 py-3">Inspectores</th>
                <th className="px-4 py-3">Papeletas</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map((op) => (
                <tr key={op.id} className="hover:bg-rose-50/30 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3">
                    <p className="font-black text-slate-900 dark:text-white">{op.nombre}</p>
                    <p className="text-xs text-slate-500">{op.lugar}</p>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="font-bold">{op.fecha}</p>
                    <p className="text-xs text-slate-500">{String(op.hora_inicio || '').slice(0, 5)}{op.hora_fin ? ` - ${String(op.hora_fin).slice(0, 5)}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 font-bold">{op.total_inspectores || 0}</td>
                  <td className="px-4 py-3 font-bold">{op.total_papeletas || 0}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${badgeClass(op.estado)}`}>{op.estado}</span></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openDetail(op)} className="rounded-lg bg-sky-50 p-1.5 text-sky-600 hover:bg-sky-500 hover:text-white"><Icon name="eye" className="size-4" /></button>
                      <button onClick={() => openEdit(op)} className="rounded-lg bg-amber-50 p-1.5 text-amber-600 hover:bg-amber-500 hover:text-white"><Icon name="pencil" className="size-4" /></button>
                      <button onClick={() => remove(op.id)} className="rounded-lg bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-500 hover:text-white"><Icon name="trash" className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && <tr><td colSpan="6" className="p-10 text-center text-slate-500">{loading ? 'Cargando operativos...' : 'No se encontraron operativos.'}</td></tr>}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={pageSize} onPageChange={setPage} onItemsPerPageChange={setPageSize} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <form onSubmit={save} className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f172a]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">{editing ? 'Editar operativo' : 'Nuevo operativo'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold">Nombre<input required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" /></label>
              <label className="text-sm font-bold">Lugar<input required value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" /></label>
              <label className="text-sm font-bold">Fecha<input required type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm font-bold">Inicio<input required type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" /></label>
                <label className="text-sm font-bold">Fin<input type="time" value={form.hora_fin} onChange={(e) => setForm({ ...form, hora_fin: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" /></label>
              </div>
              <label className="text-sm font-bold">Estado<select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"><option>PROGRAMADO</option><option>EN_CURSO</option><option>FINALIZADO</option><option>CANCELADO</option></select></label>
              <label className="text-sm font-bold sm:col-span-2">Observación<textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" /></label>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-black">Inspectores asignados</p>
              <div className="grid max-h-56 gap-2 overflow-y-auto rounded-2xl border border-slate-200 p-3 sm:grid-cols-2 dark:border-slate-700">
                {personal.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-800">
                    <input type="checkbox" checked={form.inspectores.includes(String(p.id))} onChange={() => toggleInspector(p.id)} />
                    <span className="font-semibold">{p.nombres} {p.apellidos}</span>
                  </label>
                ))}
                {!personal.length && <p className="text-sm text-slate-500">No hay inspectores/trabajadores activos disponibles.</p>}
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold">Cancelar</button>
              <button disabled={saving} className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Guardando...' : 'Guardar operativo'}</button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs">
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-[#0f172a]">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black">{detail.nombre}</h2>
                <p className="text-sm text-slate-500">{detail.lugar} · {detail.fecha}</p>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">✕</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="font-black">Inspectores</p>
                <div className="mt-3 space-y-2">
                  {(detail.inspectores || []).map((i) => <p key={i.id} className="text-sm">{i.nombres} {i.apellido_paterno} {i.apellido_materno}</p>)}
                  {!detail.inspectores?.length && <p className="text-sm text-slate-500">Sin inspectores asignados.</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                <p className="font-black">Papeletas del operativo</p>
                <div className="mt-3 space-y-2">
                  {(detail.papeletas || []).map((p) => <p key={p.id} className="text-sm"><span className="font-bold">{p.numero_papeleta}</span> · S/ {Number(p.monto_total || 0).toFixed(2)}</p>)}
                  {!detail.papeletas?.length && <p className="text-sm text-slate-500">Aún no hay papeletas vinculadas.</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
