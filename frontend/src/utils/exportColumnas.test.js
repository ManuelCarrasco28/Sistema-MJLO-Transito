import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Exercise the actual column renderers used by each page, without mounting its entire workflow.
const columnas = (modulo) => {
  const source = readFileSync(resolve(process.cwd(), 'src/pages', `${modulo}.jsx`), 'utf8')
  const start = source.indexOf('const handleExportExcel')
  const match = source.slice(start).match(/columns:\s*\[([\s\S]*?)^\s*\],/m)
  return Function(`return [${match[1]}]`)()
}
describe('columnas de exportación de módulos', () => {
  it('no repite encabezados en ningún padrón', () => {
    for (const module of ['Vehiculos', 'Inspecciones', 'CursosSeguridad', 'Documentos', 'Asociaciones', 'Permisos', 'Pagos', 'Retenciones', 'Trabajadores', 'Operativos', 'Papeletas']) {
      const headers = columnas(module).map(c => c.header)
      expect(new Set(headers).size, module).toBe(headers.length)
    }
  })
  it('conserva todas las infracciones sin duplicar el monto de la papeleta', () => {
    const cols = columnas('Papeletas')
    const p = { detalles: [{ codigo: 'G-04', descripcion: 'Primera', gravedad: 'GRAVE' }, { codigo: 'M-01', descripcion: 'Segunda', gravedad: 'MUY GRAVE' }], montoTotal: 963 }
    const value = header => cols.find(c => c.header === header).render(null, p)
    expect(value('CÓDIGOS DE INFRACCIÓN')).toBe('G-04\nM-01')
    expect(value('DESCRIPCIONES DE INFRACCIÓN')).toContain('Segunda')
    expect(value('MONTO (S/)')).toContain('963')
  })
  it('no confunde NO con verdadero ni el texto cero con acceso activo', () => {
    const retained = columnas('Papeletas').find(c => c.header === 'VEHÍCULO RETENIDO')
    expect(retained.render(null, { vehiculoRetenido: 'NO' })).toBe('NO')
    expect(retained.render(null, { vehiculoRetenido: 'SI' })).toBe('SÍ')
    const access = columnas('Trabajadores').find(c => c.header === 'TIENE ACCESO')
    expect(access.render(null, { tiene_cuenta: '0' })).toBe('NO')
    expect(access.render(null, { tiene_cuenta: '1' })).toBe('SÍ')
  })
  it('no inventa series de CERTICAV', () => {
    const serie = columnas('Inspecciones').find(c => c.header === 'SERIE CERTICAV')
    expect(serie.key).toBe('numeroSerieCerticav')
    expect(serie.render).toBeUndefined()
  })
})
