export const DONNEES_EXPERIENCE = JSON.parse(document.querySelector('#ea-experience-donnees')?.textContent || 'null');

// Ces fonctions prolongent les positions du noyau : les mêmes faces deviennent l'interface.
export const POSITIONS_EXPERIENCE = `
    uniform float uExperience;
    uniform float uContexts[3],uFilters[4],uMessages[8],uSampleCounts[4],uBaseCounts[4];
    uniform float uGroups[8],uOrder[8],uMembership[24];
    float interactionExperience(float p){return douceur(.71,.79,p)*(1.-douceur(.92,.98,p));}
    float presenceMessage(float i,float p){
        int j=int(i);
        float visible=uMembership[j*3]*uContexts[0]+uMembership[j*3+1]*uContexts[1]+uMembership[j*3+2]*uContexts[2];
        float cible=visible*mix(.18,1.,uFilters[int(uGroups[j])]);
        return mix(1.,cible,interactionExperience(p));
    }
    vec3 constellationExperience(float i){
        float a=i*2.39996323;
        return vec3(cos(a)*(2.65+.15*mod(i,3.)),sin(a)*2.,sin(a*.7)*1.6)+vec3(0.,-.15,-110.);
    }
    vec3 colonneExperience(float i,float p){
        float compte=mix(uBaseCounts[int(i)],uSampleCounts[int(i)],interactionExperience(p));
        return vec3((i-1.5)*mix(1.65,1.04,uMobile),-1.3+compte*.36,-110.+sin(i*1.2)*.3);
    }
    vec3 contexteExperience(float i,float p){
        float actif=exp(-pow((p-(.57+i*.055))/.055,2.));
        return vec3((i-1.)*mix(3.5,1.8,uMobile),.4+sin(i*2.)*.25,-111.+actif*1.8-mod(i,2.)*.6);
    }
    vec3 messageExperience(float i,float p){
        float groupe=uGroups[int(i)];
        vec3 depart=vec3((mod(i,4.)-1.5)*mix(2.7,1.1,uMobile),1.1-floor(i/4.)*1.8,-109.-mod(i,3.)*.7);
        float ordre=uOrder[int(i)];
        vec3 groupePos=vec3((groupe-1.5)*mix(2.6,1.35,uMobile),1.35-ordre*1.6,-111.-ordre*.45);
        vec3 pos=mix(depart,groupePos,douceur(.17,.34,p));
        pos=mix(pos,colonneExperience(groupe,p),douceur(.35,.52,p));
        pos=mix(pos,contexteExperience(mod(i,3.),p),douceur(.55,.69,p));
        vec3 liste=vec3((mod(i,4.)-1.5)*mix(2.65,1.2,uMobile),.7-floor(i/4.)*1.5,-110.-mod(i,3.)*.35);
        vec3 regroupement=vec3((groupe-1.5)*mix(2.7,1.25,uMobile),1.35-ordre*1.6,-111.-ordre*.4);
        vec3 analyse=colonneExperience(groupe,p)+vec3((ordre-(uSampleCounts[int(groupe)]-1.)*.5)*.12,.9+ordre*1.35,ordre*.25);
        vec3 interactif=liste*uContexts[0]+regroupement*uContexts[1]+analyse*uContexts[2];
        interactif.z+=uMessages[int(i)]*1.5;
        interactif=mix(interactif,vec3(0.,.65,-104.),uMessages[int(i)]*uMobile);
        pos=mix(pos,interactif,douceur(.70,.79,p));
        return mix(pos,constellationExperience(i),douceur(.92,1.,p));
    }
    vec3 surfaceExperience(float i,vec2 uv,float p){
        vec3 origine=noyauSurface(i,uv),cible;
        float taille=1.-douceur(.92,1.,p);
        if(i<8.){
            vec3 centre=messageExperience(i,p);
            vec2 format=mix(vec2(1.18,.66),vec2(.7,.48),uMobile);
            format*=mix(1.,.65,uContexts[2]*interactionExperience(p));
            format=mix(format,vec2(1.5,.82),uMessages[int(i)]*uMobile*interactionExperience(p));
            float retrait=douceur(.35,.51,p)*(1.-douceur(.69,.79,p));
            format*=mix(1.,.1,retrait)*taille;
            cible=centre+vec3(uv*format,uv.x*.12*sin(i));
        }else if(i<12.){
            float groupe=i-8.;
            float compte=mix(uBaseCounts[int(groupe)],uSampleCounts[int(groupe)],interactionExperience(p));
            vec2 format=vec2(.33,compte*.36)*douceur(.33,.51,p)*taille;
            cible=colonneExperience(groupe,p)+vec3(uv*format,0.);
            cible=mix(cible,contexteExperience(mod(groupe,3.),p)+vec3(uv*format*.3,0.),douceur(.55,.69,p)*(1.-douceur(.70,.8,p)));
        }else{
            float contexte=mod(i-12.,3.);
            vec2 format=mix(vec2(1.5,1.05),vec2(.85,.8),uMobile)*taille;
            cible=contexteExperience(contexte,p)+vec3(uv*format,uv.x*.16*(contexte-1.));
            cible=mix(cible,constellationExperience(i),douceur(.92,1.,p));
        }
        return mix(origine,cible,douceur(0.,.16,p))+vec3(0.,-.65*uMobile-(1.5+.7*douceur(0.,.18,p))*uCourt,0.);
    }
    vec3 particuleExperience(float i,float seed,float p){
        float face=mod(floor(i/12.),18.),message=mod(i,8.);
        vec2 uv=vec2(fract(seed*17.1),fract(seed*23.7))*2.-1.;
        vec3 origine=noyauSurface(face,uv);
        vec3 cible=messageExperience(message,p)+vec3(uv*vec2(1.05,.55),sin(seed*19.)*.08);
        float groupe=uGroups[int(message)];
        float hauteur=mix(uBaseCounts[int(groupe)],uSampleCounts[int(groupe)],interactionExperience(p));
        vec3 colonne=colonneExperience(groupe,p)+vec3(uv.x*.28,uv.y*hauteur*.36,sin(seed*17.)*.22);
        cible=mix(cible,colonne,douceur(.34,.52,p)*(1.-douceur(.55,.70,p)));
        float rayon=mix(.18,.035,step(.25,fract(seed*7.7)))*sqrt(fract(seed*13.7));
        vec3 final=constellationExperience(message)+vec3(cos(seed*62.83)*rayon,sin(seed*62.83)*rayon,sin(seed*19.)*rayon);
        cible=mix(cible,final,douceur(.92,1.,p));
        return mix(origine,cible,douceur(0.,.16,p))+vec3(0.,-.65*uMobile-(1.5+.7*douceur(0.,.18,p))*uCourt,0.);
    }
`;

