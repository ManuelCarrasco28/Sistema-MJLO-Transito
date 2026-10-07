import { expect, it } from 'vitest'
import { getCachedData, setCachedData } from '../config/api'
import { limpiarDatosLocales } from './sesionLocal'

it('elimina la caché de módulos al cerrar o expirar la sesión', () => {
  setCachedData('/asociaciones', [{ id: 1 }])
  setCachedData('/cursos-lista-inicio', [{ id: 2 }])
  expect(getCachedData('/asociaciones')).not.toBeNull()
  limpiarDatosLocales()
  expect(getCachedData('/asociaciones')).toBeNull()
  expect(getCachedData('/cursos-lista-inicio')).toBeNull()
})
