// #region PARAMÈTRES

const phrases = [
    "JE SUIS ÉTUDIANT EN BUT INFORMATIQUE",
    "JE SUIS PASSIONNÉ PAR LA PROGRAMMATION",
    "J'EXPLORE LES POSSIBILITÉS DE L'INTELLIGENCE ARTIFICIELLE",
    "J'EXPLORE LE DÉVELOPPEMENT FRONTEND",
    "JE DÉCOUVRE LES POSSIBILITÉS DU BACKEND",
    "JE TRANSFORME MES IDÉES EN PROJETS CONCRETS"
];

const vitesseEcriture = 70;
const pauseEntrePhrases = 0;

// #endregion


// #region PARAMÈTRES SON

const fichierSonClavier = "sons/clavier.mp3";
const volumeSon = 0.2;

let sonAutorise = false;
let sonClavier = null;

// #endregion


// #region INITIALISATION

const element = document.getElementById("presentation");

let phraseIndex = 0;
let lettreIndex = 0;

// #endregion



// #region ACTIVATION DU SON

document.addEventListener("click", () => {
    sonAutorise = true;
}, { once: true });

// #endregion


// #region GESTION DE LA FENÊTRE ACTIVE

window.addEventListener("blur", () => {
    // Arrêter le son quand on quitte la fenêtre
    if (sonClavier) {
        sonClavier.pause();
    }
});

window.addEventListener("focus", () => {
    // Le son ne reprend pas automatiquement
});

// #endregion


// #region ANIMATION ÉCRITURE

function ecrire() {
    const phrase = phrases[phraseIndex];

    if (lettreIndex < phrase.length) {
        element.textContent += phrase[lettreIndex];

        // Jouer le son uniquement si la fenêtre est active
        if (sonAutorise && document.hasFocus()) {
            if (!sonClavier || sonClavier.paused) {
                sonClavier = new Audio(fichierSonClavier);
                sonClavier.volume = volumeSon;
                sonClavier.playbackRate = 1.2;
                sonClavier.currentTime = 5;

                sonClavier.play().catch(erreur => {
                    console.error("Erreur de lecture du son :", erreur);
                });
            }
        }

        lettreIndex++;

        setTimeout(ecrire, vitesseEcriture);
    } else {
        effacer();
    }
}

// #endregion


// #region EFFACEMENT

function effacer() {
    // Arrêter le son dès que le texte est terminé
    if (sonClavier) {
        sonClavier.pause();
        sonClavier.currentTime = 0;
        sonClavier = null;
    }

    // Attendre 2 secondes avant d'effacer le texte
    setTimeout(() => {
        element.textContent = "";

        lettreIndex = 0;
        phraseIndex = (phraseIndex + 1) % phrases.length;

        // Préparer le son pour la prochaine phrase
        sonClavier = null;
        ecrire();
    }, 2000);
}

// #endregion


// #region DÉMARRAGE

ecrire();

// #endregion