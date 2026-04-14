<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Pega os dados enviados pelo React
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

if (!$data || !isset($data['owner'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos ou incompletos']);
    exit;
}

try {
    require 'db.php';

    // Inicia a transação
    $pdo->beginTransaction();

    $owner = $data['owner'];

    // Insere o responsável
    $stmt = $pdo->prepare("INSERT INTO registrations (name, rg, cpf, cep, street, number, complement, neighborhood, city, phone, whatsapp, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    $stmt->execute([
        $owner['name'], 
        $owner['rg'], 
        $owner['cpf'], 
        $owner['cep'], 
        $owner['street'], 
        $owner['number'],
        $owner['complement'] ?? null, 
        $owner['neighborhood'], 
        $owner['city'], 
        $owner['phone'] ?? null, 
        $owner['whatsapp'], 
        $owner['email']
    ]);

    // Pega o ID gerado
    $registrationId = $pdo->lastInsertId();

    // Confirma as inserções
    $pdo->commit();
    
    echo json_encode(['success' => true, 'id' => $registrationId, 'message' => 'Cadastro efetuado com sucesso!']);
    exit;

} catch (Exception $e) {
    // Cancela tudo se deu erro
    if (isset($pdo) && $pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Erro interno ao salvar no banco: ' . $e->getMessage()]);
    exit;
}
?>
