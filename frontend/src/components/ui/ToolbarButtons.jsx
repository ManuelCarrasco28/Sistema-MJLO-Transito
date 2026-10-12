import { Icon } from './Icon'

// Botones y tarjetas con el mismo aspecto que usan Personas, Vehículos, Papeletas, etc.

export function BotonExcel({ onClick, disabled = false, cargando = false, title = 'Descargar en Excel (.xls)' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon name={cargando ? 'refresh' : 'fileSpreadsheet'} className={`size-3.5 text-emerald-600 dark:text-emerald-400 ${cargando ? 'animate-spin' : ''}`} />
      <span>{cargando ? 'Generando...' : 'Excel'}</span>
    </button>
  )
}

export function BotonPdf({ onClick, disabled = false, cargando = false, title = 'Descargar o imprimir en PDF' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200/80 bg-rose-50/70 px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/60 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon name={cargando ? 'refresh' : 'filePdf'} className={`size-3.5 text-rose-600 dark:text-rose-400 ${cargando ? 'animate-spin' : ''}`} />
      <span>{cargando ? 'Generando...' : 'PDF'}</span>
    </button>
  )
}

export function BotonPrimario({ onClick, children, type = 'button', disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap hover:opacity-90 disabled:opacity-60"
      style={{ backgroundColor: 'oklch(62.3% 0.214 259.815)' }}
    >
      {children}
    </button>
  )
}

export function BotonSecundario({ onClick, children, disabled = false, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-[var(--border-strong)] dark:bg-[var(--bg-subtle)] dark:text-slate-200 dark:hover:bg-white/10 transition-all active:scale-95 cursor-pointer shadow-2xs whitespace-nowrap disabled:opacity-50"
    >
      {children}
    </button>
  )
}

const ACCIONES = {
  eye: 'bg-[var(--action-eye-bg)] border-[var(--action-eye-border)] text-[var(--action-eye-text)] hover:bg-[var(--action-eye-hover)] hover:border-[var(--action-eye-hover)]',
  edit: 'bg-[var(--action-edit-bg)] border-[var(--action-edit-border)] text-[var(--action-edit-text)] hover:bg-[var(--action-edit-hover)] hover:border-[var(--action-edit-hover)]',
  del: 'bg-[var(--action-del-bg)] border-[var(--action-del-border)] text-[var(--action-del-text)] hover:bg-[var(--action-del-hover)] hover:border-[var(--action-del-hover)]',
}
const ICONOS = { eye: 'eye', edit: 'pencil', del: 'trash' }

export function BotonAccion({ tipo = 'eye', onClick, title, disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`size-8 rounded-lg border-[1.5px] grid place-items-center transition-all cursor-pointer shadow-xs active:scale-95 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed ${ACCIONES[tipo]}`}
    >
      <Icon name={ICONOS[tipo]} className="size-4" />
    </button>
  )
}

const COLORES_KPI = {
  indigo: { borde: 'border-indigo-400', texto: 'text-indigo-600 dark:text-indigo-400', icono: 'text-indigo-600 dark:text-indigo-400' },
  emerald: { borde: 'border-emerald-400', texto: 'text-emerald-600 dark:text-emerald-400', icono: 'text-emerald-600 dark:text-emerald-400' },
  amber: { borde: 'border-amber-400', texto: 'text-amber-600 dark:text-amber-400', icono: 'text-amber-600 dark:text-amber-400' },
  cyan: { borde: 'border-cyan-400', texto: 'text-cyan-600 dark:text-cyan-400', icono: 'text-cyan-600 dark:text-cyan-400' },
  rose: { borde: 'border-rose-400', texto: 'text-rose-600 dark:text-rose-400', icono: 'text-rose-600 dark:text-rose-400' },
  violet: { borde: 'border-violet-400', texto: 'text-violet-600 dark:text-violet-400', icono: 'text-violet-600 dark:text-violet-400' },
}

export function TarjetaKpi({ label, value, detail, icon, color = 'indigo' }) {
  const c = COLORES_KPI[color] || COLORES_KPI.indigo
  return (
    <div className={`relative overflow-hidden rounded-xl border-[1.5px] ${c.borde} bg-white px-3.5 py-2.5 shadow-2xs transition-all hover:shadow-xs dark:border-[var(--border)] dark:bg-[#1C2438]`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-wider ${c.texto}`}>{label}</span>
        <span className={`grid size-6 place-items-center rounded-md ${c.icono}`}>
          <Icon name={icon} className="size-3.5" />
        </span>
      </div>
      <div className="mt-1">
        <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white leading-tight">{value}</p>
        {detail && <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{detail}</p>}
      </div>
    </div>
  )
}

export const CLASE_TABLA_ENCABEZADO = 'bg-slate-50/75 dark:bg-[var(--bg-subtle)] text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400'
