import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'

export function Pagos() {
  const [pagos, setPagos] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterConcepto, setFilterConcepto] = useState('TODOS')
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false)
  const [selectedPago, setSelectedPago] = useState(null)

  const [formData, setFormData] = useState({
    numeroRecibo: '', concepto: '', metodo: 'EFECTIVO', montoNeto: 0,
    contribuyente: '', dniRuc: ''
  })

  const handleOpenCreateModal = () => {
    setFormData({
      numeroRecibo: `REC-2026-${String(pagos.length + 1).padStart(5, '0')}`,
      concepto: '', metodo: 'EFECTIVO', montoNeto: 0,
      contribuyente: '', dniRuc: ''
    })
    setIsModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('¿Está seguro que desea anular este recibo de pago?')) {
      try {
        await fetch(`http://localhost:8080/api/pagos/${id}`, {
          method: 'DELETE',
          credentials: 'include'
        })
        setPagos(pagos.map(p => p.id === id ? { ...p, estado: 'ANULADO' } : p))
      } catch (err) {
        console.error('Error al anular:', err)
        alert('Error al anular el pago')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    const payload = {
      ...formData,
      monto: parseFloat(formData.montoNeto) || 0,
      metodoPago: formData.metodo,
      documentoIdentidad: formData.dniRuc
    }
    
    try {
      const response = await fetch('http://localhost:8080/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      const result = await response.json()
      if (response.ok && result.data) {
        // Map backend fields to frontend expected fields if necessary, or just use what backend returned
        const newPago = {
          ...result.data,
          fecha: result.data.fechaHora,
          metodo: result.data.metodoPago,
          dniRuc: result.data.documentoIdentidad
        }
        setPagos([newPago, ...pagos])
      }
      setIsModalOpen(false)
    } catch (err) {
      console.error('Error guardando pago:', err)
      alert('Error al registrar el pago')
    }
  }

  // Stats calculation
  const totalPagos = pagos.length
  const totalMonto = pagos.reduce((acc, curr) => acc + (curr.montoNeto || 0), 0)
  const pagosHoy = pagos.filter(p => new Date(p.fecha).toDateString() === new Date().toDateString()).length

  const filteredPagos = pagos.filter((p) => {
    const search = searchTerm.toLowerCase()
    const matchesSearch =
      p.numeroRecibo?.toLowerCase().includes(search) ||
      p.concepto?.toLowerCase().includes(search) ||
      p.contribuyente?.toLowerCase().includes(search) ||
      p.dniRuc?.toLowerCase().includes(search)

    const matchesConcepto = filterConcepto === 'TODOS' || p.concepto?.includes(filterConcepto)
    return matchesSearch && matchesConcepto
  })

  useEffect(() => {
    fetch('http://localhost:8080/api/pagos', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setPagos(data.data || [])
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Error fetching pagos:', err)
        setIsLoading(false)
      })
  }, [])


  return (
    <div className="space-y-6">
      {/* Cabecera Principal Mejorada */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3.5">
          {/* Contenedor de Ícono Verde*/}
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
                Caja y Recaudación
              </h1>
            </div>
            <p className="mt-0.5 text-xs font-medium text-slate-600 dark:text-slate-400">
              Control de ingresos por papeletas de infracción, licencias, cursos CERTICAV y tasas municipales.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-600/25 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-600/30 active:scale-95 cursor-pointer"
          >
            <span className="text-lg leading-none">+</span>
            <span>Registrar Pago</span>
          </button>
        </div>
      </div>

      {/* Tarjetas de Indicadores Rápidos (KPIs) */}
      <div className="grid gap-4 sm:grid-cols-3">
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
            <span className="rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300">Recibos Emitidos</span>
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

      {/* Contenido Principal */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0f172a]">
        {/* Barra de Búsqueda y Filtros */}
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Icon name="search" className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por N° Recibo, contribuyente, DNI/RUC o concepto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-emerald-200/80 bg-emerald-50/20 py-2.5 pl-10 pr-4 text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-slate-800/50 dark:text-white dark:focus:border-emerald-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterConcepto}
              onChange={(e) => setFilterConcepto(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white py-2.5 px-3.5 text-xs font-bold text-slate-700 outline-none transition focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 cursor-pointer"
            >
              <option value="TODOS">Todos los Conceptos</option>
              <option value="PAPELETA">Papeletas de Infracción</option>
              <option value="CURSO">Cursos de Seguridad Vial</option>
              <option value="PERMISO">Permisos y TUC</option>
            </select>
          </div>
        </div>

        {/* Sub-header Contador */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-2.5 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <div>
            <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Mostrando {filteredPagos.length}
            </span>{" "}
            de {pagos.length} recibos registrados
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            Cierre Diario Municipal - 2026
          </div>
        </div>

        {/* Tabla de Pagos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-y border-slate-100 bg-slate-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:border-slate-800/50 dark:bg-[#0f172a] dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">N° RECIBO</th>
                <th className="px-5 py-3.5 whitespace-nowrap">FECHA / HORA</th>
                <th className="px-5 py-3.5 whitespace-nowrap">CONCEPTO / TASA</th>
                <th className="px-5 py-3.5 whitespace-nowrap">MÉTODO</th>
                <th className="px-5 py-3.5 whitespace-nowrap">MONTO TOTAL</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800/50 dark:bg-[#0f172a]">
              {filteredPagos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-12 text-center">
                    <p className="text-4xl mb-2">💸</p>
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron pagos registrados</p>
                    <p className="text-xs text-slate-400">Intenta buscar con otros términos o filtros.</p>
                  </td>
                </tr>
              ) : (
                filteredPagos.map((p) => (
                  <tr key={p.id} className="transition-colors hover:bg-emerald-50/30 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-900 dark:text-white">{p.numeroRecibo}</p>
                      <span className="mt-0.5 inline-block rounded-md bg-emerald-100/70 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        CAJA MUNICIPAL
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{new Date(p.fecha || new Date()).toLocaleDateString()}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {new Date(p.fecha || new Date()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} HRS
                      </p>
                    </td>
                    <td className="px-5 py-4 min-w-[260px]">
                      <p className="font-bold text-slate-900 dark:text-white truncate" title={p.concepto}>{p.concepto}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">TRIBUTO / TASA MUNICIPAL</p>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${p.metodo === 'EFECTIVO'
                        ? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                        }`}>
                        {p.metodo || 'EFECTIVO'}
                      </span>
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="font-black text-slate-900 dark:text-white">S/ {p.montoNeto?.toFixed(2) || '0.00'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">CANCELADO</p>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setSelectedPago(p); setIsDetailModalOpen(true); }} className="rounded-full p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-400 transition-colors cursor-pointer" title="Ver Detalle">
                          <Icon name="eye" className="size-4" />
                        </button>
                        <button onClick={() => { setSelectedPago(p); setIsPreviewModalOpen(true); }} className="rounded-full p-2 bg-sky-50 text-sky-600 hover:bg-sky-100 dark:bg-sky-950/60 dark:text-sky-400 transition-colors cursor-pointer" title="Imprimir Ticket">
                          <Icon name="print" className="size-4" />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="rounded-full p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-400 transition-colors cursor-pointer" title="Anular Pago">
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
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">Registrar Recaudación</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-800 cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 space-y-4 overflow-y-auto p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">N° Recibo</label>
                  <input type="text" value={formData.numeroRecibo} disabled className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm text-slate-500 outline-none dark:border-slate-700 dark:bg-slate-800" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Método de Pago</label>
                  <select required value={formData.metodo} onChange={e => setFormData({...formData, metodo: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                    <option value="EFECTIVO">Efectivo</option>
                    <option value="TARJETA">Tarjeta (POS)</option>
                    <option value="TRANSFERENCIA">Transferencia Bancaria</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Concepto *</label>
                <input type="text" required value={formData.concepto} onChange={e => setFormData({...formData, concepto: e.target.value})} placeholder="Ej. Pago por Curso CERTICAV" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Contribuyente *</label>
                  <input type="text" required value={formData.contribuyente} onChange={e => setFormData({...formData, contribuyente: e.target.value})} placeholder="Ej. Juan Pérez" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">DNI / RUC *</label>
                  <input type="text" required value={formData.dniRuc} onChange={e => setFormData({...formData, dniRuc: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">Monto Total (S/) *</label>
                <input type="number" step="0.01" required value={formData.montoNeto} onChange={e => setFormData({...formData, montoNeto: e.target.value})} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancelar</button>
                <button type="submit" className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 cursor-pointer">Registrar Pago</button>
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
              <p><strong>Contribuyente:</strong> {selectedPago.contribuyente || 'No registrado'}</p>
              <p><strong>DNI/RUC:</strong> {selectedPago.dniRuc || 'No registrado'}</p>
              <p><strong>Fecha:</strong> {new Date(selectedPago.fecha).toLocaleString()}</p>
              <p><strong>Concepto:</strong> {selectedPago.concepto}</p>
              <p><strong>Método de Pago:</strong> {selectedPago.metodo}</p>
              <p className="text-emerald-600 font-bold dark:text-emerald-400"><strong>Monto Pagado:</strong> S/ {selectedPago.montoNeto?.toFixed(2)}</p>
            </div>
            <div className="mt-8 flex justify-end gap-2">
              <button onClick={() => { setIsDetailModalOpen(false); setIsPreviewModalOpen(true); }} className="rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-sky-700 cursor-pointer inline-flex items-center gap-1.5"><Icon name="print" className="size-4" /> Imprimir</button>
              <button onClick={() => setIsDetailModalOpen(false)} className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 cursor-pointer">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {isPreviewModalOpen && selectedPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-sm overflow-hidden rounded-md bg-white shadow-2xl dark:bg-slate-100 p-8 text-center text-slate-900 font-mono text-xs">
            <h4 className="font-bold text-sm mb-1">MUNICIPALIDAD DISTRITAL JLO</h4>
            <p className="mb-4">TICKET DE PAGO MUNICIPAL</p>
            <p className="text-left"><strong>N° RECIBO:</strong> {selectedPago.numeroRecibo}</p>
            <p className="text-left"><strong>FECHA:</strong> {new Date(selectedPago.fecha).toLocaleString()}</p>
            <p className="text-left mt-2 border-t border-slate-300 pt-2"><strong>CLIENTE:</strong> {selectedPago.contribuyente || '---'}</p>
            <p className="text-left"><strong>DNI/RUC:</strong> {selectedPago.dniRuc || '---'}</p>
            <div className="my-4 border-y border-dashed border-slate-400 py-2 text-left">
              <p className="font-bold mb-1">{selectedPago.concepto}</p>
              <p>MÉTODO: {selectedPago.metodo}</p>
            </div>
            <div className="text-right text-sm">
              <p><strong>TOTAL: S/ {selectedPago.montoNeto?.toFixed(2)}</strong></p>
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