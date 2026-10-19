import { limpiarDatosLocales } from '../utils/sesionLocal'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const DEFAULT_TIMEOUT_MS = 25000

export function resolverUrlArchivo(url) {
  if (!url) return ''
  const str = String(url).trim()
  if (str.startsWith('data:')) return str
  // Si viene con el hostname interno de docker http://backend o http://localhost:8080
  const idx = str.indexOf('/api/files/')
  if (idx !== -1) {
    return str.substring(idx)
  }
  return str
}


const memoryCache = new Map()

// Lecturas recientes. Los listados y las estadísticas se muestran al instante aunque el dato guardado
// sea viejo (hasta 10 min) y se refrescan en segundo plano; si algo cambió, avisan a la pantalla con
// el evento "mjlo:datos-nuevos". Solo se guardan listados, estadísticas y catálogos: las fichas de un
// registro (que se usan para editar), los reportes de caja y las descargas siempre van al servidor.
// Cualquier cambio (crear, editar, eliminar) las borra todas; también se borran al cerrar sesión.
const respuestasGet = new Map()
// Versión (fecha de última modificación) con que se leyó cada registro: se devuelve al guardar para
// que el servidor detecte si otra persona lo modificó mientras tanto.
const versionesRegistro = new Map()
const revalidando = new Set()
const FRESCO_LISTA_MS = 15000
const MAX_VIEJO_LISTA_MS = 600000
const MAX_RESPUESTAS_GET = 80
const MAX_TEXTO_GUARDADO = 1500000

// Otras pestañas del mismo navegador: un cambio en una borra lo guardado en las demás y las hace releer.
const canalDatos = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('mjlo-datos') : null
if (canalDatos) {
  canalDatos.unref?.()
  canalDatos.onmessage = (evento) => {
    respuestasGet.clear()
    window.dispatchEvent(new CustomEvent('mjlo:datos-nuevos', { detail: { endpoint: String(evento.data?.endpoint || '') } }))
  }
}
const ES_LISTA = /[?&]page=|\/estadisticas(?:[?/]|$)|^\/(?:usuarios|usuarios\/roles|asociaciones|tipo-documentos|tipos-infraccion|catalogo-infracciones|inspeccion-criterios|procedimientos-admin)(?:\?|$)/
const SIN_CACHE = /^\/(?:me|login|logout|status|notificaciones|pide|ruc|dashboard|auditoria|mobile|files|export-pdf|municipalidad|configuracion-sistema)(?:[/?]|$)|siguiente-correlativo|certicav-estado|arqueo/

const rutaDe = (endpoint) => (endpoint.startsWith('/') ? endpoint : `/${endpoint}`)
const esJson = (respuesta) => /json/i.test(respuesta.headers?.get('content-type') || '')

const admiteCache = (method, endpoint, opciones, sinCache) => (
  method === 'GET'
  && !sinCache
  && !/^https?:\/\//.test(endpoint)
  && ES_LISTA.test(rutaDe(endpoint))
  && !SIN_CACHE.test(rutaDe(endpoint))
  && !opciones.headers?.['Cache-Control']
)

// Pide el dato nuevo sin que la pantalla espere. Si cambió, renueva el guardado y avisa.
function refrescarEnSegundoPlano(url, endpoint) {
  if (revalidando.has(url)) return
  revalidando.add(url)
  fetch(url, { credentials: 'include', headers: { Accept: 'application/json' } })
    .then(async (respuesta) => {
      redirigirSiSesionExpirada(respuesta, url)
      if (!respuesta.ok || !esJson(respuesta)) {
        // Si el servidor falla, no se sigue mostrando lo viejo: la próxima lectura irá a la red y mostrará el error.
        if (respuesta.status !== 401) respuestasGet.delete(url)
        return
      }
      const texto = await respuesta.text()
      const actual = respuestasGet.get(url)
      // Si un cambio borró el guardado mientras tanto, esta respuesta puede ser anterior: se descarta.
      if (!actual) return
      const cambio = texto !== actual.texto
      guardarRespuestaGet(url, texto)
      registrarVersiones(endpoint, texto)
      if (cambio) window.dispatchEvent(new CustomEvent('mjlo:datos-nuevos', { detail: { endpoint } }))
    })
    .catch(() => { respuestasGet.delete(url) })
    .finally(() => revalidando.delete(url))
}

