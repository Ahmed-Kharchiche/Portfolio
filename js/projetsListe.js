const cartes = document.querySelectorAll(".carte-3d");
const nombreCartes = cartes.length;

let indexActif = 0;

const carte = document.querySelector(".carte-3d");
const espacementX = carte.getBoundingClientRect().width - 90;

const profondeurZ = 150;
const angleInclinaison = 35;


function actualiserPositions(focus = false) {

    cartes.forEach((carte, index) => {

        let decalage = index - indexActif;

        if (decalage > nombreCartes / 2) {
            decalage -= nombreCartes;
        } else if (decalage < -nombreCartes / 2) {
            decalage += nombreCartes;
        }

        const distance = Math.abs(decalage);

        const echelle =
            focus && index === indexActif ? 1.07 : 1;

        carte.style.transform =
            `translateX(${decalage * espacementX}px)
             translateZ(${-distance * profondeurZ}px)
             rotateY(${-decalage * angleInclinaison}deg)
             scale(${echelle})`;

        carte.style.opacity =
            distance <= 2 ? 1 - distance * 0.35 : 0;

        carte.style.zIndex =
            nombreCartes - distance;

        carte.style.pointerEvents =
            distance <= 2 ? "auto" : "none";
    });
}


function focusCarte() {

    actualiserPositions(true);

    setTimeout(() => {
        actualiserPositions(false);
    }, 600);
}


cartes.forEach((carte, index) => {

    carte.addEventListener("click", () => {

        if (index === indexActif) {

            window.location.href = carte.dataset.lien;

        } else {

            indexActif = index;
            focusCarte();

        }

    });

});


function tourner(direction) {

    indexActif =
        (indexActif + direction + nombreCartes) % nombreCartes;

    focusCarte();
}


const conteneur =
    document.getElementById("carousel-conteneur");

let progressionSwipe = 0;
const seuilSwipe = 260;


conteneur.addEventListener("wheel", (evenement) => {

    evenement.preventDefault();

    progressionSwipe += evenement.deltaX * 0.2;

    if (progressionSwipe > seuilSwipe) {

        tourner(1);
        progressionSwipe = 0;

    } else if (progressionSwipe < -seuilSwipe) {

        tourner(-1);
        progressionSwipe = 0;
    }

}, { passive: false });


actualiserPositions();