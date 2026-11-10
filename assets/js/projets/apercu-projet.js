export function activerApercuProjet() {
    const bouton = document.querySelector('[data-apercu-projet]');
    const apercu = document.querySelector('#ea-apercu');
    if (!bouton || !apercu) return;

    let defilement = '';
    bouton.addEventListener('click', event => {
        event.preventDefault();
        if (apercu.open) return;
        defilement = document.documentElement.style.overflow;
        apercu.showModal();
        apercu.scrollTop = 0;
        document.documentElement.style.overflow = 'hidden';
    });
    apercu.addEventListener('close', () => {
        document.documentElement.style.overflow = defilement;
        bouton.focus({ preventScroll: true });
    });
    apercu.addEventListener('click', event => {
        if (event.target !== apercu) return;
        const cadre = apercu.getBoundingClientRect();
        if (event.clientX < cadre.left || event.clientX > cadre.right
            || event.clientY < cadre.top || event.clientY > cadre.bottom) apercu.close();
    });
    apercu.querySelectorAll('img').forEach(image => {
        image.addEventListener('error', () => {
            image.hidden = true;
            image.nextElementSibling.textContent = 'Capture indisponible.';
        });
    });
}
