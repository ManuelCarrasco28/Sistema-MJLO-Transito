<?php
$files = shell_exec('git diff --name-only --diff-filter=U');
$files = explode("\n", trim($files));
foreach($files as $file) {
    if(!$file) continue;
    echo "\n=== $file ===\n";
    $lines = file($file);
    $inConflict = false;
    foreach($lines as $i => $line) {
        if (strpos($line, '<<<<<<< HEAD') === 0) {
            $inConflict = true;
            echo "Line $i:\n";
        }
        if ($inConflict) echo $line;
        if (strpos($line, '>>>>>>>') === 0) {
            $inConflict = false;
            echo "\n";
        }
    }
}
