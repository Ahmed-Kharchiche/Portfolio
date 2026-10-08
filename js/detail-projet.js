// #region IMPORTS
import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
// #endregion


// #region PARAMÈTRES MODIFIABLES
// Tu peux modifier principalement cette partie du fichier.
// Le reste du code utilise automatiquement ces valeurs.

const CONFIG = {

    /* ---------- COULEURS ---------- */

    couleurs: {
        zones: [
            [0xFFFFFF, 0xCCCCCC], // Zone 0 — blanc
            [0xFFFFFF, 0x999999], // Zone 1 — blanc / gris
            [0xEEEEEE, 0xFFFFFF], // Zone 2 — blanc
            [0xFFFFFF, 0xAAAAAA]  // Zone 3 — blanc / gris
        ]
    },

    /* ---------- PARTICULES ---------- */

    particules: {

        // Nombre de particules
        desktop: 380,
        mobile: 220,

        // Nombre maximum de connexions entre particules
        maxConnexions: 1600,

        // Probabilité qu'une particule appartienne à un amas
        densite: 0.65,

        // Taille des amas
        dispersionMin: 2,
        dispersionMax: 9,

        // Dispersion des particules libres
        dispersionLibre: 30,

        // Nombre d'amas
        clusters: 5,

        // Taille des particules
        tailleMin: 0.6,
        tailleMax: 2.2,

        // Grosses particules
        grosseParticuleChance: 0.04,
        grosseParticuleMultiplicateur: 3,

        // Distance de connexion par zone
        distanceConnexion: [
            6,
            5,
            7,
            8
        ],

        // Vitesse du flux par zone
        vitesseZone: [
            1,
            1.3,
            0.9,
            0.4
        ]
    },


    /* ---------- BLOOM / LUEUR ---------- */

    bloom: {
        intensite: 0.35,
        rayon: 0.6,
        seuil: 0.85,

        // Glow supplémentaire avec la vitesse
        vitesse: 0.5,

        // Glow supplémentaire pendant le flash
        flash: 0.6
    },


    /* ---------- CAMÉRA ---------- */

    camera: {
        fov: 60,
        near: 0.1,
        far: 300,

        position: {
            x: 0,
            y: 0,
            z: 3.5
        },

        // Influence de la souris
        sourisX: 3,
        sourisY: 2.2
    },


    /* ---------- POINT GUIDE ---------- */

    guide: {
        tailleNoyau: 0.12,
        satellites: 12,
        longueurTrace: 90,
        tailleSatellite: 0.05
    },


    /* ---------- PORTAIL ---------- */

    portail: {
        anneaux: 4,
        rayonDepart: 3,
        ecartAnneaux: 1.6,
        pointsParAnneau: 120,
        vitesseRotation: 0.6,
        taillePoints: 0.14,

        // Distance du portail
        distance: 55
    },


    /* ---------- PANNEAUX ---------- */

    panneaux: {
        opacite: 0.6,

        // 1.15 = +15 %
        zoomSelection: 1.15,

        // Profondeur quand sélectionné
        profondeurSelection: 3,

        // Profondeur quand un autre panneau est sélectionné
        profondeurNonSelection: 4
    },


    /* ---------- VOYAGE ---------- */

    voyage: {
        duree: 5,
        dureeArrivee: 2.2,
        distance: 55,

        // Temps avant de pouvoir voyager
        delaiDebut: 8
    },


    /* ---------- INTRODUCTION ---------- */

    intro: {
        delaiBouton: 7500
    },


    /* ---------- SON ---------- */

    son: {
        active: true,
        volume: 0.45,

        frequenceBase: 55,
        filtreBase: 200
    },


    /* ---------- PERFORMANCE ---------- */

    performances: {
        pixelRatioMax: 2,
        largeurMobile: 700
    },


    /* ---------- NOYAU IA ---------- */

    intelligenceArtificielle: {
        anneaux: 4,
        tailleNoyau: 0.45,
        particules: 36,
        tailleParticule: 0.07
    }
};
// #endregion


// #region INITIALISATION

await Promise.race([
    document.fonts.load('700 100px Fraunces'),
    document.fonts.load('400 20px "Hanken Grotesk"'),
    new Promise((r) => setTimeout(r, 1500))
]).catch(() => {});


const $ = (s) => document.querySelector(s);

const rnd = (a, b) =>
    a + Math.random() * (b - a);

const clamp = (x, a = 0, b = 1) =>
    Math.min(b, Math.max(a, x));


// #region COURBES D'EASING

const E = {

    inOut: (t) =>
        t < .5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2,

    out: (t) =>
        1 - Math.pow(1 - t, 3),

    in4: (t) =>
        t * t * t * t,

    smooth: (t) =>
        t * t * (3 - 2 * t)
};
// #endregion


// #region ÉLÉMENTS HTML

const main = $(".detail-projet");
const flashEl = $("#flash");
const btn = $("#suiv");
const astuce = $("#astuce");

const zones = [
    ...document.querySelectorAll(".zone")
];

const mobile =
    innerWidth < CONFIG.performances.largeurMobile;
// #endregion
// #endregion


// #region PALETTES

/* une ambiance par zone : 2 couleurs */
const PAL = CONFIG.couleurs.zones.map(
    (p) => p.map((h) => new THREE.Color(h))
);


/* identité propre à chaque projet :
   une teinte secondaire dépend du titre */

const th = [
    ...window.projetData.titre
].reduce(
    (a, c) => a + c.charCodeAt(0),
    0
) % 360;


PAL[1][0].setHSL(
    th / 360,
    .55,
    .6
);

PAL[2][1].setHSL(
    ((th + 40) % 360) / 360,
    .6,
    .58
);


/* paramètres de chaque zone */

const ZP = CONFIG.particules.vitesseZone.map(
    (flow, i) => ({
        flow,
        link: CONFIG.particules.distanceConnexion[i]
    })
);


const palA = new THREE.Color();
const palB = new THREE.Color();
const fond = new THREE.Color();
// #endregion


// #region RENDU

const renderer = new THREE.WebGLRenderer({
    canvas: $("#scene-3d"),
    antialias: false,
    powerPreference: "high-performance"
});

renderer.setPixelRatio(
    Math.min(
        devicePixelRatio,
        CONFIG.performances.pixelRatioMax
    )
);

renderer.setSize(
    innerWidth,
    innerHeight
);


const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

scene.fog = new THREE.FogExp2(
    0x000000,
    .02
);


const camera = new THREE.PerspectiveCamera(
    CONFIG.camera.fov,
    innerWidth / innerHeight,
    CONFIG.camera.near,
    CONFIG.camera.far
);

camera.position.set(
    CONFIG.camera.position.x,
    CONFIG.camera.position.y,
    CONFIG.camera.position.z
);


const composer =
    new EffectComposer(renderer);

composer.addPass(
    new RenderPass(scene, camera)
);


const bloom = new UnrealBloomPass(
    new THREE.Vector2(
        innerWidth,
        innerHeight
    ),
    CONFIG.bloom.intensite,
    CONFIG.bloom.rayon,
    CONFIG.bloom.seuil
);

composer.addPass(bloom);
composer.addPass(new OutputPass());
// #endregion


// #region RÉSEAU : PARTICULES + CONNEXIONS

const N = mobile
    ? CONFIG.particules.mobile
    : CONFIG.particules.desktop;

const MAXL =
    CONFIG.particules.maxConnexions;


const base = new Float32Array(N * 3);
const off = new Float32Array(N * 3);
const pos = new Float32Array(N * 3);

const ph = new Float32Array(N);
const sz = new Float32Array(N);


// #region GÉNÉRATION DES PARTICULES

function semer() {

    const c = Array.from(
        {
            length:
            CONFIG.particules.clusters
        },
        () => [
            rnd(-18, 18),
            rnd(-10, 10),
            rnd(-18, 18)
        ]
    );


    for (let i = 0; i < N; i++) {

        const dense =
            Math.random() <
            CONFIG.particules.densite;


        const s = dense
            ? rnd(
                CONFIG.particules.dispersionMin,
                CONFIG.particules.dispersionMax
            )
            : CONFIG.particules.dispersionLibre;


        for (let k = 0; k < 3; k++) {

            base[i * 3 + k] =
                (
                    dense
                        ? c[
                        i %
                        CONFIG.particules.clusters
                            ][k]
                        : 0
                ) +
                (
                    Math.random() +
                    Math.random() +
                    Math.random() -
                    1.5
                ) * s;
        }


        ph[i] =
            Math.random();


        sz[i] =
            rnd(
                CONFIG.particules.tailleMin,
                CONFIG.particules.tailleMax
            ) *
            (
                Math.random() <
                CONFIG.particules.grosseParticuleChance
                    ? CONFIG.particules.grosseParticuleMultiplicateur
                    : 1
            );
    }
}


semer();
// #endregion


// #region SHADER DES PARTICULES

const U = {

    uA: {
        value: palA
    },

    uB: {
        value: palB
    },

    uT: {
        value: 0
    },

    uAlpha: {
        value: 0
    },

    uPx: {
        value: renderer.getPixelRatio()
    }
};


const pg =
    new THREE.BufferGeometry();


pg.setAttribute(
    "position",
    new THREE.BufferAttribute(
        pos,
        3
    )
);

pg.setAttribute(
    "aPh",
    new THREE.BufferAttribute(
        ph,
        1
    )
);

pg.setAttribute(
    "aSz",
    new THREE.BufferAttribute(
        sz,
        1
    )
);


const points =
    new THREE.Points(
        pg,
        new THREE.ShaderMaterial({

            transparent: true,

            depthWrite: false,

            blending:
            THREE.AdditiveBlending,

            uniforms: U,

            vertexShader: `

                attribute float aPh, aSz;

                uniform float uPx;
                uniform float uT;
                uniform float uAlpha;

                varying float vA;
                varying float vP;


                void main(){

                    vec4 mv =
                        modelViewMatrix *
                        vec4(position, 1.);

                    float tw =
                        .6 +
                        .4 *
                        sin(
                            uT * 2. +
                            aPh * 40.
                        );

                    vA =
                        uAlpha * tw;

                    vP =
                        aPh;

                    gl_PointSize =
                        min(
                            uPx *
                            aSz *
                            14. *
                            (.6 + tw) /
                            max(.3, -mv.z),
                            90.
                        );

                    gl_Position =
                        projectionMatrix *
                        mv;
                }
            `,

            fragmentShader: `

                uniform vec3 uA;
                uniform vec3 uB;

                varying float vA;
                varying float vP;


                void main(){

                    float a =
                        smoothstep(
                            .5,
                            0.,
                            length(
                                gl_PointCoord -
                                .5
                            )
                        );

                    gl_FragColor =
                        vec4(
                            mix(
                                uA,
                                uB,
                                vP
                            ) * 1.2,

                            a *
                            a *
                            vA
                        );
                }
            `
        })
    );
