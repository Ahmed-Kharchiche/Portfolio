<?php
// ---- Traitement du formulaire (si on vient de cliquer sur "Ajouter") ----

$message = "";

if ($_SERVER["REQUEST_METHOD"] === "POST") {

    $titre = $_POST["titre"];
    $description = $_POST["description"];

    // On vérifie qu'une image a bien été envoyée
    if (isset($_FILES["image"]) && $_FILES["image"]["error"] === 0) {

        $dossierDestination = "images/projets/";
        $nomFichier = basename($_FILES["image"]["name"]);
        $cheminDestination = $dossierDestination . $nomFichier;

        // On déplace l'image envoyée depuis le dossier temporaire vers images/projets/
        if (move_uploaded_file($_FILES["image"]["tmp_name"], $cheminDestination)) {

            // On récupère les projets déjà enregistrés (s'il y en a)
            $fichierDonnees = "projets.json";
            $projets = [];

            if (file_exists($fichierDonnees)) {
                $contenu = file_get_contents($fichierDonnees);
                $projets = json_decode($contenu, true);
            }

            // On ajoute le nouveau projet à la liste
            $projets[] = [
                "titre" => $titre,
                "description" => $description,
                "image" => $cheminDestination
            ];

            // On réenregistre la liste complète dans le fichier JSON
            file_put_contents($fichierDonnees, json_encode($projets, JSON_PRETTY_PRINT));

            $message = "Projet ajouté avec succès !";
        } else {
            $message = "Erreur lors de l'envoi de l'image.";
        }
    } else {
        $message = "Merci de choisir une image.";
    }
}

// ---- On récupère les projets pour les afficher en dessous ----

$projets = [];
if (file_exists("projets.json")) {
    $projets = json_decode(file_get_contents("projets.json"), true);
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Ajouter un projet</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 500px;
            margin: 40px auto;
        }
        input, textarea {
            display: block;
            width: 100%;
            margin-bottom: 12px;
            padding: 8px;
        }
        .carte {
            border: 1px solid #ccc;
            padding: 10px;
            margin-bottom: 10px;
        }
        .carte img {
            max-width: 100%;
        }
    </style>
</head>
<body>

<h1>Ajouter un projet</h1>

<?php if ($message): ?>
    <p><?php echo $message; ?></p>
<?php endif; ?>

<!-- enctype="multipart/form-data" est obligatoire pour pouvoir envoyer un fichier -->
<form method="POST" enctype="multipart/form-data">
    <label>Titre du projet</label>
    <input type="text" name="titre" required>

    <label>Description</label>
    <textarea name="description" rows="3" required></textarea>

    <label>Image d'affiche</label>
    <input type="file" name="image" accept="image/*" required>

    <button type="submit">Ajouter le projet</button>
</form>

<h2>Projets déjà ajoutés</h2>

<?php foreach ($projets as $projet): ?>
    <div class="carte">
        <img src="<?php echo $projet["image"]; ?>" alt="<?php echo $projet["titre"]; ?>">
        <h3><?php echo $projet["titre"]; ?></h3>
        <p><?php echo $projet["description"]; ?></p>
    </div>
<?php endforeach; ?>

</body>
</html>