<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

/**
 * Catálogo de infracciones (tipos_infraccion): alta, edición y baja. Cambiar el porcentaje de UIT solo afecta a las
 * papeletas NUEVAS: las ya emitidas conservan el monto con el que se registraron (papeleta_detalles).
 */
class TiposInfraccionController extends ResourceController
{
    protected $format = 'json';

    private const GRAVEDADES = ['LEVE', 'GRAVE', 'MUY GRAVE'];

    public function index()
    {
        $db = \Config\Database::connect();
        $uit = (float) (new \App\Services\Multas($db))->uit((int) date('Y'));

        $rows = $db->table('tipos_infraccion ti')
            ->select('ti.id, ti.codigo, ti.descripcion, ti.gravedad, ti.porcentaje_uit AS porcentajeUit, ti.estado, (SELECT COUNT(*) FROM papeleta_detalles pd WHERE pd.id_tipo_infraccion = ti.id) AS usos', false)
            ->orderBy('ti.id', 'ASC')
            ->get()->getResultArray();

        $data = array_map(static function (array $r) use ($uit): array {
            $r['id'] = (int) $r['id'];
            $r['usos'] = (int) $r['usos'];
            $r['porcentajeUit'] = (float) $r['porcentajeUit'];
            $r['montoBase'] = round($uit * $r['porcentajeUit'] / 100, 2);
            return $r;
        }, $rows);

        return $this->respond(['data' => $data, 'uit' => $uit, 'anio' => (int) date('Y')]);
    }

    public function create()
    {
        $db = \Config\Database::connect();
        $campos = $this->validar($db, $this->request->getJSON(true) ?? [], null);
        if (is_string($campos)) {
            return $this->failValidationErrors($campos);
        }

        $db->table('tipos_infraccion')->insert($campos);
        $id = (int) $db->insertID();

        \App\Services\AuditoriaService::registrar('INFRACCIONES', 'CREAR', "Se creó la infracción {$campos['codigo']}", ['id' => $id] + $campos);

        return $this->respondCreated(['status' => 201, 'message' => 'Infracción registrada.', 'data' => ['id' => $id]]);
    }

    public function update($id = null)
    {
        $db = \Config\Database::connect();
        $actual = $db->table('tipos_infraccion')->where('id', (int) $id)->get()->getRowArray();
        if (!$actual) {
            return $this->failNotFound('Infracción no encontrada.');
        }

        $campos = $this->validar($db, $this->request->getJSON(true) ?? [], (int) $id);
        if (is_string($campos)) {
            return $this->failValidationErrors($campos);
        }

        $db->table('tipos_infraccion')->where('id', (int) $id)->update($campos);

        \App\Services\AuditoriaService::registrar('INFRACCIONES', 'EDITAR', "Se editó la infracción {$actual['codigo']}", ['id' => (int) $id, 'antes' => $actual, 'despues' => $campos]);

        return $this->respond(['status' => 200, 'message' => 'Infracción actualizada.']);
    }

    /** Si la infracción ya se usó en alguna papeleta no se borra (se perdería el historial): se desactiva. */
    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        $actual = $db->table('tipos_infraccion')->where('id', (int) $id)->get()->getRowArray();
        if (!$actual) {
            return $this->failNotFound('Infracción no encontrada.');
        }

        $usos = $db->table('papeleta_detalles')->where('id_tipo_infraccion', (int) $id)->countAllResults();
        if ($usos > 0) {
            $db->table('tipos_infraccion')->where('id', (int) $id)->update(['estado' => 'INACTIVO']);
            \App\Services\AuditoriaService::registrar('INFRACCIONES', 'DESACTIVAR', "Se desactivó la infracción {$actual['codigo']} (usada en {$usos} papeletas)", ['id' => (int) $id]);

            return $this->respond(['status' => 200, 'desactivada' => true, 'message' => "La infracción {$actual['codigo']} ya se usó en {$usos} papeletas: se desactivó (no se ofrece en papeletas nuevas) y se conserva el historial."]);
        }

        $db->table('tipos_infraccion')->where('id', (int) $id)->delete();
        \App\Services\AuditoriaService::registrar('INFRACCIONES', 'ELIMINAR', "Se eliminó la infracción {$actual['codigo']}", ['id' => (int) $id]);

        return $this->respondDeleted(['status' => 200, 'desactivada' => false, 'message' => 'Infracción eliminada.']);
    }

    /** @return array|string Campos listos para guardar, o el mensaje de error. */
    private function validar($db, array $input, ?int $idActual): array|string
    {
        $codigo = strtoupper(trim((string) ($input['codigo'] ?? '')));
        $descripcion = trim((string) ($input['descripcion'] ?? ''));
        $gravedad = strtoupper(trim((string) ($input['gravedad'] ?? '')));
        $porcentaje = $input['porcentajeUit'] ?? null;
        $estado = strtoupper(trim((string) ($input['estado'] ?? 'ACTIVO')));

        if ($codigo === '' || strlen($codigo) > 20 || !preg_match('/^[A-Z0-9][A-Z0-9\-\.]*$/', $codigo)) {
            return 'El código es obligatorio (letras, números y guiones; máximo 20 caracteres).';
        }
        if ($descripcion === '' || mb_strlen($descripcion) > 300) {
            return 'La descripción es obligatoria (máximo 300 caracteres).';
        }
        if (!in_array($gravedad, self::GRAVEDADES, true)) {
            return 'La gravedad debe ser LEVE, GRAVE o MUY GRAVE.';
        }
        if (!is_numeric($porcentaje) || (float) $porcentaje <= 0 || (float) $porcentaje > 1000) {
            return 'El porcentaje de UIT debe ser un número mayor que 0 y hasta 1000.';
        }
        if (!in_array($estado, ['ACTIVO', 'INACTIVO'], true)) {
            return 'El estado debe ser ACTIVO o INACTIVO.';
        }

        $repetido = $db->table('tipos_infraccion')->where('codigo', $codigo);
        if ($idActual !== null) {
            $repetido->where('id !=', $idActual);
        }
        if ($repetido->countAllResults() > 0) {
            return "Ya existe una infracción con el código {$codigo}.";
        }

        return [
            'codigo' => $codigo,
            'descripcion' => $descripcion,
            'gravedad' => $gravedad,
            'porcentaje_uit' => round((float) $porcentaje, 4),
            'estado' => $estado,
        ];
    }
}
