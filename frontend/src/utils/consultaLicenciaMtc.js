export function abrirConsultaLicenciaMtc(browser = window) {
  const screen = browser.screen
  const scale = Math.max(1, browser.devicePixelRatio || 1)
  const availableWidth = screen.availWidth || browser.outerWidth || 1920 / scale
  const availableHeight = screen.availHeight || browser.outerHeight || 1040 / scale
  const outerWidth = Math.min(Math.round(680 / scale), availableWidth)
  const outerHeight = Math.min(Math.round(840 / scale), availableHeight)
  // Reservar el marco de la ventana; window.open mide el contenido.
  const width = Math.max(100, outerWidth - 4)
  const height = Math.max(100, outerHeight - 64)
  const rightMargin = Math.min(Math.round(80 / scale), Math.max(0, availableWidth - outerWidth))
  const topMargin = Math.min(Math.round(94 / scale), Math.max(0, availableHeight - outerHeight))
  const left = Math.round((screen.availLeft || 0) + availableWidth - outerWidth - rightMargin)
  const top = Math.round((screen.availTop || 0) + topMargin)

  return browser.open(
    'https://licencias.mtc.gob.pe/',
    '_blank',
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,noopener,noreferrer`,
  )
}
