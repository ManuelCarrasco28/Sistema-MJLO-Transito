import { useEffect, useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { showToast, showConfirm, showError, showSuccess } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { StatusBadge } from '../components/ui/StatusBadge'
import { apiFetch, getCachedData, setCachedData, invalidateCache, leerMensajeError } from '../config/api'
import { FloatingInput, FloatingSelect, RoundedSelect } from '../components/ui/FormInputs'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { formatFecha, formatNumeroTarjeta, toTitleCase } from '../utils/formatters'
import { exportPersonasExcel, exportPersonasPdf } from '../utils/exportPersonas'
import { PersonaFormModal } from '../components/personas/PersonaFormModal'
import { PersonaDetalleModal } from '../components/personas/PersonaDetalleModal'
import { SortableHeader } from '../components/ui/SortableHeader'
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

const ESTADO_OPTIONS = [
  { value: 'ACTIVO', label: 'ACTIVO' },
  { value: 'INACTIVO', label: 'INACTIVO' },
]

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'Activos' },
  { value: 'INACTIVO', label: 'Inactivos' },
]

const ESTADO_CIVIL_OPTIONS = [
  { value: '', label: 'Seleccionar...' },
  { value: 'SOLTERO', label: 'SOLTERO' },
  { value: 'CASADO', label: 'CASADO' },
  { value: 'DIVORCIADO', label: 'DIVORCIADO' },
  { value: 'VIUDO', label: 'VIUDO' },
]

