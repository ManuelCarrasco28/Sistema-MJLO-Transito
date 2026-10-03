import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  avisarPermisoActualizado,
  guardarBorradorPermiso,
  leerBorradorPermiso,
  limpiarBorradorPermiso,
} from './borradorPermiso'

describe('borradorPermiso', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('guarda y recupera el borrador', () => {
    guardarBorradorPermiso({ numeroAutorizacion: 'A-001', vehiculoPlaca: 'ABC-123' })

    expect(leerBorradorPermiso()).toEqual({ numeroAutorizacion: 'A-001', vehiculoPlaca: 'ABC-123' })
    expect(localStorage.getItem('mjlo_volver_a_datos')).not.toBeNull()
  })

  it('devuelve null si no hay borrador', () => {
    expect(leerBorradorPermiso()).toBeNull()
  })

  it('limpiar elimina el borrador de ambos almacenamientos', () => {
    guardarBorradorPermiso({ id: 1 })
    limpiarBorradorPermiso()

    expect(sessionStorage.getItem('mjlo_permiso_borrador')).toBeNull()
    expect(localStorage.getItem('mjlo_permiso_borrador')).toBeNull()
    expect(leerBorradorPermiso()).toBeNull()
  })

  it('un borrador corrupto no rompe la pantalla: avisa y devuelve null', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    sessionStorage.setItem('mjlo_permiso_borrador', '{no es json')

    expect(leerBorradorPermiso()).toBeNull()
    expect(aviso).toHaveBeenCalledOnce()
  })

  it('si el almacenamiento falla (cuota llena) no lanza y deja registro', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError')
    })

    expect(() => guardarBorradorPermiso({ id: 1 })).not.toThrow()
    expect(aviso).toHaveBeenCalled()
  })

  it('avisarPermisoActualizado deja la marca para otras pestañas', () => {
    avisarPermisoActualizado()

    expect(localStorage.getItem('mjlo_permisos_updated')).not.toBeNull()
  })
})
