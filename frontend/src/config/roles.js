// Roles del personal de oficina (el resto, p. ej. TRABAJADOR, solo usa la app móvil).
// Misma lista que exige el servidor en las rutas de oficina (sessionauth).
export const ROLES_OFICINA = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA']

export const esRolOficina = (rol) => ROLES_OFICINA.includes(String(rol || '').toUpperCase())

// Solo la jefatura elimina o anula registros (Secretaría registra y cobra, pero no borra). Lo exige también el servidor.
export const ROLES_JEFATURA = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE']

// Rol de la sesión actual. App lo fija al cargar o cambiar el usuario (la sesión ya no se guarda en el navegador).
let rolActual = ''
export const definirRolActual = (rol) => { rolActual = String(rol || '').toUpperCase() }

export const puedeEliminarRegistros = () => ROLES_JEFATURA.includes(rolActual)
