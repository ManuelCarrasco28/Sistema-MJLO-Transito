<?php
require 'system/bootstrap.php';
$db = \Config\Database::connect();
if (!$db->tableExists('papeleta_fotos')) {
    $db->query("CREATE TABLE papeleta_fotos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        id_papeleta INT NOT NULL,
        foto VARCHAR(255) NOT NULL,
        fecha_created DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (id_papeleta) REFERENCES papeletas(id) ON DELETE CASCADE
    )");
    echo 'Table created';
} else {
    echo 'Table already exists';
}
