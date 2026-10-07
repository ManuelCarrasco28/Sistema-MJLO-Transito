import { showError } from './SwalUtil'
import { escapeXml, escapeExcelCell } from './exportHelpers'
import { fetchTodasLasFilas } from './descargaCompleta'

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
 * @param {Array<any>|{endpoint: string, params?: Object, opciones?: Object, transformar?: Function}} options.data Registros o fuente paginada
 */
export async function exportToExcel({
  filename = 'Reporte.xls',
  sheetName = 'Datos',
  title = 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
  subtitle = 'Subgerencia de Tránsito y Transporte',
  metadata = [],
  columns = [],
  data = []
}) {
  const fuentePaginada = !Array.isArray(data) && data?.endpoint ? data : null
  if (!fuentePaginada && (!data || data.length === 0)) {
    showError('Sin registros', 'No hay registros para exportar.')
    return
  }

  const partesFilas = []
  let totalFilas = 0
  const procesarFilas = async (filas) => {
    // Conservar bloques binarios, no duplicar el padrón completo como objetos + HTML gigante.
    for (let inicio = 0; inicio < filas.length; inicio += 200) {
      const html = filas.slice(inicio, inicio + 200).map((row, indice) => {
        const index = totalFilas + indice
        const cells = columns.map(col => {
          let val = col.key ? row[col.key] : ''
          if (col.render) val = col.render(val, row, index)
          else if (val === null || val === undefined || val === '') val = '—'
          const align = col.align || 'left'
          const textFormat = col.isText ? `mso-number-format:'\\@';` : ''
          return `<td style="text-align: ${align}; ${textFormat}">${escapeExcelCell(val)}</td>`
        }).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      partesFilas.push(new Blob([html]))
      totalFilas += Math.min(200, filas.length - inicio)
      await new Promise(resolve => setTimeout(resolve, 0))
    }
  }
  if (fuentePaginada) {
    try {
    await fetchTodasLasFilas(fuentePaginada.endpoint, fuentePaginada.params, {
      ...fuentePaginada.opciones, concurrencia: 1,
      procesarPagina: filas => procesarFilas(fuentePaginada.transformar ? fuentePaginada.transformar(filas) : filas),
    })
    } catch {
      showError('Descarga no completada', 'No se pudo preparar el archivo completo. Intente nuevamente.')
      return
    }
  } else await procesarFilas(data)
  if (!totalFilas) { showError('Sin registros', 'No hay registros para exportar.'); return }

  const now = new Date()
  const fechaEmision = `${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE')}`

  let metaText = `Fecha de emisión: ${fechaEmision} | Total registros: ${totalFilas}`
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
            <!--FILAS_EXPORTADAS-->
          </tbody>
        </table>
      </body>
    </html>
  `

  const [cabecera, pie] = excelTemplate.split('<!--FILAS_EXPORTADAS-->')
  const blob = new Blob([cabecera, ...partesFilas, pie], { type: 'application/vnd.ms-excel;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
