<?php

namespace App\Controllers\Api;

use CodeIgniter\RESTful\ResourceController;
use Dompdf\Dompdf;
use Dompdf\Options;

class ExportPdfController extends ResourceController
{
    protected $format = 'json';

    private const MAXIMO_FILAS = 10000;
    private const FILAS_POR_BLOQUE = 40;

    /**
     * Genera un PDF real (no una captura de pantalla) a partir de la misma
     * estructura {title, subtitle, summaryItems, columns, data} que ya arma
     * el frontend para Excel, y lo devuelve como archivo binario descargable.
     * Cada exportación queda registrada en la auditoría del sistema.
     */
    public function generar()
    {
        $input = $this->request->getJSON(true) ?: [];

        // El nombre se corta a 100 caracteres: antes un nombre enorme llenaba la auditoría y el registro del servidor
        $filename = mb_substr(trim((string) ($input['filename'] ?? 'Reporte')), 0, 100);
        $title = (string) ($input['title'] ?? 'MUNICIPALIDAD DISTRITAL JOSÉ LEONARDO ORTIZ');
        $subtitle = (string) ($input['subtitle'] ?? 'Subgerencia de Tránsito y Transporte');
        $summaryItems = is_array($input['summaryItems'] ?? null) ? $input['summaryItems'] : [];
        $columns = is_array($input['columns'] ?? null) ? $input['columns'] : [];
        $data = is_array($input['data'] ?? null) ? $input['data'] : [];
        $orientation = ($input['orientation'] ?? 'landscape') === 'portrait' ? 'portrait' : 'landscape';

        if (empty($data) || empty($columns)) {
            return $this->failValidationErrors('No hay registros para exportar a PDF.');
        }

        // Los PDF grandes necesitan más memoria y tiempo que una petición normal.
        @ini_set('memory_limit', '1024M');
        @set_time_limit(120);

        // Nunca se recorta en silencio: si el reporte excede lo que el render soporta, se avisa.
        if (count($data) > self::MAXIMO_FILAS) {
            return $this->failValidationErrors(
                'El PDF admite hasta ' . number_format(self::MAXIMO_FILAS, 0, ',', '.')
                . ' registros (se pidieron ' . number_format(count($data), 0, ',', '.')
                . '). Aplique filtros o descargue el Excel con todos los datos.'
            );
        }

        $html = $this->construirHtml($title, $subtitle, $summaryItems, $columns, $data, $filename);

        $options = new Options();
        $options->set('isRemoteEnabled', false);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->setPaper('A4', $orientation);
        $dompdf->loadHtml($html);
        $dompdf->render();

        \App\Services\AuditoriaService::registrar(
            'REPORTES',
            'EXPORTAR',
            "Exportó un PDF: \"{$filename}\" ({$this->contarRegistros($data)} registros)",
            ['filename' => $filename, 'registros' => $this->contarRegistros($data)]
        );

        $safeFilename = preg_replace('/[^a-zA-Z0-9_\-\.]/', '_', $filename);
        if (!str_ends_with($safeFilename, '.pdf')) {
            $safeFilename .= '.pdf';
        }

        return $this->response
            ->setHeader('Content-Type', 'application/pdf')
            ->setHeader('Content-Disposition', 'attachment; filename="' . $safeFilename . '"')
            ->setBody($dompdf->output());
    }

    private function contarRegistros(array $data): int
    {
        return count($data);
    }

    private function e(?string $value): string
    {
        return htmlspecialchars((string) ($value ?? ''), ENT_QUOTES, 'UTF-8');
    }

    /**
     * Devuelve el logo institucional como data URI base64, para incrustarlo
     * directamente en el PDF sin depender de red (isRemoteEnabled queda en
     * false por seguridad).
     */
    private function logoBase64(): ?string
    {
        static $cache = null;
        if ($cache !== null) {
            return $cache ?: null;
        }
        $ruta = APPPATH . 'Assets/logo-mjlo.png';
        if (!is_file($ruta)) {
            $cache = false;
            return null;
        }
        $cache = 'data:image/png;base64,' . base64_encode((string) file_get_contents($ruta));
        return $cache;
    }

