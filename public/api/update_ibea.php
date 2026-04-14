<?php
require 'db.php';

try {
    // Adiciona as novas colunas para o IBEA na tabela de animais
    $pdo->exec("ALTER TABLE animals ADD COLUMN color VARCHAR(50) DEFAULT NULL");
    $pdo->exec("ALTER TABLE animals ADD COLUMN is_vaccinated VARCHAR(10) DEFAULT NULL");
    $pdo->exec("ALTER TABLE animals ADD COLUMN is_dewormed VARCHAR(10) DEFAULT NULL");
    $pdo->exec("ALTER TABLE animals ADD COLUMN has_had_surgery VARCHAR(10) DEFAULT NULL");
    $pdo->exec("ALTER TABLE animals ADD COLUMN takes_continuous_medication VARCHAR(10) DEFAULT NULL");
    $pdo->exec("ALTER TABLE animals ADD COLUMN medication_name VARCHAR(255) DEFAULT NULL");

    echo "<h1>Colunas do IBEA adicionadas com sucesso!</h1>";
    echo "<p>O banco de dados agora está preparado para os novos campos dos animais.</p>";
} catch (Exception $e) {
    // Se der erro porque as colunas já existem, avisamos o usuário
    if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
        echo "<h1>O banco de dados já está atualizado!</h1>";
        echo "<p>As colunas do IBEA já existem na tabela.</p>";
    } else {
        echo "<h1>Erro ao atualizar banco de dados:</h1>";
        echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
    }
}
?>
