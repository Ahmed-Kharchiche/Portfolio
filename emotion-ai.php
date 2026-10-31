<?php
/**
 * Template « Emotion AI » : mise en scène de la VERSION SIMPLE de la page projet.
 *
 * Inclus par detail-projet.php (même portée de variables) uniquement si le projet a
 * le template « emotion-ai ». Dans la scène 3D, ce bloc est masqué (voir projet-base.css) ;
 * il ne s'affiche que lorsque <main> reçoit la classe « simple ».
 *
 * Variables fournies par detail-projet.php : $projet, $technologies, $images, $gestionnaire.
 * Les chiffres viennent de data/emotion-ai.json (README + résultats du projet Python).
 * Une donnée absente s'affiche « à établir » : aucune valeur n'est inventée.
 */


// #region INITIALISATION

require_once __DIR__ . '/includes//Projet.php';
require_once __DIR__ . '/includes/GestionnaireProjets.php';

$id = $_GET['id'] ?? null;

if ($id === null || $id === '') {
    http_response_code(400);
    exit('Identifiant du projet manquant.');
}

$gestionnaire = new GestionnaireProjets(
        __DIR__ . '/data/projets.json'
);

$projet = $gestionnaire->trouverParId($id);


if ($projet === null) {
    http_response_code(404);
    exit('Projet introuvable.');
}

// #endregion

// #region DONNÉES DU PROJET

$titre = $projet->getTitre();
$description = $projet->getDescription();
$dateCreation = $projet->getDateCreation();
$technologies = $projet->getTechnologies() ?: [];
$images = $projet->getImages() ?: [];
$gitlab = $projet->getGitlab();

// #endregion

// #region PRÉPARATION DES DONNÉES ET OUTILS D'AFFICHAGE

$e = fn($v): string => htmlspecialchars((string) $v, ENT_QUOTES, "UTF-8");
$pct = fn($v, int $n = 1): string => is_numeric($v) ? number_format($v * 100, $n, ",", "") . "\u{00A0}%" : "à établir";
$nb = fn($v): string => is_numeric($v) ? number_format($v, 0, ",", "\u{202F}") : "à établir";
$dec = fn($v, int $n = 3): string => is_numeric($v) ? str_replace("-", "−", number_format($v, $n, ",", "")) : "à établir";
// Largeur d'une barre F1 : échelle tronquée de 90 % à 100 % (annoncée dans la légende du graphique)
$barre = fn($v): string => number_format(max(0, min(100, ($v - 0.90) / 0.10 * 100)), 1, ".", "");

$fichierDonnees = __DIR__ . "/../../data/emotion-ai.json";
$d = is_file($fichierDonnees) ? (json_decode((string) file_get_contents($fichierDonnees), true) ?: []) : [];

$emotions    = $d["emotions"] ?? [];
$dataset     = $d["dataset"] ?? [];
$modele      = $d["modele"] ?? null;
$comparaison = $d["comparaison"] ?? [];
$recherche   = $d["recherche"] ?? [];
$cv          = $d["validation_croisee"] ?? [];
$test        = $d["test_final"] ?? [];
$parEmotion  = $d["par_emotion"] ?? [];
$confusions  = $d["confusions"] ?? [];
$manuel      = $d["test_manuel"] ?? [];
$seuils      = $d["seuils_incertitude"] ?? [];
$demos       = $d["demonstrations"] ?? [];
$limites     = $d["limites"] ?? [];
$pistes      = $d["pistes"] ?? [];
$role        = $d["role"] ?? null;
$techProjet  = $d["technologies_projet"] ?? $technologies;
$fil         = $demos[0] ?? null; // la phrase qui traverse les scènes 2 à 5
$partManuel  = isset($manuel["nb_phrases"]) && $manuel["nb_phrases"] > 0 ? $manuel["correctes"] / $manuel["nb_phrases"] : null;

// Titre en deux mots : « Emotion » / « AI » (le titre vient de l'admin)
$titreProjet  = $projet->getTitre();
$partiesTitre = explode(" ", $titreProjet, 2);
$titreHaut    = $partiesTitre[0];
$titreBas     = $partiesTitre[1] ?? "";

