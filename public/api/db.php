<?php
// Configurações do Banco de Dados MySQL na Hostinger
// Substitua com os dados que você criar no painel da Hostinger

$host = 'localhost'; // Na Hostinger, geralmente é localhost
$db   = 'u889193614_nome_do_banco'; // Ex: u889193614_castracoes
$user = 'u889193614_usuario'; // Ex: u889193614_admin
$pass = 'SuaSenhaForte123!'; // A senha que você criar lá
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
     $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
     // Lançar a exceção para que o arquivo que incluiu db.php (ex: registrations.php)
     // possa capturar e retornar um erro 500 com JSON válido.
     throw new Exception("Erro de conexão com o banco de dados: " . $e->getMessage());
}
?>
