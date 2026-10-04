import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const data = window.projetData;
const canvas = document.getElementById("scene-3d");
const main = document.querySelector(".detail-projet");
const mobile = innerWidth < 700;
const rnd = (a, b) => a + Math.random() * (b - a);
const lisse = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};
const inOut = (t) => (
    t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
);

const sections = document.querySelectorAll(".section-projet");
const chargement = document.getElementById("chargement");
const toast = document.getElementById("toast");
const astuce = document.getElementById("astuce");

let renderer;

try {
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !mobile,
        powerPreference: "high-performance"
    });
} catch (e) {
    sections.forEach((s) => s.classList.add("active"));
    chargement.classList.add("fini");
    throw e;
}

renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1d2e30, 0.0045);

const camera = new THREE.PerspectiveCamera(
    38,
    innerWidth / innerHeight,
    0.5,
    600
);


// ---------- ciel + reflets (PMREM) ----------

const dirSoleil = new THREE.Vector3(-0.7, 0.45, -0.25).normalize();

const matCiel = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,

    uniforms: {
        uSol: { value: dirSoleil },
        uA: { value: new THREE.Color(0x0a1626) },
        uB: { value: new THREE.Color(0x2c4a4e) }
    },

    vertexShader: `
varying vec3 vP;

void main() {
    vP = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,

    fragmentShader: `
varying vec3 vP;
uniform vec3 uSol, uA, uB;

void main() {
    vec3 c = mix(
        uB * 0.55,
        uA,
        smoothstep(-0.1, 0.75, vP.y)
    );

    float s = max(dot(vP, uSol), 0.0);

    c += vec3(1.0, 0.6, 0.3) *
        (pow(s, 4.0) * 0.45 + pow(s, 80.0) * 2.0);

    gl_FragColor = vec4(c, 1.0);
}
`
});

scene.add(
    new THREE.Mesh(
        new THREE.SphereGeometry(400, 32, 16),
        matCiel
    )
);

const envScene = new THREE.Scene();

envScene.add(
    new THREE.Mesh(
        new THREE.SphereGeometry(50, 32, 16),
        matCiel
    )
);

scene.environment =
    new THREE.PMREMGenerator(renderer)
        .fromScene(envScene)
        .texture;

scene.environmentIntensity = 0.5;

scene.add(
    new THREE.HemisphereLight(
        0x9fb8c0,
        0x2a2418,
        0.9
    )
);

const soleil = new THREE.DirectionalLight(0xffc48a, 3.4);

soleil.position.copy(dirSoleil).multiplyScalar(70);
soleil.castShadow = true;

soleil.shadow.mapSize.set(
    mobile ? 1024 : 2048,
    mobile ? 1024 : 2048
);

Object.assign(soleil.shadow.camera, {
    left: -42,
    right: 42,
    top: 42,
    bottom: -42,
    near: 10,
    far: 160
});

soleil.shadow.bias = -0.0005;
soleil.shadow.normalBias = 0.35;

const remplissage = new THREE.DirectionalLight(
    0x6f8fa8,
    0.9
);

remplissage.position.set(25, 30, 55);

scene.add(soleil, remplissage);


// ---------- outils ----------

const uTime = { value: 0 };
const uIntro = { value: 0 };

function vent(mat, force) {
    mat.onBeforeCompile = (s) => {
        s.uniforms.uTime = uTime;
        s.uniforms.uIntro = uIntro;
        s.uniforms.uForce = { value: force };

        s.vertexShader =
            "uniform float uTime, uIntro, uForce;\n" +
            s.vertexShader.replace(
                "#include <begin_vertex>",

                `
#include <begin_vertex>

vec4 wp = instanceMatrix * vec4(transformed, 1.0);

float g = clamp(
    uIntro * 2.2 -
    length(instanceMatrix[3].xz) / 32.0 * 1.1,
    0.0,
    1.0
);

g = 1.0 +
    2.70158 * pow(g - 1.0, 3.0) +
    1.70158 * pow(g - 1.0, 2.0);

float k = max(position.y, 0.0) * uForce;

transformed.x +=
    sin(
        uTime * 1.2 +
        wp.x * 0.25 +
        wp.z * 0.18
    ) * k;

transformed.z +=
    cos(
        uTime * 0.9 +
        wp.z * 0.22
    ) * k * 0.6;

