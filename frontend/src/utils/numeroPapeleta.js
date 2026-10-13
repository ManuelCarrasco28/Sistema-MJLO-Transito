// Conserva el correlativo histórico; únicamente elimina el prefijo antiguo.
export function formatoNumeroPapeleta(valor) {
  const texto = String(valor ?? '').trim()
  const match = texto.match(/^(?:PAP-(?:\d{4}-)?)?(\d+)$/i)
  return match ? match[1].padStart(7, '0') : texto
}
