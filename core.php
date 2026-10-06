<?php
// THE CORE : lit projets.json (adapte les clés ci-dessous si ton fichier est structuré autrement)
$titre_page = "Core";
$page_css = "core.css";

$brut = json_decode(@file_get_contents("projets.json"), true) ?: [];
$items = $brut["projets"] ?? $brut;
$projets = [];
foreach ($items as $i => $p) {
    $s = fn($k) => is_scalar($p[$k] ?? null) ? (string)$p[$k] : "";
    $projets[] = [
            "id" => (string)($p["id"] ?? $i),
            "titre" => $p["titre"] ?? ($p["title"] ?? "Projet"),
            "description" => $p["description"] ?? "",
            "technologies" => array_values($p["technologies"] ?? []),
        // INSPECT : clés optionnelles, adapte-les à ton projets.json
            "images" => array_values(array_filter((array)($p["images"] ?? ($p["image"] ?? [])), "is_string")),
            "gitlab" => $s("gitlab") ?: ($s("github") ?: $s("lien_gitlab")), "demo" => $s("demo") ?: $s("lien_demo"),
            "categorie" => $s("categorie"), "objectif" => $s("objectif"), "fonctionnalites" => $s("fonctionnalites"),
            "difficultes" => $s("difficultes"), "resultat" => $s("resultat"), "apprentissages" => $s("apprentissages"),
    ];
}

include 'includes/header.php';
?>

    <main class="core">
        <canvas id="scene"></canvas>
        <div class="vignette" aria-hidden="true"></div>
        <div class="fondu" id="fondu" aria-hidden="true"></div>

        <div class="info" id="info" aria-hidden="true"><span></span><span></span><span></span><h2></h2><button class="ins-b" id="insBtn" type="button" tabindex="-1">INSPECT</button></div>

        <aside class="inspect" id="inspect" aria-hidden="true" aria-label="Détails du projet">
            <p class="it ins-k"></p>
            <h2 class="it ins-t"></h2>
            <figure class="it ins-img" hidden><img alt=""></figure>
            <p class="it ins-desc"></p>
            <ul class="it ins-tech"></ul>
            <dl class="it ins-res"></dl>
            <div class="it ins-liens"><a id="insGit" target="_blank" rel="noopener noreferrer" hidden>GITHUB</a><a id="insDemo" target="_blank" rel="noopener noreferrer" hidden>LIVE DEMO</a><button id="insExp" type="button">EXPÉRIENCE →</button></div>
            <button class="ins-close" id="insClose" type="button">CLOSE · ESC</button>
        </aside>

        <nav class="hud" aria-label="Navigation">
            <a href="core.php" class="on">CORE</a><a href="projets.php">PROJECTS</a><a href="apropos.php">ABOUT</a><a href="contact.php">CONTACT</a>
        </nav>
        <p class="astuce" id="astuce">SCROLL → EXPLORE · ESPACE → ONDE · CLIC → ENTRER · I → INSPECT</p>
        <button class="son" id="son">SOUND ON</button>

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