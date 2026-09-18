import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { apiFetch, getCachedData, setCachedData } from '../config/api'

export function Pagos() {
  const cached = getCachedData('/pagos')
  const [pagos, setPagos] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterTipoPago, setFilterTipoPago] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(8)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [origenes, setOrigenes] = useState({ PAPELETA: [], TRAMITE: [], CURSO: [] })
  const [pagoToConfirm, setPagoToConfirm] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedPago, setSelectedPago] = useState(null)
  const [loadError, setLoadError] = useState('')

  const [formData, setFormData] = useState({
    numeroRecibo: '', tipoPago: 'TRAMITE', metodo: 'EFECTIVO', montoTotal: 0,
    numeroVoucher: '', referenciaPago: '', origenId: '', fechaPago: ''
  })

  const handleOpenCreateModal = async () => {
    setPagoToConfirm(null)
    setFormData({ numeroRecibo: '', tipoPago: 'TRAMITE', metodo: 'EFECTIVO', numeroVoucher: '', referenciaPago: '', origenId: '', fechaPago: '' })
    setIsModalOpen(true)
    try {
      const res = await apiFetch('/pagos/origenes')
      const data = await res.json()
      if (!res.ok) throw new Error('No se pudieron cargar los registros de origen.')
      setOrigenes(data.data)
    } catch (error) { alert(error.message) }
  }

  const handleConfirm = (pago) => {
    setPagoToConfirm(pago)
    setFormData({ numeroRecibo: '', tipoPago: pago.tipoPago, metodo: 'EFECTIVO', numeroVoucher: '', referenciaPago: '', fechaPago: '' })
    setIsModalOpen(true)
  }

  useQuickCreate(handleOpenCreateModal, !isLoading)

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro que desea anular este recibo de pago?')) {
      try {
        const response = await apiFetch(`/pagos/${id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('No se pudo anular el pago')
        setPagos(pagos.map(p => p.id === id ? { ...p, estado: 'ANULADO' } : p))
      } catch (err) {
        console.error('Error al anular:', err)
        alert('Error al anular el pago')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (isSaving) return
    
    // Validaciones
    if (pagoToConfirm) {
      if (!formData.numeroRecibo.trim() || !formData.fechaPago) {
        alert('Por favor ingresa el número de recibo y la fecha de pago.')
        return
      }
      if (new Date(formData.fechaPago) > new Date()) {
        alert('La fecha de pago no puede ser futura.')
        return
      }
    } else {
      if (!formData.origenId) {
        alert('Por favor selecciona un registro asociado para generar el pago.')
        return
      }
    }

    setIsSaving(true)
    try {
      const key = { PAPELETA: 'papeletaId', TRAMITE: 'tramiteId', CURSO: 'inscripcionId' }[formData.tipoPago]
      const response = await apiFetch(pagoToConfirm ? `/pagos/${pagoToConfirm.id}/confirmar` : '/pagos', {
        method: 'POST',
        body: pagoToConfirm ? { ...formData, metodoPago: formData.metodo } : { tipoPago: formData.tipoPago, [key]: Number(formData.origenId) }
      })
      const result = await response.json()
      if (!response.ok) throw new Error(Object.values(result.messages || {}).join(' ') || result.message || 'No se pudo guardar el pago.')
      setPagos(prev => [result.data, ...prev.filter(p => p.id !== result.data.id)])
      setIsModalOpen(false)
    } catch (err) { alert(err.message) }
    finally { setIsSaving(false) }
  }

  const totalPagos = pagos.length
  const totalMonto = pagos.filter(p => p.estado === 'PAGADO').reduce((acc, curr) => acc + (curr.montoTotal || 0), 0)
  const pagosHoy = pagos.filter(p => p.estado === 'PAGADO' && p.fecha && new Date(p.fecha).toDateString() === new Date().toDateString()).length

  const [filterEstado, setFilterEstado] = useState('TODOS')

  const filteredPagos = pagos.filter((p) => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      (p.numeroRecibo || String(p.id)).toLowerCase().includes(search) ||
      p.numeroVoucher?.toLowerCase().includes(search) ||
      p.referenciaPago?.toLowerCase().includes(search) ||
      p.tipoPago?.toLowerCase().includes(search)

    const matchesTipoPago = filterTipoPago === 'TODOS' || p.tipoPago === filterTipoPago
    const matchesEstado = filterEstado === 'TODOS' || 
      (filterEstado === 'PAGADO' ? p.estado === 'PAGADO' : p.estado !== 'PAGADO')
    
    return matchesSearch && matchesTipoPago && matchesEstado
  })

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterTipoPago, filterEstado])

  const paginatedPagos = filteredPagos.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  useEffect(() => {
    setLoadError('')
    apiFetch('/pagos')
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        const pData = data.data || []
        setPagos(pData)
        setCachedData('/pagos', pData)
      })
      .catch(() => setLoadError('No se pudo cargar el registro de pagos.'))
      .finally(() => setIsLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      {loadError && <PageLoadError message={loadError} />}
      
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3.5">
          
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6"
            >
              <rect width="20" height="12" x="2" y="6" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                Pagos de Tránsito
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              Control de ingresos por papeletas de infracción, licencias, cursos de seguridad vial y tasas municipales.
            </p>
          </div>
        </div>
      </div>

      
      <div className="grid gap-4 sm:grid-cols-3 print:hidden">
        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-400">Total Recaudado</span>
            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 font-bold text-sm">💰</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900 dark:text-white">S/ {totalMonto.toFixed(2)}</p>
            <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">Acumulado</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-400">Operaciones</span>
            <span className="grid size-10 place-items-center rounded-xl bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 font-bold text-sm">🧾</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{totalPagos}</p>
            <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">Pagos registrados</span>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md dark:border-slate-800 dark:bg-[#0f172a]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-emerald-400">Pagos de Hoy</span>
            <span className="grid size-10 place-items-center rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 font-bold text-sm">📅</span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <p className="text-3xl font-black text-slate-900 dark:text-white">{pagosHoy}</p>
            <span className="rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">Jornada Actual</span>
          </div>
        </div>
      </div>

      
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a] print:hidden">
        
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por N° recibo, voucher, referencia o tipo de pago..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-emerald-200/80 bg-emerald-50/20 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-emerald-400"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-bold text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODOS">Cualquier Estado</option>
              <option value="PAGADO">Pagados</option>
              <option value="PENDIENTE">Pendientes por pagar</option>
            </select>
            <select
              value={filterTipoPago}
              onChange={(e) => setFilterTipoPago(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-bold text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODOS">Todos los tipos</option>
              <option value="PAPELETA">Papeletas</option>
              <option value="TRAMITE">Trámites</option>
              <option value="CURSO">Cursos</option>
              <option value="INTERNAMIENTO">Internamientos</option>
            </select>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-emerald-600/30 active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <span className="text-base leading-none font-black">+</span>
              <span>Registrar Pago</span>
            </button>
          </div>
        </div>

        
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div>
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Mostrando {filteredPagos.length}
            </span>{" "}
            de {pagos.length} pagos registrados
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            Cierre Diario Municipal - 2026
          </div>
        </div>

        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800/50 dark:bg-[#0f172a] dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">N° RECIBO</th>
                <th className="px-4 py-3.5 whitespace-nowrap">FECHA / HORA</th>
                <th className="px-4 py-3.5 whitespace-nowrap">TIPO / VOUCHER</th>
                <th className="px-4 py-3.5 whitespace-nowrap">MÉTODO</th>
                <th className="px-4 py-3.5 whitespace-nowrap">MONTO TOTAL</th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-[#0f172a] px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800/50 dark:bg-[#0f172a]">
              {isLoading && pagos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-40 rounded bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="px-4 py-4">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-slate-800" />
                        <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-slate-800/60" />
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-slate-800" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[#0f172a] px-4 py-4 text-right border-l border-slate-100 dark:border-slate-800"><div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-slate-800" /></td>
                  </tr>
                ))
              ) : filteredPagos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <p className="text-4xl mb-2">💸</p>
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron pagos registrados</p>
                    <p className="text-xs text-slate-400">Intenta buscar con otros términos o filtros.</p>
                  </td>
                </tr>
              ) : (
                paginatedPagos.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-emerald-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="font-bold text-slate-900 dark:text-white">{p.numeroRecibo || 'Pendiente de recibo'}</p>
                      <span className="mt-0.5 inline-block rounded-md bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        CAJA MUNICIPAL
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{p.fecha ? new Date(p.fecha + 'T00:00:00').toLocaleDateString() : 'Sin fecha de pago'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {p.tipoPago} #{p.papeletaId || p.tramiteId || p.inscripcionId}
                      </p>
                    </td>
                    <td className="px-4 py-3.5 max-w-[220px]">
                      <p className="font-bold text-slate-900 dark:text-white">{p.tipoPago || 'TRAMITE'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{p.numeroVoucher || 'Sin voucher'}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${p.metodo === 'EFECTIVO'
                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                        }`}>
                        {p.metodo || 'Sin confirmar'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="font-black text-slate-900 dark:text-white">S/ {p.montoTotal?.toFixed(2) || '0.00'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{p.estado}</p>
                    </td>
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-emerald-50/40 dark:bg-[#0f172a] dark:group-hover:bg-slate-800/60 px-4 py-3.5 text-right whitespace-nowrap border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                      <div className="flex items-center justify-end gap-1.5 pr-1">
                        {p.estado === 'PENDIENTE' && p.tipoPago !== 'INTERNAMIENTO' && <button onClick={() => handleConfirm(p)} className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">Confirmar recibo</button>}
                        <button onClick={() => { setSelectedPago(p); setIsDetailModalOpen(true); }} className="rounded-xl p-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-950/60 dark:text-emerald-400 transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer" title="Ver Detalle">
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button disabled={p.estado !== 'PAGADO'} onClick={() => { setSelectedPago(p); setIsPreviewModalOpen(true); }} className="rounded-xl p-1.5 bg-sky-50 text-sky-600 hover:bg-sky-500 hover:text-white dark:bg-sky-950/60 dark:text-sky-400 transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer" title="Imprimir Ticket">
                          <Icon name="print" className="size-4" />
                        </button>
                        {p.tipoPago !== 'INTERNAMIENTO' && (
                          <button disabled={p.estado === 'ANULADO'} onClick={() => handleDelete(p.id)} className="rounded-xl p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white dark:bg-rose-950/60 dark:text-rose-400 transition-all duration-200 shadow-2xs hover:shadow-md active:scale-95 cursor-pointer" title="Anular Pago">
                            <Icon name="trash" className="size-4" />
                          </button>
                        )}
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
          totalItems={filteredPagos.length}
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
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">{pagoToConfirm ? 'Confirmar recibo de pago' : 'Generar pago pendiente'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
              {pagoToConfirm ? (
                <div className="space-y-4">
                  <p className="font-bold">Monto: S/ {pagoToConfirm.montoTotal.toFixed(2)}</p>
                  <label className="block text-sm">Número real del recibo
                    <input required maxLength={50} value={formData.numeroRecibo} onChange={e => setFormData({ ...formData, numeroRecibo: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 dark:bg-slate-800" />
                  </label>
                  <label className="block text-sm">Fecha que figura en el recibo
                    <input required type="date" value={formData.fechaPago} onChange={e => setFormData({ ...formData, fechaPago: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 dark:bg-slate-800" />
                  </label>
                  <label className="block text-sm">Método de pago
                    <select value={formData.metodo} onChange={e => setFormData({ ...formData, metodo: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 dark:bg-slate-800">
                      <option value="EFECTIVO">Efectivo</option><option value="TARJETA">Tarjeta</option><option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </label>
                  <label className="block text-sm">Voucher o referencia (opcional)
                    <input maxLength={100} value={formData.referenciaPago} onChange={e => setFormData({ ...formData, referenciaPago: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 dark:bg-slate-800" />
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-slate-500">El importe se obtiene del registro seleccionado. El recibo se ingresa después de realizar el pago.</p>
                  <label className="block text-sm">Tipo de pago
                    <select value={formData.tipoPago} onChange={e => setFormData({ ...formData, tipoPago: e.target.value, origenId: '' })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 dark:bg-slate-800">
                      <option value="TRAMITE">Trámite</option><option value="PAPELETA">Papeleta</option><option value="CURSO">Inscripción a curso</option>
                    </select>
                  </label>
                  <label className="block text-sm">Registro asociado
                    <select required value={formData.origenId || ''} onChange={e => setFormData({ ...formData, origenId: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 dark:bg-slate-800">
                      <option value="">Seleccione un registro</option>
                      {(origenes[formData.tipoPago] || []).map(o => <option key={o.id} value={o.id}>{o.nombre || formData.tipoPago} — #{o.id}</option>)}
                    </select>
                  </label>
                  {!(origenes[formData.tipoPago] || []).length && <p className="text-sm text-amber-700">No hay registros disponibles para este tipo de pago.</p>}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" disabled={isSaving} className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 cursor-pointer">{isSaving ? 'Guardando…' : pagoToConfirm ? 'Confirmar recibo' : 'Generar pendiente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-[#0f172a] p-6">
            <h3 className="text-xl font-black mb-2 text-slate-800 dark:text-white">Detalle del Recibo</h3>
            <p className="text-xs text-slate-500 mb-6">{selectedPago.numeroRecibo}</p>
            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p><strong>Fecha:</strong> {selectedPago.fecha ? new Date(selectedPago.fecha + 'T00:00:00').toLocaleDateString() : 'Pendiente'}</p>
              <p><strong>Tipo de pago:</strong> {selectedPago.tipoPago || 'TRAMITE'}</p>
              <p><strong>Método de Pago:</strong> {selectedPago.metodo}</p>
              <p><strong>N° Voucher:</strong> {selectedPago.numeroVoucher || 'Sin voucher'}</p>
              <p><strong>Referencia:</strong> {selectedPago.referenciaPago || 'Sin referencia'}</p>
              <p className="text-emerald-600 font-bold dark:text-emerald-400"><strong>Monto ({selectedPago.estado}):</strong> S/ {selectedPago.montoTotal?.toFixed(2)}</p>
            </div>
            <div className="mt-8 flex justify-end gap-2">
              <button disabled={selectedPago.estado !== 'PAGADO'} onClick={() => { setIsDetailModalOpen(false); setIsPreviewModalOpen(true); }} className="rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-sky-700 cursor-pointer inline-flex items-center gap-1.5"><Icon name="print" className="size-4" /> Imprimir</button>
              <button onClick={() => setIsDetailModalOpen(false)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 cursor-pointer">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {isPreviewModalOpen && selectedPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter print:static print:block print:p-0 print:bg-transparent">
          <div id="seccion-impresion-ticket" className="w-full max-w-sm overflow-hidden rounded-md bg-white shadow-2xl dark:bg-slate-100 p-8 text-center text-slate-900 font-mono text-xs">
            <h4 className="font-bold text-sm mb-1">MUNICIPALIDAD DISTRITAL JLO</h4>
            <p className="mb-4">TICKET DE PAGO MUNICIPAL</p>
            <p className="text-left"><strong>N° RECIBO:</strong> {selectedPago.numeroRecibo}</p>
            <p className="text-left"><strong>FECHA:</strong> {new Date(selectedPago.fecha).toLocaleString()}</p>
            <div className="my-4 border-y border-dashed border-slate-400 py-2 text-left">
              <p className="font-bold mb-1">TIPO: {selectedPago.tipoPago || 'TRAMITE'}</p>
              <p>VOUCHER: {selectedPago.numeroVoucher || '---'}</p>
              <p>MÉTODO: {selectedPago.metodo}</p>
            </div>
            <div className="text-right text-sm">
              <p><strong>TOTAL: S/ {selectedPago.montoTotal?.toFixed(2)}</strong></p>
            </div>
            <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between print:hidden">
              <button onClick={() => window.print()} className="bg-emerald-600 text-white px-4 py-2 rounded font-sans font-bold hover:bg-emerald-700">Imprimir</button>
              <button onClick={() => setIsPreviewModalOpen(false)} className="bg-slate-800 text-white px-4 py-2 rounded font-sans font-bold hover:bg-slate-700">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
