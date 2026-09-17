<?php
$titre_page = "Projets";

// On récupère les projets enregistrés par l'admin
$fichierDonnees = "projets.json";
$projets = [];

if (file_exists($fichierDonnees)) {
    $projets = json_decode(file_get_contents($fichierDonnees), true);
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ahmed Kharchiche - <?php echo $titre_page; ?></title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

<?php include 'includes/header.php'; ?>

<section class="apercu-projets">
    <h2>Mes projets</h2>

    <div class="cartes">
        <?php if (empty($projets)): ?>
            <p>Aucun projet ajouté pour l'instant.</p>
        <?php endif; ?>

        <?php foreach ($projets as $projet): ?>
            <div class="carte">
                <img src="<?php echo $projet["image"]; ?>" alt="<?php echo $projet["titre"]; ?>" style="width: 100%; margin-bottom: 10px;">
                <h3><?php echo $projet["titre"]; ?></h3>
                <p><?php echo $projet["description"]; ?></p>
            </div>
        <?php endforeach; ?>
    </div>
</section>

<?php include 'includes/footer.php'; ?>

</body>
</html>