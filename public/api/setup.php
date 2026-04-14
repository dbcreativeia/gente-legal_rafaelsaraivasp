<?php
require 'db.php';

try {
    // Tabela de Cadastros (Responsáveis)
    $pdo->exec("CREATE TABLE IF NOT EXISTS registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        rg VARCHAR(50) NOT NULL,
        cpf VARCHAR(50) NOT NULL,
        cep VARCHAR(20) NOT NULL,
        street VARCHAR(255) NOT NULL,
        number VARCHAR(50) NOT NULL,
        complement VARCHAR(255),
        neighborhood VARCHAR(255) NOT NULL,
        city VARCHAR(255) NOT NULL,
        state VARCHAR(2) DEFAULT 'SP',
        phone VARCHAR(50),
        whatsapp VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL,
        castration_city VARCHAR(255) DEFAULT NULL,
        is_cancelled BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    // Tabela de Animais
    $pdo->exec("CREATE TABLE IF NOT EXISTS animals (
        id INT AUTO_INCREMENT PRIMARY KEY,
        registration_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        species VARCHAR(50) NOT NULL,
        sex VARCHAR(20) NOT NULL,
        FOREIGN KEY (registration_id) REFERENCES registrations(id) ON DELETE CASCADE
    )");

    echo "<h1>Tabelas criadas com sucesso no seu banco de dados MySQL da Hostinger!</h1>";
    echo "<p>Você já pode fechar esta página e começar a usar o sistema.</p>";
} catch (Exception $e) {
    echo "<h1>Erro ao criar tabelas:</h1>";
    echo "<p>" . htmlspecialchars($e->getMessage()) . "</p>";
}
?>
