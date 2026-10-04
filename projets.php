<?php
$titre_page = "Projets";
$page_css = "projets.css";

require_once 'includes/Projet.php';
require_once 'includes/GestionnaireProjets.php';
require_once 'includes/affichage_projets.php';

$gestionnaire = new GestionnaireProjets("projets.json");

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
            <p class="message-vide">Aucun projet ajouté pour l'instant.</p>
        <?php else: ?>
            <div class="tri-projets">
                <label for="tri-projets">Trier par</label>
                <select id="tri-projets">
                    <option value="original">Ordre d'origine</option>
                    <option value="az">Nom A → Z</option>
                    <option value="za">Nom Z → A</option>
                    <option value="recent">Plus récent</option>
                    <option value="ancien">Plus ancien</option>
                </select>
            </div>
            <div class="filtre-technologies">
                <span class="filtre-titre">Technologies</span>
                <div class="technologies-filtres">
                    <?php foreach ($technologies_disponibles as $technologie): ?>
                        <label class="filtre-technologie">
                            <input type="checkbox" value="<?php echo htmlspecialchars($technologie); ?>">
                            <span><?php echo htmlspecialchars($technologie); ?></span>
                        </label>
                    <?php endforeach; ?>
                </div>
            </div>
            <div class="grille-projets">
                <?php foreach ($projets as $projet): ?>
                    <?php afficherCarteProjet($projet); ?>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <section class="zone-jeu">
            <div class="zone-jeu-entete">
                <h2>Petite pause</h2>
                <p>Un mini-jeu pour se détendre entre deux projets.</p>
            </div>
            <div id="zone-jeu-contenu" class="zone-jeu-contenu">
                <p class="zone-jeu-vide">Bientôt un jeu ici 🎮</p>
            </div>
        </section>
    </main>
    <script src="js/moveProjets.js"></script>
    <script src="js/projetsTri.js"></script>
    <script src="js/carrousel.js"></script>
    <script src="js/listeDeroulante.js"></script>
    <script src="js/dinoBugs.js"></script>
<?php include 'includes/footer.php'; ?>