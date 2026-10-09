export function errorPasswordUsuario(password, usuario = '') {
  const largo = Array.from(password || '').length
  if (largo < 8) return 'La contraseña debe tener al menos 8 caracteres.'
  if (largo > 128) return 'La contraseña no puede superar los 128 caracteres.'
  if (!/\p{L}/u.test(password) || !/\d/.test(password)) return 'La contraseña debe combinar letras y números.'
  if (usuario && password.toLocaleLowerCase() === usuario.toLocaleLowerCase()) return 'La contraseña no puede ser igual al nombre de usuario.'
  return ''
}
