// #region OUVERTURE DE LA CONFIRMATION
function ouvrirConfirmation(action, id, titre, message, danger = false) {
    const modale = document.getElementById("modale-confirmation");
    const contenu = modale.querySelector(".confirmation-contenu");
    const titreElement = document.getElementById("confirmation-titre");
    const messageElement = document.getElementById("confirmation-message");
    const actionElement = document.getElementById("confirmation-action");
    const idElement = document.getElementById("confirmation-id");
    const bouton = document.getElementById("confirmation-valider");
    const icone = document.getElementById("confirmation-icone");

    titreElement.textContent = titre;
    messageElement.textContent = message;
    actionElement.value = action;
    idElement.value = id;

    contenu.classList.toggle("confirmation-danger", danger);

    if (danger) {
        icone.textContent = "!";
        bouton.textContent = "Supprimer";
    } else {
        icone.textContent = "✓";
        bouton.textContent = "Confirmer";
    }

    modale.classList.add("active");
}
// #endregion

// #region FERMETURE DE LA CONFIRMATION
function fermerConfirmation() {
    document.getElementById("modale-confirmation").classList.remove("active");
}
// #endregion

// #region FERMETURE AU CLAVIER
document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        fermerConfirmation();
    }
});
// #endregion