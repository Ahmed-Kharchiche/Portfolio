<?php
/**
 * Présentation autonome « Emotion AI », accessible depuis la page immersive du projet.
 * Le moteur commun anime les scènes au scroll ; le contenu reste lisible sans JavaScript.
 * Les chiffres viennent de data/emotion-ai.json (README + résultats du projet Python).
 * Une donnée absente s'affiche « à établir » : aucune valeur n'est inventée.
 */


// #region INITIALISATION

require_once __DIR__ . '/src/modeles/Projet.php';
require_once __DIR__ . '/src/gestionnaires/GestionnaireProjets.php';

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

$fichierDonnees = __DIR__ . "/data/emotion-ai.json";
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

$sans_smooth = true; // ScrollTrigger suit le défilement natif, sans seconde boucle de lissage.
$titre_page = $titre;
$css_supplementaires = ['projets/base.css'];
include 'templates/layout/header.php';
?>
<link rel="stylesheet" href="assets/css/projets/emotion-ai.css">
<main class="exp ea" id="ea-debut" data-template="emotion-ai" data-experience-autonome>
    <a class="ea-lien-evitement" href="#ea-technique">Aller au contenu technique</a>
    <a class="ea-retour-immersif" href="detail-projet.php?id=<?= urlencode((string) $projet->getId()) ?>">Vue immersive <span aria-hidden="true">↗</span></a>

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

    <!-- #region SCÈNE 2 : COMPRENDRE LES ÉMOTIONS HUMAINES -->
    <section class="ea-scene ea-comprendre" id="ea-comprendre" aria-labelledby="ea-comprendre-titre">
        <div class="ea-comprendre-contenu">
            <p class="ea-comprendre-repere" aria-hidden="true">02 / HUMAN SIGNAL</p>
            <h2 class="ea-comprendre-titre" id="ea-comprendre-titre" lang="en">
                <span class="ea-mot-ligne">UNDERSTANDING</span>
                <span class="ea-mot-ligne">HUMAN</span>
                <span class="ea-mot-ligne ea-mot-ligne--contour">EMOTIONS</span>
            </h2>
            <p class="ea-comprendre-phrase" lang="en">Every face tells a story.</p>
            <ol class="ea-etapes-ia" aria-label="Les étapes de l'analyse de texte">
                <li><span lang="en">DETECT</span><p>Repérer les indices dans les mots.</p></li>
                <li><span lang="en">ANALYZE</span><p>Pondérer le texte avec TF-IDF.</p></li>
                <li><span lang="en">INTERPRET</span><p>Estimer l'émotion dominante.</p></li>
            </ol>
            <p class="ea-comprendre-note">Ce visage est une métaphore. Emotion AI analyse du texte, pas des visages.</p>
        </div>
    </section>
    <!-- #endregion -->

    <!-- #region SCÈNE 3 : INSIDE THE AI -->
    <section class="ea-scene ea-inside" id="ea-inside" aria-labelledby="ea-inside-titre">
        <div class="ea-inside-entree" lang="en">
            <p class="ea-inside-repere">03 / INSIDE THE AI</p>
            <p class="ea-inside-invitation">Follow the signal.</p>
        </div>
        <div class="ea-inside-entete">
            <h2 class="ea-inside-titre" id="ea-inside-titre" lang="en">THE LANGUAGE<br>OF EMOTIONS</h2>
            <p class="ea-inside-soustitre" lang="en">Different patterns. Different interpretations.</p>
        </div>
        <ol class="ea-inside-labels" aria-hidden="true" lang="en">
            <li>JOY</li><li>SADNESS</li><li>ANGER</li><li>FEAR</li><li>SURPRISE</li><li>NEUTRAL</li>
        </ol>
        <div class="ea-inside-controles">
            <div class="ea-inside-selection">
                <span class="ea-inside-legende">EXPLORER UNE ÉMOTION</span>
                <output class="ea-inside-resultat" aria-live="polite" aria-atomic="true">JOY</output>
            </div>
            <div class="ea-inside-selecteur" role="group" aria-label="Explorer les six constellations émotionnelles">
                <?php foreach (['JOY', 'SADNESS', 'ANGER', 'FEAR', 'SURPRISE', 'NEUTRAL'] as $indexEmotion => $nomEmotion): ?>
                    <button type="button" data-emotion="<?= $indexEmotion ?>" aria-pressed="<?= $indexEmotion === 0 ? 'true' : 'false' ?>" lang="en"><?= $nomEmotion ?></button>
                <?php endforeach; ?>
            </div>
            <p class="ea-inside-description">Joie · impulsions ouvertes et rayonnantes.</p>
            <p class="ea-inside-verite">Réseau symbolique. TF-IDF + SVM : 20 classes. Aucune inférence en direct ; NEUTRAL hors modèle.</p>
        </div>
    </section>
    <!-- #endregion -->

    <!-- #region SCÈNE 4 : FROM WORDS TO EMOTIONS -->
    <?php $exemplesLangage = json_decode((string) file_get_contents(__DIR__ . '/data/emotion-ai-exemples.json'), true) ?: []; ?>
    <section class="ea-scene ea-words" id="ea-words" aria-labelledby="ea-words-titre">
        <script type="application/json" id="ea-words-exemples"><?= json_encode($exemplesLangage, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE) ?></script>
        <div class="ea-words-entete">
            <div class="ea-words-caption">
                <p class="ea-words-repere">04 / LANGUAGE IN MOTION</p>
                <h2 id="ea-words-titre" lang="en">FROM WORDS<br>TO EMOTIONS</h2>
                <p lang="en">A human thought. A new interpretation.</p>
            </div>
            <div class="ea-words-caption" aria-hidden="true" lang="en">
                <h2>WORDS BECOME DATA</h2><p>Turning text into weighted numerical features.</p>
            </div>
            <div class="ea-words-caption" aria-hidden="true" lang="en">
                <h2>FINDING THE EMOTION</h2><p>From numerical features to a predicted category.</p>
            </div>
            <div class="ea-words-caption" aria-hidden="true" lang="en">
                <h2>EVERY WORD CARRIES<br>AN EMOTION</h2><p>Explore how language can express different feelings.</p>
            </div>
        </div>
        <div class="ea-words-lecture" aria-live="polite" aria-atomic="true">
            <p class="ea-words-phrase" lang="en">I finally achieved my dream!</p>
            <p class="ea-words-resultat" lang="en">JOY</p>
            <p lang="en">The emotion behind the words.</p>
        </div>
        <p class="ea-words-devise" lang="en">The emotion behind the words.</p>
        <div class="ea-words-controles">
            <div class="ea-words-selecteur" role="group" aria-label="Explorer six phrases illustratives">
                <?php foreach ($exemplesLangage as $indexExemple => $exempleLangage): ?>
                    <button type="button" data-phrase="<?= $indexExemple ?>" aria-pressed="<?= $indexExemple === 0 ? 'true' : 'false' ?>" lang="en">
                        <strong><?= $e($exempleLangage['emotion']) ?></strong><span><?= $e($exempleLangage['phrase']) ?></span>
                    </button>
                <?php endforeach; ?>
            </div>
            <p class="ea-words-statut" role="status">Démonstration illustrative · aucune prédiction calculée</p>
        </div>
        <p class="ea-words-exactitude">Exemples anglais : cellules pondérées par un mini TF-IDF pédagogique (unigrammes sur ces six phrases), distinct du vectoriseur entraîné. Modèle documenté : TF-IDF + SVM linéaire, <?= count($emotions) ?> émotions françaises. NEUTRAL hors modèle ; aucune inférence connectée.</p>
    </section>
    <!-- #endregion -->

    <!-- #region SCÈNE 5 : BEHIND THE MODEL -->
    <?php $apprentissage = json_decode(file_get_contents(__DIR__ . '/data/emotion-ai-apprentissage.json'), true); ?>
    <section class="ea-scene ea-learning" id="ea-learning" aria-labelledby="ea-learning-titre">
        <script type="application/json" id="ea-learning-donnees"><?= json_encode($apprentissage, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) ?></script>
        <div class="ea-learning-intro">
            <p class="ea-learning-repere">05 — BEHIND THE MODEL</p>
            <p>How does artificial intelligence learn to recognize emotions?</p>
        </div>
        <div class="ea-learning-titres">
            <article class="ea-learning-phase">
                <h2 id="ea-learning-titre">EVERY PREDICTION<br>STARTS WITH DATA</h2>
                <p>Learning from examples.</p>
                <p class="ea-learning-description">Les cartes sont des exemples fictifs, pas des extraits du dataset réel.</p>
            </article>
            <article class="ea-learning-phase">
                <h3>LEARNING FROM<br>LABELED EXAMPLES</h3>
                <p>Each example helps define a category.</p>
                <p class="ea-learning-description">Six classes représentées parmi les <?= count($emotions) ?> classes documentées. Entraînement et test restent séparés.</p>
            </article>
            <article class="ea-learning-phase">
                <h3>FROM WORDS<br>TO FEATURES</h3>
                <p>Transforming language into numerical patterns.</p>
                <p class="ea-learning-description">TF-IDF pédagogique calculé sur six phrases fictives. Colonnes : heureux, manque, injuste, peur, inattendu, calme.</p>
            </article>
            <article class="ea-learning-phase">
                <h3>LEARNING<br>STATISTICAL PATTERNS</h3>
                <p>Connecting text features with emotion categories.</p>
                <p class="ea-learning-description">Le modèle documenté est un SVM linéaire : des frontières de décision apprises, pas un réseau neuronal.</p>
            </article>
            <article class="ea-learning-phase">
                <h3>LEARNING IS<br>ONLY THE BEGINNING</h3>
                <p>Testing how the model generalizes.</p>
                <p class="ea-learning-description">EXPECTED / PREDICTED* : comparaison fictive, sans mesure de performance. Predictions are estimates, not absolute truths.</p>
            </article>
            <article class="ea-learning-phase">
                <h3>BUILT FROM DATA.<br>READY TO PREDICT.</h3>
                <p>Patterns learned. Predictions made possible.</p>
                <p class="ea-learning-description">Ce noyau est une métaphore du modèle entraîné, pas une représentation de son fichier.</p>
            </article>
        </div>
        <p class="ea-learning-lecture"></p>
        <div class="ea-learning-controles" role="group" aria-label="Composantes du modèle">
            <button type="button" data-composante="0" aria-pressed="true">DATA</button>
            <button type="button" data-composante="1" aria-pressed="false">FEATURES</button>
            <button type="button" data-composante="2" aria-pressed="false">MODEL</button>
        </div>
        <div class="ea-learning-accessible">
            <h3>Exemples pédagogiques</h3>
            <ul><?php foreach ($apprentissage['entrainement'] as $carte): ?>
                <li>« <?= $e($carte['phrase']) ?> » — <?= $e($carte['emotion']) ?></li>
            <?php endforeach; ?></ul>
            <p>Les phrases réservées au test ne servent pas à calculer le vocabulaire ou les poids TF-IDF. Les sorties illustrées ne sont pas des prédictions calculées.</p>
            <p>Classes documentées : <?= $e(implode(', ', $emotions)) ?>.</p>
        </div>
        <p class="ea-learning-note">Visualisation pédagogique · TF-IDF + LinearSVC documentés · exemples et sorties fictifs · aucune inférence exécutée.</p>
    </section>
    <!-- #endregion -->
    <!-- #region SCÈNE 6 : BEYOND THE MODEL -->
    <?php $experience = json_decode(file_get_contents(__DIR__ . '/data/emotion-ai-experience.json'), true); ?>
    <section class="ea-scene ea-experience" id="ea-experience" aria-labelledby="ea-experience-titre">
        <script type="application/json" id="ea-experience-donnees"><?= json_encode($experience, JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) ?></script>
        <div class="ea-experience-intro"><p>06 — BEYOND THE MODEL</p><p>From intelligence to experience.</p></div>
        <div class="ea-experience-titres">
            <article class="ea-experience-phase"><h2 id="ea-experience-titre">INTELLIGENCE<br>BECOMES EXPERIENCE</h2><p>Turning predictions into meaningful insights.</p></article>
            <article class="ea-experience-phase"><h3>EVERY MESSAGE<br>HAS A STORY</h3><p>Exploring emotional patterns in language.</p><p class="ea-experience-reserve">Huit messages fictifs ; quatre classes parmi les vingt émotions françaises du modèle.</p></article>
            <article class="ea-experience-phase"><h3>SEE THE<br>BIGGER PICTURE</h3><p>Patterns emerge when messages come together.</p><p class="ea-experience-reserve">La hauteur des colonnes correspond aux effectifs de cet échantillon illustratif.</p></article>
            <article class="ea-experience-phase"><h3>BEYOND A<br>SINGLE PREDICTION</h3><p>Exploring what emotion-aware text analysis could make possible.</p><p class="ea-experience-reserve">Trois pistes d’application, pas des services déployés.</p></article>
            <article class="ea-experience-phase"><h3>EXPLORE<br>THE MESSAGES</h3><p>Choose a context, an emotion, a message.</p></article>
            <article class="ea-experience-phase"><h3>BEYOND DATA,<br>THERE IS HUMAN EXPERIENCE.</h3><p>AI can identify patterns in words, but human emotions remain complex.</p></article>
        </div>
        <p class="ea-experience-legende">Échantillon fictif — <?php foreach ($experience['emotions'] as $i => $emotion): ?><?= $i ? ' · ' : '' ?><?= $e($emotion) ?> : <?= count(array_filter($experience['messages'], fn($message) => $message['emotion'] === $emotion)) ?><?php endforeach; ?></p>
        <div class="ea-experience-controles" aria-label="Exploration des exemples">
            <div class="ea-experience-contextes" role="group" aria-label="Contexte d’exploration">
                <?php foreach ($experience['contextes'] as $i => $contexte): ?><button type="button" data-contexte="<?= $i ?>" aria-pressed="<?= $i===2 ? 'true' : 'false' ?>" aria-label="<?= $e($contexte['titre']) ?>"><?= $e($contexte['court']) ?></button><?php endforeach; ?>
            </div>
            <p class="ea-experience-contexte"></p>
            <div class="ea-experience-filtres" role="group" aria-label="Mettre une émotion en valeur">
                <button type="button" data-emotion="-1" aria-pressed="true">Toutes</button>
                <?php foreach ($experience['emotions'] as $i => $emotion): ?><button type="button" data-emotion="<?= $i ?>" aria-pressed="false"><?= $e($emotion) ?></button><?php endforeach; ?>
            </div>
            <div class="ea-experience-messages" role="group" aria-label="Choisir un message">
                <?php foreach ($experience['messages'] as $i => $message): ?><button type="button" data-message="<?= $i ?>" aria-pressed="<?= $i===0 ? 'true' : 'false' ?>"><span><?= $e($message['texte']) ?></span><small><?= $e($message['emotion']) ?></small></button><?php endforeach; ?>
            </div>
            <p class="ea-experience-detail" role="status" aria-live="polite"></p>
            <p class="ea-experience-effectifs" aria-label="Effectifs du contexte, toutes catégories"></p>
        </div>
        <p class="ea-experience-note">Démonstration interactive sur des exemples fictifs · aucune inférence · aucun score de confiance. Une étiquette de texte ne décrit pas avec certitude l’état d’une personne.</p>
        <details class="ea-experience-reference" id="ea-technique"><summary>Informations documentées sur le projet réel</summary>
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

        </details>
    </section>
    <!-- #endregion -->

    <!-- #region SCÈNE 7 : BEYOND THE ALGORITHM -->
    <section class="ea-scene ea-conclusion ea-final" id="ea-conclusion" aria-labelledby="ea-conclusion-titre">
        <script type="application/json" id="ea-conclusion-donnees"><?= json_encode(['emotions'=>$emotions,'modele'=>$modele], JSON_HEX_TAG | JSON_HEX_AMP | JSON_UNESCAPED_UNICODE) ?></script>
        <div class="ea-final-intro"><p>07 — BEYOND THE ALGORITHM</p><p>Behind every message, a human story.</p></div>
        <div class="ea-final-titres">
            <article class="ea-final-phase"><h3>EVERY CONNECTION<br>TELLS A STORY</h3><p>From individual words to shared patterns.</p></article>
            <article class="ea-final-phase"><h3>A SPECTRUM OF<br>HUMAN EXPRESSION</h3><p>Many emotional patterns. Countless ways to express them.</p><p class="ea-final-reserve">Les <?= count($emotions) ?> classes documentées du modèle, pas une liste exhaustive des émotions humaines.</p></article>
            <article class="ea-final-phase"><h3>HUMAN EMOTIONS<br>ARE MORE THAN LABELS</h3><p>AI recognizes patterns in language. Meaning remains deeply human.</p></article>
        </div>
        <div class="ea-final-etiquettes" aria-hidden="true"><?php foreach (array_slice($emotions,0,4) as $emotion): ?><span><?= $e($emotion) ?></span><?php endforeach; ?></div>
        <div class="ea-final-projet">
            <p class="ea-final-revelation">BEHIND EVERY MESSAGE, A HUMAN STORY.</p>
            <h2 id="ea-conclusion-titre"><span class="ea-final-mot">EMOTION</span> <span class="ea-final-mot ea-final-ai">AI</span></h2>
            <p class="ea-final-soustitre">Understanding emotions through language.</p>
            <p class="ea-final-info ea-final-description">Text Emotion Classification</p>
            <ul class="ea-final-techs" aria-label="Technologies et catégories documentées">
                <li class="ea-final-info">NATURAL LANGUAGE PROCESSING</li>
                <li class="ea-final-info">TF-IDF + LINEAR SVM</li>
                <li class="ea-final-info"><?= count($emotions) ?> FRENCH EMOTION CLASSES</li>
            </ul>
        </div>
        <nav class="ea-final-actions" aria-label="Découvrir le projet Emotion AI">
            <a class="ea-btn ea-btn--principal" href="#ea-technique" data-apercu-projet aria-haspopup="dialog" aria-controls="ea-apercu" lang="en">EXPLORE THE PROJECT <span aria-hidden="true">↗</span></a>
            <?php if ($lienCode !== null): ?><a class="ea-btn" href="<?= $e($lienCode) ?>" target="_blank" rel="noopener noreferrer" lang="en">VIEW THE CODE <span aria-hidden="true">↗</span></a><?php endif; ?>
            <a class="ea-final-retour" href="#ea-debut">Revenir en haut</a>
        </nav>
        <details class="ea-final-accessible"><summary>Les catégories documentées</summary><p><?= $e(implode(', ', $emotions)) ?>.</p><p>TF-IDF + LinearSVC classent des textes. Les formes et les parcours lumineux sont une représentation artistique, sans inférence exécutée sur cette page.</p></details>
    </section>
    <!-- #endregion -->
    <dialog class="ea-apercu" id="ea-apercu" aria-labelledby="ea-apercu-titre">
        <div class="ea-apercu-entete">
            <p>APERÇU DU PROJET</p>
            <form method="dialog"><button type="submit" autofocus aria-label="Fermer l’aperçu">Fermer <span aria-hidden="true">×</span></button></form>
        </div>
        <div class="ea-apercu-corps">
        <h2 id="ea-apercu-titre"><?= $e($titreProjet) ?></h2>
        <p class="ea-apercu-description">Un projet Python de classification des émotions dans les textes français. Le modèle documenté associe une représentation TF-IDF à un SVM linéaire (LinearSVC), pour distinguer <?= count($emotions) ?> catégories émotionnelles.</p>
        <p>Cette expérience présente le parcours du texte aux caractéristiques numériques, l’apprentissage du modèle et ses possibilités d’utilisation. Les animations sont des représentations pédagogiques ; aucune prédiction n’est exécutée en direct ici.</p>
        <h3>Technologies</h3>
        <ul class="ea-apercu-techs"><?php foreach ($techProjet as $tech): ?><li><?= $e($tech) ?></li><?php endforeach; ?></ul>
        <?php if ($images): ?>
            <h3>Captures du projet</h3>
            <div class="ea-apercu-images">
                <?php foreach ($images as $i => $image): ?><figure><img src="<?= $e($image) ?>" alt="<?= $e($titreProjet) ?> — capture <?= $i+1 ?>" loading="lazy"><figcaption>Capture <?= $i+1 ?></figcaption></figure><?php endforeach; ?>
            </div>
        <?php endif; ?>
        <?php if ($lienCode !== null): ?><p><a class="ea-btn" href="<?= $e($lienCode) ?>" target="_blank" rel="noopener noreferrer">Voir le code source ↗</a></p><?php endif; ?>
        </div>
    </dialog>
    <script type="module" src="assets/js/projets/emotion-ai.js"></script>
</main>
<?php include 'templates/layout/footer.php'; ?>
