// Formatear fechas locales sin desplazarlas por UTC.
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

export function formatHora12(valor) {
  const texto = String(valor ?? '').trim()
  if (!texto) return ''
  if (/\b(AM|PM)\b/i.test(texto)) return texto.toUpperCase()
  const m = texto.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!m) return texto
  const h = parseInt(m[1], 10)
  if (h < 0 || h > 23) return texto
  return `${String(h % 12 || 12).padStart(2, '0')}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`
}

// Rango de horas: "09:00" y "12:00" -> "09:00 AM - 12:00 PM"
export function formatRangoHoras12(inicio, fin) {
  const a = formatHora12(inicio)
  const b = formatHora12(fin)
  return a && b ? `${a} - ${b}` : (a || b)
}

// Convierte las horas de un texto libre a 12 horas con AM/PM: "09:00 - 12:00" -> "09:00 AM - 12:00 PM"
export function formatTextoHorario12(texto) {
  return String(texto ?? '').replace(/(\d{1,2}):(\d{2})(?::\d{2})?(?!\s*[AaPp]\.?\s*[Mm])/g, (coincidencia, h, m) => formatHora12(`${h}:${m}`))
}
