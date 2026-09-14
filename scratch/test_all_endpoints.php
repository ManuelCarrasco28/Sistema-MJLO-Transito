<?php
$endpoints = [
    '/api/status',
    '/api/dashboard',
    '/api/vehiculos',
    '/api/personas',
    '/api/personal',
    '/api/organizaciones',
    '/api/documentos',
    '/api/inspecciones',
    '/api/cursos',
    '/api/papeletas',
    '/api/papeletas/infracciones',
    '/api/pagos',
    '/api/permisos',
    '/api/permisos/procedimientos',
    '/api/internamientos',
    '/api/internamientos/criterios',
];

foreach ($endpoints as $ep) {
    $url = "http://localhost:8080" . $ep;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $json = json_decode($response, true);
    $count = isset($json['data']) && is_array($json['data']) ? count($json['data']) : (isset($json['status']) ? 'status:' . json_encode($json['status']) : 'other');
    echo str_pad($ep, 35) . " => HTTP $code | Count/Result: $count\n";
    if ($code >= 400) {
        echo "   Error body: " . substr($response, 0, 150) . "\n";
    }
}
