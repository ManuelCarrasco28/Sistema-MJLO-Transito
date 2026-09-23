<?php
define("FCPATH", __DIR__ . DIRECTORY_SEPARATOR);
require FCPATH . "../app/Config/Paths.php";
$paths = new Config\Paths();
require rtrim($paths->systemDirectory, "\\/ ") . DIRECTORY_SEPARATOR . "bootstrap.php";

$db = \Config\Database::connect();
$db->transStart();

try {
    $dni = "99990003";
    $db->table("personas")->insert(["id_tipo_documento" => 1, "numero" => $dni, "estado" => "ACTIVO"]);
    $id_persona = $db->insertID();

    $db->table("ciudadanos")->insert([
        "id_persona" => $id_persona,
        "nombres" => "Inspector",
        "apellido_paterno" => "Tres",
        "apellido_materno" => "Prueba"
    ]);

    $db->table("trabajadores")->insert([
        "id_persona" => $id_persona,
        "estado" => "ACTIVO"
    ]);

    $password = password_hash("Inspector3", PASSWORD_BCRYPT);
    $db->table("usuarios")->insert([
        "id_trabajador" => $id_persona,
        "nombre_usuario" => "inspector3",
        "contrasena" => $password,
        "estado" => "ACTIVO"
    ]);

    $op = $db->table("operativos")->where("estado", "ACTIVO")->orderBy("id", "DESC")->limit(1)->get()->getRowArray();
    if ($op) {
        $db->table("operativo_inspectores")->insert([
            "id_operativo" => $op["id"],
            "id_inspector" => $id_persona,
            "estado" => "ASIGNADO"
        ]);
        echo "Exito. Asignado al operativo: " . $op["id"];
    } else {
        echo "Exito. No hay operativos activos.";
    }

    $db->transCommit();
} catch (Exception $e) {
    $db->transRollback();
    echo "Error: " . $e->getMessage();
}

