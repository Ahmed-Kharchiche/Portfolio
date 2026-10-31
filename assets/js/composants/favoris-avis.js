
document.querySelectorAll(".bouton-favori-petit-avis").forEach(bouton => {
    bouton.addEventListener("click", async () => {
        const id = bouton.dataset.id;

        if (!id) {
            alert("Erreur : identifiant de l'avis introuvable.");
            return;
        }

        const donnees = new URLSearchParams({
            action: "toggle_favori_avis",
            id: id
        });

        try {
            bouton.disabled = true;

            const reponse = await fetch("admin.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: donnees
            });

            const resultat = await reponse.json();

            if (!reponse.ok || !resultat.succes) {
                throw new Error(
                    resultat.message || "Impossible de modifier le favori."
                );
            }

            // Mettre à jour l'étoile selon la réponse de PHP.
            bouton.textContent = resultat.favori ? "★" : "☆";
            bouton.classList.toggle("selectionne", resultat.favori);

            const description = resultat.favori
                ? "Retirer des favoris"
                : "Ajouter aux favoris";

            bouton.title = description;
            bouton.setAttribute("aria-label", description);
            bouton.setAttribute("aria-pressed", String(resultat.favori));

        } catch (erreur) {
            console.error("Erreur favori avis :", erreur);
            alert("Erreur : " + erreur.message);

        } finally {
            bouton.disabled = false;
        }
    });
});
