/**
 * projet-core.js : moteur commun des présentations de projets animées.
 *
 * Rôle : décider QUAND animer, jamais QUOI animer (cela relève de assets/js/projets/<template>.js).
 *  - anime la présentation autonome lorsque le mouvement est autorisé ;
 *  - monte les scènes dans un gsap.matchMedia() (une configuration par taille d'écran) ;
 *  - démonte proprement timelines, ScrollTrigger et DOM en mode réduit ;
 *  - si GSAP ne se charge pas, ou si une scène plante, la page reste statique et lisible.
 *
 * Une scène est un objet { id, charger?(), preparer(racine), animer(etat, conditions, outils), demonter(etat) }.
 * `charger` (facultatif, asynchrone) sert à récupérer des ressources propres à la scène (ex. le moteur 3D) ;
 * son échec ne bloque ni GSAP ni les autres scènes.
 * `animer` peut retourner un nettoyage pour les ressources qui ne sont pas gérées par GSAP.
 */
import { mouvementReduit } from "./animations-communes.js";

// Version fixée (jamais « latest »). ScrollTrigger est le seul plugin utilisé.
const GSAP_VERSION = "3.13.0";
const SOURCES = [
    // Copie locale de la version fixée ; le CDN sert de repli si elle manque.
    [new URL("../vendor/gsap.min.js", import.meta.url).href,
     new URL("../vendor/ScrollTrigger.min.js", import.meta.url).href],
    [`https://cdn.jsdelivr.net/npm/gsap@${GSAP_VERSION}/dist/gsap.min.js`,
     `https://cdn.jsdelivr.net/npm/gsap@${GSAP_VERSION}/dist/ScrollTrigger.min.js`],
];

// Une configuration par taille d'écran ; le mouvement réduit est géré avant (aucune animation).
const CONDITIONS = {
    desktop: "(min-width: 1024px)",
    mobile: "(max-width: 1023.98px)",
};

function chargerScript(src, delaiMs = 8000) {
    return new Promise((resolve, reject) => {
        const balise = document.createElement("script");
        const minuteur = setTimeout(() => { balise.remove(); reject(new Error("délai dépassé : " + src)); }, delaiMs);
        balise.src = src;
        balise.async = false;
        balise.onload = () => { clearTimeout(minuteur); resolve(); };
        balise.onerror = () => { clearTimeout(minuteur); balise.remove(); reject(new Error("échec : " + src)); };
        document.head.appendChild(balise);
    });
}

let promesseGsap = null;
function chargerGsap() {
    if (window.gsap && window.ScrollTrigger) return Promise.resolve();
    if (promesseGsap) return promesseGsap;
    promesseGsap = (async () => {
        for (const [coeur, plugin] of SOURCES) {
            try {
                if (!window.gsap) await chargerScript(coeur);
                if (!window.ScrollTrigger) await chargerScript(plugin);
                if (window.gsap && window.ScrollTrigger) return;
            } catch (erreur) {
                console.warn("[projet-core]", erreur.message);
            }
        }
        throw new Error("GSAP indisponible : la page reste statique.");
    })();
    promesseGsap.catch(() => { promesseGsap = null; }); // permet un nouvel essai plus tard
    return promesseGsap;
}

/**
 * @param {{ scenes: object[], racine?: string }} options
 */