// Découpage pédagogique de la phrase : groupes de mots (scène 2), mots et paires de mots (scène 3)
$groupes = [];
$mots    = [];
$paires  = [];
if ($fil !== null) {
    $groupes = array_map(fn($g) => implode(" ", $g), array_chunk(explode(" ", $fil["phrase"]), 2));
    $minuscules = function_exists("mb_strtolower") ? mb_strtolower($fil["phrase"]) : strtolower($fil["phrase"]);
    $mots = array_values(array_filter(
        preg_split('/[^\p{L}\p{N}]+/u', $minuscules, -1, PREG_SPLIT_NO_EMPTY),
        fn($m) => preg_match('/^.{2,}$/u', $m) === 1 // scikit-learn ignore les mots d'une seule lettre
    ));
    for ($i = 0; $i < count($mots) - 1; $i++) {
        $paires[] = $mots[$i] . " " . $mots[$i + 1];
    }
}

// Liens de la conclusion : code (seulement s'il existe et s'il est en http/https) et projet suivant
$lienCode = ($projet->aUnLienGitlab() && preg_match('#^https?://#i', $projet->getGitlab()) === 1) ? $projet->getGitlab() : null;
$projetSuivant = null;
if (isset($gestionnaire)) {
    $tous = array_values($gestionnaire->getTous());
    foreach ($tous as $i => $p) {
        if ($p->getId() === $projet->getId() && count($tous) > 1) {
            $projetSuivant = $tous[($i + 1) % count($tous)];
            break;
        }
    }
}
$lienSuivant  = $projetSuivant !== null ? "detail-projet.php?id=" . urlencode((string) $projetSuivant->getId()) : null;
$titreSuivant = $projetSuivant !== null ? $projetSuivant->getTitre() : "";
// #endregion

