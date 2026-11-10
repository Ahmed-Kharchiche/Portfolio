/** Vitesse en fractions de diagonale par seconde, indépendante de la fréquence des événements. */
export function creerDynamiqueSouris() {
    let precedent = null, dernierGeste = -Infinity, derniereMaj = null, cible = 0, energie = 0;
    return {
        deplacer(x, y, temps, diagonale) {
            if (precedent) {
                const dt = (temps - precedent.temps) / 1000;
                const distance = Math.hypot(x - precedent.x, y - precedent.y);
                if (dt > 0 && dt < 0.25 && distance > 0) {
                    const vitesse = Math.min(4, distance / (dt * Math.max(1, diagonale)));
                    cible = 1 - Math.exp(-1.15 * vitesse);
                    dernierGeste = temps;
                }
            }
            precedent = { x, y, temps };
        },
        actualiser(temps) {
            const dt = derniereMaj === null ? 0 : Math.min(0.1, Math.max(0, (temps - derniereMaj) / 1000));
            derniereMaj = temps;
            const objectif = temps - dernierGeste <= 120 ? cible : 0;
            energie += (objectif - energie) * (1 - Math.exp(-dt / (objectif > energie ? 0.085 : 0.28)));
            if (objectif === 0 && energie < 0.0003) energie = 0;
            return energie;
        },
        quitter() { precedent = null; cible = 0; dernierGeste = -Infinity; },
        stimuler(intensite, temps) { cible = Math.max(0, Math.min(1, intensite)); dernierGeste = temps; },
        reinitialiser() { this.quitter(); energie = 0; derniereMaj = null; },
    };
}

