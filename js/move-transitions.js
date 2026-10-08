/* =====================================================================================================================
   MOVE & TRANSITIONS — tous les réglages de mouvement et de transition de la page projet.
   Modifie UNIQUEMENT les valeurs de CFG ci-dessous (rien d'autre à toucher). Unités : secondes (s) sauf mention (ms),
   « u » = unités 3D de la scène. Les valeurs actuelles reproduisent exactement le comportement d'origine.
   ===================================================================================================================== */
// #region RÉGLAGES (CFG)
export const CFG = {

    // #region INTRO
    // spirale du point guide, puis apparition du réseau
    intro: {
        fin: 8,                 // s : durée de l'intro (avant, ESPACE / molette / clic sur un acte sont ignorés)
        texteApres: 7500,       // ms : délai avant l'apparition du texte, de l'astuce et du bouton « Suivre la lumière »
        revealDebut: 2.5,       // s : début de l'apparition du réseau de particules
        revealDuree: 5.5,       // s : durée de cette apparition
        spiraleVitesseMin: .4,  // rad/s : vitesse de rotation au départ
        spiraleVitesseGain: 7,  // rad/s en plus à pleine accélération (vitesse max = min + gain)
        spiraleAccelDebut: 1.5, // s : début de l'accélération de la spirale
        spiraleAccelDuree: 4.5, // s : durée de l'accélération (courbe en puissance 4 : très progressive)
        spiraleRayon: 5,        // u : rayon maximal de la spirale
        spiraleOuvre: 2,        // s : début de l'ouverture de la spirale
        spiraleOuvreDuree: 3,   // s : durée d'ouverture
        spiraleFerme: 6,        // s : début du resserrement vers le centre
        spiraleFermeDuree: 2,   // s : durée du resserrement
        spiraleAplat: .6        // 0..1 : aplatissement vertical de la spirale
    },
    // #endregion

    // #region CAMÉRA AU REPOS (ENTRE DEUX VOYAGES)
    camera: {
        fov: 60,                // degrés : champ de vision normal
        fovLissage: 3,          // vitesse de retour du champ de vision (plus grand = plus vif)
        suivi: 1.6,             // inertie de la caméra (plus petit = plus lourde, plus lente à suivre)
        regard: 3,              // vitesse à laquelle la caméra tourne son regard vers le point guide (repos)
        regardVoyage: 6,        // idem pendant un voyage
        sourisLissage: 2.5,     // lissage du mouvement de la souris (plus petit = plus doux)
        zDepart: 3.5,           // u : distance de la caméra au tout début (intro)
        zBase: 14,              // u : distance moyenne de la caméra
        zAmp: 11,               // u : amplitude de la respiration de distance (traversée du réseau)
        zFreq: .11,             // vitesse de cette respiration
        zRampe: 6,              // s : temps pour que la respiration atteigne son amplitude après l'intro
        xFreq: .06, xAmp: .4,   // dérive latérale lente (fréquence, proportion de la distance)
        yBase: 1.5, yFreq: .09, yAmp: 2, // hauteur de base, dérive verticale (fréquence, amplitude)
        sourisX: 3, sourisY: 2.2         // u : déplacement de la caméra par la souris (X, Y)
    },
    // #endregion

    // #region VOYAGE ENTRE ACTES (PORTAIL, FLASH, NOUVEAU MONDE)
    voyage: {
        attente: .45,           // s : silence + particules freinées + onde, avant le départ
        duree: 3.4,             // s : durée du voyage jusqu'au flash
        arrivee: 2.2,           // s : durée du ralentissement à l'arrivée
        distance: 55,           // u : distance parcourue par le point guide (et position du portail)
        acceleration: 2.6,      // puissance de l'accélération (1 = linéaire ; plus grand = accélère plus tard et plus fort)
        flashDebut: .86,        // 0..1 : moment du voyage où le flash commence
        flashDecay: 2.2,        // vitesse d'extinction du flash (plus grand = plus court)
        decalageArrivee: 18,    // u : distance (derrière) d'où le point guide arrive dans le nouveau monde
        texteApres: .55,        // 0..1 : moment de l'arrivée où le texte apparaît
        reculCamera: 7,         // u : la caméra suit le point guide à cette distance
        hauteurCamera: 1.3,     // u : hauteur de la caméra pendant le voyage
        cameraKSwitch: 4,       // inertie de la caméra juste après le flash
        cameraKMin: 1.2,        // inertie au début du voyage (lente à suivre)
        cameraKGain: 14,        // gain d'inertie en fin de voyage (la caméra rattrape de plus en plus vite)
        fovGain: 40             // degrés ajoutés au champ de vision à pleine vitesse (effet tunnel)
    },
    // #endregion

    // #region SORTIE VERS LE CORE (LIEN « ← CORE » OU ÉCHAP SUR L'ACTE 1)
    sortie: {
        actif: true,            // false = le lien « ← CORE » navigue normalement, sans transition
        duree: 2.6,             // s : durée de la transition
        distance: 40,           // u : distance parcourue par la caméra vers l'avant
        acceleration: 2.2,      // puissance de l'accélération (comme pour le voyage)
        fov: 35,                // degrés ajoutés au champ de vision à la fin
        suivi: 6,               // inertie de la caméra pendant la sortie
        fonduDebut: .55,        // 0..1 : moment où le fondu commence
        couleurFondu: "#09090B",// couleur du fondu (celle du fond de la page Core)
        cible: "core.php"       // page ouverte à la fin
    },
    // #endregion

    // #region FLUX GLOBAL DES PARTICULES
    // rafales brutales puis quasi-arrêt
    flux: {
        base: .15,              // flux minimal permanent
        rafale: 2.2,            // intensité des rafales
        rafaleFreq: .45,        // fréquence des rafales
        rafaleDeriv: .17,       // irrégularité (rend les rafales imprévisibles)
        rafaleForme: 8,         // puissance : plus grand = rafales plus brèves et plus nettes
        boost: 3,               // intensité du boost du double-clic
        boostDecay: .6,         // vitesse d'extinction du boost
        retenu: .05             // facteur de flux pendant l'attente avant un voyage (les particules freinent)
    },
    // #endregion

    // #region AMBIANCE PAR ACTE
    // [flux, distance de connexion des liens]
    zones: {
        ambiance: [{ flow: 1, link: 6 }, { flow: 1.3, link: 5 }, { flow: .9, link: 7 }, { flow: .4, link: 8 }], // 0 DISCOVER, 1 UNDERSTAND, 2 EXPERIENCE, 3 RESULT
        entree: 1.6,            // vitesse d'apparition d'un acte (plus grand = plus rapide)
        sortie: 4,              // vitesse de disparition d'un acte
        profondeur: 8           // u : l'acte arrive de cette profondeur
    },
    // #endregion

    // #region CHAMP DE PARTICULES
    particules: {
        nb: 380, nbMobile: 220, // nombre de particules (bureau / mobile)
        liensMax: 1600,         // nombre maximal de liens affichés
        amplitude: 2.2,         // amplitude de l'écoulement organique
        rappel: .004,           // rappel vers le centre (plus grand = nuage plus compact)
        amortissement: 1.3,     // damping des déplacements provoqués (souris, ondes, sillage) : plus grand = s'arrêtent plus vite
        souris: { rayon2: 80, falloff: 22, force: 5, attire: .35, tourbillon: .5 }, // champ magnétique : rayon² de portée, finesse, force, attraction, rotation
        ondes: { duree: 1.6, vitesse: 28, largeur: 8, force: 14 },                  // ondes de clic : durée, vitesse (u/s), épaisseur, force
        sillage: { rayon: 10, force: 3, entrainement: .5, vitMin: .05 },            // sillage du point guide : portée, repoussement, entraînement, vitesse minimale
        portail: { proche: 45, loin: 80, aspire: 30, repousse: 8 }                  // portail pendant le voyage : portée d'aspiration, portée de répulsion, forces
    },
    // #endregion

    // #region PANNEAUX HOLOGRAPHIQUES
    panneaux: {
        suiviY: .5, suiviX: .4, // rotation vers le curseur (autour de Y, de X)
        vitesse: 3,             // vitesse de réaction des panneaux (plus grand = plus vif)
        avanceSelection: 3,     // u : le panneau sélectionné avance de…
        reculAutres: 4,         // u : les autres panneaux reculent de…
        echelleSelection: .15   // agrandissement du panneau sélectionné
    },
    // #endregion

    // #region ENTRÉES
    molette: { seuil: 140, fenetre: 300 }, // cumul de molette (px) pour changer d'acte ; fenêtre de cumul (ms)
    son: { volume: .45 }                   // volume général (0..1)
    // #endregion
};
// #endregion

