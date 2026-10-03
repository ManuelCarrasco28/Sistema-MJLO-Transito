import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch, leerMensajeError, sanitizarMensaje } from './api'

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
