const FORMATO_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

export function isoATexto(iso) {
  const m = FORMATO_ISO.exec(iso || '')
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

export function formatearDigitos(digitos) {
  const d = String(digitos).slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

// '08/03/2027' -> '2027-03-08'; '' si está incompleta, no existe o el año queda fuera de 1900-2100.
export function textoAIso(texto) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
  if (!m) return ''
  const [, dd, mm, aaaa] = m
  const fecha = new Date(Number(aaaa), Number(mm) - 1, Number(dd))
  const existe = fecha.getFullYear() === Number(aaaa) && fecha.getMonth() === Number(mm) - 1 && fecha.getDate() === Number(dd)
  return existe && Number(aaaa) >= 1900 && Number(aaaa) <= 2100 ? `${aaaa}-${mm}-${dd}` : ''
}
