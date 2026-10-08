<?php

use PHPMailer\PHPMailer\PHPMailer;

// #region INITIALISATION

session_start();

require_once __DIR__ . '/vendor/autoload.php';

// #endregion


// #region AUTHENTIFICATION

$erreur = "";
$secondes_blocage = 0;

$nombre_max_tentatives = 5;
$duree_blocage_minutes = 1;

$config = require __DIR__ . '/config/secrets.php';

$mot_de_passe_hash = $config['mot_de_passe_hash'];

$fichier_tentatives = __DIR__ . '/data/tentatives_login.json';

$ip = $_SERVER['REMOTE_ADDR'] ?? 'Inconnue';

// Chargement des tentatives précédentes
$tentatives = file_exists($fichier_tentatives)
        ? json_decode(file_get_contents($fichier_tentatives), true)
        : [];

if (!is_array($tentatives)) {
    $tentatives = [];
}

if (!isset($tentatives[$ip]) || !is_array($tentatives[$ip])) {
    $tentatives[$ip] = [
            'nombre' => 0,
            'bloque_jusqua' => 0
    ];
}

$tentatives[$ip]['nombre'] = (int) ($tentatives[$ip]['nombre'] ?? 0);
$tentatives[$ip]['bloque_jusqua'] = (int) ($tentatives[$ip]['bloque_jusqua'] ?? 0);

$maintenant = time();

// Traitement du formulaire
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // Vérification du blocage
    if ($tentatives[$ip]['bloque_jusqua'] > $maintenant) {

        $secondes_blocage = $tentatives[$ip]['bloque_jusqua'] - $maintenant;

        $_SESSION['login_erreur'] = "Trop de tentatives. Réessayez dans :";
        $_SESSION['secondes_blocage'] = $secondes_blocage;

        header('Location: login.php');
        exit;
    }

    $mot_de_passe_saisi = $_POST['mot_de_passe'] ?? '';

    // Vérification du mot de passe
    if (password_verify($mot_de_passe_saisi, $mot_de_passe_hash)) {

        // Renouvellement de l'identifiant de session
        session_regenerate_id(true);

        $_SESSION['connecte'] = true;

        // #region NOTIFICATION PAR E-MAIL

        // Une erreur d'envoi ne bloque pas la connexion.
        try {

            $mail = new PHPMailer(true);

            $mail->isSMTP();
            $mail->Host = 'smtp.ionos.fr';
            $mail->SMTPAuth = true;

            $mail->Username = $config['smtp_email'];
            $mail->Password = $config['smtp_mot_de_passe'];

            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = 587;

            $mail->CharSet = 'UTF-8';

            $mail->setFrom(
                    $config['smtp_email'],
                    'Portfolio Ahmed'
            );

            $mail->addAddress($config['email_notification']);

            $mail->Subject = 'Connexion à l’administration';

            $mail->Body =
                    "Une connexion à l'administration vient d'être effectuée.\n\n" .
                    "Date : " . date('d/m/Y à H:i:s') . "\n" .
                    "IP : " . $ip . "\n" .
                    "Navigateur : " . ($_SERVER['HTTP_USER_AGENT'] ?? 'Inconnu');

            $mail->send();

        } catch (Throwable $e) {

            // Enregistre l'erreur dans le journal PHP du serveur.
            error_log(
                    'Erreur notification e-mail : ' . $e->getMessage()
            );
        }

        // #endregion

        // Réinitialisation des tentatives après connexion réussie
        $tentatives[$ip] = [
                'nombre' => 0,
                'bloque_jusqua' => 0
        ];

        file_put_contents(
                $fichier_tentatives,
                json_encode(
                        $tentatives,
                        JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
                ),
                LOCK_EX
        );

        header('Location: admin.php');
        exit;
    }

    // Mot de passe incorrect
    $tentatives[$ip]['nombre']++;

    if ($tentatives[$ip]['nombre'] >= $nombre_max_tentatives) {

        // Blocage temporaire
        $tentatives[$ip]['bloque_jusqua'] =
                $maintenant + ($duree_blocage_minutes * 60);

        $tentatives[$ip]['nombre'] = 0;

        $_SESSION['login_erreur'] = "Trop de tentatives. Réessayez dans :";
        $_SESSION['secondes_blocage'] = $duree_blocage_minutes * 60;

    } else {

        $restantes = $nombre_max_tentatives - $tentatives[$ip]['nombre'];

        $_SESSION['login_erreur'] =
                "Mot de passe incorrect. Il vous reste $restantes tentative(s).";

        $_SESSION['secondes_blocage'] = 0;
    }

    // Sauvegarde des tentatives
    file_put_contents(
            $fichier_tentatives,
            json_encode(
                    $tentatives,
                    JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE
            ),
            LOCK_EX
    );

    header('Location: login.php');
    exit;
}

// Récupération des messages après redirection
if (isset($_SESSION['login_erreur'])) {

    $erreur = $_SESSION['login_erreur'];
    $secondes_blocage = $_SESSION['secondes_blocage'] ?? 0;

    unset(
            $_SESSION['login_erreur'],
            $_SESSION['secondes_blocage']
    );
}

// Vérification du blocage restant
if ($tentatives[$ip]['bloque_jusqua'] > $maintenant) {

    $secondes_blocage = $tentatives[$ip]['bloque_jusqua'] - $maintenant;
    $erreur = "Trop de tentatives. Réessayez dans :";
}

// #endregion


// #region CONFIGURATION DE LA PAGE

$titre_page = "Connexion";
$page_css = "login.css";

include __DIR__ . '/includes/header.php';

// #endregion

?>


    <!-- #region FORMULAIRE DE CONNEXION -->

    <main class="login">
        <div class="login-contenu">

            <h2>Connexion admin</h2>

            <p class="login-sous-titre">
                Connectez-vous pour accéder à l'administration.
            </p>

            <?php if ($erreur): ?>
                <p class="login-erreur">
                    <?= htmlspecialchars($erreur, ENT_QUOTES, 'UTF-8') ?>
                </p>
            <?php endif; ?>

            <?php if ($secondes_blocage > 0): ?>

                <p class="login-compteur" id="compteur"></p>

                <script>
                    let secondesRestantes = <?= (int) $secondes_blocage ?>;

                    function mettreAJourCompteur() {
                        const minutes = Math.floor(secondesRestantes / 60);
                        const secondes = secondesRestantes % 60;

                        document.getElementById("compteur").textContent =
                            `${String(minutes).padStart(2, "0")}:${String(secondes).padStart(2, "0")}`;

                        if (secondesRestantes <= 0) {
                            window.location.reload();
                            return;
                        }

                        secondesRestantes--;
                    }

                    mettreAJourCompteur();
                    setInterval(mettreAJourCompteur, 1000);
                </script>

            <?php endif; ?>

            <form method="POST" class="login-formulaire">

                <div class="champ">
                    <label for="mot_de_passe">Mot de passe</label>

                    <input
                            type="password"
                            id="mot_de_passe"
                            name="mot_de_passe"
                            placeholder="Mot de passe"
                            required
                            <?= $secondes_blocage > 0 ? 'disabled' : '' ?>
                    >
                </div>

                <button
                        type="submit"
                        <?= $secondes_blocage > 0 ? 'disabled' : '' ?>
                >
                    Se connecter
                </button>

            </form>

            <a href="index.php" class="login-retour">
                Retour au portfolio
            </a>

        </div>
    </main>

    <!-- #endregion -->


<?php include __DIR__ . '/includes/footer.php'; ?>