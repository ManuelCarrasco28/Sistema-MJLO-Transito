<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use Faker\Factory as FakerFactory;

/**
 * Genera datos sintéticos masivos (~30,000 personas y todo lo derivado:
 * asociaciones, vehículos, cursos, documentos, inspecciones CERTICAV,
 * operativos, papeletas, internamientos, trámites/permisos y pagos).
 *
 * NO toca catálogos ya poblados (tipo_documentos_identidad, ubigeos,
 * tipos_vehiculo, tipos_infraccion, procedimientos_administrativos,
 * inspeccion_criterios, inventario_criterios, roles, cargos,
 * unidades_organicas, municipalidad, municipalidad_anio,
 * jerarquia_organizacional) ni las tablas de usuarios/trabajadores.
 *
 * Ejecutar manualmente (nunca automático en migraciones):
 *   docker exec mjlo_backend php spark db:seed PoblarDatosMasivosSeeder
 *
 * Es idempotente por tabla: antes de sembrar cada bloque, revisa cuántas
 * filas ya existen y solo agrega lo que falta hasta la meta configurada.
 */
class PoblarDatosMasivosSeeder extends Seeder
{
    // ------ Metas de cantidad (ajustables) ------
    private const META_PERSONAS = 600;
    private const META_ASOCIACIONES = 20;
    private const META_VEHICULOS = 350;
    private const META_CURSOS = 25;
    private const META_INSCRIPCIONES = 300;
    private const META_CERTICAV = 250;
    private const META_OPERATIVOS = 20;
    private const META_PAPELETAS = 250;
    private const META_REPORTES_INTERVENCION = 100;
    private const META_INTERNAMIENTOS = 40;
    private const META_TRAMITES = 80;

    private const BATCH_SIZE = 500;

    private $faker;
    private array $dniUsados = [];
    private array $rucUsados = [];
    private array $placasUsadas = [];

    // IDs de personas que ya son trabajadores municipales (inspectores,
    // técnicos, autoridades) — se reutilizan tal cual, nunca se duplican.
    private array $inspectorPersonaIds = [1, 2, 4, 5, 48, 50];
    private array $inspectorUsuarioIds = [9, 6, 4, 5, 8, 7];

    private array $ubigeoIds = [];
    private array $tiposVehiculoIds = [];
    private array $tiposInfraccionIds = [];
    private array $procedimientoIds = [];
    private array $criteriosInspeccionIds = [];

    public function run()
    {
        $this->faker = FakerFactory::create('es_PE');

        $this->cargarCatalogos();

        echo "=== Sembrando personas ===\n";
        $personaIds = $this->seedPersonas();

        echo "=== Sembrando asociaciones ===\n";
        $asociacionIds = $this->seedAsociaciones($personaIds);

        echo "=== Sembrando vehículos ===\n";
        [$vehiculoIds, $propietarioDePorVehiculo] = $this->seedVehiculos($personaIds, $asociacionIds);

        echo "=== Sembrando cursos de seguridad vial ===\n";
        $cursoIds = $this->seedCursos();

        echo "=== Sembrando inscripciones y certificados ===\n";
        $inscripcionesPagadas = $this->seedInscripcionesYCertificados($cursoIds, $personaIds, $vehiculoIds);

        echo "=== Sembrando documentos del vehículo ===\n";
        $this->seedDocumentosVehiculo($vehiculoIds);

        echo "=== Sembrando inspecciones CERTICAV ===\n";
        $this->seedCerticav($vehiculoIds, $personaIds);

        echo "=== Sembrando operativos ===\n";
        $operativoIds = $this->seedOperativos();

        echo "=== Sembrando papeletas y fiscalización ===\n";
        [$papeletasPagadas, $papeletaVehiculoMap] = $this->seedPapeletasYDetalles($vehiculoIds, $personaIds, $operativoIds, $propietarioDePorVehiculo);

        echo "=== Sembrando reportes de intervención ===\n";
        $this->seedReportesIntervencion($vehiculoIds, $personaIds, $operativoIds);

        echo "=== Sembrando internamientos ===\n";
        $this->seedInternamientos($vehiculoIds, $personaIds, $papeletaVehiculoMap);

        echo "=== Sembrando trámites y permisos de circulación ===\n";
        $tramitesPagados = $this->seedTramitesYPermisos($personaIds, $asociacionIds, $vehiculoIds);

        echo "=== Sembrando pagos ===\n";
        $this->seedPagos($papeletasPagadas, $tramitesPagados, $inscripcionesPagadas);

        echo "=== Listo ===\n";
    }

    // ---------------------------------------------------------------
    // Utilidades
    // ---------------------------------------------------------------

    private function cargarCatalogos(): void
    {
        $this->ubigeoIds = array_column(
            $this->db->table('ubigeos')->select('id')->like('descripcion', 'CHICLAYO')->get()->getResultArray(),
            'id'
        );
        if (empty($this->ubigeoIds)) {
            $this->ubigeoIds = array_column($this->db->table('ubigeos')->select('id')->get(200)->getResultArray(), 'id');
        }
        $this->tiposVehiculoIds = array_column($this->db->table('tipos_vehiculo')->select('id')->get()->getResultArray(), 'id');
        $this->tiposInfraccionIds = array_column($this->db->table('tipos_infraccion')->select('id')->get()->getResultArray(), 'id');
        $this->procedimientoIds = array_column($this->db->table('procedimientos_administrativos')->select('id')->get()->getResultArray(), 'id');
        $this->criteriosInspeccionIds = array_column($this->db->table('inspeccion_criterios')->select('id')->get()->getResultArray(), 'id');
    }

    private function faltantes(string $tabla, int $meta): int
    {
        $actual = (int) $this->db->table($tabla)->countAllResults();
        return max(0, $meta - $actual);
    }

    private function insertarPorLotes(string $tabla, array $filas): void
    {
        // Las tablas principales llevan uuid (obligatorio). En vehículos el código QR es el mismo uuid.
        if (in_array($tabla, \App\Libraries\Identificador::TABLAS, true)) {
            foreach ($filas as &$fila) {
                $fila['uuid'] = $fila['uuid'] ?? \App\Libraries\Identificador::nuevo();
                if ($tabla === 'vehiculos') {
                    $fila['codigo_qr'] = $fila['uuid'];
                }
            }
            unset($fila);
        }

        foreach (array_chunk($filas, self::BATCH_SIZE) as $lote) {
            $this->db->table($tabla)->insertBatch($lote);
        }
    }

    /** IDs recién insertados en $tabla leyendo directamente desde la base de datos para no depender de auto_increments sin huecos. */
    private function idsRecienInsertados(string $tabla, int $maxAntes, int $cantidad): array
    {
        if ($cantidad <= 0) return [];
        $rows = $this->db->table($tabla)
            ->select('id')
            ->where('id >', $maxAntes)
            ->orderBy('id', 'ASC')
            ->limit($cantidad)
            ->get()
            ->getResultArray();
        return array_map(static fn($r) => (int)$r['id'], $rows);
    }

