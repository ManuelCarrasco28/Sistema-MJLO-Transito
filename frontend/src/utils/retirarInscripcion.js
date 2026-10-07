import { apiFetch, sanitizarMensaje, invalidateCache } from '../config/api'
import { showConfirm, showError, showToast } from './SwalUtil'

export async function retirarInscripcion(participante) {
  const id = participante.uuid || participante.idInscripcion
  if (!id) {
    showError('Inscripción no disponible', 'Recarga el curso e intenta nuevamente.')
    return null
  }
  const nombre = [participante.nombres, participante.apellido_paterno || participante.apellidoPaterno, participante.apellido_materno || participante.apellidoMaterno].filter(Boolean).join(' ')
  const confirmacion = await showConfirm('¿Retirar del curso?', `Se retirará a ${nombre || 'esta persona'} y se cancelará su cobro pendiente. Si ya pagó o tiene carnet, requiere regularización.`, 'Sí, retirar', 'Cancelar')
  if (!confirmacion.isConfirmed) return null
  try {
    const res = await apiFetch(`/cursos/inscripciones/${encodeURIComponent(id)}/retiro`, { method: 'PUT' })
    const resultado = await res.json()
    if (!res.ok) throw new Error(resultado.messages?.error || resultado.message || 'No se pudo retirar la inscripción.')
    invalidateCache('/pagos')
    showToast('Inscripción retirada del curso', 'eliminar')
    return resultado.data
  } catch (error) {
    showError('No se pudo retirar', sanitizarMensaje(error.message, 'Intenta nuevamente en unos momentos.'))
    return null
  }
}
