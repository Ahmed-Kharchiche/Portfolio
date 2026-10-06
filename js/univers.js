/* Rendu des univers : chaque monde applique ses propres lois (voir univers-logique.js). */
import * as THREE from "three";
import { Neuronal, Immeuble, Machine, Desassemblage, piecesNeuronal, piecesImmeuble, piecesMachine } from "./univers-logique.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const tmp = new THREE.Vector3();

/* briques communes : points à énergie (shader), lignes à intensité par segment, sélection par rayon */
const noeudMat = (C) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { uA: { value: 0 }, uC: { value: C }, uPx: { value: Math.min(devicePixelRatio, 2) } },
    vertexShader: `attribute float aE; uniform float uPx; varying float vE; void main(){ vE = aE; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = clamp(uPx * (5. + aE * 9.) * 60. / -mv.z, 2., 36.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 uC; uniform float uA; varying float vE; void main(){ float a = smoothstep(.5, 0., length(gl_PointCoord - .5)), e = clamp(vE, 0., 1.); gl_FragColor = vec4(mix(uC, vec3(1.), e * .7), a * (.55 + .45 * e) * uA); }`
});
function pts(n, C, M) {
    const P = new Float32Array(n * 3), E = new Float32Array(n), g = new THREE.BufferGeometry(), m = noeudMat(C);
    g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("aE", new THREE.BufferAttribute(E, 1));
    const o = new THREE.Points(g, m); o.frustumCulled = false; M.push([m, 1, 0]);
    return { o, P, E, g, maj() { g.attributes.position.needsUpdate = g.attributes.aE.needsUpdate = true; } };
}
function lignes(seg, M) {
    const P = new Float32Array(seg.length * 6), K = new Float32Array(seg.length * 6), g = new THREE.BufferGeometry();
    seg.forEach((s, i) => P.set(s, i * 6)); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("color", new THREE.BufferAttribute(K, 3));
    const m = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }), o = new THREE.LineSegments(g, m); o.frustumCulled = false; M.push([m, 1, 0]);
    return { o, set(i, v, c) { K.set([c.r * v, c.g * v, c.b * v, c.r * v, c.g * v, c.b * v], i * 6); }, maj() { g.attributes.color.needsUpdate = true; } };
}
function choisir(ray, g, pos, seuil = 1.1) {
    let best = -1, bd = seuil * seuil;
    pos.forEach((p, i) => { const d = ray.ray.distanceSqToPoint(g.localToWorld(tmp.copy(p))); if (d < bd) { bd = d; best = i; } });
    return best;
}

