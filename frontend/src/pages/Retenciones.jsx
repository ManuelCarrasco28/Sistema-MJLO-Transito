import { useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useDebounce } from '../hooks/useDebounce'
import { usePersonaRapida } from '../hooks/usePersonaRapida'
import { Icon } from '../components/ui/Icon'
import { Pagination } from '../components/ui/Pagination'
import { SortableHeader } from '../components/ui/SortableHeader'
import { apiFetch, getCachedData, setCachedData } from '../config/api'
import { InfraccionDetalleModal } from '../components/papeletas/InfraccionDetalleModal'
import { BoletaInternamientoPrint } from '../components/retenciones/BoletaInternamientoPrint'
import { OrdenLibertadPrint } from '../components/retenciones/OrdenLibertadPrint'
import { exportToExcel } from '../utils/exportToExcel'
import { formatNumeroTarjeta } from '../utils/formatters'
import { RoundedSelect, FloatingInput, FloatingSelect } from '../components/ui/FormInputs'
import { StatusBadge } from '../components/ui/StatusBadge'
import { PlacaBadge } from '../components/ui/PlacaBadge'
import { PlacaVehiculo } from '../components/vehiculos/PlacaVehiculo'
import { showToast, showError, showConfirm } from '../utils/SwalUtil'
import { sanitizarMensaje } from '../config/api'
import { BotonCancelar, BotonCerrarModal, BotonGuardar } from '../components/ui/ModalControls'
import { fetchTodasLasFilas } from '../utils/descargaCompleta'
import { puedeEliminarRegistros } from '../config/roles'
import { PageLoadError } from '../components/ui/PageLoadError'
import './Retenciones.css'

const FILTER_ESTADO_OPTIONS = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'RETENIDO', label: 'En Depósito' },
  { value: 'LIBERADO', label: 'Liberados' },
]

