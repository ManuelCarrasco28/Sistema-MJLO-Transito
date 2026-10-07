import { useEffect, useState, useRef } from 'react'
import { useOficinaRegistral } from '../hooks/useOficinaRegistral'
import { OficinaRegistralSelect } from '../components/vehiculos/OficinaRegistralSelect'
import { QrVehiculoImpresion, plantillaDeVehiculo } from '../components/vehiculos/QrVehiculoImpresion'
import { QRCodeSVG } from 'qrcode.react'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PlacaBadge } from '../components/ui/PlacaBadge'
import { sanitizarMensaje, leerMensajeError, apiFetch, getCachedData, setCachedData } from '../config/api'
import { showError, showConfirm, showToast } from '../utils/SwalUtil'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { formatNumeroTarjeta, toTitleCase, normalizarPlaca } from '../utils/formatters'
import { isVehiculoFormal, getVehiculoDocumento, buildVehiculoQrValue } from '../utils/vehiculos'
import { RoundedSelect, FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { VehiculoFormModal } from '../components/vehiculos/VehiculoFormModal'
import { VehiculoDetalleModal } from '../components/vehiculos/VehiculoDetalleModal'
import { PersonaFormModal } from '../components/personas/PersonaFormModal'
import { fetchTodasLasFilas } from '../utils/descargaCompleta'

function formatTipoDocLabel(t) {
  const code = (t.codigo || '').toUpperCase().trim()
  if (code === 'DNI') return 'DNI (Doc. Nacional)'
  if (code === 'CE') return 'Carnet de Extranjería'
  if (code === 'PAS' || code === 'PASAPORTE') return 'Pasaporte'
  if (t.nombre) {
    const clean = t.nombre.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())
    return t.codigo ? `${t.codigo} - ${clean}` : clean
  }
  return t.codigo || t.nombre || 'Documento'
}

const ESTADO_CIVIL_OPTIONS = [
  { value: '', label: 'Seleccionar...' },
  { value: 'SOLTERO', label: 'SOLTERO' },
  { value: 'CASADO', label: 'CASADO' },
  { value: 'DIVORCIADO', label: 'DIVORCIADO' },
  { value: 'VIUDO', label: 'VIUDO' },
]

const ESTADO_OPTIONS = [
  { value: 'ACTIVO', label: 'ACTIVO' },
  { value: 'INACTIVO', label: 'INACTIVO' },
]

