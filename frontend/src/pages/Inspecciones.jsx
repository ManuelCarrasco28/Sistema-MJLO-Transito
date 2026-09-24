import { useState, useEffect, useRef } from 'react'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/StatusBadge'
import { apiFetch, getCachedData, setCachedData, invalidateCache, leerMensajeError } from '../config/api'
import { CerticavFichaPrint } from '../components/documentos/TarjetaOperatividadPrint'
import { exportToExcel } from '../utils/exportToExcel'
import { showError } from '../utils/SwalUtil'

function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  try {
    const parts = fechaStr.split(/[- :T]/)
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(year, month, day)
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    return fechaStr
  } catch {
    return fechaStr
  }
}

function FloatingInput({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required = false,
  maxLength,
  optional = false,
  autoComplete = 'off',
  className = '',
  inputClassName = '',
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false)
  const isFloating = isFocused || (value !== undefined && value !== null && String(value).trim() !== '')

  return (
    <div className={`relative ${className}`}>
      <input
        id={id}
        type={type}
        required={required}
        maxLength={maxLength}
        value={value ?? ''}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoComplete={autoComplete}
        placeholder=" "
        className={`peer block h-[42px] w-full rounded-xl border border-slate-200 bg-white px-3 pt-3.5 pb-1 text-xs font-semibold text-slate-800 outline-none transition-all focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-blue-400 disabled:bg-slate-100/90 disabled:text-slate-600 disabled:cursor-not-allowed disabled:border-slate-200/70 dark:disabled:bg-slate-900/80 dark:disabled:text-slate-400 dark:disabled:border-slate-800 ${inputClassName}`}
        {...props}
      />
      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 select-none transition-all duration-150 ${isFloating
          ? 'top-1 text-[9.5px] font-bold text-slate-500 dark:text-slate-400'
          : 'top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 dark:text-slate-500'
          } ${isFocused ? '!text-blue-600 dark:!text-blue-400' : ''}`}
      >
        {label}
        {optional && (
          <span className="ml-1 text-[9px] font-normal text-slate-400 dark:text-slate-500">(Opcional)</span>
        )}
      </label>
    </div>
  )
}

function FloatingSelect({
  id,
  label,
  value,
  onChange,
  options = [],
  className = '',
  disabled = false,
}) {
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
        disabled={disabled}
        title={selectedOption?.label || ''}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`flex h-[42px] w-full items-center justify-between rounded-xl border bg-white px-3 pt-3.5 pb-1 text-left text-xs font-semibold text-slate-800 outline-none transition-all dark:bg-[var(--bg-subtle)] dark:text-white ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-[var(--bg-surface)]' : 'cursor-pointer'
          } ${isOpen
            ? 'border-blue-500 ring-1 ring-blue-500/20 dark:border-blue-400'
            : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border-strong)] dark:hover:border-slate-600'
          }`}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-3 text-slate-400 transition-transform duration-150 shrink-0 ml-1.5 ${isOpen ? 'rotate-180 text-blue-600 dark:text-blue-400' : ''
            }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <label
        htmlFor={id}
        className={`pointer-events-none absolute left-3 top-1 text-[9.5px] font-bold select-none transition-all duration-150 ${isOpen ? '!text-blue-600 dark:!text-blue-400' : 'text-slate-500 dark:text-slate-400'
          }`}
      >
        {label}
      </label>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-50 min-w-full sm:min-w-[380px] max-w-lg rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100 max-h-60 overflow-y-auto overflow-x-hidden">
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
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer ${isSelected
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold'
                    : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                    }`}
                >
                  <span className="text-left break-words leading-tight flex-1">{opt.label}</span>
                  {isSelected && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3 text-blue-600 dark:text-blue-400 shrink-0"
                    >
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

function RoundedSelect({
  value,
  onChange,
  options = [],
  className = '',
  buttonClassName = '',
  dropdownClassName = '',
  placeholder = 'Seleccionar',
}) {
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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-2 rounded-xl border bg-slate-50 py-1.5 px-3 text-xs font-bold text-slate-700 transition outline-none dark:bg-[var(--bg-subtle)] dark:text-slate-200 cursor-pointer ${isOpen
          ? 'border-indigo-500 ring-2 ring-indigo-500/20 dark:border-indigo-400'
          : 'border-slate-200 hover:border-slate-300 dark:border-[var(--border-strong)] dark:hover:border-slate-600'
          } ${buttonClassName}`}
      >
        <span className="whitespace-nowrap">{selectedOption?.label || placeholder}</span>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`size-3 text-slate-400 transition-transform duration-150 shrink-0 ${isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
            }`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 top-full mt-1 z-40 min-w-full w-max rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-y-auto ${dropdownClassName}`}
        >
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.value === value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value)
                    setIsOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${isSelected
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold'
                    : 'font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                    }`}
                >
                  <span className="whitespace-nowrap">{opt.label}</span>
                  {isSelected && (
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-3 text-indigo-600 dark:text-indigo-400 shrink-0"
                    >
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

// Escala la hoja A4 para que se vea completa en pantalla (la impresión usa
// una copia aparte en un portal, así que no se ve afectada).
function VistaPreviaEscalada({ ajustar, children }) {
  const contenedorRef = useRef(null)
  const hojaRef = useRef(null)
  const [escala, setEscala] = useState(1)
  const [alto, setAlto] = useState(0)

  useEffect(() => {
    const recalcular = () => {
      const c = contenedorRef.current
      const h = hojaRef.current
      if (!c || !h) return
      const s = ajustar ? Math.min(1, (c.clientHeight - 16) / h.scrollHeight, (c.clientWidth - 16) / h.scrollWidth) : 1
      setEscala(s)
      setAlto(h.scrollHeight * s)
    }
    recalcular()
    const ro = new ResizeObserver(recalcular)
    ro.observe(contenedorRef.current)
    ro.observe(hojaRef.current)
    return () => ro.disconnect()
  }, [ajustar])

  return (
    <div ref={contenedorRef} className={`flex-1 min-h-0 w-full flex justify-center ${ajustar ? 'overflow-hidden' : 'overflow-auto'}`}>
      <div style={{ height: alto || undefined }}>
        <div
          ref={hojaRef}
          className="bg-white shadow-xl ring-1 ring-slate-300 transition-transform duration-200"
          style={{ width: '210mm', transform: `scale(${escala})`, transformOrigin: 'top center' }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

const TOAST_DURACION_MS = 3500

// Verde al registrar, amarillo al editar, rojo al eliminar y rojo en errores.
const TOAST_ESTILOS = {
  crear: {
    etiqueta: 'Registrado',
    simbolo: '✓',
    caja: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/90 dark:border-emerald-700',
    icono: 'bg-emerald-600 text-white',
    titulo: 'text-emerald-700 dark:text-emerald-300',
    barra: 'bg-emerald-500',
  },
  editar: {
    etiqueta: 'Actualizado',
    simbolo: '✎',
    caja: 'bg-amber-50 border-amber-300 dark:bg-amber-950/90 dark:border-amber-700',
    icono: 'bg-amber-500 text-white',
    titulo: 'text-amber-700 dark:text-amber-300',
    barra: 'bg-amber-500',
  },
  eliminar: {
    etiqueta: 'Eliminado',
    simbolo: 'trash',
    caja: 'bg-rose-50 border-rose-300 dark:bg-rose-950/90 dark:border-rose-700',
    icono: 'bg-rose-600 text-white',
    titulo: 'text-rose-700 dark:text-rose-300',
    barra: 'bg-rose-500',
  },
  error: {
    etiqueta: 'Error',
    simbolo: '!',
    caja: 'bg-rose-100 border-rose-500 dark:bg-rose-950 dark:border-rose-500',
    icono: 'bg-rose-700 text-white',
    titulo: 'text-rose-800 dark:text-rose-200',
    barra: 'bg-rose-700',
  },
}

const FILTER_RESULTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los resultados' },
  { value: 'APROBADO', label: 'Aprobados' },
  { value: 'OBSERVADO', label: 'Observados' },
  { value: 'DESAPROBADO', label: 'Desaprobados' },
]

// Primera evaluación: se deriva del checklist, no se elige a mano.
// "No tiene" solo desaprueba en criterios obligatorios: la razón social, por
// ejemplo, no aplica a unidades independientes.
function calcularPrimeraEvaluacion(detalles, criterios = []) {
  const obligatorio = (criterioId) => criterios.find((c) => c.id === criterioId)?.obligatorio !== false
  const hayProblema = detalles.some(
    (d) => d.estado === 'MAL_ESTADO' || (d.estado === 'NO_TIENE' && obligatorio(d.criterioId))
  )
  return hayProblema ? 'DESAPROBADO' : 'APROBADO'
}

// Resultado final: aprobado directo si pasó la primera, o según la segunda
// evaluación (subsanación) cuando la primera fue desaprobada.
function calcularResultado(primeraEvaluacion, segundaEvaluacion) {
  if (primeraEvaluacion === 'APROBADO') return 'APROBADO'
  if (segundaEvaluacion === 'APROBADO') return 'APROBADO'
  if (segundaEvaluacion === 'DESAPROBADO') return 'DESAPROBADO'
  return 'OBSERVADO'
}

function getResultadoBadge(resultado) {
  switch (resultado) {
    case 'APROBADO':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-600" />
          APROBADO
        </span>
      )
    case 'OBSERVADO':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
          <span className="size-1.5 rounded-full bg-amber-600" />
          OBSERVADO
        </span>
      )
    case 'DESAPROBADO':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300">
          <span className="size-1.5 rounded-full bg-rose-600" />
          DESAPROBADO
        </span>
      )
    default:
      return <StatusBadge status={resultado} />
  }
}

export function Inspecciones() {
  const cachedInsp = getCachedData('/inspecciones')
  const cachedCrit = getCachedData('/inspeccion-criterios')
  const cachedVeh = getCachedData('/vehiculos')

  const [inspecciones, setInspecciones] = useState(cachedInsp || [])
  const [criteriosInspeccion, setCriteriosInspeccion] = useState(cachedCrit || [])
  const [vehiculos, setVehiculos] = useState(cachedVeh || [])
  const [asociaciones, setAsociaciones] = useState([])
  const [tecnicos, setTecnicos] = useState([])
  const [personas, setPersonas] = useState([])
  const [conductorEsRegistrado, setConductorEsRegistrado] = useState(false)
  const [conductorMismoPropietario, setConductorMismoPropietario] = useState(false)
  const [checklistModificado, setChecklistModificado] = useState(false)
  const [inspeccionAEliminar, setInspeccionAEliminar] = useState(null)
  const [previewAjustada, setPreviewAjustada] = useState(true)
  // Solo para mostrar: el número definitivo lo asigna el servidor al guardar.
  const [correlativoPreview, setCorrelativoPreview] = useState({ numeroRegistro: '', numeroSerieCerticav: '' })
  const [eliminando, setEliminando] = useState(false)
  const [isLoading, setIsLoading] = useState(!cachedInsp)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterResultado, setFilterResultado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedInspeccion, setSelectedInspeccion] = useState(null)

  // Plate dropdown autocompletion
  const [isPlacaDropdownOpen, setIsPlacaDropdownOpen] = useState(false)
  const placaDropdownRef = useRef(null)

  // Conductor dropdown autocompletion (búsqueda contra el padrón de personas)
  const [isConductorDropdownOpen, setIsConductorDropdownOpen] = useState(false)
  const conductorDropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    vehiculoPlaca: '',
    vehiculoMarca: '',
    vehiculoModelo: '',
    vehiculoAnio: '',
    vehiculoMotor: '',
    vehiculoColor: '',
    transportador: '',
    asociacionId: '',
    propietario: '',
    propietarioDni: '',
    conductorNombre: '',
    conductorDni: '',
    conductorLicencia: '',
    numeroRegistro: '',
    numeroSerieCerticav: '',
    fecha: new Date().toISOString().split('T')[0],
    inspector: '',
    tecnicoId: '',
    primeraEvaluacion: 'APROBADO',
    segundaEvaluacion: '',
    resultado: 'APROBADO',
    observaciones: '',
    detalles: [],
  })

  const loadData = async () => {
    try {
      const [inspRes, critRes, vehRes, persRes, asocRes, personasRes] = await Promise.all([
        apiFetch('/inspecciones'),
        apiFetch('/inspeccion-criterios'),
        apiFetch('/vehiculos'),
        apiFetch('/personal').catch(() => ({ ok: false })),
        apiFetch('/asociaciones').catch(() => ({ ok: false })),
        apiFetch('/personas').catch(() => ({ ok: false })),
      ])

      if (!inspRes.ok) throw inspRes
      const inspPayload = await inspRes.json()
      const fetched = (inspPayload.data || []).map((i) => ({
        ...i,
        detalles: typeof i.detalles === 'string' ? JSON.parse(i.detalles) : i.detalles || [],
      }))
      setInspecciones(fetched)
      setCachedData('/inspecciones', fetched)

      if (critRes.ok) {
        const critPayload = await critRes.json()
        const cData = critPayload.data || []
        setCriteriosInspeccion(cData)
        setCachedData('/inspeccion-criterios', cData)
      }

      if (vehRes.ok) {
        const vehPayload = await vehRes.json()
        const vData = vehPayload.data || []
        setVehiculos(vData)
        setCachedData('/vehiculos', vData)
      }

      if (persRes.ok) {
        const persPayload = await persRes.json()
        const pData = (persPayload.data || []).filter((p) => p.estado === 'ACTIVO')
        setTecnicos(pData)
      }

      if (asocRes.ok) {
        const asocPayload = await asocRes.json()
        const aData = asocPayload.data || []
        setAsociaciones(aData)
      }

      if (personasRes.ok) {
        const personasPayload = await personasRes.json()
        setPersonas(personasPayload.data || [])
      }
    } catch {
      setLoadError('No se pudo cargar el módulo de inspecciones.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setLoadError('')
    invalidateCache('/inspecciones')
    loadData()
  }, [])

  // Close plate dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (placaDropdownRef.current && !placaDropdownRef.current.contains(event.target)) {
        setIsPlacaDropdownOpen(false)
      }
      if (conductorDropdownRef.current && !conductorDropdownRef.current.contains(event.target)) {
        setIsConductorDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), TOAST_DURACION_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  // type: 'crear' | 'editar' | 'eliminar' | 'error'
  const showToast = (message, type = 'crear') => {
    setToast({
      id: Date.now(),
      message,
      type,
    })
  }

  // KPIs derived strictly from database
  const totales = inspecciones.length
  const aprobados = inspecciones.filter((i) => i.resultado === 'APROBADO').length
  const observados = inspecciones.filter((i) => i.resultado === 'OBSERVADO').length
  const desaprobados = inspecciones.filter((i) => i.resultado === 'DESAPROBADO').length
  const porcentajeAprobados = totales > 0 ? Math.round((aprobados / totales) * 100) : 0

  const filteredInspecciones = inspecciones.filter((i) => {
    const vehiculo = vehiculos.find((v) => v.placa === i.vehiculoPlaca)
    const numSerie = i.numeroSerieCerticav || ''
    const fullSearch = `${i.numeroInspeccion || ''} ${i.numeroRegistro || ''} ${numSerie} ${i.vehiculoPlaca || ''} ${i.conductorNombre || ''} ${vehiculo?.propietario || ''} ${vehiculo?.marca || ''} ${vehiculo?.modelo || ''}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase().trim())
    const matchesResultado = filterResultado === 'TODOS' || i.resultado === filterResultado
    return matchesSearch && matchesResultado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterResultado])

  const paginatedInspecciones = filteredInspecciones.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const filteredPlacas = vehiculos.filter((v) =>
    (v.placa || '').toLowerCase().includes((formData.vehiculoPlaca || '').toLowerCase())
  )

  const filteredConductores = (() => {
    const termino = (formData.conductorNombre || '').trim().toLowerCase()
    if (termino.length < 2) return []
    return personas
      .filter((p) => {
        const nombreCompleto = `${p.nombres || ''} ${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}`.toLowerCase()
        return nombreCompleto.includes(termino) || (p.numeroDocumento || '').includes(termino)
      })
      .slice(0, 8)
  })()

  const handleSeleccionarConductor = (persona) => {
    const nombreCompleto = `${persona.nombres || ''} ${persona.apellidoPaterno || ''} ${persona.apellidoMaterno || ''}`.trim()
    setFormData((prev) => ({
      ...prev,
      conductorNombre: nombreCompleto.toUpperCase(),
      conductorDni: persona.numeroDocumento || '',
      conductorLicencia: (persona.numeroLicencia || '').toUpperCase(),
    }))
    setConductorEsRegistrado(true)
    setIsConductorDropdownOpen(false)
  }

  const handlePlacaChange = (val) => {
    const placaUpper = val.toUpperCase().trim()
    const vMatch = vehiculos.find((v) => v.placa.toUpperCase() === placaUpper)
    setFormData((prev) => ({
      ...prev,
      vehiculoPlaca: placaUpper,
      vehiculoMarca: vMatch?.marca || '',
      vehiculoModelo: vMatch?.modelo || '',
      vehiculoAnio: vMatch?.anio || '',
      vehiculoMotor: vMatch?.serieMotor || '',
      vehiculoColor: vMatch?.color || '',
      transportador: vMatch?.asociacion || '',
      asociacionId: vMatch?.asociacionId || '',
      propietario: vMatch?.propietario || '',
      propietarioDni: vMatch?.propietarioDni || '',
    }))
  }

  // La licencia sale del padrón de personas. Nunca se usa el DNI como licencia:
  // al guardar, el backend actualizaría la licencia real de esa persona.
  const licenciaDePersona = (dni) =>
    personas.find((p) => (p.numeroDocumento || '').trim() === String(dni || '').trim())?.numeroLicencia || ''

  // Mantiene sincronizados los datos del conductor con el titular mientras
  // el checkbox "El conductor es el mismo propietario" esté activado.
  useEffect(() => {
    if (!conductorMismoPropietario) return
    const propLic = licenciaDePersona(formData.propietarioDni)
    setFormData((prev) => ({
      ...prev,
      conductorNombre: prev.propietario || '',
      conductorDni: prev.propietarioDni || '',
      conductorLicencia: propLic || '',
    }))
    setConductorEsRegistrado(Boolean(formData.propietarioDni))
    setIsConductorDropdownOpen(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conductorMismoPropietario, formData.propietario, formData.propietarioDni, formData.vehiculoPlaca])

  const handleToggleConductorMismoPropietario = (checked) => {
    setConductorMismoPropietario(checked)
    if (checked) {
      const propLic = licenciaDePersona(formData.propietarioDni)
      setFormData((prev) => ({
        ...prev,
        conductorNombre: prev.propietario || '',
        conductorDni: prev.propietarioDni || '',
        conductorLicencia: propLic || '',
      }))
      setConductorEsRegistrado(Boolean(formData.propietarioDni))
      setIsConductorDropdownOpen(false)
    } else {
      setFormData((prev) => ({
        ...prev,
        conductorNombre: '',
        conductorDni: '',
        conductorLicencia: '',
      }))
      setConductorEsRegistrado(false)
      setIsConductorDropdownOpen(false)
    }
  }

  // Busca el DNI ingresado contra el padrón de personas ya registradas.
  // Si existe, autocompleta nombre/licencia y evita crear un duplicado en el backend.
  const handleConductorDniChange = (value) => {
    const dni = value.trim()
    const match = personas.find((p) => (p.numeroDocumento || '').trim() === dni)
    if (match) {
      const nombreCompleto = `${match.nombres || ''} ${match.apellidoPaterno || ''} ${match.apellidoMaterno || ''}`.trim()
      setFormData((prev) => ({
        ...prev,
        conductorDni: dni,
        conductorNombre: nombreCompleto.toUpperCase(),
        conductorLicencia: (match.numeroLicencia || prev.conductorLicencia || '').toUpperCase(),
      }))
      setConductorEsRegistrado(true)
    } else {
      setFormData((prev) => ({ ...prev, conductorDni: dni }))
      setConductorEsRegistrado(false)
    }
  }

  const handleToggleTodoBien = (checked) => {
    if (checked) {
      setFormData((prev) => {
        const detalles = criteriosInspeccion.map((c) => ({ criterioId: c.id, estado: 'BIEN', obs: '' }))

        if (selectedInspeccion && prev.primeraEvaluacion !== 'APROBADO') {
          return { ...prev, detalles, segundaEvaluacion: 'APROBADO', resultado: 'APROBADO' }
        }

        return { ...prev, detalles, primeraEvaluacion: 'APROBADO', segundaEvaluacion: '', resultado: 'APROBADO' }
      })
      setChecklistModificado(true)
    } else {
      setFormData((prev) => ({
        ...prev,
        detalles: prev.detalles.map((d) => ({ ...d, estado: '' })),
        primeraEvaluacion: 'OBSERVADO',
        resultado: 'OBSERVADO',
      }))
      setChecklistModificado(true)
    }
  }

  const handleOpenCreateModal = () => {
    const defaultTecnico = tecnicos.length > 0 ? tecnicos[0] : null
    setFormData({
      vehiculoPlaca: '',
      vehiculoMarca: '',
      vehiculoModelo: '',
      vehiculoAnio: '',
      vehiculoMotor: '',
      vehiculoColor: '',
      transportador: '',
      asociacionId: '',
      propietario: '',
      propietarioDni: '',
      conductorNombre: '',
      conductorDni: '',
      conductorLicencia: '',
      // Vacíos: el servidor asigna el siguiente correlativo libre al guardar.
      numeroRegistro: '',
      numeroSerieCerticav: '',
      fecha: new Date().toISOString().split('T')[0],
      inspector: defaultTecnico ? `${defaultTecnico.nombres} ${defaultTecnico.apellidos}` : '',
      tecnicoId: defaultTecnico ? defaultTecnico.id : '',
      primeraEvaluacion: 'APROBADO',
      segundaEvaluacion: '',
      resultado: 'APROBADO',
      observaciones: '',
      detalles: criteriosInspeccion.map((c) => ({ criterioId: c.id, estado: 'BIEN', obs: '' })),
    })
    setSelectedInspeccion(null)
    setIsPlacaDropdownOpen(false)
    setConductorEsRegistrado(false)
    setConductorMismoPropietario(false)
    setChecklistModificado(false)
    setCorrelativoPreview({ numeroRegistro: '', numeroSerieCerticav: '' })
    apiFetch(`/inspecciones/siguiente-correlativo?anio=${new Date().getFullYear()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data && setCorrelativoPreview(json.data))
      .catch(() => {})
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (inspeccion) => {
    const vMatch = vehiculos.find((v) => v.placa === inspeccion.vehiculoPlaca)
    setFormData({
      vehiculoPlaca: inspeccion.vehiculoPlaca || '',
      vehiculoMarca: inspeccion.vehiculoMarca || vMatch?.marca || '',
      vehiculoModelo: inspeccion.vehiculoModelo || vMatch?.modelo || '',
      vehiculoAnio: inspeccion.vehiculoAnio || vMatch?.anio || '',
      vehiculoMotor: inspeccion.vehiculoMotor || vMatch?.serieMotor || '',
      vehiculoColor: inspeccion.vehiculoColor || vMatch?.color || '',
      transportador: inspeccion.transportador || vMatch?.asociacion || '',
      asociacionId: vMatch?.asociacionId || '',
      propietario: inspeccion.propietario || vMatch?.propietario || '',
      propietarioDni: inspeccion.propietarioDni || vMatch?.propietarioDni || '',
      conductorNombre: inspeccion.conductorNombre || '',
      conductorDni: inspeccion.conductorDni || '',
      conductorLicencia: inspeccion.conductorLicencia || '',
      numeroRegistro: inspeccion.numeroRegistro || inspeccion.numeroInspeccion || '',
      numeroSerieCerticav: inspeccion.numeroSerieCerticav || '',
      fecha: inspeccion.fecha ? String(inspeccion.fecha).split('T')[0] : new Date().toISOString().split('T')[0],
      inspector: inspeccion.inspector || '',
      tecnicoId: inspeccion.tecnicoId || '',
      primeraEvaluacion: inspeccion.primeraEvaluacion || (inspeccion.resultado === 'DESAPROBADO' ? 'DESAPROBADO' : 'APROBADO'),
      segundaEvaluacion: inspeccion.segundaEvaluacion || '',
      resultado: inspeccion.resultado || 'APROBADO',
      observaciones: inspeccion.observaciones || '',
      detalles: criteriosInspeccion.map((c) => {
        const found = (inspeccion.detalles || []).find((d) => Number(d.criterioId) === c.id)
        return found || { criterioId: c.id, estado: 'BIEN', obs: '' }
      }),
    })
    setSelectedInspeccion(inspeccion)
    setIsPlacaDropdownOpen(false)
    setConductorEsRegistrado(Boolean(inspeccion.conductorDni))
    const dniConductor = (inspeccion.conductorDni || '').trim()
    const dniPropietario = (inspeccion.propietarioDni || vMatch?.propietarioDni || '').trim()
    setConductorMismoPropietario(Boolean(dniConductor) && dniConductor === dniPropietario)
    setChecklistModificado(false)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (inspeccion) => {
    setSelectedInspeccion(inspeccion)
    setIsDetailModalOpen(true)
  }

  const handleOpenPreview = (inspeccion) => {
    setSelectedInspeccion(inspeccion)
    setIsPreviewModalOpen(true)
  }

  // Abre el modal de confirmación propio (en lugar del confirm() nativo del navegador).
  const handleDelete = (id) => {
    setInspeccionAEliminar(inspecciones.find((i) => i.id === id) || { id })
  }

  const confirmarEliminacion = async () => {
    const objetivo = inspeccionAEliminar
    if (!objetivo) return
    setEliminando(true)
    try {
      const res = await apiFetch(`/inspecciones/${objetivo.id}`, { method: 'DELETE' })
      if (!res.ok) {
        showToast(await leerMensajeError(res, 'No se pudo eliminar la inspección.'), 'error')
        return
      }
      const next = inspecciones.filter((i) => i.id !== objetivo.id)
      setInspecciones(next)
      setCachedData('/inspecciones', next)
      showToast(`Inspección ${objetivo.numeroRegistro || ''} eliminada correctamente`, 'eliminar')
    } catch {
      showToast('No se pudo conectar con el servidor. Intente nuevamente.', 'error')
    } finally {
      setEliminando(false)
      setInspeccionAEliminar(null)
    }
  }

  const handleDetalleChange = (criterioId, field, value) => {
    setFormData((prev) => {
      const newDetalles = prev.detalles.map((d) => (d.criterioId === criterioId ? { ...d, [field]: value } : d))
      const evalChecklist = calcularPrimeraEvaluacion(newDetalles, criteriosInspeccion)

      // Editando una inspección ya DESAPROBADA: la Primera Evaluación queda
      // fija (es historia); volver a llenar el checklist ahora define la
      // Segunda Evaluación (subsanación), no la primera.
      if (selectedInspeccion && prev.primeraEvaluacion !== 'APROBADO') {
        return {
          ...prev,
          detalles: newDetalles,
          segundaEvaluacion: evalChecklist,
          resultado: calcularResultado(prev.primeraEvaluacion, evalChecklist),
        }
      }

      // Registrando (o editando una inspección aún sin evaluar): el
      // checklist define la Primera Evaluación.
      return {
        ...prev,
        detalles: newDetalles,
        primeraEvaluacion: evalChecklist,
        resultado: calcularResultado(evalChecklist, ''),
      }
    })
    setChecklistModificado(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formData.vehiculoPlaca.trim()) {
      showToast('Por favor ingrese la placa del vehículo.', 'error')
      return
    }

    const payload = { ...formData }
    // Al editar sin tocar el checklist no se reenvía: así no se reemplaza el
    // historial de una inspección evaluada con el formato anterior.
    if (selectedInspeccion && !checklistModificado) {
      delete payload.detalles
    }

    try {
      const esEdicion = Boolean(selectedInspeccion)
      const response = await apiFetch(esEdicion ? `/inspecciones/${selectedInspeccion.id}` : '/inspecciones', {
        method: esEdicion ? 'PUT' : 'POST',
        body: payload,
      })
      if (!response.ok) {
        showToast(await leerMensajeError(response, 'No se pudo guardar la inspección.'), 'error')
        return
      }

      const id = esEdicion ? selectedInspeccion.id : (await response.json()).data?.id
      const guardada = await obtenerInspeccion(id)
      const next = esEdicion
        ? inspecciones.map((i) => (i.id === id ? guardada : i))
        : [guardada, ...inspecciones]
      setInspecciones(next)
      setCachedData('/inspecciones', next)
      if (!esEdicion) setCurrentPage(1)
      showToast(
        `Inspección ${guardada?.numeroRegistro || ''} ${esEdicion ? 'actualizada' : 'registrada'} correctamente`,
        esEdicion ? 'editar' : 'crear'
      )
      setIsModalOpen(false)
    } catch {
      showToast('No se pudo conectar con el servidor. Intente nuevamente.', 'error')
    }
  }

  const obtenerInspeccion = async (id) => {
    const res = await apiFetch(`/inspecciones/${id}`)
    const json = await res.json()
    return json.data
  }

  const handleExportExcel = () => {
    exportToExcel({
      filename: `Inspecciones_Tecnicas_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: 'Inspecciones',
      title: 'REGISTRO DE INSPECCIONES TÉCNICAS VEHICULARES - CERTICAV',
      subtitle: 'Subgerencia de Tránsito y Transporte - Control de Seguridad Vial',
      metadata: [
        { label: 'Resultado', value: filterResultado },
        { label: 'Total Registros', value: String(filteredInspecciones.length) }
      ],
      columns: [
        { header: 'N° REGISTRO', key: 'numeroRegistro', isText: true, width: 120, align: 'center' },
        { header: 'SERIE CERTICAV', render: (_, i) => i.numeroSerieCerticav || ('CCV-2026-' + String(i.id || '').padStart(6, '0')), isText: true, width: 140, align: 'center' },
        { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 110, align: 'center' },
        { header: 'CONDUCTOR', key: 'conductorNombre', width: 180 },
        { header: 'DNI CONDUCTOR', key: 'conductorDni', isText: true, width: 120, align: 'center' },
        { header: 'LICENCIA', key: 'conductorLicencia', isText: true, width: 120, align: 'center' },
        { header: 'INSPECTOR', key: 'inspector', width: 180 },
        { header: 'FECHA INSPECCIÓN', key: 'fecha', width: 120, align: 'center' },
        { header: 'RESULTADO', key: 'resultado', width: 120, align: 'center' }
      ],
      data: filteredInspecciones
    })
  }

  const handleExportPdf = () => {
    const listToExport = filteredInspecciones.length > 0 ? filteredInspecciones : inspecciones
    if (listToExport.length === 0) {
      showError('Atención', 'No hay registros para exportar.')
      return
    }

    const printWin = window.open('', '_blank', 'width=1100,height=750')
    if (!printWin) {
      showError('Atención', 'El navegador bloqueó la ventana emergente. Por favor, habilite los popups.')
      return
    }

    const escapeXml = (unsafe) => {
      if (unsafe === null || unsafe === undefined) return ''
      return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
    }

    const rowsHtml = listToExport
      .map((i, index) => {
        const vehiculo = vehiculos.find((v) => v.placa === i.vehiculoPlaca)
        const estadoBadge =
          i.resultado === 'APROBADO'
            ? `<span style="background:#dcfce7; color:#15803d; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">APROBADO</span>`
            : i.resultado === 'OBSERVADO'
              ? `<span style="background:#fef3c7; color:#b45309; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">OBSERVADO</span>`
              : `<span style="background:#fee2e2; color:#b91c1c; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">DESAPROBADO</span>`

        return `
          <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="text-align: center; color: #64748b; font-size: 10px;">${index + 1}</td>
            <td style="font-family: monospace; font-weight: 700; font-size: 11px; text-align: center;">${escapeXml(i.numeroRegistro || i.numeroInspeccion || '')}</td>
            <td style="font-family: monospace; font-weight: 700; font-size: 11px; text-align: center; color: #0284c7;">${escapeXml(i.numeroSerieCerticav || '')}</td>
            <td style="font-family: monospace; font-weight: 700; font-size: 11px; text-align: center; background: #fef3c7;">${escapeXml(i.vehiculoPlaca || '')}</td>
            <td style="font-size: 10.5px; font-weight: 700; color: #0f172a;">${escapeXml(vehiculo?.propietario || i.propietario || '—')}</td>
            <td style="font-size: 10px; color: #475569;">${escapeXml(vehiculo?.asociacion || i.transportador || 'Independiente')}</td>
            <td style="text-align: center; font-family: monospace; font-size: 10px;">${escapeXml(formatFecha(i.fecha))}</td>
            <td style="text-align: center; font-family: monospace; font-size: 10px;">${escapeXml(formatFecha(i.fechaVencimiento))}</td>
            <td style="text-align: center;">${estadoBadge}</td>
          </tr>
        `
      })
      .join('')

    const pdfHtml = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8"/>
          <title>Padron_Inspecciones_CERTICAV_${new Date().toISOString().slice(0, 10)}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm 10mm 8mm 10mm; }
            * { box-sizing: border-box; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a; margin: 0; padding: 0; font-size: 10.5px;
            }
            .header {
              border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px;
              display: flex; justify-content: space-between; align-items: flex-start;
            }
            .title {
              font-size: 15px; font-weight: 900; color: #0f172a; letter-spacing: -0.3px; text-transform: uppercase;
            }
            .subtitle {
              font-size: 10.5px; font-weight: 600; color: #475569; margin-top: 2px;
            }
            .meta { font-size: 9.5px; color: #64748b; text-align: right; }
            .summary-bar {
              display: flex; gap: 16px; margin-bottom: 10px; background: #f1f5f9; padding: 6px 12px;
              border-radius: 6px; font-size: 10.5px;
            }
            .summary-item strong { color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 4px; }
            th {
              background-color: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 9px;
              font-weight: 800; letter-spacing: 0.4px; padding: 6px 7px; border: 1px solid #0f172a; text-align: left;
            }
            td { border: 1px solid #e2e8f0; padding: 5px 7px; vertical-align: middle; }
            .footer {
              margin-top: 12px; font-size: 8.5px; color: #94a3b8; display: flex;
              justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 5px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="title">Municipalidad Distrital José Leonardo Ortiz</div>
              <div class="subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Inspecciones Técnicas Vehiculares (CERTICAV)</div>
            </div>
            <div class="meta">
              <div><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</div>
              <div><strong>Sistema:</strong> MJLO Tránsito Digital v2026</div>
            </div>
          </div>
          <div class="summary-bar">
            <div>Total en padrón: <strong>${totales}</strong></div>
            <div>· Exportando: <strong>${listToExport.length}</strong> inspecciones</div>
            <div>· Aprobados: <strong>${aprobados}</strong></div>
            <div>· Observados: <strong>${observados}</strong></div>
            <div>· Desaprobados: <strong>${desaprobados}</strong></div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 28px; text-align: center;">N°</th>
                <th style="width: 110px; text-align: center;">N° Registro</th>
                <th style="width: 110px; text-align: center;">Serie CertiCAV</th>
                <th style="width: 80px; text-align: center;">Placa</th>
                <th style="width: 180px;">Titular / Propietario</th>
                <th>Asociación</th>
                <th style="width: 80px; text-align: center;">Fecha</th>
                <th style="width: 80px; text-align: center;">Vencimiento</th>
                <th style="width: 90px; text-align: center;">Resultado</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <div class="footer">
            <span>Documento oficial generado para fiscalización y control del transporte en José Leonardo Ortiz.</span>
            <span>Página 1 de 1</span>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() { window.print(); }, 250);
            };
          </script>
        </body>
      </html>
    `

    printWin.document.open()
    printWin.document.write(pdfHtml)
    printWin.document.close()
  }

  // Agrupación de criterios técnicos por sección
  const criteriosPorSeccion = criteriosInspeccion.reduce((acc, crit) => {
    const sec = crit.seccion || 'GENERAL'
    if (!acc[sec]) acc[sec] = []
    acc[sec].push(crit)
    return acc
  }, {})

  // Conteo de criterios marcados en BIEN para el estado visual del botón
  const totalCriterios = formData.detalles?.length || 0
  const cantBien = formData.detalles?.filter((d) => d.estado === 'BIEN').length || 0
  const todosEnBien = totalCriterios > 0 && cantBien === totalCriterios

  return (
    <div className="space-y-4">
      {toast && (() => {
        const estilo = TOAST_ESTILOS[toast.type] || TOAST_ESTILOS.crear
        return (
          <div
            key={toast.id}
            role={toast.type === 'error' ? 'alert' : 'status'}
            className={`fixed right-6 top-6 z-[80] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-lg ${estilo.caja} ${toast.type === 'error' ? 'toast-shake' : 'toast-in'}`}
          >
            <div className="flex items-start gap-3 px-4 py-3">
              <span className={`toast-icon grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${estilo.icono}`}>
                {estilo.simbolo === 'trash' ? <Icon name="trash" className="size-3.5" /> : estilo.simbolo}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] font-bold uppercase tracking-wide ${estilo.titulo}`}>{estilo.etiqueta}</p>
                <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="Cerrar notificación"
                className="shrink-0 rounded-md px-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className={`toast-progress h-1 ${estilo.barra}`} style={{ animationDuration: `${TOAST_DURACION_MS}ms` }} />
          </div>
        )
      })()}

      {inspeccionAEliminar && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter"
          onClick={() => !eliminando && setInspeccionAEliminar(null)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="titulo-eliminar"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)]"
            style={{ animation: 'modal-pop 0.25s ease-out' }}
          >
            <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4 text-center">
              <span className="toast-icon grid size-14 place-items-center rounded-full bg-rose-100 text-rose-600 ring-8 ring-rose-50 dark:bg-rose-950/60 dark:text-rose-400 dark:ring-rose-950/30">
                <Icon name="trash" className="size-6" />
              </span>
              <h3 id="titulo-eliminar" className="text-base font-bold text-slate-900 dark:text-white">
                ¿Eliminar esta inspección?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Se anulará la inspección{' '}
                <strong className="font-mono text-slate-800 dark:text-slate-200">{inspeccionAEliminar.numeroRegistro || ''}</strong>
                {inspeccionAEliminar.vehiculoPlaca && (
                  <> de la placa <strong className="font-mono text-slate-800 dark:text-slate-200">{inspeccionAEliminar.vehiculoPlaca}</strong></>
                )}
                . Dejará de aparecer en el listado.
              </p>
            </div>
            <div className="flex gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-3 dark:border-[var(--border)] dark:bg-slate-900/80">
              <button
                type="button"
                disabled={eliminando}
                onClick={() => setInspeccionAEliminar(null)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:opacity-50 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                autoFocus
                disabled={eliminando}
                onClick={confirmarEliminacion}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-xs transition hover:bg-rose-700 active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {eliminando ? 'Eliminando…' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loadError && <PageLoadError message={loadError} />}

      {/* Cabecera Principal - Estilo Exacto Personas */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-md shadow-purple-500/25">
            <Icon name="inspection" className="size-5.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Certificado de Constatación de Características Vehicular
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Constatación de características técnicas, estado operativo y seguridad de la flota vehicular.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI con Bordes de Colores: 5 tarjetas compactas (Estilo exacto Personas) */}
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {/* 1. Total registros */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Total registros
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="inspection" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(totales)}
            </p>
          </div>
        </div>

        {/* 2. Aprobados */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Aprobados
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(aprobados)}
            </p>
          </div>
        </div>

        {/* 3. Observados */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Observados
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold text-xs">
              <Icon name="alert" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(observados)}
            </p>
          </div>
        </div>

        {/* 4. Desaprobados */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Desaprobados
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {new Intl.NumberFormat('es-PE').format(desaprobados)}
            </p>
          </div>
        </div>

        {/* 5. Aptitud Técnica */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Aptitud Técnica
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400 font-bold text-xs">
              %
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {porcentajeAprobados}%
            </p>
          </div>
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, serie CertiCAV, placa, conductor o titular"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-indigo-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RoundedSelect
              value={filterResultado}
              onChange={setFilterResultado}
              options={FILTER_RESULTADO_OPTIONS}
            />

            {(filterResultado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterResultado('TODOS')
                  setSearchTerm('')
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
            >
              <Icon name="fileSpreadsheet" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              title="Descargar o imprimir padrón en PDF"
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Icon name="filePdf" className="size-3.5 text-rose-600 dark:text-rose-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Registrar inspección</span>
            </button>
          </div>
        </div>

        {/* TABLA: EN CERTICAV EN LA TABLA VISIBLE NO SE MUESTRA INSPECTOR ASIGNADO */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">N° Registro / Serie</th>
                <th className="px-4 py-3 whitespace-nowrap">Placa Vehicular</th>
                <th className="px-4 py-3 whitespace-nowrap">Vehículo y Titular</th>
                <th className="px-4 py-3 whitespace-nowrap">Fecha y Vigencia</th>
                <th className="px-4 py-3 whitespace-nowrap">Resultado</th>
                <th className="sticky right-0 z-20 px-4 py-3 text-right whitespace-nowrap bg-slate-50/75 dark:bg-[var(--bg-subtle)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
              {isLoading && inspecciones.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="h-4 w-28 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-20 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-36 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-20 rounded-full" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td
                      className="sticky right-0 z-10 px-4 py-3 text-right"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                      <div className="h-7 w-20 ml-auto rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                  </tr>
                ))
              ) : filteredInspecciones.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center" style={{ color: 'var(--text-muted)' }}>
                    <div className="mx-auto max-w-xs space-y-1.5">
                      <Icon name="inspection" className="size-8 mx-auto opacity-40" />
                      <p className="font-semibold" style={{ color: 'var(--text)' }}>
                        No se encontraron inspecciones
                      </p>
                      <p className="text-[12.5px]">
                        Intenta con otro término de búsqueda o modifica los filtros.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInspecciones.map((i) => {
                  const vehiculo = vehiculos.find((v) => v.placa === i.vehiculoPlaca)
                  const numSerie = i.numeroSerieCerticav || ''
                  return (
                    <tr
                      key={i.id}
                      className="group transition-colors hover:bg-[var(--brand-soft)] dark:hover:bg-[var(--bg-subtle)]"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-[13px] block">
                            {i.numeroRegistro || i.numeroInspeccion}
                          </span>
                          {numSerie && (
                            <span className="inline-flex items-center font-mono text-[10.5px] font-bold text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-200/80 dark:border-sky-800">
                              Serie: {numSerie}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-2.5 py-0.5 font-mono text-xs font-black tracking-widest text-slate-950 shadow-2xs dark:border-[var(--border)] dark:bg-amber-400 dark:text-slate-950">
                            {i.vehiculoPlaca}
                          </span>
                          {(vehiculo?.marca || i.vehiculoMarca || vehiculo?.modelo || i.vehiculoModelo) && (
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {[vehiculo?.marca || i.vehiculoMarca, vehiculo?.modelo || i.vehiculoModelo].filter(Boolean).join(' ')}
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-[210px]">
                        <div>
                          <p
                            className="font-bold text-[13px] text-slate-900 dark:text-white truncate"
                            title={vehiculo?.propietario || i.propietario}
                          >
                            {vehiculo?.propietario || i.propietario || 'Propietario no asignado'}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                            {(vehiculo?.propietarioDni || i.propietarioDni) && (
                              <span className="font-mono font-semibold">
                                DNI: {vehiculo?.propietarioDni || i.propietarioDni}
                              </span>
                            )}
                            {(vehiculo?.asociacion || i.transportador) && (
                              <span className="truncate" title={vehiculo?.asociacion || i.transportador}>
                                · {vehiculo?.asociacion || i.transportador}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="space-y-0.5 font-mono text-xs">
                          <p className="font-semibold text-slate-700 dark:text-slate-300">
                            {formatFecha(i.fecha)}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Vence: <span className="font-bold text-slate-600 dark:text-slate-300">{formatFecha(i.fechaVencimiento)}</span>
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {getResultadoBadge(i.resultado)}
                      </td>

                      <td
                        className="sticky right-0 z-10 px-4 py-3 text-right whitespace-nowrap group-hover:bg-[var(--brand-soft)] dark:group-hover:bg-slate-800/40 transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.03)]"
                        style={{ backgroundColor: 'var(--bg-surface)' }}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          {/* OJO: Celeste (Ver Ficha) */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(i)}
                            title="Ver ficha técnica"
                            className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                            style={{
                              backgroundColor: 'var(--action-eye-bg)',
                              borderColor: 'var(--action-eye-border)',
                              color: 'var(--action-eye-text)',
                              borderWidth: '1.5px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-eye-hover)'
                              e.currentTarget.style.borderColor = 'var(--action-eye-hover)'
                              e.currentTarget.style.color = '#ffffff'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--action-eye-bg)'
                              e.currentTarget.style.borderColor = 'var(--action-eye-border)'
                              e.currentTarget.style.color = 'var(--action-eye-text)'
                            }}
                          >
                            <Icon name="eye" className="size-4" />
                          </button>

                          {/* IMPRIMIR: Morado */}
                          <button
                            type="button"
                            onClick={() => handleOpenPreview(i)}
                            title="Imprimir Acta Oficial CertiCAV"
                            className="size-8 rounded-lg grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95"
                            style={{
                              backgroundColor: '#f3e8ff',
                              borderColor: '#c084fc',
                              color: '#7e22ce',
                              borderWidth: '1.5px',
                              borderStyle: 'solid',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#7e22ce'
                              e.currentTarget.style.borderColor = '#7e22ce'
                              e.currentTarget.style.color = '#ffffff'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#f3e8ff'
                              e.currentTarget.style.borderColor = '#c084fc'
                              e.currentTarget.style.color = '#7e22ce'
                            }}
                          >
                            <Icon name="print" className="size-4" />
                          </button>

                          {/* EDITAR: Amarillo */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(i)}
                            title="Editar inspección"
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

                          {/* ELIMINAR: Rojo */}
                          <button
                            type="button"
                            onClick={() => handleDelete(i.id)}
                            title="Eliminar inspección"
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
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredInspecciones.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Modal Registrar / Editar Inspección Técnica */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="inspection" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedInspeccion ? 'Editar inspección CERTICAV' : 'Nueva inspección CERTICAV'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                title="Cerrar"
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} autoComplete="off" className="flex flex-col">
              <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* 1. Sección: Identificación del Documento y Talonario */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-600" />
                    Documento y registro
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Placa Vehicular con Autocompletado */}
                    <div className="sm:col-span-4 relative" ref={placaDropdownRef}>
                      <FloatingInput
                        id="insp_placa"
                        label="N° de Placa del Vehículo"
                        required
                        value={formData.vehiculoPlaca}
                        inputClassName="font-mono font-black tracking-widest uppercase text-slate-900 dark:text-white"
                        onFocus={() => setIsPlacaDropdownOpen(true)}
                        onChange={(e) => {
                          handlePlacaChange(e.target.value)
                          setIsPlacaDropdownOpen(true)
                        }}
                      />

                      {isPlacaDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100">
                          {filteredPlacas.length === 0 ? (
                            <div className="px-3 py-2 text-center text-xs text-slate-400">
                              No hay vehículos registrados con esa placa
                            </div>
                          ) : (
                            filteredPlacas.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => {
                                  handlePlacaChange(v.placa)
                                  setIsPlacaDropdownOpen(false)
                                }}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${formData.vehiculoPlaca === v.placa
                                    ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/60 dark:text-blue-300'
                                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                                  }`}
                              >
                                <span className="font-mono font-bold">{v.placa}</span>
                                <span className="text-[11px] text-slate-400 truncate max-w-[170px]">
                                  {v.propietario || v.marca || 'Registrado'} · {v.asociacion || 'Independiente'}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="insp_num_reg"
                        label="N° de Registro"
                        readOnly
                        tabIndex={-1}
                        value={(selectedInspeccion ? formData.numeroRegistro : correlativoPreview.numeroRegistro) || '…'}
                        inputClassName="font-mono font-bold uppercase cursor-not-allowed bg-slate-100 text-slate-600 dark:bg-[var(--bg-surface)] dark:text-slate-300"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FloatingInput
                        id="insp_serie"
                        label="N° Serie CERTICAV"
                        readOnly
                        tabIndex={-1}
                        value={(selectedInspeccion ? formData.numeroSerieCerticav : correlativoPreview.numeroSerieCerticav) || '…'}
                        inputClassName="font-mono font-black text-sm tracking-wider cursor-not-allowed bg-slate-100 text-rose-600 dark:bg-[var(--bg-surface)] dark:text-rose-400"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="insp_fecha"
                        label="Fecha de Inspección"
                        type="date"
                        disabled
                        value={formData.fecha}
                        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Sección: Características Técnicas del Vehículo Menor */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-cyan-600" />
                    Vehículo y transportador
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="insp_marca"
                        label="Marca de Vehículo"
                        disabled
                        value={formData.vehiculoMarca}
                        inputClassName="uppercase font-semibold"
                        onChange={(e) => setFormData({ ...formData, vehiculoMarca: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="insp_modelo"
                        label="Modelo"
                        disabled
                        value={formData.vehiculoModelo}
                        inputClassName="uppercase font-semibold"
                        onChange={(e) => setFormData({ ...formData, vehiculoModelo: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FloatingInput
                        id="insp_anio"
                        label="Año Fabricación"
                        maxLength={4}
                        disabled
                        value={formData.vehiculoAnio}
                        inputClassName="font-mono font-bold"
                        onChange={(e) => setFormData({ ...formData, vehiculoAnio: e.target.value.trim() })}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FloatingInput
                        id="insp_color"
                        label="Color"
                        disabled
                        value={formData.vehiculoColor}
                        inputClassName="uppercase font-semibold"
                        onChange={(e) => setFormData({ ...formData, vehiculoColor: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FloatingInput
                        id="insp_motor"
                        label="N° Motor"
                        disabled
                        value={formData.vehiculoMotor}
                        inputClassName="font-mono font-bold uppercase"
                        onChange={(e) => setFormData({ ...formData, vehiculoMotor: e.target.value.toUpperCase() })}
                      />
                    </div>

                    {/* Razón Social del Transportador */}
                    <div className="sm:col-span-12">
                      <FloatingInput
                        id="insp_transportador"
                        label="Razón Social del Transportador (Empresa / Asociación)"
                        disabled
                        value={formData.transportador}
                        inputClassName="uppercase font-bold text-slate-800 dark:text-white"
                        onChange={(e) => setFormData({ ...formData, transportador: e.target.value.toUpperCase() })}
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Sección: Propietario, Conductor y Técnico Responsable */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      Propietario, conductor y técnico
                    </h4>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800 px-2.5 py-1 rounded-lg cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={conductorMismoPropietario}
                        onChange={(e) => handleToggleConductorMismoPropietario(e.target.checked)}
                        className="size-3.5 accent-sky-600 cursor-pointer"
                      />
                      El conductor es el mismo propietario
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Propietario */}
                    <div className="sm:col-span-4">
                      <FloatingInput
                        id="insp_prop_nombre"
                        label="Propietario del Vehículo"
                        disabled
                        value={formData.propietario}
                        inputClassName="font-bold uppercase text-slate-800 dark:text-white"
                        onChange={(e) => setFormData({ ...formData, propietario: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FloatingInput
                        id="insp_prop_dni"
                        label="DNI del Propietario"
                        maxLength={8}
                        disabled
                        value={formData.propietarioDni}
                        inputClassName="font-mono font-bold"
                        onChange={(e) => setFormData({ ...formData, propietarioDni: e.target.value.trim() })}
                      />
                    </div>

                    {/* Conductor con autocompletado contra el padrón de personas */}
                    <div className="sm:col-span-4 relative" ref={conductorDropdownRef}>
                      <FloatingInput
                        id="insp_cond_nombre"
                        label="Conductor"
                        required
                        disabled={conductorMismoPropietario}
                        value={formData.conductorNombre}
                        inputClassName={`font-bold uppercase text-slate-800 dark:text-white ${conductorMismoPropietario ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-[var(--bg-surface)]' : ''}`}
                        onFocus={() => setIsConductorDropdownOpen(true)}
                        onChange={(e) => {
                          setFormData({ ...formData, conductorNombre: e.target.value.toUpperCase() })
                          setConductorEsRegistrado(false)
                          setIsConductorDropdownOpen(true)
                        }}
                      />

                      {!conductorMismoPropietario && isConductorDropdownOpen && filteredConductores.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] animate-in fade-in zoom-in-95 duration-100">
                          {filteredConductores.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => handleSeleccionarConductor(p)}
                              className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60"
                            >
                              <span className="font-bold truncate max-w-[170px]">
                                {`${p.nombres || ''} ${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}`.trim()}
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">{p.numeroDocumento}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <FloatingInput
                        id="insp_cond_dni"
                        label="DNI Conductor"
                        maxLength={8}
                        disabled={conductorMismoPropietario}
                        value={formData.conductorDni}
                        inputClassName={`font-mono font-bold ${conductorMismoPropietario ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-[var(--bg-surface)]' : ''}`}
                        onChange={(e) => handleConductorDniChange(e.target.value)}
                      />
                    </div>

                    {/* Licencia y Técnico */}
                    <div className="sm:col-span-4">
                      <FloatingInput
                        id="insp_cond_licencia"
                        label="N° Licencia de Conductor"
                        required
                        disabled={conductorMismoPropietario}
                        value={formData.conductorLicencia}
                        inputClassName={`font-mono font-bold uppercase ${conductorMismoPropietario ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-[var(--bg-surface)]' : ''}`}
                        onChange={(e) => setFormData({ ...formData, conductorLicencia: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="sm:col-span-8">
                      <FloatingSelect
                        id="insp_tecnico"
                        label="Técnico Responsable / Inspector Asignado"
                        value={formData.tecnicoId}
                        onChange={(e) => {
                          const tId = e.target.value
                          const tObj = tecnicos.find((t) => String(t.id) === String(tId))
                          setFormData({
                            ...formData,
                            tecnicoId: tId,
                            inspector: tObj ? `${tObj.nombres} ${tObj.apellidos}` : formData.inspector,
                          })
                        }}
                        options={[
                          { value: '', label: 'Seleccionar técnico responsable' },
                          ...tecnicos.map((t) => ({ value: String(t.id), label: `${t.nombres} ${t.apellidos} · Inspector Tránsito` })),
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Sección: Evaluación de Criterios Técnicos */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                        <span className="size-2 rounded-full bg-indigo-600" />
                        Checklist técnico
                      </h4>
                      <div className="flex items-center gap-2 text-[10.5px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800/90 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          <strong className="text-emerald-700 dark:text-emerald-400 font-bold">B:</strong> Bien
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          <strong className="text-amber-700 dark:text-amber-400 font-bold">M.E.:</strong> Mal Estado
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-rose-500" />
                          <strong className="text-rose-700 dark:text-rose-400 font-bold">N.T.:</strong> No Tiene
                        </span>
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg cursor-pointer select-none transition-all hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 self-start sm:self-auto shadow-2xs">
                      <input
                        type="checkbox"
                        checked={todosEnBien}
                        onChange={(e) => handleToggleTodoBien(e.target.checked)}
                        className="size-3.5 accent-emerald-600 cursor-pointer"
                      />
                      Todo bien
                    </label>
                  </div>

                  {selectedInspeccion?.detalles?.some((d) => !criteriosInspeccion.some((c) => c.id === Number(d.criterioId))) && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                      Esta inspección se evaluó con el checklist anterior. Si modifica el checklist, se registrará con el formato oficial de {criteriosInspeccion.length} ítems.
                    </p>
                  )}

                  <div className="space-y-4">
                    {Object.entries(criteriosPorSeccion).map(([seccion, items]) => {
                      const countSeccion = items.length
                      return (
                        <div key={seccion} className="space-y-2">
                          <div className="flex items-center justify-between border-b border-slate-200/50 pb-1 dark:border-slate-800/80">
                            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                              <span className="size-1.5 rounded-full bg-indigo-600" />
                              {seccion}
                            </h5>
                            <span className="text-[10px] font-semibold text-slate-400">
                              {countSeccion} ítems
                            </span>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-2">
                            {items.map((crit) => {
                              const det = formData.detalles.find((d) => d.criterioId === crit.id) || {
                                criterioId: crit.id,
                                estado: 'BIEN',
                                obs: '',
                              }
                              return (
                                <div
                                  key={crit.id}
                                  className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] text-xs shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono text-[9px] font-extrabold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1 py-0.5 rounded border border-indigo-200/60 dark:border-indigo-800 shrink-0">
                                        {crit.codigo}
                                      </span>
                                      <span className="font-bold text-slate-800 dark:text-white truncate block text-[11.5px]" title={crit.nombre}>
                                        {crit.nombre}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleDetalleChange(crit.id, 'estado', 'BIEN')}
                                      title="Bien (Aprobado)"
                                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${det.estado === 'BIEN'
                                          ? 'bg-emerald-600 text-white shadow-2xs scale-105'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                      B
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDetalleChange(crit.id, 'estado', 'MAL_ESTADO')}
                                      title="Mal Estado"
                                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${det.estado === 'MAL_ESTADO'
                                          ? 'bg-amber-600 text-white shadow-2xs scale-105'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                      M.E.
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDetalleChange(crit.id, 'estado', 'NO_TIENE')}
                                      title="No Tiene"
                                      className={`px-2 py-1 rounded-lg text-[10px] font-extrabold transition cursor-pointer ${det.estado === 'NO_TIENE'
                                          ? 'bg-rose-600 text-white shadow-2xs scale-105'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                      N.T.
                                    </button>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 5. Sección: Dictamen Oficial, Evaluaciones y Observaciones */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-amber-600" />
                    Dictamen final
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {(() => {
                      const mostrarSegunda = Boolean(selectedInspeccion) && formData.primeraEvaluacion !== 'APROBADO'
                      const colSpan = mostrarSegunda ? 'sm:col-span-4' : 'sm:col-span-6'
                      return (
                        <>
                          {/* Primera Evaluación: se deriva del checklist, no se elige a mano */}
                          <div className={colSpan}>
                            <span className="block text-[9.5px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                              Primera Evaluación
                            </span>
                            {getResultadoBadge(formData.primeraEvaluacion)}
                          </div>

                          {/* Segunda Evaluación: solo aplica si la Primera fue DESAPROBADO.
                              Se deriva de volver a llenar el checklist, igual que la primera. */}
                          {mostrarSegunda && (
                            <div className="sm:col-span-4">
                              <span className="block text-[9.5px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                                Segunda Evaluación
                              </span>
                              {formData.segundaEvaluacion
                                ? getResultadoBadge(formData.segundaEvaluacion)
                                : <StatusBadge status="PENDIENTE" />}
                            </div>
                          )}

                          {/* Resultado Final: derivado de la primera/segunda evaluación */}
                          <div className={colSpan}>
                            <span className="block text-[9.5px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                              Resultado Final
                            </span>
                            {getResultadoBadge(formData.resultado)}
                          </div>
                        </>
                      )
                    })()}

                    {/* Observaciones */}
                    <div className="sm:col-span-12">
                      <FloatingInput
                        id="insp_observaciones"
                        label="Observaciones"
                        optional
                        value={formData.observaciones}
                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-[var(--border)] dark:bg-slate-900/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200 active:scale-95 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-indigo-600 dark:hover:bg-indigo-500 px-5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                >
                  {selectedInspeccion ? 'Actualizar inspección' : 'Guardar inspección'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha de Detalle (Diccionario Visual - Estilo Exacto Personas y Ficha Oficial Digitalizada) */}
      {isDetailModalOpen && selectedInspeccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="inspection" className="size-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Ficha Técnica de Inspección (CERTICAV)
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Municipalidad Distrital José Leonardo Ortiz · Ordenanza Municipal N° 012-2012-MDJLO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                title="Cerrar ficha"
                className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 pb-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {/* Profile Hero Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-200 dark:bg-sky-950/60 dark:text-sky-400 dark:border-sky-800">
                    <Icon name="inspection" className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-black text-slate-900 dark:text-white">
                        {selectedInspeccion.numeroRegistro || selectedInspeccion.numeroInspeccion}
                      </span>
                      <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-2 py-0.5 font-mono text-xs font-black tracking-widest text-slate-950 shadow-2xs">
                        {selectedInspeccion.vehiculoPlaca}
                      </span>
                      {selectedInspeccion.numeroSerieCerticav && (
                        <span className="inline-flex items-center rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 font-mono text-xs font-black tracking-wider text-rose-600 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-300 shadow-2xs">
                          SERIE: {selectedInspeccion.numeroSerieCerticav}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedInspeccion.propietario || 'Propietario no asignado'} · {selectedInspeccion.transportador || 'Independiente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getResultadoBadge(selectedInspeccion.resultado)}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDetailModalOpen(false)
                      handleOpenPreview(selectedInspeccion)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                  >
                    <Icon name="print" className="size-3.5" />
                    <span>Imprimir Acta A4</span>
                  </button>
                </div>
              </div>

              {/* Secciones de Datos en Rejilla */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Datos Técnicos del Vehículo y Transportador */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 space-y-1.5 shadow-xs">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Características del Vehículo Menor
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">N° de Placa</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {selectedInspeccion.vehiculoPlaca || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Marca de Vehículo</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedInspeccion.vehiculoMarca || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Modelo</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedInspeccion.vehiculoModelo || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Año de Fabricación</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white text-right">
                        {selectedInspeccion.vehiculoAnio || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">N° de Motor</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-white text-right">
                        {selectedInspeccion.vehiculoMotor || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Color</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedInspeccion.vehiculoColor || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Razón Social del Transportador</span>
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-right truncate max-w-[210px]" title={selectedInspeccion.transportador}>
                        {selectedInspeccion.transportador || 'Independiente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Titular Propietario, Conductor y Dictamen Oficial */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 space-y-1.5 shadow-xs">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Operador, Conductor y Dictamen Oficial
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Titular Propietario</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedInspeccion.propietario || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">DNI del Titular</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">
                        {selectedInspeccion.propietarioDni || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Conductor Evaluado</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedInspeccion.conductorNombre || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">DNI Conductor</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">
                        {selectedInspeccion.conductorDni || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">N° Licencia Conductor</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedInspeccion.conductorLicencia || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Fecha y Vencimiento</span>
                      <span className="font-mono text-slate-800 dark:text-white">
                        {formatFecha(selectedInspeccion.fecha)} ·{' '}
                        {selectedInspeccion.resultado === 'APROBADO'
                          ? <>Vence: <strong className="font-bold">{formatFecha(selectedInspeccion.fechaVencimiento)}</strong></>
                          : <strong className="font-bold text-rose-600 dark:text-rose-400">Sin certificado vigente</strong>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Primera Evaluación</span>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${selectedInspeccion.primeraEvaluacion === 'DESAPROBADO'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                        }`}>
                        {selectedInspeccion.primeraEvaluacion || 'APROBADO'}
                      </span>
                    </div>
                    {selectedInspeccion.segundaEvaluacion && (
                      <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                        <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Segunda Evaluación</span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${selectedInspeccion.segundaEvaluacion === 'DESAPROBADO'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}>
                          {selectedInspeccion.segundaEvaluacion}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Resultado Final</span>
                      {getResultadoBadge(selectedInspeccion.resultado)}
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Técnico Inspector</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedInspeccion.inspector || 'Inspector Técnico Municipal'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Resumen de Criterios Evaluados (Agrupados por Sección Oficial sin truncar) */}
              {selectedInspeccion.detalles && selectedInspeccion.detalles.length > 0 && (
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 space-y-3 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-2">
                        <span className="size-2 rounded-full bg-indigo-600" />
                        Checklist Técnico ({selectedInspeccion.detalles.length} criterios)
                      </h5>
                      <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-white dark:bg-[var(--bg-subtle)] px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-emerald-500" />
                          <strong className="text-emerald-700 dark:text-emerald-400 font-bold">B:</strong> Bien
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-amber-500" />
                          <strong className="text-amber-700 dark:text-amber-400 font-bold">M.E.:</strong> Mal Estado
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-rose-500" />
                          <strong className="text-rose-700 dark:text-rose-400 font-bold">N.T.:</strong> No Tiene
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded self-start sm:self-auto">
                      {selectedInspeccion.detalles.length} Verificados
                    </span>
                  </div>

                  <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {/* Se muestran los criterios con que se evaluó esta inspección, no el
                        catálogo actual: las antiguas se evaluaron con otro formato. */}
                    {Object.entries(
                      selectedInspeccion.detalles.reduce((acc, d) => {
                        const seccion = d.seccion || 'GENERAL'
                        ;(acc[seccion] = acc[seccion] || []).push(d)
                        return acc
                      }, {})
                    ).map(([seccion, items]) => {
                      return (
                        <div key={seccion} className="space-y-1.5">
                          <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="size-1 rounded-full bg-slate-400" />
                            {seccion}
                          </h6>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                            {items.map((det) => {
                              const estadoVal = det.estado
                              const isBien = estadoVal === 'BIEN'
                              const isMal = estadoVal === 'MAL_ESTADO'
                              const nombre = det.nombre || `Criterio ${det.criterioId}`
                              return (
                                <div
                                  key={det.criterioId}
                                  className="flex items-center justify-between gap-1.5 p-2 rounded-xl bg-white dark:bg-[var(--bg-subtle)] border border-slate-200/80 dark:border-slate-700/80 text-[11px] shadow-2xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <span className="font-medium text-slate-800 dark:text-slate-200 block truncate" title={nombre}>
                                      {nombre}
                                    </span>
                                  </div>
                                  <span
                                    className={`shrink-0 px-2 py-0.5 rounded-md text-[9.5px] font-black ${isBien
                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                        : isMal
                                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                      }`}
                                  >
                                    {isBien ? '✓ BIEN' : isMal ? '⚠ M.E.' : '✕ N.T.'}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 4. Observaciones y Base Legal */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] text-xs space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                  <span className="font-bold text-slate-700 dark:text-slate-300">Observaciones Técnicas:</span>
                  <span className="text-slate-600 dark:text-slate-400 text-right">
                    {selectedInspeccion.observaciones || 'Sin observaciones registradas. Unidad apta.'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 border-t border-slate-200/60 dark:border-[var(--border)] pt-1.5">
                  Declaración Jurada según Ley N° 27444.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-[var(--border)] dark:bg-slate-900/80">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false)
                  handleOpenEditModal(selectedInspeccion)
                }}
                className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/40 px-3.5 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300 shadow-xs transition hover:bg-amber-100 active:scale-95 cursor-pointer"
              >
                Editar Inspección
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200 active:scale-95 cursor-pointer"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false)
                    handleOpenPreview(selectedInspeccion)
                  }}
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 cursor-pointer"
                >
                  Imprimir Acta A4
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE PREVISUALIZACIÓN E IMPRESIÓN OFICIAL (#seccion-impresion) */}
      {isPreviewModalOpen && selectedInspeccion && (() => {
        const vInfo = vehiculos.find((v) => v.placa === selectedInspeccion.vehiculoPlaca)
        const certicavData = {
          codigo: selectedInspeccion.numeroInspeccion,
          numeroInspeccion: selectedInspeccion.numeroInspeccion,
          numeroRegistro: selectedInspeccion.numeroRegistro || selectedInspeccion.numeroInspeccion,
          numeroSerieCerticav: selectedInspeccion.numeroSerieCerticav || '',
          placa: selectedInspeccion.vehiculoPlaca,
          vehiculoPlaca: selectedInspeccion.vehiculoPlaca,
          propietario: selectedInspeccion.propietario || vInfo?.propietario || '—',
          propietarioDni: selectedInspeccion.propietarioDni || vInfo?.propietarioDni || '—',
          // El conductor es quien se registró en la inspección; nunca se sustituye por el propietario.
          conductorNombre: selectedInspeccion.conductorNombre || '—',
          conductorDni: selectedInspeccion.conductorDni || '—',
          conductorLicencia: selectedInspeccion.conductorLicencia || '—',
          transportador: selectedInspeccion.transportador || vInfo?.asociacion || 'Independiente',
          asociacion: selectedInspeccion.transportador || vInfo?.asociacion || 'Independiente',
          vehiculoMarca: selectedInspeccion.vehiculoMarca || vInfo?.marca || '—',
          vehiculoModelo: selectedInspeccion.vehiculoModelo || vInfo?.modelo || '—',
          vehiculoAnio: selectedInspeccion.vehiculoAnio || vInfo?.anio || '—',
          anioFabricacion: selectedInspeccion.vehiculoAnio || vInfo?.anio || '—',
          numeroMotor: selectedInspeccion.vehiculoMotor || vInfo?.serieMotor || '—',
          fecha: selectedInspeccion.fecha,
          fechaExpedicion: selectedInspeccion.fecha,
          fechaVencimiento: selectedInspeccion.fechaVencimiento,
          vigenciaMeses: 6,
          estadoVigencia: selectedInspeccion.estadoVigencia,
          diasRestantes: selectedInspeccion.diasRestantes,
          primeraEvaluacion: selectedInspeccion.primeraEvaluacion || (selectedInspeccion.resultado === 'DESAPROBADO' ? 'DESAPROBADO' : 'APROBADO'),
          segundaEvaluacion: selectedInspeccion.segundaEvaluacion || '',
          resultado: selectedInspeccion.resultado,
          inspector: selectedInspeccion.inspector || 'Inspector Técnico Municipal',
          observaciones: selectedInspeccion.observaciones || '',
          detalles: selectedInspeccion.detalles || [],
          qrUrl: `https://munijlo.gob.pe/transito/validar?tipo=CERTICAV&reg=${encodeURIComponent(selectedInspeccion.numeroRegistro || selectedInspeccion.numeroInspeccion || '')}&placa=${encodeURIComponent(selectedInspeccion.vehiculoPlaca || '')}`,
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-enter">
            <div className="w-full max-w-5xl h-[calc(100vh-2rem)] flex flex-col bg-white dark:bg-[var(--bg-surface)] rounded-3xl shadow-2xl border border-slate-200 dark:border-[var(--border)] overflow-hidden">
              {/* Header estilo /personas */}
              <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                    <Icon name="print" className="size-4" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        Ficha Oficial CERTICAV
                      </h3>
                      {(selectedInspeccion.numeroRegistro || selectedInspeccion.numeroInspeccion) && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                          {selectedInspeccion.numeroRegistro || selectedInspeccion.numeroInspeccion}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Subgerencia de Tránsito y Transporte • Hoja Formato A4
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition cursor-pointer active:scale-95 shadow-xs"
                  >
                    <Icon name="print" className="size-4" />
                    <span>Imprimir Ficha A4</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPreviewModalOpen(false)}
                    title="Cerrar previsualización"
                    className="grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Icon name="close" className="size-5" />
                  </button>
                </div>
              </div>

              {/* Vista previa y componente oficial para impresión */}
              <div className="flex-1 min-h-0 p-4 bg-slate-200/70 dark:bg-[var(--bg-subtle)] flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Vista previa de la hoja A4</span>
                  <button
                    type="button"
                    onClick={() => setPreviewAjustada((v) => !v)}
                    className="rounded-lg border border-slate-300 bg-white px-2 py-0.5 font-bold text-slate-700 hover:bg-slate-50 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200 cursor-pointer"
                  >
                    {previewAjustada ? 'Ver al 100 %' : 'Ajustar a pantalla'}
                  </button>
                </div>
                <VistaPreviaEscalada ajustar={previewAjustada}>
                  <CerticavFichaPrint data={certicavData} />
                </VistaPreviaEscalada>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