    private function dniUnico(): string
    {
        do {
            $dni = (string) random_int(10000000, 79999999);
        } while (isset($this->dniUsados[$dni]));
        $this->dniUsados[$dni] = true;
        return $dni;
    }

    private function rucUnico(): string
    {
        do {
            $prefijo = random_int(0, 1) ? '10' : '20';
            $ruc = $prefijo . random_int(100000000, 999999999);
        } while (isset($this->rucUsados[$ruc]));
        $this->rucUsados[$ruc] = true;
        return $ruc;
    }

    private function placaUnica(): string
    {
        do {
            $letras = strtoupper($this->faker->lexify('???'));
            $placa = $letras . random_int(100, 999);
        } while (isset($this->placasUsadas[$placa]));
        $this->placasUsadas[$placa] = true;
        return $placa;
    }

    private function fechaAleatoria(int $diasAtras = 1095): string
    {
        return date('Y-m-d', strtotime('-' . random_int(0, $diasAtras) . ' days'));
    }

    private function estadoPonderado(array $opcionesConPeso): string
    {
        $total = array_sum($opcionesConPeso);
        $r = random_int(1, $total);
        $acum = 0;
        foreach ($opcionesConPeso as $valor => $peso) {
            $acum += $peso;
            if ($r <= $acum) return (string) $valor;
        }
        return (string) array_key_first($opcionesConPeso);
    }

    // ---------------------------------------------------------------
    // Personas
    // ---------------------------------------------------------------

    private function seedPersonas(): array
    {
        $faltan = $this->faltantes('personas', self::META_PERSONAS);
        $maxAntes = (int) ($this->db->table('personas')->selectMax('id')->get()->getRow()->id ?? 0);

        if ($faltan === 0) {
            echo "  Personas ya completas.\n";
            return array_column($this->db->table('personas')->select('id')->get()->getResultArray(), 'id');
        }

        $filasPersonas = [];
        $filasCiudadanos = [];
        $filasAdministrados = [];
        $estadosCiviles = ['SOLTERO', 'CASADO', 'DIVORCIADO', 'VIUDO'];
        $profesiones = ['Comerciante', 'Chofer', 'Independiente', 'Empleado', 'Técnico', 'Agricultor', 'Obrero', 'Ama de casa', 'Estudiante', 'Docente'];

        for ($i = 0; $i < $faltan; $i++) {
            $sexo = random_int(0, 1) ? 'M' : 'F';
            $nombres = $sexo === 'M' ? $this->faker->firstNameMale() : $this->faker->firstNameFemale();
            $apPat = $this->faker->lastName();
            $apMat = $this->faker->lastName();
            $tieneLicencia = random_int(1, 100) <= 55; // ~55% son conductores

            $filasPersonas[] = [
                'id_tipo_documento' => random_int(1, 100) <= 95 ? 1 : 2,
                'id_ubigeo' => $this->ubigeoIds[array_rand($this->ubigeoIds)],
                'numero' => $this->dniUnico(),
                'direccion' => $this->faker->streetAddress(),
                'telefono' => random_int(1, 100) <= 20 ? $this->faker->numerify('074#####') : null,
                'celular' => $this->faker->numerify('9########'),
                'email' => random_int(1, 100) <= 60 ? $this->faker->unique()->safeEmail() : null,
                'estado' => $this->estadoPonderado(['ACTIVO' => 85, 'INACTIVO' => 15]),
            ];

            $filasCiudadanos[] = [
                'nombres' => $nombres,
                'apellido_paterno' => $apPat,
                'apellido_materno' => $apMat,
                'sexo' => $sexo,
                'fecha_nacimiento' => $this->faker->dateTimeBetween('-75 years', '-18 years')->format('Y-m-d'),
                'estado_civil' => $estadosCiviles[array_rand($estadosCiviles)],
                'profesion' => $profesiones[array_rand($profesiones)],
                'numero_licencia' => $tieneLicencia ? 'Q' . random_int(10000000, 99999999) : null,
                'ruc' => null,
                'razon_social' => null,
            ];
        }

        $this->insertarPorLotes('personas', $filasPersonas);
        $idsNuevos = $this->idsRecienInsertados('personas', $maxAntes, count($filasPersonas));

        foreach ($idsNuevos as $idx => $idPersona) {
            if (!isset($filasCiudadanos[$idx])) continue;
            $filasCiudadanos[$idx]['id_persona'] = $idPersona;
            $filasAdministrados[] = ['id_persona' => $idPersona];
        }

        $this->insertarPorLotes('ciudadanos', $filasCiudadanos);
        $this->insertarPorLotes('administrados', $filasAdministrados);

        echo '  ' . count($idsNuevos) . " personas creadas.\n";

        $todas = array_column($this->db->table('personas')->select('id')->get()->getResultArray(), 'id');
        return $todas;
    }

    // ---------------------------------------------------------------
    // Asociaciones
    // ---------------------------------------------------------------

    private function seedAsociaciones(array $personaIds): array
    {
        $faltan = $this->faltantes('asociaciones', self::META_ASOCIACIONES);
        if ($faltan === 0) {
            echo "  Asociaciones ya completas.\n";
            return array_column($this->db->table('asociaciones')->select('id')->get()->getResultArray(), 'id');
        }

        $maxAntes = (int) ($this->db->table('asociaciones')->selectMax('id')->get()->getRow()->id ?? 0);
        $nombresAsociacion = ['Asociación de Mototaxistas', 'Asociación de Transportistas', 'Sindicato de Choferes', 'Empresa de Transporte'];
        $sufijos = ['San Martín', 'Túpac Amaru', 'La Victoria', 'El Progreso', 'Unidos', 'San José', 'Virgen del Carmen', 'Santa Rosa', 'Las Flores', 'El Porvenir'];

        $filas = [];
        for ($i = 0; $i < $faltan; $i++) {
            $tipo = random_int(1, 100) <= 60 ? 'ASOCIACION' : 'PARTICULAR';
            $razonSocial = $tipo === 'ASOCIACION'
                ? $nombresAsociacion[array_rand($nombresAsociacion)] . ' "' . $sufijos[array_rand($sufijos)] . '"'
                : $this->faker->company();

            $filas[] = [
                'tipo' => $tipo,
                'razon_social' => mb_strtoupper($razonSocial),
                'id_representante_legal' => $personaIds[array_rand($personaIds)],
                'ruc' => $this->rucUnico(),
                'partida_registral' => 'PR' . random_int(100000, 999999),
                'fecha_creacion' => $this->fechaAleatoria(1825),
                'direccion' => $this->faker->streetAddress(),
                'tipo_ambiente' => $tipo === 'PARTICULAR' ? ['PUESTO DE MERCADO', 'LOCAL COMERCIAL'][array_rand(['PUESTO DE MERCADO', 'LOCAL COMERCIAL'])] : null,
                'numero_licencia' => $tipo === 'PARTICULAR' ? 'LIC-' . random_int(1000, 9999) : null,
                'resolucion_alcaldia' => 'R.A. N° ' . random_int(100, 999) . '-2024-MDJLO',
                'coordenadas' => $this->faker->latitude(-6.78, -6.72) . ', ' . $this->faker->longitude(-79.86, -79.80),
                'telefono_contacto' => $this->faker->numerify('9########'),
                'email_contacto' => $this->faker->unique()->safeEmail(),
                'estado' => $this->estadoPonderado(['ACTIVO' => 90, 'SUSPENDIDO' => 10]),
                'flota_autorizada' => random_int(10, 120),
            ];
        }

        $this->insertarPorLotes('asociaciones', $filas);
        $idsNuevos = $this->idsRecienInsertados('asociaciones', $maxAntes, count($filas));
        echo '  ' . count($idsNuevos) . " asociaciones creadas.\n";

        return array_column($this->db->table('asociaciones')->select('id')->get()->getResultArray(), 'id');
    }

