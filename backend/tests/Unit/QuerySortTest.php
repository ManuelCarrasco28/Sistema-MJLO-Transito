<?php

namespace Tests\Unit;

use App\Libraries\QuerySort;
use PHPUnit\Framework\TestCase;

final class QuerySortTest extends TestCase
{
    private const COLUMNAS = [
        'placa' => 'v.placa',
        'estado' => 'v.estado',
    ];

    public function testUsaLaColumnaPermitidaYLaDireccionIndicada(): void
    {
        $builder = $this->builderEspia();
        QuerySort::aplicar($builder, $this->peticion(['sortBy' => 'placa', 'sortDir' => 'asc']), self::COLUMNAS, 'v.id');

        $this->assertSame([['v.placa', 'ASC'], ['v.id', 'DESC']], $builder->ordenes);
    }

    public function testColumnaDesconocidaCaeEnLaColumnaPorDefecto(): void
    {
        $builder = $this->builderEspia();
        QuerySort::aplicar($builder, $this->peticion(['sortBy' => 'password', 'sortDir' => 'ASC']), self::COLUMNAS, 'v.id');

        $this->assertSame([['v.id', 'ASC']], $builder->ordenes);
    }

    public function testIntentoDeInyeccionNuncaLlegaAlOrderBy(): void
    {
        $builder = $this->builderEspia();
        QuerySort::aplicar(
            $builder,
            $this->peticion(['sortBy' => 'placa; DROP TABLE vehiculos;--', 'sortDir' => 'ASC; DROP TABLE x']),
            self::COLUMNAS,
            'v.id',
            'DESC'
        );

        $this->assertSame([['v.id', 'DESC']], $builder->ordenes);
    }

    public function testDireccionInvalidaUsaLaDireccionPorDefecto(): void
    {
        $builder = $this->builderEspia();
        QuerySort::aplicar($builder, $this->peticion(['sortBy' => 'estado', 'sortDir' => 'sideways']), self::COLUMNAS, 'v.id', 'DESC');

        $this->assertSame([['v.estado', 'DESC'], ['v.id', 'DESC']], $builder->ordenes);
    }

    public function testAceptaVariasColumnasEnElOrdenIndicado(): void
    {
        $builder = $this->builderEspia();
        QuerySort::aplicar($builder, $this->peticion(['sortBy' => 'placa,estado', 'sortDir' => 'ASC,DESC']), self::COLUMNAS, 'v.id');

        $this->assertSame([['v.placa', 'ASC'], ['v.estado', 'DESC'], ['v.id', 'DESC']], $builder->ordenes);
    }

    public function testIgnoraColumnasInvalidasRepetidasEnUnaListaMultiple(): void
    {
        $builder = $this->builderEspia();
        QuerySort::aplicar($builder, $this->peticion(['sortBy' => 'x,placa,placa,estado', 'sortDir' => 'ASC,ASC,DESC,DESC']), self::COLUMNAS, 'v.id');

        $this->assertSame([['v.placa', 'ASC'], ['v.estado', 'DESC'], ['v.id', 'DESC']], $builder->ordenes);
    }

    public function testSinParametrosUsaLosValoresPorDefecto(): void
    {
        $builder = $this->builderEspia();
        QuerySort::aplicar($builder, $this->peticion([]), self::COLUMNAS, 'v.id');

        $this->assertSame([['v.id', 'DESC']], $builder->ordenes);
    }

    private function peticion(array $get): object
    {
        return new class($get) {
            public function __construct(private array $get)
            {
            }

            public function getGet(string $clave): ?string
            {
                return $this->get[$clave] ?? null;
            }
        };
    }

    private function builderEspia(): object
    {
        return new class {
            public array $ordenes = [];

            public function orderBy(string $columna, string $direccion): static
            {
                $this->ordenes[] = [$columna, $direccion];

                return $this;
            }
        };
    }
}
