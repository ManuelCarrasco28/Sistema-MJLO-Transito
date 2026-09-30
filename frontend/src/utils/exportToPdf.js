import { showError } from './SwalUtil'
import { apiFetch } from '../config/api'

/**
 * Pide al backend que genere un PDF real (dompdf) a partir de
 * {title, subtitle, summaryItems, columns, data} y descarga el archivo
 * resultante. Reemplaza la generación en el navegador (html2pdf/canvas):
 * el backend produce un PDF de verdad (texto seleccionable, sin bugs de
 * renderizado) y cada exportación queda registrada en la auditoría.
 *
 * @param {Object} options
 * @param {string} options.filename     Nombre del archivo a descargar (sin extensión)
 * @param {string} [options.title]      Título institucional principal
 * @param {string} [options.subtitle]   Subtítulo del módulo / padrón
 * @param {Array<{label: string, value: string|number}>} [options.summaryItems] Items para la barra de resumen
 * @param {Array<{header: string, key?: string, width?: number|string, align?: 'left'|'center'|'right', render?: (value: any, row: any, index: number) => string}>} options.columns
 * @param {Array<any>} options.data     Lista de registros a exportar
 */
export async function exportToPdf({
  filename = 'Reporte',
  title = 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ',
  subtitle = 'Subgerencia de Tránsito y Transporte',
  summaryItems = [],
  columns = [],
  data = [],
  orientation = 'landscape'
}) {
  if (!data || data.length === 0) {
    showError('Sin registros', 'No hay registros para exportar a PDF.')
    return
  }

  // Aplica cada render(...) del lado del cliente antes de enviar al backend
  // (los render son funciones JS, no se pueden serializar).
  const filas = data.map((row, index) => {
    const fila = {}
    for (const col of columns) {
      if (!col.key) continue
      fila[col.key] = col.render ? col.render(row[col.key], row, index) : row[col.key]
    }
    return fila
  })

  try {
    const response = await apiFetch('/export-pdf', {
      method: 'POST',
      body: {
        filename,
        title,
        subtitle,
        summaryItems,
        columns: columns.map(({ header, key, width, align }) => ({ header, key, width, align })),
        data: filas,
        orientation,
      },
    })

    if (!response.ok) {
      showError('Error al generar PDF', 'No se pudo generar el documento en el servidor. Intenta nuevamente.')
      return
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    showError('Error al generar PDF', 'No se pudo conectar con el servidor para generar el documento.')
  }
}
