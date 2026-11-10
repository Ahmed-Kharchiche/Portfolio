import { creerAtlasLangage, calculerPoidsMots, EXEMPLES_LANGAGE } from './langage-cibles.js';
import { creerApprentissageRendu, POSITIONS_APPRENTISSAGE } from './apprentissage-rendu.js';
import { creerExperienceRendu, POSITIONS_EXPERIENCE } from './experience-rendu.js';
import { creerConclusionRendu, POSITIONS_CONCLUSION } from './conclusion-rendu.js';

/** Particules partagées : réseau → sphère → caractères → cellules → résultat. */
export function creerLangageRendu(gl, nombre, meta, compiler) {
    const atlas = creerAtlasLangage(gl, nombre);
    const poidsMots = calculerPoidsMots(EXEMPLES_LANGAGE);
    const conclusion = document.querySelector('#ea-conclusion') ? creerConclusionRendu(gl, compiler, POSITIONS_APPRENTISSAGE, POSITIONS_EXPERIENCE) : null;
    const experience = document.querySelector('#ea-experience') ? creerExperienceRendu(gl, compiler, POSITIONS_APPRENTISSAGE) : null;
    const apprentissage = document.querySelector('#ea-learning') ? creerApprentissageRendu(gl, compiler, experience) : null;
    const VS = `#version 300 es
    precision highp float;
    in vec4 aOrigin,aFrom,aMeta;
    uniform mat4 uP;
    uniform vec3 uCamera;
    uniform vec2 uAngles;
    uniform float uWords,uReplay,uReplayActive,uDpr,uMobile,uCourt,uPortraitCourt;
    uniform int uExample,uAtlasWidth,uAtlasRows;
    uniform float uCounts[6],uSelection[6];
    uniform float uFeatureWeights[96];
    uniform highp sampler2D uAtlas;
    out vec4 vPose; out float vAlpha,vSeed,vGroup,vWords;
    ${POSITIONS_APPRENTISSAGE}
    ${POSITIONS_EXPERIENCE}
    ${POSITIONS_CONCLUSION}
    float s(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
    vec3 melangerPose(vec3 a,vec3 b,float t){return t<=0.?a:(t>=1.?b:mix(a,b,t));}
    vec4 cible(int exemple,bool resultat){
        int bloc=int(uMobile)*12+exemple*2+(resultat?1:0);
        return texelFetch(uAtlas,ivec2(gl_VertexID%uAtlasWidth,gl_VertexID/uAtlasWidth+bloc*uAtlasRows),0);
    }
    vec3 parcours(float p,int exemple){
        vec4 phrase=cible(exemple,false),fin=cible(exemple,true);
        float seed=aMeta.y;
        float angle=seed*62.83185+float(gl_VertexID%31)*2.39996;
        float yy=fract(seed*13.71+float(gl_VertexID)*.61803)*2.-1.;
        float rr=sqrt(max(0.,1.-yy*yy));
        vec3 sphere=vec3(cos(angle)*rr,yy,sin(angle)*rr)*1.25;
        sphere*=1.+.018*sin(p*45.+seed*8.);
        sphere+=vec3(0.,.6,-100.);
        vec3 pos=melangerPose(aOrigin.xyz,sphere,s(0.,.16,p));
        float formation=s(.15,.34,p);
        vec3 courbe=vec3(sin(seed*15.),cos(seed*11.),sin(seed*7.))*sin(formation*3.14159265)*.65;
        pos=melangerPose(pos,phrase.xyz,formation)+courbe;
        float separation=s(.33,.48,p),mot=phrase.w;
        vec3 mots=phrase.xyz+vec3((mot-(uCounts[exemple]-1.)*.5)*mix(.19,.085,uMobile),
            sin(mot*2.1)*.22, -mod(mot,3.)*.5)*separation;
        pos=melangerPose(pos,mots,s(.32,.4,p));
        float colonnes=mix(min(10.,uCounts[exemple]),min(4.,uCounts[exemple]),uMobile);
        vec3 cellule=vec3((mod(mot,colonnes)-(colonnes-1.)*.5)*mix(.9,.82,uMobile),
            .9-floor(mot/colonnes)*.85,-105.);
        vec3 unite=vec3(fract(seed*7.1)-.5,fract(seed*11.7)-.5,fract(seed*19.3)-.5)*vec3(.48,.54,.5);
        float poids=uFeatureWeights[exemple*16+int(mot)];
        unite.y=(unite.y+.27)*(.12+poids)-.27;
        vec3 donnees=cellule+unite;
        pos=melangerPose(pos,donnees,s(.45,.59,p));
        float flux=s(.56,.75,p);
        vec3 classification=mix(donnees,vec3((mod(mot,5.)-2.)*.68,sin(mot*1.6)*.7,-110.)+unite,flux);
        classification.x+=sin(flux*3.14159265)*sin(mot*1.7)*.65;
        pos=melangerPose(pos,classification,s(.55,.64,p));
        // La matière numérique devient le résultat ; un cinquième des grains garde la phrase au-dessus.
        if(uPortraitCourt>.5 && fin.w>.5){fin.xy=(fin.xy-vec2(0.,2.15))*.78+vec2(0.,1.5);}
        if(uCourt>.5){
            if(fin.w>.5)fin.xy=(fin.xy-vec2(0.,mix(2.35,2.15,uMobile)))*.65+vec2(0.,1.45);
            else fin.xy=(fin.xy-vec2(0.,.25))*.85+vec2(0.,-.55);
        }
        pos=melangerPose(pos,fin.xyz,s(.73,.88,p));
        return pos;
    }
    void main(){
        float p=uWords;
        vec3 monde=parcours(p,0);
        float alpha=p>=.29?.86:mix(aOrigin.w,.86,s(.10,.29,p));
        float interact=s(.84,.9,p)*uReplayActive;
        if(interact>0.){
            float q=.20+.68*s(0.,1.,uReplay);
            vec3 destination=parcours(q,uExample);
            float reprise=s(0.,.28,uReplay);
            vec3 repriseCourbe=vec3(sin(aMeta.y*15.),cos(aMeta.y*11.),sin(aMeta.y*7.))*sin(reprise*3.14159265)*.3;
            vec3 rejoue=melangerPose(aFrom.xyz,destination,reprise)+repriseCourbe;
            monde=melangerPose(monde,rejoue,interact);
            float alphaReprise=reprise<=0.?aFrom.w:mix(aFrom.w,.86,reprise);
            alpha=interact>=1.?alphaReprise:mix(alpha,alphaReprise,interact);
        }
        if(uLearning>0.){
            vec3 cibleApprentissage=apprendrePosition(float(gl_VertexID),aMeta.y,uLearning);
            monde=melangerPose(monde,cibleApprentissage,douceur(0.,.15,uLearning));
            alpha=mix(alpha,.12,douceur(.04,.17,uLearning));
            alpha=mix(alpha,.52,douceur(.86,1.,uLearning));
        }
        if(uExperience>0.){
            monde=particuleExperience(float(gl_VertexID),aMeta.y,uExperience);
            float energie=mix(.52,.09,douceur(0.,.19,uExperience));
            energie=mix(energie,.38,douceur(.92,1.,uExperience));
            alpha=energie*presenceMessage(mod(float(gl_VertexID),8.),uExperience);
        }
        if(uFinal>0.){
            monde=conclureParticule(float(gl_VertexID),aMeta.y,monde,uFinal);
            alpha=mix(alpha,.3,douceur(0.,.17,uFinal));
        }
        vPose=vec4(monde,alpha);
        vec3 v=monde-uCamera;
        float cy=cos(uAngles.x),sy=sin(uAngles.x),cx=cos(uAngles.y),sx=sin(uAngles.y);
        v=vec3(cy*v.x-sy*v.z,v.y,sy*v.x+cy*v.z);
        v=vec3(v.x,cx*v.y-sx*v.z,sx*v.y+cx*v.z);
        gl_Position=uP*vec4(v,1.);
        float profondeur=clamp(12./max(-v.z,.3),.25,3.5);
        float original=(4.2+uSelection[int(aMeta.x)]*2.2)*uDpr*profondeur;
        float typographie=(1.15+aMeta.y*.5)*uDpr*clamp(18./max(-v.z,.3),.55,1.5);
        gl_PointSize=p>=.31?typographie:mix(original,typographie,s(.12,.31,p));
        gl_PointSize=mix(gl_PointSize,1.35*uDpr,douceur(0.,.15,uLearning));
        vAlpha=alpha*s(.1,.8,-v.z);
        vSeed=aMeta.y;vGroup=aMeta.x;vWords=p;
    }`;
    const FS = `#version 300 es
    precision highp float;
    in float vAlpha,vSeed,vGroup,vWords;
    uniform float uClair;
    out vec4 o;
    void main(){
        float r2=dot(gl_PointCoord*2.-1.,gl_PointCoord*2.-1.);if(r2>1.)discard;
        vec3 or=mix(vec3(.96,.76,.4),vec3(.45,.27,.09),uClair);
        float signature=sin(18.+vGroup*2.+vSeed*11.)*.1+.9;
        vec3 couleur=or*mix(signature,.88+vSeed*.14,smoothstep(0.,.25,vWords));
        float alpha=vAlpha*.72*pow(1.-r2,.35);
        o=vec4(couleur*alpha,alpha);
    }`;
    const pr = compiler(gl, VS, FS, ['vPose']);
    const buffers = [], vaos = [];
    const origine = gl.createBuffer(); buffers.push(origine);
    gl.bindBuffer(gl.ARRAY_BUFFER, origine); gl.bufferData(gl.ARRAY_BUFFER, nombre * 16, gl.DYNAMIC_COPY);
    const reprises = [gl.createBuffer(), gl.createBuffer()]; buffers.push(...reprises);
    reprises.forEach(b => { gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,nombre*16,gl.DYNAMIC_COPY); });
    const vao = gl.createVertexArray(); vaos.push(vao); gl.bindVertexArray(vao);
    function lier(nom, tampon) {
        gl.bindBuffer(gl.ARRAY_BUFFER, tampon); const l=gl.getAttribLocation(pr.p,nom);
        gl.enableVertexAttribArray(l);gl.vertexAttribPointer(l,4,gl.FLOAT,false,0,0);
    }
    lier('aOrigin', origine);lier('aFrom',reprises[0]);
    const bMeta=gl.createBuffer();buffers.push(bMeta);gl.bindBuffer(gl.ARRAY_BUFFER,bMeta);gl.bufferData(gl.ARRAY_BUFFER,meta,gl.STATIC_DRAW);lier('aMeta',bMeta);
    const feedback=gl.createTransformFeedback();let indexReprise=0;
    const VS_STRUCTURE=`#version 300 es
        in vec3 aPos;uniform mat4 uP;uniform vec3 uCamera;uniform vec2 uAngles;
        void main(){vec3 v=aPos-uCamera;
        float cy=cos(uAngles.x),sy=sin(uAngles.x),cx=cos(uAngles.y),sx=sin(uAngles.y);
        v=vec3(cy*v.x-sy*v.z,v.y,sy*v.x+cy*v.z);v=vec3(v.x,cx*v.y-sx*v.z,sx*v.y+cx*v.z);
        gl_Position=uP*vec4(v,1.);}`;
    const FS_STRUCTURE=`#version 300 es
        precision highp float;uniform float uOpacite,uClair;out vec4 o;
        void main(){vec3 c=mix(vec3(.9,.72,.4),vec3(.32,.2,.05),uClair);o=vec4(c*uOpacite,uOpacite);}`;
    const structure=compiler(gl,VS_STRUCTURE,FS_STRUCTURE);
    const contours=[];
    for(let k=0;k<3;k++){
        const z=-104-k*2.1,w=2.9-k*.25,h=1.2;
        const sommets=[[-w,-h,z],[w,-h,z],[w,h,z],[-w,h,z]];
        for(let j=0;j<4;j++)contours.push(...sommets[j],...sommets[(j+1)%4]);
    }
    const vaoStructure=gl.createVertexArray();vaos.push(vaoStructure);gl.bindVertexArray(vaoStructure);
    const bs=gl.createBuffer();buffers.push(bs);gl.bindBuffer(gl.ARRAY_BUFFER,bs);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(contours),gl.STATIC_DRAW);
    const ls=gl.getAttribLocation(structure.p,'aPos');gl.enableVertexAttribArray(ls);gl.vertexAttribPointer(ls,3,gl.FLOAT,false,0,0);
    const comptes=Float32Array.from(atlas.mots);
    return {
        origine,
        rendre({ progression:p, exemple=0, replay=1, replayActif=false, apprentissage:etatApprentissage, experience:etatExperience, conclusion:etatConclusion }, { projection,camera,angles,dpr,W,H,clair,selections }) {
            gl.useProgram(pr.p);gl.bindVertexArray(vao);
            gl.uniformMatrix4fv(pr.u.uP,false,projection);gl.uniform3fv(pr.u.uCamera,camera);gl.uniform2fv(pr.u.uAngles,angles);
            gl.uniform1f(pr.u.uWords,p);gl.uniform1f(pr.u.uReplay,replay);gl.uniform1f(pr.u.uReplayActive,replayActif?1:0);
            gl.uniform1f(pr.u.uLearning,etatApprentissage?.progression || 0);
            gl.uniform1f(pr.u.uComponent,etatApprentissage?.composante || 0);
            gl.uniform1f(pr.u.uExperience,0);
            if(etatExperience)experience.uniformes(pr,etatExperience,{projection,camera,angles,W,H,clair});
            gl.uniform1f(pr.u.uFinal,0);
            conclusion?.uniformes(pr,etatConclusion,{W,H});
            gl.uniform1f(pr.u.uMobile,W<700?1:0);gl.uniform1f(pr.u.uCourt,H<600?1:0);
            gl.uniform1f(pr.u.uPortraitCourt,H<760&&W<700?1:0);
            gl.uniform1f(pr.u.uDpr,dpr);gl.uniform1f(pr.u.uClair,clair);gl.uniform1i(pr.u.uExample,exemple);
            gl.uniform1fv(pr.u['uCounts[0]'],comptes);gl.uniform1fv(pr.u['uSelection[0]'],selections);
            gl.uniform1fv(pr.u['uFeatureWeights[0]'],poidsMots);
            gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,atlas.texture);
            gl.uniform1i(pr.u.uAtlas,0);gl.uniform1i(pr.u.uAtlasWidth,atlas.largeur);gl.uniform1i(pr.u.uAtlasRows,atlas.lignes);
            gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
            gl.drawArrays(gl.POINTS,0,nombre);
            const s=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
            const q=replayActif&&p>.9?.20+.68*s(0,1,replay):p;
            const opacite=s(.39,.54,q)*(1-s(.70,.81,q))*.17;
            gl.useProgram(structure.p);gl.bindVertexArray(vaoStructure);
            gl.uniformMatrix4fv(structure.u.uP,false,projection);gl.uniform3fv(structure.u.uCamera,camera);gl.uniform2fv(structure.u.uAngles,angles);
            gl.uniform1f(structure.u.uClair,clair);gl.uniform1f(structure.u.uOpacite,opacite);
            if(opacite>.001)gl.drawArrays(gl.LINES,0,contours.length/3);
            gl.bindVertexArray(null);gl.depthMask(true);
            apprentissage?.rendre(etatApprentissage,{projection,camera,angles,W,H,clair},etatExperience);
            experience?.rendre(etatExperience,{projection,camera,angles,W,H,clair},etatConclusion);
            conclusion?.rendre(etatConclusion,{projection,camera,angles,W,H,clair});
        },
        capturerPose() {
            // Ping-pong GPU : aucune lecture CPU, la nouvelle animation repart de la pose réellement affichée.
            const cible=1-indexReprise;
            gl.useProgram(pr.p);gl.bindVertexArray(vao);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);
            gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,reprises[cible]);gl.enable(gl.RASTERIZER_DISCARD);
            gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,nombre);gl.endTransformFeedback();
            gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
            indexReprise=cible;lier('aFrom',reprises[indexReprise]);gl.bindVertexArray(null);
            return true;
        },
        detruire(){conclusion?.detruire();experience?.detruire();apprentissage?.detruire();buffers.forEach(b=>gl.deleteBuffer(b));vaos.forEach(v=>gl.deleteVertexArray(v));gl.deleteTransformFeedback(feedback);gl.deleteTexture(atlas.texture);gl.deleteProgram(pr.p);gl.deleteProgram(structure.p);},
    };
}
