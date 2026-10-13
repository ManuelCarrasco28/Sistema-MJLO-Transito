import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchTodasLasFilas } from './descargaCompleta'
import { apiFetch } from '../config/api'
import { loading } from './SwalUtil'

vi.mock('../config/api', () => ({ apiFetch: vi.fn() }))
vi.mock('./SwalUtil', () => ({ loading: vi.fn(), closeLoading: vi.fn() }))
vi.mock('sweetalert2', () => ({ default: { update: vi.fn() } }))

const respuesta = (data, total = 6) => ({ ok: true, json: async () => ({ data, meta: { total, porPagina: 2 } }) })

describe('descargas por páginas', () => {
  beforeEach(() => vi.clearAllMocks())

  it('conserva el orden aunque las respuestas lleguen fuera de orden', async () => {
    apiFetch.mockImplementation(async url => {
      const pagina = Number(new URL(url, 'http://local').searchParams.get('page'))
      if (pagina === 2) await new Promise(r => setTimeout(r, 10))
      return respuesta([pagina * 2 - 1, pagina * 2])
    })
    expect(await fetchTodasLasFilas('/personas', {}, { porPagina: 2, silencioso: true })).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('procesa por bloques sin devolver ni acumular el padrón completo', async () => {
    apiFetch.mockImplementation(async url => {
      const pagina = Number(new URL(url, 'http://local').searchParams.get('page'))
      return respuesta([pagina * 2 - 1, pagina * 2])
    })
    const procesarPagina = vi.fn()
    expect(await fetchTodasLasFilas('/personas', {}, { procesarPagina, concurrencia: 1, silencioso: true })).toEqual([])
    expect(procesarPagina.mock.calls.map(c => c[1])).toEqual([1, 2, 3])
  })

  it('cancela las otras peticiones al fallar una página y no entrega un archivo parcial', async () => {
    let signalPendiente
    apiFetch.mockImplementation(async (url, opciones) => {
      const pagina = Number(new URL(url, 'http://local').searchParams.get('page'))
      if (pagina === 1) return respuesta([1, 2])
      if (pagina === 2) {
        await new Promise(r => setTimeout(r, 5))
        return { ok: false, status: 500 }
      }
      signalPendiente = opciones.signal
      return new Promise((_, reject) => opciones.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))
    })
    await expect(fetchTodasLasFilas('/personas', {}, { concurrencia: 2, silencioso: true })).rejects.toThrow('HTTP 500')
    expect(signalPendiente.aborted).toBe(true)
  })

  it('rechaza un PDF excesivo después de leer solamente la primera página', async () => {
    apiFetch.mockResolvedValue(respuesta([1, 2], 30000))
    await expect(fetchTodasLasFilas('/personas', {}, { maxFilas: 10000, silencioso: true })).rejects.toThrow('use Excel')
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('el botón Cancelar detiene la descarga sin entregar registros parciales', async () => {
    apiFetch.mockResolvedValue(respuesta([1, 2]))
    loading.mockImplementationOnce((_titulo, _texto, opciones) => opciones.onCancel())
    await expect(fetchTodasLasFilas('/personas')).rejects.toMatchObject({ name: 'AbortError' })
    expect(apiFetch).toHaveBeenCalledTimes(1)
  })

  it('rechaza páginas vacías antes de alcanzar el total anunciado', async () => {
    apiFetch.mockResolvedValueOnce(respuesta([1, 2], 4)).mockResolvedValueOnce(respuesta([], 4))
    await expect(fetchTodasLasFilas('/personas', {}, { silencioso: true })).rejects.toThrow('incompleta')
  })

  it('rechaza una primera página recortada y un total que cambia', async () => {
    apiFetch.mockResolvedValueOnce(respuesta([1], 4))
    await expect(fetchTodasLasFilas('/personas', {}, { silencioso: true })).rejects.toThrow('incompleta')
    apiFetch.mockResolvedValueOnce(respuesta([1, 2], 4)).mockResolvedValueOnce(respuesta([3, 4], 5))
    await expect(fetchTodasLasFilas('/personas', {}, { silencioso: true })).rejects.toThrow('cambiaron')
  })
})
