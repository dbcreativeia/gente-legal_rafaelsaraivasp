<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: x-admin-password, authorization, Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Pega a senha enviada pelo React
$headers = getallheaders();
$password = $headers['x-admin-password'] ?? $headers['Authorization'] ?? $headers['X-Admin-Password'] ?? '';
$adminPassword = 'castrar2026'; // A mesma senha que você usava antes

if ($password !== $adminPassword) {
    http_response_code(401);
    echo json_encode(['error' => 'Não autorizado']);
    exit;
}

try {
    require 'db.php';
    
    if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
        if (!isset($_GET['id'])) {
            http_response_code(400);
            echo json_encode(['error' => 'ID não fornecido']);
            exit;
        }
        
        $id = (int)$_GET['id'];
        
        $pdo->beginTransaction();
        
        // Delete registration
        $stmtReg = $pdo->prepare("DELETE FROM registrations WHERE id = ?");
        $stmtReg->execute([$id]);
        
        $pdo->commit();
        
        echo json_encode(['success' => true]);
        exit;
    }
    
    // Busca os cadastros
    $stmt = $pdo->query("
        SELECT *
        FROM registrations
        ORDER BY created_at DESC
    ");
    
    $registrations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Converte is_cancelled
    foreach ($registrations as &$r) {
        $r['is_cancelled'] = (bool)$r['is_cancelled'];
    }

    echo json_encode($registrations);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode(['error' => 'Erro na operação: ' . $e->getMessage()]);
}
?>
