export const DONNEES_CONCLUSION = JSON.parse(document.querySelector('#ea-conclusion-donnees')?.textContent || 'null');

// La constellation est fournie par la scène 6 ; toutes les cibles restent dans son repère 3D.
export const POSITIONS_CONCLUSION = `
    uniform float uFinal,uFinalNarrow,uClassCount,uFinalAmbient;
    vec3 repereFinal(vec3 v,float p){
        v.y-=mix(0.,.65,uMobile)+mix(0.,2.2,uCourt);
        return v;
    }
    vec3 courbeConstellation(float t){
        float index=fract(t)*8.,f=fract(index),i=floor(index);
        vec3 a=constellationExperience(mod(i+7.,8.)),b=constellationExperience(i);
        vec3 c=constellationExperience(mod(i+1.,8.)),d=constellationExperience(mod(i+2.,8.));
        return .5*((2.*b)+(-a+c)*f+(2.*a-5.*b+4.*c-d)*f*f+(-a+3.*b-3.*c+d)*f*f*f);
    }
    vec3 spectreFinal(float t,float bande){
        float a=t*6.2831853,r=3.4+bande*.32;
        vec3 v=vec3(cos(a)*r,sin(a)*r*.72,sin(a+.5)*1.35+sin(a*2.)*.28);
        v.z+=bande*.32;
        return v+vec3(0.,.2,-110.);
    }
    vec3 rubanFinal(float t,float bande,float p){
        float a=t*6.2831853,phase=bande*.22;
        return vec3(sin(a+phase)*3.8,sin(a*2.+phase)*1.35+cos(a*3.+p*2.)*.17,
            cos(a+phase)*1.6+sin(a*3.+phase)*.35)+vec3(0.,.25,-110.);
    }
    vec3 sculptureFinale(float t,float bande){
        float a=t*6.2831853;
        float rayon=2.7+.20*sin(a*3.+.3)+bande*.09;
        vec3 v=vec3(cos(a)*rayon,sin(a)*rayon*.88,.5*sin(a*2.)+.18*cos(a*3.));
        if(bande>2.5)v=vec3(sin(a)*2.4,cos(a*2.+bande)*.52,sin(a*2.)*.7);
        v=vec3(.98*v.x+.19*v.z,v.y,-.19*v.x+.98*v.z);
        v*=mix(1.,.66,uFinalNarrow)*(1.+uFinalAmbient);
        return v+vec3(mix(5.2,0.,uFinalNarrow),mix(.35,2.2,uFinalNarrow),-110.);
    }
    vec3 cheminFinal(float t,float bande,float p){
        vec3 constellation=courbeConstellation(t);
        vec3 vaste=(constellation-vec3(0.,-.15,-110.))*1.65+vec3(0.,.15,-110.);
        vec3 pos=mix(constellation,vaste,douceur(0.,.14,p));
        pos=mix(pos,spectreFinal(t,bande),douceur(.12,.32,p));
        pos=mix(pos,rubanFinal(t,bande,p),douceur(.33,.51,p));
        pos=mix(pos,sculptureFinale(t,bande),douceur(.53,.75,p));
        return repereFinal(pos,p);
    }
    vec3 conclureParticule(float i,float seed,vec3 origine,float p){
        float groupe=mod(i,uClassCount),bande=mod(groupe,3.);
        float t=groupe/uClassCount;
        vec3 detail=vec3(sin(seed*57.),cos(seed*43.),sin(seed*37.))*.13;
        vec3 vaste=(origine-vec3(0.,-.15-.65*uMobile-2.2*uCourt,-110.))*1.65+vec3(0.,.15-.65*uMobile-2.2*uCourt,-110.);
        vec3 pos=mix(origine,vaste,douceur(0.,.14,p));
        vec3 spectre=repereFinal(spectreFinal(t,bande)+detail,p);
        pos=mix(pos,spectre,douceur(.12,.32,p));
        float parcours=fract(seed*17.1+i*.6180339);
        vec3 ruban=repereFinal(rubanFinal(parcours,bande,p)+detail*.55,p);
        pos=mix(pos,ruban,douceur(.33,.51,p));
        vec3 forme=repereFinal(sculptureFinale(parcours,mod(i,6.))+detail*.35,p);
        return mix(pos,forme,douceur(.53,.75,p));
    }
`;

