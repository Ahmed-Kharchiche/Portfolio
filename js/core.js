import * as THREE from "three";

/* ================= utilitaires ================= */
const $ = (s) => document.querySelector(s);
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => Math.random() + Math.random() + Math.random() - 1.5;
const ease = { out: (t) => 1 - (1 - t) ** 3, inOut: (t) => (t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2), smooth: (t) => t * t * (3 - 2 * t) };
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt)); // amortissement indépendant du framerate
await Promise.race([document.fonts.load("700 100px Fraunces"), new Promise((r) => setTimeout(r, 1200))]).catch(() => {});

const PROJETS = window.projets || [];
const VIOLET = new THREE.Color(0x7C3AED), LAV = new THREE.Color(0xA78BFA), BLANC = new THREE.Color(0xFAFAFA);
const mobile = innerWidth < 700;

/* ================= rendu (aucun bloom : lisibilité d'abord) ================= */
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

/* ================= champ de particules : animé sur GPU ================= */
const NP = mobile ? 700 : 1600, fp = new Float32Array(NP * 3), fa = new Float32Array(NP * 2);
for (let i = 0; i < NP; i++) {
    const r = 8 + Math.pow(Math.random(), .6) * 110, th = rnd(0, 6.283), ph = Math.acos(rnd(-1, 1));
    fp.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * .7, r * Math.sin(ph) * Math.sin(th)], i * 3);
    fa[i * 2] = Math.random() < .03 ? rnd(4, 7) : rnd(.6, 2); // quelques grosses particules = points d'intérêt
    fa[i * 2 + 1] = Math.random();
}
const U = { uT: { value: 0 }, uBorn: { value: 0 }, uPx: { value: pr }, uM: { value: new THREE.Vector3(0, 0, 1e4) } };
const champGeo = new THREE.BufferGeometry();
champGeo.setAttribute("position", new THREE.BufferAttribute(fp, 3)); champGeo.setAttribute("aD", new THREE.BufferAttribute(fa, 2));
const champ = new THREE.Points(champGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: U,
    vertexShader: `attribute vec2 aD; uniform float uT, uBorn, uPx; uniform vec3 uM; varying float vA, vP;
void main(){ vec3 p = position;
p += vec3(sin(uT * .15 + aD.y * 40.), cos(uT * .12 + aD.y * 25.), sin(uT * .1 + aD.y * 31.)) * (.6 + aD.x * .2); // respiration
vec3 d = p - uM; p += normalize(d + .001) * exp(-dot(d, d) * .02) * 1.5; // la souris repousse les particules proches
vec4 mv = modelViewMatrix * vec4(p, 1.); float tw = .75 + .25 * sin(uT * 1.3 + aD.y * 60.);
vA = smoothstep(aD.y, aD.y + .25, uBorn) * tw * (aD.x > 3. ? .5 : .26); vP = aD.y;
gl_PointSize = clamp(uPx * aD.x * 90. / -mv.z, 1.5, 26.); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying float vA, vP; void main(){ float a = smoothstep(.5, 0., length(gl_PointCoord - .5));
gl_FragColor = vec4(mix(vec3(.486, .227, .929), vec3(.655, .545, .98), vP), a * a * vA); }`
}));
champ.frustumCulled = false; scene.add(champ);

/* ================= naissance du Core : particule, micro-particules, réseau ================= */
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

/* ================= artefacts : un univers visuel par type de projet ================= */
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
    const a = { p, i, mats: [], ph: i * 1.9, near: 0, hov: 0, dim: 0, rate: .6 + (i % 3) * .35 }; // rythme propre à chaque projet
    const ang = (i / Math.max(PROJETS.length, 1)) * 6.283 + Math.sin(i * 12.9) * .4, r = 18 + (i % 3) * 9 + Math.abs(Math.sin(i * 7.1)) * 6;
    a.g = new THREE.Group(); a.g.position.set(Math.sin(ang) * r, Math.sin(i * 5.3) * 5, -Math.cos(ang) * r);
    a.pivot = new THREE.Group(); a.obj = new THREE.Group(); a.pivot.add(a.obj); a.g.add(a.pivot);
    a.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: texHalo, color: VIOLET, transparent: true, depthWrite: false, opacity: .2 })); a.halo.scale.setScalar(7); a.g.add(a.halo);
    a.update = FABRIQUES[typeDe(p)](a.obj, a);
    scene.add(a.g); return a;
});

