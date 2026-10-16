const template = window.projetData.template;

document.getElementById("changer-template")?.addEventListener("click", () => {
    const id = new URL(window.location.href).searchParams.get("id");
    console.log(`Identifiant du projet ou template manquant : ${template}`);
    if (!id || !template) {
        console.error("Identifiant du projet ou template manquant.");
        return;
    }
    if (template==="standard"){
        window.location.href = `${template}.php?id=${encodeURIComponent(id)}`;
    }
    else {
        window.location.href = `${template}.php?id=${encodeURIComponent(id)}`;
    }
});