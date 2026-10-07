<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class TipoInspectorTrabajadores extends Migration
{
    public function up()
    {
        if (!$this->db->fieldExists('tipo_inspector', 'trabajadores')) {
            $this->forge->addColumn('trabajadores', [
                'tipo_inspector' => ['type' => 'ENUM', 'constraint' => ['TRANSITO', 'TECNICO'], 'null' => true],
            ]);
            // El rol Trabajador ya corresponde al acceso móvil. No inferir funciones de los cargos.
            $this->db->query("UPDATE trabajadores t JOIN usuarios u ON u.id_persona=t.id_persona JOIN roles r ON r.id=u.id_rol SET t.tipo_inspector='TRANSITO' WHERE u.estado='ACTIVO' AND UPPER(r.nombre)='TRABAJADOR'");
        }
    }

    public function down()
    {
        if ($this->db->fieldExists('tipo_inspector', 'trabajadores')) {
            $this->forge->dropColumn('trabajadores', 'tipo_inspector');
        }
    }
}
