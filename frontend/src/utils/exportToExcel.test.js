import { Blob as NodeBlob } from 'node:buffer'
import ExcelJS from 'exceljs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { exportToExcel, valorCeldaExcel } from './exportToExcel'
import { apiFetch } from '../config/api'
import { showError } from './SwalUtil'

vi.mock('../config/api', () => ({ apiFetch: vi.fn() }))
vi.mock('./SwalUtil', () => ({ loading: vi.fn(), closeLoading: vi.fn(), showError: vi.fn() }))
vi.mock('sweetalert2', () => ({ default: { update: vi.fn() } }))

describe('exportación XLSX', () => {
  let blob, filename
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    vi.stubGlobal('Blob', NodeBlob)
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL(value) { blob = value; return 'blob:prueba' }
      static revokeObjectURL() {}
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () { filename = this.download })
    blob = null
  })
  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  const leerLibro = async () => {
    const book = new ExcelJS.Workbook()
    await book.xlsx.load(await blob.arrayBuffer())
    return book.worksheets[0]
  }

  it('reabre un XLSX completo, en orden, con DNI textual, filtros y encabezados fijos', async () => {
    apiFetch.mockImplementation(async url => {
      const page = Number(new URL(url, 'http://local').searchParams.get('page'))
      expect(new URL(url, 'http://local').searchParams.get('estado')).toBe('ACTIVO')
      return { ok: true, json: async () => ({ data: [{ documento: page === 1 ? '00123456' : '00987654' }], meta: { total: 2, porPagina: 1 } }) }
    })
    await exportToExcel({ filename: 'Prueba.xls', sheetName: 'Prueba/Excel', columns: [{ header: 'N°', render: (_, __, i) => i + 1 }, { header: 'DNI', key: 'documento', isText: true }],
      data: { endpoint: '/personas', params: { estado: 'ACTIVO' }, opciones: { silencioso: true } } })
    expect(showError).not.toHaveBeenCalled()
    expect(filename).toBe('Prueba.xlsx')
    const sheet = await leerLibro()
    expect(sheet.getCell('B6').value).toBe('00123456')
    expect(sheet.getCell('B7').value).toBe('00987654')
    expect(sheet.getCell('B6').numFmt).toBe('@')
    expect(sheet.getCell('A3').value).toContain('Total registros: 2')
    expect(sheet.views[0].ySplit).toBe(5)
    expect(sheet.autoFilter).toBeTruthy()
  })

  it('no descarga archivos parciales ante fallo HTTP o filas faltantes', async () => {
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ dni: '12345678' }], meta: { total: 2, porPagina: 1 } }) })
      .mockResolvedValueOnce({ ok: false, status: 500 })
    await exportToExcel({ columns: [{ header: 'DNI', key: 'dni' }], data: { endpoint: '/personas', opciones: { silencioso: true } } })
    expect(blob).toBeNull()
    expect(showError).toHaveBeenCalledWith('Descarga no completada', expect.any(String))
    apiFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ data: [{ dni: '12345678' }], meta: { total: 2, porPagina: 1 } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ data: [], meta: { total: 2, porPagina: 1 } }) })
    await exportToExcel({ columns: [{ header: 'DNI', key: 'dni' }], data: { endpoint: '/personas', opciones: { silencioso: true } } })
    expect(blob).toBeNull()
  })

  it('guarda dinero numérico, vacíos reales y texto no ejecutable como fórmula', async () => {
    await exportToExcel({ columns: [{ header: 'MONTO (S/)', key: 'monto' }, { header: 'DOCUMENTO', key: 'dni', isText: true }, { header: 'NOTA', key: 'nota' }, { header: 'VACÍO', key: 'vacio' }],
      data: [{ monto: 'S/ 1,234.50', dni: '00123456', nota: '=HYPERLINK("https://example.com")' }] })
    const sheet = await leerLibro()
    expect(sheet.getCell('A6').value).toBe(1234.5)
    expect(sheet.getCell('A6').numFmt).toContain('#,##0.00')
    expect(sheet.getCell('C6').type).toBe(ExcelJS.ValueType.String)
    expect(sheet.getCell('D6').value).toBeNull()
    expect(valorCeldaExcel(0, { header: 'MONTO (S/)' })).toBe(0)
  })
})
