<?php
require 'db.php';

try {
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
    $stmt = $pdo->query("SELECT COUNT(*) FROM campaigns");
    if ($stmt->fetchColumn() == 0) {
        $cities = ["Orindiúva", "Planalto", "Adolfo", "Pindorama", "Severínia", "Urupês"];
        $stmt = $pdo->prepare("INSERT INTO campaigns (city, type, end_date) VALUES (?, 'ELPA', '2026-05-30')");
        foreach ($cities as $city) {
            $stmt->execute([$city]);
        }
    }
    
    echo "Table 'campaigns' created and populated successfully!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>
