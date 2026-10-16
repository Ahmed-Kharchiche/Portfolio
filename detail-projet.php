
<?php
require_once 'includes/Projet.php';
require_once 'includes/GestionnaireProjets.php';

// Récupération du projet
$gestionnaire = new GestionnaireProjets("data/projets.json");
$projet = $gestionnaire->trouverParId($_GET["id"] ?? "");

if ($projet === null) {
    http_response_code(404);
    exit("Projet introuvable");
}

// Configuration de la page
$titre_page = $projet->getTitre();
$page_css = "detail-projet.css";
$sans_smooth = true;

// Données utilisées par les templates
$technologies = $projet->getTechnologies() ?: [];
$images = $projet->getImages() ?: [];

// Choix du template
$template = $projet->getTemplate();

// Chargement du header
include 'includes/header.php';

    ?>

    <script>
        window.projetData = <?= json_encode([
                "titre" => $projet->getTitre(),
                "description" => $projet->getDescription(),
                "technologies" => array_values($technologies),
                "images" => array_values($images),
                "template" => $template,
        ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?>;
    </script>

    <script type="importmap">
        {
            "imports": {
                "three": "https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/"
            }
        }
    </script>
    <?php


    include __DIR__ . '/includes/templates/immersif.php';


// Chargement du footer
include 'includes/footer.php';
?>