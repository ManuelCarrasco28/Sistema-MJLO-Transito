<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonasController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();

        $rows = $db->table('personas')
            ->select("
                id,
                tipo_documento AS tipoDocumento,
                numero_documento AS numeroDocumento,
                nombres,
                apellido_paterno AS apellidoPaterno,
                COALESCE(apellido_materno, '') AS apellidoMaterno,
                COALESCE(direccion, '') AS direccion,
                COALESCE(telefono, '') AS telefono,
                COALESCE(celular, '') AS celular,
                COALESCE(email, '') AS email,
                COALESCE(numero_licencia_conducir, '') AS numeroLicencia,
                COALESCE(foto_url, '') AS fotoUrl,
                estado
            ", false)
            ->orderBy('id', 'DESC')
            ->get()
            ->getResultArray();

        $data = array_map(static fn (array $row): array => $row + [
            'categoriaLicencia' => '',
            'vigenciaLicencia' => '',
            'rol' => $row['numeroLicencia'] ? 'Conductor' : 'Administrado',
        ], $rows);

        return $this->respond(['data' => $data]);
    }
}
