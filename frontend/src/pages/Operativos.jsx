import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { PageLoadError } from '../components/ui/PageLoadError'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

const getPeruDateInputValue = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

const initialForm = {
  nombre: '',
  lugar: '',
  fecha: getPeruDateInputValue(),
  hora_inicio: '08:00',
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
  const [fechaFiltro, setFechaFiltro] = useState('TODAS')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(8)
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const loadOperativos = async () => {
    const response = await apiFetch('/operativos')
    if (!response.ok) throw response
    const payload = await response.json()
    const data = payload.data || []
    setOperativos(data)
    setCachedData('/operativos', data)
  }

  useEffect(() => {
    setLoadError('')
    loadOperativos().catch(() => setLoadError('No se pudo cargar el módulo de operativos.')).finally(() => setLoading(false))
    apiFetch('/personal')
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((r) => setPersonal((r.data || []).filter((p) => p.estado === 'ACTIVO')))
      .catch(() => setPersonal([]))
  }, [])

  useEffect(() => setPage(1), [search, estado, fechaFiltro])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return operativos.filter((op) => {
      const text = `${op.nombre || ''} ${op.lugar || ''} ${op.fecha || ''}`.toLowerCase()
      const matchesSearch = text.includes(q)
      const matchesEstado = estado === 'TODOS' || op.estado === estado

      let matchesFecha = true
      if (fechaFiltro !== 'TODAS' && op.fecha) {
        const opDate = new Date(op.fecha)
        const now = new Date()
        if (fechaFiltro === 'HOY') {
          matchesFecha = opDate.toDateString() === now.toDateString()
        } else if (fechaFiltro === 'SEMANA') {
          const diffMs = now.getTime() - opDate.getTime()
          const diffDays = diffMs / (1000 * 60 * 60 * 24)
          matchesFecha = diffDays >= 0 && diffDays <= 7
        } else if (fechaFiltro === 'MES') {
          matchesFecha = opDate.getMonth() === now.getMonth() && opDate.getFullYear() === now.getFullYear()
        }
      }

      return matchesSearch && matchesEstado && matchesFecha
    })
  }, [operativos, search, estado, fechaFiltro])

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  const activos = operativos.filter((op) => ['PROGRAMADO', 'EN_CURSO'].includes(op.estado)).length
  const finalizados = operativos.filter((op) => op.estado === 'FINALIZADO').length
  const papeletas = operativos.reduce((acc, op) => acc + Number(op.total_papeletas || 0), 0)

  const openCreate = () => {
    setForm(initialForm)
    setEditing(null)
    setModalOpen(true)
  }

  const fillFormFromOperativo = (op) => {
    setForm({
      nombre: op.nombre || '',
      lugar: op.lugar || '',
      fecha: op.fecha || initialForm.fecha,
      hora_inicio: (op.hora_inicio || '08:00').slice(0, 5),
      estado: op.estado || 'PROGRAMADO',
      observacion: op.observacion || '',
      inspectores: (op.inspectores || []).map((i) => String(i.id_inspector)),
    })
    setEditing(op)
    setModalOpen(true)
  }

  const openEdit = async (op) => {
    try {
      const response = await apiFetch(`/operativos/${op.id}`)
      if (!response.ok) throw response
      const result = await response.json()
      fillFormFromOperativo(result.data || op)
    } catch (_) {
      fillFormFromOperativo(op)
    }
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
    if (!window.confirm('¿Eliminar este operativo? Solo se eliminará si no tiene papeletas vinculadas.')) return
    const response = await apiFetch(`/operativos/${id}`, { method: 'DELETE' })
    if (response.ok) {
      const next = operativos.filter((op) => op.id !== id)
      setOperativos(next)
      setCachedData('/operativos', next)
      return
    }
    const result = await response.json().catch(() => ({}))
    alert(result.message || result.messages?.error || 'No se pudo eliminar el operativo.')
  }

  const openDetail = async (op) => {
    const response = await apiFetch(`/operativos/${op.id}`)
    if (!response.ok) return
    const result = await response.json()
    setDetail(result.data)
  }

  const badgeClass = (value) => ({
    PROGRAMADO: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',
    EN_CURSO: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    FINALIZADO: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
    CANCELADO: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300',
  }[value] || 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300')

  const papeletaBadgeClass = (estado) => {
    switch (estado) {
      case 'PAGADA':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
      case 'PENDIENTE':
      case 'PENDIENTE_PAGO':
      case 'POR_PAGAR':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
      case 'ANULADA':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
    }
  }

  const money = (value) => new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
  }).format(Number(value || 0))

  const formatHora = (timeStr) => {
    if (!timeStr) return ''
    const s = String(timeStr).trim()
    if (s.includes('AM') || s.includes('PM')) return s
    const parts = s.split(':')
    if (parts.length < 2) return timeStr
    const hours = parseInt(parts[0], 10)
    const minutes = parts[1].slice(0, 2)
    if (isNaN(hours)) return timeStr
    const period = hours >= 12 ? 'PM' : 'AM'
    const hours12 = hours % 12 || 12
    return `${String(hours12).padStart(2, '0')}:${minutes} ${period}`
  }

  const formatFecha = (dateStr) => {
    if (!dateStr) return ''
    const [year, month, day] = String(dateStr).slice(0, 10).split('-')
    if (!year || !month || !day) return dateStr
    return `${day}/${month}/${year}`
  }

  const formatFechaHora = (dateTimeStr) => {
    if (!dateTimeStr) return ''
    const [datePart, timePart] = String(dateTimeStr).trim().split(' ')
    if (datePart && timePart) {
      return `${formatFecha(datePart)} ${formatHora(timePart)}`
    }
    return dateTimeStr
  }

  const safeText = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

  const reportRows = (op) => (op?.papeletas || []).map((p) => ({
    papeleta: p.numero_papeleta || '',
    fecha: formatFechaHora(p.fecha_hora),
    lugar: p.lugar || op.lugar || '',
    inspector: p.inspector || 'Inspector Municipal',
    intervenido: p.intervenido || 'No identificado',
    dni: p.conductor_dni || 'S/D',
    placa: p.placa || 'SIN PLACA',
    infraccion: p.infracciones || '—',
    monto: Number(p.monto_total || 0).toFixed(2),
    estado: p.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : (p.estado || ''),
  }))

  const reportFileName = (op, extension) => {
    const name = String(op?.nombre || 'operativo')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
    return `reporte-${name || 'operativo'}-${formatFecha(op?.fecha).replaceAll('/', '-')}.${extension}`
  }

  const buildReportTableHtml = (op) => {
    const rows = reportRows(op)
    const body = rows.map((r) => `
      <tr>
        <td>${safeText(r.papeleta)}</td>
        <td>${safeText(r.fecha)}</td>
        <td>${safeText(r.lugar)}</td>
        <td>${safeText(r.inspector)}</td>
        <td>${safeText(r.intervenido)}</td>
        <td>${safeText(r.dni)}</td>
        <td>${safeText(r.placa)}</td>
        <td>${safeText(r.infraccion)}</td>
        <td style="text-align:right">${safeText(r.monto)}</td>
        <td>${safeText(r.estado)}</td>
      </tr>
    `).join('')

    return `
      <table>
        <thead>
          <tr>
            <th>Papeleta</th>
            <th>Fecha / hora</th>
            <th>Lugar</th>
            <th>Inspector</th>
            <th>Intervenido</th>
            <th>DNI</th>
            <th>Placa</th>
            <th>Infracción</th>
            <th>Monto S/</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
    `
  }

  const exportOperativoExcel = (op) => {
    const html = `
      <html>
        <head><meta charset="UTF-8" /></head>
        <body>
          <h2>${safeText(op.nombre)}</h2>
          <p><strong>Lugar:</strong> ${safeText(op.lugar)} | <strong>Fecha:</strong> ${safeText(formatFecha(op.fecha))} | <strong>Hora:</strong> ${safeText(formatHora(op.hora_inicio))}${op.hora_fin ? ` - ${safeText(formatHora(op.hora_fin))}` : ''}</p>
          <p><strong>Total:</strong> ${op.papeletas?.length || 0} | <strong>Monto total:</strong> ${safeText(money(op.reporte?.monto_total))} | <strong>Registrado por:</strong> ${safeText(op.usuario_registra || 'No especificado')}</p>
          ${buildReportTableHtml(op)}
        </body>
      </html>
    `
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = reportFileName(op, 'xls')
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const exportOperativoPdf = (op) => {
    const printable = window.open('', '_blank', 'width=1200,height=800')
    if (!printable) {
      alert('No se pudo abrir la vista para PDF. Permite ventanas emergentes en el navegador.')
      return
    }
    printable.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <title>${safeText(reportFileName(op, 'pdf'))}</title>
          <style>
            @page { size: A4 landscape; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; }
            h1 { margin: 0 0 4px; font-size: 22px; }
            p { margin: 4px 0; font-size: 12px; color: #334155; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 14px 0; }
            .card { border: 1px solid #dbe3ef; border-radius: 10px; padding: 10px; }
            .label { color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: 700; }
            .value { font-size: 18px; font-weight: 800; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; }
            th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 9px; }
            th, td { border: 1px solid #e2e8f0; padding: 6px; vertical-align: top; }
            .footer { margin-top: 10px; font-size: 10px; color: #64748b; }
          </style>
        </head>
        <body>
          <h1>${safeText(op.nombre)}</h1>
          <p><strong>Lugar:</strong> ${safeText(op.lugar)} · <strong>Fecha:</strong> ${safeText(formatFecha(op.fecha))} · <strong>Hora:</strong> ${safeText(formatHora(op.hora_inicio))}${op.hora_fin ? ` - ${safeText(formatHora(op.hora_fin))}` : ''}</p>
          <p><strong>Estado:</strong> ${safeText(op.estado)} · <strong>Registrado por:</strong> ${safeText(op.usuario_registra || 'No especificado')}</p>
          <div class="summary">
            <div class="card"><div class="label">Papeletas</div><div class="value">${op.papeletas?.length || 0}</div></div>
            <div class="card"><div class="label">Monto total</div><div class="value">${safeText(money(op.reporte?.monto_total))}</div></div>
            <div class="card"><div class="label">Pendientes</div><div class="value">${op.reporte?.pendientes ?? 0}</div></div>
            <div class="card"><div class="label">Pagadas</div><div class="value">${op.reporte?.pagadas ?? 0}</div></div>
          </div>
          ${buildReportTableHtml(op)}
          <div class="footer">Reporte generado desde el Sistema de Tránsito Municipal.</div>
          <script>
            window.onload = () => {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `)
    printable.document.close()
  }

  return (
    <section className="space-y-6">
      {loadError && <PageLoadError message={loadError} />}
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
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, lugar o fecha..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm font-semibold outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer">
              <option value="TODOS">Todos los estados</option>
              <option value="PROGRAMADO">Programado</option>
              <option value="EN_CURSO">En curso</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
            <select value={fechaFiltro} onChange={(e) => setFechaFiltro(e.target.value)} className="rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer">
              <option value="TODAS">Todas las fechas</option>
              <option value="HOY">Hoy</option>
              <option value="SEMANA">Últimos 7 días</option>
              <option value="MES">Este mes</option>
            </select>
            {(search || estado !== 'TODOS' || fechaFiltro !== 'TODAS') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setEstado('TODOS'); setFechaFiltro('TODAS') }}
                className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer transition-colors"
              >
                Limpiar Filtros
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50 text-xs font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900">
              <tr>
                <th className="px-5 py-3.5">Operativo</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Fecha / hora</th>
                <th className="px-5 py-3.5 text-center">Inspectores</th>
                <th className="px-5 py-3.5 text-center">Papeletas</th>
                <th className="px-5 py-3.5 text-center">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map((op) => (
                <tr key={op.id} className="transition-colors hover:bg-rose-50/30 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-4">
                    <p className="font-black text-slate-900 dark:text-white">{op.nombre}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{op.lugar}</p>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{formatFecha(op.fecha)}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{formatHora(op.hora_inicio)}{op.hora_fin ? ` - ${formatHora(op.hora_fin)}` : ''}</p>
                  </td>
                  <td className="px-5 py-4 text-center font-bold text-slate-700 dark:text-slate-300">{op.total_inspectores || 0}</td>
                  <td className="px-5 py-4 text-center font-bold text-slate-700 dark:text-slate-300">{op.total_papeletas || 0}</td>
                  <td className="px-5 py-4 text-center"><span className={`inline-block rounded-full px-3 py-1 text-xs font-black ${badgeClass(op.estado)}`}>{op.estado}</span></td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openDetail(op)} className="rounded-lg bg-sky-50 p-2 text-sky-600 hover:bg-sky-500 hover:text-white dark:bg-sky-950/50 dark:text-sky-400 dark:hover:bg-sky-600 transition-colors" title="Ver detalle"><Icon name="eye" className="size-4" /></button>
                      <button onClick={() => openEdit(op)} className="rounded-lg bg-amber-50 p-2 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/50 dark:text-amber-400 dark:hover:bg-amber-600 transition-colors" title="Editar"><Icon name="pencil" className="size-4" /></button>
                      <button onClick={() => remove(op.id)} className="rounded-lg bg-rose-50 p-2 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-950/50 dark:text-rose-400 dark:hover:bg-rose-600 transition-colors" title="Eliminar"><Icon name="trash" className="size-4" /></button>
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
              <label className="text-sm font-bold">Inicio<input required type="time" value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900" /></label>
              <label className="text-sm font-bold">Estado<select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-900"><option>PROGRAMADO</option><option>EN_CURSO</option><option>FINALIZADO</option><option>CANCELADO</option></select></label>
              {editing && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                  <p className="font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Hora de fin</p>
                  <p className="mt-1">
                    {editing.estado === 'FINALIZADO' && editing.hora_fin
                      ? `Finalizado a las ${formatHora(editing.hora_fin)}.`
                      : 'Se registrará automáticamente cuando el estado cambie a FINALIZADO. Si se cancela, no se registra hora de fin.'}
                  </p>
                </div>
              )}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
          <div className="flex max-h-[94dvh] w-full max-w-[92rem] flex-col rounded-3xl bg-white p-4 shadow-2xl dark:bg-[#0f172a]">
            <div className="mb-3 shrink-0 flex items-start justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{detail.nombre}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {detail.lugar} · {formatFecha(detail.fecha)} · <span className="font-semibold text-slate-700 dark:text-slate-300">{formatHora(detail.hora_inicio)}{detail.hora_fin ? ` - ${formatHora(detail.hora_fin)}` : ''}</span>
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-white transition-colors">✕</button>
            </div>

            <div className="mb-3 shrink-0 grid gap-3 sm:grid-cols-4">
              {[
                ['Papeletas', detail.reporte?.total_papeletas ?? detail.papeletas?.length ?? 0],
                ['Monto total', money(detail.reporte?.monto_total)],
                ['Pendientes', detail.reporte?.pendientes ?? 0],
                ['Pagadas', detail.reporte?.pagadas ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900/50">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-0.5 text-xl font-black text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="shrink-0 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20">
                <p className="text-sm font-black text-slate-900 dark:text-white">Inspectores asignados</p>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {(detail.inspectores || []).map((i) => (
                    <div key={i.id} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <span className="size-1.5 rounded-full bg-rose-500" />
                      <span>{i.nombres} {i.apellido_paterno} {i.apellido_materno}</span>
                    </div>
                  ))}
                  {!detail.inspectores?.length && <p className="text-sm text-slate-500 italic">Sin inspectores asignados.</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-3 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/20">
                <p className="text-sm font-black text-slate-900 dark:text-white">Datos del operativo</p>
                <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
                  <p><span className="font-bold text-slate-600 dark:text-slate-400">Estado:</span> <span className={`inline-block ml-1 rounded-full px-2.5 py-0.5 text-xs font-black ${badgeClass(detail.estado)}`}>{detail.estado}</span></p>
                  <p><span className="font-bold text-slate-600 dark:text-slate-400">Registrado por:</span> <span className="text-slate-800 dark:text-slate-200 font-medium">{detail.usuario_registra || 'No especificado'}</span></p>
                  <p className="sm:col-span-2"><span className="font-bold text-slate-600 dark:text-slate-400">Observación:</span> <span className="text-slate-800 dark:text-slate-200">{detail.observacion || 'Sin observaciones'}</span></p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs">
              <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-700 dark:bg-slate-900/60 flex items-center justify-between">
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white">Reporte de papeletas del operativo</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportOperativoExcel(detail)}
                    className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-black text-emerald-700 transition-colors hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/50 dark:text-emerald-300"
                  >
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => exportOperativoPdf(detail)}
                    className="rounded-lg bg-rose-100 px-3 py-1.5 text-xs font-black text-rose-700 transition-colors hover:bg-rose-600 hover:text-white dark:bg-rose-950/50 dark:text-rose-300"
                  >
                    PDF
                  </button>
                  <span className="rounded-lg bg-slate-200/70 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    Total: {detail.papeletas?.length || 0}
                  </span>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full min-w-[1050px] text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                    <tr>
                      <th className="px-4 py-2 whitespace-nowrap min-w-[125px]">Papeleta</th>
                      <th className="px-4 py-2 whitespace-nowrap min-w-[170px]">Fecha / Lugar</th>
                      <th className="px-4 py-2 whitespace-nowrap min-w-[170px]">Inspector</th>
                      <th className="px-4 py-2 whitespace-nowrap min-w-[190px]">Intervenido</th>
                      <th className="px-4 py-2 whitespace-nowrap min-w-[110px] text-center">Placa</th>
                      <th className="px-4 py-2 whitespace-nowrap min-w-[110px] text-center">Infracción</th>
                      <th className="px-4 py-2 whitespace-nowrap min-w-[110px] text-right">Monto</th>
                      <th className="px-4 py-2 whitespace-nowrap min-w-[110px] text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(detail.papeletas || []).map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-2.5 whitespace-nowrap font-mono font-black text-slate-900 dark:text-white">
                          {p.numero_papeleta}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold whitespace-nowrap text-slate-800 dark:text-slate-200">{formatFechaHora(p.fecha_hora)}</p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[190px]" title={p.lugar || detail.lugar}>{p.lugar || detail.lugar}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                          {p.inspector || 'Inspector Municipal'}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{p.intervenido || 'No identificado'}</p>
                          <p className="text-[11px] text-slate-500 font-mono">DNI: {p.conductor_dni || 'S/D'}</p>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-center">
                          <span className="inline-block rounded-lg border border-slate-300 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-black tracking-widest text-slate-900 shadow-xs dark:border-slate-700 dark:bg-amber-400/10 dark:text-amber-300">
                            {p.placa || 'SIN PLACA'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {p.infracciones || '—'}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-right font-black text-slate-900 dark:text-white">
                          {money(p.monto_total)}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap text-center">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider ${papeletaBadgeClass(p.estado)}`}>
                            {p.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : p.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {!detail.papeletas?.length && (
                      <tr>
                        <td colSpan="8" className="px-5 py-10 text-center text-slate-500">Aún no hay papeletas vinculadas a este operativo.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
