/**
 * Nuage extrait de la référence fournie par l'auteur : traits dessinés par la
 * densité des grains, sans masque filaire. Relief et échantillonnage déterministes.
 */
import { POINTS_VISAGE } from "./visage-points.js";
const bosse = (x,y,cx,cy,sx,sy) => { const dx=(x-cx)/sx,dy=(y-cy)/sy; return Math.exp(-dx*dx-dy*dy); };
function relief(x,y) {
    const largeur=.73*Math.sqrt(Math.max(.01,1-(y/1.13)**2));
    let z=.10+.24*Math.sqrt(Math.max(0,1-(x/largeur)**2));
    z+=.14*bosse(x,y,0,.06,.09,.32)+.22*bosse(x,y,0,-.13,.14,.10);
    z+=.045*bosse(x,y,0,-.45,.27,.14);
    for(const cote of [-1,1]) {
        z-=.08*bosse(x,y,cote*.31,.28,.21,.13);
        z+=.045*bosse(x,y,cote*.40,-.08,.23,.24);
    }
    return z;
}
export function creerVisage(nombre=18000) {
    const n=Math.max(1,Math.floor(nombre)),pos=new Float32Array(n*3);
    let graine=41871;
    const hasard=()=>{graine=(Math.imul(graine,1664525)+1013904223)>>>0;return graine/4294967296;};
    const total=POINTS_VISAGE.length/2;
    for(let i=0;i<n;i++) {
        const k=Math.min(total-1,Math.floor((i+hasard())*total/n));
        const x=(POINTS_VISAGE[k*2]-586)/562.5+(hasard()-.5)*.002;
        const y=(654-POINTS_VISAGE[k*2+1])/562.5+(hasard()-.5)*.002;
        pos.set([x,y,relief(x,y)],i*3);
    }
    // Connexions locales sur les traits : aucune diagonale à travers le visage.
    const reperes=[],ordreN=[],segments=[],ordres=[];
    for(let i=0;i<n&&ordreN.length<90;i+=Math.max(1,Math.floor(n/220))) {
        const x=pos[i*3],y=pos[i*3+1];
        if(!(Math.abs(y-.28)<.13||Math.abs(y+.46)<.10||(Math.abs(x)<.14&&Math.abs(y+.13)<.12)))continue;
        reperes.push(x,y,pos[i*3+2]+.004);
        ordreN.push((1.12-y)/2.24);
    }
    for(let i=0;i<ordreN.length;i+=2) {
        let voisin=-1,distance=.075**2;
        for(let j=i+1;j<ordreN.length;j++) {
            const d=(reperes[i*3]-reperes[j*3])**2+(reperes[i*3+1]-reperes[j*3+1])**2;
            if(d>.012**2&&d<distance){voisin=j;distance=d;}
        }
        if(voisin<0)continue;
        segments.push(...reperes.slice(i*3,i*3+3),...reperes.slice(voisin*3,voisin*3+3));
        const ordre=Math.max(ordreN[i],ordreN[voisin]);ordres.push(ordre,ordre);
    }
    return {pos,hauteur:2.24,
        noeuds:{pos:Float32Array.from(reperes),ordre:Float32Array.from(ordreN),n:ordreN.length},
        lignes:{pos:Float32Array.from(segments),ordre:Float32Array.from(ordres),n:ordres.length}};
}
