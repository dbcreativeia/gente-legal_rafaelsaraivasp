<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: x-admin-password, authorization, Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Ensure table exists
try {
    require 'db.php';
    
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS campaigns (
            id INT AUTO_INCREMENT PRIMARY KEY,
            city VARCHAR(255) NOT NULL,
            type ENUM('ELPA', 'IBEA') NOT NULL DEFAULT 'ELPA',
            end_date DATE NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ");
    
    // Insert default campaigns if table is empty
    /*
    $stmt = $pdo->query("SELECT COUNT(*) FROM campaigns");
    if ($stmt->fetchColumn() == 0) {
        $defaultCampaigns = [
            ['city' => 'Orindiúva', 'date' => '2026-04-02'],
            ['city' => 'Olímpia', 'date' => '2026-04-04'],
            ['city' => 'Olímpia', 'date' => '2026-04-05'],
            ['city' => 'Severínia', 'date' => '2026-04-06'],
            ['city' => 'Pindorama', 'date' => '2026-04-07'],
            ['city' => 'Urupês', 'date' => '2026-04-08'],
            ['city' => 'Planalto', 'date' => '2026-04-10'],
            ['city' => 'Adolfo', 'date' => '2026-04-11'],
        ];
        $stmt = $pdo->prepare("INSERT INTO campaigns (city, type, end_date) VALUES (?, 'ELPA', ?)");
        foreach ($defaultCampaigns as $camp) {
            $stmt->execute([$camp['city'], $camp['date']]);
        }
    }
    */
    // Optional: Ensure these specific dates exist even if table is not empty
    /*
    $defaultCampaigns = [
        ['city' => 'Orindiúva', 'date' => '2026-04-02'],
        ['city' => 'Olímpia', 'date' => '2026-04-04'],
        ['city' => 'Olímpia', 'date' => '2026-04-05'],
        ['city' => 'Severínia', 'date' => '2026-04-06'],
        ['city' => 'Pindorama', 'date' => '2026-04-07'],
        ['city' => 'Urupês', 'date' => '2026-04-08'],
        ['city' => 'Planalto', 'date' => '2026-04-10'],
        ['city' => 'Adolfo', 'date' => '2026-04-11'],
    ];
    $stmtCheck = $pdo->prepare("SELECT COUNT(*) FROM campaigns WHERE city = ? AND end_date = ?");
    $stmtInsert = $pdo->prepare("INSERT INTO campaigns (city, type, end_date) VALUES (?, 'ELPA', ?)");
    foreach ($defaultCampaigns as $camp) {
        $stmtCheck->execute([$camp['city'], $camp['date']]);
        if ($stmtCheck->fetchColumn() == 0) {
            $stmtInsert->execute([$camp['city'], $camp['date']]);
        }
    }
    */
} catch (Exception $e) {
    // Ignore table creation errors if it already exists
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    try {
        $stmt = $pdo->query("SELECT * FROM campaigns ORDER BY end_date ASC, city ASC");
        $campaigns = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($campaigns);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Erro ao buscar campanhas: ' . $e->getMessage()]);
    }
    exit;
}

// For POST, PUT, DELETE, check admin password
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

try {
    if ($method === 'POST') {
        $stmt = $pdo->prepare("INSERT INTO campaigns (city, type, end_date, is_active) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $data['city'],
            $data['type'],
            $data['end_date'],
            $data['is_active'] ?? true
        ]);
        echo json_encode(['success' => true, 'id' => $pdo->lastInsertId()]);
    } elseif ($method === 'PUT') {
        $stmt = $pdo->prepare("UPDATE campaigns SET city = ?, type = ?, end_date = ?, is_active = ? WHERE id = ?");
        $stmt->execute([
            $data['city'],
            $data['type'],
            $data['end_date'],
            $data['is_active'],
            $data['id']
        ]);
        echo json_encode(['success' => true]);
    } elseif ($method === 'DELETE') {
        $stmt = $pdo->prepare("DELETE FROM campaigns WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao salvar campanha: ' . $e->getMessage()]);
}
?>
