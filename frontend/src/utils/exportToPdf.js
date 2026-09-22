function escapeXml(unsafe) {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Genera una vista de impresión PDF para una lista de datos,
 * utilizando la misma configuración de columnas que exportToExcel.
 *
 * @param {Object} options
 * @param {string} options.filename Nombre sugerido al imprimir (suele tomar el título del documento)
 * @param {string} [options.title] Título institucional
 * @param {string} [options.subtitle] Subtítulo del módulo
 * @param {Array<{label: string, value: string}>|string} [options.metadata] Metadatos de cabecera
 * @param {Array<{header: string, key?: string, width?: string|number, align?: 'left'|'center'|'right', render?: (value: any, row: any, index: number) => string}>} options.columns
 * @param {Array<any>} options.data Lista de registros a exportar
 */
export function exportToPdf({
  filename = 'Reporte.pdf',
  title = 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
  subtitle = 'Subgerencia de Tránsito y Transporte',
  metadata = [],
  columns = [],
  data = []
}) {
  if (!data || data.length === 0) {
    alert('No hay registros para exportar a PDF.')
    return
  }

  const printWin = window.open('', '_blank')
  if (!printWin) {
    alert('No se pudo abrir la vista previa de impresión. Por favor habilita las ventanas emergentes en tu navegador.')
    return
  }

  const now = new Date()
  const fechaEmision = `${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE')}`

  let metaText = `Fecha de emisión: ${fechaEmision} | Total registros: ${data.length}`
  if (Array.isArray(metadata) && metadata.length > 0) {
    metaText += ' | ' + metadata.map(m => `${escapeXml(m.label)}: <strong>${escapeXml(m.value)}</strong>`).join(' | ')
  } else if (typeof metadata === 'string' && metadata.trim()) {
    metaText += ' | ' + escapeXml(metadata)
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
            val = '--'
          }

          const align = col.align || 'left'
          return `<td style="text-align: ${align};">${escapeXml(val)}</td>`
        })
        .join('')

      return `<tr>${cells}</tr>`
    })
    .join('')

  const pdfHtml = `
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="utf-8"/>
        <title>${escapeXml(filename)}</title>
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm 12mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            background: #fff;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid #e2e8f0;
          }
          .header h1 {
            font-size: 16px;
            font-weight: 900;
            color: #1e3a8a;
            margin: 0 0 4px 0;
            text-transform: uppercase;
          }
          .header h2 {
            font-size: 12px;
            font-weight: 600;
            color: #475569;
            margin: 0 0 10px 0;
          }
          .meta {
            font-size: 10px;
            color: #64748b;
            background: #f8fafc;
            padding: 6px 12px;
            border-radius: 6px;
            display: inline-block;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
          }
          th, td {
            padding: 6px 8px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: middle;
          }
          th {
            background-color: #f8fafc;
            font-weight: 800;
            text-transform: uppercase;
            color: #334155;
            font-size: 9px;
            border-top: 1px solid #cbd5e1;
            border-bottom: 2px solid #cbd5e1;
          }
          tr:nth-child(even) {
            background-color: #f8fafc;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${escapeXml(title)}</h1>
          <h2>${escapeXml(subtitle)}</h2>
          <div class="meta">${metaText}</div>
        </div>
        <table>
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          }
        </script>
      </body>
    </html>
  `

  printWin.document.open()
  printWin.document.write(pdfHtml)
  printWin.document.close()
}
