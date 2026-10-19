<?php
namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * En la ficha física CERTICAV las filas de grupo («Luces direccionales», «Sistema de frenos»…) también se marcan:
 * son ítems del checklist, no solo títulos. Se activan como criterios propios (CV-G01…CV-G07) y se respeta el
 * cuarto grupo eléctrico, que en la ficha repite «Luces de faro delantero».
 * Idempotente; no altera los resultados ya guardados.
 */
class GruposEnChecklistCerticav extends Migration
{
    public function up()
    {
        $grupos = [
            ['CV-G01', 'Luces direccionales', 'SISTEMA ELECTRICO', 35],
            ['CV-G02', 'Luces de faro delantero', 'SISTEMA ELECTRICO', 75],
            ['CV-G03', 'Luces de freno', 'SISTEMA ELECTRICO', 95],
            ['CV-G04', 'Luces de faro delantero', 'SISTEMA ELECTRICO', 135],
            ['CV-G05', 'Sistema de frenos', 'ESPECIFICACIONES MECANICAS', 225],
            ['CV-G06', 'Cinta reflectiva', 'ASPECTOS EXTERIORES', 295],
            ['CV-G07', 'Pintado', 'ASPECTOS EXTERIORES', 325],
        ];

        $this->db->transStart();
        foreach ($grupos as [$codigo, $nombre, $seccion, $orden]) {
            $fila = ['nombre' => $nombre, 'seccion' => $seccion, 'orden' => $orden, 'obligatorio' => 1, 'estado' => 'ACTIVO'];
            $existe = $this->db->table('inspeccion_criterios')->where('codigo', $codigo)->get()->getRowArray();
            if ($existe) {
                $this->db->table('inspeccion_criterios')->where('id', $existe['id'])->update($fila);
            } else {
                $this->db->table('inspeccion_criterios')->insert($fila + ['codigo' => $codigo]);
            }
        }
        $this->db->transComplete();
        if (!$this->db->transStatus()) {
            throw new \RuntimeException('No se pudieron actualizar los grupos del checklist CERTICAV.');
        }
    }

    public function down()
    {
        $this->db->table('inspeccion_criterios')->like('codigo', 'CV-G', 'after')->update(['estado' => 'INACTIVO']);
    }
}