    // ---------------------------------------------------------------
    // Vehículos + propietarios
    // ---------------------------------------------------------------

    private function seedVehiculos(array $personaIds, array $asociacionIds): array
    {
        $faltan = $this->faltantes('vehiculos', self::META_VEHICULOS);
        $propietarioDePorVehiculo = [];

        if ($faltan === 0) {
            echo "  Vehículos ya completos.\n";
            $existentes = $this->db->table('vehiculos')->select('id')->get()->getResultArray();
            return [array_column($existentes, 'id'), $propietarioDePorVehiculo];
        }

        $maxAntesVeh = (int) ($this->db->table('vehiculos')->selectMax('id')->get()->getRow()->id ?? 0);
        $marcas = ['Bajaj', 'TVS', 'Honda', 'Yamaha', 'Toyota', 'Hyundai', 'Kia', 'Nissan', 'Suzuki', 'Wanxin'];
        $colores = ['Rojo', 'Azul', 'Blanco', 'Negro', 'Amarillo', 'Verde', 'Gris', 'Plomo'];

        $filasVehiculos = [];
        $duenios = [];
        for ($i = 0; $i < $faltan; $i++) {
            $tieneAsociacion = random_int(1, 100) <= 70;
            $duenio = $personaIds[array_rand($personaIds)];
            $duenios[] = $duenio;

            $filasVehiculos[] = [
                'id_tipo_vehiculo' => $this->tiposVehiculoIds[array_rand($this->tiposVehiculoIds)],
                'id_asociacion' => $tieneAsociacion ? $asociacionIds[array_rand($asociacionIds)] : null,
                'placa' => $this->placaUnica(),
                'marca' => $marcas[array_rand($marcas)],
                'modelo' => 'M' . random_int(2015, 2024),
                'color' => $colores[array_rand($colores)],
                'anio_fabricacion' => random_int(2010, 2025),
                'categoria' => 'M1',
                'carroceria' => 'Cerrada',
                'sede_registro' => 'JOSE LEONARDO ORTIZ',
                'tipo_carroceria' => 'Estándar',
                'numero_serie' => strtoupper($this->faker->bothify('????########')),
                'serie_motor' => strtoupper($this->faker->bothify('MT###?????')),
                'partida_registral' => 'PR-VEH-' . random_int(100000, 999999),
                'codigo_qr' => 'QR-' . strtoupper($this->faker->bothify('????????????')),
                'estado' => $this->estadoPonderado(['ACTIVO' => 88, 'INACTIVO' => 12]),
            ];
        }

        $this->insertarPorLotes('vehiculos', $filasVehiculos);
        $idsNuevos = $this->idsRecienInsertados('vehiculos', $maxAntesVeh, count($filasVehiculos));

        $filasPropietarios = [];
        foreach ($idsNuevos as $idx => $idVehiculo) {
            if (!isset($duenios[$idx])) continue;
            $idPersona = $duenios[$idx];
            $propietarioDePorVehiculo[$idVehiculo] = $idPersona;
            $filasPropietarios[] = [
                'id_vehiculo' => $idVehiculo,
                'id_persona' => $idPersona,
                'fecha_inicio' => $this->fechaAleatoria(1460),
                'fecha_fin' => null,
                'documento_sustento' => 'Tarjeta de Propiedad',
                'estado' => 'ACTIVO',
            ];
        }
        $this->insertarPorLotes('vehiculo_propietarios', $filasPropietarios);

        echo '  ' . count($idsNuevos) . " vehículos creados.\n";

        $todos = array_column($this->db->table('vehiculos')->select('id')->get()->getResultArray(), 'id');
        return [$todos, $propietarioDePorVehiculo];
    }

    // ---------------------------------------------------------------
    // Cursos de seguridad vial + inscripciones + certificados
    // ---------------------------------------------------------------

    private function seedCursos(): array
    {
        $faltan = $this->faltantes('cursos_seguridad_vial', self::META_CURSOS);
        if ($faltan === 0) {
            echo "  Cursos ya completos.\n";
            return array_column($this->db->table('cursos_seguridad_vial')->select('id')->get()->getResultArray(), 'id');
        }

        $maxAntes = (int) ($this->db->table('cursos_seguridad_vial')->selectMax('id')->get()->getRow()->id ?? 0);
        $filas = [];
        $instructores = [
            'Ing. Carlos Mendoza Rivas',
            'Lic. Roberto Tapia Huamán',
            'My. PNP (r) Luis Alberto Farfán',
            'Dra. Patricia Salazar Vega',
            'Cap. PNP Marco Antonio Silva',
        ];
        for ($i = 0; $i < $faltan; $i++) {
            $tipoFecha = random_int(1, 4);
            if ($tipoFecha === 1) {
                $inicio = date('Y-m-d', strtotime('+' . random_int(5, 25) . ' days'));
                $estado = 'PROGRAMADO';
            } elseif ($tipoFecha === 2) {
                $inicio = date('Y-m-d', strtotime('-' . random_int(0, 1) . ' days'));
                $estado = 'EN_CURSO';
            } else {
                $inicio = $this->fechaAleatoria(365);
                $estado = 'FINALIZADO';
            }
            $fin = date('Y-m-d', strtotime($inicio . ' +2 days'));
            $filas[] = [
                'fecha_inicio' => $inicio,
                'fecha_fin' => $fin,
                'fecha_inscripcion_inicio' => date('Y-m-d', strtotime($inicio . ' -14 days')),
                'fecha_inscripcion_fin' => date('Y-m-d', strtotime($inicio . ' -1 day')),
                'hora_inicio' => '09:00:00', 'hora_fin' => '12:00:00',
                'codigo' => 'CSV-' . date('Y', strtotime($inicio)) . '-' . str_pad((string) ($maxAntes + $i + 1), 3, '0', STR_PAD_LEFT),
                'nombre' => 'Curso de Capacitación Vial ' . date('Y', strtotime($inicio)) . ' - Grupo ' . ($maxAntes + $i + 1),
                'descripcion' => 'Programa municipal de capacitación y sensibilización en seguridad vial y normas de tránsito.',
                'resolucion' => 'R.A. N° ' . random_int(100, 999) . '-' . date('Y', strtotime($inicio)) . '-MDJLO',
                'instructor' => $instructores[array_rand($instructores)],
                'lugar' => 'Auditorio Municipal - MDJLO',
                'costo_inscripcion' => [0, 20, 30, 50][array_rand([0, 20, 30, 50])],
                'cupos' => random_int(40, 80),
                'estado' => $estado,
                'carnet_expedicion' => $fin,
                'carnet_vencimiento' => date('Y-m-d', strtotime($fin . ' +2 years')),
            ];
        }
        $this->insertarPorLotes('cursos_seguridad_vial', $filas);
        echo '  ' . count($filas) . " cursos creados.\n";

        return array_column($this->db->table('cursos_seguridad_vial')->select('id')->get()->getResultArray(), 'id');
    }

