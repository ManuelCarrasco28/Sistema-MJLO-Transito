import { useEffect, useState, useRef, useMemo } from 'react'
import { showToast, showConfirm, showError, showSuccess } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination }
from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PlacaVehiculo } from '../components/vehiculos/PlacaVehiculo'
import { sanitizarMensaje, leerMensajeError, apiFetch } from '../config/api'
import { useListaServidor } from '../hooks/useListaServidor'
import { usePersonaRapida } from '../hooks/usePersonaRapida'
import { exportToExcel } from '../utils/exportToExcel'
import { fetchTodasLasFilas } from '../utils/descargaCompleta'
import { formatNumeroTarjeta } from '../utils/formatters'

import { FloatingInput, FloatingSelect, FloatingTextarea, RoundedSelect } from '../components/ui/FormInputs'
import { MapaCoordenadasPicker } from '../components/ui/MapaCoordenadasPicker'
import { MapaInline, MapaPreviewModal, MapaTodasUbicacionesModal } from '../components/ui/MapaVisualizador'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'
import { puedeEliminarRegistros } from '../config/roles'

const FILTER_TIPO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los tipos' },
  { value: 'ASOCIACION', label: 'Asociaciones' },
  { value: 'PARTICULAR', label: 'Particulares' },
]

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activas' },
  { value: 'SUSPENDIDO', label: 'Suspendidas' },
]

const FILTER_SOCIO_VEHICULOS_OPTIONS = [
  { value: 'TODOS', label: 'Todos los vehículos' },
  { value: 'UNO', label: '1 vehículo' },
  { value: 'DOS_TRES', label: '2 a 3 vehículos' },
  { value: 'MAS_TRES', label: 'Más de 3 vehículos' },
]

const normalizeOrg = (o) => ({
  ...o,
  _search: `${o.razonSocial || ''} ${o.ruc || ''} ${o.partidaRegistral || ''} ${o.direccion || ''} ${o.numeroLicencia || ''} ${o.resolucionAlcaldia || ''} ${o.representanteNombre || ''} ${o.representanteDni || ''}`.toLowerCase(),
})

