document.querySelectorAll(".bouton-favori").forEach(bouton => {
    bouton.addEventListener("click", async () => {
        const titre = bouton.dataset.titre;

        const donnees = new URLSearchParams({
            action: "toggle_favori",
            titre: titre
        });

        try {
            const reponse = await fetch("admin.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded"
                },
                body: donnees
            });

            const resultat = await reponse.json();

            if (!reponse.ok || !resultat.succes) {
                throw new Error("Impossible de modifier le favori.");
            }

            // Mettre à jour l'étoile selon la réponse de PHP
            bouton.textContent = resultat.favori ? "★" : "☆";
            bouton.classList.toggle("selectionne", resultat.favori);

            const description = resultat.favori
                ? "Retirer des favoris"
                : "Ajouter aux favoris";

            bouton.title = description;
            bouton.setAttribute("aria-label", description);
            bouton.setAttribute("aria-pressed", String(resultat.favori));

        } catch (erreur) {
            console.error("Erreur favori :", erreur);
            alert("Erreur : " + erreur.message);
        }
    });
});

