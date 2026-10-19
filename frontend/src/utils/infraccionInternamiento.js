// En la boleta y en la orden de libertad la infracción se imprime solo con su código (M-03, G-01…), como en el
// talonario físico: la descripción larga ocupaba media hoja. Sin código se usa la descripción o el motivo.
export function textoInfraccion(item) {
  const codigos = String(item?.infraccionCodigo || '').trim()
  if (codigos) return codigos
  return String(item?.infraccionDescripcion || '').trim() || String(item?.motivo || '').trim()
}