transformed *= g;
`
            );
    };

    return mat;
}

function froisse(g, a) {
    const p = g.attributes.position;

    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);

        const s =
            Math.sin(
                x * 12.9 +
                y * 7.7 +
                z * 5.3
            ) * a;

        p.setXYZ(
            i,
            x * (1 + s),
            y + s * 0.3,
            z * (1 + s)
        );
    }

    g.computeVertexNormals();

    return g;
}

function douceur() {
    const c = document.createElement("canvas");

    c.width = c.height = 128;

    const g = c.getContext("2d");

    const d = g.createRadialGradient(
        64,
        64,
        0,
        64,
        64,
        64
    );

    d.addColorStop(
        0,
        "rgba(255,255,255,1)"
    );

    d.addColorStop(
        0.4,
        "rgba(255,255,255,.35)"
    );

    d.addColorStop(
        1,
        "rgba(255,255,255,0)"
    );

    g.fillStyle = d;
    g.fillRect(0, 0, 128, 128);

    return new THREE.CanvasTexture(c);
}

const texDouce = douceur();

const lueur = (
    couleur,
    taille,
    op = 0.9
) => {
    const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
            map: texDouce,
            color: couleur,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            fog: false,
            opacity: op
        })
    );

    s.scale.setScalar(taille);

    return s;
};

const dummy = new THREE.Object3D();
const teinte = new THREE.Color();


// ---------- île ----------

const ile = new THREE.Group();

scene.add(ile);

const R = 32;

const pathX = (z) =>
    Math.sin(z * 0.18) * 5 +
    Math.sin(z * 0.07) * 3;

const LAC = {
    x: 13,
    z: -4,
    r: 8
};

const bruit = (x, z) =>
    Math.sin(x * 0.16 + 1) * 1.4 +
    Math.cos(z * 0.13) * 1.2 +
    Math.sin((x + z) * 0.3) * 0.5 +
    Math.sin(x * 0.5 - z * 0.4) * 0.18;

function haut(x, z) {
    const r = Math.hypot(x, z);

    const k = lisse(
        1.5,
        6,
        Math.abs(x - pathX(z))
    );

    return (
        (
            bruit(x, z) *
            (0.3 + 0.7 * k) +
            2.4
        ) *
        (1 - lisse(R - 9, R, r))
        -
        5 *
        (
            1 -
            lisse(
                LAC.r - 3,
                LAC.r + 3,
                Math.hypot(
                    x - LAC.x,
                    z - LAC.z
                )
            )
        )
    );
}

const sites = [
    { x: -1.5, z: -21, r: 6.5 },
    { x: -14, z: 6, r: 7 },
    { x: 9, z: -4, r: 5 }
];

const libre = (x, z, m = 3.2) =>
    Math.hypot(x, z) < R - 2.5 &&
    Math.abs(x - pathX(z)) > m &&
    Math.hypot(
        x - LAC.x,
        z - LAC.z
    ) > LAC.r + 1.2 &&
    sites.every(
        (s) =>
            Math.hypot(
                x - s.x,
                z - s.z
            ) > s.r
    );


// ---------- terrain ----------

{
    const g = new THREE.PlaneGeometry(
        2 * R + 2,
        2 * R + 2,
        mobile ? 100 : 160,
        mobile ? 100 : 160
    );

    g.rotateX(-Math.PI / 2);

    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();

    const herbes = [
        0x2c4528,
        0x3d5a2e,
        0x5a6030
    ].map(
        (h) => new THREE.Color(h)
    );

    const terre = new THREE.Color(0x5a4632);
    const sable = new THREE.Color(0x7a735c);

    for (let i = 0; i < p.count; i++) {
        let x = p.getX(i);
        let z = p.getZ(i);

        const r = Math.hypot(x, z);

        if (r > R) {
            x *= R / r;
            z *= R / r;
        }

        p.setXYZ(
            i,
            x,
            haut(x, z),
            z
        );

        const v =
            0.5 +
            0.5 *
            Math.sin(x * 0.7) *
            Math.sin(z * 0.6 + x * 0.2);

        const w =
            0.5 +
            0.5 *
            Math.sin(
                x * 0.21 +
                z * 0.17 +
                2
            );

        const dp =
            z < -18 || z > 26
                ? 99
                : Math.abs(x - pathX(z));

        c.copy(herbes[0])
            .lerp(herbes[1], v)
            .lerp(
                herbes[2],
                lisse(0.55, 0.9, w) * 0.8
            );

        c.lerp(
            terre,
            1 - lisse(0.9, 2.4, dp)
        );

        c.lerp(
            sable,
            (
                1 -
                lisse(
                    LAC.r - 0.5,
                    LAC.r + 2.5,
                    Math.hypot(
                        x - LAC.x,
                        z - LAC.z
                    )
                )
            ) * 0.85
        );

        c.lerp(
            terre,
            lisse(R - 3, R, r) * 0.6
        );

        c.multiplyScalar(
            0.85 + 0.3 * v
        );

        col.set(
            [c.r, c.g, c.b],
            i * 3
        );
    }

    g.setAttribute(
        "color",
        new THREE.BufferAttribute(col, 3)
    );

    g.computeVertexNormals();

    const m = new THREE.Mesh(
        g,
        new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 1
        })
    );

    m.receiveShadow = true;

    ile.add(m);
}


// ---------- dessous rocheux ----------

{
    const prof = [
        [R, 0],
        [R * 0.99, -1.5],
        [R * 0.93, -5],
        [R * 0.8, -10],
        [R * 0.6, -16],
        [R * 0.35, -22],
        [R * 0.12, -27],
        [0.01, -30]
    ].map(
        (a) => new THREE.Vector2(...a)
    );

    const g = new THREE.LatheGeometry(
        new THREE.SplineCurve(prof).getPoints(26),
        72
    );

    const p = g.attributes.position;
    const col = new Float32Array(p.count * 3);
    const c = new THREE.Color();

    for (let i = 0; i < p.count; i++) {
        const x = p.getX(i);
        const y = p.getY(i);
        const z = p.getZ(i);

        const s =
            Math.sin(
                x * 0.7 +
                y * 0.5 +
                z * 0.9
            ) * 0.07 +
            Math.sin(
                y * 2.1 +
                x * 0.3
            ) * 0.04;

        p.setXYZ(
            i,
            x * (1 + s),
            y + s * 4,
            z * (1 + s)
        );

        c.set(
            y > -2.2
                ? 0x3a2c1e
                : Math.sin(y * 1.3) > 0
                    ? 0x5b5650
                    : 0x45403a
        );

        c.lerp(
            new THREE.Color(0x1c1a19),
            lisse(-4, -28, y)
        );

        c.multiplyScalar(
            0.8 +
            0.4 *
            Math.sin(x + z)
        );

        col.set(
            [c.r, c.g, c.b],
            i * 3
        );
    }

    g.setAttribute(
        "color",
        new THREE.BufferAttribute(col, 3)
    );

    g.computeVertexNormals();

    ile.add(
        new THREE.Mesh(
            g,
            new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 1,
                flatShading: true,
                side: THREE.DoubleSide
            })
        )
    );
}


// ---------- lac ----------

const eau = new THREE.Mesh(
    new THREE.CircleGeometry(
        LAC.r + 1.5,
        48
    ).rotateX(-Math.PI / 2),

    new THREE.MeshStandardMaterial({
        color: 0x1d4550,
        roughness: 0.06,
        metalness: 0.3,
        transparent: true,
        opacity: 0.88
    })
);

eau.position.set(
    LAC.x,
    0.2,
    LAC.z
);

ile.add(eau);


// ---------- forêt ----------

const NC = mobile ? 150 : 280;
const NF = mobile ? 40 : 80;
const NT = NC + NF;

const troncs = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(
        0.12,
        0.26,
        1,
        6
    ).translate(0, 0.5, 0),

    vent(
        new THREE.MeshStandardMaterial({
            color: 0x3a2b1f,
            roughness: 1
        }),
        0
    ),

    NT
);

const matF = vent(
    new THREE.MeshStandardMaterial({
        roughness: 0.95
    }),
    0.03
);

const cones = [0, 1, 2].map((l) => {
    const h = 4.6 - l * 0.6;

    return new THREE.InstancedMesh(
        froisse(
            new THREE.ConeGeometry(
                2.3 - l * 0.5,
                h,
                8,
                3
            ).translate(0, h / 2, 0),
            0.12
        ),
        matF,
        NC
    );
});

const blobs = [0, 1, 2].map(
    () =>
        new THREE.InstancedMesh(
            froisse(
                new THREE.IcosahedronGeometry(
                    1.5,
                    1
                ),
                0.18
            ),
            matF,
            NF
        )
);

[troncs, ...cones, ...blobs].forEach((m) => {
    m.castShadow = true;
    m.receiveShadow = true;
    ile.add(m);
});

for (
    let i = 0, n = 0;
    n < NT && i < NT * 30;
    i++
) {
    const a = rnd(0, 6.28);
    const r =
        Math.sqrt(Math.random()) *
        (R - 2);

    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;

    if (!libre(x, z)) continue;

    const feuillu = n >= NC;
    const s = feuillu
        ? rnd(0.7, 1.2)
        : rnd(0.45, 1.05);

    const y = haut(x, z);
    const r2 = rnd(0, 6.28);

    dummy.position.set(x, y, z);
    dummy.rotation.set(0, r2, 0);

    dummy.scale.set(
        s,
        (feuillu ? 3.2 : 7) * s,
        s
    );

    dummy.updateMatrix();

    troncs.setMatrixAt(
        n,
        dummy.matrix
    );

    if (!feuillu) {
        teinte.setHSL(
            rnd(0.33, 0.45),
            rnd(0.25, 0.4),
            rnd(0.08, 0.15)
        );

        cones.forEach((m, l) => {
            dummy.position.set(
                x,
                y + (1.6 + l * 1.8) * s,
                z
            );

            dummy.scale.setScalar(
                s * (1 - l * 0.08)
            );

            dummy.updateMatrix();

            m.setMatrixAt(
                n,
                dummy.matrix
            );

            m.setColorAt(
                n,
                teinte
            );
        });
    } else {
        Math.random() < 0.7
            ? teinte.setHSL(
                rnd(0.05, 0.13),
                0.65,
                rnd(0.3, 0.45)
            )
            : teinte.setHSL(
                rnd(0.22, 0.3),
                0.45,
                rnd(0.2, 0.3)
            );

        blobs.forEach((m, b) => {
            dummy.position.set(
                x + rnd(-0.9, 0.9) * s,
                y + (3.4 + b * 0.8) * s,
                z + rnd(-0.9, 0.9) * s
            );

            dummy.scale.setScalar(
                s * rnd(0.8, 1.2)
            );

            dummy.updateMatrix();

            m.setMatrixAt(
                n - NC,
                dummy.matrix
            );

            m.setColorAt(
                n - NC,
                teinte
            );
        });
    }

    n++;
}


// ---------- végétation ----------

function semer(
    geo,
    mat,
    nb,
    test,
    config
) {
    const m = new THREE.InstancedMesh(
        geo,
        mat,
        nb
    );

    m.receiveShadow = true;

    for (
        let n = 0, i = 0;
        n < nb && i < nb * 20;
        i++
    ) {
        const a = rnd(0, 6.28);

        const r =
            Math.sqrt(Math.random()) *
            (R - 1.5);

        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;

        if (!test(x, z)) continue;

        dummy.position.set(
            x,
            haut(x, z),
            z
        );

        dummy.rotation.set(
            0,
            rnd(0, 6.28),
            0
        );

        dummy.scale.set(1, 1, 1);

        config(dummy, teinte);

        dummy.updateMatrix();

        m.setMatrixAt(
            n,
            dummy.matrix
        );

        m.setColorAt(
            n,
            teinte
        );

        n++;
    }

    ile.add(m);

    return m;
}

const pasLac = (x, z) =>
    haut(x, z) > 0.35 &&
    Math.abs(x - pathX(z)) > 0.9;

semer(
    new THREE.ConeGeometry(
        0.07,
        1,
        3
    ).translate(0, 0.5, 0),

    vent(
        new THREE.MeshStandardMaterial({
            roughness: 1
        }),
        0.35
    ),

    mobile ? 2500 : 6000,

    pasLac,

    (d, c) => {
        d.rotation.x = rnd(-0.3, 0.3);

        d.scale.set(
            rnd(0.8, 1.6),
            rnd(0.5, 1.5),
            rnd(0.8, 1.6)
        );

        c.setHSL(
            rnd(0.2, 0.3),
            rnd(0.3, 0.45),
            rnd(0.12, 0.24)
        );
    }
);

semer(
    new THREE.ConeGeometry(
        0.05,
        1,
        3
    ).translate(0, 0.5, 0),

    vent(
        new THREE.MeshStandardMaterial({
            roughness: 1
        }),
        0.3
    ),

    220,

    (x, z) => {
        const d = Math.hypot(
            x - LAC.x,
            z - LAC.z
        );

        return (
            d > LAC.r - 1 &&
            d < LAC.r + 2.5 &&
            haut(x, z) > 0.1
        );
    },

    (d, c) => {
        d.scale.set(
            1,
            rnd(1.4, 2.8),
            1
        );

        c.setHSL(
            rnd(0.15, 0.2),
            0.4,
            rnd(0.2, 0.3)
        );
    }
);

semer(
    new THREE.IcosahedronGeometry(
        0.09,
        0
    ).translate(0, 0.5, 0),

    vent(
        new THREE.MeshStandardMaterial({
            roughness: 0.8,
            emissive: 0x222222
        }),
        0.2
    ),

    260,

    pasLac,

    (d, c) => {
        d.position.y += rnd(0.1, 0.5);

        c.set([
            0xf4f1ea,
            0xffd36b,
            0xc9a7ff,
            0xff9ab0
        ][
            Math.floor(rnd(0, 4))
        ]);
    }
);

semer(
    froisse(
        new THREE.DodecahedronGeometry(
            1,
            1
        ),
        0.25
    ),

    vent(
        new THREE.MeshStandardMaterial({
            roughness: 0.95,
            flatShading: true
        }),
        0
    ),

    70,

    (x, z) =>
        libre(x, z, 2) ||
        Math.hypot(
            x - LAC.x,
            z - LAC.z
        ) < LAC.r + 3,

    (d, c) => {
        const s = rnd(0.25, 1.3);

        d.scale.set(
            s * 1.3,
            s * 0.8,
            s
        );

        d.position.y -= 0.15;

        c.setHSL(
            0.1,
            0.05,
            rnd(0.18, 0.34)
        );
    }
).castShadow = true;

semer(
    new THREE.CylinderGeometry(
        0.22,
        0.28,
        2.8,
        7
    ).rotateZ(Math.PI / 2),

    vent(
        new THREE.MeshStandardMaterial({
            color: 0x4a3626,
            roughness: 1
        }),
        0
    ),

    14,

    libre,

    (d, c) => {
        d.position.y += 0.25;
        d.rotation.y = rnd(0, 3);
        c.set(0xffffff);
    }
).castShadow = true;


// ---------- constructions ----------

const bois = new THREE.MeshStandardMaterial({
    color: 0x5a3b26,
    roughness: 0.9
});

const cab = new THREE.Group();

cab.position.set(
    sites[0].x,
    haut(sites[0].x, sites[0].z),
    sites[0].z
);

cab.rotation.y = 0.25;

{
    const m = (
        g,
        mat,
        x,
        y,
        z
    ) => {
        const o = new THREE.Mesh(
            g,
            mat
        );

        o.position.set(
            x,
            y,
            z
        );

        o.castShadow = true;
        o.receiveShadow = true;

        cab.add(o);

        return o;
    };

    m(
        new THREE.BoxGeometry(
            4,
            2.6,
            3.4
        ),
        bois,
        0,
        1.3,
        0
    );

    const toit = m(
        new THREE.ConeGeometry(
            3.5,
            1.9,
            4
        ),

        new THREE.MeshStandardMaterial({
            color: 0x2a3a2c,
            roughness: 1
        }),

        0,
        3.5,
        0
    );

    toit.rotation.y =
        Math.PI / 4;

    toit.scale.z = 0.85;

    m(
        new THREE.BoxGeometry(
            0.5,
            1.4,
            0.5
        ),

        new THREE.MeshStandardMaterial({
            color: 0x55504a,
            roughness: 1
        }),

        1.2,
        3.4,
        -0.6
    );

    m(
        new THREE.BoxGeometry(
            0.8,
            1.5,
            0.1
        ),

        new THREE.MeshStandardMaterial({
            color: 0x2b1d12
        }),

        -0.9,
        0.75,
        1.72
    );

    const f = m(
        new THREE.PlaneGeometry(
            0.9,
            0.8
        ),

        new THREE.MeshBasicMaterial({
            color: new THREE.Color().setRGB(
                3,
                1.8,
                0.7
            )
        }),

        0.9,
        1.5,
        1.71
    );

    const l = new THREE.PointLight(
        0xffa050,
        14,
        11,
        2
    );

    l.position.set(
        0.9,
        1.5,
        2.6
    );

    cab.add(l);
}

ile.add(cab);


// ---------- cercle de pierres ----------

const cercle = new THREE.Group();

cercle.position.set(
    sites[1].x,
    haut(
        sites[1].x,
        sites[1].z
    ) + 0.1,
    sites[1].z
);

for (let i = 0; i < 7; i++) {
    const a =
        (i / 7) * 6.283;

    const p = new THREE.Mesh(
        froisse(
            new THREE.DodecahedronGeometry(
                1,
                1
            ),
            0.2
        ),

        new THREE.MeshStandardMaterial({
            color: 0x6a6a64,
            roughness: 0.9,
            flatShading: true
        })
    );

    p.scale.set(
        0.7,
        rnd(1.6, 2.4),
        0.55
    );

    p.position.set(
        Math.cos(a) * 4.2,
        p.scale.y * 0.8,
        Math.sin(a) * 4.2
    );

    p.rotation.y = -a;

    p.castShadow = true;

    cercle.add(p);
}

const runes = new THREE.Mesh(
    new THREE.TorusGeometry(
        3,
        0.04,
        6,
        64
    ).rotateX(Math.PI / 2),

    new THREE.MeshBasicMaterial({
        color: new THREE.Color().setRGB(
            2.5,
            1.5,
            0.6
        )
    })
);

runes.position.y = 0.1;

cercle.add(runes);

ile.add(cercle);


// ---------- ponton ----------

const ponton = new THREE.Group();

for (let i = 0; i < 8; i++) {
    const p = new THREE.Mesh(
        new THREE.BoxGeometry(
            1.1,
            0.12,
            1.5
        ),
        bois
    );

    p.position.set(
        6.4 + i * 0.85,
        0.62,
        -4
    );

    p.castShadow = true;

    ponton.add(p);
}

for (let i = 0; i < 4; i++) {
    const p = new THREE.Mesh(
        new THREE.CylinderGeometry(
            0.09,
            0.09,
            1.6,
            6
        ),
        bois
    );

    p.position.set(
        7 + i * 1.8,
        0,
        -4 +
        (i % 2 ? 0.8 : -0.8)
    );

    ponton.add(p);
}

ile.add(ponton);


// ---------- lanternes ----------

const noms = [
    "description",
    "technologies",
    "resultat"
];

const pts = [
    new THREE.Vector3(
        cab.position.x,
        cab.position.y + 6.8,
        cab.position.z
    ),

    new THREE.Vector3(
        cercle.position.x,
        cercle.position.y + 4.6,
        cercle.position.z
    ),

    new THREE.Vector3(
        12.8,
        4,
        -4
    )
];

const vue = (
    p,
    dx,
    dy,
    d,
    h
) => ({
    t: new THREE.Vector3(
        p.x + dx,
        p.y + dy,
        p.z
    ),

    c: new THREE.Vector3(
        p.x + dx,
        p.y + dy + h,
        p.z + d
    )
});

const VUES = {
    apercu: {
        t: new THREE.Vector3(
            0,
            -1,
            0
        ),

        c: new THREE.Vector3(
            0,
            30,
            62
        )
    },

    description: vue(
        pts[0],
        -6,
        -4.5,
        17,
        6
    ),

    technologies: vue(
        pts[1],
        7,
        -2.5,
        17,
        6
    ),

    resultat: vue(
        pts[2],
        -1,
        -6,
        17,
        6
    )
};

const calque =
    document.createElement("div");

main.append(calque);

const noeuds = noms.map(
    (nom, i) => {
        const g =
            new THREE.Group();

        g.position.copy(pts[i]);

        g.add(
            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.32,
                    24,
                    24
                ),

                new THREE.MeshBasicMaterial({
                    color:
                        new THREE.Color()
                            .setRGB(
                                3,
                                2.3,
                                1.4
                            )
                })
            ),

            lueur(
                0xffa85a,
                4.5
            ),

            new THREE.Mesh(
                new THREE.TorusGeometry(
                    0.65,
                    0.014,
                    8,
                    64
                ),

                new THREE.MeshBasicMaterial({
                    color:
                        new THREE.Color()
                            .setRGB(
                                2,
                                1.3,
                                0.6
                            )
                })
            ),

            new THREE.PointLight(
                0xffa85a,
                30,
                18,
                2
            ),

            new THREE.Mesh(
                new THREE.SphereGeometry(
                    1.5,
                    8,
                    8
                ),

                new THREE.MeshBasicMaterial({
                    visible: false
                })
            )
        );

        g.userData = {
            cible: nom,
            echelle: 1,
            pulse: 0,
            phase: i * 1.9
        };

        ile.add(g);

        const b =
            document.createElement(
                "button"
            );

        b.className = "poi";

        b.textContent =
            document.querySelector(
                `#${nom} .petit-label`
            )?.textContent || nom;

        b.onclick = () =>
            aller(nom);

        calque.append(b);

        g.userData.label = b;

        return g;
    }
);


