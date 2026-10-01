import { useEffect, useState, useRef, useMemo } from 'react'
import { showToast, showConfirm, showError, showSuccess } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination }
from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PlacaBadge } from '../components/ui/PlacaBadge'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData } from '../config/api'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { formatNumeroTarjeta } from '../utils/formatters'

import { FloatingInput, FloatingSelect, FloatingTextarea, RoundedSelect } from '../components/ui/FormInputs'
import { MapaCoordenadasPicker } from '../components/ui/MapaCoordenadasPicker'
import { MapaInline, MapaPreviewModal } from '../components/ui/MapaVisualizador'

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

const normalizeSocio = (s) => {
  const cleanPlacas = `${s.placas || ''} ${String(s.placas || '').replace(/[^a-zA-Z0-9]/g, '')}`
  return {
    ...s,
    _search: `${s.nombre || ''} ${s.documento || ''} ${cleanPlacas} ${s.asociacionNombre || ''} ${s.telefono || ''} ${s.email || ''}`.toLowerCase(),
  }
}

const normalizeOrg = (o) => ({
  ...o,
  _search: `${o.razonSocial || ''} ${o.ruc || ''} ${o.partidaRegistral || ''} ${o.direccion || ''} ${o.numeroLicencia || ''} ${o.resolucionAlcaldia || ''} ${o.representanteNombre || ''} ${o.representanteDni || ''}`.toLowerCase(),
})

