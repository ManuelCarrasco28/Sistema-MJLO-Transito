import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'
import { CarnetCursoVialPrint } from '../components/documentos/TarjetaOperatividadPrint'
import { exportToExcel } from '../utils/exportToExcel'

export function CursosSeguridad() {
  const cached = getCachedData('/cursos')
  const [cursos, setCursos] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchAprobados, setSearchAprobados] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [activeView, setActiveView] = useState('CURSOS')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedCurso, setSelectedCurso] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [formData, setFormData] = useState({
    codigo: '', titulo: '', descripcion: '', fecha: '', horario: '',
    instructor: '', lugar: '', capacidad: 50, estado: 'PROGRAMADO', tipo: 'SEGURIDAD_VIAL'
  })

  const handleOpenCreateModal = () => {
    setFormData({
      codigo: `CUR-2026-${String(cursos.length + 1).padStart(3, '0')}`,
      titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0],
      horario: '09:00 AM - 12:00 PM', instructor: '', lugar: 'Auditorio Municipal JLO',
      capacidad: 50, estado: 'PROGRAMADO', tipo: 'SEGURIDAD_VIAL'
    })
    setSelectedCurso(null)
    setIsModalOpen(true)
  }

  const [printCurso, setPrintCurso] = useState(null)
  const [printAprobado, setPrintAprobado] = useState(null)

  const handlePrintBatch = (curso) => {
    if (!curso.participantes || curso.participantes.length === 0) {
      alert('No hay participantes inscritos en este curso para imprimir.');
      return;
    }
    setPrintCurso(curso);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintCurso(null), 500);
    }, 300);
  }

  const handlePrintSingle = (aprobado) => {
    setPrintAprobado(aprobado);
    setTimeout(() => {
      window.print();
      setTimeout(() => setPrintAprobado(null), 500);
    }, 300);
  }

  const handleOpenEditModal = (curso) => {
    setFormData({ ...curso })
    setSelectedCurso(curso)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este curso?')) {
      try {
        await apiFetch(`/cursos/${id}`, { method: 'DELETE' })
        setCursos(cursos.filter(c => c.id !== id))
      } catch (err) {
        console.error('Error eliminando curso:', err)
        alert('Error al eliminar curso')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()

    if (!formData.titulo.trim() || !formData.fecha) {
      alert('Por favor completa los campos requeridos.')
      return
    }

    if (formData.capacidad < 1 || formData.capacidad > 100) {
      alert('El aforo del curso debe ser entre 1 y 100 personas.')
      return
    }

    const courseDate = new Date(formData.fecha + 'T00:00:00')
    const today = new Date()
    today.setHours(0,0,0,0)
    if (courseDate < today && !selectedCurso) {
      alert('La fecha del nuevo curso no puede estar en el pasado.')
      return
    }

    const payload = {
      ...formData,
      cuposTotales: formData.capacidad,
      costo: formData.costo || 0
    }
    try {
      if (selectedCurso) {
        const response = await apiFetch(`/cursos/${selectedCurso.id}`, {
          method: 'PUT',
          body: payload
        })
        if (response.ok) {
          setCursos(cursos.map(c => c.id === selectedCurso.id ? { ...formData, id: c.id } : c))
        }
      } else {
        const response = await apiFetch('/cursos', {
          method: 'POST',
          body: payload
        })
        const result = await response.json()
        if (response.ok && result.data) {
          const newCurso = {
            ...result.data,
            capacidad: result.data.cuposTotales,
            inscritos: result.data.cuposInscritos,
            tipo: formData.tipo
          }
          setCursos([newCurso, ...cursos])
        }
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error guardando curso:', err)
      alert('Error al guardar el curso')
    }
  }

  const totalCursos = cursos.length
  const cursosActivos = cursos.filter(c => c.estado === 'ACTIVO' || c.estado === 'PROGRAMADO' || c.estado === 'ABIERTO').length
  const totalInscritos = cursos.reduce((acc, c) => acc + (c.inscritos || 0), 0)
  const cursosFinalizados = cursos.filter(c => c.estado === 'FINALIZADO').length

  const filteredCursos = cursos.filter((c) => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      c.codigo?.toLowerCase().includes(search) ||
      c.titulo?.toLowerCase().includes(search) ||
      c.instructor?.toLowerCase().includes(search) ||
      c.lugar?.toLowerCase().includes(search)

    const matchesEstado = filterEstado === 'TODOS' ||
      (filterEstado === 'ACTIVO' ? (c.estado === 'ACTIVO' || c.estado === 'PROGRAMADO' || c.estado === 'ABIERTO') : c.estado === filterEstado)
    const matchesTipo = filterTipo === 'TODOS' || c.tipo === filterTipo
    return matchesSearch && matchesEstado && matchesTipo
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado, filterTipo])

  const paginatedCursos = filteredCursos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleExportExcel = () => {
    exportToExcel({
      filename: `Cursos_Seguridad_Vial_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: 'Cursos',
      title: 'PROGRAMA MUNICIPAL DE EDUCACIÓN Y SEGURIDAD VIAL',
      subtitle: 'Capacitación y Emisión de Carnets para Conductores y Transportistas',
      metadata: [
        { label: 'Tipo', value: filterTipo },
        { label: 'Estado', value: filterEstado },
        { label: 'Total Cursos', value: String(filteredCursos.length) }
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
      data: filteredCursos
    })
  }

  useEffect(() => {
    setLoadError('')
    apiFetch('/cursos')
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        const fetchedCursos = (data.data || []).map(c => ({
          ...c,
          capacidad: c.cuposTotales,
          inscritos: c.cuposInscritos,
          tipo: c.tipo || 'SEGURIDAD_VIAL'
        }))
        setCursos(fetchedCursos)
        setCachedData('/cursos', fetchedCursos)
      })
      .catch(() => setLoadError('No se pudo cargar el registro de cursos viales.'))
      .finally(() => setIsLoading(false))
  }, [])

  const aprobados = cursos.flatMap(c => 
    (c.estado === 'FINALIZADO' && c.participantes) 
      ? c.participantes
          .filter(p => p.estado === 'APROBADO' || p.asistio)
          .map(p => ({ ...p, curso: c })) 
      : []
  )

  const filteredAprobados = searchAprobados 
    ? aprobados.filter(p => 
        (p.dni && p.dni.includes(searchAprobados)) || 
        (p.nombres && p.nombres.toLowerCase().includes(searchAprobados.toLowerCase())) ||
        (p.apellido_paterno && p.apellido_paterno.toLowerCase().includes(searchAprobados.toLowerCase()))
      )
    : aprobados

  const paginatedAprobados = filteredAprobados.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  return (
    <div className="space-y-6">
      {loadError && <PageLoadError message={loadError} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 text-white shadow-lg shadow-purple-600/25">
            <Icon name="course" className="size-6" />
          </span>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Cursos de Seguridad Vial
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              Programa municipal de capacitación y seguridad vial.
            </p>
          </div>
        </div>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">TOTAL CURSOS</span>
            <span className="grid size-8 place-items-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 font-bold text-xs">🎓</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{totalCursos}</p>
            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">Gestión 2026</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Cursos registrados</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">CURSOS ACTIVOS</span>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">🏫</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{cursosActivos}</p>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">Vacantes Disponibles</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Listos para inscripción</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">TOTAL INSCRITOS</span>
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 font-bold text-xs">👥</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{totalInscritos}</p>
            <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">Participantes</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Conductores en capacitación</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">FINALIZADOS</span>
            <span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold text-xs">✓</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{cursosFinalizados}</p>
            <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-400">Certificados</span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Capacitaciones concluidas</p>
        </div>
      </div>

      <div className="mb-6 flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-[#0f172a]">
        <button
          onClick={() => setActiveView('CURSOS')}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${activeView === 'CURSOS' ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
        >
          Cursos programados
        </button>
        <button
          onClick={() => setActiveView('APROBADOS')}
          className={`rounded-xl px-4 py-2 text-sm font-black transition ${activeView === 'APROBADOS' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'}`}
        >
          Registros de Carnet
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{aprobados.length}</span>
        </button>
      </div>

      {activeView === 'CURSOS' && (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">

        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, título del curso, instructor o lugar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-purple-200/80 bg-purple-50/20 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-purple-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-bold text-slate-700 outline-none transition focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="SEGURIDAD_VIAL">Seguridad Vial</option>
              <option value="MOTOTAXI">Transporte Menor (Mototaxis)</option>
              <option value="MANEJO_DEFENSIVO">Manejo Defensivo</option>
            </select>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-bold text-slate-700 outline-none transition focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">ACTIVO / PROGRAMADO</option>
              <option value="EN_CURSO">EN CURSO</option>
              <option value="FINALIZADO">FINALIZADO</option>
            </select>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-extrabold text-emerald-700 shadow-2xs hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Descargar padrón de cursos en Excel"
            >
              <Icon name="table" className="size-4" />
              <span>Exportar Excel</span>
            </button>

            <button onClick={handleOpenCreateModal} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-purple-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-600/30 active:scale-95 cursor-pointer whitespace-nowrap">
              <span className="text-base leading-none font-black">+</span>
              <span>Programar Curso</span>
            </button>
          </div>
        </div>


        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div>
            <span className="rounded-md bg-purple-100 px-1.5 py-0.5 font-bold text-purple-800 dark:bg-purple-950 dark:text-purple-300">
              Mostrando {filteredCursos.length}
            </span>{" "}
            de {cursos.length} cursos registrados
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            Programa Municipal de Seguridad Vial - 2026
          </div>
        </div>


        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800/50 dark:bg-[#0f172a] dark:text-slate-400">
              <tr>
                <th className="px-3 py-3 whitespace-nowrap">CÓDIGO / TIPO</th>
                <th className="px-3 py-3">TÍTULO DEL CURSO</th>
                <th className="px-3 py-3 whitespace-nowrap">FECHA PROGRAMADA</th>
                <th className="px-3 py-3 whitespace-nowrap">INSCRITOS / CAPACIDAD</th>
                <th className="px-3 py-3">INSTRUCTOR / LUGAR</th>
                <th className="px-3 py-3 whitespace-nowrap">ESTADO</th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-[#0f172a] px-3 py-3 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800/50 dark:bg-[#0f172a]">
              {isLoading && cursos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3 py-3">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-44 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-800/60" />
                      </div>
                    </td>
                    <td className="px-3 py-3"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3 py-3"><div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#0f172a] px-3 py-3 text-right border-l border-slate-100 dark:border-slate-800"><div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : filteredCursos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <p className="text-4xl mb-2">🎓</p>
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron cursos registrados</p>
                  </td>
                </tr>
              ) : (
                paginatedCursos.map((c) => (
                  <tr key={c.id} className="group transition-colors hover:bg-purple-50/30 dark:hover:bg-slate-800/40">

                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="font-bold text-slate-900 dark:text-white">{c.codigo}</p>
                      <span className="mt-0.5 inline-block rounded-md bg-purple-100/70 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                        {c.tipoLabel || 'SEGURIDAD VIAL'}
                      </span>
                    </td>


                    <td className="px-3 py-3">
                      <div className="max-w-[190px] lg:max-w-[230px]">
                        <p className="font-bold text-slate-900 dark:text-white truncate" title={c.titulo}>{c.titulo}</p>
                        <p className="text-xs text-slate-500 truncate dark:text-slate-400" title={c.descripcion}>
                          {c.descripcion || 'Educación Vial Obligatoria para Conductores'}
                        </p>
                      </div>
                    </td>


                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{c.fecha}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {c.horario || '09:00 AM - 12:00 PM'}
                      </p>
                    </td>


                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {c.inscritos || 0} / {c.capacidad || 50}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Inscritos
                      </p>
                    </td>


                    <td className="px-3 py-3">
                      <div className="max-w-[150px] lg:max-w-[180px]">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={c.instructor}>{c.instructor || 'Ing. Fernando Ramos'}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate" title={c.lugar}>{c.lugar || 'Auditorio Municipal JLO'}</p>
                      </div>
                    </td>


                    <td className="px-3 py-3 whitespace-nowrap">
                      {c.estado === 'ACTIVO' || c.estado === 'PROGRAMADO' || c.estado === 'ABIERTO' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-600" />
                          PROGRAMADO
                        </span>
                      ) : c.estado === 'EN_CURSO' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-extrabold text-sky-800 dark:bg-sky-950/60 dark:text-sky-400">
                          <span className="size-1.5 rounded-full bg-sky-600" />
                          EN CURSO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-extrabold text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                          <span className="size-1.5 rounded-full bg-amber-600" />
                          FINALIZADO
                        </span>
                      )}
                    </td>


                    <td className="sticky right-0 z-10 bg-white group-hover:bg-purple-50/40 dark:bg-[#0f172a] dark:group-hover:bg-slate-800/60 px-3 py-3 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                      <div className="flex items-center justify-end gap-1">
                        {c.estado === 'FINALIZADO' && (
                          <button onClick={() => handlePrintBatch(c)} className="rounded-lg p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer" title="Descargar Carnets (Lote)">
                            <Icon name="print" className="size-4" />
                          </button>
                        )}
                        <button onClick={() => { setSelectedCurso(c); setIsDetailModalOpen(true); }} className="rounded-lg p-1.5 bg-purple-50 text-purple-600 hover:bg-purple-500 hover:text-white dark:bg-purple-950/60 dark:text-purple-400 dark:hover:bg-purple-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer" title="Ver Detalles">
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button onClick={() => handleOpenEditModal(c)} className="rounded-lg p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer" title="Editar Curso">
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="rounded-lg p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-950/60 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer" title="Eliminar Curso">
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
          totalItems={filteredCursos.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size)
            setCurrentPage(1)
          }}
        />
      </div>
      )}

      {activeView === 'APROBADOS' && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
          {/* Controls Aprobados */}
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 dark:border-slate-800/60">
            <div className="relative flex-1">
              <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por DNI o Nombres..."
                value={searchAprobados}
                onChange={(e) => setSearchAprobados(e.target.value)}
                className="w-full rounded-xl border border-emerald-200/80 bg-emerald-50/20 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-emerald-400"
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-5 py-4">Conductor</th>
                  <th className="px-5 py-4">DNI / Licencia</th>
                  <th className="px-5 py-4">Curso Válido</th>
                  <th className="px-5 py-4">Expedición / Venc.</th>
                  <th className="px-5 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {paginatedAprobados.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="rounded-full bg-slate-100 p-4 dark:bg-slate-800">
                          <Icon name="file-check" className="size-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">No hay conductores aprobados</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginatedAprobados.map((p, i) => {
                    const dt = new Date(p.curso.fecha);
                    dt.setFullYear(dt.getFullYear() + 1);
                    const fechaVencimiento = dt.toISOString().split('T')[0];

                    return (
                      <tr key={i} className="group transition-colors hover:bg-emerald-50/30 dark:hover:bg-slate-800/40">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{p.nombres} {p.apellido_paterno} {p.apellido_materno}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{p.dni}</p>
                          <p className="text-[10px] font-semibold text-slate-500">LIC. {p.licencia || 'S/N'}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{p.curso.codigo}</p>
                          <p className="text-[10px] font-semibold text-slate-500 max-w-[150px] truncate">{p.curso.titulo}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200">{p.curso.fecha}</p>
                          <p className="text-[10px] font-semibold text-slate-500">Vence: {fechaVencimiento}</p>
                        </td>
                        <td className="sticky right-0 z-10 bg-white group-hover:bg-emerald-50/40 dark:bg-[#0f172a] dark:group-hover:bg-slate-800/60 px-3 py-3 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handlePrintSingle(p)} className="rounded-lg p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-950/60 dark:text-emerald-400 dark:hover:bg-emerald-500 dark:hover:text-white transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer" title="Descargar Carnet Individual">
                              <Icon name="print" className="size-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredAprobados.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(size) => {
              setItemsPerPage(size)
              setCurrentPage(1)
            }}
          />
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">
                  {selectedCurso ? 'Editar Curso de Seguridad' : 'Programar Nuevo Curso'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Código</label>
                  <input type="text" value={formData.codigo} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Estado</label>
                  <select required value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="PROGRAMADO">PROGRAMADO</option>
                    <option value="EN_CURSO">EN CURSO</option>
                    <option value="FINALIZADO">FINALIZADO</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Título del Curso *</label>
                <input type="text" required value={formData.titulo} onChange={e => setFormData({ ...formData, titulo: e.target.value })} placeholder="Ej. Seguridad Vial para Mototaxis" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Fecha *</label>
                  <input type="date" required value={formData.fecha} onChange={e => {
                    const newDate = e.target.value;
                    
                    const localDate = new Date();
                    const year = localDate.getFullYear();
                    const month = String(localDate.getMonth() + 1).padStart(2, '0');
                    const day = String(localDate.getDate()).padStart(2, '0');
                    const today = `${year}-${month}-${day}`;
                    
                    let autoEstado = formData.estado;
                    if (newDate > today) autoEstado = 'PROGRAMADO';
                    else if (newDate === today) autoEstado = 'EN_CURSO';
                    else if (newDate < today) autoEstado = 'FINALIZADO';
                    
                    setFormData({ ...formData, fecha: newDate, estado: autoEstado });
                  }} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Horario *</label>
                  <input type="text" required value={formData.horario} onChange={e => setFormData({ ...formData, horario: e.target.value })} placeholder="Ej. 09:00 AM - 12:00 PM" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Instructor *</label>
                  <input type="text" required value={formData.instructor} onChange={e => setFormData({ ...formData, instructor: e.target.value })} placeholder="Ej. Ing. Juan Pérez" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Lugar *</label>
                  <input type="text" required value={formData.lugar} onChange={e => setFormData({ ...formData, lugar: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-purple-700 cursor-pointer">Guardar Curso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedCurso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">{selectedCurso.titulo}</h3>
                <p className="text-xs text-slate-500">{selectedCurso.codigo}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/50">
                <p><strong>Fecha:</strong> {selectedCurso.fecha}</p>
                <p><strong>Horario:</strong> {selectedCurso.horario}</p>
                <p><strong>Instructor:</strong> {selectedCurso.instructor}</p>
                <p><strong>Lugar:</strong> {selectedCurso.lugar}</p>
                <p><strong>Inscritos:</strong> {selectedCurso.inscritos || (selectedCurso.participantes?.length || 0)} / {selectedCurso.capacidad}</p>
                <p><strong>Estado:</strong> <span className="font-bold text-purple-600 dark:text-purple-400">{selectedCurso.estado}</span></p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <strong className="text-base text-slate-800 dark:text-slate-200">Participantes</strong>
                  
                  {/* Formulario de inscripción rápida */}
                  {selectedCurso.estado !== 'FINALIZADO' && (
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      id="nuevoDniParticipante"
                      placeholder="DNI del conductor..." 
                      className="w-40 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                      maxLength={8}
                    />
                    <button 
                      type="button"
                      onClick={async () => {
                        const dniInput = document.getElementById('nuevoDniParticipante');
                        const dni = dniInput.value.trim();
                        if (!dni) return alert('Ingrese un DNI');
                        
                        try {
                          const res = await apiFetch(`/cursos/${selectedCurso.id}/participantes`, {
                            method: 'POST',
                            body: { dni }
                          });
                          const result = await res.json();
                          
                          if (!res.ok) throw new Error(result.messages?.error || 'Error al inscribir');
                          
                          alert('Participante inscrito correctamente');
                          dniInput.value = '';
                          
                          // Actualizar estado local
                          const updatedParticipantes = [...(selectedCurso.participantes || []), result.data];
                          const updatedCurso = { ...selectedCurso, participantes: updatedParticipantes, inscritos: updatedParticipantes.length };
                          setSelectedCurso(updatedCurso);
                          setCursos(cursos.map(c => c.id === selectedCurso.id ? updatedCurso : c));
                        } catch (err) {
                          alert(err.message);
                        }
                      }}
                      className="rounded-lg bg-purple-600 px-3 py-1.5 text-sm font-bold text-white shadow-md hover:bg-purple-700 cursor-pointer"
                    >
                      Inscribir
                    </button>
                  </div>
                  )}
                </div>

                {(!selectedCurso.participantes || selectedCurso.participantes.length === 0) ? (
                  <p className="text-sm text-slate-500 italic text-center py-4 bg-slate-50 dark:bg-slate-800/30 rounded-xl">No hay participantes inscritos en este curso.</p>
                ) : (
                  <ul className="space-y-3 max-h-64 overflow-y-auto pr-2">
                    {selectedCurso.participantes.map((p, i) => {
                      const estadoReal = selectedCurso.estado === 'FINALIZADO' 
                        ? (p.asistio ? 'APROBADO' : 'DESAPROBADO') 
                        : (p.estado || 'PENDIENTE');
                        
                      return (
                      <li key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 gap-3">
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {p.nombres} {p.apellido_paterno} {p.apellido_materno}
                          </p>
                          <p className="text-xs text-slate-500 font-semibold">DNI: {p.dni || p.numero}</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          {/* Controles de Asistencia y Estado */}
                          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={!!p.asistio}
                                onChange={async (e) => {
                                  const asistio = e.target.checked ? 1 : 0;
                                  try {
                                    const res = await apiFetch(`/cursos/${selectedCurso.id}/participantes/${p.dni || p.numero}`, {
                                      method: 'PUT',
                                      body: { asistio }
                                    });
                                    if (!res.ok) throw new Error('Error al guardar asistencia');
                                    
                                    const updatedParticipantes = [...selectedCurso.participantes];
                                    updatedParticipantes[i] = { ...p, asistio };
                                    const updatedCurso = { ...selectedCurso, participantes: updatedParticipantes };
                                    setSelectedCurso(updatedCurso);
                                    setCursos(cursos.map(c => c.id === selectedCurso.id ? updatedCurso : c));
                                  } catch (err) {
                                    alert(err.message);
                                  }
                                }}
                                className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                              />
                              Asistió
                            </label>
                            
                            <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                            
                            <select 
                              value={p.estado || 'INSCRITO'}
                              onChange={async (e) => {
                                const nuevoEstado = e.target.value;
                                try {
                                  const res = await apiFetch(`/cursos/${selectedCurso.id}/participantes/${p.dni || p.numero}`, {
                                    method: 'PUT',
                                    body: { estado: nuevoEstado }
                                  });
                                  if (!res.ok) throw new Error('Error al guardar estado');
                                  
                                  const updatedParticipantes = [...selectedCurso.participantes];
                                  updatedParticipantes[i] = { ...p, estado: nuevoEstado };
                                  const updatedCurso = { ...selectedCurso, participantes: updatedParticipantes };
                                  setSelectedCurso(updatedCurso);
                                  setCursos(cursos.map(c => c.id === selectedCurso.id ? updatedCurso : c));
                                } catch (err) {
                                  alert(err.message);
                                }
                              }}
                              className={`text-xs font-bold bg-transparent outline-none cursor-pointer ${
                                (p.estado === 'APROBADO' || estadoReal === 'APROBADO') ? 'text-emerald-600 dark:text-emerald-400' : 
                                (p.estado === 'DESAPROBADO' || estadoReal === 'DESAPROBADO') ? 'text-rose-600 dark:text-rose-400' : 
                                'text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <option value="INSCRITO">Inscrito</option>
                              <option value="CONFIRMADO">Confirmado</option>
                              <option value="APROBADO">Aprobado</option>
                              <option value="DESAPROBADO">Desaprobado</option>
                            </select>
                          </div>
                          
                          <span className="text-[10px] font-black uppercase w-20 text-center">
                            {estadoReal === 'APROBADO' ? (
                              <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-md block">Aprobado</span>
                            ) : estadoReal === 'DESAPROBADO' ? (
                              <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-md block">Desaprobado</span>
                            ) : estadoReal === 'CONFIRMADO' ? (
                              <span className="text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded-md block">Confirmado</span>
                            ) : estadoReal === 'INSCRITO' ? (
                              <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-md block">Inscrito</span>
                            ) : (
                              <span className="text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md block">{estadoReal}</span>
                            )}
                          </span>
                        </div>
                      </li>
                    )})}
                  </ul>
                )}
              </div>
            </div>
            
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-end dark:border-slate-800 dark:bg-slate-900">
              <button onClick={() => setIsDetailModalOpen(false)} className="rounded-xl bg-slate-900 px-6 py-2 text-sm font-extrabold text-white hover:bg-slate-800 cursor-pointer shadow-md">Cerrar</button>
            </div>
          </div>
        </div>
      )}
      {/* SECCIÓN OCULTA PARA IMPRESIÓN OFICIAL (LOTE) */}
      {printCurso && (
        <div id="batch-print-container" className="hidden print:flex absolute inset-0 bg-white z-50 flex-col gap-10 bg-transparent m-0 p-0">
          <style>{`
            @media print {
              #batch-print-container #seccion-impresion {
                position: relative !important;
                page-break-after: always;
                page-break-inside: avoid;
              }
            }
          `}</style>
          {printCurso.participantes
            .filter(p => printCurso.estado === 'FINALIZADO' ? (p.estado === 'APROBADO' || p.asistio) : true)
            .map((p, i) => {
              const dt = new Date(printCurso.fecha);
              dt.setFullYear(dt.getFullYear() + 1);
              const fechaVencimiento = dt.toISOString().split('T')[0];

              return (
                <div key={i}>
                  <CarnetCursoVialPrint data={{
                    codigo: printCurso.codigo,
                    apellidos: `${p.apellido_paterno || ''} ${p.apellido_materno || ''}`.trim(),
                    nombres: p.nombres || '',
                    dni: p.dni || '',
                    licencia: p.licencia || '',
                    fotoUrl: p.fotoUrl || '',
                    fechaExpedicion: printCurso.fecha,
                    fechaExpiracion: fechaVencimiento
                  }} />
                </div>
              );
            })}
        </div>
      )}
      {printAprobado && (
        <div id="single-print-container" className="hidden print:flex absolute inset-0 bg-white z-50 flex-col bg-transparent m-0 p-0">
          <style>{`
            @media print {
              #single-print-container #seccion-impresion {
                position: relative !important;
              }
            }
          `}</style>
          <CarnetCursoVialPrint data={{
            codigo: printAprobado.curso.codigo,
            apellidos: `${printAprobado.apellido_paterno || ''} ${printAprobado.apellido_materno || ''}`.trim(),
            nombres: printAprobado.nombres || '',
            dni: printAprobado.dni || '',
            licencia: printAprobado.licencia || '',
            fotoUrl: printAprobado.fotoUrl || '',
            fechaExpedicion: printAprobado.curso.fecha,
            fechaExpiracion: (() => {
              const dt = new Date(printAprobado.curso.fecha);
              dt.setFullYear(dt.getFullYear() + 1);
              return dt.toISOString().split('T')[0];
            })()
          }} />
        </div>
      )}
    </div>
  )
}
