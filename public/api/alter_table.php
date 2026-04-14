<?php
require 'db.php';

try {
    $pdo->exec("ALTER TABLE registrations ADD COLUMN castration_city VARCHAR(255) DEFAULT NULL");
    echo "Column added successfully.";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
