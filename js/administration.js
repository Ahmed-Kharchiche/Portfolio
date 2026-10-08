// #region ÉLÉMENTS
const inputImages = document.getElementById("images");
const aperçuImages = document.getElementById("aperçu-images");
let fichiers = [];
// #endregion

// #region APERÇU DES NOUVELLES IMAGES
inputImages.addEventListener("change", () => {
    fichiers.push(...inputImages.files);
    majAperçus();
});

function majAperçus() {
    // Synchronise l'input avec la liste (pour que le formulaire envoie les bons fichiers)
    const transfert = new DataTransfer();
    fichiers.forEach(f => transfert.items.add(f));
    inputImages.files = transfert.files;

    // Supprime uniquement les anciens aperçus de nouveaux fichiers
    aperçuImages.querySelectorAll(".aperçu-image:not(.image-existante)").forEach(el => el.remove());

    fichiers.forEach((fichier, index) => {
        const conteneur = document.createElement("div");
        conteneur.className = "aperçu-image";
        conteneur.innerHTML = `
            <img>
            <div class="aperçu-image-nom"></div>
            <button type="button" class="supprimer-image">×</button>`;

        const image = conteneur.querySelector("img");
        image.src = URL.createObjectURL(fichier);
        image.alt = fichier.name;
        image.onload = () => URL.revokeObjectURL(image.src);

        conteneur.querySelector(".aperçu-image-nom").textContent = fichier.name;

        const bouton = conteneur.querySelector("button");
        bouton.setAttribute("aria-label", "Supprimer " + fichier.name);
        bouton.onclick = () => {
            fichiers.splice(index, 1);
            majAperçus();
        };

        aperçuImages.appendChild(conteneur);
    });
}
// #endregion

// #region SUPPRESSION D'UNE IMAGE EXISTANTE
aperçuImages.addEventListener("click", e => {
    const bouton = e.target.closest(".image-existante .supprimer-image");
    if (!bouton) return;

    // Mémorise l'image à supprimer pour l'envoyer avec le formulaire
    const champ = document.createElement("input");
    champ.type = "hidden";
    champ.name = "images_supprimees[]";
    champ.value = bouton.dataset.image;
    inputImages.form.appendChild(champ);

    bouton.closest(".aperçu-image").remove();
});
// #endregion