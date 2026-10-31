import * as THREE from "three";

// #region UTILITAIRES ET CONSTANTES
const $ = (s) => document.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => Math.random() + Math.random() + Math.random() - 1.5;
const ease = { out: (t) => 1 - (1 - t) ** 3, inOut: (t) => (t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2), smooth: (t) => t * t * (3 - 2 * t) };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)); // amortissement indépendant du framerate
class Ressort { // vitesse + accélération : la valeur dépasse légèrement sa cible, puis revient à l'équilibre
    constructor(v = 0, k = 40, c = 7) { this.v = v; this.vel = 0; this.k = k; this.c = c; }
    pas(cible, dt) { this.vel += ((cible - this.v) * this.k - this.vel * this.c) * dt; this.v += this.vel * dt; return this.v; }
}
await Promise.race([document.fonts.load("700 100px Fraunces"), new Promise((r) => setTimeout(r, 1200))]).catch(() => {});

const PROJETS = window.projets || [];
const VIOLET = new THREE.Color(0x7C3AED), LAV = new THREE.Color(0xA78BFA), BLANC = new THREE.Color(0xFAFAFA);
const mobile = innerWidth < 700;
// #endregion

// #region RENDU
// aucun bloom : lisibilité d'abord
const renderer = new THREE.WebGLRenderer({ canvas: $("#scene"), antialias: true, powerPreference: "high-performance" });
let pr = Math.min(devicePixelRatio, 2);
renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x09090B);
scene.fog = new THREE.FogExp2(0x09090B, .014); // l'éloignement = obscurité
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, .1, 400);

const texHalo = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), d = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    d.addColorStop(0, "rgba(255,255,255,.9)"); d.addColorStop(.35, "rgba(255,255,255,.18)"); d.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = d; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
// #endregion

// #region CHAMP DE PARTICULES
// animé sur GPU
const NP = mobile ? 700 : 1600, fp = new Float32Array(NP * 3), fa = new Float32Array(NP * 2);
for (let i = 0; i < NP; i++) {
    const r = 8 + Math.pow(Math.random(), .6) * 110, th = rnd(0, 6.283), ph = Math.acos(rnd(-1, 1));
    fp.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * .7, r * Math.sin(ph) * Math.sin(th)], i * 3);
    fa[i * 2] = Math.random() < .03 ? rnd(4, 7) : rnd(.6, 2); // quelques grosses particules = points d'intérêt
    fa[i * 2 + 1] = Math.random();
}
const U = { uT: { value: 0 }, uBorn: { value: 0 }, uFoc: { value: 0 }, uPx: { value: pr }, uM: { value: new THREE.Vector3(0, 0, 1e4) } };
const champGeo = new THREE.BufferGeometry();
champGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3)); champGeo.setAttribute("aD", new THREE.BufferAttribute(fa, 2));
const champ = new THREE.Points(champGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: U,
    vertexShader: `attribute vec2 aD; uniform float uT, uBorn, uPx, uFoc; uniform vec3 uM; varying float vA, vP;
void main(){ vec3 p = position;
p += vec3(sin(uT * .15 + aD.y * 40.), cos(uT * .12 + aD.y * 25.), sin(uT * .1 + aD.y * 31.)) * (.6 + aD.x * .2); // respiration
vec3 d = p - uM; float r = length(d); // champ du visiteur : attire à moyenne distance, repousse de près
p += d / (r + .001) * (r < 4. ? 1.4 * (1. - r / 4.) : -.5 * exp(-(r - 4.) * .3)) * exp(-r * r * .004);
vec4 mv = modelViewMatrix * vec4(p, 1.); float tw = .75 + .25 * sin(uT * 1.3 + aD.y * 60.);
vA = smoothstep(aD.y, aD.y + .25, uBorn) * tw * (aD.x > 3. ? .5 : .26) * (1. - .65 * uFoc); vP = aD.y;
gl_PointSize = clamp(uPx * aD.x * 90. / -mv.z, 1.5, 26.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA, vP; void main(){ float a = smoothstep(.5, 0., length(gl_PointCoord - .5));
gl_FragColor = vec4(mix(vec3(.486, .227, .929), vec3(.655, .545, .98), vP), a * a * vA); }`
}));
champ.frustumCulled = false; scene.add(champ);
// #endregion

// #region NAISSANCE DU CORE
// particule, micro-particules, réseau
const noyau = new THREE.Mesh(new THREE.SphereGeometry(.1, 16, 16), new THREE.MeshBasicMaterial({ color: BLANC }));
const noyauHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: LAV, transparent: true, depthWrite: false, opacity: .45 }));
const NM = 14, mp = new Float32Array(NM * 3), mg = new THREE.BufferGeometry();
mg.setAttribute("position", new THREE.BufferAttribute(mp, 3));
const micro = new THREE.Points(mg, new THREE.PointsMaterial({ size: .05, color: LAV, transparent: true, opacity: .8 }));
micro.frustumCulled = false;
const reseau = (() => {
    const n = Array.from({ length: 60 }, () => new THREE.Vector3(gauss(), gauss() * .7, gauss()).multiplyScalar(4.5)), s = [];
    for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) if (n[i].distanceTo(n[j]) < 2.6 || Math.random() < .004) s.push(...n[i].toArray(), ...n[j].toArray());
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(s, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: LAV, transparent: true, opacity: 0 }));
})();
scene.add(noyau, noyauHalo, micro, reseau);

