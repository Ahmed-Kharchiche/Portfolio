import * as THREE from "three";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";

const LOGOS = {
    java: "java", javafx: "java", python: "python", py: "python", php: "php",
    html: "html5", html5: "html5", css: "css3", css3: "css3",
    javascript: "javascript", js: "javascript", typescript: "typescript", ts: "typescript",
    c: "c", "c++": "cplusplus", cpp: "cplusplus", "c#": "csharp", csharp: "csharp",
    react: "react", reactjs: "react", vue: "vuejs", vuejs: "vuejs",
    node: "nodejs", nodejs: "nodejs", kotlin: "kotlin", three: "threejs", threejs: "threejs", git: "git",
};
const modeles = new Map();
const loader = new SVGLoader();

function chargerLogo(slug) {
    if (!modeles.has(slug)) {
        const url = new URL(`../../images/technologies/${slug}.svg`, import.meta.url).href;
        modeles.set(slug, loader.loadAsync(url).then(svg => {
            const modele = new THREE.Group();
            svg.paths.forEach((path, couche) => {
                if (path.userData?.style?.fill === "none") return;
                const couleur = path.color.clone();
                const face = new THREE.MeshBasicMaterial({ color: couleur, transparent: false, depthWrite: true, alphaTest: 0.01, toneMapped: false, fog: false, side: THREE.DoubleSide });
                const chant = new THREE.MeshBasicMaterial({ color: couleur.clone().multiplyScalar(0.55), transparent: false, depthWrite: true, alphaTest: 0.01, toneMapped: false, fog: false, side: THREE.DoubleSide });
                path.toShapes().forEach(shape => {
                    const geometrie = new THREE.ExtrudeGeometry(shape, {
                        depth: 6, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.25,
                        bevelSegments: 1, steps: 1, curveSegments: 6,
                    });
                    const mesh = new THREE.Mesh(geometrie, [face, chant]);
                    mesh.position.z = couche * 0.12;
                    modele.add(mesh);
                });
            });
            modele.scale.y = -1; // Le repère SVG est orienté vers le bas.
            const boite = new THREE.Box3().setFromObject(modele);
            if (boite.isEmpty()) throw new Error(`Logo vide : ${slug}`);
            const taille = boite.getSize(new THREE.Vector3());
            const facteur = 2.25 / Math.max(taille.x, taille.y);
            modele.scale.multiplyScalar(facteur);
            modele.position.sub(new THREE.Box3().setFromObject(modele).getCenter(new THREE.Vector3()));
            return modele;
        }));
    }
    return modeles.get(slug);
}

/** Logos vectoriels extrudés : géométrie partagée, couleurs de marque préservées. */
export function creerTechnologie3D(nom, { enregistrer, temps, libelle }) {
    const g = new THREE.Group();
    g.userData.technologie = nom;
    const o = { g, react: 0, up: () => {}, ready: null };
    const cle = nom.toLowerCase().trim().replace(/[.\s-]/g, "");
    let volume = null;
    const enregistrerModele = modele => {
        modele.traverse(objet => {
            if (!objet.isMesh) return;
            objet.layers.set(1); // Hors bloom, sans éclairage ni teinte de la scène.
            objet.material = Array.isArray(objet.material) ? objet.material.map(m => m.clone()) : objet.material.clone();
            for (const mat of (Array.isArray(objet.material) ? objet.material : [objet.material])) enregistrer(mat);
        });
        volume = modele;
        g.add(modele);
    };
    const repli = () => {
        // SQL est un langage, pas une marque : symbole de base de données en volume.
        if (/sql|database|^db$/.test(cle)) {
            const modele = new THREE.Group();
            for (let i = 0; i < 3; i++) {
                const disque = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.42, 32),
                    new THREE.MeshBasicMaterial({ color: 0x4479a1, transparent: false, depthWrite: true, alphaTest: 0.01, toneMapped: false, fog: false }));
                disque.position.y = (i - 1) * 0.48;
                modele.add(disque);
            }
            enregistrerModele(modele);
        } else {
            const texte = libelle(nom);
            const boite = new THREE.Box3().setFromObject(texte);
            const taille = boite.getSize(new THREE.Vector3());
            texte.scale.multiplyScalar(2.25 / Math.max(taille.x, taille.y, 0.01));
            g.add(texte);
        }
    };
    const slug = LOGOS[cle];
    o.ready = slug ? chargerLogo(slug).then(modele => {
        enregistrerModele(modele.clone(true));
        g.userData.logo3D = slug;
        return true;
    }).catch(erreur => {
        console.warn(`[technologies] ${nom} :`, erreur.message);
        repli();
        return false;
    }) : Promise.resolve().then(() => { repli(); return false; });
    o.up = () => {
        if (!volume) return;
        // Faible oscillation : le logo reste lisible, jamais tourné sur la tranche.
        volume.rotation.y = Math.sin(temps() * 0.35) * 0.20;
        volume.rotation.x = Math.sin(temps() * 0.25) * 0.06;
    };
    return o;
}
