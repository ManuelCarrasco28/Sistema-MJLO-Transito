import { showError, loading, closeLoading } from './SwalUtil'
import { apiFetch, leerMensajeError } from '../config/api'

const MAXIMO_FILAS_PDF = 10000

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

  if (data.length > MAXIMO_FILAS_PDF) {
    showError(
      'PDF demasiado grande',
      `El PDF admite hasta ${MAXIMO_FILAS_PDF.toLocaleString('es-PE')} registros y hay ${data.length.toLocaleString('es-PE')}. Aplique filtros o descargue el Excel, que incluye todos los datos.`
    )
    return
  }

  // Las columnas calculadas (solo "render", sin "key") reciben una clave propia: antes se omitían
  // y salían vacías en el PDF.
  columns = columns.map((col, i) => ({ ...col, key: col.key ?? `columna_${i}` }))

  // Aplica cada render(...) del lado del cliente antes de enviar al backend
  // (los render son funciones JS, no se pueden serializar).
  const filas = data.map((row, index) => {
    const fila = {}
    for (const col of columns) {
      fila[col.key] = col.render ? col.render(row[col.key], row, index) : row[col.key]
    }
    return fila
  })

  // Generar un PDF grande en el servidor tarda: se avisa y se espera hasta 15 minutos.
  const esGrande = data.length > 500
  if (esGrande) {
    loading('Generando PDF...', `${data.length.toLocaleString('es-PE')} registros. Puede tardar unos minutos, no cierre esta ventana.`)
  }

  try {
    const response = await apiFetch('/export-pdf', {
      timeoutMs: 15 * 60 * 1000,
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
      if (esGrande) closeLoading()
      const motivo = await leerMensajeError(response, 'No se pudo generar el documento en el servidor. Intenta nuevamente.')
      showError('Error al generar PDF', motivo)
      return
    }

    const blob = await response.blob()
    if (esGrande) closeLoading()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  } catch {
    if (esGrande) closeLoading()
    showError('Error al generar PDF', 'No se pudo conectar con el servidor para generar el documento.')
  }
}
