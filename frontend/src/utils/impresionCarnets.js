import { apiFetch, API_BASE_URL, resolverUrlArchivo } from '../config/api'
import { recomprimirImagen } from '../components/documentos/TarjetaOperatividadPrint'

// Embeber las fotos con sesión para evitar imágenes vacías al imprimir.
const cacheFotosCarnet = new Map()
const MAX_FOTOS_CACHE = 100
window.addEventListener('mjlo:limpiar-sesion', () => cacheFotosCarnet.clear())

export async function resolverFotoParaCarnet(fotoUrl) {
  const url = String(fotoUrl || '').trim()
  if (!url || url.startsWith('data:')) return url
  if (cacheFotosCarnet.has(url)) return cacheFotosCarnet.get(url)

  const promesa = (async () => {
    try {
      // apiFetch antepone la base de la API a las rutas relativas: una foto "/api/files/..." quedaba
      // como "/api/api/files/..." (404) y el carnet salía sin foto. Se pasa la ruta sin esa base.
      let ruta = resolverUrlArchivo(url)
      if (ruta.startsWith(`${API_BASE_URL}/`)) ruta = ruta.slice(API_BASE_URL.length)
      const respuesta = await apiFetch(ruta, { timeoutMs: 8000 })
      if (!respuesta.ok) return ''
      const blob = await respuesta.blob()
      const dataUri = await new Promise((resolve) => {
        const lector = new FileReader()
        lector.onload = () => resolve(String(lector.result || ''))
        lector.onerror = () => resolve('')
        lector.readAsDataURL(blob)
      })
      if (!dataUri) return ''
      // Reducir las fotos al tamaño necesario para imprimir.
      return (await recomprimirImagen(dataUri, 500)) || dataUri
    } catch {
      return ''
    }
  })()

  cacheFotosCarnet.set(url, promesa)
  while (cacheFotosCarnet.size > MAX_FOTOS_CACHE) cacheFotosCarnet.delete(cacheFotosCarnet.keys().next().value)
  // Cachear solo descargas correctas; reintentar las fallidas.
  promesa.then((resultado) => { if (!resultado && cacheFotosCarnet.get(url) === promesa) cacheFotosCarnet.delete(url) })
  return promesa
}

export async function resolverFotosDeParticipantes(participantes) {
  const lista = participantes || []
  const resultado = new Array(lista.length)
  let siguiente = 0
  const trabajador = async () => {
    while (siguiente < lista.length) {
      const indice = siguiente++
      const p = lista[indice]
      resultado[indice] = { ...p, fotoUrl: await resolverFotoParaCarnet(p.fotoUrl) }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, lista.length) }, trabajador))
  return resultado
}

// Abre el diálogo de impresión cuando las plantillas y fotos del portal ya cargaron.
export const abrirImpresionCuandoEsteListo = (limpiar) => {
  const raf = typeof requestAnimationFrame === 'function'
    ? requestAnimationFrame
    : (callback) => setTimeout(callback, 16)

  const ejecutar = () => {
    // Registrar afterprint antes de imprimir para limpiar el lote correcto.
    let terminado = false
    const cleanup = () => {
      if (terminado) return
      terminado = true
      window.removeEventListener('afterprint', cleanup)
      limpiar()
    }
    window.addEventListener('afterprint', cleanup, { once: true })
    window.print()
    setTimeout(cleanup, 300)
  }

  // Las plantillas del carnet pesan ~1.5 MB cada una: si se imprime antes de que carguen, salen en blanco.
  // Las fotos de cada participante, en cambio, se descargan una por una desde el servidor: con un lote
  // grande eso puede tardar mucho, así que a ellas se les da un presupuesto corto y, si no llegan a
  // tiempo, se imprime igual (la casilla queda vacía) en vez de bloquear todo el lote por una sola foto lenta.
  const esperarImagenes = async (limiteMs = 15000) => {
    const esPlantilla = (img) => img.classList.contains('cv-plantilla')
    const inicio = Date.now()
    while (Date.now() - inicio < limiteMs) {
      const plantillas = [...document.querySelectorAll('.seccion-impresion-portal img.cv-plantilla')]
      if (plantillas.length === 0 || plantillas.every((img) => img.complete && img.naturalWidth > 0)) break
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    const fotos = [...document.querySelectorAll('.seccion-impresion-portal img')].filter((img) => !esPlantilla(img))
    const presupuestoFotos = Math.min(5000, Math.max(0, limiteMs - (Date.now() - inicio)))
    await Promise.race([
      Promise.all(fotos.map((img) => (img.complete ? null : new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', resolve, { once: true })
      })))),
      new Promise((resolve) => setTimeout(resolve, presupuestoFotos)),
    ])

    const todas = [...document.querySelectorAll('.seccion-impresion-portal img')].filter((img) => img.complete && img.naturalWidth > 0)
    await Promise.all(todas.map((img) => (img.decode ? img.decode().catch(() => {}) : null)))
  }

  // Si un diálogo de confirmación (SweetAlert2) todavía está en pantalla (p. ej. su animación de cierre
  // no terminó), que no se quede como una página extra del PDF: se espera un poco a que desaparezca.
  const esperarSinDialogoAbierto = async (limiteMs = 1500) => {
    const inicio = Date.now()
    while (document.querySelector('.swal2-container') && Date.now() - inicio < limiteMs) {
      await new Promise((resolve) => setTimeout(resolve, 50))
    }
  }

  const esperarFuentes = document.fonts?.ready || Promise.resolve()
  esperarFuentes
    .then(() => esperarImagenes())
    .then(() => esperarSinDialogoAbierto())
    .finally(() => {
      raf(() => raf(ejecutar))
    })
}
