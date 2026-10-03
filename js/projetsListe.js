const cartes = document.querySelectorAll(".carte-3d");
const nombreCartes = cartes.length;

let indexActif = 0;

const espacementX = 260;
const profondeurZ = 150;
const angleInclinaison = 35;

function actualiserPositions() {
    cartes.forEach((carte, index) => {
        let decalage = index - indexActif;

        if (decalage > nombreCartes / 2) {
            decalage -= nombreCartes;
        } else if (decalage < -nombreCartes / 2) {
            decalage += nombreCartes;
        }
        const distance = Math.abs(decalage);

        carte.style.transform =
            `translateX(${decalage * espacementX}px)
                 translateZ(${-distance * profondeurZ}px)
                 rotateY(${-decalage * angleInclinaison}deg)`;

        carte.style.opacity = distance <= 2 ? 1 - distance * 0.35 : 0;
        carte.style.zIndex = nombreCartes - distance;
        carte.style.pointerEvents = distance <= 2 ? "auto" : "none";
    });
}

cartes.forEach((carte, index) => {
    carte.addEventListener("click", () => {
        if (index === indexActif) {
            window.location.href = carte.dataset.lien;
        } else {
            indexActif = index;
            actualiserPositions();
        }
    });
});

function tourner(direction) {
    indexActif = (indexActif + direction + nombreCartes) % nombreCartes;
    actualiserPositions();
}

const conteneur = document.getElementById("carousel-conteneur");
let progressionSwipe = 0;
const seuilSwipe = 60;

conteneur.addEventListener("wheel", (evenement) => {
    evenement.preventDefault();
    progressionSwipe += evenement.deltaX;

    if (progressionSwipe > seuilSwipe) {
        tourner(1);
        progressionSwipe = 0;
    } else if (progressionSwipe < -seuilSwipe) {
        tourner(-1);
        progressionSwipe = 0;
    }
}, { passive: false });

actualiserPositions();