/* identité : texte réellement dans l'espace, avec profondeur (les particules passent devant ou derrière) */
const titre = (() => {
    const c = document.createElement("canvas"); c.width = 2048; c.height = 640;
    const g = c.getContext("2d"); g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#FAFAFA"; g.font = '700 150px Fraunces, Georgia, serif'; g.fillText("AHMED KHARCHICHE", 1024, 230);
    g.fillStyle = "#A78BFA"; g.font = '500 56px "Hanken Grotesk", sans-serif'; g.fillText("BUT INFORMATIQUE", 1024, 400);
    g.fillStyle = "#8b8b95"; g.font = '500 42px "Hanken Grotesk", sans-serif'; g.fillText("AI  /  SOFTWARE  /  WEB", 1024, 500);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(40, 12.5), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, alphaTest: .5, depthWrite: true, color: 0x000000 }));
    m.position.set(0, 3, -42); scene.add(m); return m;
})();
// #endregion

// #region ARTEFACTS
// un univers visuel par type de projet
const seg = (pts, color, op) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: op })); };
const FABRIQUES = {
    ia(o, a) { // noyau neuronal
        const n = Array.from({ length: 70 }, () => new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(1.5)), s = [];
        for (let i = 0; i < n.length; i++) for (let j = i + 1; j < n.length; j++) if (n[i].distanceTo(n[j]) < 1.5) s.push(...n[i].toArray(), ...n[j].toArray());
        const l = seg(s, LAV, .45), pg = new THREE.BufferGeometry(); pg.setFromPoints(n);
        const p = new THREE.Points(pg, new THREE.PointsMaterial({ size: .09, color: BLANC, transparent: true, opacity: .8 }));
        o.add(l, p); a.mats.push([l.material, .45], [p.material, .8]);
        return (t, dt) => { o.rotation.y += dt * .08; o.scale.setScalar(1 + .05 * Math.sin(t * .6 + a.ph)); };
    },
    java(o, a) { // architecture : étages qui coulissent légèrement
        const etages = [0, 1, 2, 3, 4].map((i) => {
            const m = seg(new THREE.EdgesGeometry(new THREE.BoxGeometry(2.6, .5, 1.6)).attributes.position.array, i % 2 ? LAV : VIOLET, .7);
            m.position.y = i * .72 - 1.4; o.add(m); a.mats.push([m.material, .7]); return m;
        });
        return (t) => etages.forEach((m, i) => (m.position.x = Math.sin(t * .35 + i * 1.3 + a.ph) * .25));
    },
    c(o, a) { // machine algorithmique : grille + chemin parcouru par à-coups
        const s = []; for (let i = -3; i <= 3; i++) s.push(i * .6, 0, -1.8, i * .6, 0, 1.8, -1.8, 0, i * .6, 1.8, 0, i * .6);
        const g = seg(s, VIOLET, .5), chemin = [[-1.8, 0, -1.8], [-1.8, 0, 0], [0, 0, 0], [0, 0, 1.2], [1.8, 0, 1.2], [1.8, 0, 1.8]].map((p) => new THREE.Vector3(...p));
        const r = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 8), new THREE.MeshBasicMaterial({ color: BLANC, transparent: true }));
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(chemin), new THREE.LineBasicMaterial({ color: LAV, transparent: true, opacity: .9 }));
        o.add(g, l, r); o.rotation.x = .5; a.mats.push([g.material, .5], [l.material, .9], [r.material, 1]);
        let u = 0;
        return (t, dt) => { u = (u + dt * .12 * Math.max(.05, Math.sin(t * .7 + a.ph) + .3)) % 1; const k = u * (chemin.length - 1), i = Math.floor(k); r.position.lerpVectors(chemin[i], chemin[Math.min(i + 1, chemin.length - 1)], ease.smooth(k - i)); };
    },
    web(o, a) { // structure numérique
        const m1 = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6, 1), new THREE.MeshBasicMaterial({ color: LAV, wireframe: true, transparent: true, opacity: .35 }));
        const m2 = new THREE.Mesh(new THREE.OctahedronGeometry(.8, 0), new THREE.MeshBasicMaterial({ color: BLANC, wireframe: true, transparent: true, opacity: .6 }));
        o.add(m1, m2); a.mats.push([m1.material, .35], [m2.material, .6]);
        return (t, dt) => { m1.rotation.y += dt * .05; m2.rotation.set(t * .15, -t * .2, 0); };
    }
};
const typeDe = (p) => {
    const k = (p.technologies.join(" ") + " " + p.titre).toLowerCase();
    return /python|scikit|machine|neur|\bia\b|\bai\b/.test(k) ? "ia" : /java/.test(k) ? "java" : /\bc\b|algo|graphe/.test(k) ? "c" : "web";
};

const arts = PROJETS.map((p, i) => {
    const a = { p, i, mats: [], ph: i * 1.9, near: 0, hov: 0, dim: 0, rate: .6 + (i % 3) * .35, energie: 0, mass: 1 + (i % 3) * .6,
        sH: new Ressort(0, 30, 6), sD: new Ressort(0, 18, 8), sRx: new Ressort(0, 14, 4), sRz: new Ressort(0, 14, 4), sE: new Ressort(1, 36, 5),
        off: new THREE.Vector3(), vel: new THREE.Vector3() }; // rythme propre à chaque projet
    const ang = (i / Math.max(PROJETS.length, 1)) * 6.283 + Math.sin(i * 12.9) * .4, r = 18 + (i % 3) * 9 + Math.abs(Math.sin(i * 7.1)) * 6;
    a.g = new THREE.Group(); a.g.position.set(Math.sin(ang) * r, Math.sin(i * 5.3) * 5, -Math.cos(ang) * r); a.base = a.g.position.clone(); a.pos = a.g.position;
    a.pivot = new THREE.Group(); a.obj = new THREE.Group(); a.pivot.add(a.obj); a.g.add(a.pivot);
    a.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: VIOLET, transparent: true, depthWrite: false, opacity: .2 })); a.halo.scale.setScalar(7); a.g.add(a.halo);
    a.update = FABRIQUES[typeDe(p)](a.obj, a);
    scene.add(a.g); return a;
});
// #endregion

