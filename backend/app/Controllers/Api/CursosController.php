<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class CursosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        
        try {
            $builder = $db->table('cursos_seguridad_vial c')
                ->select("
                    c.id,
                    c.codigo,
                    c.nombre as titulo,
                    c.descripcion,
                    c.resolucion as instructor,
                    c.fecha_inicio as fecha,
                    c.lugar,
                    c.cupos as cuposTotales,
                    c.estado,
                    c.costo_inscripcion as costo
                ");

            $buscar = trim((string)$this->request->getGet('buscar'));
            if ($buscar !== '') {
                $builder->groupStart()
                    ->like('c.codigo', $buscar)
                    ->orLike('c.nombre', $buscar)
                    ->orLike('c.resolucion', $buscar)
                    ->orLike('c.lugar', $buscar)
                    ->groupEnd();
            }

            $estado = strtoupper(trim((string)$this->request->getGet('estado')));
            if ($estado !== '' && $estado !== 'TODOS') {
                $builder->where('c.estado', $estado);
            }

            $page = (int)$this->request->getGet('page');
            $porPagina = max(1, min(200, (int)($this->request->getGet('porPagina') ?: 20)));

            $total = 0;
            if ($page > 0) {
                $total = (clone $builder)->countAllResults(false);
                $rows = $builder->orderBy('c.id', 'DESC')
                    ->limit($porPagina, ($page - 1) * $porPagina)
                    ->get()
                    ->getResultArray();
            } else {
                $rows = $builder->orderBy('c.id', 'DESC')
                    ->get()
                    ->getResultArray();
            }

            $cursoIds = array_column($rows, 'id');
            $participantesPorCurso = [];
            $conteoPorCurso = [];

            if (!empty($cursoIds)) {
                $inscripciones = $db->table('inscripciones_curso ic')
                    ->select('ic.id_curso, c.nombres, c.apellido_paterno, c.apellido_materno, ic.estado, ic.estado_pago, ic.asistio, p.numero AS dni, c.numero_licencia AS licencia, c.foto AS fotoUrl')
                    ->join('personas p', 'p.id = ic.id_persona', 'left')
                    ->join('ciudadanos c', 'c.id_persona = p.id', 'left')
                    ->whereIn('ic.id_curso', $cursoIds)
                    ->get()
                    ->getResultArray();

                foreach ($inscripciones as $ic) {
                    $cid = (int)$ic['id_curso'];
                    unset($ic['id_curso']);
                    $participantesPorCurso[$cid][] = $ic;
                    $conteoPorCurso[$cid] = ($conteoPorCurso[$cid] ?? 0) + 1;
                }
            }

            $data = [];
            foreach ($rows as $row) {
                $cid = (int)$row['id'];
                $row['id'] = $cid;
                $row['costo'] = (float)$row['costo'];
                $row['cuposTotales'] = (int)($row['cuposTotales'] ?? 50);
                $row['horario'] = '09:00 AM - 12:00 PM';
                $row['cuposInscritos'] = $conteoPorCurso[$cid] ?? 0;
                $row['temario'] = [];
                $row['participantes'] = $participantesPorCurso[$cid] ?? [];

                $data[] = $row;
            }

            if ($page > 0) {
                return $this->respond([
                    'data' => $data,
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

    /**
     * Decodifica el body JSON de la petición; si CodeIgniter no pudo
     * parsearlo (o vino vacío), reintenta manualmente y cae al POST clásico.
     */
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

    /**
     * True si la persona ya aprobó o asistió a un curso vigente (últimos 2
     * años), condición que aplica tanto para listar personas ya cubiertas
     * como para bloquear una reinscripción individual.
     */
    private function tieneCursoVigente($db, ?int $idPersona = null, ?string $select = null, ?int $idCurso = null)
    {
        $query = $db->table('inscripciones_curso ic');
        if ($select !== null) {
            $query->select($select, false);
        }
        $query->join('cursos_seguridad_vial c', 'c.id = ic.id_curso')
            ->groupStart()
                ->where('ic.estado', 'APROBADO')
                ->orWhere('ic.asistio', 1)
            ->groupEnd()
            ->where('c.fecha_inicio >=', date('Y-m-d', strtotime('-2 years')));

        if ($idPersona !== null) {
            $query->where('ic.id_persona', $idPersona);
        }

        // Si se proporciona curso específico, acotar al mismo curso o curso con igual nombre
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
                'rules' => 'permit_empty|numeric',
                'errors' => ['numeric' => 'El costo debe ser un valor numérico.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $codigo = trim($input['codigo'] ?? ('CUR-' . date('Y') . '-' . str_pad((string)random_int(1, 999), 3, '0', STR_PAD_LEFT)));
        $titulo = trim($input['titulo'] ?? '');
        $descripcion = trim($input['descripcion'] ?? '');
        $instructor = trim($input['instructor'] ?? 'Instructor Certificado');
        $fecha = trim($input['fecha'] ?? date('Y-m-d'));
        $lugar = trim($input['lugar'] ?? 'Auditorio Municipal JLO');
        $cuposTotales = (int)($input['cuposTotales'] ?? 50);
        $costo = (float)($input['costo'] ?? 0);
        $estado = trim($input['estado'] ?? 'PROGRAMADO');

        $data = [
            'codigo' => $codigo,
            'nombre' => $titulo ?: 'Curso de Capacitación Vial',
            'descripcion' => $descripcion,
            'resolucion' => $instructor,
            'fecha_inicio' => $fecha,
            'fecha_fin' => date('Y-m-d', strtotime($fecha . ' + 3 days')),
            'lugar' => $lugar,
            'costo_inscripcion' => $costo,
            'cupos' => $cuposTotales,
            'estado' => $estado,
        ];

        try {
            $db->table('cursos_seguridad_vial')->insert($data);
            $newId = $db->insertID();
            
            $response = [
                'id' => $newId,
                'codigo' => $codigo,
                'titulo' => $data['nombre'],
                'descripcion' => $data['descripcion'],
                'instructor' => $instructor,
                'fecha' => $data['fecha_inicio'],
                'horario' => '09:00 AM - 12:00 PM',
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
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();

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
                'rules' => 'permit_empty|numeric',
                'errors' => ['numeric' => 'El costo debe ser un valor numérico.']
            ]
        ];

        if (!$this->validateData($input, $rules)) {
            return $this->failValidationErrors($this->validator->getErrors());
        }

        $data = [];
        if (isset($input['titulo'])) {
            $data['nombre'] = trim($input['titulo']);
        }
        if (isset($input['descripcion'])) {
            $data['descripcion'] = trim($input['descripcion']);
        }
        if (isset($input['instructor'])) {
            $data['resolucion'] = trim($input['instructor']);
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

        try {
            if (!empty($data)) {
                $db->table('cursos_seguridad_vial')->where('id', $id)->update($data);
            }
            return $this->respond(['status' => 200, 'message' => 'Curso actualizado correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error actualizando el curso.');
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $db->table('cursos_seguridad_vial')->where('id', $id)->delete();
            return $this->respondDeleted(['status' => 200, 'message' => 'Curso eliminado correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error eliminando el curso.');
        }
    }

    /**
     * Devuelve los IDs de personas que ya aprobaron o asistieron a un curso
     * en los últimos 2 años (vigencia del certificado), para no ofrecerlas
     * de nuevo al inscribir en un curso nuevo salvo que ya esté vencido.
     */
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

        // Buscar a la persona
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

        $curso = $db->table('cursos_seguridad_vial')
            ->select('cupos, costo_inscripcion, estado')
            ->where('id', $idCurso)
            ->get()
            ->getRowArray();

        if (!$curso) {
            return $this->failNotFound('No se encontró el curso indicado.');
        }

        if ($curso['estado'] === 'FINALIZADO') {
            return $this->failValidationErrors('Este curso ya finalizó, no se pueden registrar más inscripciones.');
        }

        // Verificar si ya está inscrito
        $existe = $db->table('inscripciones_curso')
            ->where('id_curso', $idCurso)
            ->where('id_persona', $idPersona)
            ->countAllResults();

        if ($existe > 0) {
            return $this->failValidationErrors('Esta persona ya se encuentra inscrita en este curso.');
        }

        // No permitir reinscribir a quien ya tiene un certificado vigente del mismo curso (últimos 2 años)
        $vigente = $this->tieneCursoVigente($db, $idPersona, null, $idCurso)->countAllResults();

        if ($vigente > 0) {
            return $this->failValidationErrors('Esta persona ya cuenta con un certificado vigente para este curso (menos de 2 años); no necesita volver a inscribirse.');
        }

        // Verificar cupo disponible
        $cuposTotales = (int)($curso['cupos'] ?? 0);
        $inscritosActuales = (int)$db->table('inscripciones_curso')
            ->where('id_curso', $idCurso)
            ->countAllResults();

        if ($cuposTotales > 0 && $inscritosActuales >= $cuposTotales) {
            return $this->failValidationErrors("El curso ya alcanzó su cupo máximo ({$cuposTotales} participantes).");
        }

        // El pago queda pendiente si el curso tiene costo; se cobra luego desde Pagos.
        $costo = (float)($curso['costo_inscripcion'] ?? 0);
        $estadoPago = $costo > 0 ? 'PENDIENTE' : 'PAGADO';

        // Inscribir
        $data = [
            'id_curso' => $idCurso,
            'id_persona' => $idPersona,
            'fecha_inscripcion' => date('Y-m-d H:i:s'),
            'estado_pago' => $estadoPago,
            'asistio' => 0,
            'estado' => 'INSCRITO'
        ];

        try {
            $db->table('inscripciones_curso')->insert($data);
            
            $participanteData = [
                'nombres' => $persona['nombres'],
                'apellido_paterno' => $persona['apellido_paterno'],
                'apellido_materno' => $persona['apellido_materno'],
                'dni' => $dni,
                'licencia' => $persona['numero_licencia'],
                'fotoUrl' => $persona['foto'],
                'estado' => 'INSCRITO',
                'estado_pago' => $estadoPago,
                'asistio' => 0
            ];
            
            return $this->respondCreated(['status' => 201, 'message' => 'Participante inscrito exitosamente.', 'data' => $participanteData]);
        } catch (\Exception $e) {
            return $this->failServerError('Error al inscribir al participante.');
        }
    }

    public function registrarNota($idCurso, $dni)
    {
        $db = \Config\Database::connect();
        $input = $this->parseInput();

        $estado = trim($input['estado'] ?? '');
        $asistio = isset($input['asistio']) ? (int)$input['asistio'] : null;

        if (!$estado && $asistio === null) {
            return $this->failValidationErrors('No se enviaron datos para actualizar.');
        }

        // Buscar persona por DNI para obtener su ID
        $persona = $db->table('personas')->where('numero', $dni)->get()->getRowArray();
        if (!$persona) {
            return $this->failNotFound('No se encontró a la persona con el DNI proporcionado.');
        }
        
        $idPersona = $persona['id'];

        $data = [];
        if ($estado) $data['estado'] = $estado;
        if ($asistio !== null) $data['asistio'] = $asistio;

        try {
            $db->table('inscripciones_curso')
                ->where('id_curso', $idCurso)
                ->where('id_persona', $idPersona)
                ->update($data);
                
            return $this->respond(['status' => 200, 'message' => 'Nota/asistencia registrada correctamente.']);
        } catch (\Exception $e) {
            return $this->failServerError('Error al registrar nota.');
        }
    }
}
