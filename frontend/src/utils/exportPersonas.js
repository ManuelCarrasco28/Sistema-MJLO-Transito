import { exportToPdf } from './exportToPdf'
import { exportToExcel } from './exportToExcel'

// Exporta el padrón como XLSX nativo y conserva documentos/teléfonos como texto.
export function exportPersonasExcel({ listToExport, filterEstado }) {
  return exportToExcel({
    filename: `Padron_Personas_MJLO_${new Date().toISOString().slice(0, 10)}.xlsx`,
    sheetName: 'Padron Personas',
    subtitle: 'Subgerencia de Tránsito y Transporte · Padrón Oficial de Conductores y Propietarios',
    metadata: [{ label: 'Estado', value: filterEstado }],
    columns: [
      { header: 'N°', render: (_, __, i) => i + 1, align: 'center' },
      { header: 'Tipo Doc.', render: (_, p) => p.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (p.tipoDocumento || 'DNI') },
      { header: 'N° Documento', key: 'numeroDocumento', isText: true, width: 110 },
      { header: 'Apellido Paterno', key: 'apellidoPaterno', width: 160 },
      { header: 'Apellido Materno', key: 'apellidoMaterno', width: 160 },
      { header: 'Nombres', key: 'nombres', width: 180 },
      { header: 'N° Licencia', key: 'numeroLicencia', isText: true, width: 120 },
      { header: 'Celular', key: 'celular', isText: true, width: 110 },
      { header: 'Teléfono Fijo', key: 'telefono', isText: true, width: 110 },
      { header: 'Correo Electrónico', key: 'email', width: 200 },
      { header: 'Dirección', key: 'direccion', width: 240 },
      { header: 'Sexo', key: 'sexo', width: 80 },
      { header: 'F. Nacimiento', key: 'fechaNacimiento', width: 110 },
      { header: 'Estado Civil', key: 'estadoCivil', width: 100 },
      { header: 'Ocupación', key: 'profesion', width: 160 },
      { header: 'Estado', key: 'estado', width: 90 },
    ],
    data: listToExport,
  })
}

// Genera y descarga el padrón de personas como PDF real (dompdf, generado
// en el servidor), reutilizando el mismo endpoint genérico de exportToPdf.
export async function exportPersonasPdf({ listToExport, totalPersonas, conductores, propietarios, activos }) {
  const columns = [
    { header: 'Tipo Doc.', key: 'docTipo', align: 'center', width: 60 },
    { header: 'N° Documento', key: 'numeroDocumento', align: 'center', width: 90 },
    { header: 'Apellidos', key: 'apellidos', width: 160 },
    { header: 'Nombres', key: 'nombres', width: 140 },
    { header: 'N° Licencia', key: 'numeroLicencia', align: 'center', width: 85 },
    { header: 'Teléfono', key: 'telefonos', align: 'center', width: 95 },
    { header: 'Correo Electrónico', key: 'email', width: 150 },
    { header: 'Dirección', key: 'direccion' },
    { header: 'Estado', key: 'estado', align: 'center', width: 65 },
  ]

  const data = listToExport.map((p) => {
    const cel = p.celular?.trim()
    const tel = p.telefono?.trim()
    return {
      docTipo: p.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (p.tipoDocumento || 'DNI'),
      numeroDocumento: p.numeroDocumento || '—',
      apellidos: [p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ') || (p.apellidoPaterno || '—'),
      nombres: p.nombres || '—',
      numeroLicencia: p.numeroLicencia || 'Sin licencia',
      telefonos: Array.from(new Set([cel, tel].filter(Boolean))).join(' / ') || '—',
      email: p.email || '—',
      direccion: p.direccion || '—',
      estado: p.estado || 'ACTIVO',
    }
  })

  return await exportToPdf({
    filename: `Padron_Personas_MJLO_${new Date().toISOString().slice(0, 10)}`,
    subtitle: 'Subgerencia de Tránsito y Transporte · Padrón Oficial de Conductores y Propietarios',
    summaryItems: [
      { label: 'Total en padrón', value: totalPersonas },
      { label: 'Exportando', value: `${listToExport.length} personas` },
      { label: 'Con Licencia', value: conductores },
      { label: 'Sin Licencia', value: propietarios },
      { label: 'Activos', value: activos },
    ],
    columns,
    data,
  })
}
