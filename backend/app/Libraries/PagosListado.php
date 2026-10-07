<?php

namespace App\Libraries;

/** Una fila por comprobante o deuda, antes de filtrar y paginar. */
final class PagosListado
{
    public static function condicionReciboVisible(string $alias = 'pt'): string
    {
        return "NOT ($alias.estado = 'ANULADO' AND $alias.tipo_pago = 'CURSO' AND COALESCE($alias.referencia_pago, '') = 'Inscripción retirada sin pago')";
    }

    public static function builder($db)
    {
        // Los SELECT son constantes; los FROM/JOIN/WHERE se construyen por separado.
        $selects = array_map(static fn($sql) => substr(explode("\nFROM ", $sql, 2)[0], 7), explode("\nUNION ALL\n", self::sql()));
        $recibos = $db->table('pagos_transito pt')->select($selects[0], false)->where(self::condicionReciboVisible(), null, false);
        $retenidos = $db->table('ordenes_internamiento oi')->select($selects[1], false)->where('oi.estado', 'RETENIDO');
        $liberados = $db->table('ordenes_libertad ol')->select($selects[2], false);
        $papeletas = $db->table('papeletas p')->select($selects[3], false)
            ->join('vehiculos v', 'v.id = p.id_vehiculo', 'left')->where('p.estado', 'PENDIENTE_PAGO')
            ->where("NOT EXISTS (SELECT 1 FROM pagos_transito pt WHERE pt.id_papeleta = p.id AND pt.estado <> 'ANULADO')", null, false);
        $cursos = $db->table('inscripciones_curso i')->select($selects[4], false)
            ->join('cursos_seguridad_vial cu', 'cu.id = i.id_curso')
            ->join('ciudadanos ci', 'ci.id_persona = i.id_persona', 'left')
            ->where('i.estado_pago', 'PENDIENTE')->where('cu.costo_inscripcion >', 0)
            ->whereNotIn('i.estado', ['ANULADO','CANCELADO'])
            ->where("NOT EXISTS (SELECT 1 FROM pagos_transito pt WHERE pt.id_inscripcion = i.id AND pt.estado <> 'ANULADO')", null, false);
        $recibos->unionAll($retenidos)->unionAll($liberados)->unionAll($papeletas)->unionAll($cursos);
        return $db->newQuery()->fromSubquery($recibos, 'listado');
    }

