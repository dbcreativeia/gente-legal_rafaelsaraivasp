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
$campaign = $_GET['campaign'] ?? null;

if (!$data || !is_array($data)) {
    echo json_encode(['success' => false, 'message' => 'Dados inválidos.']);
    exit;
}

try {
    require 'db.php';
    
    $pdo->beginTransaction();

    $importedOwners = 0;
    $importedAnimals = 0;

    foreach ($data as $row) {
        $cachorro = trim($row['Cachorro'] ?? '');
        $gato = trim($row['Gato'] ?? '');
        $sexo = trim($row['Sexo'] ?? '');

        // Validate required fields
        if (empty($row['CPF']) || (empty($cachorro) && empty($gato)) || empty($sexo)) {
            continue; // Skip invalid rows
        }

        $cpf = preg_replace('/[^0-9]/', '', $row['CPF']);
        if (empty($cpf)) continue;

        $color = trim($row['Cor'] ?? '');
        $vax = trim($row['Vacinado'] ?? '');
        $deworm = trim($row['Vermifugado'] ?? '');
        $surg = trim($row['Cirurgia'] ?? '');
        $med = trim($row['Remédio Contínuo'] ?? '');
        $medName = trim($row['Qual Remédio'] ?? '');

        $species = !empty($cachorro) ? 'Cachorro' : 'Gato';
        $animalName = !empty($cachorro) ? $cachorro : $gato;

        // Check if owner already exists
        $stmt = $pdo->prepare("SELECT id FROM registrations WHERE cpf = ?");
        $stmt->execute([$cpf]);
        $owner = $stmt->fetch(PDO::FETCH_ASSOC);

        $castration_city = $campaign ?: ($row['Cidade da Castração'] ?? null);

        if ($owner) {
            $registration_id = $owner['id'];
        } else {
            // Insert new owner
            $stmt = $pdo->prepare("INSERT INTO registrations (name, rg, cpf, cep, street, number, complement, neighborhood, city, state, phone, whatsapp, email, castration_city) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
            
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
                $row['E-mail'] ?? '',
                $castration_city
            ]);
            $registration_id = $pdo->lastInsertId();
            $importedOwners++;
        }

        // Insert animal
        $stmt = $pdo->prepare("INSERT INTO animals (registration_id, name, species, sex, color, is_vaccinated, is_dewormed, has_had_surgery, takes_continuous_medication, medication_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $registration_id,
            $animalName,
            $species,
            $sexo,
            $color ?: null,
            $vax ?: null,
            $deworm ?: null,
            $surg ?: null,
            $med ?: null,
            $medName ?: null
        ]);
        $importedAnimals++;
    }

    $pdo->commit();
    echo json_encode([
        'success' => true, 
        'message' => "Importação concluída! $importedOwners novos responsáveis e $importedAnimals animais cadastrados."
    ]);

} catch (Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Erro no banco de dados: ' . $e->getMessage()]);
}
?>
