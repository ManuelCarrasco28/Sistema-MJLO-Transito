<?php require 'backend/public/index.php'; $db = \Config\Database::connect(); $q = $db->table('papeletas p')->select('p.id')->where('p.id_inspector', 3)->get()->getResultArray(); print_r($q);
