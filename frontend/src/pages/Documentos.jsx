import { useEffect, useState, useRef } from 'react'
import { fechaLocalActual, fechaLocalMasDias } from '../utils/calendarioCurso'
import { useNavigate } from 'react-router-dom'
import { showToast, showConfirm, showError, showSuccess } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PlacaBadge } from '../components/ui/PlacaBadge'
import { apiFetch, getCachedData, setCachedData, invalidateCache } from '../config/api'
import { VehiculoDetalleModal } from '../components/vehiculos/VehiculoDetalleModal'
import { EstadoDocumentosVehiculo, documentoVigenteDelTipo } from '../components/documentos/EstadoDocumentosVehiculo'
import { isVehiculoFormal, getVehiculoDocumento, buildVehiculoQrValue } from '../utils/vehiculos'
import { exportToExcel } from '../utils/exportToExcel'
import { FloatingInput, FloatingSelect, RoundedSelect } from '../components/ui/FormInputs'
import { formatFecha, formatNumeroTarjeta, normalizarPlaca } from '../utils/formatters'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'
import { fetchTodasLasFilas } from '../utils/descargaCompleta'

const TIPO_DOC_OPTIONS = [
  { value: 'TARJETA_OPERATIVIDAD', label: 'Tarjeta de Operatividad (TUC)' },
  { value: 'SOAT', label: 'SOAT Vehicular' },
  { value: 'TARJETA_PROPIEDAD', label: 'Tarjeta de Propiedad' },
]

// Tipos que ya no se emiten desde este módulo (el CertiCAV/inspección técnica
// se registra aparte, en su propio módulo) pero que algún registro antiguo
// todavía puede tener guardado: se muestran de solo lectura al editar.
const TIPO_DOC_LABEL_EXTERNO = {
  CITV: 'CITV (Inspección Técnica)',
  INSPECCION_TECNICA: 'Inspección Técnica',
  CERTICAV: 'CertiCAV (Inspección Técnica) — legado',
}

const TIPOS_SIN_VIGENCIA = ['TARJETA_PROPIEDAD']

const ESTADO_OPTIONS = [
  { value: 'VIGENTE', label: 'VIGENTE' },
  { value: 'EN_TRAMITE', label: 'EN TRÁMITE' },
  { value: 'VENCIDO', label: 'VENCIDO' },
]

// La Tarjeta de Propiedad no vence (vigencia indefinida): "En trámite" y
// "Vencido" no aplican, solo si sigue vigente o fue anulada (venta/cambio
// de propietario, que genera una tarjeta nueva).
const ESTADO_OPTIONS_SIN_VIGENCIA = [
  { value: 'VIGENTE', label: 'VIGENTE' },
  { value: 'ANULADO', label: 'ANULADO' },
]

const FILTER_TIPO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los tipos' },
  { value: 'TARJETA_OPERATIVIDAD', label: 'Tarjeta Operatividad (TUC)' },
  { value: 'SOAT', label: 'SOAT' },
  { value: 'TARJETA_PROPIEDAD', label: 'Tarjeta Propiedad' },
]

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'VIGENTE', label: 'Vigentes' },
  { value: 'EN_TRAMITE', label: 'En trámite' },
  { value: 'VENCIDO', label: 'Vencidos' },
]

function getCodigoLabel(tipoDocumento) {
  switch (tipoDocumento) {
    case 'SOAT':
      return 'Número de Póliza'
    case 'TARJETA_OPERATIVIDAD':
      return 'N° Resolución de Alcaldía'
    case 'TARJETA_PROPIEDAD':
      return 'Número de Partida Registral'
    default:
      return 'Código / Número de documento'
  }
}

function getDocTypeBadge(tipo) {
  switch (tipo) {
    case 'TARJETA_OPERATIVIDAD':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[10.5px] font-bold text-blue-700 border border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
          TUC (Operatividad)
        </span>
      )
    case 'SOAT':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
          SOAT Vehicular
        </span>
      )
    case 'CERTICAV':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[10.5px] font-bold text-purple-700 border border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
          CertiCAV (Inspección)
        </span>
      )
    
    case 'INSPECCION_TECNICA':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-cyan-50 px-2 py-0.5 text-[10.5px] font-bold text-cyan-700 border border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800">
          CITV
        </span>
      )
    case 'TARJETA_PROPIEDAD':
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold text-slate-700 border border-slate-200 dark:bg-[var(--bg-subtle)] dark:text-slate-300 dark:border-[var(--border-strong)]">
          Tarjeta Propiedad
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-[10.5px] font-bold text-slate-600 border border-slate-200 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
          {tipo || '—'}
        </span>
      )
  }
}

