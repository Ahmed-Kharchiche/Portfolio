/**
 * sablier.js : sablier 3D en WebGL2 (sans dépendance), pour la scène 1 d'Emotion AI.
 *
 * Contrat : creerSablier(canevas) renvoie { rendre(etat), redimensionner(), couleurs(), detruire() }
 * ou null si WebGL2 est indisponible (la scène reste alors celle de la version validée).
 *
 * Principe clé : le rendu est une FONCTION PURE de l'état reçu. Aucune boucle d'animation, aucune
 * simulation incrémentale : le sable est recalculé à chaque appel à partir de l'orientation, donc
 * l'animation est parfaitement réversible au scroll et indépendante de la vitesse de défilement.
 *
 * Sable : des grains fixes remplissent chaque ampoule ; on n'affiche que les K grains les plus bas
 * selon la gravité (K = volume de sable voulu). La surface reste donc horizontale quelle que soit
 * l'orientation, et le volume est conservé à l'identique.
 *
 * État (tous nombres) : x, y, taille (px), angle (rad, 0 = vertical), lacet, tangage (rad),
 *   remplissageA / remplissageB (0..1, ampoule du haut au départ / du bas), secousse (rad),
 *   ruisseau (0..1) + phase, reseau (0..1), energie (0..1), opacite (0..1), verre (défaut 1).
 *   visage facultatif : { morph, cx, cy, hauteur (px), scan, analyse, sourire, dispersion, lueur }.
 * Le visage est injecté via options.creerVisage ; sans cette option le rendu de référence reste autonome.
 */

import { creerInterieur } from "./reseau-interieur.js";

const FOV = (28 * Math.PI) / 180;
const DISTANCE = 10;            // distance caméra / centre du modèle
const R_MAX = 0.56;             // rayon maximal de l'ampoule (modèle : hauteur totale = 2)
const R_COU = 0.045;            // rayon extérieur au niveau de l'étranglement
const EPAISSEUR = 0.032;        // épaisseur du verre
const R_INT_MAX = R_MAX - EPAISSEUR;

/* ---------------------------------------------------------------- maths */
const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
        let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k];
        o[c * 4 + r] = s;
    }
    return o;
};
const identite = () => Float32Array.of(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
const translation = (x, y, z) => { const m = identite(); m[12] = x; m[13] = y; m[14] = z; return m; };
const echelle = (s) => { const m = identite(); m[0] = m[5] = m[10] = s; return m; };
const rotX = (a) => { const c = Math.cos(a), s = Math.sin(a), m = identite(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; };
const rotY = (a) => { const c = Math.cos(a), s = Math.sin(a), m = identite(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; };
const rotZ = (a) => { const c = Math.cos(a), s = Math.sin(a), m = identite(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; };
const perspective = (fov, ratio, n, f) => {
    const t = 1 / Math.tan(fov / 2), m = new Float32Array(16);
    m[0] = t / ratio; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = (2 * f * n) / (n - f);
    return m;
};
const mulVec3 = (m, x, y, z) => [m[0] * x + m[4] * y + m[8] * z, m[1] * x + m[5] * y + m[9] * z, m[2] * x + m[6] * y + m[10] * z];
const transposeMulVec3 = (m, x, y, z) => [m[0] * x + m[1] * y + m[2] * z, m[4] * x + m[5] * y + m[6] * z, m[8] * x + m[9] * y + m[10] * z];
const norm3 = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };

/** Générateur pseudo-aléatoire déterministe : le sable est identique à chaque chargement. */
function graine(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/* ---------------------------------------------------------------- géométrie */
const UE0 = Math.sqrt(1 + 0.0049) - 0.07;
function rayonExterieur(y) {
    const u = Math.abs(y), ue = (Math.sqrt(u * u + 0.0049) - 0.07) / UE0;
    return R_COU + (R_MAX - R_COU) * Math.max(Math.sin(Math.PI * 0.795 * Math.pow(ue, 0.709)), 0);
}
const rayonInterieur = (y) => Math.max(rayonExterieur(y) - EPAISSEUR, 0.012);

/** Surface de révolution (tour) à partir d'un profil [{r, y, nr, ny}] ; renvoie positions+normales et indices. */
function tourner(profil, segments, inverser) {
    const n = profil.length, pos = new Float32Array(n * (segments + 1) * 3), nor = new Float32Array(pos.length);
    const idx = new Uint32Array((n - 1) * segments * 6);
    let p = 0;
    for (let i = 0; i < n; i++) for (let s = 0; s <= segments; s++) {
        const a = (s / segments) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), q = profil[i];
        pos[p] = q.r * c; pos[p + 1] = q.y; pos[p + 2] = q.r * sn;
        const k = inverser ? -1 : 1;
        nor[p] = k * q.nr * c; nor[p + 1] = k * q.ny; nor[p + 2] = k * q.nr * sn;
        p += 3;
    }
    let t = 0;
    for (let i = 0; i < n - 1; i++) for (let s = 0; s < segments; s++) {
        const a = i * (segments + 1) + s, b = a + segments + 1;
        idx[t++] = a; idx[t++] = b; idx[t++] = a + 1; idx[t++] = a + 1; idx[t++] = b; idx[t++] = b + 1;
    }
    return { pos, nor, idx };
}
function profilVerre(rayon, pas) {
    const pts = [];
    for (let k = 0; k <= pas; k++) {
        const t = k / pas, y = Math.sign(t - 0.5) * Math.pow(Math.abs(2 * t - 1), 1.35); // plus dense près de l'étranglement
        pts.push({ r: rayon(y), y });
    }
    for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, pts.length - 1)];
        const dr = b.r - a.r, dy = b.y - a.y, l = Math.hypot(dr, dy) || 1;
        pts[i].nr = dy / l; pts[i].ny = -dr / l;
    }
    return pts;
}
function profilBouchon(signe) {
    // profil (rayon, hauteur) d'un bouchon en laiton : disque plat, flanc arrondi, dessus plat
    const brut = [[0, 1.0], [0.34, 1.0], [0.44, 1.012], [0.485, 1.032], [0.5, 1.058], [0.49, 1.088], [0.46, 1.11], [0.4, 1.12], [0.0, 1.12]];
    const pts = brut.map(([r, y]) => ({ r, y: signe * y }));
    pts.forEach((q, i) => {
        const t = i / (pts.length - 1);
        if (i === 0 || i === pts.length - 1) { q.nr = 0; q.ny = i === 0 ? -signe : signe; return; }
        const nr = Math.sin(t * Math.PI) * 0.9, ny = signe * (t < 0.5 ? -(1 - Math.sin(t * Math.PI) * 0.4) : 1 - Math.sin(t * Math.PI) * 0.4);
        const l = Math.hypot(nr, ny); q.nr = nr / l; q.ny = ny / l;
    });
    return pts;
}

