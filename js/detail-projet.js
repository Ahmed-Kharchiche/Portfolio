import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

await Promise.race([document.fonts.load('700 100px Fraunces'), document.fonts.load('400 20px "Hanken Grotesk"'), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
const $ = (s) => document.querySelector(s);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const E = { // courbes d'easing
    inOut: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in4: (t) => t * t * t * t,
    smooth: (t) => t * t * (3 - 2 * t)
};
const main = $(".detail-projet"), flashEl = $("#flash"), btn = $("#suiv"), astuce = $("#astuce");
const zones = [...document.querySelectorAll(".zone")];
const mobile = innerWidth < 700;

/* une ambiance par zone : 2 couleurs, intensité du flux, distance de connexion */
const PAL = [[0x4fd1ff, 0x8a6bff], [0xff4f9a, 0xffb347], [0x6bffb0, 0x1fc8d6], [0xffd36b, 0xfff4d6]].map((p) => p.map((h) => new THREE.Color(h)));
const ZP = [{ flow: 1, link: 6 }, { flow: 1.6, link: 4.5 }, { flow: .7, link: 8 }, { flow: 2, link: 5 }];
const palA = new THREE.Color(), palB = new THREE.Color(), fond = new THREE.Color();

/* ---------- rendu ---------- */
const renderer = new THREE.WebGLRenderer({ canvas: $("#scene-3d"), antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000000, .02);
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 300);
camera.position.set(0, 0, 3.5);
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), .9, .7, 0);
composer.addPass(bloom);
composer.addPass(new OutputPass());

/* ---------- réseau : particules + connexions temporaires ---------- */
const N = mobile ? 220 : 380, MAXL = 1600;
const base = new Float32Array(N * 3), off = new Float32Array(N * 3), pos = new Float32Array(N * 3);
const ph = new Float32Array(N), sz = new Float32Array(N);
function semer() { // zones denses (clusters) + particules éparses
    const c = Array.from({ length: 5 }, () => [rnd(-18, 18), rnd(-10, 10), rnd(-18, 18)]);
    for (let i = 0; i < N; i++) {
        const dense = Math.random() < .65, s = dense ? rnd(2, 9) : 30;
        for (let k = 0; k < 3; k++) base[i * 3 + k] = (dense ? c[i % 5][k] : 0) + (Math.random() + Math.random() + Math.random() - 1.5) * s;
        ph[i] = Math.random(); sz[i] = rnd(.6, 2.2) * (Math.random() < .04 ? 3 : 1);
    }
}
semer();
const U = { uA: { value: palA }, uB: { value: palB }, uT: { value: 0 }, uAlpha: { value: 0 }, uPx: { value: renderer.getPixelRatio() } };
const pg = new THREE.BufferGeometry();
pg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
pg.setAttribute("aPh", new THREE.BufferAttribute(ph, 1));
pg.setAttribute("aSz", new THREE.BufferAttribute(sz, 1));
const points = new THREE.Points(pg, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: U,
    vertexShader: `attribute float aPh, aSz; uniform float uPx, uT, uAlpha; varying float vA, vP;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); float tw = .6 + .4 * sin(uT * 2. + aPh * 40.);
vA = uAlpha * tw; vP = aPh; gl_PointSize = min(uPx * aSz * 14. * (.6 + tw) / max(.3, -mv.z), 90.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uA, uB; varying float vA, vP;
void main(){ float a = smoothstep(.5, 0., length(gl_PointCoord - .5)); gl_FragColor = vec4(mix(uA, uB, vP) * 2.2, a * a * vA); }`
}));
const lp = new Float32Array(MAXL * 6), lc = new Float32Array(MAXL * 6), lg = new THREE.BufferGeometry();
lg.setAttribute("position", new THREE.BufferAttribute(lp, 3).setUsage(THREE.DynamicDrawUsage));
lg.setAttribute("color", new THREE.BufferAttribute(lc, 3).setUsage(THREE.DynamicDrawUsage));
const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
points.frustumCulled = lines.frustumCulled = false;
scene.add(points, lines);

