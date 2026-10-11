// Aviso entre pestañas del mismo navegador cuando se cambia el "Permiso móvil" en Configuración.
// En otros navegadores o equipos, las pantallas se enteran por su consulta periódica.
const CANAL = 'config_movil'

export function avisarCambioConfigMovil() {
  try {
    const canal = new BroadcastChannel(CANAL)
    canal.postMessage('cambio')
    canal.close()
  } catch { /* el navegador no soporta BroadcastChannel */ }
}

export function suscribirConfigMovil(callback) {
  try {
    const canal = new BroadcastChannel(CANAL)
    canal.onmessage = () => callback()
    return () => canal.close()
  } catch {
    return () => {}
  }
}
