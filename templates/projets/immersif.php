<?php
// #region MODE IMMERSIF
?>
    <link rel="stylesheet" href="assets/css/pages/immersif.css">
    <div id="mode-immersif">
        <small id="credit-planete" hidden>
            <a href="https://sketchfab.com/3d-models/ringed-gas-giant-planet-b4e21775e84e4cf3890f7796cfab1aca" target="_blank" rel="noopener noreferrer">Ringed Gas Giant Planet</a>
            par <a href="https://sketchfab.com/berzerkey" target="_blank" rel="noopener noreferrer">berzerkey</a>
            · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
            · cadrage et animation adaptés
        </small>

        <!-- #region DÉCOR 3D -->

        <canvas id="scene-3d" aria-hidden="true"></canvas>
        <div class="voile" aria-hidden="true"></div>
        <div class="flash" id="flash" aria-hidden="true"></div>

        <!-- #endregion -->


        <!-- #region COMMANDES IMMERSIVES -->

        <nav class="actes" id="actes" aria-label="Actes du projet">
            <a href="projets.php">← BACK</a>

            <button data-act="0" class="on">DISCOVER</button>
            <button data-act="1">UNDERSTAND</button>
            <button data-act="2">EXPERIENCE</button>
            <button data-act="3">RESULT</button>
        </nav>

        <button class="bouton guide" id="suiv" type="button">
            Suivre la lumière
        </button>

        <div class="commandes-focus" role="group" aria-label="Contrôle de la caméra">
            <button class="bouton" id="focus-camera" type="button" aria-pressed="false" disabled>FOCUS</button>
        </div>

        <div class="navigation-images" id="navigation-images" role="group" aria-label="Navigation du résultat" hidden>
            <div class="pagination-galerie">
                <span id="nom-element"></span>
                <span id="position-image" role="status" aria-live="polite" aria-atomic="true"></span>
                <div class="indicateurs-galerie" id="indicateurs-galerie" role="group" aria-label="Choisir un élément"></div>
            </div>
        </div>

        <p class="astuce" id="astuce">
            Espace : avancer · Échap : revenir · clic : onde · double-clic : accélérer
        </p>

        <?php if ($projet->getTemplate()): ?>
            <a class="bouton bouton-presentation" id="changer-template" href="<?= htmlspecialchars($projet->getTemplate() . '.php?id=' . urlencode((string) $projet->getId()), ENT_QUOTES, 'UTF-8') ?>">
                Voir la présentation
            </a>
        <?php endif; ?>

        <button class="son" id="son" type="button" aria-label="Couper ou activer le son">
            🔊
        </button>

        <!-- #endregion -->

        <!-- JAVASCRIPT -->
        <script type="module">
            const presentation = document.getElementById("changer-template");
            if (matchMedia("(prefers-reduced-motion: reduce)").matches && presentation) {
                // La présentation dédiée gère déjà la préférence de réduction des animations.
                window.location.replace(presentation.href);
            } else {
                import("./assets/js/projets/immersif.js");
            }
        </script>
    </div>

<?php
// #endregion
?>
