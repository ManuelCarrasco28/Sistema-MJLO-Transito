<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class OperativosController extends ResourceController
{
    protected $format = 'json';

    private function parseInput(): array
    {
        return $this->request->getJSON(true) ?: $this->request->getPost() ?: [];
    }

    private function findOperativo(int $id): ?array
    {
        $db = \Config\Database::connect();
        $row = $db->table('operativos o')
            ->select("
                o.*,
                COALESCE(u.nombre_usuario, '') AS usuario_registra,
                COUNT(DISTINCT oi.id_inspector) AS total_inspectores,
                COUNT(DISTINCT p.id) AS total_papeletas
            ", false)
            ->join('usuarios u', 'u.id = o.id_usuario_registra', 'left')
            ->join('operativo_inspectores oi', 'oi.id_operativo = o.id AND oi.estado = "ASIGNADO"', 'left')
            ->join('papeletas p', 'p.id_operativo = o.id', 'left')
            ->where('o.id', $id)
            ->groupBy('o.id')
            ->get()
            ->getRowArray();

        if (!$row) return null;

        $row['inspectores'] = $db->table('operativo_inspectores oi')
            ->select("
                oi.id,
                oi.id_inspector,
                oi.estado,
                c.nombres,
                c.apellido_paterno,
                c.apellido_materno,
                ca.nombre AS cargo
            ", false)
            ->join('trabajadores t', 't.id_persona = oi.id_inspector', 'inner')
            ->join('ciudadanos c', 'c.id_persona = t.id_persona', 'inner')
            ->join('desplazamiento_oficina dof', 'dof.id_trabajador = t.id_persona AND (dof.fecha_termino IS NULL OR dof.fecha_termino > CURDATE())', 'left')
            ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
            ->where('oi.id_operativo', $id)
            ->orderBy('c.apellido_paterno', 'ASC')
            ->get()
            ->getResultArray();

        $row['papeletas'] = $db->table('papeletas p')
            ->select("
                p.id,
                p.numero_papeleta,
                p.fecha_hora,
                p.lugar,
                p.monto_total,
                p.estado,
                CONCAT(ci.nombres, ' ', ci.apellido_paterno, ' ', COALESCE(ci.apellido_materno, '')) AS inspector
            ", false)
            ->join('ciudadanos ci', 'ci.id_persona = p.id_inspector', 'left')
            ->where('p.id_operativo', $id)
            ->orderBy('p.fecha_hora', 'DESC')
            ->get()
            ->getResultArray();

        return $row;
    }

    public function index()
    {
        $db = \Config\Database::connect();
        $rows = $db->table('operativos o')
            ->select("
                o.*,
                COALESCE(u.nombre_usuario, '') AS usuario_registra,
                COUNT(DISTINCT oi.id_inspector) AS total_inspectores,
                COUNT(DISTINCT p.id) AS total_papeletas
            ", false)
            ->join('usuarios u', 'u.id = o.id_usuario_registra', 'left')
            ->join('operativo_inspectores oi', 'oi.id_operativo = o.id AND oi.estado = "ASIGNADO"', 'left')
            ->join('papeletas p', 'p.id_operativo = o.id', 'left')
            ->groupBy('o.id')
            ->orderBy('o.fecha', 'DESC')
            ->orderBy('o.hora_inicio', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $rows]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();

        foreach (['nombre', 'lugar', 'fecha', 'hora_inicio'] as $field) {
            if (empty($input[$field])) {
                return $this->failValidationErrors('Complete nombre, lugar, fecha y hora de inicio.');
            }
        }

        $db->transStart();
        $db->table('operativos')->insert([
            'nombre' => trim($input['nombre']),
            'lugar' => trim($input['lugar']),
            'fecha' => $input['fecha'],
            'hora_inicio' => $input['hora_inicio'],
            'hora_fin' => $input['hora_fin'] ?: null,
            'estado' => $input['estado'] ?? 'PROGRAMADO',
            'observacion' => trim($input['observacion'] ?? ''),
            'id_usuario_registra' => $input['id_usuario_registra'] ?? null,
        ]);
        $id = (int) $db->insertID();

        foreach (($input['inspectores'] ?? []) as $idInspector) {
            if ((int) $idInspector > 0) {
                $db->table('operativo_inspectores')->ignore(true)->insert([
                    'id_operativo' => $id,
                    'id_inspector' => (int) $idInspector,
                    'estado' => 'ASIGNADO',
                ]);
            }
        }
        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('No se pudo registrar el operativo.');
        }

        return $this->respondCreated(['data' => $this->findOperativo($id)]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();
        $id = (int) $id;

        if (!$id || !$db->table('operativos')->where('id', $id)->countAllResults()) {
            return $this->failNotFound('Operativo no encontrado.');
        }

        $data = [];
        foreach (['nombre', 'lugar', 'fecha', 'hora_inicio', 'hora_fin', 'estado', 'observacion'] as $field) {
            if (array_key_exists($field, $input)) {
                $data[$field] = $input[$field] === '' ? null : $input[$field];
            }
        }

        $db->transStart();
        if ($data) $db->table('operativos')->where('id', $id)->update($data);

        if (array_key_exists('inspectores', $input)) {
            $db->table('operativo_inspectores')->where('id_operativo', $id)->delete();
            foreach (($input['inspectores'] ?? []) as $idInspector) {
                if ((int) $idInspector > 0) {
                    $db->table('operativo_inspectores')->insert([
                        'id_operativo' => $id,
                        'id_inspector' => (int) $idInspector,
                        'estado' => 'ASIGNADO',
                    ]);
                }
            }
        }
        $db->transComplete();

        if ($db->transStatus() === false) {
            return $this->failServerError('No se pudo actualizar el operativo.');
        }

        return $this->respond(['data' => $this->findOperativo($id)]);
    }

    public function show($id = null)
    {
        $row = $this->findOperativo((int) $id);
        if (!$row) return $this->failNotFound('Operativo no encontrado.');
        return $this->respond(['data' => $row]);
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        if (!$id || !$db->table('operativos')->where('id', $id)->countAllResults()) {
            return $this->failNotFound('Operativo no encontrado.');
        }

        $db->table('operativos')->where('id', $id)->delete();
        return $this->respondDeleted(['status' => true, 'message' => 'Operativo eliminado correctamente.']);
    }
}