    private function seedInscripcionesYCertificados(array $cursoIds, array $personaIds, array $vehiculoIds): array
    {
        $faltan = $this->faltantes('inscripciones_curso', self::META_INSCRIPCIONES);
        $inscripcionesPagadas = [];

        if ($faltan === 0 || empty($cursoIds)) {
            echo "  Inscripciones ya completas.\n";
            return array_column($this->db->table('inscripciones_curso')->select('id')->where('estado_pago', 'PAGADO')->get()->getResultArray(), 'id');
        }

        $maxAntesInsc = (int) ($this->db->table('inscripciones_curso')->selectMax('id')->get()->getRow()->id ?? 0);
        $filas = [];
        $estadosPago = [];
        $cursos = [];
        foreach ($this->db->table('cursos_seguridad_vial')->whereIn('id', $cursoIds)->get()->getResultArray() as $curso) $cursos[(int)$curso['id']] = $curso;
        $ocupados = [];
        $usados = [];
        foreach ($this->db->table('inscripciones_curso')->select('id_curso,id_persona,estado')->whereIn('id_curso', $cursoIds)->get()->getResultArray() as $inscripcion) {
            $usados[$inscripcion['id_curso']][$inscripcion['id_persona']] = true;
            if (!in_array($inscripcion['estado'], ['ANULADO','CANCELADO'], true)) $ocupados[$inscripcion['id_curso']] = ($ocupados[$inscripcion['id_curso']] ?? 0) + 1;
        }
        $disponibles = [];
        foreach ($cursos as $id=>$curso) {
            $libres = (int)$curso['cupos'] - ($ocupados[$id] ?? 0);
            if ($libres > 0) $disponibles[$id] = $libres;
        }
        for ($i = 0; $i < $faltan; $i++) {
            if (!$disponibles || !$personaIds) break;
            $idsConCupo = array_keys($disponibles);
            $idCurso = $idsConCupo[array_rand($idsConCupo)];
            $idPersona = null;
            for ($intento = 0; $intento < 20; $intento++) {
                $candidato = $personaIds[array_rand($personaIds)];
                if (!isset($usados[$idCurso][$candidato])) { $idPersona = $candidato; break; }
            }
            if ($idPersona === null) {
                foreach ($personaIds as $candidato) if (!isset($usados[$idCurso][$candidato])) { $idPersona = $candidato; break; }
                if ($idPersona === null) { unset($disponibles[$idCurso]); $i--; continue; }
            }
            $usados[$idCurso][$idPersona] = true;
            if (--$disponibles[$idCurso] === 0) unset($disponibles[$idCurso]);
            $fechaInscripcion = $cursos[$idCurso]['fecha_inscripcion_fin'] ?: date('Y-m-d', strtotime($cursos[$idCurso]['fecha_inicio'] . ' -1 day'));
            $asistio = random_int(1, 100) <= 80 ? 1 : 0;
            $estadoPago = $this->estadoPonderado(['PAGADO' => 85, 'PENDIENTE' => 15]);
            $estadosPago[] = $estadoPago;
            $filas[] = [
                'id_curso' => $idCurso,
                'id_persona' => $idPersona,
                'id_vehiculo' => random_int(1, 100) <= 40 && !empty($vehiculoIds) ? $vehiculoIds[array_rand($vehiculoIds)] : null,
                'fecha_inscripcion' => $fechaInscripcion,
                'estado_pago' => $estadoPago,
                'asistio' => $asistio,
                'estado' => $asistio ? 'CULMINADO' : 'INSCRITO',
            ];
        }
        if (count($filas) < $faltan) echo "  No se crean más inscripciones: se respetan los cupos y las personas disponibles.\n";
        $this->insertarPorLotes('inscripciones_curso', $filas);
        $idsNuevos = $this->idsRecienInsertados('inscripciones_curso', $maxAntesInsc, count($filas));

        foreach ($idsNuevos as $idx => $idInscripcion) {
            if (!isset($estadosPago[$idx])) continue;
            if ($estadosPago[$idx] === 'PAGADO') {
                $inscripcionesPagadas[] = $idInscripcion;
            }
        }

        // Certificados solo para quienes asistieron y aprobaron (~72% del total)
        $filasCertificados = [];
        $numeroBase = 1;
        foreach ($idsNuevos as $idx => $idInscripcion) {
            if (!isset($filas[$idx])) continue;
            if ($filas[$idx]['asistio'] === 1 && random_int(1, 100) <= 90) {
                $fechaExp = $cursos[$filas[$idx]['id_curso']]['fecha_fin'] ?: $cursos[$filas[$idx]['id_curso']]['fecha_inicio'];
                $filasCertificados[] = [
                    'id_inscripcion' => $idInscripcion,
                    'id_autoridad' => $this->inspectorPersonaIds[array_rand($this->inspectorPersonaIds)],
                    'fecha_expedicion' => $fechaExp,
                    'fecha_vencimiento' => date('Y-m-d', strtotime($fechaExp . ' +1 year')),
                    'numero_certificado' => 'CERT-CSV-' . str_pad((string) $numeroBase, 6, '0', STR_PAD_LEFT),
                    'cargo_autoridad' => 'Subgerente de Tránsito y Transporte',
                ];
                $numeroBase++;
            }
        }
        $this->insertarPorLotes('certificados_curso', $filasCertificados);

        echo '  ' . count($idsNuevos) . ' inscripciones y ' . count($filasCertificados) . " certificados creados.\n";
        return $inscripcionesPagadas;
    }

    // ---------------------------------------------------------------
    // Documentos del vehículo
    // ---------------------------------------------------------------

