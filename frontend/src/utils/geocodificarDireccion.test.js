import { describe, it, expect } from 'vitest'
import { partesDeDireccion, consultasDeDireccion, buscarCoordenadasDeDireccion } from './geocodificarDireccion'

const SUNAT = 'CAL.LOS PALTOS MZA. Q2 LOTE. 09 P.J.  VILLA HERMOSA SECTOR IV  LAMBAYEQUE - CHICLAYO - JOSE LEONARDO ORTIZ'

describe('geocodificarDireccion', () => {
  it('separa una dirección de SUNAT en calle, barrio y ubigeo, sin manzana ni lote', () => {
    expect(partesDeDireccion(SUNAT)).toEqual({
      calle: 'Calle Los Paltos', barrio: 'Villa Hermosa', distrito: 'Jose Leonardo Ortiz',
      provincia: 'Chiclayo', departamento: 'Lambayeque',
    })
  })

  it('arma las consultas de la más precisa a la más general', () => {
    const consultas = consultasDeDireccion(SUNAT)
    expect(consultas[0]).toEqual({ texto: 'Calle Los Paltos, Villa Hermosa, Jose Leonardo Ortiz, Chiclayo, Lambayeque, Perú', aproximada: false })
    expect(consultas.at(-1).aproximada).toBe(true)
    expect(consultas.at(-1).texto).toBe('Jose Leonardo Ortiz, Chiclayo, Lambayeque, Perú')
  })

  it('usa José Leonardo Ortiz como distrito cuando la dirección no lo trae', () => {
    const consultas = consultasDeDireccion('AV. BOLOGNESI 412')
    expect(consultas[0].texto).toBe('Avenida Bolognesi 412, José Leonardo Ortiz, Chiclayo, Lambayeque, Perú')
  })

  it('prueba las consultas en orden y marca como aproximado lo hallado por barrio o distrito', async () => {
    const pedidos = []
    const fetchFalso = async (url) => {
      pedidos.push(decodeURIComponent(url.split('q=')[1]))
      // Solo el barrio existe en el mapa
      const hallado = pedidos.at(-1).startsWith('Villa Hermosa')
      return { json: async () => (hallado ? [{ lat: '-6.77', lon: '-79.84' }] : []) }
    }
    const resultado = await buscarCoordenadasDeDireccion(SUNAT, fetchFalso)
    expect(resultado).toEqual({ lat: -6.77, lng: -79.84, aproximada: true })
    expect(pedidos.length).toBe(3)
  })

  it('devuelve null si ninguna consulta encuentra nada', async () => {
    const resultado = await buscarCoordenadasDeDireccion(SUNAT, async () => ({ json: async () => [] }))
    expect(resultado).toBeNull()
  })
})
