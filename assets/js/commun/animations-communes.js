/**
 * animations-communes.js : briques réutilisables par les mises en scène de projets.
 *
 * Aucune dépendance à GSAP ici : ces fonctions ne font que préparer le DOM
 * (découpage de texte, calques décoratifs) et mesurer. Les timelines vivent dans
 * assets/js/projets/<template>.js ; le cycle de vie (chargement de GSAP, montage/démontage)
 * vit dans assets/js/commun/projet-core.js.
 */

/** Vrai si le visiteur demande de limiter les animations. */
export function mouvementReduit() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Le décor traverse le relais ; les textes sortants ne le recouvrent pas. */
export function creerRaccordement(scene) {
    const scenes = [...scene.closest('.exp').querySelectorAll('.ea-scene')];
    const precedente = scenes[scenes.indexOf(scene) - 1];
    const lisser = (a, b, p) => { const t = Math.max(0, Math.min(1, (p-a)/(b-a))); return t*t*(3-2*t); };
    return {
        actualiser(progression) {
            if (precedente) precedente.style.opacity = 1 - lisser(0, .3, progression);
            const entree = lisser(.85, 1, progression);
            scene.style.setProperty('--ea-entree', entree);
            return entree;
        },
        detruire() {
            precedente?.style.removeProperty('opacity');
            scene.style.removeProperty('--ea-entree');
        },
    };
}

/**
 * Remplace le texte de `el` par une suite de <span class="ea-lettre"> (une par lettre).
 *
 * Accessibilité : les lettres sont masquées aux lecteurs d'écran (aria-hidden) ; l'élément
 * garde un `aria-label` égal au texte d'origine tant que le découpage existe.
 * `restaurer()` remet exactement le HTML et les attributs d'avant.
 *
 * @param {HTMLElement} el
 * @param {string} [libelle] texte lu par les lecteurs d'écran (par défaut : le texte de `el`)
 * @returns {{ lettres: HTMLElement[], restaurer: () => void }}
 */
export function decouperLettres(el, libelle) {
    const htmlOrigine = el.innerHTML;
    const texte = el.textContent.trim();
    const ariaOrigine = el.getAttribute("aria-label");

    el.textContent = "";
    const lettres = [...texte].map((caractere) => {
        const span = document.createElement("span");
        span.className = "ea-lettre";
        span.setAttribute("aria-hidden", "true");
        span.textContent = caractere === " " ? "\u00A0" : caractere;
        el.appendChild(span);
        return span;
    });
    el.setAttribute("aria-label", libelle || texte);

    return {
        lettres,
        restaurer() {
            el.innerHTML = htmlOrigine;
            if (ariaOrigine === null) el.removeAttribute("aria-label");
            else el.setAttribute("aria-label", ariaOrigine);
        },
    };
}

/**
 * Crée une copie purement décorative d'un calque (masquée aux lecteurs d'écran)
 * et l'insère juste après l'original. Sert aux « échos » typographiques.
 *
 * @param {HTMLElement} original
 * @param {string} classe classe CSS de la copie
 * @returns {{ copie: HTMLElement, lettres: HTMLElement[], retirer: () => void }}
 */
export function dupliquerCalque(original, classe) {
    const copie = original.cloneNode(true);
    copie.className = classe;
    copie.setAttribute("aria-hidden", "true");
    original.after(copie);
    return {
        copie,
        lettres: [...copie.querySelectorAll(".ea-lettre")],
        retirer: () => copie.remove(),
    };
}

/** Largeur réelle du texte d'un élément (et non celle de sa boîte, qui peut être pleine largeur). */
export function largeurTexte(el) {
    const plage = document.createRange();
    plage.selectNodeContents(el);
    return plage.getBoundingClientRect().width;
}

/** Crée, dans `parent`, un calque décoratif vide (masqué aux lecteurs d'écran). */
export function ajouterCalque(parent, classe) {
    const calque = document.createElement("div");
    calque.className = classe;
    calque.setAttribute("aria-hidden", "true");
    parent.prepend(calque);
    return calque;
}
