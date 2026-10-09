import { useState, useEffect } from 'react'
import { fechaLocalActual, HORAS_CURSO, validarCalendarioCurso } from '../utils/calendarioCurso'
import { useNavigate } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { useDebounce } from '../hooks/useDebounce'
import { fetchTodasLasFilas } from '../utils/descargaCompleta'
import { SortableHeader } from '../components/ui/SortableHeader'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData, leerMensajeError } from '../config/api'
import { showToast, showConfirm, showError } from '../utils/SwalUtil'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { RoundedSelect, FloatingInput, FloatingSelect, FloatingTextarea } from '../components/ui/FormInputs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'

const FILTER_TIPO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los tipos' },
  { value: 'SEGURIDAD_VIAL', label: 'Seguridad Vial' },
  { value: 'MOTOTAXI', label: 'Transporte Menor (Mototaxis)' },
  { value: 'MANEJO_DEFENSIVO', label: 'Manejo Defensivo' }
]

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'ACTIVO / PROGRAMADO' },
  { value: 'EN_CURSO', label: 'EN CURSO' },
  { value: 'FINALIZADO', label: 'FINALIZADO' }
]

const FORM_ESTADO_OPTIONS = [
  { value: 'PROGRAMADO', label: 'PROGRAMADO' },
  { value: 'EN_CURSO', label: 'EN CURSO' },
  { value: 'FINALIZADO', label: 'FINALIZADO' }
]