function creerAtlas(gl) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    const cases = [
        ...DONNEES_EXPERIENCE.messages.map(m => ({titre:m.emotion.toUpperCase(), texte:m.texte, note:'EXEMPLE ILLUSTRATIF'})),
        ...DONNEES_EXPERIENCE.emotions.map(titre => ({titre:titre.toUpperCase(), texte:'Messages de cet échantillon', note:'EFFECTIFS, PAS DES PROBABILITÉS'})),
        ...DONNEES_EXPERIENCE.contextes.map(c => ({titre:c.titre, texte:c.description, note:'POSSIBILITÉ D’APPLICATION'})),
    ];
    cases.forEach((c,i) => {
        const x=i%2*512,y=Math.floor(i/2)*256;
        ctx.fillStyle='#fff';ctx.font='600 25px system-ui';ctx.fillText(c.titre,x+24,y+42);
        ctx.font='500 34px system-ui';
        let ligne='', hauteur=y+102;
        for(const mot of c.texte.split(' ')){
            if(ctx.measureText(ligne+mot).width>460){ctx.fillText(ligne.trim(),x+24,hauteur);hauteur+=38;ligne='';}
            ligne+=mot+' ';
        }
        ctx.fillText(ligne.trim(),x+24,hauteur);
        ctx.font='500 17px system-ui';ctx.fillText(c.note,x+24,y+232);
    });
    const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,canvas);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    return texture;
}

