<?php

require_once 'Projet.php';

/**
 * Affiche la carte d'un projet.
 *
 * @param Projet $projet Projet à afficher.
 * @param bool $admin Si true, affiche les boutons Modifier et Supprimer.
 */
function afficherCarteProjet(Projet $projet, bool $admin = false): void
{
    $images = $projet->getImages();
    $image = $projet->getPremiereImage();
    $technologies = $projet->getTechnologies();
    $dateCreation = $projet->getDateCreation();
    ?>
    <div class="carte-projet">
        <?php if (!empty($images)): ?>
            <div class="carrousel">
                <?php foreach ($images as $i => $img): ?>
                    <img class="image-projet<?php echo $i === 0 ? ' active' : ''; ?>" src="<?php echo htmlspecialchars($img); ?>" alt="<?php echo htmlspecialchars($projet->getTitre()); ?>">
                <?php endforeach; ?>
                <?php if (count($images) > 1): ?>
                    <button type="button" class="fleche fleche-gauche" aria-label="Image précédente">‹</button>
                    <button type="button" class="fleche fleche-droite" aria-label="Image suivante">›</button>
                <?php endif; ?>
            </div>
        <?php endif; ?>
        <div class="contenu-projet">
            <h3><?php echo htmlspecialchars($projet->getTitre()); ?></h3>
            <?php if ($dateCreation): ?>
                <span class="date-projet" data-date="<?php echo htmlspecialchars($dateCreation); ?>">
                    Créé le <?php echo date("d/m/Y", strtotime($dateCreation)); ?>
                </span>
            <?php endif; ?>
            <?php
            $description = $projet->getDescription();
            $limiteDescription = 180;
            $descriptionLongue = mb_strlen($description) > $limiteDescription;
            ?>

            <div class="description-container">
                <?php if ($descriptionLongue): ?>

                    <p class="description-projet">
            <span class="description-courte">
                <?php echo htmlspecialchars(mb_substr($description, 0, $limiteDescription)); ?>...
            </span>

                        <span class="description-complete">
                <?php echo htmlspecialchars($description); ?>
            </span>
                    </p>

                    <button type="button" class="bouton-voir-plus">
                        Voir plus
                    </button>

                <?php else: ?>

                    <p class="description-projet">
                        <?php echo htmlspecialchars($description); ?>
                    </p>

                <?php endif; ?>
            </div>
            <?php if (!empty($technologies)): ?>
                <div class="technologies">
                    <?php foreach ($technologies as $techno): ?>
                        <span><?php echo htmlspecialchars($techno); ?></span>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
            <div class="bas-carte">
                <?php if ($projet->aUnLienGitlab()): ?>
                    <a class="lien-gitlab" href="<?php echo htmlspecialchars($projet->getGitlab()); ?>" target="_blank" rel="noopener noreferrer">
                        <img src="images/github.png" alt="GitHub">
                        GitHub
                    </a>
                <?php else: ?>
                    <span></span>
                <?php endif; ?>

                <a class="lien-projet" href="detail-projet.php?id=<?php echo urlencode($projet->getId()); ?>">
                    Voir le projet
                </a>

                <?php if ($admin): ?>
                    <div class="actions-admin">
                        <a class="bouton-modifier" href="admin.php?id=<?php echo urlencode($projet->getId()); ?>" title="Modifier le projet" aria-label="Modifier le projet">✎</a>
                        <button type="button" class="bouton-supprimer" title="Supprimer le projet" aria-label="Supprimer le projet" onclick="ouvrirConfirmation('supprimer', '<?php echo htmlspecialchars($projet->getId()); ?>', 'Supprimer ce projet ?', 'Cette action est définitive.', true)">×</button>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <script src="js/voirPlus.js"></script>
    <?php
}