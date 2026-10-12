import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../ui/Icon'
import { Pagination } from '../ui/Pagination'
import { RoundedSelect } from '../ui/FormInputs'
import { FiltroRemoto } from './FiltroRemoto'
import { BotonCancelar, BotonCerrarModal } from '../ui/ModalControls'
import { apiFetch } from '../../config/api'
import { showConfirm, showError, showToast } from '../../utils/SwalUtil'
import { fetchTodasLasFilas } from '../../utils/descargaCompleta'
import { abrirImpresionCuandoEsteListo } from '../../utils/impresionCarnets'
import '../vehiculos/QrVehiculoImpresion.css'

const COLOR_PRIMARIO = 'oklch(62.3% 0.214 259.815)'

const TAMANOS_LOTE = [
  { value: '20', label: 'Lotes de 20' },
  { value: '40', label: 'Lotes de 40' },
  { value: '100', label: 'Lotes de 100' },
  { value: '200', label: 'Lotes de 200' },
]

// Panel flotante mientras se imprimen varios lotes seguidos: muestra el avance y permite detener.
export function ProgresoLotes({ progreso, onDetener }) {
  if (!progreso) return null
  const porcentaje = Math.round(((progreso.actual - 1) / progreso.total) * 100)
  return createPortal(
    <div className="qrv-no-print fixed bottom-4 right-4 z-[95] w-72 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xl dark:border-[var(--border)] dark:bg-[#1C2438]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-black text-slate-900 dark:text-white">Imprimiendo lote {progreso.actual} de {progreso.total}</p>
        <button
          type="button"
          onClick={onDetener}
          className="cursor-pointer rounded-lg border border-rose-200/80 bg-rose-50/70 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
        >
          Detener
        </button>
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[var(--bg-subtle)]">
        <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${porcentaje}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
        Al cerrar la ventana de impresión se abre el siguiente lote solo.
      </p>
    </div>,
    document.body,
  )
}

const plural = (n, singular, pluralTexto) => `${n.toLocaleString('es-PE')} ${n === 1 ? singular : pluralTexto}`

const leerCarrito = (clave) => {
  try {
    // Se descarta lo guardado con la clave sin versión (datos anteriores al cambio de códigos QR a uuid).
    localStorage.removeItem(clave.replace(/_v\d+$/, ''))
    const guardado = JSON.parse(localStorage.getItem(clave) || '{}')
    return guardado && typeof guardado === 'object' ? guardado : {}
  } catch {
    return {}
  }
}

// Páginas ya pedidas al servidor: volver a una página o ir a la siguiente es instantáneo.
const cachePaginas = new Map()
const claveConsulta = (endpoint, filtros, pagina, porPagina) => JSON.stringify([endpoint, filtros, pagina, porPagina])

const pedirPagina = async (endpoint, filtros, pagina, porPagina) => {
  const clave = claveConsulta(endpoint, filtros, pagina, porPagina)
  const guardada = cachePaginas.get(clave)
  if (guardada && Date.now() - guardada.en < 180000) return guardada.datos
  const params = new URLSearchParams({ ...filtros, page: String(pagina), porPagina: String(porPagina) })
  const res = await apiFetch(`${endpoint}?${params.toString()}`)
  if (!res.ok) throw new Error('No se pudo cargar')
  const json = await res.json()
  const resultado = { filas: json.data ?? [], total: json.meta?.total ?? json.data?.length ?? 0 }
  cachePaginas.set(clave, { datos: resultado, en: Date.now() })
  if (cachePaginas.size > 80) cachePaginas.delete(cachePaginas.keys().next().value)
  return resultado
}

