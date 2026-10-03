//
// ==============================
//        PARAMÈTRES
// ==============================
//

// Nombre de points dans le réseau
const nombreDePoints = 90;

// Taille des points
const taillePoints = 0.7;

// Distance maximale entre deux points pour créer une ligne
const distanceMax = 14;

// Couleur des points
const couleurPoints = 0xA78BFA;

// Couleur des lignes
const couleurLignes = 0x7C3AED;

// Transparence des lignes
const transparenceLignes = 0.22;

// Vitesse de rotation automatique du réseau
const vitesseRotation = 0.0004;

// Influence horizontale de la souris
const influenceSourisX = 0.0015;

// Influence verticale de la souris
const influenceSourisY = 0.0015;

// Force du mouvement lors d'un clic
const forceClic = 0.012;

// Vitesse à laquelle l'effet du clic disparaît
const ralentissementClic = 0.96;

// Distance entre la caméra et le réseau
const positionCameraZ = 50;

//


// ==============================
//        THREE.JS
// ==============================
//

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);

camera.position.z = positionCameraZ;

const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const reseau = new THREE.Group();
scene.add(reseau);

const positions = [];

for (let i = 0; i < nombreDePoints; i++) {

    const x = (Math.random() - 0.5) * 60;
    const y = (Math.random() - 0.5) * 40;
    const z = (Math.random() - 0.5) * 40;

    positions.push(new THREE.Vector3(x, y, z));
}


// ==============================
//           POINTS
// ==============================

const geometriePoints =
    new THREE.BufferGeometry().setFromPoints(positions);

const materielPoints = new THREE.PointsMaterial({
    color: couleurPoints,
    size: taillePoints
});

const points = new THREE.Points(
    geometriePoints,
    materielPoints
);

reseau.add(points);


// ==============================
//           LIGNES
// ==============================

const sommetsLignes = [];

for (let i = 0; i < positions.length; i++) {

    for (let j = i + 1; j < positions.length; j++) {

        if (positions[i].distanceTo(positions[j]) < distanceMax) {

            sommetsLignes.push(
                positions[i],
                positions[j]
            );
        }
    }
}

const geometrieLignes =
    new THREE.BufferGeometry().setFromPoints(sommetsLignes);

const materielLignes = new THREE.LineBasicMaterial({
    color: couleurLignes,
    transparent: true,
    opacity: transparenceLignes
});

const lignes = new THREE.LineSegments(
    geometrieLignes,
    materielLignes
);

reseau.add(lignes);


// ==============================
//           SOURIS
// ==============================

let sourisX = 0;
let sourisY = 0;

window.addEventListener("mousemove", (evenement) => {

    sourisX =
        (evenement.clientX / window.innerWidth) * 2 - 1;

    sourisY =
        (evenement.clientY / window.innerHeight) * 2 - 1;
});


// ==============================
//            CLIC
// ==============================

let impulsionX = 0;
let impulsionY = 0;

window.addEventListener("click", (evenement) => {

    impulsionX =
        (evenement.clientX / window.innerWidth) * 2 - 1;

    impulsionY =
        (evenement.clientY / window.innerHeight) * 2 - 1;
});


// ==============================
//          ANIMATION
// ==============================

function animer() {

    requestAnimationFrame(animer);

    reseau.rotation.y +=
        vitesseRotation +
        sourisX * influenceSourisX +
        impulsionX * forceClic;

    reseau.rotation.x +=
        vitesseRotation +
        sourisY * influenceSourisY +
        impulsionY * forceClic;

    impulsionX *= ralentissementClic;
    impulsionY *= ralentissementClic;

    renderer.render(scene, camera);
}

animer();


// ==============================
//            RESIZE
// ==============================

window.addEventListener("resize", () => {

    camera.aspect =
        window.innerWidth / window.innerHeight;

    camera.updateProjectionMatrix();

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );
});