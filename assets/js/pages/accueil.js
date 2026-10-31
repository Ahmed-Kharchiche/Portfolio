// #region CONFIGURATION DES ANIMATIONS

const CONFIG_ANIMATIONS = {
    // Largeur maximale pour activer les animations mobiles (px)
    largeurPetitEcran: 700,

    // TITRE
    titre: {
        deplacementYOrdinateur: 100,
        deplacementYMobile: 50
    },

    // CARROUSEL
    carrousel: {
        deplacementYOrdinateur: 200,
        deplacementYMobile: 80
    },

    // TECHNOLOGIES
    technologies: {
        deplacementXOrdinateur: 100,
        deplacementYMobile: 60
    },

    // BOUTONS PRINCIPAUX
    boutons: {
        deplacementXOrdinateur: 10,
        deplacementYOrdinateur: 100,
        deplacementYMobile: 50
    },

    // BOUTONS D'AVIS
    avisBoutons: {
        deplacementXOrdinateur: 100,
        deplacementXMobile: 50
    }
};

// #endregion


// #region ÉLÉMENTS

const title = document.querySelector('.projects-title');
const carousel = document.querySelector('#carousel');
const technos = document.querySelector('.technos');
const boutons = document.querySelector('.hero-boutons');
const avisBoutons = document.querySelector('.avis-boutons');

// #endregion


// #region FONCTION DE PROGRESSION

function calculerProgression(element) {
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    let progress = 1 - (rect.top / windowHeight);

    return Math.max(0, Math.min(1, progress));
}

// #endregion


// #region ANIMATION DU TITRE

window.addEventListener('scroll', () => {
    if (!title) return;

    const petitEcran =
        window.innerWidth <= CONFIG_ANIMATIONS.largeurPetitEcran;

    const progress = calculerProgression(title);

    const distance = petitEcran
        ? CONFIG_ANIMATIONS.titre.deplacementYMobile
        : CONFIG_ANIMATIONS.titre.deplacementYOrdinateur;

    const translateY = -distance * (1 - progress);

    title.style.opacity = progress;
    title.style.transform = `translateY(${translateY}px)`;
});

// #endregion


// #region ANIMATION DU CARROUSEL

window.addEventListener('scroll', () => {
    if (!carousel) return;

    const petitEcran =
        window.innerWidth <= CONFIG_ANIMATIONS.largeurPetitEcran;

    const progress = calculerProgression(carousel);

    const distance = petitEcran
        ? CONFIG_ANIMATIONS.carrousel.deplacementYMobile
        : CONFIG_ANIMATIONS.carrousel.deplacementYOrdinateur;

    const translateY = distance * (1 - progress);

    // Conserve la logique de déplacement vertical d'origine
    carousel.style.marginTop = `${translateY}px`;
});

// #endregion


// #region ANIMATION DES TECHNOLOGIES

window.addEventListener('scroll', () => {
    if (!technos) return;

    const petitEcran =
        window.innerWidth <= CONFIG_ANIMATIONS.largeurPetitEcran;

    const progress = calculerProgression(technos);

    if (petitEcran) {
        // Mobile : arrivée depuis le bas
        const translateY =
            CONFIG_ANIMATIONS.technologies.deplacementYMobile *
            (1 - progress);

        technos.style.transform = `translateY(${translateY}px)`;
    } else {
        // Ordinateur : arrivée depuis la droite
        const translateX =
            CONFIG_ANIMATIONS.technologies.deplacementXOrdinateur *
            (1 - progress);

        technos.style.transform = `translateX(${translateX}px)`;
    }

    technos.style.opacity = progress;
});

// #endregion


// #region ANIMATION DES BOUTONS PRINCIPAUX

window.addEventListener('scroll', () => {
    if (!boutons) return;

    const rect = boutons.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    let progress = rect.top / windowHeight;
    progress = Math.max(0, Math.min(1, progress));

    const translateX = 10 * (1 - progress);
    const translateY = -100 * (1 - progress);

    boutons.style.opacity = progress;
    boutons.style.transform =
        `translate(${translateX}px, ${translateY}px)`;
});

// #endregion


// #region ANIMATION DES BOUTONS D'AVIS

const boutonsAvis = avisBoutons?.querySelectorAll('.bouton');

window.addEventListener('scroll', () => {
    if (!avisBoutons || !boutonsAvis || boutonsAvis.length < 2) return;

    const rect = avisBoutons.getBoundingClientRect();
    const hauteurFenetre = window.innerHeight;

    // L'animation commence lorsque le conteneur entre dans la partie basse
    // de l'écran et se termine lorsqu'il atteint le milieu.
    const debutAnimation = hauteurFenetre * 0.9;
    const finAnimation = hauteurFenetre * 0.4;

    let progress =
        (debutAnimation - rect.top) /
        (debutAnimation - finAnimation);

    progress = Math.max(0, Math.min(1, progress));

    const petitEcran =
        window.innerWidth <= CONFIG_ANIMATIONS.largeurPetitEcran;

    const distance = petitEcran
        ? CONFIG_ANIMATIONS.avisBoutons.deplacementXMobile
        : CONFIG_ANIMATIONS.avisBoutons.deplacementXOrdinateur;

    const deplacement = distance * (1 - progress);

    // Premier bouton : arrive depuis la gauche
    boutonsAvis[0].style.transform =
        `translateX(${-deplacement}px)`;

    // Deuxième bouton : arrive depuis la droite
    boutonsAvis[1].style.transform =
        `translateX(${deplacement}px)`;

    avisBoutons.style.opacity = progress;
});

// #endregion