/* ===== IA : les particules sont attirées par les nœuds actifs, l'énergie se propage en chaîne ===== */
function ia(C) {
    const M = [], g = new THREE.Group(), N = [], tailles = [6, 9, 9, 4], xs = [-4.5, -1.6, 1.4, 4.5];
    tailles.forEach((c, l) => { for (let k = 0; k < c; k++) N.push({ x: xs[l] + rnd(-.3, .3), y: (k - (c - 1) / 2) * (4.4 / (c - 1)) + rnd(-.2, .2), z: rnd(-1.5, 1.5), couche: l }); });
    const paires = []; N.forEach((a, i) => N.forEach((b, j) => { if (b.couche === a.couche + 1 && Math.abs(a.y - b.y) < 2.2) paires.push([i, j]); }));
    const cv = new Neuronal(N, paires), nd = pts(N.length, C.b, M), sig = pts(60, C.b, M), NS = 110, es = pts(NS, C.a, M), V = new Float32Array(NS * 3);
    const ln = lignes(paires.map(([a, b]) => [N[a].x, N[a].y, N[a].z, N[b].x, N[b].y, N[b].z]), M);
    N.forEach((n, i) => nd.P.set([n.x, n.y, n.z], i * 3));
    for (let i = 0; i < NS; i++) { const n = N[i % N.length]; es.P.set([n.x + rnd(-1, 1), n.y + rnd(-1, 1), n.z + rnd(-1, 1)], i * 3); }
    g.add(ln.o, nd.o, es.o, sig.o);
    let T = 0, inactif = 0, fige = false;
    return {
        figer() { fige = true; },
        pieces(r) { const amb = []; for (let i = 0; i < NS; i++) amb.push({ c: [es.P[i * 3], es.P[i * 3 + 1], es.P[i * 3 + 2]], v: [V[i * 3], V[i * 3 + 1], V[i * 3 + 2]] }); return piecesNeuronal(cv, N, paires, amb, r); },
        g, mats: M, pos: N.map((n) => new THREE.Vector3(n.x, n.y, n.z)), libelles: [["INPUT", -4.5, -3.3, 0], ["HIDDEN LAYERS", 0, -3.3, 0], ["OUTPUT", 4.5, -3.3, 0]],
        clic(ray) { if (fige) return false; const i = choisir(ray, g, this.pos); if (i < 0) return false; cv.allumer(i, 1); inactif = 0; return true; },
        touche() {},
        update(dt) {
            T += dt; inactif += dt; if (inactif > 7 && !fige) { cv.allumer(Math.floor(rnd(0, tailles[0])), 1); inactif = 0; }
            cv.pas(dt);
            cv.n.forEach((n, i) => (nd.E[i] = n.energie)); nd.maj();
            cv.l.forEach((l, k) => ln.set(k, .1 + l.glow * .9, C.b)); ln.maj();
            let s = 0; // signaux : l'énergie circule réellement dans les connexions
            for (const x of cv.sig) { if (s >= 60) break; const l = cv.l[x.k], A = N[l.a === x.vers ? l.b : l.a], B = N[x.vers], u = Math.min(1, x.t / l.delai); sig.P.set([A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u, A.z + (B.z - A.z) * u], s * 3); sig.E[s++] = 1; }
            sig.g.setDrawRange(0, s); sig.maj();
            const fr = Math.exp(-1.6 * dt); // loi : attraction par les nœuds, d'autant plus forte qu'ils sont actifs
            for (let i = 0; i < NS; i++) {
                const a3 = i * 3; let fx = Math.sin(T * .6 + i) * .15, fy = Math.sin(T * .5 + i * 2) * .15, fz = Math.sin(T * .7 + i * 3) * .15;
                for (let j = 0; j < N.length; j++) {
                    const R = cv.champ(j), dx = N[j].x - es.P[a3], dy = N[j].y - es.P[a3 + 1], dz = N[j].z - es.P[a3 + 2], d = Math.hypot(dx, dy, dz) + .001;
                    if (d < R) { const f = (d > .35 ? (1 - d / R) * (.5 + 2.5 * cv.n[j].energie) : -1.2) / d; fx += dx * f; fy += dy * f; fz += dz * f; }
                }
                V[a3] = (V[a3] + fx * dt) * fr; V[a3 + 1] = (V[a3 + 1] + fy * dt) * fr; V[a3 + 2] = (V[a3 + 2] + fz * dt) * fr;
                es.P[a3] += V[a3] * dt; es.P[a3 + 1] += V[a3 + 1] * dt; es.P[a3 + 2] += V[a3 + 2] * dt;
            }
            es.maj();
        }
    };
}

