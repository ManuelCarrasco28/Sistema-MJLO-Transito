<?php
$endpoints = [
    '/api/tipos-infraccion',
    '/api/inspeccion-criterios',
    '/api/inventario-criterios',
    '/api/procedimientos-admin',
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
    $count = isset($json['data']) && is_array($json['data']) ? count($json['data']) : 'other';
    echo str_pad($ep, 35) . " => HTTP $code | Count: $count\n";
}
