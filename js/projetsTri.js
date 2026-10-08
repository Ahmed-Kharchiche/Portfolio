// #region ÉLÉMENTS
const triProjets = document.getElementById('tri-projets');
const grilleProjets = document.querySelector('.grille-projets');
const filtresTechnologies = document.querySelectorAll(
    '.filtre-technologie input'
);
// #endregion

// #region TRI ET FILTRES DES PROJETS
if (triProjets && grilleProjets) {

    // #region FILTRES PAR TECHNOLOGIE
    const cartesOriginales = [...grilleProjets.children];

    function obtenirTechnologies(carte) {

        return [
            ...carte.querySelectorAll('.technologies span')
        ].map(technologie =>
            technologie.textContent.trim().toLowerCase()
        );
    }


    function carteCorrespondAuxFiltres(carte, technologiesSelectionnees) {

        if (technologiesSelectionnees.length === 0) {
            return true;
        }

        const technologiesProjet = obtenirTechnologies(carte);

        return technologiesSelectionnees.some(technologie =>
            technologiesProjet.includes(technologie)
        );
    }
    // #endregion


    // #region TRI DES CARTES
    function trierCartes(cartes) {

        const typeTri = triProjets.value;

        if (typeTri === 'original') {
            return [...cartes];
        }

        return [...cartes].sort((a, b) => {

            if (typeTri === 'az' || typeTri === 'za') {

                const nomA =
                    a.querySelector('h3')?.textContent.trim() || '';

                const nomB =
                    b.querySelector('h3')?.textContent.trim() || '';

                const comparaison = nomA.localeCompare(
                    nomB,
                    'fr',
                    { sensitivity: 'base' }
                );

                return typeTri === 'az'
                    ? comparaison
                    : -comparaison;
            }


            if (typeTri === 'recent' || typeTri === 'ancien') {

                const dateA =
                    a.querySelector('.date-projet')?.dataset.date || '';

                const dateB =
                    b.querySelector('.date-projet')?.dataset.date || '';

                // Les projets sans date restent à la fin
                if (!dateA && !dateB) {
                    return 0;
                }

                if (!dateA) {
                    return 1;
                }

                if (!dateB) {
                    return -1;
                }

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
    function mettreAJourProjets() {

        const technologiesSelectionnees = [
            ...document.querySelectorAll(
                '.filtre-technologie input:checked'
            )
        ].map(input =>
            input.value.toLowerCase()
        );


        const cartesFiltrees = cartesOriginales.filter(carte =>
            carteCorrespondAuxFiltres(
                carte,
                technologiesSelectionnees
            )
        );


        const cartesTriees = trierCartes(cartesFiltrees);


        // Cacher toutes les cartes
        cartesOriginales.forEach(carte => {
            carte.style.display = 'none';
        });


        // Réafficher les cartes filtrées dans le bon ordre
        cartesTriees.forEach(carte => {
            carte.style.display = '';
            grilleProjets.appendChild(carte);
        });
    }
    // #endregion


    // #region ÉVÉNEMENTS
    // Tri
    triProjets.addEventListener('change', mettreAJourProjets);


    // Filtres technologies
    filtresTechnologies.forEach(input => {
        input.addEventListener('change', mettreAJourProjets);
    });
    // #endregion
}
// #endregion