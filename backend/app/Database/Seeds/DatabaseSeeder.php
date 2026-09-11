<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;
use PDO;

class DatabaseSeeder extends Seeder
{
    public function run()
    {
        $db = \Config\Database::connect();
        $pdo = new PDO(
            "mysql:host={$db->hostname};port={$db->port};dbname={$db->database};charset=utf8mb4",
            $db->username,
            $db->password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );

        $this->seedAll($pdo);
    }

    public static function executeDirect()
    {
        $pdo = new PDO(
            'mysql:host=127.0.0.1;port=3306;dbname=transitomunicipal;charset=utf8mb4',
            'root',
            '',
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );

        $instance = new self(new \Config\Database());
        $instance->seedAll($pdo);
    }

    private function seedAll(PDO $pdo): void
    {
        echo "Iniciando seeder para transitomunicipal...\n";
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

        $operationalTables = [
            'pagos_transito',
            'ordenes_libertad',
            'orden_internamiento_inventario',
            'ordenes_internamiento',
            'inventario_criterios',
            'papeleta_detalles',
            'papeletas',
            'tipos_infraccion',
            'certicav_detalles',
            'certicav',
            'inspeccion_criterios',
            'certificados_curso',
            'inscripciones_curso',
            'cursos_seguridad_vial',
            'permisos_circulacion',
            'tramites_documentarios',
            'procedimientos_administrativos',
            'documentos_vehiculo',
            'vehiculo_propietarios',
            'vehiculos',
            'tipos_vehiculo',
            'organizaciones',
            'usuarios',
            'desplazamiento_oficina',
            'administrados',
            'trabajadores',
            'ciudadanos',
            'personas',
            'cargos',
        ];

        foreach ($operationalTables as $tbl) {
            $pdo->exec("TRUNCATE TABLE `$tbl`");
        }
        echo "Tablas operativas limpiadas correctamente.\n";

        $cargos = [
            ['id' => 1, 'nombre' => 'SUBGERENTE DE TRÁNSITO Y TRANSPORTE', 'estado' => 'ACTIVO'],
            ['id' => 2, 'nombre' => 'INSPECTOR DE TRÁNSITO MUNICIPAL', 'estado' => 'ACTIVO'],
            ['id' => 3, 'nombre' => 'INSPECTOR TÉCNICO VEHICULAR', 'estado' => 'ACTIVO'],
            ['id' => 4, 'nombre' => 'ADMINISTRADOR DE DEPÓSITO MUNICIPAL', 'estado' => 'ACTIVO'],
            ['id' => 5, 'nombre' => 'ESPECIALISTA EN EDUCACIÓN VIAL', 'estado' => 'ACTIVO'],
            ['id' => 6, 'nombre' => 'CAJERO DE RECAUDACIÓN', 'estado' => 'ACTIVO'],
        ];
        $stmtCargo = $pdo->prepare("INSERT INTO cargos (id, nombre, estado) VALUES (:id, :nombre, :estado)");
        foreach ($cargos as $c) {
            $stmtCargo->execute($c);
        }
        echo "✓ Cargos insertados (" . count($cargos) . ")\n";

        $personas = [
            ['id' => 1, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '10293847', 'direccion' => 'Av. Sáenz Peña N° 340, José Leonardo Ortiz', 'telefono' => '074-251234', 'celular' => '979100001', 'email' => 'carlos.mendoza@munijlo.gob.pe', 'estado' => 'ACTIVO',
             'nombres' => 'Carlos Alberto', 'apellido_paterno' => 'Mendoza', 'apellido_materno' => 'Salazar', 'sexo' => 'M', 'fecha_nacimiento' => '1982-05-14', 'estado_civil' => 'CASADO(A)', 'profesion' => 'Ingeniero de Transportes'],
            ['id' => 2, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '20394856', 'direccion' => 'Calle Los Laureles N° 120, José Leonardo Ortiz', 'telefono' => '074-251235', 'celular' => '979100002', 'email' => 'jorge.tapia@munijlo.gob.pe', 'estado' => 'ACTIVO',
             'nombres' => 'Jorge Luis', 'apellido_paterno' => 'Tapia', 'apellido_materno' => 'Bustamante', 'sexo' => 'M', 'fecha_nacimiento' => '1988-08-20', 'estado_civil' => 'SOLTERO(A)', 'profesion' => 'Inspector Municipal'],
            ['id' => 3, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '30485960', 'direccion' => 'Av. Chiclayo N° 580, José Leonardo Ortiz', 'telefono' => '074-251236', 'celular' => '979100003', 'email' => 'walter.sanchez@munijlo.gob.pe', 'estado' => 'ACTIVO',
             'nombres' => 'Walter Percy', 'apellido_paterno' => 'Sánchez', 'apellido_materno' => 'Torres', 'sexo' => 'M', 'fecha_nacimiento' => '1985-11-12', 'estado_civil' => 'CASADO(A)', 'profesion' => 'Inspector Municipal'],
            ['id' => 4, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '40596071', 'direccion' => 'Calle Panamá N° 210, José Leonardo Ortiz', 'telefono' => '074-251237', 'celular' => '979100004', 'email' => 'roberto.diaz@munijlo.gob.pe', 'estado' => 'ACTIVO',
             'nombres' => 'Roberto Carlos', 'apellido_paterno' => 'Díaz', 'apellido_materno' => 'Farro', 'sexo' => 'M', 'fecha_nacimiento' => '1990-03-05', 'estado_civil' => 'SOLTERO(A)', 'profesion' => 'Técnico Mecánico Automotriz'],
            ['id' => 5, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '50607182', 'direccion' => 'Av. Balta N° 1430, José Leonardo Ortiz', 'telefono' => '074-251238', 'celular' => '979100005', 'email' => 'miguel.quispe@munijlo.gob.pe', 'estado' => 'ACTIVO',
             'nombres' => 'Miguel Ángel', 'apellido_paterno' => 'Quispe', 'apellido_materno' => 'Huamán', 'sexo' => 'M', 'fecha_nacimiento' => '1987-09-28', 'estado_civil' => 'CONVIVIENTE', 'profesion' => 'Administrador de Depósito'],

            ['id' => 6, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '45892104', 'direccion' => 'Av. Chiclayo N° 1240, José Leonardo Ortiz', 'telefono' => '', 'celular' => '978111006', 'email' => 'santos.chaname@gmail.com', 'estado' => 'ACTIVO',
             'nombres' => 'José Santos', 'apellido_paterno' => 'Chanamé', 'apellido_materno' => 'Díaz', 'sexo' => 'M', 'fecha_nacimiento' => '1979-04-10', 'estado_civil' => 'CASADO(A)', 'profesion' => 'Transportista'],
            ['id' => 7, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '47120395', 'direccion' => 'Calle San Martín N° 450, José Leonardo Ortiz', 'telefono' => '', 'celular' => '978111007', 'email' => 'segundo.vilchez@gmail.com', 'estado' => 'ACTIVO',
             'nombres' => 'Segundo Manuel', 'apellido_paterno' => 'Vílchez', 'apellido_materno' => 'Mera', 'sexo' => 'M', 'fecha_nacimiento' => '1983-12-01', 'estado_civil' => 'CASADO(A)', 'profesion' => 'Transportista'],
            ['id' => 8, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '43901827', 'direccion' => 'Av. Kennedy N° 780, José Leonardo Ortiz', 'telefono' => '', 'celular' => '978111008', 'email' => 'juan.coronado@gmail.com', 'estado' => 'ACTIVO',
             'nombres' => 'Juan Carlos', 'apellido_paterno' => 'Coronado', 'apellido_materno' => 'Rojas', 'sexo' => 'M', 'fecha_nacimiento' => '1986-07-15', 'estado_civil' => 'CONVIVIENTE', 'profesion' => 'Conductor de Mototaxi'],
            ['id' => 9, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '41829034', 'direccion' => 'Calle Venezuela N° 620, José Leonardo Ortiz', 'telefono' => '', 'celular' => '978111009', 'email' => 'pedro.santisteban@gmail.com', 'estado' => 'ACTIVO',
             'nombres' => 'Pedro Pablo', 'apellido_paterno' => 'Santisteban', 'apellido_materno' => 'Llontop', 'sexo' => 'M', 'fecha_nacimiento' => '1981-02-18', 'estado_civil' => 'CASADO(A)', 'profesion' => 'Comerciante y Transportista'],
            ['id' => 10, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '48291045', 'direccion' => 'Av. México N° 910, José Leonardo Ortiz', 'telefono' => '', 'celular' => '978111010', 'email' => 'walter.cumpa@gmail.com', 'estado' => 'ACTIVO',
             'nombres' => 'Walter David', 'apellido_paterno' => 'Cumpa', 'apellido_materno' => 'Maco', 'sexo' => 'M', 'fecha_nacimiento' => '1992-06-25', 'estado_civil' => 'SOLTERO(A)', 'profesion' => 'Conductor'],
            ['id' => 11, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '46102938', 'direccion' => 'Calle Cahuide N° 315, José Leonardo Ortiz', 'telefono' => '', 'celular' => '978111011', 'email' => 'julio.ballena@gmail.com', 'estado' => 'ACTIVO',
             'nombres' => 'Julio César', 'apellido_paterno' => 'Ballena', 'apellido_materno' => 'Mechan', 'sexo' => 'M', 'fecha_nacimiento' => '1989-10-30', 'estado_civil' => 'SOLTERO(A)', 'profesion' => 'Chofer Independiente'],
            ['id' => 12, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '44920183', 'direccion' => 'Av. Dorado N° 412, José Leonardo Ortiz', 'telefono' => '', 'celular' => '978111012', 'email' => 'luis.siesquen@gmail.com', 'estado' => 'ACTIVO',
             'nombres' => 'Luis Enrique', 'apellido_paterno' => 'Siesquén', 'apellido_materno' => 'Suclupe', 'sexo' => 'M', 'fecha_nacimiento' => '1984-01-19', 'estado_civil' => 'CASADO(A)', 'profesion' => 'Comerciante'],
            ['id' => 13, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '49018273', 'direccion' => 'Calle Inca Roca N° 520, José Leonardo Ortiz', 'telefono' => '', 'celular' => '978111013', 'email' => 'elmer.farronan@gmail.com', 'estado' => 'ACTIVO',
             'nombres' => 'Elmer Antonio', 'apellido_paterno' => 'Farroñan', 'apellido_materno' => 'Chuzón', 'sexo' => 'M', 'fecha_nacimiento' => '1993-09-08', 'estado_civil' => 'SOLTERO(A)', 'profesion' => 'Mecánico'],
            ['id' => 14, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '42091823', 'direccion' => 'Av. Augusto B. Leguía N° 1100, José Leonardo Ortiz', 'telefono' => '', 'celular' => '978111014', 'email' => 'victor.valdera@gmail.com', 'estado' => 'ACTIVO',
             'nombres' => 'Víctor Hugo', 'apellido_paterno' => 'Valdera', 'apellido_materno' => 'Sandoval', 'sexo' => 'M', 'fecha_nacimiento' => '1978-11-22', 'estado_civil' => 'CASADO(A)', 'profesion' => 'Agricultor y Chofer'],
            ['id' => 15, 'id_tipo_documento' => 1, 'id_ubigeo' => '140105', 'numero' => '40192834', 'direccion' => 'Calle Próceres N° 280, José Leonardo Ortiz', 'telefono' => '', 'celular' => '978111015', 'email' => 'marco.chapona@gmail.com', 'estado' => 'ACTIVO',
             'nombres' => 'Marco Aurelio', 'apellido_paterno' => 'Chapoñan', 'apellido_materno' => 'Cajusol', 'sexo' => 'M', 'fecha_nacimiento' => '1980-03-14', 'estado_civil' => 'CONVIVIENTE', 'profesion' => 'Obrero y Transportista'],
        ];

        $stmtPer = $pdo->prepare("INSERT INTO personas (id, id_tipo_documento, id_ubigeo, numero, direccion, telefono, celular, email, estado) VALUES (:id, :id_tipo_documento, :id_ubigeo, :numero, :direccion, :telefono, :celular, :email, :estado)");
        $stmtCiu = $pdo->prepare("INSERT INTO ciudadanos (id_persona, nombres, apellido_paterno, apellido_materno, sexo, fecha_nacimiento, estado_civil, profesion) VALUES (:id, :nombres, :apellido_paterno, :apellido_materno, :sexo, :fecha_nacimiento, :estado_civil, :profesion)");

        foreach ($personas as $p) {
            $stmtPer->execute([
                'id' => $p['id'],
                'id_tipo_documento' => $p['id_tipo_documento'],
                'id_ubigeo' => $p['id_ubigeo'],
                'numero' => $p['numero'],
                'direccion' => $p['direccion'],
                'telefono' => $p['telefono'],
                'celular' => $p['celular'],
                'email' => $p['email'],
                'estado' => $p['estado'],
            ]);

            $stmtCiu->execute([
                'id' => $p['id'],
                'nombres' => $p['nombres'],
                'apellido_paterno' => $p['apellido_paterno'],
                'apellido_materno' => $p['apellido_materno'],
                'sexo' => $p['sexo'],
                'fecha_nacimiento' => $p['fecha_nacimiento'],
                'estado_civil' => $p['estado_civil'],
                'profesion' => $p['profesion'],
            ]);
        }
        echo "✓ Personas y Ciudadanos insertados (" . count($personas) . ")\n";

        $stmtTrab = $pdo->prepare("INSERT INTO trabajadores (id_persona, tipo, tiene_cuenta, estado) VALUES (:id_persona, :tipo, :tiene_cuenta, :estado)");
        for ($i = 1; $i <= 5; $i++) {
            $stmtTrab->execute([
                'id_persona' => $i,
                'tipo' => 'INTERNO',
                'tiene_cuenta' => 1,
                'estado' => 'ACTIVO',
            ]);
        }

        $stmtAdm = $pdo->prepare("INSERT INTO administrados (id_persona) VALUES (:id_persona)");
        for ($i = 6; $i <= 15; $i++) {
            $stmtAdm->execute(['id_persona' => $i]);
        }
        echo "✓ Trabajadores (5) y Administrados (10) insertados.\n";

        $desplazamientos = [
            ['id_unidad_organica' => 54, 'id_trabajador' => 1, 'id_cargo' => 1, 'tipo_funcion' => 'Titular', 'documento' => 'RESOLUCIÓN DE ALCALDÍA N° 012-2026-MDJLO/A'],
            ['id_unidad_organica' => 54, 'id_trabajador' => 2, 'id_cargo' => 2, 'tipo_funcion' => 'Operador', 'documento' => 'MEMORÁNDUM N° 105-2026-MDJLO/GM/OGA/OGRH'],
            ['id_unidad_organica' => 54, 'id_trabajador' => 3, 'id_cargo' => 2, 'tipo_funcion' => 'Operador', 'documento' => 'MEMORÁNDUM N° 106-2026-MDJLO/GM/OGA/OGRH'],
            ['id_unidad_organica' => 54, 'id_trabajador' => 4, 'id_cargo' => 3, 'tipo_funcion' => 'Operador', 'documento' => 'MEMORÁNDUM N° 107-2026-MDJLO/GM/OGA/OGRH'],
            ['id_unidad_organica' => 55, 'id_trabajador' => 5, 'id_cargo' => 4, 'tipo_funcion' => 'Encargado', 'documento' => 'MEMORÁNDUM N° 108-2026-MDJLO/GM/OGA/OGRH'],
        ];
        $stmtDesp = $pdo->prepare("INSERT INTO desplazamiento_oficina (id_unidad_organica, id_trabajador, id_cargo, tipo_funcion, documento, fecha_documento) VALUES (:id_unidad_organica, :id_trabajador, :id_cargo, :tipo_funcion, :documento, CURDATE())");
        foreach ($desplazamientos as $d) {
            $stmtDesp->execute($d);
        }
        echo "✓ Desplazamiento de oficina asignado.\n";

        $hashAdmin = password_hash('Admin123!', PASSWORD_BCRYPT);
        $hashInspector = password_hash('Inspector123!', PASSWORD_BCRYPT);
        $hashTecnico = password_hash('Tecnico123!', PASSWORD_BCRYPT);
        $hashDeposito = password_hash('Deposito123!', PASSWORD_BCRYPT);

        $usuarios = [
            ['id_trabajador' => 1, 'nombre_usuario' => 'admin', 'password_hash' => $hashAdmin, 'estado' => 'ACTIVO'],
            ['id_trabajador' => 2, 'nombre_usuario' => 'inspector1', 'password_hash' => $hashInspector, 'estado' => 'ACTIVO'],
            ['id_trabajador' => 3, 'nombre_usuario' => 'inspector2', 'password_hash' => $hashInspector, 'estado' => 'ACTIVO'],
            ['id_trabajador' => 4, 'nombre_usuario' => 'tecnico', 'password_hash' => $hashTecnico, 'estado' => 'ACTIVO'],
            ['id_trabajador' => 5, 'nombre_usuario' => 'deposito', 'password_hash' => $hashDeposito, 'estado' => 'ACTIVO'],
        ];
        $stmtUser = $pdo->prepare("INSERT INTO usuarios (id_trabajador, nombre_usuario, password_hash, estado) VALUES (:id_trabajador, :nombre_usuario, :password_hash, :estado)");
        foreach ($usuarios as $u) {
            $stmtUser->execute($u);
        }
        echo "✓ Usuarios de acceso insertados (admin, inspector1, inspector2, tecnico, deposito)\n";

        $organizaciones = [
            ['id' => 1, 'tipo' => 'ASOCIACION', 'razon_social' => 'Asociación de Mototaxistas San Valentín de JLO', 'ruc' => '20601234561', 'partida_registral' => '11029384', 'representante_legal' => 'Segundo Faustino Chanamé Díaz', 'direccion' => 'Av. Chiclayo N° 1240, José Leonardo Ortiz', 'telefono_contacto' => '979123456', 'email_contacto' => 'asoc.sanvalentin@gmail.com', 'estado' => 'ACTIVO'],
            ['id' => 2, 'tipo' => 'ASOCIACION', 'razon_social' => 'Comité Central de Mototaxis Moshoqueque Sector 1', 'ruc' => '20602345672', 'partida_registral' => '11048291', 'representante_legal' => 'Carlos Alberto Vílchez Mera', 'direccion' => 'Av. Kennedy N° 450, José Leonardo Ortiz', 'telefono_contacto' => '978234567', 'email_contacto' => 'comite.moshoqueque@gmail.com', 'estado' => 'ACTIVO'],
            ['id' => 3, 'tipo' => 'EMPRESA', 'razon_social' => 'Empresa de Transportes y Servicios Múltiples Señor de los Milagros S.A.C.', 'ruc' => '20603456783', 'partida_registral' => '11059302', 'representante_legal' => 'Walter David Cumpa Maco', 'direccion' => 'Calle México N° 820, José Leonardo Ortiz', 'telefono_contacto' => '977345678', 'email_contacto' => 'transportes.smilagros@gmail.com', 'estado' => 'ACTIVO'],
            ['id' => 4, 'tipo' => 'ASOCIACION', 'razon_social' => 'Asociación de Transportistas Unidos Santa Rosa de Lima', 'ruc' => '20604567894', 'partida_registral' => '11072938', 'representante_legal' => 'Pedro Pablo Santisteban Llontop', 'direccion' => 'Av. Dorado N° 315, José Leonardo Ortiz', 'telefono_contacto' => '976456789', 'email_contacto' => 'asoc.santarosa@gmail.com', 'estado' => 'ACTIVO'],
        ];
        $stmtOrg = $pdo->prepare("INSERT INTO organizaciones (id, tipo, razon_social, ruc, partida_registral, representante_legal, direccion, telefono_contacto, email_contacto, estado) VALUES (:id, :tipo, :razon_social, :ruc, :partida_registral, :representante_legal, :direccion, :telefono_contacto, :email_contacto, :estado)");
        foreach ($organizaciones as $o) {
            $stmtOrg->execute($o);
        }
        echo "✓ Organizaciones y Asociaciones insertadas (" . count($organizaciones) . ")\n";

        $tiposVehiculo = [
            ['id' => 1, 'nombre' => 'Mototaxi (Trimovil)', 'descripcion' => 'Vehículo automotor de tres ruedas categoría L5 para transporte público especial de pasajeros', 'estado' => 'ACTIVO'],
            ['id' => 2, 'nombre' => 'Automóvil (Sedán/Hatchback)', 'descripcion' => 'Vehículo de cuatro ruedas categoría M1 para transporte particular o taxi', 'estado' => 'ACTIVO'],
            ['id' => 3, 'nombre' => 'Moto Lineal', 'descripcion' => 'Vehículo menor de dos ruedas categoría L3', 'estado' => 'ACTIVO'],
            ['id' => 4, 'nombre' => 'Camioneta Rural (Combi)', 'descripcion' => 'Vehículo categoría M2 para transporte colectivo de pasajeros', 'estado' => 'ACTIVO'],
        ];
        $stmtTV = $pdo->prepare("INSERT INTO tipos_vehiculo (id, nombre, descripcion, estado) VALUES (:id, :nombre, :descripcion, :estado)");
        foreach ($tiposVehiculo as $tv) {
            $stmtTV->execute($tv);
        }
        echo "✓ Tipos de vehículo insertados (" . count($tiposVehiculo) . ")\n";

        $vehiculos = [
            ['id' => 1, 'id_tipo_vehiculo' => 1, 'id_asociacion' => 1, 'placa' => '1234-7M', 'marca' => 'BAJAJ', 'modelo' => 'RE 205', 'color' => 'AZUL', 'anio_fabricacion' => 2022, 'categoria' => 'L5', 'carroceria' => 'TRIMOVIL PASAJEROS', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'CERRADA', 'numero_serie' => 'MD2A23AY1PW10001', 'serie_motor' => 'AZM10001', 'partida_registral' => '60123456', 'codigo_qr' => 'QR-VEH-12347M', 'estado_formalizacion' => 'FORMAL'],
            ['id' => 2, 'id_tipo_vehiculo' => 1, 'id_asociacion' => 1, 'placa' => '2345-8M', 'marca' => 'WANXIN', 'modelo' => 'WX200-ZH', 'color' => 'ROJO', 'anio_fabricacion' => 2023, 'categoria' => 'L5', 'carroceria' => 'TRIMOVIL PASAJEROS', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'CERRADA', 'numero_serie' => 'LX2A23AY2PW10002', 'serie_motor' => 'WXM10002', 'partida_registral' => '60123457', 'codigo_qr' => 'QR-VEH-23458M', 'estado_formalizacion' => 'FORMAL'],
            ['id' => 3, 'id_tipo_vehiculo' => 1, 'id_asociacion' => 2, 'placa' => '3456-9M', 'marca' => 'ZONGSHEN', 'modelo' => 'ZS200ZH', 'color' => 'VERDE', 'anio_fabricacion' => 2021, 'categoria' => 'L5', 'carroceria' => 'TRIMOVIL PASAJEROS', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'CERRADA', 'numero_serie' => 'ZX2A23AY3PW10003', 'serie_motor' => 'ZSM10003', 'partida_registral' => '60123458', 'codigo_qr' => 'QR-VEH-34569M', 'estado_formalizacion' => 'FORMAL'],
            ['id' => 4, 'id_tipo_vehiculo' => 1, 'id_asociacion' => 2, 'placa' => '4567-0M', 'marca' => 'BAJAJ', 'modelo' => 'TORITO 4T', 'color' => 'AMARILLO', 'anio_fabricacion' => 2024, 'categoria' => 'L5', 'carroceria' => 'TRIMOVIL PASAJEROS', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'CERRADA', 'numero_serie' => 'MD2A23AY4PW10004', 'serie_motor' => 'AZM10004', 'partida_registral' => '60123459', 'codigo_qr' => 'QR-VEH-45670M', 'estado_formalizacion' => 'FORMAL'],
            ['id' => 5, 'id_tipo_vehiculo' => 1, 'id_asociacion' => 3, 'placa' => '5678-1M', 'marca' => 'TVS', 'modelo' => 'KING DELUXE', 'color' => 'BLANCO', 'anio_fabricacion' => 2023, 'categoria' => 'L5', 'carroceria' => 'TRIMOVIL PASAJEROS', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'CERRADA', 'numero_serie' => 'TV2A23AY5PW10005', 'serie_motor' => 'TVM10005', 'partida_registral' => '60123460', 'codigo_qr' => 'QR-VEH-56781M', 'estado_formalizacion' => 'FORMAL'],
            ['id' => 6, 'id_tipo_vehiculo' => 1, 'id_asociacion' => 4, 'placa' => '6789-2M', 'marca' => 'BAJAJ', 'modelo' => 'RE 205', 'color' => 'AZUL Y PLATA', 'anio_fabricacion' => 2022, 'categoria' => 'L5', 'carroceria' => 'TRIMOVIL PASAJEROS', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'CERRADA', 'numero_serie' => 'MD2A23AY6PW10006', 'serie_motor' => 'AZM10006', 'partida_registral' => '60123461', 'codigo_qr' => 'QR-VEH-67892M', 'estado_formalizacion' => 'FORMAL'],
            ['id' => 7, 'id_tipo_vehiculo' => 2, 'id_asociacion' => 3, 'placa' => 'M1A-123', 'marca' => 'TOYOTA', 'modelo' => 'YARIS', 'color' => 'GRIS METALICO', 'anio_fabricacion' => 2020, 'categoria' => 'M1', 'carroceria' => 'SEDAN', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'SEDAN', 'numero_serie' => 'JT2A23AY7PW10007', 'serie_motor' => '2NZ10007', 'partida_registral' => '60123462', 'codigo_qr' => 'QR-VEH-M1A123', 'estado_formalizacion' => 'FORMAL'],

            ['id' => 8, 'id_tipo_vehiculo' => 1, 'id_asociacion' => null, 'placa' => '7890-3M', 'marca' => 'WANXIN', 'modelo' => 'WX150', 'color' => 'NEGRO', 'anio_fabricacion' => 2019, 'categoria' => 'L5', 'carroceria' => 'TRIMOVIL', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'CERRADA', 'numero_serie' => 'WX2A23AY8PW10008', 'serie_motor' => 'WXM10008', 'partida_registral' => '60123463', 'codigo_qr' => 'QR-VEH-78903M', 'estado_formalizacion' => 'INFORMAL'],
            ['id' => 9, 'id_tipo_vehiculo' => 1, 'id_asociacion' => null, 'placa' => '8901-4M', 'marca' => 'ZONGSHEN', 'modelo' => 'ZS150', 'color' => 'AZUL OSCURO', 'anio_fabricacion' => 2018, 'categoria' => 'L5', 'carroceria' => 'TRIMOVIL', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'CERRADA', 'numero_serie' => 'ZS2A23AY9PW10009', 'serie_motor' => 'ZSM10009', 'partida_registral' => '60123464', 'codigo_qr' => 'QR-VEH-89014M', 'estado_formalizacion' => 'INFORMAL'],
            ['id' => 10, 'id_tipo_vehiculo' => 1, 'id_asociacion' => null, 'placa' => '9012-5M', 'marca' => 'BAJAJ', 'modelo' => 'TORITO', 'color' => 'VERDE MANZANA', 'anio_fabricacion' => 2017, 'categoria' => 'L5', 'carroceria' => 'TRIMOVIL', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'CERRADA', 'numero_serie' => 'MD2A23AY0PW10010', 'serie_motor' => 'AZM10010', 'partida_registral' => '60123465', 'codigo_qr' => 'QR-VEH-90125M', 'estado_formalizacion' => 'INFORMAL'],
            ['id' => 11, 'id_tipo_vehiculo' => 1, 'id_asociacion' => null, 'placa' => '0123-6M', 'marca' => 'MAVEILA', 'modelo' => 'MV150', 'color' => 'ROJO FUEGO', 'anio_fabricacion' => 2020, 'categoria' => 'L5', 'carroceria' => 'TRIMOVIL', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'CERRADA', 'numero_serie' => 'MV2A23AY1PW10011', 'serie_motor' => 'MVM10011', 'partida_registral' => '60123466', 'codigo_qr' => 'QR-VEH-01236M', 'estado_formalizacion' => 'INFORMAL'],
            ['id' => 12, 'id_tipo_vehiculo' => 2, 'id_asociacion' => null, 'placa' => 'M2B-456', 'marca' => 'NISSAN', 'modelo' => 'TIIDA', 'color' => 'PLATA', 'anio_fabricacion' => 2015, 'categoria' => 'M1', 'carroceria' => 'SEDAN', 'sede_registro' => 'CHICLAYO', 'tipo_carroceria' => 'SEDAN', 'numero_serie' => '3N1A23AY2PW10012', 'serie_motor' => 'HR1610012', 'partida_registral' => '60123467', 'codigo_qr' => 'QR-VEH-M2B456', 'estado_formalizacion' => 'INFORMAL'],
        ];

        $stmtVeh = $pdo->prepare("INSERT INTO vehiculos (id, id_tipo_vehiculo, id_asociacion, placa, marca, modelo, color, anio_fabricacion, categoria, carroceria, sede_registro, tipo_carroceria, numero_serie, serie_motor, partida_registral, codigo_qr, estado_formalizacion) VALUES (:id, :id_tipo_vehiculo, :id_asociacion, :placa, :marca, :modelo, :color, :anio_fabricacion, :categoria, :carroceria, :sede_registro, :tipo_carroceria, :numero_serie, :serie_motor, :partida_registral, :codigo_qr, :estado_formalizacion)");
        foreach ($vehiculos as $v) {
            $stmtVeh->execute($v);
        }
        echo "✓ Vehículos insertados (7 Formale + 5 Informales)\n";

        $stmtProp = $pdo->prepare("INSERT INTO vehiculo_propietarios (id_vehiculo, id_persona, id_organizacion, fecha_inicio, estado) VALUES (:id_vehiculo, :id_persona, :id_organizacion, :fecha_inicio, 'ACTIVO')");
        for ($i = 1; $i <= 12; $i++) {
            $personaId = 5 + $i;
            if ($personaId > 15) $personaId = 6 + ($i % 5);
            $stmtProp->execute([
                'id_vehiculo' => $i,
                'id_persona' => $personaId,
                'id_organizacion' => null,
                'fecha_inicio' => '2023-01-15',
            ]);
        }
        echo "✓ Propietarios asignados a cada vehículo.\n";

        $documentos = [
            ['id_vehiculo' => 1, 'tipo_documento' => 'SOAT', 'codigo' => 'SOAT-2026-1001', 'fecha_expedicion' => '2026-01-10', 'fecha_expiracion' => '2027-01-10', 'estado' => 'VIGENTE'],
            ['id_vehiculo' => 1, 'tipo_documento' => 'TARJETA_OPERATIVIDAD', 'codigo' => 'TUC-2026-0001', 'fecha_expedicion' => '2026-01-01', 'fecha_expiracion' => '2026-12-31', 'estado' => 'VIGENTE'],
            ['id_vehiculo' => 1, 'tipo_documento' => 'CITV', 'codigo' => 'CITV-2026-2001', 'fecha_expedicion' => '2026-02-15', 'fecha_expiracion' => '2027-02-15', 'estado' => 'VIGENTE'],

            ['id_vehiculo' => 2, 'tipo_documento' => 'SOAT', 'codigo' => 'SOAT-2026-1002', 'fecha_expedicion' => '2026-02-01', 'fecha_expiracion' => '2027-02-01', 'estado' => 'VIGENTE'],
            ['id_vehiculo' => 2, 'tipo_documento' => 'TARJETA_OPERATIVIDAD', 'codigo' => 'TUC-2026-0002', 'fecha_expedicion' => '2026-01-01', 'fecha_expiracion' => '2026-12-31', 'estado' => 'VIGENTE'],

            ['id_vehiculo' => 3, 'tipo_documento' => 'SOAT', 'codigo' => 'SOAT-2026-1003', 'fecha_expedicion' => '2026-03-01', 'fecha_expiracion' => '2027-03-01', 'estado' => 'VIGENTE'],
            ['id_vehiculo' => 3, 'tipo_documento' => 'TARJETA_OPERATIVIDAD', 'codigo' => 'TUC-2026-0003', 'fecha_expedicion' => '2026-01-01', 'fecha_expiracion' => '2026-12-31', 'estado' => 'VIGENTE'],

            ['id_vehiculo' => 4, 'tipo_documento' => 'SOAT', 'codigo' => 'SOAT-2026-1004', 'fecha_expedicion' => '2026-01-20', 'fecha_expiracion' => '2027-01-20', 'estado' => 'VIGENTE'],
            ['id_vehiculo' => 4, 'tipo_documento' => 'TARJETA_OPERATIVIDAD', 'codigo' => 'TUC-2026-0004', 'fecha_expedicion' => '2026-01-01', 'fecha_expiracion' => '2026-12-31', 'estado' => 'VIGENTE'],

            ['id_vehiculo' => 5, 'tipo_documento' => 'SOAT', 'codigo' => 'SOAT-2026-1005', 'fecha_expedicion' => '2026-02-10', 'fecha_expiracion' => '2027-02-10', 'estado' => 'VIGENTE'],
            ['id_vehiculo' => 5, 'tipo_documento' => 'TARJETA_OPERATIVIDAD', 'codigo' => 'TUC-2026-0005', 'fecha_expedicion' => '2026-01-01', 'fecha_expiracion' => '2026-12-31', 'estado' => 'VIGENTE'],

            ['id_vehiculo' => 6, 'tipo_documento' => 'SOAT', 'codigo' => 'SOAT-2026-1006', 'fecha_expedicion' => '2026-01-15', 'fecha_expiracion' => '2027-01-15', 'estado' => 'VIGENTE'],
            ['id_vehiculo' => 6, 'tipo_documento' => 'TARJETA_OPERATIVIDAD', 'codigo' => 'TUC-2026-0006', 'fecha_expedicion' => '2026-01-01', 'fecha_expiracion' => '2026-12-31', 'estado' => 'VIGENTE'],

            ['id_vehiculo' => 7, 'tipo_documento' => 'SOAT', 'codigo' => 'SOAT-2026-1007', 'fecha_expedicion' => '2025-11-01', 'fecha_expiracion' => '2026-11-01', 'estado' => 'VIGENTE'],
            ['id_vehiculo' => 7, 'tipo_documento' => 'TARJETA_PROPIEDAD', 'codigo' => 'TP-2020-0982', 'fecha_expedicion' => '2020-05-10', 'fecha_expiracion' => null, 'estado' => 'VIGENTE'],

            ['id_vehiculo' => 8, 'tipo_documento' => 'SOAT', 'codigo' => 'SOAT-2024-9981', 'fecha_expedicion' => '2024-01-05', 'fecha_expiracion' => '2025-01-05', 'estado' => 'VENCIDO'],
            ['id_vehiculo' => 9, 'tipo_documento' => 'SOAT', 'codigo' => 'SOAT-2024-9982', 'fecha_expedicion' => '2024-02-10', 'fecha_expiracion' => '2025-02-10', 'estado' => 'VENCIDO'],
            ['id_vehiculo' => 11, 'tipo_documento' => 'SOAT', 'codigo' => 'SOAT-2026-1011', 'fecha_expedicion' => '2026-01-01', 'fecha_expiracion' => '2027-01-01', 'estado' => 'VIGENTE'],
        ];
        $stmtDoc = $pdo->prepare("INSERT INTO documentos_vehiculo (id_vehiculo, tipo_documento, codigo, fecha_expedicion, fecha_expiracion, estado) VALUES (:id_vehiculo, :tipo_documento, :codigo, :fecha_expedicion, :fecha_expiracion, :estado)");
        foreach ($documentos as $d) {
            $stmtDoc->execute($d);
        }
        echo "✓ Documentos vehiculares insertados (" . count($documentos) . ")\n";

        $infracciones = [
            ['id' => 1, 'codigo' => 'M-01', 'descripcion' => 'Prestar servicio de transporte público especial de pasajeros sin contar con autorización municipal (transporte informal)', 'gravedad' => 'MUY GRAVE', 'porcentaje_uit' => 10.0000, 'estado' => 'ACTIVO'],
            ['id' => 2, 'codigo' => 'M-02', 'descripcion' => 'Conducir vehículo de transporte público en estado de ebriedad o bajo efectos de sustancias tóxicas', 'gravedad' => 'MUY GRAVE', 'porcentaje_uit' => 100.0000, 'estado' => 'ACTIVO'],
            ['id' => 3, 'codigo' => 'M-03', 'descripcion' => 'Conducir vehículo sin contar con licencia de conducir de la clase y categoría reglamentaria (B-IIc para mototaxis)', 'gravedad' => 'MUY GRAVE', 'porcentaje_uit' => 50.0000, 'estado' => 'ACTIVO'],
            ['id' => 4, 'codigo' => 'G-01', 'descripcion' => 'Prestar servicio especial sin contar con el Seguro Obligatorio de Accidentes de Tránsito (SOAT/AFOCAT) vigente', 'gravedad' => 'GRAVE', 'porcentaje_uit' => 12.0000, 'estado' => 'ACTIVO'],
            ['id' => 5, 'codigo' => 'G-02', 'descripcion' => 'Prestar servicio de transporte con vehículo que no cuente con el Certificado de Constatación de Características (CERTICAV) vigente', 'gravedad' => 'GRAVE', 'porcentaje_uit' => 8.0000, 'estado' => 'ACTIVO'],
            ['id' => 6, 'codigo' => 'G-03', 'descripcion' => 'No portar la credencial de conductor o fotocheck municipal autorizado en lugar visible', 'gravedad' => 'GRAVE', 'porcentaje_uit' => 5.0000, 'estado' => 'ACTIVO'],
            ['id' => 7, 'codigo' => 'G-04', 'descripcion' => 'Alterar o modificar la estructura original del mototaxi o instalar elementos punzantes/paragolpes no autorizados', 'gravedad' => 'GRAVE', 'porcentaje_uit' => 8.0000, 'estado' => 'ACTIVO'],
            ['id' => 8, 'codigo' => 'G-05', 'descripcion' => 'Negarse a entregar la documentación requerida por el inspector municipal de transporte en operativo', 'gravedad' => 'GRAVE', 'porcentaje_uit' => 10.0000, 'estado' => 'ACTIVO'],
            ['id' => 9, 'codigo' => 'L-01', 'descripcion' => 'No mantener en condiciones óptimas de higiene, limpieza y presentación el vehículo menor', 'gravedad' => 'LEVE', 'porcentaje_uit' => 3.0000, 'estado' => 'ACTIVO'],
            ['id' => 10, 'codigo' => 'L-02', 'descripcion' => 'Falta de botiquín de primeros auxilios o extintor con carga vigente en la unidad móvil', 'gravedad' => 'LEVE', 'porcentaje_uit' => 4.0000, 'estado' => 'ACTIVO'],
        ];
        $stmtInf = $pdo->prepare("INSERT INTO tipos_infraccion (id, codigo, descripcion, gravedad, porcentaje_uit, estado) VALUES (:id, :codigo, :descripcion, :gravedad, :porcentaje_uit, :estado)");
        foreach ($infracciones as $inf) {
            $stmtInf->execute($inf);
        }
        echo "✓ Tipos de infracción insertados (" . count($infracciones) . ")\n";

        $uit = 5350.00;
        $calcMonto = fn(float $pct): float => round($uit * ($pct / 100), 2);

        $papeletas = [
            [
                'id' => 1, 'id_vehiculo' => 8, 'id_persona_infractor' => 11, 'id_inspector' => 2,
                'fecha_hora' => '2026-09-02 09:30:00', 'numero_papeleta' => 'PAP-2026-0001',
                'lugar' => 'Av. Chiclayo con Calle Cahuide', 'servicio' => 'ESPECIAL',
                'unidad_autoridad' => 'SUBGERENCIA DE TRÁNSITO Y TRANSPORTE', 'nombre_autoridad' => 'Julio César Ballena Mechan',
                'observacion_autoridad' => 'Vehículo mototaxi prestando servicio público sin contar con permiso municipal ni asociación registrada (servicio informal)',
                'observaciones_conductor' => 'Estaba trasladando a un familiar, no haciendo servicio comercial',
                'firma_conductor_img' => 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCwyMCBRNDAsNSA3MCwyMCBUMTAwLDIwIiBzdHJva2U9IiMwMDU1YmYiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
                'firma_conductor_estado' => 'FIRMADO', 'firma_conductor_fecha' => '2026-09-02 09:35:00',
                'monto_total' => $calcMonto(10.0), 'estado' => 'PENDIENTE_PAGO',
                'detalles' => [['id_tipo_infraccion' => 1, 'monto' => $calcMonto(10.0)]],
            ],
            [
                'id' => 2, 'id_vehiculo' => 9, 'id_persona_infractor' => 12, 'id_inspector' => 2,
                'fecha_hora' => '2026-09-03 11:15:00', 'numero_papeleta' => 'PAP-2026-0002',
                'lugar' => 'Av. Balta cuadra 12 - Frente a Mercado Moshoqueque', 'servicio' => 'ESPECIAL',
                'unidad_autoridad' => 'SUBGERENCIA DE TRÁNSITO Y TRANSPORTE', 'nombre_autoridad' => 'Luis Enrique Siesquén Suclupe',
                'observacion_autoridad' => 'Vehículo menor realizando servicio no autorizado con SOAT vencido',
                'observaciones_conductor' => 'El SOAT venció la semana pasada, recién iba a renovarlo',
                'firma_conductor_img' => 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCwyMCBRNDAsNSA3MCwyMCBUMTAwLDIwIiBzdHJva2U9IiMwMDU1YmYiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
                'firma_conductor_estado' => 'FIRMADO', 'firma_conductor_fecha' => '2026-09-03 11:20:00',
                'monto_total' => $calcMonto(10.0) + $calcMonto(12.0), 'estado' => 'PENDIENTE_PAGO',
                'detalles' => [
                    ['id_tipo_infraccion' => 1, 'monto' => $calcMonto(10.0)],
                    ['id_tipo_infraccion' => 4, 'monto' => $calcMonto(12.0)],
                ],
            ],
            [
                'id' => 3, 'id_vehiculo' => 1, 'id_persona_infractor' => 6, 'id_inspector' => 3,
                'fecha_hora' => '2026-09-04 15:40:00', 'numero_papeleta' => 'PAP-2026-0003',
                'lugar' => 'Av. Kennedy cruce con Calle San Martín', 'servicio' => 'ESPECIAL',
                'unidad_autoridad' => 'SUBGERENCIA DE TRÁNSITO Y TRANSPORTE', 'nombre_autoridad' => 'José Santos Chanamé Díaz',
                'observacion_autoridad' => 'Conductor formal de la Asoc. San Valentín no portaba el fotocheck municipal visible',
                'observaciones_conductor' => 'Se me quedó en mi casa el fotocheck',
                'firma_conductor_img' => 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCwyMCBRNDAsNSA3MCwyMCBUMTAwLDIwIiBzdHJva2U9IiMwMDU1YmYiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
                'firma_conductor_estado' => 'FIRMADO', 'firma_conductor_fecha' => '2026-09-04 15:45:00',
                'monto_total' => $calcMonto(5.0), 'estado' => 'PAGADA',
                'detalles' => [['id_tipo_infraccion' => 6, 'monto' => $calcMonto(5.0)]],
            ],
            [
                'id' => 4, 'id_vehiculo' => 10, 'id_persona_infractor' => 13, 'id_inspector' => 3,
                'fecha_hora' => '2026-09-05 10:10:00', 'numero_papeleta' => 'PAP-2026-0004',
                'lugar' => 'Av. Augusto B. Leguía con Av. Dorado', 'servicio' => 'ESPECIAL',
                'unidad_autoridad' => 'SUBGERENCIA DE TRÁNSITO Y TRANSPORTE', 'nombre_autoridad' => 'Elmer Antonio Farroñan Chuzón',
                'observacion_autoridad' => 'Mototaxi informal sin brevete clase B-IIc y sin permiso de operación',
                'observaciones_conductor' => 'Estoy tramitando mi licencia en la municipalidad provincial',
                'firma_conductor_img' => null,
                'firma_conductor_estado' => 'SE_NEGO', 'firma_conductor_fecha' => null,
                'monto_total' => $calcMonto(10.0) + $calcMonto(50.0), 'estado' => 'PENDIENTE_PAGO',
                'detalles' => [
                    ['id_tipo_infraccion' => 1, 'monto' => $calcMonto(10.0)],
                    ['id_tipo_infraccion' => 3, 'monto' => $calcMonto(50.0)],
                ],
            ],
            [
                'id' => 5, 'id_vehiculo' => 2, 'id_persona_infractor' => 7, 'id_inspector' => 2,
                'fecha_hora' => '2026-09-06 16:20:00', 'numero_papeleta' => 'PAP-2026-0005',
                'lugar' => 'Av. México cuadra 5', 'servicio' => 'ESPECIAL',
                'unidad_autoridad' => 'SUBGERENCIA DE TRÁNSITO Y TRANSPORTE', 'nombre_autoridad' => 'Segundo Manuel Vílchez Mera',
                'observacion_autoridad' => 'Extintor descargado al momento de la intervención preventiva',
                'observaciones_conductor' => 'Mañana mismo lo llevo a recargar',
                'firma_conductor_img' => 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCwyMCBRNDAsNSA3MCwyMCBUMTAwLDIwIiBzdHJva2U9IiMwMDU1YmYiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
                'firma_conductor_estado' => 'FIRMADO', 'firma_conductor_fecha' => '2026-09-06 16:25:00',
                'monto_total' => $calcMonto(4.0), 'estado' => 'PENDIENTE_PAGO',
                'detalles' => [['id_tipo_infraccion' => 10, 'monto' => $calcMonto(4.0)]],
            ],
            [
                'id' => 6, 'id_vehiculo' => 11, 'id_persona_infractor' => 14, 'id_inspector' => 2,
                'fecha_hora' => '2026-09-07 08:50:00', 'numero_papeleta' => 'PAP-2026-0006',
                'lugar' => 'Calle Próceres cruce con Calle Panamá', 'servicio' => 'ESPECIAL',
                'unidad_autoridad' => 'SUBGERENCIA DE TRÁNSITO Y TRANSPORTE', 'nombre_autoridad' => 'Víctor Hugo Valdera Sandoval',
                'observacion_autoridad' => 'Estructura metálica delantera adulterada con tubos punzantes no autorizados',
                'observaciones_conductor' => 'Es para proteger el motor de los baches',
                'firma_conductor_img' => 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCwyMCBRNDAsNSA3MCwyMCBUMTAwLDIwIiBzdHJva2U9IiMwMDU1YmYiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
                'firma_conductor_estado' => 'FIRMADO', 'firma_conductor_fecha' => '2026-09-07 08:55:00',
                'monto_total' => $calcMonto(8.0), 'estado' => 'PENDIENTE_PAGO',
                'detalles' => [['id_tipo_infraccion' => 7, 'monto' => $calcMonto(8.0)]],
            ],
            [
                'id' => 7, 'id_vehiculo' => 12, 'id_persona_infractor' => 15, 'id_inspector' => 3,
                'fecha_hora' => '2026-09-08 12:00:00', 'numero_papeleta' => 'PAP-2026-0007',
                'lugar' => 'Av. Chiclayo N° 800', 'servicio' => 'PARTICULAR',
                'unidad_autoridad' => 'SUBGERENCIA DE TRÁNSITO Y TRANSPORTE', 'nombre_autoridad' => 'Marco Aurelio Chapoñan Cajusol',
                'observacion_autoridad' => 'Automóvil particular realizando servicio de taxi colectivo informal',
                'observaciones_conductor' => 'Estaba jalando a unos conocidos que me pidieron favor',
                'firma_conductor_img' => 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCwyMCBRNDAsNSA3MCwyMCBUMTAwLDIwIiBzdHJva2U9IiMwMDU1YmYiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
                'firma_conductor_estado' => 'FIRMADO', 'firma_conductor_fecha' => '2026-09-08 12:05:00',
                'monto_total' => $calcMonto(10.0), 'estado' => 'PAGADA',
                'detalles' => [['id_tipo_infraccion' => 1, 'monto' => $calcMonto(10.0)]],
            ],
            [
                'id' => 8, 'id_vehiculo' => 3, 'id_persona_infractor' => 8, 'id_inspector' => 3,
                'fecha_hora' => '2026-09-09 14:10:00', 'numero_papeleta' => 'PAP-2026-0008',
                'lugar' => 'Av. Balta cuadra 8', 'servicio' => 'ESPECIAL',
                'unidad_autoridad' => 'SUBGERENCIA DE TRÁNSITO Y TRANSPORTE', 'nombre_autoridad' => 'Juan Carlos Coronado Rojas',
                'observacion_autoridad' => 'Falta de higiene notoria en la cabina y asientos de pasajeros',
                'observaciones_conductor' => 'Hoy hubo mucho polvo en la mañana, ya lo iba a lavar',
                'firma_conductor_img' => 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iNDAiPjxwYXRoIGQ9Ik0xMCwyMCBRNDAsNSA3MCwyMCBUMTAwLDIwIiBzdHJva2U9IiMwMDU1YmYiIGZpbGw9Im5vbmUiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==',
                'firma_conductor_estado' => 'FIRMADO', 'firma_conductor_fecha' => '2026-09-09 14:15:00',
                'monto_total' => $calcMonto(3.0), 'estado' => 'PAGADA',
                'detalles' => [['id_tipo_infraccion' => 9, 'monto' => $calcMonto(3.0)]],
            ],
        ];

        $stmtPap = $pdo->prepare("INSERT INTO papeletas (id, id_vehiculo, id_persona_infractor, id_inspector, fecha_hora, firma_conductor_fecha, numero_papeleta, lugar, servicio, unidad_autoridad, nombre_autoridad, observacion_autoridad, observaciones_conductor, firma_conductor_img, firma_conductor_estado, monto_total, estado) VALUES (:id, :id_vehiculo, :id_persona_infractor, :id_inspector, :fecha_hora, :firma_conductor_fecha, :numero_papeleta, :lugar, :servicio, :unidad_autoridad, :nombre_autoridad, :observacion_autoridad, :observaciones_conductor, :firma_conductor_img, :firma_conductor_estado, :monto_total, :estado)");
        $stmtPapDet = $pdo->prepare("INSERT INTO papeleta_detalles (id_papeleta, id_tipo_infraccion, monto, descuento, monto_final) VALUES (:id_papeleta, :id_tipo_infraccion, :monto, 0.00, :monto_final)");

        foreach ($papeletas as $p) {
            $stmtPap->execute([
                'id' => $p['id'],
                'id_vehiculo' => $p['id_vehiculo'],
                'id_persona_infractor' => $p['id_persona_infractor'],
                'id_inspector' => $p['id_inspector'],
                'fecha_hora' => $p['fecha_hora'],
                'firma_conductor_fecha' => $p['firma_conductor_fecha'],
                'numero_papeleta' => $p['numero_papeleta'],
                'lugar' => $p['lugar'],
                'servicio' => $p['servicio'],
                'unidad_autoridad' => $p['unidad_autoridad'],
                'nombre_autoridad' => $p['nombre_autoridad'],
                'observacion_autoridad' => $p['observacion_autoridad'],
                'observaciones_conductor' => $p['observaciones_conductor'],
                'firma_conductor_img' => $p['firma_conductor_img'],
                'firma_conductor_estado' => $p['firma_conductor_estado'],
                'monto_total' => $p['monto_total'],
                'estado' => $p['estado'],
            ]);

            foreach ($p['detalles'] as $det) {
                $stmtPapDet->execute([
                    'id_papeleta' => $p['id'],
                    'id_tipo_infraccion' => $det['id_tipo_infraccion'],
                    'monto' => $det['monto'],
                    'monto_final' => $det['monto'],
                ]);
            }
        }
        echo "✓ Papeletas y detalles insertados (" . count($papeletas) . ")\n";

        $criteriosInventario = [
            ['id' => 1, 'codigo' => 'INV-01', 'nombre' => 'Llantas y aros (estado de cocada)', 'seccion' => 'EXTERIOR', 'orden' => 1],
            ['id' => 2, 'codigo' => 'INV-02', 'nombre' => 'Batería y cables de conexión', 'seccion' => 'MECANICA', 'orden' => 2],
            ['id' => 3, 'codigo' => 'INV-03', 'nombre' => 'Faros delanteros y micas de freno posteriores', 'seccion' => 'LUCES', 'orden' => 3],
            ['id' => 4, 'codigo' => 'INV-04', 'nombre' => 'Espejos retrovisores derecho e izquierdo', 'seccion' => 'ACCESORIOS', 'orden' => 4],
            ['id' => 5, 'codigo' => 'INV-05', 'nombre' => 'Carpa, toldo y mica protectora frontal', 'seccion' => 'CARROCERIA', 'orden' => 5],
            ['id' => 6, 'codigo' => 'INV-06', 'nombre' => 'Asientos de conductor y pasajeros (tapiz)', 'seccion' => 'INTERIOR', 'orden' => 6],
            ['id' => 7, 'codigo' => 'INV-07', 'nombre' => 'Radio / autorradio / parlantes instalados', 'seccion' => 'ACCESORIOS', 'orden' => 7],
            ['id' => 8, 'codigo' => 'INV-08', 'nombre' => 'Llanta de repuesto', 'seccion' => 'HERRAMIENTAS', 'orden' => 8],
            ['id' => 9, 'codigo' => 'INV-09', 'nombre' => 'Gata mecánica y llave de ruedas', 'seccion' => 'HERRAMIENTAS', 'orden' => 9],
            ['id' => 10, 'codigo' => 'INV-10', 'nombre' => 'Placas de rodaje metálicas (delantera/posterior)', 'seccion' => 'DOCUMENTAL', 'orden' => 10],
        ];
        $stmtInvCrit = $pdo->prepare("INSERT INTO inventario_criterios (id, codigo, nombre, seccion, orden) VALUES (:id, :codigo, :nombre, :seccion, :orden)");
        foreach ($criteriosInventario as $ic) {
            $stmtInvCrit->execute($ic);
        }
        echo "✓ Criterios de inventario de depósito insertados (" . count($criteriosInventario) . ")\n";

        $ordenesInternamiento = [
            [
                'id' => 1, 'id_papeleta' => 1, 'id_vehiculo' => 8, 'id_remisor' => 2, 'id_interesado' => 11,
                'fecha_ingreso' => '2026-09-02 10:00:00', 'fecha_salida' => null,
                'deposito' => 'Depósito Municipal N° 1 - Av. Chiclayo N° 1520', 'motivo' => 'Infracción M-01 (Transporte informal sin autorización)',
                'numero_boleta' => 'BOL-DEP-2026-001', 'total_dias' => 8, 'estado' => 'RETENIDO',
                'observaciones' => 'Vehículo ingresa por sus propios medios. Carrocería con raspones leves en lado izquierdo.',
                'grado_remisor' => 'Inspector de Tránsito', 'carnet_remisor' => 'INSP-002',
                'autoridad_que_dispone' => 'Subgerencia de Tránsito, Transporte y Seguridad Vial',
                'documento_referencia' => 'Papeleta N° PAP-2026-0001', 'estado_carroceria' => 'Regular estado, toldo negro con parchado menor.',
            ],
            [
                'id' => 2, 'id_papeleta' => 2, 'id_vehiculo' => 9, 'id_remisor' => 2, 'id_interesado' => 12,
                'fecha_ingreso' => '2026-09-03 12:00:00', 'fecha_salida' => null,
                'deposito' => 'Depósito Municipal N° 1 - Av. Chiclayo N° 1520', 'motivo' => 'Infracción M-01 + G-01 (Sin permiso y sin SOAT vigente)',
                'numero_boleta' => 'BOL-DEP-2026-002', 'total_dias' => 7, 'estado' => 'RETENIDO',
                'observaciones' => 'Ingreso con grúa municipal por carecer de SOAT.',
                'grado_remisor' => 'Inspector de Tránsito', 'carnet_remisor' => 'INSP-002',
                'autoridad_que_dispone' => 'Subgerencia de Tránsito, Transporte y Seguridad Vial',
                'documento_referencia' => 'Papeleta N° PAP-2026-0002', 'estado_carroceria' => 'Carrocería azul con raspón en guardafango delantero.',
            ],
            [
                'id' => 3, 'id_papeleta' => 4, 'id_vehiculo' => 10, 'id_remisor' => 3, 'id_interesado' => 13,
                'fecha_ingreso' => '2026-09-05 11:00:00', 'fecha_salida' => null,
                'deposito' => 'Depósito Municipal N° 1 - Av. Chiclayo N° 1520', 'motivo' => 'Infracción M-01 + M-03 (Sin permiso y sin licencia de conducir)',
                'numero_boleta' => 'BOL-DEP-2026-003', 'total_dias' => 5, 'estado' => 'RETENIDO',
                'observaciones' => 'Conductor se negó a firmar la papeleta. Vehículo remolcado al depósito.',
                'grado_remisor' => 'Inspector de Tránsito', 'carnet_remisor' => 'INSP-003',
                'autoridad_que_dispone' => 'Subgerencia de Tránsito, Transporte y Seguridad Vial',
                'documento_referencia' => 'Papeleta N° PAP-2026-0004', 'estado_carroceria' => 'Buen estado exterior, pintura verde manzana.',
            ],
            [
                'id' => 4, 'id_papeleta' => 7, 'id_vehiculo' => 12, 'id_remisor' => 3, 'id_interesado' => 15,
                'fecha_ingreso' => '2026-09-08 12:30:00', 'fecha_salida' => '2026-09-09 17:00:00',
                'deposito' => 'Depósito Municipal N° 1 - Av. Chiclayo N° 1520', 'motivo' => 'Infracción M-01 (Taxi colectivo no autorizado)',
                'numero_boleta' => 'BOL-DEP-2026-004', 'total_dias' => 1, 'estado' => 'LIBERADO',
                'observaciones' => 'Vehículo retirado tras subsanar pago de multa y derechos de depósito.',
                'grado_remisor' => 'Inspector de Tránsito', 'carnet_remisor' => 'INSP-003',
                'autoridad_que_dispone' => 'Subgerencia de Tránsito, Transporte y Seguridad Vial',
                'documento_referencia' => 'Papeleta N° PAP-2026-0007', 'estado_carroceria' => 'Automóvil sedán plata en perfecto estado.',
            ],
        ];

        $stmtOrdInt = $pdo->prepare("INSERT INTO ordenes_internamiento (id, id_papeleta, id_vehiculo, id_remisor, id_interesado, fecha_ingreso, fecha_salida, deposito, motivo, numero_boleta, total_dias, estado, observaciones, grado_remisor, carnet_remisor, autoridad_que_dispone, documento_referencia, estado_carroceria) VALUES (:id, :id_papeleta, :id_vehiculo, :id_remisor, :id_interesado, :fecha_ingreso, :fecha_salida, :deposito, :motivo, :numero_boleta, :total_dias, :estado, :observaciones, :grado_remisor, :carnet_remisor, :autoridad_que_dispone, :documento_referencia, :estado_carroceria)");
        $stmtOrdInv = $pdo->prepare("INSERT INTO orden_internamiento_inventario (id_orden_internamiento, id_criterio, cantidad, estado, observacion) VALUES (:id_orden, :id_crit, :cant, :estado, :obs)");

        foreach ($ordenesInternamiento as $oi) {
            $stmtOrdInt->execute([
                'id' => $oi['id'],
                'id_papeleta' => $oi['id_papeleta'],
                'id_vehiculo' => $oi['id_vehiculo'],
                'id_remisor' => $oi['id_remisor'],
                'id_interesado' => $oi['id_interesado'],
                'fecha_ingreso' => $oi['fecha_ingreso'],
                'fecha_salida' => $oi['fecha_salida'],
                'deposito' => $oi['deposito'],
                'motivo' => $oi['motivo'],
                'numero_boleta' => $oi['numero_boleta'],
                'total_dias' => $oi['total_dias'],
                'estado' => $oi['estado'],
                'observaciones' => $oi['observaciones'],
                'grado_remisor' => $oi['grado_remisor'],
                'carnet_remisor' => $oi['carnet_remisor'],
                'autoridad_que_dispone' => $oi['autoridad_que_dispone'],
                'documento_referencia' => $oi['documento_referencia'],
                'estado_carroceria' => $oi['estado_carroceria'],
            ]);

            for ($c = 1; $c <= 10; $c++) {
                $stmtOrdInv->execute([
                    'id_orden' => $oi['id'],
                    'id_crit' => $c,
                    'cant' => ($c === 1 ? 3 : ($c === 4 ? 2 : 1)),
                    'estado' => ($c === 8 && $oi['id'] === 1 ? 'NO TIENE' : 'BUENO'),
                    'obs' => 'Verificado al ingreso',
                ]);
            }
        }
        echo "✓ Órdenes de internamiento e inventario insertadas (" . count($ordenesInternamiento) . ")\n";

        $ordenesLibertad = [
            [
                'id' => 1, 'id_internamiento' => 4, 'id_persona_autorizada' => 15,
                'fecha_emision' => '2026-09-09', 'numero_orden' => 'ORD-LIB-2026-0001',
                'numero_recibo_papeleta' => 'REC-2026-00002', 'monto_papeleta' => 535.00,
                'numero_recibo_guardiania' => 'REC-2026-00004', 'monto_guardiania' => 30.00,
                'numero_recibo_remolque' => 'REC-2026-00005', 'monto_remolque' => 50.00,
                'monto_total' => 615.00, 'observaciones' => 'Pago verificado en caja municipal. Se autoriza retiro del vehículo.',
                'estado' => 'EMITIDA',
            ]
        ];
        $stmtOrdLib = $pdo->prepare("INSERT INTO ordenes_libertad (id, id_internamiento, id_persona_autorizada, fecha_emision, numero_orden, numero_recibo_papeleta, monto_papeleta, numero_recibo_guardiania, monto_guardiania, numero_recibo_remolque, monto_remolque, monto_total, observaciones, estado) VALUES (:id, :id_internamiento, :id_persona_autorizada, :fecha_emision, :numero_orden, :numero_recibo_papeleta, :monto_papeleta, :numero_recibo_guardiania, :monto_guardiania, :numero_recibo_remolque, :monto_remolque, :monto_total, :observaciones, :estado)");
        foreach ($ordenesLibertad as $ol) {
            $stmtOrdLib->execute($ol);
        }
        echo "✓ Órdenes de libertad emitidas (" . count($ordenesLibertad) . ")\n";

        $criteriosInspeccion = [
            ['id' => 1, 'codigo' => 'SIS-FRE', 'nombre' => 'Sistema de frenos (delantero y posterior)', 'descripcion' => 'Verificación del pedal, tambores, zapatas y líquido de frenos', 'obligatorio' => 1, 'orden' => 1, 'estado' => 'ACTIVO', 'seccion' => 'MECANICA'],
            ['id' => 2, 'codigo' => 'SIS-DIR', 'nombre' => 'Sistema de dirección y suspensión', 'descripcion' => 'Juego de timón, horquillas, amortiguadores y terminales', 'obligatorio' => 1, 'orden' => 2, 'estado' => 'ACTIVO', 'seccion' => 'MECANICA'],
            ['id' => 3, 'codigo' => 'LUC-PRI', 'nombre' => 'Luces principales altas y bajas', 'descripcion' => 'Correcto funcionamiento y alineamiento de faro delantero', 'obligatorio' => 1, 'orden' => 3, 'estado' => 'ACTIVO', 'seccion' => 'ELECTRICO'],
            ['id' => 4, 'codigo' => 'LUC-DIR', 'nombre' => 'Luces direccionales, freno y emergencia', 'descripcion' => 'Destelladores laterales y luz de stop posterior', 'obligatorio' => 1, 'orden' => 4, 'estado' => 'ACTIVO', 'seccion' => 'ELECTRICO'],
            ['id' => 5, 'codigo' => 'CAR-EST', 'nombre' => 'Estado de carrocería, chasis y pintura', 'descripcion' => 'Estructura rígida sin fisuras ni corrosión grave', 'obligatorio' => 1, 'orden' => 5, 'estado' => 'ACTIVO', 'seccion' => 'CARROCERIA'],
            ['id' => 6, 'codigo' => 'CAR-TOL', 'nombre' => 'Toldo, lona y micas de protección', 'descripcion' => 'Impermeabilidad, transparencia y visibilidad de los costados', 'obligatorio' => 1, 'orden' => 6, 'estado' => 'ACTIVO', 'seccion' => 'CARROCERIA'],
            ['id' => 7, 'codigo' => 'NEU-ARO', 'nombre' => 'Neumáticos y aros de rodaje', 'descripcion' => 'Profundidad de cocada mínima reglamentaria (2.0 mm)', 'obligatorio' => 1, 'orden' => 7, 'estado' => 'ACTIVO', 'seccion' => 'SEGURIDAD'],
            ['id' => 8, 'codigo' => 'ESP-RET', 'nombre' => 'Espejos retrovisores derecho e izquierdo', 'descripcion' => 'Espejos reglamentarios con buena visibilidad posterior', 'obligatorio' => 1, 'orden' => 8, 'estado' => 'ACTIVO', 'seccion' => 'SEGURIDAD'],
            ['id' => 9, 'codigo' => 'BOT-EXT', 'nombre' => 'Botiquín de primeros auxilios y extintor', 'descripcion' => 'Extintor ABC de 1kg cargado y botiquín equipado', 'obligatorio' => 1, 'orden' => 9, 'estado' => 'ACTIVO', 'seccion' => 'EMERGENCIA'],
            ['id' => 10, 'codigo' => 'ROT-EMB', 'nombre' => 'Razón social y número de padrón en carrocería', 'descripcion' => 'Rótulos identificatorios legibles de la empresa o asociación', 'obligatorio' => 0, 'orden' => 10, 'estado' => 'ACTIVO', 'seccion' => 'IDENTIFICACION'],
        ];
        $stmtInsCrit = $pdo->prepare("INSERT INTO inspeccion_criterios (id, codigo, nombre, descripcion, obligatorio, orden, estado, seccion) VALUES (:id, :codigo, :nombre, :descripcion, :obligatorio, :orden, :estado, :seccion)");
        foreach ($criteriosInspeccion as $ci) {
            $stmtInsCrit->execute($ci);
        }
        echo "✓ Criterios de inspección CERTICAV insertados (" . count($criteriosInspeccion) . ")\n";

        $certicavs = [
            ['id' => 1, 'id_vehiculo' => 1, 'id_conductor' => 6, 'id_tecnico' => 4, 'fecha' => '2026-02-10', 'numero_registro' => 'REG-2026-00101', 'numero_serie_certicav' => 'CERT-2026-000101', 'primera_evaluacion' => 'APROBADO', 'segunda_evaluacion' => null, 'resultado' => 'APROBADO', 'observaciones' => 'Unidad mototaxi en óptimas condiciones técnicas y de seguridad.', 'estado' => 'ACTIVO'],
            ['id' => 2, 'id_vehiculo' => 2, 'id_conductor' => 7, 'id_tecnico' => 4, 'fecha' => '2026-02-12', 'numero_registro' => 'REG-2026-00102', 'numero_serie_certicav' => 'CERT-2026-000102', 'primera_evaluacion' => 'APROBADO', 'segunda_evaluacion' => null, 'resultado' => 'APROBADO', 'observaciones' => 'Vehículo conforme en todos los sistemas evaluados.', 'estado' => 'ACTIVO'],
            ['id' => 3, 'id_vehiculo' => 3, 'id_conductor' => 8, 'id_tecnico' => 4, 'fecha' => '2026-03-01', 'numero_registro' => 'REG-2026-00103', 'numero_serie_certicav' => 'CERT-2026-000103', 'primera_evaluacion' => 'APROBADO', 'segunda_evaluacion' => null, 'resultado' => 'APROBADO', 'observaciones' => 'Conforme, apto para servicio especial de transporte en JLO.', 'estado' => 'ACTIVO'],
            ['id' => 4, 'id_vehiculo' => 8, 'id_conductor' => 11, 'id_tecnico' => 4, 'fecha' => '2026-03-05', 'numero_registro' => 'REG-2026-00104', 'numero_serie_certicav' => 'CERT-2026-000104', 'primera_evaluacion' => 'OBSERVADO', 'segunda_evaluacion' => null, 'resultado' => 'OBSERVADO', 'observaciones' => 'Observado por luces direccionales quemadas y falta de botiquín.', 'estado' => 'ACTIVO'],
        ];

        $stmtCert = $pdo->prepare("INSERT INTO certicav (id, id_vehiculo, id_conductor, id_tecnico, fecha, numero_registro, numero_serie_certicav, primera_evaluacion, segunda_evaluacion, resultado, observaciones, estado) VALUES (:id, :id_vehiculo, :id_conductor, :id_tecnico, :fecha, :numero_registro, :numero_serie_certicav, :primera_evaluacion, :segunda_evaluacion, :resultado, :observaciones, :estado)");
        $stmtCertDet = $pdo->prepare("INSERT INTO certicav_detalles (id_certicav, id_criterio, estado_revision, observacion) VALUES (:id_cert, :id_crit, :estado, :obs)");

        foreach ($certicavs as $crt) {
            $stmtCert->execute([
                'id' => $crt['id'],
                'id_vehiculo' => $crt['id_vehiculo'],
                'id_conductor' => $crt['id_conductor'],
                'id_tecnico' => $crt['id_tecnico'],
                'fecha' => $crt['fecha'],
                'numero_registro' => $crt['numero_registro'],
                'numero_serie_certicav' => $crt['numero_serie_certicav'],
                'primera_evaluacion' => $crt['primera_evaluacion'],
                'segunda_evaluacion' => $crt['segunda_evaluacion'],
                'resultado' => $crt['resultado'],
                'observaciones' => $crt['observaciones'],
                'estado' => $crt['estado'],
            ]);

            for ($c = 1; $c <= 10; $c++) {
                $isObs = ($crt['id'] === 4 && in_array($c, [4, 9]));
                $stmtCertDet->execute([
                    'id_cert' => $crt['id'],
                    'id_crit' => $c,
                    'estado' => $isObs ? 'OBSERVADO' : 'CONFORME',
                    'obs' => $isObs ? 'Subsanar en un plazo máximo de 7 días hábiles' : 'Cumple especificaciones técnicas',
                ]);
            }
        }
        echo "✓ Inspecciones CERTICAV y detalles insertadas (" . count($certicavs) . ")\n";

        $cursos = [
            [
                'id' => 1, 'codigo' => 'CURSO-2026-I',
                'nombre' => 'Capacitación en Normas de Tránsito, Seguridad Vial y Primeros Auxilios para Conductores de JLO',
                'descripcion' => 'Taller teórico-práctico obligatorio para operadores de mototaxis y vehículos de servicio especial.',
                'resolucion' => 'RESOLUCIÓN GERENCIAL N° 045-2026-MDJLO/GM', 'lugar' => 'Auditorio Municipal de JLO - Av. Sáenz Peña N° 340',
                'fecha_inicio' => '2026-02-15', 'fecha_fin' => '2026-02-16', 'costo_inscripcion' => 35.00, 'cupos' => 50, 'estado' => 'FINALIZADO',
            ],
            [
                'id' => 2, 'codigo' => 'CURSO-2026-II',
                'nombre' => 'Taller de Manejo Defensivo y Prevención de Accidentes en Zonas Comerciales',
                'descripcion' => 'Sensibilización sobre flujo vehicular en alrededores del Complejo de Mercados Moshoqueque.',
                'resolucion' => 'RESOLUCIÓN GERENCIAL N° 088-2026-MDJLO/GM', 'lugar' => 'Complejo Deportivo Carlos Castañeda Iparraguirre',
                'fecha_inicio' => '2026-09-25', 'fecha_fin' => '2026-09-26', 'costo_inscripcion' => 35.00, 'cupos' => 60, 'estado' => 'PROGRAMADO',
            ],
        ];

        $stmtCur = $pdo->prepare("INSERT INTO cursos_seguridad_vial (id, codigo, nombre, descripcion, resolucion, lugar, fecha_inicio, fecha_fin, costo_inscripcion, cupos, estado) VALUES (:id, :codigo, :nombre, :descripcion, :resolucion, :lugar, :fecha_inicio, :fecha_fin, :costo_inscripcion, :cupos, :estado)");
        foreach ($cursos as $cr) {
            $stmtCur->execute($cr);
        }

        $inscripciones = [
            ['id' => 1, 'id_curso' => 1, 'id_persona' => 6, 'id_vehiculo' => 1, 'fecha_inscripcion' => '2026-02-10', 'estado_pago' => 'PAGADO', 'asistio' => 1, 'estado' => 'APROBADO'],
            ['id' => 2, 'id_curso' => 1, 'id_persona' => 7, 'id_vehiculo' => 2, 'fecha_inscripcion' => '2026-02-11', 'estado_pago' => 'PAGADO', 'asistio' => 1, 'estado' => 'APROBADO'],
            ['id' => 3, 'id_curso' => 1, 'id_persona' => 8, 'id_vehiculo' => 3, 'fecha_inscripcion' => '2026-02-12', 'estado_pago' => 'PAGADO', 'asistio' => 1, 'estado' => 'APROBADO'],
            ['id' => 4, 'id_curso' => 1, 'id_persona' => 9, 'id_vehiculo' => 4, 'fecha_inscripcion' => '2026-02-12', 'estado_pago' => 'PAGADO', 'asistio' => 1, 'estado' => 'APROBADO'],
            ['id' => 5, 'id_curso' => 2, 'id_persona' => 10, 'id_vehiculo' => 5, 'fecha_inscripcion' => '2026-09-08', 'estado_pago' => 'PAGADO', 'asistio' => 0, 'estado' => 'INSCRITO'],
        ];
        $stmtInsc = $pdo->prepare("INSERT INTO inscripciones_curso (id, id_curso, id_persona, id_vehiculo, fecha_inscripcion, estado_pago, asistio, estado) VALUES (:id, :id_curso, :id_persona, :id_vehiculo, :fecha_inscripcion, :estado_pago, :asistio, :estado)");
        foreach ($inscripciones as $in) {
            $stmtInsc->execute($in);
        }

        $certificados = [
            ['id' => 1, 'id_inscripcion' => 1, 'id_autoridad' => 1, 'fecha_expedicion' => '2026-02-17', 'fecha_vencimiento' => '2027-02-17', 'numero_certificado' => 'CERT-VIAL-2026-0001', 'cargo_autoridad' => 'Subgerente de Tránsito y Transporte'],
            ['id' => 2, 'id_inscripcion' => 2, 'id_autoridad' => 1, 'fecha_expedicion' => '2026-02-17', 'fecha_vencimiento' => '2027-02-17', 'numero_certificado' => 'CERT-VIAL-2026-0002', 'cargo_autoridad' => 'Subgerente de Tránsito y Transporte'],
            ['id' => 3, 'id_inscripcion' => 3, 'id_autoridad' => 1, 'fecha_expedicion' => '2026-02-17', 'fecha_vencimiento' => '2027-02-17', 'numero_certificado' => 'CERT-VIAL-2026-0003', 'cargo_autoridad' => 'Subgerente de Tránsito y Transporte'],
            ['id' => 4, 'id_inscripcion' => 4, 'id_autoridad' => 1, 'fecha_expedicion' => '2026-02-17', 'fecha_vencimiento' => '2027-02-17', 'numero_certificado' => 'CERT-VIAL-2026-0004', 'cargo_autoridad' => 'Subgerente de Tránsito y Transporte'],
        ];
        $stmtCertCur = $pdo->prepare("INSERT INTO certificados_curso (id, id_inscripcion, id_autoridad, fecha_expedicion, fecha_vencimiento, numero_certificado, cargo_autoridad) VALUES (:id, :id_inscripcion, :id_autoridad, :fecha_expedicion, :fecha_vencimiento, :numero_certificado, :cargo_autoridad)");
        foreach ($certificados as $cc) {
            $stmtCertCur->execute($cc);
        }
        echo "✓ Cursos de seguridad vial, inscripciones y certificados insertados.\n";

        $procedimientos = [
            ['id' => 1, 'codigo' => 'TUPA-01', 'nombre' => 'Emisión de Tarjeta Única de Circulación (TUC) para Vehículos Menores', 'descripcion' => 'Otorgamiento de documento habilitante para servicio de mototaxis', 'costo' => 45.00, 'estado' => 'ACTIVO'],
            ['id' => 2, 'codigo' => 'TUPA-02', 'nombre' => 'Renovación de Permiso de Operación para Empresas y Asociaciones', 'descripcion' => 'Autorización administrativa anual para personas jurídicas de transporte', 'costo' => 280.00, 'estado' => 'ACTIVO'],
            ['id' => 3, 'codigo' => 'TUPA-03', 'nombre' => 'Constatación de Características y Aptitud Vehicular (CERTICAV)', 'descripcion' => 'Inspección técnica municipal de mototaxis', 'costo' => 38.50, 'estado' => 'ACTIVO'],
            ['id' => 4, 'codigo' => 'TUPA-04', 'nombre' => 'Duplicado o Canje de Credencial de Conductor Municipal', 'descripcion' => 'Reposición de credencial/fotocheck municipal por pérdida o deterioro', 'costo' => 25.00, 'estado' => 'ACTIVO'],
        ];
        $stmtProc = $pdo->prepare("INSERT INTO procedimientos_administrativos (id, codigo, nombre, descripcion, costo, estado) VALUES (:id, :codigo, :nombre, :descripcion, :costo, :estado)");
        foreach ($procedimientos as $pr) {
            $stmtProc->execute($pr);
        }

        $tramites = [
            [
                'id' => 1, 'id_procedimiento_admin' => 2, 'id_persona' => null, 'id_organizacion' => 1, 'id_vehiculo' => null,
                'fecha_solicitud' => '2026-01-08', 'numero_expediente' => 'EXP-2026-00451',
                'funcionario_dirigido' => 'Ing. Carlos Alberto Mendoza Salazar', 'cargo_funcionario' => 'Subgerente de Tránsito y Transporte',
                'detalle_solicitud' => 'Solicitud de renovación anual del permiso de operación para la flota de 45 mototaxis de la asociación.', 'estado' => 'APROBADO',
            ],
            [
                'id' => 2, 'id_procedimiento_admin' => 1, 'id_persona' => 6, 'id_organizacion' => 1, 'id_vehiculo' => 1,
                'fecha_solicitud' => '2026-01-10', 'numero_expediente' => 'EXP-2026-00482',
                'funcionario_dirigido' => 'Ing. Carlos Alberto Mendoza Salazar', 'cargo_funcionario' => 'Subgerente de Tránsito y Transporte',
                'detalle_solicitud' => 'Solicitud de TUC 2026 para la unidad de placa 1234-7M.', 'estado' => 'APROBADO',
            ],
            [
                'id' => 3, 'id_procedimiento_admin' => 4, 'id_persona' => 7, 'id_organizacion' => null, 'id_vehiculo' => null,
                'fecha_solicitud' => '2026-09-01', 'numero_expediente' => 'EXP-2026-01205',
                'funcionario_dirigido' => 'Ing. Carlos Alberto Mendoza Salazar', 'cargo_funcionario' => 'Subgerente de Tránsito y Transporte',
                'detalle_solicitud' => 'Duplicado de credencial de conductor por extravío.', 'estado' => 'PENDIENTE',
            ]
        ];
        $stmtTram = $pdo->prepare("INSERT INTO tramites_documentarios (id, id_procedimiento_admin, id_persona, id_organizacion, id_vehiculo, fecha_solicitud, numero_expediente, funcionario_dirigido, cargo_funcionario, detalle_solicitud, estado) VALUES (:id, :id_procedimiento_admin, :id_persona, :id_organizacion, :id_vehiculo, :fecha_solicitud, :numero_expediente, :funcionario_dirigido, :cargo_funcionario, :detalle_solicitud, :estado)");
        foreach ($tramites as $tr) {
            $stmtTram->execute($tr);
        }

        $permisos = [
            [
                'id' => 1, 'id_tramite' => 1, 'horario_inicio' => '05:00:00', 'horario_fin' => '23:00:00',
                'fecha_emision' => '2026-01-15', 'fecha_inicio_vigencia' => '2026-01-15', 'fecha_fin_vigencia' => '2027-01-15',
                'numero_autorizacion' => 'RES-SUBTRANS-2026-015', 'tipo_permiso' => 'RENOVACION_OPERACION',
                'asunto' => 'Autorización de Operación para Servicio Especial de Transporte en Vehículos Menores',
                'referencia_sisgedo' => 'SIS-2026-0982', 'expediente' => 'EXP-2026-00451', 'registro_numero' => 'REG-ASOC-001',
                'contenido' => 'Se autoriza a la Asociación de Mototaxistas San Valentín de JLO a prestar servicio especial de pasajeros en la jurisdicción del Distrito de José Leonardo Ortiz.',
                'zona_circulacion' => 'Zona A - Cuadrante Urbano Central de JLO', 'estado' => 'VIGENTE',
            ]
        ];
        $stmtPerm = $pdo->prepare("INSERT INTO permisos_circulacion (id, id_tramite, horario_inicio, horario_fin, fecha_emision, fecha_inicio_vigencia, fecha_fin_vigencia, numero_autorizacion, tipo_permiso, asunto, referencia_sisgedo, expediente, registro_numero, contenido, zona_circulacion, estado) VALUES (:id, :id_tramite, :horario_inicio, :horario_fin, :fecha_emision, :fecha_inicio_vigencia, :fecha_fin_vigencia, :numero_autorizacion, :tipo_permiso, :asunto, :referencia_sisgedo, :expediente, :registro_numero, :contenido, :zona_circulacion, :estado)");
        foreach ($permisos as $pm) {
            $stmtPerm->execute($pm);
        }
        echo "✓ Procedimientos TUPA, trámites documentarios y permisos insertados.\n";

        $pagos = [
            ['id' => 1, 'id_papeleta' => 3, 'id_tramite' => null, 'id_inscripcion' => null, 'fecha_pago' => '2026-09-05', 'hora_pago' => '10:15:00', 'tipo_pago' => 'PAPELETA', 'numero_recibo' => 'REC-2026-00001', 'numero_voucher' => 'VOU-BN-192831', 'medio_pago' => 'EFECTIVO', 'referencia_pago' => 'Cancelación de Papeleta PAP-2026-0003', 'total' => $calcMonto(5.0), 'estado' => 'PAGADO'],
            ['id' => 2, 'id_papeleta' => 7, 'id_tramite' => null, 'id_inscripcion' => null, 'fecha_pago' => '2026-09-09', 'hora_pago' => '14:20:00', 'tipo_pago' => 'PAPELETA', 'numero_recibo' => 'REC-2026-00002', 'numero_voucher' => 'VOU-BN-192832', 'medio_pago' => 'EFECTIVO', 'referencia_pago' => 'Cancelación de Papeleta PAP-2026-0007 para liberación', 'total' => $calcMonto(10.0), 'estado' => 'PAGADO'],
            ['id' => 3, 'id_papeleta' => 8, 'id_tramite' => null, 'id_inscripcion' => null, 'fecha_pago' => '2026-09-10', 'hora_pago' => '11:05:00', 'tipo_pago' => 'PAPELETA', 'numero_recibo' => 'REC-2026-00003', 'numero_voucher' => 'VOU-CP-829104', 'medio_pago' => 'TRANSFERENCIA', 'referencia_pago' => 'Cancelación de Papeleta PAP-2026-0008', 'total' => $calcMonto(3.0), 'estado' => 'PAGADO'],
            ['id' => 4, 'id_papeleta' => null, 'id_tramite' => 1, 'id_inscripcion' => null, 'fecha_pago' => '2026-01-08', 'hora_pago' => '11:30:00', 'tipo_pago' => 'TRAMITE', 'numero_recibo' => 'REC-2026-00006', 'numero_voucher' => 'VOU-BN-091823', 'medio_pago' => 'DEPOSITO', 'referencia_pago' => 'TUPA-02 Renovación Permiso Operación Asoc. San Valentín', 'total' => 280.00, 'estado' => 'PAGADO'],
            ['id' => 5, 'id_papeleta' => null, 'id_tramite' => 2, 'id_inscripcion' => null, 'fecha_pago' => '2026-01-10', 'hora_pago' => '09:45:00', 'tipo_pago' => 'TRAMITE', 'numero_recibo' => 'REC-2026-00007', 'numero_voucher' => 'VOU-BN-091824', 'medio_pago' => 'EFECTIVO', 'referencia_pago' => 'TUPA-01 Emisión TUC Placa 1234-7M', 'total' => 45.00, 'estado' => 'PAGADO'],
            ['id' => 6, 'id_papeleta' => null, 'id_tramite' => null, 'id_inscripcion' => 1, 'fecha_pago' => '2026-02-10', 'hora_pago' => '16:00:00', 'tipo_pago' => 'CURSO', 'numero_recibo' => 'REC-2026-00008', 'numero_voucher' => 'VOU-YAPE-381920', 'medio_pago' => 'YAPE', 'referencia_pago' => 'Inscripción Curso Seguridad Vial 2026-I', 'total' => 35.00, 'estado' => 'PAGADO'],
            ['id' => 7, 'id_papeleta' => null, 'id_tramite' => null, 'id_inscripcion' => 2, 'fecha_pago' => '2026-02-11', 'hora_pago' => '10:30:00', 'tipo_pago' => 'CURSO', 'numero_recibo' => 'REC-2026-00009', 'numero_voucher' => 'VOU-YAPE-381921', 'medio_pago' => 'YAPE', 'referencia_pago' => 'Inscripción Curso Seguridad Vial 2026-I', 'total' => 35.00, 'estado' => 'PAGADO'],
        ];

        $stmtPago = $pdo->prepare("INSERT INTO pagos_transito (id, id_papeleta, id_tramite, id_inscripcion, fecha_pago, hora_pago, tipo_pago, numero_recibo, numero_voucher, medio_pago, referencia_pago, total, estado) VALUES (:id, :id_papeleta, :id_tramite, :id_inscripcion, :fecha_pago, :hora_pago, :tipo_pago, :numero_recibo, :numero_voucher, :medio_pago, :referencia_pago, :total, :estado)");
        foreach ($pagos as $pg) {
            $stmtPago->execute($pg);
        }
        echo "✓ Pagos de tránsito y recibos municipales insertados (" . count($pagos) . ")\n";

        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");
        echo "\n=======================================================\n";
        echo "¡SEEDS COMPLETADOS CON ÉXITO PARA transitomunicipal!\n";
        echo "=======================================================\n";
    }
}

if (php_sapi_name() === 'cli' && isset($argv[0]) && realpath($argv[0]) === __FILE__) {
    DatabaseSeeder::executeDirect();
}