export function creerExperienceRendu(gl, compiler, positionsApprentissage) {
    const vs=`#version 300 es
        precision highp float;
        uniform mat4 uP;uniform vec3 uCamera;uniform vec2 uAngles;uniform float uMobile,uCourt;
        ${positionsApprentissage}
        ${POSITIONS_EXPERIENCE}
        out vec2 vUV;out float vIndex,vAlpha,vTexte;
        void main(){
            vec2 coins[6]=vec2[6](vec2(-1.,-1.),vec2(1.,-1.),vec2(-1.,1.),vec2(-1.,1.),vec2(1.,-1.),vec2(1.,1.));
            vec2 uv=coins[gl_VertexID];float i=float(gl_InstanceID),p=uExperience;
            vec3 monde=surfaceExperience(i,uv,p);
            float alpha=1.,texte=0.;
            if(i<8.){
                alpha=douceur(.09,.19,p)*(1.-douceur(.33,.45,p))+.9*douceur(.70,.79,p);
                alpha*=presenceMessage(i,p)*(1.-douceur(.92,.98,p));texte=douceur(.12,.21,p);
            }else if(i<12.){
                alpha=douceur(.32,.49,p)*(1.-douceur(.54,.66,p))+.55*douceur(.71,.81,p);
                alpha*=mix(1.,mix(.2,1.,uFilters[int(i-8.)]),interactionExperience(p))*(1.-douceur(.92,.98,p));
            }else{
                alpha=douceur(.53,.62,p)*(1.-douceur(.71,.79,p))*.8;texte=1.;
            }
            vec3 v=monde-uCamera;
            float cy=cos(uAngles.x),sy=sin(uAngles.x),cx=cos(uAngles.y),sx=sin(uAngles.y);
            v=vec3(cy*v.x-sy*v.z,v.y,sy*v.x+cy*v.z);v=vec3(v.x,cx*v.y-sx*v.z,sx*v.y+cx*v.z);
            gl_Position=uP*vec4(v,1.);vUV=uv*.5+.5;vIndex=i;vAlpha=alpha;vTexte=texte;
        }`;
    const fs=`#version 300 es
        precision highp float;
        uniform sampler2D uCards;uniform float uClair;
        in vec2 vUV;in float vIndex,vAlpha,vTexte;out vec4 o;
        void main(){
            vec2 bord=min(vUV,1.-vUV);float contour=1.-smoothstep(.006,.016,min(bord.x,bord.y));
            float index=vIndex<12.?vIndex:12.+mod(vIndex-12.,3.);
            vec2 uv=vec2((mod(index,2.)*512.+vUV.x*512.)/1024.,(floor(index/2.)*256.+(1.-vUV.y)*256.)/2048.);
            float texte=texture(uCards,uv).a*vTexte;
            vec3 or=mix(vec3(.88,.73,.47),vec3(.35,.23,.09),uClair);
            vec3 c=mix(or,mix(vec3(.94,.92,.85),vec3(.12,.11,.08),uClair),texte);
            float alpha=vAlpha*max(texte,.10+contour*.48);
            o=vec4(c*alpha,alpha);
        }`;
    const programme=compiler(gl,vs,fs),texture=creerAtlas(gl),vao=gl.createVertexArray();
    const vsLiens=`#version 300 es
        precision highp float;uniform mat4 uP;uniform vec3 uCamera;uniform vec2 uAngles;uniform float uMobile,uCourt;
        uniform float uFinal;
        ${positionsApprentissage}
        ${POSITIONS_EXPERIENCE}
        out float vAlpha;
        void main(){
            float i=float(gl_VertexID/2),p=uExperience,extremite=float(gl_VertexID%2);
            float message=mod(i,8.);
            vec3 a=messageExperience(message,p),b=colonneExperience(uGroups[int(message)],p);
            float fin=douceur(.91,1.,p);
            a=mix(a,constellationExperience(message),fin);
            b=mix(b,constellationExperience(mod(message+1.+floor(i/8.),8.)),fin);
            vec3 v=mix(a,b,extremite)+vec3(0.,-.65*uMobile-(1.5+.7*douceur(0.,.18,p))*uCourt,0.)-uCamera;
            float cy=cos(uAngles.x),sy=sin(uAngles.x),cx=cos(uAngles.y),sx=sin(uAngles.y);
            v=vec3(cy*v.x-sy*v.z,v.y,sy*v.x+cy*v.z);v=vec3(v.x,cx*v.y-sx*v.z,sx*v.y+cx*v.z);
            gl_Position=uP*vec4(v,1.);
            vAlpha=(douceur(.17,.31,p)*(1.-douceur(.54,.65,p))*.25+interactionExperience(p)*.2+fin*.35)*presenceMessage(message,p);
            vAlpha*=1.-douceur(0.,.17,uFinal);
        }`;
    const fsLiens=`#version 300 es
        precision highp float;uniform float uClair;in float vAlpha;out vec4 o;
        void main(){vec3 c=mix(vec3(.86,.7,.4),vec3(.35,.23,.08),uClair);o=vec4(c*vAlpha,vAlpha);}`;
    const liens=compiler(gl,vsLiens,fsLiens);
    const groupes=Float32Array.from(DONNEES_EXPERIENCE.messages,m=>DONNEES_EXPERIENCE.emotions.indexOf(m.emotion));
    const ordre=Float32Array.from(DONNEES_EXPERIENCE.messages,(m,i)=>DONNEES_EXPERIENCE.messages.slice(0,i).filter(autre=>autre.emotion===m.emotion).length);
    const effectifs=Float32Array.from(DONNEES_EXPERIENCE.emotions,e=>DONNEES_EXPERIENCE.messages.filter(m=>m.emotion===e).length);
    const appartenance=new Float32Array(24);
    DONNEES_EXPERIENCE.messages.forEach((_,i)=>DONNEES_EXPERIENCE.contextes.forEach((c,j)=>{appartenance[i*3+j]=c.messages.includes(i)?1:0;}));
    function uniformes(pr,etat,vue){
        const u=pr.u;gl.useProgram(pr.p);
        gl.uniformMatrix4fv(u.uP,false,vue.projection);gl.uniform3fv(u.uCamera,vue.camera);gl.uniform2fv(u.uAngles,vue.angles);
        gl.uniform1f(u.uMobile,vue.W<700?1:0);gl.uniform1f(u.uCourt,vue.H<600?1:0);gl.uniform1f(u.uExperience,etat.progression);gl.uniform1f(u.uClair,vue.clair);
        gl.uniform1fv(u['uGroups[0]'],groupes);gl.uniform1fv(u['uMembership[0]'],appartenance);
        gl.uniform1fv(u['uOrder[0]'],ordre);
        gl.uniform1fv(u['uContexts[0]'],etat.contextes);gl.uniform1fv(u['uFilters[0]'],etat.filtres);
        gl.uniform1fv(u['uMessages[0]'],etat.messages);gl.uniform1fv(u['uSampleCounts[0]'],etat.comptes);
        gl.uniform1fv(u['uBaseCounts[0]'],effectifs);
    }
    return {
        groupes,appartenance,
        uniformes,
        rendre(etat,vue,conclusion){
            if(!etat||etat.progression<=0||conclusion?.progression>=.17)return;
            gl.bindVertexArray(vao);gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
            uniformes(programme,etat,vue);gl.activeTexture(gl.TEXTURE2);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(programme.u.uCards,2);
            if(etat.progression<.98)gl.drawArraysInstanced(gl.TRIANGLES,0,6,18);
            uniformes(liens,etat,vue);gl.uniform1f(liens.u.uFinal,conclusion?.progression||0);gl.drawArrays(gl.LINES,0,32);
            gl.bindVertexArray(null);gl.depthMask(true);
        },
        detruire(){gl.deleteProgram(programme.p);gl.deleteProgram(liens.p);gl.deleteTexture(texture);gl.deleteVertexArray(vao);},
    };
}