/* ---------- le point guide, sa traînée, ses satellites ---------- */
const texHalo = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 64;
    const g = c.getContext("2d"), d = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    d.addColorStop(0, "rgba(255,255,255,1)"); d.addColorStop(.3, "rgba(255,255,255,.25)"); d.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = d; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
})();
const hero = new THREE.Group(), noyau = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4, 4) }));
const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
const NO = 12, orbPos = new Float32Array(NO * 3), orbG = new THREE.BufferGeometry();
orbG.setAttribute("position", new THREE.BufferAttribute(orbPos, 3));
const orb = new THREE.Points(orbG, new THREE.PointsMaterial({ size: .05, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
orb.frustumCulled = false;
hero.add(noyau, halo, orb); scene.add(hero);
const NT = 90, tp = new Float32Array(NT * 3), tc = new Float32Array(NT * 3), tg = new THREE.BufferGeometry();
tg.setAttribute("position", new THREE.BufferAttribute(tp, 3)); tg.setAttribute("color", new THREE.BufferAttribute(tc, 3));
const trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
trail.frustumCulled = false; scene.add(trail);

/* ---------- portail : plusieurs anneaux, vitesses et sens différents ---------- */
const portail = new THREE.Group(); portail.visible = false; scene.add(portail);
const anneaux = [0, 1, 2, 3].map((i) => {
    const r = 3 + i * 1.6, n = 120, a = new Float32Array(n * 3), g = new THREE.BufferGeometry();
    for (let j = 0; j < n; j++) a.set([Math.cos(j / n * 6.283) * r, Math.sin(j / n * 6.283) * r, 0], j * 3);
    g.setAttribute("position", new THREE.BufferAttribute(a, 3));
    const m = new THREE.Group(), add = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
    m.add(new THREE.LineLoop(g, new THREE.LineBasicMaterial({ ...add, opacity: .7 })), new THREE.Points(g, new THREE.PointsMaterial({ ...add, size: .14 })));
    m.userData.v = (i % 2 ? -1 : 1) * (.6 + i * .45);
    portail.add(m); return m;
});

/* ---------- son : tout est piloté par la vitesse ---------- */
let ac, master, osc, filt, gOsc, nzF, nzG, sonOn = true;
function son() {
    if (!ac) {
        ac = new AudioContext();
        master = ac.createGain(); master.gain.value = sonOn ? .7 : 0; master.connect(ac.destination);
        osc = ac.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = 55;
        filt = ac.createBiquadFilter(); filt.type = "lowpass"; filt.frequency.value = 200;
        gOsc = ac.createGain(); gOsc.gain.value = 0; osc.connect(filt).connect(gOsc).connect(master); osc.start();
        const buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const nz = ac.createBufferSource(); nz.buffer = buf; nz.loop = true;
        nzF = ac.createBiquadFilter(); nzF.type = "bandpass"; nzG = ac.createGain(); nzG.gain.value = 0;
        nz.connect(nzF).connect(nzG).connect(master); nz.start();
    }
    if (ac.state === "suspended") ac.resume();
}
function sonSync(v) { // v : 0 (calme) → 1 (vitesse max)
    if (!ac || !Number.isFinite(v)) return;
    const t = ac.currentTime;
    osc.frequency.setTargetAtTime(55 + v * 90, t, .1); filt.frequency.setTargetAtTime(180 + v * 2600, t, .1);
    gOsc.gain.setTargetAtTime(.03 + v * .09, t, .1);
    nzF.frequency.setTargetAtTime(300 + v * 3500, t, .1); nzG.gain.setTargetAtTime(v * v * .25, t, .1);
}
function note(type, f0, f1, dur, vol) {
    if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur);
}
const impact = () => { note("sine", 140, 30, .7, .8); note("triangle", 2400, 300, .25, .15); };
const blip = () => note("sine", rnd(1200, 2400), rnd(1200, 2400), .12, .02);
for (const ev of ["pointerdown", "keydown"]) addEventListener(ev, son, { once: true });
$("#son").onclick = (e) => {
    sonOn = !sonOn; e.currentTarget.textContent = sonOn ? "🔊" : "🔇"; e.currentTarget.classList.toggle("coupe", !sonOn); son();
    master.gain.setTargetAtTime(sonOn ? .7 : 0, ac.currentTime, .1);
};

/* ---------- état & voyage ---------- */
let zone = 0, trav = null, T = 0, S = 0, vit = 0, boost = 0, flash = 0, tele = false, spiral = 0, avgL = 0, lastTick = 0;
const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2(), waves = [];
const v3 = new THREE.Vector3(), prev = new THREE.Vector3(), hv = new THREE.Vector3(), zero = new THREE.Vector3(), look = new THREE.Vector3(), camT = new THREE.Vector3();

function afficher(z) {
    vis = z;
    zones.forEach((el, i) => el.classList.toggle("active", i === z));
    btn.textContent = z === zones.length - 1 ? "Recommencer" : "Suivre la lumière";
}
function voyager(vers, sens) {
    if (trav || T < 8 || vers < 0 || vers >= zones.length) return;
    const dir = new THREE.Vector3(sens * .25, .08, -sens).normalize();
    trav = { to: vers, p: 0, q: 0, sw: false, txt: false, dir, start: hero.position.clone() };
    portail.visible = true; portail.position.copy(dir).multiplyScalar(55).add(trav.start); portail.lookAt(trav.start);
    zones.forEach((el) => el.classList.remove("active"));
    btn.classList.remove("visible"); vis = -1;
}
const avancer = () => voyager((zone + 1) % zones.length, 1);
function permuter() { // sous le flash blanc : nouveau monde, nouvelle identité
    zone = trav.to; semer(); off.fill(0); portail.visible = false; impact();
    hero.position.copy(trav.dir).multiplyScalar(-18);
    camera.position.copy(hero.position).addScaledVector(trav.dir, -7); camera.position.y += 1.3;
    for (let i = 0; i < NT; i++) tp.set([hero.position.x, hero.position.y, hero.position.z], i * 3);
    flash = 1; tele = true; trav.sw = true;
}

/* ---------- interactions ---------- */
addEventListener("pointermove", (e) => mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1));
$("#scene-3d").addEventListener("click", () => {
    v3.set(mouse.x, mouse.y, .5).unproject(camera).sub(camera.position).normalize().multiplyScalar(18).add(camera.position);
    waves.push({ c: v3.clone(), t: 0 }); blip();
});
$("#scene-3d").addEventListener("dblclick", () => (boost = 1));
btn.onclick = avancer;
addEventListener("keydown", (e) => {
    if (e.code === "Space") { if (e.target.closest?.("button, a")) return; e.preventDefault(); avancer(); }
    else if (e.key === "Escape") voyager(zone - 1, -1);
});
addEventListener("resize", () => {
    camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight); composer.setSize(innerWidth, innerHeight);
});
setTimeout(() => { afficher(0); btn.classList.add("visible"); astuce.classList.add("visible"); }, 7500);

