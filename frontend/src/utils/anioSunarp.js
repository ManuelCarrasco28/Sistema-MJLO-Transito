export function obtenerAnioSunarp(datos) {
  for (const origen of [datos, datos?.vehiculo, datos?.datos_vehiculo]) {
    for (const [campo, valor] of Object.entries(origen || {})) {
      const clave = campo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/gi, '').toLowerCase()
      if (!['anofabricacion', 'aniofabricacion', 'anofab', 'aniofab', 'anio', 'ano', 'fabricationyear', 'manufactureyear'].includes(clave)) continue
      const texto = String(valor ?? '').trim()
      if (/^\d{4}$/.test(texto) && Number(texto) >= 1900 && Number(texto) <= new Date().getFullYear() + 1) return texto
    }
  }
  return ''
}

// La misma resolución usada por el modal de Vehículos: primero dato directo,
// después el año codificado en el décimo carácter de la serie (requiere revisión).
export function obtenerAnioFormularioVehiculo(datos) {
  const directo = obtenerAnioSunarp(datos)
  if (directo) return directo
  const serie = String(datos.serie || datos.vin || datos.numero_serie || datos.nro_serie || '').trim().toUpperCase()
  if (serie.length < 10) return ''
  const codigos = '123456789ABCDEFGHJKLMNPRSTVWXY'
  const index = codigos.indexOf(serie[9])
  return index < 0 ? '' : String(2001 + index)
}
