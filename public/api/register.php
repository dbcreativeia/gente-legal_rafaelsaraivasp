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
    
    // Configuração da API de Conversões do Meta (Server-Side)
    $pixel_id = "2056890081836012";
    $access_token = "EAAEBdXO5gt0BRUZB3L5ZAkTQz6ePCyuLeSXzZBQ5Yj45yfWCHS1gIO5y8nDqZAU1UYctbFpIfXwcU2LEo9KLy61fZCEZBR8u4QR8Vj9xqHMHaQLRRMWNdRa53vTMk4J2G9RHaZBQbJZBKtGvbULA643lE4xn5cJZAllOyitkg02OvwHANkDVxl1sULHDRlLyluwZDZD";
    $client_ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $client_userAgent = $_SERVER['HTTP_USER_AGENT'] ?? '';

    function hashData($data) {
        if (empty($data)) return null;
        return hash('sha256', strtolower(trim($data)));
    }

    $nameParts = explode(" ", trim($owner['name']));
    $firstName = count($nameParts) > 0 ? $nameParts[0] : '';
    $lastName = count($nameParts) > 1 ? end($nameParts) : '';

    $event_data = [
        "data" => [
            [
                "event_name" => "CompleteRegistration",
                "event_time" => time(),
                "action_source" => "website",
                "event_id" => "reg_" . $registrationId,
                "user_data" => [
                    "client_ip_address" => $client_ip,
                    "client_user_agent" => $client_userAgent,
                    "em" => [hashData($owner['email'])],
                    "ph" => [hashData(preg_replace('/[^0-9]/', '', $owner['whatsapp']))],
                    "fn" => [hashData($firstName)],
                    "ln" => [hashData($lastName)],
                    "ct" => [hashData($owner['city'])],
                    "st" => [hashData('sp')],
                    "zp" => [hashData(preg_replace('/[^0-9]/', '', $owner['cep']))],
                    "country" => [hashData('br')]
                ],
                "custom_data" => [
                    "content_name" => "Adesivo"
                ]
            ]
        ]
    ];

    $ch = curl_init("https://graph.facebook.com/v19.0/{$pixel_id}/events?access_token={$access_token}");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($event_data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 3); // Timeout rápido para não prender o formulário do usuário
    curl_exec($ch);
    curl_close($ch);

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
