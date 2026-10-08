// #region PARAMÈTRES DU SCROLL

// ↑ AUGMENTER = va plus loin à chaque coup de molette
// ↓ DIMINUER = va moins loin
const vitesseScroll = 0.55;

// ↑ AUGMENTER = s'arrête plus rapidement
// ↓ DIMINUER = continue plus longtemps
const fluiditeScroll = 0.035;
// #endregion


// #region SCROLL PERSONNALISÉ

// Sur mobile/tablette, on garde le scroll natif
const estMobile =
    window.matchMedia("(max-width: 700px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

if (!estMobile) {

    let cibleScroll = window.scrollY;
    let positionScroll = window.scrollY;


    // #region MOLETTE

    window.addEventListener('wheel', (e) => {

        e.preventDefault();

        cibleScroll += e.deltaY * vitesseScroll;

        const maxScroll =
            document.documentElement.scrollHeight - window.innerHeight;

        cibleScroll = Math.max(
            0,
            Math.min(cibleScroll, maxScroll)
        );

    }, { passive: false });
    // #endregion


    // #region BARRE DE DÉFILEMENT

    window.addEventListener('scroll', () => {

        // Permet d'utiliser la barre de défilement normalement
        if (Math.abs(window.scrollY - positionScroll) > 1) {
            cibleScroll = window.scrollY;
            positionScroll = window.scrollY;
        }

    });
    // #endregion


    // #region ANIMATION

    function animationScroll() {

        positionScroll +=
            (cibleScroll - positionScroll) * fluiditeScroll;

        window.scrollTo(0, positionScroll);

        requestAnimationFrame(animationScroll);
    }
    // #endregion

    // #region LIENS D'ANCRE

    document.querySelectorAll('a[href^="#"]').forEach(lien => {
        lien.addEventListener('click', (e) => {
            const id = lien.getAttribute('href');
            const cible = document.querySelector(id);

            if (!cible) return;

            e.preventDefault();

            if (estMobile) {
                cible.scrollIntoView({
                    behavior: "smooth"
                });
                return;
            }

            cibleScroll = cible.offsetTop;
        });
    });
    // #endregion

    animationScroll();
}

// #endregion

