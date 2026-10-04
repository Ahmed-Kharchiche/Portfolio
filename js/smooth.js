// ==============================
//      PARAMÈTRES DU SCROLL
// ==============================
//

// ↑ AUGMENTER = va plus loin à chaque coup de molette
// ↓ DIMINUER = va moins loin
const vitesseScroll = 0.55;

// ↑ AUGMENTER = s'arrête plus rapidement
// ↓ DIMINUER = continue plus longtemps
const fluiditeScroll = 0.035;


// ==============================
//      SCROLL PERSONNALISÉ
// ==============================

// Sur mobile/tablette, on garde le scroll natif
const estMobile =
    window.matchMedia("(max-width: 600px)").matches ||
    window.matchMedia("(pointer: coarse)").matches;

if (!estMobile) {

    let cibleScroll = window.scrollY;
    let positionScroll = window.scrollY;


    // ==============================
    //          MOLETTE
    // ==============================

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


    // ==============================
    //       BARRE DE DÉFILEMENT
    // ==============================

    window.addEventListener('scroll', () => {

        // Permet d'utiliser la barre de défilement normalement
        if (Math.abs(window.scrollY - positionScroll) > 1) {
            cibleScroll = window.scrollY;
            positionScroll = window.scrollY;
        }

    });


    // ==============================
    //          ANIMATION
    // ==============================

    function animationScroll() {

        positionScroll +=
            (cibleScroll - positionScroll) * fluiditeScroll;

        window.scrollTo(0, positionScroll);

        requestAnimationFrame(animationScroll);
    }

    animationScroll();
}