export function CursosSeguridad() {
  const navigate = useNavigate();
  const cached = getCachedData('/cursos-lista-inicio')
  const [cursos, setCursos] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [totalFiltrado, setTotalFiltrado] = useState(0)
  const [estadisticas, setEstadisticas] = useState(getCachedData('/cursos-estadisticas') || {})
  const [revision, setRevision] = useState(0)
  const debouncedSearch = useDebounce(searchTerm)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCurso, setSelectedCurso] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [formData, setFormData] = useState({
    codigo: '', titulo: '', descripcion: '', fecha: '', fechaFin: '', fechaInscripcionInicio: '', fechaInscripcionFin: '', horaInicio: '09:00', horaFin: '12:00',
    instructor: '', lugar: '', capacidad: 50, costo: 0, estado: 'PROGRAMADO', tipo: 'SEGURIDAD_VIAL'
  })

  const handleOpenCreateModal = () => {
    setFormData({
      codigo: '',
      titulo: '', descripcion: '', fecha: fechaLocalActual(), fechaFin: fechaLocalActual(),
      fechaInscripcionInicio: fechaLocalActual(), fechaInscripcionFin: fechaLocalActual(), horaInicio: '09:00', horaFin: '12:00',
      instructor: '', lugar: 'Auditorio Municipal JLO',
      capacidad: 50, costo: 0, estado: 'PROGRAMADO', tipo: 'SEGURIDAD_VIAL'
    })
    setSelectedCurso(null)
    setIsModalOpen(true)
  }

  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const handleOpenEditModal = (curso) => {
    setFormData({ ...curso, fechaFin: curso.fechaFin || curso.fecha_fin || curso.fecha || '',
      fechaInscripcionInicio: curso.fechaInscripcionInicio || '', fechaInscripcionFin: curso.fechaInscripcionFin || '',
      horaInicio: curso.horaInicio || '', horaFin: curso.horaFin || '' })
    setSelectedCurso(curso)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Eliminar curso?',
      '¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer.',
      'Sí, eliminar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' }
    )
    if (result.isConfirmed) {
      try {
        const respuesta = await apiFetch(`/cursos/${id}`, { method: 'DELETE' })
        if (!respuesta.ok) throw new Error(await leerMensajeError(respuesta, 'No se pudo eliminar el curso.'))
        setCursos(cursos.filter(c => (c.uuid || c.id) !== id))
        setRevision(v => v + 1)
        showToast('Curso eliminado correctamente')
      } catch (err) {
        showError('Error', sanitizarMensaje(err.message, 'Error al eliminar curso'))
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!formData.titulo.trim() || !formData.fecha) {
      showError('Validación Fallida', 'Por favor completa los campos requeridos.')
      return
    }

    if (!Number.isSafeInteger(Number(formData.capacidad)) || Number(formData.capacidad) < 1) {
      showError('Validación Fallida', 'El aforo del curso debe ser un número entero mayor que cero.')
      return
    }

    const courseDate = new Date(formData.fecha + 'T00:00:00')
    const errorCalendario = validarCalendarioCurso(formData)
    if (errorCalendario) { showError('Revisa los datos', errorCalendario); return }
    if (selectedCurso && Number(formData.capacidad) < Number(selectedCurso.inscritos)) {
      showError('Revisa la capacidad', 'La capacidad no puede ser menor que los participantes inscritos.'); return
    }
    const today = new Date()
    today.setHours(0,0,0,0)
    if (courseDate < today && !selectedCurso) {
      showError('Validación Fallida', 'La fecha del nuevo curso no puede estar en el pasado.')
      return
    }

    const payload = {
      ...formData,
      cuposTotales: formData.capacidad,
      costo: formData.costo || 0
    }
    try {
      if (selectedCurso) {
        const response = await apiFetch(`/cursos/${selectedCurso.uuid || selectedCurso.id}`, {
          method: 'PUT',
          body: payload
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.messages?.error || 'Error al guardar el curso')
        
        setCursos(cursos.map(c => c.id === selectedCurso.id ? { ...c, ...formData, id: c.id } : c))
        showToast('Curso editado exitosamente')
      } else {
        const response = await apiFetch('/cursos', {
          method: 'POST',
          body: payload
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.messages?.error || 'Error al guardar el curso')
        if (result.data) {
          const newCurso = {
            ...result.data,
            capacidad: result.data.cuposTotales,
            inscritos: result.data.cuposInscritos,
            tipo: formData.tipo
          }
          setCursos([newCurso, ...cursos])
          showToast('Curso registrado exitosamente')
        }
      }
      setIsModalOpen(false)
      setRevision(v => v + 1)
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'Error al guardar el curso.'))
    }
  }

  const totalCursos = Number(estadisticas.totalCursos || 0)
  const cursosActivos = Number(estadisticas.cursosActivos || 0)
  const totalInscritos = Number(estadisticas.totalInscritos || 0)
  const cursosFinalizados = Number(estadisticas.cursosFinalizados || 0)
  const filteredCursos = cursos

  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearch, filterEstado, filterTipo])

  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  
  useEffect(() => {
    const bc = new BroadcastChannel('cursos_channel')
    bc.onmessage = (e) => {
      if (e.data && e.data.type === 'CURSO_UPDATED') {
        setRevision(v => v + 1)
      }
    }
    return () => bc.close()
  }, [])

  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }
  const paginatedCursos = cursos
  const obtenerCursosExportacion = () => fetchTodasLasFilas('/cursos', {
    resumen: '1', buscar: debouncedSearch, estado: filterEstado, tipo: filterTipo, sortBy, sortDir,
  })

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const cursosExportados = await obtenerCursosExportacion()
      await exportToExcel({
            filename: `Cursos_Seguridad_Vial_${new Date().toISOString().slice(0, 10)}.xls`,
            sheetName: 'Cursos',
            title: 'PROGRAMA MUNICIPAL DE EDUCACIÓN Y SEGURIDAD VIAL',
            subtitle: 'Capacitación y Emisión de Carnets para Conductores y Transportistas',
            metadata: [
              { label: 'Tipo', value: filterTipo },
              { label: 'Estado', value: filterEstado },
              { label: 'Total Cursos', value: String(cursosExportados.length) }
            ],
            columns: [
              { header: 'CÓDIGO', key: 'codigo', isText: true, width: 130, align: 'center' },
              { header: 'TÍTULO DEL CURSO', key: 'titulo', width: 260 },
              { header: 'TIPO', key: 'tipo', width: 160 },
              { header: 'DESCRIPCIÓN', key: 'descripcion', width: 260 },
              { header: 'FECHA', key: 'fecha', width: 110, align: 'center' },
              { header: 'FECHA INICIO', key: 'fecha_inicio', width: 110, align: 'center' },
              { header: 'FECHA FIN', key: 'fecha_fin', width: 110, align: 'center' },
              { header: 'APERTURA INSCRIPCIÓN', key: 'fechaInscripcionInicio', width: 110, align: 'center' },
              { header: 'CIERRE INSCRIPCIÓN', key: 'fechaInscripcionFin', width: 110, align: 'center' },
              { header: 'HORARIO', key: 'horario', width: 140, align: 'center' },
              { header: 'INSTRUCTOR', key: 'instructor', width: 180 },
              { header: 'LUGAR', key: 'lugar', width: 200 },
              { header: 'COSTO (S/)', render: (_, c) => `S/ ${Number(c.costo || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 100 },
              { header: 'CUPOS TOTALES', key: 'capacidad', width: 100, align: 'center' },
              { header: 'INSCRITOS', render: (_, c) => String(c.inscritos ?? c.participantes?.length ?? 0), width: 90, align: 'center' },
              { header: 'ESTADO', key: 'estado', width: 120, align: 'center' }
            ],
            data: cursosExportados.map(c => ({ ...c, capacidad: c.cuposTotales, inscritos: c.cuposInscritos }))
          })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const cursosExportados = await obtenerCursosExportacion()
      await exportToPdf({
            filename: `Cursos_Seguridad_Vial_${new Date().toISOString().slice(0, 10)}.pdf`,
            title: 'PROGRAMA MUNICIPAL DE EDUCACIÓN Y SEGURIDAD VIAL',
            subtitle: 'Capacitación y Emisión de Carnets para Conductores y Transportistas',
            metadata: [
              { label: 'Tipo', value: filterTipo },
              { label: 'Estado', value: filterEstado },
              { label: 'Total Cursos', value: String(cursosExportados.length) }
            ],
            columns: [
              { header: 'CÓDIGO', key: 'codigo', isText: true, width: 130, align: 'center' },
              { header: 'TÍTULO DEL CURSO', key: 'titulo', width: 260 },
              { header: 'TIPO', key: 'tipo', width: 160 },
              { header: 'FECHA', key: 'fecha', width: 110, align: 'center' },
              { header: 'HORARIO', key: 'horario', width: 140, align: 'center' },
              { header: 'INSTRUCTOR', key: 'instructor', width: 180 },
              { header: 'LUGAR', key: 'lugar', width: 200 },
              { header: 'VACANTES', key: 'capacidad', width: 90, align: 'center' },
              { header: 'INSCRITOS', render: (_, c) => String(c.inscritos || c.participantes?.length || 0), width: 90, align: 'center' },
              { header: 'ESTADO', key: 'estado', width: 120, align: 'center' }
            ],
            data: cursosExportados.map(c => ({ ...c, capacidad: c.cuposTotales, inscritos: c.cuposInscritos }))
          })
    } finally {
      setIsExportingPdf(false)
    }
  }

  // Bloquea el scroll de la página de fondo mientras hay un modal abierto.
  useEffect(() => {
    if (isModalOpen) {
      const previousOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = previousOverflow
      }
    }
  }, [isModalOpen])

  useEffect(() => {
    const controller = new AbortController()
    setIsLoading(true)
    setLoadError('')
    const params = new URLSearchParams({ page: String(currentPage), porPagina: String(itemsPerPage),
      resumen: '1', buscar: debouncedSearch, estado: filterEstado, tipo: filterTipo, sortBy, sortDir })
    apiFetch(`/cursos?${params}`, { signal: controller.signal })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        if (controller.signal.aborted) return
        const fetchedCursos = (data.data || []).map(c => ({
          ...c,
          capacidad: c.cuposTotales,
          inscritos: c.cuposInscritos,
          tipo: c.tipo || 'SEGURIDAD_VIAL'
        }))
        setCursos(fetchedCursos)
        setTotalFiltrado(data.meta?.total || 0)
        setEstadisticas(data.estadisticas || {})
        setCachedData('/cursos-estadisticas', data.estadisticas || {})
        if (currentPage === 1 && itemsPerPage === 5 && !debouncedSearch && filterEstado === 'TODOS' && filterTipo === 'TODOS' && !sortBy) {
          setCachedData('/cursos-lista-inicio', fetchedCursos)
        }
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError('No se pudo cargar el registro de cursos viales.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [currentPage, itemsPerPage, debouncedSearch, filterEstado, filterTipo, sortBy, sortDir, revision])


  return (
    <div className="space-y-4">
      {loadError && <PageLoadError message={loadError} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="course" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Cursos de Seguridad Vial
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Programa municipal de capacitación y seguridad vial.
            </p>
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-purple-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">TOTAL CURSOS</span>
            <span className="grid size-6 place-items-center rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/60">
              <Icon name="course" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{totalCursos}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">CURSOS ACTIVOS</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60">
              <Icon name="office" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{cursosActivos}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-indigo-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">TOTAL INSCRITOS</span>
            <span className="grid size-6 place-items-center rounded-md bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60">
              <Icon name="people" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{totalInscritos}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">FINALIZADOS</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{cursosFinalizados}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438] flex flex-col">

        <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-[var(--border)]">
          <div className="relative w-full sm:max-w-xs">
            <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, título, instructor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-purple-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-purple-500/20 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
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
                  setCurrentPage(1)
                }}
                title="Limpiar filtros"
                className="grid size-[34px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-4" />
              </button>
            )}
            
            <button onClick={handleExportExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors" disabled={isExportingExcel}>
              <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`} /><span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
            </button>
            <button onClick={handleExportPdf} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-colors" disabled={isExportingPdf}>
              <Icon name={isExportingPdf ? "refresh" : "filePdf"} className={`size-3.5 text-rose-600 dark:text-rose-400 ${isExportingPdf ? 'animate-spin' : ''}`} /><span>{isExportingPdf ? 'Generando...' : 'PDF'}</span>
            </button>
            
            <button onClick={handleOpenCreateModal} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 whitespace-nowrap hover:opacity-90" style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}>
              <span className="text-base leading-none font-black">+</span><span>Nuevo</span>
            </button>
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full min-w-[1150px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[22%]" />
              <col className="w-[14%]" />
              <col className="w-[13%]" />
              <col className="w-[18%]" />
              <col className="w-[150px]" />
              <col className="w-[140px]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-3 "><SortableHeader column="codigo" label="CÓDIGO / TIPO" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-3 py-3"><SortableHeader column="titulo" label="TÍTULO DEL CURSO" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-3 py-3 text-center"><SortableHeader column="fecha" label="FECHA PROGRAMADA" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-3 py-3 text-center">INSCRITOS / CAPACIDAD</th>
                <th className="px-3 py-3">INSTRUCTOR / LUGAR</th>
                <th className="px-3 py-3 text-center"><SortableHeader column="estado" label="ESTADO" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-[#1C2438] px-3 py-3 text-center border-l border-slate-100 dark:border-[var(--border)] shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
              {isLoading && cursos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3 py-3">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-44 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                    <td className="px-3 py-3"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-3 py-3"><div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#1C2438] px-3 py-3 text-right border-l border-slate-100 dark:border-[var(--border)]"><div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                  </tr>
                ))
              ) : filteredCursos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Icon name="course" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron cursos registrados</p>
                  </td>
                </tr>
              ) : (
                paginatedCursos.map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/cursos/${c.uuid || c.id}/popup`)} className="group transition-colors hover:bg-purple-50/30 dark:hover:bg-[var(--bg-subtle)] cursor-pointer">

                    <td className="px-3 py-3 ">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">{c.codigo}</p>
                      <span className="mt-0.5 inline-block rounded-md bg-purple-100/70 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                        {c.tipoLabel || 'SEGURIDAD VIAL'}
                      </span>
                    </td>


                    <td className="px-3 py-3">
                      <div>
                        <p className="font-bold text-xs text-slate-900 dark:text-white" title={c.titulo}>{c.titulo}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400" title={c.descripcion}>
                          {c.descripcion || 'Educación Vial Obligatoria para Conductores'}
                        </p>
                      </div>
                    </td>


                    <td className="px-3 py-3 text-center">
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Inicio: {c.fecha}</p>
                      <p className="text-xs text-slate-500">Fin: {c.fechaFin || c.fecha_fin || 'Sin registrar'}</p>
                      {c.fechaInscripcionFin && <p className="text-[10px] text-slate-500">Inscripción hasta: {c.fechaInscripcionFin}</p>}
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {c.horario || 'Sin horario registrado'}
                      </p>
                    </td>


                    <td className="px-3 py-3 text-center">
                      <p className="font-bold text-xs text-slate-900 dark:text-white">
                        {c.inscritos || 0} / {c.capacidad || 50}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Inscritos
                      </p>
                    </td>


                    <td className="px-3 py-3">
                      <div>
                        <p className="font-semibold text-xs text-slate-800 dark:text-slate-200" title={c.instructor}>{c.instructor || 'Ing. Fernando Ramos'}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500" title={c.lugar}>{c.lugar || 'Auditorio Municipal JLO'}</p>
                      </div>
                    </td>


                    <td className="px-3 py-3 text-center align-middle">
                      <StatusBadge status={c.estado === 'ACTIVO' || c.estado === 'ABIERTO' ? 'PROGRAMADO' : c.estado} />
                    </td>


                    <td className="sticky right-0 z-10 bg-white group-hover:bg-purple-50/40 dark:bg-[#1C2438] dark:group-hover:bg-slate-800/60 px-3 py-3 text-center align-middle border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                      <div className="flex items-center justify-center gap-1">
                        {c.estado !== 'FINALIZADO' && <span className="size-8 shrink-0" aria-hidden="true" />}
                        {c.estado === 'FINALIZADO' && (
                          <button onClick={(e) => { e.stopPropagation(); navigate(`/impresion?pestana=CARNETS&cursoId=${c.uuid || c.id}&cursoEtiqueta=${encodeURIComponent(`${c.codigo} · ${c.titulo}`)}`); }} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-print-bg)] border-[var(--action-print-border)] text-[var(--action-print-text)] hover:bg-[var(--action-print-hover)] hover:border-[var(--action-print-hover)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" title="Imprimir carnets en el Centro de impresión">
                            <Icon name="print" className="size-4" />
                          </button>
                        )}
                        
                        <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(c); }} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-edit-bg)] border-[var(--action-edit-border)] text-[var(--action-edit-text)] hover:bg-[var(--action-edit-hover)] hover:border-[var(--action-edit-hover)] hover:text-white" title="Editar Curso">
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(c.uuid || c.id); }} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-del-bg)] border-[var(--action-del-border)] text-[var(--action-del-text)] hover:bg-[var(--action-del-hover)] hover:border-[var(--action-del-hover)] hover:text-white" title="Eliminar Curso">
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
        />
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") setIsModalOpen(false); e.currentTarget.dataset.downOnOverlay = "" }}>
          <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="course" className="size-4" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {selectedCurso ? 'Editar Curso de Seguridad' : 'Programar Nuevo Curso'}
                </h3>
              </div>
              <BotonCerrarModal onClick={() => setIsModalOpen(false)} title="Cerrar" />
            </div>
            <form onSubmit={handleFormSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-7 overflow-y-auto p-7">
              
              <fieldset className="border border-slate-200 rounded-xl p-5 dark:border-[var(--border-strong)]">
                <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-2">DATOS GENERALES</legend>
                <div className="grid gap-5 sm:grid-cols-2 mb-5">
                  <div className={selectedCurso ? '' : 'sm:col-span-2'}>
                    <FloatingInput id="curso_codigo" label={selectedCurso ? 'Código' : 'Código automático al guardar'} value={formData.codigo} disabled inputClassName="bg-slate-100 text-slate-500 dark:bg-[var(--bg-subtle)]" />
                  </div>
                  {selectedCurso && (
                    <FloatingSelect
                      id="curso_estado"
                      label="Estado"
                      value={formData.estado}
                      onChange={e => setFormData({ ...formData, estado: e.target.value })}
                      options={FORM_ESTADO_OPTIONS}
                    />
                  )}
                </div>
                <FloatingInput id="curso_titulo" label="Título del Curso" required value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} />
                <FloatingTextarea id="curso_descripcion" label="Descripción" rows={2} value={formData.descripcion || ''} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
              </fieldset>

              <fieldset className="border border-slate-200 rounded-xl p-5 dark:border-[var(--border-strong)]">
                <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-2">DETALLES DEL CURSO</legend>
                <div className="grid gap-5 sm:grid-cols-2">
                  <FloatingInput id="curso_inscripcion_inicio" label="Apertura de inscripción" type="date" required value={formData.fechaInscripcionInicio} onChange={e => setFormData(p => ({ ...p, fechaInscripcionInicio: e.target.value }))} />
                  <FloatingInput id="curso_inscripcion_fin" label="Cierre de inscripción" type="date" required value={formData.fechaInscripcionFin} onChange={e => setFormData(p => ({ ...p, fechaInscripcionFin: e.target.value }))} />
                  <FloatingInput id="curso_fecha" label="Inicio del curso" type="date" required value={formData.fecha} onChange={e => setFormData(p => ({ ...p, fecha: e.target.value }))} />
                  <FloatingInput id="curso_fecha_fin" label="Fin del curso" type="date" required value={formData.fechaFin} onChange={e => setFormData(p => ({ ...p, fechaFin: e.target.value }))} />
                  <FloatingSelect id="curso_hora_inicio" label="Hora de inicio" value={formData.horaInicio} options={HORAS_CURSO} onChange={e => setFormData(p => ({ ...p, horaInicio: e.target.value }))} />
                  <FloatingSelect id="curso_hora_fin" label="Hora de fin" value={formData.horaFin} options={HORAS_CURSO} onChange={e => setFormData(p => ({ ...p, horaFin: e.target.value }))} />
                  <FloatingInput id="curso_capacidad" label="Capacidad (participantes)" type="number" min={selectedCurso?.inscritos || 1} step="1" required value={formData.capacidad} onChange={e => setFormData(p => ({ ...p, capacidad: e.target.value }))} />
                  <FloatingInput id="curso_instructor" label="Instructor" required value={formData.instructor} onChange={e => setFormData({ ...formData, instructor: e.target.value })} />
                  <FloatingInput id="curso_lugar" label="Lugar" required value={formData.lugar} onChange={e => setFormData({ ...formData, lugar: e.target.value })} />
                  <FloatingInput id="curso_costo" label="Costo de inscripción (S/) - 0 = gratuito" type="number" min="0" step="0.01" value={formData.costo ?? 0} onChange={e => setFormData({ ...formData, costo: e.target.value })} />
                </div>
              </fieldset>
            </div>
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-7 py-4 dark:border-[var(--border)]">
                <BotonCancelar onClick={() => setIsModalOpen(false)} />
                <BotonGuardar>
                  Guardar Curso
                </BotonGuardar>
              </div>
            </form>
          </div>
        </div>
      )}

      
    </div>
  )
}
export default CursosSeguridad
