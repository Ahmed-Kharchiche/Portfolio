import * as THREE from 'three';

/** Orientation panoramique et marche avant/arrière ; aucun changement de section ou de FOV. */
export function creerNavigationPaveTactile(canevas, camera, regard, { autorise, bloque = () => false, obstacles, surMouvement = () => {} }) {
    let libre = false, yaw = 0, cibleYaw = 0, vitesseYaw = 0;
    let avance = 0, cibleAvance = 0, vitesseAvance = 0, distanceRegard = 1;
    let gesteSafari = false, echelleSafari = 1;
    const rotationDepart = new THREE.Quaternion(), rotationYaw = new THREE.Quaternion();
    const verticale = new THREE.Vector3(0, 1, 0), direction = new THREE.Vector3();
    const intersection = new THREE.Vector3(), centreBoite = new THREE.Vector3(), boite = new THREE.Box3();
    const rayon = new THREE.Ray(), domaine = new THREE.Sphere();
    const borner = (n, min, max) => Math.max(min, Math.min(max, n));

    function commencer() {
        if (libre) return;
        libre = true;
        rotationDepart.copy(camera.quaternion);
        distanceRegard = Math.max(1, camera.position.distanceTo(regard));
        domaine.center.copy(regard);
        domaine.radius = Math.min(camera.far * 0.4, Math.max(25, distanceRegard * 2.2));
    }
    function annulerInertie() {
        cibleYaw = yaw; cibleAvance = avance;
        vitesseYaw = vitesseAvance = 0; gesteSafari = false;
    }
    function eligible(e) {
        if (document.hidden || !e.cancelable || e.defaultPrevented) return false;
        // En Focus, absorber les gestes sur la scène pour éviter aussi le zoom natif et son redimensionnement.
        if (bloque()) { e.preventDefault(); return false; }
        return autorise();
    }
    function tourner(delta) {
        commencer();
        // Un geste horizontal ne doit pas prolonger un déplacement de profondeur précédent.
        cibleAvance = avance; vitesseAvance = 0;
        cibleYaw += delta; // Aucune borne angulaire : plusieurs tours complets sont possibles.
    }
    function avancer(delta) {
        commencer();
        cibleAvance = borner(cibleAvance + delta, avance - 6, avance + 6);
    }
    canevas.addEventListener('wheel', e => {
        const facteur = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? canevas.clientHeight : 1;
        const dx = e.deltaX * facteur, dy = e.deltaY * facteur;
        if (!Number.isFinite(dx) || !Number.isFinite(dy) || (!dx && !dy) || e.metaKey || !eligible(e)) return;
        if (e.ctrlKey) {
            if (!dy) return;
            e.preventDefault();
            commencer();
            if (!gesteSafari) avancer(-borner(dy, -240, 240) * distanceRegard * 0.003);
        } else if ((Math.abs(dx) > 0.1 && Math.abs(dx) >= Math.abs(dy) * 0.75) || e.shiftKey) {
            e.preventDefault();
            tourner(borner(dx || dy, -400, 400) / Math.max(1, canevas.clientWidth) * Math.PI * 1.1);
        } else if (dy) {
            e.preventDefault();
            commencer();
            avancer(-borner(dy, -240, 240) * distanceRegard * 0.0015);
        }
    }, { passive: false });
    canevas.addEventListener('gesturestart', e => {
        if (!eligible(e)) return;
        e.preventDefault(); gesteSafari = true; echelleSafari = e.scale || 1;
    }, { passive: false });
    canevas.addEventListener('gesturechange', e => {
        if (!eligible(e) || !gesteSafari || !Number.isFinite(e.scale) || e.scale <= 0) return;
        e.preventDefault(); commencer();
        avancer(Math.log(e.scale / echelleSafari) * distanceRegard);
        echelleSafari = e.scale;
    }, { passive: false });
    canevas.addEventListener('gestureend', e => {
        if (gesteSafari && eligible(e)) e.preventDefault();
        gesteSafari = false;
    }, { passive: false });

    return {
        get vueLibre() { return libre; },
        // API conservée : la navigation travaille désormais directement dans la pose courante.
        retirer() {},
        liberer() {
            libre = false;
            yaw = cibleYaw = vitesseYaw = avance = cibleAvance = vitesseAvance = 0;
            gesteSafari = false;
        },
        figer() { this.liberer(); commencer(); },
        actualiser(dt) {
            if (!libre) return;
            if (document.hidden || !autorise()) { annulerInertie(); return; }
            const t = Math.max(0, Math.min(dt, 0.1)), omega = 20, attenuation = Math.exp(-omega * t);
            const ancienYaw = yaw, ancienneAvance = avance;
            const dy = yaw - cibleYaw, da = avance - cibleAvance;
            const ty = (vitesseYaw + omega * dy) * t, ta = (vitesseAvance + omega * da) * t;
            yaw = cibleYaw + (dy + ty) * attenuation;
            avance = cibleAvance + (da + ta) * attenuation;
            vitesseYaw = (vitesseYaw - omega * ty) * attenuation;
            vitesseAvance = (vitesseAvance - omega * ta) * attenuation;
            const variationYaw = yaw - ancienYaw;
            // Réduction numérique seulement, sans limite de rotation.
            if (Math.abs(yaw) > Math.PI * 16) {
                const tours = Math.trunc(yaw / (Math.PI * 2)) * Math.PI * 2;
                yaw -= tours; cibleYaw -= tours;
            }
            rotationYaw.setFromAxisAngle(verticale, -yaw);
            camera.quaternion.copy(rotationYaw).multiply(rotationDepart);
            direction.set(0, 0, -1).applyQuaternion(camera.quaternion).normalize();
            const deplacement = avance - ancienneAvance;
            let longueur = Math.abs(deplacement);
            if (longueur > 0.000001) {
                if (deplacement < 0) direction.negate();
                rayon.set(camera.position, direction);
                // Limite spatiale, sans modifier l'axe du déplacement ni l'orientation.
                if (rayon.intersectSphere(domaine, intersection)) longueur = Math.min(longueur, Math.max(0, intersection.distanceTo(camera.position) - 0.001));
                for (const objet of obstacles()) {
                    boite.setFromObject(objet).expandByScalar(0.65);
                    if (boite.containsPoint(camera.position)) {
                        boite.getCenter(centreBoite).subVectors(camera.position, centreBoite);
                        if (direction.dot(centreBoite) < 0) longueur = 0;
                    } else if (rayon.intersectBox(boite, intersection)) {
                        longueur = Math.min(longueur, intersection.distanceTo(camera.position));
                    }
                }
                camera.position.addScaledVector(direction, longueur);
                if (longueur < Math.abs(deplacement) - 0.00001) { cibleAvance = avance; vitesseAvance = 0; }
                if (deplacement < 0) direction.negate();
            }
            regard.copy(camera.position).addScaledVector(direction, distanceRegard);
            if (t > 0) {
                const energie = Math.min(1, Math.abs(variationYaw) / t * 0.3 + longueur / t / 8);
                if (energie > 0.001) surMouvement(energie);
            }
        },
    };
}
