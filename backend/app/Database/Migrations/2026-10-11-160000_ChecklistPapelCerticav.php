<?php
namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class ChecklistPapelCerticav extends Migration
{
    public function up()
    {
        $electricos = ['Encendido de máquina', 'Velocímetro', 'Sonido de claxón', 'Luces direccionales · Lado delantero derecho', 'Luces direccionales · Lado delantero izquierdo', 'Luces direccionales · Lado posterior derecho', 'Luces direccionales · Lado posterior izquierdo', 'Luces de faro delantero · Luz de alta', 'Luces de faro delantero · Luz de baja', 'Luces de freno · Lado delantero derecho', 'Luces de freno · Lado delantero izquierdo', 'Luces de freno · Lado posterior derecho', 'Luces de freno · Lado posterior izquierdo', 'Luces de faro delantero · Lado delantero derecho', 'Luces de faro delantero · Lado delantero izquierdo', 'Luces de faro delantero · Lado posterior derecho', 'Luces de faro delantero · Lado posterior izquierdo'];
        $mecanicos = ['Tubo de escape', 'Acelerador', 'Embrague', 'Tapa de tanque de combustible', 'Sistema de frenos · Freno de pedal', 'Sistema de frenos · Freno de mano auxiliar'];
        $exteriores = ['Espejos retrovisores', 'Parabrisas transparente', 'Visibilidad del parabrisas', 'Micas transparentes', 'Placa original del vehículo', 'Cinta reflectiva · Lado izquierdo', 'Cinta reflectiva · Lado derecho', 'Cinta reflectiva · Lado posterior', 'Pintado · Placa lado posterior del vehículo', 'Pintado · Placa lado superior techo', 'Pintado · Placa lado interior respaldar del conductor', 'Razón social transportador lado superior techo', 'Razón social lado interior'];
        $rows = [];
        foreach ($electricos as $i => $nombre) $rows[] = ['codigo' => sprintf('CV-%02d', $i + 1), 'nombre' => $nombre, 'seccion' => 'SISTEMA ELECTRICO', 'orden' => ($i + 1) * 10, 'obligatorio' => 1];
        $rows[] = ['codigo' => 'CV-18', 'nombre' => 'Tapiz del asiento', 'seccion' => 'ASPECTOS INTERIORES', 'orden' => 180, 'obligatorio' => 1];
        foreach ($mecanicos as $i => $nombre) $rows[] = ['codigo' => sprintf('CV-%02d', $i + 19), 'nombre' => $nombre, 'seccion' => 'ESPECIFICACIONES MECANICAS', 'orden' => ($i + 19) * 10, 'obligatorio' => 1];
        foreach ($exteriores as $i => $nombre) $rows[] = ['codigo' => sprintf('CV-%02d', $i + 25), 'nombre' => $nombre, 'seccion' => 'ASPECTOS EXTERIORES', 'orden' => ($i + 25) * 10, 'obligatorio' => 1];
        // Los títulos de grupo del formato en papel (Luces direccionales, Cinta reflectiva...) no son ítems que se evalúen:
        // solo ordenan la hoja impresa, así que no se crean como criterios del checklist.
        $this->db->transStart();
        foreach ($rows as $row) {
            $row['estado'] = 'ACTIVO';
            $exists = $this->db->table('inspeccion_criterios')->where('codigo', $row['codigo'])->get()->getRowArray();
            if ($exists) $this->db->table('inspeccion_criterios')->where('id', $exists['id'])->update($row);
            else $this->db->table('inspeccion_criterios')->insert($row);
        }
        $this->db->table('inspeccion_criterios')->whereNotIn('codigo', array_column($rows, 'codigo'))->update(['estado' => 'INACTIVO']);
        $this->db->transComplete();
        if (!$this->db->transStatus()) throw new \RuntimeException('No se pudo actualizar el checklist CERTICAV.');
    }
    public function down()
    {
        // No eliminar criterios que ya puedan tener resultados asociados.
        $this->db->table('inspeccion_criterios')->like('codigo', 'CV-G', 'after')->update(['estado' => 'INACTIVO']);
    }
}