// ---------- champignons ----------

const messages = [
    "Les lucioles t'ont suivi.",
    "Chut. La forêt respire.",
    "Tu regardes au bon endroit."
];

let nbOeufs = 0;

const champignons = [
    [-6, 14],
    [-20, -6],
    [4, -12]
].map(([x, z]) => {
    const g =
        new THREE.Group();

    g.position.set(
        x,
        haut(x, z),
        z
    );

    for (let j = 0; j < 5; j++) {
        const s =
            rnd(0.6, 1.2);

        const m =
            new THREE.Group();

        m.position.set(
            rnd(-0.5, 0.5),
            0,
            rnd(-0.5, 0.5)
        );

        m.add(
            new THREE.Mesh(
                new THREE.CylinderGeometry(
                    0.04 * s,
                    0.06 * s,
                    0.5 * s,
                    8
                ).translate(
                    0,
                    0.25 * s,
                    0
                ),

                new THREE.MeshStandardMaterial({
                    color: 0xd9d2bf
                })
            ),

            new THREE.Mesh(
                new THREE.SphereGeometry(
                    0.24 * s,
                    14,
                    8,
                    0,
                    6.283,
                    0,
                    1.57
                ).translate(
                    0,
                    0.5 * s,
                    0
                ),

                new THREE.MeshStandardMaterial({
                    color: 0xbfd8d0,
                    emissive: 0x6fe0c0,
                    emissiveIntensity: 1.6
                })
            )
        );

        g.add(m);
    }

    const l =
        lueur(
            0x6fd0b8,
            2.6,
            0.3
        );

    l.position.y = 0.4;

    g.add(l);

    g.userData = {
        egg: true,
        pulse: 0,
        halo: l
    };

    ile.add(g);

    return g;
});

