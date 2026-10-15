// Roles del personal de oficina (el resto, p. ej. TRABAJADOR, solo usa la app móvil).
// Misma lista que exige el servidor en las rutas de oficina (sessionauth).
export const ROLES_OFICINA = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA']

export const esRolOficina = (rol) => ROLES_OFICINA.includes(String(rol || '').toUpperCase())

// Solo jefatura elimina o anula; el servidor también lo exige.
export const ROLES_JEFATURA = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE']

// Rol de la sesión actual.
let rolActual = ''
export const definirRolActual = (rol) => { rolActual = String(rol || '').toUpperCase() }

export const puedeEliminarRegistros = () => ROLES_JEFATURA.includes(rolActual)
