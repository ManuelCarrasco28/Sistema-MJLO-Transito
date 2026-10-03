<?php

namespace Tests\Unit;

use App\Libraries\Placa;
use PHPUnit\Framework\TestCase;

final class PlacaTest extends TestCase
{
    /**
     * @dataProvider placasProvider
     */
    public function testNormalizaALaFormaGuardada(string $entrada, string $esperada): void
    {
        $this->assertSame($esperada, Placa::normalizar($entrada));
    }

    public static function placasProvider(): array
    {
        return [
            'con guion' => ['ABC-123', 'ABC123'],
            'minúsculas' => ['abc123', 'ABC123'],
            'espacios y guion' => [' m6y - 544 ', 'M6Y544'],
            'ya normalizada' => ['9308ZM', '9308ZM'],
            'vacía' => ['', ''],
        ];
    }

    public function testConservaLosCodigosDeVehiculoSinPlaca(): void
    {
        $this->assertSame('SIN_PLACA', Placa::normalizar('sin_placa'));
        $this->assertSame('SIN-PLACA-AB12CD34', Placa::normalizar('SIN-PLACA-AB12CD34'));
    }

    public function testNullSeTrataComoVacio(): void
    {
        $this->assertSame('', Placa::normalizar(null));
    }

    public function testBusquedaConvierteSoloTextosConFormaDePlaca(): void
    {
        $this->assertSame('ABC123', Placa::paraBusqueda('abc-123'));
        $this->assertSame('M6Y544', Placa::paraBusqueda('M6Y 544'));
    }

    public function testBusquedaNoAlteraNombresNiDocumentos(): void
    {
        $this->assertSame('Juan Pérez', Placa::paraBusqueda('Juan Pérez'));
        $this->assertSame('12345678', Placa::paraBusqueda('12345678'));
        $this->assertSame('SANTA ROSA', Placa::paraBusqueda('SANTA ROSA'));
        $this->assertSame('ABC', Placa::paraBusqueda('ABC'));
    }
}