function afficherToast(t) {
    toast.textContent = t;

    toast.classList.add(
        "visible"
    );

    clearTimeout(
        afficherToast.id
    );

    afficherToast.id =
        setTimeout(
            () =>
                toast.classList.remove(
                    "visible"
                ),
            2600
        );
}


// ---------- air ----------

const nuages = Array.from(
    {
        length:
            mobile ? 14 : 26
    },
    (_, i) => {
        const s =
            lueur(
                i % 3
                    ? 0xc9d6d8
                    : 0xf0b890,
                rnd(22, 46),
                rnd(0.12, 0.28)
            );

        s.material.blending =
            THREE.NormalBlending;

        s.userData = {
            a: rnd(0, 6.28),
            r: rnd(34, 70),
            y:
                i < 8
                    ? rnd(-16, -6)
                    : rnd(-4, 22),
            v: rnd(0.01, 0.03)
        };

        scene.add(s);

        return s;
    }
);

const flottants = Array.from(
    {
        length: 16
    },
    () => {
        const s =
            rnd(0.5, 2.2);

        const m =
            new THREE.Mesh(
                froisse(
                    new THREE.DodecahedronGeometry(
                        s,
                        1
                    ),
                    0.25
                ),

                new THREE.MeshStandardMaterial({
                    color: 0x4d4a45,
                    roughness: 1,
                    flatShading: true
                })
            );

        m.userData = {
            a: rnd(0, 6.28),
            r: rnd(
                R + 3,
                R + 18
            ),
            y: rnd(-10, 16),
            v:
                rnd(0.02, 0.07) *
                (
                    Math.random() < 0.5
                        ? -1
                        : 1
                ),
            ph: rnd(0, 6.28)
        };

        m.castShadow = true;

        scene.add(m);

        return m;
    }
);