const partesDeRuta = (endpoint) => rutaDe(endpoint.split('?')[0]).split('/').filter(Boolean)

// Recuerda la versión de cada registro que aparece en una lectura (listado o ficha).
function registrarVersiones(endpoint, texto) {
  if (!texto.includes('versionRegistro')) return
  const [recurso, id, ...resto] = partesDeRuta(endpoint)
  if (!recurso || resto.length || (id !== undefined && !/^[\w-]+$/.test(id))) return
  try {
    const datos = JSON.parse(texto)?.data
    const filas = Array.isArray(datos) ? datos : [datos]
    filas.forEach((fila) => {
      if (!fila || typeof fila !== 'object' || fila.id == null || !fila.versionRegistro) return
      versionesRegistro.set(`${recurso}/${fila.id}`, fila.versionRegistro)
      if (fila.uuid) versionesRegistro.set(`${recurso}/${fila.uuid}`, fila.versionRegistro)
    })
  } catch { /* respuesta sin el formato esperado */ }
}

function guardarRespuestaGet(url, texto) {
  respuestasGet.delete(url)
  if (texto.length > MAX_TEXTO_GUARDADO) return
  respuestasGet.set(url, { texto, hora: Date.now() })
  if (respuestasGet.size > MAX_RESPUESTAS_GET) respuestasGet.delete(respuestasGet.keys().next().value)
}
const pendingReads = new Map()
const peticionesActivas = new Set()

window.addEventListener('mjlo:limpiar-sesion', () => {
  memoryCache.clear()
  respuestasGet.clear()
  versionesRegistro.clear()
  pendingReads.clear()
  for (const controller of peticionesActivas) controller.abort()
  peticionesActivas.clear()
})

export function getCachedData(key) {
  const item = memoryCache.get(key)
  if (!item) return null
  if (Date.now() - item.timestamp > 300000) {
    memoryCache.delete(key)
    return null
  }
  return item.data
}

