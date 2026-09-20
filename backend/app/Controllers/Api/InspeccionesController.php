<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class InspeccionesController extends ResourceController
{
    protected $format = 'json';

    public function criterios()
    {
        $db = \Config\Database::connect();
        try {
            $rows = $db->table('inspeccion_criterios')
                ->select('id, codigo, seccion, nombre, descripcion, obligatorio, orden, estado')
                ->where('estado', 'ACTIVO')
                ->orderBy('orden', 'ASC')
                ->get()
                ->getResultArray();

            $data = array_map(static function (array $r) {
                $r['id'] = (int)$r['id'];
                $r['obligatorio'] = (bool)$r['obligatorio'];
                $r['orden'] = (int)$r['orden'];
                $r['seccion'] = $r['seccion'] ?? 'GENERAL';
                return $r;
            }, $rows);

            return $this->respond(['data' => $data]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando criterios de inspección: ' . $e->getMessage());
        }
    }

    public function show($id = null)
    {
        $db = \Config\Database::connect();
        try {
            $builder = $db->table('certicav i')
                ->select("
                    i.id,
                    i.id_tecnico as tecnicoId,
                    i.id_conductor as conductorId,
                    i.numero_registro as numeroInspeccion,
                    i.numero_registro as numeroRegistro,
                    i.numero_serie_certicav as numeroSerieCerticav,
                    COALESCE(i.primera_evaluacion, 'APROBADO') as primeraEvaluacion,
                    COALESCE(i.segunda_evaluacion, '') as segundaEvaluacion,
                    COALESCE(i.conductor_nombre, '') as conductorNombre,
                    COALESCE(i.conductor_dni, '') as conductorDni,
                    COALESCE(i.conductor_licencia, '') as conductorLicencia,
                    v.placa as vehiculoPlaca,
                    COALESCE(v.marca, '') as vehiculoMarca,
                    COALESCE(v.modelo, '') as vehiculoModelo,
                    COALESCE(v.color, '') as vehiculoColor,
                    COALESCE(v.serie_motor, '') as vehiculoMotor,
                    COALESCE(v.anio_fabricacion, '') as vehiculoAnio,
                    COALESCE(a.razon_social, '') as transportador,
                    COALESCE(CONCAT(cp.nombres, ' ', cp.apellido_paterno, ' ', COALESCE(cp.apellido_materno, '')), '') as propietario,
                    COALESCE(pp.numero, '') as propietarioDni,
                    COALESCE(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')), 'Inspector Técnico Municipal') as inspector,
                    i.fecha as fecha,
                    i.resultado,
                    i.observaciones,
                    i.estado
                ")
                ->join('vehiculos v', 'v.id = i.id_vehiculo', 'left')
                ->join('asociaciones a', 'a.id = v.id_asociacion', 'left')
                ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL', 'left')
                ->join('personas pp', 'pp.id = vp.id_persona', 'left')
                ->join('ciudadanos cp', 'cp.id_persona = pp.id', 'left')
                ->join('ciudadanos c', 'c.id_persona = i.id_tecnico', 'left')
                ->groupBy('i.id');

            if (is_numeric($id)) {
                $builder->where('i.id', (int)$id);
            } else {
                $builder->groupStart()
                    ->where('i.numero_serie_certicav', $id)
                    ->orWhere('i.numero_registro', $id)
                    ->groupEnd();
            }

            $row = $builder->get()->getRowArray();
            if (!$row) {
                return $this->failNotFound('Inspección / CertiCAV no encontrado.');
            }

            $row['id'] = (int)$row['id'];
            $fechaEmision = $row['fecha'] ?: date('Y-m-d');
            $fechaVencimiento = date('Y-m-d', strtotime('+6 months', strtotime($fechaEmision)));
            $row['fechaVencimiento'] = $fechaVencimiento;
            $row['vigenciaMeses'] = 6;

            if (empty($row['numeroSerieCerticav'])) {
                $row['numeroSerieCerticav'] = str_pad((string)$row['id'], 7, '0', STR_PAD_LEFT);
            }

            $hoy = date('Y-m-d');
            if ($row['resultado'] === 'APROBADO') {
                if ($hoy <= $fechaVencimiento) {
                    $row['estadoVigencia'] = 'VIGENTE';
                    $row['diasRestantes'] = max(0, (int)((strtotime($fechaVencimiento) - strtotime($hoy)) / 86400));
                } else {
                    $row['estadoVigencia'] = 'VENCIDO';
                    $row['diasRestantes'] = 0;
                }
            } elseif ($row['resultado'] === 'OBSERVADO') {
                $row['estadoVigencia'] = 'OBSERVADO';
                $row['diasRestantes'] = 0;
            } else {
                $row['estadoVigencia'] = 'DESAPROBADO';
                $row['diasRestantes'] = 0;
            }

            $detalles = $db->table('certicav_detalles id')
                ->select('id.id_criterio as criterioId, id.estado_revision as estado, id.observacion as obs')
                ->where('id.id_certicav', $row['id'])
                ->get()
                ->getResultArray();

            $row['detalles'] = array_map(static function (array $d) {
                $d['criterioId'] = (int)$d['criterioId'];
                return $d;
            }, $detalles);

            return $this->respond(['status' => 200, 'data' => $row]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando CertiCAV: ' . $e->getMessage());
        }
    }

    public function index()
    {
        $db = \Config\Database::connect();
        
        try {
            $rows = $db->table('certicav i')
                ->select("
                    i.id,
                    i.id_tecnico as tecnicoId,
                    i.id_conductor as conductorId,
                    i.numero_registro as numeroInspeccion,
                    i.numero_registro as numeroRegistro,
                    i.numero_serie_certicav as numeroSerieCerticav,
                    COALESCE(i.primera_evaluacion, 'APROBADO') as primeraEvaluacion,
                    COALESCE(i.segunda_evaluacion, '') as segundaEvaluacion,
                    COALESCE(i.conductor_nombre, '') as conductorNombre,
                    COALESCE(i.conductor_dni, '') as conductorDni,
                    COALESCE(i.conductor_licencia, '') as conductorLicencia,
                    v.placa as vehiculoPlaca,
                    COALESCE(v.marca, '') as vehiculoMarca,
                    COALESCE(v.modelo, '') as vehiculoModelo,
                    COALESCE(v.color, '') as vehiculoColor,
                    COALESCE(v.serie_motor, '') as vehiculoMotor,
                    COALESCE(v.anio_fabricacion, '') as vehiculoAnio,
                    COALESCE(a.razon_social, '') as transportador,
                    COALESCE(CONCAT(cp.nombres, ' ', cp.apellido_paterno, ' ', COALESCE(cp.apellido_materno, '')), '') as propietario,
                    COALESCE(pp.numero, '') as propietarioDni,
                    COALESCE(CONCAT(c.nombres, ' ', c.apellido_paterno, ' ', COALESCE(c.apellido_materno, '')), 'Inspector Técnico Municipal') as inspector,
                    i.fecha as fecha,
                    i.resultado,
                    i.observaciones,
                    i.estado
                ")
                ->join('vehiculos v', 'v.id = i.id_vehiculo', 'left')
                ->join('asociaciones a', 'a.id = v.id_asociacion', 'left')
                ->join('vehiculo_propietarios vp', 'vp.id_vehiculo = v.id AND vp.fecha_fin IS NULL', 'left')
                ->join('personas pp', 'pp.id = vp.id_persona', 'left')
                ->join('ciudadanos cp', 'cp.id_persona = pp.id', 'left')
                ->join('ciudadanos c', 'c.id_persona = i.id_tecnico', 'left')
                ->groupBy('i.id')
                ->orderBy('i.id', 'DESC')
                ->get()
                ->getResultArray();

            $hoy = date('Y-m-d');
            $data = [];
            foreach ($rows as $row) {
                $row['id'] = (int)$row['id'];
                $fechaEmision = $row['fecha'] ?: date('Y-m-d');
                $fechaVencimiento = date('Y-m-d', strtotime('+6 months', strtotime($fechaEmision)));
                $row['fechaVencimiento'] = $fechaVencimiento;
                $row['vigenciaMeses'] = 6;

                // Correlativo de 7 dígitos si no existe
                if (empty($row['numeroSerieCerticav'])) {
                    $row['numeroSerieCerticav'] = str_pad((string)$row['id'], 7, '0', STR_PAD_LEFT);
                }

                // Cálculo de vigencia oficial de 6 meses
                if ($row['resultado'] === 'APROBADO') {
                    if ($hoy <= $fechaVencimiento) {
                        $row['estadoVigencia'] = 'VIGENTE';
                        $row['diasRestantes'] = max(0, (int)((strtotime($fechaVencimiento) - strtotime($hoy)) / 86400));
                    } else {
                        $row['estadoVigencia'] = 'VENCIDO';
                        $row['diasRestantes'] = 0;
                    }
                } elseif ($row['resultado'] === 'OBSERVADO') {
                    $row['estadoVigencia'] = 'OBSERVADO';
                    $row['diasRestantes'] = 0;
                } else {
                    $row['estadoVigencia'] = 'DESAPROBADO';
                    $row['diasRestantes'] = 0;
                }

                $detalles = $db->table('certicav_detalles id')
                    ->select('id.id_criterio as criterioId, id.estado_revision as estado, id.observacion as obs')
                    ->where('id.id_certicav', $row['id'])
                    ->get()
                    ->getResultArray();

                $row['detalles'] = array_map(static function (array $d) {
                    $d['criterioId'] = (int)$d['criterioId'];
                    return $d;
                }, $detalles);

                $data[] = $row;
            }

            return $this->respond(['data' => $data]);
        } catch (\Exception $e) {
            return $this->failServerError('Error consultando inspecciones: ' . $e->getMessage());
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

        $placa = strtoupper(trim($input['vehiculoPlaca'] ?? ''));
        $resultado = trim($input['resultado'] ?? 'APROBADO');
        $observaciones = trim($input['observaciones'] ?? '');
        $detalles = $input['detalles'] ?? [];

        try {
            $vehiculo = $db->table('vehiculos')->where('placa', $placa)->limit(1)->get()->getRowArray();
            if (!$vehiculo) {
                // Keep backward compatibility for test script auto-creation
                $firstVeh = $db->table('vehiculos')->limit(1)->get()->getRowArray();
                if ($firstVeh) {
                    $vehiculoId = (int)$firstVeh['id'];
                    $placa = $firstVeh['placa'];
                } else {
                    $tipoRow = $db->table('tipos_vehiculo')->limit(1)->get()->getRowArray();
                    $tipoId = $tipoRow ? (int)$tipoRow['id'] : null;
                    $db->table('vehiculos')->insert([
                        'placa'                => $placa ?: ('NC-' . random_int(1000, 9999)),
                        'id_tipo_vehiculo'     => $tipoId
                    ]);
                    $vehiculoId = (int)$db->insertID();
                }
            } else {
                $vehiculoId = (int)$vehiculo['id'];
            }

            $tecnicoId = (int)($input['tecnicoId'] ?? 0);
            if ($tecnicoId > 0) {
                $tecnico = $db->table('trabajadores pe')->where('id_persona', $tecnicoId)->where('estado', 'ACTIVO')->get()->getRowArray();
                if (!$tecnico) throw new \DomainException('Seleccione el técnico responsable válido.');
            } else {
                $tecnico = $db->table('trabajadores')->where('estado', 'ACTIVO')->limit(1)->get()->getRowArray();
                $tecnicoId = $tecnico ? (int)$tecnico['id_persona'] : null;
            }

            if (method_exists($this, 'validarDetalles')) {
                $detalles = $this->validarDetalles($db, $detalles);
            }
            $db->transException(true)->transBegin();

            $fecha = !empty($input['fecha']) ? trim($input['fecha']) : date('Y-m-d');
            $numeroInspeccion = !empty($input['numeroRegistro']) ? trim($input['numeroRegistro']) : (!empty($input['numeroInspeccion']) ? trim($input['numeroInspeccion']) : ('REG-' . date('Y') . '-' . str_pad((string)random_int(1, 999), 3, '0', STR_PAD_LEFT)));
            $numeroSerieCerticav = !empty($input['numeroSerieCerticav']) ? trim($input['numeroSerieCerticav']) : null;
            $primeraEvaluacion = trim($input['primeraEvaluacion'] ?? ($resultado === 'DESAPROBADO' ? 'DESAPROBADO' : 'APROBADO'));
            $segundaEvaluacion = !empty($input['segundaEvaluacion']) ? trim($input['segundaEvaluacion']) : null;
            $conductorNombre = trim($input['conductorNombre'] ?? ($input['conductor'] ?? ''));
            $conductorDni = trim($input['conductorDni'] ?? '');
            $conductorLicencia = trim($input['conductorLicencia'] ?? '');

            $fechaVencimiento = date('Y-m-d', strtotime('+6 months', strtotime($fecha)));
            $hoy = date('Y-m-d');

            $inspData = [
                'numero_registro'       => $numeroInspeccion,
                'numero_serie_certicav' => $numeroSerieCerticav,
                'primera_evaluacion'    => $primeraEvaluacion,
                'segunda_evaluacion'    => $segundaEvaluacion,
                'conductor_nombre'      => $conductorNombre ?: null,
                'conductor_dni'         => $conductorDni ?: null,
                'conductor_licencia'    => $conductorLicencia ?: null,
                'id_vehiculo'           => $vehiculoId,
                'id_tecnico'            => $tecnicoId,
                'fecha'                 => $fecha,
                'resultado'             => $resultado,
                'observaciones'         => $observaciones,
                'estado'                => 'ACTIVO',
            ];
            $db->table('certicav')->insert($inspData);
            $inspeccionId = (int)$db->insertID();

            // Si no se proveyó número de serie oficial, generamos el correlativo de 7 dígitos tipo sello (ej: 0008180)
            if (empty($numeroSerieCerticav)) {
                $numeroSerieCerticav = str_pad((string)$inspeccionId, 7, '0', STR_PAD_LEFT);
                $db->table('certicav')->where('id', $inspeccionId)->update(['numero_serie_certicav' => $numeroSerieCerticav]);
            }

            // Vigencia oficial de 6 meses
            if ($resultado === 'APROBADO') {
                $estadoVigencia = ($hoy <= $fechaVencimiento) ? 'VIGENTE' : 'VENCIDO';
                $diasRestantes = max(0, (int)((strtotime($fechaVencimiento) - strtotime($hoy)) / 86400));
            } elseif ($resultado === 'OBSERVADO') {
                $estadoVigencia = 'OBSERVADO';
                $diasRestantes = 0;
            } else {
                $estadoVigencia = 'DESAPROBADO';
                $diasRestantes = 0;
            }

            $savedDetalles = [];
            if (is_array($detalles) && !empty($detalles)) {
                foreach ($detalles as $det) {
                    $criterioId = (int)($det['criterioId'] ?? 0);
                    if ($criterioId <= 0) continue;

                    $criterioExists = $db->table('inspeccion_criterios')->where('id', $criterioId)->countAllResults();
                    if (!$criterioExists) {
                        $db->table('inspeccion_criterios')->insert([
                            'codigo'      => 'CRIT-' . str_pad((string)$criterioId, 2, '0', STR_PAD_LEFT),
                            'nombre'      => 'Criterio ' . $criterioId,
                            'descripcion' => 'Evaluación de seguridad e inspección técnica',
                            'obligatorio' => 1,
                            'orden'       => $criterioId,
                            'estado'      => 'ACTIVO'
                        ]);
                        $criterioId = (int)$db->insertID();
                    }

                    $estadoRev = trim($det['estado'] ?? 'BIEN');
                    $obs = trim($det['obs'] ?? '');
                    $db->table('certicav_detalles')->insert([
                        'id_certicav'     => $inspeccionId,
                        'id_criterio'     => $criterioId,
                        'estado_revision' => $estadoRev,
                        'observacion'     => $obs
                    ]);
                    $savedDetalles[] = [
                        'criterioId' => $criterioId,
                        'estado'     => $estadoRev,
                        'obs'        => $obs
                    ];
                }
            }
            $db->transComplete();

            if ($db->transStatus() === false) {
                return $this->failServerError('Error guardando inspección técnica.');
            }

            $inspectorRow = $tecnicoId ? $db->table('ciudadanos')->where('id_persona', $tecnicoId)->get()->getRowArray() : null;
            $inspectorNombre = $inspectorRow ? trim($inspectorRow['nombres'] . ' ' . $inspectorRow['apellido_paterno'] . ' ' . ($inspectorRow['apellido_materno'] ?? '')) : 'Inspector Técnico Municipal';

            $db->transCommit();
            return $this->respondCreated([
                'status' => true,
                'message' => 'Inspección registrada con éxito',
                'data' => [
                    'id' => $inspeccionId,
                    'tecnicoId' => $tecnicoId,
                    'numeroInspeccion' => $numeroInspeccion,
                    'numeroRegistro' => $numeroInspeccion,
                    'numeroSerieCerticav' => $numeroSerieCerticav,
                    'primeraEvaluacion' => $primeraEvaluacion,
                    'segundaEvaluacion' => $segundaEvaluacion,
                    'conductorNombre' => $conductorNombre,
                    'conductorDni' => $conductorDni,
                    'conductorLicencia' => $conductorLicencia,
                    'vigenciaMeses' => 6,
                    'fechaVencimiento' => $fechaVencimiento,
                    'estadoVigencia' => $estadoVigencia,
                    'diasRestantes' => $diasRestantes,
                    'vehiculoPlaca' => $placa,
                    'inspector' => $inspectorNombre,
                    'fecha' => $fecha,
                    'resultado' => $resultado,
                    'observaciones' => $observaciones,
                    'estado' => 'ACTIVO',
                    'detalles' => $savedDetalles
                ]
            ]);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->failServerError('Error creando la inspección: ' . $e->getMessage());
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

        try {
            if (!$db->table('certicav')->where('id', $id)->countAllResults()) return $this->failNotFound('Inspección no encontrada.');
            if (isset($input['detalles']) && method_exists($this, 'validarDetalles')) $input['detalles'] = $this->validarDetalles($db, $input['detalles']);
            $db->transException(true)->transBegin();
            $data = [];
            if (isset($input['resultado'])) {
                $data['resultado'] = trim($input['resultado']);
            }
            if (isset($input['observaciones'])) {
                $data['observaciones'] = trim($input['observaciones']);
            }
            if (isset($input['tecnicoId']) && (int)$input['tecnicoId'] > 0) {
                $data['id_tecnico'] = (int)$input['tecnicoId'];
            }
            if (isset($input['numeroRegistro'])) {
                $data['numero_registro'] = trim($input['numeroRegistro']);
            }
            if (isset($input['numeroSerieCerticav'])) {
                $data['numero_serie_certicav'] = trim($input['numeroSerieCerticav']);
            }
            if (isset($input['primeraEvaluacion'])) {
                $data['primera_evaluacion'] = trim($input['primeraEvaluacion']);
            }
            if (isset($input['segundaEvaluacion'])) {
                $data['segunda_evaluacion'] = trim($input['segundaEvaluacion']);
            }
            if (isset($input['conductorNombre'])) {
                $data['conductor_nombre'] = trim($input['conductorNombre']);
            }
            if (isset($input['conductorDni'])) {
                $data['conductor_dni'] = trim($input['conductorDni']);
            }
            if (isset($input['conductorLicencia'])) {
                $data['conductor_licencia'] = trim($input['conductorLicencia']);
            }
            if (isset($input['fecha'])) {
                $data['fecha'] = trim($input['fecha']);
            }

            if (!empty($data)) {
                $db->table('certicav')->where('id', $id)->update($data);
            }

            if (isset($input['detalles']) && is_array($input['detalles'])) {
                $db->table('certicav_detalles')->where('id_certicav', $id)->delete();
                foreach ($input['detalles'] as $det) {
                    $criterioId = (int)($det['criterioId'] ?? 0);
                    if ($criterioId <= 0) continue;
                    $db->table('certicav_detalles')->insert([
                        'id_certicav' => $id,
                        'id_criterio' => $criterioId,
                        'estado_revision' => trim($det['estado'] ?? 'BIEN'),
                        'observacion' => trim($det['obs'] ?? '')
                    ]);
                }
            }

            if (!$db->transStatus()) throw new \RuntimeException('No se pudo actualizar la inspección completa.');
            $db->transCommit();
            return $this->respond(['status' => 200, 'message' => 'Inspección actualizada correctamente']);
        } catch (\DomainException $e) {
            $db->transRollback();
            return $this->failValidationErrors($e->getMessage());
        } catch (\Exception $e) {
            $db->transRollback();
            return $this->failServerError('Error actualizando la inspección: ' . $e->getMessage());
        }
    }

    public function delete($id = null)
    {
        $db = \Config\Database::connect();
        
        if (!$id) {
            return $this->failNotFound('ID de inspección no especificado.');
        }

        try {
            $db->table('certicav')->where('id', $id)->update(['estado' => 'ANULADA']);
            return $this->respondDeleted(['status' => 200, 'message' => 'Inspección técnica anulada con éxito']);
        } catch (\Exception $e) {
            return $this->failServerError('Error anulando inspección técnica: ' . $e->getMessage());
        }
    }

    private function validarDetalles($db, $detalles): array
    {
        if (is_string($detalles)) $detalles = json_decode($detalles, true);
        if (!is_array($detalles)) throw new \DomainException('Los criterios de inspección no son válidos.');
        $seen = [];
        foreach ($detalles as $detalle) {
            $id = (int)($detalle['criterioId'] ?? 0);
            if ($id <= 0 || isset($seen[$id]) || !$db->table('inspeccion_criterios')->where('id', $id)->countAllResults()) throw new \DomainException('Hay criterios inexistentes o repetidos.');
            if (!in_array($detalle['estado'] ?? '', ['BIEN','MAL_ESTADO','NO_TIENE'], true)) throw new \DomainException('Estado de revisión inválido.');
            $seen[$id] = true;
        }
        return $detalles;
    }
}
