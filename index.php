<?php
// Page d'accueil du portfolio
$titre_page = "Accueil";
?>



<!-- ici, tout le contenu spécifique à la page (hero, technos, cartes...) -->



<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ahmed Kharchiche - <?php echo $titre_page; ?></title>
    <link rel="stylesheet" href="css/style.css">
</head>
<body>

<!-- Navigation -->
<?php include 'includes/header.php'; ?>

<!-- Présentation -->
<section class="hero">
    <br><br>
    <h1 id="nom">Ahmed Kharchiche</h1>
    <p id="presentation">Étudiant en BUT Informatique</p>
    <div class="zone">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
        <script>

            const scene = new THREE.Scene();

            const camera = new THREE.PerspectiveCamera(
                60,
                window.innerWidth / window.innerHeight,
                0.1,
                1000
            );
            camera.position.z = 50;

            const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            renderer.setSize(window.innerWidth, window.innerHeight);
            document.body.appendChild(renderer.domElement);

            const reseau = new THREE.Group();
            scene.add(reseau);

            const nombreDePoints = 100;
            const positions = [];

            for (let i = 0; i < nombreDePoints; i++) {
                const x = (Math.random() - 0.5) * 60;
                const y = (Math.random() - 0.5) * 40;
                const z = (Math.random() - 0.5) * 40;
                positions.push(new THREE.Vector3(x, y, z));
            }

            const geometriePoints = new THREE.BufferGeometry().setFromPoints(positions);
            const materielPoints = new THREE.PointsMaterial({ color: 0xA78BFA, size: 0.8 });
            const points = new THREE.Points(geometriePoints, materielPoints);
            reseau.add(points);

            const distanceMax = 15;
            const sommetsLignes = [];

            for (let i = 0; i < positions.length; i++) {
                for (let j = i + 1; j < positions.length; j++) {
                    if (positions[i].distanceTo(positions[j]) < distanceMax) {
                        sommetsLignes.push(positions[i], positions[j]);
                    }
                }
            }

            const geometrieLignes = new THREE.BufferGeometry().setFromPoints(sommetsLignes);
            const materielLignes = new THREE.LineBasicMaterial({ color: 0x7C3AED, transparent: true, opacity: 0.3 });
            const lignes = new THREE.LineSegments(geometrieLignes, materielLignes);
            reseau.add(lignes);

            let sourisX = 0;
            let sourisY = 0;

            window.addEventListener("mousemove", (evenement) => {
                sourisX = (evenement.clientX / window.innerWidth) * 2 - 1;
                sourisY = (evenement.clientY / window.innerHeight) * 2 - 1;
            });

            let impulsionX = 0;
            let impulsionY = 0;

            window.addEventListener("click", (evenement) => {
                // Position du clic normalisée entre -1 et 1, comme pour la souris
                impulsionX = (evenement.clientX / window.innerWidth) * 2 - 1;
                impulsionY = (evenement.clientY / window.innerHeight) * 2 - 1;
            });

            function animer() {
                requestAnimationFrame(animer);
                reseau.rotation.y +=0.0010 + sourisX * 0.01 + impulsionX * 0.05;
                reseau.rotation.x += 0.0005 + sourisY * 0.001 + impulsionY * 0.05;

                impulsionX *= 0.95;
                impulsionY *= 0.95;
                renderer.render(scene, camera);
            }

            animer();

            window.addEventListener("resize", () => {
                camera.aspect = window.innerWidth / window.innerHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(window.innerWidth, window.innerHeight);
            });

        </script>
    </div>

    <div class="hero-boutons">
        <a href="projets.php" class="bouton">Découvrir mes projets</a>
        <a href="cv/CV_Ahmed_Kharchiche.pdf" class="bouton bouton-secondaire" download>Télécharger mon CV</a>
    </div>
</section>

<!-- Technologies -->
<section class="technos">
    <h2>Quelques technologies</h2>
    <ul>
        <li>Python</li>
        <li>Java</li>
        <li>C</li>
        <li>SQL</li>
        <li>PHP</li>
        <li>HTML / CSS</li>
    </ul>
</section>

<!-- Aperçu de projets -->
<section class="apercu-projets">
    <h2>Quelques projets</h2>

    <div class="carousel-conteneur" id="carousel-conteneur">
        <div class="carousel-3d" id="carousel">
            <div class="carte-3d" data-lien="projet.php?id=reservation">
                <h3>Projet 1</h3>
                <p>Courte description du projet.</p>
            </div>
            <div class="carte-3d" data-lien="projet.php?id=bot-c">
                <h3>Projet 2</h3>
                <p>Courte description du projet.</p>
            </div>
            <div class="carte-3d" data-lien="projet.php?id=projet3">
                <h3>Projet 3</h3>
                <p>Courte description du projet.</p>
            </div>
            <div class="carte-3d" data-lien="projet.php?id=projet4">
                <h3>Projet 4</h3>
                <p>Courte description du projet.</p>
            </div>
            <div class="carte-3d" data-lien="projet.php?id=projet5">
                <h3>Projet 5</h3>
                <p>Courte description du projet.</p>
            </div>
        </div>

        <p class="carousel-astuce">Selectionne la carte avec un clic et choisis la avec un double clic</p>
    </div>
</section>

<script>
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
</script>

<!-- Pied de page -->
<?php include 'includes/footer.php'; ?>

</body>
</html>