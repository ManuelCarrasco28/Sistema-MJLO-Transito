<?php

namespace Tests\Unit;

use App\Libraries\VigenciaCertificado;
use PHPUnit\Framework\TestCase;

final class VigenciaCertificadoTest extends TestCase
{
    /** @dataProvider fechas */
    public function testVenceALosSeisMesesSinDesbordarElMes(string $fecha, string $esperado): void
    {
        $this->assertSame($esperado, VigenciaCertificado::vencimiento($fecha));
    }

    public static function fechas(): array
    {
        return [
            'fin de mes largo a mes corto' => ['2026-08-31', '2027-02-28'],
            'enero 31' => ['2026-01-31', '2026-07-31'],
            'diciembre 31 pasa de año' => ['2026-12-31', '2027-06-30'],
            'día normal' => ['2026-10-11', '2027-04-11'],
            'acepta fecha con hora' => ['2026-10-11 14:30:00', '2027-04-11'],
        ];
    }
}
