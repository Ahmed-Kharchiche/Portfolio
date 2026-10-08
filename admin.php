<?php
session_start();

// ==================================================
//      PROTECTION DE LA PAGE (avant tout le reste)
// ==================================================
if (($_SESSION["connecte"] ?? false) !== true) {
    header("Location: login.php");
    exit;
}

require_once 'includes/Projet.php';
require_once 'includes/GestionnaireProjets.php';
require_once 'includes/affichage_projets.php';

require_once 'includes/Avis.php';
require_once 'includes/GestionnaireAvis.php';
require_once 'includes/affichage_avis.php';
require_once 'includes/confirm/confirmation.php';

$gestionnaire = new GestionnaireProjets("data/projets.json");
$gestionnaireAvis = new GestionnaireAvis("data/avis.json");

// ==================================================
//      CONFIGURATION
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

$extensions_images = ["jpg", "jpeg", "png", "gif", "webp"];

// ==================================================
//      ENREGISTREMENT DES IMAGES
// ==================================================
/**
 * Enregistre les images envoyées dans images/projets/ et renvoie leurs chemins.
 * Seuls les vrais fichiers image (extension autorisée + contenu vérifié) sont acceptés.
 */
function enregistrerImages(array $fichiers, array $extensionsAutorisees): array
{
    $chemins = [];

    if (!isset($fichiers["name"]) || !is_array($fichiers["name"])) {
        return $chemins;
    }

    foreach ($fichiers["name"] as $i => $nomFichier) {
        if (($fichiers["error"][$i] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            continue;
        }

        $extension = strtolower(pathinfo($nomFichier, PATHINFO_EXTENSION));
        $temporaire = $fichiers["tmp_name"][$i];

        if (!in_array($extension, $extensionsAutorisees, true) || @getimagesize($temporaire) === false) {
            continue;
        }

        // Nom nettoyé + préfixe unique pour ne jamais écraser une image existante
        $nomPropre = preg_replace('/[^A-Za-z0-9_-]/', '_', pathinfo($nomFichier, PATHINFO_FILENAME));
        $chemin = "images/projets/" . uniqid() . "_" . $nomPropre . "." . $extension;

        if (move_uploaded_file($temporaire, $chemin)) {
            $chemins[] = $chemin;
        }
    }

    return $chemins;
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
//      TRAITEMENT DES FORMULAIRES (POST)
// ==================================================
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $action = $_POST["action"] ?? "";
    $id = $_POST["id"] ?? "";

    // On ne garde que les technologies de la liste autorisée
    $technologiesChoisies = array_values(array_intersect(
            (array) ($_POST["technologies"] ?? []),
            $technologies_disponibles
    ));

    switch ($action) {
        // ---------------- PROJETS ----------------
        case "ajouter":
            $projet = new Projet(
                    null,
                    trim($_POST["titre"] ?? ""),
                    trim($_POST["description"] ?? ""),
                    $technologiesChoisies,
                    trim($_POST["gitlab"] ?? ""),
                    enregistrerImages($_FILES["images"] ?? [], $extensions_images),
                    date("Y-m-d")
            );
            $gestionnaire->ajouter($projet);
            break;

        case "modifier":
            $projet = $gestionnaire->trouverParId($id);
            if ($projet !== null) {
                $projet->setTitre(trim($_POST["titre"] ?? ""));
                $projet->setDescription(trim($_POST["description"] ?? ""));
                $projet->setTechnologies($technologiesChoisies);
                $projet->setGitlab(trim($_POST["gitlab"] ?? ""));

                // Garde les anciennes images (sauf celles supprimées) et ajoute les nouvelles
                $imagesConservees = array_values(array_diff(
                        $projet->getImages(),
                        (array) ($_POST["images_supprimees"] ?? [])
                ));
                $nouvellesImages = enregistrerImages($_FILES["images"] ?? [], $extensions_images);
                $projet->setImages(array_merge($imagesConservees, $nouvellesImages));

                $gestionnaire->sauvegarder();
            }
            break;

        case "supprimer":
            if ($id !== "") {
                $gestionnaire->supprimer($id);
            }
            break;

        // ---------------- AVIS ----------------
        case "publier_avis":
            if ($id !== "") {
                $gestionnaireAvis->publier($id);
            }
            break;

        case "supprimer_avis":
            if ($id !== "") {
                $gestionnaireAvis->supprimer($id);
            }
            break;
    }

    header("Location: admin.php");
    exit;
}

// ==================================================
//      AVIS EN ATTENTE ET PUBLIES
// ==================================================
// getNonPublies() renvoie directement des objets Avis : plus rien à convertir
$avisEnAttente = $gestionnaireAvis->getNonPublies();
$avisPublies = $gestionnaireAvis->getPublies();

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

        <!-- ==========================================
             AVIS EN ATTENTE
             ========================================== -->
        <section class="avis-admin">
            <h2>Avis reçus</h2>
            <?php if (empty($avisEnAttente)): ?>
                <p class="aucun-avis">Aucun avis en attente.</p>
            <?php else: ?>
                <?php foreach ($avisEnAttente as $avis): ?>
                    <?php afficherCarteAvis($avis, true); ?>
                <?php endforeach; ?>
            <?php endif; ?>
        </section>
        <section class="petits-avis">
            <h2>Avis</h2>

            <div class="liste-petits-avis">
                <?php foreach ($avisPublies as $avis): ?>
                    <?php afficherPetitAvis($avis,true); ?>
                <?php endforeach; ?>
            </div>
        </section>

    </main>
    <?php afficherConfirmation(); ?>
    <script src="js/administration.js"></script>
    <script src="js/carrousel.js"></script>
    <script src="includes/confirm/confirmation.js"></script>
<?php include 'includes/footer.php'; ?>