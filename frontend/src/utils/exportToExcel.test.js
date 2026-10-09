import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportToExcel } from './exportToExcel'
import { apiFetch } from '../config/api'
import { showError } from './SwalUtil'

vi.mock('../config/api', () => ({ apiFetch: vi.fn() }))
vi.mock('./SwalUtil', () => ({ loading: vi.fn(), closeLoading: vi.fn(), showError: vi.fn() }))
vi.mock('sweetalert2', () => ({ default: { update: vi.fn() } }))

describe('Excel por bloques', () => {
  let blob
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    vi.stubGlobal('Blob', class {
      constructor(parts) { this.texto = parts.map(p => p?.texto ?? String(p)).join('') }
    })
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL(value) { blob = value; return 'blob:prueba' }
      static revokeObjectURL() {}
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    blob = null
  })
  afterEach(() => {
    // Ejecutar la liberación del blob antes de retirar el mock de URL.
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('descarga todas las páginas en orden y conserva documentos como texto', async () => {
    apiFetch.mockImplementation(async url => {
      const page = Number(new URL(url, 'http://local').searchParams.get('page'))
      return { ok: true, json: async () => ({ data: [{ documento: page === 1 ? '00123456' : '00987654' }], meta: { total: 2, porPagina: 1 } }) }
    })
    await exportToExcel({ columns: [{ header: 'N°', render: (_, __, i) => i + 1 }, { header: 'DNI', key: 'documento', isText: true }],
      data: { endpoint: '/personas', params: { estado: 'ACTIVO' }, opciones: { silencioso: true } } })
    expect(apiFetch).toHaveBeenCalledTimes(2)
    expect(blob.texto).toContain('Total registros: 2')
    expect(blob.texto.indexOf('00123456')).toBeLessThan(blob.texto.indexOf('00987654'))
    expect(blob.texto).toContain('mso-number-format:')
  })

  it('no descarga un archivo parcial si la siguiente página falla', async () => {
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ dni: '12345678' }], meta: { total: 2, porPagina: 1 } }) })
      .mockResolvedValueOnce({ ok: false, status: 500 })
    await exportToExcel({ columns: [{ header: 'DNI', key: 'dni' }], data: { endpoint: '/personas', opciones: { silencioso: true } } })
    expect(blob).toBeNull()
    expect(showError).toHaveBeenCalledWith('Descarga no completada', expect.any(String))
  })
})
