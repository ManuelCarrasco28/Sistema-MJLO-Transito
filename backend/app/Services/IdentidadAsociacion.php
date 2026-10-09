<?php

namespace App\Services;

use CodeIgniter\Database\BaseConnection;

final class IdentidadAsociacion
{
    public static function normalizarNombre(string $nombre): string
    {
        return mb_strtoupper(preg_replace('/\s+/u', ' ', trim($nombre)) ?? '', 'UTF-8');
    }

    public static function duplicados(BaseConnection $db, array $datos, ?int $id = null): array
    {
        $errores = [];
        if (array_key_exists('razonSocial', $datos)) {
            $nombre = self::normalizarNombre((string)$datos['razonSocial']);
            if ($nombre === '') {
                $errores['razonSocial'] = 'Ingrese la razón social.';
            } else {
                $consulta = $db->table('asociaciones')->where("UPPER(REGEXP_REPLACE(TRIM(razon_social), '[[:space:]]+', ' ')) =", $nombre);
                if ($id !== null) $consulta->where('id !=', $id);
                if ($consulta->countAllResults() > 0) $errores['razonSocial'] = 'Nombre duplicado.';
            }
        }
        $ruc = trim((string)($datos['ruc'] ?? ''));
        if ($ruc !== '') {
            $consulta = $db->table('asociaciones')->where('ruc', $ruc);
            if ($id !== null) $consulta->where('id !=', $id);
            if ($consulta->countAllResults() > 0) $errores['ruc'] = 'RUC duplicado.';
        }
        return $errores;
    }

    public static function bloquear(BaseConnection $db): bool
    {
        return (int)($db->query("SELECT GET_LOCK(CONCAT(DATABASE(), ':asociaciones_guardar'), 10) AS adquirido")->getRowArray()['adquirido'] ?? 0) === 1;
    }

    public static function liberar(BaseConnection $db): void
    {
        $db->query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':asociaciones_guardar'))");
    }
}
