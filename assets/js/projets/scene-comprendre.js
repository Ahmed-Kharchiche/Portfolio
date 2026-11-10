/**
 * Relais du sablier et scène 2. Aucune simulation autonome : les deux timelines
 * animent des propriétés disjointes du même état, donc chaque image est réversible.
 * Le visage est une métaphore ; les textes décrivent l'analyse de texte réelle.
 */
import { creerRaccordement } from '../commun/animations-communes.js';

const lisser = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

export function creerSceneComprendre(partage) {
    return {
        id: "ea-comprendre",

        preparer(racine) {
            const scene = racine.querySelector("#ea-comprendre");
            if (!scene) throw new Error("structure de la scène 2 introuvable");
            const cadre = document.createElement("div");
            cadre.className = "ea-cadre";
            cadre.setAttribute("aria-hidden", "true");
            cadre.innerHTML = "<i></i><i></i><i></i><i></i>";
            scene.appendChild(cadre);
            const etapes = [...scene.querySelectorAll(".ea-etapes-ia li")];
            const nettoyerVariables = () => {
                etapes.forEach((_, i) => {
                    scene.style.removeProperty("--ea-e" + i);
                    scene.style.removeProperty("--ea-t" + i);
                });
                if (!scene.getAttribute("style")) scene.removeAttribute("style");
            };
            return {
                scene, cadre, etapes, nettoyerVariables,
                mots: [...scene.querySelectorAll(".ea-mot-ligne")],
                phrase: scene.querySelector(".ea-comprendre-phrase"),
                repere: scene.querySelector(".ea-comprendre-repere"),
                note: scene.querySelector(".ea-comprendre-note"),
            };
        },

        animer(e, conditions, { gsap }) {
            const grand = conditions.desktop;
            const etat = partage.etat;
            if (!etat) return;
            const avecVisage = !!partage.sablier?.visageDisponible;
            const raccordement=creerRaccordement(e.scene);
            const dessiner = () => partage.dessiner?.();
            const geometrie = () => {
                const L = partage.stage.clientWidth, H = partage.stage.clientHeight;
                const entete = document.querySelector("body > header")?.offsetHeight || 80;
                const disponible = Math.max(H - entete, 160);
                const horizontal = grand || (L >= 700 && H <= 600);
                // Sur les petits téléphones, le menu peut occuper trois lignes.
                // Le visage tient dans l'espace réellement libre, sans chevaucher le texte.
                const hautContenu = e.scene.querySelector(".ea-comprendre-contenu").offsetTop;
                const placeVisage = Math.max(0, hautContenu - entete - 24) / 1.06;
                const faceH = horizontal ? Math.min(0.76 * disponible, L * 0.6)
                    : Math.min(0.4 * disponible, L * 0.9, placeVisage);
                return {
                    faceH, faceX: horizontal ? L * 0.76 : L / 2,
                    faceY: horizontal ? entete + disponible * 0.51 : entete + faceH * 0.53 + 12,
                    tailleSablier: Math.min(faceH / 1.14, L * 0.7),
                };
            };
            partage.geom2 = geometrie;

            // Variables CSS hors GSAP : supprimées également au changement de breakpoint.
            const majTextes = () => {
                raccordement.actualiser(etat.centrage);
                e.etapes.forEach((_, i) => {
                    let actif = 1 - Math.min(1, Math.abs(etat.etape - (i + 0.5)) * 1.7);
                    if (i === e.etapes.length - 1 && etat.etape > i + 0.5) actif = 1;
                    e.scene.style.setProperty("--ea-e" + i, String(lisser(0, 0.2, etat.etape) * (0.85 + 0.15 * actif)));
                    e.scene.style.setProperty("--ea-t" + i, (-(1 - actif) * 8).toFixed(2) + "px");
                });
                const g = geometrie(), hauteur = g.faceH * 1.06, largeur = g.faceH * 0.78;
                Object.assign(e.cadre.style, {
                    width: largeur + "px", height: hauteur + "px",
                    left: g.faceX - largeur / 2 + "px", top: g.faceY - hauteur / 2 + "px",
                    opacity: String(avecVisage ? lisser(0, 0.2, etat.etape) * (1 - lisser(0, 1, etat.sortie)) : 0),
                });
            };

            if (partage.sablier) {
                const relais = gsap.timeline({
                    onUpdate: () => { raccordement.actualiser(etat.centrage); dessiner(); },
                    scrollTrigger: {
                        id: "ea-relais", trigger: e.scene, start: "top bottom", end: "top top",
                        scrub: 0.6, invalidateOnRefresh: true,
                    },
                });
                // L'axe Z est celui de l'inclinaison existante : un demi-tour échange
                // réellement les ampoules. La gravité est recalculée dans leur repère.
                relais.fromTo(etat, { flip: 0, centrage: 0 }, {
                    flip: 1, centrage: 1, duration: 1, ease: "power2.inOut",
                }, 0);
            }

            const unites = 22;
            const tl = gsap.timeline({
                onUpdate: () => { dessiner(); majTextes(); },
                scrollTrigger: {
                    id: "ea-comprendre", trigger: e.scene, start: "top top",
                    end: () => "+=" + Math.round(window.innerHeight * (grand ? 1.8 : 1.2) * (unites / 10)),
                    scrub: 0.6, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
                    onRefresh: () => { partage.sablier?.redimensionner(); dessiner(); majTextes(); },
                },
            });
            if (avecVisage) {
                tl.fromTo(etat, { verre: 1 }, { verre: 0, duration: 2.4, ease: "power1.inOut" }, 1.2);
                tl.fromTo(etat, { morph: 0 }, { morph: 1, duration: 12, ease: "none" }, 2);
                tl.fromTo(etat, { scan: 2 }, { scan: -1.25, duration: 3.8, ease: "none" }, 13.8);
                tl.fromTo(etat, { analyse: 0 }, { analyse: 1, duration: 4, ease: "none" }, 14);
                tl.fromTo(etat, { sourire: 0 }, { sourire: 1, duration: 2, ease: "power2.inOut" }, 17);
            }
            tl.fromTo(etat, { sortie: 0 }, { sortie: 1, duration: 0.8, ease: "power1.in" }, 21.2);
            tl.fromTo(e.mots, { clipPath: "inset(100% 0% 0% 0%)", yPercent: 30 }, {
                force3D: false, clipPath: "inset(0% 0% 0% 0%)", yPercent: 0, duration: 1.4, ease: "power2.out", stagger: 0.5,
            }, 3);
            tl.fromTo(e.repere, { opacity: 0 }, { opacity: 1, duration: 1 }, 3);
            tl.fromTo(e.phrase, { opacity: 0, y: 16 }, { force3D: false, opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }, 6.6);
            tl.fromTo(e.note, { opacity: 0, y: 12 }, { force3D: false, opacity: 1, y: 0, duration: 1, ease: "power2.out" }, 9.5);
            tl.fromTo(etat, { etape: 0 }, { etape: 3, duration: 7.2, ease: "none" }, 12.2);
            tl.fromTo(e.cadre, { scale: 1.12 }, { force3D: false, scale: 1, duration: 1.2, ease: "power2.out" }, 12.2);
            tl.to({}, { duration: 0.0001 }, unites);

            majTextes();
            dessiner();
            return () => {
                e.nettoyerVariables();
                raccordement.detruire();
                e.cadre.removeAttribute("style");
                if (partage.geom2 === geometrie) partage.geom2 = null;
            };
        },

        demonter(e) {
            e.cadre.remove();
            e.nettoyerVariables();
        },
    };
}
