import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, getCachedData, setCachedData, leerMensajeError, sanitizarMensaje } from './api'
import { limpiarDatosLocales } from '../utils/sesionLocal'

describe('mensajes de validación por campo', () => {
  it('muestra todos los campos duplicados y no el código HTTP', async () => {
    const response = { json: async () => ({ message: 400, messages: { numeroDocumento: 'Número de documento duplicado.', numeroLicencia: 'Número de licencia duplicado.' } }) }
    expect(await leerMensajeError(response)).toBe('Número de documento duplicado.\nNúmero de licencia duplicado.')
  })
  it('no presenta un código numérico como mensaje al usuario', async () => {
    expect(await leerMensajeError({ json: async () => ({ message: 400 }) }, 'Revisa los datos.')).toBe('Revisa los datos.')
  })
})

describe('sanitizarMensaje', () => {
  it('deja pasar mensajes de negocio legibles', () => {
    expect(sanitizarMensaje('El RUC ya está registrado.')).toBe('El RUC ya está registrado.')
  })

  it.each([
    'SQLSTATE[23000]: Integrity constraint violation',
    'Fatal error: Uncaught Exception in /var/www/html/app/Controllers/X.php on line 12',
    'ErrorException: foreach() argument must be of type array',
    'Stack trace: #0 {main}',
  ])('oculta los mensajes técnicos: %s', (tecnico) => {
    expect(sanitizarMensaje(tecnico, 'Mensaje seguro')).toBe('Mensaje seguro')
  })

  it('usa el mensaje de respaldo con valores vacíos o demasiado largos', () => {
    expect(sanitizarMensaje('', 'respaldo')).toBe('respaldo')
    expect(sanitizarMensaje(null, 'respaldo')).toBe('respaldo')
    expect(sanitizarMensaje('x'.repeat(301), 'respaldo')).toBe('respaldo')
  })
})

describe('leerMensajeError', () => {
  const respuesta = (cuerpo) => ({ json: async () => cuerpo })

  it('prefiere messages.error de CodeIgniter', async () => {
    expect(await leerMensajeError(respuesta({ messages: { error: 'Placa duplicada.' } }), 'x')).toBe('Placa duplicada.')
  })

  it('toma el primer mensaje de validación cuando no hay messages.error', async () => {
    expect(await leerMensajeError(respuesta({ messages: { ruc: 'RUC inválido.' } }), 'x')).toBe('RUC inválido.')
  })

  it('cae en message y luego en el respaldo', async () => {
    expect(await leerMensajeError(respuesta({ message: 'Sesión expirada.' }), 'x')).toBe('Sesión expirada.')
    expect(await leerMensajeError(respuesta({}), 'respaldo')).toBe('respaldo')
  })

  it('devuelve el respaldo si el cuerpo no es JSON', async () => {
    const noJson = { json: async () => { throw new SyntaxError('Unexpected token <') } }
    expect(await leerMensajeError(noJson, 'respaldo')).toBe('respaldo')
  })
})

describe('apiFetch y sesión expirada', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.history.pushState({}, '', '/vehiculos')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const respuestaHttp = (status) => ({ status, ok: status < 400, clone() { return this } })

  it('marca la sesión como expirada también en lecturas GET simples', async () => {
    const asignar = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaHttp(401)))
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/vehiculos', set href(valor) { asignar(valor) } },
    })

    await apiFetch('/vehiculos?page=2')
    vi.advanceTimersByTime(150)

    expect(asignar).toHaveBeenCalledWith('/login?expired=1')
  })

  it('no redirige cuando el 401 viene del propio login', async () => {
    const asignar = vi.fn()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaHttp(401)))
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { pathname: '/login', set href(valor) { asignar(valor) } },
    })

    await apiFetch('/login', { method: 'POST', body: { usuario: 'x', password: 'y' } })
    vi.advanceTimersByTime(150)

    expect(asignar).not.toHaveBeenCalled()
  })
})

describe('apiFetch: cancelación y tiempo máximo', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

  const fetchPendiente = () => {
    const fetchMock = vi.fn((_, config) => new Promise((resolve, reject) => {
      if (config.signal.aborted) reject(new DOMException('aborted', 'AbortError'))
      else config.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
    }))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
  }

  it('mantiene el timeout aunque el consumidor aporte su propia señal', async () => {
    fetchPendiente()
    const controller = new AbortController()
    const resultado = apiFetch('/prueba-timeout', { signal: controller.signal, timeoutMs: 100 }).catch(e => e)
    await vi.advanceTimersByTimeAsync(101)
    expect((await resultado).message).toContain('tardó demasiado')
    expect(controller.signal.aborted).toBe(false)
  })

  it('distingue una cancelación voluntaria de un fallo de conexión', async () => {
    fetchPendiente()
    const controller = new AbortController()
    const resultado = apiFetch('/prueba-cancelar', { signal: controller.signal }).catch(e => e)
    controller.abort()
    expect((await resultado).name).toBe('AbortError')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('respeta señales que ya estaban canceladas', async () => {
    fetchPendiente()
    const controller = new AbortController()
    controller.abort()
    await expect(apiFetch('/prueba-pre-cancelada', { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' })
  })

  it('cancela las consultas de la sesión anterior al cerrarla', async () => {
    const fetchMock = fetchPendiente()
    const resultado = apiFetch('/datos-sesion-anterior').catch(e => e)
    limpiarDatosLocales()
    await resultado
    expect(fetchMock.mock.calls[0][1].signal.aborted).toBe(true)
  })

  it('al iniciar otra sesión borra la caché sin cancelar el cuerpo del login', async () => {
    setCachedData('/asociaciones', [{ id: 123 }])
    let signal
    vi.stubGlobal('fetch', vi.fn(async (_, config) => {
      signal = config.signal
      return new Response(JSON.stringify({ data: { id: 2 } }), { status: 200 })
    }))
    const respuesta = await apiFetch('/login', { method: 'POST', body: {} })
    expect(signal.aborted).toBe(false)
    expect(await respuesta.json()).toEqual({ data: { id: 2 } })
    expect(getCachedData('/asociaciones')).toBeNull()
  })
})
