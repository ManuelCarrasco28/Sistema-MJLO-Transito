<?php

namespace Tests\Unit;

use App\Services\ValidacionRegistro;
use CodeIgniter\Test\CIUnitTestCase;

final class ValidacionRegistroTest extends CIUnitTestCase
{
    public function testRechazaFechasImposibles(): void
    {
        $this->assertArrayHasKey('fecha', ValidacionRegistro::fechas(['fecha' => '2026-02-30'], ['fecha']));
        $this->assertSame([], ValidacionRegistro::fechas(['fecha' => '2028-02-29'], ['fecha']));
    }

    public function testDocumentoValidaCodigoEstadoYOrden(): void
    {
        $errores = ValidacionRegistro::documento(['codigo' => '', 'estado' => 'DESCONOCIDO', 'fecha_expedicion' => '2026-10-10', 'fecha_expiracion' => '2026-10-01']);
        foreach (['codigo', 'estado', 'fecha_expiracion'] as $campo) $this->assertArrayHasKey($campo, $errores);
    }

    public function testPermisoValidaTipoEstadoFechasYHora(): void
    {
        $errores = ValidacionRegistro::permiso(['tipo_permiso' => 'INVALIDO', 'estado' => 'ERROR', 'horario_inicio' => '25:00', 'fecha_inicio_vigencia' => '2026-10-10', 'fecha_fin_vigencia' => '2026-10-09']);
        foreach (['tipoPermiso', 'estado', 'horario_inicio', 'fecha_fin_vigencia'] as $campo) $this->assertArrayHasKey($campo, $errores);
    }

    public function testPermiteHorarioNocturnoYDocumentoSinVencimiento(): void
    {
        $this->assertSame([], ValidacionRegistro::permiso(['tipo_permiso' => 'CARGA_DESCARGA', 'estado' => 'VIGENTE', 'horario_inicio' => '16:00:00', 'horario_fin' => '05:00:00']));
        $this->assertSame([], ValidacionRegistro::documento(['codigo' => 'TP-1', 'estado' => 'VIGENTE', 'fecha_expiracion' => null]));
    }
}
