/**
 * Plantillas Oficiales de Redacción Municipal para Trámites de Tránsito y Transporte
 * Municipalidad Distrital de José Leonardo Ortiz - Subgerencia de Tránsito y Transporte
 * 
 * 4 Trámites Oficiales:
 * 1. Permiso de Control Vehicular (CONTROL_VEHICULAR)
 * 2. Autorización de Carga y Descarga (CARGA_DESCARGA)
 * 3. Autorización de Uso Provisional de Vías (USO_VIAS)
 * 4. Autorización de Zonas Reservadas de Estacionamiento (ZONAS_RESERVADAS)
 */

/**
 * 1. PLANTILLA: PERMISO DE CONTROL VEHICULAR
 */
export function generarPlantillaControlVehicular(data = {}) {
  const empresa = data.solicitanteNombre || 'EMPRESA / PROPIETARIO'
  const doc = data.solicitanteDocumento || '—'
  const exp = data.expediente || data.referenciaSisgedo || 'S/N'
  const reg = data.registroNumero || 'S/N'
  const asunto = data.asunto || 'AUTORIZACIÓN MUNICIPAL DE CONTROL VEHICULAR Y CIRCULACIÓN'
  const placa = data.vehiculoPlaca || '—'
  const zona = data.zonaCirculacion || 'Anillo Vial y Cuadrantes Autorizados - Distrito de José Leonardo Ortiz'
  const horario = data.horarioInicio && data.horarioFin ? `${data.horarioInicio} - ${data.horarioFin}` : '06:00:00 - 22:00:00'
  const recibo = data.reciboIngresoNumero || 'S/N'
  const monto = (data.reciboIngresoMonto !== null && data.reciboIngresoMonto !== undefined && data.reciboIngresoMonto !== '' && Number.isFinite(Number(data.reciboIngresoMonto))) ? `S/ ${Number(data.reciboIngresoMonto).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : 'Sin pago vinculado'

  return `
<p><strong>SUBGERENCIA DE TRÁNSITO, TRANSPORTE Y SEGURIDAD VIAL</strong></p>
<p><strong>EXPEDIENTE UTD N°:</strong> ${exp} &nbsp;|&nbsp; <strong>REGISTRO:</strong> ${reg}</p>
<p><strong>ADMINISTRADO / TITULAR:</strong> <strong>${empresa}</strong> &nbsp;(DOC: ${doc})</p>
<p><strong>ASUNTO:</strong> ${asunto}</p>
<hr />
<p>Se otorga el presente <strong>PERMISO DE CONTROL VEHICULAR</strong> al vehículo identificado tras haber superado satisfactoriamente la verificación técnica de condiciones de seguridad vial, emisión de gases, documentación reglamentaria (SOAT y Certificado de Inspección Técnica Vehicular) de conformidad con la Ley General de Transporte y Tránsito Terrestre N° 27181 y el TUPA institucional.</p>
<table border="1" style="width:100%; border-collapse:collapse; margin: 10px 0; font-size: 11px;">
  <thead>
    <tr style="background-color: #f1f5f9; text-align: left;">
      <th style="padding: 6px 10px;">PLACA AUTORIZADA</th>
      <th style="padding: 6px 10px;">ÁMBITO DE CIRCULACIÓN</th>
      <th style="padding: 6px 10px;">HORARIO VÁLIDO</th>
      <th style="padding: 6px 10px;">DERECHO TUPA</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 6px 10px; font-weight: bold; color: #4f46e5;">${placa}</td>
      <td style="padding: 6px 10px;">${zona}</td>
      <td style="padding: 6px 10px;">${horario}</td>
      <td style="padding: 6px 10px; color: #16a34a; font-weight: bold;">REC. ${recibo} (${monto})</td>
    </tr>
  </tbody>
  </table>
<p><strong>CONDICIONES OBLIGATORIAS DE CONTROL:</strong></p>
<ul>
  <li>Mantener la unidad en óptimas condiciones mecánicas, eléctricas y de carrocería en estricto cumplimiento del Reglamento Nacional de Vehículos.</li>
  <li>Portar en todo momento el Certificado SOAT vigente, la Ficha Técnica de Inspección y la presente credencial de autorización física.</li>
  <li>Queda terminantemente prohibido alterar las características registrables del vehículo sin autorización expresa de la autoridad municipal.</li>
  <li>Sujeto a control e inspección inopinada permanente por el cuerpo de Inspectores de Transporte de la MDJLO.</li>
</ul>
<p><em>Expedido en el Distrito de José Leonardo Ortiz para los fines pertinentes.</em></p>
  `.trim()
}

/**
 * 2. PLANTILLA: AUTORIZACIÓN DE CARGA Y DESCARGA
 */
export function generarPlantillaCargaDescarga(data = {}) {
  const empresa = data.solicitanteNombre || 'EMPRESA / COMERCIALIZADOR'
  const doc = data.solicitanteDocumento || '—'
  const exp = data.expediente || data.referenciaSisgedo || 'S/N'
  const reg = data.registroNumero || 'S/N'
  const asunto = data.asunto || 'AUTORIZACIÓN DE CARGA Y DESCARGA EN VÍA PÚBLICA'
  const placa = data.vehiculoPlaca || data.flotaPlacas || '—'
  const zona = data.zonaCirculacion || 'Por definir'
  const horario = data.horarioInicio && data.horarioFin ? `${data.horarioInicio} - ${data.horarioFin}` : 'Por definir'
  const tonelaje = data.tonelaje || 'Por definir'
  const recibo = data.reciboIngresoNumero || 'S/N'
  const monto = (data.reciboIngresoMonto !== null && data.reciboIngresoMonto !== undefined && data.reciboIngresoMonto !== '' && Number.isFinite(Number(data.reciboIngresoMonto))) ? `S/ ${Number(data.reciboIngresoMonto).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : 'Sin pago vinculado'

  return `
<p><strong>SUBGERENCIA DE TRÁNSITO, TRANSPORTE Y SEGURIDAD VIAL</strong></p>
<p><strong>EXPEDIENTE UTD N°:</strong> ${exp} &nbsp;|&nbsp; <strong>REGISTRO:</strong> ${reg}</p>
<p><strong>ADMINISTRADO / RAZÓN SOCIAL:</strong> <strong>${empresa}</strong> &nbsp;(DOC: ${doc})</p>
<p><strong>ASUNTO:</strong> ${asunto}</p>
<hr />
<p>Se emite la presente <strong>AUTORIZACIÓN DE CARGA Y DESCARGA</strong> para el abastecimiento y despacho de mercaderías dentro del perímetro y vías autorizadas del Distrito de José Leonardo Ortiz, de conformidad con la Ordenanza Municipal reguladora del tránsito pesado y comercial.</p>
<table border="1" style="width:100%; border-collapse:collapse; margin: 10px 0; font-size: 11px;">
  <thead>
    <tr style="background-color: #f1f5f9; text-align: left;">
      <th style="padding: 6px 10px;">UNIDAD / PLACAS</th>
      <th style="padding: 6px 10px;">CAPACIDAD MÁXIMA</th>
      <th style="padding: 6px 10px;">CUADRANTE Y ZONA</th>
      <th style="padding: 6px 10px;">HORARIO PERMITIDO</th>
      <th style="padding: 6px 10px;">TASA MUNICIPAL</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 6px 10px; font-weight: bold; color: #0284c7;">${placa}</td>
      <td style="padding: 6px 10px; font-weight: bold;">${tonelaje}</td>
      <td style="padding: 6px 10px;">${zona}</td>
      <td style="padding: 6px 10px; font-weight: bold;">${horario}</td>
      <td style="padding: 6px 10px; color: #16a34a; font-weight: bold;">REC. ${recibo} (${monto})</td>
    </tr>
  </tbody>
</table>
<p><strong>CONDICIONES OBLIGATORIAS DE OPERACIÓN:</strong></p>
<ul>
  <li>Las maniobras de abastecimiento se realizarán estrictamente en el horario nocturno / madrugada fijado para no interferir con la fluidez vehicular y peatonal.</li>
  <li>Queda prohibido el estacionamiento en doble fila, sobre veredas, bermas o rampas de accesibilidad para personas con discapacidad.</li>
  <li>El administrado es responsable directo de la limpieza inmediata y retiro de cualquier residuo generado durante la maniobra de carga o descarga.</li>
  <li>Esta autorización ampara exclusivamente a los vehículos registrados y debe ser exhibida en el parabrisas de forma visible ante la Policía de Tránsito e Inspectores.</li>
</ul>
<p><em>Dado en el Distrito de José Leonardo Ortiz a fecha de emisión legal.</em></p>
  `.trim()
}

/**
 * 3. PLANTILLA: AUTORIZACIÓN DE USO PROVISIONAL DE VÍAS
 */
export function generarPlantillaUsoVias(data = {}) {
  const empresa = data.solicitanteNombre || 'SOLICITANTE / ENTIDAD EJECUTORA'
  const doc = data.solicitanteDocumento || '—'
  const exp = data.expediente || data.referenciaSisgedo || 'S/N'
  const reg = data.registroNumero || 'S/N'
  const asunto = data.asunto || 'AUTORIZACIÓN PROVISIONAL DE USO DE VÍAS PÚBLICAS'
  const ubicacion = data.ubicacion || data.zonaCirculacion || 'Vía pública solicitada - José Leonardo Ortiz'
  const horario = data.horarioInicio && data.horarioFin ? `${data.horarioInicio} - ${data.horarioFin}` : 'Por definir'
  const recibo = data.reciboIngresoNumero || 'S/N'
  const monto = (data.reciboIngresoMonto !== null && data.reciboIngresoMonto !== undefined && data.reciboIngresoMonto !== '' && Number.isFinite(Number(data.reciboIngresoMonto))) ? `S/ ${Number(data.reciboIngresoMonto).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : 'Sin pago vinculado'

  return `
<p><strong>SUBGERENCIA DE TRÁNSITO, TRANSPORTE Y SEGURIDAD VIAL</strong></p>
<p><strong>EXPEDIENTE UTD N°:</strong> ${exp} &nbsp;|&nbsp; <strong>REGISTRO:</strong> ${reg}</p>
<p><strong>SOLICITANTE / RESPONSABLE:</strong> <strong>${empresa}</strong> &nbsp;(DOC: ${doc})</p>
<p><strong>ASUNTO:</strong> ${asunto}</p>
<hr />
<p>Se otorga la <strong>AUTORIZACIÓN PROVISIONAL DE USO DE VÍAS</strong> en la calzada/acera solicitada con motivo de ejecución de obras civiles, mudanzas de gran envergadura o actividades previamente evaluadas por el equipo técnico de vialidad de la comuna leonardina.</p>
<table border="1" style="width:100%; border-collapse:collapse; margin: 10px 0; font-size: 11px;">
  <thead>
    <tr style="background-color: #f1f5f9; text-align: left;">
      <th style="padding: 6px 10px;">VÍA / TRAMO AUTORIZADO</th>
      <th style="padding: 6px 10px;">HORARIO DE OCUPACIÓN</th>
      <th style="padding: 6px 10px;">PLAN DE DESVÍO</th>
      <th style="padding: 6px 10px;">DERECHO TUPA</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 6px 10px; font-weight: bold; color: #4338ca;">${ubicacion}</td>
      <td style="padding: 6px 10px;">${horario}</td>
      <td style="padding: 6px 10px;">Conforme a plan de señalización y desvío</td>
      <td style="padding: 6px 10px; color: #16a34a; font-weight: bold;">REC. ${recibo} (${monto})</td>
    </tr>
  </tbody>
</table>
<p><strong>MEDIDAS OBLIGATORIAS DE SEGURIDAD VIAL:</strong></p>
<ul>
  <li>Instalación perimétrica de dispositivos de canalización vial: conos reflectivos, mallas de protección, cintas de seguridad y señalización vertical preventiva nocturna.</li>
  <li>Disponer de personal auxiliar (banderilleros con chaleco reflectivo) para dirigir el tránsito vehicular y resguardar la seguridad de transeúntes.</li>
  <li>Garantizar pasajes peatonales seguros e iluminados en caso de interferencia temporal de veredas.</li>
  <li>Al término de la vigencia, la vía pública debe quedar en perfecto estado de transitabilidad, limpieza y libre de cualquier desmonte o material residual.</li>
</ul>
<p><em>Dado en el Distrito de José Leonardo Ortiz a fecha de emisión legal.</em></p>
  `.trim()
}

/**
 * 4. PLANTILLA: AUTORIZACIÓN DE ZONAS RESERVADAS DE ESTACIONAMIENTO
 */
export function generarPlantillaZonasReservadas(data = {}) {
  const empresa = data.solicitanteNombre || 'INSTITUCIÓN / ESTABLECIMIENTO SOLICITANTE'
  const doc = data.solicitanteDocumento || '—'
  const exp = data.expediente || data.referenciaSisgedo || 'S/N'
  const reg = data.registroNumero || 'S/N'
  const asunto = data.asunto || 'AUTORIZACIÓN DE ZONA RESERVADA DE ESTACIONAMIENTO EN VÍA PÚBLICA'
  const ubicacion = data.ubicacion || data.zonaCirculacion || 'Por definir'
  const horario = data.horarioInicio && data.horarioFin ? `${data.horarioInicio} - ${data.horarioFin}` : 'Por definir'
  const recibo = data.reciboIngresoNumero || 'S/N'
  const monto = (data.reciboIngresoMonto !== null && data.reciboIngresoMonto !== undefined && data.reciboIngresoMonto !== '' && Number.isFinite(Number(data.reciboIngresoMonto))) ? `S/ ${Number(data.reciboIngresoMonto).toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : 'Sin pago vinculado'

  return `
<p><strong>SUBGERENCIA DE TRÁNSITO, TRANSPORTE Y SEGURIDAD VIAL</strong></p>
<p><strong>EXPEDIENTE UTD N°:</strong> ${exp} &nbsp;|&nbsp; <strong>REGISTRO:</strong> ${reg}</p>
<p><strong>ENTIDAD / ESTABLECIMIENTO:</strong> <strong>${empresa}</strong> &nbsp;(DOC: ${doc})</p>
<p><strong>ASUNTO:</strong> ${asunto}</p>
<hr />
<p>Se otorga la presente <strong>AUTORIZACIÓN DE ZONA RESERVADA DE ESTACIONAMIENTO EN VÍA PÚBLICA</strong> al establecimiento solicitante, previa inspección ocular y viabilidad técnica efectuada por la Subgerencia de Tránsito y Transporte, en salvaguarda de la fluidez del tránsito y la seguridad de los usuarios.</p>
<table border="1" style="width:100%; border-collapse:collapse; margin: 10px 0; font-size: 11px;">
  <thead>
    <tr style="background-color: #f1f5f9; text-align: left;">
      <th style="padding: 6px 10px;">FRONTIS / UBICACIÓN AUTORIZADA</th>
      <th style="padding: 6px 10px;">DIMENSIÓN Y CAJONES</th>
      <th style="padding: 6px 10px;">HORARIO DE RESERVA</th>
      <th style="padding: 6px 10px;">DERECHO DE PAGO</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 6px 10px; font-weight: bold; color: #047857;">${ubicacion}</td>
      <td style="padding: 6px 10px; font-weight: bold;">Cajón reglamentario delimitado</td>
      <td style="padding: 6px 10px;">${horario}</td>
      <td style="padding: 6px 10px; color: #16a34a; font-weight: bold;">REC. ${recibo} (${monto})</td>
    </tr>
  </tbody>
</table>
<p><strong>CONDICIONES Y OBLIGACIONES DE LA ZONA RESERVADA:</strong></p>
<ul>
  <li>Pintado y demarcación obligatoria del sardinel con los colores reglamentarios (blanco / amarillo tránsito) y líneas delimitadoras de cajón.</li>
  <li>Instalación reglamentaria de la señal vertical informativa oficial R-36 con la leyenda "ZONA RESERVADA - AUTORIZACIÓN MUNICIPAL".</li>
  <li>Queda prohibido colocar elementos no reglamentarios (cadenas, conos no autorizados, baldes, piedras u obstáculos fijos) que atenten contra la seguridad vial.</li>
  <li>Queda estrictamente prohibido el cobro de dinero o lucrar con el estacionamiento en el espacio de vía pública reservado.</li>
  <li>La autorización es de carácter precario y revocable si las necesidades del tránsito del distrito así lo ameriten.</li>
</ul>
<p><em>Dado en el Distrito de José Leonardo Ortiz a fecha de emisión legal.</em></p>
  `.trim()
}

/**
 * Despachador maestro: genera la plantilla correspondiente según el tipo de trámite
 */
export function generarPlantillaCuerpo(data = {}) {
  const tipo = (data.tipoPermiso || '').toUpperCase()

  if (tipo === 'CARGA_DESCARGA') {
    return generarPlantillaCargaDescarga(data)
  }
  if (tipo === 'USO_VIAS') {
    return generarPlantillaUsoVias(data)
  }
  if (tipo === 'ZONAS_RESERVADAS' || tipo === 'ZONA_RESERVADA') {
    return generarPlantillaZonasReservadas(data)
  }
  // CONTROL_VEHICULAR / OPERACION / default
  return generarPlantillaControlVehicular(data)
}