/** Uniquement les fichiers fournis ; les gestes ne redémarrent jamais les boucles. */
export function creerSonsImmersifs(contexte, sortie) {
    let actif = true, mouvement = null, transition = null, debut = null, voyage = null, generation = 0, introEnAttente = false;
    let clicSphere = null, sourceClicSphere = null, clicSphereDemande = false;
    const boucles = [], dynamique = creerDynamiqueSouris(), dynamiqueCamera = creerDynamiqueSouris();
    const fond = contexte.createGain(), filtre = contexte.createBiquadFilter(), coupeBas = contexte.createBiquadFilter();
    fond.gain.value = 0;
    filtre.type = 'lowpass'; filtre.frequency.value = 1800;
    coupeBas.type = 'highpass'; coupeBas.frequency.value = 180;
    fond.connect(coupeBas).connect(filtre).connect(sortie);

    function construireTexture(buffer) {
        const pas = Math.max(1, Math.floor(buffer.sampleRate * 0.05));
        const niveaux = [];
        for (let i = 0; i < buffer.length; i += pas) {
            let somme = 0, n = 0;
            for (let canal = 0; canal < buffer.numberOfChannels; canal++) {
                const d = buffer.getChannelData(canal);
                for (let j = i; j < Math.min(i + pas, d.length); j++) { somme += d[j] * d[j]; n++; }
            }
            niveaux.push(Math.sqrt(somme / n));
        }
        const maximum = Math.max(...niveaux);
        if (maximum < 0.00001) throw new Error('Le fichier de mouvement ne contient pas de signal exploitable.');
        // Écarter l'attaque et la longue extinction du souffle d'origine.
        const debut = niveaux.findIndex(n => n >= maximum * 0.35) * pas;
        const dernier = niveaux.findLastIndex(n => n >= maximum * 0.35);
        const fin = Math.min(buffer.length, (dernier + 1) * pas);
        const longueur = fin - debut;
        const fondu = Math.min(Math.floor(buffer.sampleRate * 0.18), Math.floor(longueur / 4));
        const resultat = contexte.createBuffer(buffer.numberOfChannels, longueur - fondu, buffer.sampleRate);
        for (let canal = 0; canal < buffer.numberOfChannels; canal++) {
            const entree = buffer.getChannelData(canal), stable = new Float32Array(longueur);
            for (let i = 0; i < longueur; i++) {
                const position = (debut + i) / pas, a = Math.floor(position), p = position - a;
                const niveau = niveaux[a] * (1 - p) + (niveaux[Math.min(a + 1, niveaux.length - 1)] || niveaux[a]) * p;
                stable[i] = entree[debut + i] * Math.min(1.8, 0.18 / Math.max(niveau, 0.001));
            }
            const cible = resultat.getChannelData(canal);
            cible.set(stable.subarray(0, cible.length));
            for (let i = 0; i < fondu; i++) {
                const p = i / fondu;
                cible[i] = stable[longueur - fondu + i] * Math.cos(p * Math.PI / 2) + stable[i] * Math.sin(p * Math.PI / 2);
            }
        }
        return resultat;
    }

    async function charger(nom) {
        const reponse = await fetch(new URL(`../../sons/${nom}`, import.meta.url));
        if (!reponse.ok) throw new Error(`Audio ${nom} : HTTP ${reponse.status}`);
        return contexte.decodeAudioData(await reponse.arrayBuffer());
    }
    const clicSpherePret = charger('son_clic_sphere.mp3').then(buffer => { clicSphere = buffer; });
    const pret = Promise.allSettled([
        clicSpherePret,
        charger('son-mouvement.wav').then(buffer => { mouvement = construireTexture(buffer); }),
        charger('son-long.wav').then(buffer => { transition = buffer; }),
        charger('son-debut.wav').then(buffer => { debut = buffer; }),
    ]).then(resultats => {
        resultats.forEach(r => { if (r.status === 'rejected') console.warn('[sons immersifs]', r.reason); });
    });

    function arreterVoyage() {
        if (!voyage) return;
        const ancien = voyage;
        voyage = null;
        ancien.gain.gain.cancelScheduledValues(contexte.currentTime);
        ancien.gain.gain.setTargetAtTime(0, contexte.currentTime, 0.025);
        ancien.source.stop(contexte.currentTime + 0.12);
    }

    function jouerVoyage(dureeVoyage, decalage = 0, buffer = transition, attente = 0, introduction = false) {
        if (!actif || document.hidden || !buffer || contexte.state !== 'running') return;
        const duree = Math.min(buffer.duration - decalage, dureeVoyage);
        if (duree <= 0.08) return;
        arreterVoyage();
        const source = contexte.createBufferSource(), gain = contexte.createGain();
        const t = contexte.currentTime + attente;
        source.buffer = buffer;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.65, t + Math.min(0.04, duree / 4));
        gain.gain.setValueAtTime(0.65, t + Math.max(duree / 2, duree - 0.15));
        gain.gain.linearRampToValueAtTime(0, t + duree);
        source.connect(gain).connect(sortie);
        const courant = { source, gain, introduction };
        voyage = courant;
        source.onended = () => {
            source.disconnect(); gain.disconnect();
            if (voyage === courant) voyage = null;
        };
        source.start(t, decalage);
        source.stop(t + duree);
    }

    return {
        pret,
        async cliquerSphere() {
            if (clicSphereDemande || !actif || document.hidden) return;
            clicSphereDemande = true;
            const requete = generation;
            try { await clicSpherePret; } catch { return; }
            if (!actif || document.hidden || requete !== generation || contexte.state !== 'running') return;
            const source = contexte.createBufferSource();
            source.buffer = clicSphere;
            source.connect(sortie);
            sourceClicSphere = source;
            source.onended = () => {
                source.disconnect();
                if (sourceClicSphere === source) sourceClicSphere = null;
            };
            source.start();
        },
        deplacer: (...args) => dynamique.deplacer(...args),
        gesteCamera: intensite => dynamiqueCamera.stimuler(intensite, performance.now()),
        quitter: () => dynamique.quitter(),
        activer(valeur) {
            actif = valeur;
            if (!actif) {
                if (sourceClicSphere) {
                    sourceClicSphere.stop();
                    sourceClicSphere = null;
                }
                generation++;
                introEnAttente = false;
                dynamique.reinitialiser();
                dynamiqueCamera.reinitialiser();
                fond.gain.setTargetAtTime(0, contexte.currentTime, 0.08);
                arreterVoyage();
            }
        },
        actualiser(enVoyage = false) {
            const maintenant = performance.now();
            const energie = Math.max(dynamique.actualiser(maintenant), dynamiqueCamera.actualiser(maintenant));
            const audible = actif && !document.hidden && contexte.state === 'running';
            if (audible && mouvement && !boucles.length) {
                for (let i = 0; i < 2; i++) {
                    const source = contexte.createBufferSource(), mix = contexte.createGain();
                    source.buffer = mouvement;
                    source.loop = true;
                    source.playbackRate.value = i ? 1.015 : 0.975;
                    mix.gain.value = 0.65;
                    source.connect(mix).connect(fond);
                    source.start(contexte.currentTime, i * mouvement.duration / 2);
                    boucles.push(source);
                }
            }
            const volume = audible ? 0.66 * Math.pow(energie, 0.8) * (enVoyage || voyage ? 0.25 : 1) : 0;
            fond.gain.setTargetAtTime(volume, contexte.currentTime, volume > fond.gain.value ? 0.075 : 0.16);
            filtre.frequency.setTargetAtTime(1600 + 2000 * energie, contexte.currentTime, 0.2);
            boucles.forEach((source, i) => source.playbackRate.setTargetAtTime((i ? 1.015 : 0.975) + 0.06 * energie, contexte.currentTime, 0.3));
        },
        voyager(dureeVoyage = 7.2) {
            if (introEnAttente || voyage?.introduction) return;
            generation++;
            jouerVoyage(dureeVoyage);
        },
        async premierVoyage(dureeVoyage = 7.2, delai = 2.5, instant = performance.now()) {
            const requete = ++generation, demande = instant;
            introEnAttente = true;
            await pret;
            if (contexte.state === 'suspended' && actif) await contexte.resume().catch(() => {});
            const retard = (performance.now() - demande) / 1000;
            if (requete === generation && retard < dureeVoyage + delai) jouerVoyage(dureeVoyage, 0, debut, Math.max(0, delai - retard), true);
            introEnAttente = false;
        },
    };
}
