// #region ÉLÉMENTS
const triAvis = document.getElementById('tri-avis');
const listeAvis = document.querySelector('.liste-avis');
// #endregion

// #region TRI DES AVIS
if (triAvis && listeAvis) {
    // #region TRI DES CARTES
    const cartesOriginales = [
        ...listeAvis.querySelectorAll('.carte-avis')
    ];

    function trierCartes(cartes) {
        const typeTri = triAvis.value;

        if (typeTri === 'original') {
            return [...cartes];
        }

        return [...cartes].sort((a, b) => {
            if (typeTri === 'note-desc' || typeTri === 'note-asc') {
                const noteA = Number(a.dataset.note) || 0;
                const noteB = Number(b.dataset.note) || 0;

                return typeTri === 'note-desc'
                    ? noteB - noteA
                    : noteA - noteB;
            }

            if (typeTri === 'recent' || typeTri === 'ancien') {
                const dateA = a.dataset.date || '';
                const dateB = b.dataset.date || '';

                if (!dateA && !dateB) return 0;
                if (!dateA) return 1;
                if (!dateB) return -1;

                const comparaison = dateA.localeCompare(dateB);

                return typeTri === 'recent'
                    ? -comparaison
                    : comparaison;
            }

            return 0;
        });
    }
    // #endregion

    // #region MISE À JOUR DE L'AFFICHAGE
    function mettreAJourAvis() {
        const cartesTriees = trierCartes(cartesOriginales);
        const zoneAjouterAvis = listeAvis.querySelector('.avis-ajouter-bas');

        cartesTriees.forEach(carte => {
            listeAvis.insertBefore(carte, zoneAjouterAvis);
        });
    }

    triAvis.addEventListener('change', mettreAJourAvis);
    // #endregion
}
// #endregion


document.addEventListener("DOMContentLoaded", () => {
    // #region ÉLÉMENTS
    const triAvis = document.getElementById("tri-avis");
    const listeAvis = document.querySelector(".liste-petits-avis");

    if (!triAvis || !listeAvis) {
        return;
    }
    // #endregion

    // #region CARTES ORIGINALES
    const cartesOriginales = [
        ...listeAvis.querySelectorAll(".petit-avis")
    ];
    // #endregion

    // #region TRI DES AVIS
    function trierCartes() {
        const typeTri = triAvis.value;
        const cartesTriees = [...cartesOriginales];

        if (typeTri === "note-desc") {
            cartesTriees.sort((a, b) =>
                Number(b.dataset.note) - Number(a.dataset.note)
            );
        } else if (typeTri === "note-asc") {
            cartesTriees.sort((a, b) =>
                Number(a.dataset.note) - Number(b.dataset.note)
            );
        } else if (typeTri === "recent") {
            cartesTriees.sort((a, b) =>
                (b.dataset.date || "").localeCompare(a.dataset.date || "")
            );
        } else if (typeTri === "ancien") {
            cartesTriees.sort((a, b) =>
                (a.dataset.date || "").localeCompare(b.dataset.date || "")
            );
        }

        return cartesTriees;
    }
    // #endregion

    // #region MISE À JOUR DE L'AFFICHAGE
    function mettreAJourAvis() {
        const cartesTriees = trierCartes();

        cartesTriees.forEach(carte => {
            listeAvis.appendChild(carte);
        });
    }

    triAvis.addEventListener("change", mettreAJourAvis);
    // #endregion
});


