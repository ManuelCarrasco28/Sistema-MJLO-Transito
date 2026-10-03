// Comparador para ordenar listas en memoria por varias columnas a la vez.
// sortBy = "a,b" y sortDir = "ASC,DESC" (igual que el formato que envía SortableHeader).
export function crearComparador(sortBy, sortDir) {
  const columnas = String(sortBy || '').split(',').filter(Boolean)
  const direcciones = String(sortDir || '').split(',')
  return (a, b) => {
    for (let i = 0; i < columnas.length; i += 1) {
      const mult = direcciones[i] === 'ASC' ? 1 : -1
      const valA = String(a[columnas[i]] ?? '').toLowerCase()
      const valB = String(b[columnas[i]] ?? '').toLowerCase()
      if (valA < valB) return -1 * mult
      if (valA > valB) return 1 * mult
    }
    return 0
  }
}
