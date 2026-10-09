<?php

namespace App\Services;

use CodeIgniter\Database\BaseConnection;

/** Serializa la comprobación y el guardado de identidades, incluido el commit. */
final class CandadoPersona
{
    public static function adquirir(BaseConnection $db): void
    {
        $fila = $db->query("SELECT GET_LOCK(CONCAT(DATABASE(), ':personas_guardar'), 10) AS adquirido")->getRowArray();
        if ((int)($fila['adquirido'] ?? 0) !== 1) throw new \DomainException('Otra persona se está guardando. Intente nuevamente.');
    }

    public static function liberar(BaseConnection $db): void
    {
        $db->query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':personas_guardar'))");
    }
}