    private function seedDocumentosVehiculo(array $vehiculoIds): void
    {
        $actuales = (int) $this->db->table('documentos_vehiculo')->countAllResults();
        if ($actuales > 0 || empty($vehiculoIds)) {
            echo "  Documentos de vehículo: se omite (ya existen registros).\n";
            return;
        }

        $tipos = ['TARJETA_PROPIEDAD', 'SOAT', 'TARJETA_OPERATIVIDAD'];
        $filas = [];
        foreach ($vehiculoIds as $idVehiculo) {
            $cantidadDocs = random_int(1, 2);
            for ($d = 0; $d < $cantidadDocs; $d++) {
                $exp = $this->fechaAleatoria(730);
                $tipo = $tipos[array_rand($tipos)];
                $filas[] = [
                    'id_vehiculo' => $idVehiculo,
                    'fecha_expedicion' => $exp,
                    'fecha_expiracion' => $tipo === 'TARJETA_PROPIEDAD' ? null : date('Y-m-d', strtotime($exp . ' +1 year')),
                    'tipo_documento' => $tipo,
                    'codigo' => 'DOC-' . strtoupper($this->faker->bothify('??######')),
                    'estado' => $this->estadoPonderado(['VIGENTE' => 75, 'VENCIDO' => 25]),
                ];
            }
        }
        $this->insertarPorLotes('documentos_vehiculo', $filas);
        echo '  ' . count($filas) . " documentos de vehículo creados.\n";
    }

    // ---------------------------------------------------------------
    // CERTICAV (inspecciones técnicas)
    // ---------------------------------------------------------------

    private function seedCerticav(array $vehiculoIds, array $personaIds): void
    {
        $faltan = $this->faltantes('certicav', self::META_CERTICAV);
        if ($faltan === 0 || empty($vehiculoIds)) {
            echo "  CERTICAV ya completo.\n";
            return;
        }

        $maxAntes = (int) ($this->db->table('certicav')->selectMax('id')->get()->getRow()->id ?? 0);
        $filas = [];
        for ($i = 0; $i < $faltan; $i++) {
            $resultado = $this->estadoPonderado(['APROBADO' => 78, 'OBSERVADO' => 15, 'DESAPROBADO' => 7]);
            $fecha = $this->fechaAleatoria(1095);
            $filas[] = [
                'id_vehiculo' => $vehiculoIds[array_rand($vehiculoIds)],
                'id_conductor' => $personaIds[array_rand($personaIds)],
                'id_tecnico' => $this->inspectorPersonaIds[array_rand($this->inspectorPersonaIds)],
                'fecha' => $fecha,
                'numero_registro' => 'REG-' . str_pad((string) ($maxAntes + $i + 1), 6, '0', STR_PAD_LEFT),
                'numero_serie_certicav' => 'CV-' . strtoupper($this->faker->bothify('??######')),
                'primera_evaluacion' => $resultado === 'DESAPROBADO' ? 'DESAPROBADO' : 'APROBADO',
                'segunda_evaluacion' => $resultado === 'DESAPROBADO' ? null : null,
                'fecha_segunda_evaluacion' => null,
                'resultado' => $resultado,
                'observaciones' => $resultado === 'OBSERVADO' ? 'Observaciones menores en carrocería.' : null,
                'estado' => 'ACTIVO',
            ];
        }
        $this->insertarPorLotes('certicav', $filas);
        $idsNuevos = $this->idsRecienInsertados('certicav', $maxAntes, count($filas));

        // Detalle de criterios evaluados por cada inspección (~12 criterios c/u)
        if (!empty($this->criteriosInspeccionIds)) {
            $filasDetalle = [];
            foreach ($idsNuevos as $idCerticav) {
                $criteriosElegidos = (array) array_rand($this->criteriosInspeccionIds, min(12, count($this->criteriosInspeccionIds)));
                foreach ($criteriosElegidos as $idxCriterio) {
                    $filasDetalle[] = [
                        'id_certicav' => $idCerticav,
                        'id_criterio' => $this->criteriosInspeccionIds[$idxCriterio],
                        'estado_revision' => $this->estadoPonderado(['BIEN' => 82, 'M.E.' => 12, 'N.T.' => 6]),
                        'observacion' => null,
                    ];
                }
            }
            $this->insertarPorLotes('certicav_detalles', $filasDetalle);
        }

        echo '  ' . count($idsNuevos) . " inspecciones CERTICAV creadas.\n";
    }

    // ---------------------------------------------------------------
    // Operativos
    // ---------------------------------------------------------------

    private function seedOperativos(): array
    {
        $faltan = $this->faltantes('operativos', self::META_OPERATIVOS);
        if ($faltan === 0) {
            echo "  Operativos ya completos.\n";
            return array_column($this->db->table('operativos')->select('id')->get()->getResultArray(), 'id');
        }

        $maxAntes = (int) ($this->db->table('operativos')->selectMax('id')->get()->getRow()->id ?? 0);
        $lugares = ['Av. Chiclayo', 'Av. Culpón', 'Av. Leguía', 'Óvalo Miraflores', 'Mercado Modelo', 'Av. Panamericana Norte', 'Jr. Manuel María Izaga'];

        $filas = [];
        for ($i = 0; $i < $faltan; $i++) {
            $fecha = $this->fechaAleatoria(1095);
            $filas[] = [
                'nombre' => 'Operativo de Fiscalización ' . ($maxAntes + $i + 1),
                'lugar' => $lugares[array_rand($lugares)],
                'fecha' => $fecha,
                'hora_inicio' => sprintf('%02d:00:00', random_int(7, 18)),
                'hora_fin' => sprintf('%02d:00:00', random_int(19, 22)),
                'estado' => 'FINALIZADO',
                'observacion' => null,
                'id_usuario_registra' => $this->inspectorUsuarioIds[array_rand($this->inspectorUsuarioIds)],
            ];
        }
        $this->insertarPorLotes('operativos', $filas);
        $idsNuevos = $this->idsRecienInsertados('operativos', $maxAntes, count($filas));

        $filasInspectores = [];
        foreach ($idsNuevos as $idOperativo) {
            $inspectoresAsignados = (array) array_rand(array_combine($this->inspectorPersonaIds, $this->inspectorPersonaIds), min(3, count($this->inspectorPersonaIds)));
            foreach ($inspectoresAsignados as $idInspector) {
                $filasInspectores[] = [
                    'id_operativo' => $idOperativo,
                    'id_inspector' => $idInspector,
                    'estado' => 'ASIGNADO',
                ];
            }
        }
        $this->insertarPorLotes('operativo_inspectores', $filasInspectores);

        echo '  ' . count($idsNuevos) . " operativos creados.\n";
        return array_column($this->db->table('operativos')->select('id')->get()->getResultArray(), 'id');
    }

    // ---------------------------------------------------------------
    // Papeletas + detalles
    // ---------------------------------------------------------------