// #region PHYSIQUE COMMUNE
// nœuds, liens, impulsions, essaim
const tw = new THREE.Vector3();
const noeudCore = { i: -1, core: true, pos: new THREE.Vector3(), energie: 0 };
const liens = [], impulsions = [];
arts.forEach((a, i) => { liens.push({ a: noeudCore, b: a, glow: 0 }); if (i) liens.push({ a: arts[i - 1], b: a, glow: 0 }); });
const lp = new Float32Array(liens.length * 6), lc = new Float32Array(liens.length * 6), lg = new THREE.BufferGeometry();
lg.setAttribute("position", new THREE.BufferAttribute(lp, 3)); lg.setAttribute("color", new THREE.BufferAttribute(lc, 3));
const liensMesh = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
liensMesh.frustumCulled = false; scene.add(liensMesh);

/* essaim : peu de particules, mais de vraies forces (orbite organique, gravité légère, bruit, friction, champ du visiteur) */
const NS = mobile ? 90 : 220, sp = new Float32Array(NS * 3), sv = new Float32Array(NS * 3), sh = new Uint8Array(NS), sph = new Float32Array(NS);
for (let i = 0; i < NS; i++) {
    sh[i] = arts.length ? i % (arts.length + 1) : 0; sph[i] = rnd(0, 6.283);
    const h = sh[i] ? arts[sh[i] - 1].pos : noeudCore.pos; sp.set([h.x + gauss() * 3, h.y + gauss() * 3, h.z + gauss() * 3], i * 3);
}
const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
const essaimPts = new THREE.Points(sg, new THREE.PointsMaterial({ size: .07, color: LAV, transparent: true, opacity: 0, depthWrite: false }));
essaimPts.frustumCulled = false; scene.add(essaimPts);

function essaimKick(c, e) { // une onde d'énergie pousse les particules proches
    for (let i = 0; i < NS; i++) {
        const a3 = i * 3, dx = sp[a3] - c.x, dy = sp[a3 + 1] - c.y, dz = sp[a3 + 2] - c.z, d = Math.hypot(dx, dy, dz) + .01;
        if (d < 9) { const f = e * 3 / (1 + d * .4) / d; sv[a3] += dx * f; sv[a3 + 1] += dy * f; sv[a3 + 2] += dz * f; }
    }
}
function essaim(dt, rev) {
    const ox = camera.position.x, oy = camera.position.y, oz = camera.position.z, rx = ray.x, ry = ray.y, rz = ray.z, fr = Math.exp(-(1.3 + (gel > 0 ? 14 : 0)) * dt);
    for (let i = 0; i < NS; i++) {
        const a3 = i * 3, h0 = sh[i] ? arts[sh[i] - 1] : noeudCore, h = plongee ? plongee.a : h0, act = plongee ? 1.5 : sh[i] ? h0.hov + h0.energie * .6 : h0.energie; // pendant la plongée, tout converge vers le projet
        const an = T * (.12 + (i % 7) * .03) + sph[i], R = (sh[i] ? 3.4 : 2.4) * (1 - .35 * act), k = .5 + 1.8 * act; // objet actif : attire plus fort, orbite plus serrée
        const x = sp[a3], y = sp[a3 + 1], z = sp[a3 + 2];
        let fx = (h.pos.x + Math.cos(an) * R - x) * k, fy = (h.pos.y + Math.sin(an * 1.3) * R * .6 - y) * k - .12, fz = (h.pos.z + Math.sin(an) * R - z) * k;
        fx += Math.sin(T * .7 + y * .9 + i) * .25; fy += Math.sin(T * .6 + z * .8 + i * 2) * .25; fz += Math.sin(T * .8 + x * .7 + i * 3) * .25;
        const wx = x - ox, wy = y - oy, wz = z - oz, t = wx * rx + wy * ry + wz * rz;
        if (t > 0) { // champ du visiteur : attraction à moyenne distance, répulsion légère de très près
            const qx = wx - rx * t, qy = wy - ry * t, qz = wz - rz * t, d = Math.hypot(qx, qy, qz) + .001;
            if (d < 8) { const f = d > 3 ? -.9 * Math.sin(Math.PI * (d - 3) / 5) : 2.6 * (1 - d / 3); fx += qx / d * f; fy += qy / d * f; fz += qz / d * f; }
        }
        sv[a3] = (sv[a3] + fx * dt) * fr; sv[a3 + 1] = (sv[a3 + 1] + fy * dt) * fr; sv[a3 + 2] = (sv[a3 + 2] + fz * dt) * fr;
        sp[a3] = x + sv[a3] * dt; sp[a3 + 1] = y + sv[a3 + 1] * dt; sp[a3 + 2] = z + sv[a3 + 2] * dt;
    }
    sg.attributes.position.needsUpdate = true; essaimPts.material.opacity = .7 * rev * (1 - .6 * foc);
}

