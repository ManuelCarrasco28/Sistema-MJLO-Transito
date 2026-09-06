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
            $rows = $db->table('cursos c')
                ->select("
                    c.id,
                    c.codigo,
                    c.titulo,
                    c.instructor,
                    c.fecha,
                    c.horario,
                    c.lugar,
                    c.cupos_totales as cuposTotales,
                    c.cupos_inscritos as cuposInscritos,
                    c.estado,
                    c.costo
                ")
                ->orderBy('c.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $row) {
                $row['costo'] = (float) $row['costo'];
                $row['cuposTotales'] = (int) $row['cuposTotales'];
                $row['cuposInscritos'] = (int) $row['cuposInscritos'];
                $row['temario'] = []; // Array vacío por defecto
                $row['participantes'] = []; // Array vacío por defecto
                return $row;
            }, $rows);
        } catch (\Exception $e) {
            $data = [];
        }

        return $this->respond(['data' => $data]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true);

        $data = [
            'codigo' => 'CUR-' . date('Y') . '-' . str_pad(random_int(1, 999), 3, '0', STR_PAD_LEFT),
            'titulo' => $input['titulo'] ?? '',
            'instructor' => $input['instructor'] ?? '',
            'fecha' => $input['fecha'] ?? date('Y-m-d'),
            'horario' => $input['horario'] ?? '',
            'lugar' => $input['lugar'] ?? '',
            'cupos_totales' => $input['cuposTotales'] ?? 0,
            'cupos_inscritos' => 0,
            'estado' => 'PROGRAMADO',
            'costo' => $input['costo'] ?? 0,
        ];

        try {
            $db->table('cursos')->insert($data);
            $data['id'] = $db->insertID();
            
            $response = [
                'id' => $data['id'],
                'codigo' => $data['codigo'],
                'titulo' => $data['titulo'],
                'instructor' => $data['instructor'],
                'fecha' => $data['fecha'],
                'horario' => $data['horario'],
                'lugar' => $data['lugar'],
                'cuposTotales' => (int)$data['cupos_totales'],
                'cuposInscritos' => 0,
                'estado' => $data['estado'],
                'costo' => (float)$data['costo'],
                'temario' => [],
                'participantes' => [],
            ];
            return $this->respondCreated(['status' => 201, 'data' => $response]);
        } catch (\Exception $e) {
            return $this->failServerError('Error creando el curso');
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true);

        $data = [
            'titulo' => $input['titulo'] ?? '',
            'instructor' => $input['instructor'] ?? '',
            'fecha' => $input['fecha'] ?? '',
            'horario' => $input['horario'] ?? '',
            'lugar' => $input['lugar'] ?? '',
            'cupos_totales' => $input['cuposTotales'] ?? 0,
            'costo' => $input['costo'] ?? 0,
        ];

        try {
            $db->table('cursos')->where('id', $id)->update($data);
            return $this->respond(['status' => 200, 'message' => 'Actualizado correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error actualizando el curso');
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $db->table('cursos')->where('id', $id)->delete();
            return $this->respondDeleted(['status' => 200, 'message' => 'Curso eliminado correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error eliminando el curso');
        }
    }
}
