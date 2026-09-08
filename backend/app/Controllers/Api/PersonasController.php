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
                COALESCE(foto_img, '') AS fotoImg,
                estado
            ", false)
            ->orderBy('id', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $rows]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getPost();

        if (empty($input['numeroDocumento']) || empty($input['nombres']) || empty($input['apellidoPaterno'])) {
            return $this->failValidationErrors('Número de documento, nombres y apellido paterno son requeridos.');
        }

        $record = [
            'tipo_documento'           => $input['tipoDocumento'] ?? 'DNI',
            'numero_documento'         => trim($input['numeroDocumento']),
            'nombres'                  => trim($input['nombres']),
            'apellido_paterno'         => trim($input['apellidoPaterno']),
            'apellido_materno'         => trim($input['apellidoMaterno'] ?? ''),
            'direccion'                => trim($input['direccion'] ?? ''),
            'telefono'                 => trim($input['telefono'] ?? ''),
            'celular'                  => trim($input['celular'] ?? ''),
            'email'                    => trim($input['email'] ?? ''),
            'numero_licencia_conducir' => trim($input['numeroLicencia'] ?? ''),
            'foto_img'                 => trim($input['fotoImg'] ?? $input['fotoUrl'] ?? ''),
            'estado'                   => strtoupper($input['estado'] ?? 'ACTIVO'),
        ];

        $db->table('personas')->insert($record);
        $insertId = $db->insertID();

        $newPersona = [
            'id'                => (int)$insertId,
            'tipoDocumento'     => $record['tipo_documento'],
            'numeroDocumento'   => $record['numero_documento'],
            'nombres'           => $record['nombres'],
            'apellidoPaterno'   => $record['apellido_paterno'],
            'apellidoMaterno'   => $record['apellido_materno'],
            'direccion'         => $record['direccion'],
            'telefono'          => $record['telefono'],
            'celular'           => $record['celular'],
            'email'             => $record['email'],
            'numeroLicencia'    => $record['numero_licencia_conducir'],
            'fotoImg'           => $record['foto_img'],
            'estado'            => $record['estado'],
        ];

        return $this->respondCreated(['status' => true, 'message' => 'Persona registrada con éxito', 'data' => $newPersona]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true) ?: $this->request->getRawInput();

        if (!$id) {
            return $this->failNotFound('ID de persona no especificado.');
        }

        $record = [];
        if (isset($input['tipoDocumento'])) $record['tipo_documento'] = $input['tipoDocumento'];
        if (isset($input['numeroDocumento'])) $record['numero_documento'] = trim($input['numeroDocumento']);
        if (isset($input['nombres'])) $record['nombres'] = trim($input['nombres']);
        if (isset($input['apellidoPaterno'])) $record['apellido_paterno'] = trim($input['apellidoPaterno']);
        if (isset($input['apellidoMaterno'])) $record['apellido_materno'] = trim($input['apellidoMaterno']);
        if (isset($input['direccion'])) $record['direccion'] = trim($input['direccion']);
        if (isset($input['telefono'])) $record['telefono'] = trim($input['telefono']);
        if (isset($input['celular'])) $record['celular'] = trim($input['celular']);
        if (isset($input['email'])) $record['email'] = trim($input['email']);
        if (isset($input['numeroLicencia'])) $record['numero_licencia_conducir'] = trim($input['numeroLicencia']);
        if (array_key_exists('fotoImg', $input) || array_key_exists('fotoUrl', $input)) $record['foto_img'] = trim($input['fotoImg'] ?? $input['fotoUrl'] ?? '');
        if (isset($input['estado'])) $record['estado'] = strtoupper($input['estado']);

        if (!empty($record)) {
            $db->table('personas')->where('id', $id)->update($record);
        }

        return $this->respond(['status' => true, 'message' => 'Persona actualizada con éxito']);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();

        if (!$id) {
            return $this->failNotFound('ID de persona no especificado.');
        }

        $db->table('personas')->where('id', $id)->delete();

        return $this->respondDeleted(['status' => true, 'message' => 'Persona eliminada del registro']);
    }
}
