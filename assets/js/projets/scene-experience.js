import { lisser } from './reseau-interieur.js';
import { creerRaccordement } from '../commun/animations-communes.js';
import { DONNEES_EXPERIENCE as donnees } from './experience-rendu.js';

export function creerInterfaceExperience(scene) {
    const selection = { contexte: 2, emotion: -1, message: 0 };
    const liste = scene.querySelector('.ea-experience-messages');
    const detail = scene.querySelector('.ea-experience-detail');
    const effectifs = scene.querySelector('.ea-experience-effectifs');
    const description = scene.querySelector('.ea-experience-contexte');
    const interfaceExperience = { scene, selection, animer: null, afficher };

    function afficher() {
        const contexte = donnees.contextes[selection.contexte];
        scene.querySelectorAll('[data-contexte]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.contexte === selection.contexte)));
        scene.querySelectorAll('[data-emotion]').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.emotion === selection.emotion)));
        scene.querySelectorAll('[data-message]').forEach(b => {
            const index = +b.dataset.message;
            b.hidden = !contexte.messages.includes(index);
            b.setAttribute('aria-pressed', String(index === selection.message));
            b.classList.toggle('est-discret', selection.emotion >= 0 && donnees.messages[index].emotion !== donnees.emotions[selection.emotion]);
        });
        const message = donnees.messages[selection.message];
        detail.textContent = message ? `« ${message.texte} » — ${message.emotion} · association illustrative, sans inférence.` : 'Aucun message de cette catégorie dans ce contexte. Les effectifs décrivent l’ensemble du contexte.';
        description.textContent = contexte.description;
        effectifs.textContent = donnees.emotions.map(emotion => `${emotion} : ${contexte.messages.filter(i => donnees.messages[i].emotion === emotion).length}`).join(' · ');
        scene.dataset.contexte = selection.contexte;
        scene.dataset.emotion = selection.emotion;
        scene.dataset.message = selection.message;
        const carte = liste.querySelector('button[aria-pressed="true"]');
        if(carte) liste.scrollTo({left:carte.offsetLeft-liste.offsetLeft-(liste.clientWidth-carte.offsetWidth)/2,behavior:'smooth'});
    }
    function choisir(event) {
        const bouton = event.target.closest('button[data-contexte], button[data-emotion], button[data-message]');
        if (!bouton || !scene.contains(bouton)) return;
        if (bouton.hasAttribute('data-contexte')) selection.contexte = +bouton.dataset.contexte;
        if (bouton.hasAttribute('data-emotion')) selection.emotion = +bouton.dataset.emotion;
        if (bouton.hasAttribute('data-message')) {
            selection.message = +bouton.dataset.message;
            if (selection.emotion >= 0) selection.emotion = donnees.emotions.indexOf(donnees.messages[selection.message].emotion);
        }
        const disponibles = donnees.contextes[selection.contexte].messages;
        const correspondants = disponibles.filter(i => selection.emotion<0 || donnees.messages[i].emotion===donnees.emotions[selection.emotion]);
        if (!correspondants.includes(selection.message)) selection.message = correspondants[0] ?? -1;
        afficher(); interfaceExperience.animer?.();
    }
    scene.addEventListener('click', choisir);
    afficher();
    return interfaceExperience;
}

