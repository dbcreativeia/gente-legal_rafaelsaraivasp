<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: x-admin-password, authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$headers = getallheaders();
$password = $headers['x-admin-password'] ?? $headers['Authorization'] ?? $headers['X-Admin-Password'] ?? '';
$adminPassword = 'castrar2026';

if ($password !== $adminPassword) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autorizado']);
    exit;
}

$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

if (!isset($data['id']) || !array_key_exists('is_cancelled', $data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos']);
    exit;
}

try {
    require 'db.php';
    
    $stmt = $pdo->prepare("UPDATE registrations SET is_cancelled = ? WHERE id = ?");
    $stmt->execute([(int)$data['is_cancelled'], (int)$data['id']]);
    
    echo json_encode(['success' => true]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao atualizar status: ' . $e->getMessage()]);
}
?>
