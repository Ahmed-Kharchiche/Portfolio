<?php
session_start();

$erreur = "";

// Change ce mot de passe ! Ici c'est juste "admin123" pour l'exemple
$mot_de_passe_admin = "mouffy";

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $mot_de_passe_saisi = $_POST["mot_de_passe"];

    if ($mot_de_passe_saisi === $mot_de_passe_admin) {
        // On enregistre dans la session qu'on est connecté
        $_SESSION["connecte"] = true;
        header("Location: admin.php");
        exit;
    } else {
        $erreur = "Mot de passe incorrect.";
    }
}
?>
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Connexion admin</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background-color: #09090B;
            color: #FAFAFA;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        form {
            background-color: #18181B;
            padding: 30px;
            border-radius: 8px;
            width: 300px;
        }
        input {
            display: block;
            width: 100%;
            padding: 8px;
            margin: 10px 0;
        }
        button {
            width: 100%;
            padding: 10px;
            background-color: #7C3AED;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        .erreur {
            color: #F87171;
        }
    </style>
</head>
<body>
<?php include 'includes/header.php'; ?>
<script>
    applyTheme('dark');
    document.getElementById('theme-toggle').disabled = true;
    document.querySelector('.switch').style.display = 'none';
</script>

<form method="POST">
    <h2>Connexion admin</h2>

    <?php if ($erreur): ?>
        <p class="erreur"><?php echo $erreur; ?></p>
    <?php endif; ?>

    <input type="password" name="mot_de_passe" placeholder="Mot de passe" required>
    <button type="submit">Se connecter</button>
</form>

</body>
</html>