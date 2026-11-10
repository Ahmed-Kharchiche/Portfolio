import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

// Une seule instance, rendue par la passe sans bloom et la boucle existantes.
export function creerPlaneteAnneaux(scene, camera, attribution) {
    const ancrage = new THREE.Group();
    const inclinaison = new THREE.Group();
    const rotation = new THREE.Group();
    ancrage.add(inclinaison);
    inclinaison.add(rotation);
    scene.add(ancrage);
    const ambiance = new THREE.HemisphereLight(0xe3ecff, 0x39303e, 1.5);
    const soleil = new THREE.DirectionalLight(0xffeedc, 2.3);
    soleil.position.set(-3, 4, 5);
    soleil.target = ancrage;
    ancrage.add(ambiance, soleil);
    ancrage.traverse(objet => objet.layers.set(1));
    ancrage.visible = false;

    let chargee = false;
    let temps = 0;
    let apparition = 0;
    let globe;
    const mouvementReduit = matchMedia("(prefers-reduced-motion: reduce)");
    const centre = new THREE.Vector3();
    const positionCible = new THREE.Vector3();
    let positionInitialisee = false;
    new GLTFLoader().load(new URL("../../modeles/ringed_gas_giant_planet.glb", import.meta.url).href, gltf => {
        const modele = gltf.scene;
        modele.updateMatrixWorld(true);
        const boite = new THREE.Box3().setFromObject(modele);
        boite.getCenter(centre);
        const rayon = boite.getBoundingSphere(new THREE.Sphere()).radius;
        if (!Number.isFinite(rayon) || rayon <= 0) return;
        // La sphère englobe aussi les anneaux, quelle que soit la rotation.
        modele.position.sub(centre);
        const normalisation = new THREE.Group();
        normalisation.add(modele);
        normalisation.scale.setScalar(1 / rayon);
        modele.traverse(objet => objet.layers.set(1));
        globe = modele.getObjectByName("Cube_m_planet_0");
        rotation.add(normalisation);
        chargee = true;
    }, undefined, erreur => {
        console.warn("Chargement de la planète impossible :", erreur);
    });

    return {
        get visible() { return ancrage.visible; },
        actualiser(dt, souris, active) {
            const cible = active && chargee && !document.hidden ? 1 : 0;
            apparition = THREE.MathUtils.damp(apparition, cible, 4, dt);
            ancrage.visible = apparition > 0.005 && !document.hidden;
            if (attribution) attribution.hidden = !ancrage.visible;
            if (!ancrage.visible) {
                positionInitialisee = false;
                return;
            }
            const etroit = camera.aspect < 1.1;
            const profondeur = 16;
            const hauteur = 2 * profondeur * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
            const largeur = hauteur * camera.aspect;
            const rayon = Math.min(largeur * (etroit ? 0.29 : 0.19), hauteur * (etroit ? 0.145 : 0.27));
            // Marge de perspective : les anneaux restent à l'intérieur du cadre.
            ancrage.scale.setScalar(rayon * apparition);
            if (!mouvementReduit.matches) temps += dt;
            positionCible.set(largeur * (etroit ? 0.17 : 0.285),
                hauteur * (etroit ? -0.20 : -0.08) + Math.sin(temps * 0.43) * rayon * 0.035,
                -profondeur).applyMatrix4(camera.matrixWorld);
            // Objet dans l'espace de la scène : la caméra peut se déplacer autour.
            // Le rattrapage lent du cadrage conserve une parallaxe sans perdre les anneaux.
            if (!positionInitialisee) {
                ancrage.position.copy(positionCible);
                ancrage.quaternion.copy(camera.quaternion);
                positionInitialisee = true;
            } else {
                ancrage.position.lerp(positionCible, 1 - Math.exp(-dt * 1.8));
                ancrage.quaternion.slerp(camera.quaternion, 1 - Math.exp(-dt * 0.8));
            }
            inclinaison.rotation.x = THREE.MathUtils.damp(inclinaison.rotation.x,
                mouvementReduit.matches ? 0 : souris.y * 0.14, 2.2, dt);
            inclinaison.rotation.y = THREE.MathUtils.damp(inclinaison.rotation.y,
                mouvementReduit.matches ? 0 : souris.x * 0.22, 2.2, dt);
            // Rotation autour de l'axe du modèle ; l'inclinaison des anneaux reste stable.
            if (globe) globe.rotation.y = temps * 0.10;
        }
    };
}
