<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: x-admin-password, authorization, Content-Type');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Authenticate
$headers = getallheaders();
$password = $headers['x-admin-password'] ?? $headers['Authorization'] ?? $headers['X-Admin-Password'] ?? '';
$adminPassword = 'castrar2026';

if ($password !== $adminPassword) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Não autorizado']);
    exit;
}

// Get JSON payload
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !is_array($data)) {
    echo json_encode(['success' => false, 'message' => 'Dados inválidos.']);
    exit;
}

try {
    require 'db.php';
    
    $pdo->beginTransaction();

    $importedOwners = 0;

    foreach ($data as $row) {
        // Validate required fields
        if (empty($row['CPF'])) {
            continue; // Skip invalid rows
        }

        $cpf = preg_replace('/[^0-9]/', '', $row['CPF']);
        if (empty($cpf)) continue;

        // Check if owner already exists
        $stmt = $pdo->prepare("SELECT id FROM registrations WHERE cpf = ?");
        $stmt->execute([$cpf]);
        $owner = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$owner) {
            // Insert new owner
            $stmt = $pdo->prepare("INSERT INTO registrations (name, rg, cpf, cep, street, number, complement, neighborhood, city, state, phone, whatsapp, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            $stmt->execute([
                $row['Nome Responsável'] ?? 'Sem Nome',
                $row['RG'] ?? '',
                $cpf,
                preg_replace('/[^0-9]/', '', $row['CEP'] ?? ''),
                $row['Endereço (Rua)'] ?? '',
                $row['Número'] ?? '',
                $row['Complemento'] ?? '',
                $row['Bairro'] ?? '',
                $row['Cidade'] ?? '',
                $row['Estado'] ?? 'SP',
                preg_replace('/[^0-9]/', '', $row['Telefone'] ?? ''),
                preg_replace('/[^0-9]/', '', $row['WhatsApp'] ?? ''),
                $row['E-mail'] ?? ''
            ]);
            $importedOwners++;
        }
    }

    $pdo->commit();
    echo json_encode([
        'success' => true, 
        'message' => "Importação concluída! $importedOwners novos responsáveis cadastrados."
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Erro no banco de dados: ' . $e->getMessage()]);
}
?>