/** Grains : positions uniformes dans le volume intérieur de chaque ampoule. */
function creerGrains(parAmpoule) {
    const rnd = graine(20250517), total = parAmpoule * 2;
    const pos = new Float32Array(total * 3), alea = new Float32Array(total * 4), ampoule = new Uint8Array(total);
    for (let b = 0; b < 2; b++) {
        const signe = b === 0 ? 1 : -1;
        for (let i = 0; i < parAmpoule; i++) {
            let y, r2, ok = false;
            while (!ok) {
                y = 0.012 + rnd() * 0.972; r2 = rnd() * R_INT_MAX * R_INT_MAX;
                const ri = rayonInterieur(y) - 0.006; ok = r2 <= ri * ri;
            }
            const a = rnd() * Math.PI * 2, r = Math.sqrt(r2), k = b * parAmpoule + i;
            pos[k * 3] = r * Math.cos(a); pos[k * 3 + 1] = signe * y; pos[k * 3 + 2] = r * Math.sin(a);
            alea[k * 4] = 0.75 + rnd() * 0.5; alea[k * 4 + 1] = rnd(); alea[k * 4 + 2] = rnd(); alea[k * 4 + 3] = rnd();
            ampoule[k] = b;
        }
    }
    return { pos, alea, ampoule, total, parAmpoule };
}

/** Réseau : quelques grains « éveillés » reliés à leurs voisins proches (pas de lien arbitraire). */
function creerReseau(g, nbNoeuds) {
    const rnd = graine(77), noeuds = [];
    for (let b = 0; b < 2; b++) {
        const base = b * g.parAmpoule;
        for (let i = 0; i < nbNoeuds / 2; i++) {
            // on préfère les grains proches de la paroi avant : plus visibles à travers le verre
            let meilleur = -1, score = -1;
            for (let t = 0; t < 14; t++) {
                const k = base + Math.floor(rnd() * g.parAmpoule), r = Math.hypot(g.pos[k * 3], g.pos[k * 3 + 2]);
                const s = r / rayonInterieur(Math.abs(g.pos[k * 3 + 1])) + rnd() * 0.25;
                if (s > score) { score = s; meilleur = k; }
            }
            noeuds.push(meilleur);
        }
    }
    const reveil = new Float32Array(noeuds.length);
    noeuds.forEach((_, i) => { reveil[i] = Math.pow(rnd(), 0.8) * 0.78; });
    const liens = [], vus = new Set(), degre = new Array(noeuds.length).fill(0);
    const d2 = (i, j) => { const a = noeuds[i] * 3, b = noeuds[j] * 3; return (g.pos[a] - g.pos[b]) ** 2 + (g.pos[a + 1] - g.pos[b + 1]) ** 2 + (g.pos[a + 2] - g.pos[b + 2]) ** 2; };
    for (let i = 0; i < noeuds.length; i++) {
        const voisins = [];
        for (let j = 0; j < noeuds.length; j++) if (j !== i && g.ampoule[noeuds[i]] === g.ampoule[noeuds[j]]) voisins.push([d2(i, j), j]);
        voisins.sort((a, b) => a[0] - b[0]);
        for (const [d, j] of voisins.slice(0, 3)) {
            if (d > 0.26 * 0.26 || degre[i] >= 4 || degre[j] >= 4) continue;   // liaisons courtes uniquement
            const cle = i < j ? i + "-" + j : j + "-" + i;
            if (vus.has(cle)) continue;
            vus.add(cle); liens.push([i, j]); degre[i]++; degre[j]++;
        }
    }
    return { noeuds: Int32Array.from(noeuds), reveil, liens };
}

/* ---------------------------------------------------------------- shaders */
const GLSL_ENV = `
vec3 studio(vec3 d, float flou, float clair){
    float s = 0.05 + flou * 0.22;
    vec3 sombre = vec3(0.015, 0.015, 0.022) + 0.05 * smoothstep(-1., 1., d.y) * vec3(0.55, 0.5, 0.7);
    float haut = smoothstep(0.62 - s, 0.62 + s, d.y) * (1. - smoothstep(0.08 - s, 0.20 + s, abs(d.x))) * (1. - smoothstep(0.55, 0.95 + s, abs(d.z)));
    float gauche = (1. - smoothstep(0.025, 0.025 + s, abs(d.x + 0.80))) * smoothstep(-0.65, -0.25 + s, d.y) * (1. - smoothstep(0.55, 0.9, d.y));
    float droite = (1. - smoothstep(0.03, 0.03 + s, abs(d.x - 0.74))) * smoothstep(-0.7, -0.3 + s, d.y) * (1. - smoothstep(0.7, 0.95, d.y));
    float fond = (1. - smoothstep(0.0, 0.5 + s, length(d.xy - vec2(0.0, -0.1)))) * smoothstep(-0.2, -0.9, d.z) * 0.35;
    vec3 e = sombre + haut * vec3(1.0, 0.96, 0.90) * 0.9 + gauche * uAccent * 1.7 + droite * vec3(1.0, 0.95, 0.86) * 0.95 + fond * uAccent * 0.5;
    // thème clair : fond de studio sombre et neutre, bandes blanches ; le verre se lit par ses arêtes foncées
    vec3 clairE = vec3(0.17, 0.18, 0.19) + haut * vec3(0.85) + droite * vec3(0.65) + gauche * (uAccent * 0.5 + 0.1);
    return mix(e, clairE, clair);
}`;

