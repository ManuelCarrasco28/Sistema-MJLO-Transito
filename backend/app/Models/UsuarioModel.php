<?php

namespace App\Models;

use CodeIgniter\Model;

class UsuarioModel extends Model
{
    protected $table = 'usuarios';
    protected $primaryKey = 'id';
    protected $allowedFields = [
        'id_persona',
        'id_rol',
        'usuario',
        'clave',
        'fecha_logueo',
        'estado',
        'preferencias',
        'session_version',
    ];

    protected $validationRules = [
        'id_persona' => 'permit_empty|is_natural_no_zero',
        'id_rol'     => 'permit_empty|is_natural_no_zero',
        'usuario'    => 'permit_empty|alpha_dash|min_length[3]|max_length[50]',
        'estado'     => 'permit_empty|in_list[ACTIVO,INACTIVO]',
    ];
}