    private function seedPapeletasYDetalles(array $vehiculoIds, array $personaIds, array $operativoIds, array $propietarioDePorVehiculo): array
    {
        $faltan = $this->faltantes('papeletas', self::META_PAPELETAS);
        $papeletasPagadas = [];
        $papeletaVehiculoMap = [];

        if ($faltan === 0 || empty($vehiculoIds)) {
            echo "  Papeletas ya completas.\n";
            $existentes = $this->db->table('papeletas')->select('id, id_vehiculo, estado')->get()->getResultArray();
            foreach ($existentes as $row) {
                $papeletaVehiculoMap[(int) $row['id']] = (int) $row['id_vehiculo'];
                if ($row['estado'] === 'PAGADA') $papeletasPagadas[] = (int) $row['id'];
            }
            return [$papeletasPagadas, $papeletaVehiculoMap];
        }

        $maxAntes = (int) ($this->db->table('papeletas')->selectMax('id')->get()->getRow()->id ?? 0);
        $lugares = ['Av. Chiclayo', 'Av. Culpón', 'Av. Leguía', 'Óvalo Miraflores', 'Mercado Modelo', 'Av. Panamericana Norte'];

        $filas = [];
        $vehiculoPorFila = [];
        for ($i = 0; $i < $faltan; $i++) {
            $idVehiculo = $vehiculoIds[array_rand($vehiculoIds)];
            $vehiculoPorFila[] = $idVehiculo;
            $infractor = $propietarioDePorVehiculo[$idVehiculo] ?? $personaIds[array_rand($personaIds)];
            $estado = $this->estadoPonderado(['PAGADA' => 60, 'PENDIENTE_PAGO' => 30, 'ANULADA' => 10]);
            $fechaHora = $this->fechaAleatoria(1095) . ' ' . sprintf('%02d:%02d:00', random_int(6, 21), random_int(0, 59));

            $filas[] = [
                'id_vehiculo' => $idVehiculo,
                'id_persona_infractor' => $infractor,
                'id_inspector' => $this->inspectorPersonaIds[array_rand($this->inspectorPersonaIds)],
                'id_operativo' => !empty($operativoIds) && random_int(1, 100) <= 60 ? $operativoIds[array_rand($operativoIds)] : null,
                'fecha_hora' => $fechaHora,
                'firma_conductor_fecha' => null,
                'numero_papeleta' => 'PAP-' . str_pad((string) ($maxAntes + $i + 1), 7, '0', STR_PAD_LEFT),
                'lugar' => $lugares[array_rand($lugares)],
                'unidad_autoridad' => 'Subgerencia de Tránsito y Transporte',
                'nombre_autoridad' => 'Inspector Municipal',
                'observacion_autoridad' => 'Vehículo intervenido por infracción al reglamento de tránsito municipal.',
                'observaciones_conductor' => random_int(1, 100) <= 60 ? 'El conductor manifestó encontrarse de paso por la zona y solicitó consideraciones.' : null,
                'firma_conductor_img' => null,
                'firma_conductor_estado' => 'PENDIENTE',
                'firma_conductor_observacion' => null,
                'monto_total' => 0,
                'estado' => $estado,
            ];
        }

        $this->insertarPorLotes('papeletas', $filas);
        $idsNuevos = $this->idsRecienInsertados('papeletas', $maxAntes, count($filas));

        $filasDetalles = [];
        $actualizacionesMonto = [];
        foreach ($idsNuevos as $idx => $idPapeleta) {
            if (!isset($filas[$idx])) continue; // salvaguarda: nunca desbordar $filas
            $papeletaVehiculoMap[$idPapeleta] = $vehiculoPorFila[$idx];
            if ($filas[$idx]['estado'] === 'PAGADA') {
                $papeletasPagadas[] = $idPapeleta;
            }

            $cantidadInfracciones = random_int(1, 2);
            $montoTotal = 0;
            for ($d = 0; $d < $cantidadInfracciones; $d++) {
                $idTipoInfraccion = $this->tiposInfraccionIds[array_rand($this->tiposInfraccionIds)];
                $monto = round(random_int(50, 900), 2);
                $descuento = random_int(1, 100) <= 20 ? round($monto * 0.25, 2) : 0;
                $montoFinal = $monto - $descuento;
                $montoTotal += $montoFinal;

                $filasDetalles[] = [
                    'id_papeleta' => $idPapeleta,
                    'id_tipo_infraccion' => $idTipoInfraccion,
                    'monto' => $monto,
                    'descuento' => $descuento,
                    'monto_final' => $montoFinal,
                ];
            }
            $actualizacionesMonto[] = ['id' => $idPapeleta, 'monto_total' => $montoTotal];
        }

        $this->insertarPorLotes('papeleta_detalles', $filasDetalles);
        foreach (array_chunk($actualizacionesMonto, self::BATCH_SIZE) as $lote) {
            $this->db->table('papeletas')->updateBatch($lote, 'id');
        }

        echo '  ' . count($idsNuevos) . " papeletas creadas.\n";
        return [$papeletasPagadas, $papeletaVehiculoMap];
    }

    // ---------------------------------------------------------------
    // Reportes de intervención
    // ---------------------------------------------------------------

    private function seedReportesIntervencion(array $vehiculoIds, array $personaIds, array $operativoIds): void
    {
        $faltan = $this->faltantes('reportes_intervencion', self::META_REPORTES_INTERVENCION);
        if ($faltan === 0 || empty($vehiculoIds)) {
            echo "  Reportes de intervención ya completos.\n";
            return;
        }

        $maxAntes = (int) ($this->db->table('reportes_intervencion')->selectMax('id')->get()->getRow()->id ?? 0);
        $lugares = ['Av. Chiclayo', 'Av. Culpón', 'Av. Leguía', 'Mercado Modelo'];
        $filas = [];
        for ($i = 0; $i < $faltan; $i++) {
            $idVehiculo = $vehiculoIds[array_rand($vehiculoIds)];
            $estado = $this->estadoPonderado(['PENDIENTE' => 30, 'CONVERTIDO_PAPELETA' => 55, 'RECHAZADO' => 15]);
            $filas[] = [
                'id_inspector' => $this->inspectorPersonaIds[array_rand($this->inspectorPersonaIds)],
                'id_vehiculo' => $idVehiculo,
                'id_conductor' => $personaIds[array_rand($personaIds)],
                'id_papeleta' => null,
                'id_operativo' => !empty($operativoIds) ? $operativoIds[array_rand($operativoIds)] : null,
                'placa' => null,
                'fecha_hora' => $this->fechaAleatoria(1095) . ' ' . sprintf('%02d:%02d:00', random_int(6, 21), random_int(0, 59)),
                'lugar' => $lugares[array_rand($lugares)],
                'coordenadas' => $this->faker->latitude(-6.78, -6.72) . ',' . $this->faker->longitude(-79.86, -79.80),
                'observaciones' => 'Intervención registrada en campo por inspector municipal.',
                'observaciones_conductor' => random_int(1, 100) <= 55 ? 'El conductor indicó que subsanará la observación de inmediato.' : null,
                'estado' => $estado,
                'motivo_rechazo' => $estado === 'RECHAZADO' ? 'Foto insuficiente o placa ilegible.' : null,
            ];
        }
        $this->insertarPorLotes('reportes_intervencion', $filas);
        $idsNuevos = $this->idsRecienInsertados('reportes_intervencion', $maxAntes, count($filas));

        $filasInfracciones = [];
        foreach ($idsNuevos as $idReporte) {
            $filasInfracciones[] = [
                'id_reporte' => $idReporte,
                'id_tipo_infraccion' => $this->tiposInfraccionIds[array_rand($this->tiposInfraccionIds)],
            ];
        }
        $this->insertarPorLotes('reporte_intervencion_infracciones', $filasInfracciones);

        echo '  ' . count($idsNuevos) . " reportes de intervención creados.\n";
    }