const emptyNuevoInternamiento = {
  idPapeleta: '', motivo: '',
  interesadoDni: '', observaciones: ''
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

  const location = useLocation()
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const s = params.get('search')
    setSearchTerm(s || '')
  }, [location.key, location.search])

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
  // Inventario del vehículo al ingresar al depósito: { [idCriterio]: cantidad } y el catálogo de ítems.
  const [infraccionVista, setInfraccionVista] = useState(null)
  // Internamiento que se está editando (null = el formulario crea uno nuevo)
  const [editandoItem, setEditandoItem] = useState(null)
  // Cobro y liberación de un vehículo internado
  const [pagoItem, setPagoItem] = useState(null)
  // Tarifas del depósito (guardianía por día y remolque): el servidor valida que el cobro las respete
  const [tarifas, setTarifas] = useState({ guardianiaDia: 0, remolque: 0, puedeEditar: false })
  const cargarTarifas = () => {
    apiFetch('/internamientos/tarifas')
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((payload) => setTarifas(payload.data || { guardianiaDia: 0, remolque: 0, puedeEditar: false }))
      .catch(() => {})
  }
  useEffect(() => { cargarTarifas() }, [])
  const [pagoForm, setPagoForm] = useState({})
  const [pagando, setPagando] = useState(false)
  const [criteriosInventario, setCriteriosInventario] = useState([])
  const [inventarioMarcado, setInventarioMarcado] = useState({})
  // Buscador de papeletas del formulario: se consulta en el servidor (hay miles) solo mientras se escribe.
  const [busquedaPapeleta, setBusquedaPapeleta] = useState('')
  const [papeletaElegida, setPapeletaElegida] = useState(null)
  const [resultadosPapeleta, setResultadosPapeleta] = useState([])
  const [buscandoPapeleta, setBuscandoPapeleta] = useState(false)
  const [listaPapeletaAbierta, setListaPapeletaAbierta] = useState(false)
  const textoBusquedaPapeleta = useDebounce(busquedaPapeleta.trim(), 250)
  // Interesado (quien paga y retira el vehículo): se escribe el DNI y la lupa lo busca en Gestión de personas.
  const [busquedaInteresado, setBusquedaInteresado] = useState('')
  const [interesadoElegido, setInteresadoElegido] = useState(null)
  const [buscandoInteresado, setBuscandoInteresado] = useState(false)
  const [interesadoNoRegistrado, setInteresadoNoRegistrado] = useState('')

  const [totalFiltrado, setTotalFiltrado] = useState(0)
  const cargaInternamientos = useRef(null)
  const [loadError, setLoadError] = useState('')

  const loadInternamientos = () => {
    cargaInternamientos.current?.abort()
    const controller = new AbortController()
    cargaInternamientos.current = controller
    setIsLoading(true)
    setLoadError('')
    const params = new URLSearchParams({
      page: String(currentPage),
      porPagina: String(itemsPerPage),
    })
    if (debouncedSearch) params.set('buscar', debouncedSearch)
    if (filterEstado !== 'TODOS') params.set('estado', filterEstado)
    if (sortBy) { params.set('sortBy', sortBy); params.set('sortDir', sortDir) }

    apiFetch(`/internamientos?${params.toString()}`, { signal: controller.signal })
      .then((res) => res.ok ? res.json() : Promise.reject(res))
      .then((res) => {
        if (controller.signal.aborted) return
        const rows = res.data || []
        setInternamientos(rows)
        setTotalFiltrado(res.meta?.total ?? rows.length)
        setIsLoading(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false)
          setLoadError('No se pudo cargar la lista de internamientos.')
        }
      })
  }

  useEffect(() => {
    loadInternamientos()
    return () => cargaInternamientos.current?.abort()
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

  // Papeletas sin internamiento (las más recientes, o las que coincidan con lo escrito) para el buscador.
  useEffect(() => {
    if (!isNuevoModalOpen || papeletaElegida || !listaPapeletaAbierta) return undefined
    const controlador = new AbortController()
    setBuscandoPapeleta(true)
    const params = new URLSearchParams({ page: '1', porPagina: '10', sinInternamiento: '1' })
    if (textoBusquedaPapeleta) params.set('buscar', textoBusquedaPapeleta)
    apiFetch(`/papeletas?${params.toString()}`, { signal: controlador.signal })
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((payload) => setResultadosPapeleta(payload.data || []))
      .catch(() => {})
      .finally(() => setBuscandoPapeleta(false))
    return () => controlador.abort()
  }, [textoBusquedaPapeleta, isNuevoModalOpen, papeletaElegida, listaPapeletaAbierta])

  const buscarInteresado = async () => {
    const dni = busquedaInteresado.trim()
    if (!/^\d{8,15}$/.test(dni)) {
      showError('Atención', 'Escribe un DNI válido (8 dígitos) para buscar.')
      return
    }
    setBuscandoInteresado(true)
    setInteresadoNoRegistrado('')
    try {
      const res = await apiFetch(`/personas?numeroDocumento=${encodeURIComponent(dni)}`)
      const payload = res.ok ? await res.json() : { data: [] }
      // id 0 = dato traído de RENIEC que aún no está en Gestión de personas
      const persona = (payload.data || []).find((x) => Number(x.id) > 0 && String(x.numeroDocumento) === dni)
      if (persona) elegirInteresado(persona)
      else setInteresadoNoRegistrado(dni)
    } catch {
      showError('Error', 'No se pudo consultar el DNI. Intenta nuevamente.')
    } finally {
      setBuscandoInteresado(false)
    }
  }

  const elegirInteresado = (persona) => {
    setInteresadoElegido({
      dni: persona.numeroDocumento,
      nombres: persona.nombres || '',
      apellidos: [persona.apellidoPaterno, persona.apellidoMaterno].filter(Boolean).join(' '),
    })
    setNuevoInternamiento((prev) => ({ ...prev, interesadoDni: persona.numeroDocumento }))
    setBusquedaInteresado(persona.numeroDocumento)
    setInteresadoNoRegistrado('')
  }
  const quitarInteresado = () => {
    setInteresadoElegido(null)
    setBusquedaInteresado('')
    setInteresadoNoRegistrado('')
    setNuevoInternamiento((prev) => ({ ...prev, interesadoDni: '' }))
  }
  const { abrir: abrirRegistroInteresado, modal: modalPersonaRapida } = usePersonaRapida({
    alCrear: (persona) => elegirInteresado(persona),
  })

  const elegirPapeleta = (p) => {
    setPapeletaElegida(p)
    setNuevoInternamiento((prev) => ({ ...prev, idPapeleta: String(p.id) }))
    setBusquedaPapeleta(`${p.numeroPapeleta} — ${p.vehiculoPlaca}`)
    setListaPapeletaAbierta(false)
  }

  const handleOpenNuevo = () => {
    setEditandoItem(null)
    setNuevoInternamiento(emptyNuevoInternamiento)
    setInventarioMarcado({})
    setBusquedaPapeleta('')
    setPapeletaElegida(null)
    setResultadosPapeleta([])
    setInteresadoElegido(null)
    setBusquedaInteresado('')
    setInteresadoNoRegistrado('')
    setIsNuevoModalOpen(true)
    if (criteriosInventario.length === 0) {
      apiFetch('/inventario-criterios')
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((payload) => setCriteriosInventario(payload.data || []))
        .catch(() => {})
    }
  }

  const handleOpenEditar = (item) => {
    setEditandoItem(item)
    setNuevoInternamiento({
      idPapeleta: String(item.papeletaId || ''),
      motivo: item.motivo || '',
      interesadoDni: item.interesadoDni && item.interesadoDni !== 'S/D' ? item.interesadoDni : '',
      observaciones: item.observaciones || '',
    })
    setInventarioMarcado(Object.fromEntries(
      (item.inventario || []).filter((i) => Number(i.cantidad) > 0).map((i) => [i.criterioId, String(i.cantidad)])
    ))
    setBusquedaPapeleta(item.numeroPapeleta ? `${item.numeroPapeleta} — ${item.vehiculoPlaca}` : (item.vehiculoPlaca || ''))
    setPapeletaElegida({ id: item.papeletaId })
    setResultadosPapeleta([])
    setInteresadoElegido(item.interesadoDni && item.interesadoDni !== 'S/D'
      ? { dni: item.interesadoDni, nombres: item.interesadoNombres || '', apellidos: item.interesadoApellidos || '' }
      : null)
    setBusquedaInteresado(item.interesadoDni && item.interesadoDni !== 'S/D' ? item.interesadoDni : '')
    setInteresadoNoRegistrado('')
    setIsNuevoModalOpen(true)
    if (criteriosInventario.length === 0) {
      apiFetch('/inventario-criterios')
        .then((res) => (res.ok ? res.json() : { data: [] }))
        .then((payload) => setCriteriosInventario(payload.data || []))
        .catch(() => {})
    }
  }

  const handleEliminar = async (item) => {
    if (item.estado === 'LIBERADO' || item.numeroOrdenLibertad) {
      showError('No se puede eliminar', 'Este internamiento tiene una orden de libertad. Debe conservarse su historial de cobros.')
      return
    }
    const resultado = await showConfirm(
      '¿Eliminar internamiento?',
      `Se eliminará la boleta ${item.numeroBoleta} (placa ${item.vehiculoPlaca}) junto con su inventario. Esta acción no se puede deshacer.`,
      'Sí, eliminar',
      'Cancelar',
      { confirmColor: 'oklch(58.6% 0.253 17.585)', cancelColor: 'oklch(71.2% 0.194 13.428)' },
    )
    if (!resultado.isConfirmed) return
    try {
      const res = await apiFetch(`/internamientos/${item.uuid || item.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'No se pudo eliminar el internamiento.')
      loadInternamientos()
      loadStats()
      showToast('Internamiento eliminado correctamente')
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo eliminar el internamiento.'))
    }
  }

  const hoyISO = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const handleOpenPago = (item) => {
    setPagoForm({
      fechaPago: hoyISO(), reciboPapeleta: '',
      // Con tarifa configurada, la guardianía se propone según los días de custodia
      montoGuardiania: tarifas.guardianiaDia > 0 ? (tarifas.guardianiaDia * Math.max(1, Number(item.totalDias || 1))).toFixed(2) : '',
      reciboGuardiania: '',
      montoRemolque: '', reciboRemolque: '', autorizadoDni: item.interesadoDni && item.interesadoDni !== 'S/D' ? item.interesadoDni : '',
      observaciones: '',
    })
    setPagoItem(item)
  }

  const papeletaPorCobrar = (item) => Boolean(item?.papeletaId) && item.papeletaEstado !== 'PAGADA'
  const totalPago = (item, form) => (
    (papeletaPorCobrar(item) || item?.papeletaEstado === 'PAGADA' ? Number(item?.montoPapeleta || 0) : 0)
    + Number(form.montoGuardiania || 0) + Number(form.montoRemolque || 0)
  )

  const handleConfirmarPago = async (e) => {
    e.preventDefault()
    if (!pagoItem) return
    if (papeletaPorCobrar(pagoItem) && !pagoForm.reciboPapeleta.trim()) {
      showError('Atención', 'Ingresa el N° de recibo del pago de la papeleta.')
      return
    }
    if (Number(pagoForm.montoGuardiania || 0) > 0 && !pagoForm.reciboGuardiania.trim()) {
      showError('Atención', 'Ingresa el N° de recibo de la guardianía.')
      return
    }
    if (Number(pagoForm.montoRemolque || 0) > 0 && !pagoForm.reciboRemolque.trim()) {
      showError('Atención', 'Ingresa el N° de recibo del remolque.')
      return
    }
    setPagando(true)
    try {
      const res = await apiFetch(`/internamientos/${pagoItem.uuid || pagoItem.id}/liberar`, {
        method: 'POST',
        body: {
          ...pagoForm,
          montoGuardiania: Number(pagoForm.montoGuardiania || 0),
          montoRemolque: Number(pagoForm.montoRemolque || 0),
        },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'No se pudo registrar el pago.')
      setPagoItem(null)
      loadInternamientos()
      loadStats()
      showToast(`Pago registrado. Orden de libertad ${data.data?.numeroOrdenLibertad || ''}`.trim())
    } catch (err) {
      showError('Error', sanitizarMensaje(err.message, 'No se pudo registrar el pago.'))
    } finally {
      setPagando(false)
    }
  }

  const handleRegistrarInternamiento = async (e) => {
    e.preventDefault()
    if (!nuevoInternamiento.idPapeleta) {
      showError('Atención', 'Selecciona la papeleta que origina el internamiento.')
      return
    }
    setRegistrando(true)
    try {
      const inventario = Object.entries(inventarioMarcado)
        .filter(([, cantidad]) => cantidad !== '' && cantidad !== undefined)
        .map(([idCriterio, cantidad]) => ({ idCriterio: Number(idCriterio), cantidad: Number(cantidad) }))
      const res = editandoItem
        ? await apiFetch(`/internamientos/${editandoItem.uuid || editandoItem.id}`, {
          method: 'PUT',
          body: { ...nuevoInternamiento, inventario },
        })
        : await apiFetch('/internamientos', {
          method: 'POST',
          body: {
            ...nuevoInternamiento,
            idPapeleta: Number(nuevoInternamiento.idPapeleta),
            idRemisor: user?.id_persona || null,
            inventario,
          }
        })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data.messages || {}).join(' ') || data.message || 'No se pudo registrar el internamiento.')
      setIsNuevoModalOpen(false)
      setEditandoItem(null)
      loadInternamientos()
      loadStats()
      showToast(editandoItem ? 'Internamiento actualizado correctamente' : `Internamiento ${data.data?.numeroBoleta || ''} registrado correctamente`.trim())
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
    // Todas las páginas del filtro (antes una sola petición podía quedar recortada sin avisar)
    return fetchTodasLasFilas('/internamientos', {
      buscar: searchTerm,
      estado: filterEstado !== 'TODOS' ? filterEstado : '',
      sortBy,
      sortDir: sortBy ? sortDir : '',
    })
  }

  const handleExportExcel = async () => {
    setIsExportingExcel(true)
    await new Promise(r => setTimeout(r, 50))
    try {
      const data = await fetchTodoElFiltro()
          await exportToExcel({
            filename: `Internamientos_Deposito_${new Date().toISOString().slice(0, 10)}.xlsx`,
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
              { header: 'MONTO PAPELETA (S/)', render: (_, i) => `S/ ${Number(i.montoPapeleta || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 130 },
              { header: 'MOTIVO INTERNAMIENTO', key: 'motivo', width: 220 },
              { header: 'AUTORIDAD QUE DISPONE', key: 'autoridadQueDispone', width: 180 },
              { header: 'REMISOR', key: 'remisorNombre', width: 170 },
              { header: 'GRADO REMISOR', key: 'gradoRemisor', width: 110 },
              { header: 'CARNET REMISOR', key: 'carnetRemisor', isText: true, width: 110, align: 'center' },
              { header: 'ESTADO DE CARROCERÍA', key: 'estadoCarroceria', width: 160 },
              { header: 'CONDUCTOR', key: 'conductorNombre', width: 180 },
              { header: 'DNI CONDUCTOR', key: 'conductorDni', isText: true, width: 110, align: 'center' },
              { header: 'INTERESADO (QUIEN PAGA)', key: 'interesadoNombre', width: 180 },
              { header: 'DNI INTERESADO', key: 'interesadoDni', isText: true, width: 110, align: 'center' },
              { header: 'DIRECCIÓN INTERESADO', key: 'interesadoDireccion', width: 220 },
              { header: 'FECHA INGRESO', key: 'fechaIngreso', width: 130, align: 'center' },
              { header: 'DÍAS RETENIDO', render: (_, i) => String(i.totalDias || 0), width: 100, align: 'center' },
              { header: 'FECHA SALIDA', render: (_, i) => i.fechaSalida || 'EN CUSTODIA', width: 130, align: 'center' },
              { header: 'N° ORDEN DE LIBERTAD', key: 'numeroOrdenLibertad', isText: true, width: 140, align: 'center' },
              { header: 'FECHA LIBERACIÓN', render: (_, i) => i.fechaLiberacion || 'EN CUSTODIA', width: 130, align: 'center' },
              { header: 'RECIBO PAPELETA', key: 'reciboPapeleta', isText: true, width: 120, align: 'center' },
              { header: 'MONTO PAPELETA COBRADO (S/)', render: (_, i) => `S/ ${Number(i.montoPapeletaCobrada || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 150 },
              { header: 'RECIBO GUARDIANÍA', key: 'reciboGuardiania', isText: true, width: 120, align: 'center' },
              { header: 'MONTO GUARDIANÍA (S/)', render: (_, i) => `S/ ${Number(i.montoGuardiania || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 140 },
              { header: 'RECIBO REMOLQUE', key: 'reciboRemolque', isText: true, width: 120, align: 'center' },
              { header: 'MONTO REMOLQUE (S/)', render: (_, i) => `S/ ${Number(i.montoRemolque || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 140 },
              { header: 'TOTAL LIBERACIÓN (S/)', render: (_, i) => `S/ ${Number(i.montoTotalLiberacion || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, align: 'right', width: 140 },
              { header: 'OBSERVACIONES', key: 'observaciones', width: 240 },
              { header: 'ESTADO', key: 'estado', width: 110, align: 'center' }
            ],
            data
          })
    } catch (error) {
      if (error.name !== 'AbortError') showError('Descarga no completada', error.message || 'No se pudo preparar el archivo completo.')
    } finally {
      setIsExportingExcel(false)
    }
  }


  const handleOpenDetail = (item) => {
    setSelectedItem(item)
    setIsDetailModalOpen(true)
  }

  const handlePrint = (layout, item = selectedItem) => {
    if (!item) return
    setSelectedItem(item)
    setPrintLayout(layout)
    setTimeout(() => {
      const tituloAnterior = document.title
      document.title = `${layout === 'LIBERTAD' ? 'Orden de libertad' : layout === 'INTERNAMIENTO' ? 'Boleta de internamiento' : 'Ficha de internamiento'} - ${layout === 'LIBERTAD' ? item.numeroOrdenLibertad || 'S-N' : item.numeroBoleta || 'S-N'}`
      try {
        window.print()
      } finally {
        document.title = tituloAnterior
        setPrintLayout('FICHA')
      }
    }, 100)
  }

  const getStatusBadge = (estado) => {
    const norm = String(estado || '').toUpperCase().trim()
    if (norm === 'LIBERADO') {
      return (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap! rounded-full border border-emerald-300/80 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 shadow-2xs">
          <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
          {estado}
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap! rounded-full border border-amber-300/80 bg-amber-50 px-2.5 py-0.5 text-xs font-black text-amber-700 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-300 shadow-2xs">
        <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
        {estado}
      </span>
    )
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
          </div>
        </div>
      </div>

      <div className="kpi-grid print:hidden">
        <div className="relative overflow-hidden rounded-xl border-[1.5px] border-blue-400 bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Internamientos</span>
            <span className="grid size-6 place-items-center rounded-md text-blue-600 dark:text-blue-400">
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
            <span className="grid size-6 place-items-center rounded-md text-rose-600 dark:text-rose-400">
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
            <span className="grid size-6 place-items-center rounded-md text-emerald-600 dark:text-emerald-400">
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
            <span className="grid size-6 place-items-center rounded-md text-amber-600 dark:text-amber-400">
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
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          <div className="relative w-full sm:w-72 sm:shrink-0">
              <Icon
                name={isLoading ? "refresh" : "search"}
                className={`absolute left-3 top-1/2 size-4 -translate-y-1/2 transition-colors ${isLoading ? 'animate-spin text-rose-500' : 'text-slate-400'}`}
              />
              <input
                type="text"
                placeholder="Buscar por placa, boleta o conductor"
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
          </div>

          <div className="flex flex-wrap items-center gap-2">

            <button onClick={handleExportExcel} className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-colors" disabled={isExportingExcel}>
              <Icon name={isExportingExcel ? "refresh" : "fileSpreadsheet"} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${isExportingExcel ? 'animate-spin' : ''}`} />
              <span>{isExportingExcel ? 'Generando...' : 'Excel'}</span>
            </button>
            <button onClick={handleOpenNuevo} className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 hover:opacity-90" style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}>
              <span className="text-base leading-none font-black">+</span>
              <span>Nuevo</span>
            </button>
          </div>
        </div>

        {loadError && <PageLoadError message={loadError} />}
        <div className="internamientos-listado">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[8%]" />
              <col className="w-[13%]" />
              <col className="w-[7%]" />
              <col className="w-[16%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
              <col className="w-[23%]" />
            </colgroup>
            <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5 text-center"><SortableHeader column="numeroBoleta" label="Boleta" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-4 py-3.5 text-center">Placa</th>
                <th className="px-4 py-3.5 text-center">Infracción</th>
                <th className="px-4 py-3.5 text-center">Conductor</th>
                <th className="px-4 py-3.5 text-center"><SortableHeader column="fechaIngreso" label="Ingreso y custodia" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-3 py-3.5 text-center print:hidden">Documento</th>
                <th className="px-4 py-3.5 text-center"><SortableHeader column="estado" label="Estado" sortBy={sortBy} sortDir={sortDir} onSort={handleSort} align="center" /></th>
                <th className="px-4 py-3.5 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-slate-100 dark:divide-[var(--border)] print:divide-black transition-opacity ${isLoading && internamientos.length > 0 ? 'opacity-50' : ''}`}>
              {isLoading && internamientos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Cargando internamientos...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <Icon name="retention" className="size-10 mb-2 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron registros de internamiento</p>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/50 dark:hover:bg-[var(--bg-subtle)]">
                    <td data-label="Boleta" className="internamientos-boleta px-4 py-2.5 text-center align-middle">
                      <div className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {item.numeroBoleta || `BOL-DEP-${String(item.id).padStart(4, '0')}`}
                      </div>
                    </td>

                    <td data-label="Placa" className="px-4 py-2.5 text-center print:px-1 print:py-1">
                      <div className="flex items-center justify-center gap-2 print:gap-1">
                        <PlacaVehiculo placa={item.vehiculoPlaca} vehiculoId={item.vehiculoId} />
                      </div>
                    </td>

                    <td data-label="Infracción" className="px-4 py-2.5 text-center">
                      {/* Solo el código de la infracción de la papeleta; al hacer clic se abre su detalle (igual que en Papeletas) */}
                      {item.infracciones?.length > 0 ? (
                        <div className="flex flex-wrap justify-center gap-1">
                          {item.infracciones.map((inf) => (
                            <button
                              key={inf.codigo}
                              type="button"
                              onClick={() => setInfraccionVista({
                                codigo: inf.codigo,
                                descripcion: inf.descripcion,
                                gravedad: inf.gravedad,
                                monto: inf.monto,
                                porcentajeUit: inf.porcentajeUit,
                                numeroPapeleta: item.numeroPapeleta,
                              })}
                              title={`Clic para ver detalle de ${inf.codigo}`}
                              className="inline-flex items-center rounded-md border border-rose-200/70 bg-rose-50 px-2 py-0.5 font-mono text-xs font-black text-rose-700 transition-all hover:scale-105 hover:bg-rose-100 cursor-pointer dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                            >
                              {inf.codigo}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>

                    <td data-label="Conductor" className="px-4 py-2.5 text-center print:px-1 print:py-1">
                      <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 print:text-black">
                        {item.conductorNombre}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        DNI: {item.conductorDni}
                      </div>
                    </td>

                    <td data-label="Ingreso y custodia" className="px-4 py-2.5 text-center">
                      <div className="text-slate-800 dark:text-slate-200 font-medium text-xs">
                        {item.fechaIngreso ? new Date(item.fechaIngreso).toLocaleDateString('es-PE') : 'S/F'}
                      </div>
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 print:text-black">
                        <Icon name="clock" className="size-3 print:hidden" />
                        <span>{item.totalDias} días en custodia</span>
                      </div>
                    </td>

                    <td data-label="Documentos" className="px-3 py-2.5 text-center print:hidden">
                      <div className="flex flex-wrap items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handlePrint('INTERNAMIENTO', item)}
                        className="inline-flex items-center whitespace-nowrap justify-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-1.5 py-1 text-[10px] font-bold text-blue-700 transition cursor-pointer hover:bg-blue-100 active:scale-95 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300"
                        title="Imprimir orden de internamiento"
                      >
                        <Icon name="print" className="size-3 shrink-0" />
                        <span>Internamiento</span>
                      </button>
                      {item.estado === 'LIBERADO' && (
                        <button
                          type="button"
                          onClick={() => handlePrint('LIBERTAD', item)}
                          className="inline-flex items-center whitespace-nowrap justify-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-1 text-[10px] font-bold text-emerald-700 transition cursor-pointer hover:bg-emerald-100 active:scale-95 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                          title="Imprimir orden de libertad"
                        >
                          <Icon name="print" className="size-3 shrink-0" />
                          <span>Libertad</span>
                        </button>
                      )}
                      </div>
                    </td>

                    <td data-label="Estado" className="px-4 py-2.5 text-center">
                      {getStatusBadge(item.estado)}
                    </td>

                    <td data-label="Acciones" className="px-4 py-2.5 text-center">
                      <div className="flex flex-nowrap items-center justify-center gap-1.5">
                        {item.estado === 'RETENIDO' && (
                          <button
                            type="button"
                            onClick={() => handleOpenPago(item)}
                            className="inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border-[1.5px] border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 shadow-xs transition-all cursor-pointer hover:bg-emerald-600 hover:border-emerald-600 hover:text-white active:scale-95 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            title="Cobrar y liberar el vehículo"
                          >
                            <Icon name="creditCard" className="size-4" />
                            <span>Pagar</span>
                          </button>
                        )}
                        {(
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenEditar(item)}
                              className="size-8 shrink-0 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-edit-bg)] border-[var(--action-edit-border)] text-[var(--action-edit-text)] hover:bg-[var(--action-edit-hover)] hover:border-[var(--action-edit-hover)] hover:text-white"
                              title="Editar internamiento"
                            >
                              <Icon name="pencil" className="size-4" />
                            </button>
                            {item.estado !== 'LIBERADO' && !item.numeroOrdenLibertad && (
                            <button style={puedeEliminarRegistros() ? undefined : { display: 'none' }}
                              type="button"
                              onClick={() => handleEliminar(item)}
                              className="size-8 shrink-0 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-del-bg)] border-[var(--action-del-border)] text-[var(--action-del-text)] hover:bg-[var(--action-del-hover)] hover:border-[var(--action-del-hover)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                              title="Eliminar internamiento"
                            >
                              <Icon name="trash" className="size-4" />
                            </button>
                            )}
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="size-8 shrink-0 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 bg-[var(--action-eye-bg)] border-[var(--action-eye-border)] text-[var(--action-eye-text)] hover:bg-[var(--action-eye-hover)] hover:border-[var(--action-eye-hover)] hover:text-white"
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
          <form onSubmit={handleRegistrarInternamiento} className="flex max-h-[96dvh] min-h-[min(46rem,96dvh)] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-3.5 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)] dark:text-slate-300">
                  <Icon name="garage" className="size-4.5" />
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{editandoItem ? `Editar Internamiento ${editandoItem.numeroBoleta}` : 'Nuevo Internamiento'}</h3>
              </div>
              <BotonCerrarModal onClick={() => setIsNuevoModalOpen(false)} title="Cerrar" />
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <fieldset className="rounded-xl border border-slate-200 p-3.5 dark:border-[var(--border-strong)]">
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Papeleta de Origen</legend>
                <div className="relative">
                  <FloatingInput
                    id="int_papeleta"
                    label="Papeleta (busca por N°, placa o conductor)"
                    required
                    disabled={Boolean(editandoItem)}
                    autoComplete="off"
                    value={busquedaPapeleta}
                    onFocus={() => setListaPapeletaAbierta(true)}
                    onBlur={() => setTimeout(() => setListaPapeletaAbierta(false), 200)}
                    onChange={(e) => {
                      setBusquedaPapeleta(e.target.value)
                      setPapeletaElegida(null)
                      setNuevoInternamiento((prev) => ({ ...prev, idPapeleta: '' }))
                      setListaPapeletaAbierta(true)
                    }}
                  />
                  {listaPapeletaAbierta && !papeletaElegida && (
                    <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-lg dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]">
                      {buscandoPapeleta && resultadosPapeleta.length === 0 ? (
                        <p className="p-3 text-center text-xs text-slate-500">Buscando papeletas...</p>
                      ) : resultadosPapeleta.length === 0 ? (
                        <p className="p-3 text-center text-xs text-slate-500">No hay papeletas sin internamiento que coincidan.</p>
                      ) : (
                        resultadosPapeleta.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => elegirPapeleta(p)}
                            className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-xs transition hover:bg-rose-50 dark:hover:bg-slate-700"
                          >
                            <span className="min-w-0">
                              <span className="block font-bold text-slate-800 dark:text-white">{p.numeroPapeleta} — {p.vehiculoPlaca}</span>
                              <span className="block truncate text-[11px] text-slate-500">{p.conductorNombre || p.infractor || 'Sin conductor'}</span>
                            </span>
                            {p.tipoInfraccionCodigo && p.tipoInfraccionCodigo !== 'SIN DETALLE' && (
                              <span className="shrink-0 rounded-md border border-rose-200/70 bg-rose-50 px-1.5 py-0.5 font-mono text-[11px] font-black text-rose-700">{p.tipoInfraccionCodigo}</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </fieldset>

              <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Datos del Internamiento</legend>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FloatingInput id="int_deposito" label="Depósito oficial" value="Depósito Oficial José L. Ortiz" disabled inputClassName="bg-slate-100 text-slate-500 dark:bg-[var(--bg-subtle)]" />
                  <div className="sm:col-span-2">
                    <FloatingInput id="int_motivo" label="Motivo del internamiento" optional value={nuevoInternamiento.motivo} onChange={(e) => setNuevoInternamiento({ ...nuevoInternamiento, motivo: e.target.value })} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Interesado</legend>
                <div className="space-y-4">
                  {!interesadoElegido && (
                  <div className="flex items-end gap-2">
                    <div className="min-w-0 flex-1 sm:max-w-xs">
                      <FloatingInput
                        id="int_interesado_dni"
                        label="DNI del interesado"
                        maxLength={15}
                        inputClassName="font-mono"
                        autoComplete="off"
                        disabled={Boolean(interesadoElegido)}
                        value={busquedaInteresado}
                        onChange={(e) => { setBusquedaInteresado(e.target.value.replace(/\D/g, '')); setInteresadoNoRegistrado('') }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (!interesadoElegido) buscarInteresado() } }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={buscarInteresado}
                        disabled={buscandoInteresado}
                        title="Buscar el DNI en Gestión de personas"
                        className="grid size-[42px] shrink-0 cursor-pointer place-items-center rounded-xl text-white disabled:cursor-wait disabled:opacity-50"
                        style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
                      >
                        {buscandoInteresado
                          ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                          : <Icon name="search" className="size-4" />}
                      </button>
                  </div>
                  )}

                  {interesadoNoRegistrado && (
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                      <p className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                        El DNI <b>{interesadoNoRegistrado}</b> no está registrado en Gestión de personas.
                      </p>
                      <button
                        type="button"
                        onClick={() => abrirRegistroInteresado(interesadoNoRegistrado)}
                        className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-black text-white transition hover:bg-emerald-500 cursor-pointer"
                      >
                        <span>+</span><span>Registrar persona</span>
                      </button>
                    </div>
                  )}

                  {interesadoElegido && (
                    <div className="grid gap-4 sm:grid-cols-3">
                      <FloatingInput id="int_interesado_dni_ok" label="DNI" disabled value={interesadoElegido.dni} inputClassName="font-mono bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)]" />
                      <FloatingInput id="int_interesado_nombres" label="Nombres" disabled value={interesadoElegido.nombres} inputClassName="bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)]" />
                      <FloatingInput id="int_interesado_apellidos" label="Apellidos" disabled value={interesadoElegido.apellidos} inputClassName="bg-slate-100 text-slate-600 dark:bg-[var(--bg-subtle)]" />
                    </div>
                  )}
                  {interesadoElegido && (
                    <button type="button" onClick={quitarInteresado} className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer dark:text-rose-300">
                      Cambiar interesado
                    </button>
                  )}
                </div>
              </fieldset>

              <fieldset className="rounded-xl border border-slate-200 p-4 dark:border-[var(--border-strong)]">
                <legend className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-900 dark:text-white">Inventario del vehículo</legend>
                {criteriosInventario.length === 0 ? (
                  <p className="text-xs text-slate-400">Cargando ítems del inventario...</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-3">
                    {['PARTE EXTERIOR', 'PARTE INTERIOR', 'MOTOR'].map((seccion) => (
                      <div key={seccion}>
                        <h5 className="mb-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-300">{seccion}</h5>
                        <div className="space-y-1">
                          {criteriosInventario.filter((c) => c.seccion === seccion).map((c) => (
                            <div key={c.id} className="flex items-center justify-between gap-2 text-[11px] font-semibold text-slate-700 dark:text-slate-200">
                              <span className="min-w-0 truncate" title={c.nombre}>{c.nombre}</span>
                              <button
                                type="button"
                                aria-label={`${c.nombre}: ${inventarioMarcado[c.id] ? 'marcado' : 'sin marcar'}`}
                                title="Clic para marcar (✓); más clics aumentan la cantidad"
                                onClick={() => setInventarioMarcado((prev) => {
                                  const actual = Number(prev[c.id] || 0)
                                  const siguiente = actual >= 9 ? 0 : actual + 1
                                  const sig = { ...prev }
                                  if (siguiente === 0) delete sig[c.id]
                                  else sig[c.id] = String(siguiente)
                                  return sig
                                })}
                                className={`grid h-7 w-14 shrink-0 cursor-pointer place-items-center rounded-md border text-sm font-black transition ${
                                  inventarioMarcado[c.id]
                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'border-slate-300 bg-white text-transparent hover:border-emerald-400 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]'
                                }`}
                              >
                                {inventarioMarcado[c.id] === '1' ? '✓' : (inventarioMarcado[c.id] || '·')}
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                {registrando ? 'Guardando...' : (editandoItem ? 'Guardar cambios' : 'Registrar Internamiento')}
              </BotonGuardar>
            </div>
          </form>
        </div>
      )}

      {pagoItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget && !pagando) setPagoItem(null) }}>
          <form onSubmit={handleConfirmarPago} className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-[#1C2438] border border-slate-200/80 dark:border-[var(--border)]">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Icon name="creditCard" className="size-4.5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">Cobrar y liberar vehículo</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Boleta {pagoItem.numeroBoleta} · placa {pagoItem.vehiculoPlaca}</p>
                </div>
              </div>
              <BotonCerrarModal onClick={() => !pagando && setPagoItem(null)} title="Cerrar" />
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)]">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Papeleta {pagoItem.numeroPapeleta || '—'}</span>
                  <span className="font-bold text-slate-900 dark:text-white">S/ {Number(pagoItem.montoPapeleta || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {pagoItem.papeletaEstado === 'PAGADA'
                    ? 'La papeleta ya está pagada: solo se cobra la guardianía y el remolque.'
                    : papeletaPorCobrar(pagoItem)
                      ? 'La papeleta está pendiente de pago: se cobra junto con la liberación.'
                      : 'Este internamiento no tiene papeleta asociada.'}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FloatingInput id="pago_fecha" label="Fecha de pago" type="date" required max={hoyISO()} value={pagoForm.fechaPago} onChange={(e) => setPagoForm({ ...pagoForm, fechaPago: e.target.value })} />
                {papeletaPorCobrar(pagoItem) && (
                  <FloatingInput id="pago_rec_pap" label="N° de recibo de la papeleta" required value={pagoForm.reciboPapeleta} onChange={(e) => setPagoForm({ ...pagoForm, reciboPapeleta: e.target.value })} />
                )}
                <FloatingInput id="pago_monto_guard" label="Guardianía (S/)" type="number" min="0" step="0.01" optional value={pagoForm.montoGuardiania} onChange={(e) => setPagoForm({ ...pagoForm, montoGuardiania: e.target.value })} />
                <FloatingInput id="pago_rec_guard" label="N° de recibo de guardianía" optional value={pagoForm.reciboGuardiania} onChange={(e) => setPagoForm({ ...pagoForm, reciboGuardiania: e.target.value })} />
                <FloatingInput id="pago_monto_rem" label="Remolque (S/)" type="number" min="0" step="0.01" optional value={pagoForm.montoRemolque} onChange={(e) => setPagoForm({ ...pagoForm, montoRemolque: e.target.value })} />
                <FloatingInput id="pago_rec_rem" label="N° de recibo de remolque" optional value={pagoForm.reciboRemolque} onChange={(e) => setPagoForm({ ...pagoForm, reciboRemolque: e.target.value })} />
                {(tarifas.guardianiaDia > 0 || tarifas.remolque > 0) && (
                  <p className="sm:col-span-2 -mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Tarifa del depósito:{' '}
                    {tarifas.guardianiaDia > 0 && `guardianía S/ ${tarifas.guardianiaDia.toFixed(2)} por día × ${Math.max(1, Number(pagoItem.totalDias || 1))} día(s) = S/ ${(tarifas.guardianiaDia * Math.max(1, Number(pagoItem.totalDias || 1))).toFixed(2)}`}
                    {tarifas.guardianiaDia > 0 && tarifas.remolque > 0 && ' · '}
                    {tarifas.remolque > 0 && `remolque S/ ${tarifas.remolque.toFixed(2)} (deja 0 si no hubo remolque)`}
                    . Solo la jefatura puede cobrar menos.
                  </p>
                )}
                <div className="sm:col-span-2">
                  <FloatingInput id="pago_dni" label="DNI de quien retira el vehículo" required maxLength={15} value={pagoForm.autorizadoDni} onChange={(e) => setPagoForm({ ...pagoForm, autorizadoDni: e.target.value.replace(/\D/g, '') })} />
                </div>
                <div className="sm:col-span-2">
                  <FloatingInput id="pago_obs" label="Observaciones" optional value={pagoForm.observaciones} onChange={(e) => setPagoForm({ ...pagoForm, observaciones: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950/30">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Total a cobrar</span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                  S/ {totalPago(pagoItem, pagoForm).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <BotonCancelar onClick={() => !pagando && setPagoItem(null)} />
              <BotonGuardar disabled={pagando}>
                {pagando ? 'Registrando...' : 'Cobrar y liberar'}
              </BotonGuardar>
            </div>
          </form>
        </div>
      )}

      {isDetailModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 backdrop-blur-xs animate-enter" onMouseDown={(e) => { if (e.target === e.currentTarget) setIsDetailModalOpen(false) }}>
          <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-3 dark:border-[var(--border)]">
              <div className="flex min-w-0 items-center gap-3">
                <PlacaBadge placa={selectedItem.vehiculoPlaca} />
                <div className="min-w-0">
                  <h3 className="truncate text-base font-bold leading-tight text-slate-900 dark:text-white">Boleta {selectedItem.numeroBoleta}</h3>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                    {selectedItem.vehiculoMarca} {selectedItem.vehiculoModelo} ({selectedItem.vehiculoColor}) · {selectedItem.totalDias} {selectedItem.totalDias === 1 ? 'día' : 'días'} en custodia
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {getStatusBadge(selectedItem.estado)}
                <BotonCerrarModal onClick={() => setIsDetailModalOpen(false)} title="Cerrar ventana" />
              </div>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs sm:grid-cols-3">
                <div>
                  <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Papeleta</dt>
                  <dd className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.numeroPapeleta || '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Infracción</dt>
                  <dd className="flex flex-wrap gap-1">
                    {selectedItem.infracciones?.length > 0 ? selectedItem.infracciones.map((inf) => (
                      <button
                        key={inf.codigo}
                        type="button"
                        onClick={() => setInfraccionVista({ ...inf, numeroPapeleta: selectedItem.numeroPapeleta })}
                        title={inf.descripcion}
                        className="rounded-md border border-rose-200/70 bg-rose-50 px-1.5 py-0.5 font-mono text-[11px] font-black text-rose-700 cursor-pointer hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
                      >
                        {inf.codigo}
                      </button>
                    )) : <span className="font-bold text-slate-800 dark:text-slate-200">—</span>}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ingreso</dt>
                  <dd className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.fechaIngreso ? new Date(String(selectedItem.fechaIngreso).replace(' ', 'T')).toLocaleDateString('es-PE') : '—'}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Conductor</dt>
                  <dd className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.conductorNombre} <span className="font-mono font-normal text-slate-500">· {selectedItem.conductorDni || '—'}</span></dd>
                </div>
                <div>
                  <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Interesado (paga)</dt>
                  <dd className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.interesadoNombre} <span className="font-mono font-normal text-slate-500">· {selectedItem.interesadoDni || '—'}</span></dd>
                </div>
                <div>
                  <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Remisor</dt>
                  <dd className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.remisorNombre}</dd>
                </div>
                <div>
                  <dt className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Carrocería</dt>
                  <dd className="font-bold text-slate-800 dark:text-slate-200">{selectedItem.estadoCarroceria || 'Sin registrar'}</dd>
                </div>
              </dl>

              {selectedItem.estado === 'LIBERADO' && (
                <p className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-emerald-200/90 bg-emerald-50/70 px-3 py-2 text-xs font-medium text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
                  <span className="inline-flex items-center gap-1.5 font-extrabold"><Icon name="check" className="size-4 text-emerald-600" /> Liberado</span>
                  <span><b>Orden</b> {selectedItem.numeroOrdenLibertad || 'S/N'}</span>
                  <span><b>Salida</b> {selectedItem.fechaLiberacion ? new Date(selectedItem.fechaLiberacion).toLocaleDateString('es-PE') : '—'}</span>
                  <span><b>Pagado</b> S/ {Number(selectedItem.montoTotalLiberacion || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</span>
                </p>
              )}

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Inventario</span>
                  <span className="text-[10px] font-bold text-slate-500">{selectedItem.inventario?.length || 0} elementos</span>
                </div>
                {(!selectedItem.inventario || selectedItem.inventario.length === 0) ? (
                  <p className="rounded-xl border border-dashed border-slate-200 py-3 text-center text-xs text-slate-400 dark:border-[var(--border-strong)]">Sin inventario registrado.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 rounded-xl border border-slate-200/80 p-3 text-[11px] dark:border-[var(--border)] sm:grid-cols-3">
                    {selectedItem.inventario.map((inv) => (
                      <div key={inv.criterioId || inv.codigo} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200" title={`${inv.nombre} · ${inv.estado}`}>{inv.nombre}</span>
                        <span className="flex shrink-0 items-center gap-1.5 font-black text-slate-800 dark:text-white">
                          {Number(inv.cantidad) > 1 && <span>×{inv.cantidad}</span>}
                          <span className={`size-2 rounded-full ${inv.estado === 'MALO' ? 'bg-rose-500' : inv.estado === 'REGULAR' ? 'bg-amber-400' : 'bg-emerald-500'}`} aria-label={inv.estado} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-400">
                  <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-emerald-500" /> Bueno</span>
                  <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-amber-400" /> Regular</span>
                  <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-rose-500" /> Malo</span>
                </p>
              </div>

              {selectedItem.observaciones && (
                <p className="rounded-xl border border-slate-200/80 bg-slate-50/60 px-3 py-2 text-xs text-slate-700 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]/40 dark:text-slate-300">
                  <b className="text-slate-500">Observaciones:</b> {selectedItem.observaciones}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/80 px-5 py-3 dark:border-[var(--border)] dark:bg-[#1C2438]">
              <BotonCancelar onClick={() => setIsDetailModalOpen(false)}>Cerrar</BotonCancelar>
            </div>
          </div>
        </div>
      )}

      {/* Va después de la ficha para que se abra encima de ella */}
      {infraccionVista && (
        <InfraccionDetalleModal selectedInfraccion={infraccionVista} onClose={() => setInfraccionVista(null)} />
      )}

      {(printLayout === 'INTERNAMIENTO' || printLayout === 'LIBERTAD') && selectedItem && (
        // Sin margen de página, el navegador no imprime fecha, título, dirección ni "1/1" en los bordes;
        // el margen institucional (12 mm × 14 mm) pasa a ser relleno de la propia hoja.
        <style>{`@page { size: A4 portrait; margin: 0; } @media print { body > #seccion-impresion.boleta-internamiento-a4, body > #seccion-impresion.orden-libertad-a4 { padding: 12mm 14mm !important; box-sizing: border-box !important; } }`}</style>
      )}
      {printLayout === 'INTERNAMIENTO' && selectedItem && (
        <BoletaInternamientoPrint item={selectedItem} />
      )}
      {printLayout === 'LIBERTAD' && selectedItem && (
        <OrdenLibertadPrint item={selectedItem} />
      )}

      {/* Alta rápida de una persona del padrón (desde el interesado) */}
      {modalPersonaRapida}
    </div>
  )
}
export default Retenciones
