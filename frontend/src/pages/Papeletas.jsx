import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { tiposInfraccion, initialVehiculos } from '../data/mockData'

export function Papeletas() {
  const [papeletas, setPapeletas] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('TODOS')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedPapeleta, setSelectedPapeleta] = useState(null)

  const [formData, setFormData] = useState({
    vehiculoPlaca: initialVehiculos[0]?.placa || 'M4X-821',
    infractor: '',
    inspector: 'Suboficial PNP / Inspector Municipal',
    lugar: '',
    tipoInfraccionId: tiposInfraccion[0]?.id || 1,
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
    fetch('http://localhost:8080/api/papeletas', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setPapeletas(data.data || [])
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Error fetching papeletas:', err)
        setIsLoading(false)
      })
  }, [])

  const handleOpenCreateModal = () => {
    setFormData({
      vehiculoPlaca: initialVehiculos[0]?.placa || 'M4X-821',
      infractor: '',
      inspector: 'Suboficial PNP / Inspector Municipal',
      lugar: '',
      tipoInfraccionId: tiposInfraccion[0]?.id || 1,
      observacionesAutoridad: '',
      observacionesConductor: '',
    })
    setIsModalOpen(true)
  }

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
        await fetch(`http://localhost:8080/api/papeletas/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
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
        const response = await fetch(`http://localhost:8080/api/papeletas/${selectedPapeleta.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData)
        })
        if (response.ok) {
          setPapeletas(papeletas.map(p => 
            p.id === selectedPapeleta.id 
              ? { ...p, ...formData, detalles: [{ tipoInfraccionId: tipoInf ? tipoInf.id : 1, codigo: tipoInf ? tipoInf.codigo : 'G01' }], montoTotal: tipoInf ? tipoInf.montoBase : 0 } 
              : p
          ))
        }
      } else {
        const response = await fetch('http://localhost:8080/api/papeletas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(formData)
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
        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-rose-600/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-600/30 active:scale-95 cursor-pointer"
        >
          <span className="text-lg leading-none">+</span>
          <span>Emitir Papeleta</span>
        </button>
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
                <th className="px-4 py-3.5 text-right whitespace-nowrap">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPapeletas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                    <p className="text-3xl">🎫</p>
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron papeletas</p>
                  </td>
                </tr>
              ) : (
                filteredPapeletas.map((p) => {
                  const tipoInf = tiposInfraccion.find((t) => t.id === p.detalles?.[0]?.tipoInfraccionId)
                  return (
                    <tr key={p.id} className="transition-colors hover:bg-rose-50/30 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono font-extrabold text-rose-700 dark:text-rose-400">{p.numeroPapeleta}</span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center justify-center rounded-lg border-2 border-slate-900 bg-amber-300 px-3 py-1 font-mono text-xs font-black tracking-widest text-slate-950 dark:border-slate-800 dark:bg-amber-400 dark:text-slate-950">
                          {p.vehiculoPlaca}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <p className="font-bold text-slate-800 dark:text-white truncate" title={p.infractor}>{p.infractor}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[180px]" title={p.lugar}>📍 {p.lugar}</p>
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
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
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
      </div>

      {/* Modal: Emitir Papeleta */}
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
                  <input type="text" required value={formData.vehiculoPlaca} onChange={(e) => setFormData({ ...formData, vehiculoPlaca: e.target.value.toUpperCase() })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 font-mono text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
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

      {/* Modal: Detalle */}
      {isDetailModalOpen && selectedPapeleta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0f172a]">
            <div className="flex items-center justify-between border-b border-rose-600/20 bg-rose-50 p-5 dark:bg-rose-950/30">
              <div>
                <h3 className="text-xl font-black text-rose-700 dark:text-rose-400">{selectedPapeleta.numeroPapeleta}</h3>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-white cursor-pointer">✕</button>
            </div>
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <p className="font-bold text-slate-700 dark:text-slate-300">Conductor: {selectedPapeleta.infractor}</p>
                <span className="font-mono font-black text-rose-600">S/ {selectedPapeleta.montoTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setIsDetailModalOpen(false); handleOpenPreview(selectedPapeleta); }} className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white cursor-pointer">Imprimir Boleta</button>
                <button onClick={() => setIsDetailModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 cursor-pointer">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Preview Boleta */}
      {isPreviewModalOpen && selectedPapeleta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800">
            <div className="border-b border-rose-900 bg-[#1c080e] p-6 text-white text-center relative">
              <button onClick={() => setIsPreviewModalOpen(false)} className="absolute right-4 top-4 rounded-full p-1 text-slate-400 cursor-pointer">✕</button>
              <h3 className="text-xl font-black mt-1">BOLETA DE INFRACCIÓN</h3>
              <p className="text-xs font-mono font-bold text-amber-300 mt-0.5">{selectedPapeleta.numeroPapeleta}</p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-slate-700 dark:text-slate-300">Infractor: {selectedPapeleta.infractor}</p>
              <p className="text-slate-700 dark:text-slate-300">Placa: {selectedPapeleta.vehiculoPlaca}</p>
              <p className="font-mono font-black text-rose-600">Total: S/ {selectedPapeleta.montoTotal.toFixed(2)}</p>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => window.print()} className="rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-extrabold text-white cursor-pointer">Imprimir</button>
                <button onClick={() => setIsPreviewModalOpen(false)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white cursor-pointer">Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}