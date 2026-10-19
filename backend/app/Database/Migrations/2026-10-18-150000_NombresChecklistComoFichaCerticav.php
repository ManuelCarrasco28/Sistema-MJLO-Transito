<?php
namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Los subítems del checklist CERTICAV se nombran como en la ficha física («- Lado delantero derecho»),
 * sin repetir el nombre del grupo, que ahora es un ítem propio (CV-G01…CV-G07). Idempotente.
 */
class NombresChecklistComoFichaCerticav extends Migration
{
    public function up()
    {
        $nombres = [
            'CV-03' => 'Sonido de Claxón',
            'CV-04' => '- Lado delantero derecho', 'CV-05' => '- Lado delantero izquierdo',
            'CV-06' => '- Lado posterior derecho', 'CV-07' => '- Lado posterior izquierdo',
            'CV-08' => '- Luz de alta', 'CV-09' => '- Luz de baja',
            'CV-10' => '- Lado delantero derecho', 'CV-11' => '- Lado delantero izquierdo',
            'CV-12' => '- Lado posterior derecho', 'CV-13' => '- Lado posterior izquierdo',
            'CV-14' => '- Lado delantero derecho', 'CV-15' => '- Lado delantero izquierdo',
            'CV-16' => '- Lado posterior derecho', 'CV-17' => '- Lado posterior izquierdo',
            'CV-23' => '- Freno de pedal', 'CV-24' => '- Freno de mano auxiliar',
            'CV-27' => '- Visibilidad del parabrisas',
            'CV-30' => '- Lado izquierdo', 'CV-31' => '- Lado derecho', 'CV-32' => '- Lado posterior',
            'CV-33' => '- Placa lado posterior del vehículo', 'CV-34' => '- Placa lado superior techo',
            'CV-35' => '- Placa lado interior respaldar del conductor',
        ];
        $this->db->transStart();
        foreach ($nombres as $codigo => $nombre) {
            $this->db->table('inspeccion_criterios')->where('codigo', $codigo)->update(['nombre' => $nombre]);
        }
        $this->db->transComplete();
        if (!$this->db->transStatus()) {
            throw new \RuntimeException('No se pudieron renombrar los ítems del checklist CERTICAV.');
        }
    }

    public function down()
    {
    }
}