export function creerConclusionRendu(gl, compiler, positionsApprentissage, positionsExperience) {
    const vs=`#version 300 es
        precision highp float;
        uniform mat4 uP;uniform vec3 uCamera;uniform vec2 uAngles;uniform float uMobile,uCourt;
        ${positionsApprentissage}
        ${positionsExperience}
        ${POSITIONS_CONCLUSION}
        out float vBord,vT,vBande,vAlpha;out vec3 vNormale,vVue;
        void main(){
            float t=float(gl_VertexID/2)/192.,cote=float(gl_VertexID%2)*2.-1.,bande=float(gl_InstanceID),p=uFinal;
            vec3 centre=cheminFinal(t,bande,p);
            vec3 tangent=normalize(cheminFinal(t+.002,bande,p)-cheminFinal(t-.002,bande,p));
            vec3 regard=normalize(uCamera-centre),travers=normalize(cross(tangent,regard));
            float largeur=mix(.026,.12,douceur(.32,.51,p));
            largeur*=1.+.2*sin(t*25.+bande*2.+p*7.);
            largeur*=mix(1.,.7,uFinalNarrow);
            if(bande>2.5)largeur*=.24;
            vec3 monde=centre+travers*cote*largeur;
            vec3 v=monde-uCamera;
            float cy=cos(uAngles.x),sy=sin(uAngles.x),cx=cos(uAngles.y),sx=sin(uAngles.y);
            v=vec3(cy*v.x-sy*v.z,v.y,sy*v.x+cy*v.z);v=vec3(v.x,cx*v.y-sx*v.z,sx*v.y+cx*v.z);
            gl_Position=uP*vec4(v,1.);
            vNormale=normalize(cross(tangent,travers)+travers*cote*.35);vVue=regard;
            vBord=cote;vT=t;vBande=bande;
            vAlpha=douceur(.025,.13,p)*mix(.23,.6,douceur(.33,.53,p));
            if(bande>2.5)vAlpha*=douceur(.37,.58,p)*.65;
        }`;
    const fs=`#version 300 es
        precision highp float;
        uniform float uClair,uFinal;
        in float vBord,vT,vBande,vAlpha;in vec3 vNormale,vVue;out vec4 o;
        void main(){
            float bord=1.-smoothstep(.55,1.,abs(vBord));
            vec3 n=normalize(vNormale),l=normalize(vec3(-.4,.8,1.));
            float reflet=pow(max(0.,dot(n,normalize(l+vVue))),24.);
            float relief=.65+.25*abs(dot(n,l));
            float impulsion=1.-smoothstep(.015,.065,abs(fract(vT-uFinal*1.8+vBande*.17)-.5));
            vec3 or=mix(vec3(.85,.64,.29),vec3(.39,.25,.08),uClair);
            vec3 c=or*relief+mix(vec3(.32,.27,.17),vec3(.12,.08,.03),uClair)*reflet;
            float alpha=vAlpha*bord*(.7+.25*reflet+.15*impulsion);
            o=vec4(c*alpha,alpha);
        }`;
    const programme=compiler(gl,vs,fs),vao=gl.createVertexArray();
    function uniformes(pr,etat,vue){
        const u=pr.u;
        gl.uniform1f(u.uFinal,etat?.progression||0);
        gl.uniform1f(u.uFinalAmbient,etat?.ambiance||0);
        gl.uniform1f(u.uFinalNarrow,vue.W<700||(vue.W<1000&&vue.H>=600)?1:0);
        gl.uniform1f(u.uClassCount,DONNEES_CONCLUSION.emotions.length);
    }
    return {
        uniformes,
        rendre(etat,vue){
            if(!etat||etat.progression<=0)return;
            const {p,u}=programme;gl.useProgram(p);gl.bindVertexArray(vao);
            gl.uniformMatrix4fv(u.uP,false,vue.projection);gl.uniform3fv(u.uCamera,vue.camera);gl.uniform2fv(u.uAngles,vue.angles);
            gl.uniform1f(u.uMobile,vue.W<700?1:0);gl.uniform1f(u.uCourt,vue.H<600?1:0);gl.uniform1f(u.uClair,vue.clair);
            uniformes(programme,etat,vue);
            gl.disable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,386,6);
            gl.bindVertexArray(null);gl.depthMask(true);
        },
        detruire(){gl.deleteProgram(programme.p);gl.deleteVertexArray(vao);},
    };
}
