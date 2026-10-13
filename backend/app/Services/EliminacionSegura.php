<?php

namespace App\Services;

use CodeIgniter\Database\BaseConnection;
use DomainException;

/** Borra solo registros sin dependencias; nunca deja eliminaciones parciales. */
class EliminacionSegura
{
    /** Nombre legible (singular, plural) de las tablas que pueden impedir un borrado. */
    private const ETIQUETAS = [
        'permisos_circulacion' => ['permiso de circulación', 'permisos de circulación'],
        'papeletas' => ['papeleta', 'papeletas'],
        'reportes_intervencion' => ['reporte de intervención', 'reportes de intervención'],
        'inspecciones' => ['inspección', 'inspecciones'],
        'internamientos' => ['internamiento', 'internamientos'],
        'retenciones' => ['retención', 'retenciones'],
        'documentos_vehiculo' => ['documento', 'documentos'],
        'vehiculo_propietarios' => ['propietario registrado', 'propietarios registrados'],
        'vehiculos' => ['vehículo', 'vehículos'],
        'inscripciones_curso' => ['inscripción a curso', 'inscripciones a cursos'],
        'pagos' => ['pago', 'pagos'],
        'operativos' => ['operativo', 'operativos'],
        'trabajadores' => ['trabajador', 'trabajadores'],
        'usuarios' => ['usuario', 'usuarios'],
        'administrados' => ['administrado', 'administrados'],
        'certicav' => ['inspección CERTICAV', 'inspecciones CERTICAV'],
        'ordenes_internamiento' => ['orden de internamiento', 'órdenes de internamiento'],
        'ordenes_libertad' => ['orden de libertad', 'órdenes de libertad'],
        'tramites_documentarios' => ['trámite documentario', 'trámites documentarios'],
        'ciudadanos' => ['ciudadano', 'ciudadanos'],
        'asociaciones' => ['asociación', 'asociaciones'],
    ];

    public static function eliminar(BaseConnection $db, string $tabla, int $id, array $hijas = []): void
    {
        // Los nombres proceden del código/metadata, nunca de la petición.
        $identificador = static function (string $nombre): string {
            if (!preg_match('/^[a-zA-Z0-9_]+$/', $nombre)) {
                throw new DomainException('Nombre de tabla no válido.');
            }
            return "`{$nombre}`";
        };
        $db->transException(true)->transBegin();
        try {
            if (!$db->query('SELECT id FROM ' . $identificador($tabla) . ' WHERE id = ? FOR UPDATE', [$id])->getRowArray()) {
                throw new DomainException('Registro no encontrado.');
            }
            $relaciones = $db->query(
                'SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE REFERENCED_TABLE_SCHEMA = DATABASE() AND TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = ? AND REFERENCED_COLUMN_NAME = ?',
                [$tabla, 'id']
            )->getResultArray();
            foreach ($relaciones as $relacion) {
                $hija = $relacion['TABLE_NAME'];
                $columna = $relacion['COLUMN_NAME'];
                if (($hijas[$hija] ?? null) === $columna) continue;
                $total = (int) ($db->query('SELECT COUNT(*) AS total FROM ' . $identificador($hija) . ' WHERE ' . $identificador($columna) . ' = ?', [$id])->getRowArray()['total'] ?? 0);
                if ($total > 0) {
                    [$singular, $plural] = self::ETIQUETAS[$hija] ?? [str_replace('_', ' ', $hija), str_replace('_', ' ', $hija)];
                    $detalle = $total === 1 ? "1 {$singular} asociado" : "{$total} {$plural} asociados";
                    throw new DomainException("No se puede eliminar porque tiene {$detalle}. Elimina o reasigna esos registros primero; no se ha borrado ningún dato.");
                }
            }
            foreach ($hijas as $hija => $columna) {
                $db->table($hija)->where($columna, $id)->delete();
            }
            $db->table($tabla)->where('id', $id)->delete();
            if (!$db->transStatus()) throw new \RuntimeException('No se pudo completar la eliminación.');
            $db->transCommit();
        } catch (\Throwable $e) {
            $db->transRollback();
            throw $e;
        }
    }
}
