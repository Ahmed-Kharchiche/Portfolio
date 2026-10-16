<?php
// #region INITIALISATION

require_once __DIR__ . '/includes//Projet.php';
require_once __DIR__ . '/includes/GestionnaireProjets.php';

$id = $_GET['id'] ?? null;

if ($id === null || $id === '') {
    http_response_code(400);
    exit('Identifiant du projet manquant.');
}

$gestionnaire = new GestionnaireProjets(
        __DIR__ . '/data/projets.json'
);

$projet = $gestionnaire->trouverParId($id);

if ($projet === null) {
    http_response_code(404);
    exit('Projet introuvable.');
}

// #endregion

// #region DONNÉES DU PROJET

$titre = $projet->getTitre();
$description = $projet->getDescription();
$dateCreation = $projet->getDateCreation();
$technologies = $projet->getTechnologies() ?: [];
$images = $projet->getImages() ?: [];
$gitlab = $projet->getGitlab();

// #endregion

include 'includes/header.php';

?>

<!-- #region PRÉSENTATION STANDARD -->

<link rel="stylesheet" href="css/projets/standard.css">

<main class="standard" data-template="standard">
    <p class="standard-surtitre">PROJET</p>

    <h1>
        <?= htmlspecialchars($titre, ENT_QUOTES, 'UTF-8') ?>
    </h1>

    <?php if ($dateCreation !== null && $dateCreation !== ''): ?>
        <p class="standard-date">
            Créé le
            <time datetime="<?= htmlspecialchars($dateCreation, ENT_QUOTES, 'UTF-8') ?>">
                <?= htmlspecialchars($dateCreation, ENT_QUOTES, 'UTF-8') ?>
            </time>
        </p>
    <?php endif; ?>

    <!-- #region DESCRIPTION -->

    <section class="standard-section standard-description">
        <h2>À propos du projet</h2>

        <p>
            <?= nl2br(htmlspecialchars($description, ENT_QUOTES, 'UTF-8')) ?>
        </p>
    </section>

    <!-- #endregion -->

    <!-- #region TECHNOLOGIES -->

    <?php if (!empty($technologies)): ?>
        <section class="standard-section standard-technologies">
            <h2>Technologies utilisées</h2>

            <ul class="standard-liste-technologies">
                <?php foreach ($technologies as $technologie): ?>
                    <li>
                        <?= htmlspecialchars($technologie, ENT_QUOTES, 'UTF-8') ?>
                    </li>
                <?php endforeach; ?>
            </ul>
        </section>
    <?php endif; ?>

    <!-- #endregion -->

    <!-- #region GALERIE -->

    <?php if (!empty($images)): ?>
        <section class="standard-section standard-images">
            <h2>Galerie du projet</h2>

            <div class="standard-galerie">
                <?php foreach ($images as $index => $image): ?>
                    <figure class="standard-image">
                        <img
                                src="<?= htmlspecialchars($image, ENT_QUOTES, 'UTF-8') ?>"
                                alt="<?= htmlspecialchars($titre, ENT_QUOTES, 'UTF-8') ?> — image <?= $index + 1 ?>"
                                loading="lazy"
                        >
                    </figure>
                <?php endforeach; ?>
            </div>
        </section>
    <?php endif; ?>

    <!-- #endregion -->

    <!-- #region CODE SOURCE -->

    <?php if ($projet->aUnLienGitlab()): ?>
        <section class="standard-section standard-code">
            <h2>Code source</h2>

            <a
                    class="standard-bouton-code"
                    href="<?= htmlspecialchars($gitlab, ENT_QUOTES, 'UTF-8') ?>"
                    target="_blank"
                    rel="noopener noreferrer"
            >
                Voir le code source
                <span aria-hidden="true">↗</span>
            </a>
        </section>
    <?php endif; ?>

    <!-- #endregion -->
</main>

<!-- #endregion -->

<?php include 'includes/footer.php';?>

<!-- #region JAVASCRIPT -->

<script type="module" src="js/projets/standard.js"></script>

<!-- #endregion -->