/* impulsions : naissent, voyagent (accélèrent puis ralentissent), réveillent un nœud, transmettent une partie de l'énergie, s'éteignent */
function recevoir(n, e) {
    n.energie = Math.min(1.5, n.energie + e);
    if (!n.core) n.vel.addScaledVector(tw.copy(n.pos).normalize(), e * 1.4 / n.mass); // la masse limite le recul
    essaimKick(n.pos, e); Son.recu(n, e);
}
function lancer(chemin, e = 1) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: BLANC, transparent: true, depthWrite: false, opacity: .9 }));
    scene.add(s); impulsions.push({ chemin, i: 0, t: 0, e, s });
}
function impulsionsMaj(dt) {
    for (let k = impulsions.length - 1; k >= 0; k--) {
        const p = impulsions[k], a = p.chemin[p.i], b = p.chemin[p.i + 1];
        p.t = Math.min(1, p.t + dt / 1.6);
        p.s.position.lerpVectors(a.pos, b.pos, ease.inOut(p.t)); p.s.scale.setScalar(.5 + .7 * p.e);
        if (p.t < 1) continue;
        const l = liens.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a)); if (l) l.glow = 1;
        recevoir(b, p.e); p.e *= .72; p.i++; p.t = 0;
        if (p.i >= p.chemin.length - 1 || p.e < .12) { scene.remove(p.s); p.s.material.dispose(); impulsions.splice(k, 1); }
    }
}
function liensMaj(dt, rev) {
    liens.forEach((l, k) => {
        l.glow *= Math.exp(-dt * 1.8);
        lp.set([...l.a.pos.toArray(), ...l.b.pos.toArray()], k * 6);
        const c = (.05 + l.glow * .6) * rev; lc.set([LAV.r * c, LAV.g * c, LAV.b * c, LAV.r * c, LAV.g * c, LAV.b * c], k * 6);
    });
    lg.attributes.position.needsUpdate = lg.attributes.color.needsUpdate = true;
}
function evenementRare() { // rare et imprévisible : une impulsion traverse plusieurs projets, puis rejoint le Core
    if (arts.length < 2) return;
    const ordre = [...arts].sort(() => Math.random() - .5).slice(0, Math.min(3, arts.length));
    recevoir(ordre[0], .6); lancer([...ordre, noeudCore], .9);
}
let proch = 20 + Math.random() * 20;
// #endregion

// #region AUDIO MANAGER
// soundscape piloté par la physique, spatialisé en 3D
const Son = {
    ac: null, on: true, crist: 4, nv: 0, cur: null, foc: 0,
    init() {
        if (this.ac) return void this.ac.resume();
        const ac = this.ac = new AudioContext(), buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        this.buf = buf; this.master = ac.createGain(); this.master.gain.value = this.on ? .5 : 0; this.master.connect(ac.destination);
        const basse = ac.createOscillator(), gb = ac.createGain(); basse.frequency.value = 55; gb.gain.value = .04; basse.connect(gb).connect(this.master); basse.start(); // basse du Core
        const nz = ac.createBufferSource(); nz.buffer = buf; nz.loop = true; // « air » : sa présence suit la vitesse de la caméra
        this.nzF = ac.createBiquadFilter(); this.nzF.type = "bandpass"; this.nzG = ac.createGain(); this.nzG.gain.value = 0;
        nz.connect(this.nzF).connect(this.nzG).connect(this.master); nz.start();
        for (const a of arts) { // un émetteur spatialisé par artefact, à la texture de son univers
            const t = typeDe(a.p), pn = ac.createPanner(), o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
            pn.panningModel = "HRTF"; pn.distanceModel = "inverse"; pn.refDistance = 8; pn.rolloffFactor = 1.4;
            o.type = { ia: "triangle", java: "square", c: "sine", web: "sine" }[t]; o.frequency.value = { ia: 262, java: 98, c: 523, web: 330 }[t];
            f.type = "lowpass"; f.frequency.value = t === "java" ? 260 : 1600; g.gain.value = 0;
            o.connect(f).connect(g).connect(pn).connect(this.master); o.start();
            Object.assign(a, { pn, sg: g, vol: 0, tipe: t, tick: rnd(1, 3) });
        }
    },
    dest(n) { return n && n.pn ? n.pn : this.master; },
    note(n, type, f0, f1, dur, vol) {
        if (!this.ac) return;
        const ac = this.ac, t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); o.connect(g).connect(this.dest(n)); o.start(t); o.stop(t + dur);
    },
    clic(n, f, vol) {
        if (!this.ac) return;
        const ac = this.ac, t = ac.currentTime, s = ac.createBufferSource(), b = ac.createBiquadFilter(), g = ac.createGain();
        s.buffer = this.buf; b.type = "bandpass"; b.frequency.value = f; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + .06);
        s.connect(b).connect(g).connect(this.dest(n)); s.start(t, Math.random()); s.stop(t + .08);
    },
    hover(a) { this.clic(a, 2600, .05); this.note(a, "sine", 880, 1320, .25, .02); },          // texture légère, venue de l'objet
    recu(n, e) { this.note(n, "sine", 520 + e * 260, 520 + e * 260, .3, .06 * Math.min(1, e)); }, // pulse sonore
    selection(a) { this.note(a, "sine", 110, 36, .7, .5); },                                     // impact profond et court
    impact() { this.note(null, "sine", 140, 30, .8, .6); this.clic(null, 400, .15); },
    approche(d, haut = true) { // montée légère (ou descente à la sortie), puis silence ; l'impact doux est déclenché par la caméra
        if (!this.ac) return;
        const ac = this.ac, t = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(haut ? 90 : 420, t); o.frequency.exponentialRampToValueAtTime(haut ? 480 : 80, t + d * .9);
        f.type = "lowpass"; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(haut ? 2000 : 300, t + d * .9);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.07, t + d * .7); g.gain.exponentialRampToValueAtTime(.0001, t + d);
        o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + d);
    },
    pose() { this.note(null, "sine", 95, 48, .9, .3); this.note(null, "triangle", 1800, 500, .15, .03); },
    montee(d) { // montée, puis silence juste avant l'arrivée
        if (!this.ac) return;
        const ac = this.ac, t = ac.currentTime, o = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain();
        o.type = "sawtooth"; o.frequency.setValueAtTime(70, t); o.frequency.exponentialRampToValueAtTime(700, t + d * .88);
        f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(2200, t + d * .88);
        g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.1, t + d * .8); g.gain.setValueAtTime(0, t + d * .9);
        o.connect(f).connect(g).connect(this.master); o.start(t); o.stop(t + d);
    },
    duck(d) { // silence volontaire
        if (!this.ac) return;
        const g = this.master.gain, t = this.ac.currentTime; g.cancelScheduledValues(t); g.setTargetAtTime(0, t, .03); g.setTargetAtTime(this.on ? .5 : 0, t + d, .08);
    },
    bascule() { this.on = !this.on; this.init(); this.master.gain.setTargetAtTime(this.on ? .5 : 0, this.ac.currentTime, .08); return this.on; },
    maj(dt, vit) {
        if (!this.ac) return;
        this.nv = damp(this.nv, clamp(vit / 22), 5, dt); // vitesse de la caméra → intensité sonore
        this.nzG.gain.value = this.nv ** 2 * .2; this.nzF.frequency.value = 300 + this.nv * 2500;
        const L = this.ac.listener, p = camera.position; camera.getWorldDirection(tw);
        if (L.positionX) { L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z; L.forwardX.value = tw.x; L.forwardY.value = tw.y; L.forwardZ.value = tw.z; L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0; }
        for (const a of arts) {
            a.pn.positionX.value = a.pos.x; a.pn.positionY.value = a.pos.y; a.pn.positionZ.value = a.pos.z;
            a.vol = damp(a.vol, (.012 + a.hov * .03 + a.energie * .05) * (this.cur ? (a === this.cur ? 1 + 2.5 * this.foc : 1 - .6 * this.foc) : 1), 4, dt); // l'approche d'un projet le rend plus présent
            a.sg.gain.value = a.vol * (a.tipe === "ia" ? .7 + .3 * Math.sin(T * 2.4 + a.ph) : 1); // IA : pulsations
            a.tick -= dt;
            if (a.tick < 0) {
                a.tick = a.tipe === "c" ? rnd(.4, .9) : a.tipe === "java" ? rnd(1.4, 3.2) : rnd(2, 5);
                if (p.distanceTo(a.pos) < 35) { if (a.tipe === "c") this.clic(a, 3200, .03); else if (a.tipe === "java") { this.clic(a, 220, .06); this.note(a, "sine", 70, 55, .2, .03); } }
            }
        }
        this.crist -= dt;
        if (this.crist < 0) { this.crist = rnd(5, 11); this.note(arts[Math.floor(rnd(0, arts.length))], "sine", rnd(1500, 2400), rnd(1500, 2400), 1.2, .012); } // cristaux du Core
    }
};
let gel = 0, vitCam = 0; const camPrev = new THREE.Vector3();
function declencher() { // ESPACE : silence → les particules s'arrêtent → onde → impulsion
    if (plongee || inspect || T < 7 || gel > 0) return;
    gel = .45; Son.duck(.45);
    setTimeout(() => {
        for (const o of arts) o.vel.addScaledVector(tw.copy(o.pos).normalize(), 1.4 / o.mass);
        noeudCore.energie = 1; essaimKick(noeudCore.pos, 1.2); lancer([noeudCore, ...arts.slice(0, 4), noeudCore], 1); Son.impact();
    }, 450);
}
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, () => Son.init(), { once: true });
$("#son").onclick = () => { $("#son").textContent = Son.bascule() ? "SOUND ON" : "SOUND OFF"; };
// #endregion

