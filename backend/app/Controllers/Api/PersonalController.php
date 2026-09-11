<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonalController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        $rows = $db->table('trabajadores pe')
            ->select("
                pe.id_persona as id,
                pe.id_persona as persona_id,
                COALESCE(td.nombre, 'DNI') as tipo_documento,
                p.numero as numero_documento,
                c.nombres,
                c.apellido_paterno,
                c.apellido_materno,
                CONCAT(c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')) AS apellidos,
                '' as email,
                ca.nombre as cargo,
                pe.estado
            ", false)
            ->join('personas p', 'p.id = pe.id_persona', 'inner')
            ->join('ciudadanos c', 'c.id_persona = pe.id_persona', 'inner')
            ->join('tipo_documentos_identidad td', 'td.id = p.id_tipo_documento', 'left')
            ->join('desplazamiento_oficina dof', 'dof.id_trabajador = pe.id_persona AND (dof.fecha_termino IS NULL OR dof.fecha_termino > CURDATE())', 'left')
            ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
            ->orderBy('pe.id_persona', 'DESC')
            ->get()->getResultArray();
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
        $db->transStart();
        
        // 1. Tipo de documento
        $tipoDocRow = $db->table('tipo_documentos_identidad')->where('nombre', $input['tipo_documento'])->get()->getRowArray();
        $tipoDocId = $tipoDocRow ? $tipoDocRow['id'] : 1; // Default to DNI

        // 2. Cargo
        $cargoRow = $db->table('cargos')->where('nombre', $input['cargo'])->get()->getRowArray();
        if (!$cargoRow) {
            $db->table('cargos')->insert(['nombre' => $input['cargo'], 'estado' => 'ACTIVO']);
            $cargoId = $db->insertID();
        } else {
            $cargoId = $cargoRow['id'];
        }

        // Split apellidos
        $apellidos = explode(' ', $input['apellidos'], 2);
        $apePaterno = $apellidos[0];
        $apeMaterno = $apellidos[1] ?? '';

        if ($id === null) {
            // Validate duplicate
            if ($db->table('personas')->where('numero', $input['numero_documento'])->countAllResults() > 0) {
                return $this->failValidationErrors('Ya existe un trabajador con ese documento.');
            }

            // Insert Persona
            $db->table('personas')->insert([
                'id_tipo_documento' => $tipoDocId,
                'numero' => $input['numero_documento'],
                'estado' => 'ACTIVO'
            ]);
            $id = $db->insertID();

            // Insert Ciudadano
            $db->table('ciudadanos')->insert([
                'id_persona' => $id,
                'nombres' => $input['nombres'],
                'apellido_paterno' => $apePaterno,
                'apellido_materno' => $apeMaterno
            ]);

            // Insert Trabajador
            $db->table('trabajadores')->insert([
                'id_persona' => $id,
                'tipo' => 'INTERNO',
                'tiene_cuenta' => 1,
                'estado' => $input['estado']
            ]);

            // Insert Desplazamiento
            $db->table('desplazamiento_oficina')->insert([
                'id_trabajador' => $id,
                'id_cargo' => $cargoId,
                'documento' => 'DESIGNACION-' . date('Y'),
                'fecha_documento' => date('Y-m-d'),
                'tipo_funcion' => 'Titular'
            ]);

        } else {
            if (!$db->table('trabajadores')->where('id_persona', $id)->countAllResults()) {
                return $this->failNotFound('Trabajador no encontrado.');
            }
            
            // Update Persona
            $db->table('personas')->where('id', $id)->update([
                'id_tipo_documento' => $tipoDocId,
                'numero' => $input['numero_documento']
            ]);

            // Update Ciudadano
            $db->table('ciudadanos')->where('id_persona', $id)->update([
                'nombres' => $input['nombres'],
                'apellido_paterno' => $apePaterno,
                'apellido_materno' => $apeMaterno
            ]);

            // Update Trabajador
            $db->table('trabajadores')->where('id_persona', $id)->update([
                'estado' => $input['estado']
            ]);
            
            // Update Desplazamiento
            $existDof = $db->table('desplazamiento_oficina')->where('id_trabajador', $id)->get()->getRowArray();
            if ($existDof) {
                $db->table('desplazamiento_oficina')->where('id', $existDof['id'])->update([
                    'id_cargo' => $cargoId
                ]);
            } else {
                $db->table('desplazamiento_oficina')->insert([
                    'id_trabajador' => $id,
                    'id_cargo' => $cargoId,
                    'documento' => 'DESIGNACION-' . date('Y'),
                    'fecha_documento' => date('Y-m-d'),
                    'tipo_funcion' => 'Titular'
                ]);
            }
        }
        
        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('Error guardando trabajador');
        }

        if (func_num_args() === 0) {
            return $this->respondCreated(['data' => ['id' => $id] + $input]);
        }
        return $this->respond(['data' => ['id' => $id] + $input]);
    }
}
