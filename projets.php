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
            <h1>Mes projets</h1>
            <p>Un aperçu de mes réalisations scolaires et personnelles</p>
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

<?php include 'includes/footer.php'; ?>