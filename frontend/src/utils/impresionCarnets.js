import { apiFetch } from '../config/api'
import { recomprimirImagen } from '../components/documentos/TarjetaOperatividadPrint'

// Las fotos de los conductores se sirven desde un endpoint que exige la sesión (cookie) del usuario.
// La ventana de impresión del navegador (window.print) se renderiza en un proceso aparte que a veces
// no reenvía esa cookie, así que la foto cargaba bien en pantalla pero salía en blanco al imprimir.
// Para evitarlo, antes de imprimir se descarga cada foto con la sesión incluida y se convierte en un
// data URI (la imagen va embebida en el propio carnet, sin depender de ninguna petición de red al imprimir).
// Se cachea por URL para no volver a descargar la misma foto en impresiones siguientes.
const cacheFotosCarnet = new Map()
const MAX_FOTOS_CACHE = 100
window.addEventListener('mjlo:limpiar-sesion', () => cacheFotosCarnet.clear())

export async function resolverFotoParaCarnet(fotoUrl) {
  const url = String(fotoUrl || '').trim()
  if (!url || url.startsWith('data:')) return url
  if (cacheFotosCarnet.has(url)) return cacheFotosCarnet.get(url)

  const promesa = (async () => {
    try {
      const respuesta = await apiFetch(url, { timeoutMs: 8000 })
      if (!respuesta.ok) return ''
      const blob = await respuesta.blob()
      const dataUri = await new Promise((resolve) => {
        const lector = new FileReader()
        lector.onload = () => resolve(String(lector.result || ''))
        lector.onerror = () => resolve('')
        lector.readAsDataURL(blob)
      })
      if (!dataUri) return ''
      // La casilla de foto del carnet es pequeña; algunas fotos (p. ej. de SUNARP) llegan mucho más
      // grandes de lo que hace falta ahí, así que se reducen antes de embeberlas para que imprimir
      // un lote con varias fotos no sea más lento de lo necesario.
      return (await recomprimirImagen(dataUri, 500)) || dataUri
    } catch {
      return ''
    }
  })()

  cacheFotosCarnet.set(url, promesa)
  while (cacheFotosCarnet.size > MAX_FOTOS_CACHE) cacheFotosCarnet.delete(cacheFotosCarnet.keys().next().value)
  // Solo se recuerdan las descargas buenas: una foto que falló (red, 404 momentáneo) se vuelve a pedir la próxima vez.
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
    // window.print() bloquea hasta que se cierra el diálogo, y "afterprint" se dispara dentro de esa
    // llamada: el oyente tiene que estar puesto ANTES de imprimir. Antes se ponía después y la limpieza
    // quedaba a un temporizador de 2,5 s que, si se mandaba otra impresión justo después, borraba la nueva.
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