export function Asociaciones() {
  const cached = getCachedData('/asociaciones')
  const cachedSocios = getCachedData('/asociaciones/socios')
  const [asociaciones, setAsociaciones] = useState(() => (Array.isArray(cached) ? cached.map(normalizeOrg) : []))
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)

  const [activeTab, setActiveTab] = useState('REGISTRO')
  const [sociosList, setSociosList] = useState(() => (Array.isArray(cachedSocios) ? cachedSocios.map(normalizeSocio) : []))
  const [sociosPage, setSociosPage] = useState(1)
  const [sociosPerPage, setSociosPerPage] = useState(5)
  const [sociosSortBy, setSociosSortBy] = useState('nombre')
  const [sociosSortDir, setSociosSortDir] = useState('ASC')
  const [sociosSearch, setSociosSearch] = useState('')
  const [socioOrgFilter, setSocioOrgFilter] = useState('TODOS')
  const [isSociosLoading, setIsSociosLoading] = useState(!cachedSocios)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [mapPreview, setMapPreview] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [repSearch, setRepSearch] = useState('')
  const [showRepResults, setShowRepResults] = useState(false)
  const [repResults, setRepResults] = useState([])
  const [isSearchingRep, setIsSearchingRep] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const repDropdownRef = useRef(null)

  // Reset de página inmediato al cambiar filtros o términos de búsqueda
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipo, filterEstado])

  useEffect(() => {
    setSociosPage(1)
  }, [sociosSearch, socioOrgFilter])

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

  useEffect(() => {
    setLoadError('')
    
    setIsSociosLoading(true)
    apiFetch('/asociaciones/socios')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((payload) => {
        const raw = payload.data || []
        const normalized = raw.map(normalizeSocio)
        setSociosList(normalized)
        setCachedData('/asociaciones/socios', normalized)
      })
      .catch(() => setSociosList([]))
      .finally(() => setIsSociosLoading(false))

    apiFetch('/asociaciones')
      .then((response) => response.ok ? response.json() : Promise.reject(response))
      .then((payload) => {
        const raw = payload.data ?? []
        const normalized = raw.map(normalizeOrg)
        setAsociaciones(normalized)
        setCachedData('/asociaciones', normalized)
      })
      .catch(() => setLoadError('No se pudo cargar el padrón de asociaciones.'))
      .finally(() => setIsLoading(false))

  }, [])

  // Búsqueda dinámica y debounced de representantes (evita descargar 30,000 personas en memoria)
  useEffect(() => {
    const rawQuery = (repSearch || '').trim()
    if (!rawQuery || rawQuery.length < 2) {
      return
    }
    const timer = setTimeout(() => {
      setIsSearchingRep(true)
      apiFetch(`/personas?buscar=${encodeURIComponent(rawQuery)}&porPagina=10`)
        .then((response) => response.ok ? response.json() : { data: [] })
        .then((payload) => setRepResults(payload.data || []))
        .catch(() => {})
        .finally(() => setIsSearchingRep(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [repSearch])

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
    setRepSearch('')
    setShowRepResults(false)
  }

  const totalOrgs = asociaciones.length
  const particulares = asociaciones.filter((o) => o.tipo === 'PARTICULAR').length
  const asociacionesCount = asociaciones.filter((o) => o.tipo === 'ASOCIACION').length
  const flotaAcumulada = asociaciones.reduce((sum, o) => sum + Number(o.flotaTotal || 0), 0)

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const listToExport = filteredOrgs.length > 0 ? filteredOrgs : asociaciones
          exportToExcel({
            filename: `Padron_Asociaciones_${new Date().getFullYear()}.xls`,
            sheetName: 'Asociaciones',
            title: 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
            subtitle: 'Subgerencia de Tránsito y Transporte · Padrón Oficial de Asociaciones y Empresas',
            metadata: [
              { label: 'Filtro Tipo', value: filterTipo },
              { label: 'Filtro Estado', value: filterEstado },
              { label: 'Flota Total Registrada', value: `${flotaAcumulada} unidades` },
            ],
            columns: [
              { header: 'N°', align: 'center', width: 45, render: (_, __, i) => i + 1 },
              { header: 'Tipo', key: 'tipo', width: 110, align: 'center' },
              { header: 'Razón Social / Organización', key: 'razonSocial', width: 260 },
              { header: 'RUC', key: 'ruc', width: 120, align: 'center', isText: true },
              { header: 'Partida Registral', key: 'partidaRegistral', width: 130, align: 'center', isText: true },
              { header: 'Resolución Alcaldía', key: 'resolucionAlcaldia', width: 160, align: 'center' },
              { header: 'Flota Registrada', key: 'flotaTotal', width: 110, align: 'center' },
              { header: 'Teléfono', key: 'telefono', width: 110, align: 'center', isText: true },
              { header: 'Correo Electrónico', key: 'email', width: 180 },
              { header: 'Dirección', key: 'direccion', width: 220 },
              { header: 'Estado', key: 'estado', width: 90, align: 'center' },
            ],
            data: listToExport,
          })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const listToExport = filteredOrgs.length > 0 ? filteredOrgs : asociaciones
          await exportToPdf({
            filename: `Padron_Asociaciones_${new Date().getFullYear()}`,
            subtitle: 'Subgerencia de Tránsito y Transporte · Padrón Oficial de Asociaciones y Empresas',
            summaryItems: [
              { label: 'Total registros', value: totalOrgs },
              { label: 'Exportando', value: `${listToExport.length} registros` },
              { label: 'Asociaciones', value: asociacionesCount },
              { label: 'Particulares', value: particulares },
              { label: 'Flota registrada', value: `${flotaAcumulada} vehículos` },
            ],
            columns: [
              { header: 'RAZÓN SOCIAL', key: 'razonSocial', width: 220 },
              { header: 'RUC', key: 'ruc', width: 100, align: 'center' },
              { header: 'REPRESENTANTE', key: 'representanteNombre', width: 180 },
              { header: 'DNI REP.', key: 'representanteDni', width: 90, align: 'center' },
              { header: 'TIPO', key: 'tipo', width: 110, align: 'center' },
              { header: 'FLOTA', key: 'flotaTotal', width: 60, align: 'center' },
              { header: 'EXPEDIENTE', key: 'expediente', width: 110, align: 'center' },
              { header: 'ESTADO', key: 'estado', width: 90, align: 'center' },
            ],
            data: listToExport
          })
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleExportSociosExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const listToExport = filteredSocios.length > 0 ? filteredSocios : sociosList
      exportToExcel({
        filename: `Padron_Socios_${new Date().getFullYear()}.xls`,
        sheetName: 'Socios',
        title: 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
        subtitle: 'Subgerencia de Tránsito y Transporte · Padrón Oficial de Socios',
        metadata: [
          { label: 'Filtro Asociación', value: socioOrgFilter },
          { label: 'Total Registros', value: `${listToExport.length} socios` },
        ],
        columns: [
          { header: 'N°', align: 'center', width: 45, render: (_, __, i) => i + 1 },
          { header: 'Socio / Propietario', key: 'nombre', width: 260 },
          { header: 'Documento', key: 'documento', width: 120, align: 'center', isText: true },
          { header: 'Asociación / Empresa', key: 'asociacionNombre', width: 260 },
          { header: 'Vehículos', key: 'vehiculosTotal', width: 90, align: 'center' },
          { header: 'Placas', key: 'placas', width: 200 },
          { header: 'Teléfono', key: 'telefono', width: 120, align: 'center', isText: true },
        ],
        data: listToExport,
      })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const filteredOrgs = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return asociaciones.filter((o) => {
      const matchesSearch = !term || (o._search ? o._search.includes(term) : `${o.razonSocial || ''} ${o.ruc || ''}`.toLowerCase().includes(term))
      const matchesTipo = filterTipo === 'TODOS' || o.tipo === filterTipo
      const matchesEstado = filterEstado === 'TODOS' || o.estado === filterEstado

      return matchesSearch && matchesTipo && matchesEstado
    })
  }, [asociaciones, searchTerm, filterTipo, filterEstado])

  const paginatedOrgs = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredOrgs.slice(start, start + itemsPerPage)
  }, [filteredOrgs, currentPage, itemsPerPage])

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

  // Opciones de organizaciones para el filtro en pestaña Socios (memoizado para no regenerar en cada render)
  const uniqueOrgOptions = useMemo(() => {
    const set = new Set()
    for (let i = 0; i < sociosList.length; i++) {
      if (sociosList[i].asociacionNombre) {
        set.add(sociosList[i].asociacionNombre)
      }
    }
    const orgs = Array.from(set).sort()
    return [
      { value: 'TODOS', label: 'Todas las Asociaciones' },
      ...orgs.map(org => ({ value: org, label: org }))
    ]
  }, [sociosList])

  const esCollator = useMemo(() => new Intl.Collator('es', { sensitivity: 'base', numeric: true }), [])

  // --- LOGICA DE SOCIOS (Ultra optimizada con useMemo y búsqueda directa sub-milisegundo) ---
  const filteredSocios = useMemo(() => {
    const term = sociosSearch.trim().toLowerCase()
    const hasOrgFilter = socioOrgFilter !== 'TODOS'

    const result = sociosList.filter(s => {
      const matchesSearch = !term || (s._search ? s._search.includes(term) : `${s.nombre || ''} ${s.documento || ''} ${s.placas || ''} ${s.asociacionNombre || ''}`.toLowerCase().includes(term))
      const matchesOrg = !hasOrgFilter || s.asociacionNombre === socioOrgFilter
      return matchesSearch && matchesOrg
    })

    if (sociosSortBy && sociosSortDir) {
      const dirMul = sociosSortDir === 'ASC' ? 1 : -1
      if (sociosSortBy === 'vehiculosTotal') {
        result.sort((a, b) => ((Number(a.vehiculosTotal) || 0) - (Number(b.vehiculosTotal) || 0)) * dirMul)
      } else {
        result.sort((a, b) => {
          const valA = String(a[sociosSortBy] || '')
          const valB = String(b[sociosSortBy] || '')
          return esCollator.compare(valA, valB) * dirMul
        })
      }
    }

    return result
  }, [sociosList, sociosSearch, socioOrgFilter, sociosSortBy, sociosSortDir, esCollator])

  const paginatedSocios = useMemo(() => {
    const start = (sociosPage - 1) * sociosPerPage
    return filteredSocios.slice(start, start + sociosPerPage)
  }, [filteredSocios, sociosPage, sociosPerPage])

  const handleOpenCreateModal = () => {
    setFormData(emptyForm)
    setRepSearch('')
    setShowRepResults(false)
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (org) => {
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
        await apiFetch(`/asociaciones/${id}`, { method: 'DELETE' })
        const nextList = asociaciones.filter((o) => o.id !== id)
        setAsociaciones(nextList)
        setCachedData('/asociaciones', nextList)
        showToast('Asociación eliminada correctamente', 'eliminar')
      } catch (err) {
        showError('Error', 'No se pudo eliminar la asociación.')
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
      const buildSearchStr = (o) => `${o.razonSocial || ''} ${o.ruc || ''} ${o.partidaRegistral || ''} ${o.direccion || ''} ${o.numeroLicencia || ''} ${o.resolucionAlcaldia || ''} ${o.representanteNombre || ''} ${o.representanteDni || ''}`.toLowerCase()
      if (isEditing) {
        const res = await apiFetch(`/asociaciones/${selectedOrg.id}`, {
          method: 'PUT',
          body: formData,
        })
        const updated = {
          ...selectedOrg,
          ...formData,
          id: selectedOrg.id,
          _search: buildSearchStr({ ...selectedOrg, ...formData }),
        }
        const nextList = asociaciones.map((o) => (o.id === selectedOrg.id ? updated : o))
        setAsociaciones(nextList)
        setCachedData('/asociaciones', nextList)
        showToast('Asociación actualizada correctamente', 'editar')
      } else {
        const res = await apiFetch('/asociaciones', {
          method: 'POST',
          body: formData,
        })
        const resData = await res.json()
        if (!res.ok) throw new Error(resData.messages?.error || 'Error al crear')
        
        const rawNew = resData.data || {
          ...formData,
          id: Date.now(),
        }
        const newOrg = {
          ...rawNew,
          _search: buildSearchStr(rawNew),
        }
        const nextList = [newOrg, ...asociaciones]
        setAsociaciones(nextList)
        setCachedData('/asociaciones', nextList)
        setCurrentPage(1)
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
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Directorio de asociaciones, particulares, ubicación, documentos y control de flotas.
            </p>
          </div>
        </div>
      </div>


      {/* Tarjetas KPI con Bordes de Colores */}
      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">

        {/* 1. Total registros */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total registros</span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="building" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(totalOrgs)}</p>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded-md">Padrón 2026</span>
          </div>
        </div>

        {/* 2. Asociaciones */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Asociaciones</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Icon name="vehicle" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(asociacionesCount)}</p>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md">Trimóviles</span>
          </div>
        </div>

        {/* 3. Particulares */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Particulares</span>
            <span className="grid size-6 place-items-center rounded-md bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Icon name="building" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(particulares)}</p>
            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-1.5 py-0.5 rounded-md">Independientes</span>
          </div>
        </div>

        {/* 4. Flota Registrada */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Flota Registrada</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">✓</span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(flotaAcumulada)}
            </p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-md">
              Vehículos
            </span>
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
<div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon
              name="search"
              className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              placeholder="Buscar por nombre, RUC, partida, dirección o licencia..."
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
              <span>Nuevo registro</span>
            </button>
          </div>
        </div>




        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[var(--border)]">
              <tr>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[220px]">Asociación / Particular</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[125px]">RUC</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[170px]">Representante Legal</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[150px]">Contacto</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[200px]">Ubicación</th>
                <th className="px-4 py-2.5 whitespace-nowrap min-w-[140px] text-center">Estado</th>
                <th className="sticky right-0 z-10 bg-slate-50 dark:bg-[var(--bg-subtle)] border-l border-slate-200 dark:border-[var(--border)] px-4 py-2.5 whitespace-nowrap min-w-[130px] text-center shadow-[-4px_0_8px_rgba(0,0,0,0.04)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
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
                    <td className="sticky right-0 bg-white dark:bg-[var(--bg-surface)] border-l border-slate-200 dark:border-[var(--border)] px-4 py-3 text-center min-w-[130px]">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="size-7 rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="size-7 rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center align-middle">
                    <div className="flex flex-col items-center justify-center">
                      <Icon name="building" className="size-10 mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron asociaciones</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrgs.map((o) => (
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
                    <td className="sticky right-0 z-10 bg-white dark:bg-[var(--bg-surface)] border-l border-slate-200 dark:border-[var(--border)] px-4 py-3 align-middle text-center whitespace-nowrap shadow-[-4px_0_8px_rgba(0,0,0,0.04)] transition-colors group-hover:bg-cyan-50/30 dark:group-hover:bg-slate-800/40 min-w-[130px]">
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
                        <button
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
          totalItems={filteredOrgs.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
        />
      </div>
      </>
      )}


      {activeTab === 'SOCIOS' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] overflow-hidden">
          <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1 sm:max-w-xs">
                <Icon
                  name="search"
                  className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  placeholder="Buscar socio por nombre, doc o placa..."
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
                value={socioOrgFilter}
                onChange={setSocioOrgFilter}
                options={uniqueOrgOptions}
              />
              {(socioOrgFilter !== 'TODOS' || sociosSearch !== '') && (
                <button
                  type="button"
                  onClick={() => {
                    setSocioOrgFilter('TODOS')
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
                title="Descargar padrón de socios en Excel (.xls)"
                className="group flex h-9 items-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-bold text-emerald-700 transition-all hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 cursor-pointer shadow-2xs"
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
                      label="Socio Vinculado"
                      sortBy={sociosSortBy}
                      sortDir={sociosSortDir}
                      onSort={(col, dir) => { setSociosSortBy(col); setSociosSortDir(dir) }}
                    />
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap">
                    <SortableHeader
                      column="asociacionNombre"
                      label="Asociación / Particular"
                      sortBy={sociosSortBy}
                      sortDir={sociosSortDir}
                      onSort={(col, dir) => { setSociosSortBy(col); setSociosSortDir(dir) }}
                    />
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap text-center">
                    <SortableHeader
                      column="vehiculosTotal"
                      label="Vehículos"
                      sortBy={sociosSortBy}
                      sortDir={sociosSortDir}
                      align="center"
                      onSort={(col, dir) => { setSociosSortBy(col); setSociosSortDir(dir) }}
                    />
                  </th>
                  <th className="px-4 py-3 whitespace-nowrap text-center">Placas</th>
                  <th className="px-4 py-3 whitespace-nowrap text-center">Contacto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                {isSociosLoading ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center">
                      <Icon name="refresh" className="mx-auto size-8 animate-spin text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-500">Cargando socios...</p>
                    </td>
                  </tr>
                ) : paginatedSocios.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-12 text-center">
                      <Icon name="idCard" className="mx-auto size-8 text-slate-300" />
                      <p className="mt-2 text-sm font-semibold text-slate-500">No se encontraron socios</p>
                    </td>
                  </tr>
                ) : (
                  paginatedSocios.map((socio, idx) => (
                    <tr key={`${socio.idPersona}-${socio.idAsociacion || '0'}-${idx}`} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{socio.nombre}</p>
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{socio.tipoDocumento || 'DNI'}: {socio.documento}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-black text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                          <Icon name="building" className="size-3" />
                          {socio.asociacionNombre}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {socio.vehiculosTotal || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-wrap items-center justify-center gap-1">
                          {(socio.placas ? socio.placas.split(',') : []).map((placa, i) => (
                            <PlacaBadge key={i} placa={placa.trim()} size="sm" />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-xs font-medium text-slate-600 dark:text-slate-400">
                        {socio.telefono || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={sociosPage}
            totalItems={filteredSocios.length}
            itemsPerPage={sociosPerPage}
            onPageChange={setSociosPage}
            onItemsPerPageChange={(size) => {
              setSociosPerPage(size)
              setSociosPage(1)
            }}
          />
        </div>
      )}



      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200/80 dark:border-[var(--border)]">
            {/* Cabecera del Modal */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="building" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditing ? 'Editar Registro' : 'Registrar Asociación / Particular'}
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

            <form onSubmit={handleFormSubmit} autoComplete="off" className="flex min-h-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 sm:p-5">

              <fieldset className="rounded-xl border border-slate-200 p-3.5 dark:border-[var(--border)]">
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Identificación Institucional
                </legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <FloatingSelect
                    id="org_tipo"
                    label="Tipo de Registro"
                    value={formData.tipo}
                    onChange={(e) => {
                      const tipo = e.target.value
                      setFormData({
                        ...formData,
                        tipo,
                        fechaCreacion: tipo === 'PARTICULAR' ? '' : formData.fechaCreacion,
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

                  <div className="sm:col-span-2">
                    <FloatingTextarea
                      id="org_razon"
                      label="Razón Social / Nombre"
                      required
                      value={formData.razonSocial}
                      onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-2 sm:col-span-3">
                    <div className="flex-1">
                      <FloatingInput
                        id="org_ruc"
                        label="RUC"
                        required
                        maxLength={11}
                        value={formData.ruc}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!/^\d*$/.test(val)) return;
                          setFormData({ ...formData, ruc: val });
                        }}
                        inputClassName="font-mono"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => showToast('Búsqueda por RUC pendiente de conectar', 'info')}
                      className="shrink-0 self-end h-[42px] rounded-xl text-white px-4 text-xs font-bold cursor-pointer flex items-center justify-center gap-2"
                      style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                    >
                      <Icon name="search" className="size-4" />
                      Buscar
                    </button>
                  </div>

                  {/* Selector de Representante Legal vinculado a Personas */}
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Icon name="user" className="size-3.5 text-indigo-500" />
                      <span>Representante Legal (Persona Natural)</span>
                    </label>

                    {formData.idRepresentanteLegal ? (
                      <div className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-indigo-200/80 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/30">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="size-9 rounded-xl bg-indigo-600 text-white grid place-items-center font-bold text-xs shrink-0 shadow-xs">
                            <Icon name="idCard" className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                              {formData.representanteNombre || 'Nombre no disponible'}
                            </p>
                            <p className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400">
                              DNI: {formData.representanteDni || '—'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearRepresentante}
                          className="px-2.5 py-1 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Cambiar o quitar representante"
                        >
                          ✕ Quitar
                        </button>
                      </div>
                    ) : (
                      <div className="relative" ref={repDropdownRef}>
                        <div className="relative">
                          <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            placeholder="Buscar representante por DNI o Nombres y Apellidos..."
                            value={repSearch}
                            onFocus={() => {
                              setShowRepResults(true)
                              if (repResults.length === 0 && !repSearch) {
                                apiFetch('/personas?porPagina=10')
                                  .then((res) => (res.ok ? res.json() : { data: [] }))
                                  .then((payload) => setRepResults(payload.data || []))
                                  .catch(() => {})
                              }
                            }}
                            onChange={(e) => {
                              setRepSearch(e.target.value)
                              setShowRepResults(true)
                            }}
                            className="w-full h-[42px] pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)] dark:text-white"
                          />
                        </div>

                        {showRepResults && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-[var(--border-strong)] dark:bg-[var(--bg-surface)]">
                            <div className="flex items-center justify-between px-2.5 py-1 border-b border-slate-100 dark:border-[var(--border)] text-[10px] font-bold text-slate-400 uppercase">
                              <span>Padrón de Ciudadanos ({repResults.length})</span>
                              <button
                                type="button"
                                onClick={() => setShowRepResults(false)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                ✕ Cerrar
                              </button>
                            </div>
                            {isSearchingRep && (
                              <div className="p-3 text-center text-xs text-slate-400 font-medium animate-pulse">
                                Buscando en padrón de ciudadanos...
                              </div>
                            )}
                            {!isSearchingRep && repResults.length === 0 ? (
                              <div className="p-3 text-center text-xs text-slate-400 font-medium">
                                No se encontraron personas con ese DNI o nombre.
                              </div>
                            ) : (
                              repResults.map((p) => {
                                const dni = p.numeroDocumento || p.numero || ''
                                const nombre = getPersonaNombre(p)
                                return (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => selectRepresentante(p)}
                                    className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/40 flex items-center justify-between gap-3 transition-colors cursor-pointer group"
                                  >
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                                        {nombre}
                                      </p>
                                      <p className="font-mono text-[11px] text-slate-400">
                                        DNI: {dni}
                                      </p>
                                    </div>
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                      Seleccionar →
                                    </span>
                                  </button>
                                )
                              })
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <FloatingInput
                    id="org_partida"
                    label="Partida Registral"
                    value={formData.partidaRegistral || ''}
                    onChange={(e) => setFormData({ ...formData, partidaRegistral: e.target.value })}
                    inputClassName="font-mono uppercase"
                  />

                  {formData.tipo === 'ASOCIACION' && (
                    <FloatingInput
                      id="org_fecha_creacion"
                      type="date"
                      label="Fecha creación"
                      value={formData.fechaCreacion || ''}
                      onChange={(e) => setFormData({ ...formData, fechaCreacion: e.target.value })}
                    />
                  )}
                </div>
              </fieldset>


              <fieldset className="rounded-xl border border-slate-200 p-3.5 dark:border-[var(--border)]">
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Contacto, ubicación y autorización
                </legend>
                <div className="grid gap-3 sm:grid-cols-3 items-start">
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

                  <div className="sm:col-span-2">
                    <FloatingInput
                      id="org_resolucion_alcaldia"
                      label="Resolución de alcaldía"
                      value={formData.resolucionAlcaldia}
                      onChange={(e) => setFormData({ ...formData, resolucionAlcaldia: e.target.value.toUpperCase() })}
                      inputClassName="font-mono"
                    />
                  </div>



                  {formData.tipo === 'ASOCIACION' && (
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
                  )}

                  <div className={formData.tipo === 'ASOCIACION' ? 'sm:col-span-3' : 'sm:col-span-1'}>
                    <FloatingInput
                      id="org_email"
                      type="email"
                      label="Email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>

                  {formData.tipo === 'PARTICULAR' && (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 transition-all hover:border-slate-300 dark:border-[var(--border-strong)] dark:bg-slate-800/80">
                        <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Tipo ambiente
                        </p>
                        <div className="space-y-1.5">
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

                      <div className="sm:col-span-2">
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
                <fieldset className="rounded-xl border border-slate-200 p-3.5 dark:border-[var(--border)]">
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
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl px-5 py-2 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: 'oklch(71.2% 0.194 13.428)' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl px-6 py-2 text-xs font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                >
                  {isEditing ? 'Guardar Cambios' : `Registrar ${formData.tipo === 'PARTICULAR' ? 'Particular' : 'Asociación'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[var(--bg-surface)] border border-slate-200 dark:border-[var(--border)]">
            {/* Header estilo /personas */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
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

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                title="Cerrar ficha"
                className="group grid size-8 shrink-0 place-items-center rounded-xl border border-slate-200/80 bg-slate-100/70 text-slate-400 hover:bg-[oklch(71.2%_0.194_13.428)] hover:border-[oklch(71.2%_0.194_13.428)] hover:text-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 transition-all duration-200 active:scale-95 cursor-pointer"
              >
                <Icon name="close" className="size-4 transition-transform duration-200 group-hover:rotate-90" />
              </button>
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

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
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

              <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-[var(--border)] dark:bg-[var(--bg-surface)]/95">
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


