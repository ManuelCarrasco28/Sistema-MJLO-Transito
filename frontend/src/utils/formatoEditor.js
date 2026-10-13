// Los documentos pueden traer negrita, cursiva o subrayado como estilo en línea de un párrafo o una celda
// (style="font-weight: bold"). El editor no los reconoce como formato: el botón Negrita no los quita y los
// marca como "sin negrita". Aquí se pasan a etiquetas reales (<strong>, <em>, <u>) para que los botones
// funcionen igual en todo el texto. No cambia el aspecto del documento.

const ELEMENTOS = 'p, li, td, th, h1, h2, h3, h4, h5, h6, span, div'

function envolver(el, etiqueta) {
  const nuevo = el.ownerDocument.createElement(etiqueta)
  while (el.firstChild) nuevo.appendChild(el.firstChild)
  el.appendChild(nuevo)
}

export function normalizarFormatoEnLinea(html) {
  if (!html || typeof html !== 'string' || typeof DOMParser === 'undefined') return html
  if (!/font-weight|font-style|text-decoration/i.test(html)) return html

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html')
  doc.body.querySelectorAll(ELEMENTOS).forEach((el) => {
    const estilo = el.style
    if (!estilo || !el.getAttribute('style')) return

    const negrita = /^(bold|bolder|[6-9]00)$/i.test(estilo.fontWeight || '')
    const cursiva = /italic|oblique/i.test(estilo.fontStyle || '')
    const subrayado = /underline/i.test(estilo.textDecoration || estilo.textDecorationLine || '')

    if (negrita) { estilo.removeProperty('font-weight') }
    if (cursiva) { estilo.removeProperty('font-style') }
    if (subrayado) { estilo.removeProperty('text-decoration'); estilo.removeProperty('text-decoration-line') }

    // Orden de envoltura: <strong><em><u>texto</u></em></strong>
    if (subrayado) envolver(el, 'u')
    if (cursiva) envolver(el, 'em')
    if (negrita) envolver(el, 'strong')

    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style')
  })
  return doc.body.innerHTML
}