/* ===== JAVA : système architectural, composants activés dans l'ordre des dépendances, circulation sur réseau orthogonal ===== */
function java(C) {
    const M = [], g = new THREE.Group(), Y = (e) => e * 1.15 - 2.3;
    const noms = [["chambres", "CHAMBRES", 0, []], ["utilisateurs", "UTILISATEURS", 1, []], ["reservations", "RÉSERVATIONS", 2, ["chambres", "utilisateurs"]], ["paiements", "PAIEMENTS", 3, ["reservations"]], ["historique", "HISTORIQUE", 4, ["paiements"]]];
    const B = new Immeuble(noms.map(([id, , etage, deps]) => ({ id, etage, deps })));
    const mat = () => { const m = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }); M.push([m, 1, 0]); return m; };
    const boite = new THREE.EdgesGeometry(new THREE.BoxGeometry(3.4, .8, 1.4)), cm = noms.map(([, , e]) => { const m = mat(), o = new THREE.LineSegments(boite, m); o.position.set(.6, Y(e), 0); g.add(o); return m; });
    const rm = mat(), rail = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-2.6, Y(0) - .6, 0), new THREE.Vector3(-2.6, Y(4) + .6, 0)]), rm); g.add(rail);
    const cabM = mat(), cab = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(.7, .75, .7)), cabM); g.add(cab);
    const porte = new THREE.Mesh(new THREE.PlaneGeometry(.5, .6), new THREE.MeshBasicMaterial({ color: C.b, transparent: true, opacity: .5, depthWrite: false })); porte.position.z = .36; cab.add(porte); M.push([porte.material, .5, 1]);
    const X = [-2.6, -1, .6, 2.2], NP = 90, es = pts(NP, C.a, M), pa = Array.from({ length: NP }, () => { const c = Math.floor(rnd(0, 4)), f = Math.floor(rnd(0, 5)); return { c, f, tc: c, tf: f, x: X[c], y: Y(f) }; });
    g.add(es.o);
    let inactif = 0, fige = false;
    return {
        figer() { fige = true; },
        pieces(r) {
            const aretes = (geo, o) => { const a = geo.attributes.position.array, R = []; for (let i = 0; i < a.length; i += 6) R.push([[a[i] + o[0], a[i + 1] + o[1], a[i + 2] + o[2]], [a[i + 3] + o[0], a[i + 4] + o[1], a[i + 5] + o[2]]]); return R; };
            const etages = noms.map(([id, , e], i) => ({ id, etage: e, dep: B.dependants(id).size, etat: B.c[i].etat, aretes: aretes(boite, [.6, Y(e), 0]) }));
            return piecesImmeuble({ etages, rail: [[-2.6, Y(0) - .6, 0], [-2.6, Y(4) + .6, 0]], cab: aretes(cab.geometry, [-2.6, Y(B.cab.y), 0]), flux: pa.map((p) => [p.x, p.y, -.7]) }, r);
        },
        g, mats: M, pos: noms.map(([, , e]) => new THREE.Vector3(.6, Y(e), 0)), libelles: noms.map(([, n, e]) => [n, -4.9, Y(e), 0]),
        clic(ray) { if (fige) return false; const i = choisir(ray, g, this.pos, 1.3); if (i < 0) return false; B.declencher(noms[i][0]); inactif = 0; return true; },
        touche() {},
        update(dt) {
            inactif += dt; if (inactif > 9 && B.cab.phase === "repos" && !fige) { B.declencher(["chambres", "utilisateurs"][Math.floor(rnd(0, 2))]); inactif = 0; }
            B.pas(dt);
            B.c.forEach((c, i) => cm[i].color.copy(C.b).multiplyScalar(c.etat === "actif" ? 1.2 : c.etat === "fait" ? .75 : .3));
            cab.position.set(-2.6, Y(B.cab.y), 0); porte.scale.x = Math.max(.08, 1 - B.cab.porte * .9); rm.color.copy(C.a).multiplyScalar(.6); cabM.color.copy(C.b);
            for (let i = 0; i < NP; i++) { // loi : mouvement strictement orthogonal, vitesse constante, changements de direction aux jonctions
                const p = pa[i], dx = X[p.tc] - p.x, dy = Y(p.tf) - p.y;
                if (Math.abs(dx) + Math.abs(dy) < .03) {
                    p.c = p.tc; p.f = p.tf; const o = [];
                    if (p.c > 0) o.push([p.c - 1, p.f]); if (p.c < 3) o.push([p.c + 1, p.f]);
                    if (p.c === 0) { if (p.f > 0) o.push([0, p.f - 1]); if (p.f < 4) o.push([0, p.f + 1]); }
                    [p.tc, p.tf] = o[Math.floor(rnd(0, o.length))];
                } else if (Math.abs(dx) > .001) p.x += Math.sign(dx) * Math.min(Math.abs(dx), 1.4 * dt); else p.y += Math.sign(dy) * Math.min(Math.abs(dy), 1.4 * dt);
                es.P.set([p.x, p.y, -.7], i * 3);
            }
            es.maj();
        }
    };
}