// #endregion


// #region CONNEXIONS

const lp =
    new Float32Array(MAXL * 6);

const lc =
    new Float32Array(MAXL * 6);

const lg =
    new THREE.BufferGeometry();


lg.setAttribute(
    "position",
    new THREE.BufferAttribute(
        lp,
        3
    ).setUsage(
        THREE.DynamicDrawUsage
    )
);

lg.setAttribute(
    "color",
    new THREE.BufferAttribute(
        lc,
        3
    ).setUsage(
        THREE.DynamicDrawUsage
    )
);


const lines =
    new THREE.LineSegments(
        lg,
        new THREE.LineBasicMaterial({

            vertexColors: true,

            transparent: true,

            blending:
            THREE.AdditiveBlending,

            depthWrite: false
        })
    );


points.frustumCulled =
    lines.frustumCulled =
        false;


scene.add(
    points,
    lines
);
// #endregion
// #endregion


// #region POINT GUIDE

const texHalo = (() => {

    const c =
        document.createElement("canvas");

    c.width =
        c.height =
            64;


    const g =
        c.getContext("2d");


    const d =
        g.createRadialGradient(
            32,
            32,
            0,
            32,
            32,
            32
        );


    d.addColorStop(
        0,
        "rgba(255,255,255,1)"
    );

    d.addColorStop(
        .3,
        "rgba(255,255,255,.25)"
    );

    d.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );


    g.fillStyle = d;

    g.fillRect(
        0,
        0,
        64,
        64
    );


    return new THREE.CanvasTexture(c);

})();


const hero =
    new THREE.Group();


const noyau =
    new THREE.Mesh(

        new THREE.SphereGeometry(
            CONFIG.guide.tailleNoyau,
            16,
            16
        ),

        new THREE.MeshBasicMaterial({
            color:
                new THREE.Color(
                    2,
                    2,
                    2
                )
        })
    );


const halo =
    new THREE.Sprite(

        new THREE.SpriteMaterial({

            map: texHalo,

            blending:
            THREE.AdditiveBlending,

            transparent: true,

            depthWrite: false
        })
    );


const NO =
    CONFIG.guide.satellites;


const orbPos =
    new Float32Array(NO * 3);


const orbG =
    new THREE.BufferGeometry();


orbG.setAttribute(
    "position",
    new THREE.BufferAttribute(
        orbPos,
        3
    )
);


const orb =
    new THREE.Points(

        orbG,

        new THREE.PointsMaterial({

            size:
            CONFIG.guide.tailleSatellite,

            color:
                0xffffff,

            transparent: true,

            blending:
            THREE.AdditiveBlending,

            depthWrite: false
        })
    );


orb.frustumCulled =
    false;


hero.add(
    noyau,
    halo,
    orb
);


scene.add(hero);


// #region TRAÎNÉE

const NT =
    CONFIG.guide.longueurTrace;


const tp =
    new Float32Array(NT * 3);

const tc =
    new Float32Array(NT * 3);


const tg =
    new THREE.BufferGeometry();


tg.setAttribute(
    "position",
    new THREE.BufferAttribute(
        tp,
        3
    )
);

tg.setAttribute(
    "color",
    new THREE.BufferAttribute(
        tc,
        3
    )
);


const trail =
    new THREE.Line(

        tg,

        new THREE.LineBasicMaterial({

            vertexColors: true,

            transparent: true,

            blending:
            THREE.AdditiveBlending,

            depthWrite: false
        })
    );


trail.frustumCulled =
    false;


scene.add(trail);
// #endregion
// #endregion


// #region PORTAIL

const portail =
    new THREE.Group();


portail.visible =
    false;


scene.add(portail);


const anneaux =
    Array.from(
        {
            length:
            CONFIG.portail.anneaux
        },
        (_, i) => {

            const r =
                CONFIG.portail.rayonDepart +
                i *
                CONFIG.portail.ecartAnneaux;


            const n =
                CONFIG.portail.pointsParAnneau;


            const a =
                new Float32Array(
                    n * 3
                );


            const g =
                new THREE.BufferGeometry();


            for (
                let j = 0;
                j < n;
                j++
            ) {

                a.set(
                    [
                        Math.cos(
                            j / n *
                            6.283
                        ) * r,

                        Math.sin(
                            j / n *
                            6.283
                        ) * r,

                        0
                    ],

                    j * 3
                );
            }


            g.setAttribute(
                "position",
                new THREE.BufferAttribute(
                    a,
                    3
                )
            );


            const m =
                new THREE.Group();


            const add = {

                transparent: true,

                blending:
                THREE.AdditiveBlending,

                depthWrite: false
            };


            m.add(

                new THREE.LineLoop(
                    g,
                    new THREE.LineBasicMaterial({
                        ...add,
                        opacity: .7
                    })
                ),

                new THREE.Points(
                    g,
                    new THREE.PointsMaterial({
                        ...add,
                        size:
                        CONFIG.portail.taillePoints
                    })
                )
            );


            m.userData.v =
                (
                    i % 2
                        ? -1
                        : 1
                ) *
                (
                    CONFIG.portail.vitesseRotation +
                    i * .45
                );


            portail.add(m);

            return m;
        }
    );
// #endregion


// #region SON

let ac,
    master,
    osc,
    filt,
    gOsc,
    nzF,
    nzG,
    sonOn =
        CONFIG.son.active;


function son() {

    if (!ac) {

        ac =
            new AudioContext();


        master =
            ac.createGain();


        master.gain.value =
            sonOn
                ? CONFIG.son.volume
                : 0;


        master.connect(
            ac.destination
        );


        osc =
            ac.createOscillator();


        osc.type =
            "sawtooth";


        osc.frequency.value =
            CONFIG.son.frequenceBase;


        filt =
            ac.createBiquadFilter();


        filt.type =
            "lowpass";


        filt.frequency.value =
            CONFIG.son.filtreBase;


        gOsc =
            ac.createGain();


        gOsc.gain.value =
            0;


        osc
            .connect(filt)
            .connect(gOsc)
            .connect(master);


        osc.start();


        const buf =
            ac.createBuffer(
                1,
                ac.sampleRate * 2,
                ac.sampleRate
            );


        const d =
            buf.getChannelData(0);


        for (
            let i = 0;
            i < d.length;
            i++
        ) {

            d[i] =
                Math.random() * 2 - 1;
        }


        const nz =
            ac.createBufferSource();


        nz.buffer =
            buf;


        nz.loop =
            true;


        nzF =
            ac.createBiquadFilter();


        nzF.type =
            "bandpass";


        nzG =
            ac.createGain();


        nzG.gain.value =
            0;


        nz
            .connect(nzF)
            .connect(nzG)
            .connect(master);


        nz.start();
    }


    if (
        ac.state ===
        "suspended"
    ) {

        ac.resume();
    }
}


function sonSync(
    v,
    tc = .1
) {

    if (
        !ac ||
        !Number.isFinite(v)
    ) {
        return;
    }


    const t =
        ac.currentTime;


    osc.frequency.setTargetAtTime(
        CONFIG.son.frequenceBase +
        v * 90,
        t,
        tc
    );


    filt.frequency.setTargetAtTime(
        CONFIG.son.filtreBase +
        v * 2600,
        t,
        tc
    );


    gOsc.gain.setTargetAtTime(
        .03 +
        v * .09,
        t,
        tc
    );


    nzF.frequency.setTargetAtTime(
        300 +
        v * 3500,
        t,
        tc
    );


    nzG.gain.setTargetAtTime(
        v * v * .25,
        t,
        tc
    );
}


function note(
    type,
    f0,
    f1,
    dur,
    vol
) {

    if (!ac) {
        return;
    }


    const t =
        ac.currentTime;


    const o =
        ac.createOscillator();


    const g =
        ac.createGain();


    o.type =
        type;


    o.frequency.setValueAtTime(
        f0,
        t
    );


    o.frequency.exponentialRampToValueAtTime(
        f1,
        t + dur
    );


    g.gain.setValueAtTime(
        vol,
        t
    );


    g.gain.exponentialRampToValueAtTime(
        .0001,
        t + dur
    );


    o.connect(g)
        .connect(master);


    o.start(t);
    o.stop(t + dur);
}


const impact = () => {

    note(
        "sine",
        140,
        30,
        .7,
        .8
    );

    note(
        "triangle",
        2400,
        300,
        .25,
        .15
    );
};


const blip = () =>
    note(
        "sine",
        rnd(1200, 2400),
        rnd(1200, 2400),
        .12,
        .02
    );


for (
    const ev of [
    "pointerdown",
    "keydown"
]
    ) {

    addEventListener(
        ev,
        son,
        { once: true }
    );
}


$("#son").onclick =
    (e) => {

        sonOn =
            !sonOn;


        e.currentTarget.textContent =
            sonOn
                ? "🔊"
                : "🔇";


        e.currentTarget.classList.toggle(
            "coupe",
            !sonOn
        );


        son();


        master.gain.setTargetAtTime(
            sonOn
                ? CONFIG.son.volume
                : 0,

            ac.currentTime,

            .1
        );
    };
// #endregion


// #region ÉTAT & VOYAGE

let zone = 0,
    trav = null,
    T = 0,
    S = 0,
    vit = 0,
    boost = 0,
    flash = 0,
    tele = false,
    spiral = 0,
    avgL = 0,
    lastTick = 0;


const mouse =
    new THREE.Vector2();

const mouseS =
    new THREE.Vector2();


const waves = [];


const v3 =
    new THREE.Vector3();

const prev =
    new THREE.Vector3();

const hv =
    new THREE.Vector3();

const zero =
    new THREE.Vector3();

const look =
    new THREE.Vector3();

const camT =
    new THREE.Vector3();


function afficher(z) {

    vis = z;


    document
        .querySelectorAll(
            "#actes [data-act]"
        )
        .forEach(
            (b, i) =>
                b.classList.toggle(
                    "on",
                    i === z
                )
        );


    zones.forEach(
        (el, i) =>
            el.classList.toggle(
                "active",
                i === z
            )
    );


    btn.textContent =
        z === zones.length - 1
            ? "Recommencer"
            : "Suivre la lumière";
}


let attente = null,
    ambT = 2;


