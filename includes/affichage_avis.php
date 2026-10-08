<?php
declare(strict_types=1);

require_once __DIR__ . '/Avis.php';

// #region ARGUMENTS JAVASCRIPT
if (!function_exists('avisArgumentsJs')) {
    /**
     * Prépare des arguments PHP pour les mettre dans un attribut onclick="".
     * Chaque valeur est encodée en JSON (donc correctement quotée pour JavaScript),
     * puis échappée pour l'HTML.
     */
    function avisArgumentsJs(mixed ...$arguments): string
    {
        $encodes = array_map(
                fn(mixed $valeur): string => json_encode(
                        $valeur,
                        JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
                ),
                $arguments
        );

        return htmlspecialchars(implode(', ', $encodes), ENT_QUOTES);
    }
}
// #endregion

// #region CARTE D'UN AVIS
/**
 * Affiche la carte d'un avis.
 *
 * @param Avis $avis  Avis à afficher.
 * @param bool $admin Affiche les boutons Valider / Refuser si true.
 */
function afficherCarteAvis(Avis $avis, bool $admin = false): void
{
    $note = $avis->getNote();
    $id = $avis->getId();

    $timestamp = strtotime($avis->getDate());
    $dateAffichee = $timestamp !== false ? date('d/m/Y', $timestamp) : $avis->getDate();
    ?>
    <article class="carte-avis"
             data-note="<?php echo $note; ?>"
             data-date="<?php echo htmlspecialchars($avis->getDate()); ?>">
        <div class="entete-avis">
            <div>
                <h3><?php echo htmlspecialchars($avis->getNom()); ?></h3>
                <time class="date-avis" datetime="<?php echo htmlspecialchars($avis->getDate()); ?>">
                    <?php echo htmlspecialchars($dateAffichee); ?>
                </time>
            </div>

            <div class="note-avis" role="img" aria-label="Note : <?php echo $note; ?> sur <?php echo Avis::NOTE_MAX; ?>">
                <?php for ($i = 1; $i <= Avis::NOTE_MAX; $i++): ?>
                    <span class="etoile <?php echo $i <= $note ? 'active' : ''; ?>" aria-hidden="true">★</span>
                <?php endfor; ?>
            </div>
        </div>

        <p class="message-avis">
            <?php echo nl2br(htmlspecialchars($avis->getMessage())); ?>
        </p>

        <?php if ($admin): ?>
            <div class="actions-avis">
                <button type="button" class="bouton-valider-avis"
                        onclick="ouvrirConfirmation(<?php echo avisArgumentsJs(
                                'publier_avis',
                                $id,
                                'Publier cet avis ?',
                                'L’avis deviendra visible sur votre portfolio.'
                        ); ?>)">
                    Valider
                </button>
                <button type="button" class="bouton-refuser-avis"
                        onclick="ouvrirConfirmation(<?php echo avisArgumentsJs(
                                'supprimer_avis',
                                $id,
                                'Refuser cet avis ?',
                                'Cet avis sera définitivement supprimé.',
                                true
                        ); ?>)">
                    Refuser
                </button>
            </div>
        <?php endif; ?>
    </article>
    <?php
}
// #endregion

// #region PETIT AVIS
function afficherPetitAvis(Avis $avis, bool $admin = false): void
{
    $note = $avis->getNote();
    $id = $avis->getId();

    $timestamp = strtotime($avis->getDate());
    $dateAffichee = $timestamp !== false ? date('d/m/Y', $timestamp) : $avis->getDate();
    ?>
    <article class="petit-avis">
        <div class="petit-avis-entete">
            <div>
                <h3><?php echo htmlspecialchars($avis->getNom()); ?></h3>
                <time class="petit-avis-date" datetime="<?php echo htmlspecialchars($avis->getDate()); ?>">
                    <?php echo htmlspecialchars($dateAffichee); ?>
                </time>
            </div>

            <div class="petit-avis-note"
                 role="img"
                 aria-label="Note : <?php echo $note; ?> sur <?php echo Avis::NOTE_MAX; ?>">
                <?php for ($i = 1; $i <= Avis::NOTE_MAX; $i++): ?>
                    <span class="petit-avis-etoile <?php echo $i <= $note ? 'active' : ''; ?>" aria-hidden="true">★</span>
                <?php endfor; ?>
            </div>
        </div>

        <p class="petit-avis-message">
            <?php echo nl2br(htmlspecialchars($avis->getMessage())); ?>
        </p>

        <?php if ($admin): ?>
            <div class="actions-avis">
                <button type="button"
                        class="bouton-supprimer-avis"
                        onclick="ouvrirConfirmation(<?php echo avisArgumentsJs(
                                'supprimer_avis',
                                $id,
                                'Supprimer cet avis ?',
                                'Cet avis sera définitivement supprimé.',
                                true
                        ); ?>)"
                        aria-label="Supprimer cet avis">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M3 6h18"/>
                        <path d="M8 6V4h8v2"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v5"/>
                        <path d="M14 11v5"/>
                    </svg>
                </button>
            </div>
        <?php endif; ?>
    </article>
    <?php
}
// #endregion