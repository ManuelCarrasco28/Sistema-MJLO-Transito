<?php
$c = new mysqli('127.0.0.1', 'root', '', 'transitomunicipal');

// Test Permisos query
$sqlPermisos = "SELECT 
    pc.id,
    pc.id_tramite as tramiteId,
    pc.numero_autorizacion as numeroAutorizacion,
    pc.tipo_permiso as tipoPermiso,
    pc.asunto,
    pc.referencia_sisgedo as referenciaSisgedo,
    pc.expediente,
    pc.registro_numero as registroNumero,
    pc.contenido,
    pc.zona_circulacion as zonaCirculacion,
    pc.horario_inicio as horarioInicio,
    pc.horario_fin as horarioFin,
    pc.fecha_emision as fechaEmision,
    pc.fecha_inicio_vigencia as fechaInicioVigencia,
    pc.fecha_fin_vigencia as fechaFinVigencia,
    pc.estado,
    td.numero_expediente as expedienteNumero,
    td.fecha_solicitud as fechaSolicitud,
    pa.nombre as procedimientoNombre,
    pa.codigo as procedimientoCodigo,
    COALESCE(o.razon_social, CONCAT(c.nombres, ' ', c.apellido_paterno)) as solicitante,
    o.ruc as solicitanteRuc,
    p.numero as solicitanteDni
FROM permisos_circulacion pc
LEFT JOIN tramites_documentarios td ON td.id = pc.id_tramite
LEFT JOIN procedimientos_administrativos pa ON pa.id = td.id_procedimiento_admin
LEFT JOIN organizaciones o ON o.id = td.id_organizacion
LEFT JOIN personas p ON p.id = td.id_persona
LEFT JOIN ciudadanos c ON c.id_persona = p.id
ORDER BY pc.id DESC";

$res1 = $c->query($sqlPermisos);
if ($res1) {
    echo "Permisos SQL OK! Rows: " . $res1->num_rows . "\n";
} else {
    echo "Permisos SQL ERROR: " . $c->error . "\n";
}

// Test Internamientos query
$sqlInternamientos = "SELECT 
    oi.id,
    oi.id_papeleta as papeletaId,
    oi.id_vehiculo as vehiculoId,
    v.placa as vehiculoPlaca,
    COALESCE(v.marca, '') as vehiculoMarca,
    COALESCE(v.modelo, '') as vehiculoModelo,
    COALESCE(v.color, '') as vehiculoColor,
    COALESCE(v.estado_formalizacion, 'INFORMAL') as vehiculoFormalidad,
    COALESCE(aso.razon_social, 'Sin Organización (Informal)') as vehiculoAsociacion,
    p.numero_papeleta as numeroPapeleta,
    p.monto_total as montoPapeleta,
    oi.fecha_ingreso as fechaIngreso,
    oi.fecha_salida as fechaSalida,
    oi.deposito,
    oi.motivo,
    oi.numero_boleta as numeroBoleta,
    oi.total_dias as totalDias,
    oi.estado,
    oi.observaciones,
    oi.grado_remisor as gradoRemisor,
    oi.carnet_remisor as carnetRemisor,
    oi.autoridad_que_dispone as autoridadQueDispone,
    oi.documento_referencia as documentoReferencia,
    oi.estado_carroceria as estadoCarroceria,
    COALESCE(CONCAT(rem_c.nombres, ' ', rem_c.apellido_paterno, ' ', COALESCE(rem_c.apellido_materno, '')), 'Inspector Remisor') as remisorNombre,
    COALESCE(CONCAT(inte_c.nombres, ' ', inte_c.apellido_paterno, ' ', COALESCE(inte_c.apellido_materno, '')), 'Conductor / Interesado') as interesadoNombre,
    COALESCE(inte.numero, 'S/D') as interesadoDni,
    ol.id as ordenLibertadId,
    ol.numero_orden as numeroOrdenLibertad,
    ol.fecha_emision as fechaLiberacion,
    ol.monto_total as montoTotalLiberacion
FROM ordenes_internamiento oi
LEFT JOIN vehiculos v ON v.id = oi.id_vehiculo
LEFT JOIN organizaciones aso ON aso.id = v.id_asociacion
LEFT JOIN papeletas p ON p.id = oi.id_papeleta
LEFT JOIN personas rem ON rem.id = oi.id_remisor
LEFT JOIN ciudadanos rem_c ON rem_c.id_persona = rem.id
LEFT JOIN personas inte ON inte.id = oi.id_interesado
LEFT JOIN ciudadanos inte_c ON inte_c.id_persona = inte.id
LEFT JOIN ordenes_libertad ol ON ol.id_internamiento = oi.id
ORDER BY oi.id DESC";

$res2 = $c->query($sqlInternamientos);
if ($res2) {
    echo "Internamientos SQL OK! Rows: " . $res2->num_rows . "\n";
} else {
    echo "Internamientos SQL ERROR: " . $c->error . "\n";
}
