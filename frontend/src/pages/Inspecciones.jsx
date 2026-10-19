import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { fechaLocalActual } from '../utils/calendarioCurso'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PlacaVehiculo } from '../components/vehiculos/PlacaVehiculo'
import { apiFetch, getCachedData, setCachedData, invalidateCache, leerMensajeError } from '../config/api'
import { CerticavFichaPrint } from '../components/documentos/TarjetaOperatividadPrint'
import { CobrarPagoModal } from '../components/pagos/CobrarPagoModal'
import { exportToExcel } from '../utils/exportToExcel'
import { showError } from '../utils/SwalUtil'
import { FloatingInput, FloatingSelect, RoundedSelect } from '../components/ui/FormInputs'
import { abrirImpresionCuandoEsteListo } from '../utils/impresionCarnets'
import { ActionToast, TOAST_DURACION_MS } from '../components/ui/ActionToast'
import { formatFecha, formatNumeroTarjeta, normalizarPlaca } from '../utils/formatters'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'
import { fetchTodasLasFilas } from '../utils/descargaCompleta'
import { StandaloneVehiculoFormModal } from '../components/vehiculos/StandaloneVehiculoFormModal'
import { puedeEliminarRegistros } from '../config/roles'
import './Inspecciones.css'
import { FilaCargando } from '../components/ui/FilaCargando'
import { useRecargaSilenciosa } from '../hooks/useRecargaSilenciosa'

const FILTER_SOLICITUD_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendientes de pago' },
  { value: 'PAGADO', label: 'Pagadas' },
]

const FILTER_RESULTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los resultados' },
  { value: 'APROBADO', label: 'Aprobados' },
  { value: 'OBSERVADO', label: 'Observados' },
  { value: 'DESAPROBADO', label: 'Desaprobados' },
]

const FILTER_VIGENCIA_OPTIONS = [
  { value: 'TODOS', label: 'Toda vigencia' },
  { value: 'VIGENTE', label: 'Vigentes' },
  { value: 'POR_VENCER', label: 'Por vencer (30 días)' },
  { value: 'VENCIDO', label: 'Vencidos' },
]

// Primera evaluación: se deriva del checklist, no se elige a mano.
// Cualquier ítem en "Mal estado" o "No tiene" desaprueba la primera evaluación.
function calcularPrimeraEvaluacion(detalles) {
  if (detalles.some(d => !d.estado)) return 'PENDIENTE'
  const hayProblema = detalles.some((d) => d.estado === 'MAL_ESTADO' || d.estado === 'NO_TIENE')
  return hayProblema ? 'DESAPROBADO' : 'APROBADO'
}

