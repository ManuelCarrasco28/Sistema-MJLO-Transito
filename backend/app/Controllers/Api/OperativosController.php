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

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        $row = $db->table('operativos')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN estado IN ('PROGRAMADO', 'EN_CURSO') THEN 1 ELSE 0 END) as activos,
                SUM(CASE WHEN estado = 'FINALIZADO' THEN 1 ELSE 0 END) as finalizados
            ", false)
            ->get()->getRowArray();

        $papeletas = (int) $db->table('papeletas')->where('id_operativo IS NOT NULL', null, false)->countAllResults();

        return $this->respond(['data' => [
            'total' => (int) ($row['total'] ?? 0),
            'activos' => (int) ($row['activos'] ?? 0),
            'finalizados' => (int) ($row['finalizados'] ?? 0),
            'papeletas' => $papeletas,
        ]]);
    }

    private function findOperativo(int $id): ?array
    {
        $db = \Config\Database::connect();
        $row = $db->table('operativos o')
            ->select("
                o.*,
                COALESCE(
                    NULLIF(TRIM(CONCAT(cu.nombres, ' ', cu.apellido_paterno, ' ', COALESCE(cu.apellido_materno, ''))), ''),
                    u.usuario,
                    ''
                ) AS usuario_registra,
                COUNT(DISTINCT oi.id_inspector) AS total_inspectores,
                COUNT(DISTINCT p.id) AS total_papeletas
            ", false)
            ->join('usuarios u', 'u.id = o.id_usuario_registra', 'left')
            ->join('ciudadanos cu', 'cu.id_persona = u.id_persona', 'left')
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
                COALESCE(v.placa, 'SIN PLACA') AS placa,
                COALESCE(per.numero, 'S/D') AS conductor_dni,
                COALESCE(
                    NULLIF(TRIM(CONCAT(cper.nombres, ' ', cper.apellido_paterno, ' ', COALESCE(cper.apellido_materno, ''))), ''),
                    p.nombre_autoridad,
                    'Conductor no identificado'
                ) AS intervenido,
                COALESCE(CONCAT(ci.nombres, ' ', ci.apellido_paterno, ' ', COALESCE(ci.apellido_materno, '')), 'Inspector Municipal') AS inspector,
                GROUP_CONCAT(DISTINCT ti.codigo ORDER BY ti.codigo SEPARATOR ', ') AS infracciones
            ", false)
            ->join('vehiculos v', 'v.id = p.id_vehiculo', 'left')
            ->join('personas per', 'per.id = p.id_persona_infractor', 'left')
            ->join('ciudadanos cper', 'cper.id_persona = per.id', 'left')
            ->join('ciudadanos ci', 'ci.id_persona = p.id_inspector', 'left')
            ->join('papeleta_detalles pd', 'pd.id_papeleta = p.id', 'left')
            ->join('tipos_infraccion ti', 'ti.id = pd.id_tipo_infraccion', 'left')
            ->where('p.id_operativo', $id)
            ->groupBy('p.id')
            ->orderBy('p.fecha_hora', 'DESC')
            ->get()
            ->getResultArray();

        $row['reporte'] = [
            'total_papeletas' => count($row['papeletas']),
            'monto_total' => array_reduce($row['papeletas'], static fn ($sum, $p) => $sum + (float) ($p['monto_total'] ?? 0), 0.0),
            'pendientes' => count(array_filter($row['papeletas'], static fn ($p) => in_array($p['estado'] ?? '', ['PENDIENTE', 'POR_PAGAR', 'PENDIENTE_PAGO'], true))),
            'pagadas' => count(array_filter($row['papeletas'], static fn ($p) => ($p['estado'] ?? '') === 'PAGADA')),
            'anuladas' => count(array_filter($row['papeletas'], static fn ($p) => ($p['estado'] ?? '') === 'ANULADA')),
        ];

        return $row;
    }
    public function activo($idInspector = null)
    {
        $idInspector = (int) $idInspector;
        if ($idInspector <= 0) {
            return $this->failValidationErrors('ID de inspector no válido.');
        }

        $db = \Config\Database::connect();
        
        $operativo = $db->table('operativos o')
            ->select('o.id, o.nombre, o.lugar, o.fecha, o.hora_inicio, o.hora_fin, o.estado, ca.nombre as cargo_inspector')
            ->join('operativo_inspectores oi', 'oi.id_operativo = o.id', 'inner')
            ->join('desplazamiento_oficina dof', 'dof.id_trabajador = oi.id_inspector AND (dof.fecha_termino IS NULL OR dof.fecha_termino > CURDATE())', 'left')
            ->join('cargos ca', 'ca.id = dof.id_cargo', 'left')
            ->where('oi.id_inspector', $idInspector)
            ->where('oi.estado', 'ASIGNADO')
            ->whereIn('o.estado', ['PROGRAMADO', 'EN_CURSO'])
            ->orderBy('o.fecha', 'DESC')
            ->orderBy('o.hora_inicio', 'DESC')
            ->limit(1)
            ->get()
            ->getRowArray();

        return $this->respond(['data' => $operativo ?: null]);
    }

    public function index()
    {
        $db = \Config\Database::connect();
        $builder = $db->table('operativos o')
            ->select("
                o.*,
                COALESCE(
                    NULLIF(TRIM(CONCAT(cu.nombres, ' ', cu.apellido_paterno, ' ', COALESCE(cu.apellido_materno, ''))), ''),
                    u.usuario,
                    ''
                ) AS usuario_registra,
                COUNT(DISTINCT oi.id_inspector) AS total_inspectores,
                COUNT(DISTINCT p.id) AS total_papeletas
            ", false)
            ->join('usuarios u', 'u.id = o.id_usuario_registra', 'left')
            ->join('ciudadanos cu', 'cu.id_persona = u.id_persona', 'left')
            ->join('operativo_inspectores oi', 'oi.id_operativo = o.id AND oi.estado = "ASIGNADO"', 'left')
            ->join('papeletas p', 'p.id_operativo = o.id', 'left');

        $buscar = trim((string)$this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                ->like('o.nombre', $buscar)
                ->orLike('o.lugar', $buscar)
                ->orLike('o.fecha', $buscar)
                ->groupEnd();
        }

        $estado = strtoupper(trim((string)$this->request->getGet('estado')));
        if ($estado !== '' && $estado !== 'TODOS') {
            $builder->where('o.estado', $estado);
        }

        $fechaFiltro = strtoupper(trim((string)$this->request->getGet('fechaFiltro')));
        if ($fechaFiltro === 'HOY') {
            $builder->where('o.fecha', date('Y-m-d'));
        } elseif ($fechaFiltro === 'SEMANA') {
            $builder->where('o.fecha >=', date('Y-m-d', strtotime('-7 days')));
        }

        $page = (int)$this->request->getGet('page');
        $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));

        $builder->groupBy('o.id');

        if ($page > 0) {
            $subquery = (clone $builder)->select('o.id AS sub_id', false);
            $total = $db->newQuery()->fromSubquery($subquery, 't_count')->countAllResults();

            $columnasOrdenables = [
                'nombre' => 'o.nombre',
                'lugar' => 'o.lugar',
                'fecha' => 'o.fecha',
                'estado' => 'o.estado',
            ];
            if (trim((string) $this->request->getGet('sortBy')) !== '') {
                \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'o.fecha');
            } else {
                $builder->orderBy('o.fecha', 'DESC')->orderBy('o.hora_inicio', 'DESC');
            }

            $rows = $builder
                ->limit($porPagina, ($page - 1) * $porPagina)
                ->get()
                ->getResultArray();

            return $this->respond([
                'data' => $rows,
                'meta' => [
                    'total' => $total,
                    'page' => $page,
                    'porPagina' => $porPagina,
                    'totalPaginas' => (int) ceil($total / $porPagina),
                ],
            ]);
        }

        $rows = $builder->orderBy('o.fecha', 'DESC')
            ->orderBy('o.hora_inicio', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $rows]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();

        $rules = [
            'nombre' => [
                'rules' => 'required',
                'errors' => ['required' => 'El nombre del operativo es obligatorio.']
            ],
            'lugar' => [
                'rules' => 'required',
                'errors' => ['required' => 'El lugar del operativo es obligatorio.']
            ],
            'fecha' => [
                'rules' => 'required|valid_date',
                'errors' => [
                    'required' => 'La fecha del operativo es obligatoria.',
                    'valid_date' => 'La fecha del operativo no es válida.'
                ]
            ],
            'hora_inicio' => [
                'rules' => 'required',
                'errors' => ['required' => 'La hora de inicio es obligatoria.']
            ],
            'estado' => [
                'rules' => 'permit_empty|in_list[PROGRAMADO,EN CURSO,FINALIZADO,CANCELADO]',
                'errors' => ['in_list' => 'Estado de operativo no válido.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $db->transStart();
        $estado = $input['estado'] ?? 'PROGRAMADO';

        $db->table('operativos')->insert([
            'nombre' => trim($input['nombre']),
            'lugar' => trim($input['lugar']),
            'fecha' => $input['fecha'],
            'hora_inicio' => $input['hora_inicio'],
            'hora_fin' => $estado === 'FINALIZADO' ? date('H:i:s') : null,
            'estado' => $estado,
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

        $current = $db->table('operativos')->where('id', $id)->get()->getRowArray();
        if (!$id || !$current) {
            return $this->failNotFound('Operativo no encontrado.');
        }

        $rules = [
            'nombre' => [
                'rules' => 'permit_empty',
            ],
            'lugar' => [
                'rules' => 'permit_empty',
            ],
            'fecha' => [
                'rules' => 'permit_empty|valid_date',
                'errors' => ['valid_date' => 'La fecha del operativo no es válida.']
            ],
            'hora_inicio' => [
                'rules' => 'permit_empty',
            ],
            'estado' => [
                'rules' => 'permit_empty|in_list[PROGRAMADO,EN CURSO,FINALIZADO,CANCELADO]',
                'errors' => ['in_list' => 'Estado de operativo no válido.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $data = [];
        foreach (['nombre', 'lugar', 'fecha', 'hora_inicio', 'estado', 'observacion'] as $field) {
            if (array_key_exists($field, $input)) {
                $data[$field] = $input[$field] === '' ? null : $input[$field];
            }
        }

        if (array_key_exists('estado', $data)) {
            if ($data['estado'] === 'FINALIZADO') {
                $data['hora_fin'] = ($current['estado'] === 'FINALIZADO' && !empty($current['hora_fin']))
                    ? $current['hora_fin']
                    : date('H:i:s');
            } else {
                $data['hora_fin'] = null;
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

        if ($db->table('papeletas')->where('id_operativo', $id)->countAllResults() > 0) {
            return $this->failValidationErrors('No se puede eliminar un operativo con papeletas vinculadas. Cambie su estado a CANCELADO o FINALIZADO.');
        }

        $db->table('operativos')->where('id', $id)->delete();
        return $this->respondDeleted(['status' => true, 'message' => 'Operativo eliminado correctamente.']);
    }
}