    // ---------------------------------------------------------------
    // Internamientos + órdenes de libertad
    // ---------------------------------------------------------------

    private function seedInternamientos(array $vehiculoIds, array $personaIds, array $papeletaVehiculoMap): void
    {
        $faltan = $this->faltantes('ordenes_internamiento', self::META_INTERNAMIENTOS);
        if ($faltan === 0 || empty($vehiculoIds)) {
            echo "  Internamientos ya completos.\n";
            return;
        }

        $maxAntes = (int) ($this->db->table('ordenes_internamiento')->selectMax('id')->get()->getRow()->id ?? 0);
        $papeletaIds = array_keys($papeletaVehiculoMap);

        $filas = [];
        $estadosFila = [];
        for ($i = 0; $i < $faltan; $i++) {
            $usaPapeleta = !empty($papeletaIds) && random_int(1, 100) <= 70;
            $idPapeleta = $usaPapeleta ? $papeletaIds[array_rand($papeletaIds)] : null;
            $idVehiculo = $idPapeleta ? $papeletaVehiculoMap[$idPapeleta] : $vehiculoIds[array_rand($vehiculoIds)];
            $estado = $this->estadoPonderado(['LIBERADO' => 65, 'RETENIDO' => 35]);
            $estadosFila[] = $estado;
            $ingreso = $this->fechaAleatoria(900);

            $filas[] = [
                'id_papeleta' => $idPapeleta,
                'id_vehiculo' => $idVehiculo,
                'id_remisor' => $this->inspectorPersonaIds[array_rand($this->inspectorPersonaIds)],
                'id_interesado' => $personaIds[array_rand($personaIds)],
                'fecha_ingreso' => $ingreso . ' ' . sprintf('%02d:00:00', random_int(7, 20)),
                'fecha_salida' => $estado === 'LIBERADO' ? date('Y-m-d H:i:s', strtotime($ingreso . ' +' . random_int(1, 15) . ' days')) : null,
                'deposito' => 'Depósito Municipal MDJLO',
                'motivo' => 'Infracción de tránsito detectada en operativo.',
                'numero_boleta' => 'BOL-' . random_int(10000, 99999),
                'total_dias' => $estado === 'LIBERADO' ? random_int(1, 15) : null,
                'estado' => $estado,
                'lugar_intervencion' => 'Vía pública - José Leonardo Ortiz',
                'observaciones' => null,
                'grado_remisor' => 'Inspector Municipal',
                'carnet_remisor' => 'C-' . random_int(1000, 9999),
                'autoridad_que_dispone' => 'Subgerencia de Tránsito y Transporte',
                'estado_carroceria' => 'Buen estado general, sin daños visibles.',
            ];
        }

        $this->insertarPorLotes('ordenes_internamiento', $filas);
        $idsNuevos = $this->idsRecienInsertados('ordenes_internamiento', $maxAntes, count($filas));

        $filasLibertad = [];
        $numeroBase = 1;
        foreach ($idsNuevos as $idx => $idInternamiento) {
            if (!isset($estadosFila[$idx])) continue;
            if ($estadosFila[$idx] === 'LIBERADO') {
                $montoPapeleta = round(random_int(80, 600), 2);
                $montoGuardiania = round(random_int(20, 100), 2);
                $filasLibertad[] = [
                    'id_internamiento' => $idInternamiento,
                    'id_persona_autorizada' => $personaIds[array_rand($personaIds)],
                    'fecha_emision' => $this->fechaAleatoria(700),
                    'numero_orden' => 'LIB-' . str_pad((string) $numeroBase, 6, '0', STR_PAD_LEFT),
                    'numero_recibo_papeleta' => 'REC-P-' . random_int(10000, 99999),
                    'monto_papeleta' => $montoPapeleta,
                    'numero_recibo_guardiania' => 'REC-G-' . random_int(10000, 99999),
                    'monto_guardiania' => $montoGuardiania,
                    'numero_recibo_remolque' => null,
                    'monto_remolque' => 0,
                    'monto_total' => $montoPapeleta + $montoGuardiania,
                    'observaciones' => null,
                    'estado' => 'EMITIDA',
                ];
                $numeroBase++;
            }
        }
        $this->insertarPorLotes('ordenes_libertad', $filasLibertad);

        echo '  ' . count($idsNuevos) . ' internamientos y ' . count($filasLibertad) . " órdenes de libertad creados.\n";
    }

    // ---------------------------------------------------------------
    // Trámites documentarios + permisos de circulación
    // ---------------------------------------------------------------

