import { Icon } from './Icon'

// Animación de carga centrada para las tablas: solo el círculo, sin texto.
export function FilaCargando({ colSpan = 1 }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-12 text-center">
        <span className="mjlo-carga-diferida inline-block">
          <Icon name="refresh" className="mx-auto size-9 animate-spin text-indigo-500" aria-label="Cargando" />
        </span>
      </td>
    </tr>
  )
}
