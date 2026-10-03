<?php
$titre_page = "Projets";
$page_css = "projets.css";

require_once 'includes/Projet.php';
require_once 'includes/GestionnaireProjets.php';
require_once 'includes/affichage_projets.php';

$gestionnaire = new GestionnaireProjets("projets.json");

include 'includes/header.php';
?>

    <main class="projets">

        <div class="titre-page-projets">
            <h1>MES PROJETS</h1>
            <div class="ligne-titre"></div>
            <p>Un aperçu de mes réalisations scolaires et personnelles</p>
        </div>

        <div class="intro-projets">
            <p class="intro-gauche">
                Ces projets représentent une partie de mon parcours en informatique et de ma progression au fil de ma formation. Ils me permettent de mettre en pratique mes compétences en développement, en algorithmique, en gestion de données et progressivement en intelligence artificielle.
            </p>

            <p class="intro-droite">
                Chaque projet m'a permis de travailler sur des problématiques différentes, tout en développant ma capacité à concevoir, structurer et réaliser des applications fonctionnelles.
            </p>
        </div>

        <?php $projets = $gestionnaire->getTous(); ?>

        <?php if (empty($projets)): ?>

            <p class="message-vide">
                Aucun projet ajouté pour l'instant.
            </p>

        <?php else: ?>

            <div class="grille-projets">

                <?php foreach ($projets as $projet): ?>

                    <?php afficherCarteProjet($projet); ?>

                <?php endforeach; ?>

            </div>

        <?php endif; ?>

    </main>
<script src="js/moveProjets.js"></script>
<?php include 'includes/footer.php'; ?>