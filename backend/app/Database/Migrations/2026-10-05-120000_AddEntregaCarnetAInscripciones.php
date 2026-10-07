<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

/**
 * Permite marcar cuándo (y quién) entregó el carnet físico de un curso de seguridad vial
 * a su conductor, para distinguir "ya se imprimió" de "ya lo recogió" en el padrón.
 */
class AddEntregaCarnetAInscripciones extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('carnet_entregado', 'inscripciones_curso')) {
            $this->forge->addColumn('inscripciones_curso', [
                'carnet_entregado' => [
                    'type' => 'TINYINT',
                    'constraint' => 1,
                    'default' => 0,
                    'null' => false,
                    'after' => 'asistio',
                ],
                'carnet_fecha_entrega' => [
                    'type' => 'DATETIME',
                    'null' => true,
                    'after' => 'carnet_entregado',
                ],
                'carnet_entregado_por' => [
                    'type' => 'VARCHAR',
                    'constraint' => 100,
                    'null' => true,
                    'after' => 'carnet_fecha_entrega',
                ],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('carnet_entregado', 'inscripciones_curso')) {
            $this->forge->dropColumn('inscripciones_curso', ['carnet_entregado', 'carnet_fecha_entrega', 'carnet_entregado_por']);
        }
    }
}