/* ===== C : machine algorithmique, Dijkstra visible ; les perdantes s'éteignent, le chemin retenu domine ===== */
function machine(C) {
    const M = [], g = new THREE.Group(), W = 7, H = 5, n = W * H, pos = Array.from({ length: n }, (_, i) => new THREE.Vector3(((i % W) - 3) * 1.5, (2 - ((i / W) | 0)) * 1.15, 0));
    let s = 14, e = 20;
    const murs = () => { const m = new Set(); while (m.size < 6) { const c = Math.floor(rnd(0, n)); if (c !== s && c !== e) m.add(c); } return m; };
    const mach = new Machine(W, H, murs(), s, e), rails = [], cle = new Map();
    for (let i = 0; i < n; i++) { if (i % W < W - 1) rails.push([i, i + 1]); if (i + W < n) rails.push([i, i + W]); }
    rails.forEach(([a, b], k) => { cle.set(a + ">" + b, k); cle.set(b + ">" + a, k); });
    const ln = lignes(rails.map(([a, b]) => [...pos[a].toArray(), ...pos[b].toArray()]), M), val = new Float32Array(rails.length), nd = pts(n, C.b, M), pk = pts(70, C.a, M), paquets = [];
    pos.forEach((p, i) => nd.P.set(p.toArray(), i * 3)); g.add(ln.o, nd.o, pk.o);
    let vus = 0, acc = 0, flux = 0, repos = 0, fige = false;
    const rebuild = (m) => { mach.reconstruire(m, s, e); vus = 0; paquets.length = 0; val.fill(0); repos = 0; };
    const cible = { dominant: 1, actif: .5, eteint: 0 };
    return {
        figer() { fige = true; },
        pieces(r) { return piecesMachine({ W, pos: pos.map((p) => p.toArray()), rails, val, murs: mach.murs, s, e, dom: new Set(mach.etat === "trouve" ? mach.chemin : []), ferme: mach.ferme, paquets: paquets.map((p) => ({ a: p.a, b: p.b, t: p.t })) }, r); },
        g, mats: M, pos, libelles: [["ALGORITHME · PLUS COURT CHEMIN", 0, -3.4, 0]],
        clic(ray, maj) { if (fige) return false; const i = choisir(ray, g, pos, .8); if (i < 0 || mach.murs.has(i) || i === (maj ? e : s)) return false; if (maj) s = i; else e = i; rebuild(mach.murs); return true; },
        touche(k) { if (k === "g" && !fige) rebuild(murs()); },
        update(dt) {
            acc += dt * 8; while (acc >= 1) { mach.pas(); acc--; }
            while (vus < mach.aretes.length) { const a = mach.aretes[vus++]; paquets.push({ a: a.a, b: a.b, t: 0 }); } // les données parcourent chaque branche explorée
            if (mach.etat === "trouve") {
                flux += dt; if (flux > .45 && paquets.length < 55) { flux = 0; mach.chemin.slice(1).forEach((c, i) => paquets.push({ a: mach.chemin[i], b: c, t: -i * .18 })); }
                repos += dt; if (repos > 8 && !fige) { do { e = Math.floor(rnd(0, n)); } while (e === s || mach.murs.has(e)); rebuild(mach.murs); }
            }
            for (const a of mach.aretes) { const k = cle.get(a.a + ">" + a.b), t = cible[a.etat]; val[k] += (t - val[k]) * (1 - Math.exp(-dt * (t ? 3 : 1.4))); }
            rails.forEach(([a, b], k) => ln.set(k, mach.murs.has(a) || mach.murs.has(b) ? 0 : Math.max(.07, val[k]), C.b)); ln.maj();
            const dom = new Set(mach.etat === "trouve" ? mach.chemin : []);
            for (let i = 0; i < n; i++) { nd.P[i * 3 + 2] = mach.murs.has(i) ? 9999 : 0; nd.E[i] = i === s || i === e ? 1 : dom.has(i) ? .9 : mach.ferme.has(i) ? .5 : .15; } nd.maj();
            let c = 0;
            for (let i = paquets.length - 1; i >= 0; i--) { const p = paquets[i]; p.t += dt * 1.6; if (p.t > 1) { paquets.splice(i, 1); continue; } if (p.t >= 0 && c < 70) { pk.P.set(tmpLerp(pos[p.a], pos[p.b], p.t), c * 3); pk.E[c++] = 1; } }
            pk.g.setDrawRange(0, c); pk.maj();
        }
    };
}

