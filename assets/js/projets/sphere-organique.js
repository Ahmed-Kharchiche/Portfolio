import * as THREE from "three";

// Matière procédurale : aucun fichier image ni simulation physique par sommet.
export function creerSphereOrganique(rayon) {
    const uniforms = {
        uTemps: { value: 0 },
        uCurseur: { value: new THREE.Vector3(0, 0, 1) },
        uForce: { value: 0 },
        uTransition: { value: 0 },
        uVagues: { value: Array.from({ length: 6 }, () => new THREE.Vector4(0, 0, 1, -100)) },
        uEnergies: { value: new Float32Array(6) },
    };
    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
            uniform float uTemps, uForce, uTransition;
            uniform vec3 uCurseur;
            uniform vec4 uVagues[6];
            uniform float uEnergies[6];
            varying vec3 vNormal, vVue, vSurface;
            varying float vCreux;
            float pliLiquide(vec3 n) {
                return n.y * 5.2 + n.x * 2.5 + sin(n.z * 3.4 + n.x * 2.0 + uTemps * .28) * 1.8
                    + sin(n.x * 3.0 - n.y * 2.0 - uTemps * .23) * .75;
            }
            vec3 forme(vec3 n) {
                float vague = sin(n.x * 4.0 + uTemps * .82)
                    * sin(n.y * 3.5 - uTemps * .61)
                    * sin(n.z * 4.0 + uTemps * .49);
                float plis = sin(dot(n, vec3(8.0,5.0,3.0)) + uTemps * 1.02
                    + sin(n.y * 5.0 - uTemps * .44)) * .023;
                float houle = sin(dot(n, vec3(2.0,-3.0,1.5)) + uTemps * .57)
                    * sin(dot(n, vec3(-2.5,1.0,3.0)) - uTemps * .41) * .016;
                float micro = sin(n.x * 19.0 + n.z * 11.0 + uTemps * 1.1)
                    * sin(n.y * 17.0 - n.z * 7.0 - uTemps * .72) * .005;
                float attraction = pow(max(dot(n, normalize(uCurseur)), 0.0), 5.0) * uForce;
                float rides = 0.0;
                for (int i = 0; i < 6; i++) {
                    float age = uTemps - uVagues[i].w;
                    float arc = acos(clamp(dot(n, uVagues[i].xyz), -.9999, .9999));
                    float front = arc - age * 1.65;
                    rides += sin(front * 16.0) * exp(-front * front * 5.0)
                        * exp(-max(age, 0.0) * 1.5) * uEnergies[i] * .045;
                }
                float organique = 1.0 - uTransition;
                float drape = sin(pliLiquide(n)) * .06
                    + sin(pliLiquide(n) * 2.0 + .7) * .018;
                return n * (1.0 + (vague * .04 + drape + houle + plis * .6 + micro * .55 + rides
                    + sin(uTemps * 1.3) * .018 + attraction * .25) * organique)
                    + normalize(uCurseur) * attraction * .055 * organique;
            }
            void main() {
                vec3 n = normalize(position);
                vec3 tangent = normalize(cross(n, abs(n.y) < .9 ? vec3(0,1,0) : vec3(1,0,0)));
                vec3 bitangent = cross(n, tangent);
                vec3 p = forme(n);
                vec3 a = forme(normalize(n + tangent * .008)) - p;
                vec3 b = forme(normalize(n + bitangent * .008)) - p;
                vec3 normale = normalize(cross(a,b));
                vec3 c = forme(normalize(n - tangent * .008)) - p;
                vec3 d = forme(normalize(n - bitangent * .008)) - p;
                // Courbure locale : ombrage léger des concavités, sans ombre peinte fixe.
                float courbure = dot(a + b + c + d, normale) / (.008 * .008);
                vCreux = smoothstep(.5, 9.0, courbure);
                vNormal = normalize(normalMatrix * normale);
                vSurface = p;
                vec4 vue = modelViewMatrix * vec4(p * ${rayon.toFixed(5)}, 1.0);
                vVue = -vue.xyz;
                gl_Position = projectionMatrix * vue;
            }
        `,
        fragmentShader: `
            varying vec3 vNormal, vVue, vSurface;
            varying float vCreux;
            uniform float uTemps, uTransition;
            void main() {
                vec3 n = normalize(vNormal), v = normalize(vVue);
                float face = max(dot(n,v), 0.0);
                float bord = pow(1.0 - face, 2.3);
                vec3 surface = normalize(vSurface);
                float ruban = surface.y * 5.2 + surface.x * 2.5
                    + sin(surface.z * 3.4 + surface.x * 2.0 + uTemps * .28) * 1.8
                    + sin(surface.x * 3.0 - surface.y * 2.0 - uTemps * .23) * .75;
                float film = sin(ruban * .65 + (1.0 - face) * 2.5);
                vec3 violet = vec3(.065,.008,.22);
                vec3 bleu = vec3(.018,.28,.72);
                vec3 rose = vec3(.72,.035,.34);
                vec3 nacre = mix(violet, bleu, smoothstep(-.35,.75,film));
                nacre = mix(nacre, rose, smoothstep(.3,.85,sin(ruban * .8 + 1.8)) * .86);
                float teinteChaude = pow(.5 + .5 * sin(ruban * .48 - surface.x * 2.0), 7.0);
                nacre = mix(nacre, vec3(.95,.28,.16), teinteChaude * .3);
                float cyan = pow(.5 + .5 * cos(ruban * .75 + surface.z * 2.0), 5.0);
                nacre = mix(nacre, vec3(.008,.65,.88), cyan * .57);
                vec3 principale = normalize(vec3(-.65,.8,.9));
                vec3 secondaire = normalize(vec3(.9,-.2,.45));
                float diffus = max(dot(n, principale), 0.0);
                float remplissage = max(dot(n, secondaire), 0.0);
                float volume = .58 + .42 * pow(face, .65);
                float ombreCreux = 1.0 - vCreux * .4;
                vec3 couleur = nacre;
                couleur *= volume * (.21 + .74 * diffus + .13 * remplissage) * ombreCreux;
                // Les plis restent colorés dans l'ombre ; les crêtes captent davantage la lumière.
                float profondeurPli = smoothstep(-.8,.65,sin(ruban));
                couleur *= mix(.65,1.12,profondeurPli);
                float reflet = pow(max(dot(reflect(-principale, n),v),0.0), 95.0);
                float refletFin = pow(max(dot(reflect(-secondaire, n),v),0.0), 125.0);
                couleur += vec3(1.0,.87,.94) * reflet * .48;
                couleur += vec3(.55,.9,1.0) * refletFin * .36;
                // Reflets de grandes sources allongées, déformés par les normales liquides.
                vec3 miroir = reflect(-v, n);
                float bandeCyan = exp(-pow((miroir.y - .42 - miroir.x * .22) * 14.0, 2.0))
                    * smoothstep(-.45,.35,miroir.z);
                float bandeRose = exp(-pow((miroir.x + miroir.y * .45 + .38) * 18.0, 2.0))
                    * smoothstep(-.5,.25,miroir.z);
                float arete = pow(.5 + .5 * sin(ruban + .5), 18.0);
                couleur += vec3(.08,.8,1.0) * bandeCyan * .9;
                couleur += vec3(1.0,.16,.65) * bandeRose * .82;
                float coeurCyan = pow(bandeCyan, 4.0);
                float coeurRose = pow(bandeRose, 4.0);
                couleur += vec3(.55,.85,.95) * coeurCyan * .18;
                couleur += vec3(.95,.65,.83) * coeurRose * .16;
                float refletChaud = exp(-pow((miroir.y + miroir.x * .65 + .5) * 12.0, 2.0))
                    * smoothstep(-.2,.65,miroir.z);
                couleur += vec3(1.0,.65,.4) * refletChaud * .42;
                couleur += mix(vec3(.025,.62,.95), vec3(.85,.08,.48), .5 + .5 * film)
                    * arete * (.16 + .36 * diffus);
                // Fresnel discret et directionnel : quelques liserés, sans blanchir tout le bord.
                float filet = pow(max(dot(n, normalize(vec3(-.85,.35,.05))),0.0), 4.0);
                couleur += mix(vec3(.22,.7,1.0), vec3(.9,.35,.8), .5 + .5 * film)
                    * bord * (.17 + filet * .42);
                gl_FragColor = vec4(mix(couleur, vec3(2.0), uTransition), 1.0);
                #include <tonemapping_fragment>
                #include <colorspace_fragment>
            }
        `,
    });
    const leger = matchMedia("(max-width: 767px)").matches;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(rayon, leger ? 64 : 96, leger ? 40 : 64), material);
    // La déformation reste contenue dans cette enveloppe (frustum culling correct).
    mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), rayon * 1.6);
    const ray = new THREE.Raycaster();
    const centre = new THREE.Vector3(), proche = new THREE.Vector3();
    const direction = new THREE.Vector3(0, 0, 1);
    const echelle = new THREE.Vector3();
    const precedent = new THREE.Vector2();
    let vitesseForce = 0, derniereVague = -1, indexVague = 0, initialise = false;
    let energieMouvement = 0;
    let present = false;
    return {
        mesh,
        pointerPresent(value) {
            if (present !== value) initialise = false;
            present = value;
        },
        actualiser(dt, temps, camera, souris, interaction, transition = 0) {
            uniforms.uTemps.value = temps;
            uniforms.uTransition.value = transition;
            mesh.updateWorldMatrix(true, false);
            mesh.getWorldPosition(centre);
            ray.setFromCamera(souris, camera);
            ray.ray.closestPointToPoint(centre, proche);
            const taille = rayon * mesh.getWorldScale(echelle).x;
            const distance = proche.distanceTo(centre);
            const pas = Math.max(.001, Math.min(dt, .05));
            // Vitesse en diagonales d'écran / seconde : indépendante du format de l'écran.
            const dx = (souris.x - precedent.x) * camera.aspect;
            const dy = souris.y - precedent.y;
            const vitesse = initialise && present && interaction
                ? Math.hypot(dx, dy) / (2 * Math.hypot(camera.aspect, 1) * Math.max(dt, .001)) : 0;
            precedent.copy(souris);
            initialise = true;
            const energieCible = Math.min(vitesse / .75, 1);
            const inertie = energieCible > energieMouvement ? .09 : .38;
            energieMouvement += (energieCible - energieMouvement) * (1 - Math.exp(-pas / inertie));
            const proximite = present && interaction ? Math.exp(-Math.pow(distance / (taille * 1.8), 2)) : 0;
            const cible = proximite * energieMouvement * .95;
            const lissage = 1 - Math.exp(-pas * 7);
            // Ressort amorti : la matière conserve brièvement l'énergie du geste.
            vitesseForce += ((cible - uniforms.uForce.value) * 65 - vitesseForce * 12) * pas;
            uniforms.uForce.value = THREE.MathUtils.clamp(uniforms.uForce.value + vitesseForce * pas, 0, 1);
            if (proximite > .001) {
                // Le point le plus proche du rayon est projeté sur l'hémisphère visible.
                proche.addScaledVector(ray.ray.direction, -taille * .7);
                direction.copy(mesh.worldToLocal(proche)).normalize();
                uniforms.uCurseur.value.lerp(direction, lissage).normalize();
                if (energieMouvement > .035 && temps - derniereVague > .13) {
                    uniforms.uVagues.value[indexVague].set(direction.x, direction.y, direction.z, temps);
                    uniforms.uEnergies.value[indexVague] = proximite * energieMouvement;
                    indexVague = (indexVague + 1) % 6;
                    derniereVague = temps;
                }
            }
        },
    };
}
