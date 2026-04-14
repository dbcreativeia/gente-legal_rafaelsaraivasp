<?php
require 'db.php';

try {
    $pdo->exec("ALTER TABLE registrations ADD COLUMN is_cancelled BOOLEAN DEFAULT FALSE");
    echo "<h1>Column 'is_cancelled' added successfully!</h1>";
} catch (Exception $e) {
    echo "<h1>Error adding column:</h1>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
}
?>