export function setCachedData(key, data) {
  memoryCache.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(keyPrefix = null) {
  if (!keyPrefix) {
    memoryCache.clear()
    return
  }
  for (const k of memoryCache.keys()) {
    if (k.startsWith(keyPrefix)) {
      memoryCache.delete(k)
    }
  }
}

// Ocultar trazas, SQL y rutas internas en los errores al usuario.
const PATRON_TECNICO = /sqlstate|syntax error|stack trace|fatal error|exception|mysqli|pdoexception|codeigniter|vendor[/\\]|app[/\\]controllers|\.php on line|integrity constraint|#\d+ \{main\}/i

export function sanitizarMensaje(mensaje, fallback = 'Ocurrió un error en el servidor. Intente nuevamente.') {
  const texto = mensaje == null ? '' : String(mensaje).trim()
  if (!texto || PATRON_TECNICO.test(texto) || texto.length > 300) return fallback
  return texto
}

// Extraer el mensaje de error sin exponer detalles técnicos.
export async function leerMensajeError(response, fallback = 'Ocurrió un error en el servidor.') {
  try {
    const data = await response.json()
    const mensajes = data?.messages
    if (mensajes && typeof mensajes === 'object') {
      const detalles = Object.values(mensajes).flat().filter(value => typeof value === 'string' && value.trim())
      if (detalles.length) return detalles.map(value => sanitizarMensaje(value, fallback)).join('\n')
    }
    return typeof data?.message === 'string' ? sanitizarMensaje(data.message, fallback) : fallback
  } catch {
    return fallback
  }
}

function redirigirSiSesionExpirada(response, url) {
  if (response.status !== 401 || url.includes('/api/login') || url.includes('/api/me')) return
  if (window.location.pathname.endsWith('/login')) return
  limpiarDatosLocales()
  window.setTimeout(() => {
    if (!window.location.pathname.endsWith('/login')) {
      window.location.href = '/login?expired=1'
    }
  }, 100)
}

export async function apiFetch(endpoint, options = {}) {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, sinCache = false, ...fetchOptions } = options
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const headers = {
    Accept: 'application/json',
    ...(fetchOptions.headers || {}),
  }

  let body = fetchOptions.body
  const method = (fetchOptions.method || 'GET').toUpperCase()
  const edita = method === 'PUT' || method === 'PATCH'
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
    if (edita && 'versionRegistro' in body) {
      // La versión con que se abrió el formulario viaja como cabecera, no como dato a guardar.
      const { versionRegistro, ...sinVersion } = body
      if (versionRegistro && !headers['X-Version-Registro']) headers['X-Version-Registro'] = String(versionRegistro)
      body = sinVersion
    }
    body = JSON.stringify(body)
  }

  const [recursoEdicion, idEdicion, ...restoEdicion] = edita ? partesDeRuta(endpoint) : []
  const claveVersion = recursoEdicion && idEdicion && !restoEdicion.length ? `${recursoEdicion}/${idEdicion}` : null
  if (edita && claveVersion && !headers['X-Version-Registro'] && versionesRegistro.has(claveVersion)) {
    headers['X-Version-Registro'] = versionesRegistro.get(claveVersion)
  }
  const controller = new AbortController()
  peticionesActivas.add(controller)
  const externalSignal = fetchOptions.signal
  const cancelar = () => controller.abort(externalSignal?.reason)
  if (externalSignal?.aborted) cancelar()
  else externalSignal?.addEventListener('abort', cancelar, { once: true })
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  const config = {
    credentials: 'include',
    ...fetchOptions,
    method,
    headers,
    body,
    signal: controller.signal,
  }

  const usaCache = admiteCache(method, endpoint, fetchOptions, sinCache)
  if (usaCache) {
    const reciente = respuestasGet.get(url)
    const edad = reciente ? Date.now() - reciente.hora : Infinity
    if (reciente && edad < MAX_VIEJO_LISTA_MS) {
      if (edad >= FRESCO_LISTA_MS) refrescarEnSegundoPlano(url, endpoint)
      peticionesActivas.delete(controller)
      window.clearTimeout(timeoutId)
      externalSignal?.removeEventListener('abort', cancelar)
      registrarVersiones(endpoint, reciente.texto)
      return new Response(reciente.texto, { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
  }

  // Share only default reads while they are in flight. Each caller gets its
  // own body, and subsequent visits still request fresh server data.
  try {
    if (method === 'GET' && Object.keys(fetchOptions).length === 0) {
      let request = pendingReads.get(url)
      if (!request) {
        request = fetch(url, config).finally(() => {
          if (pendingReads.get(url) === request) pendingReads.delete(url)
        })
        pendingReads.set(url, request)
      }
      const shared = await request
      redirigirSiSesionExpirada(shared, url)
      if (shared.ok && esJson(shared) && (usaCache || partesDeRuta(endpoint).length <= 2)) {
        const texto = await shared.clone().text()
        if (usaCache) guardarRespuestaGet(url, texto)
        if (partesDeRuta(endpoint).length <= 2) registrarVersiones(endpoint, texto)
      }
      return shared.clone()
    }

    const response = await fetch(url, config)

    redirigirSiSesionExpirada(response, url)

    if (method === 'GET' && response.ok && esJson(response) && (usaCache || partesDeRuta(endpoint).length <= 2)) {
      const texto = await response.clone().text()
      if (usaCache) guardarRespuestaGet(url, texto)
      if (partesDeRuta(endpoint).length <= 2) registrarVersiones(endpoint, texto)
    }

    if (edita && claveVersion) {
      if (response.ok) {
        versionesRegistro.delete(claveVersion)
      } else if (response.status === 409) {
        // Otra persona guardó antes: se descarta lo guardado y las pantallas vuelven a leer el dato nuevo.
        respuestasGet.clear()
        versionesRegistro.delete(claveVersion)
        window.dispatchEvent(new CustomEvent('mjlo:datos-nuevos', { detail: { endpoint } }))
      }
    }

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && response.ok) {
      respuestasGet.clear()
      canalDatos?.postMessage({ endpoint })
      const cleanEndpoint = endpoint.split('?')[0].replace(/^\//, '').split('/')[0]
      if (cleanEndpoint === 'login' || cleanEndpoint === 'logout') {
        peticionesActivas.delete(controller)
        limpiarDatosLocales()
      } else if (cleanEndpoint) {
        invalidateCache(`/${cleanEndpoint}`)
      }
    }

    return response
  } catch (err) {
    if (err.name === 'AbortError' || String(err.message || '').toLowerCase().includes('abort')) {
      if (externalSignal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError')
      throw new Error('El servicio tardó demasiado tiempo en responder o la conexión fue cancelada.')
    }
    throw err
  } finally {
    peticionesActivas.delete(controller)
    window.clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', cancelar)
  }
}
