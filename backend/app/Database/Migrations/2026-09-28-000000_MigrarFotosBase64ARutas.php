<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class MigrarFotosBase64ARutas extends Migration
{
    public function up()
    {
        $service = new \App\Services\FileStorageService();

        if ($this->db->tableExists('reporte_intervencion_fotos')) {
            $rows = $this->db->table('reporte_intervencion_fotos')->get()->getResultArray();
            foreach ($rows as $row) {
                $valor = (string) ($row['foto'] ?? '');
                if ($valor !== '' && !str_starts_with($valor, 'http') && strlen($valor) > 255) {
                    $ruta = $service->guardarImagenBase64($valor, 'reportes');
                    if ($ruta !== null) {
                        $this->db->table('reporte_intervencion_fotos')->where('id', $row['id'])->update(['foto' => $ruta]);
                    }
                }
            }
            $this->forge->modifyColumn('reporte_intervencion_fotos', [
                'foto' => ['name' => 'foto', 'type' => 'VARCHAR', 'constraint' => 255, 'null' => false],
            ]);
        }

        if ($this->db->tableExists('papeletas') && $this->db->fieldExists('firma_conductor_img', 'papeletas')) {
            $rows = $this->db->table('papeletas')->select('id, firma_conductor_img')->where('firma_conductor_img IS NOT NULL', null, false)->get()->getResultArray();
            foreach ($rows as $row) {
                $valor = (string) ($row['firma_conductor_img'] ?? '');
                if ($valor !== '' && strlen($valor) > 255) {
                    $ruta = $service->guardarImagenBase64($valor, 'firmas');
                    if ($ruta !== null) {
                        $this->db->table('papeletas')->where('id', $row['id'])->update(['firma_conductor_img' => $ruta]);
                    }
                }
            }
            $this->forge->modifyColumn('papeletas', [
                'firma_conductor_img' => ['name' => 'firma_conductor_img', 'type' => 'VARCHAR', 'constraint' => 255, 'null' => true],
            ]);
        }

        if ($this->db->tableExists('ciudadanos') && $this->db->fieldExists('foto', 'ciudadanos')) {
            $this->forge->modifyColumn('ciudadanos', [
                'foto' => ['name' => 'foto', 'type' => 'VARCHAR', 'constraint' => 500, 'null' => true],
            ]);
        }
    }

    public function down()
    {
        if ($this->db->tableExists('reporte_intervencion_fotos')) {
            $this->forge->modifyColumn('reporte_intervencion_fotos', [
                'foto' => ['name' => 'foto', 'type' => 'MEDIUMTEXT', 'null' => false],
            ]);
        }
        if ($this->db->tableExists('papeletas') && $this->db->fieldExists('firma_conductor_img', 'papeletas')) {
            $this->forge->modifyColumn('papeletas', [
                'firma_conductor_img' => ['name' => 'firma_conductor_img', 'type' => 'MEDIUMTEXT', 'null' => true],
            ]);
        }
        if ($this->db->tableExists('ciudadanos') && $this->db->fieldExists('foto', 'ciudadanos')) {
            $this->forge->modifyColumn('ciudadanos', [
                'foto' => ['name' => 'foto', 'type' => 'MEDIUMTEXT', 'null' => true],
            ]);
        }
    }
}
