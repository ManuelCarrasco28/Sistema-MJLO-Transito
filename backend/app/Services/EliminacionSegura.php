<?php

namespace App\Services;

use CodeIgniter\Database\BaseConnection;
use DomainException;

/** Borra solo registros sin dependencias; nunca deja eliminaciones parciales. */
class EliminacionSegura
{
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
                if ($db->query('SELECT 1 FROM ' . $identificador($hija) . ' WHERE ' . $identificador($columna) . ' = ? LIMIT 1', [$id])->getRowArray()) {
                    $etiqueta = str_replace('_', ' ', $hija);
                    throw new DomainException("No se puede eliminar: tiene registros vinculados en {$etiqueta}. No se ha borrado ningún dato.");
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
