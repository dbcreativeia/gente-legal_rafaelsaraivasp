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
        // Obter e validar WhatsApp primário (agora será a chave)
        $whatsapp = preg_replace('/[^0-9]/', '', $row['WhatsApp'] ?? '');
        
        if (empty($whatsapp) || empty($row['Nome Responsável'])) {
            continue; // Ignora se não houver WhatsApp ou Nome
        }

        // Verifica se já existe um cadastro com esse WhatsApp
        $stmt = $pdo->prepare("SELECT id FROM registrations WHERE whatsapp = ?");
        $stmt->execute([$whatsapp]);
        $owner = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$owner) {
            // Insere novo dono sem RG e CPF
            $stmt = $pdo->prepare("INSERT INTO registrations (name, cep, street, number, complement, neighborhood, city, phone, whatsapp, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
            $stmt->execute([
                $row['Nome Responsável'] ?? 'Sem Nome',
                preg_replace('/[^0-9]/', '', $row['CEP'] ?? ''),
                $row['Endereço (Rua)'] ?? '',
                $row['Número'] ?? '',
                $row['Complemento'] ?? '',
                $row['Bairro'] ?? '',
                $row['Cidade'] ?? '',
                preg_replace('/[^0-9]/', '', $row['Telefone'] ?? ''),
                $whatsapp,
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
