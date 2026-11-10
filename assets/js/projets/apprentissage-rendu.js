import { POSITIONS_EXPERIENCE } from './experience-rendu.js';

// Positions communes aux grains, cartes et cellules : une seule progression, aucun temps réel.
export const POSITIONS_APPRENTISSAGE = `
    uniform float uLearning,uComponent;
    float douceur(float a,float b,float p){float t=clamp((p-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
    vec3 cartePosition(float i,float p){
        float test=step(6.,i),rang=mod(i,6.);
        float colonnes=mix(3.,2.,uMobile);
        vec3 libre=vec3((mod(rang,colonnes)-(colonnes-1.)*.5)*mix(3.5,2.7,uMobile),
            1.45-floor(rang/colonnes)*mix(2.25,1.8,uMobile),-107.-mod(rang,3.)*1.7-test*5.);
        vec3 groupe=vec3((mod(rang,colonnes)-(colonnes-1.)*.5)*mix(3.8,2.8,uMobile),
            1.35-floor(rang/colonnes)*mix(2.35,1.9,uMobile),-108.-test*4.);
        vec3 pos=mix(libre,groupe,douceur(.12,.30,p));
        vec3 reserve=vec3(mix(6.3,3.8,uMobile),1.8-rang*.6,-113.-rang*.2);
        if(test>.5)pos=mix(pos,reserve,douceur(.12,.30,p));
        vec3 evalue=vec3((mod(rang,colonnes)-(colonnes-1.)*.5)*mix(3.7,2.8,uMobile),
            1.25-floor(rang/colonnes)*mix(2.35,1.9,uMobile),-109.-.2*rang);
        if(test>.5)pos=mix(pos,evalue,douceur(.68,.80,p));
        return pos;
    }
    vec3 cellulePosition(float i){
        float col=mod(i,6.),ligne=floor(i/6.);
        return vec3((col-2.5)*mix(1.02,.65,uMobile),1.7-ligne*.68,-108.-ligne*.18);
    }
    vec3 classePosition(float i){
        float col=mod(i,5.),ligne=floor(i/5.);
        return vec3((col-2.)*mix(1.55,.92,uMobile),1.9-ligne*1.05,-110.-sin(i*1.7)*.65);
    }
    vec3 tournerNoyau(vec3 v){
        v=vec3(.90*v.x+.435*v.z,v.y,-.435*v.x+.90*v.z);
        return vec3(v.x,.96*v.y-.28*v.z,.28*v.y+.96*v.z);
    }
    vec3 noyauSurface(float i,vec2 uv){
        float couche=mod(i,3.),face=mod(floor(i/3.),6.);
        vec3 axe=face<2.?vec3(1.,0.,0.):(face<4.?vec3(0.,1.,0.):vec3(0.,0.,1.));
        vec3 decalage=vec3(uv,0.);
        if(face<2.)decalage=vec3(0.,uv.y,uv.x);
        else if(face<4.)decalage=vec3(uv.x,0.,uv.y);
        return tournerNoyau((axe*(mod(face,2.)*2.-1.)+decalage)*(.65+couche*.42))+vec3(0.,.15,-109.);
    }
    vec3 noyauPosition(float i){return noyauSurface(i,vec2(0.));}
    vec3 apprendrePosition(float i,float seed,float p){
        float carte=mod(i,12.),test=step(6.,carte);
        vec3 detail=vec3(fract(seed*17.1)-.5,fract(seed*23.7)-.5,fract(seed*31.3)-.5);
        vec3 pos=cartePosition(carte,p)+detail*vec3(2.5,1.12,.06);
        vec3 cellule=cellulePosition(mod(floor(i/12.),36.))+detail*vec3(.4,.36,.4);
        pos=mix(pos,cellule,douceur(.30,.48,p)*(1.-test));
        vec3 classe=classePosition(mod(floor(i/12.),20.))+detail*vec3(.8,.65,.55);
        float flux=douceur(.48,.65,p);
        classe.x+=sin(flux*3.14159265)*sin(seed*9.)*.8;
        pos=mix(pos,classe,flux*(1.-test));
        vec3 evaluation=cartePosition(carte,p)+detail*vec3(2.5,1.12,.06);
        pos=mix(pos,evaluation,douceur(.69,.81,p)*test);
        vec3 noyau=noyauSurface(mod(floor(i/12.),18.),detail.xy*2.);
        pos=mix(pos,noyau,douceur(.86,1.,p));
        return pos+vec3(0.,-.65*uMobile-1.5*uCourt,0.);
    }
`;

