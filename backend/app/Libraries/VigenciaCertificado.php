<?php

namespace App\Libraries;

/**
 * Vigencia de 6 meses del CERTICAV. Igual que DATE_ADD(fecha, INTERVAL 6 MONTH) de MariaDB: si el día no existe en
 * el mes de destino se usa el último día de ese mes (31/08 vence el 28/02, no el 03/03 como daría strtotime).
 */
final class VigenciaCertificado
{
    public const MESES = 6;

    public static function vencimiento(string $fecha): string
    {
        $inicio = new \DateTimeImmutable(substr($fecha, 0, 10));
        $dia = (int) $inicio->format('j');
        $destino = $inicio->modify('first day of this month')->modify('+' . self::MESES . ' months');

        return $destino->setDate((int) $destino->format('Y'), (int) $destino->format('n'), min($dia, (int) $destino->format('t')))->format('Y-m-d');
    }
}
