<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PapeletasController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        
        // Asumiendo que la tabla se llama 'papeletas'
        $rows = $db->table('papeletas p')
            ->select("
                p.id,
                p.numero_papeleta as numeroPapeleta,
                p.vehiculo_placa as vehiculoPlaca,
                p.infractor,
                p.inspector,
                p.fecha_hora as fechaHora,
                p.lugar,
                p.monto_total as montoTotal,
                p.estado
            ")
            ->orderBy('p.id', 'DESC')
            ->get()
            ->getResultArray();

        // En un caso real, podríamos tener una tabla papeleta_detalles, pero lo simularemos
        // basándonos en la infracción principal o haciendo un join.
        // Dado que no conocemos el esquema completo, lo devolveremos simulando la estructura del frontend
        $data = array_map(static function (array $row) {
            $row['montoTotal'] = (float) $row['montoTotal'];
            $row['detalles'] = [
                ['tipoInfraccionId' => 3, 'codigo' => 'G01'] // Dummy para compatibilidad
            ];
            return $row;
        }, $rows);

        return $this->respond(['data' => $data]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true);

        $data = [
            'numero_papeleta' => 'PAP-' . date('Y') . '-' . str_pad(random_int(1, 9999), 4, '0', STR_PAD_LEFT),
            'vehiculo_placa' => $input['vehiculoPlaca'] ?? '',
            'infractor' => $input['infractor'] ?? '',
            'inspector' => $input['inspector'] ?? 'Suboficial PNP',
            'fecha_hora' => date('Y-m-d H:i:s'),
            'lugar' => $input['lugar'] ?? '',
            'monto_total' => isset($input['tipoInfraccionId']) ? 368.00 : 0, // Simplified calculation
            'estado' => 'PENDIENTE_PAGO',
        ];

        try {
            $db->table('papeletas')->insert($data);
            $data['id'] = $db->insertID();
            
            // Convert to frontend camelCase
            $response = [
                'id' => $data['id'],
                'numeroPapeleta' => $data['numero_papeleta'],
                'vehiculoPlaca' => $data['vehiculo_placa'],
                'infractor' => $data['infractor'],
                'inspector' => $data['inspector'],
                'fechaHora' => $data['fecha_hora'],
                'lugar' => $data['lugar'],
                'montoTotal' => (float)$data['monto_total'],
                'estado' => $data['estado'],
                'detalles' => [['tipoInfraccionId' => $input['tipoInfraccionId'] ?? 1, 'codigo' => 'G01']]
            ];
            return $this->respondCreated(['status' => 201, 'data' => $response]);
        } catch (\Exception $e) {
            return $this->failServerError('Error creando la papeleta: ' . $e->getMessage());
        }
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true);

        $data = [
            'vehiculo_placa' => $input['vehiculoPlaca'] ?? '',
            'infractor' => $input['infractor'] ?? '',
            'lugar' => $input['lugar'] ?? '',
        ];

        try {
            $db->table('papeletas')->where('id', $id)->update($data);
            return $this->respond(['status' => 200, 'message' => 'Actualizado correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error actualizando la papeleta');
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            // Normalmente en vez de borrar físicamente, actualizamos el estado a ANULADA
            $db->table('papeletas')->where('id', $id)->update(['estado' => 'ANULADA']);
            return $this->respondDeleted(['status' => 200, 'message' => 'Papeleta anulada correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error anulando la papeleta');
        }
    }
}
