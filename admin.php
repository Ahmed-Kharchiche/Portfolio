<?php
session_start();

require_once 'includes/Projet.php';
require_once 'includes/GestionnaireProjets.php';
require_once 'includes/affichage_projets.php';

$gestionnaire = new GestionnaireProjets("projets.json");

// Protection de la page : si pas connecté, retour au login
if (!isset($_SESSION["connecte"]) || $_SESSION["connecte"] !== true) {
    header("Location: login.php");
    exit;
}

// Liste des technologies disponibles
$technologies_disponibles = [
        "Python",
        "Java",
        "C",
        "SQL",
        "PHP",
        "HTML",
        "CSS",
        "JavaScript"
];

if ($_SERVER["REQUEST_METHOD"] === "POST" && ($_POST["action"] ?? "") === "ajouter") {

    // Récupérer les champs texte
    $titre = trim($_POST["titre"]);
    $description = trim($_POST["description"]);
    $technologies = $_POST["technologies"] ?? [];
    $gitlab = trim($_POST["gitlab"]);

    // Enregistrer les images
    $images = [];

    foreach ($_FILES["images"]["name"] as $i => $nomFichier) {
        if ($_FILES["images"]["error"][$i] === 0) {

            $chemin = "images/projets/" . basename($nomFichier);

            if (move_uploaded_file($_FILES["images"]["tmp_name"][$i], $chemin)) {
                $images[] = $chemin;
            }
        }
    }

    // Créer le projet
    $projet = new Projet(
            null,
            $titre,
            $description,
            $technologies,
            $gitlab,
            $images
    );

    // Ajouter le projet
    $gestionnaire->ajouter($projet);

    // Éviter de renvoyer le formulaire lors d'un rafraîchissement
    header("Location: admin.php");
    exit;
}


// Configuration de la page
$titre_page = "Administration";
$page_css = "admin.css";

include 'includes/header.php';
?>

    <main class="admin">

        <div class="top-bar">
            <h1>Espace admin</h1>
            <a class="bouton-deconnexion" href="logout.php">Se déconnecter</a>
        </div>

        <section class="ajout-projet">

            <h2>Ajouter un projet</h2>

            <form class="formulaire-projet" method="POST" enctype="multipart/form-data">

                <input type="hidden" name="action" value="ajouter">

                <div class="champ">
                    <label for="titre">Titre du projet</label>
                    <input
                            type="text"
                            id="titre"
                            name="titre"
                            placeholder="Ex : Application de réservation"
                            required
                    >
                </div>

                <div class="champ">
                    <label for="description">Description</label>
                    <textarea
                            id="description"
                            name="description"
                            rows="4"
                            placeholder="Décris brièvement ton projet..."
                            required
                    ></textarea>
                </div>

                <div class="champ">
                    <p class="label-technologies">Technologies utilisées</p>

                    <div class="cases-technologies">

                        <?php foreach ($technologies_disponibles as $techno): ?>

                            <label class="case-technologie">
                                <input
                                        type="checkbox"
                                        name="technologies[]"
                                        value="<?php echo $techno; ?>"
                                >

                                <span><?php echo $techno; ?></span>
                            </label>

                        <?php endforeach; ?>

                    </div>
                </div>

                <div class="champ">
                    <label for="gitlab">Lien GitLab</label>
                    <input
                            type="url"
                            id="gitlab"
                            name="gitlab"
                            placeholder="https://gitlab.com/..."
                    >
                </div>

                <div class="champ">
                    <label for="images">Images du projet</label>
                    <input
                            type="file"
                            id="images"
                            name="images[]"
                            accept="image/*"
                            multiple
                            required
                    >
                </div>

                <button class="bouton-ajouter" type="submit">
                    Ajouter le projet
                </button>

            </form>

        </section>

        <div class="grille-projets">

            <?php foreach ($gestionnaire->getTous() as $projet): ?>

                <?php afficherCarteProjet($projet); ?>

            <?php endforeach; ?>

        </div>

    </main>

<?php include 'includes/footer.php'; ?>