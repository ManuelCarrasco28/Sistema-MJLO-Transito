import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '../ui/Icon'
import { Pagination } from '../ui/Pagination'
import { PlacaVehiculo } from './PlacaVehiculo'
import { PersonaEnlace } from '../personas/PersonaEnlace'
import { RoundedSelect } from '../ui/FormInputs'
import { BotonCancelar, BotonCerrarModal } from '../ui/ModalControls'
import { apiFetch } from '../../config/api'
import { showConfirm, showError, showToast } from '../../utils/SwalUtil'
import { fetchTodasLasFilas } from '../../utils/descargaCompleta'
import { ImpresionQrPortal, nombreAsociacion, plantillaDeVehiculo } from './QrVehiculoImpresion'
import { ResumenImpresion, ProgresoLotes } from '../impresion/ListaImpresion'
import { FilaCargando } from '../ui/FilaCargando'

const TIPOS_CON_PLANTILLA = [
  { value: 'Mototaxi,Motocarguera', label: 'Mototaxi y motocarguera' },
  { value: 'Mototaxi', label: 'Solo mototaxi' },
  { value: 'Motocarguera', label: 'Solo motocarguera' },
]

const COPIAS = [
  { value: '3', label: '3 QR por vehículo' },
  { value: '1', label: '1 QR por vehículo' },
  { value: '2', label: '2 QR por vehículo' },
  { value: '4', label: '4 QR por vehículo' },
]

const TAMANOS_LOTE = [
  { value: '20', label: 'Lotes de 20 vehículos' },
  { value: '40', label: 'Lotes de 40 vehículos' },
  { value: '100', label: 'Lotes de 100 vehículos' },
  { value: '200', label: 'Lotes de 200 vehículos' },
]

const COLOR_PRIMARIO = 'oklch(62.3% 0.214 259.815)'
// Invalidar los QR antiguos al migrar a UUID.
const CLAVE_CARRITO = 'qr_carrito_vehiculos_v2'
const CLAVES_ANTERIORES = ['qr_carrito_vehiculos']

const compactar = (v) => ({
  id: v.id,
  placa: v.placa,
  tipo: v.tipo,
  asociacion: v.asociacion,
  uuid: v.uuid,
  codigoQr: v.codigoQr,
  propietario: v.propietario,
})

const leerCarrito = () => {
  try {
    CLAVES_ANTERIORES.forEach((clave) => localStorage.removeItem(clave))
    const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || '{}')
    return guardado && typeof guardado === 'object' ? guardado : {}
  } catch {
    return {}
  }
}

// Páginas ya pedidas al servidor (clave = filtros + página): volver a una página o ir a la siguiente
// es instantáneo. Se descarta cuando cambian los datos de otra pestaña recargando el módulo.
const cachePaginas = new Map()
const claveConsulta = (filtros, pagina, porPagina) => JSON.stringify([filtros, pagina, porPagina])

const pedirPagina = async (filtros, pagina, porPagina) => {
  const clave = claveConsulta(filtros, pagina, porPagina)
  const guardada = cachePaginas.get(clave)
  if (guardada && Date.now() - guardada.en < 180000) return guardada.datos
  const params = new URLSearchParams({ ...filtros, page: String(pagina), porPagina: String(porPagina) })
  const res = await apiFetch(`/vehiculos/qr?${params.toString()}`)
  if (!res.ok) throw new Error('No se pudo cargar')
  const json = await res.json()
  const resultado = { filas: json.data ?? [], total: json.meta?.total ?? json.data?.length ?? 0 }
  cachePaginas.set(clave, { datos: resultado, en: Date.now() })
  if (cachePaginas.size > 60) cachePaginas.delete(cachePaginas.keys().next().value)
  return resultado
}

const plural = (n, singular, pluralTexto) => `${n.toLocaleString('es-PE')} ${n === 1 ? singular : pluralTexto}`

function EtiquetaCampo({ texto, children }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{texto}</p>
      {children}
    </div>
  )
}