export function Vehiculos({ user }) {
  const rolNormalizado = (user?.rol || '').toUpperCase()
  const isOffice = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA'].includes(rolNormalizado)

  const cachedOrg = getCachedData('/asociaciones')
  const [vehiculos, setVehiculos] = useState([])
  const [personas, setPersonas] = useState([])
  const [asociaciones, setAsociaciones] = useState(cachedOrg || [])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [propietarioSearch, setPropietarioSearch] = useState('')
  const [showPropietarioResults, setShowPropietarioResults] = useState(false)
  const [propietarioResults, setPropietarioResults] = useState([])
  const [asociacionSearch, setAsociacionSearch] = useState('')
  const [showAsociacionResults, setShowAsociacionResults] = useState(false)
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [filterActivo, setFilterActivo] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [totalFiltrado, setTotalFiltrado] = useState(0)
  const [stats, setStats] = useState({ total: 0, formales: 0, informales: 0, suspendidos: 0 })
  const [loadError, setLoadError] = useState('')
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1)
    }, 160)
    return () => clearTimeout(timer)
  }, [searchTerm])

  // Búsqueda dinámica de propietarios bajo demanda (evita descargar 30,000 personas en memoria)
  useEffect(() => {
    const rawQuery = (propietarioSearch || '').trim()
    if (!rawQuery || rawQuery.includes('—') || rawQuery.length < 2) {
      setPropietarioResults([])
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(() => {
      apiFetch(`/personas?page=1&buscar=${encodeURIComponent(rawQuery)}&porPagina=10`, { signal: controller.signal })
        .then((r) => r.ok ? r.json() : { data: [] })
        .then((payload) => { if (!controller.signal.aborted) setPropietarioResults(payload.data || []) })
        .catch(() => {})
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [propietarioSearch])


  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedVehiculo, setSelectedVehiculo] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [titularDetectado, setTitularDetectado] = useState(null)

  const cachedTipos = getCachedData('/tipo-documentos')
  const [tipoDocOptions, setTipoDocOptions] = useState(() => {
    if (cachedTipos && Array.isArray(cachedTipos) && cachedTipos.length > 0) {
      return cachedTipos.map((t) => ({
        value: t.codigo || t.nombre,
        label: formatTipoDocLabel(t),
      }))
    }
    return [
      { value: 'DNI', label: 'DNI (Doc. Nacional)' },
      { value: 'CE', label: 'Carnet de Extranjería' },
      { value: 'PAS', label: 'Pasaporte' },
      { value: 'RUC', label: 'RUC' },
    ]
  })

  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false)
  const [isSearchingReniecPersona, setIsSearchingReniecPersona] = useState(false)
  const initialPersonaForm = {
    tipoDocumento: 'DNI',
    numeroDocumento: '',
    nombres: '',
    apellidoPaterno: '',
    apellidoMaterno: '',
    direccion: '',
    telefono: '',
    celular: '',
    email: '',
    numeroLicencia: '',
    estado: 'ACTIVO',
    estadoCivil: '',
    fotoImg: '',
    fotoUrl: '',
  }
  const [personaFormData, setPersonaFormData] = useState(initialPersonaForm)

  const handleOpenPersonaRapida = (titular) => {
    let dni = ''
    let nombres = ''
    let paterno = ''
    let materno = ''

    if (typeof titular === 'object' && titular !== null) {
      dni = titular.documento || ''
      const rawName = (titular.nombre || '').trim()
      const parts = rawName.split(/\s+/)
      if (parts.length >= 3) {
        paterno = parts[0]
        materno = parts[1]
        nombres = parts.slice(2).join(' ')
      } else if (parts.length === 2) {
        paterno = parts[0]
        nombres = parts[1]
      } else if (parts.length === 1) {
        nombres = parts[0]
      }
    } else if (typeof titular === 'string') {
      const trimmed = titular.trim()
      if (/^\d{8}$/.test(trimmed)) {
        dni = trimmed
      } else {
        const parts = trimmed.split(/\s+/)
        if (parts.length >= 3) {
          paterno = parts[0]
          materno = parts[1]
          nombres = parts.slice(2).join(' ')
        } else {
          nombres = trimmed
        }
      }
    }

    setPersonaFormData({
      ...initialPersonaForm,
      numeroDocumento: dni,
      nombres,
      apellidoPaterno: paterno,
      apellidoMaterno: materno,
    })
    setIsPersonaModalOpen(true)

    if (dni && dni.length === 8 && /^\d{8}$/.test(dni)) {
      handleReniecSearchPersona(dni)
    }
  }

  const handleReniecSearchPersona = async (explicitDni) => {
    const dni = typeof explicitDni === 'string' ? explicitDni : personaFormData.numeroDocumento?.trim()
    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      showError('DNI Inválido', 'El número de DNI debe tener exactamente 8 dígitos numéricos.')
      return
    }

    setIsSearchingReniecPersona(true)
    try {
      const response = await apiFetch(`/pide/reniec/${dni}`)
      if (!response.ok) {
        throw new Error(await leerMensajeError(response, 'El servicio de consulta no responde en este momento. Ingrese los datos manualmente.'))
      }
      const res = await response.json()
      const data = res.data || (res.nombres ? res : null)
      if (data) {
        setPersonaFormData((prev) => ({
          ...prev,
          numeroDocumento: dni,
          nombres: (data.nombres || '').toUpperCase() || prev.nombres,
          apellidoPaterno: (data.apellidoPaterno || data.apellido_paterno || '').toUpperCase() || prev.apellidoPaterno,
          apellidoMaterno: (data.apellidoMaterno || data.apellido_materno || '').toUpperCase() || prev.apellidoMaterno,
          direccion: toTitleCase(data.direccion) || prev.direccion,
          estadoCivil: (data.estadoCivil || data.estado_civil || '').toUpperCase() || prev.estadoCivil,
          fotoImg: data.foto_url || data.foto || prev.fotoImg,
          fotoUrl: data.foto_url || data.foto || prev.fotoUrl,
        }))
      } else {
        throw new Error('No se encontraron datos para el documento ingresado.')
      }
    } catch (err) {
      showError('Consulta de Documento', err.message || 'No se pudo consultar el documento.')
    } finally {
      setIsSearchingReniecPersona(false)
    }
  }

  const handlePhotoUploadPersona = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      showError('Formato Inválido', 'Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      const rawData = ev.target?.result
      if (!rawData) return
      const img = new Image()
      img.onload = () => {
        const maxDim = 400
        let width = img.width
        let height = img.height
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const compressed = canvas.toDataURL('image/jpeg', 0.85)
        setPersonaFormData((prev) => ({ ...prev, fotoImg: compressed, fotoUrl: compressed }))
      }
      img.onerror = () => {
        setPersonaFormData((prev) => ({ ...prev, fotoImg: rawData, fotoUrl: rawData }))
      }
      img.src = rawData
    }
    reader.readAsDataURL(file)
  }

  const handleClearPhotoPersona = () => {
    setPersonaFormData((prev) => ({ ...prev, fotoImg: '', fotoUrl: '' }))
  }

  const handlePersonaFormSubmit = async (e) => {
    e.preventDefault()
    const docLen = (personaFormData.numeroDocumento || '').trim().length
    if (
      !personaFormData.numeroDocumento.trim() ||
      !personaFormData.nombres.trim() ||
      !personaFormData.apellidoPaterno.trim() ||
      !personaFormData.apellidoMaterno.trim() ||
      !personaFormData.numeroLicencia.trim() ||
      !personaFormData.direccion.trim()
    ) {
      showError('Validación Fallida', 'Por favor completa todos los campos requeridos (Documento, Nombres, Apellidos, Licencia y Dirección).')
      return
    }
    const isDni = personaFormData.tipoDocumento === 'DNI' || personaFormData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD'
    if (isDni && (docLen !== 8 || !/^\d{8}$/.test(personaFormData.numeroDocumento.trim()))) {
      showError('DNI Inválido', 'El DNI debe tener exactamente 8 dígitos numéricos.')
      return
    }
    if (!isDni && (docLen < 8 || docLen > 15)) {
      showError('Documento Inválido', 'El número de documento debe tener entre 8 y 15 caracteres.')
      return
    }
    if (personaFormData.email && personaFormData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personaFormData.email.trim())) {
      showError('Validación Fallida', 'Por favor ingresa un correo electrónico válido.')
      return
    }
    if (personaFormData.celular && personaFormData.celular.trim() && !/^\d{9}$/.test(personaFormData.celular.trim())) {
      showError('Validación Fallida', 'El número de celular debe tener exactamente 9 dígitos numéricos.')
      return
    }

    try {
      const res = await apiFetch('/personas', {
        method: 'POST',
        body: personaFormData,
      })
      const resData = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(resData.messages?.error || resData.message || 'Error al registrar la persona.')
      }
      const newPersona = resData.data || { ...personaFormData, id: Date.now() }
      const standardizedPersona = {
        ...newPersona,
        id: Number(newPersona.id || Date.now()),
        numeroDocumento: String(newPersona.numeroDocumento || newPersona.numero || personaFormData.numeroDocumento || '').trim(),
        nombres: (newPersona.nombres || personaFormData.nombres || '').trim(),
        apellidoPaterno: (newPersona.apellidoPaterno || newPersona.apellido_paterno || personaFormData.apellidoPaterno || '').trim(),
        apellidoMaterno: (newPersona.apellidoMaterno || newPersona.apellido_materno || personaFormData.apellidoMaterno || '').trim(),
      }

      selectPropietario(standardizedPersona)
      setPropietarioResults((prev) => [standardizedPersona, ...prev.filter((p) => String(p.numeroDocumento || p.numero || '').trim() !== standardizedPersona.numeroDocumento)])
      setTitularDetectado({
        nombre: `${standardizedPersona.nombres} ${standardizedPersona.apellidoPaterno} ${standardizedPersona.apellidoMaterno}`.trim(),
        documento: standardizedPersona.numeroDocumento,
        matchedPersona: standardizedPersona,
      })
      setIsPersonaModalOpen(false)
      showToast('Persona registrada y asignada como propietario.')
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo guardar la persona.'))
    }
  }

  const oficinaReg = useOficinaRegistral()
  const [vehiculoQrImpresion, setVehiculoQrImpresion] = useState(null)
  const [consultaPlaca, setConsultaPlaca] = useState('')
  const [consultaResult, setConsultaResult] = useState(null)
  const [consultaError, setConsultaError] = useState('')
  const [isSearchingSunarp, setIsSearchingSunarp] = useState(false)

  const handleConsulta = async (e) => {
    e.preventDefault()
    if (!consultaPlaca.trim()) return
    const plate = consultaPlaca.replace(/[^A-Za-z0-9]/g, '').toUpperCase()

    if (plate.length < 5) {
      setConsultaError('Ingrese una placa válida (ej. M6Y544 o M6Y-544).')
      return
    }

    setConsultaResult(null)
    setConsultaError('')
    setIsSearchingSunarp(true)

    try {
      const response = await apiFetch('/pide/sunarp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: plate, codeZona: oficinaReg.codeZona, codeOficina: oficinaReg.codeOficina })
      })

      if (!response.ok) {
        throw new Error(await leerMensajeError(response, 'No se pudo consultar la información del vehículo.'))
      }

      const res = await response.json()
      const sunarpData = res.data || (res.success && res.data ? res.data : (res.placa ? res : null))

      if (!sunarpData) {
        throw new Error(res.message || 'No se encontraron registros para la placa ingresada.')
      }

      const foundInPadron = vehiculos.find(v => (v.placa || '').toUpperCase() === plate)

      const rawProps = Array.isArray(sunarpData.propietarios) ? sunarpData.propietarios : []
      const propNames = rawProps
        .map(p => typeof p === 'string' ? p.trim() : (p.nombre || p.razon_social || p.apellidos_nombres || ''))
        .filter(Boolean)
        .join(' - ')

      const cat = (sunarpData.categoria || '').toUpperCase().trim()
      const carr = (sunarpData.carroceria || '').toUpperCase().trim()
      let inferredTipo = 'Vehículo'
      if (cat === 'L1' || cat === 'L2' || cat === 'L3' || carr.includes('LINEAL')) inferredTipo = 'Moto Lineal'
      else if (cat === 'L5' && /CARG/.test(carr)) inferredTipo = 'Motocarguera'
      else if (cat === 'L5' || carr.includes('TRIMOVIL') || carr.includes('MOTOTAXI') || carr.includes('MOTOKAR')) inferredTipo = 'Mototaxi'
      else if (cat === 'M1' || carr.includes('SEDAN') || carr.includes('HATCHBACK') || carr.includes('SUV')) inferredTipo = 'Automóvil'
      else if (cat === 'M2' || carr.includes('COMBI') || carr.includes('RURAL') || carr.includes('MICROBUS')) inferredTipo = 'Camioneta Rural'

      let rawAnio = sunarpData.ano_fabricacion ?? sunarpData.anio_fabricacion ?? sunarpData.anio ?? ''
      let detectedAnio = parseInt(String(rawAnio).trim(), 10)
      if (!detectedAnio || detectedAnio < 1900 || detectedAnio > 2100) {
        const vin = (sunarpData.serie || sunarpData.vin || sunarpData.numero_serie || '').toUpperCase().trim()
        if (vin.length >= 10) {
          const vinCode = vin.charAt(9)
          const vinYears = {
            '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
            'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017,
            'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025,
            'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030
          }
          if (vinYears[vinCode]) {
            detectedAnio = vinYears[vinCode]
          }
        }
      }
      if (!detectedAnio || detectedAnio < 1900 || detectedAnio > 2100) {
        detectedAnio = foundInPadron?.anio || new Date().getFullYear()
      }

      const combined = {
        placa: plate,
        marca: foundInPadron?.marca || sunarpData.marca || 'N/A',
        modelo: foundInPadron?.modelo || sunarpData.modelo || 'N/A',
        color: foundInPadron?.color || sunarpData.color || 'N/A',
        serieMotor: foundInPadron?.serieMotor || sunarpData.numero_motor || sunarpData.nro_motor || 'N/A',
        numeroSerie: foundInPadron?.numeroSerie || sunarpData.serie || sunarpData.vin || sunarpData.numero_serie || sunarpData.nro_serie || 'N/A',
        partidaRegistral: foundInPadron?.partidaRegistral || sunarpData.partida || sunarpData.partida_registral || 'N/A',
        propietario: foundInPadron?.propietario || propNames || 'NO REGISTRADO',
        propietarioTipoDocumento: foundInPadron ? 'DNI' : (rawProps[0]?.numero_documento ? 'DNI' : null),
        propietarioDni: foundInPadron?.propietarioDni || rawProps[0]?.numero_documento || rawProps[0]?.dni || null,
        asociacion: foundInPadron?.asociacion || null,
        estado: foundInPadron?.estado || 'INACTIVO',
        esDelPadron: !!foundInPadron,
        anio: detectedAnio,
        categoria: foundInPadron?.categoria || sunarpData.categoria || 'N/A',
        carroceria: foundInPadron?.carroceria || sunarpData.carroceria || 'N/A',
        sedeRegistro: foundInPadron?.sedeRegistro || sunarpData.sede || sunarpData.oficina_registral || sunarpData.oficina || 'N/A',
        tipoCarroceria: foundInPadron?.tipoCarroceria || sunarpData.tipo_carroceria || sunarpData.carroceria || 'N/A',
        tipo: foundInPadron?.tipo || inferredTipo,
        ...(foundInPadron || {})
      }

      setConsultaResult(combined)
    } catch (err) {
      setConsultaError(err.message || 'Error al realizar la consulta.')
    } finally {
      setIsSearchingSunarp(false)
    }
  }

  const [formData, setFormData] = useState({
    placa: '',
    tipo: '',
    marca: '',
    modelo: '',
    color: '',
    anio: '',
    categoria: '',
    carroceria: '',
    sedeRegistro: '',
    tipoCarroceria: '',
    numeroSerie: '',
    serieMotor: '',
    asociacion: '',
    propietario: '',
    propietarioDni: '',
    estado: 'ACTIVO',
    soatEstado: 'VIGENTE',
    tucNumero: 'TUC-2026-000',
  })
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const loadStats = () => {
    apiFetch('/vehiculos/estadisticas')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((payload) => {
        if (payload?.data) setStats(payload.data)
      })
      .catch(() => {})
  }

  const cargaVehiculos = useRef(null)
  const loadVehiculos = async () => {
    cargaVehiculos.current?.abort()
    const controller = new AbortController()
    cargaVehiculos.current = controller
    setIsLoading(true)
    setLoadError('')
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        porPagina: String(itemsPerPage),
      })
      if (debouncedSearchTerm) params.set('buscar', debouncedSearchTerm)
      if (filterTipo !== 'TODOS') params.set('tipo', filterTipo)
      if (filterEstado !== 'TODOS') params.set('formalidad', filterEstado)
      if (filterActivo !== 'TODOS') params.set('estado', filterActivo)
      if (sortBy) {
        params.set('sortBy', sortBy)
        params.set('sortDir', sortDir)
      }

      const res = await apiFetch(`/vehiculos?${params.toString()}`, { signal: controller.signal })
      if (!res.ok) throw res
      const payload = await res.json()
      if (controller.signal.aborted) return
      setVehiculos(payload.data ?? [])
      setTotalFiltrado(payload.meta?.total ?? payload.data?.length ?? 0)
    } catch {
      if (controller.signal.aborted) return
      setLoadError('No se pudo cargar el padrón vehicular.')
    } finally {
      if (!controller.signal.aborted) setIsLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
    apiFetch('/asociaciones')
      .then((res) => res.ok ? res.json() : null)
      .then((payload) => {
        if (payload?.data) {
          setAsociaciones(payload.data)
          setCachedData('/asociaciones', payload.data)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadVehiculos()
    return () => cargaVehiculos.current?.abort()
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterTipo, filterEstado, filterActivo, sortBy, sortDir])

  const getPersonaNombre = (persona) => (
    persona.nombreCompleto ||
    `${persona.nombres || ''} ${persona.apellidoPaterno || persona.apellido_paterno || ''} ${persona.apellidoMaterno || persona.apellido_materno || ''}`.trim()
  )

  const selectPropietario = (persona) => {
    const documento = String(persona.numeroDocumento || persona.numero || persona.dni || '').trim()
    const nombre = getPersonaNombre(persona)
    setFormData((prev) => ({
      ...prev,
      propietarioDni: documento,
      propietario: nombre,
    }))
    setPropietarioSearch(documento ? `${documento} — ${nombre}` : nombre)
    setShowPropietarioResults(false)
  }

  const asociacionResults = asociaciones
    .filter((org) => {
      const query = asociacionSearch.trim().toLowerCase()
      if (!query) return true
      return `${org.razonSocial || ''} ${org.ruc || ''} ${org.partidaRegistral || ''}`.toLowerCase().includes(query)
    })
    .slice(0, 8)

  const selectAsociacion = (org) => {
    const nombre = org?.razonSocial || ''
    setFormData((prev) => ({
      ...prev,
      asociacion: nombre,
    }))
    setAsociacionSearch(nombre)
    setShowAsociacionResults(false)
  }

  const clearAsociacion = () => {
    setFormData((prev) => ({
      ...prev,
      asociacion: '',
    }))
    setAsociacionSearch('')
    setShowAsociacionResults(false)
  }

  const [isBuscandoSunarpModal, setIsBuscandoSunarpModal] = useState(false)

  const handleBuscarSunarpModal = async () => {
    const plate = (formData.placa || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (plate.length < 5) {
      showError('Placa inválida', 'Ingrese una placa válida antes de buscar')
      return
    }

    setIsBuscandoSunarpModal(true)
    try {
      const response = await apiFetch('/pide/sunarp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placa: plate, codeZona: oficinaReg.codeZona, codeOficina: oficinaReg.codeOficina })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.messages?.error || errData.message || 'No se pudo consultar la información del vehículo.')
      }

      const res = await response.json()
      const sunarpData = res.data || (res.success && res.data ? res.data : (res.placa ? res : null))
      if (!sunarpData) {
        throw new Error(res.message || 'No se encontraron registros para la placa ingresada.')
      }

      const cat = (sunarpData.categoria || '').toUpperCase().trim()
      const carr = (sunarpData.carroceria || '').toUpperCase().trim()
      let inferredTipo = formData.tipo
      if (cat === 'L1' || cat === 'L2' || cat === 'L3' || carr.includes('LINEAL')) inferredTipo = 'Moto Lineal'
      else if (cat === 'L5' && /CARG/.test(carr)) inferredTipo = 'Motocarguera'
      else if (cat === 'L5' || carr.includes('TRIMOVIL') || carr.includes('MOTOTAXI') || carr.includes('MOTOKAR')) inferredTipo = 'Mototaxi'
      else if (cat === 'M1' || carr.includes('SEDAN') || carr.includes('HATCHBACK') || carr.includes('SUV')) inferredTipo = 'Automóvil'
      else if (cat === 'M2' || carr.includes('COMBI') || carr.includes('RURAL') || carr.includes('MICROBUS')) inferredTipo = 'Camioneta Rural'

      const rawProps = Array.isArray(sunarpData.propietarios) ? sunarpData.propietarios : []
      const mappedProps = rawProps.map((p, idx) => {
        const nombreStr = typeof p === 'string' ? p.trim() : (p.nombre || p.razon_social || p.apellidos_nombres || '')
        const docStr = typeof p === 'object' ? (p.numero_documento || p.dni || p.ruc || '') : ''
        return {
          nombre: nombreStr,
          documento: docStr,
          esPrincipal: idx === 0,
        }
      }).filter(p => p.nombre)

      const legalOwner = mappedProps[0] || (rawProps[0] ? { nombre: String(rawProps[0]), documento: '', esPrincipal: true } : null)

      if (legalOwner) {
        let matched = null
        if (legalOwner.documento) {
          matched = (personas || []).find(p => (p.numeroDocumento || '').trim() === legalOwner.documento.trim())
          if (!matched) {
            try {
              const resP = await apiFetch(`/personas?page=1&buscar=${encodeURIComponent(legalOwner.documento.trim())}&porPagina=5`)
              if (resP.ok) {
                const payloadP = await resP.json()
                matched = (payloadP.data || []).find(p => (p.numeroDocumento || '').trim() === legalOwner.documento.trim()) || null
              }
            } catch (err) { console.warn("No se pudo buscar al titular legal en personas:", err) }
          }
        }
        if (!matched && legalOwner.nombre) {
          const cleanOwnerName = legalOwner.nombre.toUpperCase().trim()
          matched = (personas || []).find(p => {
            const fullPName = `${p.nombres || ''} ${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}`.toUpperCase().trim()
            return fullPName && (cleanOwnerName.includes(fullPName) || fullPName.includes(cleanOwnerName))
          })
          if (!matched) {
            try {
              const resP = await apiFetch(`/personas?page=1&buscar=${encodeURIComponent(legalOwner.nombre.trim())}&porPagina=5`)
              if (resP.ok) {
                const payloadP = await resP.json()
                matched = (payloadP.data || []).find(p => {
                  const fullPName = `${p.nombres || ''} ${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}`.toUpperCase().trim()
                  return fullPName && (cleanOwnerName.includes(fullPName) || fullPName.includes(cleanOwnerName))
                }) || null
              }
            } catch (err) { console.warn("No se pudo buscar al titular legal en personas:", err) }
          }
        }

        if (matched) {
          selectPropietario(matched)
          setTitularDetectado({ ...legalOwner, matchedPersona: matched })
        } else {
          setTitularDetectado({ ...legalOwner, matchedPersona: null })
          setPropietarioSearch(legalOwner.nombre)
          setFormData((prev) => ({
            ...prev,
            propietarioDni: legalOwner.documento || '',
            propietario: legalOwner.nombre || '',
          }))
        }
      }

      let rawModalAnio = sunarpData.ano_fabricacion ?? sunarpData.anio_fabricacion ?? sunarpData.anio ?? ''
      let detectedModalAnio = parseInt(String(rawModalAnio).trim(), 10)
      if (!detectedModalAnio || detectedModalAnio < 1900 || detectedModalAnio > 2100) {
        const vin = (sunarpData.serie || sunarpData.vin || sunarpData.numero_serie || '').toUpperCase().trim()
        if (vin.length >= 10) {
          const vinCode = vin.charAt(9)
          const vinYears = {
            '1': 2001, '2': 2002, '3': 2003, '4': 2004, '5': 2005, '6': 2006, '7': 2007, '8': 2008, '9': 2009,
            'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014, 'F': 2015, 'G': 2016, 'H': 2017,
            'J': 2018, 'K': 2019, 'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024, 'S': 2025,
            'T': 2026, 'V': 2027, 'W': 2028, 'X': 2029, 'Y': 2030
          }
          if (vinYears[vinCode]) {
            detectedModalAnio = vinYears[vinCode]
          }
        }
      }
      if (!detectedModalAnio || detectedModalAnio < 1900 || detectedModalAnio > 2100) {
        detectedModalAnio = ''
      }

      setFormData((prev) => ({
        ...prev,
        placa: plate,
        tipo: inferredTipo,
        marca: sunarpData.marca || prev.marca,
        modelo: sunarpData.modelo || prev.modelo,
        color: sunarpData.color || prev.color,
        anio: detectedModalAnio,
        categoria: sunarpData.categoria || prev.categoria,
        carroceria: sunarpData.carroceria || prev.carroceria,
        tipoCarroceria: sunarpData.tipo_carroceria || sunarpData.carroceria || prev.tipoCarroceria,
        sedeRegistro: sunarpData.sede || sunarpData.oficina_registral || sunarpData.oficina || prev.sedeRegistro,
        numeroSerie: sunarpData.serie || sunarpData.vin || sunarpData.numero_serie || sunarpData.nro_serie || prev.numeroSerie,
        serieMotor: sunarpData.numero_motor || sunarpData.nro_motor || prev.serieMotor,
        partidaRegistral: sunarpData.partida || sunarpData.partida_registral || prev.partidaRegistral,
      }))
    } catch (err) {
      showError('Error de consulta', sanitizarMensaje(err.message, 'No se pudo consultar la información del vehículo.'))
    } finally {
      setIsBuscandoSunarpModal(false)
    }
  }

  const totalVehiculos = stats.total ?? 0
  const formales = stats.formales ?? 0
  const informales = stats.informales ?? 0
  const suspendidos = stats.suspendidos ?? 0
  const porcentajeFormales = totalVehiculos > 0 ? Math.round((formales / totalVehiculos) * 100) : 0

  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }

  const paginatedVehiculos = vehiculos
  const filteredVehiculos = vehiculos

  const fetchTodoElFiltro = (maxFilas = Infinity) =>
    fetchTodasLasFilas('/vehiculos', {
      buscar: debouncedSearchTerm,
      tipo: filterTipo === 'TODOS' ? '' : filterTipo,
      formalidad: filterEstado === 'TODOS' ? '' : filterEstado,
      estado: filterActivo === 'TODOS' ? '' : filterActivo,
      sortBy,
      sortDir: sortBy ? sortDir : '',
    }, { mensaje: 'Preparando la descarga de vehículos...', maxFilas })

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const dataToExport = { endpoint: '/vehiculos', params: {
        buscar: debouncedSearchTerm, tipo: filterTipo === 'TODOS' ? '' : filterTipo,
        formalidad: filterEstado === 'TODOS' ? '' : filterEstado,
        estado: filterActivo === 'TODOS' ? '' : filterActivo, sortBy, sortDir,
      } }
      await exportToExcel({
            filename: `Padron_Vehicular_${new Date().toISOString().slice(0, 10)}.xls`,
            sheetName: 'Vehículos',
            title: 'PADRÓN VEHICULAR MUNICIPAL',
            subtitle: 'Subgerencia de Tránsito y Transporte - Registro Oficial',
            metadata: [
              { label: 'Tipo Vehículo', value: filterTipo },
              { label: 'Formalidad', value: filterEstado },
              { label: 'Estado', value: filterActivo }
            ],
            columns: [
              { header: 'PLACA', key: 'placa', isText: true, width: 110, align: 'center' },
              { header: 'TIPO VEHÍCULO', key: 'tipo', width: 140 },
              { header: 'MARCA', key: 'marca', width: 120 },
              { header: 'MODELO', key: 'modelo', width: 120 },
              { header: 'COLOR', key: 'color', width: 110 },
              { header: 'AÑO', key: 'anio', width: 80, align: 'center' },
              { header: 'CATEGORÍA', key: 'categoria', width: 90, align: 'center' },
              { header: 'CARROCERÍA', key: 'carroceria', width: 130 },
              { header: 'TIPO DE CARROCERÍA', key: 'tipoCarroceria', width: 140 },
              { header: 'SEDE DE REGISTRO', key: 'sedeRegistro', width: 170 },
              { header: 'SERIE / CHASIS', key: 'numeroSerie', isText: true, width: 150 },
              { header: 'SERIE DEL MOTOR', key: 'serieMotor', isText: true, width: 150 },
              { header: 'PARTIDA REGISTRAL', key: 'partidaRegistral', isText: true, width: 140 },
              { header: 'N° TUC', key: 'tucNumero', isText: true, width: 130 },
              { header: 'CÓDIGO QR', key: 'codigoQr', isText: true, width: 270 },
              { header: 'ASOCIACIÓN', render: (_, r) => r.asociacion || 'PARTICULAR / SIN ASOC.', width: 220 },
              { header: 'RUC ASOCIACIÓN', key: 'asociacionRuc', isText: true, width: 120, align: 'center' },
              { header: 'PROPIETARIO', key: 'propietario', width: 180 },
              { header: 'TIPO DOC. PROPIETARIO', key: 'propietarioTipoDocumento', width: 120, align: 'center' },
              { header: 'DNI / RUC PROPIETARIO', key: 'propietarioDni', isText: true, width: 130, align: 'center' },
              { header: 'FORMALIDAD', key: 'formalidad', width: 110, align: 'center' },
              { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
            ],
            data: dataToExport
          })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const dataToExport = await fetchTodoElFiltro(10000)
      await exportToPdf({
            filename: `Padron_Vehicular_${new Date().toISOString().slice(0, 10)}`,
            subtitle: 'Subgerencia de Tránsito y Transporte · Padrón Oficial Vehicular',
            summaryItems: [
              { label: 'Total en padrón', value: totalVehiculos },
              { label: 'Exportando', value: `${dataToExport.length} vehículos` },
              { label: 'Formales', value: formales },
              { label: 'Informales', value: informales },
              { label: 'Inhabilitados', value: suspendidos },
            ],
            columns: [
              { header: 'Placa', key: 'placa' },
              { header: 'Tipo', key: 'tipo' },
              { header: 'Marca/Modelo', render: (_, r) => `${r.marca} ${r.modelo}` },
              { header: 'Asociación', render: (_, r) => r.asociacion || 'Particular' },
              { header: 'Propietario', key: 'propietario' },
              { header: 'Estado', key: 'estado' },
            ],
            data: dataToExport
          })
    } catch (err) {
      showError('Descarga no completada', sanitizarMensaje(err.message, 'No se pudo preparar el PDF.'))
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleOpenCreateModal = () => {
    setPropietarioSearch('')
    setShowPropietarioResults(false)
    setAsociacionSearch('')
    setShowAsociacionResults(false)
    setTitularDetectado(null)
    setFormData({
      placa: '',
      tipo: '',
      marca: '',
      modelo: '',
      color: '',
      anio: '',
      categoria: '',
      carroceria: '',
      sedeRegistro: '',
      tipoCarroceria: '',
      numeroSerie: '',
      serieMotor: '',
      asociacion: '',
      propietario: '',
      propietarioDni: '',
      estado: 'ACTIVO',
      soatEstado: 'VIGENTE',
      tucNumero: `TUC-2026-${Math.floor(100 + Math.random() * 900)}`,
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  useQuickCreate(handleOpenCreateModal, !isLoading)

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    if (searchParams.get('action') === 'new') {
      handleOpenCreateModal()
      window.history.replaceState(null, '', '/vehiculos')
    }
  }, [])

  const handleOpenEditModal = (vehiculo) => {
    setSelectedVehiculo(vehiculo)
    setPropietarioSearch(vehiculo.propietarioDni ? `${vehiculo.propietarioDni} — ${vehiculo.propietario || ''}` : '')
    setShowPropietarioResults(false)
    setAsociacionSearch(isVehiculoFormal(vehiculo) ? (vehiculo.asociacion || '') : '')
    setShowAsociacionResults(false)
    const matchedOwner = vehiculo.propietarioDni ? (personas || []).find(p => p.numeroDocumento === vehiculo.propietarioDni) : null
    setTitularDetectado(vehiculo.propietario ? {
      nombre: vehiculo.propietario,
      documento: vehiculo.propietarioDni || '',
      matchedPersona: matchedOwner,
    } : null)
    setFormData({
      ...vehiculo,
      asociacion: isVehiculoFormal(vehiculo) ? (vehiculo.asociacion || '') : '',
      propietarioDni: vehiculo.propietarioDni || '',
      propietario: vehiculo.propietario || '',
      estado: vehiculo.estado === 'INACTIVO' ? 'INACTIVO' : 'ACTIVO'
    })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenDetail = async (vehiculo) => {
    setSelectedVehiculo(vehiculo)
    setIsDetailModalOpen(true)
    try {
      const res = await apiFetch(`/vehiculos/${vehiculo.uuid || vehiculo.id}`)
      if (res.ok) {
        const full = await res.json()
        if (full?.data) setSelectedVehiculo(full.data)
      }
    } catch (err) { console.warn("No se pudo cargar el detalle completo del vehículo:", err) }
  }

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Eliminar vehículo?',
      '¿Está seguro de eliminar este vehículo del registro municipal?',
      'Sí, eliminar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (result.isConfirmed) {
      try {
        await apiFetch(`/vehiculos/${id}`, { method: 'DELETE' })
        setVehiculos(vehiculos.filter((v) => v.id !== id))
        showToast('Vehículo eliminado correctamente')
      } catch (err) {
        showError('Error', 'No se pudo eliminar el vehículo.')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    // Validaciones
    const placaClean = formData.placa.trim().toUpperCase()
    if (!placaClean || !formData.propietarioDni.trim()) {
      showError('Campos Incompletos', 'Por favor completa los campos requeridos (Placa y Propietario registrado).')
      return
    }
    if (placaClean.length < 6) {
      showError('Placa Inválida', 'La placa debe tener al menos 6 caracteres.')
      return
    }
    const anioActual = new Date().getFullYear()
    if (formData.anio && (formData.anio < 1950 || formData.anio > anioActual + 1)) {
      showError('Año Inválido', `El año de fabricación debe ser válido (entre 1950 y ${anioActual + 1}).`)
      return
    }

    try {
      if (isEditing) {
        const res = await apiFetch(`/vehiculos/${selectedVehiculo.id}`, {
          method: 'PUT',
          body: formData,
        })
        const resData = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(resData.messages?.error || resData.message || 'No se pudo actualizar el vehículo.')
        loadVehiculos()
        loadStats()
        showToast('Vehículo actualizado correctamente', 'editar')
      } else {
        const res = await apiFetch('/vehiculos', {
          method: 'POST',
          body: formData,
        })
        const resData = await res.json().catch(() => ({}))
        if (!res.ok || !resData.data?.id) throw new Error(resData.messages?.error || resData.message || 'No se pudo registrar el vehículo.')
        setCurrentPage(1)
        loadVehiculos()
        loadStats()
        showToast('Vehículo registrado correctamente', 'crear')
      }
      setIsModalOpen(false)
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'Error al guardar el vehículo en el servidor.'))
    }
  }

  if (!isOffice) {
    return (
      <div className="mx-auto w-full max-w-3xl animate-enter py-6">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="mb-8 flex flex-col items-center justify-center text-center">
            <div className="mb-4 flex size-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Icon name="search" className="size-10" />
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Consulta Vehicular</h1>
            <p className="mt-2 text-base font-medium text-slate-500">
              Búsqueda rápida en el padrón municipal por número de placa
            </p>
          </div>

          <form onSubmit={handleConsulta} className="relative flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-5">
                <Icon name="motoTaxi" className="size-6 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Ej. M6Y544"
                value={consultaPlaca}
                onChange={(e) => setConsultaPlaca(normalizarPlaca(e.target.value))}
                className="block w-full rounded-2xl border-2 border-slate-200 bg-slate-50 py-4 pl-14 pr-4 text-2xl font-black uppercase tracking-widest text-slate-900 transition focus:border-indigo-500 focus:bg-white focus:outline-hidden focus:ring-4 focus:ring-indigo-500/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-indigo-400 placeholder:text-slate-300 dark:placeholder:text-slate-600"
                autoFocus
              />
            </div>
            <OficinaRegistralSelect
              oficinas={oficinaReg.oficinas}
              valor={oficinaReg.valor}
              onChange={oficinaReg.setValor}
              className="sm:w-64 sm:self-stretch"
            />
            <button
              type="submit"
              disabled={isSearchingSunarp}
              className={`flex items-center justify-center gap-2 rounded-2xl px-10 py-4 text-lg font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer ${isSearchingSunarp ? 'opacity-75 cursor-wait' : ''}`}
              style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
            >
              <Icon name={isSearchingSunarp ? 'loader' : 'search'} className={`size-6 ${isSearchingSunarp ? 'animate-spin' : ''}`} />
              <span>{isSearchingSunarp ? 'Consultando...' : 'Consultar'}</span>
            </button>
          </form>

          {consultaError && (
            <div className="mt-6 animate-enter rounded-2xl bg-rose-50 p-4 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border border-rose-100 dark:border-rose-500/20">
              <div className="flex items-center gap-3">
                <Icon name="alertCircle" className="size-5 shrink-0" />
                <p className="font-bold">{consultaError}</p>
              </div>
            </div>
          )}
        </div>

        {consultaResult && (
          <div className="animate-enter rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438]">
            <div className="mb-6 flex flex-col items-start justify-between gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center dark:border-[var(--border)]">
              <div className="flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[var(--bg-subtle)]">
                  <Icon name="motoTaxi" className="size-8 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="space-y-1.5">
                  <PlacaBadge placa={consultaResult.placa} size="lg" />
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider block">
                    {consultaResult.marca} {consultaResult.modelo}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleOpenDetail(consultaResult)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-100 sm:w-auto dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 transition active:scale-95 cursor-pointer"
              >
                <Icon name="eye" className="size-4" />
                Ficha Técnica
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Asociación / Empresa</p>
                <p className="mt-1.5 text-lg font-black text-slate-800 dark:text-slate-200 line-clamp-2">
                  {isVehiculoFormal(consultaResult) ? (consultaResult.asociacion || 'NO ASIGNADA') : 'PARTICULAR'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Propietario / Titular</p>
                <p className="mt-1.5 text-lg font-black text-slate-800 dark:text-slate-200 line-clamp-2">
                  {consultaResult.propietario || 'NO REGISTRADO'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado Formal</p>
                <div className="mt-2">
                  {isVehiculoFormal(consultaResult) ? (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-1.5 text-sm font-bold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300">
                      <Icon name="checkCircle" className="size-4 shrink-0" /> FORMAL
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-100 px-3 py-1.5 text-sm font-bold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                      <Icon name="alertTriangle" className="size-4 shrink-0" /> INFORMAL
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Estado Padrón</p>
                <div className="mt-2">
                  {consultaResult.esDelPadron ? (
                    <StatusBadge status={consultaResult.estado || 'ACTIVO'} />
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                      <Icon name="x" className="size-4 shrink-0" /> NO REGISTRADO
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <VehiculoDetalleModal
          selectedVehiculo={isDetailModalOpen ? selectedVehiculo : null}
          onClose={() => setIsDetailModalOpen(false)}
          isVehiculoFormal={isVehiculoFormal}
          buildVehiculoQrValue={buildVehiculoQrValue}
          getVehiculoDocumento={getVehiculoDocumento}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {loadError && <PageLoadError message={loadError} />}

      {/* Cabecera Principal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
              <Icon name="vehicle" className="size-7 stroke-[2.4]" />
            </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Gestión de Vehículos
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Registro municipal, control de trimóviles, empresas autorizadas y fiscalización vial.
            </p>
          </div>
        </div>
      </div>


      {/* Tarjetas KPI con Bordes de Colores */}
      <div className="kpi-grid">

        {/* 1. Total Unidades */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Unidades</span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="vehicle" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(totalVehiculos)}</p>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md">Padrón 2026</span>
          </div>
        </div>

        {/* 2. Formales */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Formales</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">✓</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(formales)}</p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">{porcentajeFormales}% En Asoc.</span>
          </div>
        </div>

        {/* 3. Informales */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Informales</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold text-xs"><Icon name="alert" className="size-3.5" /></span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(informales)}</p>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">Sin Asoc.</span>
          </div>
        </div>

        {/* 4. Observados / Baja */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Inhabilitados</span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">✕</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(suspendidos)}</p>
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-md">Susp. o Baja</span>
          </div>
        </div>
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">

          <div className="relative flex-1">
            <Icon
              name={isLoading ? "refresh" : "search"}
              className={`absolute left-3 top-1/2 size-3.5 -translate-y-1/2 transition-colors ${isLoading ? 'animate-spin text-blue-500' : 'text-slate-400'}`}
            />
            <input
              type="text"
              placeholder="Buscar por placa, marca, modelo, DNI, propietario o código QR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-8 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-blue-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white dark:focus:border-blue-400"
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


          <div className="flex flex-wrap items-center gap-2.5">
            <RoundedSelect
              value={filterEstado}
              onChange={(val) => {
                setFilterEstado(val)
                setCurrentPage(1)
              }}
              options={[
                { value: 'TODOS', label: 'Todos (Form. / Inf.)' },
                { value: 'FORMAL', label: 'Formales' },
                { value: 'INFORMAL', label: 'Informales' }
              ]}
            />

            <RoundedSelect
              value={filterTipo}
              onChange={(val) => {
                setFilterTipo(val)
                setCurrentPage(1)
              }}
              options={[
                { value: 'TODOS', label: 'Todos los tipos' },
                { value: 'Mototaxi', label: 'Mototaxi' },
                { value: 'Motocarguera', label: 'Motocarguera' },
                { value: 'Automóvil', label: 'Automóvil' },
                { value: 'Camioneta Rural', label: 'Camioneta Rural' },
                { value: 'Moto Lineal', label: 'Moto Lineal' }
              ]}
            />

            <RoundedSelect
              value={filterActivo}
              onChange={(val) => {
                setFilterActivo(val)
                setCurrentPage(1)
              }}
              options={[
                { value: 'TODOS', label: 'Todos los estados' },
                { value: 'ACTIVO', label: 'Activos' },
                { value: 'INACTIVO', label: 'Inactivos' }
              ]}
            />

            {(filterTipo !== 'TODOS' || filterActivo !== 'TODOS' || filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterTipo('TODOS')
                  setFilterActivo('TODOS')
                  setFilterEstado('TODOS')
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
                title="Limpiar filtros"
                className="grid size-8.5 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-4" />
              </button>
            )}

            {isOffice && (
              <>
                <button
                  type="button"
                  onClick={handleExportExcel}
                  title="Descargar padrón en Excel (.xls)"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs "
                 disabled={isExportingExcel}>
                  <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`} />
                  <span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportPdf}
                  title="Descargar o imprimir padrón en PDF"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs "
                 disabled={isExportingPdf}>
                  <Icon name={isExportingPdf ? "refresh" : "filePdf"} className={`size-3.5 text-rose-600 dark:text-rose-400 ${isExportingPdf ? 'animate-spin' : ''}`} />
                  <span>{isExportingPdf ? 'Generando...' : 'PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                >
                  <span className="text-base leading-none font-black">+</span>
                  <span>Nuevo Vehículo</span>
                </button>
              </>
            )}
          </div>
        </div>





        <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Listado de vehículos" tabIndex={0}>
          <table className="w-full min-w-[1050px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[10%]" />
              <col className="w-[20%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
              <col className="w-[16%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[var(--border)]">
              <tr>
                <th className="px-3.5 py-2.5 "><SortableHeader column="placa" label="Placa" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-3.5 py-2.5 "><SortableHeader column="propietario" label="Propietario y titular" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-3.5 py-2.5 ">Asociación / Empresa</th>
                <th className="px-3.5 py-2.5 ">Vehículo y modelo</th>
                <th className="px-3.5 py-2.5 ">Serie Chasis / Motor</th>
                <th className="px-4 py-2.5 min-w-[130px] text-center"><SortableHeader column="estado" label="Estado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="sticky right-0 z-10 bg-slate-50/75 dark:bg-[var(--bg-subtle)] border-l border-slate-200 dark:border-[var(--border)] px-4 py-3.5 text-center min-w-[165px] shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity duration-150 ${isLoading && vehiculos.length > 0 ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
              {isLoading && vehiculos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-2.5"><div className="h-6 w-20 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-2.5">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                    <td className="px-3.5 py-2.5"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-2.5"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3.5 py-2.5"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-4 py-2.5 min-w-[130px] text-center"><div className="mx-auto h-5 w-20 rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#1C2438] border-l border-slate-200 dark:border-[var(--border)] px-4 py-4 min-w-[165px] shadow-[-4px_0_8px_rgba(0,0,0,0.04)]"><div className="mx-auto h-7 w-20 rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                  </tr>
                ))
              ) : vehiculos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Icon name="vehicle" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron vehículos</p>
                  </td>
                </tr>
              ) : (
                paginatedVehiculos.map((v) => (
                  <tr
                    key={v.id}
                    className="group transition-colors hover:bg-cyan-50/30 dark:hover:bg-[var(--bg-subtle)]"
                  >

                    <td className="px-3.5 py-2.5 ">
                      <PlacaBadge placa={v.placa} />
                    </td>


                    <td className="px-3.5 py-2.5">
                      <p className="font-semibold text-slate-900 dark:text-white text-xs leading-snug" title={v.propietario}>
                        {v.propietario || 'Sin Propietario'}
                      </p>
                      {v.propietarioDni ? (
                        <p className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                          DNI: {v.propietarioDni}
                        </p>
                      ) : (
                        <p className="font-mono text-[11px] text-slate-400 mt-0.5">
                          Sin DNI
                        </p>
                      )}
                    </td>


                    <td className="px-3.5 py-2.5">
                      {isVehiculoFormal(v) ? (
                        <>
                          <p className="text-xs font-bold leading-tight text-slate-700 dark:text-slate-200" title={v.asociacion}>
                            {v.asociacion}
                          </p>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">MDJLO-AUTORIZADO</span>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                            Sin Asociación
                          </p>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">INFORMAL</span>
                        </>
                      )}
                    </td>


                    <td className="px-3.5 py-2.5">
                      <p className="text-xs font-bold leading-tight text-slate-800 dark:text-white" title={`${v.marca} ${v.modelo}`}>
                        {v.marca} {v.modelo}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-slate-400">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                          {v.tipo}
                        </span>
                      </div>
                    </td>


                    <td className="px-3.5 py-2.5 ">
                      <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {v.numeroSerie || 'N/A'}
                      </p>
                      {(v.serieMotor || v.numeroMotor) && (
                        <p className="text-[11px] font-mono text-slate-400">
                          Motor: {v.serieMotor || v.numeroMotor}
                        </p>
                      )}
                    </td>


                    <td className="px-4 py-2.5 min-w-[130px] text-center">
                      <div className="flex items-center justify-center">
                        <StatusBadge status={v.estado || 'ACTIVO'} />
                      </div>
                    </td>


                    <td className="sticky right-0 z-10 bg-white dark:bg-[#1C2438] border-l border-slate-200 dark:border-[var(--border)] px-4 py-3.5 min-w-[165px] shadow-[-4px_0_8px_rgba(0,0,0,0.04)] transition-colors group-hover:bg-cyan-50/30 dark:group-hover:bg-slate-800/40 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(v)}
                          title="Ver Ficha Técnica"
                          className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-eye-bg)] border-[var(--action-eye-border)] text-[var(--action-eye-text)] hover:bg-[var(--action-eye-hover)] hover:border-[var(--action-eye-hover)] hover:text-white"
                        >
                          <Icon name="eye" className="size-4" />
                        </button>
                        {plantillaDeVehiculo(v) && (
                        <button
                          type="button"
                          onClick={() => setVehiculoQrImpresion(v)}
                          title="Imprimir QR"
                          className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-eye-bg)] border-[var(--action-eye-border)] text-[var(--action-eye-text)] hover:bg-[var(--action-eye-hover)] hover:border-[var(--action-eye-hover)] hover:text-white"
                        >
                          <Icon name="print" className="size-4" />
                        </button>
                        )}
                        {isOffice && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(v)}
                              title="Editar Vehículo"
                              className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-edit-bg)] border-[var(--action-edit-border)] text-[var(--action-edit-text)] hover:bg-[var(--action-edit-hover)] hover:border-[var(--action-edit-hover)] hover:text-white"
                            >
                              <Icon name="pencil" className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(v.id)}
                              title="Eliminar Vehículo"
                              className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-del-bg)] border-[var(--action-del-border)] text-[var(--action-del-text)] hover:bg-[var(--action-del-hover)] hover:border-[var(--action-del-hover)] hover:text-white"
                            >
                              <Icon name="trash" className="size-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={totalFiltrado}
          itemsPerPage={itemsPerPage}
          onPageChange={(page) => setCurrentPage(Number(page))}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(Number(size))
            setCurrentPage(1)
          }}
          disabled={isLoading}
        />
      </div>

      {isModalOpen && (
        <VehiculoFormModal
          isEditing={isEditing}
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleFormSubmit}
          onClose={() => setIsModalOpen(false)}
          propietarioSearch={propietarioSearch}
          setPropietarioSearch={setPropietarioSearch}
          showPropietarioResults={showPropietarioResults}
          setShowPropietarioResults={setShowPropietarioResults}
          propietarioResults={propietarioResults}
          getPersonaNombre={getPersonaNombre}
          selectPropietario={selectPropietario}
          personas={personas}
          asociacionSearch={asociacionSearch}
          setAsociacionSearch={setAsociacionSearch}
          showAsociacionResults={showAsociacionResults}
          setShowAsociacionResults={setShowAsociacionResults}
          asociacionResults={asociacionResults}
          selectAsociacion={selectAsociacion}
          clearAsociacion={clearAsociacion}
          onBuscarSunarp={handleBuscarSunarpModal}
          oficinaRegistral={oficinaReg}
          isBuscandoSunarp={isBuscandoSunarpModal}
          titularDetectado={titularDetectado}
          onOpenPersonaRapida={handleOpenPersonaRapida}
        />
      )}

      {vehiculoQrImpresion && (
        <QrVehiculoImpresion vehiculo={vehiculoQrImpresion} onClose={() => setVehiculoQrImpresion(null)} />
      )}

      {isPersonaModalOpen && (
        <PersonaFormModal
          isEditing={false}
          formData={personaFormData}
          setFormData={setPersonaFormData}
          handlePhotoUpload={handlePhotoUploadPersona}
          handleClearPhoto={handleClearPhotoPersona}
          tipoDocOptions={tipoDocOptions}
          handleReniecSearch={handleReniecSearchPersona}
          isSearchingReniec={isSearchingReniecPersona}
          estadoCivilOptions={ESTADO_CIVIL_OPTIONS}
          estadoOptions={ESTADO_OPTIONS}
          onSubmit={handlePersonaFormSubmit}
          onClose={() => setIsPersonaModalOpen(false)}
        />
      )}

      {isDetailModalOpen && (
        <VehiculoDetalleModal
          selectedVehiculo={selectedVehiculo}
          onClose={() => setIsDetailModalOpen(false)}
          isVehiculoFormal={isVehiculoFormal}
          buildVehiculoQrValue={buildVehiculoQrValue}
          getVehiculoDocumento={getVehiculoDocumento}
        />
      )}
    </div>
  )
}
