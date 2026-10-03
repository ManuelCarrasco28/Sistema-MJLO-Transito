import Swal from 'sweetalert2'
import { apiFetch } from '../config/api'
import { armarConsulta } from '../hooks/useListaServidor'
import { loading, closeLoading } from './SwalUtil'

// Descarga TODAS las filas que coinciden con los filtros, pidiéndolas por páginas al servidor.
// Pedir el listado completo de una sola vez agota la memoria del servidor con decenas de miles
// de registros (Personas, Inspecciones) y algunos listados lo recortan sin filtros (Papeletas).
// Con páginas de 200 filas el resultado es siempre el conjunto completo y en el mismo orden de la tabla.
export async function fetchTodasLasFilas(endpoint, params = {}, opciones = {}) {
  const { porPagina = 200, concurrencia = 4, campoPorPagina = 'porPagina', mensaje = 'Preparando la descarga...' } = opciones

  const pedir = async (pagina) => {
    const consulta = armarConsulta(params)
    consulta.set('page', String(pagina))
    consulta.set(campoPorPagina, String(porPagina))
    const respuesta = await apiFetch(`${endpoint}?${consulta.toString()}`)
    if (!respuesta.ok) throw new Error(`No se pudo leer ${endpoint} (HTTP ${respuesta.status})`)
    return respuesta.json()
  }

  const primera = await pedir(1)
  const primerasFilas = Array.isArray(primera.data) ? primera.data : []
  const total = Number(primera.meta?.total ?? primera.total ?? primerasFilas.length)
  const tamano = Number(primera.meta?.porPagina ?? primera.limit ?? porPagina) || porPagina
  const paginas = Math.max(1, Math.ceil(total / tamano))
  if (paginas <= 1) return primerasFilas

  const porPaginaResultado = new Array(paginas + 1)
  porPaginaResultado[1] = primerasFilas
  let hechas = primerasFilas.length
  let siguiente = 2

  const mostrarAvance = () => Swal.update({ text: `${Math.min(hechas, total).toLocaleString('es-PE')} de ${total.toLocaleString('es-PE')} registros` })
  loading(mensaje, `${hechas.toLocaleString('es-PE')} de ${total.toLocaleString('es-PE')} registros`)

  try {
    const trabajador = async () => {
      while (siguiente <= paginas) {
        const pagina = siguiente
        siguiente += 1
        const cuerpo = await pedir(pagina)
        porPaginaResultado[pagina] = Array.isArray(cuerpo.data) ? cuerpo.data : []
        hechas += porPaginaResultado[pagina].length
        mostrarAvance()
      }
    }
    await Promise.all(Array.from({ length: Math.min(concurrencia, paginas - 1) }, trabajador))
  } finally {
    closeLoading()
  }

  return porPaginaResultado.slice(1).flat()
}
