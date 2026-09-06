<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class PagosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        
        try {
            $rows = $db->table('pagos p')
                ->select("
                    p.id,
                    p.numero_recibo as numeroRecibo,
                    p.concepto,
                    p.tipo_concepto as tipoConcepto,
                    p.referencia_codigo as referenciaCodigo,
                    p.contribuyente,
                    p.documento_identidad as documentoIdentidad,
                    p.vehiculo_placa as vehiculoPlaca,
                    p.monto,
                    p.descuento_aplicado as descuentoAplicado,
                    p.monto_neto as montoNeto,
                    p.metodo_pago as metodoPago,
                    p.fecha_hora as fechaHora,
                    p.cajero,
                    p.estado
                ")
                ->orderBy('p.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $row) {
                $row['monto'] = (float) $row['monto'];
                $row['descuentoAplicado'] = (float) $row['descuentoAplicado'];
                $row['montoNeto'] = (float) $row['montoNeto'];
                return $row;
            }, $rows);
        } catch (\Exception $e) {
            // Fallback en caso de que la tabla de pagos no tenga todos estos campos
            $data = [];
        }

        return $this->respond(['data' => $data]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $input = $this->request->getJSON(true);

        $monto = (float)($input['monto'] ?? 0);
        $descuentoAplicado = (float)($input['descuentoAplicado'] ?? 0);
        
        $data = [
            'numero_recibo' => 'REC-' . date('Y') . '-' . str_pad(random_int(1, 99999), 5, '0', STR_PAD_LEFT),
            'concepto' => $input['concepto'] ?? 'Pago General',
            'tipo_concepto' => $input['tipoConcepto'] ?? 'OTROS',
            'referencia_codigo' => $input['referenciaCodigo'] ?? '',
            'contribuyente' => $input['contribuyente'] ?? '',
            'documento_identidad' => $input['documentoIdentidad'] ?? '',
            'vehiculo_placa' => $input['vehiculoPlaca'] ?? '',
            'monto' => $monto,
            'descuento_aplicado' => $descuentoAplicado,
            'monto_neto' => $monto - $descuentoAplicado,
            'metodo_pago' => $input['metodoPago'] ?? 'EFECTIVO',
            'fecha_hora' => date('Y-m-d H:i:s'),
            'cajero' => 'Caja Principal',
            'estado' => 'PAGADO',
        ];

        try {
            $db->table('pagos')->insert($data);
            $data['id'] = $db->insertID();
            
            // Format to frontend
            $response = [
                'id' => $data['id'],
                'numeroRecibo' => $data['numero_recibo'],
                'concepto' => $data['concepto'],
                'tipoConcepto' => $data['tipo_concepto'],
                'referenciaCodigo' => $data['referencia_codigo'],
                'contribuyente' => $data['contribuyente'],
                'documentoIdentidad' => $data['documento_identidad'],
                'vehiculoPlaca' => $data['vehiculo_placa'],
                'monto' => $data['monto'],
                'descuentoAplicado' => $data['descuento_aplicado'],
                'montoNeto' => $data['monto_neto'],
                'metodoPago' => $data['metodo_pago'],
                'fechaHora' => $data['fecha_hora'],
                'cajero' => $data['cajero'],
                'estado' => $data['estado'],
            ];
            return $this->respondCreated(['status' => 201, 'data' => $response]);
        } catch (\Exception $e) {
            return $this->failServerError('Error registrando el pago');
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $db->table('pagos')->where('id', $id)->update(['estado' => 'ANULADO']);
            return $this->respondDeleted(['status' => 200, 'message' => 'Pago anulado correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error anulando el pago');
        }
    }
}
