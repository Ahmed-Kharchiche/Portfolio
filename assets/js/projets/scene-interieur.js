import { lisser, projeterConstellations } from "./reseau-interieur.js";
import { creerRaccordement } from '../commun/animations-communes.js';

const NOMS = ['JOY', 'SADNESS', 'ANGER', 'FEAR', 'SURPRISE', 'NEUTRAL'];
const DESCRIPTIONS = [
    'Joie · impulsions ouvertes et rayonnantes.',
    'Tristesse · activité douce et descendante.',
    'Colère · impulsions concentrées et dynamiques.',
    'Peur · signaux fins et resserrés.',
    'Surprise · expansion progressive des signaux.',
    'Neutre · repère artistique, absent des 20 classes du modèle.',
];

export function creerSceneInterieur(partage) {
    return {
        id: 'ea-inside',
        preparer(racine) {
            const scene = racine.querySelector('#ea-inside');
            const boutons = [...scene.querySelectorAll('[data-emotion]')];
            const resultat = scene.querySelector('.ea-inside-resultat');
            const description = scene.querySelector('.ea-inside-description');
            const e = { scene, boutons, resultat, description, selection: 0, changer: null };
            const choisir = (index) => {
                e.selection = index;
                boutons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
                resultat.textContent = NOMS[index];
                description.textContent = DESCRIPTIONS[index];
                e.changer?.(index);
            };
            const clic = event => {
                const bouton = event.target.closest('[data-emotion]');
                if (bouton) choisir(Number(bouton.dataset.emotion));
            };
            const clavier = event => {
                const i = boutons.indexOf(document.activeElement);
                if (i < 0) return;
                let j = i;
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') j = (i + 1) % 6;
                else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') j = (i + 5) % 6;
                else if (event.key === 'Home') j = 0;
                else if (event.key === 'End') j = 5;
                else return;
                event.preventDefault(); boutons[j].focus(); choisir(j);
            };
            scene.addEventListener('click', clic); scene.addEventListener('keydown', clavier);
            choisir(0);
            e.nettoyer = () => { scene.removeEventListener('click', clic); scene.removeEventListener('keydown', clavier); };
            return e;
        },
        animer(e, conditions, { gsap, ScrollTrigger }) {
            if (!partage.sablier?.visageDisponible) {
                e.scene.classList.add('ea-inside-statique');
                return () => e.scene.classList.remove('ea-inside-statique');
            }
            const etat = { relais: 0, principal: 0 };
            const raccordement = creerRaccordement(e.scene);
            const partRelais = 1 / (conditions.desktop ? 7 : 6);
            const poids = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [i, i === e.selection ? 1 : 0]));
            const selection = new Float32Array(6);
            const vue = { progression: 0, selection };
            partage.interieur = vue;
            let tween = null;
            let restauration = null;
            const memoriserResize = () => {
                const rect = e.scene.getBoundingClientRect();
                if (vue.progression > 0 && vue.progression < 1 && rect.top <= 1 && rect.bottom > 0) {
                    partage.repriseInterieur = vue.progression;
                }
            };
            window.addEventListener('resize', memoriserResize, { passive: true });
            const texteEntree = e.scene.querySelector('.ea-inside-entree');
            const titre = e.scene.querySelector('.ea-inside-titre');
            const sousTitre = e.scene.querySelector('.ea-inside-soustitre');
            const controles = e.scene.querySelector('.ea-inside-controles');
            const labels = e.scene.querySelector('.ea-inside-labels');
            const labelItems = [...labels.children];
            const maj = () => {
                const entree = raccordement.actualiser(etat.relais);
                const p = Math.min(1, etat.relais * partRelais + etat.principal * (1 - partRelais));
                vue.progression = p;
                const interaction = lisser(.86, .94, p);
                for (let i = 0; i < 6; i++) selection[i] = (i === 0 ? 1 - interaction : 0) + poids[i] * interaction;
                texteEntree.style.opacity = String(entree * lisser(.025, .1, p) * (1 - lisser(.29, .43, p)));
                texteEntree.style.transform = `translateY(${(1 - lisser(.025, .15, p)) * 18}px)`;
                const titreAlpha = lisser(.44, .6, p);
                titre.style.opacity = sousTitre.style.opacity = String(titreAlpha);
                titre.style.transform = `translateY(${(1 - titreAlpha) * 22}px)`;
                labels.style.opacity = String(lisser(.59, .72, p));
                const positions = projeterConstellations(p, innerWidth, innerHeight);
                labelItems.forEach((li, i) => {
                    li.classList.toggle('est-active', selection[i] > .5);
                    li.style.left = positions[i][0] + 'px'; li.style.top = positions[i][1] + 'px';
                });
                controles.style.opacity = String(lisser(.76, .89, p));
                controles.inert = p < .86;
                const affiche = p < .86 ? 0 : e.selection;
                if (e.resultat.textContent !== NOMS[affiche]) e.resultat.textContent = NOMS[affiche];
                if (e.description.textContent !== DESCRIPTIONS[affiche]) e.description.textContent = DESCRIPTIONS[affiche];
                e.boutons.forEach((b, i) => {
                    b.disabled = p < .86;
                    b.setAttribute('aria-pressed', String(i === affiche));
                });
                e.scene.dataset.progression = p.toFixed(5);
                partage.dessiner?.();
            };
            e.changer = index => {
                tween?.kill();
                const cible = { duration: .65, ease: 'power2.out', onUpdate: maj, overwrite: true };
                for (let i = 0; i < 6; i++) cible[i] = i === index ? 1 : 0;
                tween = gsap.to(poids, cible);
            };
            // Deux segments contigus composent une seule progression ; aucune propriété n'a deux propriétaires.
            const relais = gsap.timeline({ onUpdate: maj, scrollTrigger: {
                id: 'ea-inside-relais', trigger: e.scene, start: 'top bottom', end: 'top top',
                scrub: .6, invalidateOnRefresh: true,
            } });
            relais.fromTo(etat, { relais: 0 }, { relais: 1, duration: 1, ease: 'none' });
            const tl = gsap.timeline({ onUpdate: maj, scrollTrigger: {
                id: 'ea-inside', trigger: e.scene, start: 'top top',
                end: () => '+=' + Math.round(innerHeight * (conditions.desktop ? 6 : 5)),
                pin: true, scrub: .6, anticipatePin: 1, invalidateOnRefresh: true,
                onRefresh: () => {
                    maj();
                    if (partage.repriseInterieur != null) {
                        const p = partage.repriseInterieur;
                        partage.repriseInterieur = null;
                        restauration = requestAnimationFrame(() => {
                            const debut = relais.scrollTrigger.start;
                            window.scrollTo(0, debut + p * (tl.scrollTrigger.end - debut));
                        });
                    }
                },
            } });
            tl.fromTo(etat, { principal: 0 }, { principal: 1, duration: 1, ease: 'none' });
            // Le plateau reste attaché à la fin de scène, puis sort avec elle, sans couper le réseau.
            const fin = self => {
                partage.stage?.style.setProperty('transform', `translateY(${-self.progress * innerHeight}px)`);
            };
            const apres = document.querySelector('#ea-words') ? null : ScrollTrigger.create({ start: () => tl.scrollTrigger.end,
                end: () => tl.scrollTrigger.end + innerHeight, onUpdate: fin, onRefresh: fin,
                refreshPriority: -1 });
            maj();
            return () => {
                memoriserResize();
                raccordement.detruire();
                window.removeEventListener('resize', memoriserResize);
                if (restauration != null) cancelAnimationFrame(restauration);
                tween?.kill(); e.changer = null;
                if (partage.interieur === vue) partage.interieur = null;
                partage.stage?.style.removeProperty('transform');
                [texteEntree, titre, sousTitre, controles, labels].forEach(el => el.removeAttribute('style'));
                labelItems.forEach(li => li.removeAttribute('style'));
                controles.inert = false; e.boutons.forEach(b => { b.disabled = false; });
                delete e.scene.dataset.progression;
                apres?.kill();
            };
        },
        demonter(e) { e.nettoyer(); },
    };
}

// Le sélecteur reste utilisable lorsque le moteur commun respecte prefers-reduced-motion.
export function activerEmotionsStatiques(racine) {
    const boutons = [...racine.querySelectorAll('#ea-inside [data-emotion]')];
    racine.addEventListener('click', event => {
        if (racine.classList.contains('exp-anime')) return;
        const index = boutons.indexOf(event.target.closest('[data-emotion]'));
        if (index < 0) return;
        boutons.forEach((b, i) => b.setAttribute('aria-pressed', String(i === index)));
        racine.querySelector('.ea-inside-resultat').textContent = NOMS[index];
        racine.querySelector('.ea-inside-description').textContent = DESCRIPTIONS[index];
    });
}
