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
 * Genera una vista de impresión PDF (segunda ventana) para una lista de datos.
 * Replica el diseño oficial institucional de Personas.jsx:
 *   - Encabezado: título institucional (izq) + fecha/sistema (der)
 *   - Barra de resumen con KPIs
 *   - Tabla con cabecera oscura (#0f172a)
 *   - Footer institucional
 *   - Auto-print al cargar
 *
 * @param {Object} options
 * @param {string} options.filename     Nombre del documento (aparece en el <title>)
 * @param {string} [options.title]      Título institucional principal
 * @param {string} [options.subtitle]   Subtítulo del módulo / padrón
 * @param {Array<{label: string, value: string|number}>} [options.summaryItems] Items para la barra de resumen
 * @param {Array<{header: string, key?: string, width?: number|string, align?: 'left'|'center'|'right', render?: (value: any, row: any, index: number) => string}>} options.columns
 * @param {Array<any>} options.data     Lista de registros a exportar
 */
export function exportToPdf({
  filename = 'Reporte',
  title = 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
  subtitle = 'Subgerencia de Tránsito y Transporte',
  summaryItems = [],
  columns = [],
  data = [],
  orientation = 'landscape'
}) {
  if (!data || data.length === 0) {
    alert('No hay registros para exportar a PDF.')
    return
  }

  const printWin = window.open('', '_blank', 'width=1200,height=800')
  if (!printWin) {
    alert('No se pudo abrir la vista previa de impresión. Por favor habilita las ventanas emergentes en tu navegador.')
    return
  }

  const now = new Date()
  const fechaEmision = `${now.toLocaleDateString('es-PE')} ${now.toLocaleTimeString('es-PE')}`

  // Barra de resumen
  const summaryHtml = summaryItems.length > 0
    ? `<div class="summary-bar">
        ${summaryItems.map((s, i) => `<div class="summary-item">${i > 0 ? '· ' : ''}${escapeXml(s.label)}: <strong>${escapeXml(String(s.value))}</strong></div>`).join('\n')}
      </div>`
    : ''

  // Cabecera de tabla
  const headersHtml = `<th style="width: 28px; text-align: center;">N°</th>` +
    columns.map(col => {
      const align = col.align || 'left'
      const width = col.width ? `width: ${typeof col.width === 'number' ? col.width + 'px' : col.width};` : ''
      return `<th style="text-align: ${align}; ${width}">${escapeXml(col.header)}</th>`
    }).join('')

  // Filas
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
          return `<td style="text-align: ${align};">${escapeXml(String(val))}</td>`
        })
        .join('')

      return `<tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="text-align: center; font-weight: bold; color: #64748b;">${index + 1}</td>
        ${cells}
      </tr>`
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
            size: A4 ${orientation};
            margin: ${orientation === 'portrait' ? '12mm 14mm 12mm 14mm' : '10mm 12mm 10mm 12mm'};
          }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 0;
            font-size: 10.5px;
          }
          .header {
            border-bottom: 2px solid #0f172a;
            padding-bottom: 8px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
          }
          .title {
            font-size: 15px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.3px;
            text-transform: uppercase;
          }
          .subtitle {
            font-size: 10.5px;
            font-weight: 600;
            color: #475569;
            margin-top: 2px;
          }
          .meta {
            font-size: 9.5px;
            color: #64748b;
            text-align: right;
          }
          .summary-bar {
            display: flex;
            gap: 16px;
            margin-bottom: 10px;
            background: #f1f5f9;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 10.5px;
          }
          .summary-item {
            display: flex;
            align-items: center;
            gap: 5px;
          }
          .summary-item strong {
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
          }
          thead {
            display: table-header-group;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          th {
            background-color: #0f172a;
            color: #ffffff;
            text-transform: uppercase;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.4px;
            padding: 6px 7px;
            border: 1px solid #0f172a;
            text-align: left;
          }
          td {
            border: 1px solid #e2e8f0;
            padding: 5px 7px;
            vertical-align: middle;
            font-size: 10.5px;
          }
          .footer {
            margin-top: 12px;
            font-size: 8.5px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
            border-top: 1px solid #e2e8f0;
            padding-top: 5px;
          }
          @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="title">Municipalidad Distrital José Leonardo Ortiz</div>
            <div class="subtitle">${escapeXml(subtitle)}</div>
          </div>
          <div class="meta">
            <div><strong>Fecha de emisión:</strong> ${fechaEmision}</div>
            <div><strong>Sistema:</strong> MJLO Tránsito Digital v2026</div>
          </div>
        </div>

        ${summaryHtml}

        <table>
          <thead>
            <tr>${headersHtml}</tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <span>Documento oficial generado para fines administrativos y fiscalización del transporte en José Leonardo Ortiz.</span>
          <span>${escapeXml(filename)}</span>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
    </html>
  `

  printWin.document.open()
  printWin.document.write(pdfHtml)
  printWin.document.close()
}
