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
            camera.position.z = 45;

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
                reseau.rotation.y += 0.0015 + sourisX * 0.01 + impulsionX * 0.05;
                reseau.rotation.x += 0.0005 + sourisY * 0.002 + impulsionY * 0.05;

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

    <div class="cartes">
        <div class="carte">
            <h3>Projet 1</h3>
            <p>Courte description du projet.</p>
            <a href="projet.php?id=reservation">Voir le détail</a>
        </div>

        <div class="carte">
            <h3>Projet 2</h3>
            <p>Courte description du projet.</p>
            <a href="projet.php?id=bot-c">Voir le détail</a>
        </div>
    </div>
</section>

<!-- Pied de page -->
<?php include 'includes/footer.php'; ?>

</body>
</html>