// #region INTERACTIONS
const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2(), tv = new THREE.Vector3(), ray = new THREE.Vector3();
let yaw = 0, yawT = 0, yv = 0, drag = null, moved = 0, actif = null, plongee = null, T = 0, inspect = null, foc = 0, zv = 0;
const info = $("#info"), fondu = $("#fondu"), astuce = $("#astuce"), look = new THREE.Vector3();

const proche = () => { // l'artefact le plus proche du curseur à l'écran
    let best = null;
    for (const a of arts) {
        a.g.getWorldPosition(tv).project(camera);
        a.near = tv.z > 0 && tv.z < 1 ? Math.exp(-((tv.x - mouse.x) ** 2 + (tv.y - mouse.y) ** 2) * 40) : 0;
        if (a.near > .4 && (!best || a.near > best.near)) best = a;
    }
    return best;
};
function afficherInfo(a) {
    const s = info.children, t = a.p.technologies;
    s[0].textContent = `PROJECT ${String(a.i + 1).padStart(2, "0")}`; s[1].textContent = typeDe(a.p).toUpperCase() + (t[0] ? " / " + t[0].toUpperCase() : "");
    s[2].textContent = t.slice(0, 3).join(" · ").toUpperCase(); s[3].textContent = a.p.titre;
}
addEventListener("pointermove", (e) => {
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    if (drag && !inspect) { yawT -= (e.clientX - drag) * .004; moved += Math.abs(e.clientX - drag); drag = e.clientX; }
});
addEventListener("pointerdown", (e) => { drag = e.clientX; moved = 0; });
addEventListener("pointerup", () => (drag = null));
addEventListener("wheel", (e) => { if (inspect) { if (!e.target.closest?.(".inspect")) zv += clamp(e.deltaY, -120, 120) * .1; return; } yawT += e.deltaY * .0012; }, { passive: true }); // en INSPECT : intention → vitesse de la caméra // le scroll exprime une intention
addEventListener("keydown", (e) => {
    if (e.key === "Escape") return sortirInspect();
    if (e.key.toLowerCase() === "i" && actif && !inspect && !plongee) return entrerInspect(actif);
    if (inspect) return;
    if (e.key === "ArrowRight") yawT += .45; if (e.key === "ArrowLeft") yawT -= .45;
    if (e.code === "Space") { if (e.target.closest?.("button, a")) return; e.preventDefault(); declencher(); }
});
$("#scene").addEventListener("click", (e) => {
    if (moved > 5 || plongee || inspect || T < 7) return;
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const a = proche(); if (a) entrer(a);
});

