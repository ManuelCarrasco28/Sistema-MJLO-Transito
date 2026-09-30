import { useEffect, useMemo, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { PageLoadError } from '../components/ui/PageLoadError'
import { RoundedSelect, FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData } from '../config/api'
import { showError, showConfirm, showToast } from '../utils/SwalUtil'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'

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

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'PROGRAMADO', label: 'Programado' },
  { value: 'EN_CURSO', label: 'En curso' },
  { value: 'FINALIZADO', label: 'Finalizado' },
  { value: 'CANCELADO', label: 'Cancelado' },
]

const FILTER_FECHA_OPTIONS = [
  { value: 'TODAS', label: 'Todas las fechas' },
  { value: 'HOY', label: 'Hoy' },
  { value: 'SEMANA', label: 'Últimos 7 días' },
  { value: 'MES', label: 'Este mes' },
]

export function Operativos({ user }) {
  const cached = getCachedData('/operativos')
  const [operativos, setOperativos] = useState(cached || [])
  const [personal, setPersonal] = useState([])
  const [loading, setLoading] = useState(!cached)
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('TODOS')
  const [fechaFiltro, setFechaFiltro] = useState('TODAS')
  const [page, setPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setPage(1)
  }
  const [modalOpen, setModalOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [totalFiltrado, setTotalFiltrado] = useState(0)

  const loadOperativos = async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(page),
      porPagina: String(itemsPerPage),
    })
    if (search) params.set('buscar', search)
    if (estado !== 'TODOS') params.set('estado', estado)
    if (fechaFiltro !== 'TODAS') params.set('fechaFiltro', fechaFiltro)
    if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }

    const response = await apiFetch(`/operativos?${params.toString()}`)
    if (!response.ok) throw response
    const payload = await response.json()
    const data = payload.data || []
    setOperativos(data)
    setTotalFiltrado(payload.meta?.total ?? data.length)
  }

  useEffect(() => {
    setLoadError('')
    loadOperativos()
      .catch(() => setLoadError('No se pudo cargar el módulo de operativos.'))
      .finally(() => setLoading(false))
  }, [page, itemsPerPage, search, estado, fechaFiltro, sortBy, sortDir])

  useEffect(() => {
    apiFetch('/personal?porPagina=100')
      .then((r) => r.ok ? r.json() : { data: [] })
      .then((r) => setPersonal((r.data || []).filter((p) => p.estado === 'ACTIVO')))
      .catch(() => {
        setPersonal([])
        showError('Personal no disponible', 'No se pudo cargar la lista de personal para asignación de operativos.')
      })
  }, [])

  useEffect(() => setPage(1), [search, estado, fechaFiltro])

  const [stats, setStats] = useState({ total: 0, activos: 0, finalizados: 0, papeletas: 0 })

  const loadStats = () => {
    apiFetch('/operativos/estadisticas')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((payload) => setStats(payload.data ?? {}))
      .catch(() => {})
  }

  useEffect(() => {
    loadStats()
  }, [])

  const filtered = operativos
  const visible = operativos

  const fetchTodoElFiltro = async () => {
    const params = new URLSearchParams()
    if (search) params.set('buscar', search)
    if (estado !== 'TODOS') params.set('estado', estado)
    if (fechaFiltro !== 'TODAS') params.set('fechaFiltro', fechaFiltro)
    if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }
    const res = await apiFetch(`/operativos?${params.toString()}`)
    if (!res.ok) return filtered
    const payload = await res.json()
    return payload.data || []
  }

  const handleExportExcel = async () => {
    const data = await fetchTodoElFiltro()
    exportToExcel({
      filename: `Operativos_Fiscalizacion_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: 'Operativos',
      title: 'REGISTRO DE OPERATIVOS DE CONTROL Y FISCALIZACIÓN DE TRÁNSITO',
      subtitle: 'Subgerencia de Tránsito y Transporte - Intervenciones en Vía Pública',
      metadata: [
        { label: 'Estado', value: estado },
        { label: 'Total Operativos', value: String(data.length) }
      ],
      columns: [
        { header: 'N° / CÓDIGO', render: (_, o) => `OP-${String(o.id).padStart(4, '0')}`, isText: true, width: 120, align: 'center' },
        { header: 'NOMBRE DEL OPERATIVO', key: 'nombre', width: 220 },
        { header: 'LUGAR / ZONA', key: 'lugar', width: 200 },
        { header: 'FECHA', key: 'fecha', width: 110, align: 'center' },
        { header: 'HORA INICIO', key: 'hora_inicio', width: 100, align: 'center' },
        { header: 'HORA FIN', render: (_, o) => o.hora_fin || '—', width: 100, align: 'center' },
        { header: 'INSPECTORES', render: (_, o) => String(o.inspectores_total || o.inspectores?.length || 0), width: 110, align: 'center' },
        { header: 'PAPELETAS', render: (_, o) => String(o.papeletas_total || 0), width: 100, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 120, align: 'center' },
        { header: 'OBSERVACIONES', render: (_, o) => o.observacion || '—', width: 240 }
      ],
      data
    })
  }

  const handleExportPdf = async () => {
    const data = await fetchTodoElFiltro()
    exportToPdf({
      filename: `Operativos_Fiscalizacion_${new Date().toISOString().slice(0, 10)}.pdf`,
      title: 'REGISTRO DE OPERATIVOS DE CONTROL Y FISCALIZACIÓN DE TRÁNSITO',
      subtitle: 'Subgerencia de Tránsito y Transporte - Intervenciones en Vía Pública',
      metadata: [
        { label: 'Estado', value: estado },
        { label: 'Total Operativos', value: String(data.length) }
      ],
      columns: [
        { header: 'N° / CÓDIGO', render: (_, o) => `OP-${String(o.id).padStart(4, '0')}`, width: 25, align: 'center' },
        { header: 'NOMBRE DEL OPERATIVO', key: 'nombre', width: 40 },
        { header: 'LUGAR / ZONA', key: 'lugar', width: 40 },
        { header: 'FECHA', key: 'fecha', width: 20, align: 'center' },
        { header: 'HORA INICIO', key: 'hora_inicio', width: 20, align: 'center' },
        { header: 'HORA FIN', render: (_, o) => o.hora_fin || '—', width: 20, align: 'center' },
        { header: 'INSPECTORES', render: (_, o) => String(o.inspectores_total || o.inspectores?.length || 0), width: 25, align: 'center' },
        { header: 'PAPELETAS', render: (_, o) => String(o.papeletas_total || 0), width: 20, align: 'center' },
        { header: 'ESTADO', key: 'estado', width: 25, align: 'center' }
      ],
      data
    })
  }

  const activos = stats.activos ?? 0
  const finalizados = stats.finalizados ?? 0
  const papeletas = stats.papeletas ?? 0

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
      loadStats()
      setModalOpen(false)
    } catch (error) {
      showError('Error', sanitizarMensaje(error.message, 'No se pudo guardar el operativo.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id) => {
    const result = await showConfirm(
      '¿Eliminar operativo?',
      'Solo se eliminará si no tiene papeletas vinculadas.',
      'Sí, eliminar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (!result.isConfirmed) return
    const response = await apiFetch(`/operativos/${id}`, { method: 'DELETE' })
    if (response.ok) {
      const next = operativos.filter((op) => op.id !== id)
      setOperativos(next)
      setCachedData('/operativos', next)
      loadStats()
      showToast('Operativo eliminado correctamente')
      return
    }
    const data = await response.json().catch(() => ({}))
    showError('Error', sanitizarMensaje(data.message || data.messages?.error, 'No se pudo eliminar el operativo.'))
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
  }[value] || 'bg-slate-100 text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300')

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
        return 'bg-slate-100 text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300 border border-slate-200 dark:border-[var(--border-strong)]'
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
            @page { size: A4 landscape; margin: 10mm 12mm 10mm 12mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; }
            h1 { margin: 0 0 4px; font-size: 20px; }
            p { margin: 4px 0; font-size: 11px; color: #334155; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
            .card { border: 1px solid #dbe3ef; border-radius: 8px; padding: 8px; }
            .label { color: #64748b; font-size: 9.5px; text-transform: uppercase; font-weight: 700; }
            .value { font-size: 16px; font-weight: 800; margin-top: 3px; }
            table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 6px; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; break-inside: avoid; }
            th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 9px; font-weight: 800; }
            th, td { border: 1px solid #e2e8f0; padding: 6px; vertical-align: top; }
            .footer { margin-top: 10px; font-size: 9px; color: #64748b; }
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
    <div className="space-y-4">
      {loadError && <PageLoadError message={loadError} />}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="operations" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Operativos</h1>
            <p className="text-xs font-medium text-slate-500">Programación, asignación de inspectores e historial de papeletas.</p>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-4">
        {[
          ['Total operativos', stats.total ?? 0, 'mapPin'],
          ['Activos', activos, 'operations'],
          ['Finalizados', finalizados, 'shieldCheck'],
          ['Papeletas vinculadas', papeletas, 'ticket'],
        ].map(([label, value, icon]) => (
          <div key={label} className="relative overflow-hidden rounded-xl border-[1.5px] border-purple-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">{label}</span>
              <span className="grid size-6 place-items-center rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/60">
                <Icon name={icon} className="size-3.5" />
              </span>
            </div>
            <div className="mt-1">
              <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{loading ? '—' : value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-[var(--border)]">
          <div className="relative w-full sm:max-w-xs">
            <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, lugar o fecha..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs font-semibold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RoundedSelect
              value={estado}
              onChange={setEstado}
              options={FILTER_ESTADO_OPTIONS}
            />
            <RoundedSelect
              value={fechaFiltro}
              onChange={setFechaFiltro}
              options={FILTER_FECHA_OPTIONS}
            />
            {(search || estado !== 'TODOS' || fechaFiltro !== 'TODAS') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setEstado('TODOS'); setFechaFiltro('TODAS') }}
                className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer transition-colors"
              >
                Limpiar
              </button>
            )}
            
            <button onClick={handleExportExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50 transition-colors">
              <Icon name="fileSpreadsheet" className="size-3.5 text-emerald-600 dark:text-emerald-400" /><span>Excel</span>
            </button>
            
            <button onClick={handleExportPdf} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300 dark:hover:bg-rose-900/50 transition-colors">
              <Icon name="filePdf" className="size-3.5 text-rose-600 dark:text-rose-400" /><span>PDF</span>
            </button>
            
            <button onClick={openCreate} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:opacity-90" style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}>
              <span className="text-base leading-none font-black">+</span><span>Nuevo</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-left text-xs sm:text-sm">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[20%]" />
              <col className="w-[13%]" />
              <col className="w-[13%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3"><SortableHeader column="nombre" label="Operativo" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 "><SortableHeader column="fecha" label="Fecha / hora" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 text-center">Inspectores</th>
                <th className="px-4 py-3 text-center">Papeletas</th>
                <th className="px-4 py-3 text-center"><SortableHeader column="estado" label="Estado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-4 py-3 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${loading && visible.length > 0 ? 'opacity-50' : ''}`}>
              {visible.map((op) => (
                <tr key={op.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-[var(--bg-subtle)]">
                  <td className="px-4 py-3">
                    <p className="font-bold text-slate-900 dark:text-white">{op.nombre}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{op.lugar}</p>
                  </td>
                  <td className="px-4 py-3 ">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{formatFecha(op.fecha)}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{formatHora(op.hora_inicio)}{op.hora_fin ? ` - ${formatHora(op.hora_fin)}` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">{op.total_inspectores || 0}</td>
                  <td className="px-4 py-3 text-center font-medium text-slate-700 dark:text-slate-300">{op.total_papeletas || 0}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge status={op.estado} /></td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1.5">
                      <button onClick={() => openDetail(op)} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-eye-bg)] border-[var(--action-eye-border)] text-[var(--action-eye-text)] hover:bg-[var(--action-eye-hover)] hover:border-[var(--action-eye-hover)] hover:text-white" title="Ver detalle"><Icon name="eye" className="size-4" /></button>
                      <button onClick={() => openEdit(op)} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-edit-bg)] border-[var(--action-edit-border)] text-[var(--action-edit-text)] hover:bg-[var(--action-edit-hover)] hover:border-[var(--action-edit-hover)] hover:text-white" title="Editar"><Icon name="pencil" className="size-4" /></button>
                      <button onClick={() => remove(op.id)} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-del-bg)] border-[var(--action-del-border)] text-[var(--action-del-text)] hover:bg-[var(--action-del-hover)] hover:border-[var(--action-del-hover)] hover:text-white" title="Eliminar"><Icon name="trash" className="size-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    {loading ? (
                      <p className="text-xs text-slate-500">Cargando operativos...</p>
                    ) : (
                      <>
                        <Icon name="operations" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron operativos</p>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalItems={totalFiltrado} itemsPerPage={itemsPerPage} onPageChange={setPage} onItemsPerPageChange={(size) => { setItemsPerPage(size); setPage(1) }} disabled={loading} />
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") setModalOpen(false); e.currentTarget.dataset.downOnOverlay = "" }}>
          <form onSubmit={save} className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-[var(--bg-surface)]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-xl font-black">{editing ? 'Editar operativo' : 'Nuevo operativo'}</h2>
              <button type="button" onClick={() => setModalOpen(false)} title="Cerrar" className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs">
                <Icon name="close" className="size-5" />
              </button>
            </div>
            
            <fieldset className="mb-5 rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
              <legend className="px-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Datos Generales</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <FloatingInput id="op_nombre" label="Nombre" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
                <FloatingInput id="op_lugar" label="Lugar" required value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} />
                <FloatingInput id="op_fecha" label="Fecha" type="date" required value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
                <FloatingInput id="op_hora_inicio" label="Inicio" type="time" required value={form.hora_inicio} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} />
                <FloatingSelect
                  id="op_estado"
                  label="Estado"
                  value={form.estado}
                  onChange={(e) => setForm({ ...form, estado: e.target.value })}
                  options={[
                    { value: 'PROGRAMADO', label: 'PROGRAMADO' },
                    { value: 'EN_CURSO', label: 'EN_CURSO' },
                    { value: 'FINALIZADO', label: 'FINALIZADO' },
                    { value: 'CANCELADO', label: 'CANCELADO' }
                  ]}
                />
                {editing && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 dark:border-[var(--border-strong)] dark:bg-slate-900/50 dark:text-slate-400">
                    <p className="font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">Hora de fin</p>
                    <p className="mt-1">
                      {editing.estado === 'FINALIZADO' && editing.hora_fin
                        ? `Finalizado a las ${formatHora(editing.hora_fin)}.`
                        : 'Se registrará automáticamente cuando el estado cambie a FINALIZADO. Si se cancela, no se registra hora de fin.'}
                    </p>
                  </div>
                )}
                <label className="text-sm font-bold sm:col-span-2">Observación<textarea value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)]" /></label>
              </div>
            </fieldset>

            <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
              <legend className="px-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Inspectores Asignados</legend>
              <div className="grid max-h-56 gap-2 overflow-y-auto sm:grid-cols-2">
                {personal.map((p) => (
                  <label key={p.id} className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-[var(--bg-subtle)]">
                    <input type="checkbox" checked={form.inspectores.includes(String(p.id))} onChange={() => toggleInspector(p.id)} />
                    <span className="font-semibold">{p.nombres} {p.apellidos}</span>
                  </label>
                ))}
                {!personal.length && <p className="text-sm text-slate-500">No hay inspectores/trabajadores activos disponibles.</p>}
              </div>
            </fieldset>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2 text-sm font-bold text-white hover:opacity-90" style={{ backgroundColor: 'oklch(71.2% 0.194 13.428)' }}>Cancelar</button>
              <button disabled={saving} className="rounded-xl px-5 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60" style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}>{saving ? 'Guardando...' : 'Guardar operativo'}</button>
            </div>
          </form>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-xs">
          <div className="flex max-h-[94dvh] w-full max-w-[92rem] flex-col rounded-2xl bg-white p-4 shadow-2xl dark:bg-[var(--bg-surface)]">
            <div className="mb-3 shrink-0 flex items-start justify-between border-b border-slate-100 pb-3 dark:border-[var(--border)]">
              <div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{detail.nombre}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {detail.lugar} · {formatFecha(detail.fecha)} · <span className="font-semibold text-slate-700 dark:text-slate-300">{formatHora(detail.hora_inicio)}{detail.hora_fin ? ` - ${formatHora(detail.hora_fin)}` : ''}</span>
                </p>
              </div>
              <button onClick={() => setDetail(null)} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-[var(--bg-subtle)] dark:hover:text-white transition-colors">✕</button>
            </div>

            <div className="mb-3 shrink-0 grid gap-3 sm:grid-cols-4">
              {[
                ['Papeletas', detail.reporte?.total_papeletas ?? detail.papeletas?.length ?? 0],
                ['Monto total', money(detail.reporte?.monto_total)],
                ['Pendientes', detail.reporte?.pendientes ?? 0],
                ['Pagadas', detail.reporte?.pagadas ?? 0],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[var(--border-strong)] dark:bg-slate-900/50">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-0.5 text-xl font-black text-slate-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="shrink-0 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-3 dark:border-[var(--border-strong)] bg-slate-50/40 dark:bg-slate-900/20">
                <p className="text-sm font-black text-slate-900 dark:text-white">Inspectores asignados</p>
                <div className="mt-2 grid gap-1 sm:grid-cols-2">
                  {(detail.inspectores || []).map((i) => (
                    <div key={i.id} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                      <span className="size-1.5 rounded-full bg-purple-500" />
                      <span>{i.nombres} {i.apellido_paterno} {i.apellido_materno}</span>
                    </div>
                  ))}
                  {!detail.inspectores?.length && <p className="text-sm text-slate-500 italic">Sin inspectores asignados.</p>}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-3 dark:border-[var(--border-strong)] bg-slate-50/40 dark:bg-slate-900/20">
                <p className="text-sm font-black text-slate-900 dark:text-white">Datos del operativo</p>
                <div className="mt-2 grid gap-1.5 text-xs sm:grid-cols-2">
                  <p className="flex items-center gap-1.5"><span className="font-bold text-slate-600 dark:text-slate-400">Estado:</span> <StatusBadge status={detail.estado} /></p>
                  <p><span className="font-bold text-slate-600 dark:text-slate-400">Registrado por:</span> <span className="text-slate-800 dark:text-slate-200 font-medium">{detail.usuario_registra || 'No especificado'}</span></p>
                  <p className="sm:col-span-2"><span className="font-bold text-slate-600 dark:text-slate-400">Observación:</span> <span className="text-slate-800 dark:text-slate-200">{detail.observacion || 'Sin observaciones'}</span></p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-[var(--border-strong)] shadow-xs">
              <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] flex items-center justify-between">
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
                  <span className="rounded-lg bg-slate-200/70 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                    Total: {detail.papeletas?.length || 0}
                  </span>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:bg-[var(--bg-surface)] border-b border-slate-100 dark:border-[var(--border)]">
                    <tr>
                      <th className="px-4 py-2 ">Papeleta</th>
                      <th className="px-4 py-2 ">Fecha / Lugar</th>
                      <th className="px-4 py-2 ">Inspector</th>
                      <th className="px-4 py-2 ">Intervenido</th>
                      <th className="px-4 py-2 text-center">Placa</th>
                      <th className="px-4 py-2 text-center">Infracción</th>
                      <th className="px-4 py-2 text-right">Monto</th>
                      <th className="px-4 py-2 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                    {(detail.papeletas || []).map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-[var(--bg-subtle)]">
                        <td className="px-4 py-2.5 font-mono font-black text-slate-900 dark:text-white">
                          {p.numero_papeleta}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold whitespace-nowrap text-slate-800 dark:text-slate-200">{formatFechaHora(p.fecha_hora)}</p>
                          <p className="text-[11px] text-slate-500">{p.lugar || detail.lugar}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 dark:text-slate-300 font-medium">
                          {p.inspector || 'Inspector Municipal'}
                        </td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{p.intervenido || 'No identificado'}</p>
                          <p className="text-[11px] text-slate-500 font-mono">DNI: {p.conductor_dni || 'S/D'}</p>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-block rounded-lg border border-slate-300 bg-amber-50 px-2 py-0.5 font-mono text-[11px] font-black tracking-widest text-slate-900 shadow-xs dark:border-[var(--border-strong)] dark:bg-amber-400/10 dark:text-amber-300">
                            {p.placa || 'SIN PLACA'}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                          {p.infracciones || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-900 dark:text-white">
                          {money(p.monto_total)}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <StatusBadge status={p.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : p.estado} />
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
    </div>
  )
}
export default Operativos
