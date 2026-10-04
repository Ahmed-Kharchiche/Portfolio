<?php
session_start();
require_once 'includes/Projet.php';
require_once 'includes/GestionnaireProjets.php';
require_once 'includes/affichage_projets.php';
$gestionnaire = new GestionnaireProjets("projets.json");

// Protection de la page
if (!isset($_SESSION["connecte"]) || $_SESSION["connecte"] !== true) {
    header("Location: login.php");
    exit;
}

// ==================================================
//      PROJET À MODIFIER
// ==================================================
$projetAModifier = null;
if (isset($_GET["id"])) {
    $projetAModifier = $gestionnaire->trouverParId($_GET["id"]);
    if ($projetAModifier === null) {
        header("Location: admin.php");
        exit;
    }
}

// ==================================================
//      SUPPRESSION
// ==================================================
if ($_SERVER["REQUEST_METHOD"] === "POST" && ($_POST["action"] ?? "") === "supprimer") {
    $id = $_POST["id"] ?? "";
    if ($id !== "") {
        $gestionnaire->supprimer($id);
    }
    header("Location: admin.php");
    exit;
}

// ==================================================
//      AJOUT / MODIFICATION
// ==================================================
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $action = $_POST["action"] ?? "";

    // ----------------------------------------------
    // AJOUTER
    // ----------------------------------------------
    if ($action === "ajouter") {
        $titre = trim($_POST["titre"] ?? "");
        $description = trim($_POST["description"] ?? "");
        $technologies = $_POST["technologies"] ?? [];
        $gitlab = trim($_POST["gitlab"] ?? "");
        $images = [];
        if (isset($_FILES["images"]["name"]) && is_array($_FILES["images"]["name"])) {
            foreach ($_FILES["images"]["name"] as $i => $nomFichier) {
                if ($_FILES["images"]["error"][$i] === UPLOAD_ERR_OK && !empty($nomFichier)) {
                    $chemin = "images/projets/" . basename($nomFichier);
                    if (move_uploaded_file($_FILES["images"]["tmp_name"][$i], $chemin)) {
                        $images[] = $chemin;
                    }
                }
            }
        }
        $projet = new Projet(null, $titre, $description, $technologies, $gitlab, $images, date("Y-m-d"));
        $gestionnaire->ajouter($projet);
        header("Location: admin.php");
        exit;
    }

    // ----------------------------------------------
    // MODIFIER
    // ----------------------------------------------
    if ($action === "modifier") {
        $id = $_POST["id"] ?? "";
        $projet = $gestionnaire->trouverParId($id);
        if ($projet === null) {
            header("Location: admin.php");
            exit;
        }
        $titre = trim($_POST["titre"] ?? "");
        $description = trim($_POST["description"] ?? "");
        $technologies = $_POST["technologies"] ?? [];
        $gitlab = trim($_POST["gitlab"] ?? "");

        // Modifier les informations du projet
        $projet->setTitre($titre);
        $projet->setDescription($description);
        $projet->setTechnologies($technologies);
        $projet->setGitlab($gitlab);

        // Ajouter de nouvelles images sans supprimer les anciennes
        $imagesExistantes = $projet->getImages();
        $aSupprimer = $_POST["images_supprimees"] ?? [];
        $imagesExistantes = array_values(array_diff($imagesExistantes, $aSupprimer));

        if (isset($_FILES["images"]["name"]) && is_array($_FILES["images"]["name"])) {
            foreach ($_FILES["images"]["name"] as $i => $nomFichier) {
                if ($_FILES["images"]["error"][$i] === UPLOAD_ERR_OK && !empty($nomFichier)) {
                    $chemin = "images/projets/" . basename($nomFichier);
                    if (move_uploaded_file($_FILES["images"]["tmp_name"][$i], $chemin)) {
                        $imagesExistantes[] = $chemin;
                    }
                }
            }
        }
        $projet->setImages($imagesExistantes);

        // Sauvegarder les modifications
        $gestionnaire->sauvegarder();
        header("Location: admin.php");
        exit;
    }
}

// ==================================================
//      TECHNOLOGIES DISPONIBLES
// ==================================================
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