function voyager(
    vers,
    sens
) {

    if (
        trav ||
        attente ||
        T <
        CONFIG.voyage.delaiDebut ||
        vers < 0 ||
        vers >= zones.length
    ) {

        return;
    }


    attente = {

        vers,
        sens,
        t: .45
    };


    zones.forEach(
        (el) =>
            el.classList.remove(
                "active"
            )
    );


    btn.classList.remove(
        "visible"
    );


    vis = -1;


    waves.push({

        c:
            new THREE.Vector3(
                0,
                0,
                0
            ),

        t: 0
    });
}


function demarrer(
    vers,
    sens
) {

    if (
        trav ||
        vers < 0 ||
        vers >= zones.length
    ) {

        return;
    }


    const dir =
        new THREE.Vector3(
            sens * .25,
            .08,
            -sens
        ).normalize();


    trav = {

        to: vers,

        p: 0,

        q: 0,

        sw: false,

        txt: false,

        dir,

        start:
            hero.position.clone()
    };


    portail.visible =
        true;


    portail.position
        .copy(dir)
        .multiplyScalar(
            CONFIG.portail.distance
        )
        .add(trav.start);


    portail.lookAt(
        trav.start
    );


    zones.forEach(
        (el) =>
            el.classList.remove(
                "active"
            )
    );


    btn.classList.remove(
        "visible"
    );


    vis = -1;
}


const avancer = () =>
    voyager(
        (zone + 1) %
        zones.length,
        1
    );


function permuter() {

    zone =
        trav.to;


    if (osc) {

        osc.type =
            [
                "sine",
                "triangle",
                "sawtooth",
                "sine"
            ][zone];
    }


    semer();

    off.fill(0);

    portail.visible =
        false;


    impact();


    hero.position
        .copy(trav.dir)
        .multiplyScalar(-18);


    camera.position
        .copy(hero.position)
        .addScaledVector(
            trav.dir,
            -7
        );


    camera.position.y +=
        1.3;


    for (
        let i = 0;
        i < NT;
        i++
    ) {

        tp.set(
            [
                hero.position.x,
                hero.position.y,
                hero.position.z
            ],
            i * 3
        );
    }


    flash = 1;

    tele = true;

    trav.sw = true;
}
// #endregion


// #region INTERACTIONS

addEventListener(
    "pointermove",
    (e) => {

        mouse.set(
            e.clientX /
            innerWidth *
            2 -
            1,

            -(
                e.clientY /
                innerHeight
            ) *
            2 +
            1
        );
    }
);


$("#scene-3d")
    .addEventListener(
        "click",
        () => {

            v3.set(
                mouse.x,
                mouse.y,
                .5
            )
                .unproject(camera)
                .sub(camera.position)
                .normalize()
                .multiplyScalar(18)
                .add(camera.position);


            waves.push({

                c:
                    v3.clone(),

                t: 0
            });


            blip();
        }
    );


$("#scene-3d")
    .addEventListener(
        "dblclick",
        () =>
            (boost = 1)
    );


btn.onclick =
    avancer;


addEventListener(
    "keydown",
    (e) => {

        if (
            e.code ===
            "Space"
        ) {

            if (
                e.target.closest?.(
                    "button, a"
                )
            ) {

                return;
            }


            e.preventDefault();

            avancer();

        } else if (
            e.key ===
            "Escape"
        ) {

            voyager(
                zone - 1,
                -1
            );
        }
    }
);


addEventListener(
    "resize",
    () => {

        camera.aspect =
            innerWidth /
            innerHeight;


        camera.updateProjectionMatrix();


        renderer.setSize(
            innerWidth,
            innerHeight
        );


        composer.setSize(
            innerWidth,
            innerHeight
        );
    }
);


setTimeout(
    () => {

        afficher(0);

        btn.classList.add(
            "visible"
        );

        astuce.classList.add(
            "visible"
        );

    },
    CONFIG.intro.delaiBouton
);
// #endregion


// #region OBJETS 3D

const D =
    window.projetData;


const mats =
    [[], [], [], []];

const zr =
    [0, 0, 0, 0];

const panels = [];

const techs = [];


const zg =
    mats.map(
        () => {

            const g =
                new THREE.Group();

            scene.add(g);

            return g;
        }
    );


const ADD = {

    transparent: true,

    blending:
    THREE.AdditiveBlending,

    depthWrite: false
};


let vis = -1,
    sel = -1,
    dimS = 0;


const tv =
    new THREE.Vector3();

const tv2 =
    new THREE.Vector3();

const ray =
    new THREE.Raycaster();


/* opacité pilotée par zone */

const reg = (
    z,
    m,
    k = 1,
    t = 0,
    p = null
) => (
    mats[z].push({
        m,
        k,
        t,
        p
    }),
        m
);


const lineMat = (
    z,
    k,
    t = 2,
    p = null
) =>
    reg(
        z,
        new THREE.LineBasicMaterial({
            ...ADD
        }),
        k,
        t,
        p
    );
// #endregion


// #region TEXTE HOLOGRAPHIQUE

function holo(
    z,
    txt,
    px,
    s,
    font
) {

    const c =
        document.createElement(
            "canvas"
        );


    const g =
        c.getContext("2d");


    g.font =
        font;


    c.width =
        Math.ceil(
            g.measureText(txt)
                .width
        ) + 40;


    c.height =
        Math.ceil(
            px * 1.4
        );


    g.font =
        font;


    g.fillStyle =
        "#fff";


    g.textBaseline =
        "middle";


    g.fillText(
        txt,
        20,
        c.height / 2
    );


    s =
        Math.min(
            s,
            28 / c.width
        );


    const m =
        new THREE.ShaderMaterial({

            transparent: true,

            depthWrite: false,

            blending:
            THREE.AdditiveBlending,

            uniforms: {

                map: {
                    value:
                        new THREE.CanvasTexture(c)
                },

                uT:
                U.uT,

                uA: {
                    value: 0
                },

                uC: {
                    value: palA
                }
            },


            vertexShader: `

                varying vec2 vUv;

                void main(){

                    vUv = uv;

                    gl_Position =
                        projectionMatrix *
                        modelViewMatrix *
                        vec4(
                            position,
                            1.
                        );
                }
            `,


            fragmentShader: `

                uniform sampler2D map;

                uniform float uT;

                uniform float uA;

                uniform vec3 uC;

                varying vec2 vUv;


                void main(){

                    float s =
                        .0015 *
                        sin(
                            uT * .7 +
                            vUv.x * 6.
                        );


                    float a =
                        texture2D(
                            map,
                            vUv +
                            vec2(s, 0.)
                        ).a;


                    float b =
                        texture2D(
                            map,
                            vUv
                        ).a;


                    float c =
                        texture2D(
                            map,
                            vUv -
                            vec2(s, 0.)
                        ).a;


                    float band =
                        smoothstep(
                            .06,
                            0.,
                            abs(
                                vUv.x -
                                (
                                    fract(
                                        uT * .09
                                    ) *
                                    1.6 -
                                    .3
                                )
                            )
                        );


                    gl_FragColor =
                        vec4(

                            mix(
                                uC,
                                vec3(1.),
                                .6
                            ) *

                            (
                                vec3(
                                    a,
                                    b,
                                    c
                                ) +

                                band *
                                .5 *
                                b
                            ),

                            max(
                                max(a, b),
                                c
                            ) *
                            uA
                        );
                }
            `
        });


    reg(
        z,
        m,
        1
    );


    return new THREE.Mesh(

        new THREE.PlaneGeometry(
            c.width * s,
            c.height * s
        ),

        m
    );
}
// #endregion


// #region BLOC DE TEXTE

function bloc(
    z,
    txt,
    w
) {

    const c =
        document.createElement(
            "canvas"
        );


    const g =
        c.getContext("2d");


    const px = 34;


    const f =
        `400 ${px}px "Hanken Grotesk", sans-serif`;


    g.font =
        f;


    const L = [];

    let l = "";


    for (
        const mot of
        txt.split(/\s+/)
        ) {

        if (
            g.measureText(
                l + mot
            ).width >
            980 &&
            l
        ) {

            L.push(l);

            l = "";
        }


        l +=
            mot +
            " ";
    }


    L.push(l);


    c.width =
        1060;


    c.height =
        Math.ceil(
            L.length *
            px *
            1.5 +
            60
        );


    g.font =
        f;


    g.fillStyle =
        "#eef0f7";


    g.textBaseline =
        "top";


    L.forEach(
        (t, i) =>
            g.fillText(
                t,
                40,
                30 +
                i *
                px *
                1.5
            )
    );


    const m =
        new THREE.Mesh(

            new THREE.PlaneGeometry(
                w,
                w *
                c.height /
                c.width
            ),

            new THREE.MeshBasicMaterial({

                map:
                    new THREE.CanvasTexture(c),

                transparent: true,

                depthWrite: false
            })
        );


    reg(
        z,
        m.material,
        1
    );


    return m;
}
// #endregion


// #region PANNEAUX HOLOGRAPHIQUES

const per = (
    u,
    w,
    h
) => {

    const d =
        (
            (
                (
                    u % 1
                ) + 1
            ) % 1
        ) *
        2 *
        (w + h);


    if (d < w) {

        return [
            -w / 2 + d,
            -h / 2
        ];
    }


    if (
        d <
        w + h
    ) {

        return [
            w / 2,
            -h / 2 +
            d -
            w
        ];
    }


    if (
        d <
        2 * w + h
    ) {

        return [
            w / 2 -
            (
                d -
                w -
                h
            ),
            h / 2
        ];
    }


    return [
        -w / 2,
        h / 2 -
        (
            d -
            2 * w -
            h
        )
    ];
};


