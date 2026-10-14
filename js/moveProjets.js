// #region CONFIGURATION DES ANIMATIONS

const CONFIG_ANIMATIONS = {
    // Seuil entre petit écran et ordinateur (px)
    largeurPetitEcran: 700,

    // ANIMATION DES CARTES
    cartes: {
        // Ordinateur
        deplacementXOrdinateur: 30,
        deplacementYOrdinateur: 100,

        // Petit écran
        deplacementXMobile: 0,
        deplacementYMobile: 100,

        // Zone de progression de l'animation
        debutAnimation: 300,
        seuilApparition: 100,
        distanceAnimation: 400
    },

    // ANIMATION DU TEXTE
    texte: {
        // Ordinateur : déplacement horizontal maximal (px)
        deplacementHorizontal: 150,

        // Petit écran : déplacement vertical maximal (px)
        deplacementVerticalMobile: 100,

        // Sensibilité au défilement du texte sur ordinateur
        vitesseOrdinateur: 0.3,

        // Vitesse de déplacement vertical du texte sur mobile
        vitesseMobile: 0.15
    }
};

// #endregion


// #region ANIMATION DES CARTES DE PROJET

const projets = document.querySelectorAll('.carte-projet');

window.addEventListener('scroll', () => {
    const petitEcran =
        window.innerWidth <= CONFIG_ANIMATIONS.largeurPetitEcran;

    projets.forEach((projet, index) => {
        const rect = projet.getBoundingClientRect();

        if (rect.top <= CONFIG_ANIMATIONS.cartes.seuilApparition) {
            let progress =
                (rect.top + CONFIG_ANIMATIONS.cartes.debutAnimation) /
                CONFIG_ANIMATIONS.cartes.distanceAnimation;

            progress = Math.max(0, Math.min(1, progress));

            const deplacementX = petitEcran
                ? CONFIG_ANIMATIONS.cartes.deplacementXMobile
                : CONFIG_ANIMATIONS.cartes.deplacementXOrdinateur;

            const deplacementY = petitEcran
                ? CONFIG_ANIMATIONS.cartes.deplacementYMobile
                : CONFIG_ANIMATIONS.cartes.deplacementYOrdinateur;

            const translateX = index % 2 === 0
                ? -deplacementX * (1 - progress)
                : deplacementX * (1 - progress);

            const translateY = -deplacementY * (1 - progress);

            projet.style.opacity = progress;
            projet.style.transform =
                `translate(${translateX}px, ${translateY}px)`;
        } else {
            projet.style.opacity = 1;
            projet.style.transform = 'translate(0, 0)';
        }
    });
});

// #endregion


// #region ANIMATION DE L'INTRODUCTION

const introGauche = document.querySelector('.intro-gauche');
const introDroite = document.querySelector('.intro-droite');

let dernierScroll = window.scrollY;
let positionGauche = 0;
let positionDroite = 0;

window.addEventListener('scroll', () => {
    const scrollActuel = window.scrollY;
    const delta = scrollActuel - dernierScroll;

    const petitEcran =
        window.innerWidth <= CONFIG_ANIMATIONS.largeurPetitEcran;

    if (petitEcran) {
        // Petit écran : le texte monte sans déplacement horizontal
        const deplacementY = Math.min(
            scrollActuel * CONFIG_ANIMATIONS.texte.vitesseMobile,
            CONFIG_ANIMATIONS.texte.deplacementVerticalMobile
        );

        introGauche.style.transform = `translateY(${-deplacementY}px)`;
        introDroite.style.transform = `translateY(${-deplacementY}px)`;
    } else {
        // Ordinateur : déplacement horizontal du texte
        positionGauche -=
            delta * CONFIG_ANIMATIONS.texte.vitesseOrdinateur;

        positionDroite +=
            delta * CONFIG_ANIMATIONS.texte.vitesseOrdinateur;

        const amplitude = CONFIG_ANIMATIONS.texte.deplacementHorizontal;

        positionGauche = Math.max(-amplitude, Math.min(0, positionGauche));
        positionDroite = Math.min(amplitude, Math.max(0, positionDroite));

        introGauche.style.transform =
            `translateX(${positionGauche}px)`;

        introDroite.style.transform =
            `translateX(${positionDroite}px)`;
    }

    dernierScroll = scrollActuel;
});

// #endregion