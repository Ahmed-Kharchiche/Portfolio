/** Une navigation par geste, commune aux galeries de logos et de résultats. */
export function installerGlissementGalerie(canevas, { actif, changer }) {
    let geste = null, bloquerClicJusqua = 0;
    const terminer = () => {
        const precedent = geste;
        geste = null;
        canevas.classList.remove("glissement-actif");
        if (precedent && canevas.hasPointerCapture(precedent.id)) canevas.releasePointerCapture(precedent.id);
    };
    canevas.addEventListener("pointerdown", e => {
        if (geste || !actif() || !e.isPrimary || e.button !== 0) return;
        bloquerClicJusqua = 0;
        geste = { id: e.pointerId, x: e.clientX, y: e.clientY, debut: performance.now(), axe: null };
        canevas.setPointerCapture(e.pointerId);
    });
    canevas.addEventListener("pointermove", e => {
        if (!geste || geste.id !== e.pointerId) return;
        if (!actif()) { terminer(); return; }
        const dx = e.clientX - geste.x, dy = e.clientY - geste.y;
        if (!geste.axe && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
            geste.axe = Math.abs(dx) > Math.abs(dy) * 1.15 ? "x" : "y";
        }
        if (geste.axe) bloquerClicJusqua = performance.now() + 600;
        if (geste.axe === "x") {
            e.preventDefault();
            canevas.classList.add("glissement-actif");
        }
    });
    canevas.addEventListener("pointerup", e => {
        if (!geste || geste.id !== e.pointerId) return;
        const dx = e.clientX - geste.x;
        const vitesse = Math.abs(dx) / Math.max(1, performance.now() - geste.debut);
        const naviguer = geste.axe === "x" && (Math.abs(dx) >= 44 || (Math.abs(dx) >= 20 && vitesse > 0.45));
        if (geste.axe) bloquerClicJusqua = performance.now() + 600;
        terminer();
        if (naviguer && actif()) changer(dx < 0 ? 1 : -1);
    });
    canevas.addEventListener("pointercancel", terminer);
    canevas.addEventListener("lostpointercapture", terminer);
    // Le clic synthétique qui suit un swipe ne doit sélectionner ni image ni logo.
    canevas.addEventListener("click", e => {
        if (performance.now() < bloquerClicJusqua) { e.preventDefault(); e.stopImmediatePropagation(); }
    }, true);
}
