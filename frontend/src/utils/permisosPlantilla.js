/**
 * Genera una plantilla HTML oficial estructurada para el cuerpo del trámite / permiso
 */
export function generarPlantillaCuerpo(data = {}) {
  const empresa = data.solicitanteNombre || 'EMPRESA / ADMINISTRADO'
  const doc = data.solicitanteDocumento || '—'
  const exp = data.expediente || 'S/N'
  const reg = data.registroNumero || 'S/N'
  const asunto = data.asunto || 'AUTORIZACIÓN MUNICIPAL DE OPERACIÓN Y TRÁNSITO'
  const placa = data.vehiculoPlaca || '—'
  const zona = data.zonaCirculacion || 'Anillo Vial - Distrito de José Leonardo Ortiz'
  const horario = data.horarioInicio && data.horarioFin ? `${data.horarioInicio} - ${data.horarioFin}` : '16:00:00 - 05:00:00'
  const recibo = data.reciboIngresoNumero || 'S/N'
  const monto = data.reciboIngresoMonto ? `S/ ${Number(data.reciboIngresoMonto).toFixed(2)}` : 'S/ 1030.00'

  return `
<p><strong>SUBGERENCIA DE TRÁNSITO, TRANSPORTE Y SEGURIDAD VIAL</strong></p>
<p><strong>EXPEDIENTE UTD N°:</strong> ${exp} &nbsp;|&nbsp; <strong>REGISTRO:</strong> ${reg}</p>
<p><strong>ADMINISTRADO / RAZÓN SOCIAL:</strong> <strong>${empresa}</strong> &nbsp;(DOC: ${doc})</p>
<p><strong>ASUNTO:</strong> ${asunto}</p>
<hr />
<p>Se otorga la presente autorización municipal en mérito a la evaluación técnica y legal favorable, de conformidad con el Texto Único de Procedimientos Administrativos (TUPA 2020) y las Ordenanzas Municipales vigentes del Distrito de José Leonardo Ortiz.</p>
<table border="1" style="width:100%; border-collapse:collapse; margin: 10px 0; font-size: 11px;">
  <thead>
    <tr style="background-color: #f1f5f9; text-align: left;">
      <th style="padding: 6px 10px;">UNIDAD / PLACA</th>
      <th style="padding: 6px 10px;">ZONA / RECORRIDO</th>
      <th style="padding: 6px 10px;">HORARIO AUTORIZADO</th>
      <th style="padding: 6px 10px;">DERECHO DE PAGO</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 6px 10px; font-weight: bold;">${placa}</td>
      <td style="padding: 6px 10px;">${zona}</td>
      <td style="padding: 6px 10px;">${horario}</td>
      <td style="padding: 6px 10px; color: #16a34a; font-weight: bold;">REC. ${recibo} (${monto})</td>
    </tr>
  </tbody>
</table>
<p><strong>OBLIGACIONES Y CONDICIONES DEL SERVICIO:</strong></p>
<ul>
  <li>La unidad autorizada debe portar obligatoriamente la copia física de esta resolución.</li>
  <li>Queda prohibido el estacionamiento o descarga fuera de los cuadrantes y horarios establecidos.</li>
  <li>Esta credencial es de carácter intransferible y está sujeta a fiscalización inopinada por los Inspectores de Transporte.</li>
</ul>
<p><em>Dado en el Distrito de José Leonardo Ortiz a fecha de emisión legal.</em></p>
  `.trim()
}
