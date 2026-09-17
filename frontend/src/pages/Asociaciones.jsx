import { useEffect, useState } from 'react'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function Asociaciones() {
  const cached = getCachedData('/asociaciones')
  const [asociaciones, setAsociaciones] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipo, setFilterTipo] = useState('TODOS')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [detailData, setDetailData] = useState(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [mapPreview, setMapPreview] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loadError, setLoadError] = useState('')

  const emptyForm = {
    tipo: 'ASOCIACION',
    razonSocial: '',
    ruc: '',
    partidaRegistral: '',
    fechaCreacion: '',
    direccion: '',
    coordenadas: '',
    telefono: '',
    email: '',
    tipoAmbiente: '',
    numeroLicencia: '',
    estado: 'ACTIVO',
  }

  const [formData, setFormData] = useState(emptyForm)

  useEffect(() => {
    setLoadError('')
    apiFetch('/asociaciones')
      .then((response) => response.ok ? response.json() : Promise.reject(response))
      .then((payload) => {
        const data = payload.data ?? []
        setAsociaciones(data)
        setCachedData('/asociaciones', data)
      })
      .catch(() => setLoadError('No se pudo cargar el padrón de asociaciones.'))
      .finally(() => setIsLoading(false))
  }, [])

  const totalOrgs = asociaciones.length
  const particulares = asociaciones.filter((o) => o.tipo === 'PARTICULAR').length
  const asociacionesCount = asociaciones.filter((o) => o.tipo === 'ASOCIACION').length
  const flotaAcumulada = asociaciones.reduce((sum, o) => sum + Number(o.flotaTotal || 0), 0)

  const filteredOrgs = asociaciones.filter((o) => {
    const fullSearch = `${o.razonSocial} ${o.ruc} ${o.partidaRegistral} ${o.direccion} ${o.numeroLicencia}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesTipo = filterTipo === 'TODOS' || o.tipo === filterTipo
    const matchesEstado = filterEstado === 'TODOS' || o.estado === filterEstado

    return matchesSearch && matchesTipo && matchesEstado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipo, filterEstado])

  const paginatedOrgs = filteredOrgs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleOpenCreateModal = () => {
    setFormData(emptyForm)
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (org) => {
    setSelectedOrg(org)
    setFormData({ ...emptyForm, ...org })
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
    if (window.confirm('¿Está seguro de eliminar esta asociación del registro municipal?')) {
      try {
        await apiFetch(`/asociaciones/${id}`, { method: 'DELETE' })
        setAsociaciones(asociaciones.filter((o) => o.id !== id))
      } catch (err) {
        alert('No se pudo eliminar la asociación.')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formData.razonSocial.trim() || !formData.ruc.trim()) {
      alert('Por favor completa los campos requeridos.')
      return
    }

    const documentNumber = formData.ruc.trim()
    if (!/^\d{11}$/.test(documentNumber)) {
      alert('El RUC debe tener exactamente 11 dígitos numéricos.')
      return
    }

    try {
      if (isEditing) {
        await apiFetch(`/asociaciones/${selectedOrg.id}`, {
          method: 'PUT',
          body: formData,
        })
        setAsociaciones(asociaciones.map((o) => (o.id === selectedOrg.id ? { ...formData, id: o.id } : o)))
      } else {
        const res = await apiFetch('/asociaciones', {
          method: 'POST',
          body: formData,
        })
        const resData = await res.json()
        const newOrg = resData.data || {
          ...formData,
          id: Date.now(),
        }
        setAsociaciones([newOrg, ...asociaciones])
      }
      setIsModalOpen(false)
    } catch (err) {
      alert('Error al guardar la asociación en el servidor.')
    }
  }

  const openMap = (coordenadas, title = 'Ubicación registrada') => {
    if (!coordenadas?.trim()) return
    setMapPreview({
      title,
      coordenadas: coordenadas.trim(),
      url: `https://maps.google.com/maps?q=${encodeURIComponent(coordenadas.trim())}&z=17&output=embed`,
    })
  }

  const detailOrg = detailData || selectedOrg

  return (
    <div className="space-y-3.5 sm:space-y-4">
      {loadError && <PageLoadError message={loadError} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-500/25">
            <Icon name="building" className="size-5" />
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


      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total registros</span>
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              <Icon name="building" className="size-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(totalOrgs)}</p>
            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">Padrón 2026</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Asociaciones y particulares</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Asociaciones</span>
            <span className="grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
              <Icon name="vehicle" className="size-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(asociacionesCount)}</p>
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">Trimóviles</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Comités y transportistas</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Particulares</span>
            <span className="grid size-8 place-items-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-400">
              <Icon name="building" className="size-4" />
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(particulares)}</p>
            <span className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full">Independientes</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Registros particulares</p>
        </div>


        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Flota Autorizada</span>
            <span className="grid size-8 place-items-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-xs">✓</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <p className="text-2xl font-black text-slate-800 dark:text-white">{new Intl.NumberFormat('es-PE').format(flotaAcumulada)}</p>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">Capacidad Total</span>
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Unidades totales habilitadas</p>
        </div>
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] overflow-hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUC, partida, dirección o licencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-8 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-indigo-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="ASOCIACION">Asociaciones</option>
              <option value="PARTICULAR">Particulares</option>
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-xs font-bold text-slate-700 outline-none transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="ACTIVO">Activas</option>
              <option value="SUSPENDIDO">Suspendidas</option>
            </select>

            {(filterTipo !== 'TODOS' || filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterTipo('TODOS')
                  setFilterEstado('TODOS')
                  setSearchTerm('')
                }}
                className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400"
              >
                Limpiar Filtros
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-1.5 text-xs font-extrabold text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-indigo-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Nuevo registro</span>
            </button>
          </div>
        </div>


        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-1.5 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-400">
          <span>
            Mostrando <strong className="text-slate-800 dark:text-white">{filteredOrgs.length}</strong> de{' '}
            <strong className="text-slate-800 dark:text-white">{asociaciones.length}</strong> asociaciones registradas
          </span>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            Registro Institucional MDJLO · {new Date().getFullYear()}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
              <tr>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[220px]">Asociación / Particular</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[125px]">RUC / Partida</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[170px]">Contacto</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[240px]">Ubicación</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[105px]">Flota</th>
                <th className="px-3 py-2.5 whitespace-nowrap min-w-[90px] text-center">Estado</th>
                <th className="px-3.5 py-2.5 whitespace-nowrap min-w-[95px] text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && asociaciones.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-3.5 py-3 min-w-[220px]">
                      <div className="flex items-center gap-2.5">
                        <div className="size-8 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3.5 w-40 rounded bg-slate-200 dark:bg-slate-800" />
                          <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-800/60" />
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-32 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-14 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3 py-3"><div className="h-4 w-14 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-3.5 py-3 text-right"><div className="h-6 w-16 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-10 text-center text-slate-400">
                    <div className="mx-auto max-w-xs space-y-2">
                      <Icon name="building" className="size-8" />
                      <p className="font-bold text-slate-600 dark:text-slate-300">
                        No se encontraron asociaciones
                      </p>
                      <p className="text-xs text-slate-400">
                        Modifica los términos de búsqueda o los filtros seleccionados.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedOrgs.map((o) => (
                  <tr key={o.id} className="group transition-colors hover:bg-indigo-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-3.5 py-2.5 min-w-[220px]">
                      <div className="flex items-center gap-2.5">
                        <span className={`grid size-8 shrink-0 place-items-center rounded-xl text-base font-bold shadow-xs ${o.tipo === 'ASOCIACION'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}>
                          {o.tipo === 'ASOCIACION' ? '🛺' : '👤'}
                        </span>
                        <div className="flex-1">
                          <p className="font-normal text-xs sm:text-sm text-slate-800 dark:text-slate-100 leading-snug" title={o.razonSocial}>{o.razonSocial}</p>
                          <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 mt-0.5">
                            {o.tipo}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">RUC: {o.ruc}</p>
                      <p className="text-[11px] font-mono text-slate-400">{o.partidaRegistral || o.numeroLicencia || '—'}</p>
                    </td>
                    <td className="px-3 py-2.5 min-w-[170px]">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{o.telefono || '—'}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap" title={o.email}>{o.email || '—'}</p>
                    </td>
                    <td className="px-3 py-2.5 min-w-[240px]">
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-snug" title={o.direccion}>{o.direccion || '—'}</p>
                      <button
                        type="button"
                        onClick={() => openMap(o.coordenadas, o.razonSocial)}
                        disabled={!o.coordenadas}
                        className="mt-0.5 text-[10px] font-bold text-indigo-600 hover:underline disabled:text-slate-300 dark:text-indigo-400 disabled:dark:text-slate-700 cursor-pointer"
                      >
                        {o.coordenadas ? 'Ver mapa' : 'Sin coordenadas'}
                      </button>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                        ⚡ {o.flotaTotal} Unidades
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-extrabold ${o.estado === 'ACTIVO'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                          }`}
                      >
                        <span className="size-1 rounded-full bg-current" />
                        {o.estado}
                      </span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(o)}
                          title="Ver Detalle"
                          className="rounded-lg p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white dark:bg-sky-950/60 dark:text-sky-400 dark:hover:bg-sky-500 dark:hover:text-white transition-all duration-150 shadow-2xs hover:shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Icon name="eye" className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(o)}
                          title="Editar Asociación"
                          className="rounded-lg p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 dark:hover:bg-amber-500 dark:hover:text-white transition-all duration-150 shadow-2xs hover:shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Icon name="pencil" className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(o.id)}
                          title="Eliminar Asociación"
                          className="rounded-lg p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-950/60 dark:text-rose-400 dark:hover:bg-rose-500 dark:hover:text-white transition-all duration-150 shadow-2xs hover:shadow-sm active:scale-95 cursor-pointer"
                        >
                          <Icon name="trash" className="size-3.5" />
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


      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-blue-900/20 bg-[#123b6d] px-6 py-4.5 text-white dark:border-slate-800 dark:bg-[#102a4d]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/10 text-cyan-300">
                  <Icon name="building" className="size-5" />
                </span>
                <div>
                  <h3 className="text-lg font-extrabold text-white">
                    {isEditing ? 'Editar Registro' : 'Registrar Asociación / Particular'}
                  </h3>
                  <p className="text-xs text-blue-100/80">Gestión de datos, ubicación y contacto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="grid size-9 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white shadow-xs transition hover:bg-white/20 cursor-pointer"
              >
                <Icon name="close" className="size-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-indigo-600" />
                  Identificación Institucional
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <select
                      id="org_tipo"
                      value={formData.tipo}
                      onChange={(e) => {
                        const tipo = e.target.value
                        setFormData({
                          ...formData,
                          tipo,
                          partidaRegistral: tipo === 'PARTICULAR' ? '' : formData.partidaRegistral,
                          fechaCreacion: tipo === 'PARTICULAR' ? '' : formData.fechaCreacion,
                          coordenadas: tipo === 'PARTICULAR' ? '' : formData.coordenadas,
                          tipoAmbiente: tipo === 'ASOCIACION' ? '' : formData.tipoAmbiente,
                          numeroLicencia: tipo === 'ASOCIACION' ? '' : formData.numeroLicencia,
                        })
                      }}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    >
                      <option value="ASOCIACION">ASOCIACIÓN</option>
                      <option value="PARTICULAR">PARTICULAR</option>
                    </select>
                    <label
                      htmlFor="org_tipo"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400"
                    >
                      Tipo de Registro
                    </label>
                  </div>

                  <div className="relative sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_razon"
                      type="text"
                      required
                      placeholder=" "
                      value={formData.razonSocial}
                      onChange={(e) => setFormData({ ...formData, razonSocial: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-bold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_razon"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Razón Social / Nombre
                    </label>
                  </div>

                  <div className="flex gap-2 sm:col-span-3">
                    <div className="relative flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                      <input
                        id="org_ruc"
                        type="text"
                        required
                        maxLength={11}
                        placeholder=" "
                        value={formData.ruc}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!/^\d*$/.test(val)) return;
                          setFormData({ ...formData, ruc: val });
                        }}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono font-bold text-slate-800 outline-none dark:text-white"
                      />
                      <label
                        htmlFor="org_ruc"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                      >
                        RUC
                      </label>
                    </div>
                    <button
                      type="button"
                      onClick={() => alert('Búsqueda por RUC pendiente de conectar.')}
                      className="inline-flex min-w-28 items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 text-sm font-extrabold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300"
                    >
                      <Icon name="search" className="size-4" />
                      Buscar
                    </button>
                  </div>

                  {formData.tipo === 'ASOCIACION' && (
                    <>
                      <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                        <input
                          id="org_partida"
                          type="text"
                          placeholder=" "
                          value={formData.partidaRegistral}
                          onChange={(e) => setFormData({ ...formData, partidaRegistral: e.target.value })}
                          className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono text-slate-800 outline-none dark:text-white"
                        />
                        <label
                          htmlFor="org_partida"
                          className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                        >
                          Partida Registral SUNARP
                        </label>
                      </div>

                      <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                        <input
                          id="org_fecha_creacion"
                          type="date"
                          placeholder=" "
                          value={formData.fechaCreacion || ''}
                          onChange={(e) => setFormData({ ...formData, fechaCreacion: e.target.value })}
                          className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                        />
                        <label
                          htmlFor="org_fecha_creacion"
                          className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400"
                        >
                          Fecha creación
                        </label>
                      </div>
                    </>
                  )}
                </div>
              </div>


              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-3 flex items-center gap-2">
                  <span className="size-2 rounded-full bg-cyan-500" />
                  Contacto, ubicación y autorización
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="relative sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_dir"
                      type="text"
                      placeholder=" "
                      value={formData.direccion}
                      onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_dir"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Dirección donde se encuentra ubicado
                    </label>
                  </div>

                  {formData.tipo === 'ASOCIACION' && (
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                      <input
                        id="org_coordenadas"
                        type="text"
                        placeholder=" "
                        value={formData.coordenadas}
                        onChange={(e) => setFormData({ ...formData, coordenadas: e.target.value })}
                        className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-mono font-semibold text-slate-800 outline-none dark:text-white"
                      />
                      <label
                        htmlFor="org_coordenadas"
                        className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                      >
                        Coordenadas
                      </label>
                    </div>
                  )}

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_tel"
                      type="text"
                      maxLength={9}
                      placeholder=" "
                      value={formData.telefono}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!/^\d*$/.test(val)) return;
                        setFormData({ ...formData, telefono: val });
                      }}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_tel"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Teléfono de Contacto
                    </label>
                  </div>

                  <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                    <input
                      id="org_email"
                      type="email"
                      placeholder=" "
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                    />
                    <label
                      htmlFor="org_email"
                      className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                    >
                      Email
                    </label>
                  </div>

                  {formData.tipo === 'PARTICULAR' && (
                    <>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 transition-all hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80">
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

                      <div className="relative rounded-2xl border border-slate-200 bg-slate-50/80 transition-all focus-within:border-indigo-600 focus-within:bg-white dark:focus-within:bg-slate-900 focus-within:ring-4 focus-within:ring-indigo-500/10 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/80 dark:focus-within:border-indigo-400">
                        <input
                          id="org_numero_licencia"
                          type="text"
                          placeholder=" "
                          value={formData.numeroLicencia}
                          onChange={(e) => setFormData({ ...formData, numeroLicencia: e.target.value })}
                          className="peer block w-full bg-transparent px-3.5 pt-4 pb-1 text-sm font-semibold text-slate-800 outline-none dark:text-white"
                        />
                        <label
                          htmlFor="org_numero_licencia"
                          className="pointer-events-none absolute left-3.5 top-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-xs peer-placeholder-shown:font-semibold peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:uppercase peer-focus:tracking-wider peer-focus:text-indigo-600 dark:peer-focus:text-indigo-400"
                        >
                          Número licencia
                        </label>
                      </div>
                    </>
                  )}

                </div>
              </div>


              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-2.5 text-xs font-black text-white hover:from-indigo-700 hover:to-violet-700 shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  {isEditing ? 'Guardar Cambios' : `Registrar ${formData.tipo === 'PARTICULAR' ? 'Particular' : 'Asociación'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {isDetailModalOpen && selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="shrink-0 border-b border-slate-100 bg-[#071a2f] p-5 text-white relative">
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="absolute right-4 top-4 rounded-full p-1 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer"
              >
                ✕
              </button>
              <span className="inline-block rounded-full bg-indigo-500/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-indigo-300 border border-indigo-500/30">
                Registro Autorizado MDJLO
              </span>
              <h3 className="mt-2 text-xl font-black leading-tight">{detailOrg.razonSocial}</h3>
              <p className="text-xs font-mono text-cyan-300">RUC: {detailOrg.ruc}</p>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 text-xs">
              <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 space-y-2.5 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                    <span className="font-bold text-slate-400">Partida Registral SUNARP</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{detailOrg.partidaRegistral || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                    <span className="font-bold text-slate-400">Fecha creación</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{detailOrg.fechaCreacion || '—'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                    <span className="font-bold text-slate-400">Flota Registrada</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{detailOrg.flotaTotal} Unidades</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                    <span className="font-bold text-slate-400">Teléfono de contacto</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">{detailOrg.telefono || '—'}</span>
                  </div>
                  {detailOrg.tipo === 'PARTICULAR' && (
                    <>
                      <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                        <span className="font-bold text-slate-400">Tipo ambiente</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{detailOrg.tipoAmbiente || '—'}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
                        <span className="font-bold text-slate-400">Número licencia</span>
                        <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{detailOrg.numeroLicencia || '—'}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800">
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

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white">Ubicación</p>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">{detailOrg.coordenadas || 'Sin coordenadas'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openMap(detailOrg.coordenadas, detailOrg.razonSocial)}
                      disabled={!detailOrg.coordenadas}
                      className="rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100 disabled:bg-slate-100 disabled:text-slate-400 dark:bg-indigo-950/50 dark:text-indigo-300 dark:disabled:bg-slate-900"
                    >
                      Ampliar
                    </button>
                  </div>
                  {detailOrg.coordenadas ? (
                    <iframe
                      title={`Ubicación de ${detailOrg.razonSocial}`}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(detailOrg.coordenadas.trim())}&z=17&output=embed`}
                      className="h-72 w-full border-0"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  ) : (
                    <div className="grid h-72 place-items-center px-6 text-center text-sm font-semibold text-slate-400">
                      Esta asociación todavía no tiene coordenadas registradas.
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <div>
                    <p className="text-sm font-black text-slate-900 dark:text-white">Socios vinculados</p>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      Propietarios con vehículos registrados en esta asociación.
                    </p>
                  </div>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                    {isDetailLoading ? '...' : `${detailOrg.socios?.length || 0} socios`}
                  </span>
                </div>

                {isDetailLoading ? (
                  <div className="grid gap-2 p-4">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <div key={idx} className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-900" />
                    ))}
                  </div>
                ) : detailOrg.socios?.length ? (
                  <div className="max-h-72 overflow-y-auto p-3">
                    <div className="grid gap-2 md:grid-cols-2">
                      {detailOrg.socios.map((socio) => (
                        <div key={socio.idPersona} className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-900 dark:text-white" title={socio.nombre}>
                                {socio.nombre || 'Sin nombres'}
                              </p>
                              <p className="font-mono text-[11px] font-semibold text-slate-500">DNI/RUC: {socio.documento || '—'}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              {socio.vehiculosTotal} unidad{Number(socio.vehiculosTotal) === 1 ? '' : 'es'}
                            </span>
                          </div>

                          <div className="mt-2 grid gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-400">Teléfono</span>
                              <span className="font-semibold">{socio.telefono || '—'}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-slate-400">Correo</span>
                              <span className="truncate font-semibold" title={socio.email}>{socio.email || '—'}</span>
                            </div>
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-slate-400">Placas</span>
                              <span className="text-right font-mono font-bold text-slate-700 dark:text-slate-200">{socio.placas || '—'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-sm font-semibold text-slate-400">
                    Aún no hay socios. Se mostrarán cuando registres vehículos con propietario en esta asociación.
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-[#0f172a]/95">
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cerrar Detalle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {mapPreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-[#123b6d] px-6 py-4 text-white dark:border-slate-800">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-blue-100/80">Mapa de ubicación</p>
                <h3 className="mt-1 text-xl font-black">{mapPreview.title}</h3>
                <p className="mt-0.5 font-mono text-xs text-cyan-200">{mapPreview.coordenadas}</p>
              </div>
              <button
                type="button"
                onClick={() => setMapPreview(null)}
                className="grid size-10 shrink-0 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
              >
                <Icon name="close" className="size-4" />
              </button>
            </div>
            <div className="h-[65vh] bg-slate-100 dark:bg-slate-900">
              <iframe
                title={`Mapa de ${mapPreview.title}`}
                src={mapPreview.url}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
