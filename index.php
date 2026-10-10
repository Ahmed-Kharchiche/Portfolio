<?php
// Page d'accueil du portfolio
// #region CONFIGURATION DE LA PAGE
$titre_page = "Accueil";
$page_css = "accueil.css";
require_once 'includes/GestionnaireProjets.php';
require_once 'includes/GestionnaireAvis.php';

require_once 'includes/affichage_projets.php';
require_once 'includes/affichage_avis.php';

include 'includes/header.php';
// #endregion

// #region PROJETS FAVORIS
$gestionnaireProjets = new GestionnaireProjets("data/projets.json");
$gestionnaireAvis = new GestionnaireAvis(__DIR__ . '/data/avis.json');


$projetsFavoris = $gestionnaireProjets->getProjetsFavoris();
$avisFavoris = $gestionnaireAvis->getAvisFavoris();


// #endregion
?>

    <!-- #region PRÉSENTATION -->
    <section class="hero">
        <br><br>
        <h1 id="nom">AHMED KHARCHICHE</h1>
        <p id="presentation">Étudiant en BUT Informatique</p>
        <div class="zone">

            <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
            <script src="js/reseau.js"></script>
            
        </div>

        <div class="hero-boutons">
            <a href="projets.php" class="bouton">Découvrir mes projets</a>
            <a href="cv/CV_Ahmed_Kharchiche.pdf" class="bouton bouton-secondaire" download>Télécharger mon CV</a>
        </div>
    </section>
    <!-- #endregion -->

    <!-- #region TECHNOLOGIES -->
    <section class="technos">
        <h2>Quelques technologies</h2>
        <ul>
            <li>Python</li>
            <li>Java</li>
            <li>C</li>
            <li>SQL</li>
            <li>PHP</li>
            <li>HTML / CSS</li>
        </ul>
    </section>
    <!-- #endregion -->

    <!-- #region APERÇU DES PROJETS -->
    <section class="apercu-projets">
        <h2 class="projects-title">Quelques projets</h2>

        <div class="carousel-conteneur" id="carousel-conteneur"><div class="carousel-3d" id="carousel">

                <?php foreach ($projetsFavoris as $projet): ?>

                    <div
                            class="carte-3d"
                            data-lien="projet.php?id=<?php echo urlencode($projet->getId()); ?>"
                    >
                        <h3>
                            <?php echo htmlspecialchars($projet->getTitre()); ?>
                        </h3>

                        <div class="image-carte">
                            <img
                                    src="<?php echo htmlspecialchars($projet->getPremiereImage()); ?>"
                                    alt="<?php echo htmlspecialchars($projet->getTitre()); ?>"
                            >
                        </div>
                    </div>
                <?php endforeach; ?>

            </div>

            <p class="carousel-astuce">Selectionne la carte avec un clic et choisis la avec un double clic</p>
        </div>
    </section>
    <section class="appercu-avis">
        <h2>Quelques avis</h2>

        <div class="avis-boutons">
            <a href="avis.php" class="bouton">
                Voir plus d'avis
            </a>
            <a href="avis.php#ajouter-avis" class="bouton bouton-secondaire">
                Ajouter mon avis
            </a>
        </div>

        <?php foreach ($avisFavoris as $avis): ?>
            <?php afficherPetitAvis($avis); ?>
        <?php endforeach; ?>
    </section>
    <!-- #endregion -->
    <!-- #region SCRIPTS -->
    <script src="js/moveAccueil.js"></script>
    <script src="js/projetsListe.js"></script>
    <!-- #endregion -->


<?php include 'includes/footer.php'; ?>