/* ======== objets 3D : titres, panneaux holographiques, noyau IA, technologies ======== */
const D = window.projetData;
const mats = [[], [], [], []], zr = [0, 0, 0, 0], panels = [], techs = [];
const zg = mats.map(() => { const g = new THREE.Group(); scene.add(g); return g; });
const ADD = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
let vis = -1, sel = -1, dimS = 0;
const tv = new THREE.Vector3(), tv2 = new THREE.Vector3(), ray = new THREE.Raycaster();
// opacité pilotée par zone : t = teinte (1 = couleur A, 2 = couleur B), p = panneau (réagit à la sélection)
const reg = (z, m, k = 1, t = 0, p = null) => (mats[z].push({ m, k, t, p }), m);
const lineMat = (z, k, t = 2, p = null) => reg(z, new THREE.LineBasicMaterial({ ...ADD }), k, t, p);

/* texte lumineux : léger décalage RVB microscopique + balayage subtil */
function holo(z, txt, px, s, font) {
    const c = document.createElement("canvas"), g = c.getContext("2d");
    g.font = font; c.width = Math.ceil(g.measureText(txt).width) + 40; c.height = Math.ceil(px * 1.4);
    g.font = font; g.fillStyle = "#fff"; g.textBaseline = "middle"; g.fillText(txt, 20, c.height / 2);
    s = Math.min(s, 28 / c.width);
    const m = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { map: { value: new THREE.CanvasTexture(c) }, uT: U.uT, uA: { value: 0 }, uC: { value: palA } },
        vertexShader: "varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }",
        fragmentShader: `uniform sampler2D map; uniform float uT, uA; uniform vec3 uC; varying vec2 vUv;
void main(){ float s = .0015 * sin(uT * .7 + vUv.x * 6.);
float a = texture2D(map, vUv + vec2(s, 0.)).a, b = texture2D(map, vUv).a, c = texture2D(map, vUv - vec2(s, 0.)).a;
float band = smoothstep(.06, 0., abs(vUv.x - (fract(uT * .09) * 1.6 - .3)));
gl_FragColor = vec4(uC * (vec3(a, b, c) + band * .9 * b) * 1.8, max(max(a, b), c) * uA); }`
    });
    reg(z, m, 1);
    return new THREE.Mesh(new THREE.PlaneGeometry(c.width * s, c.height * s), m);
}

/* bloc de texte lisible (opaque, blanc) */
function bloc(z, txt, w) {
    const c = document.createElement("canvas"), g = c.getContext("2d"), px = 34, f = `400 ${px}px "Hanken Grotesk", sans-serif`;
    g.font = f; const L = []; let l = "";
    for (const mot of txt.split(/\s+/)) { if (g.measureText(l + mot).width > 980 && l) { L.push(l); l = ""; } l += mot + " "; }
    L.push(l); c.width = 1060; c.height = Math.ceil(L.length * px * 1.5 + 60);
    g.font = f; g.fillStyle = "#eef0f7"; g.textBaseline = "top"; L.forEach((t, i) => g.fillText(t, 40, 30 + i * px * 1.5));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * c.height / c.width), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    reg(z, m.material, 1); return m;
}

/* panneau holographique : verre, cadre décalé, coureurs lumineux, coins différents, onde, grille de proximité */
const per = (u, w, h) => {
    const d = (((u % 1) + 1) % 1) * 2 * (w + h);
    if (d < w) return [-w / 2 + d, -h / 2];
    if (d < w + h) return [w / 2, -h / 2 + d - w];
    if (d < 2 * w + h) return [w / 2 - (d - w - h), h / 2];
    return [-w / 2, h / 2 - (d - 2 * w - h)];
};
function panneau(z, w, h, x, y, zz, contenu, id, grid) {
    const g = new THREE.Group(); g.position.set(x, y, zz); zg[z].add(g);
    const p = { g, z, w, h, y0: y, z0: zz, id, sel: 0, rec: 0, wave: 0, s: Math.random(), ph: rnd(0, 6.28) };
    p.glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x060b16, transparent: true, opacity: .4, depthWrite: false }));
    p.glass.userData.id = id; reg(z, p.glass.material, .4, 0, p); g.add(p.glass);
    if (contenu) { contenu.position.z = .04; g.add(contenu); }
    const R = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => new THREE.Vector3(a * w * .525, b * h * .525, -.25));
    p.back = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(R), lineMat(z, .3, 2)); g.add(p.back);
    const cs = [], br = (cx, cy, sx, sy, l) => cs.push(cx, cy, .03, cx + sx * l, cy, .03, cx, cy, .03, cx, cy + sy * l, .03);
    br(-w / 2, -h / 2, 1, 1, .5); br(w / 2, h / 2, -1, -1, .5); br(w / 2, -h / 2, -1, 1, .22); br(-w / 2, h / 2, 1, -1, .22);
    const cg = new THREE.BufferGeometry(); cg.setAttribute("position", new THREE.Float32BufferAttribute(cs, 3));
    g.add(new THREE.LineSegments(cg, lineMat(z, 1, 1, p)));
    const nv = 2 * 13 * 2; p.rp = new Float32Array(nv * 3); p.rc = new Float32Array(nv * 3);
    p.rg = new THREE.BufferGeometry(); p.rg.setAttribute("position", new THREE.BufferAttribute(p.rp, 3)); p.rg.setAttribute("color", new THREE.BufferAttribute(p.rc, 3));
    const run = new THREE.LineSegments(p.rg, reg(z, new THREE.LineBasicMaterial({ vertexColors: true, ...ADD }), 1));
    run.frustumCulled = false; g.add(run);
    p.wl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w / 2, 0, .05), new THREE.Vector3(w / 2, 0, .05)]), new THREE.LineBasicMaterial({ ...ADD, opacity: 0 })); g.add(p.wl);
    if (grid) {
        const gp = [];
        for (let i = -6; i <= 6; i++) gp.push(i * w * .1, -h * .65, -.3, i * w * .1, h * .65, -.3);
        for (let i = -4; i <= 4; i++) gp.push(-w * .6, i * h * .16, -.3, w * .6, i * h * .16, -.3);
        const gg = new THREE.BufferGeometry(); gg.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3));
        p.grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ ...ADD, opacity: 0 })); g.add(p.grid);
    }
    panels.push(p); return p;
}

