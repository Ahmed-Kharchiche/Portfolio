<?php
// #region MODE IMMERSIF
?>
    <link rel="stylesheet" href="css/immersif.css">
    <div id="mode-immersif">

        <!-- #region DÉCOR 3D -->

        <canvas id="scene-3d" aria-hidden="true"></canvas>
        <div class="voile" aria-hidden="true"></div>
        <div class="flash" id="flash" aria-hidden="true"></div>

        <!-- #endregion -->


        <!-- #region ZONE 0 : DISCOVER -->

        <section class="zone" data-zone="0">
            <p class="label">01 — Discover</p>

            <h1><?= htmlspecialchars($projet->getTitre()) ?></h1>

            <?php if ($projet->getDateCreation()): ?>
                <span class="date">
                Créé le <?= date("d/m/Y", strtotime($projet->getDateCreation())) ?>
            </span>
            <?php endif; ?>
        </section>

        <!-- #endregion -->


        <!-- #region ZONE 1 : UNDERSTAND -->

        <section class="zone" data-zone="1">
            <p class="label">02 — Understand</p>
            <h2>Le projet</h2>

            <p class="texte">
                <?= nl2br(htmlspecialchars($projet->getDescription())) ?>
            </p>
        </section>

        <!-- #endregion -->


        <!-- #region ZONE 2 : EXPERIENCE -->

        <section class="zone" data-zone="2">
            <p class="label">03 — Experience</p>
            <h2>Technologies</h2>

            <div class="techs">
                <?php foreach ($technologies as $technologie): ?>
                    <span><?= htmlspecialchars($technologie) ?></span>
                <?php endforeach; ?>
            </div>
        </section>

        <!-- #endregion -->


        <!-- #region ZONE 3 : RESULT -->

        <section class="zone" data-zone="3">
            <p class="label">04 — Result</p>

            <?php if (!empty($images)): ?>
                <div class="galerie">
                    <?php foreach ($images as $index => $img): ?>
                        <figure>
                            <img
                                src="<?= htmlspecialchars($img) ?>"
                                alt="<?= htmlspecialchars($projet->getTitre()) . ' — vue ' . ($index + 1) ?>"
                                loading="lazy"
                            >
                        </figure>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <div class="actions">
                <?php if ($projet->aUnLienGitlab()): ?>
                    <a
                        class="bouton"
                        href="<?= htmlspecialchars($projet->getGitlab()) ?>"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Voir le code
                    </a>
                <?php endif; ?>

                <a class="bouton" href="projets.php">
                    Retour aux projets
                </a>
            </div>
        </section>

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

        <p class="astuce" id="astuce">
            Espace : avancer · Échap : revenir · clic : onde · double-clic : accélérer
        </p>

        <button id="skip" type="button">Version simple</button>

        <?php if ($projet->getTemplate()): ?>
            <a class="bouton bouton-simple" id="changer-template">
                Voir la présentation
            </a>
        <?php endif; ?>

        <button class="son" id="son" type="button" aria-label="Couper ou activer le son">
            🔊
        </button>

        <!-- #endregion -->

        <!-- JAVASCRIPT -->
        <script type="module" src="js/immersif.js"></script>
        <script src="js/switch-template.js"></script>
    </div>

<?php
// #endregion
?>