/* ===== désassemblage : rendu des pièces (la logique est dans univers-logique.js) ===== */
function rendreDebris(g, M, C, D) {
    const P = D.p, ns = P.filter((p) => p.seg).length, lp = new Float32Array(ns * 6), lc = new Float32Array(ns * 6), lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(lp, 3)); lg.setAttribute("color", new THREE.BufferAttribute(lc, 3));
    const lm = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }), lo = new THREE.LineSegments(lg, lm); lo.frustumCulled = false; M.push([lm, 1, 0]);
    const pt = pts(P.length, C.a, M); g.add(lo, pt.o);
    return () => {
        let k = 0;
        P.forEach((p, i) => {
            const vivant = p.ph < 4;
            if (p.seg) { // segment : demi-longueur qui rétrécit jusqu'au point
                const hl = vivant ? p.L * p.s : 0, hx = p.h[0] * hl, hy = p.h[1] * hl, hz = p.h[2] * hl, e = vivant && p.s > 0 ? p.e : 0, o = k++ * 6;
                lp[o] = p.c[0] - hx; lp[o + 1] = p.c[1] - hy; lp[o + 2] = p.c[2] - hz; lp[o + 3] = p.c[0] + hx; lp[o + 4] = p.c[1] + hy; lp[o + 5] = p.c[2] + hz;
                lc[o] = lc[o + 3] = C.b.r * e; lc[o + 1] = lc[o + 4] = C.b.g * e; lc[o + 2] = lc[o + 5] = C.b.b * e;
            }
            const aff = vivant && (!p.seg || p.s < .65); // un segment ne montre son point qu'une fois fragmenté
            pt.P[i * 3] = aff ? p.c[0] : 9999; pt.P[i * 3 + 1] = aff ? p.c[1] : 9999; pt.P[i * 3 + 2] = aff ? p.c[2] : 9999; pt.E[i] = p.e;
        });
        lg.attributes.position.needsUpdate = lg.attributes.color.needsUpdate = true; pt.maj();
    };
}
const lisse = (t) => t * t * (3 - 2 * t), borne = (x) => Math.min(1, Math.max(0, x));
const tmpLerp = (a, b, t) => [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t];

export function creerUnivers(type, C) {
    const u = { ia, java, c: machine }[type]?.(C); if (!u) return null;
    const vivant = u.update; let t = 0, ds = null, dessiner = null, core = null;
    /* quitter le projet : (1) le système ralentit et ses interactions sont figées — ses lois continuent au ralenti —
       (2) à la fin du ralentissement, ses éléments passent aux pièces détachables (ordre propre à chaque univers) et deviennent particules vers le Core */
    return Object.assign(u, {
        demarre: false, retour: 0, rappel: null,
        demonter(coreLocal, rappel) { if (u.demarre) return; u.demarre = true; u.figer(); core = coreLocal; u.rappel = rappel; },
        update(dt) {
            if (!u.demarre) return vivant(dt);
            t += dt;
            if (!ds) {
                vivant(dt * (1 - .88 * lisse(borne(t / 1.2))));
                if (t >= 1.2) {
                    ds = new Desassemblage(u.pieces(Math.random), [core.x, core.y, core.z], [0, 0, 0]); ds.surArrivee = u.rappel;
                    u.g.children.forEach((c) => (c.visible = false)); dessiner = rendreDebris(u.g, u.mats, C, ds); // même positions : la structure est relayée sans saut
                }
                return;
            }
            ds.pas(dt); dessiner(); u.retour = ds.retour;
        }
    });
}