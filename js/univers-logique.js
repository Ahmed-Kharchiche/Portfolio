/* Lois physiques propres à chaque univers : logique pure (sans Three.js), donc testable en Node. */

/* IA — l'énergie se propage de nœud en nœud avec retard et réaction en chaîne */
export class Neuronal {
    constructor(noeuds, paires) {
        this.n = noeuds.map((p) => ({ ...p, energie: 0, charge: 0, refr: 0 }));
        this.l = paires.map(([a, b]) => ({ a, b, glow: 0, delai: .12 + Math.hypot(noeuds[a].x - noeuds[b].x, noeuds[a].y - noeuds[b].y, noeuds[a].z - noeuds[b].z) * .09 }));
        this.sig = []; this.voisins = this.n.map(() => []);
        this.l.forEach((l, k) => { this.voisins[l.a].push(k); this.voisins[l.b].push(k); });
    }
    allumer(i, e = 1) { // un nœud s'active puis émet vers ses voisins ; le signal arrive après un délai proportionnel à la longueur du lien
        const n = this.n[i]; if (n.refr > 0) return;
        n.energie = 1; n.refr = 1.4; n.charge = 0;
        for (const k of this.voisins[i]) { const l = this.l[k], vers = l.a === i ? l.b : l.a; if (this.n[vers].refr <= 0) this.sig.push({ k, vers, t: 0, e: e * .78 }); }
    }
    champ(i) { return 1.2 + 3 * this.n[i].energie; } // plus un nœud est actif, plus son champ d'attraction grandit
    pas(dt) {
        for (const n of this.n) { n.energie *= Math.exp(-1.8 * dt); n.refr = Math.max(0, n.refr - dt); n.charge *= Math.exp(-2 * dt); }
        for (const l of this.l) l.glow *= Math.exp(-2.4 * dt);
        for (let s = this.sig.length - 1; s >= 0; s--) {
            const g = this.sig[s], l = this.l[g.k]; g.t += dt; if (g.t < l.delai) continue;
            l.glow = 1; this.sig.splice(s, 1);
            const n = this.n[g.vers]; n.charge += g.e;
            if (n.charge >= .3 && n.refr <= 0) this.allumer(g.vers, g.e); // réaction en chaîne, de plus en plus faible
        }
    }
}

/* JAVA — composants dépendants, activés l'un après l'autre par une cabine à profil de vitesse trapézoïdal */
export class Immeuble {
    constructor(comps) { this.c = comps.map((c) => ({ ...c, etat: "attente", t: 0 })); this.cab = { y: 0, v: 0, cible: 0, porte: 0, phase: "repos", cur: -1 }; }
    dependants(id) { // l'élément et tout ce qui en dépend
        const s = new Set([id]); let plus = true;
        while (plus) { plus = false; for (const c of this.c) if (!s.has(c.id) && c.deps.some((d) => s.has(d))) { s.add(c.id); plus = true; } }
        return s;
    }
    declencher(id) { const s = this.dependants(id); for (const c of this.c) { c.etat = s.has(c.id) ? "attente" : "fait"; c.t = 0; } this.cab.phase = "repos"; }
    pret(c) { return c.etat === "attente" && c.deps.every((d) => this.c.find((x) => x.id === d).etat === "fait"); }
    pas(dt) {
        const k = this.cab;
        if (k.phase === "repos") { const c = this.c.find((x) => this.pret(x)); if (!c) return; k.cur = this.c.indexOf(c); k.cible = c.etage; k.phase = "monte"; }
        if (k.phase === "monte") {
            const d = k.cible - k.y, dir = Math.sign(d), A = 5, V = 2.6, frein = (k.v * k.v) / (2 * A);
            if ((Math.abs(d) < .02 && Math.abs(k.v) < .15) || (Math.abs(d) < .06 && Math.abs(k.v) < .4)) { k.y = k.cible; k.v = 0; k.phase = "porte"; }
            else { k.v += (Math.abs(d) <= frein ? -Math.sign(k.v || dir) * A : dir * A) * dt; k.v = Math.max(-V, Math.min(V, k.v)); k.y += k.v * dt; }
        } else if (k.phase === "porte") { k.porte = Math.min(1, k.porte + dt / .35); if (k.porte >= 1) { k.phase = "travail"; this.c[k.cur].etat = "actif"; this.c[k.cur].t = 0; } }
        else if (k.phase === "travail") { const c = this.c[k.cur]; c.t += dt; if (c.t >= .8) { c.etat = "fait"; k.phase = "ferme"; } }
        else if (k.phase === "ferme") { k.porte = Math.max(0, k.porte - dt / .35); if (k.porte <= 0) k.phase = "repos"; }
    }
}

