<?php

require_once 'Projet.php';

/**
 * Affiche la carte d'un projet, avec le style défini dans css/projet-carte.css.
 * Utilisable depuis n'importe quelle page (admin.php, projets.php, projet.php...),
 * du moment que la page inclut bien ce fichier CSS.
 */

function afficherCarteProjet(Projet $projet): void
{
    $image = $projet->getPremiereImage();
    $technologies = $projet->getTechnologies();
    ?>
    <div class="carte-projet">

        <?php if ($image): ?>
            <img class="image-projet"
                 src="<?php echo htmlspecialchars($image); ?>"
                 alt="<?php echo htmlspecialchars($projet->getTitre()); ?>">
        <?php endif; ?>

        <div class="contenu-projet">

            <h3><?php echo htmlspecialchars($projet->getTitre()); ?></h3>

            <p><?php echo htmlspecialchars($projet->getDescription()); ?></p>

            <?php if (!empty($technologies)): ?>
                <div class="technologies">
                    <?php foreach ($technologies as $techno): ?>
                        <span><?php echo htmlspecialchars($techno); ?></span>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>

            <div class="bas-carte">

                <?php if ($projet->aUnLienGitlab()): ?>
                    <a class="lien-gitlab"
                       href="<?php echo htmlspecialchars($projet->getGitlab()); ?>"
                       target="_blank">
                        GitLab
                    </a>
                <?php else: ?>
                    <span></span>
                <?php endif; ?>


            </div>

        </div>

    </div>
    <?php
}