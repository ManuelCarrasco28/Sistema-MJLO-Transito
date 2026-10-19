// Las direcciones de SUNAT y de los trámites traen manzana, lote, «P.J.», sector y el trío «DEPARTAMENTO - PROVINCIA -
// DISTRITO»: así el buscador de mapas no las encuentra. Se limpian y se prueban consultas cada vez más generales
// (calle + barrio → barrio → calle → distrito); las últimas son aproximadas y el usuario ajusta el pin.

const DEPARTAMENTOS = 'AMAZONAS|ANCASH|APURIMAC|AREQUIPA|AYACUCHO|CAJAMARCA|CALLAO|CUSCO|HUANCAVELICA|HUANUCO|ICA|JUNIN|LA LIBERTAD|LAMBAYEQUE|LIMA|LORETO|MADRE DE DIOS|MOQUEGUA|PASCO|PIURA|PUNO|SAN MARTIN|TACNA|TUMBES|UCAYALI'

const ABREVIATURAS = [
  [/^(CAL|CALLE)\.?\s*/i, 'Calle '],
  [/^(AV|AVDA|AVENIDA)\.?\s*/i, 'Avenida '],
  [/^(JR|JIRON|JIRÓN)\.?\s*/i, 'Jirón '],
  [/^(PSJE|PJE|PASAJE)\.?\s*/i, 'Pasaje '],
]

const titulo = (texto) => texto
  .toLowerCase()
  .replace(/(^|[\s.-])([a-záéíóúñ])/g, (_, separador, letra) => separador + letra.toUpperCase())
  .replace(/^./, (c) => c.toUpperCase())

/**
 * Separa una dirección en calle, barrio, distrito, provincia y departamento.
 * @returns {{calle: string, barrio: string, distrito: string, provincia: string, departamento: string}}
 */
export function partesDeDireccion(direccion) {
  let resto = String(direccion || '').replace(/\s+/g, ' ').trim()
  let departamento = ''
  let provincia = ''
  let distrito = ''

  // «... LAMBAYEQUE - CHICLAYO - JOSE LEONARDO ORTIZ» al final
  const cola = resto.match(new RegExp(`\\s*\\b(${DEPARTAMENTOS})\\s+-\\s+([A-ZÁÉÍÓÚÑ ]+?)\\s+-\\s+([A-ZÁÉÍÓÚÑ ]+?)\\s*$`, 'i'))
  if (cola) {
    departamento = cola[1]
    provincia = cola[2]
    distrito = cola[3]
    resto = resto.slice(0, cola.index).trim()
  }

  // Manzana, lote y número de la vivienda no existen en los mapas
  resto = resto
    .replace(/\bMZA?\.?\s*[A-Z0-9-]+\b/gi, ' ')
    .replace(/\bLOTE?\.?\s*[A-Z0-9-]+\b/gi, ' ')
    .replace(/\bLT\.?\s*[A-Z0-9-]+\b/gi, ' ')
    .replace(/\bNRO\.?\s*/gi, ' ')
    .replace(/\bS\/N\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Calle y barrio: lo que va antes y después de «P.J.», «URB.», «AA.HH.», «COOP.»
  let calle = resto
  let barrio = ''
  const marca = resto.match(/\b(P\.?\s?J\.?|URB\.?|AA\.?\s?HH\.?|COOP\.?|ASOC\.?|RES\.?)\s+/i)
  if (marca) {
    calle = resto.slice(0, marca.index).trim()
    barrio = resto.slice(marca.index + marca[0].length).trim()
  }
  barrio = barrio.replace(/\bSECTOR\b.*$/i, '').replace(/\bETAPA\b.*$/i, '').trim()

  for (const [patron, reemplazo] of ABREVIATURAS) {
    if (patron.test(calle)) {
      calle = calle.replace(patron, reemplazo)
      break
    }
  }

  return {
    calle: calle ? titulo(calle) : '',
    barrio: barrio ? titulo(barrio) : '',
    distrito: distrito ? titulo(distrito) : '',
    provincia: provincia ? titulo(provincia) : '',
    departamento: departamento ? titulo(departamento) : '',
  }
}

/**
 * Consultas de la más precisa a la más general.
 * @returns {{texto: string, aproximada: boolean}[]}
 */
export function consultasDeDireccion(direccion, { distritoPorDefecto = 'José Leonardo Ortiz', provinciaPorDefecto = 'Chiclayo', departamentoPorDefecto = 'Lambayeque' } = {}) {
  const p = partesDeDireccion(direccion)
  const distrito = p.distrito || distritoPorDefecto
  const provincia = p.provincia || provinciaPorDefecto
  const departamento = p.departamento || departamentoPorDefecto
  const lugar = [distrito, provincia, departamento, 'Perú'].join(', ')

  const consultas = []
  const agregar = (partes, aproximada) => {
    const texto = partes.filter(Boolean).join(', ')
    if (texto && !consultas.some((c) => c.texto === texto)) consultas.push({ texto, aproximada })
  }
  agregar([p.calle, p.barrio, lugar], false)
  agregar([p.calle, lugar], false)
  agregar([p.barrio, lugar], true)
  agregar([lugar], true)
  return consultas
}

/**
 * Busca coordenadas en Nominatim (OpenStreetMap) probando las consultas en orden.
 * @returns {Promise<{lat: number, lng: number, aproximada: boolean} | null>}
 */
export async function buscarCoordenadasDeDireccion(direccion, fetchFn = fetch) {
  for (const consulta of consultasDeDireccion(direccion)) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=pe&q=${encodeURIComponent(consulta.texto)}`
    const respuesta = await fetchFn(url)
    const resultados = await respuesta.json()
    if (resultados?.length) {
      return { lat: parseFloat(resultados[0].lat), lng: parseFloat(resultados[0].lon), aproximada: consulta.aproximada }
    }
  }
  return null
}
