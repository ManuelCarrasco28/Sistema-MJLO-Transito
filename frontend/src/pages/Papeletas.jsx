import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function Papeletas() {
  const cachedPapeletas = getCachedData('/papeletas')
  const cachedTipos = getCachedData('/tipos-infraccion')
  const cachedVeh = getCachedData('/vehiculos')
  const [papeletas, setPapeletas] = useState(cachedPapeletas || [])
  const [tiposInfraccion, setTiposInfraccion] = useState(cachedTipos || [])
  const [vehiculos, setVehiculos] = useState(cachedVeh || [])
  const [isLoading, setIsLoading] = useState(!cachedPapeletas)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedPapeleta, setSelectedPapeleta] = useState(null)

  const [formData, setFormData] = useState({
    vehiculoPlaca: '',
    infractor: '',
    inspector: 'Inspector Municipal',
    lugar: '',
    tipoInfraccionId: 1,
    observacionesAutoridad: '',
    observacionesConductor: '',
  })

  const totales = papeletas.length
  const pendientes = papeletas.filter((p) => p.estado === 'PENDIENTE_PAGO').length
  const pagadas = papeletas.filter((p) => p.estado === 'PAGADA').length
  const anuladas = papeletas.filter((p) => p.estado === 'ANULADA').length
  const montoRecaudado = pagadas > 0 ? papeletas.filter(p => p.estado === 'PAGADA').reduce((acc, curr) => acc + curr.montoTotal, 0) : 0

  const filteredPapeletas = papeletas.filter((p) => {
    const fullSearch = `${p.numeroPapeleta} ${p.vehiculoPlaca} ${p.infractor} ${p.lugar} ${p.inspector}`.toLowerCase()
    const matchesSearch = fullSearch.includes(searchTerm.toLowerCase())
    const matchesEstado = filterEstado === 'TODOS' || p.estado === filterEstado
    return matchesSearch && matchesEstado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado])

  const paginatedPapeletas = filteredPapeletas.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  useEffect(() => {
    Promise.all([
      apiFetch('/papeletas').then(res => res.json()).catch(() => ({ data: [] })),
      apiFetch('/tipos-infraccion').then(res => res.json()).catch(() => ({ data: [] })),
      apiFetch('/vehiculos').then(res => res.json()).catch(() => ({ data: [] }))
    ]).then(([papeletasRes, tiposRes, vehiculosRes]) => {
      const pData = papeletasRes.data || []
      const tData = tiposRes.data || []
      const vData = vehiculosRes.data || []
      setPapeletas(pData)
      setTiposInfraccion(tData)
      setVehiculos(vData)
      setCachedData('/papeletas', pData)
      setCachedData('/tipos-infraccion', tData)
      setCachedData('/vehiculos', vData)
      setIsLoading(false)
    }).catch(err => {
      console.error('Error fetching data for papeletas:', err)
      setIsLoading(false)
    })
  }, [])

  const handleOpenCreateModal = () => {
    setFormData({
      vehiculoPlaca: vehiculos[0]?.placa || '',
      infractor: '',
      inspector: 'Inspector Municipal',
      lugar: '',
      tipoInfraccionId: tiposInfraccion[0]?.id || 1,
      observacionesAutoridad: '',
      observacionesConductor: '',
    })
    setSelectedPapeleta(null)
    setIsModalOpen(true)
  }

  useQuickCreate(handleOpenCreateModal, !isLoading)

  const handleOpenDetail = (papeleta) => {
    setSelectedPapeleta(papeleta)
    setIsDetailModalOpen(true)
  }

  const handleOpenPreview = (papeleta) => {
    setSelectedPapeleta(papeleta)
    setIsPreviewModalOpen(true)
  }

  const handleOpenEditModal = (papeleta) => {
    setFormData({
      vehiculoPlaca: papeleta.vehiculoPlaca,
      infractor: papeleta.infractor,
      inspector: papeleta.inspector,
      lugar: papeleta.lugar,
      tipoInfraccionId: papeleta.detalles?.[0]?.tipoInfraccionId || tiposInfraccion[0]?.id || 1,
      observacionesAutoridad: papeleta.observacionesAutoridad || '',
      observacionesConductor: papeleta.observacionesConductor || '',
    })
    setSelectedPapeleta(papeleta)
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro que desea anular esta papeleta? Esta acción es irreversible.')) {
      try {
        await apiFetch(`/papeletas/${id}`, { method: 'DELETE' })
        setPapeletas(papeletas.map(p => p.id === id ? { ...p, estado: 'ANULADA' } : p))
      } catch (err) {
        console.error('Error al anular:', err)
        alert('Error al anular la papeleta')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (!formData.vehiculoPlaca.trim() || !formData.infractor.trim() || !formData.lugar.trim()) {
      alert('Por favor complete todos los campos obligatorios.')
      return
    }
    const tipoInf = tiposInfraccion.find((t) => t.id === parseInt(formData.tipoInfraccionId))
    
    try {
      if (selectedPapeleta) {
        const response = await apiFetch(`/papeletas/${selectedPapeleta.id}`, {
          method: 'PUT',
          body: formData
        })
        if (response.ok) {
          setPapeletas(papeletas.map(p => 
            p.id === selectedPapeleta.id 
              ? { ...p, ...formData, detalles: [{ tipoInfraccionId: tipoInf ? tipoInf.id : 1, codigo: tipoInf ? tipoInf.codigo : 'G01' }], montoTotal: tipoInf ? tipoInf.montoBase : 0 } 
              : p
          ))
        }
      } else {
        const response = await apiFetch('/papeletas', {
          method: 'POST',
          body: formData
        })
        const result = await response.json()
        if (response.ok && result.data) {
          setPapeletas([result.data, ...papeletas])
        }
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error al guardar:', err)
      alert('Hubo un error al guardar.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-rose-500 to-rose-700 text-white shadow-md shadow-rose-500/20">
              <Icon name="ticket" className="size-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white sm:text-3xl">
                  Control de Papeletas e Infracciones
                </h1>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Registro, notificación y gestión de cobro de actas de infracción al tránsito municipal.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Impuestas</span>
            <span className="grid size-10 place-items-center rounded-xl bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400">
              <Icon name="ticket" className="size-5" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{totales}</p>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Histórico</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Pendientes</span>
            <span className="grid size-10 place-items-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 font-bold">⏳</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{pendientes}</p>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">Por Cobrar</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Pagadas</span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold">✓</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{pagadas}</p>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">S/ {montoRecaudado.toFixed(2)}</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Anuladas</span>
            <span className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">✕</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-800 dark:text-white">{anuladas}</p>
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">Prescritas</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código PAP, placa o infractor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-sm text-slate-800 outline-none transition focus:border-rose-500 focus:bg-white focus:ring-2 focus:ring-rose-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-rose-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 cursor-pointer">
                ✕
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODOS">Todos los Estados</option>
              <option value="PENDIENTE_PAGO">Pendientes de Pago</option>
              <option value="PAGADA">Pagadas</option>
              <option value="ANULADA">Anuladas</option>
            </select>
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-rose-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-rose-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Emitir Papeleta</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">N° Papeleta</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Placa Vehicular</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Infractor & Intervención</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Fecha & Hora</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Infracción / Monto</th>
                <th className="px-4 py-3.5 whitespace-nowrap">Estado</th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-200/60 dark:border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {isLoading && papeletas.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-4 py-4"><div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-4 py-4">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-800/60" />
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-20 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#0f172a] px-4 py-4 text-right border-l border-slate-100 dark:border-slate-800"><div className="h-7 w-24 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : filteredPapeletas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <p className="text-3xl">🎫</p>
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron papeletas</p>
                  </td>
                </tr>
              ) : (
                paginatedPapeletas.map((p) => {
                  const tipoInf = tiposInfraccion.find((t) => t.id === p.detalles?.[0]?.tipoInfraccionId)
                  return (
                    <tr key={p.id} className="group transition-colors hover:bg-rose-50/30 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-extrabold text-rose-700 dark:text-rose-400">{p.numeroPapeleta}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black tracking-widest text-slate-950 dark:border-slate-800 dark:bg-amber-400 dark:text-slate-950">
                          {p.vehiculoPlaca}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <p className="font-bold text-slate-800 dark:text-white truncate" title={p.infractor}>{p.infractor}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[160px]" title={p.lugar}>📍 {p.lugar}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                        <p className="font-mono font-semibold text-slate-700 dark:text-slate-300">{new Date(p.fechaHora).toLocaleDateString()}</p>
                        <p className="text-[11px] text-slate-400">{new Date(p.fechaHora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-xs font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                            {tipoInf ? tipoInf.codigo : 'INFR'}
                          </span>
                          <span className="font-mono font-black text-slate-800 dark:text-white">S/ {p.montoTotal.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-extrabold ${p.estado === 'PAGADA' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : p.estado === 'PENDIENTE_PAGO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                          <span className="size-2 rounded-full bg-current animate-pulse" />
                          {p.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : p.estado}
                        </span>
                      </td>
                      <td className="sticky right-0 z-10 bg-white group-hover:bg-rose-50/40 dark:bg-[#0f172a] dark:group-hover:bg-slate-800/60 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                        <div className="flex items-center justify-end gap-1.5 pr-1">
                          <button onClick={() => handleOpenDetail(p)} className="rounded-xl p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-950/60 dark:text-rose-400 transition-all hover:shadow-md cursor-pointer" title="Ver Detalle">
                            <Icon name="eye" className="size-4" />
                          </button>
                          <button onClick={() => handleOpenEditModal(p)} className="rounded-xl p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white dark:bg-amber-950/60 dark:text-amber-400 transition-all hover:shadow-md cursor-pointer" title="Editar Papeleta">
                            <Icon name="pencil" className="size-4" />
                          </button>
                          <button onClick={() => handleOpenPreview(p)} className="rounded-xl p-1.5 bg-slate-100 text-slate-600 hover:bg-slate-800 hover:text-white dark:bg-slate-800 dark:text-slate-300 hover:shadow-md cursor-pointer" title="Imprimir Boleta">
                            <Icon name="print" className="size-4" />
                          </button>
                          {p.estado !== 'ANULADA' && (
                            <button onClick={() => handleDelete(p.id)} className="rounded-xl p-1.5 bg-red-50 text-red-600 hover:bg-red-500 hover:text-white dark:bg-red-950/60 dark:text-red-400 transition-all hover:shadow-md cursor-pointer" title="Anular Papeleta">
                              <Icon name="trash" className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalItems={filteredPapeletas.length}
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
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">
                  {selectedPapeleta ? 'Editar Papeleta de Infracción' : 'Emitir Papeleta de Infracción'}
                </h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-200 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Placa Vehicular *</label>
                  <input 
                    type="text" 
                    required 
                    list="vehiculos-papeleta-list"
                    placeholder="Ej. NC-1234"
                    value={formData.vehiculoPlaca} 
                    onChange={(e) => setFormData({ ...formData, vehiculoPlaca: e.target.value.toUpperCase() })} 
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" 
                  />
                  <datalist id="vehiculos-papeleta-list">
                    {vehiculos.map((v) => (
                      <option key={v.id} value={v.placa}>{v.marca} {v.modelo}</option>
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Conductor Infractor *</label>
                  <input type="text" required value={formData.infractor} onChange={(e) => setFormData({ ...formData, infractor: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Lugar *</label>
                  <input type="text" required value={formData.lugar} onChange={(e) => setFormData({ ...formData, lugar: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Inspector</label>
                  <input type="text" disabled value={formData.inspector} className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/50" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Infracción *</label>
                <select value={formData.tipoInfraccionId} onChange={(e) => setFormData({ ...formData, tipoInfraccionId: e.target.value })} className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                  {tiposInfraccion.map((t) => (
                    <option key={t.id} value={t.id}>{t.codigo} - {t.descripcion.substring(0, 65)}... (S/ {t.montoBase.toFixed(2)})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer">Cancelar</button>
                <button type="submit" className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-extrabold text-white hover:bg-rose-700 cursor-pointer">
                  {selectedPapeleta ? 'Guardar Cambios' : 'Emitir Papeleta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {isDetailModalOpen && selectedPapeleta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-rose-600/20 bg-rose-50 p-5 dark:bg-rose-950/30">
              <div>
                <h3 className="text-xl font-black text-rose-700 dark:text-rose-400">{selectedPapeleta.numeroPapeleta}</h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-white cursor-pointer">✕</button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              
              <div className="space-y-6">
                
                {/* Identificación de la falta */}
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-3">Identificación de la falta</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Código Infracción</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.detalles?.[0]?.codigo || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Calificación</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.detalles?.[0]?.gravedad || 'LEVE'}</p>
                    </div>
                  </div>
                </div>

                {/* Lugar y Tiempo */}
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-3">Lugar y Tiempo</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Fecha y Hora</p>
                      <p className="font-bold text-slate-800 dark:text-white">{new Date(selectedPapeleta.fechaHora).toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Ubicación</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.lugar}</p>
                    </div>
                  </div>
                </div>

                {/* Vehículo y Conductor */}
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-3">Identificación</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Placa</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.vehiculoPlaca}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Conductor / Propietario</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.infractor}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Efectivo Policial / Inspector</p>
                      <p className="font-bold text-slate-800 dark:text-white">{selectedPapeleta.inspector} {selectedPapeleta.inspectorCIP ? `(CIP: ${selectedPapeleta.inspectorCIP})` : ''}</p>
                    </div>
                  </div>
                </div>

                {/* Estado Económico y Legal */}
                <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-black uppercase tracking-wider text-rose-600 mb-3">Estado Económico y Legal</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Monto Original</p>
                      <p className="font-bold text-slate-800 dark:text-white">S/ {parseFloat(selectedPapeleta.detalles?.[0]?.monto || selectedPapeleta.montoTotal).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Descuentos</p>
                      <p className="font-bold text-emerald-600">S/ {parseFloat(selectedPapeleta.detalles?.[0]?.descuento || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Intereses y Gastos</p>
                      <p className="font-bold text-rose-600">S/ 0.00</p>
                    </div>
                    <div>
                      <p className="text-slate-500 dark:text-slate-400 text-xs">Estado</p>
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${selectedPapeleta.estado === 'PAGADA' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300' : selectedPapeleta.estado === 'PENDIENTE_PAGO' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {selectedPapeleta.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : selectedPapeleta.estado}
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-3 mt-3 flex justify-between items-center">
                    <p className="text-slate-700 dark:text-slate-300 font-black text-xs uppercase">Total a Pagar</p>
                    <p className="font-mono font-black text-xl text-rose-600">S/ {selectedPapeleta.montoTotal.toFixed(2)}</p>
                  </div>
                </div>

              </div>

              <div className="flex justify-end gap-2 pt-6 mt-2 border-t border-slate-100 dark:border-slate-800">
                <button onClick={() => { setIsDetailModalOpen(false); handleOpenPreview(selectedPapeleta); }} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white cursor-pointer hover:bg-slate-800 transition">Imprimir Boleta</button>
                <button onClick={() => setIsDetailModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer hover:bg-slate-50 transition">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {isPreviewModalOpen && selectedPapeleta && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-enter print:bg-white print:p-0">
          
          {/* Controles (ocultos al imprimir) */}
          <div className="absolute top-4 right-4 flex gap-3 print:hidden">
            <button onClick={() => window.print()} className="rounded-xl bg-white px-5 py-2.5 text-xs font-extrabold text-rose-600 shadow-lg hover:bg-rose-50 cursor-pointer flex items-center gap-2">
              <Icon name="print" className="size-4" /> Imprimir Ticket
            </button>
            <button onClick={() => setIsPreviewModalOpen(false)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg hover:bg-slate-800 cursor-pointer">
              Cerrar
            </button>
          </div>

          {/* Formato Ticket Termal */}
          <div className="w-full max-w-[320px] bg-white text-black font-mono text-[11px] leading-tight shadow-2xl print:shadow-none print:max-w-full">
            <div className="p-4 border border-slate-200 print:border-none print:p-0">
              
              {/* Encabezado */}
              <div className="text-center mb-3">
                <h2 className="text-sm font-black uppercase mb-1">MUNICIPALIDAD DISTRITAL</h2>
                <h3 className="text-xs font-bold uppercase mb-1">José Leonardo Ortiz</h3>
                <p className="text-[10px]">Subgerencia de Tránsito</p>
                <p className="text-[10px]">RUC: 20141234567</p>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              <div className="text-center mb-2">
                <h3 className="font-black text-sm uppercase">BOLETA DE INFRACCIÓN</h3>
                <p className="font-bold text-sm mt-0.5">{selectedPapeleta.numeroPapeleta}</p>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              {/* Datos de la Falta */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span className="font-bold">FECHA/HORA:</span>
                  <span>{new Date(selectedPapeleta.fechaHora).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-bold">LUGAR:</span>
                  <p className="break-words">{selectedPapeleta.lugar}</p>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              {/* Infracción */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span className="font-bold">CÓDIGO:</span>
                  <span>{selectedPapeleta.detalles?.[0]?.codigo || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">FALTA:</span>
                  <span>{selectedPapeleta.detalles?.[0]?.gravedad || 'LEVE'}</span>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              {/* Vehículo y Conductor */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span className="font-bold">PLACA:</span>
                  <span>{selectedPapeleta.vehiculoPlaca}</span>
                </div>
                <div>
                  <span className="font-bold">CONDUCTOR:</span>
                  <p className="break-words uppercase">{selectedPapeleta.infractor}</p>
                </div>
                <div>
                  <span className="font-bold">INSPECTOR:</span>
                  <p className="break-words uppercase">
                    {selectedPapeleta.inspector} {selectedPapeleta.inspectorCIP ? `(CIP: ${selectedPapeleta.inspectorCIP})` : ''}
                  </p>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              {/* Importes */}
              <div className="space-y-1 mb-2">
                <div className="flex justify-between">
                  <span>Monto Base:</span>
                  <span>S/ {parseFloat(selectedPapeleta.detalles?.[0]?.monto || selectedPapeleta.montoTotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Descuento:</span>
                  <span>- S/ {parseFloat(selectedPapeleta.detalles?.[0]?.descuento || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Gastos/Int:</span>
                  <span>+ S/ 0.00</span>
                </div>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              {/* Total */}
              <div className="flex justify-between items-center my-2">
                <span className="font-black text-sm uppercase">Total a Pagar:</span>
                <span className="font-black text-sm">S/ {selectedPapeleta.montoTotal.toFixed(2)}</span>
              </div>
              
              <div className="text-center mt-1">
                <span className="text-[10px] uppercase block">Estado: {selectedPapeleta.estado === 'PENDIENTE_PAGO' ? 'PENDIENTE' : selectedPapeleta.estado}</span>
              </div>

              <div className="border-t-2 border-dashed border-black my-2"></div>

              {/* Pie de página */}
              <div className="text-center mt-3 text-[9px] text-slate-800">
                <p>Tiene 5 días hábiles para acceder</p>
                <p>al descuento por pronto pago.</p>
                <p className="mt-2 font-bold">Conserve este ticket</p>
                <p>www.munijlo.gob.pe/transito</p>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}