/* entrée dans un projet : trajectoire courbe, accélération puis ralentissement, le projet grandit */
function entrer(a) {
    // sélection physique : le projet est tiré vers le visiteur, les autres sont repoussés (les plus lourds bougent moins)
    a.vel.addScaledVector(tw.copy(camera.position).sub(a.pos).normalize(), 2.2 / a.mass);
    for (const o of arts) if (o !== a) o.vel.addScaledVector(tw.copy(o.pos).sub(a.pos).normalize(), 1.6 / o.mass);
    lancer([noeudCore, a], 1); Son.selection(a); Son.montee(2.8);
    const p0 = camera.position.clone(), tgt = a.g.position.clone(), dir = tgt.clone().sub(p0).normalize();
    const p2 = tgt.clone().addScaledVector(dir, -4.5), p1 = p0.clone().lerp(p2, .5).add(new THREE.Vector3(-dir.z * 6, 3, dir.x * 6));
    plongee = { a, p: 0, p0, p1, p2, look0: look.clone(), tgt };
    info.classList.remove("on");
}
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
// #endregion

// #region MODE INSPECT
// un nouvel état (CORE → PROJECT_INSPECT) sur la même scène et les mêmes objets
const main = $(".core"), ins = $("#inspect"), insBtn = $("#insBtn"), ZMIN = 5.2, ZMAX = 16;
const CAT = { ia: "Machine Learning", java: "Architecture logicielle", c: "Algorithmique", web: "Web" };
const LIBS = [["objectif", "Objectif"], ["fonctionnalites", "Fonctionnalités"], ["difficultes", "Difficultés"], ["resultat", "Résultat"], ["apprentissages", "Apprentissages"]];
const insEls = [...ins.querySelectorAll(".it")], lienOk = (u) => /^https?:\/\//i.test(u || "");
const orbit = new THREE.Vector3(), via = new THREE.Vector3(), lk = new THREE.Vector3(), cp = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
let surBtn = false, dwell = 0, grace = 0;

function remplir(a) { // le panneau est réutilisé : on change seulement son contenu
    const p = a.p, q = (s) => ins.querySelector(s), li = (t, x) => Object.assign(document.createElement(t), { textContent: x });
    q(".ins-k").textContent = `PROJECT ${String(a.i + 1).padStart(2, "0")} · ${(p.categorie || CAT[typeDe(p)]).toUpperCase()}`;
    q(".ins-t").textContent = p.titre; q(".ins-desc").textContent = p.description; q(".ins-desc").hidden = !p.description;
    const tech = q(".ins-tech"); tech.replaceChildren(...p.technologies.map((x) => li("li", x))); tech.hidden = !p.technologies.length;
    const res = q(".ins-res"); res.replaceChildren();
    for (const [k, l] of LIBS) if (p[k]) res.append(li("dt", l.toUpperCase()), li("dd", p[k]));
    res.hidden = !res.children.length;
    const fig = q(".ins-img"), src = mobile && p.images[0]; fig.hidden = !src; if (src) { fig.firstElementChild.src = src; fig.firstElementChild.alt = p.titre; }
    for (const [id, u] of [["#insGit", p.gitlab], ["#insDemo", p.demo]]) { const l = q(id); l.hidden = !lienOk(u); if (lienOk(u)) l.href = u; }
    if (lienOk(p.gitlab)) q("#insGit").textContent = /gitlab/i.test(p.gitlab) ? "GITLAB" : "GITHUB";
    const vis = insEls.filter((el) => !el.hidden); vis.forEach((el, i) => { el.style.setProperty("--i", i); el.style.setProperty("--r", vis.length - i); }); // ordre de la chaîne
}

/* l'image reste dans le monde : surface flottante, créée et chargée à la première inspection seulement, dessinée après les particules (jamais masquée) */
function planImage(a) {
    if (a.plan !== undefined) return a.plan;
    const src = a.p.images[0]; if (!src || mobile) return (a.plan = null);
    const opt = { transparent: true, depthTest: false, depthWrite: false, fog: false };
    const tex = new THREE.TextureLoader().load(src, (t) => ajuster(t.image.width / t.image.height)); tex.colorSpace = THREE.SRGBColorSpace;
    const img = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, ...opt }));
    const fond = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0x09090B, ...opt }));
    const cadre = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].map(([x, y]) => new THREE.Vector3(x, y, 0))), new THREE.LineBasicMaterial({ color: LAV, ...opt }));
    fond.renderOrder = 20; img.renderOrder = 21; cadre.renderOrder = 22; fond.position.z = -.01;
    const g = new THREE.Group(); g.add(fond, img, cadre); g.visible = false; scene.add(g);
    const ajuster = (r) => { let w = 4.2, h = w / r; if (h > 3.4) { h = 3.4; w = h * r; } img.scale.set(w, h, 1); fond.scale.set(w + .35, h + .35, 1); cadre.scale.set(w + .35, h + .35, 1); };
    ajuster(1.6);
    return (a.plan = { g, m: [img.material, fond.material, cadre.material], sp: new Ressort(0, 28, 6) });
}
function majImage(I, dt) {
    const pl = planImage(I.a); if (!pl) return;
    const k = I.dir > 0 && I.tOn >= 0 ? clamp((T - I.tOn - .44) / .9) : 0, s = pl.sp.pas(k, dt); // arrive après le titre, avec un léger ressort
    pl.g.visible = s > .01 || k > 0;
    pl.g.position.copy(I.a.pos).addScaledVector(I.r, 3.7 * s).addScaledVector(I.f, -1.4 * s); pl.g.position.y -= .15; // sort de l'objet
    pl.g.lookAt(camera.position); pl.g.rotateY(-.16 + mouseS.x * .05); pl.g.rotateX(mouseS.y * .04); pl.g.scale.setScalar(.9 + .1 * Math.min(s, 1.1));
    const o = clamp(s); pl.m[0].opacity = o; pl.m[1].opacity = .85 * o; pl.m[2].opacity = .7 * o;
}

