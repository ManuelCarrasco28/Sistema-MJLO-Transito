import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { isVehiculoFormal, getVehiculoDocumento, buildVehiculoQrValue } from '../../utils/vehiculos'

globalThis.React = React
const { VehiculoDetalleModal } = await import('./VehiculoDetalleModal')

it('conserva documento y fecha, separa el RUC y muestra vigencia además del resultado', () => {
  const vehiculo = {
    placa: 'TBV679', propietario: 'Persona registrada', propietarioTipoDocumento: 'DNI', propietarioDni: '74952459',
    asociacionId: 1, asociacion: 'Asociación de prueba', asociacionRuc: '20123456789',
    certicav: { resultado: 'APROBADO', estadoVigencia: 'VENCIDO', numeroRegistro: 'REG-1' },
    historialPropietarios: [{ nombre: 'Persona registrada', tipoDocumento: 'DNI', dni: '74952459', fecha_inicio: '2026-10-01', estado: 'ACTIVO' }],
  }
  const html = renderToStaticMarkup(<VehiculoDetalleModal selectedVehiculo={vehiculo} onClose={() => {}} isVehiculoFormal={isVehiculoFormal} getVehiculoDocumento={getVehiculoDocumento} buildVehiculoQrValue={buildVehiculoQrValue} />)
  expect(html).toContain('DNI: 74952459')
  expect(html).toContain('RUC de la asociación: 20123456789')
  expect(html).toContain('01/10/2026')
  expect(html).toContain('APROBADO')
  expect(html).toContain('VENCIDO')
  expect(buildVehiculoQrValue(vehiculo)).toContain('Documento propietario (DNI): 74952459')
})
