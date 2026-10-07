import { beforeEach, describe, expect, it, vi } from 'vitest'
import { retirarInscripcion } from './retirarInscripcion'
import { apiFetch, invalidateCache } from '../config/api'
import { showConfirm, showError } from './SwalUtil'

vi.mock('../config/api', () => ({ apiFetch: vi.fn(), sanitizarMensaje: (mensaje) => mensaje, invalidateCache: vi.fn() }))
vi.mock('./SwalUtil', () => ({ showConfirm: vi.fn(), showError: vi.fn(), showToast: vi.fn() }))

describe('retirar inscripción', () => {
  beforeEach(() => vi.clearAllMocks())
  it('no retira cuando se cancela la confirmación', async () => {
    showConfirm.mockResolvedValue({ isConfirmed: false })
    expect(await retirarInscripcion({ idInscripcion: 12, nombres: 'Prueba' })).toBeNull()
    expect(apiFetch).not.toHaveBeenCalled()
  })
  it('usa el UUID y devuelve los cupos confirmados por el servidor', async () => {
    showConfirm.mockResolvedValue({ isConfirmed: true })
    apiFetch.mockResolvedValue({ ok: true, json: async () => ({ data: { cuposInscritos: 1 } }) })
    expect(await retirarInscripcion({ uuid: 'uuid-prueba', idInscripcion: 12 })).toEqual({ cuposInscritos: 1 })
    expect(apiFetch).toHaveBeenCalledWith('/cursos/inscripciones/uuid-prueba/retiro', { method: 'PUT' })
    expect(invalidateCache).toHaveBeenCalledWith('/pagos')
  })
  it('muestra la protección de pagos y no devuelve un retiro exitoso', async () => {
    showConfirm.mockResolvedValue({ isConfirmed: true })
    apiFetch.mockResolvedValue({ ok: false, json: async () => ({ messages: { error: 'Tiene un pago asociado.' } }) })
    expect(await retirarInscripcion({ idInscripcion: 12 })).toBeNull()
    expect(showError).toHaveBeenCalledWith('No se pudo retirar', 'Tiene un pago asociado.')
  })
  it('no envía una solicitud sin identificador', async () => {
    expect(await retirarInscripcion({})).toBeNull()
    expect(apiFetch).not.toHaveBeenCalled()
  })
})
