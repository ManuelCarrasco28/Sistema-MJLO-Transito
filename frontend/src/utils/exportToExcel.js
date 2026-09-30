import { showError } from './SwalUtil'
import { escapeXml, escapeExcelCell } from './exportHelpers'

/**
 * Exporta una lista de datos a un archivo Excel (.xls) compatible con Microsoft Excel,
 * preservando estilos corporativos institucionales, ancho de columnas y formato de texto (DNI/RUC/Placas).
 *
 * @param {Object} options
 * @param {string} options.filename Nombre del archivo a descargar (e.g. 'Padron_Vehiculos.xls')
 * @param {string} [options.sheetName] Nombre de la hoja de cálculo
 * @param {string} [options.title] Título institucional
 * @param {string} [options.subtitle] Subtítulo del módulo
 * @param {Array<{label: string, value: string}>|string} [options.metadata] Metadatos de cabecera
 * @param {Array<{header: string, key?: string, width?: string|number, align?: 'left'|'center'|'right', isText?: boolean, render?: (value: any, row: any, index: number) => string}>} options.columns
 * @param {Array<any>} options.data Lista de registros a exportar
 */
export function exportToExcel({
  filename = 'Reporte.xls',
  sheetName = 'Datos',
  title = 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
  subtitle = 'Subgerencia de Tránsito y Transporte',
  metadata = [],
  columns = [],
  data = []
}) {
  if (!data || data.length === 0) {
    showError('Sin registros', 'No hay registros para exportar.')
    return
  }

  const now = new Date()
  const fechaEmision = `${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE')}`

  let metaText = `Fecha de emisión: ${fechaEmision} | Total registros: ${data.length}`
  if (Array.isArray(metadata) && metadata.length > 0) {
    metaText += ' | ' + metadata.map(m => `${m.label}: ${m.value}`).join(' | ')
  } else if (typeof metadata === 'string' && metadata.trim()) {
    metaText += ' | ' + metadata
  }

  const headersHtml = columns
    .map(col => {
      const align = col.align || 'left'
      const width = col.width ? `width: ${typeof col.width === 'number' ? col.width + 'px' : col.width};` : ''
      return `<th style="text-align: ${align}; ${width}">${escapeXml(col.header)}</th>`
    })
    .join('')

  const rowsHtml = data
    .map((row, index) => {
      const cells = columns
        .map(col => {
          let val = col.key ? row[col.key] : ''
          if (col.render) {
            val = col.render(val, row, index)
          } else if (val === null || val === undefined || val === '') {
            val = '—'
          }

          const align = col.align || 'left'
          const textFormat = col.isText ? `mso-number-format:'\\@';` : ''
          return `<td style="text-align: ${align}; ${textFormat}">${escapeExcelCell(val)}</td>`
        })
        .join('')

      return `<tr>${cells}</tr>`
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
                <x:Name>${escapeXml(sheetName.slice(0, 31))}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1e293b; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #1e3a8a; color: #ffffff; font-weight: bold; padding: 8px 10px; border: 1px solid #94a3b8; font-size: 11pt; }
          td { padding: 6px 10px; border: 1px solid #cbd5e1; font-size: 10.5pt; vertical-align: middle; }
          .header-title { font-size: 16pt; font-weight: bold; color: #1e3a8a; }
          .header-subtitle { font-size: 11pt; color: #475569; margin-bottom: 6px; }
          .header-meta { font-size: 9.5pt; color: #64748b; margin-bottom: 14px; }
        </style>
      </head>
      <body>
        <div class="header-title">${escapeXml(title)}</div>
        <div class="header-subtitle">${escapeXml(subtitle)}</div>
        <div class="header-meta">${escapeXml(metaText)}</div>
        <table>
          <thead>
            <tr>
              ${headersHtml}
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
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
