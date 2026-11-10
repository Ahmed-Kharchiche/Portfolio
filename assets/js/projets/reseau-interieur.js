import { creerLangageRendu } from './langage-rendu.js';

/** Scène 3 : même contexte WebGL2 que le sablier, aucun canvas ou RAF supplémentaire. */
export const lisser = (a, b, p) => {
    const t = Math.max(0, Math.min(1, (p - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

export function projeterConstellations(p, W, H) {
    const mobile = W < 700, court = H < 600 && !mobile, portraitCourt = mobile && H < 760;
    const avance = lisser(0, .88, p), excursion = Math.sin(Math.PI * avance);
    const x = Math.sin(avance * Math.PI * 2) * excursion * (mobile ? .38 : 1.2);
    const y = Math.sin(avance * Math.PI * 1.3) * excursion * .65, z = -79 * avance;
    const yaw = Math.sin(avance * Math.PI * 2) * excursion * .045, pitch = Math.sin(avance * Math.PI) * .018;
    const focale = H / (2 * Math.tan((28 + 12 * lisser(.08, .42, p)) * Math.PI / 360));
    return Array.from({ length: 6 }, (_, g) => {
        const xx = (mobile ? (g % 2 - .5) * 3.3 : (g % 3 - 1) * 11 / 2) - x;
        const yy = (mobile ? (1 - Math.floor(g / 2)) * (portraitCourt ? 1.35 : 1.65) + (portraitCourt ? .3 : .6) : court ? g < 3 ? .9 : -1.2 : g < 3 ? 1.7 : -1.3) - y - (mobile ? portraitCourt ? .65 : .85 : court ? 1 : 1.4);
        const zz = (mobile ? -99 : -97) - z;
        const rx = Math.cos(yaw) * xx - Math.sin(yaw) * zz, rz = Math.sin(yaw) * xx + Math.cos(yaw) * zz;
        const ry = Math.cos(pitch) * yy - Math.sin(pitch) * rz, depth = -(Math.sin(pitch) * yy + Math.cos(pitch) * rz);
        return [W / 2 + rx * focale / depth, H / 2 - ry * focale / depth];
    });
}

export function creerInterieur(gl, visage, aleas, leger, compilerProgramme) {
    let seed = 30172;
    const hasard = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    const n = visage.pos.length / 3, nombre = leger ? 288 : 624;
    const tunnel = new Float32Array(n * 3), groupes = new Float32Array(n * 3), meta = new Float32Array(n * 4);
    const retenus = new Set(Array.from({ length: nombre }, (_, i) => Math.floor(i * n / nombre)));
    const indices = [...retenus];
    for (let i = 0; i < n; i++) {
        const g = i % 6, z = -12 - hasard() * 78, angle = hasard() * Math.PI * 2;
        const r = 2.4 + Math.pow(hasard(), .65) * 7.5;
        tunnel.set([Math.cos(angle) * r + Math.sin(z * .09) * 1.2,
            Math.sin(angle) * r * .73 + Math.cos(z * .06) * .8, z], i * 3);
        const a = hasard() * Math.PI * 2, rr = Math.pow(hasard(), .55) * 1.5;
        groupes.set([Math.cos(a) * rr, Math.sin(a) * rr * .72, (hasard() - .5) * 2.3], i * 3);
        meta.set([g, aleas[i * 4 + 2] || hasard(), aleas[i * 4] || 1, retenus.has(i) ? 1 : 0], i * 4);
    }
    indices.forEach((i, k) => { meta[i * 4] = k % 6; });
    // Voisins locaux dans chaque famille ; quelques passerelles relient les couches.
    const liens = [];
    indices.forEach((i, k) => {
        const voisins = indices.filter(j => j !== i).map(j => {
            const a = i * 3, b = j * 3;
            const d = (tunnel[a] - tunnel[b]) ** 2 + (tunnel[a + 1] - tunnel[b + 1]) ** 2
                + (tunnel[a + 2] - tunnel[b + 2]) ** 2;
            return { j, d, memeGroupe: meta[i * 4] === meta[j * 4] };
        }).sort((a, b) => a.d - b.d);
        voisins.filter(v => v.memeGroupe).slice(0, 3).forEach(({ j }) => { if (j > i) liens.push([i, j]); });
        if (k % 4 === 0 && voisins[0]) liens.push([i, voisins[0].j]);
    });
    const VS = `#version 300 es
    precision highp float;
    in vec3 aFace,aTunnel,aCluster,aOtherFace,aOtherTunnel,aOtherCluster;
    in vec4 aMeta; in float aAlong,aOtherGroup;
    uniform mat4 uP; uniform float uProgress,uKind,uDpr,uFaceScale,uMobile,uCourt,uPortraitCourt;
    uniform vec3 uFaceCentre,uCamera; uniform vec2 uAngles;
    uniform float uSelection[6];
    out float vAlpha; out float vGroup; out float vRelief; out float vSeed;
    out vec4 vPose;
    float s(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}
    vec3 centre(float g){
        vec3 desktop=vec3((mod(g,3.)-1.)*5.5, g<3.?1.7:-1.3,-97.);
        desktop.y=mix(desktop.y,g<3.?.9:-1.2,uCourt);
        vec3 mobile=vec3((mod(g,2.)-.5)*3.3,(1.-floor(g/2.))*mix(1.65,1.35,uPortraitCourt)+mix(.6,.3,uPortraitCourt),-99.);
        return mix(desktop,mobile,uMobile);
    }
    vec3 positionNoeud(vec3 face,vec3 reseau,vec3 groupe,float g){
        vec2 q=vec2((abs(face.x)-.22)/.17,(face.y+.435)/.16);
        face.y+=.10*exp(-dot(q,q));
        vec3 initial=uFaceCentre+face*uFaceScale;
        float organisation=s(.44,.71,uProgress);
        float rythme=g<.5?21.:(g<1.5?10.:(g<2.5?32.:(g<3.5?26.:16.)));
        float activite=g>4.5?0.:sin(uProgress*rythme+groupe.z*1.5)*.028;
        vec3 mouvement=groupe*(1.+activite)*mix(.85,.6,uMobile)*mix(1.,.65,uCourt)*mix(1.,.75,uPortraitCourt);
        if(g>.5&&g<1.5)mouvement.y-=.06*sin(uProgress*10.+groupe.x);
        vec3 fin=centre(g)+mouvement;
        // La même géométrie quitte le visage, devient le tunnel puis les six constellations.
        vec3 monde=mix(initial,reseau,s(.13,.37,uProgress));
        monde=mix(monde,fin,organisation);
        return monde;
    }
    void main(){
        float p=uProgress;
        vec3 monde=positionNoeud(aFace,aTunnel,aCluster,aMeta.x);
        float selection=uSelection[int(aMeta.x)];
        if(uKind>1.5){
            float phase=fract(p*7.0+aAlong);
            float voyage=phase*phase*(3.-2.*phase);
            vec3 autre=positionNoeud(aOtherFace,aOtherTunnel,aOtherCluster,aOtherGroup);
            monde=mix(monde,autre,voyage);
            vAlpha=pow(sin(phase*3.14159265),.7)*s(.12,.3,p);
        }else vAlpha=1.;
        vec3 v=monde-uCamera;
        float cy=cos(uAngles.x),sy=sin(uAngles.x),cx=cos(uAngles.y),sx=sin(uAngles.y);
        v=vec3(cy*v.x-sy*v.z,v.y,sy*v.x+cy*v.z);
        v=vec3(v.x,cx*v.y-sx*v.z,sx*v.y+cx*v.z);
        gl_Position=uP*vec4(v,1.);
        float profondeur=clamp(12./max(-v.z,.3),.25,3.5);
        float tailleVisage=(1.15+aMeta.z*.65)*uDpr;
        float tailleReseau=(4.2+selection*2.2)*uDpr*profondeur;
        gl_PointSize=clamp(mix(tailleVisage,tailleReseau,s(.08,.3,p)),1.,16.*uDpr);
        if(uKind>1.5)gl_PointSize=clamp(5.*uDpr*profondeur,2.,15.*uDpr);
        float garder=mix(1.,aMeta.w,s(.16,.36,p));
        if(uKind<.5)vAlpha*=garder;
        else vAlpha*=s(.04,.24,p)*mix(1.,.035,s(.44,.71,p)*step(.5,abs(aMeta.x-aOtherGroup)));
        float classification=s(.70,.87,p);
        vAlpha*=mix(1.,.34+.66*selection,classification);
        vAlpha*=smoothstep(.1,.8,-v.z)*exp(-max(-v.z-18.,0.)*.013);
        vGroup=aMeta.x; vRelief=clamp((aFace.z-.1)*1.8,0.,1.); vSeed=aMeta.y;
        vPose=vec4(monde,vAlpha);
    }`;
    const FS = `#version 300 es
    precision highp float;
    in float vAlpha,vGroup,vRelief,vSeed;
    uniform float uKind,uProgress,uClair; uniform vec3 uAccent,uSable;
    out vec4 o;
    void main(){
        float a=vAlpha;
        vec3 col=mix(uAccent,uSable,.25+vSeed*.16)*(.85+vRelief*.55);
        col=mix(col,vec3(.10,.17,.14)+uAccent*.30,uClair*.65);
        vec3 or=mix(vec3(.96,.76,.4),vec3(.45,.27,.09),uClair);
        float signature=sin(uProgress*(18.+vGroup*2.)+vSeed*11.)*.1+.9;
        col=mix(col,or*signature,s(.0,.25,uProgress));
        if(uKind<.5){
            float r2=dot(gl_PointCoord*2.-1.,gl_PointCoord*2.-1.);
            if(r2>1.)discard;
            a*=.72*pow(1.-r2,.35);
        }else if(uKind>1.5){
            float r=length(gl_PointCoord*2.-1.); if(r>1.)discard;
            a*=pow(1.-r,1.7); col*=1.7;
        }else{a*=.17;}
        o=vec4(col*a,a);
    }
    float s(float a,float b,float x){float t=clamp((x-a)/(b-a),0.,1.);return t*t*(3.-2.*t);}`;
    // GLSL ES exige la déclaration de la fonction avant son premier appel.
    const fragment = FS.replace('    void main(){', '    float s(float a,float b,float x);\n    void main(){');
    const pr = compilerProgramme(gl, VS, fragment, ['vPose']);
    const buffers = [], vaos = [];
    function creerLot(paires, mode) {
        const vao = gl.createVertexArray(); vaos.push(vao); gl.bindVertexArray(vao);
        const attributs = {
            aFace: [3, visage.pos], aTunnel: [3, tunnel], aCluster: [3, groupes], aMeta: [4, meta],
            aOtherFace: [3, visage.pos], aOtherTunnel: [3, tunnel], aOtherCluster: [3, groupes],
        };
        for (const [nom, [taille, source]] of Object.entries(attributs)) {
            const data = new Float32Array(paires.length * taille), autre = nom.startsWith('aOther');
            paires.forEach(([i, j], k) => data.set(source.subarray((autre ? j : i) * taille, (autre ? j : i) * taille + taille), k * taille));
            const b = gl.createBuffer(); buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
            const l = gl.getAttribLocation(pr.p, nom); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, taille, gl.FLOAT, false, 0, 0);
        }
        const data = Float32Array.from(paires, ([i], k) => mode === 2 ? ((i * .618033 + k * .17) % 1) : 0);
        const b = gl.createBuffer(); buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
        const l = gl.getAttribLocation(pr.p, 'aAlong'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 1, gl.FLOAT, false, 0, 0);
        const bg = gl.createBuffer(); buffers.push(bg); gl.bindBuffer(gl.ARRAY_BUFFER, bg);
        gl.bufferData(gl.ARRAY_BUFFER, Float32Array.from(paires, ([, j]) => meta[j * 4]), gl.STATIC_DRAW);
        const lg = gl.getAttribLocation(pr.p, 'aOtherGroup'); gl.enableVertexAttribArray(lg); gl.vertexAttribPointer(lg, 1, gl.FLOAT, false, 0, 0);
        return { vao, n: paires.length };
    }
    const points = creerLot(Array.from({ length: n }, (_, i) => [i, i]), 0);
    const lignes = creerLot(liens.flatMap(([i, j]) => [[i, j], [j, i]]), 1);
    const impulsions = creerLot(liens.filter((_, i) => i % 3 === 0), 2);
    const camera = new Float32Array(3), angles = new Float32Array(2), projection = new Float32Array(16);
    const selections = new Float32Array(6);
    const feedback = gl.createTransformFeedback();
    let langageRendu = null, langageActif = false, derniereLargeur = 0, derniereHauteur = 0, detruit = false;
    const preparerLangage = () => { if (!detruit && !langageRendu && document.getElementById('ea-words')) langageRendu = creerLangageRendu(gl, n, meta, compilerProgramme); };
    const tache = typeof requestIdleCallback === 'function' ? requestIdleCallback(preparerLangage) : setTimeout(preparerLangage, 0);
    return {
        rendre({ progression, selection, langage, faceCentre, faceEchelle, W, H, dpr, clair, accent, sable }) {
            // Même précision pour la trajectoire CPU et la progression transmise au shader.
            const mots = Math.fround(langage?.progression || 0), p = mots > 0 ? 1 : progression;
            // Une courbe analytique continue, sans intégration temporelle ni seuil de caméra.
            const avance = lisser(0, .88, p);
            const excursion = Math.sin(Math.PI * avance);
            camera[0] = Math.sin(avance * Math.PI * 2) * excursion * (W < 700 ? .38 : 1.2);
            camera[1] = Math.sin(avance * Math.PI * 1.3) * excursion * .65;
            const approche = lisser(0, .15, p) * (1 - lisser(.18, .42, p));
            camera[0] += faceCentre[0] * approche;
            camera[1] += faceCentre[1] * approche;
            camera[2] = -79 * avance;
            angles[0] = Math.sin(avance * Math.PI * 2) * excursion * .045;
            angles[1] = Math.sin(avance * Math.PI) * .018;
            if (mots > 0) {
                const derive = Math.sin(mots * Math.PI) ** 2;
                camera[0] = derive * .55;
                camera[1] = derive * Math.sin(mots * Math.PI * 2) * .16;
                camera[2] = -79 + derive * .7 - 6 * lisser(.13,.85,mots);
                angles[0] = derive * Math.sin(mots * Math.PI * 2) * .022;
                angles[1] = derive * .008;
            }
            const apprentissage = langage?.apprentissage?.progression || 0;
            if (apprentissage > 0) {
                const courbe = Math.sin(apprentissage * Math.PI) ** 2;
                camera[0] = courbe * (W < 700 ? .25 : .8);
                camera[1] = courbe * Math.sin(apprentissage * Math.PI * 2) * .35;
                camera[2] = -85 + (W < 700 ? 2 : 4) * courbe - 2 * lisser(.4,1,apprentissage);
                angles[0] = courbe * Math.sin(apprentissage * Math.PI * 2) * .025;
                angles[1] = courbe * .012;
            }
            const experience = langage?.experience?.progression || 0;
            if (experience > 0) {
                const courbe = Math.sin(experience * Math.PI) ** 2;
                camera[0] = Math.sin(experience * Math.PI * 2) * courbe * (W < 700 ? .2 : .7);
                camera[1] = courbe * .16;
                camera[2] = -87 + 3 * lisser(0,.35,experience) - 2 * lisser(.35,.75,experience) + 3 * lisser(.92,1,experience);
                angles[0] = Math.sin(experience * Math.PI * 2) * courbe * .02;
                angles[1] = courbe * .005;
            }
            const conclusion = langage?.conclusion?.progression || 0;
            if (conclusion > 0) {
                const orbite = Math.sin(Math.PI*lisser(.12,.65,conclusion)) ** 2;
                camera[0] = orbite*1.6+.35*lisser(.53,.85,conclusion);
                camera[1] = orbite*.2;
                camera[2] = -83+3*lisser(0,.2,conclusion)-3*lisser(.33,.52,conclusion)-lisser(.6,.9,conclusion);
                angles[0] = orbite*.045+.012*lisser(.53,.85,conclusion);
                angles[1] = orbite*.008;
            }
            const fov = (28 + 12 * lisser(.08, .42, p)) * Math.PI / 180;
            const f = 1 / Math.tan(fov / 2), near = .12, far = 150;
            projection.fill(0); projection[0] = f / (W / H); projection[5] = f;
            projection[10] = (far + near) / (near - far); projection[11] = -1;
            projection[14] = 2 * far * near / (near - far);
            for (let i = 0; i < 6; i++) selections[i] = selection?.[i] ?? (i === 0 ? 1 : 0);
            gl.useProgram(pr.p); gl.disable(gl.CULL_FACE); gl.enable(gl.DEPTH_TEST); gl.depthMask(false);
            gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.uniformMatrix4fv(pr.u.uP, false, projection); gl.uniform3fv(pr.u.uCamera, camera); gl.uniform2fv(pr.u.uAngles, angles);
            gl.uniform3fv(pr.u.uFaceCentre, faceCentre); gl.uniform1f(pr.u.uFaceScale, faceEchelle);
            gl.uniform1f(pr.u.uProgress, p); gl.uniform1f(pr.u.uDpr, dpr); gl.uniform1f(pr.u.uMobile, W < 700 ? 1 : 0);
            gl.uniform1f(pr.u.uCourt, H < 600 && W >= 700 ? 1 : 0);
            gl.uniform1f(pr.u.uPortraitCourt, H < 760 && W < 700 ? 1 : 0);
            gl.uniform1fv(pr.u['uSelection[0]'], selections); gl.uniform1f(pr.u.uClair, clair);
            gl.uniform3fv(pr.u.uAccent, accent); gl.uniform3fv(pr.u.uSable, sable);
            if (mots > 0) {
                preparerLangage();
                if (!langageActif || W !== derniereLargeur || H !== derniereHauteur) {
                    // Capturer la vraie fin de scène 3, avant le déplacement de caméra de scène 4.
                    const origineCamera = Float32Array.of(0,0,-79), origineAngles = Float32Array.of(0,0);
                    gl.uniform3fv(pr.u.uCamera,origineCamera);gl.uniform2fv(pr.u.uAngles,origineAngles);
                    gl.uniform1f(pr.u.uKind,0);gl.bindVertexArray(points.vao);
                    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,feedback);
                    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,langageRendu.origine);gl.enable(gl.RASTERIZER_DISCARD);
                    gl.beginTransformFeedback(gl.POINTS);gl.drawArrays(gl.POINTS,0,n);gl.endTransformFeedback();
                    gl.disable(gl.RASTERIZER_DISCARD);gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER,0,null);gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK,null);
                    derniereLargeur=W;derniereHauteur=H;
                }
                langageActif=true;
                langageRendu.rendre(langage,{projection,camera,angles,dpr,W,H,clair,selections});
                return;
            }
            langageActif=false;
            for (const [lot, kind] of [[lignes, 1], [points, 0], [impulsions, 2]]) {
                gl.uniform1f(pr.u.uKind, kind); gl.bindVertexArray(lot.vao);
                gl.drawArrays(kind === 1 ? gl.LINES : gl.POINTS, 0, lot.n);
            }
            gl.depthMask(true); gl.bindVertexArray(null);
        },
        capturerLangage: () => langageRendu?.capturerPose() || false,
        detruire() {
            detruit=true;
            if(typeof cancelIdleCallback==='function')cancelIdleCallback(tache);else clearTimeout(tache);
            langageRendu?.detruire();gl.deleteTransformFeedback(feedback);
            buffers.forEach(b => gl.deleteBuffer(b)); vaos.forEach(v => gl.deleteVertexArray(v)); gl.deleteProgram(pr.p);
        },
    };
}
