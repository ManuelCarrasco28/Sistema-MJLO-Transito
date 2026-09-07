import { useEffect, useState } from 'react'
import { apiFetch } from '../config/api'
import { Pagination } from '../components/ui/Pagination'

const emptyForm = { tipo_documento: 'DNI', numero_documento: '', nombres: '', apellidos: '', cargo: '', estado: 'ACTIVO' }
const fieldClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900'

export function Personal() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    let active = true
    apiFetch('/personal').then(async (response) => {
      if (!response.ok) throw new Error('No se pudo cargar el personal. Intente nuevamente.')
      const result = await response.json()
      if (active) setRows(result.data || [])
    }).catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const filtered = rows.filter((row) => `${row.nombres} ${row.apellidos} ${row.numero_documento} ${row.cargo}`.toLowerCase().includes(search.toLowerCase()))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const openForm = (record) => { setForm({ ...record }); setFormError('') }

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const response = await apiFetch(form.id ? `/personal/${form.id}` : '/personal', { method: form.id ? 'PUT' : 'POST', body: form })
      const result = await response.json()
      if (!response.ok) throw new Error(result.messages ? Object.values(result.messages).join(' ') : 'No se pudo guardar el trabajador.')
      setRows((current) => form.id ? current.map((row) => String(row.id) === String(form.id) ? result.data : row) : [result.data, ...current])
      setForm(null)
    } catch (e) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Personal municipal</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Trabajadores del área de Tránsito, Transporte y Seguridad Vial.</p></div>
        <button onClick={() => openForm(emptyForm)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Registrar trabajador</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[[ 'Trabajadores registrados', rows.length ], ['Activos', rows.filter((r) => r.estado === 'ACTIVO').length], ['Inactivos', rows.filter((r) => r.estado === 'INACTIVO').length]].map(([label, count]) => (
          <div key={label} className="rounded-xl border border-slate-200 border-t-4 border-t-blue-500 bg-white p-5 shadow-xs dark:border-slate-800 dark:border-t-blue-500 dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{loading || error ? '—' : count}</p></div>
        ))}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4"><input aria-label="Buscar personal" placeholder="Buscar por nombre, documento o cargo…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className={`${fieldClass} max-w-md`} /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr>{['Documento', 'Trabajador', 'Cargo', 'Estado', 'Acciones'].map((title) => <th key={title} className="px-4 py-3 font-semibold">{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((row) => <tr key={row.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800">
              <td className="px-4 py-4"><span className="text-xs text-slate-500">{row.tipo_documento}</span><p>{row.numero_documento}</p></td>
              <td className="px-4 py-4 font-semibold">{row.nombres} {row.apellidos}</td><td className="px-4 py-4">{row.cargo}</td>
              <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{row.estado}</span></td>
              <td className="px-4 py-4"><button onClick={() => openForm(row)} className="rounded-lg px-3 py-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400">Editar</button></td>
            </tr>)}
            {!visible.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">{loading ? 'Cargando personal…' : error ? 'Listado no disponible.' : 'No se encontraron trabajadores.'}</td></tr>}
          </tbody>
        </table></div>
        <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={pageSize} onPageChange={setPage} onItemsPerPageChange={setPageSize} />
      </div>
      {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onKeyDown={(e) => { if (e.key === 'Escape' && !saving) setForm(null) }}>
        <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="personal-title" className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
          <h2 id="personal-title" className="text-xl font-bold">{form.id ? 'Editar trabajador' : 'Registrar trabajador'}</h2>
          <div className="my-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Tipo de documento<select className={fieldClass} value={form.tipo_documento} onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}>{['DNI', 'CE', 'PASAPORTE'].map((type) => <option key={type}>{type}</option>)}</select></label>
            {Object.entries({ numero_documento: 'Número de documento', nombres: 'Nombres', apellidos: 'Apellidos', cargo: 'Cargo' }).map(([key, label]) => <label key={key} className="text-sm">{label}<input required maxLength={key === 'numero_documento' ? 20 : 100} className={fieldClass} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
            <label className="text-sm">Estado<select className={fieldClass} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option>ACTIVO</option><option>INACTIVO</option></select></label>
          </div>
          {formError && <p role="alert" className="mb-4 text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setForm(null)} className="rounded-lg border border-slate-300 px-4 py-2">Cancelar</button><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button></div>
        </form>
      </div>}
    </section>
  )
}
