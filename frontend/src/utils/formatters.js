// Formatea una fecha (string 'YYYY-MM-DD' o datetime) como dd/mm/aaaa en
// hora local, evitando el corrimiento de un día que causa `new Date(iso)`
// al interpretar la fecha como UTC.
export function formatFecha(fechaStr) {
  if (!fechaStr) return '—'
  try {
    const parts = fechaStr.split(/[- :T]/)
    if (parts.length >= 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      const d = new Date(year, month, day)
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
    }
    return fechaStr
  } catch {
    return fechaStr
  }
}

export function formatNumeroTarjeta(value) {
  if (value === null || value === undefined || value === '') return '0'
  const num = Number(value)
  if (isNaN(num)) return String(value)
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

/**
 * Convierte un texto a Formato Título (primera letra de cada palabra en mayúscula
 * y el resto en minúscula), ideal para nombres propios y direcciones.
 * Ejemplo: "CALLE ORELLANA SECTOR MORRO SOLAR" -> "Calle Orellana Sector Morro Solar"
 */
export function toTitleCase(str) {
  if (!str || typeof str !== 'string') return ''
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .split(/(\s+|[.\-#/()'’]+)/)
    .map(part => {
      if (/^[a-záéíóúüñ]/i.test(part)) {
        return part.charAt(0).toUpperCase() + part.slice(1)
      }
      return part
    })
    .join('')
}


// Las placas se registran sin guion ni espacios: exactamente 6 letras o números, en mayúsculas.
export const LONGITUD_PLACA = 6

export function normalizarPlaca(valor) {
  return String(valor ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LONGITUD_PLACA)
}

export function esPlacaValida(valor) {
  return /^[A-Z0-9]{6}$/.test(String(valor ?? ''))
}
