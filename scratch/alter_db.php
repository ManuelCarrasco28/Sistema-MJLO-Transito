<?php
$host = '127.0.0.1';
$db   = 'transitomunicipal';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    
    // Add numero_licencia
    try {
        $pdo->exec("ALTER TABLE ciudadanos ADD COLUMN numero_licencia VARCHAR(30) DEFAULT NULL");
        echo "Added numero_licencia column.\n";
    } catch (Exception $e) {
        echo "numero_licencia might already exist or error: " . $e->getMessage() . "\n";
    }

    // Modify foto type
    try {
        $pdo->exec("ALTER TABLE ciudadanos MODIFY foto MEDIUMTEXT DEFAULT NULL");
        echo "Modified foto column to MEDIUMTEXT.\n";
    } catch (Exception $e) {
        echo "foto column modification error: " . $e->getMessage() . "\n";
    }

} catch (\PDOException $e) {
    throw new \PDOException($e->getMessage(), (int)$e->getCode());
}
