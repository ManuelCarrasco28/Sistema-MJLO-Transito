import { Icon } from './Icon'

export const TOAST_DURACION_MS = 3500

// Verde al registrar, amarillo al editar, rojo al eliminar y rojo en errores.
const TOAST_ESTILOS = {
  crear: {
    etiqueta: 'Registrado',
    simbolo: '✓',
    caja: 'bg-emerald-50 border-emerald-300 dark:bg-emerald-950/90 dark:border-emerald-700',
    icono: 'bg-emerald-600 text-white',
    titulo: 'text-emerald-700 dark:text-emerald-300',
    barra: 'bg-emerald-500',
  },
  editar: {
    etiqueta: 'Actualizado',
    simbolo: '✎',
    caja: 'bg-amber-50 border-amber-300 dark:bg-amber-950/90 dark:border-amber-700',
    icono: 'bg-amber-500 text-white',
    titulo: 'text-amber-700 dark:text-amber-300',
    barra: 'bg-amber-500',
  },
  eliminar: {
    etiqueta: 'Eliminado',
    simbolo: 'trash',
    caja: 'bg-rose-50 border-rose-300 dark:bg-rose-950/90 dark:border-rose-700',
    icono: 'bg-rose-600 text-white',
    titulo: 'text-rose-700 dark:text-rose-300',
    barra: 'bg-rose-500',
  },
  error: {
    etiqueta: 'Error',
    simbolo: '!',
    caja: 'bg-rose-100 border-rose-500 dark:bg-rose-950 dark:border-rose-500',
    icono: 'bg-rose-700 text-white',
    titulo: 'text-rose-800 dark:text-rose-200',
    barra: 'bg-rose-700',
  },
}

// Toast de acción (crear/editar/eliminar/error) con barra de progreso y
// auto-cierre. `toast` es null o { id, message, type }.
export function ActionToast({ toast, onClose }) {
  if (!toast) return null

  const estilo = TOAST_ESTILOS[toast.type] || TOAST_ESTILOS.crear

  return (
    <div
      key={toast.id}
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`fixed right-6 top-6 z-[80] w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border shadow-lg ${estilo.caja} ${toast.type === 'error' ? 'toast-shake' : 'toast-in'}`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className={`toast-icon grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold ${estilo.icono}`}>
          {estilo.simbolo === 'trash' ? <Icon name="trash" className="size-3.5" /> : estilo.simbolo}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-bold uppercase tracking-wide ${estilo.titulo}`}>{estilo.etiqueta}</p>
          <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="shrink-0 rounded-md px-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
        >
          ✕
        </button>
      </div>
      <div className={`toast-progress h-1 ${estilo.barra}`} style={{ animationDuration: `${TOAST_DURACION_MS}ms` }} />
    </div>
  )
}
