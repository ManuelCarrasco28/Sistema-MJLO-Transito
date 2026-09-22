<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;

class AuditoriaController extends ResourceController
{
    protected $format = 'json';

    public function index()
    {
        $db = \Config\Database::connect();
        if (!$db->tableExists('auditoria_logs')) {
            return $this->respond(['data' => [], 'total' => 0]);
        }

        $search = trim($this->request->getGet('search') ?? '');
        $modulo = trim($this->request->getGet('modulo') ?? '');
        $accion = trim($this->request->getGet('accion') ?? '');
        $limit = max(1, min(200, (int)($this->request->getGet('limit') ?? 50)));
        $page = max(1, (int)($this->request->getGet('page') ?? 1));
        $offset = ($page - 1) * $limit;

        $builder = $db->table('auditoria_logs');

        if ($modulo !== '' && $modulo !== 'TODOS') {
            $builder->where('modulo', strtoupper($modulo));
        }

        if ($accion !== '' && $accion !== 'TODOS') {
            $builder->where('accion', strtoupper($accion));
        }

        if ($search !== '') {
            $builder->groupStart()
                ->like('descripcion', $search)
                ->orLike('nombre_usuario', $search)
                ->orLike('rol', $search)
                ->orLike('ip', $search)
                ->orLike('modulo', $search)
                ->groupEnd();
        }

        $totalBuilder = clone $builder;
        $total = $totalBuilder->countAllResults();

        $rows = $builder->orderBy('fecha_hora', 'DESC')
            ->limit($limit, $offset)
            ->get()
            ->getResultArray();

        $data = array_map(static function (array $r) {
            $r['id'] = (int)$r['id'];
            $r['detalles'] = $r['detalles'] ? json_decode($r['detalles'], true) : null;
            return $r;
        }, $rows);

        return $this->respond([
            'data' => $data,
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
        ]);
    }

    public function estadisticas()
    {
        $db = \Config\Database::connect();
        if (!$db->tableExists('auditoria_logs')) {
            return $this->respond(['data' => ['total' => 0, 'hoy' => 0, 'porModulo' => []]]);
        }

        $total = $db->table('auditoria_logs')->countAllResults();
        $hoy = $db->table('auditoria_logs')->where('DATE(fecha_hora)', date('Y-m-d'))->countAllResults();

        $porModulo = $db->table('auditoria_logs')
            ->select('modulo, COUNT(*) as cantidad')
            ->groupBy('modulo')
            ->orderBy('cantidad', 'DESC')
            ->get()
            ->getResultArray();

        return $this->respond([
            'data' => [
                'total' => $total,
                'hoy' => $hoy,
                'porModulo' => $porModulo,
            ]
        ]);
    }
}
