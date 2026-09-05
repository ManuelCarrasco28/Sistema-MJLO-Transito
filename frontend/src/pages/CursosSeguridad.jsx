import { useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { initialCursos } from '../data/mockData'

export function CursosSeguridad() {
  const [cursos, setCursos] = useState(initialCursos || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')

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

  const handleDelete = (id) => {
    if (window.confirm('¿Estás seguro de eliminar este curso?')) {
      setCursos(cursos.filter(c => c.id !== id))
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    if (selectedCurso) {
      setCursos(cursos.map(c => c.id === selectedCurso.id ? { ...formData, id: c.id } : c))
    } else {
      setCursos([{ ...formData, id: Date.now(), inscritos: 0 }, ...cursos])
    }
    setIsModalOpen(false)
  }

  const totalCursos = cursos.length
  const cursosActivos = cursos.filter(c => c.estado === 'ACTIVO' || c.estado === 'PROGRAMADO').length
  const totalInscritos = cursos.reduce((acc, c) => acc + (c.inscritos || 0), 0)
  const cursosFinalizados = cursos.filter(c => c.estado === 'FINALIZADO').length

  const filteredCursos = cursos.filter((c) => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      c.codigo?.toLowerCase().includes(search) ||
      c.titulo?.toLowerCase().includes(search) ||
      c.instructor?.toLowerCase().includes(search) ||
      c.lugar?.toLowerCase().includes(search)

    const matchesEstado = filterEstado === 'TODOS' || c.estado === filterEstado
    const matchesTipo = filterTipo === 'TODOS' || c.tipo === filterTipo
    return matchesSearch && matchesEstado && matchesTipo
  })

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
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
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-bold text-purple-800 dark:bg-purple-950/80 dark:text-purple-300">
                {filteredCursos.length} Programados
              </span>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              Programa de educación vial obligatoria y certificación municipal (CERTICAV).
            </p>
          </div>
        </div>

        <button onClick={handleOpenCreateModal} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-purple-600/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-600/30 active:scale-95 cursor-pointer">
          <span className="text-lg leading-none">+</span>
          <span>Programar Curso</span>
        </button>
      </div>

      {/* Tarjetas de Indicadores Rápidos (KPIs) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Cursos */}
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

        {/* Cursos Activos */}
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

        {/* Total Inscritos */}
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

        {/* Cursos Finalizados */}
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

      {/* Contenido Principal / Tabla */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        {/* Barra de Filtros y Búsqueda */}
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
          </div>
        </div>

        {/* Sub-header Contador */}
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

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800/50 dark:bg-[#0f172a] dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">CÓDIGO / TIPO</th>
                <th className="px-5 py-3.5 whitespace-nowrap">TÍTULO DEL CURSO</th>
                <th className="px-5 py-3.5 whitespace-nowrap">FECHA PROGRAMADA</th>
                <th className="px-5 py-3.5 whitespace-nowrap">INSCRITOS / CAPACIDAD</th>
                <th className="px-5 py-3.5 whitespace-nowrap">INSTRUCTOR / LUGAR</th>
                <th className="px-5 py-3.5 whitespace-nowrap">ESTADO</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800/50 dark:bg-[#0f172a]">
              {filteredCursos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <p className="text-4xl mb-2">🎓</p>
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron cursos registrados</p>
                  </td>
                </tr>
              ) : (
                filteredCursos.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-purple-50/30 dark:hover:bg-slate-800/40">
                    {/* Código / Tipo */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900 dark:text-white">{c.codigo}</p>
                      <span className="mt-1 inline-block rounded-md bg-purple-100/70 px-2 py-0.5 text-[10px] font-bold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                        {c.tipoLabel || 'CERTICAV (Capacitación)'}
                      </span>
                    </td>

                    {/* Título del Curso */}
                    <td className="px-5 py-4 min-w-[260px]">
                      <p className="font-bold text-slate-900 dark:text-white">{c.titulo}</p>
                      <p className="text-xs text-slate-500 line-clamp-1 dark:text-slate-400">
                        {c.descripcion || 'Educación Vial Obligatoria para Conductores'}
                      </p>
                    </td>

                    {/* Fecha Programada */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{c.fecha}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {c.horario || '09:00 AM - 12:00 PM'}
                      </p>
                    </td>

                    {/* Inscritos / Capacidad */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900 dark:text-white">
                        {c.inscritos || 0} / {c.capacidad || 50}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        PARTICIPANTES
                      </p>
                    </td>

                    {/* Instructor / Lugar */}
                    <td className="px-5 py-4 min-w-[200px]">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{c.instructor || 'Ing. Fernando Ramos'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{c.lugar || 'Auditorio Municipal JLO'}</p>
                    </td>

                    {/* Estado */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      {c.estado === 'ACTIVO' || c.estado === 'PROGRAMADO' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400">
                          <span className="size-1.5 rounded-full bg-emerald-600" />
                          PROGRAMADO
                        </span>
                      ) : c.estado === 'EN_CURSO' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-extrabold text-sky-800 dark:bg-sky-950/60 dark:text-sky-400">
                          <span className="size-1.5 rounded-full bg-sky-600" />
                          EN CURSO
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-800 dark:bg-amber-950/60 dark:text-amber-400">
                          <span className="size-1.5 rounded-full bg-amber-600" />
                          FINALIZADO
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setSelectedCurso(c); setIsDetailModalOpen(true); }} className="rounded-full p-2 bg-purple-50 text-purple-600 hover:bg-purple-100 dark:bg-purple-950/60 dark:text-purple-400 transition-colors cursor-pointer" title="Ver Detalles">
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button onClick={() => handleOpenEditModal(c)} className="rounded-full p-2 bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/60 dark:text-amber-400 transition-colors cursor-pointer" title="Editar Curso">
                          <Icon name="pencil" className="size-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="rounded-full p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 transition-colors cursor-pointer" title="Eliminar Curso">
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
      </div>
      {/* Modales */}
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
                  <select required value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="PROGRAMADO">PROGRAMADO</option>
                    <option value="EN_CURSO">EN CURSO</option>
                    <option value="FINALIZADO">FINALIZADO</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Título del Curso *</label>
                <input type="text" required value={formData.titulo} onChange={e => setFormData({...formData, titulo: e.target.value})} placeholder="Ej. Seguridad Vial para Mototaxis" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Fecha *</label>
                  <input type="date" required value={formData.fecha} onChange={e => setFormData({...formData, fecha: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Horario *</label>
                  <input type="text" required value={formData.horario} onChange={e => setFormData({...formData, horario: e.target.value})} placeholder="Ej. 09:00 AM - 12:00 PM" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Instructor *</label>
                  <input type="text" required value={formData.instructor} onChange={e => setFormData({...formData, instructor: e.target.value})} placeholder="Ej. Ing. Juan Pérez" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Lugar *</label>
                  <input type="text" required value={formData.lugar} onChange={e => setFormData({...formData, lugar: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-purple-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
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