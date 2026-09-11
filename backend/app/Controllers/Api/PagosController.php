<?php

namespace App\Controllers\Api;

use App\Services\PagosTransito;
use CodeIgniter\RESTful\ResourceController;

class PagosController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $rows = \Config\Database::connect()->table('pagos_transito')->orderBy('id', 'DESC')->get()->getResultArray();
        return $this->respond(['data' => array_map([$this, 'present'], $rows)]);
    }

    public function present(array $row): array
    {
        return [
            'id' => (int)$row['id'], 'tipoPago' => $row['tipo_pago'],
            'papeletaId' => $row['id_papeleta'], 'tramiteId' => $row['id_tramite'], 'inscripcionId' => $row['id_inscripcion'],
            'numeroRecibo' => $row['numero_recibo'], 'numeroVoucher' => $row['numero_voucher'],
            'metodo' => $row['medio_pago'], 'metodoPago' => $row['medio_pago'],
            'referenciaPago' => $row['referencia_pago'], 'montoTotal' => (float)$row['total'],
            'fecha' => $row['fecha_pago'], 'fechaHora' => $row['fecha_pago'], 'estado' => $row['estado'],
        ];
    }

    public function create()
    {
        try {
            $input = $this->request->getJSON(true) ?? [];
            $tipo = strtoupper(trim($input['tipoPago'] ?? ''));
            $key = ['PAPELETA' => 'papeletaId', 'TRAMITE' => 'tramiteId', 'CURSO' => 'inscripcionId'][$tipo] ?? '';
            $pago = (new PagosTransito(\Config\Database::connect()))->generar($tipo, (int)($input[$key] ?? 0));
            return $this->respondCreated(['data' => $this->present($pago)]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo generar el pago.');
        }
    }

    public function confirmar($id = null)
    {
        try {
            $pago = (new PagosTransito(\Config\Database::connect()))->confirmar((int)$id, $this->request->getJSON(true) ?? []);
            return $this->respond(['data' => $this->present($pago)]);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            log_message('error', '{exception}', ['exception' => $e]);
            return $this->failServerError('No se pudo confirmar el pago. Compruebe que el recibo no esté duplicado.');
        }
    }

    public function delete($id = null)
    {
        try {
            (new PagosTransito(\Config\Database::connect()))->anular((int)$id);
            return $this->respond(['message' => 'Pago anulado.']);
        } catch (\DomainException $e) {
            return $this->failValidationErrors($e->getMessage());
        } catch (\Throwable $e) {
            return $this->failServerError('No se pudo anular el pago.');
        }
    }

    public function origenes()
    {
        $db = \Config\Database::connect();
        return $this->respond(['data' => [
            'PAPELETA' => $db->table('papeletas')->select('id, numero_papeleta AS nombre')->where('estado', 'PENDIENTE_PAGO')->get()->getResultArray(),
            'TRAMITE' => $db->table('tramites_documentarios')->select('id, numero_expediente AS nombre')->where('id_procedimiento_admin IS NOT NULL', null, false)->whereNotIn('estado', ['ANULADO','ANULADA'])->get()->getResultArray(),
            'CURSO' => $db->table('inscripciones_curso i')->select("i.id, CONCAT(c.nombre, ' — ', ci.nombres, ' ', ci.apellido_paterno) AS nombre", false)->join('cursos_seguridad_vial c', 'c.id=i.id_curso')->join('personas p', 'p.id=i.id_persona')->join('ciudadanos ci', 'ci.id_persona=p.id', 'left')->where('i.estado_pago !=', 'PAGADO')->whereNotIn('i.estado', ['ANULADO','CANCELADO'])->get()->getResultArray(),
        ]]);
    }
}