/* ================= interactions ================= */
const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2(), tv = new THREE.Vector3(), ray = new THREE.Vector3();
let yaw = 0, yawT = 0, yv = 0, drag = null, moved = 0, actif = null, plongee = null, T = 0;
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
    if (drag) { yawT -= (e.clientX - drag) * .004; moved += Math.abs(e.clientX - drag); drag = e.clientX; }
});
addEventListener("pointerdown", (e) => { drag = e.clientX; moved = 0; });
addEventListener("pointerup", () => (drag = null));
addEventListener("wheel", (e) => { yawT += e.deltaY * .0012; }, { passive: true }); // le scroll exprime une intention
addEventListener("keydown", (e) => { if (e.key === "ArrowRight") yawT += .45; if (e.key === "ArrowLeft") yawT -= .45; });
$("#scene").addEventListener("click", (e) => {
    if (moved > 5 || plongee || T < 7) return;
    mouse.set(e.clientX / innerWidth * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    const a = proche(); if (a) entrer(a);
});

/* entrée dans un projet : trajectoire courbe, accélération puis ralentissement, le projet grandit */
function entrer(a) {
    const p0 = camera.position.clone(), tgt = a.g.position.clone(), dir = tgt.clone().sub(p0).normalize();
    const p2 = tgt.clone().addScaledVector(dir, -4.5), p1 = p0.clone().lerp(p2, .5).add(new THREE.Vector3(-dir.z * 6, 3, dir.x * 6));
    plongee = { a, p: 0, p0, p1, p2, look0: look.clone(), tgt };
    info.classList.remove("on");
}
addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

/* ================= boucle ================= */
let last = performance.now(), frames = 0, tFps = 0, niveau = 0;
function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, .05) || .016; last = now; T += dt;
    // qualité adaptative : on réduit d'abord la résolution, puis le nombre de particules
    frames++; tFps += dt;
    if (tFps > 2) {
        if (frames / tFps < 40 && niveau < 2) { niveau++; if (niveau === 1) { pr = 1; renderer.setPixelRatio(1); U.uPx.value = 1; renderer.setSize(innerWidth, innerHeight); } else champGeo.setDrawRange(0, NP >> 1); }
        frames = 0; tFps = 0;
    }
    const born = ease.out(clamp((T - .5) / 6)); // naissance progressive
    U.uT.value = T; U.uBorn.value = born; reseau.material.opacity = born * .35; reseau.scale.setScalar(1 + .03 * Math.sin(T * .5));
    noyau.scale.setScalar(1 + .15 * Math.sin(T * 1.6)); noyauHalo.scale.setScalar(1.6 + .3 * Math.sin(T * 1.6 + 1));
    for (let i = 0; i < NM; i++) { const an = T * (.5 + i * .09) + i * 2, r = .35 + (i % 4) * .15; mp.set([Math.cos(an) * r, Math.sin(an * 1.3) * r * .6, Math.sin(an) * r], i * 3); }
    mg.attributes.position.needsUpdate = true;
    const tr = ease.out(clamp((T - 4.5) / 2.5)); titre.material.color.setScalar(tr); titre.position.z = -42 + 8 * tr; // apparition par profondeur
    astuce.classList.toggle("on", T > 7 && !plongee);

    /* caméra : ressort légèrement sous-amorti (léger dépassement), inertie de la souris */
    mouseS.lerp(mouse, 1 - Math.exp(-dt * 2.5));
    if (!plongee) {
        yv += ((yawT - yaw) * 14 - yv * 5) * dt; yaw += yv * dt;
        const R = 2.5 + 6.5 * ease.inOut(clamp((T - 2) / 5));
        camera.position.set(Math.sin(yaw) * R + mouseS.x * .6, 1.2 + mouseS.y * 1.4, Math.cos(yaw) * R);
        look.set(0, 0, 0); camera.lookAt(look);
    } else {
        plongee.p = Math.min(1, plongee.p + dt / 2.8);
        const e = ease.inOut(plongee.p), q = 1 - e;
        camera.position.set(0, 0, 0).addScaledVector(plongee.p0, q * q).addScaledVector(plongee.p1, 2 * q * e).addScaledVector(plongee.p2, e * e);
        look.lerpVectors(plongee.look0, plongee.tgt, ease.out(clamp(plongee.p * 1.6))); camera.lookAt(look);
        camera.fov = 58 + 22 * Math.sin(e * Math.PI); camera.updateProjectionMatrix();
        fondu.style.opacity = ease.smooth(clamp((plongee.p - .78) / .2));
        if (plongee.p >= 1) { const id = plongee.a.p.id; plongee = null; location.href = `detail-projet.php?id=${encodeURIComponent(id)}`; }
    }
    ray.set(mouse.x, mouse.y, .5).unproject(camera).sub(camera.position).normalize();
    U.uM.value.copy(ray).multiplyScalar(25).add(camera.position);

    /* artefacts */
    const cible = plongee ? plongee.a : T > 7 ? proche() : null;
    if (cible !== actif) { actif = cible; if (actif) afficherInfo(actif); info.classList.toggle("on", !!actif && !plongee); }
    const rev = ease.out(clamp((T - 5) / 3));
    for (const a of arts) {
        a.hov = damp(a.hov, a === actif ? 1 : 0, 4, dt);
        a.dim = damp(a.dim, actif && a !== actif ? 1 : 0, 2.5, dt);
        a.update(T, dt * a.rate);
        a.pivot.rotation.x = damp(a.pivot.rotation.x, -mouseS.y * .5 * a.hov, 3, dt); // s'oriente vers le curseur avec inertie
        a.pivot.rotation.z = damp(a.pivot.rotation.z, -mouseS.x * .4 * a.hov, 3, dt);
        a.g.position.y += Math.sin(T * .4 * a.rate + a.ph) * dt * .15;
        a.g.scale.setScalar(plongee && a === plongee.a ? 1 + ease.inOut(plongee.p) * 1.6 : 1 + a.hov * .08);
        const k = rev * (1 - .55 * a.dim) * (1 + a.hov * .4);
        for (const [m, base] of a.mats) m.opacity = Math.min(1, base * k);
        a.halo.material.opacity = (.14 + a.hov * .2) * rev * (1 - .6 * a.dim);
        if (a === actif && !plongee) { a.g.getWorldPosition(tv).project(camera); info.style.transform = `translate(${(tv.x * .5 + .5) * innerWidth + 44}px, ${(-tv.y * .5 + .5) * innerHeight - 40}px)`; }
    }
    renderer.render(scene, camera);
}
requestAnimationFrame(frame);