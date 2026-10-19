<?php

namespace Tests\Unit;

use App\Libraries\ProcedimientoDatos;
use InvalidArgumentException;
use PHPUnit\Framework\TestCase;

final class ProcedimientoDatosTest extends TestCase
{
    private function formulario(): array
    {
        return ['codigo' => 'pa-001', 'nombre' => 'Prueba', 'costo' => '33.50', 'estado' => 'ACTIVO'];
    }

    public function testNormalizaSinPerderDecimales(): void
    {
        $data = ProcedimientoDatos::validar($this->formulario() + ['plazoAtencion' => '5', 'baseLegal' => '  Norma de prueba  ']);
        self::assertSame('PA-001', $data['codigo']);
        self::assertSame('33.50', $data['costo']);
        self::assertSame(5, $data['plazo_atencion']);
        self::assertSame('Norma de prueba', $data['base_legal']);
        self::assertSame('INICIAL', $data['tipo_tramite']);
    }

    public function testAceptaImporteCeroExplicito(): void
    {
        $form = $this->formulario();
        $form['costo'] = '0';
        self::assertSame('0.00', ProcedimientoDatos::validar($form)['costo']);
    }

    public function testRechazaCamposInvalidos(): void
    {
        $invalidos = [
            ['codigo' => ''], ['codigo' => '<script>'], ['nombre' => ''],
            ['nombre' => str_repeat('a', 201)], ['costo' => ''], ['costo' => '-1'],
            ['costo' => '1.234'], ['costo' => '1e3'], ['costo' => true], ['costo' => []],
            ['estado' => 'ELIMINADO'], ['tipoTramite' => 'OTRO'],
            ['plazoAtencion' => '-1'], ['plazoAtencion' => '1.5'], ['plazoAtencion' => '3651'],
            ['codigo' => ['PA-1']], ['descripcion' => ['texto']],
        ];
        foreach ($invalidos as $cambio) {
            try {
                ProcedimientoDatos::validar(array_replace($this->formulario(), $cambio));
                self::fail('Se aceptó un formulario inválido: ' . json_encode($cambio));
            } catch (InvalidArgumentException $error) {
                self::assertNotSame('', $error->getMessage());
            }
        }
    }

    public function testPlazoVacioEsNulo(): void
    {
        self::assertNull(ProcedimientoDatos::validar($this->formulario() + ['plazoAtencion' => ''])['plazo_atencion']);
    }
}
