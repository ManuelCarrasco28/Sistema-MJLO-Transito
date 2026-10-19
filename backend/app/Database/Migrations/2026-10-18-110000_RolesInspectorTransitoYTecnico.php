<?php

namespace App\Database\Migrations;

use CodeIgniter\Database\Migration;

class RolesInspectorTransitoYTecnico extends Migration
{
    public function up()
    {
        $roles = $this->db->table('roles');

        // El rol "Trabajador" (inspector de campo) se divide en dos; sus usuarios pasan a Inspector de Tránsito.
        $tieneTransito = $this->db->table('roles')->where('nombre', 'Inspector de Tránsito')->countAllResults() > 0;
        $trabajador = $this->db->table('roles')->where('nombre', 'Trabajador')->get()->getRowArray();
        if ($trabajador && !$tieneTransito) {
            $this->db->table('roles')->where('id', $trabajador['id'])->update(['nombre' => 'Inspector de Tránsito']);
        } elseif (!$tieneTransito) {
            $roles->insert(['nombre' => 'Inspector de Tránsito', 'estado' => 'ACTIVO']);
        }

        if ($this->db->table('roles')->where('nombre', 'Inspector Técnico')->countAllResults() === 0) {
            $this->db->table('roles')->insert(['nombre' => 'Inspector Técnico', 'estado' => 'ACTIVO']);
        }
    }

    public function down()
    {
        $transito = $this->db->table('roles')->where('nombre', 'Inspector de Tránsito')->get()->getRowArray();
        $tecnico = $this->db->table('roles')->where('nombre', 'Inspector Técnico')->get()->getRowArray();
        if ($transito && $this->db->table('roles')->where('nombre', 'Trabajador')->countAllResults() === 0) {
            $this->db->table('roles')->where('id', $transito['id'])->update(['nombre' => 'Trabajador']);
        }
        if ($tecnico) {
            $trabajador = $this->db->table('roles')->where('nombre', 'Trabajador')->get()->getRowArray();
            if ($trabajador) {
                $this->db->table('usuarios')->where('id_rol', $tecnico['id'])->update(['id_rol' => $trabajador['id']]);
            }
            if ($this->db->table('usuarios')->where('id_rol', $tecnico['id'])->countAllResults() === 0) {
                $this->db->table('roles')->where('id', $tecnico['id'])->delete();
            }
        }
    }
}
