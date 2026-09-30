import { exportToPdf } from './exportToPdf'
import { escapeXml, escapeExcelCell } from './exportHelpers'

// Exporta el padrón de personas a un .xls descargable (formato Excel/HTML,
// no usa la librería exportToExcel genérica porque necesita columnas y
// formato mso-number-format específicos para documentos/teléfonos).
export function exportPersonasExcel({ listToExport, filterEstado }) {
  const rowsHtml = listToExport
    .map((p, index) => {
      const docTipo = p.tipoDocumento === 'DOCUMENTO NACIONAL DE IDENTIDAD' ? 'DNI' : (p.tipoDocumento || 'DNI')
      const cel = p.celular?.trim() || ''
      const tel = p.telefono?.trim() || ''
      const estadoClass = p.estado === 'ACTIVO' ? 'color: #059669; font-weight: bold;' : 'color: #dc2626; font-weight: bold;'

      return `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td style="text-align: center;">${escapeXml(docTipo)}</td>
          <td style="text-align: center; mso-number-format:'\\@';">${escapeExcelCell(p.numeroDocumento || '—')}</td>
          <td>${escapeExcelCell(p.apellidoPaterno || '—')}</td>
          <td>${escapeExcelCell(p.apellidoMaterno || '—')}</td>
          <td>${escapeExcelCell(p.nombres || '—')}</td>
          <td style="text-align: center; mso-number-format:'\\@'; font-weight: bold;">${escapeExcelCell(p.numeroLicencia || 'Sin licencia')}</td>
          <td style="text-align: center; mso-number-format:'\\@';">${escapeExcelCell(cel || '—')}</td>
          <td style="text-align: center; mso-number-format:'\\@';">${escapeExcelCell(tel || '—')}</td>
          <td>${escapeExcelCell(p.email || '—')}</td>
          <td>${escapeExcelCell(p.direccion || '—')}</td>
          <td style="text-align: center;">${escapeExcelCell(p.sexo || '—')}</td>
          <td style="text-align: center;">${escapeExcelCell(p.fechaNacimiento || '—')}</td>
          <td style="text-align: center;">${escapeExcelCell(p.estadoCivil || '—')}</td>
          <td>${escapeExcelCell(p.profesion || '—')}</td>
          <td style="text-align: center; ${estadoClass}">${escapeXml(p.estado || 'ACTIVO')}</td>
        </tr>
      `
    })
    .join('')

  const excelTemplate = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Padron Personas</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; text-align: left; padding: 8px 10px; border: 1px solid #94a3b8; font-size: 11pt; }
          td { padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 10.5pt; vertical-align: middle; }
          .header-title { font-size: 16pt; font-weight: bold; color: #1e3a8a; }
          .header-subtitle { font-size: 11pt; color: #475569; margin-bottom: 8px; }
          .header-meta { font-size: 10pt; color: #64748b; margin-bottom: 14px; }
        </style>
      </head>
      <body>
        <div class="header-title">MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ</div>
        <div class="header-subtitle">Subgerencia de Tránsito y Transporte · Padrón Oficial de Conductores y Propietarios</div>
        <div class="header-meta">
          Fecha de emisión: ${new Date().toLocaleDateString('es-PE')} ${new Date().toLocaleTimeString('es-PE')} |
          Total registros: ${listToExport.length} |
          Filtro: ${filterEstado === 'TODOS' ? 'Todos' : filterEstado}
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center; width: 45px;">N°</th>
              <th style="text-align: center; width: 90px;">Tipo Doc.</th>
              <th style="text-align: center; width: 110px;">N° Documento</th>
              <th style="width: 160px;">Apellido Paterno</th>
              <th style="width: 160px;">Apellido Materno</th>
              <th style="width: 180px;">Nombres</th>
              <th style="text-align: center; width: 120px;">N° Licencia</th>
              <th style="text-align: center; width: 110px;">Celular</th>
              <th style="text-align: center; width: 110px;">Teléfono Fijo</th>
              <th style="width: 200px;">Correo Electrónico</th>
              <th style="width: 240px;">Dirección</th>
              <th style="text-align: center; width: 80px;">Sexo</th>
              <th style="text-align: center; width: 110px;">F. Nacimiento</th>
              <th style="text-align: center; width: 100px;">Estado Civil</th>
              <th style="width: 160px;">Ocupación</th>
              <th style="text-align: center; width: 90px;">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Padron_Personas_MJLO_${new Date().toISOString().slice(0, 10)}.xls`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// Genera y descarga el padrón de personas como PDF real (dompdf, generado
// en el servidor), reutilizando el mismo endpoint genérico de exportToPdf.
export function exportPersonasPdf({ listToExport, totalPersonas, conductores, propietarios, activos }) {
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

  exportToPdf({
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
