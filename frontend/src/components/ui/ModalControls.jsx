import { Icon } from './Icon'

// Controles comunes de todos los modales y formularios (agregar, editar, ver):
// la misma X de cierre, el mismo "Cancelar" y el mismo botón de guardar.
// La regla global "button { font: inherit }" de index.css anula las clases text-*,
// por eso el tamaño de letra de los botones de pie va en línea.

const COLOR_CANCELAR = 'oklch(71.2% 0.194 13.428)'
const COLOR_GUARDAR = 'oklch(62.3% 0.214 259.815)'

export function BotonCerrarModal({ onClick, title = 'Cerrar', className = '', disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      disabled={disabled}
      className={`grid size-9 shrink-0 place-items-center rounded-xl border border-rose-200/80 bg-rose-50/70 text-rose-500 hover:bg-rose-100 hover:text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 transition-all active:scale-95 cursor-pointer shadow-xs disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <Icon name="close" className="size-5" />
    </button>
  )
}

export function BotonCancelar({ onClick, children = 'Cancelar', className = '', disabled = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-4 py-1.5 font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      style={{ backgroundColor: COLOR_CANCELAR, fontSize: '12px', lineHeight: '1.5' }}
    >
      {children}
    </button>
  )
}

export function BotonGuardar({ children = 'Guardar', type = 'submit', onClick, className = '', disabled = false }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl px-5 py-1.5 font-bold text-white transition hover:opacity-90 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
      style={{ backgroundColor: COLOR_GUARDAR, fontSize: '12px', lineHeight: '1.5' }}
    >
      {children}
    </button>
  )
}