export function Documentos() {
  const navigate = useNavigate()
  const cached = getCachedData('/documentos')
  const [documentos, setDocumentos] = useState(cached || [])
  const [resultadosPlaca, setResultadosPlaca] = useState([])
  const [isBuscandoPlaca, setIsBuscandoPlaca] = useState(false)
  const [vehiculoSeleccionadoId, setVehiculoSeleccionadoId] = useState(null)
  const [resumenDocs, setResumenDocs] = useState([])
  const [isLoadingResumen, setIsLoadingResumen] = useState(false)
  const [refrescoResumen, setRefrescoResumen] = useState(0)
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 160)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
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

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [vehiculoDetalle, setVehiculoDetalle] = useState(null)

  const abrirVehiculo = async (doc) => {
    if (!doc.vehiculoId) {
      showError('Vehículo no disponible', 'Este documento no está vinculado a un vehículo registrado.')
      return
    }
    try {
      const res = await apiFetch(`/vehiculos/${doc.vehiculoId}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const payload = await res.json()
      setVehiculoDetalle(payload.data)
    } catch (err) {
      console.warn('No se pudo cargar el vehículo del documento:', err)
      showError('Error', 'No se pudo cargar la información del vehículo.')
    }
  }
  const [isEditing, setIsEditing] = useState(false)

  // Search dropdown for vehicle plate inside modal
  const [isPlacaDropdownOpen, setIsPlacaDropdownOpen] = useState(false)
  const placaDropdownRef = useRef(null)

  const [formData, setFormData] = useState({
    vehiculoPlaca: '',
    tipoDocumento: 'TARJETA_OPERATIVIDAD',
    codigo: '',
    fechaExpedicion: '',
    fechaExpiracion: '',
    estado: 'VIGENTE',
    propietario: '',
    propietarioDni: '',
    asociacion: '',
    asociacionResolucionAlcaldia: '',
  })

  const [totalFiltrado, setTotalFiltrado] = useState(0)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const loadData = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        porPagina: String(itemsPerPage),
      })
      if (debouncedSearch) params.set('buscar', debouncedSearch)
      if (filterTipo !== 'TODOS') params.set('tipoDocumento', filterTipo)
      if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
      if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }

      const docsRes = await apiFetch(`/documentos?${params.toString()}`)
      if (!docsRes.ok) throw docsRes
      const docsPayload = await docsRes.json()
      const dData = docsPayload.data ?? []
      setDocumentos(dData)
      setTotalFiltrado(docsPayload.meta?.total ?? dData.length)
    } catch {
      setLoadError('No se pudo cargar el padrón oficial de documentos.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setLoadError('')
    loadData()
  }, [currentPage, itemsPerPage, debouncedSearch, filterTipo, filterEstado, sortBy, sortDir])

  const [stats, setStats] = useState({ total: 0, tucDocs: 0, soatDocs: 0, vigentes: 0, inactivosOVencidos: 0 })

  const loadStats = () => {
    apiFetch('/documentos/estadisticas')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((payload) => setStats(payload.data ?? {}))
      .catch(() => {})
  }

  useEffect(() => {
    loadStats()
  }, [])

  // Las placas se buscan en el servidor mientras se escribe: no se descarga el padrón de vehículos.
  useEffect(() => {
    const texto = formData.vehiculoPlaca || ''
    if (!isPlacaDropdownOpen || vehiculoSeleccionadoId || texto.length < 2) {
      setResultadosPlaca([])
      return undefined
    }
    let cancelado = false
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setIsBuscandoPlaca(true)
      try {
        const res = await apiFetch(`/vehiculos?page=1&porPagina=25&buscar=${encodeURIComponent(texto)}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const payload = await res.json()
        if (cancelado) return
        // La búsqueda del servidor también coincide por propietario o marca; aquí solo interesan placas.
        const lista = (Array.isArray(payload?.data) ? payload.data : [])
          .filter((v) => (v.placa || '').toUpperCase().includes(texto))
          .slice(0, 8)
        setResultadosPlaca(lista)
        const exacto = texto.length === 6 ? lista.find((v) => v.placa === texto) : null
        if (exacto) seleccionarVehiculo(exacto)
      } catch (err) {
        if (!cancelado) console.warn('No se pudo buscar la placa:', err)
      } finally {
        if (!cancelado) setIsBuscandoPlaca(false)
      }
    }, 250)
    return () => {
      cancelado = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [formData.vehiculoPlaca, isPlacaDropdownOpen, vehiculoSeleccionadoId])

  // Estado de los tres documentos del vehículo elegido (vigente / vencido / no registrado).
  useEffect(() => {
    if (!isModalOpen || !vehiculoSeleccionadoId) {
      setResumenDocs([])
      return undefined
    }
    let cancelado = false
    setIsLoadingResumen(true)
    apiFetch(`/documentos/vehiculo/${vehiculoSeleccionadoId}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((payload) => {
        if (!cancelado) setResumenDocs(payload.data || [])
      })
      .catch((err) => {
        console.warn('No se pudo consultar los documentos del vehículo:', err)
        if (!cancelado) setResumenDocs([])
      })
      .finally(() => {
        if (!cancelado) setIsLoadingResumen(false)
      })
    return () => {
      cancelado = true
    }
  }, [vehiculoSeleccionadoId, isModalOpen, refrescoResumen])

  // Si el vehículo ya tiene un documento (vigente o vencido) del tipo elegido, el formulario pasa a
  // "actualizar": se rellena con sus datos y al guardar se actualiza ese mismo documento.
  const docExistenteDelTipo = !isEditing && vehiculoSeleccionadoId
    ? resumenDocs.find((r) => r.tipoDocumento === formData.tipoDocumento && r.id && ['VIGENTE', 'VENCIDO'].includes(r.estado)) || null
    : null
  const renovandoVencido = docExistenteDelTipo?.estado === 'VENCIDO'
  const prerellenadoId = useRef(null)

  useEffect(() => {
    if (!isModalOpen) {
      prerellenadoId.current = null
      return
    }
    if (docExistenteDelTipo) {
      if (prerellenadoId.current === docExistenteDelTipo.id) return
      prerellenadoId.current = docExistenteDelTipo.id
      setFormData((prev) => ({
        ...prev,
        codigo: docExistenteDelTipo.codigo || '',
        fechaExpedicion: docExistenteDelTipo.fechaExpedicion || prev.fechaExpedicion,
        fechaExpiracion: docExistenteDelTipo.fechaExpiracion || prev.fechaExpiracion,
        estado: 'VIGENTE',
      }))
    } else if (prerellenadoId.current !== null) {
      prerellenadoId.current = null
      setFormData((prev) => ({
        ...prev,
        // Al salir de un tipo con documento existente (p. ej. SOAT) y volver a uno sin documento,
        // no se borra a ciegas: si ese tipo es Tarjeta de Operatividad y el vehículo tiene asociación
        // con resolución registrada, se vuelve a heredar en vez de dejar el campo vacío.
        ...resolverCodigoYHerencia(prev.tipoDocumento, prev.asociacionResolucionAlcaldia),
        fechaExpedicion: fechaLocalActual(),
        fechaExpiracion: TIPOS_SIN_VIGENCIA.includes(prev.tipoDocumento)
          ? ''
          : fechaLocalMasDias(365),
      }))
    }
  }, [docExistenteDelTipo?.id, isModalOpen])

  // Close plate dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (placaDropdownRef.current && !placaDropdownRef.current.contains(event.target)) {
        setIsPlacaDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // KPIs derivados del total real (COUNT en backend), no de la página cargada
  const totalDocs = stats.total ?? 0
  const tucDocs = stats.tucDocs ?? 0
  const soatDocs = stats.soatDocs ?? 0
  const propiedadDocs = stats.propiedadDocs ?? 0
  const vigentes = stats.vigentes ?? 0
  const inactivosOVencidos = stats.inactivosOVencidos ?? 0

  const filteredDocs = documentos

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipo, filterEstado])

  const paginatedDocs = documentos

  const handleEscribirPlaca = (placa) => {
    setVehiculoSeleccionadoId(null)
    setFormData((prev) => ({
      ...prev,
      vehiculoPlaca: placa,
      propietario: '',
      propietarioDni: '',
      asociacion: '',
      asociacionResolucionAlcaldia: '',
      // El código de un documento (resolución heredada, código de SOAT, partida registral...) es
      // propio de un vehículo y un tipo de documento concretos: al borrar la placa, se pierde el
      // vehículo del que venía, así que no tiene sentido conservarlo.
      codigo: '',
    }))
  }

  // La Tarjeta de Operatividad se emite bajo la resolución de alcaldía de la asociación/empresa
  // del vehículo (no una por vehículo): si el titular pertenece a una y esta tiene su resolución
  // registrada, se completa sola y se bloquea para no escribir un número distinto por error; se
  // sigue viendo siempre, y si el vehículo es independiente (o la asociación no la tiene cargada
  // todavía) el campo queda editable como antes. Solo aplica al crear: un documento ya emitido
  // conserva su número tal como se registró, aunque la resolución de la asociación cambie después.
  const codigoHeredaResolucion = (tipoDocumento, asociacionResolucionAlcaldia) =>
    !isEditing && tipoDocumento === 'TARJETA_OPERATIVIDAD' && !!asociacionResolucionAlcaldia

  // Decide el código que corresponde tras un cambio de tipo o de vehículo: lo hereda si aplica
  // (Tarjeta de Operatividad con asociación); si no, se limpia. El código de un SOAT o de una
  // Tarjeta de Propiedad es propio de ESE tipo y de ESE vehículo, así que nunca debe arrastrarse
  // a otro tipo o a otro vehículo; si el nuevo tipo/vehículo ya tiene un documento registrado, el
  // efecto que vigila "documento existente" lo vuelve a completar un instante después con su dato real.
  const resolverCodigoYHerencia = (tipoDocumento, asociacionResolucionAlcaldia) =>
    codigoHeredaResolucion(tipoDocumento, asociacionResolucionAlcaldia)
      ? { codigo: asociacionResolucionAlcaldia }
      : { codigo: '' }

  // Cambiar el tipo (desde el selector o al pulsar un documento del cuadro del vehículo).
  const cambiarTipo = (nuevoTipo) => {
    if (nuevoTipo === formData.tipoDocumento) return
    const sinVigencia = TIPOS_SIN_VIGENCIA.includes(nuevoTipo)
    setFormData((prev) => ({
      ...prev,
      tipoDocumento: nuevoTipo,
      ...resolverCodigoYHerencia(nuevoTipo, prev.asociacionResolucionAlcaldia),
      fechaExpiracion: sinVigencia ? '' : prev.fechaExpiracion,
      estado: sinVigencia && !['VIGENTE', 'ANULADO'].includes(prev.estado) ? 'VIGENTE' : prev.estado,
    }))
  }

  // Desde la edición también se puede pasar a otro documento del mismo vehículo: se sale del modo
  // "editar" y el formulario queda como emisión (o actualización, si ese tipo ya existe).
  const cambiarTipoDesdeEdicion = (nuevoTipo) => {
    if (nuevoTipo === formData.tipoDocumento) return
    setIsEditing(false)
    setSelectedDoc(null)
    const sinVigencia = TIPOS_SIN_VIGENCIA.includes(nuevoTipo)
    setFormData((prev) => ({
      ...prev,
      tipoDocumento: nuevoTipo,
      ...resolverCodigoYHerencia(nuevoTipo, prev.asociacionResolucionAlcaldia),
      fechaExpedicion: fechaLocalActual(),
      fechaExpiracion: sinVigencia ? '' : fechaLocalMasDias(365),
      estado: 'VIGENTE',
    }))
  }

  const seleccionarVehiculo = (veh) => {
    setVehiculoSeleccionadoId(veh.id)
    setFormData((prev) => ({
      ...prev,
      vehiculoPlaca: veh.placa,
      propietario: veh.propietario || '',
      propietarioDni: veh.propietarioDni || '',
      asociacion: veh.asociacion || '',
      asociacionResolucionAlcaldia: veh.asociacionResolucionAlcaldia || '',
      ...resolverCodigoYHerencia(prev.tipoDocumento, veh.asociacionResolucionAlcaldia || ''),
    }))
    setIsPlacaDropdownOpen(false)
  }

  const handleOpenCreateModal = () => {
    setFormData({
      vehiculoPlaca: '',
      tipoDocumento: 'TARJETA_OPERATIVIDAD',
      codigo: '',
      fechaExpedicion: fechaLocalActual(),
      fechaExpiracion: fechaLocalMasDias(365),
      estado: 'VIGENTE',
      propietario: '',
      propietarioDni: '',
      asociacion: '',
      asociacionResolucionAlcaldia: '',
    })
    setIsEditing(false)
    setVehiculoSeleccionadoId(null)
    setResultadosPlaca([])
    setIsPlacaDropdownOpen(false)
    setIsModalOpen(true)
  }

  // Desde la tabla: abre "Emitir documento" con el vehículo y el tipo del documento pulsado.
  // Si ese documento está vencido el formulario pasa solo a "Actualizar" con sus datos.
  const abrirEmitirDesdeDocumento = (doc) => {
    if (!doc.vehiculoId) {
      showError('Vehículo no disponible', 'Este documento no está vinculado a un vehículo registrado.')
      return
    }
    const tipoValido = TIPO_DOC_OPTIONS.some((o) => o.value === doc.tipoDocumento)
    const sinVigencia = TIPOS_SIN_VIGENCIA.includes(doc.tipoDocumento)
    setFormData({
      vehiculoPlaca: doc.vehiculoPlaca || '',
      tipoDocumento: tipoValido ? doc.tipoDocumento : 'TARJETA_OPERATIVIDAD',
      codigo: '',
      fechaExpedicion: fechaLocalActual(),
      fechaExpiracion: tipoValido && sinVigencia
        ? ''
        : fechaLocalMasDias(365),
      estado: 'VIGENTE',
      propietario: doc.propietario || '',
      propietarioDni: doc.propietarioDni || '',
      asociacion: doc.asociacion || '',
    })
    setIsEditing(false)
    setVehiculoSeleccionadoId(doc.vehiculoId)
    setResultadosPlaca([])
    setIsPlacaDropdownOpen(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (doc) => {
    setSelectedDoc(doc)
    setFormData({
      vehiculoPlaca: doc.vehiculoPlaca || '',
      tipoDocumento: doc.tipoDocumento || 'TARJETA_OPERATIVIDAD',
      codigo: doc.codigo || '',
      fechaExpedicion: doc.fechaExpedicion || '',
      fechaExpiracion: doc.fechaExpiracion || '',
      estado: doc.estado || 'VIGENTE',
      propietario: doc.propietario || '',
      propietarioDni: doc.propietarioDni || '',
      asociacion: doc.asociacion || '',
    })
    setIsEditing(true)
    setVehiculoSeleccionadoId(doc.vehiculoId || null)
    setIsPlacaDropdownOpen(false)
    setIsModalOpen(true)
  }

  const handleOpenDetail = (doc) => {
    setSelectedDoc(doc)
    setIsDetailModalOpen(true)
  }

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Eliminar documento?',
      'Se eliminará este documento del vehículo. Esta acción no se puede deshacer.',
      'Sí, eliminar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (result.isConfirmed) {
      try {
        const response = await apiFetch(`/documentos/${id}`, { method: 'DELETE' })
        if (!response.ok) throw response
        const nextDocs = documentos.filter((d) => d.id !== id)
        setDocumentos(nextDocs)
        setCachedData('/documentos', nextDocs)
        loadStats()
        showToast('Documento eliminado con éxito')
      } catch {
        showError('Error', 'No se pudo eliminar el documento.')
      }
    }
  }

  // Vacía un documento desde el cuadro del vehículo: lo elimina para poder registrar uno nuevo
  // y deja el modal abierto (el cuadro y el formulario se actualizan solos).
  const vaciarDocumento = async (doc) => {
    const result = await showConfirm(
      '¿Vaciar documento?',
      `Se eliminará ${doc.etiqueta} N° ${doc.codigo} de este vehículo y quedará como "No registrado". Después podrá registrar uno nuevo.`,
      'Sí, vaciar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (!result.isConfirmed) return
    try {
      const res = await apiFetch(`/documentos/${doc.id}`, { method: 'DELETE' })
      if (!res.ok) throw res
      setRefrescoResumen((n) => n + 1)
      loadData()
      loadStats()
      showToast(`${doc.etiqueta}: documento eliminado, quedó vacío`)
    } catch (err) {
      console.warn('No se pudo vaciar el documento:', err)
      showError('Error', 'No se pudo vaciar el documento.')
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!formData.codigo.trim() || !formData.vehiculoPlaca.trim() || !formData.tipoDocumento) {
      showError('Atención', 'Por favor completa los campos requeridos (Placa, Tipo y Número de Documento).')
      return
    }

    if (formData.fechaExpedicion && formData.fechaExpiracion && new Date(formData.fechaExpiracion) < new Date(formData.fechaExpedicion)) {
      showError('Atención', 'La fecha de vencimiento no puede ser anterior a la fecha de expedición.')
      return
    }

    // Si el formulario está actualizando el documento existente no hay duplicado que avisar.
    const vigenteExistente = !docExistenteDelTipo && (formData.estado || 'VIGENTE') === 'VIGENTE'
      ? documentoVigenteDelTipo(resumenDocs, formData.tipoDocumento, isEditing ? selectedDoc?.id : null)
      : null
    if (vigenteExistente) {
      showError(
        'Documento duplicado',
        `Este vehículo ya tiene ${vigenteExistente.etiqueta} vigente (N° ${vigenteExistente.codigo}). Anúlelo o espere a que venza antes de emitir otro.`
      )
      return
    }

    const hoy = fechaLocalActual()
    if (
      (formData.estado || 'VIGENTE') === 'VIGENTE' &&
      !TIPOS_SIN_VIGENCIA.includes(formData.tipoDocumento) &&
      formData.fechaExpiracion &&
      formData.fechaExpiracion < hoy
    ) {
      showError(
        'Fecha de vencimiento',
        renovandoVencido
          ? 'El documento anterior ya venció. Ingrese la nueva fecha de vencimiento para actualizarlo.'
          : 'La fecha de vencimiento ya pasó. Un documento vigente necesita una fecha de vencimiento futura.'
      )
      return
    }

    const dataToSubmit = {
      ...formData,
      vehiculoPlaca: formData.vehiculoPlaca.trim().toUpperCase(),
      codigo: formData.codigo.trim().toUpperCase(),
      estado: formData.estado || 'VIGENTE',
    }

    try {
      if (docExistenteDelTipo) {
        const res = await apiFetch(`/documentos/${docExistenteDelTipo.id}`, {
          method: 'PUT',
          body: dataToSubmit,
        })
        if (!res.ok) throw res
        // El modal se queda abierto; el cuadro se recarga y el formulario sigue en modo "actualizar".
        setRefrescoResumen((n) => n + 1)
        loadData()
        loadStats()
        showToast(renovandoVencido
          ? `${docExistenteDelTipo.etiqueta} actualizado: el documento vencido se renovó`
          : `${docExistenteDelTipo.etiqueta} actualizado`)
        return
      } else if (isEditing) {
        const res = await apiFetch(`/documentos/${selectedDoc.id}`, {
          method: 'PUT',
          body: dataToSubmit,
        })
        if (!res.ok) throw res
        setRefrescoResumen((n) => n + 1)
        loadData()
        loadStats()
        showToast('Documento actualizado')
        return
      } else {
        const res = await apiFetch('/documentos', {
          method: 'POST',
          body: dataToSubmit,
        })
        if (!res.ok) throw res
        // El modal se queda abierto: al recargar el cuadro, el documento recién emitido
        // pasa a ser el "existente" y el formulario cambia solo a modo "actualizar".
        setRefrescoResumen((n) => n + 1)
        setCurrentPage(1)
        loadData()
        loadStats()
        showToast('Documento emitido con éxito')
        return
      }
    } catch (err) {
      let message = 'Error de comunicación con el servidor al registrar el documento.'
      if (err?.json) {
        try {
          const errData = await err.json()
          message = errData.messages?.error || errData.message || errData.error || message
        } catch (_) {
          message = err.statusText || message
        }
      }
      showError('Atención', message)
    }
  }

  const fetchTodoElFiltro = () =>
    fetchTodasLasFilas('/documentos', {
      buscar: debouncedSearch || searchTerm,
      tipoDocumento: filterTipo === 'TODOS' ? '' : filterTipo,
      estado: filterEstado === 'TODOS' ? '' : filterEstado,
      sortBy,
      sortDir: sortBy ? sortDir : '',
    }, { mensaje: 'Preparando la descarga de documentos...' })

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const data = await fetchTodoElFiltro()
          await exportToExcel({
            filename: `Documentos_Transito_${fechaLocalActual()}.xls`,
            sheetName: 'Documentos',
            title: 'PADRÓN OFICIAL DE DOCUMENTOS DE TRANSPORTE Y VIALIDAD',
            subtitle: 'TUC, Carnets de Seguridad Vial, CERTICAV y SOAT - Control Municipal',
            metadata: [
              { label: 'Tipo Documento', value: filterTipo },
              { label: 'Estado', value: filterEstado }
            ],
            columns: [
              { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 110, align: 'center' },
              { header: 'TIPO DOCUMENTO', key: 'tipoDocumento', width: 180 },
              { header: 'N° / CÓDIGO', key: 'codigo', isText: true, width: 140, align: 'center' },
              { header: 'EXPEDICIÓN', key: 'fechaExpedicion', width: 110, align: 'center' },
              { header: 'VENCIMIENTO', render: (v) => v || 'Sin vencimiento', key: 'fechaExpiracion', width: 110, align: 'center' },
              { header: 'N° RESOLUCIÓN DE ALCALDÍA', key: 'resMunicipal', isText: true, width: 140, align: 'center' },
              { header: 'MARCA', key: 'vehiculoMarca', width: 110 },
              { header: 'MODELO', key: 'vehiculoModelo', width: 110 },
              { header: 'COLOR', key: 'vehiculoColor', width: 100 },
              { header: 'AÑO', key: 'vehiculoAnio', width: 70, align: 'center' },
              { header: 'SERIE DEL MOTOR', key: 'vehiculoMotor', isText: true, width: 140 },
              { header: 'SERIE / CHASIS', key: 'vehiculoSerie', isText: true, width: 150 },
              { header: 'CARROCERÍA', key: 'vehiculoCarroceria', width: 120 },
              { header: 'PARTIDA REGISTRAL', key: 'vehiculoPartidaRegistral', isText: true, width: 140 },
              { header: 'CÓDIGO QR', key: 'codigoQr', isText: true, width: 270 },
              { header: 'PROPIETARIO / TITULAR', key: 'propietario', width: 190 },
              { header: 'DNI / RUC', key: 'propietarioDni', isText: true, width: 110, align: 'center' },
              { header: 'CELULAR', key: 'propietarioCelular', isText: true, width: 110, align: 'center' },
              { header: 'CORREO', key: 'propietarioEmail', width: 190 },
              { header: 'DIRECCIÓN', key: 'direccion', width: 220 },
              { header: 'LICENCIA', key: 'numeroLicencia', isText: true, width: 120, align: 'center' },
              { header: 'ASOCIACIÓN', render: (_, r) => r.asociacion || 'PARTICULAR / SIN ASOC.', width: 200 },
              { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
            ],
            data
          })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const listToExport = await fetchTodoElFiltro()
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
            .map((d, index) => {
              const isVigente = d.estado === 'VIGENTE'
              const estadoBadge = isVigente
                ? `<span style="background:#dcfce7; color:#15803d; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">VIGENTE</span>`
                : d.estado === 'EN_TRAMITE'
                  ? `<span style="background:#dbeafe; color:#1d4ed8; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">EN TRÁMITE</span>`
                  : `<span style="background:#fee2e2; color:#b91c1c; padding:2px 7px; border-radius:4px; font-weight:700; font-size:9.5px;">VENCIDO</span>`
      
              return `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                  <td style="text-align: center; color: #64748b; font-size: 10px;">${index + 1}</td>
                  <td style="font-family: monospace; font-weight: 700; font-size: 11px; text-align: center;">${escapeXml(d.codigo || '')}</td>
                  <td style="font-size: 10px; font-weight: 600;">${escapeXml(d.tipoDocumento || '')}</td>
                  <td style="font-family: monospace; font-weight: 700; font-size: 11px; text-align: center; background: #fef3c7;">${escapeXml(d.vehiculoPlaca || '')}</td>
                  <td style="font-size: 10.5px; font-weight: 700; color: #0f172a;">${escapeXml(d.propietario || '—')}</td>
                  <td style="font-family: monospace; font-size: 10.5px; text-align: center;">${escapeXml(d.propietarioDni || '—')}</td>
                  <td style="font-size: 10px; color: #475569;">${escapeXml(d.asociacion || 'Independiente')}</td>
                  <td style="text-align: center; font-family: monospace; font-size: 10px;">${escapeXml(formatFecha(d.fechaExpedicion))}</td>
                  <td style="text-align: center; font-family: monospace; font-size: 10px; font-weight: bold;">${escapeXml(formatFecha(d.fechaExpiracion))}</td>
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
                <title>Padron_Documentos_MJLO_${fechaLocalActual()}</title>
                <style>
                  @page { size: A4 landscape; margin: 10mm 12mm 10mm 12mm; }
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
                  thead { display: table-header-group; }
                  tr { page-break-inside: avoid; break-inside: avoid; }
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
                    <div class="subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Documentos Vehiculares (Tarjeta de Operatividad / SOAT / Tarjeta de Propiedad)</div>
                  </div>
                  <div class="meta">
                    <div><strong>Fecha de emisión:</strong> ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')}</div>
                    <div><strong>Sistema:</strong> MJLO Tránsito Digital v2026</div>
                  </div>
                </div>
                <div class="summary-bar">
                  <div>Total en padrón: <strong>${totalDocs}</strong></div>
                  <div>· Exportando: <strong>${listToExport.length}</strong> documentos</div>
                  <div>· Vigentes: <strong>${vigentes}</strong></div>
                  <div>· Vencidos: <strong>${inactivosOVencidos}</strong></div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 28px; text-align: center;">N°</th>
                      <th style="width: 105px; text-align: center;">Código</th>
                      <th style="width: 110px;">Tipo Doc.</th>
                      <th style="width: 80px; text-align: center;">Placa</th>
                      <th style="width: 170px;">Titular / Propietario</th>
                      <th style="width: 75px; text-align: center;">DNI</th>
                      <th>Asociación</th>
                      <th style="width: 75px; text-align: center;">Expedición</th>
                      <th style="width: 75px; text-align: center;">Vencimiento</th>
                      <th style="width: 75px; text-align: center;">Estado</th>
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
    } finally {
      setIsExportingPdf(false)
    }
  }

  return (
    <div className="space-y-4">
      {loadError && <PageLoadError message={loadError} />}

      {/* Cabecera Principal - Estilo Exacto Personas */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="document" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Documentos del Vehículo
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI con Bordes de Colores: 5 tarjetas compactas (Estilo exacto Personas) */}
      <div className="kpi-grid">
        {/* 1. Total documentos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Total registros
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="document" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(totalDocs)}
            </p>
          </div>
        </div>

        {/* 2. Tarjetas Operatividad (TUC) */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Tarjeta de Operatividad
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Icon name="permit" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(tucDocs)}
            </p>
          </div>
        </div>

        {/* 3. SOAT y CertiCAV */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
              SOAT
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Icon name="vehicle" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(soatDocs)}
            </p>
          </div>
        </div>

        {/* 3b. Tarjeta de Propiedad */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Tarjeta de Propiedad
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="vehicle" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(propiedadDocs)}
            </p>
          </div>
        </div>

        {/* 4. Vigentes */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Vigentes
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(vigentes)}
            </p>
          </div>
        </div>

        {/* 5. Vencidos / Otros */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Vencidos
            </span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">
              ✕
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(inactivosOVencidos)}
            </p>
          </div>
        </div>
      </div>

      {/* Contenedor de la Tabla */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon
              name={isLoading ? "refresh" : "search"}
              className={`absolute left-3 top-1/2 size-3.5 -translate-y-1/2 transition-colors ${isLoading ? 'animate-spin text-indigo-500' : 'text-slate-400'}`}
            />
            <input
              type="text"
              placeholder="Buscar por código, placa, titular o DNI"
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
              value={filterTipo}
              onChange={(val) => {
                setFilterTipo(val)
                setCurrentPage(1)
              }}
              options={FILTER_TIPO_OPTIONS}
            />

            <RoundedSelect
              value={filterEstado}
              onChange={(val) => {
                setFilterEstado(val)
                setCurrentPage(1)
              }}
              options={FILTER_ESTADO_OPTIONS}
            />

            {(filterTipo !== 'TODOS' || filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterTipo('TODOS')
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
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap hover:opacity-90"
              style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Emitir documento</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[22%]" />
              <col className="w-[130px]" />
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[12%]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 "><SortableHeader column="tipoDocumento" label="Documento / Código" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 "><SortableHeader column="vehiculoPlaca" label="Placa" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 ">Titular / Propietario</th>
                <th className="px-4 py-3 ">Expedición</th>
                <th className="px-4 py-3 "><SortableHeader column="fechaExpiracion" label="Vencimiento" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 text-center"><SortableHeader column="estado" align="center" label="Estado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="sticky right-0 z-20 px-4 py-3 text-center bg-slate-50/75 dark:bg-[var(--bg-subtle)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${isLoading && documentos.length > 0 ? 'opacity-50' : ''}`}>
              {isLoading && documentos.length === 0 ? (
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
                      <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-20 rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-5 w-16 rounded-full" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                    <td
                      className="sticky right-0 z-10 px-4 py-3 text-right"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                      <div className="h-7 w-20 ml-auto rounded" style={{ backgroundColor: 'var(--bg-subtle)' }} />
                    </td>
                  </tr>
                ))
              ) : filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Icon name="document" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron documentos</p>
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((d) => (
                  <tr
                    key={d.id}
                    className="group transition-colors hover:bg-[var(--brand-soft)] dark:hover:bg-[var(--bg-subtle)]"
                  >
                    <td className="px-4 py-3 ">
                      <button
                        type="button"
                        onClick={() => abrirEmitirDesdeDocumento(d)}
                        title="Emitir o actualizar un documento de este vehículo"
                        className="block max-w-full cursor-pointer space-y-1 rounded-lg text-left transition hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-900 underline-offset-2 group-hover:underline dark:text-white text-xs">
                            {d.codigo}
                          </span>
                        </span>
                        <span className="block">{getDocTypeBadge(d.tipoDocumento)}</span>
                      </button>
                    </td>

                    <td className="px-4 py-3 ">
                      <button
                        type="button"
                        onClick={() => abrirVehiculo(d)}
                        title="Ver datos del vehículo"
                        className="cursor-pointer rounded-lg transition hover:scale-105 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                      >
                        <PlacaBadge placa={d.vehiculoPlaca} className="whitespace-nowrap" />
                      </button>
                    </td>

                    <td className="px-4 py-3 max-w-[200px]">
                      <div>
                        <p
                          className="font-bold text-xs text-slate-900 dark:text-white truncate"
                          title={d.propietario}
                        >
                          {d.propietario || 'Sin Propietario Asignado'}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {d.propietarioDni && (
                            <span className="font-mono font-semibold">DNI: {d.propietarioDni}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 ">
                      <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatFecha(d.fechaExpedicion)}
                      </span>
                    </td>

                    <td className="px-4 py-3 ">
                      <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {d.fechaExpiracion ? formatFecha(d.fechaExpiracion) : 'Sin vencimiento'}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={d.estado} />
                    </td>

                    <td
                      className="sticky right-0 z-10 px-4 py-3 text-right group-hover:bg-[var(--brand-soft)] dark:group-hover:bg-slate-800/40 transition-colors shadow-[-4px_0_8px_rgba(0,0,0,0.03)]"
                      style={{ backgroundColor: 'var(--bg-surface)' }}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {/* OJO: Celeste (Ver Ficha) */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(d)}
                          title="Ver ficha de documento"
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

                        {/* EDITAR: Amarillo */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(d)}
                          title="Editar documento"
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
                          onClick={() => handleDelete(d.id)}
                          title="Eliminar documento"
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
                ))
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

      {/* Modal Emitir / Editar Documento */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") setIsModalOpen(false); e.currentTarget.dataset.downOnOverlay = "" }}>
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="document" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Editar documento vehicular' : docExistenteDelTipo ? (renovandoVencido ? 'Actualizar documento vencido' : 'Actualizar documento') : 'Emitir nuevo documento'}
                </h3>
              </div>
              <BotonCerrarModal onClick={() => setIsModalOpen(false)} title="Cerrar" />
            </div>

            <form onSubmit={handleFormSubmit} autoComplete="off" className="flex flex-col">
              <div className="p-3 sm:p-4 space-y-2.5 max-h-[85vh] overflow-y-auto">
                {/* 1. Sección: Vehículo y Titular */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                    Vehículo y Titular
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    {/* Input de Placa con Autocompletado desde Base de Datos */}
                    <div className="sm:col-span-5 relative" ref={placaDropdownRef}>
                      <FloatingInput
                        id="doc_placa"
                        label="Placa vehicular"
                        required
                        value={formData.vehiculoPlaca}
                        inputClassName="font-mono font-bold tracking-wider uppercase"
                        onFocus={() => setIsPlacaDropdownOpen(true)}
                        onChange={(e) => {
                          handleEscribirPlaca(normalizarPlaca(e.target.value))
                          setIsPlacaDropdownOpen(true)
                        }}
                      />

                      {isPlacaDropdownOpen && !vehiculoSeleccionadoId && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg shadow-slate-900/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]">
                          {(formData.vehiculoPlaca || '').length < 2 ? (
                            <div className="px-3 py-2 text-center text-xs text-slate-400">
                              Escriba al menos 2 caracteres de la placa
                            </div>
                          ) : isBuscandoPlaca && resultadosPlaca.length === 0 ? (
                            <div className="px-3 py-2 text-center text-xs text-slate-400">Buscando...</div>
                          ) : resultadosPlaca.length === 0 ? (
                            <div className="px-3 py-2 text-center text-xs text-slate-400">
                              No hay vehículos con esa placa
                            </div>
                          ) : (
                            resultadosPlaca.map((v) => (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() => seleccionarVehiculo(v)}
                                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition cursor-pointer ${
                                  formData.vehiculoPlaca === v.placa
                                    ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/60 dark:text-blue-300'
                                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700/60'
                                }`}
                              >
                                <span className="font-mono font-bold">{v.placa}</span>
                                <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                  {v.propietario || v.marca || 'Registrado'}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selector de Tipo de Documento */}
                    <div className="sm:col-span-7">
                      {TIPO_DOC_OPTIONS.some((o) => o.value === formData.tipoDocumento) ? (
                        <FloatingSelect
                          id="doc_tipo"
                          label="Tipo de documento"
                          value={formData.tipoDocumento}
                          onChange={(e) => cambiarTipo(e.target.value)}
                          options={TIPO_DOC_OPTIONS}
                        />
                      ) : (
                        // CITV y CertiCAV/REVISION_TECNICA no se emiten aquí, pero los ya registrados se pueden editar.
                        <FloatingInput
                          id="doc_tipo"
                          label="Tipo de documento"
                          value={TIPO_DOC_LABEL_EXTERNO[formData.tipoDocumento] || formData.tipoDocumento}
                          readOnly
                        />
                      )}
                    </div>
                  </div>

                  {/* Resumen del Propietario / Vehículo cargado desde la BD */}
                  {formData.vehiculoPlaca && (
                    <div className="rounded-xl border border-slate-200/80 bg-white px-2.5 py-1.5 dark:border-[var(--border-strong)] dark:bg-slate-800/80 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block leading-tight">
                          Propietario en Padrón
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white truncate block leading-tight">
                          {formData.propietario || 'Sin Propietario Asignado en BD'}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        {formData.propietarioDni && (
                          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200 block">
                            DNI: {formData.propietarioDni}
                          </span>
                        )}
                        {formData.asociacion && (
                          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
                            {formData.asociacion}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {vehiculoSeleccionadoId && (
                    <EstadoDocumentosVehiculo
                      resumen={resumenDocs}
                      isLoading={isLoadingResumen}
                      tipoSeleccionado={formData.tipoDocumento}
                      documentoEditandoId={isEditing ? selectedDoc?.id : null}
                      documentoExistente={docExistenteDelTipo}
                      onSeleccionarTipo={isEditing ? cambiarTipoDesdeEdicion : cambiarTipo}
                      onVaciar={isEditing ? null : vaciarDocumento}
                    />
                  )}
                </div>

                {/* 2. Sección: Datos, vigencia y estado del documento */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3 space-y-2 dark:border-[var(--border)] dark:bg-slate-900/50 shadow-xs">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 dark:text-white mb-1 flex items-center gap-2">
                    <span className="size-2 rounded-full bg-slate-900 dark:bg-white" />
                    Datos del Documento
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                    <div className="sm:col-span-7">
                      <FloatingInput
                        id="doc_codigo"
                        label={getCodigoLabel(formData.tipoDocumento)}
                        required
                        value={formData.codigo}
                        disabled={codigoHeredaResolucion(formData.tipoDocumento, formData.asociacionResolucionAlcaldia)}
                        inputClassName={`font-mono font-bold uppercase ${codigoHeredaResolucion(formData.tipoDocumento, formData.asociacionResolucionAlcaldia) ? 'disabled:bg-slate-100 disabled:text-slate-600 disabled:cursor-not-allowed dark:disabled:bg-white/5 dark:disabled:text-slate-300' : ''}`}
                        onChange={(e) => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                      />
                      {codigoHeredaResolucion(formData.tipoDocumento, formData.asociacionResolucionAlcaldia) && (
                        <p className="mt-1 text-[10.5px] font-semibold text-slate-400 flex items-center gap-1">
                          <Icon name="lock" className="size-3" />
                          Tomado de la resolución de alcaldía de {formData.asociacion || 'la asociación'}.
                        </p>
                      )}
                    </div>
                    <div className="sm:col-span-5">
                      <FloatingSelect
                        id="doc_estado"
                        label="Estado del documento"
                        value={formData.estado}
                        onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                        options={TIPOS_SIN_VIGENCIA.includes(formData.tipoDocumento) ? ESTADO_OPTIONS_SIN_VIGENCIA : ESTADO_OPTIONS}
                      />
                    </div>
                  </div>

                  <div className={`grid grid-cols-1 gap-2.5 ${TIPOS_SIN_VIGENCIA.includes(formData.tipoDocumento) ? '' : 'sm:grid-cols-2'}`}>
                    <FloatingInput
                      id="doc_expedicion"
                      label="Fecha de expedición"
                      type="date"
                      required
                      value={formData.fechaExpedicion}
                      onChange={(e) => setFormData({ ...formData, fechaExpedicion: e.target.value })}
                    />

                    {!TIPOS_SIN_VIGENCIA.includes(formData.tipoDocumento) && (
                      <FloatingInput
                        id="doc_expiracion"
                        label="Fecha de vencimiento"
                        type="date"
                        required
                        value={formData.fechaExpiracion}
                        onChange={(e) => setFormData({ ...formData, fechaExpiracion: e.target.value })}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/80 px-6 py-2.5 dark:border-[var(--border)] dark:bg-slate-900/80">
                <BotonCancelar onClick={() => setIsModalOpen(false)} />
                <BotonGuardar>
                  {isEditing || docExistenteDelTipo ? 'Actualizar documento' : 'Emitir documento'}
                </BotonGuardar>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ficha de Detalle (Diccionario Visual - Estilo Exacto Personas) */}
      {isDetailModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 rounded-t-3xl dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="document" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Ficha del Documento Vehicular
                </h3>
              </div>
              <BotonCerrarModal onClick={() => setIsDetailModalOpen(false)} title="Cerrar ficha" />
            </div>

            {/* Modal Body */}
            <div className="p-5 pb-6 space-y-3.5 max-h-[80vh] overflow-y-auto">
              {/* Profile Hero Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-400 dark:border-indigo-800">
                    <Icon name="document" className="size-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-black text-slate-900 dark:text-white">
                        {selectedDoc.codigo}
                      </span>
                      <PlacaBadge placa={selectedDoc.vehiculoPlaca} />
                    </div>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      {selectedDoc.propietario || 'Sin Propietario Asignado'} · {selectedDoc.asociacion || 'Independiente'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={selectedDoc.estado} />
                  {selectedDoc.tipoDocumento === 'TARJETA_OPERATIVIDAD' && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsDetailModalOpen(false)
                        navigate(`/impresion?pestana=TARJETAS&buscar=${encodeURIComponent(selectedDoc.vehiculoPlaca || selectedDoc.codigo || '')}&estado=TODOS`)
                      }}
                      title="Abrir el Centro de impresión con esta tarjeta ya filtrada"
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-purple-700 active:scale-95"
                    >
                      <Icon name="print" className="size-3.5" />
                      <span>Ir a imprimir carnet</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Secciones de Datos en Rejilla: Solo atributos reales de la Base de Datos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* 1. Datos del Vehículo y Titular */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 space-y-1.5 shadow-xs">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Datos del Vehículo y Titular
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Placa</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {selectedDoc.vehiculoPlaca || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Marca / Modelo</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {[selectedDoc.vehiculoMarca, selectedDoc.vehiculoModelo].filter(Boolean).join(' ') || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Año / Color</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {[selectedDoc.vehiculoAnio, selectedDoc.vehiculoColor].filter(Boolean).join(' · ') || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">N° Serie / Chasis</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-white text-right">
                        {selectedDoc.vehiculoSerie || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">N° Motor</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-white text-right">
                        {selectedDoc.vehiculoMotor || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Carrocería</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedDoc.vehiculoCarroceria || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Partida Registral</span>
                      <span className="font-mono text-slate-800 dark:text-white text-right">
                        {selectedDoc.vehiculoPartidaRegistral || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Titular / Propietario</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedDoc.propietario || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">DNI del Titular</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-white">
                        {selectedDoc.propietarioDni || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">N° Licencia</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {selectedDoc.numeroLicencia || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Asociación</span>
                      <span className="font-bold text-slate-800 dark:text-white text-right">
                        {selectedDoc.asociacion || 'Independiente'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Datos de Emisión y Vigencia */}
                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-slate-900/50 space-y-1.5 shadow-xs">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Datos de Emisión y Vigencia
                  </h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Tipo de documento</span>
                      <span>{getDocTypeBadge(selectedDoc.tipoDocumento)}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Código oficial</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {selectedDoc.codigo || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Fecha expedición</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-white">
                        {formatFecha(selectedDoc.fechaExpedicion)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Fecha vencimiento</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {selectedDoc.fechaExpiracion ? formatFecha(selectedDoc.fechaExpiracion) : 'Sin vencimiento'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Estado de vigencia</span>
                      <StatusBadge status={selectedDoc.estado} />
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">N° Resolución de Alcaldía</span>
                      <span className="font-mono text-slate-800 dark:text-white text-right">
                        {selectedDoc.resMunicipal || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5 border-b border-slate-200/50 dark:border-slate-800/80">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Dirección del Titular</span>
                      <span className="font-medium text-slate-800 dark:text-white text-right break-words min-w-0">
                        {selectedDoc.direccion || '—'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span className="text-[11px] font-semibold text-slate-400 shrink-0 mr-2">Código QR</span>
                      <span className="break-all text-right font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {selectedDoc.codigoQr || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <VehiculoDetalleModal
        selectedVehiculo={vehiculoDetalle}
        onClose={() => setVehiculoDetalle(null)}
        isVehiculoFormal={isVehiculoFormal}
        buildVehiculoQrValue={buildVehiculoQrValue}
        getVehiculoDocumento={getVehiculoDocumento}
      />
    </div>
  )
}
