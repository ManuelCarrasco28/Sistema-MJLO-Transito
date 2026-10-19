import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { apiFetch, leerMensajeError } from '../../config/api'
import { showError } from '../../utils/SwalUtil'
import { formatoNumeroPapeleta } from '../../utils/numeroPapeleta'
import { formatFecha } from '../../utils/formatters'

export function PapeletaTicketPrint({ papeleta, onClose }) {
  const hoja = useRef(null)
  const cerrar = useRef(onClose)
  cerrar.current = onClose
  const [pago, setPago] = useState(null)
  const [alto, setAlto] = useState(180)

  useEffect(() => {
    let activo = true
    if (papeleta?.estado !== 'PAGADA') { cerrar.current?.(); return }
    apiFetch('/pagos?page=1&porPagina=5&papeletaId=' + encodeURIComponent(papeleta.id) + '&tipoPago=PAPELETA&estado=PAGADO', { sinCache: true })
      .then(async (res) => {
        if (!res.ok) throw new Error(await leerMensajeError(res, 'No se pudo consultar el pago.'))
        return res.json()
      })
      .then((json) => {
        if (!activo) return
        const confirmado = (json.data || []).find((p) => String(p.papeletaId) === String(papeleta.id) && p.estado === 'PAGADO' && p.numeroRecibo)
        if (!confirmado) throw new Error('No se encontró un recibo de pago confirmado para esta papeleta.')
        setPago(confirmado)
      })
      .catch((error) => { if (activo) { showError('Ticket no disponible', error.message); cerrar.current?.() } })
    return () => { activo = false }
  }, [papeleta])

  useEffect(() => {
    if (!pago) return
    let activo = true
    let frame
    const terminar = () => cerrar.current?.()
    window.addEventListener('afterprint', terminar)
    document.fonts.ready.then(() => {
      if (!activo || !hoja.current) return
      setAlto(Math.max(100, Math.ceil(hoja.current.scrollHeight * 25.4 / 96) + 10))
      frame = requestAnimationFrame(() => { if (activo) window.print() })
    })
    return () => { activo = false; cancelAnimationFrame(frame); window.removeEventListener('afterprint', terminar) }
  }, [pago])

  if (!pago) return null
  const depositos = pago.depositos || []
  const dinero = (valor) => 'S/ ' + Number(valor || 0).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const totalDeposito = depositos.reduce((total, d) => total + Number(d.montoDeposito || 0) + Number(d.montoRemolque || 0), 0)
  const campo = (nombre, valor) => valor && <p style={{ margin: '4px 0', overflowWrap: 'anywhere' }}><strong>{nombre}: </strong>{valor}</p>
  return createPortal(<>
    <style>{`
      .papeleta-ticket-portal { position: fixed; left: -10000px; top: 0; width: 72mm; }
      @media print {
        @page { size: 80mm ${alto}mm; margin: 4mm; }
        body > :not(.papeleta-ticket-portal) { display: none !important; }
        body > .papeleta-ticket-portal { display: block !important; position: static !important; width: 72mm !important; margin: 0 !important; padding: 0 !important; }
        .papeleta-ticket-portal, .papeleta-ticket-portal * { visibility: visible !important; color: #000 !important; }
      }
    `}</style>
    <article ref={hoja} className="papeleta-ticket-portal" style={{ background: '#fff', color: '#000', fontFamily: 'Arial, sans-serif', fontSize: '10pt', lineHeight: 1.3 }}>
      <header style={{ textAlign: 'center', borderBottom: '1px dashed #000', paddingBottom: 8 }}>
        <strong>MUNICIPALIDAD DISTRITAL<br />JOSÉ LEONARDO ORTIZ</strong>
        <p style={{ margin: '5px 0', fontSize: '8pt' }}>Subgerencia de Tránsito, Transporte y Seguridad Vial</p>
        <strong>CONSTANCIA DE PAGO</strong>
      </header>
      <section style={{ padding: '6px 0', borderBottom: '1px dashed #000' }}>
        {campo('Recibo', pago.numeroRecibo)}
        {campo('Fecha de pago', formatFecha(pago.fecha))}
        {campo('Hora', pago.horaPago?.slice(0, 5))}
        {campo('Papeleta', 'N.º ' + formatoNumeroPapeleta(papeleta.numeroPapeleta))}
        {campo('Placa', papeleta.vehiculoPlaca)}
        {campo('A nombre de', pago.titular || pago.pagadoPor)}
        {pago.pagadoPor !== pago.titular && campo('Pagado por', pago.pagadoPor)}
        {campo('Método', pago.metodoPago || pago.metodo)}
        {campo('N.º de operación', pago.numeroVoucher)}
      </section>
      {depositos.map((d) => <section key={d.ordenId} style={{ padding: '6px 0', borderBottom: '1px dashed #000' }}>
        <strong>DEPÓSITO MUNICIPAL</strong>
        {campo('Boleta', d.numeroBoleta)}
        {campo('Orden de libertad', d.numeroOrden)}
        {campo('Ingreso', formatFecha(d.fechaIngreso))}
        {campo('Salida', formatFecha(d.fechaSalida))}
        {campo('Días de depósito', String(d.dias))}
        {campo('Recibo del depósito', d.numeroRecibo || 'No registrado')}
        {campo('Fecha registrada del depósito', formatFecha(d.fechaPago))}
        {campo('Depósito', dinero(d.montoDeposito))}
        {Number(d.montoRemolque) > 0 && campo('Remolque', dinero(d.montoRemolque))}
      </section>)}
      <section style={{ marginTop: 8, textAlign: 'right' }}>
        <p style={{ margin: '3px 0' }}>Papeleta: {dinero(pago.montoTotal)}</p>
        {depositos.length > 0 && <p style={{ margin: '3px 0' }}>Depósito{depositos.some(d => Number(d.montoRemolque) > 0) ? ' y remolque' : ''}: {dinero(totalDeposito)}</p>}
        <p style={{ fontWeight: 'bold' }}>TOTAL PAGADO: {dinero(Number(pago.montoTotal) + totalDeposito)}</p>
      </section>
      <p style={{ marginTop: 12, fontSize: '8pt' }}>Esta constancia muestra lo registrado en el sistema. No sustituye un comprobante oficial emitido por el SAT.</p>
    </article>
  </>, document.body)
}