function creerAtlas(gl, donnees) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    const cartes = [...donnees.entrainement, ...donnees.evaluation];
    cartes.forEach((carte, i) => {
        const x = (i % 2) * 512, y = Math.floor(i / 2) * 320;
        ctx.fillStyle = '#ffffff';
        ctx.font = '500 23px system-ui';
        ctx.fillText(i < 6 ? 'TRAINING DATA' : 'TEST DATA · ILLUSTRATION', x + 26, y + 43);
        ctx.font = '500 38px system-ui';
        let ligne = '', hauteur = y + 105;
        for (const mot of carte.phrase.split(' ')) {
            if (ctx.measureText(ligne + mot).width > 450) {
                ctx.fillText(ligne.trim(), x + 26, hauteur); hauteur += 42; ligne = '';
            }
            ligne += mot + ' ';
        }
        ctx.fillText(ligne.trim(), x + 26, hauteur);
        ctx.font = '500 25px system-ui';
        ctx.fillText(i < 6 ? carte.emotion.toUpperCase() : 'EXPECTED · ' + carte.emotion, x + 26, y + 253);
        if (i >= 6) ctx.fillText('PREDICTED* · ' + carte.illustration, x + 26, y + 290);
    });
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

// Petit TF-IDF réellement calculé sur les six phrases fictives, jamais sur le dataset du modèle.
export function calculerCaracteristiques(donnees) {
    const lignes = donnees.entrainement.map(exemple => exemple.phrase.toLocaleLowerCase('fr').match(/[\p{L}]+/gu) || []);
    const valeurs = new Float32Array(36);
    lignes.forEach((mots, ligne) => {
        let norme = 0;
        donnees.vocabulaire.forEach((terme, colonne) => {
            const documents = lignes.filter(l => l.includes(terme)).length;
            const valeur = mots.filter(m => m === terme).length * (Math.log((1 + lignes.length) / (1 + documents)) + 1);
            valeurs[ligne * 6 + colonne] = valeur; norme += valeur * valeur;
        });
        if (norme) for (let col = 0; col < 6; col++) valeurs[ligne * 6 + col] /= Math.sqrt(norme);
    });
    return valeurs;
}

