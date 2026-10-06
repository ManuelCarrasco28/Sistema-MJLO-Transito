export const isVehiculoFormal = (v) => Boolean(
  v?.asociacionId ||
  (v?.asociacion && v.asociacion !== 'Sin Asociación' && v.asociacion !== 'Independiente' && v.asociacion !== 'Independiente / Particular')
)

export const getVehiculoDocumento = (vehiculo, tipoDocumento) => (
  vehiculo?.documentosVehiculo?.find((doc) => doc.tipoDocumento === tipoDocumento)
)

const formatDocumentoQr = (label, documento) => {
  if (!documento) return `${label}: SIN REGISTRO`

  return `${label}: ${documento.codigo || 'SIN CODIGO'} | Estado: ${documento.estado || 'SIN ESTADO'} | Vence: ${documento.fechaExpiracion || 'SIN FECHA'}`
}

const formatCerticavQr = (certicav) => {
  if (!certicav) return 'CERTICAV / Inspeccion tecnica: SIN REGISTRO'

  return [
    `CERTICAV / Inspeccion tecnica: ${certicav.numeroSerieCerticav || certicav.numeroRegistro || 'SIN NUMERO'}`,
    `Resultado: ${certicav.resultado || 'SIN RESULTADO'}`,
    `Estado: ${certicav.estado || 'SIN ESTADO'}`,
    `Fecha: ${certicav.fecha || 'SIN FECHA'}`,
  ].join(' | ')
}

export const buildVehiculoQrValue = (vehiculo) => {
  const tarjetaPropiedad = getVehiculoDocumento(vehiculo, 'TARJETA_PROPIEDAD')
  const soat = getVehiculoDocumento(vehiculo, 'SOAT')
  const certicav = vehiculo.certicav
  const papeletas = vehiculo.historialPapeletas || []
  const papeletasQr = papeletas.length > 0
    ? papeletas.slice(0, 8).map((papeleta, index) => (
      `${index + 1}. ${papeleta.numeroPapeleta || 'SIN NUMERO'} | ${papeleta.estado || 'SIN ESTADO'} | S/ ${Number(papeleta.montoTotal || 0).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} | ${papeleta.fechaHora || 'SIN FECHA'}`
    )).join('\n')
    : 'SIN PAPELETAS REGISTRADAS'

  return [
    'MDJLO - Sistema de Gestion de Transito Municipal',
    `Codigo QR: ${vehiculo.codigoQr || 'SIN CODIGO'}`,
    `Placa del vehiculo: ${vehiculo.placa || 'SIN PLACA'}`,
    `Tipo de vehiculo: ${vehiculo.tipo || 'SIN TIPO'}`,
    `Marca: ${vehiculo.marca || 'SIN MARCA'}`,
    `Modelo: ${vehiculo.modelo || 'SIN MODELO'}`,
    `Color: ${vehiculo.color || 'SIN COLOR'}`,
    `Anio fabricacion: ${vehiculo.anio || 'SIN ANIO'}`,
    `Categoria: ${vehiculo.categoria || 'SIN CATEGORIA'}`,
    `Carroceria: ${vehiculo.carroceria || 'SIN CARROCERIA'}`,
    `Sede de registro: ${vehiculo.sedeRegistro || 'SIN SEDE'}`,
    `Tipo de carroceria: ${vehiculo.tipoCarroceria || 'SIN TIPO CARROCERIA'}`,
    `Propietario: ${vehiculo.propietario || 'SIN PROPIETARIO'}`,
    `DNI propietario: ${vehiculo.propietarioTipoDocumento === 'DNI' ? vehiculo.propietarioDni || 'SIN DNI' : 'NO APLICA'}`,
    `RUC asociacion: ${vehiculo.asociacionRuc || 'SIN RUC'}`,
    `Asociacion vehiculo: ${vehiculo.asociacion || 'INDEPENDIENTE'}`,
    formatDocumentoQr('Tarjeta de propiedad numero', tarjetaPropiedad),
    formatDocumentoQr('SOAT', soat),
    formatCerticavQr(certicav),
    'Historial de papeletas del vehiculo:',
    papeletasQr,
  ].join('\n')
}
