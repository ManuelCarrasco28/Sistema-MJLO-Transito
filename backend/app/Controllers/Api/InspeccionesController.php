<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class InspeccionesController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        
        try {
            $rows = $db->table('inspecciones i')
                ->select("
                    i.id,
                    i.numero_inspeccion as numeroInspeccion,
                    i.vehiculo_placa as vehiculoPlaca,
                    i.inspector,
                    i.fecha,
                    i.resultado,
                    i.observaciones,
                    i.estado
                ")
                ->orderBy('i.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $row) {
                $row['detalles'] = []; // Array vacío por defecto
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
            'numero_inspeccion' => 'INSP-' . date('Y') . '-' . str_pad(random_int(1, 999), 3, '0', STR_PAD_LEFT),
            'vehiculo_placa' => $input['vehiculoPlaca'] ?? '',
            'inspector' => $input['inspector'] ?? 'Inspector Municipal',
            'fecha' => date('Y-m-d H:i:s'),
            'resultado' => $input['resultado'] ?? 'OBSERVADO',
            'observaciones' => $input['observaciones'] ?? '',
            'estado' => 'ACTIVO',
        ];

        try {
            $db->table('inspecciones')->insert($data);
            $data['id'] = $db->insertID();
            
            $response = [
                'id' => $data['id'],
                'numeroInspeccion' => $data['numero_inspeccion'],
                'vehiculoPlaca' => $data['vehiculo_placa'],
                'inspector' => $data['inspector'],
                'fecha' => $data['fecha'],
                'resultado' => $data['resultado'],
                'observaciones' => $data['observaciones'],
                'estado' => $data['estado'],
                'detalles' => [],
            ];
            return $this->respondCreated(['status' => 201, 'data' => $response]);
        } catch (\Exception $e) {
            return $this->failServerError('Error creando la inspección');
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true);

        $data = [
            'vehiculo_placa' => $input['vehiculoPlaca'] ?? '',
            'resultado' => $input['resultado'] ?? '',
            'observaciones' => $input['observaciones'] ?? '',
        ];

        try {
            $db->table('inspecciones')->where('id', $id)->update($data);
            return $this->respond(['status' => 200, 'message' => 'Actualizado correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error actualizando la inspección');
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $db->table('inspecciones')->where('id', $id)->update(['estado' => 'ANULADO']);
            return $this->respondDeleted(['status' => 200, 'message' => 'Inspección anulada correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error anulando la inspección');
        }
    }
}
