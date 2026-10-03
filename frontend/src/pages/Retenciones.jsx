import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { apiFetch, getCachedData, setCachedData } from '../config/api'
import { BoletaInternamientoPrint } from '../components/retenciones/BoletaInternamientoPrint'
import { OrdenLibertadPrint } from '../components/retenciones/OrdenLibertadPrint'
import { exportToExcel } from '../utils/exportToExcel'
import { exportToPdf } from '../utils/exportToPdf'
import { formatNumeroTarjeta } from '../utils/formatters'
import { RoundedSelect, FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PlacaBadge } from '../components/ui/PlacaBadge'
import { showToast, showError } from '../utils/SwalUtil'
import { sanitizarMensaje } from '../config/api'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'RETENIDO', label: 'En Depósito' },
  { value: 'LIBERADO', label: 'Liberados' },
]

const emptyNuevoInternamiento = {
  idPapeleta: '', deposito: '', motivo: '', lugarIntervencion: '',
  interesadoDni: '', gradoRemisor: '', carnetRemisor: '',
  autoridadQueDispone: '', documentoReferencia: '', estadoCarroceria: '', observaciones: ''
}

export function Retenciones({ user }) {
  const cached = getCachedData('/internamientos')
  const [internamientos, setInternamientos] = useState(cached || [])
  const [isLoading, setIsLoading] = useState(!cached)
  const [searchTerm, setSearchTerm] = useState(() => new URLSearchParams(window.location.search).get('search') || '')
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 160)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const [isExportingExcel, setIsExportingExcel] = useState(false)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const s = params.get('search')
    setSearchTerm(s || '')
  }, [location.search])

  const [filterEstado, setFilterEstado] = useState('TODOS')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  const [sortBy, setSortBy] = useState('')
  const [sortDir, setSortDir] = useState('DESC')
  const handleSort = (column, dir) => {
    setSortBy(column)
    setSortDir(dir)
    setCurrentPage(1)
  }
  const [selectedItem, setSelectedItem] = useState(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [printLayout, setPrintLayout] = useState('FICHA')
  const [isNuevoModalOpen, setIsNuevoModalOpen] = useState(false)
  const [nuevoInternamiento, setNuevoInternamiento] = useState(emptyNuevoInternamiento)
  const [registrando, setRegistrando] = useState(false)
  const [papeletas, setPapeletas] = useState([])

  const [totalFiltrado, setTotalFiltrado] = useState(0)

  const loadInternamientos = () => {
    setIsLoading(true)
    const params = new URLSearchParams({
      page: String(currentPage),
      porPagina: String(itemsPerPage),
    })
    if (debouncedSearch) params.set('buscar', debouncedSearch)
    if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
    if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }

    apiFetch(`/internamientos?${params.toString()}`)
      .then((res) => res.json())
      .then((res) => {
        const rows = res.data || []
        setInternamientos(rows)
        setTotalFiltrado(res.meta?.total ?? rows.length)
        setIsLoading(false)
      })
      .catch(() => {
        setIsLoading(false)
      })
  }

  useEffect(() => {
    loadInternamientos()
  }, [currentPage, itemsPerPage, debouncedSearch, filterEstado, sortBy, sortDir])

  const [stats, setStats] = useState({ total: 0, enDeposito: 0, liberados: 0, avgDias: 0 })

  const loadStats = () => {
    apiFetch('/internamientos/estadisticas')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((payload) => setStats(payload.data ?? {}))
      .catch(() => {})
  }

  useEffect(() => {
    loadStats()
  }, [])

  useEffect(() => {
    apiFetch('/papeletas?porPagina=100')
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((res) => setPapeletas(res.data || []))
      .catch(() => {})
  }, [])

  // Papeletas que aún no tienen un internamiento registrado, para el buscador.
  const idsConInternamiento = new Set(internamientos.map((i) => i.papeletaId).filter(Boolean))
  const papeletasElegibles = papeletas.filter((p) => p.vehiculoPlaca && !idsConInternamiento.has(p.id))

  const handleOpenNuevo = () => {
    setNuevoInternamiento(emptyNuevoInternamiento)
    setIsNuevoModalOpen(true)
  }

  const handleRegistrarInternamiento = async (e) => {
    e.preventDefault()
    if (!nuevoInternamiento.idPapeleta) {
      showError('Atención', 'Selecciona la papeleta que origina el internamiento.')
      return
    }
    if (!nuevoInternamiento.deposito.trim()) {
      showError('Atención', 'Ingresa el depósito municipal donde queda el vehículo.')
      return
    }
    setRegistrando(true)
    try {
      const res = await apiFetch('/internamientos', {
        method: 'POST',
        body: {
          ...nuevoInternamiento,
          idPapeleta: Number(nuevoInternamiento.idPapeleta),
          idRemisor: user?.id_persona || null,
        }
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'No se pudo registrar el internamiento.')
      setIsNuevoModalOpen(false)
      loadInternamientos()
      loadStats()
      showToast(`Internamiento ${data.data?.numeroOrden || ''} registrado correctamente`.trim())
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo registrar el internamiento.'))
    } finally {
      setRegistrando(false)
    }
  }

  const totalInternados = stats.total ?? 0
  const enDeposito = stats.enDeposito ?? 0
  const liberados = stats.liberados ?? 0
  const avgDias = stats.avgDias ?? 0

  const filteredItems = internamientos

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, filterEstado])

  const paginatedItems = internamientos

  const fetchTodoElFiltro = async () => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('buscar', searchTerm)
    if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
    if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }
    const res = await apiFetch(`/internamientos?${params.toString()}`)
    if (!res.ok) return filteredItems
    const payload = await res.json()
    return payload.data || []
  }

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const data = await fetchTodoElFiltro()
          exportToExcel({
            filename: `Internamientos_Deposito_${new Date().toISOString().slice(0, 10)}.xls`,
            sheetName: 'Internamientos',
            title: 'REGISTRO DE INTERNAMIENTOS EN DEPÓSITO MUNICIPAL DE VEHÍCULOS',
            subtitle: 'Subgerencia de Tránsito y Transporte - Custodia y Órdenes de Libertad',
            metadata: [
              { label: 'Estado', value: filterEstado },
              { label: 'Total Registros', value: String(data.length) }
            ],
            columns: [
              { header: 'N° BOLETA', key: 'numeroBoleta', isText: true, width: 130, align: 'center' },
              { header: 'DEPÓSITO', key: 'deposito', width: 160 },
              { header: 'PLACA', key: 'vehiculoPlaca', isText: true, width: 110, align: 'center' },
              { header: 'TIPO VEHÍCULO', key: 'vehiculoTipo', width: 140 },
              { header: 'MARCA', key: 'vehiculoMarca', width: 110 },
              { header: 'MODELO', key: 'vehiculoModelo', width: 110 },
              { header: 'COLOR', key: 'vehiculoColor', width: 100 },
              { header: 'AÑO', key: 'vehiculoAnio', width: 70, align: 'center' },
              { header: 'SERIE DEL MOTOR', key: 'vehiculoMotor', isText: true, width: 140 },
              { header: 'FORMALIDAD', key: 'vehiculoFormalidad', width: 110, align: 'center' },
              { header: 'ASOCIACIÓN', render: (_, i) => i.vehiculoAsociacion || 'PARTICULAR / SIN ASOC.', width: 200 },
              { header: 'PAPELETA ASOCIADA', render: (_, i) => i.numeroPapeleta || '—', isText: true, width: 130, align: 'center' },
              { header: 'MONTO PAPELETA (S/)', render: (_, i) => `S/ ${Number(i.montoPapeleta || 0).toFixed(2)}`, align: 'right', width: 130 },
              { header: 'MOTIVO INTERNAMIENTO', key: 'motivo', width: 220 },
              { header: 'AUTORIDAD QUE DISPONE', key: 'autoridadQueDispone', width: 180 },
              { header: 'DOCUMENTO DE REFERENCIA', key: 'documentoReferencia', width: 160 },
              { header: 'REMISOR', key: 'remisorNombre', width: 170 },
              { header: 'GRADO REMISOR', key: 'gradoRemisor', width: 110 },
              { header: 'CARNET REMISOR', key: 'carnetRemisor', isText: true, width: 110, align: 'center' },
              { header: 'ESTADO DE CARROCERÍA', key: 'estadoCarroceria', width: 160 },
              { header: 'CONDUCTOR / INTERESADO', key: 'interesadoNombre', width: 180 },
              { header: 'DNI INTERESADO', key: 'interesadoDni', isText: true, width: 110, align: 'center' },
              { header: 'DIRECCIÓN INTERESADO', key: 'interesadoDireccion', width: 220 },
              { header: 'FECHA INGRESO', key: 'fechaIngreso', width: 130, align: 'center' },
              { header: 'DÍAS RETENIDO', render: (_, i) => String(i.totalDias || 0), width: 100, align: 'center' },
              { header: 'FECHA SALIDA', render: (_, i) => i.fechaSalida || 'EN CUSTODIA', width: 130, align: 'center' },
              { header: 'N° ORDEN DE LIBERTAD', key: 'numeroOrdenLibertad', isText: true, width: 140, align: 'center' },
              { header: 'FECHA LIBERACIÓN', render: (_, i) => i.fechaLiberacion || 'EN CUSTODIA', width: 130, align: 'center' },
              { header: 'RECIBO PAPELETA', key: 'reciboPapeleta', isText: true, width: 120, align: 'center' },
              { header: 'MONTO PAPELETA COBRADO (S/)', render: (_, i) => `S/ ${Number(i.montoPapeletaCobrada || 0).toFixed(2)}`, align: 'right', width: 150 },
              { header: 'RECIBO GUARDIANÍA', key: 'reciboGuardiania', isText: true, width: 120, align: 'center' },
              { header: 'MONTO GUARDIANÍA (S/)', render: (_, i) => `S/ ${Number(i.montoGuardiania || 0).toFixed(2)}`, align: 'right', width: 140 },
              { header: 'RECIBO REMOLQUE', key: 'reciboRemolque', isText: true, width: 120, align: 'center' },
              { header: 'MONTO REMOLQUE (S/)', render: (_, i) => `S/ ${Number(i.montoRemolque || 0).toFixed(2)}`, align: 'right', width: 140 },
              { header: 'TOTAL LIBERACIÓN (S/)', render: (_, i) => `S/ ${Number(i.montoTotalLiberacion || 0).toFixed(2)}`, align: 'right', width: 140 },
              { header: 'OBSERVACIONES', key: 'observaciones', width: 240 },
              { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
            ],
            data
          })
    } finally {
      setIsExportingExcel(false)
    }
  }

  const handleExportPdf = async () => {
    setIsExportingPdf(true)
    try {
      const data = await fetchTodoElFiltro()
          await exportToPdf({
            filename: `Internamientos_Deposito_${new Date().toISOString().slice(0, 10)}.pdf`,
            title: 'REGISTRO DE INTERNAMIENTOS EN DEPÓSITO MUNICIPAL DE VEHÍCULOS',
            subtitle: 'Subgerencia de Tránsito y Transporte - Custodia y Órdenes de Libertad',
            metadata: [
              { label: 'Estado', value: filterEstado === 'TODOS' ? 'Todos' : filterEstado },
              { label: 'Total Registros', value: String(data.length) }
            ],
            columns: [
              { header: 'N° BOLETA', key: 'numeroBoleta', width: 20, align: 'center' },
              { header: 'PLACA', key: 'vehiculoPlaca', width: 15, align: 'center' },
              { header: 'MOTIVO', key: 'motivo', width: 30 },
              { header: 'INTERESADO', key: 'interesadoNombre', width: 35 },
              { header: 'ESTADO', key: 'estado', width: 15, align: 'center' }
            ],
            data
          })
    } finally {
      setIsExportingPdf(false)
    }
  }

  const handleOpenDetail = (item) => {
    setSelectedItem(item)
    setIsDetailModalOpen(true)
  }

  const handlePrint = (layout) => {
    setPrintLayout(layout)
    setTimeout(() => {
      window.print()
      setPrintLayout('FICHA')
    }, 100)
  }

  const getStatusBadge = (estado) => {
    const norm = String(estado || '').toUpperCase().trim()
    if (norm === 'LIBERADO') {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 shadow-2xs">
          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
          {estado}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 shadow-2xs">
        <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
        {estado}
      </span>
    )
  }

  const getItemStateColor = (estado) => {
    if (estado === 'BUENO') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
    if (estado === 'REGULAR') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
    if (estado === 'MALO') return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
    return 'bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-400 border-slate-200 dark:border-[var(--border-strong)]'
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center text-slate-900 dark:text-white">
            <Icon name="retention" className="size-7 stroke-[2.4]" />
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Internamientos Vehiculares
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Control de depósito municipal, actas de internamiento, inventario de custodia y órdenes de libertad.
            </p>
          </div>
        </div>
      </div>

      <div className="kpi-grid print:hidden">
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-blue-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Internamientos</span>
            <span className="grid size-6 place-items-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/60">
              <Icon name="retention" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(totalInternados)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-rose-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">En Depósito</span>
            <span className="grid size-6 place-items-center rounded-md bg-rose-50 text-rose-600 dark:bg-rose-950/60">
              <Icon name="lock" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(enDeposito)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-emerald-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Liberados</span>
            <span className="grid size-6 place-items-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60">
              <Icon name="check" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(liberados)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-amber-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Días Promedio</span>
            <span className="grid size-6 place-items-center rounded-md bg-amber-50 text-amber-600 dark:bg-amber-950/60">
              <Icon name="clock" className="size-3.5" />
            </span>
          </div>
          <div className="mt-1">
            <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{formatNumeroTarjeta(avgDias)} días</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438] flex flex-col print:hidden">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-[var(--border)]">
          <div className="relative w-full sm:max-w-xs">
            <Icon
              name={isLoading ? "refresh" : "search"}
              className={`absolute left-3 top-1/2 size-4 -translate-y-1/2 transition-colors ${isLoading ? 'animate-spin text-rose-500' : 'text-slate-400'}`}
            />
            <input
              type="text"
              placeholder="Buscar por placa, boleta o conductor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-xs font-medium text-slate-800 placeholder-slate-400 outline-none transition focus:border-rose-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] focus:ring-1 focus:ring-rose-500 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200 dark:placeholder-slate-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RoundedSelect
              value={filterEstado}
              onChange={(val) => {
                setFilterEstado(val)
                setCurrentPage(1)
              }}
              options={FILTER_ESTADO_OPTIONS}
            />

            {(filterEstado !== 'TODOS' || searchTerm !== '') && (
              <button
                type="button"
                onClick={() => {
                  setFilterEstado('TODOS')
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
                title="Limpiar filtros"
                className="grid size-[34px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs"
              >
                <Icon name="filterX" className="size-4" />
              </button>
            )}

            <button onClick={handleExportExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-emerald-400 dark:hover:bg-[var(--bg-subtle)] transition-colors" disabled={isExportingExcel}>
              <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`} />
              <span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
            </button>
            <button onClick={handleExportPdf} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-rose-400 dark:hover:bg-[var(--bg-subtle)] transition-colors" disabled={isExportingPdf}>
              <Icon name={isExportingPdf ? "refresh" : "filePdf"} className={`size-3.5 text-rose-600 dark:text-rose-400 ${isExportingPdf ? 'animate-spin' : ''}`} />
              <span>{isExportingPdf ? 'Generando...' : 'PDF'}</span>
            </button>
            <button onClick={handleOpenNuevo} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 hover:opacity-90" style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}>
              <span className="text-base leading-none font-black">+</span>
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[15%]" />
              <col className="w-[15%]" />
              <col className="w-[18%]" />
              <col className="w-[17%]" />
              <col className="w-[15%]" />
              <col className="w-[10%]" />
              <col className="w-[10%]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5"><SortableHeader column="numeroBoleta" label="Boleta / Depósito" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3.5">Vehículo y placa</th>
                <th className="px-4 py-3.5">Motivo / Infracción</th>
                <th className="px-4 py-3.5">Interesado / Conductor</th>
                <th className="px-4 py-3.5"><SortableHeader column="fechaIngreso" label="Ingreso y custodia" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} /></th>
                <th className="px-4 py-3.5 text-center"><SortableHeader column="estado" label="Estado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-4 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] print:divide-black transition-opacity ${isLoading && internamientos.length > 0 ? 'opacity-50' : ''}`}>
              {isLoading && internamientos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Cargando internamientos...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center">
                    <Icon name="retention" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron registros de internamiento</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-[var(--bg-subtle)]">
                    <td className="px-4 py-3.5">
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {item.numeroBoleta || `BOL-DEP-${String(item.id).padStart(4, '0')}`}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400" title={item.deposito}>
                        {item.deposito || 'Depósito Municipal'}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 print:px-1 print:py-1">
                      <div className="flex items-center gap-2 print:gap-1">
                        <PlacaBadge placa={item.vehiculoPlaca} />
                        <span
                          className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold print:border print:border-black print:bg-transparent print:text-black ${
                            item.vehiculoFormalidad === 'FORMAL'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {item.vehiculoFormalidad}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                        {item.vehiculoMarca} {item.vehiculoModelo} ({item.vehiculoColor})
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-200" title={item.motivo}>
                        {item.motivo}
                      </div>
                      {item.numeroPapeleta && (
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 print:text-black">
                          <Icon name="ticket" className="size-3.5 print:hidden" />
                          <span>{item.numeroPapeleta}</span>
                          <span className="font-bold">S/ {Number(item.montoPapeleta).toFixed(2)}</span>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 print:px-1 print:py-1">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 print:text-black">
                        {item.interesadoNombre}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        DNI: {item.interesadoDni}
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="text-slate-800 dark:text-slate-200 font-medium text-xs">
                        {item.fechaIngreso ? new Date(item.fechaIngreso).toLocaleDateString('es-PE') : 'S/F'}
                      </div>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 print:text-black">
                        <Icon name="clock" className="size-3 print:hidden" />
                        <span>{item.totalDias} días en custodia</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      {getStatusBadge(item.estado)}
                    </td>

                    <td className="px-4 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-eye-bg)] border-[var(--action-eye-border)] text-[var(--action-eye-text)] hover:bg-[var(--action-eye-hover)] hover:border-[var(--action-eye-hover)] hover:text-white"
                          title="Ver Ficha e Inventario"
                        >
                          <Icon name="eye" className="size-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-slate-100 p-3.5 dark:border-[var(--border)]">
          <Pagination
            currentPage={currentPage}
            totalItems={totalFiltrado}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(size) => {
              setItemsPerPage(size)
              setCurrentPage(1)
            }}
            disabled={isLoading}
          />
        </div>
      </div>

      {isNuevoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget) e.currentTarget.dataset.downOnOverlay = "1" }} onMouseUp={(e) => { if (e.target === e.currentTarget && e.currentTarget.dataset.downOnOverlay === "1") setIsNuevoModalOpen(false); e.currentTarget.dataset.downOnOverlay = "" }}>
          <form onSubmit={handleRegistrarInternamiento} className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="garage" className="size-4.5" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Nuevo Internamiento</h3>
              </div>
              <BotonCerrarModal onClick={() => setIsNuevoModalOpen(false)} title="Cerrar" />
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <fieldset className="rounded-xl border border-slate-200 p-3.5 dark:border-[var(--border-strong)]">
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Papeleta de Origen</legend>
                <FloatingSelect
                  id="int_papeleta"
                  label="Papeleta"
                  value={nuevoInternamiento.idPapeleta}
                  onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, idPapeleta: e.target.value })}
                  options={[
                    { value: '', label: 'Selecciona una papeleta...' },
                    ...papeletasElegibles.map((p) => ({
                      value: String(p.id),
                      label: `${p.numeroPapeleta} — ${p.vehiculoPlaca} — ${p.conductorNombre || p.infractor || 'Sin conductor'}`
                    }))
                  ]}
                />
                <p className="mt-2 text-[10.5px] text-slate-400">Solo aparecen papeletas que aún no tienen un internamiento registrado.</p>
              </fieldset>

              <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Datos del Internamiento</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput id="int_deposito" label="Depósito Municipal" required value={nuevoInternamiento.deposito} onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, deposito: e.target.value })} />
                  <FloatingInput id="int_lugar" label="Lugar de intervención" optional value={nuevoInternamiento.lugarIntervencion} onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, lugarIntervencion: e.target.value })} />
                  <div className="sm:col-span-2">
                    <FloatingInput id="int_motivo" label="Motivo del internamiento" optional value={nuevoInternamiento.motivo} onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, motivo: e.target.value })} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Interesado / Autoridad</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput
                    id="int_interesado_dni"
                    label="DNI del interesado"
                    optional
                    maxLength={11}
                    inputClassName="font-mono"
                    value={nuevoInternamiento.interesadoDni}
                    onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, interesadoDni: e.target.value.replace(/\D/g, '') })}
                  />
                  <FloatingInput id="int_autoridad" label="Autoridad que dispone" optional value={nuevoInternamiento.autoridadQueDispone} onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, autoridadQueDispone: e.target.value })} />
                  <FloatingInput id="int_grado" label="Grado del remisor" optional value={nuevoInternamiento.gradoRemisor} onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, gradoRemisor: e.target.value })} />
                  <FloatingInput id="int_carnet" label="Carnet del remisor" optional value={nuevoInternamiento.carnetRemisor} onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, carnetRemisor: e.target.value })} />
                  <FloatingInput id="int_doc_ref" label="Documento de referencia" optional value={nuevoInternamiento.documentoReferencia} onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, documentoReferencia: e.target.value })} />
                  <FloatingInput id="int_carroceria" label="Estado de carrocería" optional value={nuevoInternamiento.estadoCarroceria} onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, estadoCarroceria: e.target.value })} />
                </div>
                <p className="mt-2 text-[10.5px] text-slate-400">El remisor queda registrado automáticamente con tu usuario de inspector.</p>
              </fieldset>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5">Observaciones</label>
                <textarea
                  value={nuevoInternamiento.observaciones}
                  onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, observaciones: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-rose-500 focus:bg-white dark:focus:bg-[var(--bg-subtle)] dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
                />
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <BotonCancelar onClick={() => setIsNuevoModalOpen(false)} />
              <BotonGuardar disabled={registrando}>
                {registrando ? 'Registrando...' : 'Registrar Internamiento'}
              </BotonGuardar>
            </div>
          </form>
        </div>
      )}

      {isDetailModalOpen && selectedItem && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-enter ${printLayout === 'FICHA' ? 'print:static print:block print:p-0 print:bg-transparent print:overflow-visible' : 'print:hidden'}`}>
          <div
            id={printLayout === 'FICHA' ? "seccion-impresion-ticket" : undefined}
            className={`relative flex flex-col w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438] border border-slate-200/80 ${printLayout === 'FICHA' ? 'print:shadow-none print:border-none print:m-0 print:p-0 print:max-h-none print:overflow-visible print:max-w-full' : ''}`}
          >
            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <Icon name="retention" className="size-4.5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Acta de Internamiento e Inventario
                    </h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                      Boleta N° {selectedItem.numeroBoleta}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Depósito Municipal Oficial de Vehículos • MJLO
                  </p>
                </div>
              </div>
              <BotonCerrarModal onClick={() => setIsDetailModalOpen(false)} className="print:hidden" title="Cerrar ventana" />
            </div>

            {/* Modal Body: Scrollable & Compact */}
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              {/* Datos Generales Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]/50">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Vehículo Retenido</span>
                    <div className="mt-0.5">
                      <PlacaBadge placa={selectedItem.vehiculoPlaca} size="lg" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {selectedItem.vehiculoMarca} {selectedItem.vehiculoModelo} <span className="text-slate-500">({selectedItem.vehiculoColor})</span>
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Carrocería: {selectedItem.estadoCarroceria || 'Sin registrar'}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Motivo & Infracción</span>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                      {selectedItem.motivo}
                    </p>
                    {selectedItem.numeroPapeleta && (
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        Papeleta: {selectedItem.numeroPapeleta} <span className="font-black">(S/ {Number(selectedItem.montoPapeleta).toFixed(2)})</span>
                      </p>
                    )}
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Autoridad: {selectedItem.autoridadQueDispone || 'Subgerencia de Tránsito'}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Intervinientes</span>
                      {getStatusBadge(selectedItem.estado)}
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">Remisor:</strong> {selectedItem.remisorNombre}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300">
                      <strong className="text-slate-900 dark:text-white">Interesado:</strong> {selectedItem.interesadoNombre}
                    </p>
                    <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      DNI: {selectedItem.interesadoDni || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Banner de Salida si está liberado */}
              {selectedItem.estado === 'LIBERADO' && (
                <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/70 p-3 dark:border-emerald-900/60 dark:bg-emerald-950/30">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                    <Icon name="check" className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="font-extrabold text-xs sm:text-sm">Vehículo Liberado — Orden de Salida</h4>
                  </div>
                  <div className="mt-1.5 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-emerald-950 dark:text-emerald-200 font-medium">
                    <p>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">N° Orden:</span> {selectedItem.numeroOrdenLibertad || 'S/N'}
                    </p>
                    <p>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Fecha Salida:</span> {selectedItem.fechaLiberacion ? new Date(selectedItem.fechaLiberacion).toLocaleDateString('es-PE') : 'Registrado'}
                    </p>
                    <p>
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Liquidación Pagada:</span> S/ {Number(selectedItem.montoTotalLiberacion || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              )}

              {/* Detalle de Inventario */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-3.5 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]/30">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Detalles del Inventario
                    </span>
                    <span className="text-slate-300 dark:text-slate-600">•</span>
                    <h4 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
                      Partes, Componentes y Accesorios
                    </h4>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                    {selectedItem.inventario?.length || 0} ítems evaluados
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200/80 overflow-hidden dark:border-[var(--border)]">
                  <div className="max-h-56 overflow-y-auto print:max-h-none print:overflow-visible">
                    <table className="w-full text-left text-xs">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-[10px] font-extrabold uppercase text-slate-600 dark:bg-[#1C2438] dark:text-slate-400">
                        <tr>
                          <th className="px-3 py-2">Código</th>
                          <th className="px-3 py-2">Componente / Criterio</th>
                          <th className="px-3 py-2">Sección</th>
                          <th className="px-3 py-2 text-center">Cant.</th>
                          <th className="px-3 py-2 text-center">Estado Físico</th>
                          <th className="px-3 py-2">Observación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)] bg-white dark:bg-[#1C2438]">
                        {(!selectedItem.inventario || selectedItem.inventario.length === 0) ? (
                          <tr>
                            <td colSpan={6} className="px-3.5 py-4 text-center text-xs text-slate-400">
                              No hay detalle de inventario registrado para esta orden.
                            </td>
                          </tr>
                        ) : (
                          selectedItem.inventario.map((inv, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                              <td className="px-3 py-1.5 font-mono text-[11px] font-bold text-slate-500">
                                {inv.codigo}
                              </td>
                              <td className="px-3 py-1.5 font-bold text-slate-800 dark:text-slate-200">
                                {inv.nombre}
                              </td>
                              <td className="px-3 py-1.5">
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                                  {inv.seccion}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-center font-bold text-slate-700 dark:text-slate-300">
                                {inv.cantidad}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-extrabold ${getItemStateColor(inv.estado)}`}>
                                  {inv.estado}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                                {inv.observacion || '-'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Observaciones generales */}
              {selectedItem.observaciones && (
                <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]/40">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    Observaciones Generales de Internamiento
                  </span>
                  <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
                    {selectedItem.observaciones}
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer: Fixed at bottom */}
            <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-[var(--border)] dark:bg-[#1C2438] print:hidden">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint('FICHA')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] dark:text-slate-300 transition cursor-pointer"
                >
                  <Icon name="print" className="size-3.5" />
                  <span>Imprimir Ficha</span>
                </button>

                <button
                  type="button"
                  onClick={() => handlePrint('INTERNAMIENTO')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-bold hover:bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300 transition cursor-pointer"
                >
                  <Icon name="print" className="size-3.5" />
                  <span>Orden de Internamiento</span>
                </button>

                {selectedItem.estado === 'LIBERADO' && (
                  <button
                    type="button"
                    onClick={() => handlePrint('LIBERTAD')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 text-emerald-700 px-3 py-1.5 text-xs font-bold hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300 transition cursor-pointer"
                  >
                    <Icon name="print" className="size-3.5" />
                    <span>Orden de Libertad</span>
                  </button>
                )}
              </div>

              <BotonCancelar onClick={() => setIsDetailModalOpen(false)}>Cerrar</BotonCancelar>
            </div>
          </div>
        </div>
      )}
      
      {printLayout === 'INTERNAMIENTO' && selectedItem && (
        <BoletaInternamientoPrint item={selectedItem} />
      )}
      {printLayout === 'LIBERTAD' && selectedItem && (
        <OrdenLibertadPrint item={selectedItem} />
      )}
    </div>
  )
}
export default Retenciones
