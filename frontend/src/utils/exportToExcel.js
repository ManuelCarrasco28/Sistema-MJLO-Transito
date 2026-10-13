import { showError } from './SwalUtil'
import { fetchTodasLasFilas } from './descargaCompleta'

// XLSX strings are literal values, never formula objects.
export function valorCeldaExcel(value, column) {
  if (value === null || value === undefined || value === '') return null
  if (column.isText) return String(value)
  if (/\(S\/\)/i.test(column.header || '')) {
    const number = typeof value === 'number' ? value : Number(String(value).replace(/^S\/\s*/, '').replace(/,/g, '').trim())
    return Number.isFinite(number) ? number : String(value)
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value === 'boolean') return value ? 'SÍ' : 'NO'
  return String(value)
}

/** Native XLSX with typed numbers, text identifiers and validated paged sources. */
export async function exportToExcel({
  filename = 'Reporte.xlsx', sheetName = 'Datos',
  title = 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
  subtitle = 'Subgerencia de Tránsito y Transporte', metadata = [], columns = [], data = [],
}) {
  const source = !Array.isArray(data) && data?.endpoint ? data : null
  if (!columns.length || (!source && !data?.length)) {
    showError('Sin registros', 'No hay registros para exportar.')
    return
  }
  try {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Municipalidad Distrital José Leonardo Ortiz'
    const safeName = String(sheetName).replace(/[\\/*?:[\]]/g, ' ').replace(/^'+|'+$/g, '').slice(0, 31).trim() || 'Datos'
    const sheet = workbook.addWorksheet(safeName)
    sheet.columns = columns.map(col => ({ width: Math.min(55, Math.max(12, (Number.parseFloat(col.width) || 140) / 7)) }))
    const addHeading = (text, size, bold) => {
      const row = sheet.addRow([text])
      if (columns.length > 1) sheet.mergeCells(row.number, 1, row.number, columns.length)
      row.font = { name: 'Calibri', size, bold, color: { argb: 'FF1E3A8A' } }
      row.alignment = { wrapText: true, vertical: 'middle' }
      row.height = size === 16 ? 30 : 24
      return row
    }
    addHeading(title, 16, true)
    addHeading(subtitle, 11, false)
    const metaRow = addHeading('', 10, false)
    sheet.addRow([])
    const header = sheet.addRow(columns.map(col => col.header))
    header.height = 34
    header.eachCell(cell => {
      cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
      cell.alignment = { vertical: 'middle', wrapText: true }
    })
    sheet.views = [{ state: 'frozen', ySplit: header.number }]
    let total = 0
    const processRows = async rows => {
      for (const record of rows) {
        if (sheet.rowCount >= 1048576) throw new Error('El reporte supera el límite de filas de Excel. Aplique filtros.')
        let lines = 1
        const values = columns.map(col => {
          let value = col.key ? record[col.key] : null
          if (col.render) value = col.render(value, record, total)
          const normalized = valorCeldaExcel(value, col)
          if (typeof normalized === 'string') {
            if (normalized.length > 32767) throw new Error('Un campo supera el límite de texto de Excel. Aplique filtros.')
            lines = Math.max(lines, normalized.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(line.length / 45)), 0))
          }
          return normalized
        })
        const row = sheet.addRow(values)
        row.height = Math.min(409, Math.max(20, lines * 15))
        row.eachCell({ includeEmpty: true }, (cell, index) => {
          const col = columns[index - 1]
          cell.font = { name: 'Calibri', size: 11 }
          cell.alignment = { vertical: 'top', wrapText: true, horizontal: col.align || 'left' }
          if (col.isText) cell.numFmt = '@'
          else if (/\(S\/\)/i.test(col.header || '')) cell.numFmt = '"S/ "#,##0.00'
        })
        total++
        if (total % 200 === 0) await new Promise(resolve => setTimeout(resolve, 0))
      }
    }
    if (source) {
      await fetchTodasLasFilas(source.endpoint, source.params, {
        ...source.opciones, concurrencia: 1,
        procesarPagina: rows => processRows(source.transformar ? source.transformar(rows) : rows),
      })
    } else await processRows(data)
    if (!total) { showError('Sin registros', 'No hay registros para exportar.'); return }
    const meta = Array.isArray(metadata) ? metadata.map(m => m.label + ': ' + m.value).join(' | ') : String(metadata || '')
    metaRow.getCell(1).value = 'Fecha de emisión: ' + new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }) + ' | Total registros: ' + total + (meta ? ' | ' + meta : '')
    metaRow.height = 42
    sheet.autoFilter = { from: { row: header.number, column: 1 }, to: { row: sheet.rowCount, column: columns.length } }
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.replace(/\.(xlsx?|xml)$/i, '') + '.xlsx'
    document.body.appendChild(link)
    try { link.click() } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000) }
  } catch (error) {
    if (error.name !== 'AbortError') showError('Descarga no completada', error.message || 'No se pudo preparar el archivo completo. Intente nuevamente.')
  }
}
