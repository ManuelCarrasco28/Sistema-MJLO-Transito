import { describe, it, expect } from 'vitest'
import { normalizarFormatoEnLinea } from './formatoEditor'

describe('normalizarFormatoEnLinea', () => {
  it('convierte la negrita en línea de un párrafo en <strong> y conserva el resto del estilo', () => {
    const html = normalizarFormatoEnLinea('<p style="text-align: center; font-weight: bold; font-size: 14px;">Título</p>')
    expect(html).toContain('<strong>Título</strong>')
    expect(html).toContain('text-align: center')
    expect(html).toContain('font-size: 14px')
    expect(html).not.toMatch(/font-weight/i)
  })

  it('convierte subrayado y cursiva en <u> y <em>', () => {
    const html = normalizarFormatoEnLinea('<p style="text-decoration: underline; font-style: italic">Texto</p>')
    expect(html).toContain('<em><u>Texto</u></em>')
    expect(html).not.toContain('style=')
  })

  it('funciona dentro de celdas de tabla', () => {
    const html = normalizarFormatoEnLinea('<table><tbody><tr><td style="padding: 6px; font-weight: bold; color: #4f46e5;">HSW329</td></tr></tbody></table>')
    expect(html).toContain('<strong>HSW329</strong>')
    expect(html).toContain('padding: 6px')
    expect(html).toMatch(/color: (#4f46e5|rgb\(79, 70, 229\))/)
  })

  it('no toca el contenido que ya usa etiquetas ni el texto vacío', () => {
    const limpio = '<p><strong>Ya en negrita</strong></p>'
    expect(normalizarFormatoEnLinea(limpio)).toBe(limpio)
    expect(normalizarFormatoEnLinea('')).toBe('')
    expect(normalizarFormatoEnLinea(null)).toBe(null)
  })
})