/* ---------- zone 0 : titre géant, loin derrière le réseau ---------- */
const titre = holo(0, D.titre, 200, .012, '700 200px Fraunces, serif'); titre.position.set(0, 2, -14); zg[0].add(titre);
const hud0 = holo(0, "PROJECT_01 // SYSTEM_ONLINE", 30, .008, '500 30px "Hanken Grotesk", sans-serif'); hud0.position.set(-7, -3.8, -13); zg[0].add(hud0);

/* ---------- zone 1 : panneau de description + noyau IA ---------- */
const txt = bloc(1, D.description || "", 8.6), txtH = txt.geometry.parameters.height;
panneau(1, 9.2, txtH + .8, -5.5, 0, -5, txt, -1, false);
const t1 = holo(1, "Le projet", 90, .012, 'italic 300 90px Fraunces, serif'); t1.position.set(-5.5, txtH / 2 + 1.4, -5); zg[1].add(t1);

const ia = new THREE.Group(); ia.position.set(8, 0, -9); zg[1].add(ia);
const iaR = [0, 1, 2, 3].map((i) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(1.1 + i * .3, .012, 6, 80), new THREE.MeshBasicMaterial({ ...ADD }));
    reg(1, m.material, .8, i % 2 ? 1 : 2); m.scale.set(1 + rnd(0, .3), 1, 1); m.rotation.set(rnd(0, 3), rnd(0, 3), 0);
    m.userData.v = new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)); ia.add(m); return m;
});
const iaC = new THREE.Mesh(new THREE.IcosahedronGeometry(.45, 1), new THREE.MeshBasicMaterial({ wireframe: true, ...ADD })); reg(1, iaC.material, .9, 1); ia.add(iaC);
const IN = 36, iaP = new Float32Array(IN * 3), iaL = new Float32Array(300 * 6), iaA = Float32Array.from({ length: IN }, () => rnd(0, 6.28));
const iaRr = Float32Array.from({ length: IN }, () => rnd(1.2, 2.6)), iaS = Float32Array.from({ length: IN }, () => rnd(.2, .7));
const iaPg = new THREE.BufferGeometry(); iaPg.setAttribute("position", new THREE.BufferAttribute(iaP, 3));
const iaPts = new THREE.Points(iaPg, new THREE.PointsMaterial({ size: .07, ...ADD })); iaPts.frustumCulled = false; reg(1, iaPts.material, 1, 2); ia.add(iaPts);
const iaLg = new THREE.BufferGeometry(); iaLg.setAttribute("position", new THREE.BufferAttribute(iaL, 3));
const iaLn = new THREE.LineSegments(iaLg, lineMat(1, .6, 1)); iaLn.frustumCulled = false; ia.add(iaLn);
const iaPulse = new THREE.Mesh(new THREE.TorusGeometry(1, .01, 6, 64), new THREE.MeshBasicMaterial({ ...ADD, opacity: 0 })); ia.add(iaPulse);
const hudIA = holo(1, "AI_CORE // ACTIVITY", 30, .008, '500 30px "Hanken Grotesk", sans-serif'); hudIA.position.set(8, -3, -9); zg[1].add(hudIA);

