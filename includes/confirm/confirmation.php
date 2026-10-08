<?php

// #region MODALE DE CONFIRMATION
function afficherConfirmation(): void
{
    ?>
    <link rel="stylesheet" href="includes/confirm/confirmation.css">
    <div class="modale-confirmation" id="modale-confirmation">
        <div class="confirmation-contenu">
            <button type="button" class="confirmation-fermer" onclick="fermerConfirmation()">×</button>

            <div class="confirmation-icone" id="confirmation-icone">?</div>

            <h2 id="confirmation-titre">Confirmation</h2>

            <p id="confirmation-message"></p>

            <div class="confirmation-actions">
                <button type="button" class="confirmation-annuler" onclick="fermerConfirmation()">
                    Annuler
                </button>

                <form method="POST" id="confirmation-form">
                    <input type="hidden" name="action" id="confirmation-action">
                    <input type="hidden" name="id" id="confirmation-id">

                    <button type="submit" id="confirmation-valider">
                        Confirmer
                    </button>
                </form>
            </div>
        </div>
    </div>
    <?php
}
// #endregion