// #region FONCTIONS (PURES, SANS THREE.JS)
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const E = { // courbes d'easing
    inOut: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    out: (t) => 1 - Math.pow(1 - t, 3),
    in4: (t) => t * t * t * t,
    smooth: (t) => t * t * (3 - 2 * t)
};

export const revealDe = (T) => E.out(clamp((T - CFG.intro.revealDebut) / CFG.intro.revealDuree));
export function fluxGlobal(T, boost, flowZone, reveal, retenu) {
    const F = CFG.flux;
    return (F.base + F.rafale * Math.pow(Math.max(0, Math.sin(T * F.rafaleFreq + Math.sin(T * F.rafaleDeriv) * 2)), F.rafaleForme) + boost * F.boost) * flowZone * reveal * (retenu ? F.retenu : 1);
}
export const spiraleVitesse = (T) => CFG.intro.spiraleVitesseMin + CFG.intro.spiraleVitesseGain * E.in4(clamp((T - CFG.intro.spiraleAccelDebut) / CFG.intro.spiraleAccelDuree));
export const spiraleRayon = (T) => { const I = CFG.intro; return I.spiraleRayon * E.smooth(clamp((T - I.spiraleOuvre) / I.spiraleOuvreDuree)) * (1 - E.smooth(clamp((T - I.spiraleFerme) / I.spiraleFermeDuree))); };