const VS_VERRE = `#version 300 es
in vec3 aPos; in vec3 aNor;
uniform mat4 uM; uniform mat4 uVP;
out vec3 vP; out vec3 vN;
void main(){
    vec4 w = uM * vec4(aPos, 1.);
    vP = w.xyz; vN = mat3(uM) * aNor;   // échelle uniforme : la matrice sert aussi pour les normales
    gl_Position = uVP * w;
}`;
const FS_VERRE = `#version 300 es
precision highp float;
in vec3 vP; in vec3 vN;
uniform vec3 uCam; uniform vec3 uAccent; uniform float uClair; uniform float uOpacite; uniform float uFace; uniform float uInterieur;
${GLSL_ENV}
out vec4 o;
void main(){
    vec3 N = normalize(vN); if (uFace < 0.) N = -N;
    vec3 V = normalize(uCam - vP);
    float ndv = clamp(dot(N, V), 0., 1.);
    float F = 0.045 + 0.955 * pow(1. - ndv, 5.);
    vec3 R = reflect(-V, N);
    vec3 spec = studio(R, 0.0, uClair) * F * (1. - 0.45 * uInterieur);
    float bord = pow(1. - ndv, 2.2);
    vec3 teinte = mix(vec3(0.55, 0.62, 0.62), vec3(0.08, 0.10, 0.10), uClair) * (0.03 + 0.17 * bord);
    float a = clamp(0.003 + 0.09 * bord + F * 0.42, 0., 0.8) * mix(1., 0.55, uInterieur);
    vec3 rgb = spec + teinte;
    float alpha = max(a, 0.55 * max(rgb.r, max(rgb.g, rgb.b)));
    float aClair = clamp(0.02 + 0.30 * bord + F * 1.1, 0., 0.85) * mix(1., 0.6, uInterieur);
    vec4 sombre = vec4(rgb, alpha), clair = vec4(studio(R, 0., 1.) * aClair, aClair);
    o = mix(sombre, clair, uClair) * uOpacite;
}`;
const FS_BOUCHON = `#version 300 es
precision highp float;
in vec3 vP; in vec3 vN;
uniform vec3 uCam; uniform vec3 uAccent; uniform float uClair; uniform float uOpacite;
${GLSL_ENV}
out vec4 o;
void main(){
    vec3 N = normalize(vN), V = normalize(uCam - vP);
    vec3 R = reflect(-V, N);
    vec3 laiton = vec3(0.17, 0.125, 0.085);
    float diff = 0.25 + 0.75 * max(dot(N, normalize(vec3(-0.35, 0.8, 0.6))), 0.);
    vec3 refl = studio(R, 1.0, uClair) * vec3(0.70, 0.55, 0.38) * 0.42;
    float fres = pow(1. - clamp(dot(N, V), 0., 1.), 3.);
    vec3 c = laiton * diff * mix(1., 1.6, uClair) + refl + uAccent * fres * 0.12;
    o = vec4(c, 1.) * uOpacite;
}`;
// Une seule trajectoire GPU pour le grain, son halo et ses liaisons : aucun décalage pendant le morph.
const GLSL_MORPH = `
uniform float uMorph; uniform vec3 uFaceCentre; uniform float uFaceEchelle; uniform float uSourire; uniform float uDispersion;
vec3 expressionVisage(vec3 face) {
    vec2 q = vec2((abs(face.x) - 0.22) / 0.17, (face.y + 0.435) / 0.16);
    face.y += uSourire * 0.10 * exp(-dot(q, q));
    return face;
}
vec3 versVisage(vec3 source, vec3 face, vec4 alea) {
    face = expressionVisage(face);
    vec3 cible = uFaceCentre + face * uFaceEchelle;
    vec3 arc = vec3(sin(alea.y * 6.283) * 0.45, cos(alea.z * 6.283) * 0.30, alea.w * 0.35) * uFaceEchelle * sin(3.14159265 * uMorph);
    cible += vec3(face.xy * 0.65, 0.15) * uFaceEchelle * uDispersion;
    return mix(source, cible, uMorph) + arc;
}`;
const VS_SABLE = `#version 300 es
in vec3 aPos; in vec4 aAlea; in float aVis; in vec3 aFace;
uniform mat4 uMV; uniform mat4 uP; uniform float uGrain; uniform float uEchelleProj; uniform float uDpr;
uniform float uScan;
${GLSL_MORPH}
out vec4 vAlea; out float vAlpha; out float vScan; out float vRelief;
void main(){
    vAlpha = mix(aVis, 0.72, smoothstep(0.25, 0.85, uMorph));
    if (vAlpha < 0.002) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; return; }
    vec4 v = uMV * vec4(aPos, 1.);
    vec3 face = expressionVisage(aFace);
    v.xyz = versVisage(v.xyz, aFace, aAlea);
    gl_Position = uP * v;
    float tailleSable = max(uGrain * aAlea.x * uEchelleProj / -v.z, 1.35 * uDpr);
    gl_PointSize = mix(tailleSable, (1.15 + aAlea.x * 0.65) * uDpr, uMorph);
    vAlea = aAlea;
    float scan = (face.y - uScan) / 0.10;
    vScan = exp(-scan * scan) * uMorph;
    vRelief = clamp((face.z - 0.1) * 1.8, 0., 1.);
}`;
const FS_SABLE = `#version 300 es
precision highp float;
in vec4 vAlea; in float vAlpha; in float vScan; in float vRelief;
uniform vec3 uSable1; uniform vec3 uSable2; uniform vec3 uAccent; uniform vec3 uLum1; uniform vec3 uLum2; uniform float uOpacite; uniform float uMorph; uniform float uClair;
out vec4 o;
void main(){
    vec2 c = gl_PointCoord * 2. - 1.; float r2 = dot(c, c); if (r2 > 1.) discard;
    vec3 n = vec3(c.x, -c.y, sqrt(1. - r2));
    vec3 base = mix(uSable1, uSable2, vAlea.y) * (0.82 + 0.34 * vAlea.z);
    float d = max(dot(n, uLum1), 0.) * 0.95 + max(dot(n, uLum2), 0.) * 0.35 + 0.34;
    vec3 col = base * d;
    vec3 h = normalize(uLum1 + vec3(0., 0., 1.));
    col += pow(max(dot(n, h), 0.), 28.) * step(0.955, vAlea.w) * 1.5 * vec3(1., 0.95, 0.85);
    col += uAccent * pow(1. - n.z, 2.) * 0.16;
    vec3 visage = mix(uAccent, uSable1, 0.25 + vAlea.z * 0.16) * (0.85 + vRelief * 0.55);
    visage = mix(visage, vec3(0.10, 0.17, 0.14) + uAccent * 0.30, uClair * 0.65);
    visage += mix(uAccent, uSable1, 0.30) * vScan * 1.6;
    col = mix(col, visage, uMorph);
    float alpha = vAlpha * mix(1., pow(1. - r2, 0.35), uMorph);
    o = vec4(col * alpha, alpha) * uOpacite;
}`;
const VS_NOEUD = `#version 300 es
in vec3 aPos; in float aReveil; in float aVis; in vec3 aFace; in vec4 aAlea;
uniform mat4 uMV; uniform mat4 uP; uniform float uReseau; uniform float uEnergie; uniform float uEchelleProj; uniform float uDpr; uniform float uCentreZ; uniform float uRayon;
${GLSL_MORPH}
out float vA;
void main(){
    float eveil = smoothstep(aReveil, aReveil + 0.22, uReseau);
    vec4 v = uMV * vec4(aPos, 1.);
    float devant = smoothstep(-0.35 * uRayon, 0.30 * uRayon, v.z - uCentreZ);
    vA = eveil * aVis * (0.35 + 0.65 * devant);
    if (vA < 0.01) { gl_Position = vec4(2., 2., 2., 1.); gl_PointSize = 0.; return; }
    v.xyz = versVisage(v.xyz, aFace, aAlea);
    gl_Position = uP * v;
    gl_PointSize = (5.6 + 4.5 * uEnergie) * uDpr * (0.8 + 0.5 * eveil) * clamp(uEchelleProj / (-v.z * 520.), 0.7, 1.7);
}`;
const FS_NOEUD = `#version 300 es
precision highp float;
in float vA; uniform vec3 uAccent; uniform vec3 uOr; uniform float uOpacite;
out vec4 o;
void main(){
    vec2 c = gl_PointCoord * 2. - 1.; float r = length(c); if (r > 1.) discard;
    float halo = pow(1. - r, 1.6), coeur = smoothstep(0.45, 0., r);
    vec3 col = mix(uAccent, uOr, 0.22) * halo * 1.5 + vec3(1., 0.97, 0.92) * coeur * 0.95;
    o = vec4(col * vA, vA * halo) * uOpacite;
}`;
const VS_LIEN = `#version 300 es
in vec3 aPos; in float aReveil; in float aVis; in vec3 aFace; in vec4 aAlea;
uniform mat4 uMV; uniform mat4 uP; uniform float uReseau; uniform float uEnergie; uniform float uCentreZ; uniform float uRayon;
${GLSL_MORPH}
out float vA;
void main(){
    float eveil = smoothstep(aReveil + 0.12, aReveil + 0.5, uReseau);
    vec4 v = uMV * vec4(aPos, 1.);
    float devant = smoothstep(-0.35 * uRayon, 0.30 * uRayon, v.z - uCentreZ);
    vA = eveil * aVis * (0.25 + 0.75 * devant) * (0.45 + 0.55 * uEnergie);
    v.xyz = versVisage(v.xyz, aFace, aAlea);
    gl_Position = uP * v;
}`;
const FS_LIEN = `#version 300 es
precision highp float;
in float vA; uniform vec3 uAccent; uniform float uOpacite; out vec4 o;
void main(){ vec3 c = uAccent * 1.15; o = vec4(c * vA, vA * 0.75) * uOpacite; }`;

