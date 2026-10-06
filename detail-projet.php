<?php

require_once 'includes/Projet.php';
require_once 'includes/GestionnaireProjets.php';

$gestionnaire = new GestionnaireProjets("projets.json");
$projet = $gestionnaire->trouverParId($_GET["id"] ?? "");

if ($projet === null) {
    http_response_code(404);
    exit("Projet introuvable");
}

$titre_page = $projet->getTitre();
$page_css = "detail-projet.css";

$technologies = $projet->getTechnologies() ?: [];
$image = $projet->getPremiereImage();
$images = method_exists($projet, 'getImages') ? ($projet->getImages() ?: []) : ($image ? [$image] : []);

include 'includes/header.php';
?>

    <main class="detail-projet">
        <canvas id="scene-3d" aria-hidden="true"></canvas>
        <div class="voile" aria-hidden="true"></div>
        <div class="flash" id="flash" aria-hidden="true"></div>

        <section class="zone" data-zone="0">
            <p class="label">01 — Discover</p>
            <h1><?= htmlspecialchars($projet->getTitre()) ?></h1>
            <?php if ($projet->getDateCreation()): ?>
                <span class="date">Créé le <?= date("d/m/Y", strtotime($projet->getDateCreation())) ?></span>
            <?php endif; ?>
        </section>

        <section class="zone" data-zone="1">
            <p class="label">02 — Understand</p>
            <h2>Le projet</h2>
            <p class="texte"><?= nl2br(htmlspecialchars($projet->getDescription())) ?></p>
        </section>

        <section class="zone" data-zone="2">
            <p class="label">03 — Experience</p>
            <h2>Technologies</h2>
            <div class="techs">
                <?php foreach ($technologies as $t): ?><span><?= htmlspecialchars($t) ?></span><?php endforeach; ?>
            </div>
        </section>

        <section class="zone" data-zone="3">
            <p class="label">04 — Result</p>
            <?php if ($images): ?>
                <div class="galerie">
                    <?php foreach ($images as $i => $img): ?>
                        <figure><img src="<?= htmlspecialchars($img) ?>" alt="<?= htmlspecialchars($projet->getTitre()) . ' — vue ' . ($i + 1) ?>" loading="lazy"></figure>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
            <div class="actions">
                <?php if ($projet->aUnLienGitlab()): ?>
                    <a class="bouton" href="<?= htmlspecialchars($projet->getGitlab()) ?>" target="_blank" rel="noopener noreferrer">Voir le code</a>
                <?php endif; ?>
                <a class="bouton" href="projets.php">Retour aux projets</a>
            </div>
        </section>

        <nav class="actes" id="actes" aria-label="Actes du projet">
            <a href="core.php" id="retour">← CORE</a>
            <button data-act="0" class="on">DISCOVER</button><button data-act="1">UNDERSTAND</button><button data-act="2">EXPERIENCE</button><button data-act="3">RESULT</button>
        </nav>
        <button class="son skip" id="skip">Version simple</button>
        <button class="bouton guide" id="suiv">Suivre la lumière</button>
        <p class="astuce" id="astuce">Espace : avancer · Échap : revenir · clic : onde · double-clic : accélérer</p>
        <button class="son" id="son" aria-label="Couper ou activer le son">🔊</button>
    </main>

    <script>
        window.projetData = <?= json_encode([
                "titre" => $projet->getTitre(),
                "description" => $projet->getDescription(),
                "technologies" => array_values($technologies),
                "images" => array_values($images),
        ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?>;
    </script>
    <script type="importmap">
        { "imports": {
            "three": "https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js",
            "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/"
        } }
    </script>
    <script type="module" src="js/detail-projet.js"></script>

<?php include 'includes/footer.php'; ?>