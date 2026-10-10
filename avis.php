<?php
// #region CONFIGURATION DE LA PAGE
$titre_page = "Avis";
$page_css = "avis.css";

require_once 'includes/Avis.php';
require_once 'includes/GestionnaireAvis.php';
require_once 'includes/affichage_avis.php';
// #endregion

include 'includes/header.php';

// #region INITIALISATION
$gestionnaireAvis = new GestionnaireAvis("data/avis.json");

$messageConfirmation = '';
$erreur = '';
// #endregion

// #region TRAITEMENT DU FORMULAIRE
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nom = trim($_POST['nom'] ?? '');
    $note = (int) ($_POST['note'] ?? 0);
    $message = trim($_POST['message'] ?? '');

    if ($nom === '' || $message === '') {
        $erreur = 'Veuillez remplir tous les champs.';
    } elseif ($note < 1 || $note > 5) {
        $erreur = 'Veuillez choisir une note entre 1 et 5.';
    } else {
        $avis = new Avis(
            '',
            $nom,
            $note,
            $message,
            date('Y-m-d'),
            false
        );

        $gestionnaireAvis->ajouter($avis);
        $messageConfirmation = 'Merci pour votre avis ! Il sera publié après validation.';
    }
}
// #endregion

// #region AVIS PUBLIÉS ET MOYENNE
$avisPublies = [];
$totalNotes = 0;

foreach ($gestionnaireAvis->getTous() as $avis) {
    if ($avis->estPublie()) {
        $avisPublies[] = $avis;
        $totalNotes += $avis->getNote();
    }
}

$moyenneAvis = count($avisPublies) > 0
        ? $totalNotes / count($avisPublies)
        : 0;
// #endregion
?>

<!-- #region PAGE AVIS -->
<main class="avis" id="haut">

    <!-- #region INTRODUCTION -->
    <section class="avis-intro">
        <h1>AVIS</h1>
        <div class="ligne-titre"></div>
        <p>
            Découvrez les avis et partagez votre expérience.
        </p>

        <a href="#ajouter-avis" class="bouton">
            Ajouter un avis
        </a>
    </section>
    <!-- #endregion -->

    <!-- #region MOYENNE DES AVIS -->
    <div class="moyenne-avis">
        <h2>Moyenne des avis</h2>

        <div class="moyenne-note">
            <div class="etoiles-moyenne">
                <?php for ($i = 1; $i <= 5; $i++): ?>
                    <?php
                    $remplissage = max(0, min(100, ($moyenneAvis - ($i - 1)) * 100));
                    ?>
                    <span style="--remplissage: <?php echo $remplissage; ?>%;">★</span>
                <?php endfor; ?>
            </div>

            <div class="moyenne-valeur">
                <?php echo number_format($moyenneAvis, 2, ',', ''); ?>
            </div>
        </div>
    </div>
    <!-- #endregion -->

    <!-- #region LISTE DES AVIS -->
    <section class="liste-avis" id="avis">

        <h2>Avis publiés : </h2>

        <div class="tri-avis">
            <label for="tri-avis">Trier par</label>
            <select id="tri-avis" class="liste-perso">
                <option value="original">Ordre d'origine</option>
                <option value="note-desc">Plus d'étoiles</option>
                <option value="note-asc">Moins d'étoiles</option>
                <option value="recent">Plus récent</option>
                <option value="ancien">Plus ancien</option>
            </select>
        </div>

        <?php if (empty($avisPublies)): ?>
            <p class="aucun-avis">
                Aucun avis pour le moment.
            </p>
        <?php else: ?>
            <?php foreach ($avisPublies as $avis): ?>
                <?php afficherCarteAvis($avis); ?>
            <?php endforeach; ?>
        <?php endif; ?>
        <div class="avis-ajouter-bas">
            <p id="laisser-avis">Vous souhaitez laisser un avis ?</p>
        </div>
    </section>
    <!-- #endregion -->

    <!-- #region FORMULAIRE D'AVIS -->
    <section class="formulaire-avis" id="ajouter-avis">

        <h2>Laisser un avis</h2>

        <?php if ($messageConfirmation): ?>
            <p class="message-confirmation">
                <?php echo htmlspecialchars($messageConfirmation); ?>
            </p>
        <?php endif; ?>

        <?php if ($erreur): ?>
            <p class="message-erreur">
                <?php echo htmlspecialchars($erreur); ?>
            </p>
        <?php endif; ?>

        <form method="POST">

            <div class="champ">
                <label for="nom">Nom</label>
                <input
                    type="text"
                    id="nom"
                    name="nom"
                    placeholder="Votre nom"
                    maxlength="50"
                    required
                >
            </div>

            <div class="champ">
                <label for="note">Note</label>
                <select id="note" name="note" required>
                    <option value="">Choisir une note</option>
                    <option value="1">1 / 5</option>
                    <option value="2">2 / 5</option>
                    <option value="3">3 / 5</option>
                    <option value="4">4 / 5</option>
                    <option value="5">5 / 5</option>
                </select>
            </div>

            <div class="champ">
                <label for="message">Avis</label>

                <div class="textarea-container">
                <textarea
                    id="message"
                    name="message"
                    rows="5"
                    maxlength="2000"
                    placeholder="Votre avis..."
                    required
                ></textarea>

                    <span class="compteur" id="compteur-message">0 / 2000</span>
                </div>
            </div>
            <script>
                const message = document.getElementById("message");
                const compteur = document.getElementById("compteur-message");

                message.addEventListener("input", () => {
                    compteur.textContent = `${message.value.length} / 2000`;
                });
            </script>

            <button type="submit">
                Envoyer mon avis
            </button>

        </form>

    </section>
    <!-- #endregion -->
</main>
<!-- #endregion -->

<!-- #region SCRIPTS -->
<script src="js/avisTri.js"></script>
<script src="js/listeDeroulante.js"></script>
<!-- #endregion -->

<?php include 'includes/footer.php'; ?>
