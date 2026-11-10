import { lisser } from './reseau-interieur.js';
import { creerRaccordement } from '../commun/animations-communes.js';
import { DONNEES_CONCLUSION } from './conclusion-rendu.js';

export function creerSceneConclusion(partage) {
    return {
        id:'ea-conclusion',
        preparer(racine) { return { scene:racine.querySelector('#ea-conclusion'), racine }; },
        animer(e,conditions,{gsap}) {
            if(!partage.sablier?.visageDisponible){
                e.scene.classList.add('ea-final-statique');
                return()=>e.scene.classList.remove('ea-final-statique');
            }
            e.racine.classList.add('ea-final-active');
            const etat={relais:0,principal:0},vue={progression:0,ambiance:0};
            const raccordement=creerRaccordement(e.scene);
            partage.conclusion=vue;
            const titres=[...e.scene.querySelectorAll('.ea-final-phase')];
            const intro=e.scene.querySelector('.ea-final-intro');
            const etiquettes=e.scene.querySelector('.ea-final-etiquettes');
            const noms=[...etiquettes.children];
            const projet=e.scene.querySelector('.ea-final-projet');
            const lettres=[...projet.querySelectorAll('.ea-final-mot')];
            const infos=[...projet.querySelectorAll('.ea-final-info')];
            const actions=e.scene.querySelector('.ea-final-actions');
            const liens=[...actions.querySelectorAll('a')];
            const plages=[[.09,.145,.17,.20],[.205,.25,.325,.35],[.355,.41,.53,.61]];
            const partRelais=1/(conditions.desktop?7:6);
            let ambianceActive=false,restauration=null;
            const apercu=document.getElementById('ea-apercu');
            function ambiance(temps){
                if(document.hidden||apercu?.open)return;
                vue.ambiance=Math.sin(temps*.45)*.007;
                partage.dessiner?.();
            }
            function dessiner(){
                const entree=raccordement.actualiser(etat.relais);
                const p=Math.min(1,etat.relais*partRelais+etat.principal*(1-partRelais));
                vue.progression=p;
                intro.style.opacity=entree*lisser(.1,.15,p)*(1-lisser(.61,.72,p));
                titres.forEach((titre,i)=>{
                    const [a,b,c,d]=plages[i];
                    titre.style.opacity=lisser(a,b,p)*(1-lisser(c,d,p));
                    titre.style.transform=`translateY(${(1-lisser(a,b,p))*12}px)`;
                });
                const avance=lisser(.19,.34,p)*5,passage=avance-Math.floor(avance);
                etiquettes.style.opacity=lisser(.19,.23,p)*(1-lisser(.33,.4,p))*lisser(0,.15,passage)*(1-lisser(.85,1,passage));
                // Chaque groupe de noms change lorsque son opacité revient à zéro.
                const debut=Math.min(4,Math.floor(avance))*4;
                noms.forEach((span,i)=>{span.textContent=DONNEES_CONCLUSION.emotions[debut+i];});
                projet.style.opacity=lisser(.62,.72,p);
                lettres.forEach((mot,i)=>{
                    const v=lisser(.63+i*.035,.75+i*.035,p);
                    mot.style.clipPath=`inset(${(1-v)*100}% 0 0 0)`;
                    mot.style.transform=`translateY(${(1-v)*28}%)`;
                });
                infos.forEach((info,i)=>{
                    const v=lisser(.74+i*.025,.84+i*.025,p);
                    info.style.opacity=v;info.style.transform=`translateY(${(1-v)*10}px)`;
                });
                actions.style.opacity=lisser(.87,.96,p);actions.inert=p<.91;
                liens.forEach(a=>{a.tabIndex=p<.91?-1:0;});
                if(p>.985&&!ambianceActive){gsap.ticker.add(ambiance);ambianceActive=true;}
                if(p<=.985&&ambianceActive){gsap.ticker.remove(ambiance);ambianceActive=false;vue.ambiance=0;}
                e.scene.dataset.progression=p.toFixed(6);
                partage.dessiner?.();
            }
            function memoriser(){
                const r=e.scene.getBoundingClientRect();
                if(vue.progression>0&&vue.progression<=1&&r.top<=1&&r.bottom>0)partage.repriseConclusion=vue.progression;
            }
            window.addEventListener('resize',memoriser,{passive:true});
            const relais=gsap.timeline({onUpdate:dessiner,scrollTrigger:{id:'ea-conclusion-relais',trigger:e.scene,start:'top bottom',end:'top top',scrub:.6,invalidateOnRefresh:true}});
            relais.fromTo(etat,{relais:0},{relais:1,duration:1,ease:'none'});
            const timeline=gsap.timeline({onUpdate:dessiner,scrollTrigger:{
                id:'ea-conclusion',trigger:e.scene,start:'top top',end:()=>'+='+Math.round(innerHeight*(conditions.desktop?6:5)),
                pin:true,scrub:.6,anticipatePin:1,invalidateOnRefresh:true,
                onRefresh(){
                    dessiner();
                    if(partage.repriseConclusion!=null){const p=partage.repriseConclusion;partage.repriseConclusion=null;
                        restauration=requestAnimationFrame(()=>scrollTo(0,relais.scrollTrigger.start+p*(timeline.scrollTrigger.end-relais.scrollTrigger.start)));}
                },
            }});
            timeline.fromTo(etat,{principal:0},{principal:1,duration:1,ease:'none'});
            dessiner();
            return()=>{
                memoriser();window.removeEventListener('resize',memoriser);
                raccordement.detruire();
                if(restauration!=null)cancelAnimationFrame(restauration);
                gsap.ticker.remove(ambiance);e.racine.classList.remove('ea-final-active');
                if(partage.conclusion===vue)partage.conclusion=null;
                [...titres,intro,etiquettes,projet,...lettres,...infos,actions].forEach(t=>t.removeAttribute('style'));
                actions.inert=false;liens.forEach(a=>a.removeAttribute('tabindex'));delete e.scene.dataset.progression;
            };
        },
    };
}