// Cola de impresión: lo reunido, quitar elementos e imprimir todo o por lotes (4 por hoja A4).
function CarritoImpresionModal({ titulo, nombreItem, items, columnas, onQuitar, onVaciar, onClose, onImprimir, onImprimirTodo }) {
  const [tamanoLote, setTamanoLote] = useState('40')
  const [impresos, setImpresos] = useState([])

  const lotes = useMemo(() => {
    const t = Number(tamanoLote)
    const resultado = []
    for (let i = 0; i < items.length; i += t) resultado.push(items.slice(i, i + t))
    return resultado
  }, [items, tamanoLote])

  useEffect(() => { setImpresos([]) }, [items.length, tamanoLote])

  const hojasDe = (cantidad) => Math.ceil(cantidad / 4)
  const [singular, pluralItem] = nombreItem

  return createPortal(
    <div
      className="qrv-no-print fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-[#1C2438]">
        <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-200 px-5 py-3.5 dark:border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Icon name="print" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-black leading-tight text-slate-900 dark:text-white">{titulo}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">4 {pluralItem} (anverso y reverso) por hoja A4</p>
            </div>
          </div>
          <BotonCerrarModal onClick={onClose} />
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Icon name="print" className="mx-auto mb-2 size-10 text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-600 dark:text-slate-300">La cola está vacía</p>
            <p className="mt-1 text-xs text-slate-400">Agregue elementos desde la lista para imprimirlos.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 border-b border-slate-100 px-5 py-3 dark:border-[var(--border)]">
              <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-[var(--border)]">
                <p className="text-xl font-black leading-tight text-indigo-600 dark:text-indigo-300">{items.length.toLocaleString('es-PE')}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{items.length === 1 ? singular : pluralItem}</p>
              </div>
              <div className="rounded-xl border border-slate-200 px-3 py-2 dark:border-[var(--border)]">
                <p className="text-xl font-black leading-tight text-amber-600 dark:text-amber-300">{hojasDe(items.length).toLocaleString('es-PE')}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{hojasDe(items.length) === 1 ? 'Hoja A4' : 'Hojas A4'}</p>
              </div>
            </div>

            <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Tamaño de cada lote</p>
              <RoundedSelect value={tamanoLote} onChange={setTamanoLote} options={TAMANOS_LOTE} className="w-full sm:w-64" buttonClassName="w-full" />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {lotes.length > 1 && (
                <div className="px-5 pt-4">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Imprimir por lotes ({impresos.length} de {lotes.length} impresos)
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {lotes.map((lote, i) => {
                      const hecho = impresos.includes(i)
                      const desde = i * Number(tamanoLote) + 1
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onImprimir(lote, () => setImpresos((prev) => (prev.includes(i) ? prev : [...prev, i])))}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition hover:border-indigo-400 ${hecho ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-[var(--border)]'}`}
                        >
                          <span className="min-w-0">
                            <strong className="block font-bold text-slate-800 dark:text-slate-100">Lote {i + 1}</strong>
                            <span className="block truncate text-[11px] text-slate-500">
                              {desde}–{desde + lote.length - 1} · {plural(hojasDe(lote.length), 'hoja', 'hojas')}
                            </span>
                          </span>
                          <span className={`inline-flex shrink-0 items-center gap-1 font-bold ${hecho ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                            <Icon name={hecho ? 'check' : 'print'} className="size-3.5" />
                            {hecho ? 'Impreso' : 'Imprimir'}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="px-5 py-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {plural(items.length, `${singular} en la cola`, `${pluralItem} en la cola`)}
                </p>
                <div className="max-h-[34vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-[var(--border)]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-[var(--bg-subtle)] dark:text-slate-400">
                      <tr>
                        {columnas.map((c) => <th key={c.titulo} className="px-3.5 py-2">{c.titulo}</th>)}
                        <th className="w-10 px-3.5 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                      {items.slice(0, 300).map((item) => (
                        <tr key={item.__id} className="transition-colors hover:bg-cyan-50/30 dark:hover:bg-[var(--bg-subtle)]">
                          {columnas.map((c) => <td key={c.titulo} className="px-3.5 py-2">{c.celda(item)}</td>)}
                          <td className="px-3.5 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => onQuitar(item.__id)}
                              title="Quitar de la cola"
                              className="grid size-7 cursor-pointer place-items-center rounded-lg border border-transparent text-slate-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:hover:border-rose-900/60 dark:hover:bg-rose-950/40"
                            >
                              <Icon name="x" className="size-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {items.length > 300 && (
                  <p className="mt-2 text-center text-xs text-slate-400">
                    Se muestran los primeros 300 de {items.length.toLocaleString('es-PE')}. Todos se imprimen igual.
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-b-2xl border-t border-slate-200 px-5 py-3 dark:border-[var(--border)]">
          <button
            type="button"
            onClick={onVaciar}
            disabled={items.length === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/50"
          >
            <Icon name="trash" className="size-3.5" />
            Vaciar cola
          </button>
          <div className="flex items-center gap-2">
            <BotonCancelar onClick={onClose}>Cerrar</BotonCancelar>
            <button
              type="button"
              onClick={() => onImprimirTodo(lotes, (i) => setImpresos((prev) => (prev.includes(i) ? prev : [...prev, i])))}
              disabled={items.length === 0}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-1.5 font-bold text-white transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: COLOR_PRIMARIO, fontSize: '12px' }}
            >
              <Icon name="print" className="size-4" />
              Imprimir todo ({items.length.toLocaleString('es-PE')})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function ResumenImpresion({ total, enCarrito }) {
  return (
    <div className="flex items-center gap-2">
      <span className="inline-flex items-baseline gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-2.5 py-1 dark:border-indigo-900/60 dark:bg-indigo-950/40">
        <strong className="text-sm font-black leading-none text-indigo-700 dark:text-indigo-300">{total.toLocaleString('es-PE')}</strong>
        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600/80 dark:text-indigo-400">con estos filtros</span>
      </span>
      <span className="inline-flex items-baseline gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-1 dark:border-emerald-900/60 dark:bg-emerald-950/40">
        <strong className="text-sm font-black leading-none text-emerald-700 dark:text-emerald-300">{enCarrito.toLocaleString('es-PE')}</strong>
        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/80 dark:text-emerald-400">en la cola</span>
      </span>
    </div>
  )
}

/**
 * Lista con filtros, selección y carrito de impresión, común a las pestañas del Centro de impresión.
 * Cada pestaña define sus filtros, sus columnas y cómo se preparan e imprimen los elementos.
 */
export function ListaImpresion({
  storageKey,
  endpoint,
  baseParams = {},
  placeholder,
  filtros = [],
  columnas,
  columnasCarrito,
  idDe,
  compactar,
  nombreItem,
  tituloCarrito,
  porPaginaMax = 200,
  valoresIniciales = {},
  buscarInicial = '',
  etiquetasIniciales = {},
  agregarTodoAlAbrir = false,
  alAgregarTodoAlAbrir,
  preparar,
  renderImpresion,
}) {
  const [filas, setFilas] = useState([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar] = useState(buscarInicial)
  const [buscarDebounced, setBuscarDebounced] = useState(buscarInicial.trim())
  const [valoresFiltro, setValoresFiltro] = useState(() => Object.fromEntries(filtros.map((f) => [f.clave, valoresIniciales[f.clave] ?? f.valorInicial])))
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(5)
  const [carrito, setCarrito] = useState(() => leerCarrito(storageKey))
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [trabajo, setTrabajo] = useState(null) // { items, alTerminar } ya preparados, mientras se imprime
  const [preparando, setPreparando] = useState(false)
  const [procesandoTodo, setProcesandoTodo] = useState(false)
  const [progreso, setProgreso] = useState(null) // { actual, total } mientras se imprimen varios lotes
  const detenerRef = useRef(false)

  const [singular, pluralItem] = nombreItem

  useEffect(() => { cachePaginas.clear() }, [])

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(carrito)) } catch { /* sin almacenamiento */ }
  }, [carrito, storageKey])

  useEffect(() => {
    const timer = setTimeout(() => setBuscarDebounced(buscar.trim()), 300)
    return () => clearTimeout(timer)
  }, [buscar])

  // baseParams llega como objeto nuevo en cada render: se compara por contenido para que "params" solo
  // cambie cuando cambian los filtros (si no, la página se reiniciaba a la 1 en cada render y no se podía avanzar).
  const baseParamsClave = JSON.stringify(baseParams)
  const params = useMemo(() => {
    const p = { ...JSON.parse(baseParamsClave) }
    Object.entries(valoresFiltro).forEach(([clave, valor]) => {
      if (valor !== undefined && valor !== null && valor !== '' && valor !== 'TODOS') p[clave] = valor
    })
    if (buscarDebounced) p.buscar = buscarDebounced
    return p
  }, [baseParamsClave, valoresFiltro, buscarDebounced])

  // La página se reinicia junto con el filtro (en el mismo render): así no se piden datos dos veces.
  const paramsAnteriores = useRef(params)
  const paginaEfectiva = paramsAnteriores.current === params ? pagina : 1
  useEffect(() => {
    if (paramsAnteriores.current !== params) {
      paramsAnteriores.current = params
      setPagina(1)
    }
  }, [params])

  useEffect(() => {
    let activo = true
    const clave = claveConsulta(endpoint, params, paginaEfectiva, porPagina)
    if (!cachePaginas.has(clave)) setCargando(true)
    pedirPagina(endpoint, params, paginaEfectiva, porPagina)
      .then(({ filas: f, total: t }) => {
        if (!activo) return
        setFilas(f)
        setTotal(t)
        setCargando(false)
        if (paginaEfectiva * porPagina < t) pedirPagina(endpoint, params, paginaEfectiva + 1, porPagina).catch(() => {})
      })
      .catch(() => { if (activo) { setFilas([]); setTotal(0); setCargando(false) } })
    return () => { activo = false }
  }, [endpoint, params, paginaEfectiva, porPagina])

  // Cambia datos de una fila ya cargada (p. ej. marcar un carnet como entregado) sin volver a pedir la lista.
  const actualizarFila = (id, cambios) => {
    cachePaginas.clear()
    setFilas((prev) => prev.map((f) => (String(idDe(f)) === String(id) ? { ...f, ...cambios } : f)))
  }

  const enCarrito = Object.keys(carrito).length
  const itemsCarrito = useMemo(() => Object.values(carrito), [carrito])

  const alternar = (fila) => setCarrito((prev) => {
    const sig = { ...prev }
    const id = String(idDe(fila))
    if (sig[id]) delete sig[id]
    else sig[id] = { ...compactar(fila), __id: id }
    return sig
  })

  const traerTodos = () => fetchTodasLasFilas(endpoint, params, { silencioso: true, porPagina: porPaginaMax })

  const agregarTodosLosResultados = async () => {
    setProcesandoTodo(true)
    try {
      const todas = await traerTodos()
      setCarrito((prev) => {
        const sig = { ...prev }
        todas.forEach((fila) => { const id = String(idDe(fila)); sig[id] = { ...compactar(fila), __id: id } })
        return sig
      })
      showToast(`${todas.length.toLocaleString('es-PE')} ${todas.length === 1 ? singular : pluralItem} agregados a la cola`)
    } catch {
      showError('Error', 'No se pudieron agregar todos los resultados.')
    } finally {
      setProcesandoTodo(false)
    }
  }

  // Llegando desde un curso ("imprimir" en su fila): al terminar de cargar, se pasan todos los resultados
  // al carrito y se abre, para que solo quede pulsar imprimir.
  const autoAgregado = useRef(false)
  useEffect(() => {
    if (!agregarTodoAlAbrir || autoAgregado.current || cargando) return
    autoAgregado.current = true
    // Es una acción de una sola vez: se avisa para que no se repita al volver a esta pestaña.
    alAgregarTodoAlAbrir?.()
    if (total === 0) return
    agregarTodosLosResultados().then(() => setCarritoAbierto(true))
  }, [agregarTodoAlAbrir, cargando]) // eslint-disable-line react-hooks/exhaustive-deps

  const vaciarCarrito = async () => {
    const resultado = await showConfirm(
      '¿Vaciar la cola de impresión?',
      `Se quitarán los ${enCarrito.toLocaleString('es-PE')} elementos de la cola de impresión.`,
      'Sí, vaciar',
      'Cancelar',
      { confirmColor: '#e11d48' },
    )
    if (resultado.isConfirmed) {
      setCarrito({})
      showToast('Cola de impresión vaciada')
    }
  }

  const quitarDelCarrito = (id) => setCarrito((prev) => {
    const sig = { ...prev }
    delete sig[id]
    return sig
  })

  // Prepara los elementos (fotos, plantillas), monta la hoja y abre la impresión. Devuelve una promesa que
  // se cumple cuando se cierra el diálogo de impresión (se imprimió o se canceló).
  const imprimirUnLote = (items) => new Promise((resolve) => {
    setPreparando(true)
    preparar(items)
      .then((listos) => setTrabajo({ items: listos, alTerminar: resolve }))
      .catch(() => {
        showError('Error de impresión', 'No se pudo preparar la impresión.')
        resolve()
      })
      .finally(() => setPreparando(false))
  })

  const imprimir = async (items, alTerminar) => {
    if (items.length === 0) {
      showError('Sin elementos', 'Agregue al menos un elemento a la cola.')
      return
    }
    if (trabajo || preparando || progreso) return
    await imprimirUnLote(items)
    alTerminar?.()
  }

  // Imprime varios lotes seguidos sin tener que pulsar nada entre uno y otro.
  const imprimirLotes = async (lotes, alTerminarLote) => {
    if (lotes.length === 0) {
      showError('Sin elementos', 'Agregue al menos un elemento a la cola.')
      return
    }
    if (trabajo || preparando || progreso) return
    detenerRef.current = false
    for (let i = 0; i < lotes.length; i += 1) {
      if (detenerRef.current) break
      setProgreso({ actual: i + 1, total: lotes.length })
      await imprimirUnLote(lotes[i])
      alTerminarLote?.(i)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    setProgreso(null)
  }

  useEffect(() => {
    if (!trabajo) return
    abrirImpresionCuandoEsteListo(() => {
      trabajo.alTerminar?.()
      // Solo se limpia si sigue siendo ese mismo trabajo (no uno nuevo que haya empezado mientras tanto).
      setTrabajo((actual) => (actual === trabajo ? null : actual))
    })
  }, [trabajo])

  const hayFiltros = buscar !== '' || filtros.some((f) => valoresFiltro[f.clave] !== f.valorInicial)
  const limpiarFiltros = () => {
    setBuscar('')
    setValoresFiltro(Object.fromEntries(filtros.map((f) => [f.clave, f.valorInicial])))
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">
      {/* Filtros */}
      <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Icon
            name={cargando ? 'refresh' : 'search'}
            className={`absolute left-3 top-1/2 size-3.5 -translate-y-1/2 transition-colors ${cargando ? 'animate-spin text-blue-500' : 'text-slate-400'}`}
          />
          <input
            type="text"
            placeholder={placeholder}
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-8 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-100"
          />
          {buscar && (
            <button type="button" onClick={() => setBuscar('')} className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {filtros.map((f) => (f.remoto ? (
            <FiltroRemoto
              key={f.clave}
              value={valoresFiltro[f.clave]}
              onChange={(valor) => setValoresFiltro((prev) => ({ ...prev, [f.clave]: valor }))}
              endpoint={f.remoto.endpoint}
              etiquetaTodos={f.remoto.etiquetaTodos}
              etiquetaInicial={etiquetasIniciales[f.clave]}
              mapear={f.remoto.mapear}
            />
          ) : (
            <RoundedSelect
              key={f.clave}
              value={valoresFiltro[f.clave]}
              onChange={(valor) => setValoresFiltro((prev) => ({ ...prev, [f.clave]: valor }))}
              options={f.opciones}
            />
          )))}
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              title="Limpiar filtros"
              className="grid size-8.5 cursor-pointer place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50"
            >
              <Icon name="filterX" className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Carrito */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 bg-slate-50/60 px-4 py-2 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
        <ResumenImpresion total={total} enCarrito={enCarrito} />

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={agregarTodosLosResultados}
            disabled={procesandoTodo || total === 0}
            title="Agregar a la cola todos los que cumplen los filtros"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/70 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-50 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
          >
            <Icon name={procesandoTodo ? 'refresh' : 'add'} className={`size-3.5 ${procesandoTodo ? 'animate-spin' : ''}`} />
            <span>Agregar resultados</span>
          </button>

          {enCarrito > 0 && (
            <>
              <button
                type="button"
                onClick={vaciarCarrito}
                title="Vaciar toda la cola"
                className="grid size-8.5 cursor-pointer place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 hover:bg-rose-100 hover:text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50"
              >
                <Icon name="filterX" className="size-4" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setCarritoAbierto(true)}
            className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: COLOR_PRIMARIO }}
          >
            <Icon name={preparando ? 'refresh' : 'print'} className={`size-3.5 ${preparando ? 'animate-spin' : ''}`} />
            <span>{preparando ? 'Preparando…' : 'Cola de impresión'}</span>
            <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[11px] leading-none">{enCarrito.toLocaleString('es-PE')}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto overscroll-x-contain" role="region" tabIndex={0}>
        <table className="w-full min-w-[820px] table-fixed text-left text-xs">
          <colgroup>
            {columnas.map((c) => <col key={c.titulo} style={{ width: c.ancho }} />)}
            <col style={{ width: '19%' }} />
          </colgroup>
          <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[var(--border)]">
            <tr>
              {columnas.map((c) => <th key={c.titulo} className="px-3.5 py-2.5">{c.titulo}</th>)}
              <th className="sticky right-0 z-10 border-l border-slate-200 bg-slate-50/75 px-4 py-2.5 text-center shadow-[-4px_0_8px_rgba(0,0,0,0.04)] dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">Acciones</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 dark:divide-[var(--border)] ${cargando && filas.length > 0 ? 'pointer-events-none opacity-60' : 'opacity-100'}`}>
            {cargando && filas.length === 0 ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  {columnas.map((c) => (
                    <td key={c.titulo} className="px-3.5 py-3"><div className="h-4 w-28 rounded bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                  ))}
                  <td className="sticky right-0 z-10 border-l border-slate-200 bg-white px-4 py-4 shadow-[-4px_0_8px_rgba(0,0,0,0.04)] dark:border-[var(--border)] dark:bg-[#1C2438]"><div className="mx-auto h-7 w-20 rounded-lg bg-slate-200 dark:bg-[var(--bg-subtle)]" /></td>
                </tr>
              ))
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan={columnas.length + 1} className="p-12 text-center">
                  <Icon name="print" className="mx-auto mb-2 size-10 text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron resultados</p>
                </td>
              </tr>
            ) : filas.map((fila) => {
              const id = String(idDe(fila))
              const agregado = Boolean(carrito[id])
              return (
                <tr key={id} onClick={() => alternar(fila)} className="group cursor-pointer transition-colors hover:bg-cyan-50/30 dark:hover:bg-[var(--bg-subtle)]">
                  {columnas.map((c) => <td key={c.titulo} className="px-3.5 py-2.5">{c.celda(fila, { actualizarFila })}</td>)}
                  <td className="sticky right-0 z-10 border-l border-slate-200 bg-white px-4 py-3 text-center shadow-[-4px_0_8px_rgba(0,0,0,0.04)] transition-colors group-hover:bg-cyan-50/30 dark:border-[var(--border)] dark:bg-[#1C2438] dark:group-hover:bg-slate-800/40">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); alternar(fila) }}
                        title={agregado ? 'Quitar de la cola' : 'Añadir a la cola'}
                        className={`inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border-[1.5px] px-2.5 text-[11px] font-bold shadow-xs transition-all active:scale-95 ${
                          agregado
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-[var(--action-eye-border)] bg-[var(--action-eye-bg)] text-[var(--action-eye-text)] hover:border-[var(--action-eye-hover)] hover:bg-[var(--action-eye-hover)] hover:text-white'
                        }`}
                      >
                        <Icon name={agregado ? 'check' : 'add'} className="size-3.5" />
                        {agregado ? 'En cola' : 'Añadir'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); imprimir([{ ...compactar(fila), __id: id }]) }}
                        title="Imprimir solo este"
                        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border-[1.5px] border-[var(--action-print-border)] bg-[var(--action-print-bg)] px-2.5 text-[11px] font-bold text-[var(--action-print-text)] shadow-xs transition-all hover:border-[var(--action-print-hover)] hover:bg-[var(--action-print-hover)] hover:text-white active:scale-95"
                      >
                        <Icon name="print" className="size-3.5" />
                        Imprimir
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={paginaEfectiva}
        totalItems={total}
        itemsPerPage={porPagina}
        onPageChange={(p) => setPagina(Number(p))}
        onItemsPerPageChange={(n) => { setPorPagina(Number(n)); setPagina(1) }}
        disabled={cargando}
      />

      {carritoAbierto && (
        <CarritoImpresionModal
          titulo={tituloCarrito}
          nombreItem={nombreItem}
          items={itemsCarrito}
          columnas={columnasCarrito}
          onQuitar={quitarDelCarrito}
          onVaciar={vaciarCarrito}
          onClose={() => setCarritoAbierto(false)}
          onImprimir={imprimir}
          onImprimirTodo={imprimirLotes}
        />
      )}

      <ProgresoLotes progreso={progreso} onDetener={() => { detenerRef.current = true }} />

      {trabajo && (
        <>
          {/* Hoja sin márgenes mientras dura la impresión: así el navegador no añade fecha, título, URL ni numeración. */}
          <style>{'@page { size: A4 portrait; margin: 0; } @media print { .seccion-lote-carnets .hoja-carnets-lote-a4 { padding: 12mm 0 !important; } }'}</style>
          {renderImpresion(trabajo.items)}
        </>
      )}
    </div>
  )
}