include 'includes/header.php';
?>
<link rel="stylesheet" href="css/projets/emotion-ai.css">
<div class="exp ea" id="ea-debut" data-template="emotion-ai">
    <a class="ea-lien-evitement" href="#ea-technique">Aller au contenu technique</a>

    <!-- #region SCÈNE 1 : LE SIGNAL -->
    <section class="ea-scene ea-signal" id="ea-signal" aria-labelledby="ea-titre">
        <p class="ea-meta">Machine learning / Classification de texte</p>
        <h1 class="ea-titre" id="ea-titre">
            <span class="ea-titre-haut"><?= $e($titreHaut) ?></span>
            <?php if ($titreBas !== ""): ?>
                <span class="ea-titre-bas"><?= $e($titreBas) ?></span>
            <?php endif; ?>
        </h1>
        <p class="ea-accroche">Une phrase en français entre. Une émotion parmi vingt en sort.</p>
        <p class="ea-indice"><span class="ea-indice-trait" aria-hidden="true"></span>Faire défiler la page</p>
    </section>
    <!-- #endregion -->

    <!-- #region SCÈNE 2 : LE LANGAGE HUMAIN -->
    <section class="ea-scene ea-langage" id="ea-langage" aria-labelledby="ea-langage-titre">
        <h2 class="ea-titre-scene" id="ea-langage-titre">Tout part d'une phrase ordinaire.</h2>
        <?php if ($fil !== null): ?>
            <p class="ea-phrase">
                <?php foreach ($groupes as $groupe): ?>
                    <span class="ea-groupe"><?= $e($groupe) ?></span>
                <?php endforeach; ?>
            </p>
            <p class="ea-note">Phrase de mon test manuel : écrite à la main, elle ne vient pas du jeu de données.</p>
        <?php endif; ?>
        <ol class="ea-etapes">
            <li>Texte brut</li>
            <li>Analyse</li>
            <li>Classification</li>
        </ol>
    </section>
    <!-- #endregion -->

    <!-- #region SCÈNE 3 : DU TEXTE AUX CARACTÉRISTIQUES -->
    <section class="ea-scene ea-donnees" id="ea-donnees" aria-labelledby="ea-donnees-titre">
        <div class="ea-donnees-texte">
            <h2 class="ea-titre-scene" id="ea-donnees-titre">Le modèle ne lit pas des mots, il lit des nombres.</h2>
            <p class="ea-texte">Un vectoriseur TF-IDF découpe la phrase en mots et en paires de mots, puis donne un poids à chacun : fort quand le terme est fréquent dans la phrase mais rare dans l'ensemble des phrases d'entraînement.</p>
            <p class="ea-texte">Le vocabulaire est appris uniquement sur les <?= $nb($dataset["entrainement"] ?? null) ?> phrases d'entraînement.</p>
        </div>
        <?php if ($fil !== null): ?>
            <figure class="ea-matrice">
                <div class="ea-matrice-bloc">
                    <h3 class="ea-matrice-titre">Mots</h3>
                    <ul class="ea-termes">
                        <?php foreach ($mots as $mot): ?>
                            <li><?= $e($mot) ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
                <div class="ea-matrice-bloc">
                    <h3 class="ea-matrice-titre">Paires de mots</h3>
                    <ul class="ea-termes ea-termes--paires">
                        <?php foreach ($paires as $paire): ?>
                            <li><?= $e($paire) ?></li>
                        <?php endforeach; ?>
                    </ul>
                </div>
                <div class="ea-poids" aria-hidden="true">
                    <?php foreach ($mots as $mot): ?>
                        <i></i>
                    <?php endforeach; ?>
                    <?php foreach ($paires as $paire): ?>
                        <i></i>
                    <?php endforeach; ?>
                </div>
                <figcaption class="ea-note">Schéma pédagogique : découpage simplifié, poids TF-IDF non affichés. Une cellule du vecteur correspond à un terme.</figcaption>
            </figure>
        <?php endif; ?>
    </section>
    <!-- #endregion -->

    <!-- #region SCÈNE 4 : LE MODÈLE -->
    <section class="ea-scene ea-modele" id="ea-modele" aria-labelledby="ea-modele-titre">
        <h2 class="ea-titre-scene" id="ea-modele-titre">Vingt frontières, un seul gagnant.</h2>
        <ol class="ea-flux">
            <li><span class="ea-flux-nom">Phrase</span><span class="ea-flux-detail">texte brut</span></li>
            <li><span class="ea-flux-nom">Vecteur TF-IDF</span><span class="ea-flux-detail">mots et paires de mots</span></li>
            <li><span class="ea-flux-nom">20 scores</span><span class="ea-flux-detail">un par émotion</span></li>
            <li><span class="ea-flux-nom">Score maximal</span><span class="ea-flux-detail">le plus élevé gagne</span></li>
            <li><span class="ea-flux-nom">Émotion</span><span class="ea-flux-detail">étiquette retenue</span></li>
        </ol>
        <div class="ea-modele-colonnes">
            <div class="ea-modele-texte">
                <p class="ea-texte">Le classificateur est un SVM linéaire (<code>LinearSVC</code> de scikit-learn). Ce n'est pas un réseau de neurones.</p>
                <p class="ea-texte">Pour chaque émotion, il a appris une frontière qui la sépare de toutes les autres. Une nouvelle phrase reçoit donc vingt scores de marge : positifs du côté de l'émotion, négatifs de l'autre.</p>
                <p class="ea-texte">L'émotion au score le plus élevé est retenue. Ce score n'est pas une probabilité : il mesure une position par rapport à une frontière.</p>
            </div>
            <?php if ($modele !== null): ?>
                <figure class="ea-code">
                    <pre><code>Pipeline([
    ("vec", TfidfVectorizer(ngram_range=(<?= $e($modele["ngrammes"][0]) ?>, <?= $e($modele["ngrammes"][1]) ?>), min_df=<?= $e($modele["min_df"]) ?>)),
    ("clf", LinearSVC(C=<?= $e($modele["C"]) ?>)),
])</code></pre>
                    <figcaption class="ea-note">Pipeline simplifié : seuls les réglages retenus par la recherche de paramètres sont reproduits.</figcaption>
                </figure>
            <?php endif; ?>
        </div>
    </section>
    <!-- #endregion -->

    <!-- #region SCÈNE 5 : LA PRÉDICTION -->
    <section class="ea-scene ea-prediction" id="ea-prediction" aria-labelledby="ea-prediction-titre">
        <h2 class="ea-titre-scene" id="ea-prediction-titre">Voici l'émotion retenue.</h2>
        <?php if ($fil !== null): ?>
            <div class="ea-resultat-bloc">
                <p class="ea-phrase ea-phrase--retour"><?= $e($fil["phrase"]) ?></p>
                <p class="ea-resultat-etiquette">Émotion retenue par le modèle TF-IDF + SVM linéaire</p>
                <p class="ea-resultat"><?= $e($fil["retenue"]) ?></p>
                <ol class="ea-scores" aria-label="Les trois meilleurs scores de marge">
                    <?php foreach ($fil["top"] as $rang => $t): ?>
                        <li><span class="ea-score-nom"><?= $e($t["emotion"]) ?></span> <span class="ea-score-valeur"><?= $dec($t["score"]) ?></span></li>
                    <?php endforeach; ?>
                </ol>
                <p class="ea-texte">Écart avec la deuxième émotion : <strong><?= $dec($fil["ecart_avec_la_2e"]) ?></strong>.
                    <?php if ($fil["incertain"]): ?>
                        Cette phrase est signalée comme incertaine.
                    <?php else: ?>
                        Cette phrase n'est pas signalée comme incertaine.
                    <?php endif; ?>
                </p>
            </div>
            <ul class="ea-champ" aria-label="Les vingt émotions possibles">
                <?php foreach ($emotions as $emotion): ?>
                    <li<?php if ($emotion === $fil["retenue"]): ?> class="est-retenue" aria-current="true"<?php endif; ?>><?= $e($emotion) ?></li>
                <?php endforeach; ?>
            </ul>
            <p class="ea-note">Sortie réelle de <code>predire.py</code> sur une phrase de mon test manuel. Cette page n'appelle pas le modèle : aucun calcul n'est fait en direct.</p>
        <?php endif; ?>

        <div class="ea-certitude">
            <h3 class="ea-sous-titre">Une prédiction n'est pas une certitude</h3>
            <p class="ea-texte">Le modèle classe toujours une phrase, même quand aucune émotion ne lui convient vraiment. <code>predire.py</code> la signale alors comme incertaine : quand le score de la première émotion est négatif, ou quand l'écart avec la deuxième est faible<?php if (isset($seuils["ecart_min"])): ?> (moins de <?= $dec($seuils["ecart_min"], 2) ?>)<?php endif; ?>.</p>
        </div>

        <?php if (count($demos) > 0): ?>
            <div class="ea-cas" role="region" aria-label="Trois phrases du test manuel" tabindex="0">
                <table class="ea-tableau ea-tableau--cartes" role="table">
                    <caption>Trois phrases du test manuel, avec la vraie sortie de <code>predire.py</code></caption>
                    <thead role="rowgroup">
                        <tr role="row">
                            <th scope="col" role="columnheader">Phrase</th>
                            <th scope="col" role="columnheader">Attendue</th>
                            <th scope="col" role="columnheader">Retenue</th>
                            <th scope="col" role="columnheader">Trois meilleurs scores</th>
                            <th scope="col" role="columnheader">Résultat</th>
                        </tr>
                    </thead>
                    <tbody role="rowgroup">
                        <?php foreach ($demos as $demo): ?>
                            <tr role="row">
                                <th scope="row" role="rowheader"><?= $e($demo["phrase"]) ?></th>
                                <td role="cell" data-label="Attendue"><?= $e($demo["attendue"]) ?></td>
                                <td role="cell" data-label="Retenue"><?= $e($demo["retenue"]) ?></td>
                                <td role="cell" data-label="Scores">
                                    <ol class="ea-top">
                                        <?php foreach ($demo["top"] as $t): ?>
                                            <li><?= $e($t["emotion"]) ?> <span><?= $dec($t["score"]) ?></span></li>
                                        <?php endforeach; ?>
                                    </ol>
                                </td>
                                <?php if ($demo["juste"]): ?>
                                    <td role="cell" class="ea-statut ea-statut--juste">Juste</td>
                                <?php else: ?>
                                    <td role="cell" class="ea-statut ea-statut--faux">Faux<?php if ($demo["incertain"]): ?>, mais signalée incertaine (<?= $e($demo["raison"]) ?>)<?php endif; ?></td>
                                <?php endif; ?>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>
        <?php endif; ?>
    </section>
    <!-- #endregion -->

    <!-- #region SCÈNE 6 : LE PROJET RÉEL -->
    <section class="ea-scene ea-technique" id="ea-technique" aria-labelledby="ea-technique-titre">
        <div class="ea-technique-entete">
            <h2 class="ea-titre-scene" id="ea-technique-titre">Le projet en détail</h2>
            <p class="ea-texte">Ce qui a été construit, ce qui a été mesuré, et ce qui reste fragile.</p>
        </div>

        <article class="ea-ligne">
            <h3 class="ea-sous-titre">Problème et objectif</h3>
            <div class="ea-ligne-corps">
                <p class="ea-texte">Associer une phrase en français à l'une de vingt émotions. Le programme entraîne et compare plusieurs modèles de classification de texte avec scikit-learn, retient automatiquement le meilleur et le sauvegarde pour prédire de nouvelles phrases.</p>
                <p class="ea-texte">Chaque étape est écrite à la main, sans AutoML : chargement, préparation, entraînement, validation croisée, sélection, test final, sauvegarde.</p>
            </div>
        </article>

        <article class="ea-ligne">
            <h3 class="ea-sous-titre">Jeu de données</h3>
            <div class="ea-ligne-corps">
                <dl class="ea-faits">
                    <div><dt>Phrases</dt><dd><?= $nb($dataset["nb_phrases"] ?? null) ?>, en deux colonnes : phrase et émotion</dd></div>
                    <div><dt>Qualité</dt><dd><?= $nb($dataset["valeurs_manquantes"] ?? null) ?> valeur manquante, <?= $nb($dataset["doublons"] ?? null) ?> doublon</dd></div>
                    <div><dt>Équilibre</dt><dd>environ 550 phrases par émotion (de <?= $nb($dataset["par_emotion_min"] ?? null) ?> à <?= $nb($dataset["par_emotion_max"] ?? null) ?>)</dd></div>
                    <div><dt>Séparation</dt><dd>stratifiée : <?= $nb($dataset["entrainement"] ?? null) ?> phrases d'entraînement, <?= $nb($dataset["test"] ?? null) ?> de test (20&nbsp;%)</dd></div>
                    <div><dt>Provenance</dt><dd><?php if (!empty($dataset["provenance"])): ?><?= $e($dataset["provenance"]) ?><?php else: ?><span class="ea-acompleter">À compléter</span><?php endif; ?></dd></div>
                </dl>
            </div>
        </article>

        <article class="ea-ligne">
            <h3 class="ea-sous-titre">Représentation du texte</h3>
            <div class="ea-ligne-corps">
                <p class="ea-texte">Un TF-IDF sur les mots et les paires de mots (n-grammes de 1 à 2). Chaque modèle est un <code>Pipeline</code> (vectoriseur + classificateur) : le vocabulaire est appris uniquement sur l'entraînement, sans fuite de données depuis le test.</p>
            </div>
        </article>

        <article class="ea-ligne">
            <h3 class="ea-sous-titre">Entraînement et sélection</h3>
            <div class="ea-ligne-corps">
                <p class="ea-texte">Quatre modèles sont comparés par validation croisée stratifiée (<?= $nb($cv["plis"] ?? null) ?> plis), sur l'entraînement uniquement.</p>
                <ul class="ea-modeles">
                    <?php foreach ($comparaison as $m): ?>
                        <li<?php if ($m["retenu"]): ?> class="est-retenu"<?php endif; ?>><?= $e($m["nom"]) ?><?php if ($m["retenu"]): ?> <span class="ea-badge">retenu</span><?php endif; ?></li>
                    <?php endforeach; ?>
                </ul>
                <p class="ea-texte">Le gagnant est évalué une seule fois sur le jeu de test. Une recherche de paramètres a ensuite testé <?= $nb($recherche["combinaisons"] ?? null) ?> combinaisons : les 10 premières sont séparées de moins de <?= $dec($recherche["ecart_dix_premieres"] ?? null) ?>, leurs différences ne sont donc pas significatives. Les moins bonnes sont la <?= $e($recherche["moins_bonnes"] ?? "à établir") ?>.</p>
                <?php if ($modele !== null): ?>
                    <p class="ea-texte">Configuration retenue : TF-IDF + <code>LinearSVC</code>, n-grammes (<?= $e($modele["ngrammes"][0]) ?>, <?= $e($modele["ngrammes"][1]) ?>), <code>min_df = <?= $e($modele["min_df"]) ?></code>, <code>C = <?= $e($modele["C"]) ?></code>, sans poids de classes.</p>
                <?php endif; ?>
            </div>
        </article>

        <article class="ea-ligne">
            <h3 class="ea-sous-titre">Résultats mesurés</h3>
            <div class="ea-ligne-corps">
                <dl class="ea-chiffres">
                    <div><dt>Validation croisée, entraînement</dt><dd><?= $pct($cv["accuracy"] ?? null) ?></dd></div>
                    <div><dt>Test final, <?= $nb($test["nb_phrases"] ?? null) ?> phrases</dt><dd><?= $pct($test["accuracy"] ?? null) ?></dd></div>
                    <div><dt>Test manuel, <?= $nb($manuel["nb_phrases"] ?? null) ?> phrases écrites à la main</dt><dd><?= $pct($partManuel, 0) ?></dd></div>
                </dl>
                <p class="ea-texte">Exactitude (accuracy). Le F1 macro donne les mêmes valeurs à trois décimales pour la validation croisée et le test final.</p>

                <?php if (count($parEmotion) > 0): ?>
                    <figure class="ea-graphique">
                        <figcaption class="ea-texte">F1 par émotion sur le test final. Axe tronqué : de 90&nbsp;% à 100&nbsp;%.</figcaption>
                        <ol class="ea-barres">
                            <?php foreach ($parEmotion as $ligne): ?>
                                <li style="--v: <?= $e($barre($ligne["f1"])) ?>%"><span class="ea-barre-nom"><?= $e($ligne["emotion"]) ?></span><span class="ea-barre" aria-hidden="true"></span><span class="ea-barre-valeur"><?= $pct($ligne["f1"]) ?></span></li>
                            <?php endforeach; ?>
                        </ol>
                    </figure>
                    <details class="ea-detail">
                        <summary>Voir le tableau complet : précision, rappel, F1</summary>
                        <div class="ea-cas" role="region" aria-label="Rapport par émotion" tabindex="0">
                            <table class="ea-tableau ea-tableau--dense">
                                <thead>
                                    <tr><th scope="col">Émotion</th><th scope="col">Précision</th><th scope="col">Rappel</th><th scope="col">F1</th><th scope="col">Phrases</th></tr>
                                </thead>
                                <tbody>
                                    <?php foreach ($parEmotion as $ligne): ?>
                                        <tr><th scope="row"><?= $e($ligne["emotion"]) ?></th><td><?= $dec($ligne["precision"], 2) ?></td><td><?= $dec($ligne["rappel"], 2) ?></td><td><?= $dec($ligne["f1"], 3) ?></td><td><?= $nb($ligne["phrases"]) ?></td></tr>
                                    <?php endforeach; ?>
                                </tbody>
                            </table>
                        </div>
                    </details>
                <?php endif; ?>

                <?php if (count($confusions) > 0): ?>
                    <p class="ea-texte">Confusions les plus fréquentes :
                        <?php foreach ($confusions as $c): ?>
                            <span class="ea-confusion"><?= $e($c["vraie"]) ?> prise pour <?= $e($c["prise_pour"]) ?> (<?= $nb($c["nb"]) ?>)</span>
                        <?php endforeach; ?>
                    </p>
                <?php endif; ?>
            </div>
        </article>

        <article class="ea-ligne">
            <h3 class="ea-sous-titre">Test manuel et incertitude</h3>
            <div class="ea-ligne-corps">
                <p class="ea-texte">Soixante phrases plus ambiguës que le dataset (vie quotidienne, relations, travail, émotions subtiles, langage familier, situations ambiguës) : <strong><?= $nb($manuel["correctes"] ?? null) ?> correctes sur <?= $nb($manuel["nb_phrases"] ?? null) ?></strong>.</p>
                <p class="ea-texte">Le SVM ne produit pas de probabilités. Sur ces phrases, <?= $nb($manuel["signalees_incertaines"] ?? null) ?> ont été signalées comme incertaines, et les <?= $nb($manuel["erreurs"] ?? null) ?> erreurs en font partie. Aucune des <?= $nb($manuel["non_signalees"] ?? null) ?> phrases non signalées n'était fausse.</p>
                <p class="ea-texte ea-reserve"><?= $e($manuel["reserve"] ?? "À établir.") ?></p>
            </div>
        </article>

        <article class="ea-ligne">
            <h3 class="ea-sous-titre">Limites</h3>
            <div class="ea-ligne-corps">
                <ul class="ea-liste">
                    <?php foreach ($limites as $limite): ?>
                        <li><?= $e($limite) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </article>

        <article class="ea-ligne">
            <h3 class="ea-sous-titre">Améliorations envisagées</h3>
            <div class="ea-ligne-corps">
                <ul class="ea-liste">
                    <?php foreach ($pistes as $piste): ?>
                        <li><?= $e($piste) ?></li>
                    <?php endforeach; ?>
                </ul>
            </div>
        </article>

        <article class="ea-ligne">
            <h3 class="ea-sous-titre">Technologies et rôle</h3>
            <div class="ea-ligne-corps">
                <ul class="ea-techs" aria-label="Technologies utilisées">
                    <?php foreach ($techProjet as $tech): ?>
                        <li><?= $e($tech) ?></li>
                    <?php endforeach; ?>
                </ul>
                <p class="ea-texte">Mon rôle : <?php if ($role): ?><?= $e($role) ?><?php else: ?><span class="ea-acompleter">À compléter</span><?php endif; ?></p>
            </div>
        </article>

        <?php if ($images): ?>
            <article class="ea-ligne">
                <h3 class="ea-sous-titre">Captures</h3>
                <div class="ea-ligne-corps">
                    <div class="ea-captures">
                        <?php foreach ($images as $i => $img): ?>
                            <figure class="ea-capture"><img src="<?= $e($img) ?>" alt="<?= $e($titreProjet) ?> : capture <?= $i + 1 ?>" loading="lazy"></figure>
                        <?php endforeach; ?>
                    </div>
                </div>
            </article>
        <?php endif; ?>
    </section>
    <!-- #endregion -->

    <!-- #region SCÈNE 7 : LA CONCLUSION -->
    <section class="ea-scene ea-conclusion" id="ea-conclusion" aria-labelledby="ea-conclusion-titre">
        <h2 class="ea-titre-conclusion" id="ea-conclusion-titre">
            <span class="ea-titre-haut"><?= $e($titreHaut) ?></span>
            <?php if ($titreBas !== ""): ?>
                <span class="ea-titre-bas"><?= $e($titreBas) ?></span>
            <?php endif; ?>
        </h2>
        <p class="ea-texte ea-conclusion-texte">Une phrase, vingt émotions possibles : <?= $pct($test["accuracy"] ?? null) ?> sur le jeu de test, <?= $pct($partManuel, 0) ?> sur des phrases écrites à la main. Les deux chiffres comptent.</p>
        <ul class="ea-actions">
            <li>
                <?php if ($lienCode !== null): ?>
                    <a class="ea-btn ea-btn--principal" href="<?= $e($lienCode) ?>" target="_blank" rel="noopener noreferrer">Voir le code</a>
                <?php else: ?>
                    <span class="ea-btn ea-btn--inactif">Dépôt public à venir</span>
                <?php endif; ?>
            </li>
            <li><a class="ea-btn" href="projets.php">Retour aux projets</a></li>
            <?php if ($lienSuivant !== null): ?>
                <li><a class="ea-btn" href="<?= $e($lienSuivant) ?>">Projet suivant : <?= $e($titreSuivant) ?></a></li>
            <?php endif; ?>
            <li><a class="ea-btn ea-btn--discret" href="#ea-debut">Revenir en haut</a></li>
        </ul>
    </section>

    <!-- #endregion -->
    <script type="module" src="js/projets/emotion-ai.js"></script>
    <?php include 'includes/footer.php';?> ?>
</div>
