import { EXEMPLES_LANGAGE } from './langage-cibles.js';
import { lisser } from './reseau-interieur.js';
import { creerRaccordement } from '../commun/animations-communes.js';

function afficherExemple(scene, index) {
    const exemple=EXEMPLES_LANGAGE[index];
    scene.querySelectorAll('[data-phrase]').forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index)));
    scene.querySelector('.ea-words-phrase').textContent=exemple.phrase;
    scene.querySelector('.ea-words-resultat').textContent=exemple.emotion;
}

export function activerExemplesStatiques(racine) {
    racine.addEventListener('click',event=>{
        if(racine.classList.contains('exp-anime'))return;
        const b=event.target.closest('#ea-words [data-phrase]');
        if(b)afficherExemple(b.closest('#ea-words'),Number(b.dataset.phrase));
    });
}

export function creerSceneLangage(partage) {
    return {
        id:'ea-words',
        preparer(racine) {
            const scene=racine.querySelector('#ea-words');
            const boutons=[...scene.querySelectorAll('[data-phrase]')];
            const e={scene,boutons,selection:0,changer:null,reprise:{replay:1,replayActif:false}};
            const choisir=index=>{e.selection=index;afficherExemple(scene,index);e.changer?.(index);};
            const clic=event=>{const b=event.target.closest('[data-phrase]');if(b)choisir(Number(b.dataset.phrase));};
            const clavier=event=>{
                const i=boutons.indexOf(document.activeElement);if(i<0)return;
                let j=i;
                if(event.key==='ArrowRight'||event.key==='ArrowDown')j=(i+1)%6;
                else if(event.key==='ArrowLeft'||event.key==='ArrowUp')j=(i+5)%6;
                else if(event.key==='Home')j=0;else if(event.key==='End')j=5;else return;
                event.preventDefault();boutons[j].focus();choisir(j);
            };
            scene.addEventListener('click',clic);scene.addEventListener('keydown',clavier);
            e.nettoyer=()=>{scene.removeEventListener('click',clic);scene.removeEventListener('keydown',clavier);};
            afficherExemple(scene,0);return e;
        },
        animer(e,conditions,{gsap,ScrollTrigger}) {
            if(!partage.sablier?.visageDisponible){
                e.scene.classList.add('ea-words-statique');
                return()=>e.scene.classList.remove('ea-words-statique');
            }
            const etat={relais:0,principal:0},partRelais=1/(conditions.desktop?7:6);
            const raccordement=creerRaccordement(e.scene);
            const vue={progression:0,exemple:e.selection,...e.reprise};partage.langage=vue;
            const titres=[...e.scene.querySelectorAll('.ea-words-caption')];
            const controles=e.scene.querySelector('.ea-words-controles');
            const statut=e.scene.querySelector('.ea-words-statut');
            const devise=e.scene.querySelector('.ea-words-devise');
            let tween=null,restauration=null;
            const maj=()=>{
                raccordement.actualiser(etat.relais);
                const p=Math.min(1,etat.relais*partRelais+etat.principal*(1-partRelais));vue.progression=p;
                const plages=[[.025,.11,.31,.4],[.34,.45,.54,.63],[.55,.65,.75,.82],[.81,.91,2,3]];
                titres.forEach((t,i)=>{
                    const [a,b,c,d]=plages[i],alpha=lisser(a,b,p)*(1-lisser(c,d,p));
                    t.style.opacity=String(alpha);t.style.transform=`translateY(${(1-lisser(a,b,p))*15}px)`;
                });
                controles.style.opacity=String(lisser(.85,.95,p));controles.inert=p<.9;
                devise.style.opacity=String(lisser(.76,.88,p));
                const index=p<.9?0:e.selection;
                afficherExemple(e.scene,index);e.boutons.forEach(b=>{b.disabled=p<.9;});
                const occupe=p>=.9&&vue.replayActif&&vue.replay<1;
                statut.textContent=occupe?'Transformation visuelle en cours…':'Démonstration illustrative · aucune prédiction calculée';
                e.scene.dataset.progression=p.toFixed(5);
                e.scene.dataset.replay=vue.replay.toFixed(5);
                partage.dessiner?.();
            };
            e.changer=index=>{
                if(index===vue.exemple&&vue.replayActif)return;
                tween?.kill();
                // Terminer le rendu courant avant de le capturer sur GPU, puis changer uniquement la cible.
                maj();
                partage.rendreImmediat?.();
                if(!partage.sablier.capturerLangage())return;
                vue.exemple=index;vue.replay=0;vue.replayActif=true;
                tween=gsap.to(vue,{replay:1,duration:2.4,ease:'none',onUpdate:maj,overwrite:true,paused:true});
                maj();
                partage.rendreImmediat?.();
                tween.play();
            };
            const memoriser=()=>{
                const r=e.scene.getBoundingClientRect();
                if(vue.progression>0&&vue.progression<1&&r.top<=1&&r.bottom>0)partage.repriseLangage=vue.progression;
            };
            window.addEventListener('resize',memoriser,{passive:true});
            const relais=gsap.timeline({onUpdate:maj,scrollTrigger:{id:'ea-words-relais',trigger:e.scene,start:'top bottom',end:'top top',scrub:.6,invalidateOnRefresh:true}});
            relais.fromTo(etat,{relais:0},{relais:1,duration:1,ease:'none'});
            const tl=gsap.timeline({onUpdate:maj,scrollTrigger:{id:'ea-words',trigger:e.scene,start:'top top',
                end:()=>'+='+Math.round(innerHeight*(conditions.desktop?6:5)),pin:true,scrub:.6,anticipatePin:1,invalidateOnRefresh:true,
                onRefresh:()=>{
                    maj();
                    if(partage.repriseLangage!=null){const p=partage.repriseLangage;partage.repriseLangage=null;
                        restauration=requestAnimationFrame(()=>{const debut=relais.scrollTrigger.start;scrollTo(0,debut+p*(tl.scrollTrigger.end-debut));});}
                }}});
            tl.fromTo(etat,{principal:0},{principal:1,duration:1,ease:'none'});
            const fin=self=>partage.stage?.style.setProperty('transform',`translateY(${-self.progress*innerHeight}px)`);
            const apres=document.querySelector('#ea-learning') ? null : ScrollTrigger.create({start:()=>tl.scrollTrigger.end,end:()=>tl.scrollTrigger.end+innerHeight,onUpdate:fin,onRefresh:fin,refreshPriority:-1});
            if(vue.replayActif&&vue.replay<1)tween=gsap.to(vue,{replay:1,duration:(1-vue.replay)*2.4,ease:'none',onUpdate:maj});
            maj();
            return()=>{
                memoriser();window.removeEventListener('resize',memoriser);if(restauration!=null)cancelAnimationFrame(restauration);
                tween?.kill();apres?.kill();e.reprise={replay:vue.replay,replayActif:vue.replayActif};e.changer=null;
                raccordement.detruire();
                if(partage.langage===vue)partage.langage=null;
                partage.stage?.style.removeProperty('transform');
                [...titres,controles,devise].forEach(t=>t.removeAttribute('style'));controles.inert=false;e.boutons.forEach(b=>{b.disabled=false;});
                delete e.scene.dataset.progression;delete e.scene.dataset.replay;
            };
        },
        demonter(e){e.nettoyer();},
    };
}