export function cameraRepos(T, m) { // position cible de la caméra au repos : [x, y, z]
    const C = CFG.camera, zc = C.zBase + C.zAmp * Math.sin(T * C.zFreq) * E.smooth(clamp((T - CFG.intro.fin) / C.zRampe));
    const zi = T < CFG.intro.fin ? C.zDepart + (zc - C.zDepart) * E.inOut(clamp(T / CFG.intro.fin)) : zc;
    return [Math.sin(T * C.xFreq) * zi * C.xAmp + m.x * C.sourisX, C.yBase + m.y * C.sourisY + Math.sin(T * C.yFreq) * C.yAmp, zi];
}
export function cameraVoyage(trav) { // inertie (k) et champ de vision cible pendant un voyage
    const V = CFG.voyage, f = CFG.camera.fov;
    return { k: trav.sw ? V.cameraKSwitch : V.cameraKMin + V.cameraKGain * trav.p * trav.p, fov: trav.sw ? f + V.fovGain * (1 - E.out(trav.q)) : f + V.fovGain * E.in4(trav.p) };
}
export function cameraSortie(p) { // avance de la caméra (u) et champ de vision cible pendant la sortie vers le Core
    const S = CFG.sortie; return { avance: S.distance * Math.pow(p, S.acceleration), fov: CFG.camera.fov + S.fov * p * p };
}

