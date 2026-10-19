<?php

namespace Tests\Unit;

use App\Libraries\Concurrencia;
use PHPUnit\Framework\TestCase;

final class ConcurrenciaTest extends TestCase
{
    public function testCadaRecursoDeclaraTablaIdVersionYTipo(): void
    {
        foreach (Concurrencia::RECURSOS as $recurso => $definicion) {
            $this->assertCount(4, $definicion, "El recurso {$recurso} debe declarar tabla, id, columna de versión y tipo.");
            $this->assertContains($definicion[3], ['ts', 'dt'], "Tipo de columna inválido en {$recurso}.");
            $this->assertMatchesRegularExpression('/^[a-z_]+$/', $definicion[0]);
        }
    }

    public function testNoSeProtegenRecursosCuyoRegistroCambiaSoloPorElSistema(): void
    {
        // El inicio de sesión actualiza la fecha de modificación del usuario: causaría falsos conflictos.
        $this->assertArrayNotHasKey('usuarios', Concurrencia::RECURSOS);
    }

    public function testSinRecursoOSinIdNoConsultaLaBase(): void
    {
        $this->assertSame([], Concurrencia::versiones(null, 'desconocido', [1]));
        $this->assertSame([], Concurrencia::versiones(null, 'vehiculos', []));
        $this->assertNull(Concurrencia::actual(null, 'desconocido', '1'));
        $this->assertNull(Concurrencia::actual(null, 'vehiculos', ''));
    }
}
