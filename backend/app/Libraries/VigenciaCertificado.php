<?php

namespace App\Libraries;

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
