import { useEffect, useState, useRef } from 'react'
import { showToast, showConfirm, showError, showSuccess } from '../utils/SwalUtil'
import { apiFetch, leerMensajeError } from '../config/api'
import { Pagination } from '../components/ui/Pagination'
import { Icon } from '../components/ui/Icon'
import { StatusBadge } from '../components/ui/StatusBadge'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { formatNumeroTarjeta } from '../utils/formatters'
import { FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'
import { puedeEliminarRegistros } from '../config/roles'

const emptyForm = { id_persona: '', cargo: '', id_unidad_organica: '', tipo_inspector: '', tipo_funcion: 'Titular', solicitud: '', documento: '', fecha_documento: '', firma_documento: '', fecha_termino: '', estado: 'ACTIVO' }

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'INACTIVO', label: 'Inactivos' },
]

function SearchableSelect({ id, label, value, onChange, options = [], className = '', required = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [openUpwards, setOpenUpwards] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      if (spaceBelow < 220 && rect.top > spaceBelow) {
        setOpenUpwards(true)
      } else {
        setOpenUpwards(false)
      }
    }
    setIsOpen(true)
    setQuery('')
  }

  const selectedOption = options.find((opt) => String(opt.value) === String(value))
  const displayValue = isOpen ? query : (selectedOption ? selectedOption.label : '')

  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div ref={containerRef} className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`}>
      <input
        id={id}
        type="text"
        title={displayValue}
        required={required}
        className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-3 pr-8 pt-4 pb-1 text-xs font-semibold text-slate-800 text-ellipsis overflow-hidden whitespace-nowrap outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:text-white"
        placeholder=" "
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
          if (!e.target.value) onChange({ target: { value: '' } })
        }}
        onFocus={handleOpen}
        onClick={handleOpen}
      />
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
      <label htmlFor={id} className={`pointer-events-none absolute left-3 right-8 truncate whitespace-nowrap select-none transition-all duration-150 ${isOpen || displayValue || query ? 'top-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400' : 'top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-slate-500'} ${isOpen ? '!text-blue-600 dark:!text-blue-400' : ''}`}>
        {label}
      </label>

      {isOpen && (
        <div className={`absolute left-0 right-0 ${openUpwards ? 'bottom-full mb-1' : 'top-full mt-1'} z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-2xl shadow-slate-900/15 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100`}>
          <div className="space-y-0.5">
            {filteredOptions.length > 0 ? filteredOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onChange({ target: { value: opt.value } })
                    setIsOpen(false)
                    setQuery('')
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold' : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'}`}
                >
                  <span className="text-left">{opt.label}</span>
                  {isSelected && (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-blue-600 dark:text-blue-400 shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            }) : (
              <p className="p-2 text-xs font-semibold text-slate-500 text-center">No se encontraron resultados</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RoundedSelect({ value, onChange, options = [], className = '', buttonClassName = '', dropdownClassName = '', placeholder = 'Seleccionar...' }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = options.find((opt) => opt.value === value)

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between gap-2 rounded-xl border bg-slate-50 py-1.5 px-3 text-xs font-bold text-slate-700 transition outline-none dark:bg-[var(--bg-subtle)] dark:text-slate-200 cursor-pointer ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400' : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border-strong)] dark:hover:border-slate-600'} ${buttonClassName}`}>
        <span className="whitespace-nowrap">{selectedOption?.label || placeholder}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`size-3 text-slate-400 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full mt-1 z-40 min-w-full w-max rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}>
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setIsOpen(false) }} className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold' : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'}`}>
                  <span className="whitespace-nowrap">{opt.label}</span>
                  {isSelected && (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-indigo-600 dark:text-indigo-400 shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export function Trabajadores() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [paginaHistorial, setPaginaHistorial] = useState(0)
  const [form, setForm] = useState(null)
  useEffect(() => { setPaginaHistorial(0) }, [form?.id])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [catalogos, setCatalogos] = useState({ cargos: [], unidades: [] })
  const [personasResultados, setPersonasResultados] = useState([])
  const [isSearchingPersona, setIsSearchingPersona] = useState(false)
  const [selectedPersonaObj, setSelectedPersonaObj] = useState(null)
  const [personaSearch, setPersonaSearch] = useState('')
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  useEffect(() => {
    let active = true
    apiFetch('/personal').then(async (response) => {
      if (!response.ok) throw new Error('No se pudo cargar los trabajadores. Intente nuevamente.')
      const result = await response.json()
      if (active) setRows(result.data || [])
    }).catch((e) => { if (active) setError(e.message) })
      .finally(() => { if (active) setLoading(false) })

    apiFetch('/personal/catalogos').then((r) => r.ok ? r.json() : { cargos: [], unidades: [] }).then((data) => {
      if (active) setCatalogos(data)
    }).catch(() => { if (active) setError('No se pudo cargar catálogos de trabajadores.') })

    return () => { active = false }
  }, [])

  // Búsqueda dinámica y debounced de personas (evita descargar 30,000 registros en memoria)
  useEffect(() => {
    const rawQuery = (personaSearch || '').trim()
    if (!rawQuery || rawQuery.includes('—') || rawQuery.length < 2) {
      return
    }
    const timer = setTimeout(() => {
      setIsSearchingPersona(true)
      apiFetch(`/personas?buscar=${encodeURIComponent(rawQuery)}&porPagina=10`)
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((payload) => {
          setPersonasResultados(payload.data || [])
        })
        .catch(() => { })
        .finally(() => setIsSearchingPersona(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [personaSearch])

  const filtered = rows.filter((row) => {
    const fullSearch = `${row.nombres} ${row.apellidos} ${row.numero_documento} ${row.cargo} ${row.unidad_organica} ${row.jerarquia} ${row.documento} ${row.solicitud}`.toLowerCase()
    const matchesSearch = fullSearch.includes(search.toLowerCase())
    const matchesEstado = filterEstado === 'TODOS' || row.estado === filterEstado
    return matchesSearch && matchesEstado
  })

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      await exportToExcel({
        filename: `Padron_Trabajadores_${new Date().toISOString().slice(0, 10)}.xls`,
        sheetName: 'Personal',
        title: 'PADRÓN INSTITUCIONAL DE TRABAJADORES Y FISCALIZADORES',
        subtitle: 'Subgerencia de Tránsito y Transporte - Gestión de Personal',
        metadata: [
          { label: 'Estado', value: filterEstado }
        ],
        columns: [
          { header: 'TIPO DOC', key: 'tipo_documento', width: 90, align: 'center' },
          { header: 'N° DOCUMENTO', key: 'numero_documento', isText: true, width: 120, align: 'center' },
          { header: 'NOMBRES', key: 'nombres', width: 140 },
          { header: 'APELLIDOS', key: 'apellidos', width: 160 },
          { header: 'CORREO', key: 'email', width: 200 },
          { header: 'CARGO', key: 'cargo', width: 180 },
          { header: 'UNIDAD ORGÁNICA', key: 'unidad_organica', width: 220 },
          { header: 'JERARQUÍA', key: 'jerarquia', width: 160 },
          { header: 'FUNCIÓN', key: 'tipo_funcion', width: 100, align: 'center' },
          { header: 'N° SOLICITUD', key: 'solicitud', isText: true, width: 130, align: 'center' },
          { header: 'DOC. DESIGNACIÓN', key: 'documento', width: 150 },
          { header: 'FECHA ALTA', key: 'fecha_documento', width: 110, align: 'center' },
          { header: 'VENCIMIENTO', render: (_, r) => r.fecha_termino || 'INDETERMINADO', width: 120, align: 'center' },
          { header: 'TIENE ACCESO', render: (_, r) => (r.tiene_cuenta ? 'SÍ' : 'NO'), width: 110, align: 'center' },
          { header: 'ESTADO', key: 'estado', width: 100, align: 'center' }
        ],
        data: filtered
      })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      await exportToPdf({
        filename: `Padron_Trabajadores_${new Date().toISOString().slice(0, 10)}`,
        subtitle: 'Subgerencia de Tránsito y Transporte · Padrón de Personal Municipal',
        summaryItems: [
          { label: 'Total registrados', value: rows.length },
          { label: 'Exportando', value: `${filtered.length} trabajadores` },
        ],
        columns: [
          { header: 'NOMBRES Y APELLIDOS', render: (_, r) => `${r.nombres || ''} ${r.apellidos || ''}`.trim(), width: 200 },
          { header: 'DOCUMENTO', render: (_, r) => `${r.tipo_documento || 'DNI'} ${r.numero_documento || ''}`.trim(), width: 110, align: 'center' },
          { header: 'CARGO', key: 'cargo', width: 160 },
          { header: 'UNIDAD ORGÁNICA', key: 'unidad_organica', width: 180 },
          { header: 'FUNCIÓN', key: 'tipo_funcion', width: 90, align: 'center' },
          { header: 'ESTADO', key: 'estado', width: 80, align: 'center' },
        ],
        data: filtered
      })
    } finally {
      setIsExportingPdf(false)
    }
  }

  const openForm = (record) => {
    setForm({ ...emptyForm, ...record, id_persona: record?.id_persona || record?.id || '' })
    if (record?.id) {
      setPersonaSearch(record?.numero_documento ? `${record.numero_documento} — ${record.nombres || ''} ${record.apellidos || ''}`.trim() : '')
      setSelectedPersonaObj({
        id: record.id_persona || record.id,
        nombres: record.nombres,
        apellidoPaterno: record.apellidos || '',
        numeroDocumento: record.numero_documento,
      })
    } else {
      setPersonaSearch('')
      setSelectedPersonaObj(null)
      setPersonasResultados([])
    }
    setPersonaDropdownOpen(false)
    setFormError('')
  }

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Desactivar trabajador?',
      'Se desactivará al trabajador conservando su historial. Su cuenta de acceso no se modifica.',
      'Sí, desactivar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (result.isConfirmed) {
      try {
        const response = await apiFetch(`/personal/${id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error(await leerMensajeError(response, 'No se pudo desactivar al trabajador.'))
        setRows(actual => actual.map(p => p.id === id ? { ...p, estado: 'INACTIVO' } : p))
        showToast('Trabajador desactivado correctamente')
      } catch (err) {
        showError('Error', err.message || 'No se pudo desactivar al trabajador.')
      }
    }
  }

  const selectedPersona = selectedPersonaObj || personasResultados.find((persona) => String(persona.id) === String(form?.id_persona))
  const personasDisponibles = personasResultados
    .filter((persona) => !rows.some((row) => String(row.id_persona || row.id) === String(persona.id)) || String(form?.id_persona) === String(persona.id))
    .slice(0, 8)

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setFormError('')
    try {
      const response = await apiFetch(form.id ? `/personal/${form.id}` : '/personal', { method: form.id ? 'PUT' : 'POST', body: form })
      const result = await response.json()
      if (!response.ok) throw new Error(result.messages ? Object.values(result.messages).join(' ') : 'No se pudo guardar el trabajador.')
      setRows((current) => form.id ? current.map((row) => String(row.id) === String(form.id) ? result.data : row) : [result.data, ...current])
      showToast(form.id ? 'Trabajador actualizado correctamente' : 'Trabajador registrado correctamente', form.id ? 'editar' : 'crear')
      setForm(null)
    } catch (e) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <section className="space-y-4">

      {/* 1. Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="workerBadge" className="size-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Gestión de Trabajadores
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas KPI con Bordes de Colores: 3 tarjetas para Personal */}
      <div className="kpi-grid">
        {/* Total Registrados */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total registrados</span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="people" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black leading-tight text-slate-800 dark:text-white">
              {loading ? <span className="animate-pulse text-slate-300 dark:text-slate-700">...</span> : error ? '—' : formatNumeroTarjeta(rows.length)}
            </p>
          </div>
        </div>

        {/* Activos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Trabajadores Activos</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black leading-tight text-slate-800 dark:text-white">
              {loading ? <span className="animate-pulse text-slate-300 dark:text-slate-700">...</span> : error ? '—' : formatNumeroTarjeta(rows.filter((r) => r.estado === 'ACTIVO').length)}
            </p>
          </div>
        </div>

        {/* Inactivos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Trabajadores Inactivos</span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black leading-tight text-slate-800 dark:text-white">
              {loading ? <span className="animate-pulse text-slate-300 dark:text-slate-700">...</span> : error ? '—' : formatNumeroTarjeta(rows.filter((r) => r.estado === 'INACTIVO').length)}
            </p>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {/* 3. Contenedor de la Tabla y Barra de Herramientas */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">

        {/* Toolbar */}
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, DNI o cargo"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-indigo-400"
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

          <div className="flex flex-wrap items-center gap-2">
            <RoundedSelect
              value={filterEstado}
              onChange={setFilterEstado}
              options={FILTER_ESTADO_OPTIONS}
            />

            {(filterEstado !== 'TODOS' || search !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterEstado('TODOS')
                  setSearch('')
                  setPage(1)
                }}
                title="Limpiar filtros"
                className="grid size-[34px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-4" />
              </button>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              title="Descargar padrón en Excel (.xls)"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
              disabled={isExportingExcel}>
              <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`} />
              <span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              title="Descargar o imprimir padrón en PDF"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
              disabled={isExportingPdf}>
              <Icon name={isExportingPdf ? "refresh" : "filePdf"} className={`size-3.5 text-rose-600 dark:text-rose-400 ${isExportingPdf ? 'animate-spin' : ''}`} />
              <span>{isExportingPdf ? 'Generando...' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={() => openForm(emptyForm)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap hover:opacity-90"
              style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Registrar trabajador</span>
            </button>
          </div>
        </div>

        {/* Grid Clean */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Trabajador</th>
                <th className="px-4 py-3 whitespace-nowrap">Cargo & Unidad</th>
                <th className="px-4 py-3 whitespace-nowrap">Asignación</th>
                <th className="px-4 py-3 whitespace-nowrap">Cuenta</th>
                <th className="px-4 py-3 whitespace-nowrap">Estado</th>
                <th className="sticky right-0 z-20 px-4 py-3 text-right whitespace-nowrap bg-slate-50/75 dark:bg-[var(--bg-subtle)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
              {visible.map((row) => (
                <tr key={row.id} className="group transition-colors hover:bg-[var(--brand-soft)] dark:hover:bg-[var(--bg-subtle)]">
                  {/* Trabajador */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-xs font-bold text-slate-900 dark:text-white" style={{ color: 'var(--text)' }}>
                      {row.nombres} {row.apellidos}
                    </p>
                    <div className="flex items-center gap-1.5 font-mono mt-0.5">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {row.tipo_documento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (row.tipo_documento || 'DNI')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white text-xs">
                        {row.numero_documento}
                      </span>
                    </div>
                  </td>

                  {/* Cargo & Unidad */}
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="truncate text-xs font-bold text-slate-700 dark:text-slate-200" title={row.cargo}>{row.cargo || 'Sin cargo'}</p>
                    <p className="truncate text-[11px] font-semibold text-slate-500" title={row.unidad_organica}>{row.unidad_organica || 'Sin unidad'}</p>
                    {row.jerarquia && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-500">{row.jerarquia}</p>}
                  </td>

                  {/* Asignación */}
                  <td className="px-4 py-3 max-w-[200px]">
                    {row.tipo_inspector && <p className="mb-1 text-xs font-semibold text-blue-800 dark:text-blue-300">{row.tipo_inspector === 'TECNICO' ? 'Inspección técnica · Sin cuenta' : 'Inspector de tránsito · Móvil'}</p>}
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{row.documento || 'Sin doc.'}</p>
                    <p className="text-[11px] font-medium text-slate-500">{row.fecha_documento || '—'}</p>
                    <span className="mt-1 inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">{row.tipo_funcion}</span>
                  </td>

                  {/* Cuenta */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${Number(row.tiene_cuenta) === 1 ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-50 text-slate-500 dark:bg-[var(--bg-subtle)] dark:text-slate-400'}`}>
                      {Number(row.tiene_cuenta) === 1 ? 'SÍ' : 'NO'}
                    </span>
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={row.estado} />
                  </td>

                  {/* Acciones */}
                  <td className="sticky right-0 z-10 px-4 py-3 text-right whitespace-nowrap group-hover:bg-[var(--brand-soft)] dark:group-hover:bg-slate-800/60 transition-colors" style={{ backgroundColor: 'var(--bg-surface)' }}>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => openForm(row)}
                        title="Editar trabajador"
                        className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                        style={{
                          backgroundColor: 'var(--action-edit-bg)',
                          borderColor: 'var(--action-edit-border)',
                          color: 'var(--action-edit-text)',
                          borderWidth: '1.5px',
                          borderStyle: 'solid',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--action-edit-hover)'
                          e.currentTarget.style.borderColor = 'var(--action-edit-hover)'
                          e.currentTarget.style.color = '#ffffff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--action-edit-bg)'
                          e.currentTarget.style.borderColor = 'var(--action-edit-border)'
                          e.currentTarget.style.color = 'var(--action-edit-text)'
                        }}
                      >
                        <Icon name="pencil" className="size-4" />
                      </button>

                      <button style={puedeEliminarRegistros() ? undefined : { display: 'none' }}
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        title="Desactivar trabajador"
                        className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                        style={{
                          backgroundColor: 'var(--action-del-bg)',
                          borderColor: 'var(--action-del-border)',
                          color: 'var(--action-del-text)',
                          borderWidth: '1.5px',
                          borderStyle: 'solid',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--action-del-hover)'
                          e.currentTarget.style.borderColor = 'var(--action-del-hover)'
                          e.currentTarget.style.color = '#ffffff'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--action-del-bg)'
                          e.currentTarget.style.borderColor = 'var(--action-del-border)'
                          e.currentTarget.style.color = 'var(--action-del-text)'
                        }}
                      >
                        <Icon name="trash" className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <div className="mx-auto flex flex-col items-center justify-center space-y-3">
                      <div className="size-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 dark:border-[var(--border)] dark:border-t-indigo-500"></div>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Cargando trabajadores...</p>
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Conectando con el servidor</p>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && !visible.length && (
                <tr>
                  <td colSpan={6} className="p-12 text-center">
                    <Icon name="workerBadge" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron trabajadores</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination currentPage={page} totalItems={filtered.length} itemsPerPage={pageSize} onPageChange={setPage} onItemsPerPageChange={setPageSize} />
      </div>

      {/* 4. Modal (Glassmorphism & Floating Labels - Estilo Personas) */}
      {form && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs animate-enter" onKeyDown={(e) => { if (e.key === 'Escape' && !saving) setForm(null) }}>
          <div className="flex min-h-full items-center justify-center p-3 sm:p-4">
            <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="personal-title" className="relative flex w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)]">

              {/* Header Modal - Estilo Personas.jsx */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[#1C2438]">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                    <Icon name="workerBadge" className="size-4" />
                  </span>
                  <h3 id="personal-title" className="text-base font-bold text-slate-900 dark:text-white">
                    {form.id ? 'Editar trabajador' : 'Nuevo trabajador'}
                  </h3>
                </div>
                <BotonCerrarModal onClick={() => setForm(null)} title="Cerrar" />
              </div>

              {/* Body Modal */}
              <div className="p-4 sm:p-5 space-y-0">

                {!form.id && (
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-blue-600" />
                      Asignar Persona
                    </h4>

                    <div className="relative">
                      <input
                        id="buscarPersona"
                        required
                        className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pb-1 pt-4 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:text-white"
                        placeholder=" "
                        value={personaSearch}
                        onFocus={() => {
                          setPersonaDropdownOpen(true)
                          if (personasResultados.length === 0 && !personaSearch) {
                            apiFetch('/personas?porPagina=10')
                              .then((r) => r.ok ? r.json() : { data: [] })
                              .then((payload) => setPersonasResultados(payload.data || []))
                              .catch(() => { })
                          }
                        }}
                        onBlur={() => { window.setTimeout(() => setPersonaDropdownOpen(false), 150) }}
                        onChange={(e) => {
                          setPersonaSearch(e.target.value)
                          setPersonaDropdownOpen(true)
                          setForm({ ...form, id_persona: '' })
                          setSelectedPersonaObj(null)
                        }}
                      />
                      <label htmlFor="buscarPersona" className="pointer-events-none absolute left-3 right-3 truncate whitespace-nowrap top-1/2 -translate-y-1/2 select-none text-xs font-medium text-slate-400 transition-all duration-150 peer-focus:top-1 peer-focus:-translate-y-0 peer-focus:text-[9.5px] peer-focus:font-bold peer-focus:text-blue-600 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[9.5px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-slate-500 dark:peer-[:not(:placeholder-shown)]:text-slate-400">
                        Buscar por DNI o Nombre...
                      </label>

                      {personaDropdownOpen && !selectedPersona && (
                        <div className="absolute left-0 top-full z-20 mt-1 p-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]">
                          {isSearchingPersona && (
                            <p className="p-2 text-xs font-semibold text-slate-400 text-center animate-pulse">Buscando en padrón...</p>
                          )}
                          {personasDisponibles.map((p) => (
                            <button key={p.id} type="button" onMouseDown={(e) => {
                              e.preventDefault(); e.stopPropagation();
                              setForm(c => ({ ...c, id_persona: p.id }));
                              setSelectedPersonaObj(p);
                              setPersonaSearch(`${p.numeroDocumento} — ${p.nombres} ${p.apellidoPaterno} ${p.apellidoMaterno || ''}`.trim());
                              setPersonaDropdownOpen(false);
                            }} className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60">
                              <span className="text-[13px] font-bold text-slate-900 dark:text-white">{p.nombres} {p.apellidoPaterno} {p.apellidoMaterno}</span>
                              <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">{p.tipoDocumento}: <span className="font-bold text-slate-700 dark:text-slate-300">{p.numeroDocumento}</span></span>
                            </button>
                          ))}
                          {!isSearchingPersona && !personasDisponibles.length && (
                            <p className="p-2 text-xs font-semibold text-slate-500 text-center">No hay personas disponibles para asignar.</p>
                          )}
                        </div>
                      )}
                    </div>
                    {selectedPersona && (
                      <div className="flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50 px-3 py-2 dark:border-emerald-900/60 dark:bg-emerald-950/40">
                        <div className="size-1.5 rounded-full bg-emerald-500" />
                        <p className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          Seleccionado: {selectedPersona.nombres} {selectedPersona.apellidoPaterno} · {selectedPersona.numeroDocumento}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {form.id && (
                  <fieldset className="mb-3 min-w-0 rounded-xl border border-slate-200 px-4 pb-3 pt-1 dark:border-[var(--border-strong)] dark:bg-[#1C2438]">
                    <legend className="px-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Persona Vinculada
                    </legend>
                    <div className="rounded-xl border border-white bg-white px-3 py-1.5 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] shadow-2xs">
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{form.nombres} {form.apellidos}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{form.tipo_documento}: {form.numero_documento}</p>
                    </div>
                  </fieldset>
                )}

                <fieldset className="mb-3 min-w-0 rounded-xl border border-slate-200 px-4 pb-3 pt-1 space-y-3 dark:border-[var(--border-strong)] dark:bg-[#1C2438]">
                  <legend className="px-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Datos Laborales
                  </legend>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <div className="relative sm:col-span-1">
                      <SearchableSelect
                        id="cargo"
                        label="Cargo"
                        required
                        value={form.cargo || ''}
                        onChange={(e) => setForm({ ...form, cargo: e.target.value })}
                        options={catalogos.cargos.map((c) => ({ value: c.nombre, label: c.nombre }))}
                      />
                    </div>

                    <div className="relative sm:col-span-1">
                      <SearchableSelect
                        id="unidad"
                        label="Unidad Orgánica"
                        value={form.id_unidad_organica || ''}
                        onChange={(e) => setForm({ ...form, id_unidad_organica: e.target.value })}
                        options={[
                          { value: '', label: 'Sin unidad asignada' },
                          ...catalogos.unidades.map(u => ({
                            value: String(u.id),
                            label: u.jerarquia && u.nombre !== u.jerarquia && !u.nombre.startsWith(u.jerarquia)
                              ? `${u.nombre} (${u.jerarquia})`
                              : u.nombre
                          }))
                        ]}
                      />
                    </div>

                    <div className="relative sm:col-span-2">
                      <FloatingInput id="solicitud" label="Solicitud / Motivo (Ej. Asignación, Desplazamiento)" value={form.solicitud || ''} onChange={(e) => setForm({ ...form, solicitud: e.target.value })} />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="mb-3 min-w-0 rounded-xl border border-slate-200 px-4 pb-3 pt-1 space-y-3 dark:border-[var(--border-strong)] dark:bg-[#1C2438]">
                  <legend className="px-2 text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">Documentación y Estado
                  </legend>
                  <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4">
                    <div className="sm:col-span-1 md:col-span-2">
                      <FloatingInput id="documento" label="Documento de Asignación" value={form.documento || ''} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
                    </div>
                    <div className="sm:col-span-1 md:col-span-2">
                      <FloatingInput id="firma" label="Firma del Documento (Quién autoriza)" value={form.firma_documento || ''} onChange={(e) => setForm({ ...form, firma_documento: e.target.value })} />
                    </div>

                    <FloatingInput id="f_doc" type="date" label="Fecha del Documento" value={form.fecha_documento || ''} onChange={(e) => setForm({ ...form, fecha_documento: e.target.value })} />
                    <FloatingInput id="f_term" type="date" label="Fecha de Término" value={form.fecha_termino || ''} onChange={(e) => setForm({ ...form, fecha_termino: e.target.value })} />

                    <FloatingSelect
                      id="t_funcion"
                      label="Tipo de Función"
                      value={form.tipo_funcion || 'Titular'}
                      onChange={(e) => setForm({ ...form, tipo_funcion: e.target.value })}
                      className={form.id ? '' : 'sm:col-span-2 md:col-span-2'}
                      options={[
                        { value: 'Titular', label: 'Titular' },
                        { value: 'Encargado', label: 'Encargado' },
                        { value: 'Operador', label: 'Operador' },
                      ]}
                    />
                    <FloatingSelect
                      id="tipo_inspector"
                      label="Tipo de inspector"
                      value={form.tipo_inspector || ''}
                      onChange={(e) => setForm({ ...form, tipo_inspector: e.target.value })}
                      options={[
                        { value: '', label: 'No corresponde' },
                        { value: 'TRANSITO', label: 'Tránsito (acceso móvil)' },
                        { value: 'TECNICO', label: 'Inspección técnica (sin cuenta)' },
                      ]}
                    />

                    {form.id && (
                      <FloatingSelect id="estado" label="Estado del Trabajador" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} options={[
                        { value: 'ACTIVO', label: 'ACTIVO' },
                        { value: 'INACTIVO', label: 'INACTIVO' },
                      ]} />
                    )}
                  </div>
                </fieldset>

                {form.id && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] shadow-none">
                    <p className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Estado de Cuenta de Usuario</p>
                    <p className={`mt-0.5 text-[11px] font-bold ${Number(form.tiene_cuenta) === 1 ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>
                      {Number(form.tiene_cuenta) === 1 ? 'El trabajador tiene un usuario activo en el sistema.' : 'No tiene usuario activo asociado.'}
                    </p>
                  </div>
                )}

                {form.historial?.length > 0 && (() => {
                  const POR_PAGINA = 2
                  const total = form.historial.length
                  const paginas = Math.ceil(total / POR_PAGINA)
                  const pagina = Math.min(paginaHistorial, paginas - 1)
                  const desde = pagina * POR_PAGINA
                  const visibles = form.historial.slice(desde, desde + POR_PAGINA)
                  const flecha = 'grid size-6 place-items-center rounded-full bg-white dark:bg-white/10 text-slate-500 shadow-xs transition enabled:hover:text-slate-900 enabled:cursor-pointer disabled:opacity-30'
                  return (
                    <fieldset className="relative mt-3 min-w-0 rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 pb-3 pt-1 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]">
                      {paginas > 1 && (
                        <div className="absolute -top-3 right-3 flex items-center gap-1.5 rounded-full bg-white px-1.5 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-[#1C2438]">
                          <button type="button" className={flecha} disabled={pagina === 0} onClick={() => setPaginaHistorial(pagina - 1)} aria-label="Registros más recientes" title="Más recientes">
                            <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                          </button>
                          <span>{desde + 1}–{Math.min(desde + POR_PAGINA, total)} de {total}</span>
                          <button type="button" className={flecha} disabled={pagina >= paginas - 1} onClick={() => setPaginaHistorial(pagina + 1)} aria-label="Registros anteriores" title="Más antiguos">
                            <svg className="size-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                      )}
                      <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-slate-400" />
                        Historial Laboral
                      </legend>
                      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
                        {visibles.map((h, idx) => (
                          <div key={desde + idx} className="border-l-2 border-slate-200 pl-2 dark:border-[var(--border-strong)]">
                            <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{h.cargo || 'Cargo no registrado'} · {h.unidad_organica || 'Sin unidad'}</p>
                            <p className="text-[10.5px] font-medium text-slate-500 mt-0.5">{h.documento || 'Sin doc.'} · {h.fecha_documento || 'Sin fecha'}</p>
                            <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">{h.tipo_funcion || 'Sin función'} {h.fecha_termino ? `(Terminó ${h.fecha_termino})` : '(Vigente)'}</p>
                            {h.solicitud && <p className="mt-1 line-clamp-2 text-[11px] font-medium italic text-slate-500">{h.solicitud}</p>}
                          </div>
                        ))}
                      </div>
                    </fieldset>
                  )
                })()}

                {formError && (
                  <div className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400 shadow-xs">
                    {formError}
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-[var(--border)] dark:bg-slate-900/80 rounded-b-3xl">
                <BotonCancelar onClick={() => setForm(null)} disabled={saving} />
                <BotonGuardar disabled={saving}>
                  {saving ? 'Guardando...' : 'Guardar trabajador'}
                </BotonGuardar>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
