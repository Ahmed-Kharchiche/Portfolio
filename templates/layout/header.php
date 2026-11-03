<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ahmed Kharchiche<?php echo isset($titre_page) ? " - $titre_page" : ""; ?></title>
    <!-- #region FEUILLES DE STYLE -->
    <meta name="description"
          content="Portfolio d'Ahmed Kharchiche, étudiant en BUT Informatique. Projets en développement logiciel, Python et intelligence artificielle.">
    <?php if (isset($url_canonique)): ?>
        <link rel="canonical" href="<?= htmlspecialchars($url_canonique, ENT_QUOTES, 'UTF-8') ?>">
    <?php endif; ?>
    <link rel="stylesheet" href="assets/css/base/global.css">
    <link rel="stylesheet" href="assets/css/layout/header.css">
    <link rel="stylesheet" href="assets/css/composants/theme-toggle.css">
    <link rel="stylesheet" href="assets/css/layout/footer.css">
    <link rel="stylesheet" href="assets/css/composants/projet-carte.css">
    <link rel="stylesheet" href="assets/css/composants/carrousel.css">
    <link rel="stylesheet" href="assets/css/composants/avis-carte.css">
    <link rel="stylesheet" href="assets/css/composants/confirmation.css">
    <?php if (isset($page_css)): ?>
        <link rel="stylesheet" href="assets/css/<?php echo $page_css; ?>">
    <?php endif; ?>
    <?php foreach (($css_supplementaires ?? []) as $feuille): ?>
        <link rel="stylesheet" href="assets/css/<?php echo htmlspecialchars($feuille, ENT_QUOTES, 'UTF-8'); ?>">
    <?php endforeach; ?>
    <!-- #endregion -->

</head>
<body>

<!-- #region EN-TÊTE DU SITE -->
<header id="haut">
    <nav>
        <a class="logo" href="index.php">Ahmed Kharchiche</a>

        <label class="switch" title="Basculer le thème clair/sombre">
            <input type="checkbox" id="theme-toggle">
            <span class="slider"></span>
            <span class="switch-text switch-text--gauche">☀️️</span>
            <span class="switch-text switch-text--droite">🌙️️️</span>
        </label>

        <ul class="menu">
            <li><a href="index.php">Accueil</a></li>
            <li><a href="projets.php">Projets</a></li>
            <li><a href="apropos.php">À propos</a></li>
            <li><a href="contact.php">Contact</a></li>
        </ul>
    </nav>
</header>
<!-- #endregion -->

<?php
// #region BOUTON RETOUR EN HAUT
$pagesAvecBoutonHaut = [
        'projets.php',
        'apropos.php',
        'contact.php',
        'avis.php'
];

$pageActuelle = basename($_SERVER['PHP_SELF']);

if (in_array($pageActuelle, $pagesAvecBoutonHaut, true)) {
    include __DIR__ . '/../composants/bouton-haut.php';
}
// #endregion
?>

<!-- #region SCRIPT -->
<script src="assets/js/commun/theme.js"></script>

<!-- #endregion -->
