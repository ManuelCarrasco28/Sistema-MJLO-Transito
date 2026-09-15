import { useEffect, useState } from 'react'
import { apiFetch } from '../config/api'
import { Pagination } from '../components/ui/Pagination'
import { Icon } from '../components/ui/Icon'

const emptyForm = { tipo_documento: 'DNI', numero_documento: '', nombres: '', apellidos: '', cargo: '', id_unidad_organica: '', tipo_funcion: 'Titular', solicitud: '', documento: '', fecha_documento: '', firma_documento: '', fecha_termino: '', estado: 'ACTIVO' }
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
  const [catalogos, setCatalogos] = useState({ cargos: [], unidades: [] })

  useEffect(() => {
    let active = true
    apiFetch('/personal').then(async (response) => {
      if (!response.ok) throw new Error('No se pudo cargar el personal. Intente nuevamente.')
      const result = await response.json()
      if (active) setRows(result.data || [])
    }).catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })
    apiFetch('/personal/catalogos').then((r) => r.ok ? r.json() : { cargos: [], unidades: [] }).then((data) => {
      if (active) setCatalogos(data)
    }).catch(() => {})
    return () => { active = false }
  }, [])

  const filtered = rows.filter((row) => `${row.nombres} ${row.apellidos} ${row.numero_documento} ${row.cargo} ${row.unidad_organica} ${row.jerarquia} ${row.documento} ${row.solicitud}`.toLowerCase().includes(search.toLowerCase()))
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const openForm = (record) => { setForm({ ...emptyForm, ...record }); setFormError('') }

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30">
            <Icon name="workerBadge" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Personal municipal
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Trabajadores del área de Tránsito, Transporte y Seguridad Vial.
            </p>
          </div>
        </div>
        <button onClick={() => openForm(emptyForm)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">Registrar trabajador</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[[ 'Trabajadores registrados', rows.length ], ['Activos', rows.filter((r) => r.estado === 'ACTIVO').length], ['Inactivos', rows.filter((r) => r.estado === 'INACTIVO').length]].map(([label, count]) => (
          <div key={label} className="rounded-xl border border-slate-200 border-t-4 border-t-blue-500 bg-white p-5 shadow-xs dark:border-slate-800 dark:border-t-blue-500 dark:bg-slate-900"><p className="text-sm text-slate-500 dark:text-slate-400">{label}</p><p className="mt-2 text-2xl font-bold">{loading || error ? '—' : count}</p></div>
        ))}
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="p-4"><input aria-label="Buscar personal" placeholder="Buscar por trabajador, DNI, cargo, unidad o documento de asignación…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className={`${fieldClass} max-w-2xl`} /></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-300"><tr>{['Documento de asignación', 'Trabajador', 'Cargo', 'Unidad orgánica', 'Jerarquía', 'Función', 'Estado', 'Acciones'].map((title) => <th key={title} className="px-4 py-3 font-semibold">{title}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {visible.map((row) => <tr key={row.id} className="hover:bg-blue-50/40 dark:hover:bg-slate-800">
              <td className="px-4 py-4 max-w-[230px]">
                <p className="font-semibold text-slate-900 dark:text-white">{row.documento || 'Sin documento'}</p>
                <p className="mt-0.5 text-xs text-slate-500">{row.fecha_documento || 'Sin fecha'}</p>
                {row.solicitud && <p className="mt-1 truncate text-xs text-slate-400" title={row.solicitud}>{row.solicitud}</p>}
              </td>
              <td className="px-4 py-4">
                <p className="font-semibold">{row.nombres} {row.apellidos}</p>
                <p className="mt-0.5 text-xs text-slate-500">{row.tipo_documento}: {row.numero_documento}</p>
              </td>
              <td className="px-4 py-4">{row.cargo || '—'}</td>
              <td className="px-4 py-4 max-w-[240px]"><p className="truncate" title={row.unidad_organica}>{row.unidad_organica || '—'}</p></td>
              <td className="px-4 py-4">{row.jerarquia || '—'}</td>
              <td className="px-4 py-4"><span className="rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">{row.tipo_funcion || '—'}</span></td>
              <td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${row.estado === 'ACTIVO' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>{row.estado}</span></td>
              <td className="px-4 py-4"><button onClick={() => openForm(row)} className="rounded-lg px-3 py-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400">Editar</button></td>
            </tr>)}
            {!visible.length && <tr><td colSpan={8} className="p-8 text-center text-slate-500">{loading ? 'Cargando personal…' : error ? 'Listado no disponible.' : 'No se encontraron trabajadores.'}</td></tr>}
          </tbody>
        </table></div>
        <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={pageSize} onPageChange={setPage} onItemsPerPageChange={setPageSize} />
      </div>
      {form && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onKeyDown={(e) => { if (e.key === 'Escape' && !saving) setForm(null) }}>
        <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="personal-title" className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
          <h2 id="personal-title" className="text-xl font-bold">{form.id ? 'Editar trabajador' : 'Registrar trabajador'}</h2>
          <div className="my-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Tipo de documento<select className={fieldClass} value={form.tipo_documento} onChange={(e) => setForm({ ...form, tipo_documento: e.target.value })}>{['DNI', 'CE', 'PASAPORTE'].map((type) => <option key={type}>{type}</option>)}</select></label>
            {Object.entries({ numero_documento: 'Número de documento', nombres: 'Nombres', apellidos: 'Apellidos' }).map(([key, label]) => <label key={key} className="text-sm">{label}<input required maxLength={key === 'numero_documento' ? 20 : 100} className={fieldClass} value={form[key] || ''} onChange={(e) => setForm({ ...form, [key]: e.target.value })} /></label>)}
            <label className="text-sm">Cargo<input required list="cargos-list" className={fieldClass} value={form.cargo || ''} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /><datalist id="cargos-list">{catalogos.cargos.map((c) => <option key={c.id} value={c.nombre} />)}</datalist></label>
            <label className="text-sm">Unidad orgánica<select className={fieldClass} value={form.id_unidad_organica || ''} onChange={(e) => setForm({ ...form, id_unidad_organica: e.target.value })}><option value="">Sin unidad asignada</option>{catalogos.unidades.map((u) => <option key={u.id} value={u.id}>{u.nombre} {u.jerarquia ? `(${u.jerarquia})` : ''}</option>)}</select></label>
            <label className="text-sm">Tipo de función<select className={fieldClass} value={form.tipo_funcion || 'Titular'} onChange={(e) => setForm({ ...form, tipo_funcion: e.target.value })}><option>Titular</option><option>Encargado</option><option>Operador</option></select></label>
            <label className="text-sm sm:col-span-2">Solicitud / motivo<input className={fieldClass} value={form.solicitud || ''} onChange={(e) => setForm({ ...form, solicitud: e.target.value })} placeholder="Asignación, desplazamiento, encargatura..." /></label>
            <label className="text-sm">Documento de asignación<input className={fieldClass} value={form.documento || ''} onChange={(e) => setForm({ ...form, documento: e.target.value })} placeholder="MEMORÁNDUM / RESOLUCIÓN..." /></label>
            <label className="text-sm">Fecha documento<input type="date" className={fieldClass} value={form.fecha_documento || ''} onChange={(e) => setForm({ ...form, fecha_documento: e.target.value })} /></label>
            <label className="text-sm sm:col-span-2">Firma / archivo del documento<input className={fieldClass} value={form.firma_documento || ''} onChange={(e) => setForm({ ...form, firma_documento: e.target.value })} placeholder="Nombre o ruta del PDF/imagen escaneada" /></label>
            <label className="text-sm">Fecha término<input type="date" className={fieldClass} value={form.fecha_termino || ''} onChange={(e) => setForm({ ...form, fecha_termino: e.target.value })} /></label>
            <label className="text-sm">Estado<select className={fieldClass} value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option>ACTIVO</option><option>INACTIVO</option></select></label>
          </div>
          {form.historial?.length > 0 && <div className="mb-4 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><p className="mb-2 font-bold">Historial laboral</p>{form.historial.map((h, idx) => <div key={idx} className="border-t border-slate-100 py-2 first:border-t-0 dark:border-slate-800"><p className="font-semibold">{h.cargo || 'Cargo no registrado'} · {h.unidad_organica || 'Sin unidad'}</p><p className="text-xs text-slate-500">{h.documento || 'Sin documento'} · {h.fecha_documento || 'Sin fecha'} · {h.tipo_funcion || 'Sin función'} {h.fecha_termino ? `· terminó ${h.fecha_termino}` : '· vigente'}</p>{h.solicitud && <p className="mt-1 text-xs text-slate-400">{h.solicitud}</p>}</div>)}</div>}
          {formError && <p role="alert" className="mb-4 text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-3"><button type="button" disabled={saving} onClick={() => setForm(null)} className="rounded-lg border border-slate-300 px-4 py-2">Cancelar</button><button disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar'}</button></div>
        </form>
      </div>}
    </section>
  )
}