const fumee =
    Array.from(
        {
            length: 8
        },
        () => {
            const s =
                lueur(
                    0x9aa5a8,
                    1,
                    0
                );

            s.material.blending =
                THREE.NormalBlending;

            ile.add(s);

            return s;
        }
    );

const NL =
    mobile ? 300 : 700;

const lp =
    new Float32Array(
        NL * 3
    );

const lph =
    new Float32Array(NL);

for (let i = 0; i < NL; i++) {
    const a =
        rnd(0, 6.28);

    const r =
        Math.sqrt(
            Math.random()
        ) *
        (R - 3);

    const x =
        Math.cos(a) * r;

    const z =
        Math.sin(a) * r;

    lp.set(
        [
            x,
            Math.max(
                haut(x, z),
                0.3
            ) + rnd(0.5, 7),
            z
        ],
        i * 3
    );

    lph[i] =
        Math.random();
}

const lg =
    new THREE.BufferGeometry();

lg.setAttribute(
    "position",
    new THREE.BufferAttribute(
        lp,
        3
    )
);

lg.setAttribute(
    "aPhase",
    new THREE.BufferAttribute(
        lph,
        1
    )
);

const uBurst = {
    value: 0
};

ile.add(
    new THREE.Points(
        lg,

        new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            blending:
                THREE.AdditiveBlending,

            uniforms: {
                uTime,
                uBurst,
                uPx: {
                    value:
                        renderer.getPixelRatio()
                }
            },

            vertexShader: `
attribute float aPhase;
uniform float uTime, uBurst, uPx;
varying float vA;

void main() {
    vec3 p = position;

    p.x +=
        sin(
            uTime * 0.4 +
            aPhase * 6.0
        ) * 1.2 +
        uBurst * 2.0 *
        cos(
            uTime * 2.0 +
            aPhase * 30.0
        );

    p.y +=
        sin(
            uTime * 0.6 +
            aPhase * 9.0
        ) * 0.8 +
        uBurst * 1.5;

    p.z +=
        cos(
            uTime * 0.3 +
            aPhase * 5.0
        ) * 1.2 +
        uBurst * 2.0 *
        sin(
            uTime * 2.0 +
            aPhase * 30.0
        );

    vec4 mv =
        modelViewMatrix *
        vec4(p, 1.0);

    float f =
        0.5 +
        0.5 *
        sin(
            uTime * 1.6 +
            aPhase * 40.0
        );

    vA =
        0.3 +
        0.7 * f +
        uBurst;

    gl_PointSize =
        uPx *
        110.0 *
        (
            0.6 +
            f * 0.6 +
            uBurst
        ) /
        -mv.z;

    gl_Position =
        projectionMatrix *
        mv;
}
`,

            fragmentShader: `
varying float vA;

void main() {
    float d =
        length(
            gl_PointCoord - 0.5
        );

    float a =
        smoothstep(
            0.5,
            0.0,
            d
        );

    gl_FragColor =
        vec4(
            vec3(
                2.4,
                1.7,
                0.8
            ),
            a * a * vA
        );
}
`
        })
    )
);


