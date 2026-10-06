import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../ui/Icon'
import { Pagination } from '../ui/Pagination'
import { PlacaBadge } from '../ui/PlacaBadge'
import { RoundedSelect } from '../ui/FormInputs'
import { apiFetch } from '../../config/api'
import { showError, showToast } from '../../utils/SwalUtil'
import { fetchTodasLasFilas } from '../../utils/descargaCompleta'
import { ImpresionQrPortal, PLANTILLAS, nombreAsociacion, plantillaDeVehiculo } from './QrVehiculoImpresion'

const TIPOS_CON_PLANTILLA = [
  { value: 'Mototaxi,Motocarguera', label: 'Mototaxi y motocarguera' },
  { value: 'Mototaxi', label: 'Solo mototaxi' },
  { value: 'Motocarguera', label: 'Solo motocarguera' },
]

const COPIAS = [
  { value: '1', label: '1 por vehículo (4 vehículos por hoja)' },
  { value: '2', label: '2 por vehículo' },
  { value: '4', label: '4 por vehículo (1 vehículo por hoja)' },
]

// Páginas ya pedidas al servidor (clave = filtros + página): volver a una página o ir a la siguiente
// es instantáneo. Se descarta cuando cambian los datos de otra pestaña recargando el módulo.
const cachePaginas = new Map()
const claveConsulta = (filtros, pagina, porPagina) => JSON.stringify([filtros, pagina, porPagina])

const pedirPagina = async (filtros, pagina, porPagina) => {
  const clave = claveConsulta(filtros, pagina, porPagina)
  if (cachePaginas.has(clave)) return cachePaginas.get(clave)
  const params = new URLSearchParams({ ...filtros, page: String(pagina), porPagina: String(porPagina) })
  const res = await apiFetch(`/vehiculos/qr?${params.toString()}`)
  if (!res.ok) throw new Error('No se pudo cargar')
  const json = await res.json()
  const resultado = { filas: json.data ?? [], total: json.meta?.total ?? json.data?.length ?? 0 }
  cachePaginas.set(clave, resultado)
  if (cachePaginas.size > 60) cachePaginas.delete(cachePaginas.keys().next().value)
  return resultado
}