/* C — recherche du plus court chemin (Dijkstra) : plusieurs branches explorées en parallèle, les perdantes s'éteignent, le chemin retenu domine */
export class Machine {
    constructor(w, h, murs, s, e) { this.w = w; this.h = h; this.reconstruire(murs, s, e); }
    cout(a, b) { return 1 + ((a * 7 + b * 13) % 3) * .5; }
    voisins(i) {
        const x = i % this.w, y = (i / this.w) | 0, r = [];
        if (x > 0) r.push(i - 1); if (x < this.w - 1) r.push(i + 1); if (y > 0) r.push(i - this.w); if (y < this.h - 1) r.push(i + this.w);
        return r.filter((j) => !this.murs.has(j));
    }
    reconstruire(murs, s, e) { // un changement de paramètres reconstruit tout
        Object.assign(this, { murs: new Set(murs), s, e, dist: new Map([[s, 0]]), par: new Map(), ferme: new Set(), ouvert: [s], aretes: [], etat: "explore", chemin: [] });
    }
    pas() {
        if (this.etat !== "explore") return;
        if (!this.ouvert.length) { this.etat = "impossible"; for (const a of this.aretes) a.etat = "eteint"; return; }
        this.ouvert.sort((a, b) => this.dist.get(a) - this.dist.get(b));
        const u = this.ouvert.shift(); this.ferme.add(u);
        if (u === this.e) return this.conclure();
        let neuf = 0;
        for (const v of this.voisins(u)) {
            if (this.ferme.has(v)) continue;
            const d = this.dist.get(u) + this.cout(u, v);
            if (this.dist.has(v) && d >= this.dist.get(v)) continue;
            const vieux = this.aretes.find((x) => x.b === v && x.a === this.par.get(v)); if (vieux) vieux.etat = "eteint"; // meilleure route : l'ancienne s'éteint
            this.dist.set(v, d); this.par.set(v, u); this.aretes.push({ a: u, b: v, etat: "actif" }); neuf++;
            if (!this.ouvert.includes(v)) this.ouvert.push(v);
        }
        if (!neuf && u !== this.s) { const p = this.aretes.find((x) => x.b === u && x.a === this.par.get(u)); if (p) p.etat = "eteint"; } // impasse
    }
    conclure() {
        this.etat = "trouve"; const ch = [this.e]; while (this.par.has(ch[0])) ch.unshift(this.par.get(ch[0])); this.chemin = ch;
        const on = new Set(ch.slice(1).map((n, i) => ch[i] + ">" + n));
        for (const a of this.aretes) a.etat = on.has(a.a + ">" + a.b) ? "dominant" : "eteint";
    }
}

/* ===== DÉSASSEMBLAGE — un système qui quitte la scène perd sa structure, pièce par pièce, puis retourne au Core =====
   Logique pure (sans Three.js). Chaque pièce (segment ou point) traverse : 0 fixe (s'éteint, attend son tour) → 1 détachée (impulsion + rotation, damping)
   → 2 fragmentée (le segment se réduit en point) → 3 particule attirée par le Core (accélération progressive, damping, trajectoire courbe) → 4 arrivée.
   L'ordre de détachement (td : extinction, t0 : séparation) vient des lois de chaque univers : propagation des couches, dépendances, distance au départ. */
const hyp = (a) => Math.hypot(a[0], a[1], a[2]);
const lerp3 = (A, B, u) => [A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[2] + (B[2] - A[2]) * u];
const unite = (r) => { let v; do v = [r() * 2 - 1, r() * 2 - 1, r() * 2 - 1]; while (hyp(v) > 1 || hyp(v) < .1); const d = hyp(v); return v.map((x) => x / d); };
export const segment = (A, B, o) => { const d = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], L = hyp(d) / 2 || .01; return { seg: true, c: lerp3(A, B, .5), h: d.map((x) => x / (2 * L)), L, ...o }; };
export const point = (c, o) => ({ seg: false, c: [...c], h: [1, 0, 0], L: 0, ...o });
const coupe = (A, B, n, f) => Array.from({ length: n }, (_, i) => segment(lerp3(A, B, i / n), lerp3(A, B, (i + 1) / n), f(i))); // une ligne se fragmente en morceaux