// Calques d'analyse : les tracés suivent les mêmes repères et la même déformation que les grains.
const VS_VISAGE = `#version 300 es
in vec3 aPos; in float aOrdre;
uniform mat4 uP; uniform vec3 uFaceCentre; uniform float uFaceEchelle; uniform float uSourire;
uniform float uAnalyse; uniform float uMorph; uniform float uDpr; uniform float uDispersion;
out float vA;
void main(){
    vec3 face = aPos;
    vec2 q = vec2((abs(face.x) - 0.22) / 0.17, (face.y + 0.435) / 0.16);
    face.y += uSourire * 0.10 * exp(-dot(q, q));
    face += vec3(face.xy * 0.65, 0.15) * uDispersion;
    gl_Position = uP * vec4(uFaceCentre + face * uFaceEchelle, 1.);
    gl_PointSize = 4.2 * uDpr;
    vA = smoothstep(aOrdre * 0.65, aOrdre * 0.65 + 0.30, uAnalyse) * smoothstep(0.65, 0.95, uMorph);
}`;
const FS_VISAGE = `#version 300 es
precision highp float;
in float vA; uniform vec3 uAccent; uniform float uOpacite; uniform float uPoint;
out vec4 o;
void main(){
    float alpha = vA * uOpacite;
    if (uPoint > 0.5) { float r = length(gl_PointCoord * 2. - 1.); if (r > 1.) discard; alpha *= 1. - r; }
    o = vec4(uAccent * alpha, alpha);
}`;

/* ---------------------------------------------------------------- utilitaires GL */
function compiler(gl, type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        const erreur = gl.getShaderInfoLog(s); gl.deleteShader(s);
        throw new Error(erreur + "\n" + src.split("\n").slice(0, 3).join(" "));
    }
    return s;
}
function programme(gl, vs, fs, sortiesFeedback = null) {
    const p = gl.createProgram();
    const vertex = compiler(gl, gl.VERTEX_SHADER, vs), fragment = compiler(gl, gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, vertex); gl.attachShader(p, fragment);
    if (sortiesFeedback) gl.transformFeedbackVaryings(p, sortiesFeedback, gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(p);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const nom = gl.getActiveUniform(p, i).name; u[nom] = gl.getUniformLocation(p, nom); }
    return { p, u };
}
function hexVersRgb(c, repli) {
    const m = /#?([0-9a-f]{6})/i.exec(c || ""); if (m) { const v = parseInt(m[1], 16); return [(v >> 16) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]; }
    const r = /rgba?\((\d+)[ ,]+(\d+)[ ,]+(\d+)/.exec(c || ""); return r ? [r[1] / 255, r[2] / 255, r[3] / 255] : repli;
}
/** Sélection du k-ième plus petit (Hoare) : O(n), sans trier. */
function kieme(tab, k) {
    const a = Float32Array.from(tab); let l = 0, r = a.length - 1; k = Math.min(Math.max(k, 0), r);
    while (l < r) {
        const pivot = a[(l + r) >> 1]; let i = l, j = r;
        while (i <= j) { while (a[i] < pivot) i++; while (a[j] > pivot) j--; if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; } }
        if (k <= j) r = j; else if (k >= i) l = i; else break;
    }
    return a[k];
}