// Pestaña "Impresión de QR": elegir vehículos (por asociación, tipo o búsqueda) e imprimir sus QR en lote.
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
  const [seleccion, setSeleccion] = useState({}) // id -> vehículo, se conserva entre páginas y filtros
  const [copias, setCopias] = useState('1')
  const [imprimiendo, setImprimiendo] = useState(false)
  const [seleccionandoTodo, setSeleccionandoTodo] = useState(false)

  // Al abrir la pestaña se parte de datos frescos (pudo cambiarse un tipo o una asociación en la otra).
  useEffect(() => { cachePaginas.clear() }, [])

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

  const seleccionados = Object.values(seleccion)
  const imprimibles = seleccionados.filter(plantillaDeVehiculo)
  const hojas = Math.ceil((imprimibles.length * Number(copias)) / 4)
  const paginaCompletaMarcada = filas.length > 0 && filas.every((v) => seleccion[v.id])

  const alternar = (v) => setSeleccion((prev) => {
    const sig = { ...prev }
    if (sig[v.id]) delete sig[v.id]
    else sig[v.id] = v
    return sig
  })

  const alternarPagina = () => setSeleccion((prev) => {
    const sig = { ...prev }
    if (paginaCompletaMarcada) filas.forEach((v) => { delete sig[v.id] })
    else filas.forEach((v) => { sig[v.id] = v })
    return sig
  })

  const seleccionarTodosLosResultados = async () => {
    setSeleccionandoTodo(true)
    try {
      const todas = await fetchTodasLasFilas('/vehiculos/qr', { ...filtros }, { mensaje: 'Seleccionando vehículos...', porPagina: 1000 })
      setSeleccion((prev) => {
        const sig = { ...prev }
        todas.forEach((v) => { sig[v.id] = v })
        return sig
      })
      showToast(`${todas.length.toLocaleString('es-PE')} vehículos seleccionados`)
    } catch {
      showError('Error', 'No se pudieron seleccionar todos los vehículos.')
    } finally {
      setSeleccionandoTodo(false)
    }
  }

  const imprimir = () => {
    if (imprimibles.length === 0) {
      showError('Sin vehículos', 'Seleccione al menos un mototaxi o motocarguera para imprimir.')
      return
    }
    setImprimiendo(true)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438] overflow-hidden">
      <div className="flex flex-col gap-2.5 border-b border-slate-100 px-4 py-2.5 dark:border-[var(--border)] lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por placa o asociación..."
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-100"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <RoundedSelect value={tipo} onChange={setTipo} options={TIPOS_CON_PLANTILLA} />
          <RoundedSelect value={asociacionId} onChange={setAsociacionId} options={opcionesAsociacion} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/60 px-4 py-2 text-xs dark:border-[var(--border)] dark:bg-[var(--bg-subtle)]">
        <div className="flex flex-wrap items-center gap-3 text-slate-600 dark:text-slate-300">
          <span>
            <strong className="font-bold text-slate-900 dark:text-white">{seleccionados.length.toLocaleString('es-PE')}</strong> seleccionados
            {seleccionados.length > 0 && <> · {hojas.toLocaleString('es-PE')} hoja(s) A4</>}
          </span>
          <button
            type="button"
            onClick={seleccionarTodosLosResultados}
            disabled={seleccionandoTodo || total === 0}
            className="cursor-pointer font-bold text-indigo-600 hover:underline disabled:cursor-wait disabled:opacity-50 dark:text-indigo-400"
          >
            Seleccionar los {total.toLocaleString('es-PE')} resultados
          </button>
          {seleccionados.length > 0 && (
            <button type="button" onClick={() => setSeleccion({})} className="cursor-pointer font-bold text-rose-600 hover:underline dark:text-rose-400">
              Quitar selección
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <RoundedSelect value={copias} onChange={setCopias} options={COPIAS} />
          <button
            type="button"
            onClick={imprimir}
            disabled={imprimiendo || imprimibles.length === 0}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 font-bold text-white transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)', fontSize: '12px' }}
          >
            <Icon name="print" className="size-4" />
            {imprimiendo ? 'Preparando…' : `Imprimir QR (${imprimibles.length})`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[var(--border)]">
            <tr>
              <th className="w-10 px-3.5 py-2.5">
                <input type="checkbox" checked={paginaCompletaMarcada} onChange={alternarPagina} aria-label="Seleccionar la página" className="size-4 cursor-pointer accent-indigo-600" />
              </th>
              <th className="px-3.5 py-2.5">Placa</th>
              <th className="px-3.5 py-2.5">Tipo</th>
              <th className="px-3.5 py-2.5">Asociación / Empresa</th>
              <th className="px-3.5 py-2.5">Código QR</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-slate-100 transition-opacity dark:divide-[var(--border)] ${cargando ? 'opacity-50' : ''}`}>
            {filas.length === 0 && cargando ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">Cargando vehículos…</td></tr>
            ) : filas.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">No hay vehículos con esos filtros.</td></tr>
            ) : filas.map((v) => (
              <tr key={v.id} onClick={() => alternar(v)} className="cursor-pointer transition-colors hover:bg-cyan-50/30 dark:hover:bg-slate-800/40">
                <td className="px-3.5 py-2.5">
                  <input type="checkbox" checked={Boolean(seleccion[v.id])} onChange={() => alternar(v)} onClick={(e) => e.stopPropagation()} aria-label={`Seleccionar ${v.placa}`} className="size-4 cursor-pointer accent-indigo-600" />
                </td>
                <td className="px-3.5 py-2.5"><PlacaBadge placa={v.placa} /></td>
                <td className="px-3.5 py-2.5 font-semibold text-slate-700 dark:text-slate-200">
                  {PLANTILLAS[plantillaDeVehiculo(v)]?.nombre || v.tipo}
                </td>
                <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">{nombreAsociacion(v.asociacion) || <span className="text-slate-400">Sin asociación</span>}</td>
                <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-500">{v.codigoQr || '—'}</td>
              </tr>
            ))}
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

      {imprimiendo && <ImpresionQrPortal vehiculos={imprimibles} copias={Number(copias)} onFin={() => setImprimiendo(false)} />}
    </div>
  )
}