    private function seedTramitesYPermisos(array $personaIds, array $asociacionIds, array $vehiculoIds): array
    {
        $faltan = $this->faltantes('tramites_documentarios', self::META_TRAMITES);
        $tramitesPagados = [];

        if ($faltan === 0 || empty($this->procedimientoIds)) {
            echo "  Trámites ya completos.\n";
            return array_column($this->db->table('tramites_documentarios')->select('id')->where('estado', 'APROBADO')->get()->getResultArray(), 'id');
        }

        $maxAntes = (int) ($this->db->table('tramites_documentarios')->selectMax('id')->get()->getRow()->id ?? 0);
        $filas = [];
        for ($i = 0; $i < $faltan; $i++) {
            $fecha = $this->fechaAleatoria(900);
            $filas[] = [
                'id_procedimiento_admin' => $this->procedimientoIds[array_rand($this->procedimientoIds)],
                'id_persona' => $personaIds[array_rand($personaIds)],
                'id_asociacion' => random_int(1, 100) <= 50 && !empty($asociacionIds) ? $asociacionIds[array_rand($asociacionIds)] : null,
                'id_vehiculo' => random_int(1, 100) <= 60 && !empty($vehiculoIds) ? $vehiculoIds[array_rand($vehiculoIds)] : null,
                'fecha_solicitud' => $fecha,
                'numero_expediente' => 'EXP-' . str_pad((string) ($maxAntes + $i + 1), 6, '0', STR_PAD_LEFT),
                'funcionario_dirigido' => 'Subgerente de Tránsito y Transporte',
                'cargo_funcionario' => 'Subgerente',
                'detalle_solicitud' => 'Solicitud de trámite administrativo municipal.',
                'estado' => $this->estadoPonderado(['APROBADO' => 70, 'PENDIENTE' => 20, 'RECHAZADO' => 10]),
            ];
        }
        $this->insertarPorLotes('tramites_documentarios', $filas);
        $idsNuevos = $this->idsRecienInsertados('tramites_documentarios', $maxAntes, count($filas));

        $filasPermisos = [];
        $numeroBase = 1;
        foreach ($idsNuevos as $idx => $idTramite) {
            if (!isset($filas[$idx])) continue;
            if ($filas[$idx]['estado'] === 'APROBADO') {
                $tramitesPagados[] = $idTramite;
                $emision = $this->fechaAleatoria(700);
                $filasPermisos[] = [
                    'id_tramite' => $idTramite,
                    'id_persona' => $filas[$idx]['id_persona'],
                    'id_asociacion' => $filas[$idx]['id_asociacion'],
                    'id_vehiculo' => $filas[$idx]['id_vehiculo'],
                    'horario_inicio' => '06:00:00',
                    'horario_fin' => '22:00:00',
                    'fecha_emision' => $emision,
                    'fecha_inicio_vigencia' => $emision,
                    'fecha_fin_vigencia' => date('Y-m-d', strtotime($emision . ' +1 year')),
                    'numero_autorizacion' => 'AUT-' . str_pad((string) $numeroBase, 6, '0', STR_PAD_LEFT),
                    'tipo_permiso' => 'CIRCULACION',
                    'asunto' => 'Autorización de circulación vehicular',
                    'referencia_sisgedo' => null,
                    'registro_numero' => 'REG-' . random_int(10000, 99999),
                    'contenido' => 'Se autoriza la circulación y operatividad del vehículo especificado, manteniéndose sujeto a las normas vigentes de tránsito y transporte del Distrito de José Leonardo Ortiz.',
                    'zona_circulacion' => 'Anillo Vial y Cuadrantes Autorizados - Distrito de José Leonardo Ortiz',
                    'ubicacion' => 'José Leonardo Ortiz',
                    'recorrido_ingreso' => null,
                    'flota_placas' => null,
                    'tonelaje' => null,
                    'numero_seguridad' => null,
                    'observaciones' => null,
                    'estado' => 'VIGENTE',
                ];
                $numeroBase++;
            }
        }
        $this->insertarPorLotes('permisos_circulacion', $filasPermisos);

        echo '  ' . count($idsNuevos) . ' trámites y ' . count($filasPermisos) . " permisos de circulación creados.\n";
        return $tramitesPagados;
    }

    // ---------------------------------------------------------------
    // Pagos
    // ---------------------------------------------------------------

    private function seedPagos(array $papeletasPagadas, array $tramitesPagados, array $inscripcionesPagadas): void
    {
        $maxRecibo = 0;
        $existentes = $this->db->table('pagos_transito')->select('numero_recibo')->get()->getResultArray();
        foreach ($existentes as $pr) {
            if (!empty($pr['numero_recibo']) && preg_match('/(?:REC-)?(\d+)/', (string)$pr['numero_recibo'], $m)) {
                $maxRecibo = max($maxRecibo, (int)$m[1]);
            }
        }
        $numeroBase = $maxRecibo + 1;
        $filas = [];
        $mediosPago = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'YAPE', 'PLIN'];

        $papeletasConPago = array_flip(array_column(
            $this->db->table('pagos_transito')->select('id_papeleta')->where('id_papeleta IS NOT NULL')->get()->getResultArray(),
            'id_papeleta'
        ));
        $tramitesConPago = array_flip(array_column(
            $this->db->table('pagos_transito')->select('id_tramite')->where('id_tramite IS NOT NULL')->get()->getResultArray(),
            'id_tramite'
        ));
        $inscripcionesConPago = array_flip(array_column(
            $this->db->table('pagos_transito')->select('id_inscripcion')->where('id_inscripcion IS NOT NULL')->get()->getResultArray(),
            'id_inscripcion'
        ));

        foreach (array_unique($papeletasPagadas) as $idPapeleta) {
            if (isset($papeletasConPago[$idPapeleta])) continue;
            $fecha = $this->fechaAleatoria(1095);
            $filas[] = [
                'id_papeleta' => $idPapeleta,
                'id_tramite' => null,
                'id_inscripcion' => null,
                'fecha_pago' => $fecha,
                'hora_pago' => sprintf('%02d:%02d:00', random_int(8, 17), random_int(0, 59)),
                'tipo_pago' => 'PAPELETA',
                'numero_recibo' => 'REC-' . str_pad((string) $numeroBase, 7, '0', STR_PAD_LEFT),
                'numero_voucher' => 'V-' . random_int(100000, 999999),
                'medio_pago' => $mediosPago[array_rand($mediosPago)],
                'referencia_pago' => null,
                'total' => round(random_int(50, 900), 2),
                'estado' => 'PAGADO',
            ];
            $numeroBase++;
            $papeletasConPago[$idPapeleta] = true;
        }

        foreach (array_unique($tramitesPagados) as $idTramite) {
            if (isset($tramitesConPago[$idTramite])) continue;
            $fecha = $this->fechaAleatoria(900);
            $filas[] = [
                'id_papeleta' => null,
                'id_tramite' => $idTramite,
                'id_inscripcion' => null,
                'fecha_pago' => $fecha,
                'hora_pago' => sprintf('%02d:%02d:00', random_int(8, 17), random_int(0, 59)),
                'tipo_pago' => 'TRAMITE',
                'numero_recibo' => 'REC-' . str_pad((string) $numeroBase, 7, '0', STR_PAD_LEFT),
                'numero_voucher' => 'V-' . random_int(100000, 999999),
                'medio_pago' => $mediosPago[array_rand($mediosPago)],
                'referencia_pago' => null,
                'total' => round(random_int(80, 400), 2),
                'estado' => 'PAGADO',
            ];
            $numeroBase++;
            $tramitesConPago[$idTramite] = true;
        }

        foreach (array_unique($inscripcionesPagadas) as $idInscripcion) {
            if (isset($inscripcionesConPago[$idInscripcion])) continue;
            $fecha = $this->fechaAleatoria(1095);
            $filas[] = [
                'id_papeleta' => null,
                'id_tramite' => null,
                'id_inscripcion' => $idInscripcion,
                'fecha_pago' => $fecha,
                'hora_pago' => sprintf('%02d:%02d:00', random_int(8, 17), random_int(0, 59)),
                'tipo_pago' => 'CURSO',
                'numero_recibo' => 'REC-' . str_pad((string) $numeroBase, 7, '0', STR_PAD_LEFT),
                'numero_voucher' => 'V-' . random_int(100000, 999999),
                'medio_pago' => $mediosPago[array_rand($mediosPago)],
                'referencia_pago' => null,
                'total' => round(random_int(20, 60), 2),
                'estado' => 'PAGADO',
            ];
            $numeroBase++;
            $inscripcionesConPago[$idInscripcion] = true;
        }

        if (!empty($filas)) {
            $this->insertarPorLotes('pagos_transito', $filas);
        }
        echo '  ' . count($filas) . " pagos creados.\n";
    }
}
