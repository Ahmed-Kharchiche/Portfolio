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
                    <a class="lien-gitlab" href="<?php echo htmlspecialchars($projet->getGitlab()); ?>" target="_blank" rel="noopener noreferrer">
                        <img src="images/github.png" alt="GitHub">
                        GitHub
                    </a>
                <?php else: ?>
                    <span></span>
                <?php endif; ?>
                <?php if ($admin): ?>
                    <div class="actions-admin">
                        <a class="bouton-modifier" href="admin.php?id=<?php echo urlencode($projet->getId()); ?>">Modifier</a>
                        <form method="POST" action="admin.php" onsubmit="return confirm('Êtes-vous sûr de vouloir supprimer ce projet ?');">
                            <input type="hidden" name="action" value="supprimer">
                            <input type="hidden" name="id" value="<?php echo htmlspecialchars($projet->getId()); ?>">
                            <button type="submit" class="bouton-supprimer">Supprimer</button>
                        </form>
                    </div>
                <?php endif; ?>
            </div>
        </div>
    </div>
    <?php
}