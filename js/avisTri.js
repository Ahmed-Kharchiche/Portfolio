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