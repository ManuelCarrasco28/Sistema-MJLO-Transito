// Borrar los datos personales locales al cerrar o expirar la sesión.
const PREFIJOS = ['impresion_carrito_', 'qr_carrito_', 'mjlo_permiso_', 'mjlo_volver_', 'mjlo_permisos_']
const CLAVES = ['user', 'quickActions_v1', 'notif_leidas']

export function limpiarDatosLocales() {
  window.dispatchEvent(new Event('mjlo:limpiar-sesion'))
  try {
    const claves = []
    for (let i = 0; i < localStorage.length; i += 1) claves.push(localStorage.key(i))
    claves
      .filter((k) => k && (CLAVES.includes(k) || PREFIJOS.some((p) => k.startsWith(p))))
      .forEach((k) => localStorage.removeItem(k))
  } catch { /* sin almacenamiento disponible */ }
  try { sessionStorage.clear() } catch { /* sin almacenamiento disponible */ }
}
