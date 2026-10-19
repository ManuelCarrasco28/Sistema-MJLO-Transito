// Roles del personal de oficina (el resto, los inspectores, solo usa la app móvil).
// Misma lista que exige el servidor en las rutas de oficina (sessionauth).
export const ROLES_OFICINA = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE', 'SECRETARIA']

export const esRolOficina = (rol) => ROLES_OFICINA.includes(String(rol || '').toUpperCase())

// Solo jefatura elimina o anula; el servidor también lo exige.
export const ROLES_JEFATURA = ['SUPERADMIN', 'GERENTE', 'SUBGERENTE']

// Rol de la sesión actual.
let rolActual = ''
export const definirRolActual = (rol) => { rolActual = String(rol || '').toUpperCase() }

export const puedeEliminarRegistros = () => ROLES_JEFATURA.includes(rolActual)

// Roles de campo: Inspector de Tránsito, Inspector Técnico y Encargado de Depósito; no entran al sistema web.
export const ROLES_CAMPO = ['INSPECTOR DE TRÁNSITO', 'INSPECTOR TÉCNICO', 'ENCARGADO DE DEPÓSITO']
export const esRolCampo = (rol) => ROLES_CAMPO.includes(String(rol || '').toUpperCase())
