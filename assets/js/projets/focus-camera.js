import * as THREE from "three";

/** Focus temporaire : conserve la pose de départ et réutilise la boucle de rendu. */
export function creerFocusCamera(camera, regard) {
    let origine = null, mouvement = null, cible = null;
    const pose = () => ({ position: camera.position.clone(), regard: regard.clone(), fov: camera.fov });
    const appliquer = (p) => {
        camera.position.copy(p.position);
        regard.copy(p.regard);
        camera.fov = p.fov;
    };
    const transition = (destination, retour) => {
        mouvement = { depart: pose(), destination, temps: 0, retour };
    };
    const cadrer = (objet) => {
        objet.updateWorldMatrix(true, true);
        const boite = new THREE.Box3().setFromObject(objet);
        if (boite.isEmpty()) return null;
        const centre = boite.getCenter(new THREE.Vector3());
        const taille = boite.getSize(new THREE.Vector3());
        const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(objet.getWorldQuaternion(new THREE.Quaternion()));
        const fov = 45, tangente = Math.tan(THREE.MathUtils.degToRad(fov / 2));
        const marge = objet.userData.margeFocus || 1.5;
        const distance = Math.max(
            Math.max(taille.y / (2 * tangente), taille.x / (2 * tangente * camera.aspect), 1.5) * marge,
            (objet.userData.largeurFocusMin || 0) / (2 * tangente * camera.aspect)
        ) + taille.z / 2;
        return { position: centre.clone().addScaledVector(normal, distance), regard: centre, fov };
    };
    return {
        get actif() { return origine !== null; },
        get retour() { return !!mouvement?.retour; },
        get enMouvement() { return mouvement !== null; },
        focus(objet) {
            if (!objet || origine) return false;
            const destination = cadrer(objet);
            if (!destination) return false;
            origine = pose();
            cible = objet;
            transition(destination, false);
            return true;
        },
        redimensionner() {
            if (origine && cible && !mouvement?.retour) {
                const destination = cadrer(cible);
                if (destination) transition(destination, false);
            }
        },
        changerCible(objet) {
            if (!origine || mouvement?.retour || !objet) return false;
            const destination = cadrer(objet);
            if (!destination) return false;
            cible = objet;
            transition(destination, false); // La pose initiale de défocus reste inchangée.
            return true;
        },
        defocus(immediat = false) {
            if (!origine) return;
            if (immediat) { appliquer(origine); origine = null; mouvement = null; cible = null; }
            else if (!mouvement?.retour) transition(origine, true);
        },
        actualiser(dt) {
            if (!origine) return false;
            // Les panneaux continuent de flotter et de grandir après leur arrivée.
            // Le cadrage suit leurs dimensions réelles au lieu de devenir trop serré.
            const destination = !mouvement?.retour && cible ? cadrer(cible) : null;
            if (mouvement) {
                const m = mouvement;
                if (destination) m.destination = destination;
                m.temps = Math.min(1, m.temps + dt / 0.85);
                const p = m.temps * m.temps * (3 - 2 * m.temps);
                camera.position.lerpVectors(m.depart.position, m.destination.position, p);
                regard.lerpVectors(m.depart.regard, m.destination.regard, p);
                camera.fov = m.depart.fov + (m.destination.fov - m.depart.fov) * p;
                if (m.temps === 1) {
                    appliquer(m.destination);
                    mouvement = null;
                    if (m.retour) { origine = null; cible = null; }
                }
            } else if (destination) {
                const p = 1 - Math.exp(-dt * 8);
                camera.position.lerp(destination.position, p);
                regard.lerp(destination.regard, p);
            }
            camera.lookAt(regard);
            // La dernière image du retour doit afficher exactement la pose restaurée.
            return true;
        },
    };
}
