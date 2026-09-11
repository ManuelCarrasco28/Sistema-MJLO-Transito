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
          tipo: c.tipo || 'SEGURIDAD_VIAL'
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
              Programa municipal de capacitación y seguridad vial.
            </p>
          </div>
        </div>
      </div>


      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1. TOTAL CURSOS */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-purple-800 p-5 text-white shadow-lg shadow-purple-600/20 transition-all hover:shadow-xl hover:shadow-purple-600/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-purple-100">Total Cursos</span>
            <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <Icon name="course" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black">{totalCursos}</p>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white">Gestión 2026</span>
          </div>
          <p className="mt-1 text-xs text-purple-100 font-medium">Cursos registrados</p>
        </div>

        {/* 2. CURSOS ACTIVOS */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 text-white shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-100">Cursos Activos</span>
            <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black">{cursosActivos}</p>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white">Vacantes Disponibles</span>
          </div>
        </div>

        {/* 3. TOTAL INSCRITOS */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 text-white shadow-lg shadow-indigo-500/20 transition-all hover:shadow-xl hover:shadow-indigo-500/30">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-100">Total Inscritos</span>
            <span className="grid size-9 place-items-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black">{totalInscritos}</p>
            <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-xs font-bold text-white">Conductores</span>
          </div>
        </div>

        {/* 4. FINALIZADOS */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#1B1536]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Finalizados</span>
            <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
               <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{cursosFinalizados}</p>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">Certificados</span>
          </div>
        </div>
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#1B1536]">

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
            <thead className="border-y border-slate-100 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800/50 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-3 py-3 whitespace-nowrap">CÓDIGO / TIPO</th>
                <th className="px-3 py-3">TÍTULO DEL CURSO</th>
                <th className="px-3 py-3 whitespace-nowrap">FECHA PROGRAMADA</th>
                <th className="px-3 py-3 whitespace-nowrap">INSCRITOS / CAPACIDAD</th>
                <th className="px-3 py-3">INSTRUCTOR / LUGAR</th>
                <th className="px-3 py-3 whitespace-nowrap">ESTADO</th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 px-3 py-3 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800/50 dark:bg-[#1B1536]">
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
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#1B1536] px-3 py-3 text-right border-l border-slate-100 dark:border-slate-800"><div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
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


                    <td className="sticky right-0 z-10 bg-white group-hover:bg-purple-50/40 dark:bg-[#1B1536] dark:group-hover:bg-slate-800/60 px-3 py-3 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                      <div className="flex items-center justify-end gap-1.5 pr-1">
                        <button onClick={() => { setSelectedCurso(c); setIsDetailModalOpen(true); }} className="flex size-8.5 items-center justify-center rounded-full bg-[#F3F1FB] text-[#6C4CF1] shadow-[0_4px_10px_rgba(108,76,241,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#6C4CF1]/30 dark:bg-[#6C4CF1]/20 dark:text-[#9A6CF7] cursor-pointer" title="Ver Detalles">
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button onClick={() => handleOpenEditModal(c)} className="flex size-8.5 items-center justify-center rounded-full bg-[#FFF2D9] text-[#E08712] shadow-[0_4px_10px_rgba(224,135,18,0.2)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#E08712]/30 dark:bg-amber-950/60 dark:text-amber-400 cursor-pointer" title="Editar Curso">
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="flex size-8.5 items-center justify-center rounded-full bg-[#FFE5EB] text-[#FF6F8E] shadow-[0_4px_10px_rgba(255,111,142,0.25)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#FF6F8E]/30 dark:bg-rose-950/60 dark:text-rose-400 cursor-pointer" title="Eliminar Curso">
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
