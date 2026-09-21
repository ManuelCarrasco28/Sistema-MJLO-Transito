import { useEffect, useState, useRef } from 'react'
import { apiFetch } from '../config/api'
import { Pagination } from '../components/ui/Pagination'
import { Icon } from '../components/ui/Icon'
import { StatusBadge } from '../components/ui/StatusBadge'

const emptyForm = { id_persona: '', cargo: '', id_unidad_organica: '', tipo_funcion: 'Titular', solicitud: '', documento: '', fecha_documento: '', firma_documento: '', fecha_termino: '', estado: 'ACTIVO' }

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'INACTIVO', label: 'Inactivos' },
]

function FloatingInput({ id, label, type = "text", ...props }) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-4 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        placeholder=" "
        autoComplete="off"
        {...props}
      />
      <label
        htmlFor={id}
        className="pointer-events-none absolute left-3 right-3 truncate whitespace-nowrap top-1/2 -translate-y-1/2 select-none text-xs font-medium text-slate-400 transition-all duration-150 peer-focus:top-1 peer-focus:-translate-y-0 peer-focus:text-[9.5px] peer-focus:font-bold peer-focus:text-blue-600 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[9.5px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-slate-500 dark:peer-[:not(:placeholder-shown)]:text-slate-400"
      >
        {label}
      </label>
    </div>
  )
}

