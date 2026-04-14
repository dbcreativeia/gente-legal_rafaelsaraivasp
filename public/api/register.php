<?php
ini_set('display_errors', 1);
error_reporting(E_ALL);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Log errors to a file
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Pega os dados enviados pelo React
$inputJSON = file_get_contents('php://input');
$data = json_decode($inputJSON, true);

if (!$data || !isset($data['owner']) || !isset($data['animals'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos ou incompletos']);
    exit;
}

try {
    require 'db.php';
    
    // Ensure animals table has new columns (OUTSIDE TRANSACTION to avoid implicit commit)
    try {
        $pdo->exec("ALTER TABLE animals ADD COLUMN color VARCHAR(50) DEFAULT NULL");
        $pdo->exec("ALTER TABLE animals ADD COLUMN is_vaccinated VARCHAR(10) DEFAULT NULL");
        $pdo->exec("ALTER TABLE animals ADD COLUMN is_dewormed VARCHAR(10) DEFAULT NULL");
        $pdo->exec("ALTER TABLE animals ADD COLUMN has_had_surgery VARCHAR(10) DEFAULT NULL");
        $pdo->exec("ALTER TABLE animals ADD COLUMN takes_continuous_medication VARCHAR(10) DEFAULT NULL");
        $pdo->exec("ALTER TABLE animals ADD COLUMN medication_name VARCHAR(255) DEFAULT NULL");
    } catch (Exception $e) {
        // Ignore if columns already exist
    }

    // Inicia a transação (se der erro em uma parte, cancela tudo)
    $pdo->beginTransaction();

    $owner = $data['owner'];
    $castration_city = $owner['castrationCity'] ?? null;
    $campaign_type = $owner['campaignType'] ?? 'ELPA';

    if (!$castration_city) {
        throw new Exception("Cidade de castração não informada.");
    }

    $stmtQuotas = $pdo->prepare("
        SELECT a.species, a.sex, COUNT(*) as count 
        FROM animals a 
        JOIN registrations r ON a.registration_id = r.id 
        WHERE r.castration_city = ? AND r.is_cancelled = 0
        GROUP BY a.species, a.sex
    ");
    $stmtQuotas->execute([$castration_city]);
    $results = $stmtQuotas->fetchAll(PDO::FETCH_ASSOC);

    $currentCounts = [
        'Cachorro' => ['Fêmea' => 0, 'Macho' => 0],
        'Gato' => ['Fêmea' => 0, 'Macho' => 0]
    ];

    foreach ($results as $row) {
        if (isset($currentCounts[$row['species']][$row['sex']])) {
            $currentCounts[$row['species']][$row['sex']] = (int)$row['count'];
        }
    }

    // Conta os animais que estão sendo cadastrados agora
    $newAnimalsCount = [
        'Cachorro' => ['Fêmea' => 0, 'Macho' => 0],
        'Gato' => ['Fêmea' => 0, 'Macho' => 0]
    ];

    foreach ($data['animals'] as $animal) {
        $species = $animal['species'];
        $sex = $animal['sex'];
        if (isset($newAnimalsCount[$species][$sex])) {
            $newAnimalsCount[$species][$sex]++;
        }
    }

    // Verifica se excede o limite
    if ($campaign_type === 'IBEA') {
        $totalCurrent = 0;
        foreach ($currentCounts as $species => $sexes) {
            foreach ($sexes as $sex => $count) {
                $totalCurrent += $count;
            }
        }
        
        $totalNew = 0;
        foreach ($newAnimalsCount as $species => $sexes) {
            foreach ($sexes as $sex => $count) {
                $totalNew += $count;
            }
        }
        
        $total = $totalCurrent + $totalNew;
        
        if ($total > 250) {
            throw new Exception("Limite absoluto de vagas excedido (250) em $castration_city.");
        }
        
        $warning = ($total > 200) ? "Você entrou na fila de espera (vagas normais esgotadas)." : null;
    } else {
        $limits = [
            'Cachorro' => ['Fêmea' => 35, 'Macho' => 25],
            'Gato' => ['Fêmea' => 40, 'Macho' => 40]
        ];

        foreach ($newAnimalsCount as $species => $sexes) {
            foreach ($sexes as $sex => $count) {
                if ($count > 0) {
                    $total = $currentCounts[$species][$sex] + $count;
                    if ($total > $limits[$species][$sex]) {
                        $current = $currentCounts[$species][$sex];
                        $limit = $limits[$species][$sex];
                        throw new Exception("Limite de vagas excedido para $species $sex em $castration_city. (Atual: $current, Tentativa: $count, Limite: $limit)");
                    }
                }
            }
        }
        $warning = null;
    }

    // Insere o responsável
    $stmt = $pdo->prepare("INSERT INTO registrations (name, rg, cpf, cep, street, number, complement, neighborhood, city, phone, whatsapp, email, castration_city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
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
        $owner['email'],
        $castration_city
    ]);

    // Pega o ID gerado para o responsável
    $registrationId = $pdo->lastInsertId();

    // Insere os animais vinculados ao responsável
    $stmtAnimal = $pdo->prepare("INSERT INTO animals (registration_id, name, species, sex, color, is_vaccinated, is_dewormed, has_had_surgery, takes_continuous_medication, medication_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    foreach ($data['animals'] as $animal) {
        $stmtAnimal->execute([
            $registrationId, 
            $animal['name'], 
            $animal['species'], 
            $animal['sex'],
            $animal['color'] ?? null,
            $animal['is_vaccinated'] ?? null,
            $animal['is_dewormed'] ?? null,
            $animal['has_had_surgery'] ?? null,
            $animal['takes_continuous_medication'] ?? null,
            $animal['medication_name'] ?? null
        ]);
    }

    // Confirma as inserções
    $pdo->commit();
    
    // --- META CONVERSIONS API (ISOLADA) ---
    try {
        $pixel_id = '26158150727172275';
        $access_token = 'EAAEBdXO5gt0BQ6qzkFGmfP0XK1dwSp4ROPLtLyhnfapiKDyZCx5wODvZCS2jyzkb6XfZBTBB9ndGTc67LkmKGotLPgnY18KegqtcTfwZCSJvZC41h2rqZC1uplMdVfYmzFdFgs11iXYZC1sz0jM5c6ZAUTSYZA1gLEdS5WgcrbGxz85ZA3meJlxz3rkCuCN4DxVTRO0wZDZD';
        
        // Dados do usuário (Hashed para privacidade)
        $user_data = [
            'em' => [hash('sha256', strtolower(trim($owner['email'])))],
            'ph' => [hash('sha256', preg_replace('/\D/', '', $owner['whatsapp'] ?? $owner['phone'] ?? ''))],
            'fn' => [hash('sha256', strtolower(trim(explode(' ', $owner['name'])[0])))],
            'ct' => [hash('sha256', strtolower(trim($owner['city'])))],
            'st' => [hash('sha256', 'sp')],
            'country' => [hash('sha256', 'br')],
            'client_ip_address' => $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1',
            'client_user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown'
        ];

        $event_data = [
            'data' => [
                [
                    'event_name' => 'CompleteRegistration',
                    'event_time' => time(),
                    'action_source' => 'website',
                    'user_data' => $user_data,
                    'custom_data' => [
                        'registration_id' => $registrationId,
                        'city' => $castration_city
                    ]
                ]
            ]
        ];
        
        $ch = curl_init("https://graph.facebook.com/v19.0/{$pixel_id}/events?access_token={$access_token}");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($event_data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        curl_exec($ch);
        curl_close($ch);
    } catch (Exception $e) {
        // Se o Meta falhar, apenas logamos o erro e NÃO interrompemos o cadastro
        error_log("Erro Meta API: " . $e->getMessage());
    }
    // --------------------------------------

    echo json_encode(['success' => true, 'id' => $registrationId, 'message' => 'Cadastro efetuado com sucesso!', 'warning' => $warning]);
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
