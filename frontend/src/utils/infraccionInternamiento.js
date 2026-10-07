// Infracción que se imprime en la boleta de internamiento y en la orden de libertad: la de la PAPELETA
// (código + descripción, p. ej. "M-01 — Prestar servicio ... sin autorización municipal"), no un texto genérico.
export function textoInfraccion(item) {
  const codigos = String(item?.infraccionCodigo || '').trim()
  const descripcion = String(item?.infraccionDescripcion || '').trim()
  if (codigos && descripcion) return `${codigos} — ${descripcion}`
  return codigos || descripcion || String(item?.motivo || '').trim()
}