// ---------- post-traitement ----------

const composer =
    new EffectComposer(renderer);

composer.addPass(
    new RenderPass(
        scene,
        camera
    )
);

composer.addPass(
    new UnrealBloomPass(
        new THREE.Vector2(
            innerWidth,
            innerHeight
        ),
        0.55,
        0.7,
        0.9
    )
);

composer.addPass(
    new OutputPass()
);


// ---------- caméra ----------

const controls =
    new OrbitControls(
        camera,
        canvas
    );

controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;

controls.minDistance = 14;
controls.maxDistance = 95;

controls.minPolarAngle = 0.2;
controls.maxPolarAngle = 1.42;

controls.rotateSpeed = 0.6;
controls.zoomSpeed = 0.7;
controls.autoRotateSpeed = 0.35;

camera.position.set(
    -40,
    70,
    120
);

controls.target.set(
    0,
    -1,
    0
);

controls.enabled = false;

let etat = "apercu";
let vol = null;
let introFin = false;
let inactif;

function voler(
    vers,
    duree = 1.9
) {
    vol = {
        c0: camera.position.clone(),
        t0: controls.target.clone(),
        v: vers,
        d: duree,
        t: 0
    };

    controls.enabled = false;
    controls.autoRotate = false;
}

function aller(nom) {
    if (!introFin) return;

    etat = nom;

    astuce.classList.add(
        "cache"
    );

    voler(VUES[nom]);

    actualiserInterface();
}

