import { useEffect, useState } from 'react'
import { Icon } from '../ui/Icon'
import { Pagination } from '../ui/Pagination'
import { PageLoadError } from '../ui/PageLoadError'
import { StatusBadge } from '../ui/StatusBadge'
import { RoundedSelect } from '../ui/FormInputs'
import { useDebounce } from '../../hooks/useDebounce'
import { apiFetch } from '../../config/api'
import { formatFecha } from '../../utils/formatters'
import { PersonaEnlace } from '../personas/PersonaEnlace'
import { FilaCargando } from '../ui/FilaCargando'

// Nombres primero y luego los apellidos, como en el resto del sistema
function nombreCompleto(p) {
  return [p.nombres, p.apellido_paterno, p.apellido_materno].filter(Boolean).join(' ')
}

function iniciales(p) {
  return `${(p.nombres || '?').charAt(0)}${(p.apellido_paterno || '').charAt(0)}`.toUpperCase()
}

const FILTRO_ESTADO = [
  { value: 'TODOS', label: 'Todos los estados' },
  { value: 'VIGENTE', label: 'Vigentes' },
  { value: 'POR_VENCER', label: 'Por vencer (30 días)' },
  { value: 'VENCIDO', label: 'Vencidos' },
]

const TEXTO_ESTADO = { VIGENTE: 'VIGENTE', POR_VENCER: 'POR VENCER', VENCIDO: 'VENCIDO' }

function EstadoCarnet({ estado }) {
  // POR VENCER usa el color de aviso (ámbar); VIGENTE y VENCIDO los suyos
  const base = estado === 'POR_VENCER' ? 'PROGRAMADO' : estado
  return <StatusBadge status={base} label={TEXTO_ESTADO[estado] || estado} />
}

export function CarnetCursoTab() {
  const [filas, setFilas] = useState([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [estado, setEstado] = useState('TODOS')
  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(5)
  const buscar = useDebounce(busqueda.trim(), 300)

  useEffect(() => { setPagina(1) }, [buscar, estado])

  useEffect(() => {
    let vigente = true
    setCargando(true)
    const params = new URLSearchParams({ page: String(pagina), porPagina: String(porPagina) })
    if (buscar) params.set('buscar', buscar)
    if (estado !== 'TODOS') params.set('estado', estado)
    apiFetch(`/cursos/vigencias?${params}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((payload) => {
        if (!vigente) return
        setFilas(payload.data || [])
        setTotal(Number(payload.meta?.total || 0))
        setError(false)
      })
      .catch(() => { if (vigente) setError(true) })
      .finally(() => { if (vigente) setCargando(false) })
    return () => { vigente = false }
  }, [pagina, porPagina, buscar, estado])

  if (error) return <PageLoadError message="No se pudo cargar la lista de personas con carnet." />

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-[var(--border)] dark:bg-[#1C2438]">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-[var(--border)]">
        <div className="relative w-full sm:min-w-0 sm:flex-1">
          <Icon name="search" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por DNI, nombre o licencia"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm font-medium text-slate-800 outline-none transition focus:border-purple-500 focus:bg-white dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-white"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RoundedSelect value={estado} onChange={setEstado} options={FILTRO_ESTADO} />
          {estado !== 'TODOS' && (
            <button type="button" onClick={() => setEstado('TODOS')} title="Limpiar filtro" className="grid size-[34px] place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-600 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer">
              <Icon name="filterX" className="size-4" />
            </button>
          )}
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            <b className="text-slate-800 dark:text-white">{total.toLocaleString('es-PE')}</b> {total === 1 ? 'persona' : 'personas'}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] table-fixed text-left text-xs">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[14%]" />
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
          </colgroup>
          <thead className="bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:bg-[var(--bg-subtle)]">
            <tr>
              <th className="px-3 py-3">Nombres y apellidos</th>
              <th className="px-3 py-3">Licencia</th>
              <th className="px-3 py-3">Último curso</th>
              <th className="px-3 py-3 text-center">Realizado</th>
              <th className="px-3 py-3 text-center">Vence el</th>
              <th className="px-3 py-3 text-center">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[var(--border)]">
            {cargando && filas.length === 0 ? (
              <FilaCargando colSpan={1} />
            ) : filas.length === 0 ? (
              <tr>
                <td colSpan="6" className="p-12 text-center text-sm font-semibold text-slate-500 dark:text-slate-400">
                  {buscar || estado !== 'TODOS' ? 'No hay personas que coincidan con la búsqueda o el filtro.' : 'Todavía no hay carnets de curso registrados.'}
                </td>
              </tr>
            ) : filas.map((p) => (
              <tr key={p.idPersona} className="transition-colors hover:bg-purple-50/30 dark:hover:bg-[var(--bg-subtle)]">
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    {p.fotoUrl ? (
                      <img src={p.fotoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-purple-100 text-[11px] font-black text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">{iniciales(p)}</span>
                    )}
                    <PersonaEnlace personaId={p.idPersona}>
                      <span className="block min-w-0 break-words font-bold text-slate-900 dark:text-white" title={nombreCompleto(p)}>{nombreCompleto(p)}</span>
                      <span className="block font-mono text-[11px] text-slate-500 dark:text-slate-400">DNI: {p.dni}</span>
                    </PersonaEnlace>
                  </div>
                </td>
                <td className="px-3 py-3 font-mono text-slate-600 dark:text-slate-300">{p.licencia || '—'}</td>
                <td className="px-3 py-3">
                  <p className="font-bold text-slate-800 dark:text-slate-200">{p.cursoCodigo || '—'}</p>
                  <p className="min-w-0 break-words text-[11px] text-slate-500 dark:text-slate-400" title={p.cursoTitulo}>{p.cursoTitulo}</p>
                </td>
                <td className="px-3 py-3 text-center font-mono text-slate-600 dark:text-slate-300">{formatFecha(p.ultimoCurso)}</td>
                <td className="px-3 py-3 text-center font-mono font-bold text-slate-800 dark:text-slate-200">
                  {formatFecha(p.venceEl)}
                  <p className={`text-[10px] font-semibold ${p.estado === 'VENCIDO' ? 'text-rose-600 dark:text-rose-400' : p.estado === 'POR_VENCER' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {p.diasRestantes < 0
                      ? `hace ${Math.abs(p.diasRestantes)} ${Math.abs(p.diasRestantes) === 1 ? 'día' : 'días'}`
                      : `faltan ${p.diasRestantes} ${p.diasRestantes === 1 ? 'día' : 'días'}`}
                  </p>
                </td>
                <td className="px-3 py-3 text-center"><EstadoCarnet estado={p.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={pagina}
        totalItems={total}
        itemsPerPage={porPagina}
        onPageChange={setPagina}
        onItemsPerPageChange={(size) => { setPorPagina(size); setPagina(1) }}
      />
    </div>
  )
}
