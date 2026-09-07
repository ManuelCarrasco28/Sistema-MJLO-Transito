import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function CursosSeguridad() {
  const cached = getCachedData('/cursos')
  const [cursos, setCursos] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedCurso, setSelectedCurso] = useState(null)
  const [formData, setFormData] = useState({
    codigo: '', titulo: '', descripcion: '', fecha: '', horario: '',
    instructor: '', lugar: '', capacidad: 50, estado: 'PROGRAMADO', tipo: 'CERTICAV'
  })

  const handleOpenCreateModal = () => {
    setFormData({
      codigo: `CUR-2026-${String(cursos.length + 1).padStart(3, '0')}`,
      titulo: '', descripcion: '', fecha: new Date().toISOString().split('T')[0],
      horario: '09:00 AM - 12:00 PM', instructor: '', lugar: 'Auditorio Municipal JLO',
      capacidad: 50, estado: 'PROGRAMADO', tipo: 'CERTICAV'
    })
    setSelectedCurso(null)
    setIsModalOpen(true)
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

  useEffect(() => {
    apiFetch('/cursos')
      .then(res => res.json())
      .then(data => {
        const fetchedCursos = (data.data || []).map(c => ({
          ...c,
          capacidad: c.cuposTotales,
          inscritos: c.cuposInscritos,
          tipo: 'CERTICAV'
        }))
        setCursos(fetchedCursos)
        setCachedData('/cursos', fetchedCursos)
      })
      .catch(() => { })
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6">

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
              Programa de educación vial obligatoria y certificación municipal (CERTICAV).
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
              <option value="CERTICAV">CERTICAV (Capacitación)</option>
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
            Programa Municipal CERTICAV - 2026
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
                        {c.tipoLabel || 'CERTICAV'}
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
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f172a] p-6">
            <h3 className="text-xl font-black mb-2 text-slate-800 dark:text-white">{selectedCurso.titulo}</h3>
            <p className="text-xs text-slate-500 mb-6">{selectedCurso.codigo}</p>
            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p><strong>Fecha:</strong> {selectedCurso.fecha}</p>
              <p><strong>Horario:</strong> {selectedCurso.horario}</p>
              <p><strong>Instructor:</strong> {selectedCurso.instructor}</p>
              <p><strong>Lugar:</strong> {selectedCurso.lugar}</p>
              <p><strong>Inscritos:</strong> {selectedCurso.inscritos} / {selectedCurso.capacidad}</p>
              <p><strong>Estado:</strong> {selectedCurso.estado}</p>

              {selectedCurso.participantes && selectedCurso.participantes.length > 0 && (
                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <strong className="block mb-3 text-slate-800 dark:text-slate-200">Participantes:</strong>
                  <ul className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    {selectedCurso.participantes.map((p, i) => {
                      const estadoReal = selectedCurso.estado === 'FINALIZADO' 
                        ? (p.asistio ? 'APROBADO' : 'DESAPROBADO') 
                        : (p.estado || 'PENDIENTE');
                        
                      return (
                      <li key={i} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {p.nombres} {p.apellido_paterno} {p.apellido_materno}
                        </span>
                        <span className="text-[10px] font-black uppercase">
                          {estadoReal === 'APROBADO' ? (
                            <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-1 rounded-md">Aprobado</span>
                          ) : estadoReal === 'DESAPROBADO' ? (
                            <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-1 rounded-md">Desaprobado</span>
                          ) : estadoReal === 'CONFIRMADO' ? (
                            <span className="text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-2 py-1 rounded-md">Confirmado</span>
                          ) : estadoReal === 'INSCRITO' ? (
                            <span className="text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-1 rounded-md">Inscrito</span>
                          ) : (
                            <span className="text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{estadoReal}</span>
                          )}
                        </span>
                      </li>
                    )})}
                  </ul>
                </div>
              )}
            </div>
            <div className="mt-8 flex justify-end">
              <button onClick={() => setIsDetailModalOpen(false)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 cursor-pointer">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}