// Cola de impresión: lista lo reunido, permite quitar vehículos e imprimir todo o por lotes.
function CarritoQrModal({ carrito, onQuitar, onVaciar, onClose, onImprimir, onImprimirTodo }) {
  const [copias, setCopias] = useState('3')
  const [tamanoLote, setTamanoLote] = useState('40')
  const [impresos, setImpresos] = useState([]) // índices de lote ya enviados a imprimir

  const items = useMemo(() => Object.values(carrito).filter(plantillaDeVehiculo), [carrito])
  const lotes = useMemo(() => {
    const t = Number(tamanoLote)
    const resultado = []
    for (let i = 0; i < items.length; i += t) resultado.push(items.slice(i, i + t))
    return resultado
  }, [items, tamanoLote])

  // Si cambia el carrito o el tamaño del lote, los lotes ya no son los mismos: se reinicia el avance.
  useEffect(() => { setImpresos([]) }, [items.length, tamanoLote])

  const qrDe = (cantidad) => cantidad * Number(copias)
  const hojasDe = (cantidad) => Math.ceil(qrDe(cantidad) / 4)
  const imprimirLote = (indice) => {
    onImprimir(lotes[indice], Number(copias), () => setImpresos((prev) => (prev.includes(indice) ? prev : [...prev, indice])))
  }

  return createPortal(
    <div
      className="qrv-no-print fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-[#1C2438]">
        {/* Cabecera */}
        <div className="flex items-center justify-between gap-3 rounded-t-2xl border-b border-slate-200 px-5 py-3.5 dark:border-[var(--border)]">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
              <Icon name="print" className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-black leading-tight text-slate-900 dark:text-white">Cola de impresión de QR</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Plantillas de mototaxi y motocarguera en hojas A4 de 4 cuadrantes</p>
            </div>
          </div>
          <BotonCerrarModal onClick={onClose} />
        </div>

        {items.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <Icon name="vehicle" className="mx-auto mb-2 size-10 text-slate-300 dark:text-slate-600" />
            <p className="font-bold text-slate-600 dark:text-slate-300">La cola está vacía</p>
            <p className="mt-1 text-xs text-slate-400">Agregue vehículos desde la lista para imprimir sus QR.</p>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="grid grid-cols-3 gap-2.5 border-b border-slate-100 px-5 py-3 dark:border-[var(--border)]">
              {[
                { valor: items.length, texto: items.length === 1 ? 'Vehículo' : 'Vehículos', color: 'text-indigo-600 dark:text-indigo-300' },
                { valor: qrDe(items.length), texto: 'QR a imprimir', color: 'text-emerald-600 dark:text-emerald-300' },
                { valor: hojasDe(items.length), texto: hojasDe(items.length) === 1 ? 'Hoja A4' : 'Hojas A4', color: 'text-amber-600 dark:text-amber-300' },
              ].map((k) => (
                <div key={k.texto} className="rounded-xl border border-slate-200 px-3 py-2 dark:border-[var(--border)]">
                  <p className={`text-xl font-black leading-tight ${k.color}`}>{k.valor.toLocaleString('es-PE')}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">{k.texto}</p>
                </div>
              ))}
            </div>

            {/* Opciones */}
            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-3 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)] sm:grid-cols-2">
              <EtiquetaCampo texto="QR por vehículo">
                <RoundedSelect value={copias} onChange={setCopias} options={COPIAS} className="w-full" buttonClassName="w-full" />
              </EtiquetaCampo>
              <EtiquetaCampo texto="Tamaño de cada lote">
                <RoundedSelect value={tamanoLote} onChange={setTamanoLote} options={TAMANOS_LOTE} className="w-full" buttonClassName="w-full" />
              </EtiquetaCampo>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Lotes */}
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
                          onClick={() => imprimirLote(i)}
                          className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-xs transition hover:border-indigo-400 ${hecho ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40' : 'border-slate-200 dark:border-[var(--border)]'}`}
                        >
                          <span className="min-w-0">
                            <strong className="block font-bold text-slate-800 dark:text-slate-100">Lote {i + 1}</strong>
                            <span className="block min-w-0 break-words text-[11px] text-slate-500">
                              Vehículos {desde}–{desde + lote.length - 1} · {plural(hojasDe(lote.length), 'hoja', 'hojas')}
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

              {/* Vehículos */}
              <div className="px-5 py-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {plural(items.length, 'vehículo en la cola', 'vehículos en la cola')}
                </p>
                <div className="max-h-[34vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-[var(--border)]">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-[var(--bg-subtle)] dark:text-slate-400">
                      <tr>
                        <th className="px-3.5 py-2">Placa</th>
                        <th className="px-3.5 py-2">Propietario</th>
                        <th className="px-3.5 py-2">Asociación</th>
                        <th className="w-10 px-3.5 py-2" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
                      {items.slice(0, 300).map((v) => (
                        <tr key={v.id} className="transition-colors hover:bg-cyan-50/30 dark:hover:bg-[var(--bg-subtle)]">
                          <td className="px-3.5 py-2"><PlacaVehiculo placa={v.placa} vehiculoId={v.id} /></td>
                          <td className="px-3.5 py-2 font-semibold text-slate-800 dark:text-slate-100">{v.propietario || <span className="text-slate-400">Sin propietario</span>}</td>
                          <td className="px-3.5 py-2 text-slate-600 dark:text-slate-300">{nombreAsociacion(v.asociacion) || <span className="text-slate-400">Sin asociación</span>}</td>
                          <td className="px-3.5 py-2 text-right">
                            <button
                              type="button"
                              onClick={() => onQuitar(v.id)}
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

        {/* Pie */}
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
              onClick={() => onImprimirTodo(lotes, Number(copias), (i) => setImpresos((prev) => (prev.includes(i) ? prev : [...prev, i])))}
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

export function ImpresionQrVehiculos({ asociaciones }) {
  const [filas, setFilas] = useState([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [buscar, setBuscar] = useState('')
  const [buscarDebounced, setBuscarDebounced] = useState('')
  const [tipo, setTipo] = useState(TIPOS_CON_PLANTILLA[0].value)
  const [asociacionId, setAsociacionId] = useState('TODAS')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(5)
  const [carrito, setCarrito] = useState(leerCarrito) // id -> vehículo; se conserva entre páginas, filtros y recargas
  const [carritoAbierto, setCarritoAbierto] = useState(false)
  const [trabajo, setTrabajo] = useState(null) // { vehiculos, copias, alTerminar } mientras se imprime
  const [agregandoTodo, setAgregandoTodo] = useState(false)
  const [progreso, setProgreso] = useState(null) // { actual, total } mientras se imprimen varios lotes
  const detenerRef = useRef(false)

  // Al abrir la pestaña se parte de datos frescos (pudo cambiarse un tipo o una asociación en la otra).
  useEffect(() => { cachePaginas.clear() }, [])

  useEffect(() => {
    try { localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito)) } catch { /* sin almacenamiento */ }
  }, [carrito])

  useEffect(() => {
    const timer = setTimeout(() => setBuscarDebounced(buscar.trim()), 300)
    return () => clearTimeout(timer)
  }, [buscar])

  const filtros = useMemo(() => {
    const f = { tipo }
    if (buscarDebounced) f.buscar = buscarDebounced
    if (asociacionId !== 'TODAS') f.asociacionId = asociacionId
    return f
  }, [tipo, buscarDebounced, asociacionId])

  // La página se reinicia junto con el filtro (en el mismo render): así no se piden datos dos veces.
  const filtrosAnteriores = useRef(filtros)
  const paginaEfectiva = filtrosAnteriores.current === filtros ? pagina : 1
  useEffect(() => {
    if (filtrosAnteriores.current !== filtros) {
      filtrosAnteriores.current = filtros
      setPagina(1)
    }
  }, [filtros])

  useEffect(() => {
    let activo = true
    const clave = claveConsulta(filtros, paginaEfectiva, porPagina)
    if (!cachePaginas.has(clave)) setCargando(true)
    pedirPagina(filtros, paginaEfectiva, porPagina)
      .then(({ filas: f, total: t }) => {
        if (!activo) return
        setFilas(f)
        setTotal(t)
        setCargando(false)
        // Adelanta la página siguiente para que avanzar no espere al servidor.
        if (paginaEfectiva * porPagina < t) pedirPagina(filtros, paginaEfectiva + 1, porPagina).catch(() => {})
      })
      .catch(() => { if (activo) { setFilas([]); setTotal(0); setCargando(false) } })
    return () => { activo = false }
  }, [filtros, paginaEfectiva, porPagina])

  const opcionesAsociacion = useMemo(() => ([
    { value: 'TODAS', label: 'Todas las asociaciones' },
    ...asociaciones.map((a) => ({ value: String(a.id), label: a.razonSocial })),
  ]), [asociaciones])

  const enCarrito = Object.keys(carrito).length

  const alternar = (v) => setCarrito((prev) => {
    const sig = { ...prev }
    if (sig[v.id]) delete sig[v.id]
    else sig[v.id] = compactar(v)
    return sig
  })

  const agregarTodosLosResultados = async () => {
    setAgregandoTodo(true)
    try {
      const todas = await fetchTodasLasFilas('/vehiculos/qr', { ...filtros }, { silencioso: true, porPagina: 1000 })
      setCarrito((prev) => {
        const sig = { ...prev }
        todas.forEach((v) => { sig[v.id] = compactar(v) })
        return sig
      })
      showToast(`${todas.length.toLocaleString('es-PE')} vehículos agregados a la cola`)
    } catch {
      showError('Error', 'No se pudieron agregar todos los vehículos.')
    } finally {
      setAgregandoTodo(false)
    }
  }

  const vaciarCarrito = async () => {
    const resultado = await showConfirm(
      '¿Vaciar la cola de impresión?',
      `Se quitarán los ${enCarrito.toLocaleString('es-PE')} vehículos de la cola de impresión.`,
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

  const imprimirUnLote = (vehiculos, copias) => new Promise((resolve) => {
    setTrabajo({ vehiculos, copias, alTerminar: resolve })
  })

  const imprimir = async (vehiculos, copias, alTerminar) => {
    if (vehiculos.length === 0) {
      showError('Sin vehículos', 'Agregue al menos un mototaxi o motocarguera a la cola.')
      return
    }
    if (trabajo || progreso) return
    await imprimirUnLote(vehiculos, copias)
    alTerminar?.()
  }

  // Imprime varios lotes seguidos sin tener que pulsar nada entre uno y otro.
  const imprimirLotes = async (lotes, copias, alTerminarLote) => {
    if (lotes.length === 0) {
      showError('Sin vehículos', 'Agregue al menos un mototaxi o motocarguera a la cola.')
      return
    }
    if (trabajo || progreso) return
    detenerRef.current = false
    for (let i = 0; i < lotes.length; i += 1) {
      if (detenerRef.current) break
      setProgreso({ actual: i + 1, total: lotes.length })
      await imprimirUnLote(lotes[i], copias)
      alTerminarLote?.(i)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    setProgreso(null)
  }

  const hayFiltros = tipo !== TIPOS_CON_PLANTILLA[0].value || asociacionId !== 'TODAS' || buscar !== ''
  const limpiarFiltros = () => {
    setTipo(TIPOS_CON_PLANTILLA[0].value)
    setAsociacionId('TODAS')
    setBuscar('')
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">
      {/* Filtros */}
      <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Icon
            name="search"
            className={`absolute left-3 top-1/2 size-3.5 -translate-y-1/2 transition-colors text-slate-400`}
          />
          <input
            type="text"
            placeholder="Buscar por placa, propietario o asociación"
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-8 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-100"
          />
          {buscar && (
            <button
              type="button"
              onClick={() => setBuscar('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <RoundedSelect value={tipo} onChange={setTipo} options={TIPOS_CON_PLANTILLA} />
          <RoundedSelect value={asociacionId} onChange={setAsociacionId} options={opcionesAsociacion} />

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

      {/* Carrito: agregar o quitar resultados e imprimir */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-100 bg-slate-50/60 px-4 py-2 dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
        <ResumenImpresion total={total} enCarrito={enCarrito} />

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={agregarTodosLosResultados}
            disabled={agregandoTodo || total === 0}
            title="Agregar a la cola todos los vehículos que cumplen los filtros"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-200/80 bg-indigo-50/70 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:cursor-wait disabled:opacity-50 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/50"
          >
            <Icon name={agregandoTodo ? 'refresh' : 'add'} className={`size-3.5 ${agregandoTodo ? 'animate-spin' : ''}`} />
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
            <Icon name="print" className="size-3.5" />
            <span>Cola de impresión</span>
            <span className="rounded-full bg-white/25 px-1.5 py-0.5 text-[11px] leading-none">{enCarrito.toLocaleString('es-PE')}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto overscroll-x-contain" role="region" aria-label="Vehículos para imprimir su QR" tabIndex={0}>
        <table className="w-full min-w-[820px] table-fixed text-left text-xs">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[30%]" />
            <col className="w-[28%]" />
            <col className="w-[16%]" />
            <col className="w-[19%]" />
          </colgroup>
          <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[var(--border)]">
            <tr>
              <th className="px-3.5 py-2.5">Placa</th>
              <th className="px-3.5 py-2.5">Propietario y titular</th>
              <th className="px-3.5 py-2.5">Asociación / Empresa</th>
              <th className="px-3.5 py-2.5">Código QR</th>
              <th className="sticky right-0 z-10 border-l border-slate-200 bg-slate-50/75 px-4 py-2.5 text-center shadow-[-4px_0_8px_rgba(0,0,0,0.04)] dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">Acciones</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-100 transition-opacity duration-150 dark:divide-[var(--border)] ${cargando && filas.length > 0 ? 'pointer-events-none opacity-60' : 'opacity-100'}`}>
            {cargando && filas.length === 0 ? (
              <FilaCargando colSpan={5} />
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan="5" className="p-12 text-center">
                  <Icon name="vehicle" className="mx-auto mb-2 size-10 text-slate-300 dark:text-slate-600" />
                  <p className="font-bold text-slate-600 dark:text-slate-300">No se encontraron vehículos</p>
                </td>
              </tr>
            ) : filas.map((v) => {
              const agregado = Boolean(carrito[v.id])
              return (
                <tr key={v.id} onClick={() => alternar(v)} className="group cursor-pointer transition-colors hover:bg-cyan-50/30 dark:hover:bg-[var(--bg-subtle)]">
                  <td className="px-3.5 py-2.5"><PlacaVehiculo placa={v.placa} vehiculoId={v.id} /></td>

                  <td className="px-3.5 py-2.5">
                    <PersonaEnlace personaId={v.propietarioPersonaId} nombre={v.propietario} dni={v.propietarioDni} />
                  </td>

                  <td className="px-3.5 py-2.5">
                    {v.asociacionId ? (
                      <>
                        <p className="text-xs font-bold leading-tight text-slate-700 dark:text-slate-200" title={v.asociacion}>{v.asociacion}</p>
                        <span className="font-mono text-[10px] font-bold text-emerald-600 dark:text-emerald-400">MDJLO-AUTORIZADO</span>
                      </>
                    ) : (
                      <>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Sin Asociación</p>
                        <span className="font-mono text-[10px] font-bold text-amber-600 dark:text-amber-400">INFORMAL</span>
                      </>
                    )}
                  </td>

                  <td className="px-3.5 py-2.5">
                    <p className="break-all font-mono text-[11px] font-bold text-slate-700 dark:text-slate-200">{v.codigoQr || 'N/A'}</p>
                  </td>

                  <td className="sticky right-0 z-10 border-l border-slate-200 bg-white px-4 py-3 text-center shadow-[-4px_0_8px_rgba(0,0,0,0.04)] transition-colors group-hover:bg-cyan-50/30 dark:border-[var(--border)] dark:bg-[#1C2438] dark:group-hover:bg-slate-800/40">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); alternar(v) }}
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
                        onClick={(e) => { e.stopPropagation(); imprimir([v], 3) }}
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
        <CarritoQrModal
          carrito={carrito}
          onQuitar={quitarDelCarrito}
          onVaciar={vaciarCarrito}
          onClose={() => setCarritoAbierto(false)}
          onImprimir={imprimir}
          onImprimirTodo={imprimirLotes}
        />
      )}

      <ProgresoLotes progreso={progreso} onDetener={() => { detenerRef.current = true }} />

      {trabajo && (
        <ImpresionQrPortal
          vehiculos={trabajo.vehiculos}
          copias={trabajo.copias}
          onFin={() => { trabajo.alTerminar?.(); setTrabajo((actual) => (actual === trabajo ? null : actual)) }}
        />
      )}
    </div>
  )
}
