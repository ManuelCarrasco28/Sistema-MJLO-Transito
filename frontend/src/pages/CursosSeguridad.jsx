import { useState, useEffect } from 'react'
import { formatFecha, formatRangoHoras12 } from '../utils/formatters'
import { fechaLocalActual, validarCalendarioCurso } from '../utils/calendarioCurso'
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
import { RoundedSelect, FloatingInput, FloatingSelect, FloatingTextarea } from '../components/ui/FormInputs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { CarnetCursoTab } from '../components/cursos/CarnetCursoTab'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'
import { puedeEliminarRegistros } from '../config/roles'
import { usePersonaRapida } from '../hooks/usePersonaRapida'

// El carnet del curso dura un año: vence en la misma fecha del año siguiente.
const masUnAnio = (fecha) => {
  const f = /^\d{4}-\d{2}-\d{2}/.test(String(fecha || '')) ? new Date(String(fecha).slice(0, 10) + 'T00:00:00') : null
  if (!f || Number.isNaN(f.getTime())) return ''
  f.setFullYear(f.getFullYear() + 1)
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`
}

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'ACTIVO', label: 'ACTIVO / PROGRAMADO' },
  { value: 'EN_CURSO', label: 'EN CURSO' },
  { value: 'FINALIZADO', label: 'CULMINADO' }
]

// El estado del curso lo marcan las fechas; solo se puede cancelar (o reactivar un curso cancelado).
const ETIQUETA_ESTADO_CURSO = {
  PROGRAMADO: 'PROGRAMADO', ABIERTO: 'PROGRAMADO', ACTIVO: 'PROGRAMADO',
  EN_CURSO: 'EN CURSO', FINALIZADO: 'CULMINADO', CANCELADO: 'CANCELADO',
}

// Estado de la inscripción: se deduce de las fechas de apertura y cierre, y se cierra cuando el curso ya empezó, terminó o se canceló.
function estadoInscripcion({ estado, fechaInscripcionInicio, fechaInscripcionFin }) {
  if (estado && !['PROGRAMADO', 'ABIERTO', 'ACTIVO'].includes(estado)) return { texto: 'Cerrada', clase: 'text-rose-600 dark:text-rose-400' }
  const hoy = fechaLocalActual()
  if (fechaInscripcionInicio && hoy < fechaInscripcionInicio) return { texto: 'Por abrir', clase: 'text-amber-600 dark:text-amber-400' }
  if (fechaInscripcionFin && hoy > fechaInscripcionFin) return { texto: 'Cerrada', clase: 'text-rose-600 dark:text-rose-400' }
  return { texto: 'Abierta', clase: 'text-emerald-600 dark:text-emerald-400' }
}

export function CursosSeguridad() {
  const navigate = useNavigate();
  const cached = getCachedData('/cursos-lista-inicio')
  const [cursos, setCursos] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [totalFiltrado, setTotalFiltrado] = useState(0)
  const [estadisticas, setEstadisticas] = useState(getCachedData('/cursos-estadisticas') || {})
  const [revision, setRevision] = useState(0)
  // Personas con el carnet de curso vencido (más de un año desde su último curso aprobado)
  const [carnetsVencidos, setCarnetsVencidos] = useState(null)
  useEffect(() => {
    let vigente = true
    apiFetch('/cursos/vigencias?page=1&porPagina=1&estado=VENCIDO')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((payload) => { if (vigente) setCarnetsVencidos(Number(payload.meta?.total || 0)) })
      .catch(() => { if (vigente) setCarnetsVencidos(null) })
    return () => { vigente = false }
  }, [revision])
  const debouncedSearch = useDebounce(searchTerm)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedCurso, setSelectedCurso] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [formData, setFormData] = useState({
    codigo: '', titulo: '', descripcion: '', fecha: '', fechaFin: '', fechaInscripcionInicio: '', fechaInscripcionFin: '', horaInicio: '09:00', horaFin: '12:00',
    instructor: '', idInstructor: null, instructorDni: '', resolucion: '', carnetExpedicion: '', lugar: '', capacidad: 50, costo: 0, estado: 'PROGRAMADO', tipo: 'SEGURIDAD_VIAL'
  })

  // Instructor: se busca por DNI entre las personas registradas; si no existe, se registra desde aquí mismo.
  const [instructorBusqueda, setInstructorBusqueda] = useState('')
  const [buscandoInstructor, setBuscandoInstructor] = useState(false)
  const [instructorNoEncontrado, setInstructorNoEncontrado] = useState(false)

  const elegirInstructor = (persona) => {
    const nombre = [persona.nombres, persona.apellidoPaterno || persona.apellido_paterno, persona.apellidoMaterno || persona.apellido_materno]
      .filter(Boolean).join(' ').trim()
    setFormData((p) => ({ ...p, idInstructor: persona.id, instructor: nombre, instructorDni: persona.numeroDocumento || persona.numero || '' }))
    setInstructorBusqueda('')
    setInstructorNoEncontrado(false)
  }

  const quitarInstructor = () => {
    setFormData((p) => ({ ...p, idInstructor: null, instructor: '', instructorDni: '' }))
    setInstructorBusqueda('')
    setInstructorNoEncontrado(false)
  }

  const buscarInstructor = async () => {
    const dni = instructorBusqueda.trim()
    if (!/^\d{8}$/.test(dni)) { showError('DNI inválido', 'Ingresa los 8 dígitos del DNI del instructor.'); return }
    setBuscandoInstructor(true)
    setInstructorNoEncontrado(false)
    try {
      const response = await apiFetch(`/personas?page=1&buscar=${encodeURIComponent(dni)}&porPagina=10`)
      if (!response.ok) throw new Error(await leerMensajeError(response, 'No se pudo buscar el DNI.'))
      const payload = await response.json()
      const encontrada = (payload.data || []).find((p) => String(p.numeroDocumento || p.numero || '') === dni)
      if (encontrada) elegirInstructor(encontrada)
      else setInstructorNoEncontrado(true)
    } catch (error) {
      showError('Error de búsqueda', sanitizarMensaje(error.message, 'No se pudo buscar el DNI.'))
    } finally {
      setBuscandoInstructor(false)
    }
  }

  const { abrir: abrirRegistroInstructor, modal: modalRegistroInstructor } = usePersonaRapida({
    alCrear: (persona) => elegirInstructor(persona),
  })

  const handleOpenCreateModal = () => {
    // Un curso nuevo empieza con todos los campos en blanco
    setFormData({
      codigo: '',
      titulo: '', descripcion: '', fecha: '', fechaFin: '',
      fechaInscripcionInicio: '', fechaInscripcionFin: '', horaInicio: '', horaFin: '',
      instructor: '', idInstructor: null, instructorDni: '', resolucion: '', carnetExpedicion: '', lugar: '',
      capacidad: '', costo: '', estado: 'PROGRAMADO', tipo: 'SEGURIDAD_VIAL'
    })
    setInstructorBusqueda(''); setInstructorNoEncontrado(false)
    setSelectedCurso(null)
    setIsModalOpen(true)
  }

  const [isExportingExcel, setIsExportingExcel] = useState(false)

  const handleOpenEditModal = (curso) => {
    setInstructorBusqueda(''); setInstructorNoEncontrado(false)
    setFormData({ ...curso, resolucion: curso.resolucion || '', carnetExpedicion: curso.carnetExpedicion || curso.fechaFin || curso.fecha || '', idInstructor: curso.idInstructor || null, instructorDni: curso.instructorDni || '', fechaFin: curso.fechaFin || curso.fecha_fin || curso.fecha || '',
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

  // Cancelar un curso con participantes inscritos: se eligen a qué curso pasan.
  const [cancelacion, setCancelacion] = useState(null)
  const [pestana, setPestana] = useState('CURSOS')

  // "Cancelar curso" / "Reactivar curso": fija el estado y guarda con el flujo normal de edición
  const [estadoPendiente, setEstadoPendiente] = useState(null)
  const aplicarEstado = async (nuevoEstado) => {
    if (nuevoEstado === 'CANCELADO' && Number(selectedCurso?.inscritos || 0) === 0) {
      const r = await showConfirm('¿Cancelar curso?', 'El curso quedará cancelado y no admitirá inscripciones.', 'Sí, cancelar curso', 'Volver',
        { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' })
      if (!r.isConfirmed) return
    }
    setFormData((prev) => ({ ...prev, estado: nuevoEstado }))
    setEstadoPendiente(nuevoEstado)
  }
  const volverDeCancelacion = () => {
    setCancelacion(null)
    setFormData((prev) => ({ ...prev, estado: selectedCurso?.estado || prev.estado }))
  }
  useEffect(() => {
    if (estadoPendiente && formData.estado === estadoPendiente) {
      setEstadoPendiente(null)
      handleFormSubmit({ preventDefault() {} })
    }
  }, [estadoPendiente, formData.estado]) // eslint-disable-line react-hooks/exhaustive-deps

  const abrirCancelacion = async () => {
    setCancelacion({ cargando: true, destinos: [], destinoId: '' })
    try {
      const res = await apiFetch('/cursos?resumen=1&estado=TODOS&page=1&porPagina=200')
      const payload = res.ok ? await res.json() : { data: [] }
      const libres = Number(selectedCurso?.inscritos || 0)
      const destinos = (payload.data || []).filter((c) =>
        c.id !== selectedCurso?.id
        && ['PROGRAMADO', 'ABIERTO', 'ACTIVO'].includes(c.estado)
        && Number(c.cuposTotales || 0) - Number(c.cuposInscritos || 0) >= libres)
      setCancelacion({ cargando: false, destinos, destinoId: '' })
    } catch {
      setCancelacion({ cargando: false, destinos: [], destinoId: '' })
    }
  }

  const handleFormSubmit = async (e, destinoId = null) => {
    e.preventDefault()

    if (!formData.titulo.trim() || !formData.fecha) {
      showError('Validación Fallida', 'Por favor completa los campos requeridos.')
      return
    }

    if (!formData.idInstructor && !String(formData.instructor || '').trim()) {
      showError('Falta el instructor', 'Busca al instructor por su DNI. Si no está registrado, podrás registrarlo en ese momento.')
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

    // Al cancelar un curso con inscritos hay que decidir a qué curso pasan (aparece solo en ese caso)
    if (selectedCurso && formData.estado === 'CANCELADO' && selectedCurso.estado !== 'CANCELADO'
      && Number(selectedCurso.inscritos) > 0 && !destinoId) {
      abrirCancelacion()
      return
    }

    const payload = {
      ...formData,
      // Los carnets se expiden al terminar el curso y vencen un año después (el servidor calcula el vencimiento)
      carnetExpedicion: formData.fechaFin,
      cuposTotales: formData.capacidad,
      costo: formData.costo || 0,
      ...(destinoId ? { cursoDestinoId: Number(destinoId) } : {}),
    }
    try {
      if (selectedCurso) {
        const response = await apiFetch(`/cursos/${selectedCurso.uuid || selectedCurso.id}`, {
          method: 'PUT',
          body: payload
        })
        const result = await response.json()
        if (!response.ok) throw new Error(result.messages?.error || result.message || 'Error al guardar el curso')

        setCursos(cursos.map(c => c.id === selectedCurso.id ? { ...c, ...formData, id: c.id } : c))
        showToast(destinoId ? (result.message || 'Curso cancelado') : 'Curso editado exitosamente')
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
      setCancelacion(null)
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
  }, [debouncedSearch, filterEstado])

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
    resumen: '1', buscar: debouncedSearch, estado: filterEstado, sortBy, sortDir,
  })

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const cursosExportados = await obtenerCursosExportacion()
      await exportToExcel({
            filename: `Cursos_Seguridad_Vial_${new Date().toISOString().slice(0, 10)}.xlsx`,
            sheetName: 'Cursos',
            title: 'PROGRAMA MUNICIPAL DE EDUCACIÓN Y SEGURIDAD VIAL',
            subtitle: 'Capacitación y Emisión de Carnets para Conductores y Transportistas',
            metadata: [
              { label: 'Estado', value: filterEstado },
              { label: 'Total Cursos', value: String(cursosExportados.length) }
            ],
            columns: [
              { header: 'CÓDIGO', key: 'codigo', isText: true, width: 130, align: 'center' },
              { header: 'TÍTULO DEL CURSO', key: 'titulo', width: 260 },
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
    } catch (error) {
      if (error.name !== 'AbortError') showError('Descarga no completada', error.message || 'No se pudo preparar el archivo completo.')
    } finally {
      setIsExportingExcel(false)
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
      resumen: '1', buscar: debouncedSearch, estado: filterEstado, sortBy, sortDir })
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
        if (currentPage === 1 && itemsPerPage === 5 && !debouncedSearch && filterEstado === 'TODOS' && !sortBy) {
          setCachedData('/cursos-lista-inicio', fetchedCursos)
        }
      })
      .catch(() => { if (!controller.signal.aborted) setLoadError('No se pudo cargar el registro de cursos viales.') })
      .finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [currentPage, itemsPerPage, debouncedSearch, filterEstado, sortBy, sortDir, revision])


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
          </div>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-purple-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">TOTAL CURSOS</span>
            <span className="grid size-6 place-items-center rounded-md text-purple-600 dark:text-purple-400">
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
            <span className="grid size-6 place-items-center rounded-md text-emerald-600 dark:text-emerald-400">
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
            <span className="grid size-6 place-items-center rounded-md text-indigo-600 dark:text-indigo-400">
              <Icon name="people" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{totalInscritos}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">CULMINADOS</span>
            <span className="grid size-6 place-items-center rounded-md text-amber-600 dark:text-amber-400">
              ✓
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{cursosFinalizados}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">CARNETS VENCIDOS</span>
            <span className="grid size-6 place-items-center rounded-md text-rose-600 dark:text-rose-400">
              <Icon name="alert" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{carnetsVencidos == null ? '—' : carnetsVencidos.toLocaleString('es-PE')}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-[var(--border)]">
        {[
          { id: 'CURSOS', label: 'Cursos', icono: 'course' },
          { id: 'CARNET', label: 'Personas con carnet', icono: 'idCard' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setPestana(tab.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2 text-xs font-extrabold transition-all cursor-pointer ${pestana === tab.id
              ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'}`}
          >
            <Icon name={tab.icono} className="size-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Se monta desde el inicio (oculta) para que sus datos ya estén cargados al abrir la pestaña */}
      <div className={pestana === 'CARNET' ? '' : 'hidden'} aria-hidden={pestana !== 'CARNET'}>
        <CarnetCursoTab />
      </div>

      {pestana === 'CURSOS' && (
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438] flex flex-col">

        <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-[var(--border)]">
          <div className="relative w-full sm:max-w-xs">
            <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, título, instructor"
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
              value={filterEstado}
              onChange={setFilterEstado}
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
            
            <button onClick={handleExportExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-colors" disabled={isExportingExcel}>
              <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`} /><span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
            </button>
            
            <button onClick={handleOpenCreateModal} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 whitespace-nowrap hover:opacity-90" style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}>
              <span className="text-base leading-none font-black">+</span><span>Nuevo</span>
            </button>
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[110px]" />
              <col className="w-[18%]" />
              <col className="w-[150px]" />
              <col className="w-[200px]" />
              <col className="w-[8%]" />
              <col className="w-[13%]" />
              <col className="w-[120px]" />
              <col className="w-[132px]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3 py-3 "><SortableHeader column="codigo" label="CÓDIGO" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-3 py-3"><SortableHeader column="titulo" label="TÍTULO DEL CURSO" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-3 py-3">INSCRIPCIÓN</th>
                <th className="px-3 py-3"><SortableHeader column="fecha" label="FECHAS DEL CURSO" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-3 py-3 text-center">INSCRITOS</th>
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
                  <td colSpan="8" className="p-12 text-center">
                    <Icon name="course" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron cursos registrados</p>
                  </td>
                </tr>
              ) : (
                paginatedCursos.map((c) => (
                  <tr key={c.id} className="group transition-colors hover:bg-purple-50/30 dark:hover:bg-[var(--bg-subtle)]">

                    <td className="px-3 py-3 ">
                      <p className="whitespace-nowrap font-bold text-[11.5px] text-slate-900 dark:text-white">{c.codigo}</p>
                    </td>


                    <td className="px-3 py-3">
                      <p className="font-bold text-[11.5px] leading-snug text-slate-900 dark:text-white" title={c.titulo}>{c.titulo}</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); navigate(`/cursos/${c.uuid || c.id}/popup`) }}
                        className="mt-0.5 flex cursor-pointer items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        <Icon name="course" className="size-3" />
                        <span>Ver curso</span>
                      </button>
                    </td>


                    <td className="px-3 py-3">
                      <dl className="grid grid-cols-[64px_1fr] items-baseline gap-y-1 text-left text-xs">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Apertura</dt>
                        <dd className="whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200">{c.fechaInscripcionInicio ? formatFecha(c.fechaInscripcionInicio) : <span className="font-sans font-normal text-slate-400">Sin registrar</span>}</dd>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cierre</dt>
                        <dd className="whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">{c.fechaInscripcionFin ? formatFecha(c.fechaInscripcionFin) : <span className="font-sans font-normal text-slate-400">Sin registrar</span>}</dd>
                        {c.fechaInscripcionFin && (
                          <>
                            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estado</dt>
                            <dd className="whitespace-nowrap">
                              <b className={estadoInscripcion(c).clase}>{estadoInscripcion(c).texto}</b>
                            </dd>
                          </>
                        )}
                      </dl>
                    </td>


                    <td className="px-3 py-3">
                      <dl className="grid grid-cols-[56px_1fr] items-baseline gap-y-1 text-left text-xs">
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Inicio</dt>
                        <dd className="whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200">{formatFecha(c.fecha)}</dd>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Fin</dt>
                        <dd className="whitespace-nowrap font-mono text-slate-600 dark:text-slate-300">{(c.fechaFin || c.fecha_fin) ? formatFecha(c.fechaFin || c.fecha_fin) : <span className="font-sans text-slate-400">Sin registrar</span>}</dd>
                        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Horario</dt>
                        <dd className="whitespace-nowrap text-slate-600 dark:text-slate-300">{c.horaInicio && c.horaFin ? formatRangoHoras12(c.horaInicio, c.horaFin) : 'Sin horario'}</dd>
                      </dl>
                    </td>


                    <td className="px-3 py-3 text-center">
                      <p className="font-bold text-xs text-slate-900 dark:text-white" title="Inscritos / capacidad">
                        {c.inscritos || 0} / {c.capacidad || 50}
                      </p>
                    </td>


                    <td className="px-3 py-3">
                      <div>
                        <p className="font-semibold text-[11.5px] leading-snug text-slate-800 dark:text-slate-200" title={c.instructor}>{c.instructor || 'Sin instructor registrado'}</p>
                        <p className="text-[11px] leading-snug text-slate-400 dark:text-slate-500" title={c.lugar}>{c.lugar || 'Auditorio Municipal JLO'}</p>
                      </div>
                    </td>


                    <td className="px-3 py-3 text-center align-middle">
                      <StatusBadge status={c.estado === 'ACTIVO' || c.estado === 'ABIERTO' ? 'PROGRAMADO' : c.estado} label={c.estado === 'FINALIZADO' ? 'CULMINADO' : undefined} />
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
                        <button style={puedeEliminarRegistros() ? undefined : { display: 'none' }} onClick={(e) => { e.stopPropagation(); handleDelete(c.uuid || c.id); }} className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-del-bg)] border-[var(--action-del-border)] text-[var(--action-del-text)] hover:bg-[var(--action-del-hover)] hover:border-[var(--action-del-hover)] hover:text-white" title="Eliminar Curso">
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
      )}
      {cancelacion && selectedCurso && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3.5 dark:border-[var(--border)]">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Cancelar curso {selectedCurso.codigo}</h3>
              <BotonCerrarModal onClick={volverDeCancelacion} title="Volver" />
            </div>
            <div className="space-y-4 p-6">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Este curso tiene <b>{selectedCurso.inscritos}</b> participante(s) inscrito(s). Elige el curso al que pasarán:
                sus inscripciones y pagos se trasladan con ellos.
              </p>
              {cancelacion.cargando ? (
                <p className="text-sm text-slate-400">Buscando cursos disponibles...</p>
              ) : cancelacion.destinos.length === 0 ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  No hay otro curso con cupos suficientes para {selectedCurso.inscritos} participante(s). Programa primero un curso nuevo o amplía los cupos de otro.
                </p>
              ) : (
                <FloatingSelect
                  id="curso_destino"
                  label="Pasar los inscritos a"
                  value={cancelacion.destinoId}
                  onChange={(e) => setCancelacion((prev) => ({ ...prev, destinoId: e.target.value }))}
                  options={[
                    { value: '', label: 'Seleccionar curso' },
                    ...cancelacion.destinos.map((c) => ({
                      value: String(c.id),
                      label: `${c.codigo} · ${c.titulo} · inicia ${formatFecha(c.fecha)} · ${Number(c.cuposTotales) - Number(c.cuposInscritos)} cupos`,
                    })),
                  ]}
                />
              )}
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-3 dark:border-[var(--border)]">
              <BotonCancelar onClick={volverDeCancelacion}>Volver</BotonCancelar>
              <button
                type="button"
                disabled={!cancelacion.destinoId}
                onClick={() => handleFormSubmit({ preventDefault() {} }, cancelacion.destinoId)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Cancelar curso y pasar inscritos
              </button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") setIsModalOpen(false); e.currentTarget.dataset.downOnOverlay = "" }}>
          <div className="flex max-h-[98dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
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
            <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto p-3">
              
              <fieldset className="border border-slate-200 rounded-xl p-3 dark:border-[var(--border-strong)]">
                <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-2">DATOS GENERALES</legend>
                <div className="grid gap-2.5 sm:grid-cols-3">
                  {/* Código y estados solo existen al editar un curso ya creado */}
                  {selectedCurso && (
                    <>
                      <FloatingInput id="curso_codigo" label="Código" required maxLength={50} inputClassName="font-mono uppercase" value={formData.codigo || ''} onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })} />
                      <div className="flex items-stretch gap-2">
                        <div className="group/bloq relative min-w-0 flex-1 cursor-not-allowed" title="Campo bloqueado: lo define el sistema según las fechas">
                          <FloatingInput id="curso_estado" label="Estado del curso" disabled value={ETIQUETA_ESTADO_CURSO[formData.estado] || formData.estado || ''} inputClassName="bg-slate-100 text-slate-500 dark:bg-[var(--bg-subtle)]" />
                          <Icon name="lock" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 opacity-0 transition-opacity group-hover/bloq:opacity-100 dark:text-slate-300" />
                        </div>
                        {selectedCurso.estado !== 'FINALIZADO' && (
                          selectedCurso.estado === 'CANCELADO' ? (
                            <button type="button" onClick={() => aplicarEstado('PROGRAMADO')} title="Volver a abrir el curso" className="shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold transition dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40">
                              Reactivar
                            </button>
                          ) : (
                            <button type="button" onClick={() => aplicarEstado('CANCELADO')} title="Cancelar este curso" className="shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-slate-100 px-4 text-sm font-bold transition dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40">
                              Cancelar curso
                            </button>
                          )
                        )}
                      </div>
                      <div className="group/bloq relative cursor-not-allowed" title="Campo bloqueado: lo define el sistema según las fechas">
                        <FloatingInput id="curso_estado_inscripcion" label="Estado de la inscripción" disabled value={estadoInscripcion(formData).texto} inputClassName="bg-slate-100 text-slate-500 dark:bg-[var(--bg-subtle)]" />
                        <Icon name="lock" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 opacity-0 transition-opacity group-hover/bloq:opacity-100 dark:text-slate-300" />
                      </div>
                    </>
                  )}
                  <div className="sm:col-span-3 grid gap-2.5 sm:grid-cols-2">
                    <FloatingInput id="curso_titulo" label="Título del Curso" required value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} />
                    <FloatingTextarea id="curso_descripcion" label="Descripción" rows={1} value={formData.descripcion || ''} onChange={e => setFormData({ ...formData, descripcion: e.target.value })} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="border border-slate-200 rounded-xl p-3 dark:border-[var(--border-strong)]">
                <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-2">DETALLES DEL CURSO</legend>
                <div className="grid gap-4 sm:grid-cols-4">
                  <FloatingInput id="curso_inscripcion_inicio" label="Apertura de inscripción" type="date" required value={formData.fechaInscripcionInicio} onChange={e => setFormData(p => ({ ...p, fechaInscripcionInicio: e.target.value }))} />
                  <FloatingInput id="curso_inscripcion_fin" label="Cierre de inscripción" type="date" required value={formData.fechaInscripcionFin} onChange={e => setFormData(p => ({ ...p, fechaInscripcionFin: e.target.value }))} />
                  <FloatingInput id="curso_fecha" label="Inicio del curso" type="date" required value={formData.fecha} onChange={e => setFormData(p => ({ ...p, fecha: e.target.value }))} />
                  <FloatingInput id="curso_fecha_fin" label="Fin del curso" type="date" required value={formData.fechaFin} onChange={e => setFormData(p => ({ ...p, fechaFin: e.target.value }))} />
                  <FloatingInput id="curso_hora_inicio" label="Hora de inicio" type="time" required value={formData.horaInicio || ''} onChange={e => setFormData(p => ({ ...p, horaInicio: e.target.value }))} />
                  <FloatingInput id="curso_hora_fin" label="Hora de fin" type="time" required value={formData.horaFin || ''} onChange={e => setFormData(p => ({ ...p, horaFin: e.target.value }))} />
                  <FloatingInput id="curso_capacidad" label="Capacidad" type="number" min={selectedCurso?.inscritos || 1} step="1" required value={formData.capacidad} onChange={e => setFormData(p => ({ ...p, capacidad: e.target.value }))} />
                  <FloatingInput id="curso_costo" label="Costo de inscripción" type="number" min="0" step="0.01" value={formData.costo ?? 0} onChange={e => setFormData({ ...formData, costo: e.target.value })} />
                  <div className="sm:col-span-4"><FloatingInput id="curso_lugar" label="Lugar" required value={formData.lugar} onChange={e => setFormData({ ...formData, lugar: e.target.value })} /></div>

                </div>
              </fieldset>

              <fieldset className="border border-slate-200 rounded-xl p-3 dark:border-[var(--border-strong)]">
                <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-2">INSTRUCTOR DEL CURSO</legend>
                <div className="grid gap-2.5 sm:grid-cols-4">
                  <div className="sm:col-span-4">
                    {formData.idInstructor || formData.instructor ? (
                      <div className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[10rem_1fr_auto]">
                        <FloatingInput id="curso_instructor_dni" label="DNI" value={formData.instructorDni || ''} readOnly inputClassName="font-mono" />
                        <FloatingInput id="curso_instructor_nombre" label="Nombres y apellidos" value={formData.instructor || ''} readOnly />
                        <button type="button" onClick={quitarInstructor} title="Cambiar instructor" className="h-[42px] cursor-pointer rounded-lg px-2.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 dark:hover:bg-rose-950/60">
                          ✕ Cambiar
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={8}
                            placeholder="DNI del instructor (8 dígitos)"
                            value={instructorBusqueda}
                            onChange={(e) => { setInstructorBusqueda(e.target.value.replace(/\D/g, '').slice(0, 8)); setInstructorNoEncontrado(false) }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarInstructor() } }}
                            className="h-[42px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={buscarInstructor}
                            disabled={buscandoInstructor}
                            aria-label="Buscar instructor por DNI"
                            title="Buscar por DNI"
                            className="grid size-[42px] shrink-0 cursor-pointer place-items-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                          >
                            {buscandoInstructor
                              ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                              : <Icon name="search" className="size-4" />}
                          </button>
                        </div>
                        {instructorNoEncontrado && (
                          <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                            <span>Ese DNI no está registrado en Personas.</span>
                            <button type="button" onClick={() => abrirRegistroInstructor(instructorBusqueda)} className="cursor-pointer rounded-lg bg-blue-600 px-3 py-1.5 font-bold text-white transition hover:bg-blue-700">
                              Registrar persona con DNI {instructorBusqueda}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </fieldset>

              <fieldset className="border border-slate-200 rounded-xl p-3 dark:border-[var(--border-strong)]">
                <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white px-2">DETALLES DEL CARNET DEL CURSO</legend>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="sm:col-span-2"><FloatingInput id="curso_resolucion" label="Resolución N°" maxLength={150} inputClassName="font-mono uppercase" value={formData.resolucion || ''} onChange={e => setFormData({ ...formData, resolucion: e.target.value.toUpperCase() })} /></div>
                  <FloatingInput id="curso_carnet_expedicion" label="Expedición del carnet" type="date" readOnly value={formData.fechaFin || ''} />
                  <FloatingInput id="curso_carnet_vencimiento" label="Vencimiento del carnet" type="date" readOnly value={masUnAnio(formData.fechaFin)} />
                </div>
              </fieldset>
            </div>
              <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-5 py-3 dark:border-[var(--border)]">
                <BotonCancelar onClick={() => setIsModalOpen(false)} />
                <BotonGuardar>
                  Guardar Curso
                </BotonGuardar>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* El registro rápido de la persona debe quedar por encima del formulario del curso */}
      {modalRegistroInstructor && <div className="relative z-[70]">{modalRegistroInstructor}</div>}
    </div>
  )
}
export default CursosSeguridad
