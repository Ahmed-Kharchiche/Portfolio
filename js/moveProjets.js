const projets = document.querySelectorAll('.carte-projet');

window.addEventListener('scroll', () => {
    projets.forEach((projet, index) => {

        const rect = projet.getBoundingClientRect();

        if (rect.top <= 100) {

            let progress = (rect.top + 300) / 400;
            progress = Math.max(0, Math.min(1, progress));

            let translateX;

            if (index % 2 === 0) {
                translateX = -30 * (1 - progress);
            } else {
                translateX = 30 * (1 - progress);
            }

            const translateY = -100 * (1 - progress);

            projet.style.opacity = progress;
            projet.style.transform =
                `translate(${translateX}px, ${translateY}px)`;

        } else {

            projet.style.opacity = 1;
            projet.style.transform = 'translate(0, 0)';
        }
    });
});


const introGauche = document.querySelector('.intro-gauche');
const introDroite = document.querySelector('.intro-droite');

let dernierScroll = window.scrollY;

let positionGauche = 0;
let positionDroite = 0;

window.addEventListener('scroll', () => {

    const scrollActuel = window.scrollY;
    const delta = scrollActuel - dernierScroll;

    positionGauche -= delta * 0.3;
    positionDroite += delta * 0.3;

    // Empêche de dépasser la position d'origine
    positionGauche = Math.min(0, Math.max(-150, positionGauche));
    positionDroite = Math.max(0, Math.min(150, positionDroite));

    introGauche.style.transform = `translateX(${positionGauche}px)`;
    introDroite.style.transform = `translateX(${positionDroite}px)`;

    dernierScroll = scrollActuel;
});