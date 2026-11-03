/**
 * emotion-ai.js : animations propres au template « Emotion AI ».
 *
 * Le signal validé et son relais vers la scène 2 partagent le même sablier.
 *
 * Principe commun : une timeline GSAP par scène, pilotée par le scroll (scrub) et épinglée.
 * Rien ne se joue tout seul : le défilement natif du navigateur reste intact, et tout est
 * réversible quand le visiteur remonte.
 */
import { lancerExperience } from "../commun/projet-core.js";
import { decouperLettres, dupliquerCalque, ajouterCalque } from "../commun/animations-communes.js";
import { creerSceneComprendre } from "./scene-comprendre.js";
import { creerSceneInterieur, activerEmotionsStatiques } from "./scene-interieur.js";
import { creerSceneLangage, activerExemplesStatiques } from "./scene-langage.js";

// Le moteur 3D du sablier est chargé à la demande (import dynamique) : s'il manque ou si WebGL2 est
// indisponible, la scène 1 reste exactement celle qui a été validée, sans sablier.
let moteurSablier = null;
let moteurVisage = null;
// Une instance GPU pour les deux scènes. Les timelines ne possèdent que leurs propriétés d'état.
const partage = { sablier: null, stage: null, etat: null, dessiner: null, geom2: null };

/* ==========================================================================
   SCÈNE 1 : LE SIGNAL
   Le titre se transforme au fil du scroll :
     1. il grandit ; ses lettres s'écartent en vague ;
     2. un écho en contour apparaît derrière, avec une vague inverse ;
     3. le texte plein s'efface pendant que le contour prend le relais (le contraste s'inverse) ;
     4. « AI » traverse le titre et vient s'aligner à gauche, en grossissant ;
     5. la phrase d'accroche est révélée par un masque horizontal ;
     6. la lueur d'accent grandit et dérive vers le centre.
   Avec le sablier (WebGL2 disponible), la timeline dure 16 unités ; le rythme des 10 premières est inchangé :
     repère « aiFin » (unité 9) : instant où « AI » finit sa traversée ;
     unités  2 → 9    : le sablier entre par la droite, quasi couché, et approche en décélérant ;
     unités 5,8 → 9   : il se redresse jusqu'à la verticale parfaite, EXACTEMENT à aiFin ;
     unités 9 → 10,8  : le sable surface et se calme ; unité 9,7 → 15,3 : le sable s'écoule du haut vers le bas ;
     unités 8,6 → 16  : le sable s'éveille en grains lumineux reliés (réseau neuronal discret).
   Le retournement appartient au relais suivant, sans modifier cette timeline validée.
   Sans sablier : durée de 10 unités (le scroll la parcourt de 0 à 10).
   ========================================================================== */
