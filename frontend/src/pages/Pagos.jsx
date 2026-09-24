import { useState, useEffect } from 'react'
import { showToast, showConfirm, showError, showSuccess } from '../utils/SwalUtil'
import { Icon } from '../components/ui/Icon'
import { PageLoadError } from '../components/ui/PageLoadError'
import { useQuickCreate } from '../hooks/useQuickCreate'
import { Pagination } from '../components/ui/Pagination'
import { sanitizarMensaje, apiFetch, getCachedData, setCachedData } from '../config/api'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { RoundedSelect } from '../components/ui/FormInputs'

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'PAGADO', label: 'Pagados' },
  { value: 'PENDIENTE', label: 'Pendientes' },
]

const FILTER_TIPO_OPTIONS = [
  { value: 'TODOS', label: 'Todos los tipos' },
  { value: 'PAPELETA', label: 'Papeletas' },
  { value: 'TRAMITE', label: 'Trámites' },
  { value: 'CURSO', label: 'Cursos' },
  { value: 'INTERNAMIENTO', label: 'Internamientos' },
]

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

  // Estado para Arqueo de Caja Diario
  const [isArqueoModalOpen, setIsArqueoModalOpen] = useState(false)
  const [arqueoFecha, setArqueoFecha] = useState(new Date().toISOString().slice(0, 10))
  const [arqueoData, setArqueoData] = useState(null)
  const [isLoadingArqueo, setIsLoadingArqueo] = useState(false)

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
    } catch (error) { showError('Error', sanitizarMensaje(error.message, 'No se pudo registrar el pago.')) }
  }

  const handleConfirm = (pago) => {
    setPagoToConfirm(pago)
    setFormData({ numeroRecibo: '', tipoPago: pago.tipoPago, metodo: 'EFECTIVO', numeroVoucher: '', referenciaPago: '', fechaPago: '' })
    setIsModalOpen(true)
  }

  useQuickCreate(handleOpenCreateModal, !isLoading)

  const handleDelete = async (id) => {
    const result = await showConfirm(
      '¿Anular recibo?',
      '¿Está seguro que desea anular este recibo de pago? Esta acción no se puede revertir.',
      'Sí, anular',
      'Cancelar'
    )
    if (result.isConfirmed) {
      try {
        const response = await apiFetch(`/pagos/${id}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('No se pudo anular el pago')
        setPagos(pagos.map(p => p.id === id ? { ...p, estado: 'ANULADO' } : p))
        showToast('Pago anulado exitosamente')
      } catch (err) {
        showError('Error', 'Error al anular el pago')
      }
    }
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    if (isSaving) return
    
    // Validaciones
    if (pagoToConfirm) {
      if (!formData.numeroRecibo.trim() || !formData.fechaPago) {
        showError('Validación Fallida', 'Por favor ingresa el número de recibo y la fecha de pago.')
        return
      }
      if (new Date(formData.fechaPago) > new Date()) {
        showError('Validación Fallida', 'La fecha de pago no puede ser futura.')
        return
      }
    } else {
      if (!formData.origenId) {
        showError('Validación Fallida', 'Por favor selecciona un registro asociado para generar el pago.')
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
      showToast('Pago registrado exitosamente')
    } catch (err) { showError('Error', sanitizarMensaje(err.message, 'No se pudo anular el pago.')) }
    finally { setIsSaving(false) }
  }

  const fetchArqueo = async (fecha = arqueoFecha) => {
    setIsLoadingArqueo(true)
    try {
      const res = await apiFetch(`/pagos/arqueo-diario?fecha=${fecha}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Error al obtener el arqueo diario')
      setArqueoData(json.data)
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'Error al cargar arqueo de caja.'))
    } finally {
      setIsLoadingArqueo(false)
    }
  }

  const handleOpenArqueo = () => {
    setIsArqueoModalOpen(true)
    fetchArqueo(arqueoFecha)
  }

  const handleExportPdf = () => {
    exportToPdf({
      filename: `Pagos_${new Date().toISOString().slice(0, 10)}.pdf`,
      title: 'REGISTRO GENERAL DE PAGOS Y RECAUDACIÓN',
      subtitle: 'Municipalidad Distrital José Leonardo Ortiz - Caja de Tránsito',
      metadata: [
        { label: 'Estado', value: filterEstado },
        { label: 'Tipo', value: filterTipoPago },
        { label: 'Total Recaudado', value: `S/ ${totalMonto.toFixed(2)}` }
      ],
      columns: [
        { header: 'N° RECIBO', key: 'numeroRecibo' },
        { header: 'FECHA PAGO', render: (_, r) => r.fecha ? new Date(r.fecha + 'T00:00:00').toLocaleDateString() : 'Pendiente' },
        { header: 'TIPO PAGO', key: 'tipoPago' },
        { header: 'PAGADO POR', render: (_, r) => r.pagadoPor || '—' },
        { header: 'MÉTODO PAGO', key: 'metodo' },
        { header: 'MONTO', render: (_, r) => `S/ ${(r.montoTotal || 0).toFixed(2)}` },
        { header: 'ESTADO', key: 'estado' }
      ],
      data: filteredPagos
    })
  }

  const handleExportExcel = () => {
    exportToExcel({
      filename: `Pagos_${new Date().toISOString().slice(0, 10)}.xls`,
      sheetName: 'Pagos',
      title: 'REGISTRO GENERAL DE PAGOS Y RECAUDACIÓN',
      subtitle: 'Municipalidad Distrital José Leonardo Ortiz - Caja de Tránsito',
      metadata: [
        { label: 'Estado', value: filterEstado },
        { label: 'Tipo', value: filterTipoPago },
        { label: 'Total Recaudado', value: `S/ ${totalMonto.toFixed(2)}` }
      ],
      columns: [
        { header: 'N° RECIBO', key: 'numeroRecibo', isText: true, width: 140 },
        { header: 'FECHA PAGO', render: (_, r) => r.fecha ? new Date(r.fecha + 'T00:00:00').toLocaleDateString() : 'Pendiente', width: 110 },
        { header: 'TIPO PAGO', key: 'tipoPago', width: 130 },
        { header: 'PAGADO POR', render: (_, r) => r.pagadoPor || '—', width: 180 },
        { header: 'N° VOUCHER', key: 'numeroVoucher', isText: true, width: 140 },
        { header: 'REFERENCIA', key: 'referenciaPago', width: 160 },
        { header: 'MÉTODO PAGO', key: 'metodo', width: 120 },
        { header: 'MONTO (S/)', render: (_, r) => `S/ ${(r.montoTotal || 0).toFixed(2)}`, align: 'right', width: 120 },
        { header: 'ESTADO', key: 'estado', align: 'center', width: 110 }
      ],
      data: filteredPagos
    })
  }

  const handleExportArqueoExcel = () => {
    if (!arqueoData || !arqueoData.pagos || arqueoData.pagos.length === 0) {
      showError('Atención', 'No hay movimientos registrados en la fecha seleccionada para exportar.')
      return
    }
    exportToExcel({
      filename: `Arqueo_Caja_${arqueoData.fecha}.xls`,
      sheetName: 'Arqueo',
      title: `ARQUEO Y CIERRE DE CAJA DIARIA - ${arqueoData.fecha}`,
      subtitle: 'Municipalidad Distrital José Leonardo Ortiz - Subgerencia de Tránsito',
      metadata: [
        { label: 'Fecha Cierre', value: arqueoData.fecha },
        { label: 'Total Recaudado', value: `S/ ${arqueoData.totalRecaudado.toFixed(2)}` },
        { label: 'Efectivo', value: `S/ ${(arqueoData.porMetodo?.efectivo || 0).toFixed(2)}` },
        { label: 'Tarjeta', value: `S/ ${(arqueoData.porMetodo?.tarjeta || 0).toFixed(2)}` },
        { label: 'Transferencia', value: `S/ ${(arqueoData.porMetodo?.transferencia || 0).toFixed(2)}` },
        { label: 'Total Operaciones', value: String(arqueoData.totalOperaciones || 0) }
      ],
      columns: [
        { header: 'N° RECIBO', key: 'numeroRecibo', isText: true, width: 140 },
        { header: 'HORA / FECHA', key: 'fecha', width: 150 },
        { header: 'CONCEPTO / TIPO', key: 'tipoPago', width: 140 },
        { header: 'VOUCHER', key: 'numeroVoucher', isText: true, width: 130 },
        { header: 'MÉTODO', key: 'metodo', width: 120 },
        { header: 'CAJERO / OPERADOR', key: 'cajero', width: 180 },
        { header: 'IMPORTE (S/)', render: (_, r) => `S/ ${(r.montoTotal || 0).toFixed(2)}`, align: 'right', width: 120 }
      ],
      data: arqueoData.pagos
    })
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
    <div className="space-y-4">
      {loadError && <PageLoadError message={loadError} />}
      
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-5.5"
            >
              <rect width="20" height="12" x="2" y="6" rx="2" />
              <circle cx="12" cy="12" r="2" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </span>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-white sm:text-2xl">
              Pagos de Tránsito
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Control de ingresos por papeletas de infracción, licencias, cursos de seguridad vial y tasas municipales.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 print:hidden">
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Recaudado</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 text-xs">
              <Icon name="payment" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">S/ {totalMonto.toFixed(2)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-sky-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">Operaciones</span>
            <span className="grid size-6 place-items-center rounded-md bg-sky-50 text-sky-600 dark:bg-sky-950/60 text-xs">
              <Icon name="receiptCheck" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{totalPagos}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-purple-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[var(--bg-surface)] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">Pagos de Hoy</span>
            <span className="grid size-6 place-items-center rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/60 text-xs">
              <Icon name="calendar" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{pagosHoy}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[var(--bg-surface)] flex flex-col print:hidden">
        <div className="flex flex-col gap-2.5 border-b border-slate-100 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-[var(--border)]">
          <div className="relative w-full sm:w-56 md:w-64 lg:w-72 shrink-0">
            <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por N° recibo, voucher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-slate-50/70 py-1.5 pl-9 pr-8 text-xs font-semibold text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-2 focus:ring-emerald-500/20 dark:border-[var(--border)] dark:bg-slate-900/50 dark:text-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <RoundedSelect
              value={filterEstado}
              onChange={setFilterEstado}
              options={FILTER_ESTADO_OPTIONS}
            />
            <RoundedSelect
              value={filterTipoPago}
              onChange={setFilterTipoPago}
              options={FILTER_TIPO_OPTIONS}
            />

            {(filterEstado !== 'TODOS' || filterTipoPago !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterEstado('TODOS')
                  setFilterTipoPago('TODOS')
                  setSearchTerm('')
                }}
                title="Limpiar filtros"
                className="grid size-[32px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-3.5" />
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenArqueo}
              className="inline-flex items-center gap-1.5 rounded-xl border border-purple-200/80 bg-purple-50/70 px-2.5 py-1.5 text-xs font-bold text-purple-700 hover:bg-purple-100 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-purple-300 dark:hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Reporte de Arqueo y Cierre Diario de Caja"
            >
              <Icon name="chart" className="size-3.5 text-purple-600 dark:text-purple-400" />
              <span>Arqueo Diario</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-emerald-300 dark:hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Descargar reporte de pagos en Excel"
            >
              <Icon name="fileSpreadsheet" className="size-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Excel</span>
            </button>
            
            <button
              type="button"
              onClick={handleExportPdf}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-rose-300 dark:hover:bg-[var(--bg-subtle)] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
              title="Imprimir o exportar PDF"
            >
              <Icon name="filePdf" className="size-3.5 text-rose-600 dark:text-rose-400" />
              <span>PDF</span>
            </button>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3 py-1.5 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              title="Registrar nuevo pago"
            >
              <Icon name="plus" className="size-3.5" />
              <span>Registrar Pago</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">N° RECIBO</th>
                <th className="px-4 py-3.5 whitespace-nowrap">FECHA / HORA</th>
                <th className="px-4 py-3.5 whitespace-nowrap">TIPO / VOUCHER</th>
                <th className="px-4 py-3.5 whitespace-nowrap">PAGADO POR</th>
                <th className="px-4 py-3.5 whitespace-nowrap">MÉTODO</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center">MONTO TOTAL</th>
                <th className="sticky right-0 z-20 bg-slate-50/95 dark:bg-[var(--bg-surface)] px-4 py-3.5 text-center whitespace-nowrap border-l border-slate-100 dark:border-[var(--border)] shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white dark:divide-slate-800/50 dark:bg-[var(--bg-surface)]">
              {isLoading && pagos.length === 0 ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td className="px-4 py-4"><div className="h-4 w-24 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-20 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-4 py-4"><div className="h-4 w-40 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-4 py-4">
                      <div className="space-y-1.5">
                        <div className="h-3.5 w-32 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" />
                        <div className="h-2.5 w-20 rounded bg-slate-100 dark:bg-[var(--bg-subtle)]" />
                      </div>
                    </td>
                    <td className="px-4 py-4"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="px-4 py-4"><div className="h-5 w-16 rounded-full bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                    <td className="sticky right-0 z-10 bg-white dark:bg-[var(--bg-surface)] px-4 py-4 text-right border-l border-slate-100 dark:border-[var(--border)]"><div className="h-7 w-20 ml-auto rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                  </tr>
                ))
              ) : filteredPagos.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center">
                    <Icon name="payment" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron pagos registrados</p>
                    <p className="text-xs text-slate-400">Intenta buscar con otros términos o filtros.</p>
                  </td>
                </tr>
              ) : (
                paginatedPagos.map((p) => (
                  <tr key={p.id} className="group transition-colors hover:bg-emerald-50/30 dark:hover:bg-[var(--bg-subtle)]">
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
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-900 dark:text-white">{p.tipoPago || 'TRAMITE'}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{p.numeroVoucher || 'Sin voucher'}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="font-bold text-slate-800 dark:text-slate-200">{p.pagadoPor || '—'}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${p.metodo === 'EFECTIVO'
                        ? 'bg-slate-100 text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300'
                        : 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300'
                        }`}>
                        {p.metodo || 'Sin confirmar'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <p className="font-black text-slate-900 dark:text-white">S/ {p.montoTotal?.toFixed(2) || '0.00'}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">{p.estado}</p>
                    </td>
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-emerald-50/40 dark:bg-[var(--bg-surface)] dark:group-hover:bg-slate-800/60 px-4 py-3.5 text-center whitespace-nowrap border-l border-slate-100 dark:border-slate-800/80 shadow-[-4px_0_8px_rgba(0,0,0,0.03)] dark:shadow-[-4px_0_8px_rgba(0,0,0,0.2)]">
                      <div className="flex items-center justify-center gap-1.5">
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
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4 dark:border-[var(--border)] dark:bg-[var(--bg-surface)]">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white">{pagoToConfirm ? 'Confirmar recibo de pago' : 'Generar pago pendiente'}</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-[var(--bg-subtle)] cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleFormSubmit} className="flex-1 p-6">
              {pagoToConfirm ? (
                <fieldset className="border border-slate-200 rounded-xl p-4 dark:border-[var(--border-strong)]">
                  <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">DETALLES DEL RECIBO</legend>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <p className="font-bold text-slate-800 dark:text-white text-lg">Monto: S/ {pagoToConfirm.montoTotal.toFixed(2)}</p>
                    </div>
                    <label className="block text-sm">Número real del recibo
                      <input required maxLength={50} value={formData.numeroRecibo} onChange={e => setFormData({ ...formData, numeroRecibo: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 dark:bg-[var(--bg-subtle)]" />
                    </label>
                    <label className="block text-sm">Fecha que figura en el recibo
                      <input required type="date" value={formData.fechaPago} onChange={e => setFormData({ ...formData, fechaPago: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 dark:bg-[var(--bg-subtle)]" />
                    </label>
                    <label className="block text-sm">Método de pago
                      <RoundedSelect 
                        value={formData.metodo} 
                        onChange={v => setFormData({ ...formData, metodo: v })} 
                        options={[
                          { value: 'EFECTIVO', label: 'Efectivo' },
                          { value: 'TARJETA', label: 'Tarjeta' },
                          { value: 'TRANSFERENCIA', label: 'Transferencia' }
                        ]} 
                        className="mt-1" 
                      />
                    </label>
                    <label className="block text-sm">Voucher o referencia (opcional)
                      <input maxLength={100} value={formData.referenciaPago} onChange={e => setFormData({ ...formData, referenciaPago: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 dark:bg-[var(--bg-subtle)]" />
                    </label>
                  </div>
                </fieldset>
              ) : (
                <fieldset className="border border-slate-200 rounded-xl p-4 dark:border-[var(--border-strong)]">
                  <legend className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2">DATOS DE PAGO</legend>
                  <p className="text-sm text-slate-500 mb-4">El importe se obtiene del registro seleccionado. El recibo se ingresa después de realizar el pago.</p>
                  <div className="space-y-4">
                    <label className="block text-sm">Tipo de pago
                      <RoundedSelect 
                        value={formData.tipoPago} 
                        onChange={v => setFormData({ ...formData, tipoPago: v, origenId: '' })} 
                        options={[
                          { value: 'TRAMITE', label: 'Trámite' },
                          { value: 'PAPELETA', label: 'Papeleta' },
                          { value: 'CURSO', label: 'Inscripción a curso' }
                        ]}
                        className="mt-1"
                      />
                    </label>
                    <label className="block text-sm">Registro asociado
                      <select required value={formData.origenId || ''} onChange={e => setFormData({ ...formData, origenId: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 p-3 dark:bg-[var(--bg-subtle)]">
                        <option value="">Seleccione un registro</option>
                        {(origenes[formData.tipoPago] || []).map(o => <option key={o.id} value={o.id}>{o.nombre || formData.tipoPago} — #{o.id}</option>)}
                      </select>
                    </label>
                    {!(origenes[formData.tipoPago] || []).length && <p className="text-sm text-amber-700">No hay registros disponibles para este tipo de pago.</p>}
                  </div>
                </fieldset>
              )}
              <div className="flex justify-end gap-3 pt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer dark:border-[var(--border-strong)] dark:text-slate-300 dark:hover:bg-[var(--bg-subtle)]">Cancelar</button>
                <button type="submit" disabled={isSaving} className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-extrabold text-white shadow-md hover:bg-emerald-700 cursor-pointer">{isSaving ? 'Guardando…' : pagoToConfirm ? 'Confirmar recibo' : 'Generar pendiente'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDetailModalOpen && selectedPago && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-enter">
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)] p-6">
            <h3 className="text-xl font-black mb-2 text-slate-800 dark:text-white">Detalle del Recibo</h3>
            <p className="text-xs text-slate-500 mb-6">{selectedPago.numeroRecibo}</p>
            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <p><strong>Fecha:</strong> {selectedPago.fecha ? new Date(selectedPago.fecha + 'T00:00:00').toLocaleDateString() : 'Pendiente'}</p>
              <p><strong>Tipo de pago:</strong> {selectedPago.tipoPago || 'TRAMITE'}</p>
              <p><strong>Pagado por:</strong> {selectedPago.pagadoPor || 'No identificado'}</p>
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
              <p>PAGADO POR: {selectedPago.pagadoPor || 'No identificado'}</p>
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

      {/* MODAL DE ARQUEO Y CIERRE DE CAJA DIARIO */}
      {isArqueoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-xs animate-enter print:static print:block print:p-8 print:bg-transparent print:overflow-visible">
          <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[var(--bg-surface)] print:max-h-none print:border-none print:shadow-none print:rounded-none">
            {/* Cabecera del modal */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 dark:border-[var(--border)] dark:bg-slate-900/80 print:bg-transparent print:border-black print:pb-2 print:mb-4 print:px-0">
              <div className="flex items-center gap-3 print:w-full print:justify-center print:flex-col print:gap-1">
                <span className="grid size-10 place-items-center rounded-xl bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 print:hidden">
                  <Icon name="chart" className="size-5" />
                </span>
                <div className="print:text-center">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white print:text-xl print:uppercase print:tracking-widest print:text-black">
                    Arqueo y Cierre Diario de Caja
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 print:text-black">
                    Conciliación de recaudación municipal, métodos de pago y rendición por cajero.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <input
                  type="date"
                  value={arqueoFecha}
                  onChange={(e) => {
                    setArqueoFecha(e.target.value)
                    fetchArqueo(e.target.value)
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 outline-none transition hover:border-purple-300 focus:border-purple-500 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200"
                />
                <button
                  type="button"
                  onClick={() => fetchArqueo(arqueoFecha)}
                  disabled={isLoadingArqueo}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-100 hover:text-purple-600 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                  title="Actualizar arqueo"
                >
                  <Icon name="refresh" className={`size-4 ${isLoadingArqueo ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsArqueoModalOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-[var(--bg-subtle)] dark:hover:text-slate-200 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Contenido scrolleable */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6 print:overflow-visible print:p-0">
              {isLoadingArqueo ? (
                <div className="py-16 text-center">
                  <div className="inline-block size-8 animate-spin rounded-full border-4 border-purple-600 border-t-transparent"></div>
                  <p className="mt-3 text-xs font-bold text-slate-500">Calculando balance de caja...</p>
                </div>
              ) : !arqueoData ? (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-sm">No se pudieron cargar los datos del arqueo.</p>
                </div>
              ) : (
                <>
                  {/* Tarjetas de Balance */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 print:grid-cols-2 print:gap-4">
                    <div className="rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-900/60 dark:bg-purple-950/30 print:bg-transparent print:border-slate-400 print:rounded-none print:p-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 print:text-black">
                        <span>Total Recaudado</span>
                        <Icon name="payment" className="size-3.5 print:hidden" />
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-black print:text-lg">
                        S/ {Number(arqueoData.totalRecaudado || 0).toFixed(2)}
                      </p>
                      <span className="mt-1 inline-block rounded-md bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-900 dark:text-purple-300 print:bg-transparent print:p-0 print:text-black font-mono">
                        {arqueoData.totalOperaciones} operaciones
                      </span>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30 print:bg-transparent print:border-slate-400 print:rounded-none print:p-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 print:text-black">
                        <span>Efectivo en Caja</span>
                        <Icon name="payment" className="size-3.5 print:hidden" />
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-black print:text-lg">
                        S/ {Number(arqueoData.porMetodo?.efectivo || 0).toFixed(2)}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 print:text-black font-mono">
                        Caja física para custodia
                      </p>
                    </div>

                    <div className="rounded-2xl border border-sky-200 bg-sky-50/50 p-4 dark:border-sky-900/60 dark:bg-sky-950/30 print:bg-transparent print:border-slate-400 print:rounded-none print:p-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 print:text-black">
                        <span>Tarjetas (POS)</span>
                        <Icon name="creditCard" className="size-3.5 print:hidden" />
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-black print:text-lg">
                        S/ {Number(arqueoData.porMetodo?.tarjeta || 0).toFixed(2)}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 print:text-black font-mono">
                        Liquidación electrónica
                      </p>
                    </div>

                    <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900/60 dark:bg-amber-950/30 print:bg-transparent print:border-slate-400 print:rounded-none print:p-3">
                      <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 print:text-black">
                        <span>Transferencias</span>
                        <Icon name="building" className="size-3.5 print:hidden" />
                      </div>
                      <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white print:text-black print:text-lg">
                        S/ {Number(arqueoData.porMetodo?.transferencia || 0).toFixed(2)}
                      </p>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 print:text-black font-mono">
                        Banco de la Nación / Cta Cte
                      </p>
                    </div>
                  </div>

                  {/* Tablas de Desglose */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 print:grid-cols-1 print:gap-6">
                    {/* Desglose por concepto */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-[var(--border)] dark:bg-slate-900/40 print:bg-transparent print:border-none print:p-0">
                      <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black print:border-b print:border-black print:pb-1">
                        <Icon name="chartBar" className="inline size-3.5 mr-1 -mt-0.5 print:hidden" />Recaudación por Concepto
                      </h4>
                      <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-left text-xs print:table-fixed">
                          <thead className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400 dark:border-[var(--border)] print:text-black print:border-black">
                            <tr>
                              <th className="pb-2">Concepto</th>
                              <th className="pb-2 text-center">Cant.</th>
                              <th className="pb-2 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                            {arqueoData.porConcepto?.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="py-4 text-center text-slate-400">Sin ingresos en la fecha</td>
                              </tr>
                            ) : (
                              arqueoData.porConcepto?.map((c, i) => (
                                <tr key={i} className="hover:bg-white/60 dark:hover:bg-slate-800/30">
                                  <td className="py-2 font-bold text-slate-800 dark:text-slate-200 print:text-black">{c.tipoPago}</td>
                                  <td className="py-2 text-center text-slate-600 dark:text-slate-400 print:text-black">{c.cantidad}</td>
                                  <td className="py-2 text-right font-black text-slate-900 dark:text-white print:text-black">
                                    S/ {Number(c.total || 0).toFixed(2)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Desglose por cajero */}
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-[var(--border)] dark:bg-slate-900/40 print:bg-transparent print:border-none print:p-0">
                      <h4 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black print:border-b print:border-black print:pb-1">
                        <Icon name="user" className="inline size-3.5 mr-1 -mt-0.5 print:hidden" />Rendición por Cajero / Operador
                      </h4>
                      <div className="overflow-x-auto print:overflow-visible">
                        <table className="w-full text-left text-xs print:table-fixed">
                          <thead className="border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400 dark:border-[var(--border)] print:text-black print:border-black">
                            <tr>
                              <th className="pb-2">Cajero</th>
                              <th className="pb-2 text-center">Operaciones</th>
                              <th className="pb-2 text-right">Total Cobrado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                            {arqueoData.porCajero?.length === 0 ? (
                              <tr>
                                <td colSpan="3" className="py-4 text-center text-slate-400">Sin operaciones de cajero</td>
                              </tr>
                            ) : (
                              arqueoData.porCajero?.map((c, i) => (
                                <tr key={i} className="hover:bg-white/60 dark:hover:bg-slate-800/30">
                                  <td className="py-2 font-bold text-slate-800 dark:text-slate-200 print:text-black">{c.usuario}</td>
                                  <td className="py-2 text-center text-slate-600 dark:text-slate-400 print:text-black">{c.cantidad}</td>
                                  <td className="py-2 text-right font-black text-emerald-600 dark:text-emerald-400 print:text-black">
                                    S/ {Number(c.total || 0).toFixed(2)}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Detalle de Movimientos del Día */}
                  <div className="rounded-2xl border border-slate-200 p-4 dark:border-[var(--border)] print:bg-transparent print:border-none print:p-0 print:mt-6">
                    <div className="mb-3 flex items-center justify-between print:border-b print:border-black print:pb-2">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 print:text-black print:text-sm">
                        <Icon name="receiptCheck" className="inline size-3.5 mr-1 -mt-0.5 print:hidden" />Movimientos y Recibos Emitidos ({arqueoData.pagos?.length || 0})
                      </h4>
                      <span className="text-[11px] font-medium text-slate-400 print:text-black font-mono">
                        Fecha: {arqueoData.fecha}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto print:max-h-none print:overflow-visible">
                      <table className="w-full text-left text-xs print:table-fixed">
                        <thead className="sticky top-0 bg-white border-b border-slate-200 text-[10px] font-bold uppercase text-slate-400 dark:bg-[var(--bg-surface)] dark:border-[var(--border)] print:static print:bg-transparent print:text-black print:border-black">
                          <tr>
                            <th className="py-2 print:py-1">N° Recibo</th>
                            <th className="py-2 print:py-1">Hora</th>
                            <th className="py-2 print:py-1">Concepto</th>
                            <th className="py-2 print:py-1">Método</th>
                            <th className="py-2 print:py-1">Cajero</th>
                            <th className="py-2 print:py-1 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)] print:divide-slate-300">
                          {arqueoData.pagos?.length === 0 ? (
                            <tr>
                              <td colSpan="6" className="py-6 text-center text-slate-400 print:text-black">
                                No se registraron cobros en esta jornada.
                              </td>
                            </tr>
                          ) : (
                            arqueoData.pagos?.map((p) => (
                              <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-[var(--bg-subtle)]">
                                <td className="py-2 font-mono font-bold text-slate-900 dark:text-white print:text-black print:py-1">
                                  {p.numeroRecibo || `#${p.id}`}
                                </td>
                                <td className="py-2 text-slate-500 print:text-black print:py-1 font-mono">
                                  {p.fecha ? p.fecha.split(' ')[1] || p.fecha : '---'}
                                </td>
                                <td className="py-2 print:py-1">
                                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-[var(--bg-subtle)] dark:text-slate-300 print:bg-transparent print:p-0 print:text-black">
                                    {p.tipoPago}
                                  </span>
                                </td>
                                <td className="py-2 text-slate-600 dark:text-slate-300 print:text-black print:py-1">
                                  {p.metodo}
                                </td>
                                <td className="py-2 text-slate-600 dark:text-slate-400 print:text-black print:py-1">
                                  {p.cajero}
                                </td>
                                <td className="py-2 text-right font-black text-slate-900 dark:text-white print:text-black print:py-1">
                                  S/ {Number(p.montoTotal || 0).toFixed(2)}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer de Acciones del Arqueo */}
            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 dark:border-[var(--border)] dark:bg-[var(--bg-surface)] print:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportArqueoExcel}
                  disabled={!arqueoData?.pagos?.length}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-700 shadow-2xs hover:bg-emerald-50 dark:border-emerald-800 dark:bg-[var(--bg-subtle)] dark:text-emerald-300 dark:hover:bg-slate-700 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Icon name="table" className="size-4" />
                  <span>Exportar Arqueo Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-extrabold text-purple-700 shadow-2xs hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-950/50 dark:text-purple-300 transition-all cursor-pointer"
                >
                  <Icon name="print" className="size-4" />
                  <span>Imprimir Acta Cierre</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsArqueoModalOpen(false)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-extrabold text-white hover:bg-slate-800 dark:bg-[var(--bg-subtle)] dark:hover:bg-slate-700 cursor-pointer"
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
export default Pagos
