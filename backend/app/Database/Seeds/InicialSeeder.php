<?php

namespace App\Database\Seeds;

use CodeIgniter\Database\Seeder;

class InicialSeeder extends Seeder
{
    public function run()
    {
        $this->call('UsuariosSeeder');

        // Tipos de vehículo
        $tipos_vehiculo = [
            ['nombre' => 'MOTO LINEAL', 'descripcion' => 'Motocicleta de dos ruedas', 'estado' => 'ACTIVO'],
            ['nombre' => 'MOTOTAXI', 'descripcion' => 'Vehículo menor de tres ruedas para transporte de pasajeros', 'estado' => 'ACTIVO'],
            ['nombre' => 'TRICICLO', 'descripcion' => 'Vehículo menor de tres ruedas para carga', 'estado' => 'ACTIVO'],
        ];
        $this->db->table('tipos_vehiculo')->insertBatch($tipos_vehiculo);

        // Tipos de infracción
        $tipos_infraccion = [
            ['codigo' => 'G-01', 'descripcion' => 'No llevar casco de seguridad', 'gravedad' => 'GRAVE', 'monto_base' => 350.00, 'estado' => 'ACTIVO'],
            ['codigo' => 'L-01', 'descripcion' => 'Estacionar en zona prohibida', 'gravedad' => 'LEVE', 'monto_base' => 150.00, 'estado' => 'ACTIVO'],
            ['codigo' => 'MG-01', 'descripcion' => 'Conducir en estado de ebriedad', 'gravedad' => 'MUY GRAVE', 'monto_base' => 2500.00, 'estado' => 'ACTIVO'],
        ];
        $this->db->table('tipos_infraccion')->insertBatch($tipos_infraccion);

        // Criterios de inspección
        $inspeccion_criterios = [
            ['codigo' => 'IT-01', 'nombre' => 'Sistema de Frenos', 'descripcion' => 'Revisión del sistema de frenado, pastillas y líquido', 'obligatorio' => 1, 'orden' => 1, 'estado' => 'ACTIVO'],
            ['codigo' => 'IT-02', 'nombre' => 'Luces', 'descripcion' => 'Revisión de luces delanteras, traseras, direccionales y de freno', 'obligatorio' => 1, 'orden' => 2, 'estado' => 'ACTIVO'],
            ['codigo' => 'IT-03', 'nombre' => 'Llantas', 'descripcion' => 'Revisión del estado de desgaste de las llantas', 'obligatorio' => 1, 'orden' => 3, 'estado' => 'ACTIVO'],
            ['codigo' => 'IT-04', 'nombre' => 'Espejos', 'descripcion' => 'Espejos retrovisores en buen estado', 'obligatorio' => 1, 'orden' => 4, 'estado' => 'ACTIVO'],
        ];
        $this->db->table('inspeccion_criterios')->insertBatch($inspeccion_criterios);

        // Organizaciones (Asociaciones)
        $organizaciones = [
            ['tipo' => 'ASOCIACION_MOTOTAXISTAS', 'razon_social' => 'ASOCIACION DE MOTOTAXISTAS LOS PIONEROS', 'ruc' => '20123456789', 'estado' => 'ACTIVO'],
            ['tipo' => 'ASOCIACION_MOTOTAXISTAS', 'razon_social' => 'ASOCIACION DE TRANSPORTISTAS EL SOL', 'ruc' => '20987654321', 'estado' => 'ACTIVO'],
        ];
        $this->db->table('organizaciones')->insertBatch($organizaciones);
    }
}