/* ---------- zone 2 : une structure par technologie, son langage d'animation, son HUD ---------- */
function techObj(n) {
    const k = n.toLowerCase(), g = new THREE.Group(), o = { g, react: 0, u: 0, up: () => {} };
    const W = (geo, t = 1) => { const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ wireframe: true, ...ADD })); reg(2, m.material, .85, t); g.add(m); return m; };
    if (/python|^py/.test(k)) { // flux de particules
        const n2 = 90, pa = new Float32Array(n2 * 3), pgm = new THREE.BufferGeometry(); pgm.setAttribute("position", new THREE.BufferAttribute(pa, 3));
        const pm = new THREE.Points(pgm, new THREE.PointsMaterial({ size: .06, ...ADD })); pm.frustumCulled = false; reg(2, pm.material, 1, 2); g.add(pm);
        o.up = () => { for (let i = 0; i < n2; i++) { const a = i / n2, an = a * 18 + T, r = .5 + .3 * Math.sin(a * 6 + T); pa.set([Math.cos(an) * r, ((a + T * .12) % 1 - .5) * 2.4, Math.sin(an) * r], i * 3); } pgm.attributes.position.needsUpdate = true; };
    } else if (/three|webgl|gl$/.test(k)) { // géométrie 3D dynamique
        const m = W(new THREE.IcosahedronGeometry(.8, 1)); o.up = () => m.rotation.set(T * .4, T * .55, 0);
    } else if (/sql|db|data|mongo/.test(k)) { // couches de données
        const L = [0, 1, 2, 3].map((i) => { const m = W(new THREE.BoxGeometry(1.6, .06, 1.1), i % 2 ? 1 : 2); m.position.y = i * .3 - .45; return m; });
        o.up = () => L.forEach((m, i) => (m.position.x = Math.sin(T * .5 + i) * .2));
    } else if (k === "java" || k === "kotlin") { // structure modulaire
        const B = [[-.5, -.5], [.5, -.5], [-.5, .5], [.5, .5]].map(([x, z]) => { const m = W(new THREE.BoxGeometry(.7, .7, .7)); m.position.set(x, 0, z); return m; });
        o.up = () => B.forEach((m, i) => (m.position.y = Math.sin(T * .8 + i * 1.6) * .25));
    } else if (/^c(\+\+|#)?$/.test(k)) { // brut, rotations par à-coups
        const m = W(new THREE.BoxGeometry(1, 1, 1)); o.up = () => { const f = T * .5, fl = Math.floor(f); m.rotation.y = (fl + E.inOut(f - fl)) * 1.5708; m.rotation.x = .6; };
    } else { const m = W(new THREE.TorusKnotGeometry(.5, .15, 60, 8)); o.up = () => { m.rotation.y = T * .25; m.rotation.x = Math.sin(T * .2) * .4; }; }
    return o;
}
const t2 = holo(2, "Technologies", 90, .012, 'italic 300 90px Fraunces, serif'); t2.position.set(0, 4.8, -9); zg[2].add(t2);
D.technologies.slice(0, 6).forEach((n, i, arr) => {
    const x = (i - (arr.length - 1) / 2) * 3.2, y = Math.sin(i * 1.7) * 1.2 - .3, zz = -7 - Math.abs(i - (arr.length - 1) / 2) * .8;
    const o = techObj(n); o.g.position.set(x, y, zz); zg[2].add(o.g);
    const lab = holo(2, `${n.toUpperCase()}_0${i + 1}`, 30, .007, '500 30px "Hanken Grotesk", sans-serif'); lab.position.set(x + 1.2, y + 1.3, zz); zg[2].add(lab);
    zg[2].add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([lab.position, o.g.position]), lineMat(2, .35, 2)));
    const dot = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3), ...ADD })); reg(2, dot.material, 1); zg[2].add(dot);
    Object.assign(o, { lab, dot, ph: i * .37 }); techs.push(o);
});

