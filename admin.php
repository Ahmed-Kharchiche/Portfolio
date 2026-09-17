<?php
session_start();

// ---- Protection de la page : si pas connecté, retour au login ----
if (!isset($_SESSION["connecte"]) || $_SESSION["connecte"] !== true) {
    header("Location: login.php");
    exit;
}

$fichierDonnees = "projets.json";
$projets = [];

if (file_exists($fichierDonnees)) {
    $projets = json_decode(file_get_contents($fichierDonnees), true);
}

$message = "";

// ---- Ajout d'un projet ----
if ($_SERVER["REQUEST_METHOD"] === "POST" && isset($_POST["action"]) && $_POST["action"] === "ajouter") {

    $titre = $_POST["titre"];
    $description = $_POST["description"];

    if (isset($_FILES["image"]) && $_FILES["image"]["error"] === 0) {
        $nomFichier = basename($_FILES["image"]["name"]);
        $cheminDestination = "images/projets/" . $nomFichier;

        if (move_uploaded_file($_FILES["image"]["tmp_name"], $cheminDestination)) {
            $projets[] = [
                "titre" => $titre,
                "description" => $description,
                "image" => $cheminDestination
            ];
            file_put_contents($fichierDonnees, json_encode($projets, JSON_PRETTY_PRINT));
            $message = "Projet ajouté.";
        } else {
            $message = "Erreur lors de l'envoi de l'image.";
        }
    }
}

// ---- Suppression d'un projet ----
if (isset($_GET["supprimer"])) {
    $index = (int) $_GET["supprimer"];

    if (isset($projets[$index])) {
        array_splice($projets, $index, 1);
        file_put_contents($fichierDonnees, json_encode($projets, JSON_PRETTY_PRINT));
        $message = "Projet supprimé.";
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Espace admin</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #09090B;
            color: #FAFAFA;
            max-width: 600px;
            margin: 40px auto;
            padding: 0 20px;
        }
        input, textarea {
            display: block;
            width: 100%;
            margin-bottom: 12px;
            padding: 8px;
        }
        button {
            padding: 10px 16px;
            background-color: #7C3AED;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .carte {
            border: 1px solid #18181B;
            background-color: #18181B;
            padding: 12px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .carte img {
            max-width: 80px;
            border-radius: 4px;
        }
        .supprimer {
            color: #F87171;
        }
        .top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
    </style>
</head>
<body>
<?php include 'includes/header.php'; ?>

<div class="top-bar">
    <h1>Espace admin</h1>
    <a href="logout.php">Se déconnecter</a>
</div>

<?php if ($message): ?>
    <p><?php echo $message; ?></p>
<?php endif; ?>

<h2>Ajouter un projet</h2>

<form method="POST" enctype="multipart/form-data">
    <input type="hidden" name="action" value="ajouter">

    <input type="text" name="titre" placeholder="Titre du projet" required>
    <textarea name="description" rows="3" placeholder="Description" required></textarea>
    <input type="file" name="image" accept="image/*" required>

    <button type="submit">Ajouter</button>
</form>

<h2>Projets existants</h2>

<?php foreach ($projets as $index => $projet): ?>
    <div class="carte">
        <img src="<?php echo $projet["image"]; ?>" alt="">
        <div style="flex: 1; padding: 0 12px;">
            <strong><?php echo $projet["titre"]; ?></strong>
            <p><?php echo $projet["description"]; ?></p>
        </div>
        <a class="supprimer" href="admin.php?supprimer=<?php echo $index; ?>"
           onclick="return confirm('Supprimer ce projet ?');">Supprimer</a>
    </div>
<?php endforeach; ?>

</body>
</html>