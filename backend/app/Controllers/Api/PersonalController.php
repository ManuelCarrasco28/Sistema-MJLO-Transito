<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PersonalController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $rows = \Config\Database::connect()->table('trabajadores t')
            ->select("
                t.id_persona AS id,
                t.id_persona AS id_persona,
                COALESCE(tdi.codigo, 'DNI') AS tipo_documento,
                p.numero AS numero_documento,
                COALESCE(c.nombres, '') AS nombres,
                COALESCE(c.apellido_paterno, '') AS apellido_paterno,
                COALESCE(c.apellido_materno, '') AS apellido_materno,
                CONCAT(COALESCE(c.apellido_paterno, ''), ' ', COALESCE(c.apellido_materno, '')) AS apellidos,
                p.email,
                COALESCE(ca.nombre, 'Sin cargo') AS cargo,
                t.estado
            ", false)
            ->join('personas p', 'p.id = t.id_persona', 'inner')
            ->join('tipo_documentos_identidad tdi', 'tdi.id = p.id_tipo_documento', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->join('desplazamiento_oficina d', 'd.id_trabajador = t.id_persona AND (d.fecha_termino IS NULL OR d.fecha_termino > CURDATE())', 'left')
            ->join('cargos ca', 'ca.id = d.id_cargo', 'left')
            ->orderBy('t.id_persona', 'DESC')
            ->get()
            ->getResultArray();

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
        foreach (['numero_documento', 'nombres', 'apellidos', 'cargo', 'estado'] as $field) {
            if (!isset($input[$field]) || !is_string($input[$field]) || trim($input[$field]) === '') {
                return $this->failValidationErrors('Complete todos los campos del trabajador.');
            }
        }

        $estado = strtoupper(trim($input['estado']));
        if (!in_array($estado, ['ACTIVO', 'INACTIVO'], true)) {
            return $this->failValidationErrors('Estado no válido.');
        }

        $db = \Config\Database::connect();
        $numero = substr(trim($input['numero_documento']), 0, 11);
        $apellidos = preg_split('/\s+/', trim($input['apellidos']), 2);

        $db->transException(true)->transBegin();
        try {
            $persona = $id !== null
                ? $db->table('personas')->where('id', $id)->get()->getRowArray()
                : $db->table('personas')->where('numero', $numero)->get()->getRowArray();

            if ($id !== null && !$persona) {
                throw new \DomainException('Trabajador no encontrado.');
            }

            $personaData = [
                'id_tipo_documento' => $this->tipoDocumentoId($db, $input['tipo_documento'] ?? 'DNI'),
                'numero' => $numero,
                'estado' => 'ACTIVO',
            ];

            if ($persona) {
                $personaId = (int)$persona['id'];
                $db->table('personas')->where('id', $personaId)->update($personaData);
            } else {
                $db->table('personas')->insert($personaData);
                $personaId = (int)$db->insertID();
            }

            $ciudadanoData = [
                'id_persona' => $personaId,
                'nombres' => substr(trim($input['nombres']), 0, 50),
                'apellido_paterno' => substr($apellidos[0] ?? 'Municipal', 0, 50),
                'apellido_materno' => isset($apellidos[1]) ? substr($apellidos[1], 0, 50) : null,
            ];
            if ($db->table('ciudadanos')->where('id_persona', $personaId)->countAllResults() > 0) {
                $db->table('ciudadanos')->where('id_persona', $personaId)->update($ciudadanoData);
            } else {
                $db->table('ciudadanos')->insert($ciudadanoData);
            }

            if ($db->table('trabajadores')->where('id_persona', $personaId)->countAllResults() > 0) {
                $db->table('trabajadores')->where('id_persona', $personaId)->update([
                    'tipo' => 'INTERNO',
                    'estado' => $estado,
                ]);
            } else {
                $db->table('trabajadores')->insert([
                    'id_persona' => $personaId,
                    'tipo' => 'INTERNO',
                    'tiene_cuenta' => 0,
                    'estado' => $estado,
                ]);
            }

            $cargoNombre = substr(trim($input['cargo']), 0, 50);
            $cargo = $db->table('cargos')->where('nombre', $cargoNombre)->get()->getRowArray();
            if (!$cargo) {
                $db->table('cargos')->insert(['nombre' => $cargoNombre, 'estado' => 'ACTIVO']);
                $cargoId = (int)$db->insertID();
            } else {
                $cargoId = (int)$cargo['id'];
            }

            $db->table('desplazamiento_oficina')
                ->where('id_trabajador', $personaId)
                ->where('fecha_termino IS NULL', null, false)
                ->update(['fecha_termino' => date('Y-m-d')]);
            $db->table('desplazamiento_oficina')->insert([
                'id_trabajador' => $personaId,
                'id_cargo' => $cargoId,
                'documento' => 'REGISTRO SISTEMA TRANSITO',
                'fecha_documento' => date('Y-m-d'),
                'tipo_funcion' => 'Operador',
            ]);

            $db->transCommit();
            $payload = ['id' => $personaId] + $input + ['id_persona' => $personaId];
            return $id === null ? $this->respondCreated(['data' => $payload]) : $this->respond(['data' => $payload]);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            $db->transRollback();
            return $this->failServerError('No se pudo guardar el trabajador: ' . $e->getMessage());
        }
    }

    private function tipoDocumentoId($db, string $codigo): int
    {
        $codigo = strtoupper(trim($codigo ?: 'DNI'));
        $row = $db->table('tipo_documentos_identidad')
            ->select('id')
            ->where('codigo', $codigo)
            ->where('estado', 'ACTIVO')
            ->get()
            ->getRowArray();

        return (int)($row['id'] ?? 1);
    }
}