// ==================================================
//      VALEURS DU FORMULAIRE
// ==================================================
$modeModification = ($projetAModifier !== null);
$titreFormulaire = $modeModification ? "Modifier le projet" : "Ajouter un projet";
$texteBouton = $modeModification ? "Sauvegarder les modifications" : "Ajouter le projet";
$titre = $projetAModifier?->getTitre() ?? "";
$description = $projetAModifier?->getDescription() ?? "";
$gitlab = $projetAModifier?->getGitlab() ?? "";
$technologiesProjet = $projetAModifier?->getTechnologies() ?? [];

// ==================================================
//      CONFIGURATION DE LA PAGE
// ==================================================
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
            <h2><?php echo htmlspecialchars($titreFormulaire); ?></h2>
            <form class="formulaire-projet" method="POST" enctype="multipart/form-data">
                <!-- Action -->
                <input type="hidden" name="action" value="<?php echo $modeModification ? "modifier" : "ajouter"; ?>">
                <!-- ID uniquement en modification -->
                <?php if ($modeModification): ?>
                    <input type="hidden" name="id" value="<?php echo htmlspecialchars($projetAModifier->getId()); ?>">
                <?php endif; ?>
                <!-- TITRE -->
                <div class="champ">
                    <label for="titre">Titre du projet</label>
                    <input type="text" id="titre" name="titre" placeholder="Ex : Application de réservation" value="<?php echo htmlspecialchars($titre); ?>" required>
                </div>
                <!-- DESCRIPTION -->
                <div class="champ">
                    <label for="description">Description</label>
                    <textarea id="description" name="description" rows="4" placeholder="Décris brièvement ton projet..." required><?php echo htmlspecialchars($description); ?></textarea>
                </div>
                <!-- TECHNOLOGIES -->
                <div class="champ">
                    <p class="label-technologies">Technologies utilisées</p>
                    <div class="cases-technologies">
                        <?php foreach ($technologies_disponibles as $techno): ?>
                            <label class="case-technologie">
                                <input type="checkbox" name="technologies[]" value="<?php echo htmlspecialchars($techno); ?>" <?php echo in_array($techno, $technologiesProjet) ? "checked" : ""; ?>>
                                <span><?php echo htmlspecialchars($techno); ?></span>
                            </label>
                        <?php endforeach; ?>
                    </div>
                </div>
                <!-- GITHUB -->
                <div class="champ">
                    <label for="gitlab">Lien GitHub</label>
                    <input type="url" id="gitlab" name="gitlab" placeholder="https://github.com/..." value="<?php echo htmlspecialchars($gitlab); ?>">
                </div>
                <!-- IMAGES -->
                <div class="champ">
                    <label for="images"><?php echo $modeModification ? "Ajouter des images" : "Images du projet"; ?></label>
                    <label class="zone-fichier">
                        <img src="images/upload.png" alt="Ajouter des images">
                        <span>Ajouter des images</span>
                        <input type="file" id="images" name="images[]" accept="image/*" multiple <?php echo $modeModification ? "" : "required"; ?>>
                    </label>
                    <div id="aperçu-images" class="aperçu-images">
                        <?php if ($modeModification): ?>
                            <?php foreach ($projetAModifier->getImages() as $image): ?>
                                <div class="aperçu-image image-existante">
                                    <img src="<?php echo htmlspecialchars($image); ?>" alt="Image du projet">
                                    <div class="aperçu-image-nom"><?php echo htmlspecialchars(basename($image)); ?></div>
                                    <button type="button" class="supprimer-image" data-image="<?php echo htmlspecialchars($image); ?>" aria-label="Supprimer l'image">×</button>
                                </div>
                            <?php endforeach; ?>
                        <?php endif; ?>
                    </div>
                </div>
                <!-- BOUTON -->
                <button class="bouton-ajouter" type="submit"><?php echo htmlspecialchars($texteBouton); ?></button>
            </form>
        </section>
        <!-- ==========================================
             LISTE DES PROJETS
             ========================================== -->
        <div class="grille-projets">
            <?php foreach ($gestionnaire->getTous() as $projet): ?>
                <?php afficherCarteProjet($projet, true); ?>
            <?php endforeach; ?>
        </div>
    </main>
    <script src="js/administration.js"></script>
    <script src="js/carrousel.js"></script>
<?php include 'includes/footer.php'; ?>