/* ---------- zone 3 : images = fenêtres ouvertes sur le projet ---------- */
const t3 = holo(3, "Résultat", 90, .012, 'italic 300 90px Fraunces, serif'); t3.position.set(0, 3.6, -8); zg[3].add(t3);
const imgs = (D.images || []).slice(0, 3), IW = 4.4, IH = 2.9;
imgs.forEach((src, i) => {
    const tex = new THREE.TextureLoader().load(src, (tx) => {
        const ia2 = tx.image.width / tx.image.height, pa = (IW - .3) / (IH - .3);
        if (ia2 > pa) { tx.repeat.x = pa / ia2; tx.offset.x = (1 - tx.repeat.x) / 2; } else { tx.repeat.y = ia2 / pa; tx.offset.y = (1 - tx.repeat.y) / 2; }
    });
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(IW - .3, IH - .3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
    const p = panneau(3, IW, IH, (i - (imgs.length - 1) / 2) * 5.2, 0, -6, m, i, true);
    reg(3, m.material, .95, 0, p);
    const l1 = holo(3, `IMG_0${i + 1}`, 30, .007, '500 30px "Hanken Grotesk", sans-serif'); l1.position.set(-IW / 2 + .5, -IH / 2 - .25, 0); p.g.add(l1);
    const l2 = holo(3, `X ${rnd(10, 99).toFixed(1)} Y ${rnd(10, 99).toFixed(1)}`, 30, .007, '500 30px "Hanken Grotesk", sans-serif'); l2.position.set(IW / 2 - .9, IH / 2 + .25, 0); p.g.add(l2);
});
$("#scene-3d").addEventListener("click", () => { // sélection d'un projet
    if (vis !== 3) return;
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(panels.filter((p) => p.id >= 0).map((p) => p.glass))[0];
    sel = hit && hit.object.userData.id !== sel ? hit.object.userData.id : -1;
    const p = panels.find((q) => q.id === sel); if (p) p.wave = 1;
});

/* ---------- mise à jour de tous les objets ---------- */
function monde3d(dt) {
    if (vis < 0) sel = -1;
    dimS += ((sel >= 0 ? 1 : 0) - dimS) * (1 - Math.exp(-dt * 2.5));
    U.uAlpha.value *= 1 - .45 * dimS;
    for (let z = 0; z < 4; z++) { // apparition par profondeur + opacité, rythme propre à chaque zone
        zr[z] += ((vis === z ? 1 : 0) - zr[z]) * (1 - Math.exp(-dt * (vis === z ? 1.6 : 4)));
        const r = zr[z]; zg[z].visible = r > .01; if (!zg[z].visible) continue;
        zg[z].position.z = -(1 - r) * 8;
        for (const o of mats[z]) {
            const m = o.m;
            if (m.uniforms) m.uniforms.uA.value = r * o.k;
            else { m.opacity = r * o.k * (o.p ? 1 - o.p.rec * .65 : 1); if (o.t) m.color.copy(o.t === 1 ? palA : palB).multiplyScalar(1.8 * (o.p ? 1 + o.p.sel * 1.5 : 1)); }
        }
    }
    for (const p of panels) {
        const r = zr[p.z]; if (r < .01) continue;
        p.sel += ((sel === p.id ? 1 : 0) - p.sel) * (1 - Math.exp(-dt * 3));
        p.rec += ((sel >= 0 && sel !== p.id ? 1 : 0) - p.rec) * (1 - Math.exp(-dt * 2.5));
        const dist = camera.position.distanceTo(p.g.getWorldPosition(tv2));
        p.g.getWorldPosition(tv).project(camera);
        const d = Math.hypot(tv.x - mouse.x, tv.y - mouse.y), near = Math.exp(-d * d * 4), k = 1 - Math.exp(-dt * 3);
        p.g.rotation.y += ((mouse.x - tv.x) * .5 * near + Math.sin(T * .3 + p.ph) * .05 - p.g.rotation.y) * k; // s'oriente vers le curseur, revient doucement
        p.g.rotation.x += (-(mouse.y - tv.y) * .4 * near + Math.sin(T * .23 + p.ph) * .03 - p.g.rotation.x) * k;
        p.g.position.z += (p.z0 + p.sel * 3 - p.rec * 4 - p.g.position.z) * k;
        p.g.position.y = p.y0 + Math.sin(T * .5 + p.ph) * .15;
        p.g.scale.setScalar(1 + p.sel * .15);
        const kick = Math.pow(Math.max(0, Math.sin(T * .8 + p.ph * 5)), 20) * 12 + p.sel * 8; // accélérations brusques
        p.s += dt * (.04 + .05 * kick);
        for (let q = 0; q < 2; q++) for (let i = 0; i < 13; i++) {
            const a = per(p.s + q * .5 - i * .004, p.w, p.h), b = per(p.s + q * .5 - (i + 1) * .004, p.w, p.h), o = (q * 13 + i) * 6, f = Math.pow(1 - i / 14, 1.5) * (1.6 + p.sel * 1.5);
            p.rp.set([a[0], a[1], .03, b[0], b[1], .03], o); p.rc.set([palA.r * f, palA.g * f, palA.b * f, palA.r * f * .7, palA.g * f * .7, palA.b * f * .7], o);
        }
        p.rg.attributes.position.needsUpdate = p.rg.attributes.color.needsUpdate = true;
        p.wave = Math.max(0, p.wave - dt * .9); p.wl.position.y = p.h / 2 - (1 - p.wave) * p.h; // onde sur le panneau
        p.wl.material.opacity = r * p.wave; p.wl.material.color.copy(palB).multiplyScalar(2);
        if (p.grid) { p.grid.material.opacity = r * .4 * clamp(1 - (dist - 6) / 10); p.grid.material.color.copy(palB); } // couche visible de près
    }
    if (zr[1] > .01) { // noyau IA : s'active quand on approche
        const act = clamp(1 - (camera.position.distanceTo(ia.getWorldPosition(tv)) - 5) / 14);
        ia.scale.setScalar(1 + .05 * Math.sin(T * .5));
        iaR.forEach((m, i) => { const v = m.userData.v, s = dt * (.15 + i * .05) * (1 + act * 4); m.rotation.x += v.x * s; m.rotation.y += v.y * s; m.rotation.z += v.z * s; });
        iaC.rotation.y += dt * .3;
        for (let i = 0; i < IN; i++) { iaA[i] += dt * iaS[i] * (1 + act * 3); iaP.set([Math.cos(iaA[i]) * iaRr[i], Math.sin(iaA[i] * 1.3) * iaRr[i] * .5, Math.sin(iaA[i]) * iaRr[i]], i * 3); }
        let n = 0; const th = (.8 + act * 1.2) ** 2;
        for (let i = 0; i < IN && n < 300; i++) for (let j = i + 1; j < IN && n < 300; j++) {
            const dx = iaP[i * 3] - iaP[j * 3], dy = iaP[i * 3 + 1] - iaP[j * 3 + 1], dz = iaP[i * 3 + 2] - iaP[j * 3 + 2];
            if (dx * dx + dy * dy + dz * dz < th) iaL.set([iaP[i * 3], iaP[i * 3 + 1], iaP[i * 3 + 2], iaP[j * 3], iaP[j * 3 + 1], iaP[j * 3 + 2]], n++ * 6);
        }
        iaLg.setDrawRange(0, n * 2); iaPg.attributes.position.needsUpdate = iaLg.attributes.position.needsUpdate = true;
        const u = (T * .25) % 1; // impulsion périodique à travers le réseau
        iaPulse.scale.setScalar(.3 + u * 3.5); iaPulse.material.opacity = zr[1] * (1 - u) * .8; iaPulse.material.color.copy(palA).multiplyScalar(2);
        iaC.scale.setScalar(1 + .3 * Math.max(0, 1 - u * 6));
    }
    if (zr[2] > .01) techs.forEach((o) => { // impulsions HUD → objet : l'objet réagit à l'arrivée
        o.up(); const u = (T * .3 + o.ph) % 1; if (u < o.u) o.react = 1; o.u = u; o.react *= Math.exp(-dt * 3);
        o.dot.position.lerpVectors(o.lab.position, o.g.position, u); o.g.scale.setScalar(1 + .3 * o.react);
    });
}

/* ---------- boucle ---------- */
const clock = new THREE.Clock();
function frame() {
    requestAnimationFrame(frame);
    const dt = Math.max(Math.min(clock.getDelta(), .05), 1e-4); T += dt; // jamais 0 : évite la division par zéro (NaN)
    const reveal = E.out(clamp((T - 2.5) / 5.5)), ex = E.smooth(reveal);
    boost *= Math.exp(-dt * .6);
    // flux global : quelques accélérations brutales synchronisées, puis presque l'arrêt
    S = (.15 + 2.2 * Math.pow(Math.max(0, Math.sin(T * .45 + Math.sin(T * .17) * 2)), 8) + boost * 3) * ZP[zone].flow * reveal;

    /* palette (progressive pendant le voyage, jamais instantanée) */
    const a = PAL[zone], b = PAL[trav ? trav.to : zone], w = trav ? E.inOut(clamp((trav.p - .15) / .8)) : 0;
    palA.copy(a[0]).lerp(b[0], w); palB.copy(a[1]).lerp(b[1], w);
    fond.copy(palA).multiplyScalar(.035); renderer.setClearColor(fond); scene.fog.color.copy(fond);
    main.style.setProperty("--acc", "#" + palA.getHexString());

    /* point guide */
    prev.copy(hero.position);
    if (trav && trav.p < 1) {
        trav.p = Math.min(1, trav.p + dt / 3.4);
        hero.position.copy(trav.start).addScaledVector(trav.dir, 55 * Math.pow(trav.p, 2.6)); // accélère fort
        flash = E.smooth(clamp((trav.p - .86) / .14));
        if (trav.p >= 1) permuter();
    } else if (trav) {
        trav.q = Math.min(1, trav.q + dt / 2.2);
        hero.position.copy(trav.dir).multiplyScalar(-18 * (1 - E.out(trav.q))); // ralentit naturellement
        flash *= Math.exp(-dt * 2.2);
        if (trav.q > .55 && !trav.txt) { trav.txt = true; afficher(zone); btn.classList.add("visible"); }
        if (trav.q >= 1) trav = null;
    } else if (T < 8) {
        spiral += dt * (.4 + 7 * E.in4(clamp((T - 1.5) / 4.5)));
        const r = 5 * E.smooth(clamp((T - 2) / 3)) * (1 - E.smooth(clamp((T - 6) / 2)));
        hero.position.set(Math.cos(spiral) * r, Math.sin(spiral * 1.3) * r * .6, Math.sin(spiral) * r);
    } else {
        hero.position.lerp(zero, 1 - Math.exp(-dt * 2));
        flash *= Math.exp(-dt * 2.2);
    }
    hv.copy(hero.position).sub(prev).divideScalar(dt);
    if (tele) { hv.set(0, 0, 0); tele = false; }
    vit += (clamp(hv.length() / 45, 0, 1.4) - vit) * (1 - Math.exp(-dt * 6));
    const pulse = 1 + .12 * Math.sin(T * 2.2);
    noyau.scale.setScalar(pulse); halo.scale.setScalar(2.4 * pulse + vit * 4); halo.material.color.copy(palA).multiplyScalar(1.6);
    for (let i = 0; i < NO; i++) {
        const an = T * (.6 + i * .15) + i * 2, r = .5 + (i % 4) * .3;
        orbPos.set([Math.cos(an) * r, Math.sin(an * 1.3) * r * .6, Math.sin(an) * r], i * 3);
    }
    orbG.attributes.position.needsUpdate = true;
    tp.copyWithin(3, 0, tp.length - 3); tp.set([hero.position.x, hero.position.y, hero.position.z], 0);
    for (let i = 0; i < NT; i++) { const f = Math.pow(1 - i / NT, 2) * 2.5; tc.set([palA.r * f, palA.g * f, palA.b * f], i * 3); }
    tg.attributes.position.needsUpdate = tg.attributes.color.needsUpdate = true;

    /* caméra : inertie, retard puis rattrapage pendant le voyage, traversée du réseau au repos */
    mouseS.lerp(mouse, 1 - Math.exp(-dt * 2.5));
    let k = 1.6, fovT = 60;
    if (trav) {
        camT.copy(hero.position).addScaledVector(trav.dir, -7); camT.y += 1.3;
        k = trav.sw ? 4 : 1.2 + 14 * trav.p * trav.p;
        fovT = trav.sw ? 60 + 40 * (1 - E.out(trav.q)) : 60 + 40 * E.in4(trav.p);
    } else {
        const zc = 14 + 11 * Math.sin(T * .11) * E.smooth(clamp((T - 8) / 6));
        const zi = T < 8 ? 3.5 + (zc - 3.5) * E.inOut(clamp(T / 8)) : zc;
        camT.set(Math.sin(T * .06) * zi * .4 + mouseS.x * 3, 1.5 + mouseS.y * 2.2 + Math.sin(T * .09) * 2, zi);
    }
    camera.position.lerp(camT, 1 - Math.exp(-dt * k));
    look.lerp(hero.position, 1 - Math.exp(-dt * (trav ? 6 : 3))); camera.lookAt(look);
    camera.fov += (fovT - camera.fov) * (1 - Math.exp(-dt * 3)); camera.updateProjectionMatrix(); camera.updateMatrixWorld();

    /* portail : anneaux contre-rotatifs, de plus en plus vite */
    if (portail.visible && trav) {
        portail.scale.setScalar(E.out(clamp(trav.p * 5)) + .001);
        anneaux.forEach((m) => {
            m.rotation.z += m.userData.v * dt * (1 + 4 * trav.p);
            m.children[0].material.color.copy(palB).multiplyScalar(1.6); m.children[1].material.color.copy(palA).multiplyScalar(2.5);
        });
    }

    /* particules : flux organique + souris + ondes + sillage du héros + portail */
    v3.set(mouse.x, mouse.y, .5).unproject(camera).sub(camera.position).normalize();
    const rx = v3.x, ry = v3.y, rz = v3.z, ox = camera.position.x, oy = camera.position.y, oz = camera.position.z;
    const dm = Math.exp(-dt * 1.3), hp = hero.position, pp = portail.position, sucer = trav && !trav.sw;
    for (let i = waves.length - 1; i >= 0; i--) { waves[i].t += dt; if (waves[i].t > 1.6) waves.splice(i, 1); }
    for (let i = 0; i < N; i++) {
        const a3 = i * 3;
        let bx = base[a3], by = base[a3 + 1], bz = base[a3 + 2];
        bx += (Math.sin(by * .3 + T * .5) * S * 2.2 - bx * .004) * dt;
        by += (Math.sin(bz * .3 + T * .4 + 1) * S * 2.2 - by * .004) * dt;
        bz += (Math.sin(bx * .3 + T * .6 + 2) * S * 2.2 - bz * .004) * dt;
        base[a3] = bx; base[a3 + 1] = by; base[a3 + 2] = bz;
        const px = bx * ex + off[a3], py = by * ex + off[a3 + 1], pz = bz * ex + off[a3 + 2];
        // champ magnétique de la souris
        const wx = px - ox, wy = py - oy, wz = pz - oz, t = wx * rx + wy * ry + wz * rz;
        if (t > 0) {
            const qx = wx - rx * t, qy = wy - ry * t, qz = wz - rz * t, d2 = qx * qx + qy * qy + qz * qz;
            if (d2 < 80) {
                const f = Math.exp(-d2 / 22) * dt * 5;
                off[a3] += (-qx * .35 + (ry * qz - rz * qy) * .5) * f; off[a3 + 1] += (-qy * .35 + (rz * qx - rx * qz) * .5) * f; off[a3 + 2] += (-qz * .35 + (rx * qy - ry * qx) * .5) * f;
            }
        }
        // ondes de clic
        for (const wv of waves) {
            const dx = px - wv.c.x, dy = py - wv.c.y, dz = pz - wv.c.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + .01, r = wv.t * 28;
            const f = Math.exp(-((d - r) * (d - r)) / 8) * (1 - wv.t / 1.6) * 14 * dt / d;
            off[a3] += dx * f; off[a3 + 1] += dy * f; off[a3 + 2] += dz * f;
        }
        // sillage du héros
        const hx = px - hp.x, hy = py - hp.y, hz = pz - hp.z, hd2 = hx * hx + hy * hy + hz * hz;
        if (hd2 < 100 && vit > .05) {
            const f = (1 - Math.sqrt(hd2) / 10) * vit * dt;
            off[a3] += hv.x * f * .5 + hx * f * 3; off[a3 + 1] += hv.y * f * .5 + hy * f * 3; off[a3 + 2] += hv.z * f * .5 + hz * f * 3;
        }
        // portail : aspire de près, repousse de loin
        if (sucer) {
            const dx = px - pp.x, dy = py - pp.y, dz = pz - pp.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + .01;
            const f = (d < 45 ? -(1 - d / 45) * 30 : d < 80 ? (1 - (d - 45) / 35) * 8 : 0) * trav.p * dt / d;
            off[a3] += dx * f; off[a3 + 1] += dy * f; off[a3 + 2] += dz * f;
        }
        off[a3] *= dm; off[a3 + 1] *= dm; off[a3 + 2] *= dm;
        pos[a3] = bx * ex + off[a3]; pos[a3 + 1] = by * ex + off[a3 + 1]; pos[a3 + 2] = bz * ex + off[a3 + 2];
    }
    pg.attributes.position.needsUpdate = true; U.uAlpha.value = reveal; U.uT.value = T;

    /* connexions : apparaissent / disparaissent avec la distance */
    let nl = 0; const L = ZP[zone].link, L2 = L * L;
    for (let i = 0; i < N && nl < MAXL; i++) {
        for (let j = i + 1; j < N && nl < MAXL; j++) {
            const dx = pos[i * 3] - pos[j * 3], dy = pos[i * 3 + 1] - pos[j * 3 + 1], dz = pos[i * 3 + 2] - pos[j * 3 + 2], d2 = dx * dx + dy * dy + dz * dz;
            if (d2 > L2) continue;
            const o = nl * 6, al = (1 - d2 / L2) * reveal * 1.4, c = i % 2 ? palA : palB;
            lp.set([pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], pos[j * 3], pos[j * 3 + 1], pos[j * 3 + 2]], o);
            lc.set([c.r * al, c.g * al, c.b * al, c.r * al, c.g * al, c.b * al], o); nl++;
        }
    }
    lg.setDrawRange(0, nl * 2); lg.attributes.position.needsUpdate = lg.attributes.color.needsUpdate = true;
    avgL += (nl - avgL) * Math.min(1, dt * 2);
    if (nl - avgL > 10 && T - lastTick > .18) { blip(); lastTick = T; }

    /* son synchronisé + lueur + flash */
    sonSync(clamp(Math.max(vit, S / 3.2)));
    bloom.strength = .8 + vit * 1.2 + flash * 1.5;
    scene.fog.density = .02 - clamp(vit) * .008;
    flashEl.style.opacity = flash;
    monde3d(dt);
    composer.render();
}
frame();