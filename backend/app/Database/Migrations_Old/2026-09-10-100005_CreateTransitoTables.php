<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class CreateTransitoTables extends Migration
{
    public function up()
    {
        // 1. Tabla: tipos_infraccion
        $this->forge->addField([
            'id'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'codigo'      => ['type' => 'VARCHAR', 'constraint' => 20],
            'descripcion' => ['type' => 'TEXT'],
            'gravedad'    => ['type' => 'VARCHAR', 'constraint' => 20, 'null' => true],
            'monto_base'  => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'estado'      => ['type' => 'VARCHAR', 'constraint' => 15, 'default' => 'ACTIVO'],
            'created_at'  => ['type' => 'DATETIME', 'null' => true],
            'updated_at'  => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->createTable('tipos_infraccion', true);

        // 2. Tabla: papeletas
        $this->forge->addField([
            'id'                      => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'numero_papeleta'         => ['type' => 'VARCHAR', 'constraint' => 50],
            'id_vehiculo'             => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'id_persona_infractor'    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'id_inspector'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'fecha_hora'              => ['type' => 'DATETIME'],
            'lugar'                   => ['type' => 'VARCHAR', 'constraint' => 250, 'null' => true],
            'servicio'                => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'unidad_autoridad'        => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'nombre_autoridad'        => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'observacion_autoridad'   => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'observaciones_conductor' => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'monto_total'             => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'estado'                  => ['type' => 'VARCHAR', 'constraint' => 30, 'default' => 'PENDIENTE'],
            'created_at'              => ['type' => 'DATETIME', 'null' => true],
            'updated_at'              => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_vehiculo', 'vehiculos', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_persona_infractor', 'personas', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('id_inspector', 'personal', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('papeletas', true);

        // 3. Tabla: papeleta_detalles
        $this->forge->addField([
            'id'                 => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'id_papeleta'        => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'id_tipo_infraccion' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'monto'              => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'descuento'          => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'monto_final'        => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'created_at'         => ['type' => 'DATETIME', 'null' => true],
            'updated_at'         => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_papeleta', 'papeletas', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_tipo_infraccion', 'tipos_infraccion', 'id', 'RESTRICT', 'CASCADE');
        $this->forge->createTable('papeleta_detalles', true);

        // 4. Tabla: pagos
        $this->forge->addField([
            'id'                   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'tipo_pago'            => ['type' => 'VARCHAR', 'constraint' => 50, 'default' => 'EFECTIVO'],
            'id_papeleta'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'id_tramite'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'numero_recibo'        => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'numero_voucher'       => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'fecha_pago'           => ['type' => 'DATE'],
            'hora_pago'            => ['type' => 'TIME'],
            'cajero'               => ['type' => 'VARCHAR', 'constraint' => 100, 'null' => true],
            'caja'                 => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'codigo_contribuyente' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'concepto'             => ['type' => 'VARCHAR', 'constraint' => 250, 'null' => true],
            'subtotal'             => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'reajuste'             => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'intereses'            => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'descuento_aplicado'   => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'redondeo'             => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'total'                => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'estado'               => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'COMPLETADO'],
            'created_at'           => ['type' => 'DATETIME', 'null' => true],
            'updated_at'           => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_papeleta', 'papeletas', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('id_tramite', 'tramites_documentarios', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('pagos', true);

        // 5. Tabla: retenciones_vehiculo
        $this->forge->addField([
            'id'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'id_papeleta'   => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'fecha_ingreso' => ['type' => 'DATETIME'],
            'deposito'      => ['type' => 'VARCHAR', 'constraint' => 150, 'null' => true],
            'motivo'        => ['type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            'numero_boleta' => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'total_dias'    => ['type' => 'INT', 'constraint' => 11, 'null' => true],
            'estado'        => ['type' => 'VARCHAR', 'constraint' => 30, 'default' => 'RETENIDO'],
            'fecha_salida'  => ['type' => 'DATETIME', 'null' => true],
            'observaciones' => ['type' => 'TEXT', 'null' => true],
            'created_at'    => ['type' => 'DATETIME', 'null' => true],
            'updated_at'    => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_papeleta', 'papeletas', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('retenciones_vehiculo', true);

        // 6. Tabla: ordenes_libertad
        $this->forge->addField([
            'id'                    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'numero_orden'          => ['type' => 'VARCHAR', 'constraint' => 50],
            'id_retencion'          => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true],
            'id_pago'               => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'id_persona_autorizada' => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'fecha_emision'         => ['type' => 'DATE'],
            'monto_total'           => ['type' => 'DECIMAL', 'constraint' => '12,2', 'default' => '0.00'],
            'observaciones'         => ['type' => 'TEXT', 'null' => true],
            'created_at'            => ['type' => 'DATETIME', 'null' => true],
            'updated_at'            => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_retencion', 'retenciones_vehiculo', 'id', 'CASCADE', 'CASCADE');
        $this->forge->addForeignKey('id_pago', 'pagos', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('id_persona_autorizada', 'personas', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('ordenes_libertad', true);

        // 7. Tabla: permisos_circulacion
        $this->forge->addField([
            'id'                    => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'auto_increment' => true],
            'id_tramite'            => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'id_organizacion'       => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'id_vehiculo'           => ['type' => 'INT', 'constraint' => 11, 'unsigned' => true, 'null' => true],
            'numero_autorizacion'   => ['type' => 'VARCHAR', 'constraint' => 50],
            'tipo_permiso'          => ['type' => 'ENUM', 'constraint' => ['CARGA_DESCARGA', 'CIRCULACION', 'ESTACIONAMIENTO']],
            'asunto'                => ['type' => 'VARCHAR', 'constraint' => 250, 'null' => true],
            'referencia_sisgedo'    => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'expediente'            => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'registro_numero'       => ['type' => 'VARCHAR', 'constraint' => 50, 'null' => true],
            'contenido'             => ['type' => 'TEXT', 'null' => true],
            'zona_circulacion'      => ['type' => 'VARCHAR', 'constraint' => 250, 'null' => true],
            'horario_inicio'        => ['type' => 'TIME', 'null' => true],
            'horario_fin'           => ['type' => 'TIME', 'null' => true],
            'fecha_emision'         => ['type' => 'DATE', 'null' => true],
            'fecha_inicio_vigencia' => ['type' => 'DATE', 'null' => true],
            'fecha_fin_vigencia'    => ['type' => 'DATE', 'null' => true],
            'estado'                => ['type' => 'VARCHAR', 'constraint' => 20, 'default' => 'VIGENTE'],
            'created_at'            => ['type' => 'DATETIME', 'null' => true],
            'updated_at'            => ['type' => 'DATETIME', 'null' => true],
        ]);
        $this->forge->addKey('id', true);
        $this->forge->addForeignKey('id_tramite', 'tramites_documentarios', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('id_organizacion', 'organizaciones', 'id', 'SET NULL', 'CASCADE');
        $this->forge->addForeignKey('id_vehiculo', 'vehiculos', 'id', 'SET NULL', 'CASCADE');
        $this->forge->createTable('permisos_circulacion', true);
    }

    public function down()
    {
        $this->forge->dropTable('permisos_circulacion', true);
        $this->forge->dropTable('ordenes_libertad', true);
        $this->forge->dropTable('retenciones_vehiculo', true);
        $this->forge->dropTable('pagos', true);
        $this->forge->dropTable('papeleta_detalles', true);
        $this->forge->dropTable('papeletas', true);
        $this->forge->dropTable('tipos_infraccion', true);
    }
}

