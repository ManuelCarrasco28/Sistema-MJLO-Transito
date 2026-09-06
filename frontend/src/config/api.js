export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const memoryCache = new Map()

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

export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  }

  let body = options.body
  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json'
    body = JSON.stringify(body)
  }

  const method = (options.method || 'GET').toUpperCase()

  const config = {
    credentials: 'include',
    ...options,
    method,
    headers,
    body,
  }

  const response = await fetch(url, config)

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && response.ok) {
    const cleanEndpoint = endpoint.split('?')[0].replace(/^\//, '').split('/')[0]
    if (cleanEndpoint) {
      invalidateCache(`/${cleanEndpoint}`)
    }
  }

  return response
}
