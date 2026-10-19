import { Icon } from './Icon'

// Animación de carga para bloques que no son tabla (modales, paneles, pantallas): solo el círculo, centrado.
// Si el contenedor tiene altura propia se centra también en vertical; si no, usa el relleno `className`.
export function Cargando({ className = 'py-12' }) {
  return (
    <div className={`flex w-full items-center justify-center ${className}`} role="status" aria-label="Cargando">
      <span className="mjlo-carga-diferida inline-block">
        <Icon name="refresh" className="size-9 animate-spin text-indigo-500" />
      </span>
    </div>
  )
}