// Resultado final: aprobado directo si pasó la primera, o según la segunda
// evaluación (subsanación) cuando la primera fue desaprobada.
function calcularResultado(primeraEvaluacion, segundaEvaluacion) {
  if (primeraEvaluacion === 'PENDIENTE' || segundaEvaluacion === 'PENDIENTE') return 'PENDIENTE'
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
  const [tecnicoAbierto, setTecnicoAbierto] = useState(false)
  const nombreTecnico = (t) => `${t.nombres} ${t.apellidos}`.replace(/\s+/g, ' ').trim().toUpperCase()
  const [personas, setPersonas] = useState([])
  const [conductorEsRegistrado, setConductorEsRegistrado] = useState(false)
  const [conductorMismoPropietario, setConductorMismoPropietario] = useState(false)
  const [checklistModificado, setChecklistModificado] = useState(false)
  const [inspeccionAEliminar, setInspeccionAEliminar] = useState(null)
  // Solo para mostrar: el número definitivo lo asigna el servidor al guardar.
  const [correlativoPreview, setCorrelativoPreview] = useState({ numeroRegistro: '', numeroSerieCerticav: '' })
  const [eliminando, setEliminando] = useState(false)
  const [isLoading, setIsLoading] = useState(!cachedInsp)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 160)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const [filterResultado, setFilterResultado] = useState('TODOS')
  const [filterVigencia, setFilterVigencia] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const filterHistorial = 'ACTUALES'
  const [inspeccionPendiente, setInspeccionPendiente] = useState(null)
  const navigate = useNavigate()
  // Situación del CERTICAV de la placa escrita: solo formales, y pagado antes de la revisión técnica
  const [certicav, setCerticav] = useState(null)
  const [solicitandoCerticav, setSolicitandoCerticav] = useState(false)
  // Paso previo a la revisión: solicitud del CERTICAV (placa), cobro en Pagos y recién entonces el checklist
  const [solicitudes, setSolicitudes] = useState([])
  const [cobrandoExpediente, setCobrandoExpediente] = useState(null)
  const [solicitudesPage, setSolicitudesPage] = useState(1)
  const [vista, setVista] = useState('INSPECCIONES')
  const [solSortBy, setSolSortBy] = useState('')
  const [solBusqueda, setSolBusqueda] = useState('')
  const [solEstado, setSolEstado] = useState('TODOS')
  const [solSortDir, setSolSortDir] = useState('ASC')
  const [solicitudModal, setSolicitudModal] = useState(false)
  const [solicitudPlaca, setSolicitudPlaca] = useState('')
  const [solicitudError, setSolicitudError] = useState('')
  const [solicitudVehiculo, setSolicitudVehiculo] = useState(null)
  // Formulario de vehículo dentro de la solicitud: { vehiculo } para editar o {} para registrar
  const [vehiculoForm, setVehiculoForm] = useState(null)
  const [solicitudRefresco, setSolicitudRefresco] = useState(0)
  const [placaBloqueada, setPlacaBloqueada] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }
  const [loadError, setLoadError] = useState('')
  const [toast, setToast] = useState(null)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [inspeccionAImprimir, setInspeccionAImprimir] = useState(null)
  const [selectedInspeccion, setSelectedInspeccion] = useState(null)

  const busquedaPlacaRef = useRef(null)

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
    fecha: fechaLocalActual(),
    inspector: '',
    tecnicoId: '',
    primeraEvaluacion: 'APROBADO',
    segundaEvaluacion: '',
    resultado: 'APROBADO',
    observaciones: '',
    detalles: [],
  })

  const [totalFiltrado, setTotalFiltrado] = useState(0)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const cargaInspecciones = useRef(null)

  const loadData = async () => {
    cargaInspecciones.current?.abort()
    const controller = new AbortController()
    cargaInspecciones.current = controller
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        porPagina: String(itemsPerPage),
      })
      if (debouncedSearch) params.set('buscar', debouncedSearch)
      if (filterResultado !== 'TODOS') params.set('resultado', filterResultado)
      if (filterVigencia !== 'TODOS') params.set('vigencia', filterVigencia)
      if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
      params.set('historial', filterHistorial)
      if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }

      const inspRes = await apiFetch(`/inspecciones?${params.toString()}`, { signal: controller.signal })
      if (!inspRes.ok) throw inspRes
      const inspPayload = await inspRes.json()
      if (controller.signal.aborted) return
      const fetched = (inspPayload.data || []).map((i) => ({
        ...i,
        detalles: typeof i.detalles === 'string' ? JSON.parse(i.detalles) : i.detalles || [],
      }))
      setInspecciones(fetched)
      setTotalFiltrado(inspPayload.meta?.total ?? fetched.length)
    } catch {
      if (!controller.signal.aborted) setLoadError('No se pudo cargar el módulo de inspecciones.')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }

  useEffect(() => {
    setLoadError('')
    loadData()
    return () => cargaInspecciones.current?.abort()
  }, [currentPage, itemsPerPage, debouncedSearch, filterResultado, filterVigencia, filterEstado, filterHistorial, sortBy, sortDir])

  useRecargaSilenciosa('/inspecciones', [() => loadData(), () => loadStats(), () => cargarSolicitudes()])

  const [stats, setStats] = useState({ totales: 0, aprobados: 0, observados: 0, desaprobados: 0, pendientes_revision: 0 })

  const loadStats = () => {
    apiFetch('/inspecciones/estadisticas')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((payload) => setStats(payload.data ?? {}))
      .catch(() => { })
  }

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    Promise.all([
      apiFetch('/inspeccion-criterios').catch(() => ({ ok: false })),
      apiFetch('/vehiculos?page=1&porPagina=100&ligero=1').catch(() => ({ ok: false })),
      apiFetch('/personal?page=1&porPagina=100&estado=ACTIVO&tipoInspector=TECNICO').catch(() => ({ ok: false })),
      apiFetch('/asociaciones?porPagina=100').catch(() => ({ ok: false })),
      apiFetch('/personas?page=1&porPagina=100&ligero=1').catch(() => ({ ok: false })),
    ]).then(async ([critRes, vehRes, persRes, asocRes, personasRes]) => {
      if (critRes.ok) {
        const critPayload = await critRes.json()
        const cData = critPayload.data || []
        setCriteriosInspeccion(cData)
        setCachedData('/inspeccion-criterios', cData)
      }
      if (vehRes.ok) {
        const vehPayload = await vehRes.json()
        setVehiculos(vehPayload.data || [])
      }
      if (persRes.ok) {
        const persPayload = await persRes.json()
        setTecnicos((persPayload.data || []).filter((p) => p.estado === 'ACTIVO'))
      }
      if (asocRes.ok) {
        const asocPayload = await asocRes.json()
        setAsociaciones(asocPayload.data || [])
      }
      if (personasRes.ok) {
        const personasPayload = await personasRes.json()
        setPersonas(personasPayload.data || [])
      }
    }).catch(() => { })
  }, [])

  // Cerrar la búsqueda de conductor al pulsar fuera.
  useEffect(() => {
    const handleClickOutside = (event) => {
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

  // KPIs derivados del total real (COUNT en backend), no de la página cargada
  const totales = stats.totales ?? 0
  const aprobados = stats.aprobados ?? 0
  const observados = stats.observados ?? 0
  const desaprobados = stats.desaprobados ?? 0
  const pendientesRevision = stats.pendientes_revision ?? 0
  const porcentajeAprobados = totales > 0 ? Math.round((aprobados / totales) * 100) : 0

  const filteredInspecciones = inspecciones

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterResultado, filterVigencia, filterEstado])

  const paginatedInspecciones = inspecciones

  const sumarPersonas = (lista) => setPersonas((prev) => [...prev.filter((p) => !lista.some((n) => n.id === p.id)), ...lista])
  useEffect(() => {
    const termino = (formData.conductorNombre || '').trim()
    if (termino.length < 3) return undefined
    const controller = new AbortController()
    const timer = setTimeout(() => {
      apiFetch(`/personas?page=1&porPagina=15&ligero=1&buscar=${encodeURIComponent(termino)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((payload) => { if (!controller.signal.aborted) sumarPersonas(payload.data || []) })
        .catch(() => {})
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [formData.conductorNombre]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const handlePlacaChange = (val, vehiculo) => {
    busquedaPlacaRef.current?.abort()
    const placaUpper = val.toUpperCase().trim()
    const vMatch = vehiculo || vehiculos.find((v) => normalizarPlaca(v.placa || '') === placaUpper)
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

  const buscarVehiculoPorPlaca = async () => {
    const placa = normalizarPlaca(formData.vehiculoPlaca || '')
    if (!placa || vehiculos.some((v) => normalizarPlaca(v.placa || '') === placa)) return
    busquedaPlacaRef.current?.abort()
    const controller = new AbortController()
    busquedaPlacaRef.current = controller
    try {
      const res = await apiFetch(`/vehiculos?buscar=${encodeURIComponent(placa)}&porPagina=20&ligero=1`, { signal: controller.signal })
      if (!res.ok) return
      const payload = await res.json()
      if (controller.signal.aborted) return
      const vehiculo = (payload.data || []).find((v) => normalizarPlaca(v.placa || '') === placa)
      if (vehiculo) {
        setVehiculos((prev) => [...prev.filter((v) => v.id !== vehiculo.id), vehiculo])
        handlePlacaChange(placa, vehiculo)
      }
    } catch (error) {
      if (error.name !== 'AbortError') showToast('No se pudo consultar el vehículo. Intenta nuevamente.', 'error')
    }
  }

  useEffect(() => () => busquedaPlacaRef.current?.abort(), [])

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
  const aplicarPersonaConductor = (match, dni) => {
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
      // Si el DNI cambia (o se borra) tras haber autocompletado a una persona, sus datos ya no corresponden:
      // se limpia la licencia (y el nombre, si venía de esa persona). Con el DNI vacío la licencia se limpia siempre.
      setFormData((prev) => ({
        ...prev,
        conductorDni: dni,
        ...(conductorEsRegistrado ? { conductorNombre: '', conductorLicencia: '' } : {}),
        ...(!dni ? { conductorLicencia: '' } : {}),
      }))
      setConductorEsRegistrado(false)
    }
  }

  const handleConductorDniChange = (value) => {
    const dni = value.trim()
    const match = personas.find((p) => (p.numeroDocumento || '').trim() === dni)
    aplicarPersonaConductor(match, dni)
    // Si no está entre las ya cargadas, se consulta al servidor (el padrón tiene miles de personas)
    if (!match && /^[A-Za-z0-9]{8,15}$/.test(dni)) {
      apiFetch(`/personas?page=1&porPagina=5&ligero=1&buscar=${encodeURIComponent(dni)}`)
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((payload) => {
          const lista = payload.data || []
          sumarPersonas(lista)
          const encontrado = lista.find((p) => (p.numeroDocumento || '').trim() === dni)
          if (encontrado) {
            aplicarPersonaConductor(encontrado, dni)
            return null
          }
          // No está en el sistema: con un DNI de 8 dígitos se completa el nombre desde RENIEC
          if (!/^\d{8}$/.test(dni)) return null
          return apiFetch(`/pide/reniec/${dni}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((reniec) => {
              const d = reniec?.data
              const nombre = d ? `${d.nombres || ''} ${d.apellidoPaterno || ''} ${d.apellidoMaterno || ''}`.replace(/\s+/g, ' ').trim().toUpperCase() : ''
              // Solo si el DNI sigue siendo el mismo y no se escribió otro nombre mientras tanto
              if (nombre) setFormData((prev) => (prev.conductorDni === dni ? { ...prev, conductorNombre: nombre } : prev))
            })
        })
        .catch(() => {})
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
      fecha: fechaLocalActual(),
      inspector: '',
      tecnicoId: '',
      primeraEvaluacion: 'PENDIENTE',
      segundaEvaluacion: '',
      resultado: 'PENDIENTE',
      observaciones: '',
      detalles: criteriosInspeccion.map((c) => ({ criterioId: c.id, estado: '', obs: '' })),
    })
    setSelectedInspeccion(null)
    busquedaPlacaRef.current?.abort()
    setConductorEsRegistrado(false)
    setConductorMismoPropietario(false)
    setChecklistModificado(false)
    setCorrelativoPreview({ numeroRegistro: '', numeroSerieCerticav: '' })
    apiFetch(`/inspecciones/siguiente-correlativo?anio=${new Date().getFullYear()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => json?.data && setCorrelativoPreview(json.data))
      .catch(() => { })
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
      fecha: inspeccion.fecha ? String(inspeccion.fecha).split('T')[0] : fechaLocalActual(),
      inspector: inspeccion.inspector || '',
      tecnicoId: inspeccion.tecnicoId || '',
      primeraEvaluacion: inspeccion.primeraEvaluacion || (inspeccion.resultado === 'DESAPROBADO' ? 'DESAPROBADO' : 'APROBADO'),
      segundaEvaluacion: inspeccion.segundaEvaluacion || '',
      resultado: inspeccion.resultado || 'APROBADO',
      observaciones: inspeccion.observaciones || '',
      detalles: criteriosInspeccion.map((c) => {
        const found = (inspeccion.detalles || []).find((d) => Number(d.criterioId) === c.id)
        return found || { criterioId: c.id, estado: '', obs: '' }
      }),
    })
    setSelectedInspeccion(inspeccion)
    busquedaPlacaRef.current?.abort()
    setConductorEsRegistrado(Boolean(inspeccion.conductorDni))
    const dniConductor = (inspeccion.conductorDni || '').trim()
    const dniPropietario = (inspeccion.propietarioDni || vMatch?.propietarioDni || '').trim()
    setConductorMismoPropietario(Boolean(dniConductor) && dniConductor === dniPropietario)
    setChecklistModificado(false)
    setIsModalOpen(true)
  }

  useEffect(() => {
    setInspeccionPendiente(null)
    if (!isModalOpen || selectedInspeccion || normalizarPlaca(formData.vehiculoPlaca || '').length !== 6) return
    const controller = new AbortController()
    apiFetch(`/inspecciones?buscar=${encodeURIComponent(formData.vehiculoPlaca)}&historial=ACTUALES&page=1&porPagina=20`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(payload => {
        if (!controller.signal.aborted) setInspeccionPendiente(payload?.data?.find(i => normalizarPlaca(i.vehiculoPlaca) === normalizarPlaca(formData.vehiculoPlaca) && i.resultado === 'OBSERVADO' && !i.segundaEvaluacion) || null)
      }).catch(() => {})
    return () => controller.abort()
  }, [isModalOpen, selectedInspeccion, formData.vehiculoPlaca])

  useEffect(() => {
    setCerticav(null)
    if (!isModalOpen || selectedInspeccion || normalizarPlaca(formData.vehiculoPlaca || '').length !== 6) return undefined
    const controller = new AbortController()
    apiFetch(`/inspecciones/certicav-estado?placa=${encodeURIComponent(formData.vehiculoPlaca)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => { if (!controller.signal.aborted) setCerticav(payload?.data || null) })
      .catch(() => {})
    return () => controller.abort()
  }, [isModalOpen, selectedInspeccion, formData.vehiculoPlaca])

  const recargarEstadoCerticav = () => {
    const placa = normalizarPlaca(formData.vehiculoPlaca || '')
    if (!isModalOpen || selectedInspeccion || placa.length !== 6) return
    apiFetch(`/inspecciones/certicav-estado?placa=${encodeURIComponent(placa)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => { if (payload?.data) setCerticav(payload.data) })
      .catch(() => {})
  }

  const solicitarCerticav = async () => {
    setSolicitandoCerticav(true)
    try {
      const res = await apiFetch('/inspecciones/certicav-solicitar', { method: 'POST', body: { placa: normalizarPlaca(formData.vehiculoPlaca) } })
      if (!res.ok) throw new Error(await leerMensajeError(res, 'No se pudo solicitar el CERTICAV.'))
      const payload = await res.json()
      setCerticav(payload?.data || null)
    } catch (err) {
      showError('No se pudo solicitar el CERTICAV', err.message)
    } finally {
      setSolicitandoCerticav(false)
    }
  }

  // Una inspección nueva solo se guarda con el CERTICAV pagado (formal y cobrado en Pagos)
  const certicavImpideGuardar = !selectedInspeccion && Boolean(certicav) && certicav.estado !== 'PAGADO'

  const cargarSolicitudes = () => {
    apiFetch('/inspecciones/certicav-solicitudes')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => { if (payload?.data) setSolicitudes(payload.data) })
      .catch(() => {})
  }

  useEffect(() => { cargarSolicitudes() }, [])

  // Solo se aceptan vehículos ya registrados en Vehículos: al completar la placa se traen sus datos
  useEffect(() => {
    setSolicitudVehiculo(null)
    const placa = normalizarPlaca(solicitudPlaca)
    if (!solicitudModal || placa.length !== 6) return undefined
    const controller = new AbortController()
    apiFetch(`/vehiculos?buscar=${encodeURIComponent(placa)}&porPagina=20&ligero=1`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (controller.signal.aborted) return
        const v = (payload?.data || []).find((x) => normalizarPlaca(x.placa || '') === placa)
        if (!v) {
          setSolicitudVehiculo({ noEncontrado: true })
          return null
        }
        setSolicitudVehiculo({ ...v, origen: 'sistema' })
        // Solo formales y sin CERTICAV vigente ni solicitud abierta pueden solicitar
        return apiFetch(`/inspecciones/certicav-estado?placa=${encodeURIComponent(placa)}`, { signal: controller.signal })
          .then((r) => (r.ok ? r.json() : null))
          .then((estado) => {
            if (!controller.signal.aborted && estado?.data) setSolicitudVehiculo({ ...v, origen: 'sistema', certicav: estado.data })
          })
      })
      .catch(() => {})
    return () => controller.abort()
  }, [solicitudModal, solicitudPlaca, solicitudRefresco])

  const editarVehiculoSolicitud = async () => {
    try {
      const res = await apiFetch(`/vehiculos/${solicitudVehiculo.uuid || solicitudVehiculo.id}`)
      const payload = res.ok ? await res.json() : null
      if (!payload?.data) throw new Error('No se pudo cargar el vehículo.')
      setVehiculoForm({ vehiculo: payload.data })
    } catch (err) {
      showError('No se pudo abrir el vehículo', err.message)
    }
  }

  const abrirSolicitud = () => {
    setSolicitudPlaca('')
    setSolicitudVehiculo(null)
    setSolicitudError('')
    setSolicitudModal(true)
  }

  const enviarSolicitud = async (event) => {
    event.preventDefault()
    const placa = normalizarPlaca(solicitudPlaca)
    if (placa.length !== 6) {
      setSolicitudError('Ingrese una placa de 6 caracteres.')
      return
    }
    setSolicitandoCerticav(true)
    setSolicitudError('')
    try {
      const res = await apiFetch('/inspecciones/certicav-solicitar', { method: 'POST', body: { placa } })
      if (!res.ok) {
        setSolicitudError(await leerMensajeError(res, 'No se pudo solicitar el CERTICAV.'))
        return
      }
      const payload = await res.json()
      cargarSolicitudes()
      setSolicitudesPage(1)
      setVista('SOLICITUDES')
      setSolicitudModal(false)
      showToast(
        payload?.data?.estado === 'PAGADO'
          ? `El CERTICAV de ${placa} ya está pagado: use "Realizar inspección".`
          : `CERTICAV de ${placa} solicitado. Cóbrelo en Pagos para habilitar la inspección.`,
        'crear'
      )
    } catch {
      setSolicitudError('No se pudo conectar con el servidor. Intente nuevamente.')
    } finally {
      setSolicitandoCerticav(false)
    }
  }

  const realizarInspeccion = (solicitud) => {
    handleOpenCreateModal()
    handlePlacaChange(normalizarPlaca(solicitud.placa))
    setPlacaBloqueada(normalizarPlaca(solicitud.placa))
  }

  // Si el vehículo no estaba en la lista cargada, se completan sus datos desde el padrón
  useEffect(() => {
    if (!isModalOpen || selectedInspeccion || !placaBloqueada || formData.vehiculoPlaca !== placaBloqueada || formData.vehiculoMarca) return
    buscarVehiculoPorPlaca()
  }, [isModalOpen, selectedInspeccion, placaBloqueada, formData.vehiculoPlaca])

  const handleAprobarInspeccion = async (inspeccion) => {
    try {
      const res = await apiFetch(`/inspecciones/${inspeccion.id}/aprobar`, {
        method: 'POST',
      })
      if (!res.ok) {
        showToast(await leerMensajeError(res, 'No se pudo aprobar la inspección.'), 'error')
        return
      }
      showToast(`Inspección ${inspeccion.numeroRegistro || ''} aprobada y oficializada con éxito`, 'crear')
      setIsDetailModalOpen(false)
      loadData()
      loadStats()
    } catch {
      showToast('Error de conexión al aprobar la inspección.', 'error')
    }
  }

  const handleOpenDetail = (inspeccion) => {
    setSelectedInspeccion(inspeccion)
    setIsDetailModalOpen(true)
  }

  // Datos de la ficha oficial CertiCAV de una inspección (los usa la impresión directa).
  const datosCerticav = (selectedInspeccion) => {
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
    return certicavData
  }

  // Imprimir = abrir directamente la ficha para imprimir/guardar como PDF (sin panel intermedio).
  const handleOpenPreview = (inspeccion) => {
    if (inspeccionAImprimir) return
    setInspeccionAImprimir(inspeccion)
  }

  useEffect(() => {
    if (!inspeccionAImprimir) return
    abrirImpresionCuandoEsteListo(() => setInspeccionAImprimir(null))
  }, [inspeccionAImprimir])

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
      loadStats()
      showToast(`Inspección ${objetivo.numeroRegistro || ''} anulada correctamente`, 'eliminar')
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
      const evalChecklist = calcularPrimeraEvaluacion(newDetalles)

      // La subsanación modifica la segunda evaluación, no la primera.
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
      showToast('Por favor  la placa del vehículo.', 'error')
      return
    }

    const payload = { ...formData }
    if (!formData.inspector.trim()) {
      showToast('Escriba o seleccione el inspector técnico responsable.', 'error')
      return
    }
    // Al editar sin tocar el checklist no se reenvía: así no se reemplaza el
    // historial de una inspección evaluada con el formato anterior.
    if (selectedInspeccion && !checklistModificado) {
      delete payload.detalles
    }
    if (payload.detalles && (!payload.detalles.length || payload.detalles.some(d => !d.estado))) {
      showToast('Evalúa todos los ítems antes de guardar.', 'error')
      return
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
      loadStats()
      cargarSolicitudes()
      setVista('INSPECCIONES')
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

  const fetchTodoElFiltro = async () => {
    const filas = await fetchTodasLasFilas('/inspecciones', {
      buscar: searchTerm,
      resultado: filterResultado === 'TODOS' ? '' : filterResultado,
      vigencia: filterVigencia === 'TODOS' ? '' : filterVigencia,
      historial: filterHistorial,
      sortBy,
      sortDir: sortBy ? sortDir : '',
    }, { mensaje: 'Preparando la descarga de inspecciones...' })
    return filas.map((i) => ({
      ...i,
      detalles: typeof i.detalles === 'string' ? JSON.parse(i.detalles) : i.detalles || [],
    }))
  }

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const data = await fetchTodoElFiltro()
      await exportToExcel({
        filename: `Inspecciones_Tecnicas_${fechaLocalActual()}.xlsx`,
        sheetName: 'Inspecciones',
        title: 'REGISTRO DE INSPECCIONES TÉCNICAS VEHICULARES - CERTICAV',
        subtitle: 'Subgerencia de Tránsito y Transporte - Control de Seguridad Vial',
        metadata: [
          { label: 'Resultado', value: filterResultado },
          { label: 'Vigencia', value: filterVigencia },
          { label: 'Total Registros', value: String(data.length) }
        ],
        columns: [
          { header: 'N° REGISTRO', key: 'numeroRegistro', isText: true, width: 120, align: 'center' },
          { header: 'SERIE CERTICAV', key: 'numeroSerieCerticav', isText: true, width: 140, align: 'center' },
          { header: 'N° INSPECCIÓN', key: 'numeroInspeccion', isText: true, width: 120, align: 'center' },
          { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 110, align: 'center' },
          { header: 'MARCA', key: 'vehiculoMarca', width: 110 },
          { header: 'MODELO', key: 'vehiculoModelo', width: 110 },
          { header: 'COLOR', key: 'vehiculoColor', width: 100 },
          { header: 'AÑO', key: 'vehiculoAnio', width: 70, align: 'center' },
          { header: 'SERIE DEL MOTOR', key: 'vehiculoMotor', isText: true, width: 140 },
          { header: 'PROPIETARIO', key: 'propietario', width: 180 },
          { header: 'DNI PROPIETARIO', key: 'propietarioDni', isText: true, width: 120, align: 'center' },
          { header: 'TRANSPORTADOR', key: 'transportador', width: 180 },
          { header: 'CONDUCTOR', key: 'conductorNombre', width: 180 },
          { header: 'DNI CONDUCTOR', key: 'conductorDni', isText: true, width: 120, align: 'center' },
          { header: 'LICENCIA', key: 'conductorLicencia', isText: true, width: 120, align: 'center' },
          { header: 'INSPECTOR', key: 'inspector', width: 180 },
          { header: 'FECHA INSPECCIÓN', key: 'fecha', width: 120, align: 'center' },
          { header: '1ª EVALUACIÓN', key: 'primeraEvaluacion', width: 110, align: 'center' },
          { header: '2ª EVALUACIÓN', key: 'segundaEvaluacion', width: 110, align: 'center' },
          { header: 'FECHA 2ª EVALUACIÓN', key: 'fechaSegundaEvaluacion', width: 120, align: 'center' },
          { header: 'RESULTADO', key: 'resultado', width: 120, align: 'center' },
          { header: 'OBSERVACIONES', key: 'observaciones', width: 260 },
          { header: 'VIGENCIA (MESES)', key: 'vigenciaMeses', width: 100, align: 'center' },
          { header: 'FECHA VENCIMIENTO', key: 'fechaVencimiento', width: 120, align: 'center' },
          { header: 'DÍAS RESTANTES', key: 'diasRestantes', width: 100, align: 'center' },
          { header: 'ESTADO VIGENCIA', key: 'estadoVigencia', width: 120, align: 'center' },
          { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
        ],
        data
      })
    } catch (error) {
      if (error.name !== 'AbortError') showError('Descarga no completada', error.message || 'No se pudo preparar el archivo completo.')
    } finally {
      setIsExportingExcel(false)
    }
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
      <ActionToast toast={toast} onClose={() => setToast(null)} />

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
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]"
            style={{ animation: 'modal-pop 0.25s ease-out' }}
          >
            <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-4 text-center">
              <span className="toast-icon grid size-14 place-items-center rounded-full bg-rose-100 text-rose-600 ring-8 ring-rose-50 dark:bg-rose-950/60 dark:text-rose-400 dark:ring-rose-950/30">
                <Icon name="trash" className="size-6" />
              </span>
              <h3 id="titulo-eliminar" className="text-base font-bold text-slate-900 dark:text-white">
                ¿Anular esta inspección?
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
              <BotonCancelar onClick={() => setInspeccionAEliminar(null)} disabled={eliminando} className="flex-1" />
              <button
                type="button"
                autoFocus
                disabled={eliminando}
                onClick={confirmarEliminacion}
                className="flex-1 rounded-xl px-4 py-2 text-sm font-bold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-60 cursor-pointer"
                style={{ backgroundColor: 'oklch(58.6% 0.253 17.585)' }}
              >
                {eliminando ? 'Anulando…' : 'Sí, anular'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loadError && <PageLoadError message={loadError} />}

      {/* Cabecera Principal - Estilo Exacto Personas */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="inspection" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Inspección Técnica Vehicular
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI con Bordes de Colores: 5 tarjetas compactas (Estilo exacto Personas) */}
      <div className="kpi-grid">
        {/* 1. Total registros */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Total registros
            </span>
            <span className="grid size-6 place-items-center rounded-md text-indigo-600 dark:text-indigo-400">
              <Icon name="inspection" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(totales)}
            </p>
          </div>
        </div>

        {/* 2. Aprobados */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Aprobados
            </span>
            <span className="grid size-6 place-items-center rounded-md text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(aprobados)}
            </p>
          </div>
        </div>

        {/* 3. Observados */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Observados
            </span>
            <span className="grid size-6 place-items-center rounded-md text-amber-600 dark:text-amber-400 font-bold text-xs">
              <Icon name="alert" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(observados)}
            </p>
          </div>
        </div>

        {/* 4. Desaprobados */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Desaprobados
            </span>
            <span className="grid size-6 place-items-center rounded-md text-rose-600 dark:text-rose-400 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(desaprobados)}
            </p>
          </div>
        </div>

        {/* 5. Aptitud Técnica */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              Aptitud Técnica
            </span>
            <span className="grid size-6 place-items-center rounded-md text-cyan-600 dark:text-cyan-400 font-bold text-xs">
              %
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {porcentajeAprobados}%
            </p>
          </div>
        </div>

        {/* 6. Pendientes de revisión (Móvil) */}
        <div
          onClick={() => {
            setFilterEstado((prev) => (prev === 'PENDIENTE_REVISION' ? 'TODOS' : 'PENDIENTE_REVISION'))
            setCurrentPage(1)
          }}
          className={`relative overflow-hidden rounded-xl border-[1.5px] ${filterEstado === 'PENDIENTE_REVISION' ? 'border-amber-500 ring-2 ring-amber-400 bg-amber-50/70 dark:bg-amber-950/40' : 'border-amber-400 bg-white dark:border-[var(--border)] dark:bg-[#1C2438]'} px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs cursor-pointer`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Pendientes revisión
            </span>
            <span className="grid size-6 place-items-center rounded-md text-amber-600 dark:text-amber-400 font-bold text-xs">
              <Icon name="clock" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(pendientesRevision)}
            </p>
            {Number(pendientesRevision) > 0 && (
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-black text-white">
                Móvil
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 flex border-b border-slate-200 dark:border-[var(--border)] print:hidden">
        <button
          type="button"
          onClick={() => setVista('INSPECCIONES')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${vista === 'INSPECCIONES' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <Icon name="inspection" className="size-4" />
          <span>Inspecciones registradas</span>
        </button>
        <button
          type="button"
          onClick={() => setVista('SOLICITUDES')}
          className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${vista === 'SOLICITUDES' ? 'border-amber-500 text-amber-500 dark:border-amber-400 dark:text-amber-400' : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
        >
          <Icon name="document" className="size-4" />
          <span>CERTICAV por inspeccionar</span>
          {solicitudes.length > 0 && (
            <span className="min-w-6 rounded-full bg-amber-400 px-2 py-0.5 text-center text-[11px] font-black text-amber-950 shadow-sm shadow-amber-500/40" title={`${solicitudes.filter((x) => !x.pagado).length} pendiente(s) de pago`}>
              {solicitudes.length}
            </span>
          )}
        </button>
      </div>

      {/* Solicitudes de CERTICAV: primero se solicita, luego se paga y recién entonces se inspecciona */}
      {vista === 'SOLICITUDES' && (() => {
        const porPagina = 5
        const termino = solBusqueda.trim().toLowerCase()
        const filtradas = solicitudes.filter((x) => (
          (solEstado === 'TODOS' || (solEstado === 'PAGADO') === Boolean(x.pagado))
          && (!termino || [x.placa, x.expediente, x.propietario, x.vehiculo].some((v) => String(v || '').toLowerCase().includes(termino)))
        ))
        const totalPaginas = Math.max(1, Math.ceil(filtradas.length / porPagina))
        const pagina = Math.min(solicitudesPage, totalPaginas)
        // Sin orden elegido: primero las pendientes de pago y luego las más recientes
        const columna = solSortBy.split(',')[0]
        const dir = (solSortDir.split(',')[0] === 'DESC' ? -1 : 1)
        const valor = (x) => ({ placa: x.placa, expediente: x.expediente, fecha: x.fecha, monto: Number(x.monto), estado: x.pagado ? 1 : 0 })[columna]
        const ordenadas = [...filtradas].sort((a, b) => {
          if (columna) {
            const va = valor(a)
            const vb = valor(b)
            const cmp = typeof va === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''), 'es', { numeric: true })
            return cmp * dir || b.id - a.id
          }
          return Number(a.pagado) - Number(b.pagado) || String(b.fecha).localeCompare(String(a.fecha)) || b.id - a.id
        })
        const visibles = ordenadas.slice((pagina - 1) * porPagina, pagina * porPagina)
        const ordenar = (col, d) => { setSolSortBy(col); setSolSortDir(d); setSolicitudesPage(1) }
        const hayFiltros = solEstado !== 'TODOS' || solBusqueda !== ''
        return (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">
            <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por placa, expediente o propietario"
                  value={solBusqueda}
                  onChange={(e) => { setSolBusqueda(e.target.value); setSolicitudesPage(1) }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-indigo-400"
                />
                {solBusqueda && (
                  <button type="button" onClick={() => { setSolBusqueda(''); setSolicitudesPage(1) }} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">✕</button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <RoundedSelect value={solEstado} onChange={(val) => { setSolEstado(val); setSolicitudesPage(1) }} options={FILTER_SOLICITUD_OPTIONS} />
                {hayFiltros && (
                  <button
                    type="button"
                    onClick={() => { setSolEstado('TODOS'); setSolBusqueda(''); setSolicitudesPage(1) }}
                    title="Limpiar filtros"
                    className="grid size-[34px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 shadow-2xs transition-all hover:bg-rose-100 hover:text-rose-700 active:scale-95 cursor-pointer dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60"
                  >
                    <Icon name="filterX" className="size-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={abrirSolicitud}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap hover:opacity-90"
                  style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                >
                  <span className="text-base leading-none font-black">+</span>
                  <span>Solicitar CERTICAV</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] table-fixed text-left text-xs">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[15%]" />
                  <col className="w-[14%]" />
                  <col className="w-[14%]" />
                  <col className="w-[22%]" />
                  <col className="w-[19%]" />
                </colgroup>
                <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3"><SortableHeader column="placa" label="Placa" sortBy={solSortBy} sortDir={solSortDir} onSort={ordenar} /></th>
                    <th className="px-4 py-3"><SortableHeader column="expediente" label="Expediente" sortBy={solSortBy} sortDir={solSortDir} onSort={ordenar} /></th>
                    <th className="px-4 py-3"><SortableHeader column="fecha" label="Fecha" sortBy={solSortBy} sortDir={solSortDir} onSort={ordenar} /></th>
                    <th className="px-4 py-3"><SortableHeader column="monto" label="Monto" align="right" sortBy={solSortBy} sortDir={solSortDir} onSort={ordenar} /></th>
                    <th className="px-4 py-3"><SortableHeader column="estado" label="Estado" sortBy={solSortBy} sortDir={solSortDir} onSort={ordenar} /></th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                  {visibles.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-12 text-center">
                        <Icon name="inspection" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                        <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron solicitudes</p>
                      </td>
                    </tr>
                  ) : visibles.map((x) => (
                    <tr key={x.id} className="group transition-colors hover:bg-[var(--brand-soft)] dark:hover:bg-[var(--bg-subtle)]">
                      <td className="px-4 py-3"><PlacaVehiculo placa={x.placa} /></td>
                      <td className="px-4 py-3 font-mono">{x.expediente}</td>
                      <td className="px-4 py-3">{formatFecha(x.fecha)}</td>
                      <td className="px-4 py-3 text-right font-mono">S/ {Number(x.monto).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${x.pagado ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'}`}>
                          {x.pagado ? `Pagado · ${x.numeroRecibo || ''}` : 'Pendiente de pago'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {x.pagado ? (
                          <button type="button" onClick={() => realizarInspeccion(x)} className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90">Realizar inspección</button>
                        ) : (
                          <button type="button" onClick={() => setCobrandoExpediente(x.expediente)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300/90 bg-amber-50 px-2.5 text-xs font-bold text-amber-700 shadow-2xs transition-all hover:bg-amber-500 hover:border-amber-500 hover:text-white dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-600 dark:hover:text-white active:scale-95 whitespace-nowrap cursor-pointer shrink-0 cursor-pointer"><Icon name="payment" className="size-3.5" /><span>Cobrar</span></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={pagina} totalItems={filtradas.length} itemsPerPage={porPagina} onPageChange={setSolicitudesPage} />
          </div>
        )
      })()}

      {/* Contenedor de la Tabla */}
      <div className={`rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden ${vista === 'INSPECCIONES' ? '' : 'hidden'}`}>
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon
              name="search"
              className={`absolute left-3 top-1/2 size-3.5 -translate-y-1/2 transition-colors text-slate-400`}
            />
            <input
              type="text"
              placeholder="Buscar por código, placa, conductor o titular"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-indigo-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RoundedSelect
              value={filterResultado}
              onChange={(val) => {
                setFilterResultado(val)
                setCurrentPage(1)
              }}
              options={FILTER_RESULTADO_OPTIONS}
            />

            <RoundedSelect
              value={filterVigencia}
              onChange={(val) => {
                setFilterVigencia(val)
                setCurrentPage(1)
              }}
              options={FILTER_VIGENCIA_OPTIONS}
            />

            {(filterResultado !== 'TODOS' || filterVigencia !== 'TODOS' || filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterResultado('TODOS')
                  setFilterVigencia('TODOS')
                  setFilterEstado('TODOS')
                  setSearchTerm('')
                  setCurrentPage(1)
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
              title="Descargar padrón en Excel (.xlsx)"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
              disabled={isExportingExcel}>
              <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`} />
              <span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
            </button>


            <button
              type="button"
              onClick={abrirSolicitud}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap hover:opacity-90"
              style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Solicitar CERTICAV</span>
            </button>
          </div>
        </div>

        {/* TABLA: EN CERTICAV EN LA TABLA VISIBLE NO SE MUESTRA INSPECTOR ASIGNADO */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[21%]" />
              <col className="w-[16%]" />
              <col className="w-[11%]" />
              <col className="w-[12%]" />
              <col className="w-[184px] min-w-[184px]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 "><SortableHeader column="numeroRegistro" label="N° Registro / Serie" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 "><SortableHeader column="vehiculoPlaca" label="Placa" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 ">Propietario</th>
                <th className="px-4 py-3 "><SortableHeader column="fecha" label="Fechas" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 "><SortableHeader column="resultado" label="Resultado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3">Vigencia</th>
                <th className="sticky right-0 z-20 px-4 py-3 text-center bg-slate-50/75 dark:bg-[var(--bg-subtle)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${isLoading && inspecciones.length > 0 ? 'opacity-50' : ''}`}>
              {isLoading && inspecciones.length === 0 ? (
                <FilaCargando colSpan={7} />
              ) : filteredInspecciones.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Icon name="inspection" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron inspecciones</p>
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
                      <td className="px-4 py-3 ">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-xs block">
                            {i.numeroRegistro || i.numeroInspeccion}
                          </span>
                          <span className={`block text-[10px] font-semibold ${Number(i.esActual) === 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>{Number(i.esActual) === 1 ? 'Actual' : 'Histórica'}</span>
                          {numSerie && (
                            <span className="inline-flex items-center font-mono text-[10.5px] font-bold text-sky-700 bg-sky-50 dark:text-sky-300 dark:bg-sky-950/60 px-2 py-0.5 rounded border border-sky-200/80 dark:border-sky-800">
                              Serie: {numSerie}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 ">
                        <PlacaVehiculo placa={i.vehiculoPlaca} vehiculoId={i.vehiculoId} />
                      </td>

                      <td className="px-4 py-3 max-w-[210px]">
                        <div>
                          <p
                            className="font-bold text-xs text-slate-900 dark:text-white min-w-0 break-words"
                            title={vehiculo?.propietario || i.propietario}
                          >
                            {vehiculo?.propietario || i.propietario || 'Propietario no asignado'}
                          </p>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 min-w-0 break-words">
                            {(vehiculo?.propietarioDni || i.propietarioDni) && (
                              <span className="font-mono font-semibold">
                                DNI: {vehiculo?.propietarioDni || i.propietarioDni}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3 ">
                        <div className="space-y-0.5 font-mono text-xs">
                          <p className="text-[11px] text-slate-400">
                            Fecha inspección: <span className="font-bold text-slate-700 dark:text-slate-200">{formatFecha(i.fecha)}</span>
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Fecha de vencimiento: <span className="font-bold text-slate-700 dark:text-slate-200">{formatFecha(i.fechaVencimiento)}</span>
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3 ">
                        {i.estado === 'PENDIENTE_REVISION' ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                            <span className="size-1.5 rounded-full bg-amber-600 animate-ping" />
                            PENDIENTE REVISIÓN
                          </span>
                        ) : (
                          getResultadoBadge(i.resultado)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {i.estado === 'PENDIENTE_REVISION' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            Por aprobar
                          </span>
                        ) : i.estadoVigencia === 'OBSERVADO' ? (
                          <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300">Pendiente de subsanar</span>
                        ) : i.estadoVigencia === 'DESAPROBADO' ? (
                          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300">No habilitado</span>
                        ) : i.estadoVigencia === 'VIGENTE' && Number(i.diasRestantes) <= 30 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">Por vencer</span>
                        ) : i.estadoVigencia ? (
                          <StatusBadge status={i.estadoVigencia} />
                        ) : <span className="text-slate-400">—</span>}
                      </td>

                      <td
                        className="sticky right-0 z-10 px-4 py-3 text-center bg-white group-hover:bg-[#e6eef8] dark:bg-[#1C2438] dark:group-hover:bg-[#222d45] transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.03)]"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          {i.estado === 'PENDIENTE_REVISION' && (
                            <button
                              type="button"
                              onClick={() => handleAprobarInspeccion(i)}
                              title="Aprobar inspección técnica móvil"
                              className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-600 hover:text-white dark:bg-emerald-950/50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white"
                            >
                              <Icon name="check" className="size-4" />
                            </button>
                          )}
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
                            title="Imprimir / guardar PDF de la ficha CertiCAV"
                            className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-print-bg)] border-[var(--action-print-border)] text-[var(--action-print-text)] hover:bg-[var(--action-print-hover)] hover:border-[var(--action-print-hover)] hover:text-white"
                          >
                            <Icon name="print" className="size-4" />
                          </button>

                          {/* EDITAR: Amarillo */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(i)}
                            title={i.resultado === 'OBSERVADO' && !i.segundaEvaluacion && Number(i.esActual) === 1 ? 'Continuar segunda evaluación' : 'Editar inspección'}
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
                            {i.resultado === 'OBSERVADO' && !i.segundaEvaluacion && Number(i.esActual) === 1 ? <span className="text-xs font-black">2ª</span> : <Icon name="pencil" className="size-4" />}
                          </button>

                          {/* ELIMINAR: Rojo */}
                          <button style={puedeEliminarRegistros() ? undefined : { display: 'none' }}
                            type="button"
                            onClick={() => handleDelete(i.id)}
                            title="Anular inspección"
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
          totalItems={totalFiltrado}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
          disabled={isLoading}
        />
      </div>

      {/* Modal Solicitar CERTICAV (solo placa; el cobro se hace en Pagos) */}
      {solicitudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 backdrop-blur-xs animate-enter sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = '1' }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === '1') setSolicitudModal(false); e.currentTarget.dataset.downOnOverlay = '' }}>
          <div className="w-full max-w-5xl rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3.5 dark:border-[var(--border)]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Solicitar CERTICAV</h3>
              <BotonCerrarModal onClick={() => setSolicitudModal(false)} title="Cerrar" />
            </div>
            <form onSubmit={enviarSolicitud} autoComplete="off" className="space-y-4 p-5 sm:p-6">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-3 dark:border-[var(--border)] dark:bg-slate-900/50">
                <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                  Documento y registro
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <FloatingInput
                    id="solicitud_placa"
                    label="N° de Placa del Vehículo"
                    required
                    autoFocus
                    value={solicitudPlaca}
                    inputClassName="font-mono font-black tracking-widest uppercase"
                    onChange={(e) => { setSolicitudPlaca(normalizarPlaca(e.target.value)); setSolicitudError('') }}
                  />
                  <FloatingInput id="solicitud_fecha" label="Fecha de solicitud" type="date" disabled value={fechaLocalActual()} onChange={() => {}} />
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-3 dark:border-[var(--border)] dark:bg-slate-900/50">
                <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                  Vehículo y transportador
                </h4>
                {solicitudVehiculo?.certicav && solicitudVehiculo.certicav.estado !== 'SIN_SOLICITUD' && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                    <p className="min-w-0 flex-1">
                      {solicitudVehiculo.certicav.estado === 'PAGADO' || solicitudVehiculo.certicav.estado === 'PENDIENTE_PAGO'
                        ? 'Este vehículo ya tiene una solicitud de CERTICAV en curso. Revísela en la lista "CERTICAV por inspeccionar".'
                        : solicitudVehiculo.certicav.mensaje}
                    </p>
                    {solicitudVehiculo.certicav.estado === 'NO_FORMAL' && (
                      <button type="button" onClick={editarVehiculoSolicitud} className="shrink-0 cursor-pointer rounded-lg bg-amber-600 px-3 py-1.5 font-bold text-white transition hover:opacity-90">Editar vehículo</button>
                    )}
                  </div>
                )}
                {solicitudVehiculo?.noEncontrado && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                    <p className="min-w-0 flex-1">La placa no está registrada en Vehículos. Regístrela y vincúlela a una asociación para solicitar el CERTICAV.</p>
                    <button type="button" onClick={() => setVehiculoForm({})} className="shrink-0 cursor-pointer rounded-lg bg-rose-600 px-3 py-1.5 font-bold text-white transition hover:opacity-90">Registrar vehículo</button>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                  <FloatingInput id="solicitud_marca" label="Marca de Vehículo" readOnly tabIndex={-1} value={solicitudVehiculo?.marca || ''} onChange={() => {}} />
                  <FloatingInput id="solicitud_modelo" label="Modelo" readOnly tabIndex={-1} value={solicitudVehiculo?.modelo || ''} onChange={() => {}} />
                  <FloatingInput id="solicitud_anio" label="Año Fabricación" readOnly tabIndex={-1} value={solicitudVehiculo?.anio || ''} onChange={() => {}} />
                  <FloatingInput id="solicitud_color" label="Color" readOnly tabIndex={-1} value={solicitudVehiculo?.color || ''} onChange={() => {}} />
                  <FloatingInput id="solicitud_motor" label="N° Motor" readOnly tabIndex={-1} value={solicitudVehiculo?.serieMotor || ''} onChange={() => {}} />
                </div>
                <FloatingInput id="solicitud_asoc" label="Razón Social del Transportador (Empresa / Asociación)" readOnly tabIndex={-1} value={solicitudVehiculo?.asociacion || ''} onChange={() => {}} />
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-3 dark:border-[var(--border)] dark:bg-slate-900/50">
                <h4 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                  Propietario
                </h4>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                  <div className="sm:col-span-4">
                    <FloatingInput id="solicitud_dni" label="DNI del Propietario" readOnly tabIndex={-1} value={solicitudVehiculo?.propietarioDni || ''} onChange={() => {}} />
                  </div>
                  <div className="sm:col-span-8">
                    <FloatingInput id="solicitud_propietario" label="Propietario del Vehículo" readOnly tabIndex={-1} value={solicitudVehiculo?.propietario || ''} onChange={() => {}} />
                  </div>
                </div>
              </div>
              {solicitudError && <p className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">{solicitudError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <BotonCancelar onClick={() => setSolicitudModal(false)} />
                <button type="submit" disabled={solicitandoCerticav || solicitudVehiculo?.certicav?.estado !== 'SIN_SOLICITUD'} title={solicitudVehiculo?.certicav?.estado === 'SIN_SOLICITUD' ? '' : 'Solo vehículos formales sin CERTICAV vigente ni solicitud en curso'} className="cursor-pointer rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{solicitandoCerticav ? 'Solicitando…' : 'Solicitar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {vehiculoForm && (
        <StandaloneVehiculoFormModal
          vehiculo={vehiculoForm.vehiculo || null}
          placaInicial={solicitudPlaca}
          onClose={() => setVehiculoForm(null)}
          onSuccess={() => setSolicitudRefresco((n) => n + 1)}
        />
      )}

      {/* Modal Registrar / Editar Inspección Técnica */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") setIsModalOpen(false); e.currentTarget.dataset.downOnOverlay = "" }}>
          <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="inspection" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedInspeccion ? 'Editar inspección CERTICAV' : 'Nueva inspección CERTICAV'}
                </h3>
              </div>
              <BotonCerrarModal onClick={() => setIsModalOpen(false)} title="Cerrar" />
            </div>

            <form onSubmit={handleFormSubmit} autoComplete="off" className="flex flex-col">
              {!selectedInspeccion && certicav && certicav.estado !== 'PAGADO' && (() => {
                const costo = Number(certicav.costo || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                const estilos = {
                  PAGADO: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300',
                  PENDIENTE_PAGO: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
                  SIN_SOLICITUD: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300',
                  NO_FORMAL: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300',
                }
                const boton = 'shrink-0 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60'
                return (
                  <div className={`mx-5 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 text-xs ${estilos[certicav.estado] || estilos.NO_FORMAL}`}>
                    <p className="min-w-0 flex-1 leading-snug">
                      {certicav.estado === 'PAGADO' && <><strong>CERTICAV pagado</strong> · recibo {certicav.numeroRecibo} · ya se puede registrar la revisión técnica.</>}
                      {certicav.estado === 'PENDIENTE_PAGO' && <><strong>CERTICAV pendiente de pago</strong> (S/ {costo}) · expediente {certicav.expediente}. Cóbralo en Pagos para poder registrar la revisión técnica.</>}
                      {certicav.estado === 'SIN_SOLICITUD' && <><strong>Falta solicitar el CERTICAV</strong> (S/ {costo}). Se solicita, se cobra en Pagos y luego se registra la revisión técnica.</>}
                      {certicav.estado === 'NO_FORMAL' && <><strong>Vehículo informal.</strong> El CERTICAV es solo para vehículos formales: vincúlalo a una asociación en Vehículos para poder inspeccionarlo.</>}
                    </p>
                    {certicav.estado === 'SIN_SOLICITUD' && (
                      <button type="button" onClick={solicitarCerticav} disabled={solicitandoCerticav} className={`${boton} bg-amber-600`}>
                        {solicitandoCerticav ? 'Solicitando…' : 'Solicitar CERTICAV'}
                      </button>
                    )}
                    {certicav.estado === 'PENDIENTE_PAGO' && (
                      <button type="button" onClick={() => setCobrandoExpediente(certicav.expediente || '')} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-300/90 bg-amber-50 px-2.5 text-xs font-bold text-amber-700 shadow-2xs transition-all hover:bg-amber-500 hover:border-amber-500 hover:text-white dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-600 dark:hover:text-white active:scale-95 whitespace-nowrap cursor-pointer shrink-0 cursor-pointer"><Icon name="payment" className="size-3.5" /><span>Cobrar</span></button>
                    )}
                    {certicav.estado === 'NO_FORMAL' && (
                      <button type="button" onClick={() => navigate('/vehiculos')} className={`${boton} bg-rose-600`}>Ir a Vehículos</button>
                    )}
                  </div>
                )
              })()}
              {inspeccionPendiente && (
                <div className="mx-5 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <p>Esta placa tiene una inspección observada pendiente: <strong>{inspeccionPendiente.numeroRegistro}</strong>. Si estás subsanando sus observaciones, continúa la segunda evaluación.</p>
                  <button type="button" onClick={() => handleOpenEditModal(inspeccionPendiente)} className="mt-2 rounded-lg bg-blue-600 px-3 py-2 font-bold text-white">Continuar segunda evaluación</button>
                  <p className="mt-2">Si corresponde a una revisión independiente, puedes continuar con este nuevo registro.</p>
                </div>
              )}
              <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* 1. Sección: Identificación del Documento y Talonario */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                    Documento y registro
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    {/* Consulta puntual por placa, sin cargar un desplegable. */}
                    <div className="sm:col-span-4">
                      <FloatingInput
                        id="insp_placa"
                        label="N° de Placa del Vehículo"
                        required
                        readOnly={Boolean(placaBloqueada) && !selectedInspeccion}
                        value={formData.vehiculoPlaca}
                        inputClassName="font-mono font-black tracking-widest uppercase text-slate-900 dark:text-white"
                        autoComplete="off"
                        onBlur={buscarVehiculoPorPlaca}
                        onChange={(e) => {
                          handlePlacaChange(normalizarPlaca(e.target.value))
                        }}
                      />

                    </div>

                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="insp_num_reg"
                        label="N° de Registro"
                        readOnly
                        tabIndex={-1}
                        value={(selectedInspeccion ? formData.numeroRegistro : correlativoPreview.numeroRegistro) || '…'}
                        inputClassName="font-mono font-bold uppercase cursor-not-allowed bg-slate-100 text-slate-600 dark:bg-[#1C2438] dark:text-slate-300"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <FloatingInput
                        id="insp_serie"
                        label="N° Serie CERTICAV"
                        readOnly
                        tabIndex={-1}
                        value={(selectedInspeccion ? formData.numeroSerieCerticav : correlativoPreview.numeroSerieCerticav) || '…'}
                        inputClassName="font-mono font-black text-sm tracking-wider cursor-not-allowed bg-slate-100 text-rose-600 dark:bg-[#1C2438] dark:text-rose-400"
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
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                    Vehículo y transportador
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
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

                    <div className="sm:col-span-2">
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

                    <div className="sm:col-span-3">
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
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                      <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
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

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                    <div className="sm:col-span-3">
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

                    {/* Propietario */}
                    <div className="sm:col-span-9">
                      <FloatingInput
                        id="insp_prop_nombre"
                        label="Propietario del Vehículo"
                        disabled
                        value={formData.propietario}
                        inputClassName="font-bold uppercase text-slate-800 dark:text-white"
                        onChange={(e) => setFormData({ ...formData, propietario: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="insp_cond_dni"
                        label="DNI Conductor"
                        maxLength={8}
                        disabled={conductorMismoPropietario}
                        value={formData.conductorDni}
                        inputClassName={`font-mono font-bold ${conductorMismoPropietario ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-[#1C2438]' : ''}`}
                        onChange={(e) => handleConductorDniChange(e.target.value)}
                      />
                    </div>

                    {/* Conductor con autocompletado contra el padrón de personas */}
                    <div className="sm:col-span-6 relative" ref={conductorDropdownRef}>
                      <FloatingInput
                        id="insp_cond_nombre"
                        label="Conductor"
                        required
                        disabled={conductorMismoPropietario}
                        value={formData.conductorNombre}
                        inputClassName={`font-bold uppercase text-slate-800 dark:text-white ${conductorMismoPropietario ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-[#1C2438]' : ''}`}
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
                              <span className="font-bold min-w-0 break-words max-w-[170px]">
                                {`${p.nombres || ''} ${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}`.trim()}
                              </span>
                              <span className="font-mono text-[11px] text-slate-400">{p.numeroDocumento}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Licencia */}
                    <div className="sm:col-span-3">
                      <FloatingInput
                        id="insp_cond_licencia"
                        label="N° Licencia de Conductor"
                        required
                        disabled={conductorMismoPropietario}
                        value={formData.conductorLicencia}
                        inputClassName={`font-mono font-bold uppercase ${conductorMismoPropietario ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-[#1C2438]' : ''}`}
                        onChange={(e) => setFormData({ ...formData, conductorLicencia: e.target.value.toUpperCase() })}
                      />
                    </div>

                    <div className="sm:col-span-12 relative">
                      <FloatingInput
                        id="insp_tecnico"
                        label="Inspector técnico responsable"
                        required
                        maxLength={200}
                        autoComplete="off"
                        value={formData.inspector}
                        onFocus={() => setTecnicoAbierto(true)}
                        onBlur={() => setTimeout(() => setTecnicoAbierto(false), 150)}
                        onChange={(e) => {
                          const nombre = e.target.value.toUpperCase()
                          const tecnico = tecnicos.find((t) => nombreTecnico(t) === nombre.trim().replace(/\s+/g, ' '))
                          setFormData({ ...formData, tecnicoId: tecnico?.id || '', inspector: nombre })
                          setTecnicoAbierto(true)
                        }}
                      />
                      {tecnicoAbierto && (() => {
                        const termino = (formData.inspector || '').trim().toUpperCase()
                        const lista = tecnicos.filter((t) => !termino || nombreTecnico(t).includes(termino))
                        if (!lista.length) return null
                        return (
                          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]">
                            {lista.map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                onMouseDown={() => {
                                  setFormData({ ...formData, tecnicoId: t.id, inspector: nombreTecnico(t) })
                                  setTecnicoAbierto(false)
                                }}
                                className={`flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-[13px] font-semibold transition hover:bg-slate-100 dark:hover:bg-slate-700/60 ${String(formData.tecnicoId) === String(t.id) ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'text-slate-700 dark:text-slate-200'}`}
                              >
                                {nombreTecnico(t)}
                              </button>
                            ))}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                </div>

                {/* 4. Sección: Evaluación de Criterios Técnicos */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-3 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
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
                                      <span className="font-bold text-slate-800 dark:text-white block break-words leading-snug text-[11.5px]" title={crit.nombre}>
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
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
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
                <BotonCancelar onClick={() => setIsModalOpen(false)} />
                <BotonGuardar disabled={certicavImpideGuardar}>
                  {selectedInspeccion ? 'Actualizar inspección' : 'Guardar inspección'}
                </BotonGuardar>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha de Detalle (Diccionario Visual - Estilo Exacto Personas y Ficha Oficial Digitalizada) */}
      {isDetailModalOpen && selectedInspeccion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="inspeccion-detalle w-full max-w-4xl rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[#1C2438]">
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
              <BotonCerrarModal onClick={() => setIsDetailModalOpen(false)} title="Cerrar ficha" className="inspeccion-cerrar" />
            </div>

            {/* Modal Body */}
            <div className="p-5 pb-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {selectedInspeccion.estado === 'PENDIENTE_REVISION' && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 dark:border-amber-700/60 dark:bg-amber-950/40">
                  <div className="flex items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300">
                      <Icon name="alert" className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">
                        Inspección técnica enviada desde la app móvil (Pendiente de revisión)
                      </p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300">
                        Registrada por el inspector <strong className="font-semibold">{selectedInspeccion.inspector || selectedInspeccion.nombreTecnico || 'técnico'}</strong>. Revise el dictamen y apruebe para oficializarla como ACTIVO.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAprobarInspeccion(selectedInspeccion)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <span>✓ Aprobar y Oficializar CERTICAV</span>
                  </button>
                </div>
              )}

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
                      <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-1 font-mono text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">{selectedInspeccion.vehiculoPlaca}</span>
                      {selectedInspeccion.numeroSerieCerticav && (
                        <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold tracking-wider text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
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
                      <span className="font-bold text-indigo-600 dark:text-indigo-400 text-right min-w-0 break-words max-w-[210px]" title={selectedInspeccion.transportador}>
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

                  <div className="space-y-3">
                    {/* Se muestran los criterios con que se evaluó esta inspección, no el
                        catálogo actual: las antiguas se evaluaron con otro formato. */}
                    {Object.entries(
                      selectedInspeccion.detalles.reduce((acc, d) => {
                        const seccion = d.seccion || 'GENERAL'
                          ; (acc[seccion] = acc[seccion] || []).push(d)
                        return acc
                      }, {})
                    ).map(([seccion, items]) => {
                      return (
                        <div key={seccion} className="space-y-1.5">
                          <h6 className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                            <span className="size-1 rounded-full bg-slate-400" />
                            {seccion}
                          </h6>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
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
                                    <span className="font-medium text-slate-800 dark:text-slate-200 block break-words leading-snug" title={nombre}>
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
                className="rounded-xl border border-blue-800 bg-blue-800 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-blue-900 active:scale-95 cursor-pointer"
              >
                Editar Inspección
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setIsDetailModalOpen(false)} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-1.5 text-xs font-bold text-blue-800 transition hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300 cursor-pointer">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {cobrandoExpediente && (
        <CobrarPagoModal
          expediente={cobrandoExpediente}
          onClose={() => setCobrandoExpediente(null)}
          onPagado={() => { cargarSolicitudes(); recargarEstadoCerticav() }}
        />
      )}

      {/* IMPRESIÓN DIRECTA DE LA FICHA CERTICAV: no hay panel; se abre el diálogo de impresión (ahí se guarda como PDF) */}
      {inspeccionAImprimir && (
        <div hidden>
          {/* Sin margen de página: así el navegador no imprime fecha, título, dirección ni "1/1" en los bordes.
              El margen institucional (12 mm × 14 mm) pasa a ser relleno de la propia hoja. */}
          <style>{`@page { size: A4 portrait; margin: 0; } @media print { .seccion-impresion-portal .ficha-certicav-a4 { padding: 12mm 14mm !important; box-sizing: border-box !important; } }`}</style>
          <CerticavFichaPrint data={datosCerticav(inspeccionAImprimir)} />
        </div>
      )}
    </div>
  )
}