    private function construirHtml(string $title, string $subtitle, array $summaryItems, array $columns, array $data, string $filename): string
    {
        $fechaEmision = date('d/m/Y H:i:s');

        $summaryHtml = '';
        if (!empty($summaryItems)) {
            $items = array_map(function ($item, $i) {
                $sep = $i > 0 ? '&middot; ' : '';
                return "<span class=\"summary-item\">{$sep}{$this->e($item['label'] ?? '')}: <strong>{$this->e((string) ($item['value'] ?? ''))}</strong></span>";
            }, $summaryItems, array_keys($summaryItems));
            $summaryHtml = '<div class="summary-bar">' . implode(' ', $items) . '</div>';
        }

        $headersHtml = '<th style="width: 28px; text-align: center;">N&deg;</th>';
        foreach ($columns as $col) {
            $align = in_array($col['align'] ?? 'left', ['left', 'right', 'center'], true) ? $col['align'] : 'left';
            $width = isset($col['width']) && is_numeric($col['width']) ? 'width:' . (int) $col['width'] . 'px;' : '';
            $headersHtml .= "<th style=\"text-align:{$align};{$width}\">{$this->e($col['header'] ?? '')}</th>";
        }

        // dompdf consume memoria de forma desproporcionada con una sola tabla enorme (3.000 filas
        // superan los 2 GB). Partir el reporte en tablas de pocas filas mantiene el consumo estable.
        $bloquesHtml = '';
        $filasBloque = '';
        $enBloque = 0;
        foreach ($data as $index => $row) {
            $bg = $index % 2 === 0 ? '#ffffff' : '#f8fafc';
            $cells = '<td class="col-n">' . ($index + 1) . '</td>';
            foreach ($columns as $col) {
                $key = $col['key'] ?? null;
                $val = $key !== null ? ($row[$key] ?? '') : '';
                if ($val === null || $val === '') {
                    $val = '&mdash;';
                } else {
                    $val = $this->e((string) $val);
                }
                $align = in_array($col['align'] ?? 'left', ['left', 'right', 'center'], true) ? $col['align'] : 'left';
                $cells .= "<td style=\"text-align:{$align};\">{$val}</td>";
            }
            $filasBloque .= "<tr style=\"background-color:{$bg};\">{$cells}</tr>";
            $enBloque++;
            if ($enBloque >= self::FILAS_POR_BLOQUE) {
                $bloquesHtml .= "<table class=\"data-table\"><thead><tr>{$headersHtml}</tr></thead><tbody>{$filasBloque}</tbody></table>";
                $filasBloque = '';
                $enBloque = 0;
            }
        }
        if ($filasBloque !== '') {
            $bloquesHtml .= "<table class=\"data-table\"><thead><tr>{$headersHtml}</tr></thead><tbody>{$filasBloque}</tbody></table>";
        }

        $logo = $this->logoBase64();
        $logoHtml = $logo
            ? "<img src=\"{$logo}\" style=\"width:52px; height:auto;\" alt=\"Logo MJLO\"/>"
            : '';

        return <<<HTML
        <!doctype html>
        <html lang="es">
        <head>
        <meta charset="utf-8"/>
        <style>
            @page { margin: 16px 20px; }
            body { font-family: 'DejaVu Sans', sans-serif; color: #0f172a; font-size: 9.5px; margin: 0; }
            .header-table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
            .header-table td { border: none; padding: 0; vertical-align: middle; }
            .header-logo-cell { width: 60px; }
            .header-border { border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 10px; }
            .title { font-size: 13.5px; font-weight: bold; color: #0f172a; text-transform: uppercase; }
            .subtitle { font-size: 9.5px; color: #475569; margin-top: 2px; }
            .meta { font-size: 8.5px; color: #64748b; text-align: right; }
            .summary-bar { margin-bottom: 10px; background: #f1f5f9; padding: 6px 10px; border-radius: 4px; font-size: 9.5px; }
            .summary-item { margin-right: 14px; }
            .summary-item strong { color: #0f172a; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 4px; table-layout: fixed; }
            table.data-table th { background-color: #0f172a; color: #ffffff; text-transform: uppercase; font-size: 8px; font-weight: bold; padding: 5px 6px; border: 1px solid #0f172a; text-align: left; }
            table.data-table td { border: 1px solid #e2e8f0; padding: 4px 6px; font-size: 9px; word-wrap: break-word; }
            table.data-table td.col-n { text-align: center; font-weight: bold; color: #64748b; width: 26px; }
            .footer { margin-top: 10px; font-size: 7.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px; }
        </style>
        </head>
        <body>
            <div class="header-border">
                <table class="header-table">
                    <tr>
                        <td class="header-logo-cell">{$logoHtml}</td>
                        <td>
                            <div class="title">{$this->e($title)}</div>
                            <div class="subtitle">{$this->e($subtitle)}</div>
                        </td>
                        <td class="meta">
                            <strong>Fecha de emisión:</strong> {$fechaEmision}<br/>
                            <strong>Sistema:</strong> MJLO Tránsito Digital v2026
                        </td>
                    </tr>
                </table>
            </div>
            {$summaryHtml}
            {$bloquesHtml}
            <div class="footer">
                Documento oficial generado para fines administrativos y fiscalización del transporte en José Leonardo Ortiz. &mdash; {$this->e($filename)}
            </div>
        </body>
        </html>
        HTML;
    }
}
