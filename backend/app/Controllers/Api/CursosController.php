<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class CursosController extends ResourceController
{
    use \App\Libraries\ResuelveUuid;

    protected string $tablaUuid = 'cursos_seguridad_vial';
    protected array $tablasUuidPorMetodo = ['marcarEntregaCarnet' => 'inscripciones_curso', 'retirarInscripcion' => 'inscripciones_curso'];
    protected array $soloUuidEnEstricto = [];

    protected $format = 'json';
    private ?int $cursoDetalleId = null;

    public function show($id = null)
    {
        $db = \Config\Database::connect();
        $this->cursoDetalleId = (int) \App\Libraries\Identificador::resolverId($db, 'cursos_seguridad_vial', $id);
        if ($this->cursoDetalleId < 1) return $this->failNotFound('Curso no encontrado.');
        return $this->index();
    }

    private function sincronizarEstadosPorFecha($db): void
    {
        \App\Libraries\ReglasCurso::sincronizarEstados($db);
    }

    public function index()
    {
        $db = \Config\Database::connect();
        $this->sincronizarEstadosPorFecha($db);

        try {
            $builder = $db->table('cursos_seguridad_vial c')
                ->select("c.uuid AS uuid, 
                    c.id,
                    c.codigo,
                    c.nombre as titulo,
                    c.descripcion,
                    c.instructor,
                    c.resolucion,
                    c.id_instructor AS idInstructor,
                    c.carnet_expedicion AS carnetExpedicion,
                    c.carnet_vencimiento AS carnetVencimiento,
                    pi.numero AS instructorDni,
                    c.fecha_inicio as fecha,
                    c.fecha_inicio,
                    c.fecha_fin,
                    c.fecha_inscripcion_inicio as fechaInscripcionInicio,
                    c.fecha_inscripcion_fin as fechaInscripcionFin,
                    c.hora_inicio as horaInicio,
                    c.hora_fin as horaFin,
                    c.lugar,
                    c.cupos as cuposTotales,
                    c.estado,
                    c.costo_inscripcion as costo
                ");

            $builder->join('personas pi', 'pi.id = c.id_instructor', 'left');
            if ($this->cursoDetalleId !== null) $builder->where('c.id', $this->cursoDetalleId);
            $resumen = $this->cursoDetalleId === null && $this->request->getGet('resumen') === '1';
            $buscar = trim((string)$this->request->getGet('buscar'));
            if ($buscar !== '') {
                $builder->groupStart()
                    ->like('c.codigo', $buscar)
                    ->orLike('c.nombre', $buscar)
                    ->orLike('c.instructor', $buscar)
                    ->orLike('c.resolucion', $buscar)
                    ->orLike('c.lugar', $buscar)
                    ->groupEnd();
            }

            $estado = strtoupper(trim((string)$this->request->getGet('estado')));
            if ($estado !== '' && $estado !== 'TODOS') {
                if ($estado === 'ACTIVO') $builder->whereIn('c.estado', ['ACTIVO', 'PROGRAMADO', 'ABIERTO']);
                else $builder->where('c.estado', $estado);
            }

            $tipo = strtoupper(trim((string) $this->request->getGet('tipo')));
            if ($tipo !== '' && !in_array($tipo, ['TODOS', 'SEGURIDAD_VIAL'], true)) $builder->where('c.id', -1);

            $page = (int)$this->request->getGet('page');
            $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));

            $total = 0;
            if ($page > 0) {
                $total = (clone $builder)->countAllResults(false);
                $rows = \App\Libraries\QuerySort::aplicar($builder, $this->request, [
                    'codigo' => 'c.codigo', 'titulo' => 'c.nombre', 'fecha' => 'c.fecha_inicio',
                    'estado' => 'c.estado', 'capacidad' => 'c.cupos', 'instructor' => 'c.instructor',
                ], 'c.fecha_inicio')
                    ->orderBy('c.id', 'DESC')
                    ->limit($porPagina, ($page - 1) * $porPagina)
                    ->get()
                    ->getResultArray();
            } else {
                $rows = $builder->orderBy('c.fecha_inicio', 'DESC')->orderBy('c.id', 'DESC')
                    ->get()
                    ->getResultArray();
            }

            $cursoIds = array_column($rows, 'id');
            $participantesPorCurso = [];
            $conteoPorCurso = [];

            if (!empty($cursoIds) && $resumen) {
                foreach ($db->table('inscripciones_curso')->select('id_curso, COUNT(*) AS total', false)
                    ->whereNotIn('estado', ['ANULADO', 'CANCELADO'])
                    ->whereIn('id_curso', $cursoIds)->groupBy('id_curso')->get()->getResultArray() as $conteo) {
                    $conteoPorCurso[(int) $conteo['id_curso']] = (int) $conteo['total'];
                }
            }
            if (!empty($cursoIds) && !$resumen) {
                $inscripciones = $db->table('inscripciones_curso ic')
                    ->select('ic.id AS idInscripcion, ic.uuid, ic.id_curso, ic.fecha_inscripcion AS fechaInscripcion, c.nombres, c.apellido_paterno, c.apellido_materno, ic.estado, ic.estado_pago, ic.asistio, p.numero AS dni, c.numero_licencia AS licencia, c.foto AS fotoUrl, ic.carnet_entregado AS carnetEntregado, ic.carnet_fecha_entrega AS carnetFechaEntrega, ic.carnet_entregado_por AS carnetEntregadoPor')
                    ->join('personas p', 'p.id = ic.id_persona', 'left')
                    ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                    ->whereIn('ic.id_curso', $cursoIds)
                    ->whereNotIn('ic.estado', ['ANULADO', 'CANCELADO'])
                    ->get()
                    ->getResultArray();

                $fileStorage = new \App\Services\FileStorageService();
                foreach ($inscripciones as $ic) {
                    $cid = (int)$ic['id_curso'];
                    unset($ic['id_curso']);

                    $ic['fotoUrl'] = $fileStorage->urlPublica($ic['fotoUrl'] ?? null) ?? '';
                    $ic['carnetEntregado'] = (bool) ($ic['carnetEntregado'] ?? false);
                    $ic['asistio'] = (int) ($ic['asistio'] ?? 0);
                    $participantesPorCurso[$cid][] = $ic;
                    if (!in_array($ic['estado'], ['ANULADO','CANCELADO'], true)) $conteoPorCurso[$cid] = ($conteoPorCurso[$cid] ?? 0) + 1;
                }
            }

            $data = [];
            foreach ($rows as $row) {
                $cid = (int)$row['id'];
                $row['id'] = $cid;
                $row['costo'] = (float)$row['costo'];
                $row['cuposTotales'] = (int)($row['cuposTotales'] ?? 50);
                $row['fechaFin'] = $row['fecha_fin'];
                $row['horaInicio'] = $row['horaInicio'] ? substr($row['horaInicio'], 0, 5) : '';
                $row['horaFin'] = $row['horaFin'] ? substr($row['horaFin'], 0, 5) : '';
                $row['horario'] = $row['horaInicio'] && $row['horaFin'] ? $row['horaInicio'] . ' - ' . $row['horaFin'] : 'Sin horario registrado';
                $row['cuposInscritos'] = $conteoPorCurso[$cid] ?? 0;
                $row['temario'] = [];
                if (!$resumen) $row['participantes'] = $participantesPorCurso[$cid] ?? [];
                $row['tipo'] = 'SEGURIDAD_VIAL';

                $data[] = $row;
            }

            if ($this->cursoDetalleId !== null) {
                return $data ? $this->respond(['data' => $data[0]]) : $this->failNotFound('Curso no encontrado.');
            }
            if ($page > 0) {
                $estadisticas = $db->table('cursos_seguridad_vial')->select("COUNT(*) AS totalCursos, SUM(estado IN ('ACTIVO','PROGRAMADO','ABIERTO')) AS cursosActivos, SUM(estado = 'FINALIZADO') AS cursosFinalizados", false)->get()->getRowArray();
                $estadisticas['totalInscritos'] = $db->table('inscripciones_curso')->whereNotIn('estado', ['ANULADO','CANCELADO'])->countAllResults();
                return $this->respond([
                    'data' => $data,
                    'estadisticas' => $estadisticas,
                    'meta' => [
                        'total' => $total,
                        'page' => $page,
                        'porPagina' => $porPagina,
                        'totalPaginas' => (int) ceil($total / $porPagina),
                    ],
                ]);
            }

            return $this->respond(['data' => $data]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando cursos.');
        }
    }

    private function parseInput(): array
    {
        try {
            $input = $this->request->getJSON(true);
        } catch (\Throwable $e) {
            $input = null;
        }
        if (!is_array($input)) {
            $input = json_decode($this->request->getBody() ?: '', true) ?? $this->request->getPost();
        }
        return is_array($input) ? $input : [];
    }

    private function tieneCursoVigente($db, ?int $idPersona = null, ?string $select = null, ?int $idCurso = null)
    {
        $query = $db->table('inscripciones_curso ic');
        if ($select !== null) {
            $query->select($select, false);
        }
        $query->join('cursos_seguridad_vial c', 'c.id = ic.id_curso')
            ->where(\App\Libraries\ReglasCurso::condicionAprobado(), null, false)
            ->where('c.fecha_inicio >=', date('Y-m-d', strtotime('-1 year')));

        if ($idPersona !== null) {
            $query->where('ic.id_persona', $idPersona);
        }

        if ($idCurso !== null) {
            $cursoBase = $db->table('cursos_seguridad_vial')->select('nombre')->where('id', $idCurso)->get()->getRowArray();
            if (!empty($cursoBase['nombre'])) {
                $query->where('c.nombre', $cursoBase['nombre']);
            } else {
                $query->where('c.id', $idCurso);
            }
        }

        return $query;
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();
        if (isset($input['estado']) && is_string($input['estado'])) {
            $input['estado'] = strtoupper(trim($input['estado']));
            if ($input['estado'] === '') unset($input['estado']);
        }

        $rules = [
            'titulo' => [
                'rules' => 'required',
                'errors' => ['required' => 'El título del curso es obligatorio.']
            ],
            'fecha' => [
                'rules' => 'required|valid_date',
                'errors' => [
                    'required' => 'La fecha de inicio es obligatoria.',
                    'valid_date' => 'La fecha de inicio no es válida.'
                ]
            ],
            'cuposTotales' => [
                'rules' => 'permit_empty|is_natural_no_zero',
                'errors' => ['is_natural_no_zero' => 'La cantidad de cupos debe ser un número mayor a 0.']
            ],
            'costo' => [
                'rules' => 'permit_empty|numeric|greater_than_equal_to[0]',
                'errors' => ['numeric' => 'El costo debe ser un valor numérico.']
            ],
            'estado' => ['rules' => 'permit_empty|in_list[' . \App\Libraries\ReglasCurso::ESTADOS . ']'],
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $codigo = trim($input['codigo'] ?? '');
        if ($error = \App\Libraries\ReglasCurso::validarCalendario($input)) return $this->failValidationErrors($error);
        $titulo = trim($input['titulo'] ?? '');
        $descripcion = trim($input['descripcion'] ?? '');
        $resolucion = mb_strtoupper(trim((string)($input['resolucion'] ?? '')), 'UTF-8');
        if (mb_strlen($resolucion) > 150) return $this->failValidationErrors('La resolución no puede superar los 150 caracteres.');
        try {
            [$instructor, $idInstructor] = $this->resolverInstructor($db, $input);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        }
        $fecha = trim($input['fecha'] ?? date('Y-m-d'));
        try {
            [$carnetExpedicion, $carnetVencimiento] = $this->resolverFechasCarnet(null, $fecha, $input['fechaFin'] ?? $fecha);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        }
        $lugar = trim($input['lugar'] ?? 'Auditorio Municipal JLO');
        $cuposTotales = (int)($input['cuposTotales'] ?? 50);
        $costo = (float)($input['costo'] ?? 0);
        $estado = trim($input['estado'] ?? 'PROGRAMADO');

        $data = [
            'codigo' => $codigo,
            'nombre' => $titulo ?: 'Curso de Capacitación Vial',
            'descripcion' => $descripcion,
            'resolucion' => $resolucion !== '' ? $resolucion : null,
            'instructor' => $instructor,
            'id_instructor' => $idInstructor,
            'carnet_expedicion' => $carnetExpedicion,
            'carnet_vencimiento' => $carnetVencimiento,
            'fecha_inicio' => $fecha,
            'fecha_fin' => $input['fechaFin'],
            'fecha_inscripcion_inicio' => $input['fechaInscripcionInicio'],
            'fecha_inscripcion_fin' => $input['fechaInscripcionFin'],
            'hora_inicio' => $input['horaInicio'],
            'hora_fin' => $input['horaFin'],
            'lugar' => $lugar,
            'costo_inscripcion' => $costo,
            'cupos' => $cuposTotales,
            'estado' => $estado,
        ];

        $candado = false;
        try {
            $candado = (int)$db->query("SELECT GET_LOCK('mjlo_cursos_codigo', 10) AS adquirido")->getRow('adquirido') === 1;
            if (!$candado) return $this->failValidationErrors('No se pudo asignar el código. Intente nuevamente.');
            if ($codigo === '') {
                $anio = (int)date('Y');
                $prefijo = 'CSV-' . $anio . '-';
                $ultimo = (int)$db->query("SELECT MAX(CAST(SUBSTRING(codigo, ?) AS UNSIGNED)) AS ultimo FROM cursos_seguridad_vial WHERE codigo REGEXP ?", [strlen($prefijo) + 1, '^' . $prefijo . '[0-9]+$'])->getRow('ultimo');
                $codigo = \App\Libraries\ReglasCurso::siguienteCodigo($ultimo, $anio);
            }
            if ($db->table('cursos_seguridad_vial')->where('codigo', $codigo)->countAllResults() > 0) {
                return $this->failValidationErrors('Ya existe un curso con ese código.');
            }
            $data['codigo'] = $codigo;
            $data['uuid'] = \App\Libraries\Identificador::nuevo();
            if (!$db->table('cursos_seguridad_vial')->insert($data)) throw new \RuntimeException('No se pudo guardar el curso.');
            $newId = $db->insertID();

            $response = [
                'id' => $newId,
                'codigo' => $codigo,
                'titulo' => $data['nombre'],
                'descripcion' => $data['descripcion'],
                'instructor' => $instructor,
                'idInstructor' => $idInstructor,
                'resolucion' => $data['resolucion'],
                'carnetExpedicion' => $carnetExpedicion,
                'carnetVencimiento' => $carnetVencimiento,
                'fecha' => $data['fecha_inicio'],
                'fechaFin' => $data['fecha_fin'],
                'fechaInscripcionInicio' => $data['fecha_inscripcion_inicio'],
                'fechaInscripcionFin' => $data['fecha_inscripcion_fin'],
                'horaInicio' => $data['hora_inicio'], 'horaFin' => $data['hora_fin'],
                'horario' => $data['hora_inicio'] . ' - ' . $data['hora_fin'],
                'lugar' => $data['lugar'],
                'cuposTotales' => $cuposTotales,
                'cuposInscritos' => 0,
                'estado' => $estado,
                'costo' => $costo,
                'temario' => [],
                'participantes' => [],
            ];
            return $this->respondCreated(['status' => 201, 'data' => $response]);
        } catch (\Exception $e) {
            return $this->failServerError('Error creando el curso.');
        } finally {
            if ($candado) $db->query("SELECT RELEASE_LOCK('mjlo_cursos_codigo')");
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();
        if (isset($input['estado']) && is_string($input['estado'])) {
            $input['estado'] = strtoupper(trim($input['estado']));
            if ($input['estado'] === '') unset($input['estado']);
        }

        $rules = [
            'titulo' => [
                'rules' => 'permit_empty',
            ],
            'fecha' => [
                'rules' => 'permit_empty|valid_date',
                'errors' => ['valid_date' => 'La fecha de inicio no es válida.']
            ],
            'cuposTotales' => [
                'rules' => 'permit_empty|is_natural_no_zero',
                'errors' => ['is_natural_no_zero' => 'La cantidad de cupos debe ser un número mayor a 0.']
            ],
            'costo' => [
                'rules' => 'permit_empty|numeric|greater_than_equal_to[0]',
                'errors' => ['numeric' => 'El costo debe ser un valor numérico.']
            ],
            'estado' => ['rules' => 'permit_empty|in_list[' . \App\Libraries\ReglasCurso::ESTADOS . ']'],
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $data = [];
        if (array_key_exists('codigo', $input)) {
            $codigoNuevo = strtoupper(trim((string)$input['codigo']));
            if ($codigoNuevo === '' || strlen($codigoNuevo) > 50 || !preg_match('/^[A-Z0-9-]+$/', $codigoNuevo)) {
                return $this->failValidationErrors('El código solo puede llevar letras, números y guiones (máximo 50 caracteres).');
            }
            if ($db->table('cursos_seguridad_vial')->where('codigo', $codigoNuevo)->where('id !=', (int)$id)->countAllResults() > 0) {
                return $this->failValidationErrors('Ya existe un curso con ese código.');
            }
            $data['codigo'] = $codigoNuevo;
        }
        if (isset($input['titulo'])) {
            $data['nombre'] = trim($input['titulo']);
        }
        if (isset($input['descripcion'])) {
            $data['descripcion'] = trim($input['descripcion']);
        }
        if (array_key_exists('resolucion', $input)) {
            $resolucion = mb_strtoupper(trim((string)$input['resolucion']), 'UTF-8');
            if (mb_strlen($resolucion) > 150) return $this->failValidationErrors('La resolución no puede superar los 150 caracteres.');
            $data['resolucion'] = $resolucion !== '' ? $resolucion : null;
        }
        if (array_key_exists('idInstructor', $input) || array_key_exists('instructor', $input)) {
            try {
                [$data['instructor'], $data['id_instructor']] = $this->resolverInstructor($db, $input);
            } catch (\DomainException $e) {
                return $this->failValidationErrors($e->getMessage());
            }
        }
        if (isset($input['fecha'])) {
            $data['fecha_inicio'] = trim($input['fecha']);
        }
        if (isset($input['lugar'])) {
            $data['lugar'] = trim($input['lugar']);
        }
        if (isset($input['cuposTotales'])) {
            $data['cupos'] = (int)$input['cuposTotales'];
        }
        if (isset($input['costo'])) {
            $data['costo_inscripcion'] = (float)$input['costo'];
        }
        if (isset($input['estado'])) {
            $data['estado'] = trim($input['estado']);
        }
        $camposCalendario = ['fecha'=>'fecha_inicio', 'fechaFin'=>'fecha_fin', 'fechaInscripcionInicio'=>'fecha_inscripcion_inicio', 'fechaInscripcionFin'=>'fecha_inscripcion_fin', 'horaInicio'=>'hora_inicio', 'horaFin'=>'hora_fin'];

        $db->transBegin();
        try {
            $cursoActual = $db->query('SELECT * FROM cursos_seguridad_vial WHERE id = ? FOR UPDATE', [$id])->getRowArray();
            if (!$cursoActual) { $db->transRollback(); return $this->failNotFound('Curso no encontrado.'); }
            if (array_intersect(array_keys($input), array_keys($camposCalendario))) {
                $calendario = [];
                foreach ($camposCalendario as $clave=>$columna) {
                    $calendario[$clave] = $input[$clave] ?? $cursoActual[$columna] ?? '';
                    if (in_array($clave, ['horaInicio','horaFin'], true) && is_string($calendario[$clave])) $calendario[$clave] = substr($calendario[$clave], 0, 5);
                }
                if ($error = \App\Libraries\ReglasCurso::validarCalendario($calendario)) {
                    $db->transRollback(); return $this->failValidationErrors($error);
                }
                foreach ($camposCalendario as $clave=>$columna) $data[$columna] = $calendario[$clave];
            }
// El carnet vence un año después de finalizar el curso.
            if (isset($data['fecha_inicio']) || isset($data['fecha_fin'])) {
                $inicioFinal = $data['fecha_inicio'] ?? $cursoActual['fecha_inicio'];
                $finFinal = $data['fecha_fin'] ?? $cursoActual['fecha_fin'] ?? $inicioFinal;
                [$data['carnet_expedicion'], $data['carnet_vencimiento']] = $this->resolverFechasCarnet(null, (string)$inicioFinal, (string)$finFinal);
            }
            if (isset($data['cupos'])) {
                $inscritos = $db->table('inscripciones_curso')->where('id_curso', $id)->whereNotIn('estado', ['ANULADO','CANCELADO'])->countAllResults();
                if ($data['cupos'] < $inscritos) { $db->transRollback(); return $this->failValidationErrors('La capacidad no puede ser menor que los participantes inscritos.'); }
            }

            $movidos = 0;
            $yaEstaban = 0;
            $cancelando = ($data['estado'] ?? null) === 'CANCELADO' && ($cursoActual['estado'] ?? '') !== 'CANCELADO';
            if ($cancelando) {
                $inscritosAMover = $db->table('inscripciones_curso')->where('id_curso', $id)->whereIn('estado', ['INSCRITO', 'CONFIRMADO'])->countAllResults();
                if ($inscritosAMover > 0) {
                    $destinoId = (int)($input['cursoDestinoId'] ?? 0);
                    if ($destinoId < 1) {
                        $db->transRollback();
                        return $this->respond(['status' => 409, 'requiereDestino' => true, 'inscritos' => $inscritosAMover, 'message' => "Este curso tiene {$inscritosAMover} participante(s) inscrito(s). Indique a qué curso pasarán."], 409);
                    }
                    [$movidos, $yaEstaban] = $this->moverInscritos($db, (int)$id, $destinoId);
                }
            }
            if (!empty($data)) {
                if (!$db->table('cursos_seguridad_vial')->where('id', $id)->update($data)) throw new \RuntimeException('No se pudo guardar.');
            }
            if ($db->transStatus() === false) throw new \RuntimeException('No se pudo guardar.');
            if ($cancelando && ($movidos + $yaEstaban) > 0) {
                \App\Services\AuditoriaService::registrar('CURSOS', 'CANCELAR', "Se canceló el curso {$cursoActual['codigo']}: {$movidos} inscrito(s) pasaron al curso #" . (int)($input['cursoDestinoId'] ?? 0), ['id' => (int)$id, 'destino' => (int)($input['cursoDestinoId'] ?? 0), 'movidos' => $movidos, 'yaInscritos' => $yaEstaban]);
            }
            $db->transCommit();
            $this->sincronizarEstadosPorFecha($db);
            $mensaje = 'Curso actualizado correctamente';
            if ($cancelando && ($movidos + $yaEstaban) > 0) {
                $mensaje = "Curso cancelado. {$movidos} participante(s) pasaron al nuevo curso" . ($yaEstaban ? " y {$yaEstaban} ya estaba(n) inscrito(s) en él." : '.');
            }
            return $this->respond(['status' => 200, 'message' => $mensaje, 'movidos' => $movidos]);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->failServerError('Error actualizando el curso.');
        }
    }

/**
     * Fecha de expedición de los carnets del curso y su vencimiento (un año después).
     * Los carnets se expiden al terminar el curso (o en la fecha indicada, que no puede ser anterior al inicio).
     *
     * @return array{0:string,1:string} [expedición, vencimiento] en formato Y-m-d
     */
    private function resolverFechasCarnet($expedicion, string $inicio, string $fin): array
    {
        $texto = trim((string)($expedicion ?? ''));
        if ($texto === '') $texto = $fin !== '' ? $fin : $inicio;
        $fecha = \DateTimeImmutable::createFromFormat('!Y-m-d', $texto);
        if (!$fecha || $fecha->format('Y-m-d') !== $texto) throw new \DomainException('La fecha de expedición del carnet no es válida.');
        if ($inicio !== '' && $texto < $inicio) throw new \DomainException('La expedición del carnet no puede ser anterior al inicio del curso.');
        return [$texto, $fecha->modify('+1 year')->format('Y-m-d')];
    }

/**
     * Instructor del curso: una persona del padrón (idInstructor) o, en cursos antiguos, solo un nombre.
     * Devuelve [nombre, idPersona|null]; el nombre sale siempre del padrón cuando hay persona.
     *
     * @return array{0:string,1:?int}
     */
    private function resolverInstructor($db, array $input): array
    {
        $idPersona = (int)($input['idInstructor'] ?? 0);
        if ($idPersona > 0) {
            $persona = $db->table('ciudadanos')->select('nombres, apellido_paterno, apellido_materno')->where('id_persona', $idPersona)->get()->getRowArray();
            if (!$persona) throw new \DomainException('El instructor elegido no está registrado en Personas.');
            $nombre = trim(implode(' ', array_filter([$persona['nombres'], $persona['apellido_paterno'], $persona['apellido_materno']])));
            return [$nombre, $idPersona];
        }
        $nombre = mb_strtoupper(trim((string)($input['instructor'] ?? '')), 'UTF-8');
        if (mb_strlen($nombre) > 150) throw new \DomainException('El nombre del instructor no puede superar los 150 caracteres.');
        return [$nombre, null];
    }

/**
     * Pasa los participantes inscritos de un curso cancelado a otro curso. Sus pagos los acompañan porque
     * están ligados a la inscripción. Quien ya estuviera inscrito en el curso destino queda cancelado en el origen.
     *
     * @return array{0:int,1:int} [movidos, que ya estaban en el destino]
     */
    private function moverInscritos($db, int $origenId, int $destinoId): array
    {
        if ($destinoId === $origenId) throw new \DomainException('El curso destino debe ser distinto del curso que se cancela.');
        $destino = $db->query('SELECT id, cupos, estado FROM cursos_seguridad_vial WHERE id = ? FOR UPDATE', [$destinoId])->getRowArray();
        if (!$destino) throw new \DomainException('El curso destino no existe.');
        if (!\App\Libraries\ReglasCurso::admiteInscripcion($destino['estado'])) throw new \DomainException('El curso destino no admite inscripciones.');

        $inscritos = $db->table('inscripciones_curso')->where('id_curso', $origenId)->whereIn('estado', ['INSCRITO', 'CONFIRMADO'])->get()->getResultArray();

        $enDestino = array_column(
            $db->table('inscripciones_curso')->select('id_persona')->where('id_curso', $destinoId)->whereNotIn('estado', ['ANULADO', 'CANCELADO'])->get()->getResultArray(),
            'id_persona'
        );
        $enDestino = array_map('intval', $enDestino);
        $aMover = array_filter($inscritos, static fn($i) => !in_array((int)$i['id_persona'], $enDestino, true));
        $repetidos = array_filter($inscritos, static fn($i) => in_array((int)$i['id_persona'], $enDestino, true));

        $ocupados = $db->table('inscripciones_curso')->where('id_curso', $destinoId)->whereNotIn('estado', ['ANULADO', 'CANCELADO'])->countAllResults();
        if (count($aMover) > (int)$destino['cupos'] - $ocupados) {
            throw new \DomainException('El curso destino no tiene cupos suficientes para ' . count($aMover) . ' participante(s).');
        }

        $costoDestino = $db->table('cursos_seguridad_vial')->select('costo_inscripcion')->where('id', $destinoId)->get()->getRowArray()['costo_inscripcion'] ?? null;
        foreach ($aMover as $i) {
            $idFinal = (int)$i['id'];

            $retirada = $db->table('inscripciones_curso')->where('id_curso', $destinoId)->where('id_persona', (int)$i['id_persona'])->whereIn('estado', ['ANULADO', 'CANCELADO'])->get()->getRowArray();
            if ($retirada) {
                $db->table('inscripciones_curso')->where('id', (int)$retirada['id'])->update([
                    'estado' => $i['estado'], 'estado_pago' => $i['estado_pago'], 'asistio' => 0, 'fecha_inscripcion' => $i['fecha_inscripcion'],
                ]);
                $db->table('pagos_transito')->where('id_inscripcion', (int)$i['id'])->update(['id_inscripcion' => (int)$retirada['id']]);
                $db->table('inscripciones_curso')->where('id', (int)$i['id'])->update(['estado' => 'CANCELADO', 'estado_pago' => 'ANULADO']);
                $idFinal = (int)$retirada['id'];
            } else {
                $db->table('inscripciones_curso')->where('id', (int)$i['id'])->update(['id_curso' => $destinoId]);
            }

            if ($costoDestino !== null) {
                $db->table('pagos_transito')->where('id_inscripcion', $idFinal)->where('estado', 'PENDIENTE')->update(['total' => $costoDestino]);
            }
        }
        foreach ($repetidos as $i) {
            $db->table('inscripciones_curso')->where('id', (int)$i['id'])->update(['estado' => 'CANCELADO']);
        }

        return [count($aMover), count($repetidos)];
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            if (!$id || !$db->table('cursos_seguridad_vial')->where('id', $id)->countAllResults()) {
                return $this->failNotFound('Curso no encontrado.');
            }
            \App\Services\EliminacionSegura::eliminar($db, 'cursos_seguridad_vial', (int)$id);
            return $this->respondDeleted(['status' => 200, 'message' => 'Curso eliminado correctamente']);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage() . ' Retire o regularice las inscripciones antes de eliminar el curso.');
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('Error eliminando el curso. No se ha borrado ningún dato.');
        }
    }

    public function personasConCursoVigente()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $this->tieneCursoVigente($db, null, 'DISTINCT ic.id_persona')
                ->get()
                ->getResultArray();

            $ids = array_map(static fn($r) => (int)$r['id_persona'], $rows);
            return $this->respond(['data' => $ids]);
        } catch (\Throwable $t) {
            return $this->respond(['data' => []]);
        }
    }

    public function inscribirParticipante($idCurso)
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();

        $rules = [
            'dni' => [
                'rules' => 'required',
                'errors' => ['required' => 'El DNI es obligatorio para la inscripción.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $dni = trim($input['dni'] ?? '');
        if (!$dni) {
            return $this->failValidationErrors('El DNI es obligatorio para la inscripción.');
        }

        $persona = $db->table('personas p')
            ->select('p.id as id_persona, c.nombres, c.apellido_paterno, c.apellido_materno, c.numero_licencia, c.foto')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->where('p.numero', $dni)
            ->get()
            ->getRowArray();

        if (!$persona) {
            return $this->failNotFound('No se encontró una persona con el DNI proporcionado en el sistema. Regístrala primero en el módulo Personas.');
        }

        $idPersona = $persona['id_persona'];

// Todo bajo transacción y con la fila del curso bloqueada: dos inscripciones simultáneas no superan el cupo

        $db->transBegin();
        try {
            $curso = $db->query('SELECT cupos, costo_inscripcion, estado, fecha_inscripcion_inicio, fecha_inscripcion_fin FROM cursos_seguridad_vial WHERE id = ? FOR UPDATE', [$idCurso])->getRowArray();

            if (!$curso) {
                $db->transRollback();
                return $this->failNotFound('No se encontró el curso indicado.');
            }

            if (!\App\Libraries\ReglasCurso::admiteInscripcion($curso['estado'])) {
                $db->transRollback();
                return $this->failValidationErrors('Este curso no admite nuevas inscripciones.');
            }
            if (!\App\Libraries\ReglasCurso::inscripcionAbierta($curso, \App\Libraries\ReglasCurso::hoy())) {
                $db->transRollback();
                return $this->failValidationErrors('Las inscripciones de este curso no están abiertas en esta fecha.');
            }

            $inscripcionAnterior = $db->table('inscripciones_curso')
                ->where('id_curso', $idCurso)
                ->where('id_persona', $idPersona)
                ->get()->getRowArray();
            if ($inscripcionAnterior && !in_array($inscripcionAnterior['estado'], ['ANULADO', 'CANCELADO'], true)) {
                $db->transRollback();
                return $this->failValidationErrors('Esta persona ya se encuentra inscrita en este curso.');
            }

            if ($this->tieneCursoVigente($db, $idPersona, null, $idCurso)->countAllResults() > 0) {
                $db->transRollback();
                return $this->failValidationErrors('Esta persona ya cuenta con un certificado vigente para este curso (menos de 1 año); no necesita volver a inscribirse.');
            }

            $cuposTotales = (int)($curso['cupos'] ?? 0);
            $inscritosActuales = (int)$db->table('inscripciones_curso')->where('id_curso', $idCurso)->whereNotIn('estado', ['ANULADO','CANCELADO'])->countAllResults();
            if ($cuposTotales > 0 && $inscritosActuales >= $cuposTotales) {
                $db->transRollback();
                return $this->failValidationErrors("El curso ya alcanzó su cupo máximo ({$cuposTotales} participantes).");
            }

            $costo = (float)($curso['costo_inscripcion'] ?? 0);
            $estadoPago = $costo > 0 ? 'PENDIENTE' : 'PAGADO';

            $datosInscripcion = [
                'id_curso' => $idCurso,
                'id_persona' => $idPersona,
                'fecha_inscripcion' => date('Y-m-d H:i:s'),
                'estado_pago' => $estadoPago,
                'asistio' => 0,
                'estado' => 'INSCRITO',
            ];
            if ($inscripcionAnterior) {
                $db->query('SELECT id FROM inscripciones_curso WHERE id = ? FOR UPDATE', [$inscripcionAnterior['id']]);
                if ($db->table('pagos_transito')->where('id_inscripcion', $inscripcionAnterior['id'])->where('estado !=', 'ANULADO')->countAllResults()
                    || $db->table('certificados_curso')->where('id_inscripcion', $inscripcionAnterior['id'])->countAllResults()
                    || !empty($inscripcionAnterior['carnet_entregado'])) {
                    $db->transRollback();
                    return $this->failValidationErrors('La inscripción anterior tiene pagos o un carnet asociado. Revisa ese registro antes de volver a inscribir.');
                }
                $idInscripcion = (int)$inscripcionAnterior['id'];
                $uuidInscripcion = $inscripcionAnterior['uuid'];
                $insertado = $db->table('inscripciones_curso')->where('id', $idInscripcion)->update($datosInscripcion);
            } else {
                $uuidInscripcion = \App\Libraries\Identificador::nuevo();
                $insertado = $db->table('inscripciones_curso')->insert(['uuid' => $uuidInscripcion] + $datosInscripcion);
                $idInscripcion = (int)$db->insertID();
            }
            if ($insertado === false || $db->affectedRows() < 1) {
                throw new \RuntimeException('No se pudo guardar la inscripción.');
            }
            $db->transCommit();

            $participanteData = [
                'idInscripcion' => $idInscripcion,
                'uuid' => $uuidInscripcion,
                'nombres' => $persona['nombres'],
                'apellido_paterno' => $persona['apellido_paterno'],
                'apellido_materno' => $persona['apellido_materno'],
                'dni' => $dni,
                'licencia' => $persona['numero_licencia'],
                'fotoUrl' => (new \App\Services\FileStorageService())->urlPublica($persona['foto'] ?? null) ?? '',
                'estado' => 'INSCRITO',
                'estado_pago' => $estadoPago,
                'fechaInscripcion' => date('Y-m-d'),
                'asistio' => 0
            ];

            return $this->respondCreated(['status' => 201, 'message' => 'Participante inscrito exitosamente.', 'data' => $participanteData]);
        } catch (\Exception $e) {
            $db->transRollback();
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('Error al inscribir al participante.');
        }
    }

    public function retirarInscripcion($identificador)
    {
        $db = \Config\Database::connect();
        $id = \App\Libraries\Identificador::resolverId($db, 'inscripciones_curso', $identificador);
        $registro = $id ? $db->table('inscripciones_curso')->where('id', $id)->get()->getRowArray() : null;
        if (!$registro) return $this->failNotFound('No se encontró la inscripción.');
        $db->transBegin();
        try {
            $curso = $db->query('SELECT id, estado, fecha_fin FROM cursos_seguridad_vial WHERE id = ? FOR UPDATE', [$registro['id_curso']])->getRowArray();
            if (!$curso) { $db->transRollback(); return $this->failNotFound('No se encontró el curso.'); }
            if ($curso['estado'] === 'FINALIZADO' || (!empty($curso['fecha_fin']) && substr($curso['fecha_fin'], 0, 10) < \App\Libraries\ReglasCurso::hoy())) {
                $db->transRollback();
                return $this->failValidationErrors('No se puede retirar participantes de un curso culminado.');
            }
            $registro = $db->query('SELECT * FROM inscripciones_curso WHERE id = ? FOR UPDATE', [$id])->getRowArray();
            if (!$registro) { $db->transRollback(); return $this->failNotFound('No se encontró la inscripción.'); }
            if (!in_array($registro['estado'], ['ANULADO', 'CANCELADO'], true)) {
                $pagos = $db->query('SELECT id, estado FROM pagos_transito WHERE id_inscripcion = ? FOR UPDATE', [$id])->getResultArray();
                $costoCurso = (float)($db->table('cursos_seguridad_vial')->select('costo_inscripcion')->where('id', $registro['id_curso'])->get()->getRowArray()['costo_inscripcion'] ?? 0);
                $pagoProtegido = array_filter($pagos, static fn($pago) => !in_array($pago['estado'], ['PENDIENTE', 'ANULADO'], true));
                if ($pagoProtegido || ($registro['estado_pago'] === 'PAGADO' && $costoCurso > 0)) {
                    $db->transRollback();
                    return $this->failValidationErrors('Esta inscripción ya tiene un pago cobrado. Regulariza el pago antes de retirar al participante.');
                }
                if (!empty($registro['carnet_entregado']) || $db->table('certificados_curso')->where('id_inscripcion', $id)->countAllResults() > 0) {
                    $db->transRollback();
                    return $this->failValidationErrors('Esta inscripción tiene un carnet emitido o entregado. No se puede retirar sin regularizarlo primero.');
                }
// No se elimina historial: se anulan únicamente los cobros todavía pendientes.
                $db->table('pagos_transito')->where('id_inscripcion', $id)->where('estado', 'PENDIENTE')
                    ->update(['estado' => 'ANULADO', 'referencia_pago' => 'Inscripción retirada sin pago']);
                if (!$db->table('inscripciones_curso')->where('id', $id)->update(['estado' => 'CANCELADO', 'estado_pago' => 'ANULADO'])) {
                    throw new \RuntimeException('No se pudo guardar el retiro.');
                }
                \App\Services\AuditoriaService::registrar('CURSOS', 'RETIRAR_INSCRIPCION', "Se retiró la inscripción #{$id}", ['id_inscripcion' => (int)$id, 'id_curso' => (int)$registro['id_curso']]);
            }
            if (!$db->transStatus()) throw new \RuntimeException('No se pudo completar el retiro.');
            $cupos = $db->table('inscripciones_curso')->where('id_curso', $registro['id_curso'])->whereNotIn('estado', ['ANULADO', 'CANCELADO'])->countAllResults();
            $db->transCommit();
            return $this->respond(['message' => 'Inscripción retirada. La persona permanece en el padrón.', 'data' => ['idInscripcion' => (int)$id, 'cuposInscritos' => $cupos]]);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo retirar la inscripción. Intenta nuevamente.');
        }
    }

    public function registrarNota($idCurso, $dni)
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();

        $estado = strtoupper(trim($input['estado'] ?? ''));
        $asistio = null;
        if (array_key_exists('asistio', $input) && $input['asistio'] !== null && $input['asistio'] !== '') {

            $mapa = [true => 1, false => 0, 1 => 1, 0 => 0, '1' => 1, '0' => 0];
            $crudo = $input['asistio'];
            if (!is_bool($crudo) && !is_int($crudo) && !is_string($crudo) || !array_key_exists(is_bool($crudo) ? (int) $crudo : $crudo, $mapa)) {
                return $this->failValidationErrors('El valor de asistencia no es válido.');
            }
            $asistio = $mapa[is_bool($crudo) ? (int) $crudo : $crudo];
        }

        if ($estado !== '' && !in_array($estado, ['APROBADO', 'DESAPROBADO'], true)) {
            return $this->failValidationErrors('Estado de participante no válido.');
        }

        if (!$estado && $asistio === null) {
            return $this->failValidationErrors('No se enviaron datos para actualizar.');
        }

        if (in_array($estado, ['APROBADO', 'CULMINADO'], true)) {
            $pendiente = $db->query(
                "SELECT 1 FROM inscripciones_curso ic JOIN personas p ON p.id = ic.id_persona
                 JOIN cursos_seguridad_vial c ON c.id = ic.id_curso
                 WHERE ic.id_curso = ? AND p.numero = ? AND ic.estado NOT IN ('ANULADO','CANCELADO') AND ic.estado_pago <> 'PAGADO' AND c.costo_inscripcion > 0 LIMIT 1",
                [(int) $idCurso, (string) $dni]
            )->getRowArray();
            if ($pendiente) {
                return $this->failValidationErrors('La inscripción tiene el pago pendiente. Cobre el curso antes de registrar la aprobación.');
            }
        }

        $persona = $db->table('personas')->where('numero', $dni)->get()->getRowArray();
        if (!$persona) {
            return $this->failNotFound('No se encontró a la persona con el DNI proporcionado.');
        }

        $idPersona = $persona['id'];

        $data = [];
        if ($estado) $data['estado'] = $estado;
        if ($asistio !== null) $data['asistio'] = $asistio;

        $cursoFila = $db->table('cursos_seguridad_vial')->select('fecha_inicio')->where('id', $idCurso)->get()->getRowArray();
        if ($cursoFila && !empty($cursoFila['fecha_inicio']) && $cursoFila['fecha_inicio'] > date('Y-m-d')) {
            return $this->failValidationErrors('El curso aún no comienza: la asistencia y los resultados se registran desde su fecha de inicio.');
        }

        try {
            $inscrito = $db->table('inscripciones_curso')
                ->where('id_curso', $idCurso)
                ->where('id_persona', $idPersona)
                ->whereNotIn('estado', ['ANULADO', 'CANCELADO'])
                ->get()->getRowArray();
            if (!$inscrito) {
                return $this->failNotFound('La persona no está inscrita en este curso.');
            }

            $asistenciaFinal = $asistio ?? (int)($inscrito['asistio'] ?? 0);
            if ($estado === 'APROBADO' && $asistenciaFinal !== 1) {
                return $this->failValidationErrors('Debe marcar la asistencia antes de aprobar al participante.');
            }
            if ($asistenciaFinal !== 1) $data['estado'] = 'DESAPROBADO';

            $db->table('inscripciones_curso')
                ->where('id_curso', $idCurso)
                ->where('id_persona', $idPersona)
                ->whereNotIn('estado', ['ANULADO', 'CANCELADO'])
                ->update($data);

            return $this->respond(['status' => 200, 'message' => 'Nota/asistencia registrada correctamente.']);
        } catch (\Exception $e) {
            return $this->failServerError('Error al registrar nota.');
        }
    }

/**
     * Cursos finalizados (para filtrar los carnets del Centro de impresión). Con miles de cursos no se
     * devuelve todo: solo las primeras coincidencias de "buscar" (código o nombre), hasta "limit".
     */
    public function listarCursosFinalizados()
    {
        $db = \Config\Database::connect();
        $limite = max(1, min(50, (int) ($this->request->getGet('limit') ?: 15)));

        $builder = $db->table('cursos_seguridad_vial cu')
            ->select('cu.id, cu.uuid, cu.codigo, cu.nombre AS titulo, cu.fecha_inicio AS fecha')
            ->where('cu.estado', 'FINALIZADO');

        $buscar = trim((string) $this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                ->like('cu.codigo', $buscar)
                ->orLike('cu.nombre', $buscar)
                ->groupEnd();
        }

        $rows = $builder->orderBy('cu.fecha_inicio', 'DESC')->orderBy('cu.id', 'DESC')
            ->limit($limite + 1)
            ->get()->getResultArray();

        $hayMas = count($rows) > $limite;
        $rows = array_slice($rows, 0, $limite);

        return $this->respond(['data' => $rows, 'meta' => ['hayMas' => $hayMas]]);
    }

/**
     * Carnets que se pueden imprimir: participantes aprobados (o con asistencia) de cursos finalizados.
     * Listado liviano y paginado para el Centro de impresión (no trae el curso completo con todos sus participantes).
     */

    public function listarVigenciaCarnets()
    {
        $db = \Config\Database::connect();
        $this->sincronizarEstadosPorFecha($db);
        $hoy = \App\Libraries\ReglasCurso::hoy();
        $limite = date('Y-m-d', strtotime($hoy . ' -1 year'));
        $limitePorVencer = date('Y-m-d', strtotime($hoy . ' -1 year +30 days'));
        $aprobado = \App\Libraries\ReglasCurso::condicionAprobado('ic');
        $aprobado3 = \App\Libraries\ReglasCurso::condicionAprobado('i3');

        $filtro = '';
        $params = [];
        $estado = strtoupper(trim((string) $this->request->getGet('estado')));
        if ($estado === 'VENCIDO') {
            $filtro .= ' AND v.ultima_fecha < ?';
            $params[] = $limite;
        } elseif ($estado === 'VIGENTE') {
            $filtro .= ' AND v.ultima_fecha > ?';
            $params[] = $limitePorVencer;
        } elseif ($estado === 'POR_VENCER') {
            $filtro .= ' AND v.ultima_fecha >= ? AND v.ultima_fecha <= ?';
            array_push($params, $limite, $limitePorVencer);
        }
        $buscar = trim((string) $this->request->getGet('buscar'));
        if ($buscar !== '') {
            $patron = '%' . $db->escapeLikeString($buscar) . '%';
            $filtro .= " AND (p.numero LIKE ? ESCAPE '!' OR ci.numero_licencia LIKE ? ESCAPE '!'
                OR CONCAT_WS(' ', ci.nombres, ci.apellido_paterno, ci.apellido_materno) LIKE ? ESCAPE '!')";
            array_push($params, $patron, $patron, $patron);
        }

        $base = "FROM (
                SELECT ic.id_persona, MAX(COALESCE(cu.carnet_expedicion, cu.fecha_inicio)) AS ultima_fecha
                FROM inscripciones_curso ic
                JOIN cursos_seguridad_vial cu ON cu.id = ic.id_curso
                WHERE $aprobado
                GROUP BY ic.id_persona
            ) v
            JOIN personas p ON p.id = v.id_persona
            LEFT JOIN ciudadanos ci ON ci.id_persona = p.id
            WHERE 1=1 $filtro";

        $page = max(1, (int) $this->request->getGet('page'));
        $porPagina = max(1, min(200, (int) ($this->request->getGet('porPagina') ?: 5)));

        $rows = $db->query(
            "SELECT p.id AS idPersona, p.numero AS dni, ci.nombres, ci.apellido_paterno, ci.apellido_materno,
                    ci.numero_licencia AS licencia, ci.foto AS fotoUrl, v.ultima_fecha AS ultimoCurso,
                    DATE_ADD(v.ultima_fecha, INTERVAL 1 YEAR) AS venceEl,
                    DATEDIFF(DATE_ADD(v.ultima_fecha, INTERVAL 1 YEAR), ?) AS diasRestantes,
                    COUNT(*) OVER () AS totalFilas
             $base
             ORDER BY v.ultima_fecha DESC, ci.apellido_paterno ASC
             LIMIT ? OFFSET ?",
            array_merge([$hoy], $params, [$porPagina, ($page - 1) * $porPagina])
        )->getResultArray();

        if ($rows) {
            $total = (int) $rows[0]['totalFilas'];
        } elseif ($page > 1) {
            $total = (int) ($db->query("SELECT COUNT(*) AS n $base", $params)->getRowArray()['n'] ?? 0);
        } else {
            $total = 0;
        }

        $cursosPorPersona = [];
        if ($rows) {
            $ids = array_map(static fn($r) => (int) $r['idPersona'], $rows);
            $marcas = implode(',', array_fill(0, count($ids), '?'));
            $cursos = $db->query(
                "SELECT i3.id_persona, cu3.codigo, cu3.nombre, cu3.fecha_inicio
                 FROM inscripciones_curso i3 JOIN cursos_seguridad_vial cu3 ON cu3.id = i3.id_curso
                 WHERE i3.id_persona IN ($marcas) AND $aprobado3
                 ORDER BY cu3.fecha_inicio DESC",
                $ids
            )->getResultArray();
            foreach ($cursos as $c) {
                $cursosPorPersona[(int) $c['id_persona']] ??= $c;
            }
        }

        $fileStorage = new \App\Services\FileStorageService();
        foreach ($rows as &$row) {
            $row['idPersona'] = (int) $row['idPersona'];
            $row['diasRestantes'] = (int) $row['diasRestantes'];
            $row['estado'] = $row['diasRestantes'] < 0 ? 'VENCIDO' : ($row['diasRestantes'] <= 30 ? 'POR_VENCER' : 'VIGENTE');
            $row['cursoCodigo'] = $cursosPorPersona[$row['idPersona']]['codigo'] ?? null;
            $row['cursoTitulo'] = $cursosPorPersona[$row['idPersona']]['nombre'] ?? null;
            $row['fotoUrl'] = $fileStorage->urlPublica($row['fotoUrl'] ?? null) ?? '';
            unset($row['totalFilas']);
        }
        unset($row);

        return $this->respond(['data' => $rows, 'meta' => ['total' => $total, 'page' => $page, 'porPagina' => $porPagina]]);
    }

    public function listarCarnets()
    {
        $db = \Config\Database::connect();
        $this->sincronizarEstadosPorFecha($db);
        $builder = $db->table('inscripciones_curso ic')
            ->select("ic.id AS idInscripcion, ic.uuid, cu.id AS cursoId, cu.codigo AS cursoCodigo, cu.nombre AS cursoTitulo, cu.resolucion AS cursoResolucion, cu.carnet_expedicion AS cursoCarnetExpedicion, cu.carnet_vencimiento AS cursoCarnetVencimiento, cu.fecha_inicio AS cursoFecha, c.nombres, c.apellido_paterno, c.apellido_materno, p.numero AS dni, c.numero_licencia AS licencia, c.foto AS fotoUrl, ic.carnet_entregado AS carnetEntregado, ic.carnet_fecha_entrega AS carnetFechaEntrega", false)
            ->join('cursos_seguridad_vial cu', 'cu.id = ic.id_curso')
            ->join('personas p', 'p.id = ic.id_persona', 'left')
            ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
            ->where('cu.estado', 'FINALIZADO')
            ->where(\App\Libraries\ReglasCurso::condicionAprobado(), null, false);

        $builder->select('p.uuid AS personaId');
        $cursoId = (int) \App\Libraries\Identificador::resolverId($db, 'cursos_seguridad_vial', $this->request->getGet('cursoId'));
        if ($cursoId > 0) {
            $builder->where('cu.id', $cursoId);
        }

        $entrega = strtoupper(trim((string) $this->request->getGet('entrega')));
        if ($entrega === 'ENTREGADO') {
            $builder->where('ic.carnet_entregado', 1);
        } elseif ($entrega === 'PENDIENTE') {
            $builder->groupStart()->where('ic.carnet_entregado', 0)->orWhere('ic.carnet_entregado IS NULL', null, false)->groupEnd();
        }

        $buscar = trim((string) $this->request->getGet('buscar'));
        if ($buscar !== '') {
            $builder->groupStart()
                ->like('p.numero', $buscar)
                ->orLike('c.numero_licencia', $buscar)
                ->orLike('cu.codigo', $buscar)
                ->orLike('cu.nombre', $buscar)
                ->orWhere(\App\Libraries\Busqueda::nombreCompleto($buscar, 'c.nombres', 'c.apellido_paterno', 'c.apellido_materno'), null, false)
                ->groupEnd();
        }

        $page = max(1, (int) $this->request->getGet('page'));
        $porPagina = max(1, min(1000, (int) ($this->request->getGet('porPagina') ?: 20)));

        $total = (clone $builder)->countAllResults(false);
        $rows = $builder->orderBy('cu.fecha_inicio', 'DESC')->orderBy('c.apellido_paterno', 'ASC')->orderBy('ic.id', 'ASC')
            ->limit($porPagina, ($page - 1) * $porPagina)
            ->get()->getResultArray();

        $fileStorage = new \App\Services\FileStorageService();
        foreach ($rows as &$row) {
            $row['idInscripcion'] = (int) $row['idInscripcion'];
            $row['cursoId'] = (int) $row['cursoId'];
            $row['fotoUrl'] = $fileStorage->urlPublica($row['fotoUrl'] ?? null) ?? '';
            $row['carnetEntregado'] = (bool) ($row['carnetEntregado'] ?? false);
        }
        unset($row);

        return $this->respond([
            'data' => $rows,
            'meta' => ['total' => $total, 'page' => $page, 'porPagina' => $porPagina, 'totalPaginas' => (int) ceil($total / $porPagina)],
        ]);
    }

    public function marcarEntregaCarnet($idInscripcion)
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();

        $entregado = !empty($input['entregado']);

        $inscripcion = $db->table('inscripciones_curso')->where('id', $idInscripcion)->get()->getRowArray();
        if (!$inscripcion) {
            return $this->failNotFound('No se encontró la inscripción indicada.');
        }

        $user = \App\Services\AuthSession::resolveActiveUser($this->request->getCookie('session_user'));

        $data = [
            'carnet_entregado' => $entregado ? 1 : 0,
            'carnet_fecha_entrega' => $entregado ? date('Y-m-d H:i:s') : null,
            'carnet_entregado_por' => $entregado ? ($user['usuario'] ?? null) : null,
        ];

        try {
            $db->transBegin();
            $inscripcion = $db->query('SELECT * FROM inscripciones_curso WHERE id = ? FOR UPDATE', [$idInscripcion])->getRowArray();
            if (!$inscripcion || in_array($inscripcion['estado'], ['ANULADO', 'CANCELADO'], true)) {
                $db->transRollback();
                return $this->failValidationErrors('No se puede registrar la entrega de una inscripción retirada.');
            }
            if ($entregado) {
                $conDerecho = $db->query('SELECT 1 FROM inscripciones_curso ic WHERE ic.id = ? AND ' . \App\Libraries\ReglasCurso::condicionAprobado('ic'), [(int) $idInscripcion])->getRowArray();
                if (!$conDerecho) {
                    $db->transRollback();
                    return $this->failValidationErrors('El carnet solo se entrega a quien aprobó el curso y lo tiene pagado.');
                }
            }
            $db->table('inscripciones_curso')->where('id', $idInscripcion)->update($data);

            \App\Services\AuditoriaService::registrar(
                'CURSOS',
                $entregado ? 'ENTREGAR_CARNET' : 'REVERTIR_ENTREGA_CARNET',
                ($entregado ? 'Se marcó como entregado' : 'Se revirtió la entrega de') . " el carnet de la inscripción #{$idInscripcion}",
                ['id_inscripcion' => (int) $idInscripcion, 'entregado' => $entregado]
            );
            if (!$db->transStatus()) throw new \RuntimeException('No se pudo guardar la entrega.');
            $db->transCommit();

            return $this->respond([
                'status' => 200,
                'message' => $entregado ? 'Carnet marcado como entregado.' : 'Entrega del carnet revertida.',
                'data' => $data,
            ]);
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->failServerError('No se pudo actualizar la entrega del carnet.');
        }
    }
}
