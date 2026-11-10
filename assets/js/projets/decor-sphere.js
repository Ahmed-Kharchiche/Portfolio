import * as THREE from "three";
import { creerRayonsSphere } from "./rayons-sphere.js";

// Décor de l'attente uniquement : quatre voiles, une orbite et une seule passe de particules.
export function creerDecorSphere() {
    const groupe = new THREE.Group();
    const uTemps = { value: 0 }, uFondu = { value: 1 };
    const fondMaterial = new THREE.ShaderMaterial({
        uniforms: { uFondu }, transparent: true, depthWrite: false, depthTest: true,
        vertexShader: `varying vec2 vUv;
            void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `varying vec2 vUv;uniform float uFondu;
            void main(){
                vec2 p=vUv-.5;
                float brume=exp(-dot(p*vec2(1.3,.9),p*vec2(1.3,.9))*5.0);
                vec3 couleur=mix(vec3(.001,.002,.007),vec3(.012,.008,.028),brume);
                gl_FragColor=vec4(couleur,uFondu);
            }`,
    });
    const fond = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), fondMaterial);
    fond.renderOrder = -10;
    groupe.add(fond);
    const rayons = creerRayonsSphere();
    groupe.add(rayons.groupe);
    const positions = new Float32Array(30 * 3), tailles = new Float32Array(30);
    for (let i = 0; i < 30; i++) {
        const a = i * 2.399963;
        const r = 1.38 + (i % 7) * .19;
        positions.set([Math.cos(a) * r, Math.sin(a) * r * .78, -.3 + Math.sin(i * 4.1) * .9], i * 3);
        tailles[i] = i % 5 === 0 ? 10 : 3.5;
    }
    const geometriePoints = new THREE.BufferGeometry();
    geometriePoints.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometriePoints.setAttribute("aTaille", new THREE.BufferAttribute(tailles, 1));
    const pointsMaterial = new THREE.ShaderMaterial({
        uniforms: { uTemps, uFondu, uPixel: { value: Math.min(devicePixelRatio, 2) } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `
            uniform float uTemps, uPixel;
            attribute float aTaille;
            varying float vLueur;
            void main() {
                vec3 p = position;
                p.y += sin(uTemps * .3 + position.x * 4.0) * .045;
                vLueur = .6 + .4 * sin(uTemps * .7 + position.y * 6.0);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(p,1.0);
                gl_PointSize = aTaille * uPixel;
            }
        `,
        fragmentShader: `
            uniform float uFondu;
            varying float vLueur;
            void main() {
                float r = length(gl_PointCoord - .5) * 2.0;
                float alpha = 1.0 - smoothstep(.65,1.0,r);
                float perle = pow(max(1.0-r*r,0.0),.5);
                float reflet = exp(-dot(gl_PointCoord-vec2(.36,.33),gl_PointCoord-vec2(.36,.33))*90.0);
                vec3 couleur=mix(vec3(.3,.12,.65),vec3(.55,.45,1.0),perle);
                couleur+=vec3(.5,.85,1.0)*pow(r,5.0)*.45+vec3(.8,.9,1.0)*reflet;
                gl_FragColor = vec4(couleur, alpha * (.75 + vLueur * .25) * uFondu);
            }
        `,
    });
    const etoiles = new THREE.Points(geometriePoints, pointsMaterial);
    groupe.add(etoiles);
    const centre = new THREE.Vector3();
    return {
        groupe,
        actualiser(temps, transition, camera, sphere, rayon) {
            const fondu = 1 - THREE.MathUtils.smoothstep(transition, 0, .85);
            groupe.visible = fondu > .001;
            if (!groupe.visible) return;
            uTemps.value = temps;
            uFondu.value = fondu;

            sphere.getWorldPosition(centre);
            groupe.position.copy(centre);
            groupe.quaternion.copy(camera.quaternion);
            groupe.scale.setScalar(rayon);
            const hauteur = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.distanceTo(centre) / rayon;
            const largeur = hauteur * camera.aspect;
            fond.position.z = -3;
            const reculFond = 1 + 3 * rayon / camera.position.distanceTo(centre);
            fond.scale.set(largeur * reculFond, hauteur * reculFond, 1);
            rayons.actualiser(temps, fondu, largeur, hauteur);

            etoiles.rotation.z = temps * .012;
        },
    };
}