const sceneSignal = {
    id: "ea-signal",

    /** Charge le moteur 3D (tolère l'échec : la scène fonctionne sans sablier). */
    async charger() {
        if (!moteurSablier) moteurSablier = await import("./sablier.js");
        try { if (!moteurVisage) moteurVisage = await import("./visage.js"); }
        catch (erreur) { console.warn("[emotion-ai] visage indisponible :", erreur.message); }
    },

    /** Prépare le DOM (une seule fois) : découpe en lettres, écho décoratif, lueur. */
    preparer(racine) {
        const scene = racine.querySelector("#ea-signal");
        const titre = scene && scene.querySelector(".ea-titre");
        const haut = titre && titre.querySelector(".ea-titre-haut");
        const bas = titre && titre.querySelector(".ea-titre-bas");
        if (!scene || !titre || !haut) throw new Error("structure de la scène 1 introuvable");

        // Le nom accessible du titre reste « Emotion AI » ; les lettres sont décoratives.
        const libelle = titre.textContent.replace(/\s+/g, " ").trim();
        const decoupe = decouperLettres(haut);
        titre.setAttribute("aria-label", libelle);
        // « AI » : mot enveloppé dans un inline-block pour mesurer sa vraie largeur sans subir les transformations
        const htmlBas = bas ? bas.innerHTML : null;
        let motAI = null;
        if (bas) {
            motAI = document.createElement("span");
            motAI.className = "ea-bas-texte";
            motAI.textContent = bas.textContent.trim();
            bas.textContent = "";
            bas.appendChild(motAI);
            bas.setAttribute("aria-hidden", "true");
        }

        // Calques : le texte plein (base) et son écho en contour (ombre), superposés.
        haut.classList.add("ea-haut-anime");
        const base = document.createElement("span");
        base.className = "ea-base";
        base.setAttribute("aria-hidden", "true");
        [...haut.children].forEach((lettre) => base.appendChild(lettre));
        haut.appendChild(base);
        const echo = dupliquerCalque(base, "ea-ombre");

        const stage = document.createElement("div");
        stage.className = "ea-stage";
        stage.setAttribute("aria-hidden", "true");
        racine.prepend(stage);
        partage.stage = stage;
        const lueur = ajouterCalque(stage, "ea-lueur");

        // Sablier 3D : un canevas décoratif sous le texte, créé seulement si WebGL2 répond.
        let canevas = null, sablier = null, observateur = null, themeur = null, contextePerdu = false;
        const perdreContexte = (ev) => {
            ev.preventDefault();
            contextePerdu = true;
            canevas.style.display = "none";
            racine.classList.add("ea-sans-visage");
        };
        if (moteurSablier) {
            canevas = document.createElement("canvas");
            canevas.className = "ea-sablier";
            canevas.setAttribute("aria-hidden", "true");
            lueur.after(canevas);
            const leger = window.matchMedia("(max-width: 1023.98px)").matches || (navigator.hardwareConcurrency || 8) <= 4;
            try { sablier = moteurSablier.creerSablier(canevas, { leger, creerVisage: moteurVisage?.creerVisage }); }
            catch (erreur) { console.warn("[emotion-ai] sablier :", erreur.message); sablier = null; }
            if (!sablier) { canevas.remove(); canevas = null; }
            else {
                canevas.addEventListener("webglcontextlost", perdreContexte);
                // thème clair / sombre : les couleurs du verre et du réseau sont relues
                themeur = new MutationObserver(() => { sablier.couleurs(); partage.dessiner?.(); });
                themeur.observe(document.body, { attributes: true, attributeFilter: ["data-theme"] });
                // redimensionnement : le canevas suit la taille de la scène sans attendre le recalcul de ScrollTrigger
                observateur = new ResizeObserver(() => { sablier.redimensionner(); partage.dessiner?.(); });
                observateur.observe(stage);
            }
        }
        partage.sablier = sablier;
        racine.classList.toggle("ea-sans-visage", !sablier?.visageDisponible);

        return {
            scene, stage, titre, haut, bas, motAI, base, lueur, canevas, sablier,
            contexteDisponible: () => !contextePerdu,
            lettresBase: [...base.querySelectorAll(".ea-lettre")],
            lettresOmbre: echo.lettres,
            ombre: echo.copie,
            meta: scene.querySelector(".ea-meta"),
            accroche: scene.querySelector(".ea-accroche"),
            indice: scene.querySelector(".ea-indice"),
            restaurer() {
                echo.retirer();
                stage.remove();
                racine.classList.remove("ea-sans-visage");
                Object.assign(partage, { sablier: null, stage: null, etat: null, dessiner: null, geom2: null });
                if (themeur) themeur.disconnect();
                if (observateur) observateur.disconnect();
                if (canevas) canevas.removeEventListener("webglcontextlost", perdreContexte);
                if (sablier) sablier.detruire();
                if (canevas) canevas.remove();
                haut.classList.remove("ea-haut-anime");
                decoupe.restaurer();
                titre.removeAttribute("aria-label");
                if (bas) { bas.innerHTML = htmlBas; bas.removeAttribute("aria-hidden"); }
            },
        };
    },

    /** Construit la timeline pour la taille d'écran courante (appelée par gsap.matchMedia). */
    animer(e, conditions, { gsap }) {
        const grand = conditions.desktop;
        const centre = (i, n) => i - (n - 1) / 2;

        const sab = e.sablier;                      // null si WebGL2 est indisponible
        const unites = sab ? 16 : 10;               // durée de la timeline ; 1 unité = 0,18 x la hauteur d'écran de scroll
        const etat = {
            x0: 0, y0: 0, angle0: 0, calme: 0, flux: 0, reseau: 0,
            flip: 0, centrage: 0, verre: 1, morph: 0, scan: 2, analyse: 0, sourire: 0, sortie: 0, etape: 0,
        };
        partage.etat = etat;

        const tl = gsap.timeline({
            // force3D est réservé aux tweens DOM, jamais aux objets d'état.
            onUpdate: () => partage.dessiner?.(),   // après le rendu de tous les tweens
            scrollTrigger: {
                trigger: e.scene,
                id: "ea-signal",
                start: "top top",
                end: () => "+=" + Math.round(window.innerHeight * (grand ? 1.8 : 1.2) * (unites / 10)),
                scrub: 0.6,
                pin: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,         // recalcule les valeurs dépendant de la taille de l'écran
                onRefresh: () => { if (sab) { sab.redimensionner(); partage.dessiner?.(); } },
            },
        });

        const animerTexte = (cible, debut, fin, position) =>
            tl.fromTo(cible, debut, { force3D: false, ...fin }, position);

        // « AI » est un enfant du titre : il en subit l'agrandissement (échelleTitre), en plus du sien.
        // On vise un agrandissement TOTAL de « AI » (échelleAIFinale) et on calcule son décalage pour que
        // son bord gauche s'affiche exactement au bord gauche de la boîte du titre, une fois les deux
        // échelles appliquées. Mesuré à chaque refresh, en % de la largeur de la boîte.
        const echelleTitre = grand ? 1.45 : 1;
        const echelleAIFinale = grand ? 1.8 : 1.3;
        const echelleAI = echelleAIFinale / echelleTitre;
        const traverseeAI = () => {
            const boite = e.titre.clientWidth;
            const texte = e.motAI ? e.motAI.offsetWidth : 0;
            const gauche = (boite / 2) * (1 - 1 / echelleTitre);    // repère de la boîte, avant l'échelle du parent
            return ((gauche + echelleAI * texte - boite) / boite) * 100;
        };

        // 0 : l'indice de défilement s'efface dès que le visiteur a compris qu'il pilote la scène
        if (e.indice) animerTexte(e.indice, { opacity: 1, y: 0 }, { opacity: 0, y: 14, duration: 0.8, ease: "none" }, 0);

        // Étiquette discrète : elle monte lentement (parallaxe) et s'atténue
        if (e.meta) animerTexte(e.meta, { opacity: 1, y: 0 }, { opacity: 0.35, y: -18, duration: 7, ease: "none" }, 0);

        // 1. Le titre grandit (débordement voulu sur grand écran) puis monte
        animerTexte(e.titre,
            { scale: 1, yPercent: 0, transformOrigin: "50% 50%" },
            { scale: echelleTitre, yPercent: grand ? -14 : -6, duration: 9, ease: "power1.out" }, 0);

        // 1b. Les lettres s'écartent et ondulent depuis le centre
        animerTexte(e.lettresBase,
            { xPercent: 0, yPercent: 0 },
            {
                xPercent: (i, _, cible) => (grand ? centre(i, cible.length) * 5 : 0),
                yPercent: (i) => (i % 2 ? -1 : 1) * (grand ? 6 : 4),
                duration: 7, ease: "power2.inOut", stagger: { each: 0.08, from: "center" },
            }, 0.3);

        // 2. L'écho en contour apparaît derrière et dérive ; sa vague est inversée
        animerTexte(e.ombre,
            { opacity: 0, xPercent: 0, yPercent: 0 },
            { opacity: 1, xPercent: grand ? 5 : 2, yPercent: grand ? -8 : -5, duration: 7.5, ease: "power1.out" }, 0.6);
        animerTexte(e.lettresOmbre,
            { yPercent: 0 },
            { yPercent: (i) => (i % 2 ? 1 : -1) * (grand ? 10 : 6), duration: 7.5, ease: "power2.inOut", stagger: { each: 0.05, from: "center" } }, 0.6);

        // 3. Le texte plein s'efface, le contour prend le relais : le contraste s'inverse
        animerTexte(e.lettresBase,
            { opacity: 1 },
            { opacity: 0.1, duration: 4.5, ease: "power1.in", stagger: { each: 0.05, from: "edges" } }, 4.5);

        // 4. « AI » traverse le titre et finit aligné à gauche, en grossissant.
        //    Son instant d'arrivée est un REPÈRE de la timeline (« aiFin ») : le sablier s'y accroche, il n'y a
        //    aucun délai arbitraire. Si cette tween change de durée ou de départ, le sablier suit.
        const AI = { debut: 1.5, duree: 7.5 };
        tl.addLabel("aiFin", AI.debut + AI.duree);
        if (e.bas) {
            animerTexte(e.bas,
                { xPercent: 0, scale: 1, transformOrigin: "100% 50%" },
                { xPercent: traverseeAI, scale: echelleAI, duration: AI.duree, ease: "power2.inOut" }, AI.debut);
        }

        // 5. La phrase d'accroche sort d'une zone masquée, de gauche à droite
        if (e.accroche) {
            animerTexte(e.accroche,
                { clipPath: "inset(0% 100% 0% 0%)", x: -32 },
                { clipPath: "inset(0% 0% 0% 0%)", x: 0, duration: 3.2, ease: "power2.out" }, 6);
        }

        // 6. La lueur d'accent grandit et dérive vers le centre (couche composée : transform + opacité)
        animerTexte(e.lueur,
            { opacity: 0.9, scale: 1, xPercent: 0, yPercent: 0 },
            { opacity: 0.55, scale: grand ? 1.8 : 1.4, xPercent: -30, yPercent: 18, duration: 10, ease: "sine.inOut" }, 0);

        if (!sab) {
            const dessiner = () => { e.stage.style.visibility = etat.sortie >= 1 ? "hidden" : "visible"; };
            partage.dessiner = dessiner;
            return () => { if (partage.dessiner === dessiner) partage.dessiner = null; };
        }

        /* ---------- SABLIER ----------
           Les tweens animent un petit objet d'état ; dessiner() en déduit l'image 3D. Tout est une fonction du
           scroll : réversible, sans simulation temporelle ni animation indépendante.
           Séquence (repère « aiFin » = instant où « AI » finit sa traversée) :
             - entrée par la droite, quasi couché, approche décélérée : elle SE TERMINE à aiFin ;
             - redressement vertical : il se termine aussi exactement à aiFin ;
             - le sable surface (oscillation amortie) puis, 0,7 unité après aiFin, commence à s'écouler ;
             - l'écoulement dure DEBIT.duree ; le réseau lumineux s'éveille juste avant aiFin jusqu'à la fin.
           Le retournement à 180° appartient exclusivement au relais vers la scène 2. */
        const lisser = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
        const melanger = (a, b, t) => a + (b - a) * t;
        const ANGLE_ENTREE = 1.3;                   // inclinaison à l'entrée (rad) : presque couché
        const REDRESSEMENT = 3.2, APPROCHE = 7.0;   // durées (unités) du redressement et de l'approche
        const DEBIT = { delai: 0.7, duree: 5.6, cycles: 9 };       // l'écoulement part 0,7 unité après aiFin
        const A0 = 0.60, B0 = 0.08, A1 = 0.05;      // remplissage de l'ampoule du haut (A) et du bas (B) ; total conservé
        const B1 = A0 + B0 - A1;

        // Mise en page, mesurée à chaque refresh : le sablier DEBOUT se pose dans la zone libre, sous la ligne
        // « EMOTION » et à droite de « AI » (grand écran), ou au-dessus de l'accroche (mobile / tablette).
        const geom = () => {
            const L = e.stage.clientWidth, Ht = e.stage.clientHeight;
            const hautAccroche = e.accroche ? e.accroche.offsetTop : Ht * 0.85;
            const police = parseFloat(getComputedStyle(e.titre).fontSize) || 0;
            const hTitre = e.titre.offsetHeight, cyTitre = e.titre.offsetTop + hTitre / 2;
            const monte = grand ? 0.14 : 0.06;                       // montée du titre (yPercent) dans la timeline
            // bas de l'encre « EMOTION » à la fin du titre (échelle, montée, vague des lettres) + marge
            const basEmotion = cyTitre - 0.25 * hTitre * echelleTitre - monte * hTitre + 0.44 * police * echelleTitre + 10;
            const droiteAI = e.titre.offsetLeft + echelleAIFinale * (e.motAI ? e.motAI.offsetWidth : 0);
            const haut = basEmotion, bas = grand ? Ht - 40 : hautAccroche - 18;
            const dispo = Math.max(bas - haut, 0);
            const taille = Math.max(grand ? 220 : 150, Math.min(dispo / 1.14, grand ? 0.62 * Ht : 0.40 * Ht, 0.5 * L));
            const largeur = 0.6 * taille;                            // largeur debout, bouchons compris
            const xMin = grand ? Math.max(droiteAI + 40, L * 0.5) : droiteAI + 14 + largeur / 2;
            const xRepos = grand ? (xMin + (L - 56)) / 2 : Math.max(L / 2, xMin);
            const yRepos = dispo > 0 ? (haut + bas) / 2 : 0.7 * Ht;
            return { L, Ht, taille, xRepos, yRepos, xEntree: L + taille * 0.7, yEntree: yRepos + 0.06 * Ht };
        };

        // Entrée et approche : l'approche et le redressement se terminent tous deux au repère « aiFin »
        tl.fromTo(etat, { x0: () => geom().xEntree }, { x0: () => geom().xRepos, duration: APPROCHE, ease: "power2.out" }, "aiFin-=" + APPROCHE);
        tl.fromTo(etat, { y0: () => geom().yEntree }, { y0: () => geom().yRepos, duration: APPROCHE, ease: "power2.out" }, "aiFin-=" + APPROCHE);
        tl.fromTo(etat, { angle0: ANGLE_ENTREE }, { angle0: 0, duration: REDRESSEMENT, ease: "power2.inOut" }, "aiFin-=" + REDRESSEMENT);
        // Le sable surface (oscillation amortie après l'arrêt), puis s'écoule : jamais avant que le sablier soit vertical
        tl.fromTo(etat, { calme: 0 }, { calme: 1, duration: 1.8, ease: "none" }, "aiFin");
        tl.fromTo(etat, { flux: 0 }, { flux: 1, duration: DEBIT.duree, ease: "none" }, "aiFin+=" + DEBIT.delai);
        // Le sable s'éveille : grains lumineux puis liaisons, de juste avant aiFin jusqu'à la fin de la scène
        tl.fromTo(etat, { reseau: 0 }, { reseau: 1, duration: unites - (AI.debut + AI.duree - 0.4), ease: "power1.inOut" }, "aiFin-=0.4");

        const dessiner = () => {
            const g = geom(), g2 = partage.geom2?.(), { angle0, calme, flux, flip, centrage } = etat;
            const u = 1 - angle0 / ANGLE_ENTREE;                                   // avancement du redressement (0 → 1)
            const vertical = 1 - lisser(0.02, 0.10, angle0);                       // garde-fou : pas d'écoulement si incliné
            // la surface du sable reste horizontale ; elle « traîne » pendant le redressement, puis oscille et se calme
            const traine = 0.28 * Math.sin(Math.PI * u);
            const oscille = 0.09 * Math.exp(-3.2 * calme) * Math.sin(2 * Math.PI * 1.7 * calme) * lisser(0.97, 1, u);
            // le filet naît doucement et s'éteint quand la réserve du haut est presque vide
            const filet = lisser(0, 0.06, flux) * (1 - lisser(0.94, 1, flux)) * vertical;
            const cent = lisser(0, 1, centrage);
            const interieur = partage.interieur;
            e.stage.style.visibility = etat.sortie >= 1 && !interieur ? "hidden" : "visible";
            if (!e.contexteDisponible()) return; // repli textuel jusqu'au prochain montage complet
            sab.rendre({
                x: g2 ? melanger(etat.x0, g2.faceX, cent) : etat.x0,
                y: g2 ? melanger(etat.y0, g2.faceY, cent) : etat.y0,
                taille: g2 ? melanger(g.taille, g2.tailleSablier, cent) : g.taille,
                angle: angle0 + Math.PI * flip, lacet: melanger(0.55, 0.25, u) + 0.12 * Math.sin(Math.PI * flip), tangage: 0.2,
                remplissageA: melanger(A0, A1, flux * vertical), remplissageB: melanger(B0, B1, flux * vertical),
                secousse: traine + oscille - 0.14 * Math.sin(2 * Math.PI * flip),
                ruisseau: filet, phase: flux * DEBIT.cycles,
                reseau: etat.reseau, energie: 0.3 * etat.reseau + 0.5 * filet + 0.7 * Math.sin(Math.PI * flip) * (1 - etat.morph),
                verre: etat.verre, opacite: interieur ? 1 : 1 - lisser(0, 1, etat.sortie),
                interieur,
                langage: partage.langage,
                visage: g2 && sab.visageDisponible && (etat.morph > 0 || etat.analyse > 0) ? {
                    morph: etat.morph, cx: g2.faceX, cy: g2.faceY, hauteur: g2.faceH,
                    scan: etat.scan, analyse: etat.analyse, sourire: etat.sourire, dispersion: interieur ? 0 : etat.sortie, lueur: 1,
                } : undefined,
            });
        };
        partage.dessiner = dessiner;
        dessiner();
        return () => { if (partage.dessiner === dessiner) partage.dessiner = null; };
    },

    demonter(e) {
        e.restaurer();
    },
};

/* ==========================================================================
   Liste des scènes animées (ordre du storyboard)
   ========================================================================== */
activerEmotionsStatiques(document.querySelector('.exp'));
activerExemplesStatiques(document.querySelector('.exp'));
lancerExperience({ scenes: [sceneSignal, creerSceneComprendre(partage), creerSceneInterieur(partage), creerSceneLangage(partage)] });
