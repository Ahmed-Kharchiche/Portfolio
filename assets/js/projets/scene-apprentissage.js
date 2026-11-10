import { lisser } from './reseau-interieur.js';
import { creerRaccordement } from '../commun/animations-communes.js';

export function creerSceneApprentissage(partage) {
    return {
        id: 'ea-learning',
        preparer(racine) {
            const scene = racine.querySelector('#ea-learning');
            return { scene, selection: 0 };
        },
        animer(e, conditions, { gsap, ScrollTrigger }) {
            if (!partage.sablier?.visageDisponible) {
                e.scene.classList.add('ea-learning-statique');
                return () => e.scene.classList.remove('ea-learning-statique');
            }
            const etat = { relais: 0, principal: 0, composante: e.selection };
            const raccordement = creerRaccordement(e.scene);
            const vue = { progression: 0, composante: e.selection };
            partage.apprentissage = vue;
            const titres = [...e.scene.querySelectorAll('.ea-learning-phase')];
            const boutons = [...e.scene.querySelectorAll('[data-composante]')];
            const controles = e.scene.querySelector('.ea-learning-controles');
            const lecture = e.scene.querySelector('.ea-learning-lecture');
            const plages = [[.015,.07,.14,.21],[.14,.21,.30,.36],[.31,.38,.49,.55],[.50,.57,.68,.74],[.70,.77,.86,.92],[.87,.95,2,3]];
            const exemples = JSON.parse(e.scene.querySelector('#ea-learning-donnees').textContent);
            const partRelais = 1 / (conditions.desktop ? 7 : 6);
            let interaction = null, restauration = null;

            function dessiner() {
                raccordement.actualiser(etat.relais);
                const p = Math.min(1, etat.relais * partRelais + etat.principal * (1 - partRelais));
                vue.progression = p; vue.composante = etat.composante;
                titres.forEach((titre, i) => {
                    const [a,b,c,d] = plages[i];
                    titre.style.opacity = lisser(a,b,p) * (1 - lisser(c,d,p));
                    titre.style.transform = `translateY(${(1-lisser(a,b,p))*12}px)`;
                });
                controles.style.opacity = lisser(.90,.98,p);
                controles.inert = p < .94;
                boutons.forEach(b => { b.disabled = p < .94; });
                // Une carte lisible accompagne les plaques plus éloignées, notamment sur mobile.
                const evaluation = p >= .7;
                const index = Math.min(5, Math.floor((evaluation ? (p-.7)/.18 : p/.32) * 6));
                const carte = (evaluation ? exemples.evaluation : exemples.entrainement)[Math.max(0,index)];
                lecture.textContent = evaluation
                    ? `Exemple fictif : « ${carte.phrase} » · EXPECTED : ${carte.emotion} · PREDICTED* : ${carte.illustration}`
                    : `Exemple fictif : « ${carte.phrase} » · ${carte.emotion}`;
                lecture.style.opacity = evaluation ? lisser(.70,.76,p)*(1-lisser(.85,.9,p)) : lisser(.08,.15,p)*(1-lisser(.31,.37,p));
                e.scene.dataset.progression = p.toFixed(6);
                partage.dessiner?.();
            }
            function choisir(event) {
                const bouton = event.target.closest('[data-composante]');
                if (!bouton || vue.progression < .94) return;
                e.selection = Number(bouton.dataset.composante);
                boutons.forEach(b => b.setAttribute('aria-pressed', String(b === bouton)));
                interaction?.kill();
                interaction = gsap.to(etat, { composante: e.selection, duration: .35, ease: 'power1.out', onUpdate: dessiner });
            }
            function memoriser() {
                const rect = e.scene.getBoundingClientRect();
                if (vue.progression > 0 && vue.progression < 1 && rect.top <= 1 && rect.bottom > 0) partage.repriseApprentissage = vue.progression;
            }
            e.scene.addEventListener('click', choisir);
            window.addEventListener('resize', memoriser, { passive: true });
            const relais = gsap.timeline({ onUpdate: dessiner, scrollTrigger: {
                id: 'ea-learning-relais', trigger: e.scene, start: 'top bottom', end: 'top top', scrub: .6, invalidateOnRefresh: true,
            }});
            relais.fromTo(etat, { relais: 0 }, { relais: 1, duration: 1, ease: 'none' });
            const timeline = gsap.timeline({ onUpdate: dessiner, scrollTrigger: {
                id: 'ea-learning', trigger: e.scene, start: 'top top',
                end: () => '+=' + Math.round(innerHeight * (conditions.desktop ? 6 : 5)),
                pin: true, scrub: .6, anticipatePin: 1, invalidateOnRefresh: true,
                onRefresh() {
                    dessiner();
                    if (partage.repriseApprentissage != null) {
                        const p = partage.repriseApprentissage; partage.repriseApprentissage = null;
                        restauration = requestAnimationFrame(() => scrollTo(0,relais.scrollTrigger.start+p*(timeline.scrollTrigger.end-relais.scrollTrigger.start)));
                    }
                },
            }});
            timeline.fromTo(etat, { principal: 0 }, { principal: 1, duration: 1, ease: 'none' });
            const sortir = self => partage.stage?.style.setProperty('transform', `translateY(${-self.progress*innerHeight}px)`);
            const apres = document.querySelector('#ea-experience') ? null : ScrollTrigger.create({ start: () => timeline.scrollTrigger.end, end: () => timeline.scrollTrigger.end+innerHeight, onUpdate: sortir, onRefresh: sortir, refreshPriority: -1 });
            dessiner();
            return () => {
                memoriser(); interaction?.kill(); apres?.kill();
                raccordement.detruire();
                if (restauration != null) cancelAnimationFrame(restauration);
                e.scene.removeEventListener('click', choisir); window.removeEventListener('resize', memoriser);
                if (partage.apprentissage === vue) partage.apprentissage = null;
                partage.stage?.style.removeProperty('transform');
                [...titres, controles, lecture].forEach(t => t.removeAttribute('style'));
                controles.inert = false; boutons.forEach(b => { b.disabled = false; });
                delete e.scene.dataset.progression;
            };
        },
    };
}
