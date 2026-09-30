import { exportToPdf } from './exportToPdf'
import { formatFecha } from './formatters'

// Genera y descarga el padrón de inspecciones CERTICAV como PDF real
// (dompdf, generado en el servidor), reutilizando el endpoint genérico.
export function imprimirInspeccionesPdf({ listToExport, vehiculos, totales, aprobados, observados, desaprobados }) {
  const columns = [
    { header: 'N° Registro', key: 'numeroRegistro', align: 'center', width: 90 },
    { header: 'Serie CertiCAV', key: 'numeroSerieCerticav', align: 'center', width: 90 },
    { header: 'Placa', key: 'placa', align: 'center', width: 70 },
    { header: 'Titular / Propietario', key: 'propietario', width: 150 },
    { header: 'Asociación', key: 'asociacion' },
    { header: 'Fecha', key: 'fecha', align: 'center', width: 70 },
    { header: 'Vencimiento', key: 'vencimiento', align: 'center', width: 70 },
    { header: 'Resultado', key: 'resultado', align: 'center', width: 80 },
  ]

  const data = listToExport.map((i) => {
    const vehiculo = vehiculos.find((v) => v.placa === i.vehiculoPlaca)
    return {
      numeroRegistro: i.numeroRegistro || i.numeroInspeccion || '',
      numeroSerieCerticav: i.numeroSerieCerticav || '',
      placa: i.vehiculoPlaca || '',
      propietario: vehiculo?.propietario || i.propietario || '—',
      asociacion: vehiculo?.asociacion || i.transportador || 'Independiente',
      fecha: formatFecha(i.fecha),
      vencimiento: formatFecha(i.fechaVencimiento),
      resultado: i.resultado || '',
    }
  })

  exportToPdf({
    filename: `Padron_Inspecciones_CERTICAV_${new Date().toISOString().slice(0, 10)}`,
    subtitle: 'Subgerencia de Tránsito y Transporte · Padrón Oficial de Inspecciones Técnicas Vehiculares (CERTICAV)',
    summaryItems: [
      { label: 'Total en padrón', value: totales },
      { label: 'Exportando', value: `${listToExport.length} inspecciones` },
      { label: 'Aprobados', value: aprobados },
      { label: 'Observados', value: observados },
      { label: 'Desaprobados', value: desaprobados },
    ],
    columns,
    data,
  })
}
