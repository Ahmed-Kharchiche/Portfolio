document.querySelectorAll(".tri-projets select").forEach(select => {
    const options = [...select.options];
    const label = document.querySelector(`label[for="${select.id}"]`);
    let actif = select.selectedIndex;

    // Construction de la liste personnalisée
    const liste = document.createElement("div");
    liste.className = "liste-custom";
    liste.innerHTML = `
        <button type="button" class="liste-bouton" aria-haspopup="listbox" aria-expanded="false">
            <span class="liste-valeur"></span>
            <svg class="liste-fleche" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </button>
        <ul class="liste-menu" role="listbox"></ul>`;

    const bouton = liste.querySelector(".liste-bouton");
    const valeur = liste.querySelector(".liste-valeur");
    const menu = liste.querySelector(".liste-menu");

    const items = options.map((option, i) => {
        const li = document.createElement("li");
        li.className = "liste-option";
        li.setAttribute("role", "option");
        li.textContent = option.textContent;
        li.addEventListener("click", () => {
            choisir(i);
            fermer();
            bouton.focus();
        });
        li.addEventListener("mousemove", () => surligner(i));
        menu.appendChild(li);
        return li;
    });

    select.classList.add("select-cache");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");
    select.after(liste);
    if (label) label.addEventListener("click", () => bouton.focus());

    function estOuvert() {
        return liste.classList.contains("ouvert");
    }

    function surligner(i) {
        actif = i;
        items.forEach((li, j) => li.classList.toggle("actif", j === i));
        items[i].scrollIntoView({ block: "nearest" });
    }

    function afficherSelection() {
        valeur.textContent = options[select.selectedIndex].textContent;
        items.forEach((li, i) => {
            li.classList.toggle("selectionne", i === select.selectedIndex);
            li.setAttribute("aria-selected", i === select.selectedIndex);
        });
    }

    function choisir(i) {
        if (i !== select.selectedIndex) {
            select.selectedIndex = i;
            // Déclenche le tri existant (projetsTri.js)
            select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        afficherSelection();
    }

    function ouvrir() {
        liste.classList.add("ouvert");
        bouton.setAttribute("aria-expanded", "true");
        surligner(select.selectedIndex);
    }

    function fermer() {
        liste.classList.remove("ouvert");
        bouton.setAttribute("aria-expanded", "false");
    }

    bouton.addEventListener("click", () => (estOuvert() ? fermer() : ouvrir()));

    // Clavier : flèches, Entrée, Espace, Échap, Début, Fin
    bouton.addEventListener("keydown", e => {
        const touches = ["ArrowDown", "ArrowUp", "Enter", " ", "Escape", "Home", "End"];
        if (!touches.includes(e.key)) return;
        e.preventDefault();

        if (!estOuvert()) {
            if (e.key !== "Escape") ouvrir();
            return;
        }

        if (e.key === "ArrowDown") surligner((actif + 1) % items.length);
        if (e.key === "ArrowUp") surligner((actif - 1 + items.length) % items.length);
        if (e.key === "Home") surligner(0);
        if (e.key === "End") surligner(items.length - 1);
        if (e.key === "Enter" || e.key === " ") {
            choisir(actif);
            fermer();
        }
        if (e.key === "Escape") fermer();
    });

    // Fermeture au clic extérieur ou quand le bouton perd le focus
    document.addEventListener("click", e => {
        if (!liste.contains(e.target)) fermer();
    });
    bouton.addEventListener("blur", () => setTimeout(() => {
        if (!liste.contains(document.activeElement)) fermer();
    }, 100));

    afficherSelection();
});