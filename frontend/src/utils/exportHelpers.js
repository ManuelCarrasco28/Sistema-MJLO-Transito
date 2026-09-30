/**
 * Helpers comunes para exportación segura de datos tabulares a Excel y PDF.
 */

export function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Neutraliza Formula/CSV Injection: si un dato ingresado por un usuario
 * empieza con =, +, -, @ o tab/CR, Excel puede interpretarlo como fórmula
 * o comando ejecutable al abrir el archivo. Anteponemos un apóstrofe para
 * forzar que Excel lo trate siempre como texto literal.
 */
export function sanitizeCellValue(value) {
  if (value === null || value === undefined) return value
  const str = String(value)
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`
  }
  return str
}

export function escapeExcelCell(value) {
  return escapeXml(sanitizeCellValue(value))
}