function entrerInspect(a) {
    if (inspect || plongee || T < 7) return;
    tw.copy(a.pos).sub(camera.position); tw.y = 0; const f = tw.clone().normalize();
    inspect = { a, p: 0, dir: 1, f, r: new THREE.Vector3().crossVectors(f, UP), z: clamp(9 * Math.max(1, 1.7 / camera.aspect), ZMIN, ZMAX), tOn: -1, pose: false };
    zv = 0; remplir(a); planImage(a); main.classList.add("inspecting"); main.dataset.etat = "PROJECT_INSPECT";
    info.classList.remove("on", "pret"); lancer([noeudCore, a], .7); Son.approche(2.4);
}
function sortirInspect() {
    if (!inspect || inspect.dir < 0) return;
    inspect.dir = -1; ins.classList.remove("on"); ins.setAttribute("aria-hidden", "true"); Son.approche(2, false); // le contenu se rétracte, puis la caméra recule
}
function finInspect() {
    const a = inspect.a; inspect = null; zv = 0; dwell = 0; grace = 0; main.classList.remove("inspecting"); main.dataset.etat = "CORE";
    if (a.plan) a.plan.g.visible = false; info.classList.toggle("on", !!actif); document.activeElement?.blur?.();
}
function experience() { // INSPECT observe ; EXPERIENCE (page du projet) fait vivre : on enchaîne sur la plongée existante depuis la pose actuelle
    if (!inspect || inspect.dir < 0) return;
    const a = inspect.a; ins.classList.remove("on"); ins.setAttribute("aria-hidden", "true"); if (a.plan) a.plan.g.visible = false;
    inspect = null; zv = 0; main.classList.remove("inspecting"); main.dataset.etat = "PROJECT_EXPERIENCE"; entrer(a);
}
insBtn.onclick = () => actif && entrerInspect(actif);
insBtn.onpointerenter = () => (surBtn = true); insBtn.onpointerleave = () => (surBtn = false);
$("#insClose").onclick = sortirInspect; $("#insExp").onclick = experience;

function cameraInspect(dt) { // trajectoire courbe (Bézier) orbite → pose d'observation, avec anticipation et léger dépassement ; le retour est la même courbe à l'envers
    const I = inspect, a = I.a;
    I.p = clamp(I.p + I.dir * dt / (I.dir > 0 ? 2.6 : 2.1));
    if (I.dir < 0 && I.p <= 0) { finInspect(); camera.position.copy(orbit); look.set(0, 0, 0); camera.lookAt(look); return; }
    if (I.dir > 0 && I.p > .9 && !I.pose) { I.pose = true; Son.pose(); } // l'impact suit la caméra réelle
    if (I.dir > 0 && I.p > .62 && I.tOn < 0) { I.tOn = T; ins.classList.add("on"); ins.setAttribute("aria-hidden", "false"); $("#insClose").focus({ preventScroll: true }); }
    // distance : l'intention (molette) devient vitesse, amortie ; freinage progressif avant les bornes, jamais de traversée
    zv *= Math.exp(-4.5 * dt) * Math.pow(clamp(zv < 0 ? (I.z - ZMIN) / 1.5 : (ZMAX - I.z) / 2.5, .001, 1), dt * 6);
    I.z = clamp(I.z + zv * dt, ZMIN, ZMAX);
    lk.copy(a.pos).addScaledVector(I.r, mobile ? 0 : -1.3); if (mobile) lk.y -= 2.2; // l'objet se place à droite (bureau) ou en haut (mobile)
    cp.copy(lk).addScaledVector(I.f, -I.z).addScaledVector(I.r, mouseS.x * .6); cp.y += .9 + mouseS.y * .5;
    via.copy(orbit).add(cp).multiplyScalar(.5).addScaledVector(I.r, 4).addScaledVector(UP, 2.5);
    const e = ease.inOut(I.p) + .03 * Math.sin(Math.PI * clamp((I.p - .82) / .18)) - .03 * Math.sin(Math.PI * clamp(I.p / .12)), q = 1 - e;
    camera.position.set(0, 0, 0).addScaledVector(orbit, q * q).addScaledVector(via, 2 * q * e).addScaledVector(cp, e * e);
    look.set(0, 0, 0).lerp(lk, ease.out(clamp(I.p * 1.5))); camera.lookAt(look);
}
// #endregion

