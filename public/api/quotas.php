<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$city = $_GET['city'] ?? null;

if (!$city) {
    http_response_code(400);
    echo json_encode(['error' => 'Cidade não informada']);
    exit;
}

try {
    require 'db.php';
    
    $stmt = $pdo->prepare("
        SELECT a.species, a.sex, COUNT(*) as count 
        FROM animals a 
        JOIN registrations r ON a.registration_id = r.id 
        WHERE r.castration_city = ? AND r.is_cancelled = FALSE
        GROUP BY a.species, a.sex
    ");
    $stmt->execute([$city]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $counts = [
        'Cachorro' => ['Fêmea' => 0, 'Macho' => 0],
        'Gato' => ['Fêmea' => 0, 'Macho' => 0]
    ];

    foreach ($results as $row) {
        if (isset($counts[$row['species']][$row['sex']])) {
            $counts[$row['species']][$row['sex']] = (int)$row['count'];
        }
    }

    echo json_encode(['success' => true, 'counts' => $counts]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao buscar vagas: ' . $e->getMessage()]);
}
?>