export function Personas({ user, onUserUpdate }) {
  const [personas, setPersonas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [totalFiltrado, setTotalFiltrado] = useState(0)
  const [stats, setStats] = useState({ total: 0, conLicencia: 0, sinLicencia: 0, activos: 0, inactivos: 0 })
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  // Espera a que el usuario termine de teclear (160ms) para respuesta ultra rápida
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm)
      setCurrentPage(1)
    }, 160)
    return () => clearTimeout(timeout)
  }, [searchTerm])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedPersona, setSelectedPersona] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSearchingReniec, setIsSearchingReniec] = useState(false)
  const [isFetchingFotoReniec, setIsFetchingFotoReniec] = useState(false)
  const [loadError, setLoadError] = useState('')

  const cachedTipos = getCachedData('/tipo-documentos')
  const [tipoDocOptions, setTipoDocOptions] = useState(() => {
    if (cachedTipos && Array.isArray(cachedTipos) && cachedTipos.length > 0) {
      return cachedTipos.map((t) => ({
        value: t.codigo || t.nombre,
        label: formatTipoDocLabel(t),
      }))
    }
    return []
  })

  const [formData, setFormData] = useState({
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
  })

  // Trae solo la página actual desde el backend (antes se cargaba el padrón
  // completo a memoria y se filtraba/paginaba en el navegador; con 30,000+
  // personas eso era el cuello de botella real del módulo).
  const loadPersonas = async () => {
    const params = new URLSearchParams({
      page: String(currentPage),
      porPagina: String(itemsPerPage),
    })
    if (debouncedSearchTerm) params.set('buscar', debouncedSearchTerm)
    if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
    if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }

    const response = await apiFetch(`/personas?${params.toString()}`)
    if (!response.ok) throw response
    const payload = await response.json()
    setPersonas(payload.data ?? [])
    setTotalFiltrado(payload.meta?.total ?? 0)
    return payload.data
  }

  const loadStats = () => {
    apiFetch('/personas/estadisticas')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => { if (payload?.data) setStats(payload.data) })
      .catch(() => {})
  }

  useEffect(() => {
    setIsLoading(true)
    setLoadError('')
    loadPersonas()
      .catch(() => setLoadError('No se pudo cargar el padrón de personas.'))
      .finally(() => setIsLoading(false))
  }, [currentPage, itemsPerPage, debouncedSearchTerm, filterEstado, sortBy, sortDir])

  useEffect(() => {
    loadStats()

    apiFetch('/tipo-documentos')
      .then((res) => (res.ok ? res.json() : null))
      .then((payload) => {
        if (payload?.data && Array.isArray(payload.data) && payload.data.length > 0) {
          setCachedData('/tipo-documentos', payload.data)
          const opts = payload.data.map((t) => ({
            value: t.codigo || t.nombre,
            label: formatTipoDocLabel(t),
          }))
          setTipoDocOptions(opts)
        }
      })
      .catch(() => { })
  }, [])

  // Vienen de /personas/estadisticas (COUNT en SQL), no del array cargado:
  // con paginación real, "personas" en memoria ya no es el padrón completo.
  const totalPersonas = stats.total
  const conductores = stats.conLicencia
  const propietarios = stats.sinLicencia
  const activos = stats.activos
  const inactivos = stats.inactivos
  const porcentajeActivos = totalPersonas > 0 ? Math.round((activos / totalPersonas) * 100) : 0

  const kpiItems = [
    {
      label: 'Total registrados',
      value: new Intl.NumberFormat('es-PE').format(totalPersonas),
      context: 'En padrón municipal',
      icon: 'people',
      accentColor: '#1d4f91',
      borderColor: '#93c5fd',
      borderClass: 'border-2 border-blue-400 dark:border-[var(--border)] shadow-xs',
      iconClass: 'bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/80 dark:text-blue-300 dark:border-[var(--border)]',
    },
    {
      label: 'Con licencia',
      value: new Intl.NumberFormat('es-PE').format(conductores),
      context: 'Habilitados para conducir',
      icon: 'permit',
      accentColor: '#0284c7',
      borderColor: '#7dd3fc',
      borderClass: 'border-2 border-sky-400 dark:border-[var(--border)] shadow-xs',
      iconClass: 'bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-950/80 dark:text-sky-300 dark:border-[var(--border)]',
    },
    {
      label: 'Sin licencia',
      value: new Intl.NumberFormat('es-PE').format(propietarios),
      context: 'Propietarios sin registro de conducción',
      icon: 'vehicle',
      accentColor: '#6366f1',
      borderColor: '#a5b4fc',
      borderClass: 'border-2 border-indigo-400 dark:border-[var(--border)] shadow-xs',
      iconClass: 'bg-indigo-100 text-indigo-800 border border-indigo-300 dark:bg-indigo-950/80 dark:text-indigo-300 dark:border-[var(--border)]',
    },
    {
      label: 'Activos',
      value: new Intl.NumberFormat('es-PE').format(activos),
      progress: porcentajeActivos,
      context: `${porcentajeActivos}% del total`,
      icon: 'check',
      accentColor: '#10b981',
      borderColor: '#6ee7b7',
      progressColor: '#10b981',
      borderClass: 'border-2 border-emerald-400 dark:border-[var(--border)] shadow-xs',
      iconClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-[var(--border)]',
    },
  ]

  // "personas" ya viene filtrada y paginada desde el backend.
  const paginatedPersonas = personas

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchTerm, filterEstado])

  const hasAutoOpened = useRef(false)
  const location = useLocation()
  useEffect(() => {
    if (!isLoading && !hasAutoOpened.current) {
      const params = new URLSearchParams(location.search)
      if (params.get('new') === 'true') {
        hasAutoOpened.current = true
        handleOpenCreateModal()
      }
    }
  }, [isLoading, location.search])

  useQuickCreate(() => handleOpenCreateModal(), !isLoading)

  const handleOpenCreateModal = () => {
    setFormData({
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
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (persona) => {
    setSelectedPersona(persona)
    const normalizedTipo = persona.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (persona.tipoDocumento || 'DNI')
    setFormData({
      ...persona,
      tipoDocumento: normalizedTipo,
      celular: persona.celular || '',
      telefono: persona.telefono || '',
      fotoImg: persona.fotoImg || '',
    })
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleReniecSearch = async () => {
    const dni = formData.numeroDocumento?.trim()
    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      showError('DNI Inválido', 'El número de DNI debe tener exactamente 8 dígitos numéricos.')
      return
    }

    setIsSearchingReniec(true)
    try {
      const response = await apiFetch(`/pide/reniec/${dni}`)
      if (!response.ok) {
        throw new Error(await leerMensajeError(response, 'El servicio de consulta no responde en este momento. Ingrese los datos manualmente.'))
      }
      const res = await response.json()
      const data = res.data || (res.nombres ? res : null)

      if (data) {
        // La foto de RENIEC nunca se autocompleta aquí: solo se usa si el
        // usuario la pide explícitamente con "Usar foto de RENIEC" en la
        // sección de foto. Al crear/editar, la foto es responsabilidad del
        // funcionario (subida manual o ese botón explícito).
        setFormData(prev => ({
          ...prev,
          nombres: (data.nombres || '').toUpperCase() || prev.nombres,
          apellidoPaterno: (data.apellidoPaterno || data.apellido_paterno || '').toUpperCase() || prev.apellidoPaterno,
          apellidoMaterno: (data.apellidoMaterno || data.apellido_materno || '').toUpperCase() || prev.apellidoMaterno,
          direccion: toTitleCase(data.direccion) || prev.direccion,
          estadoCivil: (data.estadoCivil || data.estado_civil || '').toUpperCase() || prev.estadoCivil,
        }))
      } else {
        throw new Error('No se encontraron datos para el documento ingresado.')
      }
    } catch (err) {
      showError('Consulta de Documento', err.message || 'No se pudo consultar la información del documento.')
    } finally {
      setIsSearchingReniec(false)
    }
  }

  const handleUsarFotoReniec = async () => {
    const dni = formData.numeroDocumento?.trim()
    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      showError('DNI Inválido', 'El número de DNI debe tener exactamente 8 dígitos numéricos para consultar la foto.')
      return
    }

    setIsFetchingFotoReniec(true)
    try {
      const response = await apiFetch(`/pide/reniec/${dni}`)
      if (!response.ok) throw new Error('El servicio de consulta no responde en este momento.')
      const res = await response.json()
      const data = res.data || (res.nombres ? res : null)
      const foto = data?.foto_url || data?.foto
      if (!foto) {
        showError('Sin foto', 'RENIEC no devolvió una foto para este documento.')
        return
      }
      setFormData(prev => ({ ...prev, fotoImg: foto, fotoUrl: foto }))
      showToast('Foto de RENIEC aplicada. Recuerda guardar los cambios.')
    } catch (err) {
      showError('Consulta de Foto', err.message || 'No se pudo obtener la foto de RENIEC.')
    } finally {
      setIsFetchingFotoReniec(false)
    }
  }

  const handlePhotoUpload = (e) => {
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
        setFormData((prev) => ({ ...prev, fotoImg: compressed, fotoUrl: compressed }))
      }
      img.onerror = () => {
        setFormData((prev) => ({ ...prev, fotoImg: rawData, fotoUrl: rawData }))
      }
      img.src = rawData
    }
    reader.readAsDataURL(file)
  }

  const handleClearPhoto = () => {
    setFormData((prev) => ({ ...prev, fotoImg: '', fotoUrl: '' }))
  }

  const handleOpenDetail = async (persona) => {
    setSelectedPersona(persona)
    setIsDetailModalOpen(true)
    setIsLoadingDetail(true)
    try {
      const response = await apiFetch(`/personas/${persona.id}`)
      if (response.ok) {
        const payload = await response.json()
        if (payload?.data) setSelectedPersona(payload.data)
      }
    } catch {
      // Si falla, se queda con los datos básicos ya cargados en la tabla.
    } finally {
      setIsLoadingDetail(false)
    }
  }

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Eliminar persona?',
      '¿Está seguro de eliminar a esta persona del padrón municipal?',
      'Sí, eliminar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (result.isConfirmed) {
      try {
        await apiFetch(`/personas/${id}`, { method: 'DELETE' })
        showToast('Persona eliminada correctamente', 'eliminar')
        loadPersonas().catch(() => {})
        loadStats()
      } catch (err) {
        showError('Error', 'No se pudo eliminar a la persona.')
      }
    }
  }

  // Los exports piden el dataset completo que coincide con el filtro actual
  // (sin "page"), no solo la página visible en pantalla.
  const fetchTodoElFiltro = () =>
    fetchTodasLasFilas('/personas', {
      buscar: debouncedSearchTerm,
      estado: filterEstado === 'TODOS' ? '' : filterEstado,
      sortBy,
      sortDir: sortBy ? sortDir : '',
    }, { mensaje: 'Preparando la descarga de personas...' })

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const listToExport = await fetchTodoElFiltro()
          if (listToExport.length === 0) {
            showError('Atención', 'No hay registros de personas para exportar.')
            return
          }
          exportPersonasExcel({ listToExport, filterEstado })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const listToExport = await fetchTodoElFiltro()
          if (listToExport.length === 0) {
            showError('Atención', 'No hay registros de personas para exportar.')
            return
          }
          await exportPersonasPdf({ listToExport, totalPersonas, conductores, propietarios, activos })
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    // Validaciones
    const docLen = formData.numeroDocumento.trim().length
    if (
      !formData.numeroDocumento.trim() ||
      !formData.nombres.trim() ||
      !formData.apellidoPaterno.trim() ||
      !formData.apellidoMaterno.trim() ||
      !formData.numeroLicencia.trim() ||
      !formData.direccion.trim()
    ) {
      showError('Validación Fallida', 'Por favor completa todos los campos requeridos (Documento, Nombres, Apellidos, Licencia y Dirección).')
      return
    }
    const isDni = formData.tipoDocumento === 'DNI' || formData.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD'
    if (isDni && (docLen !== 8 || !/^\d{8}$/.test(formData.numeroDocumento.trim()))) {
      showError('Atención', 'El DNI debe tener exactamente 8 dígitos numéricos.')
      return
    }
    if (!isDni && (docLen < 8 || docLen > 15)) {
      showError('Atención', 'El número de documento debe tener entre 8 y 15 caracteres.')
      return
    }
    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      showError('Validación Fallida', 'Por favor ingresa un correo electrónico válido.')
      return
    }
    if (formData.celular && formData.celular.trim() && !/^\d{9}$/.test(formData.celular.trim())) {
      showError('Validación Fallida', 'El número de celular debe tener exactamente 9 dígitos numéricos.')
      return
    }

    try {
      if (isEditing) {
        const response = await apiFetch(`/personas/${selectedPersona.id}`, {
          method: 'PUT',
          body: formData,
        })
        if (!response.ok) throw response
        const resData = await response.json()
        const updatedPersona = resData.data || { ...selectedPersona, ...formData }
        loadPersonas().catch(() => {})
        loadStats()
        if (Number(user?.id_persona) === Number(updatedPersona.id) && onUserUpdate) {
          onUserUpdate({
            ...user,
            nombres: updatedPersona.nombres || user.nombres,
            apellidos: [updatedPersona.apellidoPaterno, updatedPersona.apellidoMaterno].filter(Boolean).join(' ') || user.apellidos,
            foto_img: updatedPersona.fotoImg || '',
          })
        }
        showToast('Persona actualizada correctamente', 'editar')
      } else {
        const res = await apiFetch('/personas', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) throw res
        setCurrentPage(1)
        loadPersonas().catch(() => {})
        loadStats()
        showToast('Persona registrada correctamente', 'crear')
      }
      setIsModalOpen(false)
    } catch (err) {
      let message = 'Error al guardar la persona en el servidor.'
      if (err?.json) {
        try {
          const errorData = await err.json()
          message = errorData?.message || errorData?.error || message
        } catch (_) {
          message = err.statusText || message
        }
      }
      showError('Error', message)
    }
  }

  return (
    <div className="space-y-4">

      {loadError && <PageLoadError message={loadError} />}

      {/* Cabecera Principal */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="people" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Gestión de Personas
              </h1>
            </div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Directorio oficial de administrados y ciudadanos registrados en el sistema.
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas KPI con Bordes de Colores: 5 tarjetas separadas compactas */}
      <div className="kpi-grid">
        {/* 1. Total registros */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total registros</span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="people" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(totalPersonas)}
            </p>
          </div>
        </div>

        {/* 2. Con licencia */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Con Licencia</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Icon name="permit" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(conductores)}
            </p>
          </div>
        </div>

        {/* 3. Sin licencia */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-cyan-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Sin Licencia</span>
            <span className="grid size-6 place-items-center rounded-md bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Icon name="user" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(propietarios)}
            </p>
          </div>
        </div>

        {/* 4. Activos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Activos</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">
              ?
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(activos)}
            </p>
          </div>
        </div>

        {/* 5. Inactivos */}
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Inactivos</span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 font-bold text-xs">
              ?
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">
              {formatNumeroTarjeta(inactivos)}
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
              placeholder="Buscar por DNI, nombres, apellidos o licencia..."
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
              value={filterEstado}
              onChange={(val) => {
                setFilterEstado(val)
                setCurrentPage(1)
              }}
              options={FILTER_ESTADO_OPTIONS}
            />

            {(filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
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
              <span>Nueva persona</span>
            </button>
          </div>
        </div>



        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[26%]" />
              <col className="w-[16%]" />
              <col className="w-[22%]" />
              <col className="w-[14%]" />
              <col className="w-[110px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3 "><SortableHeader column="nombres" label="Nombres y Apellidos" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 "><SortableHeader column="numeroDocumento" label="Documento" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3 ">Contacto</th>
                <th className="px-4 py-3 ">Licencia</th>
                <th className="px-4 py-3 text-center"><SortableHeader column="estado" align="center" label="Estado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="sticky right-0 z-20 px-4 py-3 text-center bg-slate-50/75 dark:bg-[var(--bg-subtle)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className={isLoading && personas.length > 0 ? 'opacity-50 transition-opacity' : 'transition-opacity'}>
              {isLoading && personas.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="size-9 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--bg-subtle)' }}
                        />
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div
                            className="h-3.5 w-32 rounded"
                            style={{ backgroundColor: 'var(--bg-subtle)' }}
                          />
                          <div
                            className="h-2.5 w-24 rounded"
                            style={{ backgroundColor: 'var(--bg-subtle)' }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="h-4 w-20 rounded"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="h-4 w-24 rounded"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="h-4 w-20 rounded"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div
                        className="h-5 w-16 rounded-full"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      />
                    </td>
                    <td
                      className="sticky right-0 z-10 px-4 py-3 text-right"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <div
                        className="h-7 w-20 ml-auto rounded"
                        style={{ backgroundColor: 'var(--bg-subtle)' }}
                      />
                    </td>
                  </tr>
                ))
              ) : paginatedPersonas.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <Icon name="people" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron personas</p>
                  </td>
                </tr>
              ) : (
                paginatedPersonas.map((p) => (
                  <tr
                    key={p.id}
                    className="group transition-colors hover:bg-[var(--brand-soft)]"
                  >
                    <td className="px-4 py-3 ">
                      <div className="flex items-center gap-3">
                        {p.fotoImg ? (
                          <img
                            src={p.fotoImg}
                            alt={p.nombres}
                            onError={(e) => {
                              e.currentTarget.onerror = null
                              e.currentTarget.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.nombres)}+${encodeURIComponent(p.apellidoPaterno)}&background=f1f5f9&color=475569&bold=true`
                            }}
                            className="size-9 shrink-0 rounded-full object-cover border"
                            style={{ borderColor: 'var(--border-brand-subtle)' }}
                          />
                        ) : (
                          <div
                            className="size-9 shrink-0 rounded-full font-semibold flex items-center justify-center text-[12px] uppercase select-none border"
                            style={{
                              backgroundColor: 'var(--brand-soft)',
                              borderColor: 'var(--border-brand-subtle)',
                              color: 'var(--brand)',
                            }}
                          >
                            {p.nombres?.[0] || '?'}{p.apellidoPaterno?.[0] || ''}
                          </div>
                        )}
                        <div>
                          <p
                            className="text-xs font-semibold text-slate-900 dark:text-white whitespace-nowrap"
                            title={`${p.nombres || ''} ${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}`.trim()}
                          >
                            {`${p.nombres || ''} ${p.apellidoPaterno || ''} ${p.apellidoMaterno || ''}`.trim() || '—'}
                          </p>
                          <p
                            className="text-[11px] whitespace-nowrap mt-0.5"
                            style={{ color: 'var(--text-muted)' }}
                            title={p.direccion}
                          >
                            {p.direccion || '—'}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 ">
                      <div className="flex items-center gap-1.5 font-mono">
                        <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-400">
                          {p.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : p.tipoDocumento}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-white text-xs">
                          {p.numeroDocumento}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3 ">
                      <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>
                        {p.celular || p.telefono || '—'}
                      </p>
                      {p.email && (
                        <p
                          className="mt-0.5 text-[11px] whitespace-nowrap"
                          style={{ color: 'var(--text-muted)' }}
                          title={p.email}
                        >
                          {p.email}
                        </p>
                      )}
                    </td>

                    <td className="px-4 py-3 ">
                      {p.numeroLicencia ? (
                        <span
                          className="font-mono-code text-xs font-semibold"
                          style={{ color: 'var(--brand)' }}
                        >
                          {p.numeroLicencia}
                        </span>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          Sin licencia
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={p.estado} />
                    </td>

                    <td
                      className="sticky right-0 z-10 px-4 py-3 text-right group-hover:bg-[var(--brand-soft)] transition-colors"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                      }}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {/* OJO: Celeste */}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(p)}
                          title="Ver ficha"
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
                          onClick={() => handleOpenEditModal(p)}
                          title="Editar persona"
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
                          onClick={() => handleDelete(p.id)}
                          title="Eliminar persona"
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

      {isModalOpen && (
        <PersonaFormModal
          isEditing={isEditing}
          formData={formData}
          setFormData={setFormData}
          handlePhotoUpload={handlePhotoUpload}
          handleClearPhoto={handleClearPhoto}
          tipoDocOptions={tipoDocOptions}
          handleReniecSearch={handleReniecSearch}
          isSearchingReniec={isSearchingReniec}
          handleUsarFotoReniec={handleUsarFotoReniec}
          isFetchingFotoReniec={isFetchingFotoReniec}
          estadoCivilOptions={ESTADO_CIVIL_OPTIONS}
          estadoOptions={ESTADO_OPTIONS}
          onSubmit={handleFormSubmit}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {isDetailModalOpen && (
        <PersonaDetalleModal selectedPersona={selectedPersona} onClose={() => setIsDetailModalOpen(false)} />
      )}
    </div>
  )
}



