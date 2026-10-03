<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ahmed Kharchiche<?php echo isset($titre_page) ? " - $titre_page" : ""; ?></title>
    <link rel="stylesheet" href="css/global.css">
    <link rel="stylesheet" href="css/header.css">
    <link rel="stylesheet" href="css/elements/theme-toggle.css">
    <link rel="stylesheet" href="css/footer.css">
    <link rel="stylesheet" href="css/elements/projet-carte.css">
    <?php if (isset($page_css)): ?>
        <link rel="stylesheet" href="css/<?php echo $page_css; ?>">
    <?php endif; ?>
</head>
<body>

<header>
    <nav>
        <div class="logo">Ahmed Kharchiche</div>

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

<script src="js/theme.js"></script>
</body>