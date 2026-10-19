<?php

namespace App\Controllers\Api;

use App\Libraries\ProcedimientoDatos;
use App\Libraries\TupaCosto;
use App\Services\AuditoriaService;
use App\Services\CerticavPago;
use CodeIgniter\RESTful\ResourceController;
use InvalidArgumentException;

class ProcedimientosController extends ResourceController
{
    public function index()
    {
        $db = \Config\Database::connect();
        $rows = $db->table('procedimientos_administrativos pa')
            ->select('pa.id, pa.codigo, pa.nombre, pa.descripcion, pa.estado, pa.tipo_tramite AS tipoTramite, pa.plazo_atencion AS plazoAtencion, pa.base_legal AS baseLegal, '
                . TupaCosto::sql('pa') . ' AS costo, (SELECT COUNT(*) FROM tramites_documentarios t WHERE t.id_procedimiento_admin = pa.id) AS usos', false)
            ->orderBy('pa.id', 'ASC')->get()->getResultArray();
        return $this->respond(['data' => $rows]);
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();
        $row = $db->table('procedimientos_administrativos')->where('id', (int) $id)->get()->getRowArray();
        if (!$row) return $this->failNotFound('Procedimiento no encontrado.');
        $row['tarifas'] = $db->table('procedimiento_administrativo_costo')
            ->select('costo, fecha_inicio AS fechaInicio, fecha_fin AS fechaFin, estado')
            ->where('id_proc_admin', (int) $id)->orderBy('fecha_inicio', 'DESC')->orderBy('id', 'DESC')->get()->getResultArray();
        return $this->respond(['data' => $row]);
    }

    public function create()
    {
        return $this->guardar();
    }

    public function update($id = null)
    {
        return $this->guardar((int) $id);
    }

    private function guardar(?int $id = null)
    {
        $input = $this->request->getJSON(true);
        if (!is_array($input)) return $this->failValidationErrors('Se requiere un formulario JSON válido.');
        try {
            $campos = ProcedimientoDatos::validar($input);
        } catch (InvalidArgumentException $error) {
            return $this->failValidationErrors($error->getMessage());
        }
        $db = \Config\Database::connect();
        $db->transException(true)->transBegin();
        try {
            $anterior = null;
            if ($id !== null) {
                $anterior = $db->query('SELECT * FROM procedimientos_administrativos WHERE id = ? FOR UPDATE', [$id])->getRowArray();
                if (!$anterior) {
                    $db->transRollback();
                    return $this->failNotFound('Procedimiento no encontrado.');
                }
                if ($anterior['codigo'] === CerticavPago::CODIGO && $campos['codigo'] !== $anterior['codigo']) {
                    $db->transRollback();
                    return $this->failValidationErrors('El código de CERTICAV está vinculado al flujo de inspecciones y no puede cambiarse.');
                }
            }
            $duplicado = $db->table('procedimientos_administrativos')->where('codigo', $campos['codigo']);
            if ($id !== null) $duplicado->where('id !=', $id);
            if ($duplicado->countAllResults() > 0) {
                $db->transRollback();
                return $this->failValidationErrors('Ya existe un procedimiento con ese código.');
            }
            $costo = $campos['costo'];
            unset($campos['costo']);
            if ($id === null) {
                $db->table('procedimientos_administrativos')->insert($campos);
                $id = (int) $db->insertID();
            } else {
                $db->table('procedimientos_administrativos')->where('id', $id)->update($campos);
            }
            $vigente = TupaCosto::vigente($db, $id);
            if ($vigente === null || number_format($vigente, 2, '.', '') !== $costo) {
                $hoy = date('Y-m-d');
                $ayer = date('Y-m-d', strtotime($hoy . ' -1 day'));
                // Conservar el historial y cualquier tarifa futura programada.
                $db->table('procedimiento_administrativo_costo')->where('id_proc_admin', $id)
                    ->where('estado', 'ACTIVO')->where('fecha_inicio <', $hoy)
                    ->groupStart()->where('fecha_fin', null)->orWhere('fecha_fin >=', $hoy)->groupEnd()
                    ->update(['fecha_fin' => $ayer]);
                $db->table('procedimiento_administrativo_costo')->where('id_proc_admin', $id)
                    ->where('estado', 'ACTIVO')->where('fecha_inicio', $hoy)->update(['estado' => 'INACTIVO']);
                $siguiente = $db->table('procedimiento_administrativo_costo')->select('fecha_inicio')
                    ->where('id_proc_admin', $id)->where('estado', 'ACTIVO')->where('fecha_inicio >', $hoy)
                    ->orderBy('fecha_inicio', 'ASC')->get()->getRowArray();
                $db->table('procedimiento_administrativo_costo')->insert([
                    'id_proc_admin' => $id, 'costo' => $costo, 'fecha_inicio' => $hoy,
                    'fecha_fin' => $siguiente ? date('Y-m-d', strtotime($siguiente['fecha_inicio'] . ' -1 day')) : null,
                    'estado' => 'ACTIVO',
                ]);
            }
            $db->transCommit();
            AuditoriaService::registrar('PROCEDIMIENTOS', $anterior ? 'EDITAR' : 'CREAR', 'Se guardó el procedimiento ' . $campos['codigo'], [
                'id' => $id, 'antes' => $anterior, 'despues' => $campos + ['costo' => $costo],
            ]);
            return $this->respond(['message' => 'Procedimiento guardado.', 'data' => ['id' => $id]], $anterior ? 200 : 201);
        } catch (\Throwable $error) {
            $db->transRollback();
            log_message('error', 'Error guardando procedimiento: {error}', ['error' => $error->getMessage()]);
            return $this->fail('No se pudo guardar el procedimiento. Verifica si el código ya existe e intenta nuevamente.', 409);
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        $db->transException(true)->transBegin();
        try {
            $row = $db->query('SELECT * FROM procedimientos_administrativos WHERE id = ? FOR UPDATE', [(int) $id])->getRowArray();
            if (!$row) {
                $db->transRollback();
                return $this->failNotFound('Procedimiento no encontrado.');
            }
            $usos = $db->table('tramites_documentarios')->where('id_procedimiento_admin', (int) $id)->countAllResults();
            if ($usos > 0 || $row['codigo'] === CerticavPago::CODIGO) {
                $db->transRollback();
                return $this->fail('Este procedimiento está vinculado al sistema o a trámites registrados. Puedes editarlo y cambiar su estado a INACTIVO.', 409);
            }
            $db->table('procedimientos_administrativos')->where('id', (int) $id)->delete();
            $db->transCommit();
            AuditoriaService::registrar('PROCEDIMIENTOS', 'ELIMINAR', 'Se eliminó el procedimiento ' . $row['codigo'], ['id' => (int) $id, 'antes' => $row]);
            return $this->respondDeleted(['message' => 'Procedimiento eliminado.']);
        } catch (\Throwable $error) {
            $db->transRollback();
            log_message('error', 'Error eliminando procedimiento: {error}', ['error' => $error->getMessage()]);
            return $this->fail('No se puede eliminar: el procedimiento puede estar asociado a otros registros.', 409);
        }
    }
}
