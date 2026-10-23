<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class OperativosController extends ResourceController
{
    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'operativos';
    protected array $tablasUuidPorMetodo = ['activo' => 'personas'];
    protected array $soloUuidEnEstricto = [];

    protected $format = 'json';

    private function parseInput(): array
    {
        return $this->request->getJSON(true) ?: $this->request->getPost() ?: [];
    }

    private function sincronizarEstados(): void
    {
        $nowLima = (new \DateTimeImmutable('now', new \DateTimeZone('America/Lima')))->format('Y-m-d H:i:s');
        $curDateLima = substr($nowLima, 0, 10);
        $curTimeLima = substr($nowLima, 11);

        $db = \Config\Database::connect();

        $db->query("
            UPDATE operativos
            SET estado = 'FINALIZADO'
            WHERE estado IN ('PROGRAMADO', 'EN_CURSO')
              AND (
                fecha < ?
                OR (fecha = ? AND hora_fin IS NOT NULL AND hora_fin <= ?)
              )
        ", [$curDateLima, $curDateLima, $curTimeLima]);

        $db->query("
            UPDATE operativos
            SET estado = 'EN_CURSO'
            WHERE estado = 'PROGRAMADO'
              AND fecha = ?
              AND hora_inicio <= ?
              AND (hora_fin IS NULL OR hora_fin > ?)
        ", [$curDateLima, $curTimeLima, $curTimeLima]);

        $db->query("
            UPDATE operativos
            SET estado = 'PROGRAMADO'
            WHERE estado = 'EN_CURSO'
              AND (
                fecha > ?
                OR (fecha = ? AND hora_inicio > ?)
              )
        ", [$curDateLima, $curDateLima, $curTimeLima]);
    }

    private function calcularEstadoAutomatico(string $fecha, string $horaInicio, ?string $horaFin, string $estadoActual = 'PROGRAMADO'): string
    {
        if ($estadoActual === 'CANCELADO') {
            return 'CANCELADO';
        }

        $nowLima = (new \DateTimeImmutable('now', new \DateTimeZone('America/Lima')))->format('Y-m-d H:i:s');
        $horaInicioNorm = strlen($horaInicio) === 5 ? $horaInicio . ':00' : $horaInicio;
        $inicio = $fecha . ' ' . $horaInicioNorm;

        if (!empty($horaFin)) {
            $horaFinNorm = strlen($horaFin) === 5 ? $horaFin . ':00' : $horaFin;
            $fin = $fecha . ' ' . $horaFinNorm;
        } else {
            $fin = $fecha . ' 23:59:59';
        }

        if ($nowLima < $inicio) {
            return 'PROGRAMADO';
        } elseif ($nowLima > $fin) {
            return 'FINALIZADO';
        } else {
            return 'EN_CURSO';
        }
    }

    public function estadisticas()
    {
        $this->sincronizarEstados();
        $db = \Config\Database::connect();
        $row = $db->table('operativos')
            ->select("
                COUNT(*) as total,
                SUM(CASE WHEN estado IN ('PROGRAMADO', 'EN_CURSO') THEN 1 ELSE 0 END) as activos,
                SUM(CASE WHEN estado = 'FINALIZADO' THEN 1 ELSE 0 END) as finalizados
            ", false)
            ->get()->getRowArray();

        $papeletas = (int) $db->table('papeletas')->where('id_operativo IS NOT NULL', null, false)->countAllResults();
        $reportes = (int) $db->table('reportes_intervencion')->where('id_operativo IS NOT NULL', null, false)->countAllResults();

        return $this->respond(['data' => [
            'total' => (int) ($row['total'] ?? 0),
            'activos' => (int) ($row['activos'] ?? 0),
            'finalizados' => (int) ($row['finalizados'] ?? 0),
            'papeletas' => $papeletas,
            'reportes' => $reportes,
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
                COUNT(DISTINCT p.id) AS total_papeletas,
                COUNT(DISTINCT rep.id) AS total_reportes
            ", false)
            ->join('usuarios u', 'u.id = o.id_usuario_registra', 'left')
            ->join('ciudadanos cu', 'cu.id_persona = u.id_persona', 'left')
            ->join('operativo_inspectores oi', 'oi.id_operativo = o.id AND oi.estado = "ASIGNADO"', 'left')
            ->join('papeletas p', 'p.id_operativo = o.id', 'left')
            ->join('reportes_intervencion rep', 'rep.id_operativo = o.id', 'left')
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

        $row['reportes'] = $db->table('reportes_intervencion r')
            ->select("
                r.id,
                r.fecha_hora,
                r.lugar,
                r.coordenadas,
                r.observaciones,
                r.estado,
                COALESCE(v.placa, r.placa, 'SIN PLACA') AS placa,
                COALESCE(NULLIF(v.marca, ''), '') AS vehiculo_marca,
                COALESCE(v.modelo, '') AS vehiculo_modelo,
                COALESCE(NULLIF(v.color, ''), '') AS vehiculo_color,
                COALESCE(cond_per.numero, r.conductor_informal_dni, 'S/D') AS conductor_dni,
                COALESCE(
                    NULLIF(TRIM(CONCAT(c_cond.nombres, ' ', c_cond.apellido_paterno, ' ', COALESCE(c_cond.apellido_materno, ''))), ''),
                    r.conductor_informal_nombres,
                    'No identificado'
                ) AS conductor_nombre,
                COALESCE(CONCAT(ci.nombres, ' ', ci.apellido_paterno, ' ', COALESCE(ci.apellido_materno, '')), 'Inspector Municipal') AS inspector,
                p.numero_papeleta
            ", false)
            ->join('vehiculos v', 'v.id = r.id_vehiculo', 'left')
            ->join('trabajadores t', 't.id_persona = r.id_inspector', 'left')
            ->join('ciudadanos ci', 'ci.id_persona = t.id_persona', 'left')
            ->join('personas cond_per', 'cond_per.id = r.id_conductor', 'left')
            ->join('ciudadanos c_cond', 'c_cond.id_persona = cond_per.id', 'left')
            ->join('papeletas p', 'p.id = r.id_papeleta', 'left')
            ->where('r.id_operativo', $id)
            ->orderBy('r.fecha_hora', 'DESC')
            ->get()
            ->getResultArray();

        $row['reporte']['total_reportes'] = count($row['reportes']);
        $row['reporte']['reportes_pendientes'] = count(array_filter($row['reportes'], static fn ($r) => ($r['estado'] ?? '') === 'PENDIENTE'));
        $row['reporte']['reportes_convertidos'] = count(array_filter($row['reportes'], static fn ($r) => in_array($r['estado'] ?? '', ['CONVERTIDO_PAPELETA', 'FINALIZADO'], true)));

        return $row;
    }
    public function activo($idInspector = null)
    {
        $idInspector = (int) $idInspector;
        if ($idInspector <= 0) {
            return $this->failValidationErrors('ID de inspector no válido.');
        }

        $this->sincronizarEstados();
        $db = \Config\Database::connect();

        $operativo = $db->table('operativos o')
            ->select('o.uuid AS uuid, o.id, o.nombre, o.lugar, o.fecha, o.hora_inicio, o.fecha AS fecha_fin, o.hora_fin, o.estado, ca.nombre as cargo_inspector')
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
        $this->sincronizarEstados();
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
                COUNT(DISTINCT p.id) AS total_papeletas,
                COUNT(DISTINCT rep.id) AS total_reportes
            ", false)
            ->join('usuarios u', 'u.id = o.id_usuario_registra', 'left')
            ->join('ciudadanos cu', 'cu.id_persona = u.id_persona', 'left')
            ->join('operativo_inspectores oi', 'oi.id_operativo = o.id AND oi.estado = "ASIGNADO"', 'left')
            ->join('papeletas p', 'p.id_operativo = o.id', 'left')
            ->join('reportes_intervencion rep', 'rep.id_operativo = o.id', 'left');

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

        $inspectorId = (int) ($this->request->getGet('inspector_id') ?: $this->request->getGet('id_inspector') ?: 0);
        if ($inspectorId > 0) {
            $builder->where("(
                EXISTS (SELECT 1 FROM operativo_inspectores oi_sub WHERE oi_sub.id_operativo = o.id AND oi_sub.id_inspector = {$inspectorId})
                OR EXISTS (SELECT 1 FROM papeletas p_sub WHERE p_sub.id_operativo = o.id AND p_sub.id_inspector = {$inspectorId})
                OR EXISTS (SELECT 1 FROM reportes_intervencion r_sub WHERE r_sub.id_operativo = o.id AND r_sub.id_inspector = {$inspectorId})
            )", null, false);
        }

        $page = (int)$this->request->getGet('page');
        $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));

        $builder->groupBy('o.id');

        if ($page > 0) {

            $conteo = $db->table('operativos o');
            if ($buscar !== '') {
                $conteo->groupStart()
                    ->like('o.nombre', $buscar)
                    ->orLike('o.lugar', $buscar)
                    ->orLike('o.fecha', $buscar)
                    ->groupEnd();
            }
            if ($estado !== '' && $estado !== 'TODOS') $conteo->where('o.estado', $estado);
            if ($fechaFiltro === 'HOY') $conteo->where('o.fecha', date('Y-m-d'));
            elseif ($fechaFiltro === 'SEMANA') $conteo->where('o.fecha >=', date('Y-m-d', strtotime('-7 days')));
            if ($inspectorId > 0) {
                $conteo->where("(
                    EXISTS (SELECT 1 FROM operativo_inspectores oi_sub WHERE oi_sub.id_operativo = o.id AND oi_sub.id_inspector = {$inspectorId})
                    OR EXISTS (SELECT 1 FROM papeletas p_sub WHERE p_sub.id_operativo = o.id AND p_sub.id_inspector = {$inspectorId})
                    OR EXISTS (SELECT 1 FROM reportes_intervencion r_sub WHERE r_sub.id_operativo = o.id AND r_sub.id_inspector = {$inspectorId})
                )", null, false);
            }
            $total = $conteo->countAllResults();

            $columnasOrdenables = [
                'nombre' => 'o.nombre',
                'lugar' => 'o.lugar',
                'fecha' => 'o.fecha',
                'estado' => 'o.estado',
            ];
            if (trim((string) $this->request->getGet('sortBy')) !== '') {
                \App\Libraries\QuerySort::aplicar($builder, $this->request, $columnasOrdenables, 'o.fecha');
            } else {
                $builder->orderBy('o.fecha', 'DESC')->orderBy('o.hora_inicio', 'DESC')->orderBy('o.id', 'DESC');
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
            ->orderBy('o.id', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond(['data' => $rows]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();

        if (isset($input['estado']) && $input['estado'] === 'EN CURSO') {
            $input['estado'] = 'EN_CURSO';
        }

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
                'rules' => 'permit_empty',
                'errors' => []
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            $errors = $this->validator->getErrors();
            if (isset($errors['estado'])) {
                $errors['estado'] = 'Estado no válido: "' . ($input['estado'] ?? 'NULL') . '".';
            }
            return $this->failValidationErrors($errors);
        }

        $db->transStart();
        $horaFin = !empty($input['hora_fin']) ? $input['hora_fin'] : null;
        $estado = $this->calcularEstadoAutomatico($input['fecha'], $input['hora_inicio'], $horaFin, 'PROGRAMADO');

        $db->table('operativos')->insert([
            'uuid' => \App\Libraries\Identificador::nuevo(),
            'nombre' => trim($input['nombre']),
            'lugar' => trim($input['lugar']),
            'fecha' => $input['fecha'],
            'hora_inicio' => $input['hora_inicio'],
            'hora_fin' => $horaFin,
            'estado' => $estado,
            'observacion' => trim($input['observacion'] ?? ''),
            'id_usuario_registra' => ((int) (\App\Libraries\Acceso::usuario()['id'] ?? 0)) ?: null,
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

        if (isset($input['estado']) && $input['estado'] === 'EN CURSO') {
            $input['estado'] = 'EN_CURSO';
        }

        $current = $db->table('operativos')->where('id', $id)->get()->getRowArray();
        if (!$id || !$current) {
            return $this->failNotFound('Operativo no encontrado.');
        }

        $rules = [
            'fecha' => [
                'rules' => 'permit_empty|valid_date',
                'errors' => ['valid_date' => 'La fecha del operativo no es válida.']
            ],
            'estado' => [
                'rules' => 'permit_empty',
                'errors' => []
            ]
        ];
        foreach (['nombre', 'lugar', 'hora_inicio'] as $campoObligatorio) {
            if (array_key_exists($campoObligatorio, $input)) {
                $rules[$campoObligatorio] = ['rules' => 'required'];
                $input[$campoObligatorio] = trim((string)$input[$campoObligatorio]);
            }
        }

        if (!$this->validateData($input, $rules)) {
            $errors = $this->validator->getErrors();
            if (isset($errors['estado'])) {
                $errors['estado'] = 'Estado no válido: "' . ($input['estado'] ?? 'NULL') . '".';
            }
            return $this->failValidationErrors($errors);
        }

        $data = [];
        foreach (['nombre', 'lugar', 'fecha', 'hora_inicio', 'hora_fin', 'observacion'] as $field) {
            if (array_key_exists($field, $input)) {
                $data[$field] = $input[$field] === '' ? null : $input[$field];
            }
        }

        $fecha = $data['fecha'] ?? $current['fecha'];
        $horaInicio = $data['hora_inicio'] ?? $current['hora_inicio'];
        $horaFin = array_key_exists('hora_fin', $data) ? $data['hora_fin'] : $current['hora_fin'];

        if (($current['estado'] ?? '') === 'CANCELADO') {
            $data['estado'] = 'CANCELADO';
        } else {
            $data['estado'] = $this->calcularEstadoAutomatico($fecha, $horaInicio, $horaFin, $current['estado']);
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
        $this->sincronizarEstados();
        $row = $this->findOperativo((int) $id);
        if (!$row) return $this->failNotFound('Operativo no encontrado.');
        return $this->respond(['data' => $row]);
    }

    public function cancelar($id = null)
    {
        $db = \Config\Database::connect();
        $id = (int) $id;
        $current = $db->table('operativos')->where('id', $id)->get()->getRowArray();
        if (!$id || !$current) {
            return $this->failNotFound('Operativo no encontrado.');
        }

        if ($current['estado'] === 'CANCELADO') {
            return $this->failValidationErrors('Este operativo ya fue cancelado.');
        }

        if ($current['estado'] === 'FINALIZADO') {
            return $this->failValidationErrors('No se puede cancelar un operativo que ya ha finalizado.');
        }

        $input = $this->parseInput();
        $motivo = trim((string)($input['motivo_cancelacion'] ?? ''));

        if ($motivo === '') {
            return $this->failValidationErrors('Debes ingresar el motivo u observaciones de la cancelación.');
        }

        $nowLima = new \DateTimeImmutable('now', new \DateTimeZone('America/Lima'));
        $horaCancelacion = $nowLima->format('H:i:s');
        $fechaHoraCancelacion = $nowLima->format('Y-m-d H:i:s');

        $db->table('operativos')->where('id', $id)->update([
            'estado' => 'CANCELADO',
            'hora_cancelacion' => $horaCancelacion,
            'fecha_hora_cancelacion' => $fechaHoraCancelacion,
            'motivo_cancelacion' => $motivo,
        ]);

        if (class_exists('\\App\\Services\\AuditoriaService')) {
            \App\Services\AuditoriaService::registrar(
                'OPERATIVOS',
                'CANCELAR',
                "Se canceló el operativo '{$current['nombre']}' a las {$horaCancelacion}. Motivo: {$motivo}",
                [
                    'id_operativo' => $id,
                    'nombre' => $current['nombre'],
                    'hora_inicio' => $current['hora_inicio'],
                    'hora_fin' => $current['hora_fin'],
                    'hora_cancelacion' => $horaCancelacion,
                    'motivo_cancelacion' => $motivo,
                ]
            );
        }

        return $this->respond([
            'status' => true,
            'message' => 'Operativo cancelado correctamente.',
            'data' => $this->findOperativo($id)
        ]);
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
        \App\Services\AuditoriaService::registrar('OPERATIVOS', 'ELIMINAR', 'Operativo eliminado (id ' . (int)$id . ')', ['id' => (int)$id]);
        return $this->respondDeleted(['status' => true, 'message' => 'Operativo eliminado correctamente.']);
    }

    }