function panneau(
    z,
    w,
    h,
    x,
    y,
    zz,
    contenu,
    id,
    grid
) {

    const g =
        new THREE.Group();


    g.position.set(
        x,
        y,
        zz
    );


    zg[z].add(g);


    const p = {

        g,

        z,

        w,

        h,

        y0: y,

        z0: zz,

        id,

        sel: 0,

        rec: 0,

        wave: 0,

        s:
            Math.random(),

        ph:
            rnd(
                0,
                6.28
            )
    };


    /* ---------- verre ---------- */

    p.glass =
        new THREE.Mesh(

            new THREE.PlaneGeometry(
                w,
                h
            ),

            new THREE.MeshBasicMaterial({

                color:
                    0x060b16,

                transparent: true,

                opacity:
                CONFIG.panneaux.opacite,

                depthWrite: false
            })
        );


    p.glass.userData.id =
        id;


    reg(
        z,
        p.glass.material,
        CONFIG.panneaux.opacite,
        0,
        p
    );


    g.add(
        p.glass
    );


    if (contenu) {

        contenu.position.z =
            .04;

        contenu.renderOrder =
            3;

        g.add(
            contenu
        );
    }


    /* ---------- cadre ---------- */

    const R = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1]
    ].map(
        ([a, b]) =>
            new THREE.Vector3(
                a *
                w *
                .525,

                b *
                h *
                .525,

                -.25
            )
    );


    p.back =
        new THREE.LineLoop(

            new THREE.BufferGeometry()
                .setFromPoints(R),

            lineMat(
                z,
                .3,
                2
            )
        );


    g.add(
        p.back
    );


    /* ---------- coins ---------- */

    const cs = [];


    const br = (
        cx,
        cy,
        sx,
        sy,
        l
    ) =>
        cs.push(
            cx,
            cy,
            .03,

            cx +
            sx *
            l,

            cy,
            .03,

            cx,
            cy,
            .03,

            cx,
            cy +
            sy *
            l,

            .03
        );


    br(
        -w / 2,
        -h / 2,
        1,
        1,
        .5
    );


    br(
        w / 2,
        h / 2,
        -1,
        -1,
        .5
    );


    br(
        w / 2,
        -h / 2,
        -1,
        1,
        .22
    );


    br(
        -w / 2,
        h / 2,
        1,
        -1,
        .22
    );


    const cg =
        new THREE.BufferGeometry();


    cg.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
            cs,
            3
        )
    );


    g.add(
        new THREE.LineSegments(
            cg,
            lineMat(
                z,
                1,
                1,
                p
            )
        )
    );


    /* ---------- coureurs lumineux ---------- */

    const nv =
        2 * 13 * 2;


    p.rp =
        new Float32Array(
            nv * 3
        );


    p.rc =
        new Float32Array(
            nv * 3
        );


    p.rg =
        new THREE.BufferGeometry();


    p.rg.setAttribute(
        "position",
        new THREE.BufferAttribute(
            p.rp,
            3
        )
    );


    p.rg.setAttribute(
        "color",
        new THREE.BufferAttribute(
            p.rc,
            3
        )
    );


    const run =
        new THREE.LineSegments(

            p.rg,

            reg(
                z,

                new THREE.LineBasicMaterial({
                    vertexColors: true,
                    ...ADD
                }),

                1
            )
        );


    run.frustumCulled =
        false;


    g.add(
        run
    );


    /* ---------- onde ---------- */

    p.wl =
        new THREE.Line(

            new THREE.BufferGeometry()
                .setFromPoints([
                    new THREE.Vector3(
                        -w / 2,
                        0,
                        .05
                    ),

                    new THREE.Vector3(
                        w / 2,
                        0,
                        .05
                    )
                ]),

            new THREE.LineBasicMaterial({
                ...ADD,
                opacity: 0
            })
        );


    g.add(
        p.wl
    );


    /* ---------- grille ---------- */

    if (grid) {

        const gp = [];


        for (
            let i = -6;
            i <= 6;
            i++
        ) {

            gp.push(

                i *
                w *
                .1,

                -h *
                .65,

                -.3,

                i *
                w *
                .1,

                h *
                .65,

                -.3
            );
        }


        for (
            let i = -4;
            i <= 4;
            i++
        ) {

            gp.push(

                -w *
                .6,

                i *
                h *
                .16,

                -.3,

                w *
                .6,

                i *
                h *
                .16,

                -.3
            );
        }


        const gg =
            new THREE.BufferGeometry();


        gg.setAttribute(
            "position",
            new THREE.Float32BufferAttribute(
                gp,
                3
            )
        );


        p.grid =
            new THREE.LineSegments(

                gg,

                new THREE.LineBasicMaterial({
                    ...ADD,
                    opacity: 0
                })
            );


        g.add(
            p.grid
        );
    }


    panels.push(p);

    return p;
}
// #endregion


// #region ZONE 0 : TITRE

const titre =
    holo(
        0,
        D.titre,
        200,
        .012,
        '700 200px Fraunces, serif'
    );


titre.position.set(
    0,
    2,
    -14
);


zg[0].add(
    titre
);


const hud0 =
    holo(
        0,
        "PROJECT_01 // SYSTEM_ONLINE",
        30,
        .008,
        '500 30px "Hanken Grotesk", sans-serif'
    );


hud0.position.set(
    -7,
    -3.8,
    -13
);


zg[0].add(
    hud0
);


const phrase =
    (D.description || "")
        .split(/[.!?]/)[0]
        .slice(0, 90)
        .trim();


if (phrase) {

    const sub =
        holo(
            0,
            phrase,
            44,
            .008,
            '400 44px "Hanken Grotesk", sans-serif'
        );


    sub.position.set(
        0,
        -.8,
        -13.5
    );


    zg[0].add(
        sub
    );
}
// #endregion


// #region ZONE 1 : DESCRIPTION + IA

const txt =
    bloc(
        1,
        D.description || "",
        8.6
    );


const txtH =
    txt.geometry.parameters.height;


panneau(
    1,
    9.2,
    txtH + .8,
    -5.5,
    0,
    -5,
    txt,
    -1,
    false
);


const t1 =
    holo(
        1,
        "Le projet",
        90,
        .012,
        'italic 300 90px Fraunces, serif'
    );


t1.position.set(
    -5.5,
    txtH / 2 + 1.4,
    -5
);


zg[1].add(
    t1
);


// #region NOYAU IA

const ia =
    new THREE.Group();


ia.position.set(
    8,
    0,
    -9
);


zg[1].add(
    ia
);


const iaR =
    Array.from(
        {
            length:
            CONFIG
                .intelligenceArtificielle
                .anneaux
        },
        (_, i) => {

            const m =
                new THREE.Mesh(

                    new THREE.TorusGeometry(
                        1.1 +
                        i *
                        .3,

                        .012,

                        6,

                        80
                    ),

                    new THREE.MeshBasicMaterial({
                        ...ADD
                    })
                );


            reg(
                1,
                m.material,
                .8,
                i % 2
                    ? 1
                    : 2
            );


            m.scale.set(
                1 +
                rnd(0, .3),

                1,

                1
            );


            m.rotation.set(
                rnd(0, 3),
                rnd(0, 3),
                0
            );


            m.userData.v =
                new THREE.Vector3(
                    rnd(-1, 1),
                    rnd(-1, 1),
                    rnd(-1, 1)
                );


            ia.add(m);

            return m;
        }
    );


const iaC =
    new THREE.Mesh(

        new THREE.IcosahedronGeometry(
            CONFIG
                .intelligenceArtificielle
                .tailleNoyau,
            1
        ),

        new THREE.MeshBasicMaterial({
            wireframe: true,
            ...ADD
        })
    );


reg(
    1,
    iaC.material,
    .9,
    1
);


ia.add(
    iaC
);
// #endregion


// #region PARTICULES IA

const IN =
    CONFIG
        .intelligenceArtificielle
        .particules;


const iaP =
    new Float32Array(
        IN * 3
    );


const iaL =
    new Float32Array(
        300 * 6
    );


const iaA =
    Float32Array.from(
        {
            length: IN
        },
        () =>
            rnd(
                0,
                6.28
            )
    );


const iaRr =
    Float32Array.from(
        {
            length: IN
        },
        () =>
            rnd(
                1.2,
                2.6
            )
    );


const iaS =
    Float32Array.from(
        {
            length: IN
        },
        () =>
            rnd(
                .2,
                .7
            )
    );


const iaPg =
    new THREE.BufferGeometry();


iaPg.setAttribute(
    "position",
    new THREE.BufferAttribute(
        iaP,
        3
    )
);


const iaPts =
    new THREE.Points(

        iaPg,

        new THREE.PointsMaterial({

            size:
            CONFIG
                .intelligenceArtificielle
                .tailleParticule,

            ...ADD
        })
    );


iaPts.frustumCulled =
    false;


reg(
    1,
    iaPts.material,
    1,
    2
);


ia.add(
    iaPts
);
// #endregion


// #region LIGNES IA

const iaLg =
    new THREE.BufferGeometry();


iaLg.setAttribute(
    "position",
    new THREE.BufferAttribute(
        iaL,
        3
    )
);


const iaLn =
    new THREE.LineSegments(
        iaLg,
        lineMat(
            1,
            .6,
            1
        )
    );


iaLn.frustumCulled =
    false;


ia.add(
    iaLn
);
// #endregion


// #region PULSE IA

const iaPulse =
    new THREE.Mesh(

        new THREE.TorusGeometry(
            1,
            .01,
            6,
            64
        ),

        new THREE.MeshBasicMaterial({
            ...ADD,
            opacity: 0
        })
    );


ia.add(
    iaPulse
);


const hudIA =
    holo(
        1,
        "PROCESSING",
        30,
        .008,
        '500 30px "Hanken Grotesk", sans-serif'
    );


hudIA.position.set(
    8,
    -3,
    -9
);


zg[1].add(
    hudIA
);
// #endregion


// #region INPUT → PROCESSING → OUTPUT

const nodeIO =
    (
        x,
        y,
        zz,
        nom
    ) => {

        const m =
            new THREE.Mesh(

                new THREE.OctahedronGeometry(
                    .4,
                    0
                ),

                new THREE.MeshBasicMaterial({
                    wireframe: true,
                    ...ADD
                })
            );


        reg(
            1,
            m.material,
            .9,
            1
        );


        m.position.set(
            x,
            y,
            zz
        );


        zg[1].add(m);


        const l =
            holo(
                1,
                nom,
                30,
                .008,
                '500 30px "Hanken Grotesk", sans-serif'
            );


        l.position.set(
            x,
            y - 1,
            zz
        );


        zg[1].add(l);


        return m;
    };


const ioIn =
    nodeIO(
        2.5,
        -2.2,
        -8,
        "INPUT"
    );


const ioOut =
    nodeIO(
        13,
        2.6,
        -10,
        "OUTPUT"
    );


zg[1].add(

    new THREE.Line(

        new THREE.BufferGeometry()
            .setFromPoints([
                ioIn.position,
                ia.position,
                ioOut.position
            ]),

        lineMat(
            1,
            .3,
            2
        )
    )
);


const flux =
    new THREE.Mesh(

        new THREE.SphereGeometry(
            .07,
            8,
            8
        ),

        new THREE.MeshBasicMaterial({

            color:
                new THREE.Color(
                    1.6,
                    1.4,
                    2
                ),

            ...ADD
        })
    );


