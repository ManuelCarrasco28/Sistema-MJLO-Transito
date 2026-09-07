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
            $rows = $db->table('cursos_seguridad_vial c')
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
                ")
                ->orderBy('c.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = [];
            foreach ($rows as $row) {
                $row['id'] = (int)$row['id'];
                $row['costo'] = (float)$row['costo'];
                $row['cuposTotales'] = (int)($row['cuposTotales'] ?? 50);
                $row['horario'] = '09:00 AM - 12:00 PM';
                try {
                    $row['cuposInscritos'] = (int)$db->table('inscripciones_curso')
                        ->where('curso_id', $row['id'])
                        ->countAllResults();
                } catch (\Throwable $t) {
                    $row['cuposInscritos'] = 0;
                }

                $row['temario'] = [];
                
                try {
                    $participantes = $db->table('inscripciones_curso ic')
                        ->select('p.nombres, p.apellido_paterno, p.apellido_materno, ic.estado, ic.asistio')
                        ->join('personas p', 'p.id = ic.persona_id', 'left')
                        ->where('ic.curso_id', $row['id'])
                        ->get()
                        ->getResultArray();
                    $row['participantes'] = $participantes;
                } catch (\Throwable $t) {
                    $row['participantes'] = [];
                }

                $data[] = $row;
            }

            return $this->respond(['data' => $data]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando cursos: ' . $e->getMessage());
        }
    }

    public function create()
    {
        $db = \Config\Database::connect();
        try {
            $input = $this->request->getJSON(true);
        } catch (\Throwable $e) {
            $input = null;
        }
        if (!is_array($input)) {
            $input = json_decode($this->request->getBody() ?: '', true) ?? $this->request->getPost();
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
            return $this->failServerError('Error creando el curso: ' . $e->getMessage());
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $input = $this->request->getJSON(true);
        } catch (\Throwable $e) {
            $input = null;
        }
        if (!is_array($input)) {
            $input = json_decode($this->request->getBody() ?: '', true) ?? $this->request->getPost();
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
            return $this->failServerError('Error actualizando el curso: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $db->table('cursos_seguridad_vial')->where('id', $id)->delete();
            return $this->respondDeleted(['status' => 200, 'message' => 'Curso eliminado correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error eliminando el curso: ' . $e->getMessage());
        }
    }
}