/* champ de particules : écoulement organique + souris + ondes + sillage du point guide + portail (états passés dans c, modifiés en place) */
export function particules(c, dt) {
    const P = CFG.particules, M = P.souris, W = P.ondes, H = P.sillage, G = P.portail, { N, base, off, pos, ex, S, T, ray, cam, hero: hp, hv, vit, portail: pp, trav, waves } = c;
    const rx = ray[0], ry = ray[1], rz = ray[2], ox = cam.x, oy = cam.y, oz = cam.z, dm = Math.exp(-dt * P.amortissement), sucer = trav && !trav.sw;
    for (let i = waves.length - 1; i >= 0; i--) { waves[i].t += dt; if (waves[i].t > W.duree) waves.splice(i, 1); }
    for (let i = 0; i < N; i++) {
        const a3 = i * 3;
        let bx = base[a3], by = base[a3 + 1], bz = base[a3 + 2];
        bx += (Math.sin(by * .3 + T * .5) * S * P.amplitude - bx * P.rappel) * dt;
        by += (Math.sin(bz * .3 + T * .4 + 1) * S * P.amplitude - by * P.rappel) * dt;
        bz += (Math.sin(bx * .3 + T * .6 + 2) * S * P.amplitude - bz * P.rappel) * dt;
        base[a3] = bx; base[a3 + 1] = by; base[a3 + 2] = bz;
        const px = bx * ex + off[a3], py = by * ex + off[a3 + 1], pz = bz * ex + off[a3 + 2];
        const wx = px - ox, wy = py - oy, wz = pz - oz, t = wx * rx + wy * ry + wz * rz; // champ magnétique de la souris
        if (t > 0) {
            const qx = wx - rx * t, qy = wy - ry * t, qz = wz - rz * t, d2 = qx * qx + qy * qy + qz * qz;
            if (d2 < M.rayon2) {
                const f = Math.exp(-d2 / M.falloff) * dt * M.force;
                off[a3] += (-qx * M.attire + (ry * qz - rz * qy) * M.tourbillon) * f; off[a3 + 1] += (-qy * M.attire + (rz * qx - rx * qz) * M.tourbillon) * f; off[a3 + 2] += (-qz * M.attire + (rx * qy - ry * qx) * M.tourbillon) * f;
            }
        }
        for (const wv of waves) { // ondes de clic
            const dx = px - wv.c.x, dy = py - wv.c.y, dz = pz - wv.c.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + .01, r = wv.t * W.vitesse;
            const f = Math.exp(-((d - r) * (d - r)) / W.largeur) * (1 - wv.t / W.duree) * W.force * dt / d;
            off[a3] += dx * f; off[a3 + 1] += dy * f; off[a3 + 2] += dz * f;
        }
        const hx = px - hp.x, hy = py - hp.y, hz = pz - hp.z, hd2 = hx * hx + hy * hy + hz * hz; // sillage du point guide
        if (hd2 < H.rayon * H.rayon && vit > H.vitMin) {
            const f = (1 - Math.sqrt(hd2) / H.rayon) * vit * dt;
            off[a3] += hv.x * f * H.entrainement + hx * f * H.force; off[a3 + 1] += hv.y * f * H.entrainement + hy * f * H.force; off[a3 + 2] += hv.z * f * H.entrainement + hz * f * H.force;
        }
        if (sucer) { // portail : aspire de près, repousse de loin
            const dx = px - pp.x, dy = py - pp.y, dz = pz - pp.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) + .01;
            const f = (d < G.proche ? -(1 - d / G.proche) * G.aspire : d < G.loin ? (1 - (d - G.proche) / (G.loin - G.proche)) * G.repousse : 0) * trav.p * dt / d;
            off[a3] += dx * f; off[a3 + 1] += dy * f; off[a3 + 2] += dz * f;
        }
        off[a3] *= dm; off[a3 + 1] *= dm; off[a3 + 2] *= dm;
        pos[a3] = bx * ex + off[a3]; pos[a3 + 1] = by * ex + off[a3 + 1]; pos[a3 + 2] = bz * ex + off[a3 + 2];
    }
}
// #endregion