export function Asociaciones() {
  const [stats, setStats] = useState({ total: 0, particulares: 0, asociaciones: 0, flotaAcumulada: 0 })
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [orgSortBy, setOrgSortBy] = useState('')
  const [orgSortDir, setOrgSortDir] = useState('DESC')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  const [activeTab, setActiveTab] = useState('REGISTRO')
  const [orgOptionsRaw, setOrgOptionsRaw] = useState([])
  const [sociosPage, setSociosPage] = useState(1)
  const [sociosPerPage, setSociosPerPage] = useState(5)
  const [sociosSortBy, setSociosSortBy] = useState('nombre')
  const [sociosSortDir, setSociosSortDir] = useState('ASC')
  const [sociosSearch, setSociosSearch] = useState('')
  const [debouncedSociosSearch, setDebouncedSociosSearch] = useState('')
  const [socioOrgFilter, setSocioOrgFilter] = useState('TODOS')
  const [socioTipoFilter, setSocioTipoFilter] = useState('TODOS')
  const [socioVehiculosFilter, setSocioVehiculosFilter] = useState('TODOS')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [isSearchingRuc, setIsSearchingRuc] = useState(false)
  const rucRequestRef = useRef(null)
  useEffect(() => {
    if (!isModalOpen) {
      rucRequestRef.current?.abort()
      setIsSearchingRuc(false)
    }
    return () => rucRequestRef.current?.abort()
  }, [isModalOpen])
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [mapPreview, setMapPreview] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  const [repSearch, setRepSearch] = useState('')
  const [repPersona, setRepPersona] = useState(null)
  const [showRepResults, setShowRepResults] = useState(false)
  const [isSearchingRep, setIsSearchingRep] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [mapaGeneral, setMapaGeneral] = useState({ abierto: false, cargando: false, items: [] })
  const repDropdownRef = useRef(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(searchTerm), 300)
    return () => window.clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSociosSearch(sociosSearch), 300)
    return () => window.clearTimeout(timer)
  }, [sociosSearch])

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filterTipo, filterEstado])

  useEffect(() => {
    setSociosPage(1)
  }, [debouncedSociosSearch, socioOrgFilter, socioTipoFilter, socioVehiculosFilter])

  useEffect(() => {
    function handleClickOutside(e) {
      if (repDropdownRef.current && !repDropdownRef.current.contains(e.target)) {
        setShowRepResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const emptyForm = {
    tipo: 'ASOCIACION',
    razonSocial: '',
    idRepresentanteLegal: null,
    representanteNombre: '',
    representanteDni: '',
    ruc: '',
    partidaRegistral: '',
    fechaCreacion: '',
    direccion: '',
    coordenadas: '',
    telefono: '',
    email: '',
    tipoAmbiente: '',
    numeroLicencia: '',
    resolucionAlcaldia: '',
    flotaAutorizada: 50,
    estado: 'ACTIVO',
  }

  const [formData, setFormData] = useState(emptyForm)

  const buscarRuc = async () => {
    const ruc = formData.ruc.trim()
    if (!/^\d{11}$/.test(ruc)) {
      setFieldErrors(prev => ({ ...prev, ruc: 'Ingresa un RUC de 11 dígitos.' }))
      return
    }
    if (!ruc.startsWith('20')) {
      setFieldErrors(prev => ({ ...prev, ruc: 'La consulta admite RUC que empiezan en 20. Ingresa los datos manualmente.' }))
      return
    }
    const controller = new AbortController()
    rucRequestRef.current?.abort()
    rucRequestRef.current = controller
    setIsSearchingRuc(true)
    setFieldErrors(prev => ({ ...prev, ruc: '' }))
    try {
      const res = await apiFetch(`/ruc/${ruc}`, { signal: controller.signal })
      if (!res.ok) throw new Error(await leerMensajeError(res, 'No se pudo consultar el RUC.'))
      const payload = await res.json()
      if (controller.signal.aborted) return
      const datos = payload.data
      if (!datos?.razonSocial || datos.ruc !== ruc) throw new Error('No se encontraron datos para este RUC.')
      setFormData(prev => prev.ruc.trim() === ruc ? { ...prev, razonSocial: datos.razonSocial, direccion: datos.direccion || prev.direccion } : prev)
      setFieldErrors(prev => ({ ...prev, ruc: '', razonSocial: '' }))
      showToast('Datos del RUC encontrados', 'success')
    } catch (error) {
      if (!controller.signal.aborted) setFieldErrors(prev => ({ ...prev, ruc: error.message || 'No se pudo consultar el RUC.' }))
    } finally {
      if (rucRequestRef.current === controller) setIsSearchingRuc(false)
    }
  }

  const handleOrgSort = (column, dir) => {
    setOrgSortBy(column)
    setOrgSortDir(dir)
    setCurrentPage(1)
  }

  const filtrosOrgs = {
    buscar: debouncedSearch,
    tipo: filterTipo === 'TODOS' ? '' : filterTipo,
    estado: filterEstado === 'TODOS' ? '' : filterEstado,
    sortBy: orgSortBy,
    sortDir: orgSortBy ? orgSortDir : '',
  }

  const filtrosSocios = {
    buscar: debouncedSociosSearch,
    idAsociacion: socioOrgFilter === 'TODOS' ? '' : socioOrgFilter,
    tipo: socioTipoFilter === 'TODOS' ? '' : socioTipoFilter,
    vehiculos: socioVehiculosFilter === 'TODOS' ? '' : socioVehiculosFilter,
    sortBy: sociosSortBy,
    sortDir: sociosSortDir,
  }

  const { filas: asociaciones, total: totalOrgs, isLoading, error: loadError, recargar: loadOrgs } = useListaServidor({
    endpoint: '/asociaciones',
    params: filtrosOrgs,
    page: currentPage,
    porPagina: itemsPerPage,
    mapear: normalizeOrg,
    descripcion: 'el padrón de asociaciones',
  })

  // Los socios (miles de filas) solo se consultan con la pestaña abierta.
  const { filas: sociosList, total: sociosTotal, isLoading: isSociosLoading, recargar: loadSocios } = useListaServidor({
    endpoint: '/asociaciones/socios',
    params: filtrosSocios,
    page: sociosPage,
    porPagina: sociosPerPage,
    activo: activeTab === 'SOCIOS',
    descripcion: 'el padrón de socios',
  })

  const loadStats = () => {
    apiFetch('/asociaciones/estadisticas')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((payload) => setStats((prev) => ({ ...prev, ...(payload.data ?? {}) })))
      .catch((err) => console.warn('No se pudieron cargar las estadísticas de asociaciones:', err))
  }

  useEffect(() => {
    loadStats()
  }, [])

  // Los socios (miles de filas) y el catálogo del filtro solo se consultan con la pestaña abierta.
  useEffect(() => {
    if (activeTab !== 'SOCIOS' || orgOptionsRaw.length > 0) return
    apiFetch('/asociaciones/opciones')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((payload) => setOrgOptionsRaw(payload.data ?? []))
      .catch((err) => console.warn('No se pudieron cargar las opciones de asociaciones:', err))
  }, [activeTab])

  const recargarTrasCambio = () => {
    loadOrgs()
    loadStats()
    if (activeTab === 'SOCIOS') loadSocios()
  }

  const getPersonaNombre = (p) => {
    if (!p) return ''
    if (p.nombreCompleto) return p.nombreCompleto
    const full = `${p.nombres || ''} ${p.apellidoPaterno || p.apellido_paterno || ''} ${p.apellidoMaterno || p.apellido_materno || ''}`.trim()
    return full || p.razon_social || p.razonSocial || 'Sin Nombre'
  }

  const selectRepresentante = (p) => {
    const dni = String(p.numeroDocumento || p.numero || '')
    const nom = getPersonaNombre(p)
    setFormData((prev) => ({
      ...prev,
      idRepresentanteLegal: p.id,
      representanteDni: dni,
      representanteNombre: nom,
    }))
    setRepPersona(p)
    setRepSearch('')
    setShowRepResults(false)
  }

  const clearRepresentante = () => {
    setFormData((prev) => ({
      ...prev,
      idRepresentanteLegal: null,
      representanteDni: '',
      representanteNombre: '',
    }))
    setRepPersona(null)
    setRepSearch('')
    setShowRepResults(false)
  }

  const buscarRepresentantePorDni = async () => {
    const dni = repSearch.trim()
    if (!/^\d{8}$/.test(dni)) {
      showError('DNI inválido', 'Ingresa los 8 dígitos del DNI para buscar.')
      return
    }

    setIsSearchingRep(true)
    setShowRepResults(false)
    try {
      const response = await apiFetch(`/personas?page=1&buscar=${encodeURIComponent(dni)}&porPagina=10`)
      if (!response.ok) throw new Error(await leerMensajeError(response, 'No se pudo buscar el DNI.'))
      const payload = await response.json()
      const personas = payload.data || []
      const encontrada = personas.find((persona) => String(persona.numeroDocumento || persona.numero || '') === dni)
      if (encontrada) {
        selectRepresentante(encontrada)
      } else {
        setShowRepResults(true)
      }
    } catch (error) {
      showError('Error de búsqueda', sanitizarMensaje(error.message, 'No se pudo buscar el DNI.'))
    } finally {
      setIsSearchingRep(false)
    }
  }

  const { abrir: abrirRegistroPersona, modal: modalRegistroPersona } = usePersonaRapida({
    alCrear: (persona) => selectRepresentante(persona),
  })

  const particulares = stats.particulares ?? 0
  const asociacionesCount = stats.asociaciones ?? 0
  const flotaAcumulada = stats.flotaAcumulada ?? 0

  // Exportar descarga todo el resultado filtrado (sin paginar), no solo la página visible.
  const fetchTodasOrgs = async () => {
    return fetchTodasLasFilas('/asociaciones', filtrosOrgs)
  }

  const fetchTodosSocios = async () => {
    return fetchTodasLasFilas('/asociaciones/socios', filtrosSocios)
  }

  // Mapa general: todas las ubicaciones del padrón (con el filtro actual), no solo la página visible
  const abrirMapaGeneral = async () => {
    setMapaGeneral({ abierto: true, cargando: true, items: [] })
    try {
      const filas = await fetchTodasLasFilas('/asociaciones', filtrosOrgs, { silencioso: true })
      const items = filas.map((o) => ({
        id: o.id,
        title: o.razonSocial || o.razon_social || 'Sin nombre',
        coordenadas: o.coordenadas || '',
        direccion: o.direccion || '',
        tipo: o.tipo,
      }))
      setMapaGeneral({ abierto: true, cargando: false, items })
    } catch (err) {
      setMapaGeneral({ abierto: false, cargando: false, items: [] })
      showError('No se pudo cargar el mapa', sanitizarMensaje(err.message, 'No se pudieron obtener las ubicaciones.'))
    }
  }

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const listToExport = await fetchTodasOrgs()
          await exportToExcel({
            filename: `Padron_Asociaciones_${new Date().getFullYear()}.xlsx`,
            sheetName: 'Asociaciones',
            title: 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
            subtitle: 'Subgerencia de Tránsito y Transporte · Padrón Oficial de Asociaciones y Empresas',
            metadata: [
              { label: 'Filtro Tipo', value: filterTipo },
              { label: 'Filtro Estado', value: filterEstado },
              { label: 'Flota de asociaciones exportadas', value: `${listToExport.reduce((total, org) => total + Number(org.flotaTotal || 0), 0)} unidades` },
            ],
            columns: [
              { header: 'N°', align: 'center', width: 45, render: (_, __, i) => i + 1 },
              { header: 'Tipo', key: 'tipo', width: 110, align: 'center' },
              { header: 'Razón Social / Organización', key: 'razonSocial', width: 260 },
              { header: 'RUC', key: 'ruc', width: 120, align: 'center', isText: true },
              { header: 'Partida Registral', key: 'partidaRegistral', width: 130, align: 'center', isText: true },
              { header: 'Fecha de Creación', key: 'fechaCreacion', width: 120, align: 'center' },
              { header: 'Resolución Alcaldía', key: 'resolucionAlcaldia', width: 160, align: 'center' },
              { header: 'N° Licencia', key: 'numeroLicencia', width: 120, align: 'center', isText: true },
              { header: 'Tipo de Ambiente', key: 'tipoAmbiente', width: 130 },
              { header: 'Representante Legal', key: 'representanteNombre', width: 200 },
              { header: 'DNI Representante', key: 'representanteDni', width: 120, align: 'center', isText: true },
              { header: 'Teléfono Representante', key: 'representanteTelefono', width: 130, align: 'center', isText: true },
              { header: 'Flota Autorizada', key: 'flotaAutorizada', width: 110, align: 'center' },
              { header: 'Flota Registrada', key: 'flotaTotal', width: 110, align: 'center' },
              { header: 'Cupos Disponibles', key: 'cuposDisponibles', width: 110, align: 'center' },
              { header: 'Ocupación (%)', key: 'porcentajeOcupacion', width: 100, align: 'center' },
              { header: 'Estado del Cupo', key: 'estadoCupo', width: 110, align: 'center' },
              { header: 'Teléfono', key: 'telefono', width: 110, align: 'center', isText: true },
              { header: 'Correo Electrónico', key: 'email', width: 180 },
              { header: 'Dirección', key: 'direccion', width: 220 },
              { header: 'Coordenadas', key: 'coordenadas', width: 150 },
              { header: 'Estado', key: 'estado', width: 90, align: 'center' },
            ],
            data: listToExport,
          })
    } catch (error) {
      if (error.name !== 'AbortError') showError('Descarga no completada', error.message || 'No se pudo preparar el archivo completo.')
    } finally {
      setIsExportingExcel(false)
    }
  }


  const handleExportSociosExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const listToExport = { endpoint: '/asociaciones/socios', params: filtrosSocios,
        transformar: socios => socios.flatMap((socio) => (socio.vinculos?.length ? socio.vinculos : [null]).map((v) => ({
        nombre: socio.nombre,
        documento: socio.documento,
        asociacionNombre: v?.asociacionNombre || '-',
        tipo: v ? (v.tipo === 'PARTICULAR' ? 'Particular' : 'Asociación') : '-',
        vehiculosTotal: v ? v.vehiculos : 0,
        placas: v ? v.placas.join(', ') : '',
        telefono: socio.telefono,
        email: socio.email,
      }))) }
      await exportToExcel({
        filename: `Padron_Socios_${new Date().getFullYear()}.xlsx`,
        sheetName: 'Socios',
        title: 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
        subtitle: 'Subgerencia de Tránsito y Transporte · Padrón Oficial de Socios',
        metadata: [
          { label: 'Filtro Asociación', value: socioOrgFilter === 'TODOS' ? 'Todas' : (orgOptionsRaw.find((o) => String(o.id) === String(socioOrgFilter))?.razonSocial || socioOrgFilter) },
          { label: 'Filtro Tipo', value: socioTipoFilter === 'TODOS' ? 'Todos' : (socioTipoFilter === 'PARTICULAR' ? 'Particular' : 'Asociación') },
          { label: 'Filtro Vehículos', value: FILTER_SOCIO_VEHICULOS_OPTIONS.find((o) => o.value === socioVehiculosFilter)?.label || 'Todos' },
          { label: 'Registros', value: 'Todos los vínculos que coinciden con los filtros' },
        ],
        columns: [
          { header: 'N°', align: 'center', width: 45, render: (_, __, i) => i + 1 },
          { header: 'Socio / Propietario', key: 'nombre', width: 260 },
          { header: 'Documento', key: 'documento', width: 120, align: 'center', isText: true },
          { header: 'Asociación / Empresa', key: 'asociacionNombre', width: 260 },
          { header: 'Tipo', key: 'tipo', width: 100, align: 'center' },
          { header: 'Vehículos en ella', key: 'vehiculosTotal', width: 110, align: 'center' },
          { header: 'Placas', key: 'placas', width: 200 },
          { header: 'Teléfono', key: 'telefono', width: 120, align: 'center', isText: true },
          { header: 'Correo Electrónico', key: 'email', width: 200 },
        ],
        data: listToExport,
      })
    } finally {
      setIsExportingExcel(false)
    }
  }

  // Bloquea el scroll de la página de fondo mientras hay un modal abierto,
  // para que no arrastre visualmente la cabecera del modal al desplazarse.
  useEffect(() => {
    if (isModalOpen || isDetailModalOpen) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = previousOverflow
      }
    }
  }, [isModalOpen, isDetailModalOpen])

  // Opciones del filtro de la pestaña Socios (id + nombre, vienen de un endpoint liviano)
  const uniqueOrgOptions = useMemo(() => [
    { value: 'TODOS', label: 'Todas las Asociaciones' },
    ...orgOptionsRaw.map((o) => ({ value: String(o.ids || o.id), label: o.razonSocial })),
  ], [orgOptionsRaw])

  const handleOpenCreateModal = () => {
    setFieldErrors({})
    setFormData(emptyForm)
    setRepPersona(null)
    setRepSearch('')
    setShowRepResults(false)
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (org) => {
    setFieldErrors({})
    setRepPersona(org.idRepresentanteLegal ? {
      nombres: org.representanteNombres || '',
      apellidoPaterno: org.representanteApellidoPaterno || '',
      apellidoMaterno: org.representanteApellidoMaterno || '',
    } : null)
    setSelectedOrg(org)
    setFormData({
      ...emptyForm,
      ...org,
      idRepresentanteLegal: org.idRepresentanteLegal || null,
      representanteNombre: org.representanteNombre || '',
      representanteDni: org.representanteDni || '',
    })
    setRepSearch('')
    setShowRepResults(false)
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleOpenDetail = async (org) => {
    setSelectedOrg(org)
    setDetailData(null)
    setIsDetailModalOpen(true)
    setIsDetailLoading(true)
    try {
      const response = await apiFetch(`/asociaciones/${org.id}`)
      const payload = await response.json()
      setDetailData(payload.data || org)
    } catch (err) {
      setDetailData(org)
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Eliminar asociación?',
      '¿Está seguro de eliminar esta asociación del registro municipal? Esta acción no se puede deshacer.',
      'Sí, eliminar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/asociaciones/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(await leerMensajeError(res, 'No se pudo eliminar la asociación.'))
        recargarTrasCambio()
        showToast('Asociación eliminada correctamente', 'eliminar')
      } catch (err) {
        showError('Error', sanitizarMensaje(err.message, 'No se pudo eliminar la asociación.'))
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formData.razonSocial.trim() || !formData.ruc.trim()) {
      showError('Validación Fallida', 'Por favor completa los campos requeridos (Razón Social y RUC).')
      return
    }

    const documentNumber = formData.ruc.trim()
    if (!/^\d{11}$/.test(documentNumber)) {
      showError('Formato Inválido', 'El RUC debe tener exactamente 11 dígitos numéricos.')
      return
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showError('Formato Inválido', 'El correo electrónico no es válido.')
      return
    }

    try {
      const mostrarErroresCampos = async (res) => {
        if (res.ok) return false
        const payload = await res.clone().json().catch(() => ({}))
        const mensajes = payload.messages || {}
        const errores = Object.fromEntries(Object.entries(mensajes).filter(([campo, valor]) => ['razonSocial', 'ruc'].includes(campo) && typeof valor === 'string'))
        if (!Object.keys(errores).length) return false
        setFieldErrors(errores)
        document.getElementById(errores.razonSocial ? 'org_razon' : 'org_ruc')?.focus()
        return true
      }
      if (isEditing) {
        const res = await apiFetch(`/asociaciones/${selectedOrg.id}`, {
          method: 'PUT',
          body: formData,
        })
        if (await mostrarErroresCampos(res)) return
        if (!res.ok) throw new Error(await leerMensajeError(res, 'No se pudo actualizar la asociación.'))
        recargarTrasCambio()
        showToast('Asociación actualizada correctamente', 'editar')
      } else {
        const res = await apiFetch('/asociaciones', {
          method: 'POST',
          body: formData,
        })
        if (await mostrarErroresCampos(res)) return
        if (!res.ok) throw new Error(await leerMensajeError(res, 'Error al crear la asociación.'))
        setCurrentPage(1)
        recargarTrasCambio()
        showToast('Asociación registrada exitosamente')
      }
      setIsModalOpen(false)
    } catch (err) {
      showError('Error al guardar', sanitizarMensaje(err.message, 'Error al guardar la asociación en el servidor.'))
    }
  }

  const openMap = (coordenadas, title = 'Ubicación registrada', direccion = '', tipo = '') => {
    if (!coordenadas?.trim()) return
    setMapPreview({
      title,
      coordenadas: coordenadas.trim(),
      direccion,
      tipo,
    })
  }

  const detailOrg = detailData || selectedOrg

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {loadError && <PageLoadError message={loadError} />}

      {/* Cabecera Principal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="building" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
                Asociaciones y Particulares
              </h1>
            </div>
          </div>
        </div>
      </div>


      {/* Tarjetas KPI con Bordes de Colores */}
      <div className="kpi-grid">

        {/* 1. Total registros */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total registros</span>
            <span className="grid size-6 place-items-center rounded-md text-indigo-600 dark:text-indigo-400">
              <Icon name="building" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(stats.total)}</p>
          </div>
        </div>

        {/* 2. Asociaciones */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Asociaciones</span>
            <span className="grid size-6 place-items-center rounded-md text-amber-600 dark:text-amber-400">
              <Icon name="vehicle" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(asociacionesCount)}</p>
          </div>
        </div>

        {/* 3. Particulares */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Particulares</span>
            <span className="grid size-6 place-items-center rounded-md text-cyan-600 dark:text-cyan-400">
              <Icon name="building" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(particulares)}</p>
          </div>
        </div>

        {/* 4. Flota Registrada */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Flota Registrada</span>
            <span className="grid size-6 place-items-center rounded-md text-emerald-600 dark:text-emerald-400 font-bold text-xs">✓</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(flotaAcumulada)}
            </p>
          </div>
        </div>
      </div>


      
      {/* Pestañas: Asociación y Particular / Socios */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-[var(--border)] mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('REGISTRO')}
          className={`inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'REGISTRO'
              ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="building" className="size-3.5" />
          Asociación y Particular
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SOCIOS')}
          className={`inline-flex items-center gap-1.5 border-b-2 px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer ${
            activeTab === 'SOCIOS'
              ? 'border-indigo-600 text-indigo-700 dark:border-indigo-400 dark:text-indigo-300'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="idCard" className="size-3.5" />
          Socios
        </button>
      </div>

      {activeTab === 'REGISTRO' && (
      <>
<div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por nombre, RUC, partida o licencia"
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
              value={filterTipo}
              onChange={setFilterTipo}
              options={FILTER_TIPO_OPTIONS}
            />

            <RoundedSelect
              value={filterEstado}
              onChange={setFilterEstado}
              options={FILTER_ESTADO_OPTIONS}
            />

            {(filterTipo !== 'TODOS' || filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterTipo('TODOS')
                  setFilterEstado('TODOS')
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
              onClick={abrirMapaGeneral}
              title="Ver todas las ubicaciones en un solo mapa"
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/70 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Icon name="mapPin" className="size-3.5" />
              <span>Mapa</span>
            </button>

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
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap hover:opacity-90"
              style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Nuevo registro</span>
            </button>
          </div>
        </div>




        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[var(--border)]">
              <tr>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[220px]"><SortableHeader column="razonSocial" label="Asociación / Particular" sortBy={orgSortBy} sortDir={orgSortDir} onSort={handleOrgSort} /></th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[125px]"><SortableHeader column="ruc" label="RUC" sortBy={orgSortBy} sortDir={orgSortDir} onSort={handleOrgSort} /></th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[170px]">Representante Legal</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[150px]">Contacto</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[200px]">Ubicación</th>
                <th className="px-4 py-2.5 whitespace-nowrap min-w-[140px] text-center"><SortableHeader column="estado" label="Estado" sortBy={orgSortBy} sortDir={orgSortDir} onSort={handleOrgSort}
                    align="center" /></th>
                <th className="sticky right-0 z-10 bg-slate-50 dark:bg-[var(--bg-subtle)] border-l border-slate-200 dark:border-[var(--border)] px-4 py-2.5 whitespace-nowrap min-w-[130px] text-center shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${isLoading && asociaciones.length > 0 ? 'opacity-50' : ''}`}>
              {isLoading && asociaciones.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-3 min-w-[220px]">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                    <td className="px-3 py-3"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3 py-3 min-w-[170px]">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                    <td className="px-3 py-3 min-w-[150px]">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-24 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="h-2.5 w-32 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                    <td className="px-3 py-3 min-w-[200px]">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-48 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="h-2.5 w-16 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[140px] text-center">
                      <div className="mx-auto h-5 w-20 rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                    </td>
                    <td className="sticky right-0 bg-white dark:bg-[#1C2438] border-l border-slate-200 dark:border-[var(--border)] px-4 py-3 text-center min-w-[130px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="size-7 rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="size-7 rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : asociaciones.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center align-middle">
                    <div className="flex flex-col items-center justify-center">
                      <Icon name="building" className="size-10 mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron asociaciones</p>
                    </div>
                  </td>
                </tr>
              ) : (
                asociaciones.map((o) => (
                  <tr key={o.id} className="group transition-colors hover:bg-cyan-50/30 dark:hover:bg-[var(--bg-subtle)]">
                    <td className="px-3.5 py-3 align-middle min-w-[220px]">
                      <div>
                        <p className="font-semibold text-xs text-slate-800 dark:text-slate-100 leading-snug" title={o.razonSocial}>{o.razonSocial || 'Sin razón social'}</p>
                        {o.tipo === 'ASOCIACION' ? (
                          <span className="inline-flex items-center rounded-md bg-amber-100 text-amber-900 border border-amber-300/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60 mt-0.5">
                            ASOCIACIÓN
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-cyan-100 text-cyan-900 border border-cyan-300/80 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60 mt-0.5">
                            PARTICULAR
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-middle whitespace-nowrap">
                      <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">{o.ruc ? `RUC: ${o.ruc}` : 'Sin RUC'}</p>
                      {o.numeroLicencia && (
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{o.numeroLicencia}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle min-w-[170px]">
                      {o.representanteNombre ? (
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug" title={o.representanteNombre}>
                            {o.representanteNombre}
                          </p>
                          {o.representanteDni && (
                            <p className="font-mono text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                              DNI: {o.representanteDni}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Sin representante</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle min-w-[150px]">
                      {o.telefono || o.email ? (
                        <div>
                          {o.telefono && (
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{o.telefono}</p>
                          )}
                          {o.email && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap truncate max-w-[180px]" title={o.email}>
                              {o.email}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Sin contacto</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle min-w-[200px]">
                      {o.direccion || o.coordenadas ? (
                        <div>
                          {o.direccion && (
                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug" title={o.direccion}>
                              {o.direccion}
                            </p>
                          )}
                          {o.coordenadas && (
                            <button
                              type="button"
                              onClick={() => openMap(o.coordenadas, o.razonSocial, o.direccion, o.tipo)}
                              className="mt-0.5 text-[10px] font-bold text-indigo-600 hover:underline dark:text-indigo-400 cursor-pointer flex items-center gap-1"
                            >
                              <Icon name="mapPin" className="size-3" />
                              <span>Ver mapa</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Sin ubicación</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle whitespace-nowrap text-center min-w-[140px]">
                      <div className="flex items-center justify-center">
                        <StatusBadge status={o.estado} />
                      </div>
                    </td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#1C2438] border-l border-slate-200 dark:border-[var(--border)] px-4 py-3 align-middle text-center whitespace-nowrap shadow-[-4px_0_8px_rgba(0,0,0,0.04)] transition-colors group-hover:bg-cyan-50/30 dark:group-hover:bg-slate-800/40 min-w-[130px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(o)}
                          title="Ver Detalle"
                          className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-eye-bg)] border-[var(--action-eye-border)] text-[var(--action-eye-text)] hover:bg-[var(--action-eye-hover)] hover:border-[var(--action-eye-hover)] hover:text-white"
                        >
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(o)}
                          title="Editar Asociación"
                          className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-edit-bg)] border-[var(--action-edit-border)] text-[var(--action-edit-text)] hover:bg-[var(--action-edit-hover)] hover:border-[var(--action-edit-hover)] hover:text-white"
                        >
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button style={puedeEliminarRegistros() ? undefined : { display: 'none' }}
                          type="button"
                          onClick={() => handleDelete(o.id)}
                          title="Eliminar Asociación"
                          className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-del-bg)] border-[var(--action-del-border)] text-[var(--action-del-text)] hover:bg-[var(--action-del-hover)] hover:border-[var(--action-del-hover)] hover:text-white"
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
          totalItems={totalOrgs}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
          disabled={isLoading}
        />
      </div>
      </>
      )}


      {activeTab === 'SOCIOS' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="sticky top-0 z-20 flex flex-col gap-2.5 rounded-t-2xl border-b border-slate-100 bg-white px-4 py-2.5 dark:border-[var(--border)] dark:bg-[#1C2438] lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              <div className="relative min-w-[240px] flex-1 lg:max-w-sm">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar socio por nombre, DNI o placa"
                  value={sociosSearch}
                  onChange={(e) => setSociosSearch(e.target.value)}
                  className="w-full rounded-xl border-0 bg-slate-100/70 py-2 pl-9 pr-8 text-xs font-medium text-slate-900 outline-none ring-1 ring-inset ring-slate-200/80 transition-all placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-600 dark:bg-slate-900/50 dark:text-white dark:ring-slate-700/50 dark:placeholder:text-slate-500 dark:focus:bg-slate-900 dark:focus:ring-indigo-500"
                />
                {sociosSearch && (
                  <button
                    type="button"
                    onClick={() => setSociosSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>
              <RoundedSelect
                value={socioTipoFilter}
                onChange={setSocioTipoFilter}
                options={FILTER_TIPO_OPTIONS}
                className="min-w-[150px]"
                buttonClassName="w-full"
              />
              <RoundedSelect
                value={socioOrgFilter}
                onChange={setSocioOrgFilter}
                options={uniqueOrgOptions}
                className="min-w-[210px]"
                buttonClassName="w-full"
              />
              <RoundedSelect
                value={socioVehiculosFilter}
                onChange={setSocioVehiculosFilter}
                options={FILTER_SOCIO_VEHICULOS_OPTIONS}
                className="min-w-[170px]"
                buttonClassName="w-full"
              />
              {(socioOrgFilter !== 'TODOS' || socioTipoFilter !== 'TODOS' || socioVehiculosFilter !== 'TODOS' || sociosSearch !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setSocioOrgFilter('TODOS')
                    setSocioTipoFilter('TODOS')
                    setSocioVehiculosFilter('TODOS')
                    setSociosSearch('')
                  }}
                  title="Limpiar filtros de socios"
                  className="grid size-[34px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs shrink-0"
                >
                  <Icon name="filterX" className="size-4" />
                </button>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleExportSociosExcel}
                disabled={isExportingExcel}
                title="Descargar padrón de socios en Excel (.xlsx)"
                className="group flex h-9 items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-3 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 cursor-pointer shadow-2xs"
              >
                <Icon
                  name={isExportingExcel ? "refresh" : "fileSpreadsheet"}
                  className={`size-3.5 transition-transform group-hover:scale-110 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">{isExportingExcel ? 'Generando...' : 'Excel'}</span>
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:border-[var(--border)] dark:bg-slate-900/20 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">
                    <SortableHeader
                      column="nombre"
                      label="Socio"
                      sortBy={sociosSortBy}
                      sortDir={sociosSortDir}
                      onSort={(col, dir) => { setSociosSortBy(col); setSociosSortDir(dir) }}
                    />
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">
                    <div className="grid grid-cols-[minmax(0,1fr)_minmax(150px,230px)] items-center gap-4">
                      <SortableHeader
                        column="asociacionNombre"
                        label="Asociación / Particular"
                        sortBy={sociosSortBy}
                        sortDir={sociosSortDir}
                        onSort={(col, dir) => { setSociosSortBy(col); setSociosSortDir(dir) }}
                      />
                      <span>Sus vehículos ahí</span>
                    </div>
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap text-center">
                    <SortableHeader
                      column="vehiculosTotal"
                      label="Total vehículos"
                      sortBy={sociosSortBy}
                      sortDir={sociosSortDir}
                      align="center"
                      onSort={(col, dir) => { setSociosSortBy(col); setSociosSortDir(dir) }}
                    />
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap text-center">Contacto</th>
                </tr>
              </thead>
              <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] transition-opacity ${isSociosLoading && sociosList.length > 0 ? 'opacity-50' : ''}`}>
                {isSociosLoading && sociosList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-12 text-center">
                      <Icon name="refresh" className="mx-auto size-8 animate-spin text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-500">Cargando socios...</p>
                    </td>
                  </tr>
                ) : sociosList.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="p-12 text-center">
                      <Icon name="idCard" className="mx-auto size-8 text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-500">No se encontraron socios</p>
                    </td>
                  </tr>
                ) : (
                  sociosList.map((socio, idx) => (
                    <tr key={socio.idPersona} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 align-top">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{socio.nombre}</p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{socio.tipoDocumento || 'DNI'}: {socio.documento}</p>
                      </td>
                      <td className="px-4 py-2">
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                          {(socio.vinculos || []).map((v) => (
                            <div key={v.idAsociacion} className="grid grid-cols-[minmax(0,1fr)_minmax(150px,230px)] items-center gap-4 py-2 first:pt-1 last:pb-1">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-xs font-bold leading-snug text-slate-800 dark:text-slate-100" title={v.asociacionNombre}>{v.asociacionNombre}</p>
                                <p className={`mt-0.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${v.tipo === 'PARTICULAR' ? 'text-cyan-600 dark:text-cyan-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                                  <span className={`size-1.5 rounded-full ${v.tipo === 'PARTICULAR' ? 'bg-cyan-500' : 'bg-indigo-500'}`} />
                                  {v.tipo === 'PARTICULAR' ? 'Particular' : 'Asociación'}
                                </p>
                              </div>
                              <div className="flex flex-wrap items-center gap-1">
                                {v.placas.map((placa) => (
                                  <PlacaVehiculo key={placa} placa={placa.trim()} size="sm" />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        <div className="flex flex-col items-center gap-1">
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300" title={`${socio.vehiculosTotal || 0} vehículo(s) en ${socio.asociacionesTotal || 0} organización(es)`}>
                            {socio.vehiculosTotal || 0}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center align-top text-xs font-medium text-slate-600 dark:text-slate-400">
                        {socio.telefono || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="sticky bottom-0 z-20 rounded-b-2xl border-t border-slate-100 bg-white dark:border-[var(--border)] dark:bg-[#1C2438]">
          <Pagination
            currentPage={sociosPage}
            totalItems={sociosTotal}
            itemsPerPage={sociosPerPage}
            onPageChange={setSociosPage}
            onItemsPerPageChange={(size) => {
              setSociosPerPage(size)
              setSociosPage(1)
            }}
            disabled={isSociosLoading}
          />
          </div>
        </div>
      )}



      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="flex max-h-[98dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)]">
            {/* Cabecera del Modal */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="building" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Editar Registro' : 'Registrar Asociación / Particular'}
                </h3>
              </div>
              <BotonCerrarModal onClick={() => setIsModalOpen(false)} title="Cerrar" />
            </div>

            <form onSubmit={handleFormSubmit} autoComplete="off" className="flex min-h-0 flex-1 flex-col">
              <div className={`min-h-0 flex-1 overflow-y-auto ${formData.tipo === 'PARTICULAR' ? 'space-y-2 p-3 sm:p-4' : 'space-y-3 p-4 sm:p-5'}`}>

              <fieldset className={`rounded-xl border border-slate-200 dark:border-[var(--border)] ${formData.tipo === 'PARTICULAR' ? 'p-2.5' : 'p-3.5'}`}>
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Identificación Institucional
                </legend>
                <div className="grid gap-3 sm:grid-cols-4">
                  <FloatingSelect
                    id="org_tipo"
                    label="Tipo de Registro"
                    value={formData.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value
                      setFormData({
                        ...formData,
                        tipo,
                        coordenadas: tipo === 'PARTICULAR' ? '' : formData.coordenadas,
                        tipoAmbiente: tipo === 'ASOCIACION' ? '' : formData.tipoAmbiente,
                        numeroLicencia: tipo === 'ASOCIACION' ? '' : formData.numeroLicencia,
                      })
                    }}
                    options={[
                      { value: 'ASOCIACION', label: 'ASOCIACIÓN' },
                      { value: 'PARTICULAR', label: 'PARTICULAR' }
                    ]}
                  />

                  <div className="flex min-w-0 gap-2 sm:col-span-2">
                    <div className="min-w-0 flex-1">
                      <FloatingInput
                        id="org_ruc"
                        label="RUC"
                        required
                        maxLength={11}
                        value={formData.ruc}
                        disabled={isSearchingRuc}
                        error={fieldErrors.ruc}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!/^\d*$/.test(val)) return;
                          setFormData({ ...formData, ruc: val });
                          setFieldErrors(prev => ({ ...prev, ruc: '' }));
                        }}
                        inputClassName="font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={buscarRuc}
                      disabled={isSearchingRuc}
                      className="shrink-0 self-start h-[42px] rounded-xl text-white px-4 text-xs font-bold cursor-pointer flex items-center justify-center gap-2"
                      style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                    >
                      <Icon name="search" className="size-4" />
                      {isSearchingRuc ? 'Buscando…' : 'Buscar'}
                    </button>
                  </div>

                  <FloatingInput
                    id="org_partida"
                    label="Partida Registral"
                    value={formData.partidaRegistral || ''}
                    onChange={(e) => setFormData({ ...formData, partidaRegistral: e.target.value })}
                    inputClassName="font-mono uppercase"
                  />

                  <div className="sm:col-span-4">
                    <FloatingTextarea
                      id="org_razon"
                      label="Razón Social / Nombre"
                      required
                      value={formData.razonSocial}
                      error={fieldErrors.razonSocial}
                      onChange={(e) => { setFormData({ ...formData, razonSocial: e.target.value }); setFieldErrors(prev => ({ ...prev, razonSocial: '' })) }}
                    />
                  </div>

                  {/* Selector de Representante Legal vinculado a Personas */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Icon name="user" className="size-3.5 text-indigo-500" />
                      <span>Representante Legal (Persona Natural)</span>
                    </label>

                    {formData.idRepresentanteLegal ? (
                      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-4">
                        <FloatingInput
                          id="org_representante_dni"
                          label="DNI"
                          value={formData.representanteDni || ''}
                          readOnly
                          inputClassName="font-mono"
                        />
                        <FloatingInput
                          id="org_representante_nombres"
                          label="Nombres"
                          value={repPersona?.nombres || formData.representanteNombre || ''}
                          readOnly
                          className="sm:col-span-1"
                        />
                        <FloatingInput
                          id="org_representante_apellidos"
                          label="Apellidos"
                          value={repPersona
                            ? `${repPersona.apellidoPaterno || repPersona.apellido_paterno || ''} ${repPersona.apellidoMaterno || repPersona.apellido_materno || ''}`.trim()
                            : ''}
                          readOnly
                        />
                        <button
                          type="button"
                          onClick={clearRepresentante}
                          className="h-[42px] px-2.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                          title="Cambiar o quitar representante"
                        >
                          ✕ Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="relative" ref={repDropdownRef}>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="DNI del representante (8 dígitos)"
                            value={repSearch}
                            onChange={(e) => {
                              setRepSearch(e.target.value.replace(/\D/g, '').slice(0, 8))
                              setShowRepResults(false)
                            }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarRepresentantePorDni() } }}
                            className="h-[42px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[#1C2438] dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={buscarRepresentantePorDni}
                            disabled={isSearchingRep}
                            aria-label="Buscar representante por DNI"
                            title="Buscar por DNI"
                            className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                          >
                            {isSearchingRep
                              ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              : <Icon name="search" className="size-4" />}
                          </button>
                        </div>

                        {showRepResults && (
                          <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-slate-200 bg-white p-3 shadow-xl dark:border-[var(--border-strong)] dark:bg-[#1C2438]">
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              No se encontró ese DNI en Personas.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setShowRepResults(false)
                                abrirRegistroPersona(repSearch)
                              }}
                              className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700"
                            >
                              Registrar persona con DNI {repSearch}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="self-end">
                    <FloatingInput
                      id="org_fecha_creacion"
                      type="date"
                      label="Fecha creación"
                      value={formData.fechaCreacion || ''}
                      onChange={(e) => setFormData({ ...formData, fechaCreacion: e.target.value })}
                    />
                  </div>
                </div>
              </fieldset>


              <fieldset className={`rounded-xl border border-slate-200 dark:border-[var(--border)] ${formData.tipo === 'PARTICULAR' ? 'p-2.5' : 'p-3.5'}`}>
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contacto, ubicación y autorización
                </legend>
                <div className="grid gap-3 sm:grid-cols-4 items-start">
                  <div className="sm:col-span-2">
                    <FloatingTextarea
                      id="org_dir"
                      label="Dirección donde se encuentra ubicado"
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                    />
                  </div>

                  {formData.tipo === 'ASOCIACION' ? (
                    <div className="relative">
                      <FloatingTextarea
                        id="org_coordenadas"
                        label="Coordenadas"
                        value={formData.coordenadas}
                        onChange={(e) => setFormData({ ...formData, coordenadas: e.target.value })}
                        textareaClassName="font-mono pr-9"
                      />
                      <button
                        type="button"
                        onClick={() => setIsMapPickerOpen(true)}
                        title="Ubicar en el mapa"
                        className="absolute right-2.5 top-3 grid size-6 place-items-center rounded-lg text-indigo-500 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/50 cursor-pointer"
                      >
                        <Icon name="mapPin" className="size-4" />
                      </button>
                    </div>
                  ) : (
                    <FloatingInput
                      id="org_tel"
                      label="Teléfono de Contacto"
                      maxLength={9}
                      value={formData.telefono}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^\d*$/.test(val)) return;
                        setFormData({ ...formData, telefono: val });
                      }}
                    />
                  )}





                  {formData.tipo === 'ASOCIACION' ? (
                    <FloatingInput
                      id="org_tel_asoc"
                      label="Teléfono de Contacto"
                      maxLength={9}
                      value={formData.telefono}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^\d*$/.test(val)) return;
                        setFormData({ ...formData, telefono: val });
                      }}
                    />
                  ) : (
                    <div className={formData.tipo === 'ASOCIACION' ? 'sm:col-span-2' : 'sm:col-span-1'}>
                      <FloatingInput
                        id="org_email"
                        type="email"
                        label="Email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    )}

                  <div className={formData.tipo === 'ASOCIACION' ? 'sm:col-span-2' : 'sm:col-span-1'}>
                    <FloatingInput
                      id="org_resolucion_alcaldia"
                      label="Resolución de alcaldía"
                      value={formData.resolucionAlcaldia}
                      onChange={(e) => setFormData({ ...formData, resolucionAlcaldia: e.target.value.toUpperCase() })}
                      inputClassName="font-mono"
                    />
                  </div>
                  {formData.tipo === 'ASOCIACION' && (
                    <div className={formData.tipo === 'ASOCIACION' ? 'sm:col-span-2' : 'sm:col-span-1'}>
                      <FloatingInput
                        id="org_email"
                        type="email"
                        label="Email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                    )}

                  {formData.tipo === 'PARTICULAR' && (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-1.5 transition-all hover:border-slate-300 dark:border-[var(--border-strong)] dark:bg-slate-800/80 sm:col-span-2">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Tipo ambiente
                        </p>
                        <div className="flex flex-wrap gap-x-5 gap-y-1">
                          {[
                            ['PUESTO DE MERCADO', 'Puesto de mercado'],
                            ['LOCAL COMERCIAL', 'Local comercial'],
                          ].map(([value, label]) => (
                            <label key={value} className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                              <input
                                type="radio"
                                name="org_tipo_ambiente"
                                value={value}
                                checked={formData.tipoAmbiente === value}
                                onChange={(e) => setFormData({ ...formData, tipoAmbiente: e.target.value })}
                                className="size-4 accent-indigo-600"
                              />
                              {label}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="sm:col-span-1">
                        <FloatingInput
                          id="org_numero_licencia"
                          label="Número licencia"
                          value={formData.numeroLicencia}
                          onChange={(e) => setFormData({ ...formData, numeroLicencia: e.target.value })}
                        />
                      </div>
                    </>
                  )}

                </div>
              </fieldset>

              {isEditing && (
                <fieldset className="rounded-xl border border-slate-200 p-2.5 dark:border-[var(--border)]">
                  <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Control y Estado
                  </legend>
                  <FloatingSelect
                    id="org_estado"
                    label="Estado de la Organización"
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    options={[
                      { value: 'ACTIVO', label: 'ACTIVO' },
                      { value: 'SUSPENDIDO', label: 'SUSPENDIDO' },
                      { value: 'BAJA', label: 'DADO DE BAJA' }
                    ]}
                  />
                </fieldset>
              )}
              </div>
              <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 px-4 py-3 sm:px-5 dark:border-[var(--border)]">
                <BotonCancelar onClick={() => setIsModalOpen(false)} />
                <BotonGuardar>
                  {isEditing ? 'Guardar Cambios' : `Registrar ${formData.tipo === 'PARTICULAR' ? 'Particular' : 'Asociación'}`}
                </BotonGuardar>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalRegistroPersona}

      <MapaCoordenadasPicker
        isOpen={isMapPickerOpen}
        onClose={() => setIsMapPickerOpen(false)}
        onConfirm={(coords) => {
          setFormData({ ...formData, coordenadas: coords })
          setIsMapPickerOpen(false)
        }}
        initialValue={formData.coordenadas}
        direccionSugerida={formData.direccion}
      />

      {isDetailModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200 dark:border-[var(--border)]">
            {/* Header estilo /personas */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="building" className="size-4" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                      {detailOrg.razonSocial}
                    </h3>
                    {detailOrg.tipo === 'ASOCIACION' ? (
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 font-mono text-[10px] font-black text-amber-900 border border-amber-300/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60">
                        ASOCIACIÓN
                      </span>
                    ) : (
                      <span className="rounded-md bg-cyan-100 px-2 py-0.5 font-mono text-[10px] font-black text-cyan-900 border border-cyan-300/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60">
                        PARTICULAR
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    RUC: {detailOrg.ruc || 'Sin RUC'} • Registro Autorizado MDJLO
                  </p>
                </div>
              </div>

              <BotonCerrarModal onClick={() => setIsDetailModalOpen(false)} title="Cerrar ficha" />
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-xs">
              <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2.5 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                    <span className="font-bold text-slate-400">Representante Legal</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-right">
                      {detailOrg.representanteNombre || '—'}
                    </span>
                  </div>
                  {detailOrg.representanteDni && (
                    <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                      <span className="font-bold text-slate-400">DNI Representante</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {detailOrg.representanteDni}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                    <span className="font-bold text-slate-400">Partida Registral</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{detailOrg.partidaRegistral || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                    <span className="font-bold text-slate-400">Fecha creación</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{detailOrg.fechaCreacion || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                    <span className="font-bold text-slate-400">Flota Registrada</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{detailOrg.flotaTotal} Vehículos</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                    <span className="font-bold text-slate-400">Teléfono de contacto</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{detailOrg.telefono || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                    <span className="font-bold text-slate-400">Resolución de alcaldía</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{detailOrg.resolucionAlcaldia || '—'}</span>
                  </div>
                  {detailOrg.tipo === 'PARTICULAR' && (
                    <>
                      <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                        <span className="font-bold text-slate-400">Tipo ambiente</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{detailOrg.tipoAmbiente || '—'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                        <span className="font-bold text-slate-400">Número licencia</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{detailOrg.numeroLicencia || '—'}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-[var(--border)]">
                    <span className="font-bold text-slate-400">Coordenadas</span>
                    <button
                      type="button"
                      onClick={() => openMap(detailOrg.coordenadas, detailOrg.razonSocial)}
                      disabled={!detailOrg.coordenadas}
                      className="font-bold text-indigo-600 disabled:text-slate-400 dark:text-indigo-400"
                    >
                      {detailOrg.coordenadas || '—'}
                    </button>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-400">Dirección</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 truncate max-w-xs">{detailOrg.direccion || '—'}</span>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-[var(--border)] dark:bg-[#1C2438]">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-[var(--border)] dark:bg-slate-950">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Ubicación</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{detailOrg.coordenadas || 'Sin coordenadas'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openMap(detailOrg.coordenadas, detailOrg.razonSocial, detailOrg.direccion, detailOrg.tipo)}
                      disabled={!detailOrg.coordenadas}
                      className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 dark:bg-indigo-950/50 dark:text-indigo-300 dark:disabled:bg-slate-900 cursor-pointer"
                    >
                      Ampliar
                    </button>
                  </div>
                  {detailOrg.coordenadas ? (
                    <MapaInline
                      coordenadas={detailOrg.coordenadas}
                      title={detailOrg.razonSocial}
                      className="h-72 w-full rounded-b-xl"
                    />
                  ) : (
                    <div className="grid h-72 place-items-center px-6 text-center text-sm font-semibold text-slate-400">
                      Esta asociación todavía no tiene coordenadas registradas.
                    </div>
                  )}
                </div>
              </div>

              <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-[var(--border)] dark:bg-[#1C2438]/95">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-[var(--bg-subtle)] dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cerrar Detalle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MapaTodasUbicacionesModal
        isOpen={mapaGeneral.abierto}
        onClose={() => setMapaGeneral({ abierto: false, cargando: false, items: [] })}
        items={mapaGeneral.items}
        cargando={mapaGeneral.cargando}
        titulo="Ubicaciones de asociaciones y particulares"
      />

      <MapaPreviewModal
        isOpen={Boolean(mapPreview)}
        onClose={() => setMapPreview(null)}
        coordenadas={mapPreview?.coordenadas}
        title={mapPreview?.title}
        direccion={mapPreview?.direccion}
        tipo={mapPreview?.tipo}
      />

    </div>
  )
}