function FloatingSelect({ id, label, value, onChange, options = [], className = '' }) {
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

  const selectedOption = options.find((opt) => String(opt.value) === String(value)) || options[0]

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 pt-3.5 pb-1 text-left text-xs font-semibold text-slate-800 outline-none transition-all dark:bg-slate-900 dark:text-white cursor-pointer ${isOpen
            ? 'border-blue-500 ring-1 ring-blue-500/20 dark:border-blue-400'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
          }`}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`size-3 text-slate-400 transition-transform duration-150 shrink-0 ml-1.5 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <label htmlFor={id} className={`pointer-events-none absolute left-3 top-1 text-[9.5px] font-bold select-none transition-all duration-150 ${isOpen ? '!text-blue-600 dark:!text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </label>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-100">
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = String(opt.value) === String(value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange({ target: { value: opt.value } })
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${isSelected
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                      : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                    }`}
                >
                  <span className="whitespace-nowrap">{opt.label}</span>
                  {isSelected && (
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-3 text-blue-600 dark:text-blue-400 shrink-0">
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

function SearchableSelect({ id, label, value, onChange, options = [], className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
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

  const selectedOption = options.find((opt) => String(opt.value) === String(value))
  const displayValue = isOpen ? query : (selectedOption ? selectedOption.label : '')

  const filteredOptions = options.filter(opt => opt.label.toLowerCase().includes(query.toLowerCase()))

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        id={id}
        type="text"
        title={displayValue}
        className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white pl-3 pr-8 pt-4 pb-1 text-xs font-semibold text-slate-800 text-ellipsis overflow-hidden whitespace-nowrap outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        placeholder=" "
        value={displayValue}
        onChange={(e) => {
          setQuery(e.target.value)
          setIsOpen(true)
          if (!e.target.value) onChange({ target: { value: '' } })
        }}
        onFocus={() => {
          setIsOpen(true)
          setQuery('')
        }}
      />
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`pointer-events-none absolute right-3 top-1/2 size-3 -translate-y-1/2 text-slate-400 transition-transform duration-150 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''}`}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
      <label htmlFor={id} className={`pointer-events-none absolute left-3 right-8 truncate whitespace-nowrap select-none transition-all duration-150 ${isOpen || displayValue || query ? 'top-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400' : 'top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-slate-500'} ${isOpen ? '!text-blue-600 dark:!text-blue-400' : ''}`}>
        {label}
      </label>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-100">
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
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-between gap-2 rounded-xl border bg-slate-50 py-1.5 px-3 text-xs font-bold text-slate-700 transition outline-none dark:bg-slate-800 dark:text-slate-200 cursor-pointer ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400' : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'} ${buttonClassName}`}>
        <span className="whitespace-nowrap">{selectedOption?.label || placeholder}</span>
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`size-3 text-slate-400 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute right-0 top-full mt-1 z-40 min-w-full w-max rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-slate-700 dark:bg-slate-800 animate-in fade-in zoom-in-95 duration-100 ${dropdownClassName}`}>
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
  const [pageSize, setPageSize] = useState(8)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [catalogos, setCatalogos] = useState({ cargos: [], unidades: [] })
  const [personas, setPersonas] = useState([])
  const [personaSearch, setPersonaSearch] = useState('')
  const [personaDropdownOpen, setPersonaDropdownOpen] = useState(false)

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

  useEffect(() => {
    let active = true
    if (form !== null && personas.length === 0) {
      apiFetch('/personas').then((r) => r.ok ? r.json() : { data: [] }).then((data) => {
        if (active) setPersonas(data.data || [])
      }).catch(() => { if (active) setError('No se pudo cargar personas para asignar trabajadores.') })
    }
    return () => { active = false }
  }, [form, personas.length])

  const filtered = rows.filter((row) => {
    const fullSearch = `${row.nombres} ${row.apellidos} ${row.numero_documento} ${row.cargo} ${row.unidad_organica} ${row.jerarquia} ${row.documento} ${row.solicitud}`.toLowerCase()
    const matchesSearch = fullSearch.includes(search.toLowerCase())
    const matchesEstado = filterEstado === 'TODOS' || row.estado === filterEstado
    return matchesSearch && matchesEstado
  })
  
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize)
  
  const openForm = (record) => {
    setForm({ ...emptyForm, ...record, id_persona: record?.id_persona || record?.id || '' })
    setPersonaSearch(record?.id ? `${record.numero_documento || ''} — ${record.nombres || ''} ${record.apellidos || ''}`.trim() : '')
    setPersonaDropdownOpen(false)
    setFormError('')
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro de desactivar/eliminar a este trabajador?')) {
      try {
        await apiFetch(`/personal/${id}`, { method: 'DELETE' })
        setRows(rows.filter((p) => p.id !== id))
      } catch (err) {
        alert('No se pudo eliminar al trabajador.')
      }
    }
  }

  const selectedPersona = personas.find((persona) => String(persona.id) === String(form?.id_persona))
  const personasDisponibles = personas
    .filter((persona) => !rows.some((row) => String(row.id_persona || row.id) === String(persona.id)) || String(form?.id_persona) === String(persona.id))
    .filter((persona) => {
      const query = personaSearch.trim().toLowerCase()
      if (!query) return true
      return `${persona.numeroDocumento} ${persona.nombres} ${persona.apellidoPaterno} ${persona.apellidoMaterno}`.toLowerCase().includes(query)
    })
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
      setForm(null)
    } catch (e) { setFormError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <section className="space-y-4">
      
      {/* 1. Page Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
            <Icon name="workerBadge" className="size-5.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Gestión de Trabajadores
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Trabajadores y operadores del área de Tránsito y Seguridad Vial.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Tarjetas KPI con Bordes de Colores: 3 tarjetas para Personal */}
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3">
        {/* Total Registrados */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-indigo-500/80 dark:bg-[#0f172a] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total registrados</span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="people" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black leading-tight text-slate-800 dark:text-white">
              {loading ? <span className="animate-pulse text-slate-300 dark:text-slate-700">...</span> : error ? '—' : new Intl.NumberFormat('es-PE').format(rows.length)}
            </p>
          </div>
        </div>

        {/* Activos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-emerald-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Trabajadores Activos</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black leading-tight text-slate-800 dark:text-white">
              {loading ? <span className="animate-pulse text-slate-300 dark:text-slate-700">...</span> : error ? '—' : new Intl.NumberFormat('es-PE').format(rows.filter((r) => r.estado === 'ACTIVO').length)}
            </p>
          </div>
        </div>

        {/* Inactivos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-rose-500/80 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Trabajadores Inactivos</span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black leading-tight text-slate-800 dark:text-white">
              {loading ? <span className="animate-pulse text-slate-300 dark:text-slate-700">...</span> : error ? '—' : new Intl.NumberFormat('es-PE').format(rows.filter((r) => r.estado === 'INACTIVO').length)}
            </p>
          </div>
        </div>
      </div>
      
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}

      {/* 3. Contenedor de la Tabla y Barra de Herramientas */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">
        
        {/* Toolbar */}
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar trabajador, DNI, cargo o unidad..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-indigo-400"
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
              onClick={() => openForm(emptyForm)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Registrar trabajador</span>
            </button>
          </div>
        </div>
        
        {/* Grid Clean */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 dark:bg-slate-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Trabajador</th>
                <th className="px-4 py-3 whitespace-nowrap">Cargo & Unidad</th>
                <th className="px-4 py-3 whitespace-nowrap">Asignación</th>
                <th className="px-4 py-3 whitespace-nowrap">Cuenta</th>
                <th className="px-4 py-3 whitespace-nowrap">Estado</th>
                <th className="sticky right-0 z-20 px-4 py-3 text-right whitespace-nowrap bg-slate-50/75 dark:bg-slate-800/40">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {visible.map((row) => (
                <tr key={row.id} className="group transition-colors hover:bg-[var(--brand-soft)] dark:hover:bg-slate-800/40">
                  {/* Trabajador */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <p className="text-[13.5px] font-bold text-slate-900 dark:text-white" style={{ color: 'var(--text)' }}>
                      {row.nombres} {row.apellidos}
                    </p>
                    <div className="flex items-center gap-1.5 font-mono mt-0.5">
                      <span className="text-[11px] font-semibold text-slate-400">
                        {row.tipo_documento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (row.tipo_documento || 'DNI')}
                      </span>
                      <span className="font-bold text-slate-800 dark:text-white text-[13px]">
                        {row.numero_documento}
                      </span>
                    </div>
                  </td>
                  
                  {/* Cargo & Unidad */}
                  <td className="px-4 py-3 max-w-[240px]">
                    <p className="truncate text-[13px] font-bold text-slate-700 dark:text-slate-200" title={row.cargo}>{row.cargo || 'Sin cargo'}</p>
                    <p className="truncate text-xs font-semibold text-slate-500" title={row.unidad_organica}>{row.unidad_organica || 'Sin unidad'}</p>
                    {row.jerarquia && <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-500">{row.jerarquia}</p>}
                  </td>
                  
                  {/* Asignación */}
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="text-[12.5px] font-bold text-slate-700 dark:text-slate-300">{row.documento || 'Sin doc.'}</p>
                    <p className="text-xs font-medium text-slate-500">{row.fecha_documento || '—'}</p>
                    <span className="mt-1 inline-block rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">{row.tipo_funcion}</span>
                  </td>
                  
                  {/* Cuenta */}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${Number(row.tiene_cuenta) === 1 ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                      {Number(row.tiene_cuenta) === 1 ? 'Sí' : 'No'}
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

                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        title="Eliminar trabajador"
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
                      <div className="size-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600 dark:border-slate-800 dark:border-t-indigo-500"></div>
                      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">Cargando trabajadores...</p>
                      <p className="text-xs font-medium text-slate-400 dark:text-slate-500">Conectando con el servidor</p>
                    </div>
                  </td>
                </tr>
              )}
              
              {!loading && !visible.length && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center" style={{ color: 'var(--text-muted)' }}>
                    <div className="mx-auto max-w-xs space-y-2">
                      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        <Icon name="workerBadge" className="size-6 opacity-40" />
                      </div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        No se encontraron trabajadores
                      </p>
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Intenta con otro término de búsqueda o modifica los filtros.
                      </p>
                    </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter" onKeyDown={(e) => { if (e.key === 'Escape' && !saving) setForm(null) }}>
          <form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="personal-title" className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
            
            {/* Header Modal - Estilo Personas.jsx */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Icon name="workerBadge" className="size-4" />
                </span>
                <h3 id="personal-title" className="text-base font-bold text-slate-900 dark:text-white">
                  {form.id ? 'Editar trabajador' : 'Nuevo trabajador'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setForm(null)}
                title="Cerrar"
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            {/* Body Modal */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-4.5 space-y-3">
              
              {!form.id && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-600" />
                    Asignar Persona
                  </h4>
                  
                  <div className="relative">
                    <input
                      id="buscarPersona"
                      required
                      className="peer flex h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pb-1 pt-4 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      placeholder=" "
                      value={personaSearch}
                      onFocus={() => setPersonaDropdownOpen(true)}
                      onBlur={() => { window.setTimeout(() => setPersonaDropdownOpen(false), 150) }}
                      onChange={(e) => {
                        setPersonaSearch(e.target.value)
                        setPersonaDropdownOpen(true)
                        setForm({ ...form, id_persona: '' })
                      }}
                    />
                    <label htmlFor="buscarPersona" className="pointer-events-none absolute left-3 right-3 truncate whitespace-nowrap top-1/2 -translate-y-1/2 select-none text-xs font-medium text-slate-400 transition-all duration-150 peer-focus:top-1 peer-focus:-translate-y-0 peer-focus:text-[9.5px] peer-focus:font-bold peer-focus:text-blue-600 peer-[:not(:placeholder-shown)]:top-1 peer-[:not(:placeholder-shown)]:-translate-y-0 peer-[:not(:placeholder-shown)]:text-[9.5px] peer-[:not(:placeholder-shown)]:font-bold peer-[:not(:placeholder-shown)]:text-slate-500 dark:peer-[:not(:placeholder-shown)]:text-slate-400">
                      Buscar por DNI o Nombre...
                    </label>

                    {personaDropdownOpen && !selectedPersona && (
                      <div className="absolute left-0 top-full z-20 mt-1 p-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
                        {personasDisponibles.map((p) => (
                          <button key={p.id} type="button" onMouseDown={(e) => {
                              e.preventDefault(); e.stopPropagation();
                              setForm(c => ({...c, id_persona: p.id}));
                              setPersonaSearch(`${p.numeroDocumento} — ${p.nombres} ${p.apellidoPaterno} ${p.apellidoMaterno || ''}`.trim());
                              setPersonaDropdownOpen(false);
                          }} className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60">
                            <span className="text-[13px] font-bold text-slate-900 dark:text-white">{p.nombres} {p.apellidoPaterno} {p.apellidoMaterno}</span>
                            <span className="text-[11px] font-semibold text-slate-500 whitespace-nowrap">{p.tipoDocumento}: <span className="font-bold text-slate-700 dark:text-slate-300">{p.numeroDocumento}</span></span>
                          </button>
                        ))}
                        {!personasDisponibles.length && (
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
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-600" />
                    Persona Vinculada
                  </h4>
                  <div className="rounded-xl border border-white bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800 shadow-2xs">
                    <p className="text-sm font-black text-slate-900 dark:text-white">{form.nombres} {form.apellidos}</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{form.tipo_documento}: {form.numero_documento}</p>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-cyan-600" />
                  Datos Laborales
                </h4>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="relative sm:col-span-2">
                    <FloatingInput id="cargo" label="Cargo" list="cargos-list" required value={form.cargo || ''} onChange={(e) => setForm({ ...form, cargo: e.target.value })} />
                    <datalist id="cargos-list">{catalogos.cargos.map((c) => <option key={c.id} value={c.nombre} />)}</datalist>
                  </div>
                  
                  <div className="relative sm:col-span-2">
                    <SearchableSelect 
                      id="unidad" 
                      label="Unidad Orgánica" 
                      value={form.id_unidad_organica || ''} 
                      onChange={(e) => setForm({ ...form, id_unidad_organica: e.target.value })} 
                      options={[
                        { value: '', label: 'Sin unidad asignada' },
                        ...catalogos.unidades.map(u => ({ value: String(u.id), label: `${u.nombre} ${u.jerarquia ? `(${u.jerarquia})` : ''}` }))
                      ]}
                    />
                  </div>

                  <div className="relative sm:col-span-2">
                    <FloatingInput id="solicitud" label="Solicitud / Motivo (Ej. Asignación, Desplazamiento)" value={form.solicitud || ''} onChange={(e) => setForm({ ...form, solicitud: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-600" />
                  Documentación y Estado
                </h4>
                <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <FloatingInput id="documento" label="Documento de Asignación" value={form.documento || ''} onChange={(e) => setForm({ ...form, documento: e.target.value })} />
                  </div>
                  <div className="md:col-span-2">
                    <FloatingInput id="firma" label="Firma del Documento (Quién autoriza)" value={form.firma_documento || ''} onChange={(e) => setForm({ ...form, firma_documento: e.target.value })} />
                  </div>
                  
                  <FloatingInput id="f_doc" type="date" label="Fecha del Documento" value={form.fecha_documento || ''} onChange={(e) => setForm({ ...form, fecha_documento: e.target.value })} />
                  <FloatingInput id="f_term" type="date" label="Fecha de Término" value={form.fecha_termino || ''} onChange={(e) => setForm({ ...form, fecha_termino: e.target.value })} />
                  
                  <FloatingSelect id="t_funcion" label="Tipo de Función" value={form.tipo_funcion || 'Titular'} onChange={(e) => setForm({ ...form, tipo_funcion: e.target.value })} options={[
                    { value: 'Titular', label: 'Titular' },
                    { value: 'Encargado', label: 'Encargado' },
                    { value: 'Operador', label: 'Operador' },
                  ]} />

                  <FloatingSelect id="estado" label="Estado del Trabajador" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })} options={[
                    { value: 'ACTIVO', label: 'ACTIVO' },
                    { value: 'INACTIVO', label: 'INACTIVO' },
                  ]} />
                </div>
              </div>

              {form.id && (
                <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/50 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/20 shadow-xs">
                  <p className="text-[9px] font-black uppercase tracking-wider text-indigo-500">Estado de Cuenta de Usuario</p>
                  <p className={`mt-0.5 text-[11px] font-bold ${Number(form.tiene_cuenta) === 1 ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500'}`}>
                    {Number(form.tiene_cuenta) === 1 ? 'El trabajador tiene un usuario activo en el sistema.' : 'No tiene usuario activo asociado.'}
                  </p>
                </div>
              )}

              {form.historial?.length > 0 && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50 shadow-xs">
                  <p className="mb-2 text-[9px] font-black uppercase tracking-wider text-slate-400">Historial Laboral</p>
                  <div className="space-y-2">
                    {form.historial.map((h, idx) => (
                      <div key={idx} className="border-l-2 border-slate-200 pl-2 dark:border-slate-700">
                        <p className="text-[12px] font-bold text-slate-800 dark:text-slate-200">{h.cargo || 'Cargo no registrado'} · {h.unidad_organica || 'Sin unidad'}</p>
                        <p className="text-[10.5px] font-medium text-slate-500 mt-0.5">{h.documento || 'Sin doc.'} · {h.fecha_documento || 'Sin fecha'}</p>
                        <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">{h.tipo_funcion || 'Sin función'} {h.fecha_termino ? `(Terminó ${h.fecha_termino})` : '(Vigente)'}</p>
                        {h.solicitud && <p className="mt-1 text-[11px] font-medium italic text-slate-500">{h.solicitud}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formError && (
                <div className="mt-4 rounded-xl border border-rose-200/80 bg-rose-50 p-3 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-400 shadow-xs">
                  {formError}
                </div>
              )}
            </div>

            {/* Footer Modal - Estilo Personas.jsx */}
            <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <button type="button" disabled={saving} onClick={() => setForm(null)} className="rounded-xl border border-slate-200/80 bg-white px-5 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 shadow-xs cursor-pointer">
                Cancelar
              </button>
              <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-6 py-2 text-xs font-extrabold text-white shadow-md shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-lg active:scale-95 disabled:opacity-50 cursor-pointer dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-white dark:shadow-slate-50/20">
                {saving ? 'Guardando...' : 'Guardar trabajador'}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
