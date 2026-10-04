document.addEventListener("click", e => {
    const fleche = e.target.closest(".fleche");
    if (!fleche) return;

    const images = [...fleche.closest(".carrousel").querySelectorAll(".image-projet")];
    const actuelle = images.findIndex(img => img.classList.contains("active"));
    const pas = fleche.classList.contains("fleche-droite") ? 1 : -1;
    const suivante = (actuelle + pas + images.length) % images.length;

    images[actuelle].classList.remove("active");
    images[suivante].classList.add("active");
});