/* ---------------------------------------------------------------- API */
export function creerSablier(canevas, options = {}) {
    const bas = !!options.leger;
    const gl = canevas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: true, depth: true, powerPreference: "high-performance" });
    if (!gl) return null;

    let progs;
    try {
        progs = {
            verre: programme(gl, VS_VERRE, FS_VERRE), bouchon: programme(gl, VS_VERRE, FS_BOUCHON),
            sable: programme(gl, VS_SABLE, FS_SABLE), noeud: programme(gl, VS_NOEUD, FS_NOEUD), lien: programme(gl, VS_LIEN, FS_LIEN),
            visage: programme(gl, VS_VISAGE, FS_VISAGE),
        };
    } catch (e) {
        console.warn("[sablier] shaders :", e.message);
        const ext = gl.getExtension("WEBGL_lose_context"); if (ext) ext.loseContext();
        return null;
    }

    const segments = bas ? 56 : 96, pas = bas ? 120 : 190;
    const maillages = {
        ext: tourner(profilVerre(rayonExterieur, pas), segments, false),
        int: tourner(profilVerre(rayonInterieur, pas), segments, true),
        haut: tourner(profilBouchon(1), segments, false),
        bas: tourner(profilBouchon(-1), segments, true),
    };
    const grains = creerGrains(bas ? 3400 : 9000);
    const reseau = creerReseau(grains, bas ? 120 : 280);
    const nbRuisseau = bas ? 170 : 380;

    // --- tampons statiques
    const tamponGeo = {};
    for (const [nom, m] of Object.entries(maillages)) {
        const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        const bp = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.bufferData(gl.ARRAY_BUFFER, m.pos, gl.STATIC_DRAW);
        const bn = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bn); gl.bufferData(gl.ARRAY_BUFFER, m.nor, gl.STATIC_DRAW);
        const bi = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bi); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, m.idx, gl.STATIC_DRAW);
        tamponGeo[nom] = { vao, bp, bn, bi, n: m.idx.length };
    }
    const lierGeo = (prog, g) => {
        gl.bindVertexArray(g.vao);
        const lp = gl.getAttribLocation(prog.p, "aPos"), ln = gl.getAttribLocation(prog.p, "aNor");
        gl.bindBuffer(gl.ARRAY_BUFFER, g.bp); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, g.bn); gl.enableVertexAttribArray(ln); gl.vertexAttribPointer(ln, 3, gl.FLOAT, false, 0, 0);
    };

    // --- sable : positions + aléas statiques, visibilité dynamique
    const nSable = grains.total + nbRuisseau;
    let visage = null;
    if (typeof options.creerVisage === "function") {
        try { visage = options.creerVisage(nSable); }
        catch (erreur) { console.warn("[sablier] visage :", erreur.message); }
    }
    const posSable = new Float32Array(nSable * 3); posSable.set(grains.pos);
    const aleaSable = new Float32Array(nSable * 4); aleaSable.set(grains.alea);
    const rndR = graine(5);
    for (let i = 0; i < nbRuisseau; i++) { const k = grains.total + i; aleaSable[k * 4] = 0.85 + rndR() * 0.4; aleaSable[k * 4 + 1] = rndR(); aleaSable[k * 4 + 2] = rndR(); aleaSable[k * 4 + 3] = rndR() * 0.9; }
    const visSable = new Float32Array(nSable);
    const vaoSable = gl.createVertexArray(); gl.bindVertexArray(vaoSable);
    const bPosSable = gl.createBuffer(), bAleaSable = gl.createBuffer(), bVisSable = gl.createBuffer(), bFaceSable = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bPosSable); gl.bufferData(gl.ARRAY_BUFFER, posSable, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bAleaSable); gl.bufferData(gl.ARRAY_BUFFER, aleaSable, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bVisSable); gl.bufferData(gl.ARRAY_BUFFER, visSable, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bFaceSable); gl.bufferData(gl.ARRAY_BUFFER, visage ? visage.pos : new Float32Array(nSable * 3), gl.STATIC_DRAW);
    const attrSable = (nom, buf, taille) => { const l = gl.getAttribLocation(progs.sable.p, nom); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, taille, gl.FLOAT, false, 0, 0); };
    attrSable("aPos", bPosSable, 3); attrSable("aAlea", bAleaSable, 4); attrSable("aVis", bVisSable, 1);
    attrSable("aFace", bFaceSable, 3);

    const calquesVisage = [];
    if (visage) {
        for (const [nom, geo] of [["lignes", visage.lignes], ["noeuds", visage.noeuds]]) {
            const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
            const bp = gl.createBuffer(), bo = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.bufferData(gl.ARRAY_BUFFER, geo.pos, gl.STATIC_DRAW);
            const lp = gl.getAttribLocation(progs.visage.p, "aPos"); gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 3, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, bo); gl.bufferData(gl.ARRAY_BUFFER, geo.ordre, gl.STATIC_DRAW);
            const lo = gl.getAttribLocation(progs.visage.p, "aOrdre"); gl.enableVertexAttribArray(lo); gl.vertexAttribPointer(lo, 1, gl.FLOAT, false, 0, 0);
            calquesVisage.push({ nom, vao, bp, bo, n: geo.n });
        }
    }

    // --- nœuds du réseau
    const nN = reseau.noeuds.length, posN = new Float32Array(nN * 3), visN = new Float32Array(nN);
    reseau.noeuds.forEach((k, i) => { posN.set(grains.pos.subarray(k * 3, k * 3 + 3), i * 3); });
    const vaoN = gl.createVertexArray(); gl.bindVertexArray(vaoN);
    const bPosN = gl.createBuffer(), bRevN = gl.createBuffer(), bVisN = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bPosN); gl.bufferData(gl.ARRAY_BUFFER, posN, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bRevN); gl.bufferData(gl.ARRAY_BUFFER, reseau.reveil, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bVisN); gl.bufferData(gl.ARRAY_BUFFER, visN, gl.DYNAMIC_DRAW);
    const attrN = (prog, nom, buf) => { const l = gl.getAttribLocation(prog.p, nom); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 1 + 2 * (nom === "aPos"), gl.FLOAT, false, 0, 0); };
    attrN(progs.noeud, "aPos", bPosN); attrN(progs.noeud, "aReveil", bRevN); attrN(progs.noeud, "aVis", bVisN);
    const tamponsMorph = [];
    const lierMorph = (pr, vao, indices) => {
        gl.bindVertexArray(vao);
        for (const [nom, taille, source] of [["aFace", 3, visage ? visage.pos : null], ["aAlea", 4, grains.alea]]) {
            const donnees = new Float32Array(indices.length * taille);
            if (source) indices.forEach((k, i) => donnees.set(source.subarray(k * taille, k * taille + taille), i * taille));
            const buf = gl.createBuffer(); tamponsMorph.push(buf);
            gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, donnees, gl.STATIC_DRAW);
            const l = gl.getAttribLocation(pr.p, nom); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, taille, gl.FLOAT, false, 0, 0);
        }
    };
    lierMorph(progs.noeud, vaoN, reseau.noeuds);

    // --- liens (2 sommets par lien)
    const nL = reseau.liens.length * 2, posL = new Float32Array(nL * 3), revL = new Float32Array(nL), visL = new Float32Array(nL);
    reseau.liens.forEach(([i, j], l) => {
        posL.set(posN.subarray(i * 3, i * 3 + 3), l * 6); posL.set(posN.subarray(j * 3, j * 3 + 3), l * 6 + 3);
        revL[l * 2] = revL[l * 2 + 1] = Math.max(reseau.reveil[i], reseau.reveil[j]);
    });
    const vaoL = gl.createVertexArray(); gl.bindVertexArray(vaoL);
    const bPosL = gl.createBuffer(), bRevL = gl.createBuffer(), bVisL = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bPosL); gl.bufferData(gl.ARRAY_BUFFER, posL, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bRevL); gl.bufferData(gl.ARRAY_BUFFER, revL, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, bVisL); gl.bufferData(gl.ARRAY_BUFFER, visL, gl.DYNAMIC_DRAW);
    attrN(progs.lien, "aPos", bPosL); attrN(progs.lien, "aReveil", bRevL); attrN(progs.lien, "aVis", bVisL);
    lierMorph(progs.lien, vaoL, reseau.liens.flatMap(([i, j]) => [reseau.noeuds[i], reseau.noeuds[j]]));

    // --- couleurs (relues depuis les variables CSS : thème clair / sombre)
    const teinte = { clair: 0, accent: [0.65, 0.55, 0.98], sable1: [0.97, 0.85, 0.57], sable2: [0.86, 0.67, 0.38], or: [1.0, 0.86, 0.55] };
    function couleurs() {
        const cs = getComputedStyle(canevas);
        teinte.clair = (document.body && document.body.getAttribute("data-theme") === "light") ? 1 : 0;
        teinte.accent = hexVersRgb(cs.getPropertyValue("--emotion-accent-soft"), [0.65, 0.55, 0.98]);
        if (teinte.clair) teinte.accent = hexVersRgb(cs.getPropertyValue("--emotion-accent"), [0.09, 0.64, 0.29]);
    }
    couleurs();

    // --- dimensions
    let W = 1, H = 1, dpr = 1;
    function redimensionner() {
        dpr = Math.min(window.devicePixelRatio || 1, bas ? 1.5 : 2);
        W = Math.max(canevas.clientWidth, 1); H = Math.max(canevas.clientHeight, 1);
        const largeur = Math.round(W * dpr), hauteur = Math.round(H * dpr);
        if (canevas.width !== largeur || canevas.height !== hauteur) { canevas.width = largeur; canevas.height = hauteur; }
    }
    redimensionner();

    let interieur = null;
    const tableauCle = new Float32Array(grains.parAmpoule);
    const lum1 = norm3([-0.45, 0.7, 0.55]), lum2 = norm3([0.8, 0.1, 0.35]);

    /** Rendu d'un état. Pure fonction de `e` : aucun état interne conservé entre deux appels. */
    function rendre(e) {
        const o = {
            x: W / 2, y: H / 2, taille: H * 0.5, angle: 0, lacet: 0, tangage: 0.2, remplissageA: 0.3, remplissageB: 0.55, secousse: 0,
            ruisseau: 0, phase: 0, reseau: 0, energie: 0, opacite: 1, verre: 1, ...e,
        };
        gl.viewport(0, 0, canevas.width, canevas.height);
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        if (o.opacite <= 0.002 || (!o.visage && (o.x < -o.taille || o.x > W + o.taille))) return;

        // matrices : monde en unités « modèle x échelle », caméra sur l'axe Z
        const pxParUnite = H / (2 * Math.tan(FOV / 2) * DISTANCE), s = o.taille / (2 * pxParUnite);
        const rot = mul(rotX(o.tangage), mul(rotY(o.lacet), rotZ(o.angle)));
        const dx = ((o.x - W / 2) / pxParUnite), dy = -((o.y - H / 2) / pxParUnite);
        const M = mul(translation(dx, dy, 0), mul(rot, echelle(s)));
        const P = perspective(FOV, W / H, 1, 40), V = translation(0, 0, -DISTANCE), VP = mul(P, V), MV = mul(V, M);
        const face = visage && o.visage ? o.visage : null;
        const morph = face ? Math.min(1, Math.max(0, face.morph || 0)) : 0;
        const faceEchelle = face ? Math.max(1, face.hauteur) / (visage.hauteur * pxParUnite) : 0;
        const faceCentre = face ? [(face.cx - W / 2) / pxParUnite, -(face.cy - H / 2) / pxParUnite, -DISTANCE] : [0, 0, -DISTANCE];
        if (face && o.interieur?.progression > 0) {
            if (!interieur) interieur = creerInterieur(gl, visage, aleaSable, bas, programme);
            interieur.rendre({ ...o.interieur, langage: o.langage, faceCentre, faceEchelle, W, H, dpr,
                clair: teinte.clair, accent: teinte.accent, sable: teinte.sable1 });
            return;
        }
        const reglerFace = (pr) => {
            gl.uniform3fv(pr.u.uFaceCentre, faceCentre); gl.uniform1f(pr.u.uFaceEchelle, faceEchelle);
            gl.uniform1f(pr.u.uMorph, morph); gl.uniform1f(pr.u.uSourire, face ? face.sourire || 0 : 0);
            gl.uniform1f(pr.u.uDispersion, face ? face.dispersion || 0 : 0);
        };

        // gravité et surface du sable, ramenées dans le repère du modèle
        const nUp = norm3([-Math.sin(o.secousse), Math.cos(o.secousse), 0]);          // normale de la surface (monde)
        const nl = transposeMulVec3(rot, nUp[0], nUp[1], nUp[2]);                    // dans le repère du modèle
        const ny = nl[1], alignement = Math.abs(ny);

        // --- sable : on garde, dans chaque ampoule, les K grains les plus bas
        const remplissage = [o.remplissageA, o.remplissageB];
        for (let b = 0; b < 2; b++) {
            const debut = b * grains.parAmpoule, signe = b === 0 ? 1 : -1;
            const haute = signe * ny > 0;                      // cette ampoule est-elle au-dessus de l'étranglement ?
            const monticule = 0.20 * alignement * (haute ? 0 : 1) - 0.14 * alignement * o.ruisseau * (haute ? 1 : 0);
            for (let i = 0; i < grains.parAmpoule; i++) {
                const k = debut + i, x = grains.pos[k * 3], y = grains.pos[k * 3 + 1], z = grains.pos[k * 3 + 2];
                const rad = Math.min(Math.hypot(x, z) / 0.5, 1);
                tableauCle[i] = x * nl[0] + y * nl[1] + z * nl[2] - monticule * (1 - rad) * (1 - rad * 0.3);
            }
            const K = Math.round(Math.min(Math.max(remplissage[b], 0), 1) * grains.parAmpoule);
            const seuil = K <= 0 ? -1e9 : K >= grains.parAmpoule ? 1e9 : kieme(tableauCle, K - 1) + 1e-6;
            for (let i = 0; i < grains.parAmpoule; i++) visSable[debut + i] = tableauCle[i] <= seuil ? 1 : 0;
            o["_seuil" + b] = seuil; o["_monticule" + b] = monticule;
        }
        // ruisseau : filet de grains qui naît dans l'entonnoir de l'ampoule du haut, passe par l'étranglement et
        // tombe jusqu'au sommet du tas du bas. Actif seulement quand le sablier est debout. Les grains accélèrent
        // (t^1,6) et restent dans le canal : leur rayon est borné par le rayon intérieur du verre à leur hauteur.
        const ruisseauActif = o.ruisseau > 0.02 && alignement > 0.8;
        const haut = ny > 0 ? 1 : -1, y0 = haut * 0.08;
        for (let i = 0; i < nbRuisseau; i++) {
            const k = grains.total + i;
            if (!ruisseauActif || i / nbRuisseau > o.ruisseau) {
                visSable[k] = 0;
                // Ces grains pourront rejoindre le visage : leur origine ne dépend jamais d'un ancien écoulement.
                posSable[k * 3] = posSable[k * 3 + 1] = posSable[k * 3 + 2] = 0;
                continue;
            }
            const bBas = ny > 0 ? 1 : 0, sommet = (o["_seuil" + bBas] + o["_monticule" + bBas]) / ny;       // y du sommet du tas, sur l'axe
            const t = (((i / nbRuisseau + o.phase) % 1) + 1) % 1, f = Math.pow(t, 1.6);                      // avancement dans la chute
            const y = y0 + (sommet - y0) * f;
            const rmax = 0.55 * rayonInterieur(Math.min(Math.abs(y), 1));
            const a = i * 2.399, r = Math.min(rmax, (0.006 + 0.02 * f) * (0.4 + 0.6 * ((i * 0.618) % 1)));
            posSable[k * 3] = r * Math.cos(a); posSable[k * 3 + 1] = y; posSable[k * 3 + 2] = r * Math.sin(a);
            visSable[k] = 1;
        }
        // nœuds / liens : visibles seulement si leur grain l'est
        for (let i = 0; i < nN; i++) visN[i] = visSable[reseau.noeuds[i]];
        reseau.liens.forEach(([i, j], l) => { visL[l * 2] = visN[i]; visL[l * 2 + 1] = visN[j]; });

        gl.bindBuffer(gl.ARRAY_BUFFER, bPosSable); gl.bufferSubData(gl.ARRAY_BUFFER, grains.total * 12, posSable.subarray(grains.total * 3));
        gl.bindBuffer(gl.ARRAY_BUFFER, bVisSable); gl.bufferSubData(gl.ARRAY_BUFFER, 0, visSable);
        gl.bindBuffer(gl.ARRAY_BUFFER, bVisN); gl.bufferSubData(gl.ARRAY_BUFFER, 0, visN);
        gl.bindBuffer(gl.ARRAY_BUFFER, bVisL); gl.bufferSubData(gl.ARRAY_BUFFER, 0, visL);

        // lumières exprimées dans le repère de la caméra (ici identique au monde)
        const centreZ = (MV[14]);
        const reglerVerre = (pr, face, interieur) => {
            gl.useProgram(pr.p);
            gl.uniformMatrix4fv(pr.u.uM, false, M); gl.uniformMatrix4fv(pr.u.uVP, false, VP);
            gl.uniform3f(pr.u.uCam, 0, 0, DISTANCE); gl.uniform3fv(pr.u.uAccent, pr === progs.bouchon ? teinte.accent.map((c) => 0.35 * c + 0.45) : teinte.accent);
            gl.uniform1f(pr.u.uClair, teinte.clair); gl.uniform1f(pr.u.uOpacite, o.opacite * o.verre);
            if (pr.u.uFace) gl.uniform1f(pr.u.uFace, face); if (pr.u.uInterieur) gl.uniform1f(pr.u.uInterieur, interieur);
        };

        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE);
        // 1) bouchons (opaques)
        if (o.verre >= 0.999) gl.disable(gl.BLEND);
        else { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
        gl.depthMask(o.verre >= 0.999); gl.cullFace(gl.BACK);
        reglerVerre(progs.bouchon, 1, 0);
        for (const nom of ["haut", "bas"]) { lierGeo(progs.bouchon, tamponGeo[nom]); gl.drawElements(gl.TRIANGLES, tamponGeo[nom].n, gl.UNSIGNED_INT, 0); }
        // 2) verre : faces arrière (extérieur puis intérieur)
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.cullFace(gl.FRONT);
        for (const [nom, inter] of [["ext", 0], ["int", 1]]) { reglerVerre(progs.verre, -1, inter); lierGeo(progs.verre, tamponGeo[nom]); gl.drawElements(gl.TRIANGLES, tamponGeo[nom].n, gl.UNSIGNED_INT, 0); }
        // 3) sable (opaque, écrit la profondeur)
        if (morph > 0) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); }
        else gl.disable(gl.BLEND);
        gl.depthMask(morph === 0); gl.disable(gl.CULL_FACE);
        gl.useProgram(progs.sable.p); gl.bindVertexArray(vaoSable);
        gl.uniformMatrix4fv(progs.sable.u.uMV, false, MV); gl.uniformMatrix4fv(progs.sable.u.uP, false, P);
        gl.uniform1f(progs.sable.u.uGrain, 0.0105 * s); gl.uniform1f(progs.sable.u.uEchelleProj, (canevas.height) / (2 * Math.tan(FOV / 2)));
        gl.uniform1f(progs.sable.u.uDpr, dpr); gl.uniform3fv(progs.sable.u.uSable1, teinte.sable1); gl.uniform3fv(progs.sable.u.uSable2, teinte.sable2);
        gl.uniform3fv(progs.sable.u.uAccent, teinte.accent); gl.uniform3fv(progs.sable.u.uLum1, lum1); gl.uniform3fv(progs.sable.u.uLum2, lum2);
        gl.uniform1f(progs.sable.u.uOpacite, o.opacite);
        reglerFace(progs.sable); gl.uniform1f(progs.sable.u.uScan, face ? face.scan ?? 2 : 2);
        gl.uniform1f(progs.sable.u.uClair, teinte.clair);
        gl.bindBuffer(gl.ARRAY_BUFFER, bPosSable);
        gl.drawArrays(gl.POINTS, 0, nSable);
        // 4) réseau : additif, sans test de profondeur (les nœuds « éveillés » brillent à travers le sable)
        if (o.reseau > 0.003 && morph < 0.98) {
            gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.disable(gl.DEPTH_TEST);
            const u = (pr) => { gl.useProgram(pr.p); gl.uniformMatrix4fv(pr.u.uMV, false, MV); gl.uniformMatrix4fv(pr.u.uP, false, P);
                gl.uniform1f(pr.u.uReseau, o.reseau); gl.uniform1f(pr.u.uEnergie, o.energie); gl.uniform1f(pr.u.uCentreZ, centreZ);
                gl.uniform1f(pr.u.uRayon, s); gl.uniform3fv(pr.u.uAccent, teinte.accent); gl.uniform1f(pr.u.uOpacite, o.opacite * (1 - morph)); reglerFace(pr); };
            u(progs.lien); gl.bindVertexArray(vaoL); gl.drawArrays(gl.LINES, 0, nL);
            u(progs.noeud); gl.uniform1f(progs.noeud.u.uEchelleProj, canevas.height / (2 * Math.tan(FOV / 2))); gl.uniform1f(progs.noeud.u.uDpr, dpr);
            gl.uniform3fv(progs.noeud.u.uOr, teinte.or); gl.bindVertexArray(vaoN); gl.drawArrays(gl.POINTS, 0, nN);
            gl.enable(gl.DEPTH_TEST);
        }
        if (face && morph > 0.65 && face.analyse > 0) {
            const pr = progs.visage;
            gl.useProgram(pr.p); gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.uniformMatrix4fv(pr.u.uP, false, P); reglerFace(pr);
            gl.uniform1f(pr.u.uAnalyse, face.analyse); gl.uniform1f(pr.u.uDpr, dpr);
            gl.uniform3fv(pr.u.uAccent, teinte.accent); gl.uniform1f(pr.u.uOpacite, o.opacite * 0.60);
            for (const calque of calquesVisage) {
                const point = calque.nom === "noeuds";
                gl.uniform1f(pr.u.uPoint, point ? 1 : 0); gl.uniform1f(pr.u.uOpacite, o.opacite * (point ? 0.30 : 0.12)); gl.bindVertexArray(calque.vao);
                gl.drawArrays(point ? gl.POINTS : gl.LINES, 0, calque.n);
            }
            gl.enable(gl.DEPTH_TEST);
        }
        // 5) verre : faces avant (intérieur puis extérieur : les reflets passent au-dessus de tout)
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
        for (const [nom, inter] of [["int", 1], ["ext", 0]]) { reglerVerre(progs.verre, 1, inter); lierGeo(progs.verre, tamponGeo[nom]); gl.drawElements(gl.TRIANGLES, tamponGeo[nom].n, gl.UNSIGNED_INT, 0); }
        gl.depthMask(true); gl.bindVertexArray(null);
        return { visibles: [visSable.subarray(0, grains.parAmpoule).reduce((a, b) => a + b, 0), visSable.subarray(grains.parAmpoule, grains.total).reduce((a, b) => a + b, 0)], parAmpoule: grains.parAmpoule };
    }

    let detruit = false;
    function detruire() {
        if (detruit) return;
        detruit = true;
        interieur?.detruire();
        for (const geo of Object.values(tamponGeo)) {
            gl.deleteVertexArray(geo.vao); for (const buf of [geo.bp, geo.bn, geo.bi]) gl.deleteBuffer(buf);
        }
        for (const calque of calquesVisage) { gl.deleteVertexArray(calque.vao); gl.deleteBuffer(calque.bp); gl.deleteBuffer(calque.bo); }
        for (const vao of [vaoSable, vaoN, vaoL]) gl.deleteVertexArray(vao);
        for (const buf of [bPosSable, bAleaSable, bVisSable, bFaceSable, bPosN, bRevN, bVisN, bPosL, bRevL, bVisL]) gl.deleteBuffer(buf);
        for (const buf of tamponsMorph) gl.deleteBuffer(buf);
        for (const pr of Object.values(progs)) gl.deleteProgram(pr.p);
        const ext = gl.getExtension("WEBGL_lose_context");
        if (ext) ext.loseContext();
    }
    return { rendre, redimensionner, couleurs, detruire,
        capturerLangage: () => interieur?.capturerLangage() || false,
        grains: grains.parAmpoule, visageDisponible: !!visage };
}
