<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonalController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $rows = \Config\Database::connect()->table('personal pe')
            ->select("
                pe.id,
                pe.persona_id,
                p.tipo_documento,
                p.numero_documento,
                p.nombres,
                p.apellido_paterno,
                p.apellido_materno,
                CONCAT(p.apellido_paterno, ' ', COALESCE(p.apellido_materno, '')) AS apellidos,
                p.email,
                pe.cargo,
                pe.estado
            ", false)
            ->join('personas p', 'p.id = pe.persona_id', 'inner')
            ->orderBy('id', 'DESC')->get()->getResultArray();
        return $this->respond(['data' => $rows]);
    }

    public function create()
    {
        return $this->saveRecord();
    }

    public function update($id = null)
    {
        return $this->saveRecord($id);
    }

    private function saveRecord($id = null)
    {
        $input = $this->request->getJSON(true) ?: [];
        foreach (['tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'cargo', 'estado'] as $field) {
            if (!isset($input[$field]) || !is_string($input[$field]) || trim($input[$field]) === '') {
                return $this->failValidationErrors('Complete todos los campos del trabajador.');
            }
        }

        $estado = trim($input['estado']);
        if (!in_array($estado, ['ACTIVO', 'INACTIVO'], true)) {
            return $this->failValidationErrors('Estado no válido.');
        }

        $db = \Config\Database::connect();
        $personalActual = null;
        if ($id !== null) {
            $personalActual = $db->table('personal')->where('id', $id)->get()->getRowArray();
        }
        if ($id !== null && !$personalActual) {
            return $this->failNotFound('Trabajador no encontrado.');
        }

        $tipoDocumento = trim($input['tipo_documento']);
        $numeroDocumento = trim($input['numero_documento']);
        $personaQuery = $db->table('personas')
            ->where('tipo_documento', $tipoDocumento)
            ->where('numero_documento', $numeroDocumento);
        $persona = $personaQuery->get()->getRowArray();

        $duplicate = $db->table('personal pe')
            ->join('personas p', 'p.id = pe.persona_id', 'inner')
            ->where('p.tipo_documento', $tipoDocumento)
            ->where('p.numero_documento', $numeroDocumento);
        if ($id !== null) $duplicate->where('pe.id !=', $id);
        if ($duplicate->countAllResults()) {
            return $this->failValidationErrors('Ya existe un trabajador con ese documento.');
        }

        $apellidos = preg_split('/\s+/', trim($input['apellidos']), 2);
        $personaData = [
            'tipo_documento' => $tipoDocumento,
            'numero_documento' => $numeroDocumento,
            'nombres' => trim($input['nombres']),
            'apellido_paterno' => $apellidos[0] ?? 'Municipal',
            'apellido_materno' => $apellidos[1] ?? null,
            'estado' => 'ACTIVO',
        ];

        if ($persona) {
            $personaId = (int)$persona['id'];
            $db->table('personas')->where('id', $personaId)->update($personaData);
        } else {
            $db->table('personas')->insert($personaData);
            $personaId = (int)$db->insertID();
        }

        $record = [
            'persona_id' => $personaId,
            'cargo' => trim($input['cargo']),
            'estado' => $estado,
        ];

        if ($id === null) {
            $db->table('personal')->insert($record);
            return $this->respondCreated(['data' => ['id' => $db->insertID()] + $input]);
        }
        $db->table('personal')->where('id', $id)->update($record);
        return $this->respond(['data' => ['id' => $id] + $input + ['persona_id' => $personaId]]);
    }
}
