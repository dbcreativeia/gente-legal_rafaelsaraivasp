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
        
        // Delete animals first to avoid foreign key constraints
        $stmtAnimals = $pdo->prepare("DELETE FROM animals WHERE registration_id = ?");
        $stmtAnimals->execute([$id]);
        
        // Delete registration
        $stmtReg = $pdo->prepare("DELETE FROM registrations WHERE id = ?");
        $stmtReg->execute([$id]);
        
        $pdo->commit();
        
        echo json_encode(['success' => true]);
        exit;
    }
    
    // Busca os cadastros e os animais de cada um
    $stmt = $pdo->query("
        SELECT 
            r.*, 
            r.castration_city,
            a.id as animal_id,
            a.name as animal_name,
            a.species as animal_species,
            a.sex as animal_sex,
            a.color as animal_color,
            a.is_vaccinated as animal_is_vaccinated,
            a.is_dewormed as animal_is_dewormed,
            a.has_had_surgery as animal_has_had_surgery,
            a.takes_continuous_medication as animal_takes_continuous_medication,
            a.medication_name as animal_medication_name
        FROM registrations r
        LEFT JOIN animals a ON r.id = a.registration_id
        ORDER BY r.created_at DESC
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
