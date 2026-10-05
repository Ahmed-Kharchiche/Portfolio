<?php
// THE CORE : lit projets.json (adapte les clés ci-dessous si ton fichier est structuré autrement)
$titre_page = "Core";
$page_css = "core.css";

$brut = json_decode(@file_get_contents("projets.json"), true) ?: [];
$items = $brut["projets"] ?? $brut;
$projets = [];
foreach ($items as $i => $p) {
    $projets[] = [
        "id" => (string)($p["id"] ?? $i),
        "titre" => $p["titre"] ?? ($p["title"] ?? "Projet"),
        "description" => $p["description"] ?? "",
        "technologies" => array_values($p["technologies"] ?? []),
    ];
}

include 'includes/header.php';
?>

    <main class="core">
        <canvas id="scene"></canvas>
        <div class="vignette" aria-hidden="true"></div>
        <div class="fondu" id="fondu" aria-hidden="true"></div>

        <div class="info" id="info" aria-hidden="true"><span></span><span></span><span></span><h2></h2></div>

        <nav class="hud" aria-label="Navigation">
            <a href="core.php" class="on">CORE</a><a href="projets.php">PROJECTS</a><a href="apropos.php">ABOUT</a><a href="contact.php">CONTACT</a>
        </nav>
        <p class="astuce" id="astuce">SCROLL → EXPLORE · CLIC → ENTRER</p>

        <!-- accès clavier / sans animation : la liste des projets reste toujours disponible -->
        <ul class="liste" aria-label="Projets">
            <?php foreach ($projets as $p): ?>
                <li><a href="detail-projet.php?id=<?= urlencode($p["id"]) ?>"><?= htmlspecialchars($p["titre"]) ?></a></li>
            <?php endforeach; ?>
        </ul>
    </main>

    <script>window.projets = <?= json_encode($projets, JSON_HEX_TAG | JSON_HEX_APOS | JSON_HEX_AMP | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?>;</script>
    <script type="importmap">
        { "imports": { "three": "https://cdn.jsdelivr.net/npm/three@0.186.0/build/three.module.js" } }
    </script>
    <script type="module">
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) document.querySelector(".core").classList.add("simple");
        else import("./js/core.js");
    </script>

<?php include 'includes/footer.php'; ?>