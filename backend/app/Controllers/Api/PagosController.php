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
                    p.numero_voucher as contribuyente,
                    p.medio_pago as medioPago,
                    p.referencia_pago as referenciaPago,
                    p.codigo_contribuyente as dniRuc,
                    p.codigo_contribuyente as documentoIdentidad,
                    p.subtotal as monto,
                    p.descuento_aplicado as descuentoAplicado,
                    p.total as montoNeto,
                    COALESCE(p.medio_pago, p.tipo_pago) as metodoPago,
                    COALESCE(p.medio_pago, p.tipo_pago) as metodo,
                    p.tipo_pago as tipoPago,
                    CONCAT(p.fecha_pago, ' ', COALESCE(p.hora_pago, '10:00:00')) as fechaHora,
                    p.fecha_pago as fecha,
                    p.cajero,
                    p.estado
                ")
                ->orderBy('p.id', 'DESC')
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $row) {
                $row['id'] = (int)$row['id'];
                $row['monto'] = (float)$row['monto'];
                $row['descuentoAplicado'] = (float)$row['descuentoAplicado'];
                $row['montoNeto'] = (float)$row['montoNeto'];
                $row['tipoConcepto'] = 'TRAMITE';
                $row['vehiculoPlaca'] = '';
                $row['contribuyente'] = $row['contribuyente'] ?: 'No registrado';
                $row['dniRuc'] = $row['dniRuc'] ?: 'N/A';
                $row['cajero'] = $row['cajero'] ?: 'Caja Central Municipal';
                return $row;
            }, $rows);

            return $this->respond(['data' => $data]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando pagos: ' . $e->getMessage());
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

        $monto = (float)($input['monto'] ?? $input['montoNeto'] ?? 0);
        $descuento = (float)($input['descuentoAplicado'] ?? 0);
        $total = max(0, $monto - $descuento);
        $metodo = trim($input['metodoPago'] ?? $input['metodo'] ?? 'EFECTIVO');
        $referenciaPago = trim($input['referenciaPago'] ?? '');
        $contribuyente = trim($input['contribuyente'] ?? '');
        $dniRuc = trim($input['documentoIdentidad'] ?? $input['dniRuc'] ?? '');
        $concepto = trim($input['concepto'] ?? 'Pago de Trámite Municipal');
        $numeroRecibo = trim($input['numeroRecibo'] ?? ('REC-' . date('Y') . '-' . str_pad((string)random_int(1, 99999), 5, '0', STR_PAD_LEFT)));
        $fechaPago = date('Y-m-d');
        $horaPago = date('H:i:s');
        $cajero = 'Caja Central Municipal';

        $data = [
            'tipo_pago' => trim($input['tipoPago'] ?? 'TRAMITE'),
            'numero_recibo' => $numeroRecibo,
            'numero_voucher' => $contribuyente,
            'medio_pago' => $metodo,
            'referencia_pago' => $referenciaPago,
            'fecha_pago' => $fechaPago,
            'hora_pago' => $horaPago,
            'cajero' => $cajero,
            'caja' => 'Caja 01',
            'codigo_contribuyente' => $dniRuc,
            'concepto' => $concepto,
            'subtotal' => $monto,
            'reajuste' => 0.00,
            'intereses' => 0.00,
            'descuento_aplicado' => $descuento,
            'redondeo' => 0.00,
            'total' => $total,
            'estado' => 'PAGADO',
        ];

        try {
            $db->table('pagos')->insert($data);
            $newId = $db->insertID();
            
            $response = [
                'id' => $newId,
                'numeroRecibo' => $numeroRecibo,
                'concepto' => $concepto,
                'tipoConcepto' => 'TRAMITE',
                'contribuyente' => $contribuyente,
                'dniRuc' => $dniRuc,
                'documentoIdentidad' => $dniRuc,
                'vehiculoPlaca' => '',
                'monto' => $monto,
                'descuentoAplicado' => $descuento,
                'montoNeto' => $total,
                'metodoPago' => $metodo,
                'metodo' => $metodo,
                'medioPago' => $metodo,
                'referenciaPago' => $referenciaPago,
                'tipoPago' => $data['tipo_pago'],
                'fechaHora' => "$fechaPago $horaPago",
                'fecha' => "$fechaPago $horaPago",
                'cajero' => $cajero,
                'estado' => 'PAGADO',
            ];
            return $this->respondCreated(['status' => 201, 'data' => $response]);
        } catch (\Exception $e) {
            return $this->failServerError('Error creando el pago: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $db->table('pagos')->where('id', $id)->update(['estado' => 'ANULADO']);
            return $this->respondDeleted(['status' => 200, 'message' => 'Pago anulado correctamente']);
        } catch (\Exception $e) {
            return $this->failServerError('Error anulando el pago: ' . $e->getMessage());
        }
    }
}