reg(
    1,
    flux.material,
    1
);


zg[1].add(
    flux
);
// #endregion
// #endregion


// #region ZONE 2 : TECHNOLOGIES

function techObj(n) {

    const k =
        n.toLowerCase();


    const g =
        new THREE.Group();


    const o = {

        g,

        react: 0,

        u: 0,

        up: () => {}
    };


    const W =
        (
            geo,
            t = 1
        ) => {

            const m =
                new THREE.Mesh(

                    geo,

                    new THREE.MeshBasicMaterial({
                        wireframe: true,
                        ...ADD
                    })
                );


            reg(
                2,
                m.material,
                .85,
                t
            );


            g.add(m);


            return m;
        };


    /* ---------- Python ---------- */

    if (
        /python|^py/.test(k)
    ) {

        const n2 = 90;


        const pa =
            new Float32Array(
                n2 * 3
            );


        const pgm =
            new THREE.BufferGeometry();


        pgm.setAttribute(
            "position",
            new THREE.BufferAttribute(
                pa,
                3
            )
        );


        const pm =
            new THREE.Points(

                pgm,

                new THREE.PointsMaterial({

                    size: .06,

                    ...ADD
                })
            );


        pm.frustumCulled =
            false;


        reg(
            2,
            pm.material,
            1,
            2
        );


        g.add(pm);


        o.up = () => {

            for (
                let i = 0;
                i < n2;
                i++
            ) {

                const a =
                    i / n2;


                const an =
                    a *
                    18 +
                    T;


                const r =
                    .5 +
                    .3 *
                    Math.sin(
                        a * 6 +
                        T
                    );


                pa.set(

                    [
                        Math.cos(an) * r,

                        (
                            (
                                a +
                                T *
                                .12
                            ) % 1 -
                            .5
                        ) *
                        2.4,

                        Math.sin(an) * r
                    ],

                    i * 3
                );
            }


            pgm.attributes
                .position
                .needsUpdate =
                true;
        };


        /* ---------- Three.js / WebGL ---------- */

    } else if (
        /three|webgl|gl$/.test(k)
    ) {

        const m =
            W(
                new THREE.IcosahedronGeometry(
                    .8,
                    1
                )
            );


        o.up = () =>
            m.rotation.set(
                T * .4,
                T * .55,
                0
            );


        /* ---------- SQL / Data ---------- */

    } else if (
        /sql|db|data|mongo/.test(k)
    ) {

        const L =
            [0, 1, 2, 3].map(
                (i) => {

                    const m =
                        W(
                            new THREE.BoxGeometry(
                                1.6,
                                .06,
                                1.1
                            ),
                            i % 2
                                ? 1
                                : 2
                        );


                    m.position.y =
                        i * .3 -
                        .45;


                    return m;
                }
            );


        o.up = () =>
            L.forEach(
                (m, i) =>
                    (
                        m.position.x =
                            Math.sin(
                                T * .5 +
                                i
                            ) *
                            .2
                    )
            );


        /* ---------- Java / Kotlin ---------- */

    } else if (
        k === "java" ||
        k === "kotlin"
    ) {

        const B =
            [
                [-.5, -.5],
                [.5, -.5],
                [-.5, .5],
                [.5, .5]
            ].map(
                ([x, z]) => {

                    const m =
                        W(
                            new THREE.BoxGeometry(
                                .7,
                                .7,
                                .7
                            )
                        );


                    m.position.set(
                        x,
                        0,
                        z
                    );


                    return m;
                }
            );


        o.up = () =>
            B.forEach(
                (m, i) =>
                    (
                        m.position.y =
                            Math.sin(
                                T * .8 +
                                i * 1.6
                            ) *
                            .25
                    )
            );


        /* ---------- C / C++ / C# ---------- */

    } else if (
        /^c(\+\+|#)?$/.test(k)
    ) {

        const m =
            W(
                new THREE.BoxGeometry(
                    1,
                    1,
                    1
                )
            );


        o.up = () => {

            const f =
                T * .5;


            const fl =
                Math.floor(f);


            m.rotation.y =
                (
                    fl +
                    E.inOut(
                        f - fl
                    )
                ) *
                1.5708;


            m.rotation.x =
                .6;
        };


        /* ---------- Autres ---------- */

    } else {

        const m =
            W(
                new THREE.TorusKnotGeometry(
                    .5,
                    .15,
                    60,
                    8
                )
            );


        o.up = () => {

            m.rotation.y =
                T * .25;


            m.rotation.x =
                Math.sin(
                    T * .2
                ) *
                .4;
        };
    }


    return o;
}


// #region TITRE

const t2 =
    holo(
        2,
        "Experience",
        90,
        .012,
        'italic 300 90px Fraunces, serif'
    );


t2.position.set(
    0,
    4.8,
    -9
);


zg[2].add(t2);


const h2 =
    holo(
        2,
        "CLIQUE UNE STRUCTURE",
        30,
        .008,
        '500 30px "Hanken Grotesk", sans-serif'
    );


h2.position.set(
    0,
    3.9,
    -9
);


zg[2].add(h2);
// #endregion


// #region TECHNOLOGIES

D.technologies
    .slice(0, 6)
    .forEach(
        (n, i, arr) => {

            const x =
                (
                    i -
                    (
                        arr.length -
                        1
                    ) / 2
                ) *
                3.2;


            const y =
                Math.sin(
                    i * 1.7
                ) *
                1.2 -
                .3;


            const zz =
                -7 -
                Math.abs(
                    i -
                    (
                        arr.length -
                        1
                    ) / 2
                ) *
                .8;


            const o =
                techObj(n);


            o.g.position.set(
                x,
                y,
                zz
            );


            zg[2].add(
                o.g
            );


            const lab =
                holo(
                    2,
                    `${n.toUpperCase()}_0${i + 1}`,
                    30,
                    .007,
                    '500 30px "Hanken Grotesk", sans-serif'
                );


            lab.position.set(
                x + 1.2,
                y + 1.3,
                zz
            );


            zg[2].add(
                lab
            );


            zg[2].add(

                new THREE.Line(

                    new THREE.BufferGeometry()
                        .setFromPoints([
                            lab.position,
                            o.g.position
                        ]),

                    lineMat(
                        2,
                        .35,
                        2
                    )
                )
            );


            const dot =
                new THREE.Mesh(

                    new THREE.SphereGeometry(
                        .05,
                        8,
                        8
                    ),

                    new THREE.MeshBasicMaterial({

                        color:
                            new THREE.Color(
                                3,
                                3,
                                3
                            ),

                        ...ADD
                    })
                );


            reg(
                2,
                dot.material,
                1
            );


            zg[2].add(
                dot
            );


            Object.assign(
                o,
                {
                    lab,
                    dot,
                    ph:
                        i * .37
                }
            );


            techs.push(o);
        }
    );
// #endregion
// #endregion


// #region ZONE 3 : IMAGES

const t3 =
    holo(
        3,
        "Résultat",
        90,
        .012,
        'italic 300 90px Fraunces, serif'
    );


t3.position.set(
    0,
    3.6,
    -8
);


zg[3].add(
    t3
);


const imgs =
    (D.images || [])
        .slice(0, 3);


const IW = 4.4;
const IH = 2.9;


imgs.forEach(
    (src, i) => {

        const tex =
            new THREE.TextureLoader()
                .load(
                    src,
                    (tx) => {

                        const ia2 =
                            tx.image.width /
                            tx.image.height;


                        const pa =
                            (
                                IW -
                                .3
                            ) /
                            (
                                IH -
                                .3
                            );


                        if (
                            ia2 > pa
                        ) {

                            tx.repeat.x =
                                pa /
                                ia2;


                            tx.offset.x =
                                (
                                    1 -
                                    tx.repeat.x
                                ) /
                                2;

                        } else {

                            tx.repeat.y =
                                ia2 /
                                pa;


                            tx.offset.y =
                                (
                                    1 -
                                    tx.repeat.y
                                ) /
                                2;
                        }
                    }
                );


        tex.colorSpace =
            THREE.SRGBColorSpace;


        const m =
            new THREE.Mesh(

                new THREE.PlaneGeometry(
                    IW - .3,
                    IH - .3
                ),

                new THREE.MeshBasicMaterial({

                    map: tex,

                    transparent: true,

                    depthWrite: false
                })
            );


        const p =
            panneau(
                3,
                IW,
                IH,
                (
                    i -
                    (
                        imgs.length -
                        1
                    ) / 2
                ) *
                5.2,
                0,
                -6,
                m,
                i,
                true
            );


        reg(
            3,
            m.material,
            .95,
            0,
            p
        );


        const l1 =
            holo(
                3,
                `IMG_0${i + 1}`,
                30,
                .007,
                '500 30px "Hanken Grotesk", sans-serif'
            );


        l1.position.set(
            -IW / 2 + .5,
            -IH / 2 - .25,
            0
        );


        p.g.add(
            l1
        );


        const l2 =
            holo(
                3,
                `X ${rnd(10, 99).toFixed(1)} Y ${rnd(10, 99).toFixed(1)}`,
                30,
                .007,
                '500 30px "Hanken Grotesk", sans-serif'
            );


        l2.position.set(
            IW / 2 - .9,
            IH / 2 + .25,
            0
        );


        p.g.add(
            l2
        );
    }
);
// #endregion


// #region CLIC : TECHNOLOGIES + IMAGES

$("#scene-3d")
    .addEventListener(
        "click",
        () => {

            if (vis === 2) {

                ray.setFromCamera(
                    mouse,
                    camera
                );


                const hit =
                    ray.intersectObjects(
                        techs.map(
                            (o) => o.g
                        ),
                        true
                    )[0];


                const o =
                    hit &&
                    techs.find(
                        (t) => {

                            for (
                                let n =
                                    hit.object;
                                n;
                                n =
                                    n.parent
                            ) {

                                if (
                                    n === t.g
                                ) {

                                    return true;
                                }
                            }


                            return false;
                        }
                    );


                if (o) {

                    o.react = 1;


                    o.g.getWorldPosition(
                        tv
                    );


                    waves.push({

                        c:
                            tv.clone(),

                        t: 0
                    });


                    blip();
                }


                return;
            }


            if (vis !== 3) {
                return;
            }


            ray.setFromCamera(
                mouse,
                camera
            );


            const hit =
                ray.intersectObjects(
                    panels
                        .filter(
                            (p) =>
                                p.id >= 0
                        )
                        .map(
                            (p) =>
                                p.glass
                        )
                )[0];


            sel =
                hit &&
                hit.object.userData.id !== sel
                    ? hit.object.userData.id
                    : -1;


            const p =
                panels.find(
                    (q) =>
                        q.id === sel
                );


            if (p) {
                p.wave = 1;
            }
        }
    );
// #endregion


// #region MISE À JOUR DES OBJETS 3D

function monde3d(dt) {

    if (vis < 0) {
        sel = -1;
    }


    dimS +=
        (
            (
                sel >= 0
                    ? 1
                    : 0
            ) -
            dimS
        ) *
        (
            1 -
            Math.exp(
                -dt * 2.5
            )
        );


    U.uAlpha.value *=
        1 -
        .45 *
        dimS;


    /* ---------- apparition des zones ---------- */

    for (
        let z = 0;
        z < 4;
        z++
    ) {

        zr[z] +=
            (
                (
                    vis === z
                        ? 1
                        : 0
                ) -
                zr[z]
            ) *
            (
                1 -
                Math.exp(
                    -dt *
                    (
                        vis === z
                            ? 1.6
                            : 4
                    )
                )
            );


        const r =
            zr[z];


        zg[z].visible =
            r > .01;


        if (
            !zg[z].visible
        ) {
            continue;
        }


        zg[z].position.z =
            -(
                1 -
                r
            ) *
            8;


        for (
            const o of mats[z]
            ) {

            const m =
                o.m;


            if (m.uniforms) {

                m.uniforms.uA.value =
                    r *
                    o.k;

            } else {

                m.opacity =
                    r *
                    o.k *
                    (
                        o.p
                            ? 1 -
                            o.p.rec *
                            .65
                            : 1
                    );


                if (o.t) {

                    m.color
                        .copy(
                            o.t === 1
                                ? palA
                                : palB
                        )
                        .multiplyScalar(
                            1 *
                            (
                                o.p
                                    ? 1 +
                                    o.p.sel *
                                    1.5
                                    : 1
                            )
                        );
                }
            }
        }
    }


    /* ---------- panneaux ---------- */

    for (
        const p of panels
        ) {

        const r =
            zr[p.z];


        if (r < .01) {
            continue;
        }


        p.sel +=
            (
                (
                    sel === p.id
                        ? 1
                        : 0
                ) -
                p.sel
            ) *
            (
                1 -
                Math.exp(
                    -dt * 3
                )
            );


        p.rec +=
            (
                (
                    sel >= 0 &&
                    sel !== p.id
                        ? 1
                        : 0
                ) -
                p.rec
            ) *
            (
                1 -
                Math.exp(
                    -dt * 2.5
                )
            );


        const dist =
            camera.position.distanceTo(
                p.g.getWorldPosition(tv2)
            );


        p.g
            .getWorldPosition(tv)
            .project(camera);


        const d =
            Math.hypot(
                tv.x -
                mouse.x,

                tv.y -
                mouse.y
            );


        const near =
            Math.exp(
                -d *
                d *
                4
            );


        const k =
            1 -
            Math.exp(
                -dt * 3
            );


        p.g.rotation.y +=
            (
                (
                    mouse.x -
                    tv.x
                ) *
                .5 *
                near +

                Math.sin(
                    T * .3 +
                    p.ph
                ) *
                .05 -

                p.g.rotation.y
            ) *
            k;


        p.g.rotation.x +=
            (
                -(
                    mouse.y -
                    tv.y
                ) *
                .4 *
                near +

                Math.sin(
                    T * .23 +
                    p.ph
                ) *
                .03 -

                p.g.rotation.x
            ) *
            k;


        p.g.position.z +=
            (
                p.z0 +

                p.sel *
                CONFIG.panneaux
                    .profondeurSelection -

                p.rec *
                CONFIG.panneaux
                    .profondeurNonSelection -

                p.g.position.z
            ) *
            k;


        p.g.position.y =
            p.y0 +
            Math.sin(
                T * .5 +
                p.ph
            ) *
            .15;


        p.g.scale.setScalar(
            1 +
            p.sel *
            (
                CONFIG.panneaux
                    .zoomSelection -
                1
            )
        );


        const kick =
            Math.pow(
                Math.max(
                    0,
                    Math.sin(
                        T * .8 +
                        p.ph * 5
                    )
                ),
                20
            ) *
            12 +

            p.sel *
            8;


        p.s +=
            dt *
            (
                .04 +
                .05 *
                kick
            );


        for (
            let q = 0;
            q < 2;
            q++
        ) {

            for (
                let i = 0;
                i < 13;
                i++
            ) {

                const a =
                    per(
                        p.s +
                        q * .5 -
                        i * .004,

                        p.w,
                        p.h
                    );


                const b =
                    per(
                        p.s +
                        q * .5 -
                        (
                            i + 1
                        ) *
                        .004,

                        p.w,
                        p.h
                    );


                const o =
                    (
                        q * 13 +
                        i
                    ) *
                    6;


                const f =
                    Math.pow(
                        1 -
                        i / 14,
                        1.5
                    ) *
                    (
                        1 +
                        p.sel
                    );


                p.rp.set(
                    [
                        a[0],
                        a[1],
                        .03,

                        b[0],
                        b[1],
                        .03
                    ],
                    o
                );


                p.rc.set(
                    [
                        palA.r * f,
                        palA.g * f,
                        palA.b * f,

                        palA.r *
                        f *
                        .7,

                        palA.g *
                        f *
                        .7,

                        palA.b *
                        f *
                        .7
                    ],
                    o
                );
            }
        }


        p.rg.attributes
            .position
            .needsUpdate =
            true;


        p.rg.attributes
            .color
            .needsUpdate =
            true;


        /* ---------- onde ---------- */

        p.wave =
            Math.max(
                0,
                p.wave -
                dt * .9
            );


        p.wl.position.y =
            p.h / 2 -
            (
                1 -
                p.wave
            ) *
            p.h;


        p.wl.material.opacity =
            r *
            p.wave;


        p.wl.material.color
            .copy(palB)
            .multiplyScalar(2);


        /* ---------- grille ---------- */

        if (p.grid) {

            p.grid.material.opacity =
                r *
                .4 *
                clamp(
                    1 -
                    (
                        dist -
                        6
                    ) /
                    10
                );


            p.grid.material.color
                .copy(palB);
        }
    }


    /* ========================================================
       NOYAU IA
       ======================================================== */

    if (
        zr[1] > .01
    ) {

        const act =
            clamp(
                1 -
                (
                    camera.position.distanceTo(
                        ia.getWorldPosition(tv)
                    ) -
                    5
                ) /
                14
            );


        ia.scale.setScalar(
            1 +
            .05 *
            Math.sin(
                T * .5
            )
        );


        iaR.forEach(
            (m, i) => {

                const v =
                    m.userData.v;


                const s =
                    dt *
                    (
                        .15 +
                        i * .05
                    ) *
                    (
                        1 +
                        act * 4
                    );


                m.rotation.x +=
                    v.x *
                    s;


                m.rotation.y +=
                    v.y *
                    s;


                m.rotation.z +=
                    v.z *
                    s;
            }
        );


        iaC.rotation.y +=
            dt *
            .3;


        for (
            let i = 0;
            i < IN;
            i++
        ) {

            iaA[i] +=
                dt *
                iaS[i] *
                (
                    1 +
                    act * 3
                );


            iaP.set(

                [
                    Math.cos(
                        iaA[i]
                    ) *
                    iaRr[i],

                    Math.sin(
                        iaA[i] *
                        1.3
                    ) *
                    iaRr[i] *
                    .5,

                    Math.sin(
                        iaA[i]
                    ) *
                    iaRr[i]
                ],

                i * 3
            );
        }


        let n = 0;


        const th =
            (
                .8 +
                act * 1.2
            ) ** 2;


        for (
            let i = 0;
            i < IN &&
            n < 300;
            i++
        ) {

            for (
                let j = i + 1;
                j < IN &&
                n < 300;
                j++
            ) {

                const dx =
                    iaP[i * 3] -
                    iaP[j * 3];


                const dy =
                    iaP[i * 3 + 1] -
                    iaP[j * 3 + 1];


                const dz =
                    iaP[i * 3 + 2] -
                    iaP[j * 3 + 2];


                if (
                    dx * dx +
                    dy * dy +
                    dz * dz <
                    th
                ) {

                    iaL.set(
                        [
                            iaP[i * 3],
                            iaP[i * 3 + 1],
                            iaP[i * 3 + 2],

                            iaP[j * 3],
                            iaP[j * 3 + 1],
                            iaP[j * 3 + 2]
                        ],

                        n++ *
                        6
                    );
                }
            }
        }


        iaLg.setDrawRange(
            0,
            n * 2
        );


        iaPg.attributes
            .position
            .needsUpdate =
            true;


        iaLg.attributes
            .position
            .needsUpdate =
            true;


        /* ---------- impulsion ---------- */

        const u =
            (
                T * .25
            ) % 1;


        iaPulse.scale.setScalar(
            .3 +
            u * 3.5
        );


        iaPulse.material.opacity =
            zr[1] *
            (
                1 -
                u
            ) *
            .8;


        iaPulse.material.color
            .copy(palA)
            .multiplyScalar(2);


        /* ---------- flux INPUT → OUTPUT ---------- */

        const fu =
            (
                T * .22
            ) % 1;


        if (
            fu < .5
        ) {

            flux.position.lerpVectors(
                ioIn.position,
                ia.position,
                fu * 2
            );

        } else {

            flux.position.lerpVectors(
                ia.position,
                ioOut.position,
                (
                    fu -
                    .5
                ) *
                2
            );
        }


        iaC.scale.setScalar(

            1 +

            .3 *
            Math.max(
                0,
                1 -
                u * 6
            ) +

            .4 *
            Math.max(
                0,
                1 -
                Math.abs(
                    fu -
                    .5
                ) *
                10
            )
        );


        ioOut.scale.setScalar(
            1 +
            .5 *
            Math.max(
                0,
                1 -
                fu * 8
            )
        );


        ioIn.rotation.y +=
            dt;


        ioOut.rotation.y +=
            dt *
            .6;
    }


    /* ========================================================
       TECHNOLOGIES
       ======================================================== */

    if (
        zr[2] > .01
    ) {

        techs.forEach(
            (o) => {

                o.up();


                const u =
                    (
                        T * .3 +
                        o.ph
                    ) % 1;


                if (
                    u < o.u
                ) {

                    o.react =
                        1;
                }


                o.u =
                    u;


                o.react *=
                    Math.exp(
                        -dt * 3
                    );


                o.dot.position
                    .lerpVectors(
                        o.lab.position,
                        o.g.position,
                        u
                    );


                o.g.scale.setScalar(
                    1 +
                    .3 *
                    o.react
                );
            }
        );
    }
}
// #endregion


// #region NAVIGATION

document
    .querySelectorAll(
        "#actes [data-act]"
    )
    .forEach(
        (b, i) => {

            b.onclick =
                () => {

                    if (
                        i !== zone
                    ) {

                        voyager(
                            i,
                            i > zone
                                ? 1
                                : -1
                        );
                    }
                };
        }
    );


let wheelAcc = 0;
let wheelT = 0;


addEventListener(
    "wheel",
    (e) => {

        if (simple) {
            return;
        }


        const n =
            performance.now();


        if (
            n -
            wheelT >
            300
        ) {

            wheelAcc =
                0;
        }


        wheelT =
            n;


        wheelAcc +=
            e.deltaY;


        if (
            Math.abs(
                wheelAcc
            ) >
            140
        ) {

            wheelAcc > 0
                ? avancer()
                : voyager(
                    zone - 1,
                    -1
                );


            wheelAcc =
                0;
        }
    },
    {
        passive: true
    }
);
// #endregion


// #region VERSION SIMPLE

let simple =
    matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;


function setSimple(v) {

    simple =
        v;


    main.classList.toggle(
        "simple",
        v
    );


    $("#skip").textContent =
        v
            ? "Version immersive"
            : "Version simple";


    if (ac) {

        master.gain.setTargetAtTime(

            v ||
            !sonOn
                ? 0
                : CONFIG.son.volume,

            ac.currentTime,

            .05
        );
    }


    if (v) {

        zones.forEach(
            (el) =>
                el.classList.add(
                    "active"
                )
        );

    } else {

        afficher(
            Math.max(
                zone,
                0
            )
        );
    }
}


$("#skip").onclick =
    () =>
        setSimple(
            !simple
        );


if (simple) {
    setSimple(true);
}
// #endregion


// #region BOUCLE PRINCIPALE

const clock =
    new THREE.Clock();


function frame() {

    requestAnimationFrame(
        frame
    );


    if (simple) {

        clock.getDelta();

        return;
    }


    const dt =
        Math.max(
            Math.min(
                clock.getDelta(),
                .05
            ),
            1e-4
        );


    T += dt;


    /* ---------- attente avant voyage ---------- */

    if (attente) {

        attente.t -=
            dt;


        if (
            attente.t <= 0
        ) {

            const a =
                attente;


            attente =
                null;


            demarrer(
                a.vers,
                a.sens
            );


            note(
                "sine",
                180,
                900,
                .8,
                .22
            );
        }
    }


    /* ---------- apparition progressive ---------- */

    const reveal =
        E.out(
            clamp(
                (
                    T -
                    2.5
                ) /
                5.5
            )
        );


    const ex =
        E.smooth(
            reveal
        );


    boost *=
        Math.exp(
            -dt * .6
        );


    /* ---------- flux global ---------- */

    S =
        (
            .15 +

            2.2 *
            Math.pow(
                Math.max(
                    0,
                    Math.sin(
                        T * .45 +
                        Math.sin(
                            T * .17
                        ) *
                        2
                    )
                ),
                8
            ) +

            boost * 3
        ) *

        ZP[zone].flow *

        reveal *

        (
            attente
                ? .05
                : 1
        );


    /* ========================================================
       PALETTE
       ======================================================== */

    const a =
        PAL[zone];


    const b =
        PAL[
            trav
                ? trav.to
                : zone
            ];


    const w =
        trav
            ? E.inOut(
                clamp(
                    (
                        trav.p -
                        .15
                    ) /
                    .8
                )
            )
            : 0;


    palA
        .copy(a[0])
        .lerp(
            b[0],
            w
        );


    palB
        .copy(a[1])
        .lerp(
            b[1],
            w
        );


    fond
        .copy(palA)
        .multiplyScalar(
            .02
        );


    renderer.setClearColor(
        fond
    );


    scene.fog.color.copy(
        fond
    );


    main.style.setProperty(
        "--acc",
        "#" +
        palB.getHexString()
    );


    /* ========================================================
       POINT GUIDE
       ======================================================== */

    prev.copy(
        hero.position
    );


    /* ---------- voyage ---------- */

    if (
        trav &&
        trav.p < 1
    ) {

        trav.p =
            Math.min(
                1,
                trav.p +
                dt /
                CONFIG.voyage.duree
            );


        hero.position
            .copy(
                trav.start
            )
            .addScaledVector(
                trav.dir,
                CONFIG.voyage.distance *
                Math.pow(
                    trav.p,
                    2.6
                )
            );


        flash =
            E.smooth(
                clamp(
                    (
                        trav.p -
                        .86
                    ) /
                    .14
                )
            );


        if (
            trav.p >= 1
        ) {

            permuter();
        }


        /* ---------- arrivée ---------- */

    } else if (trav) {

        trav.q =
            Math.min(
                1,
                trav.q +
                dt /
                CONFIG.voyage.dureeArrivee
            );


        hero.position
            .copy(
                trav.dir
            )
            .multiplyScalar(
                -18 *
                (
                    1 -
                    E.out(
                        trav.q
                    )
                )
            );


        flash *=
            Math.exp(
                -dt * 2.2
            );


        if (
            trav.q > .55 &&
            !trav.txt
        ) {

            trav.txt =
                true;


            note(
                "sine",
                330,
                330,
                .9,
                .1
            );


            setTimeout(
                () =>
                    note(
                        "sine",
                        495,
                        495,
                        1.1,
                        .08
                    ),
                180
            );


            afficher(
                zone
            );


            btn.classList.add(
                "visible"
            );
        }


        if (
            trav.q >= 1
        ) {

            trav =
                null;
        }


        /* ---------- introduction ---------- */

    } else if (
        T < 8
    ) {

        spiral +=
            dt *
            (
                .4 +
                7 *
                E.in4(
                    clamp(
                        (
                            T -
                            1.5
                        ) /
                        4.5
                    )
                )
            );


        const r =
            5 *
            E.smooth(
                clamp(
                    (
                        T -
                        2
                    ) /
                    3
                )
            ) *

            (
                1 -
                E.smooth(
                    clamp(
                        (
                            T -
                            6
                        ) /
                        2
                    )
                )
            );


        hero.position.set(

            Math.cos(
                spiral
            ) *
            r,

            Math.sin(
                spiral *
                1.3
            ) *
            r *
            .6,

            Math.sin(
                spiral
            ) *
            r
        );


        /* ---------- repos ---------- */

    } else {

        hero.position.lerp(
            zero,
            1 -
            Math.exp(
                -dt * 2
            )
        );


        flash *=
            Math.exp(
                -dt * 2.2
            );
    }


    /* ========================================================
       VITESSE DU GUIDE
       ======================================================== */

    hv.copy(
        hero.position
    )
        .sub(prev)
        .divideScalar(dt);


    if (tele) {

        hv.set(
            0,
            0,
            0
        );


        tele =
            false;
    }


    vit +=
        (
            clamp(
                hv.length() /
                45,
                0,
                1.4
            ) -
            vit
        ) *
        (
            1 -
            Math.exp(
                -dt * 6
            )
        );


    /* ========================================================
       GUIDE : NOYAU + HALO + SATELLITES
       ======================================================== */

    const pulse =
        1 +
        .12 *
        Math.sin(
            T * 2.2
        );


    noyau.scale.setScalar(
        pulse
    );


    halo.scale.setScalar(
        2.4 *
        pulse +
        vit *
        4
    );


    halo.material.color
        .copy(palA)
        .multiplyScalar(
            .9
        );


    for (
        let i = 0;
        i < NO;
        i++
    ) {

        const an =
            T *
            (
                .6 +
                i * .15
            ) +
            i * 2;


        const r =
            .5 +
            (
                i % 4
            ) *
            .3;


        orbPos.set(

            [
                Math.cos(an) *
                r,

                Math.sin(
                    an * 1.3
                ) *
                r *
                .6,

                Math.sin(an) *
                r
            ],

            i * 3
        );
    }


    orbG.attributes
        .position
        .needsUpdate =
        true;


    /* ---------- traînée ---------- */

    tp.copyWithin(
        3,
        0,
        tp.length - 3
    );


    tp.set(
        [
            hero.position.x,
            hero.position.y,
            hero.position.z
        ],
        0
    );


    for (
        let i = 0;
        i < NT;
        i++
    ) {

        const f =
            Math.pow(
                1 -
                i / NT,
                2
            ) *
            1.3;


        tc.set(
            [
                palA.r * f,
                palA.g * f,
                palA.b * f
            ],
            i * 3
        );
    }


    tg.attributes
        .position
        .needsUpdate =
        true;


    tg.attributes
        .color
        .needsUpdate =
        true;


    /* ========================================================
       CAMÉRA
       ======================================================== */

    mouseS.lerp(
        mouse,
        1 -
        Math.exp(
            -dt * 2.5
        )
    );


    let k =
        1.6;


    let fovT =
        CONFIG.camera.fov;


    if (trav) {

        camT
            .copy(hero.position)
            .addScaledVector(
                trav.dir,
                -7
            );


        camT.y +=
            1.3;


        k =
            trav.sw
                ? 4
                : 1.2 +
                14 *
                trav.p *
                trav.p;


        fovT =
            trav.sw

                ? CONFIG.camera.fov +
                40 *
                (
                    1 -
                    E.out(
                        trav.q
                    )
                )

                : CONFIG.camera.fov +
                40 *
                E.in4(
                    trav.p
                );


    } else {

        const zc =
            14 +
            11 *
            Math.sin(
                T * .11
            ) *
            E.smooth(
                clamp(
                    (
                        T -
                        8
                    ) /
                    6
                )
            );


        const zi =
            T < 8

                ? 3.5 +
                (
                    zc -
                    3.5
                ) *
                E.inOut(
                    clamp(
                        T / 8
                    )
                )

                : zc;


        camT.set(

            Math.sin(
                T * .06
            ) *
            zi *
            .4 +

            mouseS.x *
            CONFIG.camera.sourisX,

            1.5 +

            mouseS.y *
            CONFIG.camera.sourisY +

            Math.sin(
                T * .09
            ) *
            2,

            zi
        );
    }


    camera.position.lerp(
        camT,
        1 -
        Math.exp(
            -dt * k
        )
    );


    look.lerp(
        hero.position,
        1 -
        Math.exp(
            -dt *
            (
                trav
                    ? 6
                    : 3
            )
        )
    );


    camera.lookAt(
        look
    );


    camera.fov +=
        (
            fovT -
            camera.fov
        ) *
        (
            1 -
            Math.exp(
                -dt * 3
            )
        );


    camera.updateProjectionMatrix();

    camera.updateMatrixWorld();


    /* ========================================================
       PORTAIL
       ======================================================== */

    if (
        portail.visible &&
        trav
    ) {

        portail.scale.setScalar(
            E.out(
                clamp(
                    trav.p * 5
                )
            ) +
            .001
        );


        anneaux.forEach(
            (m) => {

                m.rotation.z +=
                    m.userData.v *
                    dt *
                    (
                        1 +
                        4 *
                        trav.p
                    );


                m.children[0]
                    .material
                    .color
                    .copy(palB)
                    .multiplyScalar(1);


                m.children[1]
                    .material
                    .color
                    .copy(palA)
                    .multiplyScalar(1.4);
            }
        );
    }


    /* ========================================================
       PARTICULES
       ======================================================== */

    v3.set(
        mouse.x,
        mouse.y,
        .5
    )
        .unproject(camera)
        .sub(camera.position)
        .normalize();


    const rx =
        v3.x;

    const ry =
        v3.y;

    const rz =
        v3.z;


    const ox =
        camera.position.x;

    const oy =
        camera.position.y;

    const oz =
        camera.position.z;


    const dm =
        Math.exp(
            -dt * 1.3
        );


    const hp =
        hero.position;


    const pp =
        portail.position;


    const sucer =
        trav &&
        !trav.sw;


    /* ---------- durée des ondes ---------- */

    for (
        let i =
            waves.length - 1;
        i >= 0;
        i--
    ) {

        waves[i].t +=
            dt;


        if (
            waves[i].t >
            1.6
        ) {

            waves.splice(
                i,
                1
            );
        }
    }


    /* ---------- déplacement ---------- */

    for (
        let i = 0;
        i < N;
        i++
    ) {

        const a3 =
            i * 3;


        let bx =
            base[a3];

        let by =
            base[a3 + 1];

        let bz =
            base[a3 + 2];


        bx +=
            (
                Math.sin(
                    by * .3 +
                    T * .5
                ) *
                S *
                2.2 -

                bx *
                .004
            ) *
            dt;


        by +=
            (
                Math.sin(
                    bz * .3 +
                    T * .4 +
                    1
                ) *
                S *
                2.2 -

                by *
                .004
            ) *
            dt;


        bz +=
            (
                Math.sin(
                    bx * .3 +
                    T * .6 +
                    2
                ) *
                S *
                2.2 -

                bz *
                .004
            ) *
            dt;


        base[a3] =
            bx;

        base[a3 + 1] =
            by;

        base[a3 + 2] =
            bz;


        const px =
            bx *
            ex +
            off[a3];


        const py =
            by *
            ex +
            off[a3 + 1];


        const pz =
            bz *
            ex +
            off[a3 + 2];


        /* ---------- champ magnétique souris ---------- */

        const wx =
            px -
            ox;


        const wy =
            py -
            oy;


        const wz =
            pz -
            oz;


        const t =
            wx * rx +
            wy * ry +
            wz * rz;


        if (t > 0) {

            const qx =
                wx -
                rx * t;


            const qy =
                wy -
                ry * t;


            const qz =
                wz -
                rz * t;


            const d2 =
                qx * qx +
                qy * qy +
                qz * qz;


            if (
                d2 < 80
            ) {

                const f =
                    Math.exp(
                        -d2 /
                        22
                    ) *
                    dt *
                    5;


                off[a3] +=
                    (
                        -qx *
                        .35 +

                        (
                            ry * qz -
                            rz * qy
                        ) *
                        .5
                    ) *
                    f;


                off[a3 + 1] +=
                    (
                        -qy *
                        .35 +

                        (
                            rz * qx -
                            rx * qz
                        ) *
                        .5
                    ) *
                    f;


                off[a3 + 2] +=
                    (
                        -qz *
                        .35 +

                        (
                            rx * qy -
                            ry * qx
                        ) *
                        .5
                    ) *
                    f;
            }
        }


        /* ---------- ondes de clic ---------- */

        for (
            const wv of waves
            ) {

            const dx =
                px -
                wv.c.x;


            const dy =
                py -
                wv.c.y;


            const dz =
                pz -
                wv.c.z;


            const d =
                Math.sqrt(
                    dx * dx +
                    dy * dy +
                    dz * dz
                ) +
                .01;


            const r =
                wv.t *
                28;


            const f =
                Math.exp(
                    -(
                        (
                            d -
                            r
                        ) *
                        (
                            d -
                            r
                        )
                    ) /
                    8
                ) *

                (
                    1 -
                    wv.t /
                    1.6
                ) *

                14 *
                dt /
                d;


            off[a3] +=
                dx * f;


            off[a3 + 1] +=
                dy * f;


            off[a3 + 2] +=
                dz * f;
        }


        /* ---------- sillage du héros ---------- */

        const hx =
            px -
            hp.x;


        const hy =
            py -
            hp.y;


        const hz =
            pz -
            hp.z;


        const hd2 =
            hx * hx +
            hy * hy +
            hz * hz;


        if (
            hd2 < 100 &&
            vit > .05
        ) {

            const f =
                (
                    1 -
                    Math.sqrt(
                        hd2
                    ) /
                    10
                ) *
                vit *
                dt;


            off[a3] +=
                hv.x *
                f *
                .5 +
                hx *
                f *
                3;


            off[a3 + 1] +=
                hv.y *
                f *
                .5 +
                hy *
                f *
                3;


            off[a3 + 2] +=
                hv.z *
                f *
                .5 +
                hz *
                f *
                3;
        }


        /* ---------- portail ---------- */

        if (sucer) {

            const dx =
                px -
                pp.x;


            const dy =
                py -
                pp.y;


            const dz =
                pz -
                pp.z;


            const d =
                Math.sqrt(
                    dx * dx +
                    dy * dy +
                    dz * dz
                ) +
                .01;


            const f =
                (
                    d < 45

                        ? -(
                            1 -
                            d / 45
                        ) *
                        30

                        : d < 80

                            ? (
                                1 -
                                (
                                    d -
                                    45
                                ) /
                                35
                            ) *
                            8

                            : 0
                ) *
                trav.p *
                dt /
                d;


            off[a3] +=
                dx *
                f;


            off[a3 + 1] +=
                dy *
                f;


            off[a3 + 2] +=
                dz *
                f;
        }


        /* ---------- amortissement ---------- */

        off[a3] *=
            dm;


        off[a3 + 1] *=
            dm;


        off[a3 + 2] *=
            dm;


        /* ---------- position finale ---------- */

        pos[a3] =
            bx *
            ex +
            off[a3];


        pos[a3 + 1] =
            by *
            ex +
            off[a3 + 1];


        pos[a3 + 2] =
            bz *
            ex +
            off[a3 + 2];
    }


    pg.attributes
        .position
        .needsUpdate =
        true;


    U.uAlpha.value =
        reveal;


    U.uT.value =
        T;


    /* ========================================================
       CONNEXIONS ENTRE PARTICULES
       ======================================================== */

    let nl = 0;


    const L =
        ZP[zone].link;


    const L2 =
        L * L;


    for (
        let i = 0;
        i < N &&
        nl < MAXL;
        i++
    ) {

        for (
            let j = i + 1;
            j < N &&
            nl < MAXL;
            j++
        ) {

            const dx =
                pos[i * 3] -
                pos[j * 3];


            const dy =
                pos[i * 3 + 1] -
                pos[j * 3 + 1];


            const dz =
                pos[i * 3 + 2] -
                pos[j * 3 + 2];


            const d2 =
                dx * dx +
                dy * dy +
                dz * dz;


            if (
                d2 > L2
            ) {
                continue;
            }


            const o =
                nl * 6;


            const al =
                (
                    1 -
                    d2 /
                    L2
                ) *
                reveal *
                .7;


            const c =
                i % 2
                    ? palA
                    : palB;


            lp.set(

                [
                    pos[i * 3],
                    pos[i * 3 + 1],
                    pos[i * 3 + 2],

                    pos[j * 3],
                    pos[j * 3 + 1],
                    pos[j * 3 + 2]
                ],

                o
            );


            lc.set(

                [
                    c.r * al,
                    c.g * al,
                    c.b * al,

                    c.r * al,
                    c.g * al,
                    c.b * al
                ],

                o
            );


            nl++;
        }
    }


    lg.setDrawRange(
        0,
        nl * 2
    );


    lg.attributes
        .position
        .needsUpdate =
        true;


    lg.attributes
        .color
        .needsUpdate =
        true;


    avgL +=
        (
            nl -
            avgL
        ) *
        Math.min(
            1,
            dt * 2
        );


    if (
        nl -
        avgL >
        10 &&
        T -
        lastTick >
        .18
    ) {

        blip();

        lastTick =
            T;
    }


    /* ========================================================
       SON + LUEUR + FLASH
       ======================================================== */

    ambT -=
        dt;


    if (
        ambT < 0
    ) {

        ambT =
            rnd(
                1.6,
                4.2
            );


        if (ac) {

            [
                () =>
                    note(
                        "sine",
                        rnd(
                            1400,
                            2200
                        ),
                        rnd(
                            1400,
                            2200
                        ),
                        .7,
                        .012
                    ),

                () =>
                    note(
                        "sine",
                        330,
                        330,
                        .35,
                        .02
                    ),

                () =>
                    note(
                        "square",
                        1800,
                        1800,
                        .03,
                        .01
                    ),

                null

            ][zone]?.();
        }
    }


    const coupe =
        attente ||
        (
            trav &&
            !trav.sw &&
            trav.p > .92
        );


    sonSync(
        coupe
            ? 0
            : clamp(
                Math.max(
                    vit,
                    S / 3.2
                )
            ),

        coupe
            ? .015
            : .1
    );


    bloom.strength =
        CONFIG.bloom.intensite +
        vit *
        CONFIG.bloom.vitesse +
        flash *
        CONFIG.bloom.flash;


    scene.fog.density =
        .02 -
        clamp(vit) *
        .008;


    flashEl.style.opacity =
        flash *
        .45;


    /* ---------- mise à jour objets 3D ---------- */

    monde3d(dt);


    /* ---------- rendu ---------- */

    composer.render();
}
// #endregion


// #region LANCEMENT

frame();
// #endregion