const CLAVE_BORRADOR = 'mjlo_permiso_borrador'
const CLAVE_VOLVER_A_DATOS = 'mjlo_volver_a_datos'
const CLAVE_PERMISOS_ACTUALIZADOS = 'mjlo_permisos_updated'

// El almacenamiento del navegador puede fallar (modo privado, cuota llena,
// JSON corrupto): se registra el fallo y la pantalla sigue funcionando sin borrador.
function conAlmacenamiento(accion, descripcion, valorPorDefecto = null) {
  try {
    return accion()
  } catch (err) {
    console.warn(`Borrador de permiso: no se pudo ${descripcion}.`, err)
    return valorPorDefecto
  }
}

export function leerBorradorPermiso() {
  return conAlmacenamiento(() => {
    const crudo = sessionStorage.getItem(CLAVE_BORRADOR) || localStorage.getItem(CLAVE_BORRADOR)
    return crudo ? JSON.parse(crudo) : null
  }, 'leer el borrador')
}

export function guardarBorradorPermiso(datos) {
  conAlmacenamiento(() => {
    const serializado = JSON.stringify(datos)
    sessionStorage.setItem(CLAVE_BORRADOR, serializado)
    localStorage.setItem(CLAVE_BORRADOR, serializado)
    localStorage.setItem(CLAVE_VOLVER_A_DATOS, Date.now().toString())
  }, 'guardar el borrador')
}

export function limpiarBorradorPermiso() {
  conAlmacenamiento(() => {
    sessionStorage.removeItem(CLAVE_BORRADOR)
    localStorage.removeItem(CLAVE_BORRADOR)
  }, 'limpiar el borrador')
}

export function avisarPermisoActualizado() {
  conAlmacenamiento(() => {
    localStorage.setItem(CLAVE_PERMISOS_ACTUALIZADOS, Date.now().toString())
  }, 'avisar a otras pestañas')
}