function quitter() {
    if (etat === "apercu") return;

    etat = "apercu";

    voler(
        VUES.apercu,
        1.6
    );

    actualiserInterface();
}

function actualiserInterface() {
    sections.forEach((s) =>
        s.classList.toggle(
            "active",
            s.dataset.section ===
            (
                etat === "apercu"
                    ? "intro"
                    : etat
            )
        )
    );

    noeuds.forEach((n) =>
        n.userData.label.classList.toggle(
            "cache",
            n.userData.cible === etat
        )
    );

    document
        .querySelectorAll(
            ".indicateur-scroll span"
        )
        .forEach((s, i) =>
            s.classList.toggle(
                "active",
                i ===
                (
                    etat === "apercu"
                        ? 0
                        : noms.indexOf(etat) + 1
                )
            )
        );
}

controls.addEventListener(
    "start",
    () => {
        controls.autoRotate = false;

        clearTimeout(inactif);

        astuce.classList.add(
            "cache"
        );
    }
);

controls.addEventListener(
    "end",
    () => {
        clearTimeout(inactif);

        inactif = setTimeout(
            () => {
                if (
                    etat === "apercu"
                ) {
                    controls.autoRotate = true;
                }
            },
            5000
        );
    }
);

document
    .querySelectorAll(
        "[data-target]"
    )
    .forEach((b) =>
        b.addEventListener(
            "click",
            () =>
                aller(
                    b.dataset.target
                )
        )
    );

document
    .querySelectorAll(
        ".section-projet:not(.section-intro) .bloc-projet"
    )
    .forEach((b) => {
        const x =
            document.createElement(
                "button"
            );

        x.className = "fermer";
        x.textContent =
            "Revenir à l'aperçu";

        x.onclick = quitter;

        b.append(x);
    });

addEventListener(
    "keydown",
    (e) => {
        if (e.key === "Escape") {
            quitter();
        }
    }
);


// ---------- interactions ----------

const raycaster =
    new THREE.Raycaster();

const souris =
    new THREE.Vector2();

let survol = null;
let depart = [0, 0];

const objetSous = () => {
    raycaster.setFromCamera(
        souris,
        camera
    );

    let o =
        raycaster.intersectObjects(
            [
                ...noeuds,
                ...champignons
            ],
            true
        )[0]?.object;

    while (
        o &&
        !o.userData.cible &&
        !o.userData.egg
    ) {
        o = o.parent;
    }

    return o || null;
};

canvas.addEventListener(
    "pointermove",
    (e) => {
        souris.set(
            (e.clientX / innerWidth) * 2 - 1,
            -(e.clientY / innerHeight) * 2 + 1
        );

        survol =
            introFin
                ? objetSous()
                : null;

        canvas.style.cursor =
            survol
                ? "pointer"
                : "grab";
    }
);

canvas.addEventListener(
    "pointerdown",
    (e) => {
        depart = [
            e.clientX,
            e.clientY
        ];
    }
);