const RYTHME = .7; // compresse la chronologie des détachements (réglage global de la durée du désassemblage)
export class Desassemblage {
    constructor(pieces, core, centre = [0, 0, 0], rng = Math.random) {
        this.core = core; this.ctr = centre; this.rng = rng; this.T = 0; this.arrives = 0; this.surArrivee = null;
        this.p = pieces.map((q) => ({ ph: 0, tl: 0, r: 0, w: [0, 0, 0], s: q.seg ? 1 : 0, dur: .45 + rng() * .5, sw: unite(rng), ...q, td: q.td * RYTHME, t0: q.t0 * RYTHME, c: [...q.c], h: [...q.h], v: q.v ? [...q.v] : [0, 0, 0], derive: !!q.v }));
    }
    get retour() { return this.p.length ? this.arrives / this.p.length : 1; }
    pas(dt) {
        this.T += dt;
        const T = this.T, K = this.core, rng = this.rng, f1 = Math.exp(-1.3 * dt), f3 = Math.exp(-1.5 * dt);
        for (const p of this.p) {
            if (p.ph === 4) continue;
            const c = p.c, v = p.v;
            if (p.ph === 0) {
                if (T > p.td) p.e += (p.eLow - p.e) * (1 - Math.exp(-3 * dt)); // la connexion / le composant s'éteint
                if (T < p.t0) { if (p.derive) { const f = Math.exp(-1.2 * dt); for (let i = 0; i < 3; i++) { c[i] += v[i] * dt; v[i] *= f; } } continue; }
                const o = [c[0] - this.ctr[0], c[1] - this.ctr[1], c[2] - this.ctr[2]], d = hyp(o) + .001, k = .8 + rng() * 1.4;
                for (let i = 0; i < 3; i++) { v[i] += o[i] / d * k + (rng() - .5) * .8; p.w[i] = (rng() - .5) * 5; } // séparation : la pièce part avec une vitesse et une rotation
                p.ph = 1; p.tl = 0;
            }
            if (p.ph === 1) { for (let i = 0; i < 3; i++) v[i] *= f1; p.tl += dt; if (p.tl > p.dur) p.ph = p.s > 0 ? 2 : 3; }
            else if (p.ph === 2) { for (let i = 0; i < 3; i++) v[i] *= f1; p.s = Math.max(0, p.s - dt / .6); p.e += (1 - p.e) * (1 - Math.exp(-2 * dt)); if (p.s <= 0) p.ph = 3; }
            if (p.ph === 3) {
                p.r += dt; p.e += (1 - p.e) * (1 - Math.exp(-2 * dt));
                const dx = K[0] - c[0], dy = K[1] - c[1], dz = K[2] - c[2], d = Math.hypot(dx, dy, dz) + .001;
                if (d < 1.6) { p.ph = 4; this.arrives++; if (this.surArrivee) this.surArrivee(p); continue; }
                const a = 8 + 40 * Math.pow(Math.min(p.r / 1.1, 1), 1.5), ux = dx / d, uy = dy / d, uz = dz / d, s = p.sw, q = .35 * Math.min(1, d / 8); // accélération progressive ; le terme tangent courbe la trajectoire de loin et s'efface à l'approche (sinon orbite)
                v[0] = (v[0] + (ux * a + (s[1] * uz - s[2] * uy) * a * q) * dt) * f3;
                v[1] = (v[1] + (uy * a + (s[2] * ux - s[0] * uz) * a * q) * dt) * f3;
                v[2] = (v[2] + (uz * a + (s[0] * uy - s[1] * ux) * a * q) * dt) * f3;
            }
            for (let i = 0; i < 3; i++) c[i] += v[i] * dt;
            if (p.seg && p.s > 0) { // le morceau tourne sur lui-même (h reste unitaire)
                const h = p.h, w = p.w, nx = h[0] + (w[1] * h[2] - w[2] * h[1]) * dt, ny = h[1] + (w[2] * h[0] - w[0] * h[2]) * dt, nz = h[2] + (w[0] * h[1] - w[1] * h[0]) * dt, n = Math.hypot(nx, ny, nz) || 1;
                h[0] = nx / n; h[1] = ny / n; h[2] = nz / n; for (let i = 0; i < 3; i++) w[i] *= f1;
            }
        }
    }
}