    public static function sql(): string
    {
        return <<<'SQL'
SELECT pt.id, CONVERT(pt.uuid USING utf8mb4) COLLATE utf8mb4_unicode_ci AS uuid, pt.id_papeleta, pt.id_tramite, pt.id_inscripcion,
 NULL AS id_internamiento, _utf8mb4'' COLLATE utf8mb4_unicode_ci AS prefijo, pt.fecha_pago, pt.hora_pago,
 CONVERT(pt.tipo_pago USING utf8mb4) COLLATE utf8mb4_unicode_ci AS tipo_pago,
 CONVERT(pt.numero_recibo USING utf8mb4) COLLATE utf8mb4_unicode_ci AS numero_recibo,
 CONVERT(pt.numero_voucher USING utf8mb4) COLLATE utf8mb4_unicode_ci AS numero_voucher,
 CONVERT(pt.medio_pago USING utf8mb4) COLLATE utf8mb4_unicode_ci AS medio_pago,
 CONVERT(pt.referencia_pago USING utf8mb4) COLLATE utf8mb4_unicode_ci AS referencia_pago, pt.total,
 CONVERT(pt.estado USING utf8mb4) COLLATE utf8mb4_unicode_ci AS estado
FROM pagos_transito pt
WHERE NOT (pt.estado = 'ANULADO' AND pt.tipo_pago = 'CURSO' AND COALESCE(pt.referencia_pago, '') = 'Inscripción retirada sin pago')
UNION ALL
SELECT oi.id AS id, NULL AS uuid, NULL AS id_papeleta, NULL AS id_tramite, NULL AS id_inscripcion, oi.id AS id_internamiento,
 'int_p_' AS prefijo, NULL AS fecha_pago, NULL AS hora_pago, 'INTERNAMIENTO' AS tipo_pago,
 NULL AS numero_recibo, NULL AS numero_voucher, 'SIN CONFIRMAR' AS medio_pago,
 CONCAT('Boleta #', oi.numero_boleta) AS referencia_pago, 0 AS total, 'PENDIENTE' AS estado
FROM ordenes_internamiento oi WHERE oi.estado = 'RETENIDO'
UNION ALL
SELECT ol.id AS id, NULL AS uuid, NULL AS id_papeleta, NULL AS id_tramite, NULL AS id_inscripcion, ol.id_internamiento,
 'int_l_' AS prefijo, ol.fecha_emision AS fecha_pago, NULL AS hora_pago, 'INTERNAMIENTO' AS tipo_pago,
 COALESCE(ol.numero_recibo_guardiania, ol.numero_recibo_papeleta, ol.numero_recibo_remolque, 'VARIOS') AS numero_recibo, NULL AS numero_voucher,
 COALESCE(NULLIF(CONCAT_WS(' + ', IF(ol.numero_recibo_guardiania IS NOT NULL, 'GUARDIANÍA', NULL),
 IF(ol.numero_recibo_papeleta IS NOT NULL, 'PAPELETA', NULL), IF(ol.numero_recibo_remolque IS NOT NULL, 'REMOLQUE', NULL)), ''), 'VARIOS CONCEPTOS') AS medio_pago,
 CONCAT('Orden #', ol.numero_orden) AS referencia_pago, ol.monto_total AS total, 'PAGADO' AS estado
FROM ordenes_libertad ol
UNION ALL
SELECT p.id AS id, NULL AS uuid, p.id AS id_papeleta, NULL AS id_tramite, NULL AS id_inscripcion, NULL AS id_internamiento,
 'pap_pend_' AS prefijo, p.fecha_hora AS fecha_pago, NULL AS hora_pago, 'PAPELETA' AS tipo_pago,
 NULL AS numero_recibo, NULL AS numero_voucher, 'SIN CONFIRMAR' AS medio_pago,
 CONCAT('Papeleta ', p.numero_papeleta, COALESCE(CONCAT(' — ', v.placa), '')) AS referencia_pago, p.monto_total AS total, 'PENDIENTE' AS estado
FROM papeletas p LEFT JOIN vehiculos v ON v.id = p.id_vehiculo
WHERE p.estado = 'PENDIENTE_PAGO' AND NOT EXISTS
 (SELECT 1 FROM pagos_transito pt WHERE pt.id_papeleta = p.id AND pt.estado <> 'ANULADO')
UNION ALL
SELECT i.id AS id, NULL AS uuid, NULL AS id_papeleta, NULL AS id_tramite, i.id AS id_inscripcion, NULL AS id_internamiento,
 'cur_pend_' AS prefijo, i.fecha_inscripcion AS fecha_pago, NULL AS hora_pago, 'CURSO' AS tipo_pago,
 NULL AS numero_recibo, NULL AS numero_voucher, 'SIN CONFIRMAR' AS medio_pago,
 CONCAT('Curso ', cu.nombre, ' — ', COALESCE(ci.nombres, ''), ' ', COALESCE(ci.apellido_paterno, '')) AS referencia_pago,
 cu.costo_inscripcion AS total, 'PENDIENTE' AS estado
FROM inscripciones_curso i JOIN cursos_seguridad_vial cu ON cu.id = i.id_curso
LEFT JOIN ciudadanos ci ON ci.id_persona = i.id_persona
WHERE i.estado_pago = 'PENDIENTE' AND cu.costo_inscripcion > 0 AND i.estado NOT IN ('ANULADO','CANCELADO')
 AND NOT EXISTS (SELECT 1 FROM pagos_transito pt WHERE pt.id_inscripcion = i.id AND pt.estado <> 'ANULADO')
SQL;
    }
}