export function creerApprentissageRendu(gl, compiler, experience) {
    const donnees = JSON.parse(document.querySelector('#ea-learning-donnees').textContent);
    const valeurs = calculerCaracteristiques(donnees);
    const texture = creerAtlas(gl, donnees);
    const vs = `#version 300 es
        precision highp float;
        uniform mat4 uP;uniform vec3 uCamera;uniform vec2 uAngles;
        uniform float uMobile,uCourt,uClair,uFeatures[36];
        ${POSITIONS_APPRENTISSAGE}
        ${POSITIONS_EXPERIENCE}
        out vec2 vUV;out float vAlpha,vType,vIndex,vForce;
        void main(){
            int instance=gl_InstanceID;
            vec2 coins[6]=vec2[6](vec2(-1.,-1.),vec2(1.,-1.),vec2(-1.,1.),vec2(-1.,1.),vec2(1.,-1.),vec2(1.,1.));
            vec2 coin=coins[gl_VertexID];vUV=coin*.5+.5;
            float p=uLearning,i=float(instance),type=0.,alpha=0.,force=0.;
            vec3 centre;vec2 taille;
            if(instance<12){
                centre=cartePosition(i,p);taille=mix(vec2(1.72,1.07),vec2(1.30,.81),uMobile);
                float arrive= douceur(.025,.14,p);
                float test=step(6.,i);
                // Les exemples réservés restent des miniatures jusqu'à leur mise à l'épreuve.
                taille*=mix(1.,mix(.23,1.,douceur(.68,.80,p)),test);
                alpha=arrive*mix(1.-douceur(.33,.48,p),.04+.96*douceur(.66,.78,p),test)*(1.-douceur(.86,.97,p));
                centre.x+=sin(i*2.1)*.13*sin(p*3.14159265);
                force=test;type=0.;
            }else if(instance<48){
                i-=12.;centre=cellulePosition(i);taille=vec2(.24,.23);
                force=uFeatures[int(i)];centre.z+=force*.7*douceur(.32,.48,p);
                centre=mix(centre,classePosition(mod(i,20.)),douceur(.48,.66,p));
                centre=mix(centre,noyauPosition(mod(i,18.)),douceur(.86,1.,p));
                alpha=douceur(.29,.43,p)*mix(.16,.82,force)*(1.-douceur(.61,.73,p));type=1.;
            }else if(instance<68){
                i-=48.;centre=classePosition(i);taille=vec2(.47,.33);
                centre=mix(centre,noyauPosition(mod(i,18.)),douceur(.85,1.,p));
                force=.4+.25*sin(i*2.4);alpha=douceur(.48,.66,p)*(1.-douceur(.83,.99,p))*.7;type=2.;
            }else{
                i-=68.;centre=noyauSurface(i,coin);taille=vec2(0.);
                force=1.-min(1.,abs(mod(i,3.)-uComponent));
                alpha=douceur(.86,.99,p)*(.20+force*.23);type=3.;
            }
            vec3 monde=centre+vec3(coin*taille,0.);
            monde.y-=.65*uMobile+1.5*uCourt;
            // Les plaques restent orientées dans l'espace : perspective et parallaxe réelles.
            if(instance<12)monde.z+=coin.x*.17*sin(float(instance)*1.3);
            if(uExperience>0.){
                if(instance>=68)monde=surfaceExperience(float(instance-68),coin,uExperience);
                alpha*=1.-douceur(.02,.17,uExperience);
            }
            vec3 v=monde-uCamera;
            float cy=cos(uAngles.x),sy=sin(uAngles.x),cx=cos(uAngles.y),sx=sin(uAngles.y);
            v=vec3(cy*v.x-sy*v.z,v.y,sy*v.x+cy*v.z);v=vec3(v.x,cx*v.y-sx*v.z,sx*v.y+cx*v.z);
            gl_Position=uP*vec4(v,1.);vAlpha=alpha;vType=type;vIndex=float(instance);vForce=force;
        }`;
    const fs = `#version 300 es
        precision highp float;
        in vec2 vUV;in float vAlpha,vType,vIndex,vForce;
        uniform sampler2D uCards;uniform float uClair;out vec4 o;
        void main(){
            vec2 bord=min(vUV,1.-vUV);float contour=1.-smoothstep(.005,.015,min(bord.x,bord.y));
            vec3 or=mix(vec3(.89,.72,.43),vec3(.34,.22,.08),uClair);
            vec3 couleur=or;float alpha;
            if(vType<.5){
                vec2 uv=vec2((mod(vIndex,2.)*512.+vUV.x*512.)/1024.,(floor(vIndex/2.)*320.+(1.-vUV.y)*320.)/2048.);
                float texte=texture(uCards,uv).a;
                alpha=vAlpha*max(texte,max(contour*.45,.09));
                couleur=mix(or,mix(vec3(.91,.88,.8),vec3(.14,.12,.08),uClair),texte);
            }else{
                alpha=vAlpha*(.12+contour*.65+vForce*.12);
                couleur*=.8+vForce*.3;
            }
            o=vec4(couleur*alpha,alpha);
        }`;
    const programme = compiler(gl, vs, fs);
    const vao = gl.createVertexArray();
    return {
        rendre(etat, vue, etatExperience) {
            if (!etat || etat.progression <= 0 || etatExperience?.progression >= .17) return;
            const {p,u} = programme;
            gl.useProgram(p);gl.bindVertexArray(vao);
            gl.uniformMatrix4fv(u.uP,false,vue.projection);gl.uniform3fv(u.uCamera,vue.camera);gl.uniform2fv(u.uAngles,vue.angles);
            gl.uniform1f(u.uLearning,etat.progression);gl.uniform1f(u.uComponent,etat.composante);
            gl.uniform1f(u.uMobile,vue.W<700?1:0);gl.uniform1f(u.uCourt,vue.H<600?1:0);gl.uniform1f(u.uClair,vue.clair);
            gl.uniform1fv(u['uFeatures[0]'],valeurs);
            gl.uniform1f(u.uExperience,0);
            if(etatExperience)experience.uniformes(programme,etatExperience,vue);
            gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(u.uCards,1);
            gl.disable(gl.CULL_FACE);gl.depthMask(false);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
            gl.drawArraysInstanced(gl.TRIANGLES,0,6,86);
            gl.bindVertexArray(null);gl.depthMask(true);
        },
        detruire(){gl.deleteTexture(texture);gl.deleteVertexArray(vao);gl.deleteProgram(programme.p);},
    };
}