/* IA : les connexions s'éteignent couche par couche (sens du signal), les nœuds se détachent, les signaux en vol et les particules deviennent des particules libres */
export function piecesNeuronal(cv, N, paires, ambiant, rng = Math.random) {
    const R = [], r = rng;
    paires.forEach(([a, b], k) => {
        const A = N[a], B = N[b], td = A.couche * .45 + r() * .3;
        R.push(...coupe([A.x, A.y, A.z], [B.x, B.y, B.z], 2, (i) => ({ e: .1 + cv.l[k].glow * .9, eLow: .04, td, t0: 2.1 + A.couche * .4 + i * .15 + r() * .5 })));
    });
    N.forEach((n, i) => R.push(point([n.x, n.y, n.z], { e: Math.max(.15, cv.n[i].energie), eLow: .12, td: .5 + n.couche * .45, t0: 1.4 + n.couche * .5 + r() * .4 })));
    for (const x of cv.sig) { const l = cv.l[x.k], A = N[l.a === x.vers ? l.b : l.a], B = N[x.vers]; R.push(point(lerp3([A.x, A.y, A.z], [B.x, B.y, B.z], Math.min(1, x.t / l.delai)), { e: 1, eLow: 1, td: 0, t0: r() * .4 })); }
    for (const q of ambiant) R.push(point(q.c, { e: .5, eLow: .5, td: 0, t0: 1 + r() * 2.5, v: q.v }));
    return R;
}

/* JAVA : étage par étage, les dépendants d'abord (la loi de dépendance de l'Immeuble donne l'ordre) ; arêtes → morceaux → particules ; rail et cabine suivent ; la circulation se rompt */
export function piecesImmeuble({ etages, rail, cab, flux }, rng = Math.random) {
    const R = [], r = rng;
    for (const f of etages) {
        const td = (f.dep - 1) * .55, e = f.etat === "actif" ? 1.2 : f.etat === "fait" ? .75 : .3;
        for (const [A, B] of f.aretes) R.push(...coupe(A, B, 2, (i) => ({ e, eLow: .15, td, t0: td + .5 + i * .2 + r() * .6 })));
    }
    R.push(...coupe(rail[0], rail[1], 6, (i) => ({ e: .6, eLow: .2, td: .3 + (5 - i) * .3, t0: .9 + (5 - i) * .3 + r() * .3 })));
    for (const [A, B] of cab) R.push(segment(A, B, { e: 1, eLow: .5, td: .5, t0: 1.1 + r() * .6 }));
    for (const c of flux) R.push(point(c, { e: .8, eLow: .8, td: 0, t0: .3 + r() * 3.4 }));
    return R;
}

/* C : les chemins explorés s'éteignent, puis le graphe se fragmente en partant de la source (distance dans la grille) : branches, puis nœuds */
export function piecesMachine({ W, pos, rails, val, murs, s, e, dom, ferme, paquets }, rng = Math.random) {
    const R = [], r = rng, dist = (i) => Math.abs((i % W) - (s % W)) + Math.abs(((i / W) | 0) - ((s / W) | 0));
    rails.forEach(([a, b], k) => {
        if (murs.has(a) || murs.has(b)) return;
        const v = Math.max(.07, val[k]), d = Math.min(dist(a), dist(b));
        R.push(...coupe(pos[a], pos[b], 2, (i) => ({ e: v, eLow: .06, td: v > .2 ? r() * .8 : 0, t0: 1.5 + .17 * d + i * .1 + r() * .5 })));
    });
    pos.forEach((p, i) => {
        if (murs.has(i)) return;
        const en = i === s || i === e ? 1 : dom.has(i) ? .9 : ferme.has(i) ? .5 : .15;
        R.push(point(p, { e: en, eLow: Math.min(en, .3), td: .4, t0: 2.1 + .17 * dist(i) + r() * .5 }));
    });
    for (const q of paquets) if (q.t >= 0) R.push(point(lerp3(pos[q.a], pos[q.b], Math.min(1, q.t)), { e: 1, eLow: 1, td: 0, t0: r() * .5 }));
    return R;
}