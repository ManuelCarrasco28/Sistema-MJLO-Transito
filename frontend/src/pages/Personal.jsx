import { useEffect, useState } from 'react'
import { apiFetch } from '../config/api'
import { Pagination } from '../components/ui/Pagination'
import { Icon } from '../components/ui/Icon'

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

  const totalPersonal = loading || error ? '—' : rows.length
  const activos = loading || error ? '—' : rows.filter((r) => r.estado === 'ACTIVO').length
  const porArea = loading || error ? {} : rows.reduce((acc, r) => { acc[r.cargo || 'General'] = true; return acc }, {})
  const admins = loading || error ? '—' : rows.filter((r) => (r.cargo || '').toLowerCase().includes('admin')).length

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/20">
            <Icon name="users" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:text-3xl">
              Personal Municipal
            </h1>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Trabajadores del área de Tránsito, Transporte y Seguridad Vial.
            </p>
          </div>
        </div>
        <button onClick={() => openForm(emptyForm)} className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-md transition-all hover:scale-105 hover:bg-sky-700 active:scale-95 cursor-pointer">
          <span className="text-lg leading-none">+</span> Registrar trabajador
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Personal */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-500 to-sky-700 p-5 text-white shadow-lg shadow-sky-500/20 transition-all hover:shadow-xl hover:shadow-sky-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-sky-100">Total Personal</span>
            <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <Icon name="users" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black">{totalPersonal}</p>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white">Registrados</span>
          </div>
        </div>

        {/* Activos */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-100">Activos</span>
            <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white backdrop-blur-xs font-bold">✓</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black">{activos}</p>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white">En funciones</span>
          </div>
        </div>

        {/* Por Área */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-5 text-white shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-100">Por Área</span>
            <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white backdrop-blur-xs font-bold">🏢</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black">{Object.keys(porArea).length}</p>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white">Departamentos</span>
          </div>
        </div>

        {/* Administradores */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#1B1536]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-600 dark:text-purple-400">Administradores</span>
            <span className="grid size-9 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 font-bold">🛡️</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{admins}</p>
            <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-bold text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">Acceso Total</span>
          </div>
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1B1536]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input 
              aria-label="Buscar personal" 
              placeholder="Buscar por nombre, documento o cargo…" 
              value={search} 
              onChange={(e) => { setSearch(e.target.value); setPage(1) }} 
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white dark:focus:border-sky-400" 
            />
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-sky-50/70 text-xs font-bold uppercase tracking-wider text-sky-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-sky-400">
              <tr>
                {['Documento', 'Trabajador', 'Cargo', 'Estado'].map((title) => (
                  <th key={title} className="px-4 py-3.5 whitespace-nowrap">{title}</th>
                ))}
                <th className="sticky right-0 z-20 bg-sky-50/95 dark:bg-slate-900/95 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-200/60 dark:border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map((row) => (
                <tr key={row.id} className="group transition-colors hover:bg-sky-50/40 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="text-xs font-bold text-sky-600 dark:text-sky-400">{row.tipo_documento}</span>
                    <p className="font-mono font-medium text-slate-700 dark:text-slate-300">{row.numero_documento}</p>
                  </td>
                  <td className="px-4 py-4 font-bold text-slate-800 dark:text-white whitespace-nowrap">
                    {row.nombres} {row.apellidos}
                  </td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">
                    {row.cargo || '—'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold ${row.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {row.estado}
                    </span>
                  </td>
                  <td className="sticky right-0 z-10 bg-white dark:bg-[#1B1536] px-4 py-3.5 text-right border-l border-slate-100 dark:border-slate-800 whitespace-nowrap group-hover:bg-sky-50/40 dark:group-hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openForm(row)}
                        className="group/btn grid size-8 place-items-center rounded-full bg-slate-50 text-slate-400 transition-all hover:bg-sky-500 hover:text-white hover:shadow-lg hover:shadow-sky-500/30 hover:-translate-y-0.5 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-sky-500 cursor-pointer"
                        title="Editar"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <div className="mx-auto max-w-xs space-y-2">
                      <p className="text-3xl">👥</p>
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        {loading ? 'Cargando personal...' : error ? 'Listado no disponible' : 'No se encontraron trabajadores'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 p-4 dark:border-slate-800">
          <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={pageSize} onPageChange={setPage} onItemsPerPageChange={setPageSize} />
        </div>
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