export function creerSceneExperience(partage, interfaceExperience) {
    return {
        id: 'ea-experience',
        preparer() { return interfaceExperience; },
        animer(e, conditions, { gsap, ScrollTrigger }) {
            if (!partage.sablier?.visageDisponible) {
                e.scene.classList.add('ea-experience-statique');
                return () => e.scene.classList.remove('ea-experience-statique');
            }
            const etat = { relais: 0, principal: 0 };
            const raccordement = creerRaccordement(e.scene);
            const vue = {
                progression: 0, contextes: new Float32Array(3), filtres: new Float32Array(4),
                messages: new Float32Array(8), comptes: new Float32Array(4),
            };
            const interaction = {};
            for (let i=0;i<3;i++) interaction['c'+i] = i === e.selection.contexte ? 1 : 0;
            for (let i=0;i<4;i++) interaction['f'+i] = e.selection.emotion < 0 || i === e.selection.emotion ? 1 : 0;
            for (let i=0;i<8;i++) interaction['m'+i] = i === e.selection.message ? 1 : 0;
            partage.experience = vue;
            const titres = [...e.scene.querySelectorAll('.ea-experience-phase')];
            const controles = e.scene.querySelector('.ea-experience-controles');
            const boutons = [...controles.querySelectorAll('button')];
            const plages = [[.09,.145,.19,.24],[.22,.28,.34,.41],[.35,.42,.54,.61],[.55,.62,.71,.77],[.72,.79,.91,.96],[.92,.98,2,3]];
            const intro = e.scene.querySelector('.ea-experience-intro');
            const legende = e.scene.querySelector('.ea-experience-legende');
            const effectifs = donnees.contextes.map(c=>donnees.emotions.map(emotion=>c.messages.filter(k=>donnees.messages[k].emotion===emotion).length));
            const partRelais = 1/(conditions.desktop?7:6);
            let tween = null, restauration = null;
            function dessiner() {
                const entree=raccordement.actualiser(etat.relais);
                const p = Math.min(1,etat.relais*partRelais+etat.principal*(1-partRelais));
                vue.progression = p;
                intro.style.opacity = entree*lisser(.10,.15,p);
                for(let i=0;i<3;i++) vue.contextes[i] = interaction['c'+i];
                for(let i=0;i<4;i++){
                    vue.filtres[i] = interaction['f'+i];
                    vue.comptes[i] = effectifs.reduce((s,ligne,j) => s+interaction['c'+j]*ligne[i],0);
                }
                for(let i=0;i<8;i++) vue.messages[i] = interaction['m'+i];
                titres.forEach((titre,i) => {
                    const [a,b,c,d] = plages[i];
                    titre.style.opacity = lisser(a,b,p)*(1-lisser(c,d,p));
                    titre.style.transform = `translateY(${(1-lisser(a,b,p))*12}px)`;
                });
                controles.style.opacity = lisser(.72,.80,p)*(1-lisser(.92,.98,p));
                legende.style.opacity = lisser(.34,.42,p)*(1-lisser(.55,.62,p));
                controles.inert = p<.77 || p>.95;
                boutons.forEach(b => { b.disabled = controles.inert; });
                e.scene.dataset.progression = p.toFixed(6);
                partage.dessiner?.();
            }
            e.animer = () => {
                tween?.kill();
                const cible = {};
                for(let i=0;i<3;i++) cible['c'+i] = i===e.selection.contexte?1:0;
                for(let i=0;i<4;i++) cible['f'+i] = e.selection.emotion<0||i===e.selection.emotion?1:0;
                for(let i=0;i<8;i++) cible['m'+i] = i===e.selection.message?1:0;
                tween = gsap.to(interaction, { ...cible, duration:.4, ease:'power1.out', onUpdate:dessiner, overwrite:true });
            };
            function memoriser() {
                const r = e.scene.getBoundingClientRect();
                if(vue.progression>0&&vue.progression<1&&r.top<=1&&r.bottom>0) partage.repriseExperience=vue.progression;
            }
            window.addEventListener('resize',memoriser,{passive:true});
            const relais = gsap.timeline({onUpdate:dessiner,scrollTrigger:{id:'ea-experience-relais',trigger:e.scene,start:'top bottom',end:'top top',scrub:.6,invalidateOnRefresh:true}});
            relais.fromTo(etat,{relais:0},{relais:1,duration:1,ease:'none'});
            const timeline = gsap.timeline({onUpdate:dessiner,scrollTrigger:{
                id:'ea-experience',trigger:e.scene,start:'top top',end:()=>'+='+Math.round(innerHeight*(conditions.desktop?6:5)),
                pin:true,scrub:.6,anticipatePin:1,invalidateOnRefresh:true,
                onRefresh(){
                    dessiner();
                    if(partage.repriseExperience!=null){
                        const p=partage.repriseExperience;partage.repriseExperience=null;
                        restauration=requestAnimationFrame(()=>scrollTo(0,relais.scrollTrigger.start+p*(timeline.scrollTrigger.end-relais.scrollTrigger.start)));
                    }
                },
            }});
            timeline.fromTo(etat,{principal:0},{principal:1,duration:1,ease:'none'});
            const sortir=self=>partage.stage?.style.setProperty('transform',`translateY(${-self.progress*innerHeight}px)`);
            const apres=document.querySelector('#ea-conclusion') ? null : ScrollTrigger.create({start:()=>timeline.scrollTrigger.end,end:()=>timeline.scrollTrigger.end+innerHeight,onUpdate:sortir,onRefresh:sortir,refreshPriority:-1});
            dessiner();
            return () => {
                memoriser();tween?.kill();apres?.kill();e.animer=null;
                raccordement.detruire();
                if(restauration!=null)cancelAnimationFrame(restauration);
                window.removeEventListener('resize',memoriser);
                if(partage.experience===vue)partage.experience=null;
                partage.stage?.style.removeProperty('transform');
                [...titres,controles,legende,intro].forEach(t=>t.removeAttribute('style'));
                controles.inert=false;boutons.forEach(b=>{b.disabled=false;});delete e.scene.dataset.progression;
            };
        },
    };
}
