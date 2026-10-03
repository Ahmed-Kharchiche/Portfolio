const title = document.querySelector('.projects-title');
const carousel = document.querySelector('#carousel');
const technos = document.querySelector('.technos');
const boutons = document.querySelector('.hero-boutons');


window.addEventListener('scroll', () => {
    const rect = title.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    // Progression de 0 à 1 selon la position du titre dans l'écran
    let progress = 1 - (rect.top / windowHeight);

    // Limite entre 0 et 1
    progress = Math.max(0, Math.min(1, progress));

    // Mouvement de 50px vers 0
    const translateY = -100 * (1 - progress);

    title.style.opacity = progress;
    title.style.transform = `translateY(${translateY}px)`;
});

window.addEventListener('scroll', () => {
    const rect = carousel.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    let progress = 1 - (rect.top / windowHeight);
    progress = Math.max(0, Math.min(1, progress));

    const translateY = 200 * (1 - progress);

    carousel.style.marginTop = `${translateY}px`;
});


window.addEventListener('scroll', () => {
    const rect = technos.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    let progress = 1 - (rect.top / windowHeight);
    progress = Math.max(0, Math.min(1, progress));

    // Départ à droite (+200px) → position normale (0px)
    const translateX = 100 * (1 - progress);

    technos.style.opacity = progress;
    technos.style.transform = `translateX(${translateX}px)`;
});


window.addEventListener('scroll', () => {
    const rect = boutons.getBoundingClientRect();
    const windowHeight = window.innerHeight;

    let progress = rect.top / windowHeight;
    progress = Math.max(0, Math.min(1, progress));

    const translateX = 10 * (1 - progress);
    const translateY = -100 * (1 - progress);

    boutons.style.opacity = progress;
    boutons.style.transform = `translate(${translateX}px, ${translateY}px)`;
});