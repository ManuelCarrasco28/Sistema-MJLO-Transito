import Swal from 'sweetalert2'
import { apiFetch } from '../config/api'
import { armarConsulta } from '../hooks/useListaServidor'
import { loading, closeLoading } from './SwalUtil'

// Descarga TODAS las filas que coinciden con los filtros, pidiéndolas por páginas al servidor.
// Pedir el listado completo de una sola vez agota la memoria del servidor con decenas de miles
// de registros (Personas, Inspecciones) y algunos listados lo recortan sin filtros (Papeletas).
// Con páginas de 200 filas el resultado es siempre el conjunto completo y en el mismo orden de la tabla.
export async function fetchTodasLasFilas(endpoint, params = {}, opciones = {}) {
  const { porPagina = 200, concurrencia = 2, campoPorPagina = 'porPagina', mensaje = 'Preparando la descarga...', silencioso = false, signal, procesarPagina, maxFilas = Infinity } = opciones
  const controller = new AbortController()
  const cancelar = () => controller.abort()
  if (signal?.aborted) cancelar()
  else signal?.addEventListener('abort', cancelar, { once: true })

  const pedir = async (pagina) => {
    const consulta = armarConsulta(params)
    consulta.set('page', String(pagina))
    consulta.set(campoPorPagina, String(porPagina))
    const respuesta = await apiFetch(`${endpoint}?${consulta.toString()}`, { signal: controller.signal })
    if (!respuesta.ok) throw new Error(`No se pudo leer ${endpoint} (HTTP ${respuesta.status})`)
    const cuerpo = await respuesta.json()
    if (controller.signal.aborted) throw new DOMException('Descarga cancelada', 'AbortError')
    return cuerpo
  }

  try {
  const primera = await pedir(1)
  const primerasFilas = Array.isArray(primera.data) ? primera.data : []
  const total = Number(primera.meta?.total ?? primera.total ?? primerasFilas.length)
  if (total > maxFilas) throw new Error(`Hay ${total.toLocaleString('es-PE')} registros. Aplique filtros para descargar hasta ${maxFilas.toLocaleString('es-PE')} registros o use Excel.`)
  const tamano = Number(primera.meta?.porPagina ?? primera.limit ?? porPagina) || porPagina
  const paginas = Math.max(1, Math.ceil(total / tamano))
  if (procesarPagina) await procesarPagina(primerasFilas, 1, total)
  if (controller.signal.aborted) throw new DOMException('Descarga cancelada', 'AbortError')
  if (paginas <= 1) return procesarPagina ? [] : primerasFilas

  const porPaginaResultado = new Array(paginas + 1)
  if (!procesarPagina) porPaginaResultado[1] = primerasFilas
  let hechas = primerasFilas.length
  let siguiente = 2

  const mostrarAvance = () => !silencioso && Swal.update({ text: `${Math.min(hechas, total).toLocaleString('es-PE')} de ${total.toLocaleString('es-PE')} registros` })
  if (!silencioso) loading(mensaje, `${hechas.toLocaleString('es-PE')} de ${total.toLocaleString('es-PE')} registros`)

  try {
    let primeraFalla
    const trabajador = async () => {
      while (siguiente <= paginas && !controller.signal.aborted) {
        const pagina = siguiente
        siguiente += 1
        const cuerpo = await pedir(pagina)
        const filas = Array.isArray(cuerpo.data) ? cuerpo.data : []
        if (procesarPagina) await procesarPagina(filas, pagina, total)
        else porPaginaResultado[pagina] = filas
        hechas += filas.length
        mostrarAvance()
      }
    }
    const trabajadores = Array.from({ length: Math.max(1, Math.min(4, concurrencia, paginas - 1)) }, () =>
      trabajador().catch(err => { primeraFalla ||= err; controller.abort(); throw err }))
    const resultados = await Promise.allSettled(trabajadores)
    const fallo = resultados.find(r => r.status === 'rejected')
    if (fallo) throw primeraFalla || fallo.reason
    if (controller.signal.aborted) throw new DOMException('Descarga cancelada', 'AbortError')
  } finally {
    if (!silencioso) closeLoading()
  }

  return procesarPagina ? [] : porPaginaResultado.slice(1).flat()
  } finally {
    signal?.removeEventListener('abort', cancelar)
  }
}