export function lancerExperience({ scenes, racine: selecteurRacine = ".exp" }) {
    const racine = document.querySelector(selecteurRacine);
    if (!racine || !scenes.length) return;

    let mm = null;               // gsap.matchMedia() actif
    let session = null;          // { vivant } : empêche un ancien matchMedia de rejouer des scènes déjà démontées
    let etats = new Map();       // état préparé par chaque scène
    let genere = 0;              // invalide les chargements devenus inutiles (bascules rapides)
    let renduIndisponible = false;
    const clePosition = 'presentation-immersive:' + location.pathname + location.search;
    let restaurerPosition = null;
    try {
        const navigation = performance.getEntriesByType('navigation')[0];
        const valeur = sessionStorage.getItem(clePosition);
        if (navigation?.type !== 'navigate' && valeur !== null && Number.isFinite(Number(valeur))) restaurerPosition = Number(valeur);
    } catch { /* Le stockage peut être désactivé ; le contenu reste utilisable. */ }

    // Les espaces d'épinglage n'existent pas encore pendant la restauration native du navigateur.
    window.addEventListener('pagehide', () => {
        if (!mm) return;
        try { sessionStorage.setItem(clePosition, String(scrollY)); } catch { /* Stockage facultatif. */ }
    });

    const doitAnimer = () => !renduIndisponible && !mouvementReduit();

    function monter() {
        const { gsap, ScrollTrigger } = window;
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });

        racine.classList.add("exp-anime");

        // Les scènes sont indépendantes : l'échec de l'une n'empêche pas les autres.
        scenes.forEach((scene) => {
            try { etats.set(scene, scene.preparer ? scene.preparer(racine) : null); }
            catch (erreur) { console.warn(`[projet-core] préparation « ${scene.id} » :`, erreur); }
        });

        const maSession = { vivant: true };
        session = maSession;
        mm = gsap.matchMedia();
        mm.add(CONDITIONS, (contexte) => {
            if (!maSession.vivant) return;
            const nettoyages = [];
            scenes.forEach((scene) => {
                if (!etats.has(scene)) return;
                try {
                    const nettoyer = scene.animer(etats.get(scene), contexte.conditions, { gsap, ScrollTrigger, racine });
                    if (typeof nettoyer === "function") nettoyages.push({ scene, nettoyer });
                }
                catch (erreur) { console.warn(`[projet-core] animation « ${scene.id} » :`, erreur); }
            });
            return () => {
                nettoyages.reverse().forEach(({ scene, nettoyer }) => {
                    try { nettoyer(); }
                    catch (erreur) { console.warn(`[projet-core] nettoyage d'animation « ${scene.id} » :`, erreur); }
                });
            };
        });

        // Les polices changent la taille des titres : on recalcule les positions des scènes épinglées.
        const recalculer = () => {
            if (maSession.vivant && doitAnimer() && window.ScrollTrigger) {
                ScrollTrigger.refresh();
                if (restaurerPosition != null) {
                    const y = restaurerPosition;
                    restaurerPosition = null;
                    scrollTo(0, y);
                    ScrollTrigger.update();
                }
            }
        };
        maSession.recalculer = recalculer;
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(recalculer);
        if (document.readyState === "complete") recalculer();
        else window.addEventListener("load", recalculer, { once: true });
    }

    function demonter() {
        if (session) {
            session.vivant = false;
            window.removeEventListener("load", session.recalculer);
            session = null;
        }
        if (mm) {
            mm.revert();                             // tue timelines et ScrollTrigger, retire les styles inline
            if (typeof mm.kill === "function") mm.kill(); // et cesse d'écouter les changements de taille d'écran
            mm = null;
        }
        scenes.forEach((scene) => {
            if (!etats.has(scene)) return;
            try { if (scene.demonter) scene.demonter(etats.get(scene)); }
            catch (erreur) { console.warn(`[projet-core] nettoyage « ${scene.id} » :`, erreur); }
        });
        etats = new Map();
        racine.classList.remove("exp-anime");
    }

    async function synchroniser() {
        const numero = ++genere;
        if (!doitAnimer()) { if (mm) demonter(); return; }
        if (mm) return;                               // déjà monté
        // Ressources propres aux scènes (chargées en parallèle de GSAP ; leur échec est toléré)
        const ressources = Promise.all(scenes.map((scene) =>
            scene.charger ? Promise.resolve().then(() => scene.charger()).catch((e) => console.warn(`[projet-core] chargement « ${scene.id} » :`, e.message)) : null));
        try { await chargerGsap(); }
        catch (erreur) { console.warn("[projet-core]", erreur.message); return; }
        await ressources;
        if (numero !== genere || !doitAnimer() || mm) return; // l'état a changé pendant le chargement
        monter();
    }

    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", synchroniser);
    racine.addEventListener('exp:repli', () => {
        renduIndisponible = true;
        synchroniser();
    }, { once: true });
    synchroniser();
}
