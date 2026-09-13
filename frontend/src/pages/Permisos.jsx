import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function Permisos() {
  const cachedPermisos = getCachedData('/permisos')
  const cachedProcs = getCachedData('/procedimientos-admin')

  const [permisos, setPermisos] = useState(cachedPermisos || [])
  const [procedimientos, setProcedimientos] = useState(cachedProcs || [])
  const [isLoading, setIsLoading] = useState(!cachedPermisos)
  const [activeTab, setActiveTab] = useState('permisos')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  const [selectedPermiso, setSelectedPermiso] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

  useEffect(() => {
    Promise.all([
      apiFetch('/permisos').then((r) => r.json()).catch(() => ({ data: [] })),
      apiFetch('/procedimientos-admin').then((r) => r.json()).catch(() => ({ data: [] })),
    ])
      .then(([permRes, procRes]) => {
        const pData = permRes.data || []
        const prData = procRes.data || []
        setPermisos(pData)
        setProcedimientos(prData)
        setCachedData('/permisos', pData)
        setCachedData('/procedimientos-admin', prData)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }, [])

  const totalPermisos = permisos.length
  const vigentes = permisos.filter((p) => p.estado === 'VIGENTE').length
  const vencidos = permisos.filter((p) => p.estado === 'VENCIDO').length
  const totalTupa = procedimientos.length

  const filteredPermisos = permisos.filter((p) => {
    const s = searchTerm.toLowerCase()
    const matchSearch =
      p.numeroAutorizacion?.toLowerCase().includes(s) ||
      p.solicitante?.toLowerCase().includes(s) ||
      p.expedienteNumero?.toLowerCase().includes(s) ||
      p.zonaCirculacion?.toLowerCase().includes(s) ||
      p.procedimientoNombre?.toLowerCase().includes(s) ||
      p.solicitanteRuc?.toLowerCase().includes(s) ||
      p.solicitanteDni?.toLowerCase().includes(s)

    const matchEstado = filterEstado === 'TODOS' || p.estado === filterEstado

    return matchSearch && matchEstado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado, activeTab])

  const paginatedPermisos = filteredPermisos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleOpenDetail = (p) => {
    setSelectedPermiso(p)
    setIsDetailModalOpen(true)
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/30">
            <Icon name="permit" className="size-6" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
              Permisos y Autorizaciones
            </h1>
            <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
              Control de resoluciones subgerenciales de operación, tránsito excepcional y trámites TUPA.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-horizon dark:shadow-none transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111C44] dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Icon name="print" className="size-4 text-slate-500" />
            <span>Imprimir Padrón</span>
          </button>
          <span className="rounded-xl border border-violet-200/80 bg-violet-50 px-3.5 py-2 text-xs font-bold text-violet-700 shadow-xs dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300">
            Trámites TUPA 2026
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Autorizaciones
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
              <Icon name="permit" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {totalPermisos}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Resoluciones emitidas
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vigentes
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <Icon name="check" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
            {vigentes}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Con circulación autorizada
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Vencidos / Por Renovar
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <Icon name="clock" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-rose-600 dark:text-rose-400">
            {vencidos}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Requieren nuevo trámite
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white p-4.5 shadow-horizon dark:shadow-none dark:border-slate-800/80 dark:bg-[#111C44]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Procedimientos TUPA
            </span>
            <span className="grid size-8 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="document" className="size-4.5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {totalTupa}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Servicios administrativos activos
          </p>
        </div>
      </div>

      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('permisos')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition-all ${
            activeTab === 'permisos'
              ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="permit" className="size-4" />
          <span>Permisos de Circulación ({permisos.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('tupa')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-extrabold transition-all ${
            activeTab === 'tupa'
              ? 'border-violet-600 text-violet-600 dark:border-violet-400 dark:text-violet-400'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon name="document" className="size-4" />
          <span>Catálogo TUPA ({procedimientos.length})</span>
        </button>
      </div>

      {activeTab === 'permisos' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-horizon dark:shadow-none dark:border-slate-800 dark:bg-[#111C44] sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por resolución, solicitante, expediente o zona..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/10 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-200 dark:placeholder-slate-500 dark:focus:border-violet-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Estado:</span>
              {['TODOS', 'VIGENTE', 'VENCIDO'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterEstado(st)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                    filterEstado === st
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  {st === 'TODOS' ? 'Todos' : st === 'VIGENTE' ? 'Vigentes' : 'Vencidos'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-horizon dark:shadow-none dark:border-slate-800 dark:bg-[#111C44]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3.5">N° Autorización / Resolución</th>
                    <th className="px-4 py-3.5">Solicitante / Administrado</th>
                    <th className="px-4 py-3.5">Procedimiento TUPA</th>
                    <th className="px-4 py-3.5">Zona y Horario</th>
                    <th className="px-4 py-3.5">Vigencia</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        Cargando autorizaciones...
                      </td>
                    </tr>
                  ) : paginatedPermisos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                        No se encontraron permisos de circulación con los filtros seleccionados.
                      </td>
                    </tr>
                  ) : (
                    paginatedPermisos.map((p) => (
                      <tr key={p.id} className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3.5">
                          <div className="font-extrabold text-slate-900 dark:text-white">
                            {p.numeroAutorizacion}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            Exp. {p.expedienteNumero || p.expediente || 'S/N'}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {p.solicitante}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {p.solicitanteRuc ? `RUC: ${p.solicitanteRuc}` : p.solicitanteDni ? `DNI: ${p.solicitanteDni}` : 'Persona Natural'}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 max-w-[200px]">
                          <span className="rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                            {p.procedimientoCodigo || 'TUPA'}
                          </span>
                          <div className="mt-1 font-medium text-slate-700 dark:text-slate-300 truncate" title={p.procedimientoNombre || p.asunto}>
                            {p.procedimientoNombre || p.asunto}
                          </div>
                        </td>

                        <td className="px-4 py-3.5 max-w-[200px]">
                          <div className="font-medium text-slate-800 dark:text-slate-200 truncate" title={p.zonaCirculacion}>
                            {p.zonaCirculacion || 'Jurisdicción General JLO'}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {p.horarioInicio && p.horarioFin ? `${p.horarioInicio.slice(0, 5)} - ${p.horarioFin.slice(0, 5)} hrs` : 'Horario Ordinario'}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="text-slate-800 dark:text-slate-200 font-medium">
                            {p.fechaInicioVigencia ? new Date(p.fechaInicioVigencia).toLocaleDateString('es-PE') : 'S/F'}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            Hasta: {p.fechaFinVigencia ? new Date(p.fechaFinVigencia).toLocaleDateString('es-PE') : 'Indefinido'}
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-black border ${
                              p.estado === 'VIGENTE'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300'
                            }`}
                          >
                            <span className={`size-1.5 rounded-full ${p.estado === 'VIGENTE' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {p.estado}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(p)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 shadow-horizon dark:shadow-none transition hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 dark:border-slate-800 dark:bg-[#111C44]/60 dark:text-slate-300 dark:hover:bg-violet-950/40 dark:hover:text-violet-300"
                            title="Ver Resolución"
                          >
                            <Icon name="eye" className="size-3.5" />
                            <span>Resolución</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredPermisos.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        </div>
      )}

      {activeTab === 'tupa' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {procedimientos.map((proc) => (
            <div
              key={proc.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-horizon dark:shadow-none dark:border-slate-800 dark:bg-[#111C44]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-lg bg-violet-50 px-2.5 py-1 font-mono text-xs font-black text-violet-700 dark:bg-violet-950/50 dark:text-violet-300">
                    {proc.codigo}
                  </span>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                    {proc.estado}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-black text-slate-900 dark:text-white leading-snug">
                  {proc.nombre}
                </h3>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-3">
                  {proc.descripcion || 'Procedimiento administrativo oficial de tránsito y vialidad distrital.'}
                </p>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400">Derecho de trámite</span>
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  S/ {Number(proc.costo || 0).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {isDetailModalOpen && selectedPermiso && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111C44] my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-950/60 dark:text-violet-400">
                  <Icon name="permit" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Resolución de Autorización de Circulación
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    N° {selectedPermiso.numeroAutorizacion} • Municipalidad Distrital de José Leonardo Ortiz
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <Icon name="close" className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-[#111C44]/40">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Expediente SISGEDO</span>
                    <p className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {selectedPermiso.expedienteNumero || selectedPermiso.expediente || 'S/E'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Fecha Emisión</span>
                    <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                      {selectedPermiso.fechaEmision ? new Date(selectedPermiso.fechaEmision).toLocaleDateString('es-PE') : 'S/F'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400">Estado</span>
                    <div className="mt-0.5">
                      <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-black ${selectedPermiso.estado === 'VIGENTE' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'}`}>
                        {selectedPermiso.estado}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <p>
                    <strong>Administrado / Razón Social:</strong> {selectedPermiso.solicitante}
                  </p>
                  <p>
                    <strong>Documento de Identidad:</strong> {selectedPermiso.solicitanteRuc ? `RUC ${selectedPermiso.solicitanteRuc}` : `DNI ${selectedPermiso.solicitanteDni}`}
                  </p>
                  <p>
                    <strong>Asunto Resolutivo:</strong> {selectedPermiso.asunto}
                  </p>
                  <p>
                    <strong>Zona Autorizada de Circulación:</strong> {selectedPermiso.zonaCirculacion}
                  </p>
                  <p>
                    <strong>Horario Permitido:</strong> {selectedPermiso.horarioInicio && selectedPermiso.horarioFin ? `${selectedPermiso.horarioInicio} a ${selectedPermiso.horarioFin}` : 'Todo el día'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Contenido de la Resolución
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">
                  {selectedPermiso.contenido || 'Se autoriza la prestación de servicios en estricto cumplimiento del Reglamento Nacional de Tránsito y las Ordenanzas Municipales vigentes del distrito de José Leonardo Ortiz.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-[#111C44]/40">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Inicio de Vigencia</span>
                  <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                    {selectedPermiso.fechaInicioVigencia ? new Date(selectedPermiso.fechaInicioVigencia).toLocaleDateString('es-PE') : 'Inmediato'}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-[#111C44]/40">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Término de Vigencia</span>
                  <p className="mt-1 font-bold text-slate-800 dark:text-slate-200">
                    {selectedPermiso.fechaFinVigencia ? new Date(selectedPermiso.fechaFinVigencia).toLocaleDateString('es-PE') : 'Indefinido'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111C44] dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Icon name="print" className="size-4" />
                <span>Imprimir Resolución</span>
              </button>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-slate-800 dark:bg-[#0B1437] dark:hover:bg-slate-600"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