canvas.addEventListener(
    "click",
    (e) => {
        if (
            Math.hypot(
                e.clientX - depart[0],
                e.clientY - depart[1]
            ) > 5 ||
            !introFin
        ) {
            return;
        }

        const o =
            objetSous();

        if (!o) return;

        o.userData.pulse = 1;

        uBurst.value =
            Math.max(
                uBurst.value,
                o.userData.egg
                    ? 1
                    : 0.5
            );

        if (o.userData.egg) {
            afficherToast(
                messages[
                    nbOeufs++ %
                    messages.length
                ]
            );
        } else {
            aller(
                o.userData.cible
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


// ---------- animation ----------

const horloge =
    new THREE.Clock();

const v3 =
    new THREE.Vector3();

let temps = 0;

function animer() {
    requestAnimationFrame(animer);

    const dt =
        Math.min(
            horloge.getDelta(),
            0.05
        );

    temps += dt;

    uTime.value = temps;

    // Intro : l'île monte des nuages,
    // les arbres poussent,
    // la caméra se pose.
    if (!introFin) {
        const t =
            Math.min(
                1,
                Math.max(
                    0,
                    (temps - 0.5) / 4
                )
            );

        const e =
            1 -
            Math.pow(
                1 - t,
                3
            );

        uIntro.value =
            Math.min(
                1,
                Math.max(
                    0,
                    (temps - 0.8) / 3.6
                )
            );

        ile.position.y =
            -24 *
            (1 - e);

        ile.rotation.y =
            -1.4 *
            (1 - e);

        camera.position.lerpVectors(
            new THREE.Vector3(
                -40,
                70,
                120
            ),
            VUES.apercu.c,
            inOut(t)
        );

        camera.lookAt(
            0,
            -1,
            0
        );

        if (t >= 1) {
            introFin = true;
            vol = null;

            controls.enabled = true;
            controls.autoRotate = true;

            controls.update();

            actualiserInterface();
        }

    } else if (vol) {

        vol.t =
            Math.min(
                1,
                vol.t +
                dt / vol.d
            );

        const e =
            inOut(vol.t);

        camera.position.lerpVectors(
            vol.c0,
            vol.v.c,
            e
        );

        controls.target.lerpVectors(
            vol.t0,
            vol.v.t,
            e
        );

        camera.position.y +=
            Math.sin(
                e * Math.PI
            ) * 5;

        controls.update();

        if (vol.t >= 1) {
            vol = null;
            controls.enabled = true;

            if (
                etat === "apercu"
            ) {
                inactif =
                    setTimeout(
                        () =>
                            (
                                controls.autoRotate =
                                true
                            ),
                        3000
                    );
            }
        }

    } else {
        controls.update();
    }


    // ---------- nuages ----------

    nuages.forEach((n) => {
        const u =
            n.userData;

        u.a +=
            u.v * dt;

        n.position.set(
            Math.cos(u.a) * u.r,
            u.y,
            Math.sin(u.a) * u.r
        );
    });


    // ---------- rochers flottants ----------

    flottants.forEach((m) => {
        const u =
            m.userData;

        u.a +=
            u.v * dt;

        m.position.set(
            Math.cos(u.a) * u.r,
            u.y +
            Math.sin(
                temps * 0.5 +
                u.ph
            ) * 0.8,
            Math.sin(u.a) * u.r
        );

        m.rotation.x +=
            dt * 0.1;

        m.rotation.y +=
            dt * 0.15;
    });


    // ---------- fumée ----------

    fumee.forEach(
        (s, i) => {
            const p =
                (
                    temps * 0.18 +
                    i / 8
                ) % 1;

            v3.set(
                1.2,
                4.4 + p * 5,
                -0.6
            )
                .applyAxisAngle(
                    new THREE.Vector3(
                        0,
                        1,
                        0
                    ),
                    0.25
                )
                .add(
                    cab.position
                );

            s.position.copy(v3);

            s.position.x +=
                p * 1.5;

            s.scale.setScalar(
                0.8 +
                p * 3.5
            );

            s.material.opacity =
                0.22 *
                Math.sin(
                    p * Math.PI
                );
        }
    );


    // ---------- runes ----------

    runes.material.color.setRGB(
        2.2 +
        Math.sin(
            temps * 2
        ) * 0.5,
        1.3,
        0.5
    );

    runes.rotation.y =
        temps * 0.1;

    uBurst.value *=
        Math.exp(
            -dt * 0.7
        );


    // ---------- lanternes ----------

    noeuds.forEach((n) => {
        const u =
            n.userData;

        u.pulse *=
            Math.exp(
                -dt * 3
            );

        u.echelle +=
            (
                (
                    n === survol
                        ? 1.4
                        : 1
                ) +
                u.pulse * 0.9 -
                u.echelle
            ) *
            (
                1 -
                Math.exp(
                    -dt * 10
                )
            );

        n.children[0]
            .scale
            .setScalar(
                u.echelle *
                (
                    1 +
                    Math.sin(
                        temps * 2 +
                        u.phase
                    ) * 0.07
                )
            );

        n.children[1]
            .scale
            .setScalar(
                4.5 *
                u.echelle
            );

        n.children[2]
            .scale
            .setScalar(
                u.echelle
            );

        n.children[2]
            .rotation.set(
                temps * 0.4 +
                u.phase,
                temps * 0.6,
                0
            );

        n.children[3].intensity =
            30 +
            u.pulse * 90;

        n.position.y =
            pts[
                noeuds.indexOf(n)
            ].y +
            Math.sin(
                temps * 0.9 +
                u.phase
            ) * 0.35;

        n.getWorldPosition(v3);

        v3.y += 1.4;

        v3.project(camera);

        u.label.style.transform =
            `translate(
    ${(v3.x * 0.5 + 0.5) * innerWidth}px,
    ${(-v3.y * 0.5 + 0.5) * innerHeight}px
) translate(-50%, -100%)`;

        u.label.classList.toggle(
            "visible",
            introFin &&
            v3.z < 1
        );
    });


    // ---------- champignons ----------

    champignons.forEach((c) => {
        c.userData.pulse *=
            Math.exp(
                -dt * 2.5
            );

        c.scale.setScalar(
            1 +
            c.userData.pulse * 0.3 +
            (
                c === survol
                    ? 0.1
                    : 0
            )
        );

        c.userData.halo.material.opacity =
            0.3 +
            Math.sin(
                temps * 1.4 +
                c.position.z
            ) * 0.1 +
            c.userData.pulse * 0.6;
    });


    composer.render();
}

actualiserInterface();
animer();

setTimeout(
    () =>
        chargement.classList.add(
            "fini"
        ),
    600
);

