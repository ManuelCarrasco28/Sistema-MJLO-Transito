export const TOAST_DURACION_MS = 3500

const TOAST_ESTILOS = {
  crear: {
    etiqueta: 'Registro exitoso',
    iconWrap: 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60',
    tagColor: 'text-emerald-700 dark:text-emerald-400',
    barColor: 'bg-emerald-500',
    accentBorder: 'border-l-emerald-500',
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  editar: {
    etiqueta: 'Cambios guardados',
    iconWrap: 'bg-amber-50 text-amber-600 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60',
    tagColor: 'text-amber-700 dark:text-amber-400',
    barColor: 'bg-amber-500',
    accentBorder: 'border-l-amber-500',
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
  },
  eliminar: {
    etiqueta: 'Registro eliminado',
    iconWrap: 'bg-rose-50 text-rose-600 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60',
    tagColor: 'text-rose-700 dark:text-rose-400',
    barColor: 'bg-rose-500',
    accentBorder: 'border-l-rose-500',
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    ),
  },
  error: {
    etiqueta: 'Ocurrió un error',
    iconWrap: 'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700',
    tagColor: 'text-rose-700 dark:text-rose-300',
    barColor: 'bg-rose-600',
    accentBorder: 'border-l-rose-600',
    icon: (
      <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
}

export function ActionToast({ toast, onClose }) {
  if (!toast) return null

  const estilo = TOAST_ESTILOS[toast.type] || TOAST_ESTILOS.crear

  return (
    <div
      key={toast.id}
      role={toast.type === 'error' ? 'alert' : 'status'}
      className={`fixed right-6 top-6 z-[80] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 p-3.5 shadow-xl shadow-slate-900/5 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 border-l-4 ${estilo.accentBorder} select-none ${toast.type === 'error' ? 'toast-shake' : 'toast-in'}`}
    >
      <div className="flex items-start gap-3">
        <span className={`size-8 shrink-0 rounded-xl flex items-center justify-center ${estilo.iconWrap}`}>
          {estilo.icon}
        </span>
        <div className="min-w-0 flex-1 pr-1 text-left">
          <p className={`text-[10px] font-bold uppercase tracking-wider ${estilo.tagColor}`}>{estilo.etiqueta}</p>
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 leading-snug break-words">{toast.message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar notificación"
          className="shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className={`toast-progress absolute bottom-0 left-0 right-0 h-[2.5px] rounded-b-2xl ${estilo.barColor}`} style={{ animationDuration: `${TOAST_DURACION_MS}ms` }} />
    </div>
  )
}
