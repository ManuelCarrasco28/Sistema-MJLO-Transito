import { expect, it } from 'vitest'
import { obtenerAnioSunarp, obtenerAnioFormularioVehiculo } from './anioSunarp'
it('lee variantes del año devuelto por SUNARP sin inventar uno', () => {
  for (const key of ['ano_fabricacion', 'anioFabricacion', 'añoFabricación', 'ANIO_FABRICACION', 'anio']) expect(obtenerAnioSunarp({ [key]: 2023 })).toBe('2023')
  expect(obtenerAnioSunarp({ vehiculo: { anio_fabricacion: '2021' } })).toBe('2021')
  expect(obtenerAnioSunarp({ ano_fabricacion: '0', anio: '2020' })).toBe('2020')
  expect(obtenerAnioSunarp({ serie: 'LB3G43S76VX001768' })).toBe('')
})
it('ambos formularios resuelven el mismo año y priorizan el dato SUNARP', () => {
  expect(obtenerAnioFormularioVehiculo({ serie: '123456789H1234567' })).toBe('2017')
  expect(obtenerAnioFormularioVehiculo({ ano_fabricacion: 2016, serie: '123456789H1234567' })).toBe('2016')
  expect(obtenerAnioFormularioVehiculo({ serie: '123' })).toBe('')
})
