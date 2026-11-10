/** Exemples artistiques, jamais des prédictions du modèle français. */
export const EXEMPLES_LANGAGE = JSON.parse(document.getElementById('ea-words-exemples')?.textContent || '[]');

/** Mini-corpus pédagogique : unigrammes, IDF lissée et normalisation L2.
 * Ces poids ne sont pas ceux du vectoriseur français entraîné. */
export function calculerPoidsMots(exemples) {
    const termes = exemples.map(e => e.phrase.split(' ').map(m => m.toLowerCase().match(/[a-z]{2,}/g)?.join('') || ''));
    const documents = termes.map(mots => new Set(mots.filter(Boolean)));
    const poids = new Float32Array(exemples.length * 16);
    termes.forEach((mots, ligne) => {
        const comptes = new Map();
        mots.filter(Boolean).forEach(m => comptes.set(m, (comptes.get(m) || 0) + 1));
        const valeurs = new Map();
        comptes.forEach((n, mot) => {
            const df = documents.filter(d => d.has(mot)).length;
            valeurs.set(mot, n * (Math.log((1 + documents.length) / (1 + df)) + 1));
        });
        const norme = Math.hypot(...valeurs.values()) || 1;
        mots.slice(0, 16).forEach((mot, index) => { poids[ligne * 16 + index] = (valeurs.get(mot) || 0) / norme; });
    });
    return poids;
}

/** Rasterisation hors écran à l'initialisation ; seules des cibles 3D sont conservées. */
function dessinerTexte(texte, mobile, resultat = false) {
    const canvas = document.createElement('canvas'); canvas.width = 1536; canvas.height = 640;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const taille = resultat ? 140 : mobile ? 64 : 86;
    ctx.font = `600 ${taille}px "Hanken Grotesk", system-ui, sans-serif`;
    ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
    const mots = texte.split(' '), lignes = []; let ligne = [], largeur = 0;
    const limite = resultat ? 1300 : mobile ? 600 : 1260;
    const espace = ctx.measureText(' ').width;
    mots.forEach((mot, index) => {
        const w = ctx.measureText(mot).width;
        if (ligne.length && largeur + espace + w > limite) { lignes.push({ mots: ligne, largeur }); ligne = []; largeur = 0; }
        if (ligne.length) largeur += espace;
        ligne.push({ mot, index, x: largeur, largeur: w }); largeur += w;
    });
    if (ligne.length) lignes.push({ mots: ligne, largeur });
    const hauteurLigne = taille * 1.3;
    const largeurMax = Math.max(...lignes.map(l => l.largeur));
    const points = [];
    // Chaque mot est échantillonné séparément pour garder son identité lors de la décomposition.
    lignes.forEach((l, rang) => l.mots.forEach(mot => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const x0 = (canvas.width - l.largeur) / 2 + mot.x;
        const y0 = canvas.height / 2 + (rang - (lignes.length - 1) / 2) * hauteurLigne + taille * .34;
        ctx.fillText(mot.mot, x0, y0);
        const xMin = Math.max(0, Math.floor(x0 - 4)), xMax = Math.min(canvas.width, Math.ceil(x0 + mot.largeur + 4));
        const yMin = Math.max(0, Math.floor(y0 - taille * 1.2)), yMax = Math.min(canvas.height, Math.ceil(y0 + taille * .3));
        const largeurImage = xMax - xMin;
        const image = ctx.getImageData(xMin, yMin, largeurImage, yMax - yMin).data;
        for (let y = yMin; y < yMax; y += 2) for (let x = xMin; x < xMax; x += 2) {
            if (image[((y - yMin) * largeurImage + x - xMin) * 4 + 3] > 100) points.push([x - canvas.width / 2, canvas.height / 2 - y, mot.index]);
        }
    }));
    return { points, largeur: Math.max(largeurMax, 1), mots: mots.length };
}

export function creerAtlasLangage(gl, nombre) {
    const largeur = Math.min(512, gl.getParameter(gl.MAX_TEXTURE_SIZE));
    const lignes = Math.ceil(nombre / largeur), hauteur = lignes * 24;
    if (hauteur > gl.getParameter(gl.MAX_TEXTURE_SIZE)) throw new Error('Atlas typographique trop grand pour ce terminal');
    const donnees = new Float32Array(largeur * hauteur * 4);
    let seed = 4787;
    const hasard = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
    for (let mobile = 0; mobile < 2; mobile++) {
        EXEMPLES_LANGAGE.forEach((exemple, e) => {
            const phrase = dessinerTexte(exemple.phrase, !!mobile), resultat = dessinerTexte(exemple.emotion, !!mobile, true);
            const echellePhrase = (mobile ? 4.65 : 12.0) / Math.max(phrase.largeur, mobile ? 530 : 900);
            const echelleResultat = (mobile ? 3.2 : 5.5) / Math.max(resultat.largeur, 500);
            for (let i = 0; i < nombre; i++) {
                const p = phrase.points[Math.min(phrase.points.length - 1, Math.floor(i * phrase.points.length / nombre))];
                const bruitX = (hasard() - .5) * .012, profondeur = (hasard() - .5) * .055;
                const slot = (mobile * 12 + e * 2) * largeur * lignes * 4 + i * 4;
                donnees.set([p[0] * echellePhrase + bruitX, p[1] * echellePhrase + 1.0, -103 + profondeur, p[2]], slot);
                const miniPhrase = i % 5 === 0;
                const r = resultat.points[Math.min(resultat.points.length - 1, Math.floor(i * resultat.points.length / nombre))];
                const fin = miniPhrase
                    ? [p[0] * echellePhrase * .8, p[1] * echellePhrase * .8 + (mobile ? 2.15 : 2.35), -104 + profondeur, 1]
                    : [r[0] * echelleResultat + bruitX, r[1] * echelleResultat + .25, -103 + profondeur * 1.4, 0];
                donnees.set(fin, slot + largeur * lignes * 4);
            }
        });
    }
    const texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, largeur, hauteur, 0, gl.RGBA, gl.FLOAT, donnees);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return { texture, largeur, lignes, mots: EXEMPLES_LANGAGE.map(e => e.phrase.split(' ').length) };
}
