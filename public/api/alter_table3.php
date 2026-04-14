<?php
require 'db.php';

try {
    $pdo->exec("ALTER TABLE animals ADD COLUMN color VARCHAR(100) DEFAULT NULL");
    $pdo->exec("ALTER TABLE animals ADD COLUMN is_vaccinated BOOLEAN DEFAULT FALSE");
    $pdo->exec("ALTER TABLE animals ADD COLUMN is_dewormed BOOLEAN DEFAULT FALSE");
    $pdo->exec("ALTER TABLE animals ADD COLUMN has_had_surgery BOOLEAN DEFAULT FALSE");
    $pdo->exec("ALTER TABLE animals ADD COLUMN takes_continuous_medication BOOLEAN DEFAULT FALSE");
    $pdo->exec("ALTER TABLE animals ADD COLUMN medication_name VARCHAR(255) DEFAULT NULL");
    
    echo "<h1>Colunas dos animais adicionadas com sucesso!</h1>";
} catch (Exception $e) {
    echo "<h1>Erro ao adicionar colunas:</h1>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
}
?>
