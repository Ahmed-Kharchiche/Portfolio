<?php

require_once 'includes/Projet.php';
require_once 'includes/GestionnaireProjets.php';

$gestionnaire = new GestionnaireProjets("projets.json");

$id = $_GET["id"] ?? "";
$projet = $gestionnaire->trouverParId($id);

if ($projet === null) {
    http_response_code(404);
    exit("Projet introuvable");
}

$titre_page = $projet->getTitre();
$page_css = "detail-projet.css";

$image = $projet->getPremiereImage();
$technologies = $projet->getTechnologies();
$images = method_exists($projet, 'getImages') ? ($projet->getImages() ?: []) : ($image ? [$image] : []);

include 'includes/header.php';
?>

    <main class="detail-projet">

        <canvas id="scene-3d" aria-hidden="true"></canvas>
        <div class="voile" aria-hidden="true"></div>

        <div class="chargement" id="chargement">
            <span>Entrée dans la forêt</span>
        </div>

        <div class="interface-projet">

            <section class="section-projet section-intro" data-section="intro">
                <div class="bloc-projet">
                    <p class="petit-label">Projet</p>
                    <h1><?php echo htmlspecialchars($projet->getTitre()); ?></h1>

                    <?php if ($projet->getDateCreation()): ?>
                        <span class="date-projet">
                        Créé le <?php echo date("d/m/Y", strtotime($projet->getDateCreation())); ?>
                    </span>
                    <?php endif; ?>

                    <button class="bouton-explorer" data-target="description">
                        Suivre le chemin
                    </button>
                </div>
            </section>

            <section class="section-projet section-description" id="description" data-section="description">
                <div class="bloc-projet bloc-gauche">
                    <p class="petit-label">Contexte</p>
                    <h2>Le projet</h2>
                    <p class="texte"><?php echo nl2br(htmlspecialchars($projet->getDescription())); ?></p>
                </div>
            </section>

            <section class="section-projet section-technologies" id="technologies" data-section="technologies">
                <div class="bloc-projet bloc-droite">
                    <p class="petit-label">Outils</p>
                    <h2>Technologies utilisées</h2>
                    <div class="technologies-detail">
                        <?php foreach ($technologies as $technologie): ?>
                            <span><?php echo htmlspecialchars($technologie); ?></span>
                        <?php endforeach; ?>
                    </div>
                </div>
            </section>

            <section class="section-projet section-resultat" id="resultat" data-section="resultat">
                <div class="bloc-projet bloc-large">
                    <p class="petit-label">Résultat</p>

                    <?php if ($images): ?>
                        <div class="galerie">
                            <?php foreach ($images as $i => $img): ?>
                                <figure class="image-detail">
                                    <img src="<?php echo htmlspecialchars($img); ?>"
                                         alt="<?php echo htmlspecialchars($projet->getTitre()) . ' — vue ' . ($i + 1); ?>"
                                         loading="lazy">
                                </figure>
                            <?php endforeach; ?>
                        </div>
                    <?php endif; ?>

                    <div class="actions">
                        <?php if ($projet->aUnLienGitlab()): ?>
                            <a class="bouton-projet" href="<?php echo htmlspecialchars($projet->getGitlab()); ?>"
                               target="_blank" rel="noopener noreferrer">Voir le code</a>
                        <?php endif; ?>
                        <a class="bouton-projet secondaire" href="projets.php">Retour aux projets</a>
                    </div>
                </div>
            </section>

        </div>

        <div class="indicateur-scroll" aria-hidden="true">
            <span></span><span></span><span></span><span></span>
        </div>

        <p class="astuce" id="astuce">Fais défiler, ou clique sur les lanternes</p>
        <div class="toast" id="toast" role="status"></div>

    </main>

    <script>
        window.projetData = <?php echo json_encode([
            "titre" => $projet->getTitre(),
            "image" => $image,
            "sections" => [
                "intro" => 0,
                "description" => 0.33,
                "technologies" => 0.66,
                "resultat" => 1
            ]
        ], JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT); ?>;
    </script>

    <script type="importmap">
        {
            "imports": {
                "three": "https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js",
                "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.186.0/examples/jsm/"
            }
        }
    </script>

    <script type="module" src="js/detail-projet.js"></script>

<?php include 'includes/footer.php'; ?>