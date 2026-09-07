<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonalController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $rows = \Config\Database::connect()->table('personal')
            ->select('id, tipo_documento, numero_documento, nombres, apellidos, cargo, estado')
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
        $record = [];
        foreach (['tipo_documento', 'numero_documento', 'nombres', 'apellidos', 'cargo', 'estado'] as $field) {
            if (!isset($input[$field]) || !is_string($input[$field]) || trim($input[$field]) === '') {
                return $this->failValidationErrors('Complete todos los campos del trabajador.');
            }
            $record[$field] = trim($input[$field]);
        }
        if (!in_array($record['estado'], ['ACTIVO', 'INACTIVO'], true)) {
            return $this->failValidationErrors('Estado no válido.');
        }
        $db = \Config\Database::connect();
        if ($id !== null && !$db->table('personal')->where('id', $id)->countAllResults()) {
            return $this->failNotFound('Trabajador no encontrado.');
        }
        $duplicate = $db->table('personal')->where('tipo_documento', $record['tipo_documento'])
            ->where('numero_documento', $record['numero_documento']);
        if ($id !== null) $duplicate->where('id !=', $id);
        if ($duplicate->countAllResults()) {
            return $this->failValidationErrors('Ya existe un trabajador con ese documento.');
        }
        if ($id === null) {
            $db->table('personal')->insert($record);
            return $this->respondCreated(['data' => ['id' => $db->insertID()] + $record]);
        }
        $db->table('personal')->where('id', $id)->update($record);
        return $this->respond(['data' => ['id' => $id] + $record]);
    }
}
