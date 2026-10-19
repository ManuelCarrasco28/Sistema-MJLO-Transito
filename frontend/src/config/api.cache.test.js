import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiFetch } from './api'

const json = (cuerpo, estado = 200) => new Response(JSON.stringify(cuerpo), { status: estado, headers: { 'Content-Type': 'application/json' } })
const URL_LISTA = '/pagos?page=1&porPagina=5'

describe('lecturas guardadas con refresco en segundo plano', () => {
  let fetchMock

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T10:00:00'))
    window.dispatchEvent(new Event('mjlo:limpiar-sesion'))
    fetchMock = vi.fn(async () => json({ v: 1 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('sirve un listado repetido sin volver a pedirlo durante los primeros 15 segundos', async () => {
    await apiFetch(URL_LISTA, { signal: new AbortController().signal })
    vi.advanceTimersByTime(10000)
    const segunda = await apiFetch(URL_LISTA, { signal: new AbortController().signal })
    expect(await segunda.json()).toEqual({ v: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('pasados 15 segundos muestra lo guardado, refresca en segundo plano y avisa si algo cambió', async () => {
    const aviso = vi.fn()
    window.addEventListener('mjlo:datos-nuevos', aviso)
    await apiFetch(URL_LISTA)
    fetchMock.mockImplementation(async () => json({ v: 2 }))
    vi.advanceTimersByTime(20000)

    const inmediata = await apiFetch(URL_LISTA)
    expect(await inmediata.json()).toEqual({ v: 1 })
    await vi.waitFor(() => expect(aviso).toHaveBeenCalledTimes(1))
    expect(aviso.mock.calls[0][0].detail.endpoint).toBe(URL_LISTA)

    const actualizada = await apiFetch(URL_LISTA)
    expect(await actualizada.json()).toEqual({ v: 2 })
    window.removeEventListener('mjlo:datos-nuevos', aviso)
  })

  it('no avisa cuando el dato sigue igual', async () => {
    const aviso = vi.fn()
    window.addEventListener('mjlo:datos-nuevos', aviso)
    await apiFetch(URL_LISTA)
    vi.advanceTimersByTime(20000)
    await apiFetch(URL_LISTA)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    expect(aviso).not.toHaveBeenCalled()
    window.removeEventListener('mjlo:datos-nuevos', aviso)
  })

  it('un cambio (crear, editar o eliminar) borra todo lo guardado', async () => {
    await apiFetch(URL_LISTA)
    await apiFetch('/vehiculos', { method: 'POST', body: { placa: 'ABC123' } })
    await apiFetch(URL_LISTA)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('descarta un refresco que empezó antes de un cambio', async () => {
    const aviso = vi.fn()
    window.addEventListener('mjlo:datos-nuevos', aviso)
    await apiFetch(URL_LISTA)
    vi.advanceTimersByTime(20000)

    let soltar
    fetchMock.mockImplementationOnce(() => new Promise((resolver) => { soltar = () => resolver(json({ v: 'anterior' })) }))
    await apiFetch(URL_LISTA) // inicia el refresco, que queda en espera
    fetchMock.mockImplementation(async () => json({ v: 'nuevo' }))
    await apiFetch('/vehiculos', { method: 'POST', body: {} }) // un cambio borra lo guardado
    soltar()
    await Promise.resolve()
    await Promise.resolve()

    expect(aviso).not.toHaveBeenCalled()
    const siguiente = await apiFetch(URL_LISTA)
    expect(await siguiente.json()).toEqual({ v: 'nuevo' })
    window.removeEventListener('mjlo:datos-nuevos', aviso)
  })

  it('las fichas individuales usadas para editar siempre van al servidor', async () => {
    await apiFetch('/vehiculos/123')
    await apiFetch('/vehiculos/123')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('el arqueo diario siempre va al servidor', async () => {
    await apiFetch('/pagos/arqueo-diario?fecha=2026-10-18')
    await apiFetch('/pagos/arqueo-diario?fecha=2026-10-18')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('las exportaciones piden con sinCache y no usan ni dejan lo guardado', async () => {
    await apiFetch(URL_LISTA)
    await apiFetch(URL_LISTA, { sinCache: true })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const usada = fetchMock.mock.calls[1][1]
    expect(usada.sinCache).toBeUndefined()
  })

  it('no guarda respuestas que no son JSON', async () => {
    fetchMock.mockImplementation(async () => new Response('archivo', { status: 200, headers: { 'Content-Type': 'application/pdf' } }))
    await apiFetch(URL_LISTA)
    await apiFetch(URL_LISTA)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('no guarda las respuestas con error', async () => {
    fetchMock.mockImplementation(async () => json({ message: 'error' }, 500))
    await apiFetch(URL_LISTA)
    await apiFetch(URL_LISTA)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('pasados 10 minutos vuelve a pedir el dato completo', async () => {
    await apiFetch(URL_LISTA)
    vi.advanceTimersByTime(11 * 60 * 1000)
    await apiFetch(URL_LISTA)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('cerrar la sesión borra lo guardado', async () => {
    await apiFetch(URL_LISTA)
    window.dispatchEvent(new Event('mjlo:limpiar-sesion'))
    await apiFetch(URL_LISTA)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('las rutas que cambian solas (notificaciones) no se guardan', async () => {
    await apiFetch('/notificaciones?page=1')
    await apiFetch('/notificaciones?page=1')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

describe('control de ediciones simultáneas', () => {
  let fetchMock
  const respuestaConVersion = (version) => json({ data: { id: 14070, uuid: 'abc-1', placa: 'M6Y544', versionRegistro: version } })

  beforeEach(() => {
    window.dispatchEvent(new Event('mjlo:limpiar-sesion'))
    fetchMock = vi.fn(async () => respuestaConVersion('100.5'))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  const cabecera = (llamada) => fetchMock.mock.calls[llamada][1].headers['X-Version-Registro']
  const cuerpo = (llamada) => JSON.parse(fetchMock.mock.calls[llamada][1].body)

  it('envía como cabecera la versión que trae el formulario y la quita del cuerpo', async () => {
    await apiFetch('/vehiculos/14070', { method: 'PUT', body: { placa: 'M6Y544', versionRegistro: '77.1' } })
    expect(cabecera(0)).toBe('77.1')
    expect(cuerpo(0)).toEqual({ placa: 'M6Y544' })
  })

  it('usa la versión de la última lectura del registro cuando el formulario no la trae', async () => {
    await apiFetch('/vehiculos/14070')
    await apiFetch('/vehiculos/14070', { method: 'PUT', body: { placa: 'M6Y544' } })
    expect(cabecera(1)).toBe('100.5')
  })

  it('también reconoce el registro por su uuid', async () => {
    await apiFetch('/vehiculos/14070')
    await apiFetch('/vehiculos/abc-1', { method: 'PUT', body: { placa: 'M6Y544' } })
    expect(cabecera(1)).toBe('100.5')
  })

  it('no envía versión de un registro que nunca se leyó', async () => {
    await apiFetch('/vehiculos/999', { method: 'PUT', body: { placa: 'X' } })
    expect(cabecera(0)).toBeUndefined()
  })

  it('tras guardar bien se olvida la versión anterior', async () => {
    await apiFetch('/vehiculos/14070')
    fetchMock.mockImplementation(async () => json({ message: 'ok' }))
    await apiFetch('/vehiculos/14070', { method: 'PUT', body: { placa: 'M6Y544' } })
    await apiFetch('/vehiculos/14070', { method: 'PUT', body: { placa: 'M6Y544' } })
    expect(cabecera(2)).toBeUndefined()
  })

  it('ante un conflicto (409) descarta lo guardado y avisa a las pantallas para que relean', async () => {
    const aviso = vi.fn()
    window.addEventListener('mjlo:datos-nuevos', aviso)
    fetchMock.mockImplementation(async () => json({ messages: { error: 'Otra persona modificó este registro' } }, 409))
    const respuesta = await apiFetch('/vehiculos/14070', { method: 'PUT', body: { placa: 'M6Y544', versionRegistro: '1' } })
    expect(respuesta.status).toBe(409)
    expect(aviso).toHaveBeenCalledTimes(1)
    expect(aviso.mock.calls[0][0].detail.endpoint).toBe('/vehiculos/14070')
    window.removeEventListener('mjlo:datos-nuevos', aviso)
  })

  it('no manda versión en las lecturas ni en los registros enviados sin versión', async () => {
    await apiFetch('/vehiculos/14070')
    expect(fetchMock.mock.calls[0][1].headers['X-Version-Registro']).toBeUndefined()
  })
})

describe('fallos y varias pestañas', () => {
  let fetchMock

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-18T10:00:00'))
    window.dispatchEvent(new Event('mjlo:limpiar-sesion'))
    fetchMock = vi.fn(async () => json({ v: 1 }))
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('si el refresco en segundo plano falla, deja de mostrar lo guardado', async () => {
    await apiFetch(URL_LISTA)
    vi.advanceTimersByTime(20000)
    fetchMock.mockImplementation(async () => { throw new TypeError('sin conexión') })
    await apiFetch(URL_LISTA) // se muestra lo guardado y se intenta refrescar
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    await Promise.resolve()
    fetchMock.mockImplementation(async () => json({ v: 2 }))
    const siguiente = await apiFetch(URL_LISTA)
    expect(await siguiente.json()).toEqual({ v: 2 })
  })

  it('si el servidor responde con error al refrescar, tampoco se sigue mostrando lo viejo', async () => {
    await apiFetch(URL_LISTA)
    vi.advanceTimersByTime(20000)
    fetchMock.mockImplementation(async () => json({ message: 'error' }, 500))
    await apiFetch(URL_LISTA)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await Promise.resolve()
    await Promise.resolve()
    await apiFetch(URL_LISTA)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it.skipIf(typeof BroadcastChannel === 'undefined')('un cambio hecho en otra pestaña borra lo guardado y avisa', async () => {
    const aviso = vi.fn()
    window.addEventListener('mjlo:datos-nuevos', aviso)
    await apiFetch(URL_LISTA)
    const otraPestana = new BroadcastChannel('mjlo-datos')
    otraPestana.postMessage({ endpoint: '/pagos/5' })
    await vi.waitFor(() => expect(aviso).toHaveBeenCalledTimes(1))
    expect(aviso.mock.calls[0][0].detail.endpoint).toBe('/pagos/5')
    await apiFetch(URL_LISTA)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    otraPestana.close()
    window.removeEventListener('mjlo:datos-nuevos', aviso)
  })

  it.each([
    ['/vehiculos?page=1&porPagina=5', 1],
    ['/pagos/estadisticas', 1],
    ['/usuarios', 1],
    ['/asociaciones', 1],
    ['/inspecciones/certicav-solicitudes', 2],
    ['/vehiculos/5', 2],
    ['/pagos/arqueo-diario?fecha=2026-10-18', 2],
  ])('clasificación de %s: peticiones reales en 2 lecturas = %i', async (ruta, esperadas) => {
    await apiFetch(ruta)
    await apiFetch(ruta)
    expect(fetchMock).toHaveBeenCalledTimes(esperadas)
  })
})
