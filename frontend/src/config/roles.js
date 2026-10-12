// Roles del personal de oficina (el resto, p. ej. TRABAJADOR, solo usa la app móvil).
// Misma lista que exige el servidor en las rutas de oficina (sessionauth).
export const ROLES_OFICINA = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA']

export const esRolOficina = (rol) => ROLES_OFICINA.includes(String(rol || '').toUpperCase())

// Solo la jefatura elimina o anula registros (Secretaría registra y cobra, pero no borra). Lo exige también el servidor.
export const ROLES_JEFATURA = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE']

export const puedeEliminarRegistros = () => {
  try {
    const rol = String(JSON.parse(localStorage.getItem('user') || '{}')?.rol || '').toUpperCase()
    return ROLES_JEFATURA.includes(rol)
  } catch {
    return false
  }
}
