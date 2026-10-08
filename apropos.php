<?php
// #region CONFIGURATION DE LA PAGE
$titre_page = "À propos";
$page_css = "apropos.css";

include 'includes/header.php';
// #endregion
?>

    <!-- #region PAGE À PROPOS -->
    <main class="apropos">

        <!-- #region TITRE -->
        <h1>À PROPOS DE MOI</h1>
        <div class="ligne-titre"></div>
        <!-- #endregion -->

        <!-- #region PRÉSENTATION -->
        <section class="presentation">


            <p>
                Je m'appelle Ahmed Kharchiche et je suis étudiant en
                <strong>BUT Informatique</strong> à l'IUT de Valence.
            </p>

            <p>
                Je m'intéresse particulièrement au développement logiciel,
                à l'intelligence artificielle et au développement d'applications.
            </p>
        </section>
        <!-- #endregion -->

        <!-- #region FORMATION -->
        <section class="formation">
            <h2>Ma formation</h2>

            <div class="bloc-apropos">
                <h3>BUT Informatique</h3>
                <p>IUT de Valence</p>
                <p>2025 - 2028</p>
            </div>

            <div class="bloc-apropos">
                <h3>Baccalauréat général</h3>
                <p>Lycée du Dauphiné - Romans-sur-Isère</p>
                <p>Mention Bien</p>
                <p>Spécialités Mathématiques et NSI</p>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region COMPÉTENCES -->
        <section class="competences">
            <h2>Mes compétences</h2>

            <div class="technologies-apropos">
                <span>Python</span>
                <span>Java</span>
                <span>C</span>
                <span>SQL</span>
                <span>PHP</span>
                <span>HTML</span>
                <span>CSS</span>
                <span>JavaScript</span>
                <span>Git</span>
            </div>
        </section>
        <!-- #endregion -->

        <!-- #region OBJECTIF -->
        <section class="objectif">
            <h2>Mon objectif</h2>

            <p>
                Je souhaite progressivement me spécialiser dans
                <strong>l'intelligence artificielle et le machine learning</strong>,
                tout en développant de solides compétences en ingénierie logicielle.
            </p>

            <p>
                À terme, mon objectif est de travailler sur des applications
                intelligentes complètes, de leur conception jusqu'à leur
                déploiement.
            </p>
        </section>
        <!-- #endregion -->

    </main>

<?php include 'includes/footer.php'; ?>
    <!-- #endregion -->