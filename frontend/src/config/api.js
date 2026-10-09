import { limpiarDatosLocales } from '../utils/sesionLocal'
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
const DEFAULT_TIMEOUT_MS = 25000

const memoryCache = new Map()
const pendingReads = new Map()
const peticionesActivas = new Set()

window.addEventListener('mjlo:limpiar-sesion', () => {
  memoryCache.clear()
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

// Detecta si un mensaje de error "se ve técnico" (traza de PHP, SQL crudo, rutas
// de archivos del servidor) para no mostrárselo nunca al usuario final, aunque el
// backend lo devuelva por error (por ejemplo con CI_ENVIRONMENT=development).
const PATRON_TECNICO = /sqlstate|syntax error|stack trace|fatal error|exception|mysqli|pdoexception|codeigniter|vendor[/\\]|app[/\\]controllers|\.php on line|integrity constraint|#\d+ \{main\}/i

export function sanitizarMensaje(mensaje, fallback = 'Ocurrió un error en el servidor. Intente nuevamente.') {
  const texto = mensaje == null ? '' : String(mensaje).trim()
  if (!texto || PATRON_TECNICO.test(texto) || texto.length > 300) return fallback
  return texto
}

// Extrae el mensaje que devuelve CodeIgniter (failValidationErrors, failNotFound…)
// para mostrarle al usuario el motivo real en vez de un error genérico, filtrando
// cualquier traza técnica que se haya colado en la respuesta.
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
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...fetchOptions } = options
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const headers = {
    Accept: 'application/json',
    ...(fetchOptions.headers || {}),
  }

  let body = fetchOptions.body
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
    body = JSON.stringify(body)
  }

  const method = (fetchOptions.method || 'GET').toUpperCase()
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
      return shared.clone()
    }

    const response = await fetch(url, config)

    redirigirSiSesionExpirada(response, url)

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && response.ok) {
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