// #region BOUCLE
let last = performance.now(), frames = 0, tFps = 0, niveau = 0;
function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05) || .016; last = now; T += dt;
    // qualité adaptative : on réduit d'abord la résolution, puis le nombre de particules
    frames++; tFps += dt;
    if (tFps > 2) {
        if (frames / tFps < 40 && niveau < 2) { niveau++; if (niveau === 1) { pr = 1; renderer.setPixelRatio(1); U.uPx.value = 1; renderer.setSize(innerWidth, innerHeight); } else { champGeo.setDrawRange(0, NP >> 1); sg.setDrawRange(0, NS >> 1); } }
        frames = 0; tFps = 0;
    }
    const born = ease.out(clamp((T - .5) / 6)); // naissance progressive
    U.uT.value = T; U.uBorn.value = born; reseau.material.opacity = born * .35; reseau.scale.setScalar(1 + .03 * Math.sin(T * .5));
    noyau.scale.setScalar(1 + .15 * Math.sin(T * 1.6) + noeudCore.energie * .5); noyauHalo.scale.setScalar(1.6 + .3 * Math.sin(T * 1.6 + 1) + noeudCore.energie * 1.2);
    for (let i = 0; i < NM; i++) { const an = T * (.5 + i * .09) + i * 2, r = .35 + (i % 4) * .15; mp.set([Math.cos(an) * r, Math.sin(an * 1.3) * r * .6, Math.sin(an) * r], i * 3); }
    mg.attributes.position.needsUpdate = true;
    const tr = ease.out(clamp((T - 4.5) / 2.5)); titre.material.color.setScalar(tr); titre.position.z = -42 + 8 * tr; // apparition par profondeur
    astuce.classList.toggle("on", T > 7 && !plongee && !inspect);

    /* caméra : ressort légèrement sous-amorti (léger dépassement), inertie de la souris */
    mouseS.lerp(mouse, 1 - Math.exp(-dt * 2.5));
    if (!plongee) {
        yv += ((yawT - yaw) * 14 - yv * 5) * dt; yaw += yv * dt;
        const R = 2.5 + 6.5 * ease.inOut(clamp((T - 2) / 5));
        orbit.set(Math.sin(yaw) * R + mouseS.x * .6, 1.2 + mouseS.y * 1.4, Math.cos(yaw) * R);
        if (inspect) cameraInspect(dt); else { camera.position.copy(orbit); look.set(0, 0, 0); camera.lookAt(look); }
    } else {
        plongee.p = Math.min(1, plongee.p + dt / 2.8);
        const pp = plongee.p, e = ease.inOut(pp) + .035 * Math.sin(Math.PI * clamp((pp - .85) / .15)) - .04 * Math.sin(Math.PI * clamp(pp / .15)), q = 1 - e; // anticipation, puis léger dépassement
        camera.position.set(0, 0, 0).addScaledVector(plongee.p0, q * q).addScaledVector(plongee.p1, 2 * q * e).addScaledVector(plongee.p2, e * e);
        look.lerpVectors(plongee.look0, plongee.tgt, ease.out(clamp(plongee.p * 1.6))); camera.lookAt(look);
        camera.fov = 58 + 22 * Math.sin(e * Math.PI); camera.updateProjectionMatrix();
        fondu.style.opacity = ease.smooth(clamp((plongee.p - .78) / .2));
        if (plongee.p >= 1) { const id = plongee.a.p.id; plongee = null; location.href = `detail-projet.php?id=${encodeURIComponent(id)}`; }
    }
    foc = inspect ? ease.smooth(inspect.p) : damp(foc, 0, 4, dt); U.uFoc.value = foc; scene.fog.density = .014 * (1 + .5 * foc); // l'environnement s'atténue sans disparaître
    if (inspect) majImage(inspect, dt);
    ray.set(mouse.x, mouse.y, .5).unproject(camera).sub(camera.position).normalize();
    U.uM.value.copy(ray).multiplyScalar(25).add(camera.position);

    /* artefacts */
    let cible = plongee ? plongee.a : inspect ? inspect.a : null;
    if (!cible && T > 7) { cible = proche(); if (cible) grace = .8; else if (actif && (surBtn || grace > 0)) { cible = actif; if (!surBtn) grace -= dt; } } // tolérance : le temps d'atteindre INSPECT
    if (cible !== actif) { actif = cible; dwell = 0; if (actif) { afficherInfo(actif); Son.hover(actif); } info.classList.toggle("on", !!actif && !plongee && !inspect); }
    dwell = actif && !plongee && !inspect ? dwell + dt : 0;
    info.classList.toggle("pret", dwell > .9 && !!actif && actif.hov > .6); // INSPECT apparaît quand on s'attarde sur l'objet
    const sens = inspect ? .35 : 1, fa = inspect ? inspect.a : null;
    const rev = ease.out(clamp((T - 5) / 3));
    if (T > 14 && T > proch && !plongee) { evenementRare(); proch = T + rnd(35, 80); }
    for (const a of arts) {
        a.hov = a.sH.pas(a === actif ? 1 : 0, dt); // l'approche active l'objet, avec un léger dépassement
        a.dim = a.sD.pas(actif && a !== actif ? 1 : 0, dt);
        a.update(T, dt * a.rate * (1 - .6 * a.dim)); // quand un projet domine, les autres ralentissent
        a.energie *= Math.exp(-dt * 2.2);
        if (plongee && a !== plongee.a) a.vel.addScaledVector(tw.copy(plongee.a.pos).sub(a.pos).normalize(), 30 * plongee.p * dt / a.mass); // les autres sont attirés vers le projet
        a.vel.addScaledVector(a.off, -7 * dt).addScaledVector(a.vel, -2.4 * dt); a.off.addScaledVector(a.vel, dt); // rappel élastique + friction
        a.g.position.copy(a.base).add(a.off); a.g.position.y += Math.sin(T * .4 * a.rate + a.ph) * .6;
        a.pivot.rotation.x = a.sRx.pas(-mouseS.y * .5 * a.hov * sens, dt); // orientation vers le curseur, par ressort
        a.pivot.rotation.z = a.sRz.pas(-mouseS.x * .4 * a.hov * sens, dt);
        a.g.scale.setScalar(plongee && a === plongee.a ? 1 + ease.inOut(plongee.p) * 1.6 : a.sE.pas(plongee ? .3 : inspect && a === fa ? 1 + .22 * foc : 1 + a.hov * .08 + a.energie * .12, dt));
        const k = rev * (1 - .55 * a.dim) * (1 + a.hov * .4 + a.energie * .5) * (a === fa ? 1 + .3 * foc : 1 - .3 * foc);
        for (const [m, base] of a.mats) m.opacity = Math.min(1, base * k);
        a.halo.material.opacity = (.14 + a.hov * .2 + a.energie * .3) * rev * (1 - .6 * a.dim);
        if (a === actif && !plongee && !inspect) { a.g.getWorldPosition(tv).project(camera); info.style.transform = `translate(${(tv.x * .5 + .5) * innerWidth + 44}px, ${(-tv.y * .5 + .5) * innerHeight - 40}px)`; }
    }
    noeudCore.energie *= Math.exp(-dt * 2.2); noyauHalo.material.opacity = .45 + noeudCore.energie * .35;
    impulsionsMaj(dt); liensMaj(dt, rev); essaim(dt, rev);
    vitCam = damp(vitCam, camPrev.distanceTo(camera.position) / dt, 6, dt); camPrev.copy(camera.position); gel = Math.max(0, gel - dt); Son.cur = inspect ? inspect.a : null; Son.foc = foc; Son.maj(dt, vitCam);
    renderer.render(scene, camera);
}
requestAnimationFrame(frame);
// #endregion