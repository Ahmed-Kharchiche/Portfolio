(() => {
    const zone = document.getElementById("zone-jeu-contenu");
    if (!zone) return;

    // ---------- Réglages ----------
    const BASE_W = 900, BASE_H = 300;
    const GRAVITE = 2600, SAUT = 860;
    const V_MIN = 380, V_MAX = 920;
    const SOL = 56;
    const X_JOUEUR = 70;
    const POLICE = "ui-monospace, Menlo, Consolas, monospace";
    const BUG = "#e5484d", BUG_FONCE = "#8f2429";
    const GLYPHES = ["0", "1", "</>", "{ }", ";", "=>", "01", "[ ]", "#"];

    // ---------- Stockage ----------
    const lire = (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } };
    const ecrire = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

    // ---------- Interface ----------
    zone.replaceChildren();
    zone.classList.add("avec-jeu");

    const jeu = document.createElement("div");
    jeu.className = "dino";
    jeu.tabIndex = 0;
    jeu.setAttribute("aria-label", "Dino des bugs : Espace pour sauter, flèche bas pour se baisser");
    jeu.innerHTML = `
        <canvas></canvas>
        <div class="dino-barre">
            <button type="button" data-act="son" aria-label="Son"></button>
            <button type="button" data-act="pause" aria-label="Pause"></button>
            <button type="button" data-act="plein" aria-label="Agrandir">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
            </button>
        </div>
        <div class="dino-tactile">
            <button type="button" data-act="baisser">▼ Se baisser</button>
            <button type="button" data-act="sauter">▲ Sauter</button>
        </div>`;
    zone.appendChild(jeu);

    const canvas = jeu.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    const btnSon = jeu.querySelector('[data-act="son"]');
    const btnPause = jeu.querySelector('[data-act="pause"]');

    // ---------- État ----------
    let etat = "pret"; // pret | jeu | pause | fin
    let W = BASE_W, H = BASE_H, s = 1, dpr = 1, sol = BASE_H - SOL;
    let vitesse = V_MIN, distance = 0, score = 0, palier = 0, flash = 0;
    let z = 0, vz = 0, auSol = true, baisse = false;
    let obstacles = [], particules = [], prochain = 450;
    let record = Number(lire("dinoBugsRecord", 0)) || 0;
    let nouveauRecord = false, tFin = 0, tAnim = 0;
    let son = lire("dinoBugsSon", "1") === "1";
    let audio = null, visible = true, ignorerBlur = false;
    let couleurs = { fond: "#fff", texte: "#222", sec: "#888", accent: "#4f8cff" };
    let glyphes = Array.from({ length: 12 }, (_, i) => ({
        t: GLYPHES[i % GLYPHES.length],
        x: Math.random() * BASE_W * 1.2,
        fy: Math.random(),
        f: 0.05 + Math.random() * 0.2
    }));

    // ---------- Son ----------
    function initAudio() {
        if (!audio) {
            try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch {}
        }
        if (audio && audio.state === "suspended") audio.resume();
    }

    function bip(f1, f2, duree, type = "square", vol = 0.05) {
        if (!son || !audio) return;
        const t = audio.currentTime;
        const o = audio.createOscillator();
        const g = audio.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f1, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), t + duree);
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
        o.connect(g).connect(audio.destination);
        o.start(t);
        o.stop(t + duree);
    }

    // ---------- Utilitaires ----------
    const pad = n => String(n).padStart(5, "0");
    const dims = () => (baisse && auSol ? { l: 46, h: 26 } : { l: 40, h: 44 });

    function rr(x, y, w, h, r) {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
        else ctx.rect(x, y, w, h);
    }

    function lireCouleurs() {
        const st = getComputedStyle(jeu);
        const v = (n, d) => st.getPropertyValue(n).trim() || d;
        couleurs = {
            fond: v("--carte", "#fff"),
            texte: v("--texte", "#222"),
            sec: v("--texte-secondaire", "#888"),
            accent: v("--accent", "#4f8cff")
        };
    }

    function majBoutons() {
        btnSon.textContent = son ? "🔊" : "🔇";
        btnPause.textContent = etat === "pause" ? "▶" : "⏸";
        btnPause.setAttribute("aria-label", etat === "pause" ? "Reprendre" : "Pause");
    }

    // ---------- Taille (adapté à tout écran, plein écran compris) ----------
    function redimensionner() {
        const cw = jeu.clientWidth, ch = jeu.clientHeight;
        if (!cw || !ch) return;
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
        s = Math.min(cw / BASE_W, ch / BASE_H);
        W = cw / s;
        H = ch / s;
        sol = H - SOL;
    }

    // ---------- Partie ----------
    function reinitialiser() {
        vitesse = V_MIN; distance = 0; score = 0; palier = 0; flash = 0;
        z = 0; vz = 0; auSol = true;
        obstacles = []; particules = []; prochain = 450;
    }

    function demarrer() {
        reinitialiser();
        etat = "jeu";
        majBoutons();
    }

    function sauter() {
        initAudio();
        if (etat === "pause") { basculerPause(); return; }
        if (etat === "pret" || (etat === "fin" && performance.now() - tFin > 350)) demarrer();
        if (etat !== "jeu" || !auSol) return;
        vz = SAUT;
        auSol = false;
        bip(320, 640, 0.12);
    }

    function relacherSaut() {
        if (vz > 0) vz *= 0.45; // saut court si on relâche tôt
    }

    function basculerPause() {
        if (etat === "jeu") etat = "pause";
        else if (etat === "pause") etat = "jeu";
        majBoutons();
    }

    function basculerSon() {
        son = !son;
        ecrire("dinoBugsSon", son ? "1" : "0");
        initAudio();
        majBoutons();
    }

    function basculerPlein() {
        ignorerBlur = true;
        setTimeout(() => (ignorerBlur = false), 600);
        if (jeu.classList.contains("agrandi")) {
            jeu.classList.remove("agrandi");
            zone.style.height = "";
        } else {
            // Garde la hauteur de la zone pour que la page ne saute pas
            zone.style.height = zone.offsetHeight + "px";
            jeu.classList.add("agrandi");
        }
        jeu.focus();
    }


    function creerObstacle() {
        let o;
        if (score > 200 && Math.random() < 0.28) {
            o = { type: "vol", l: 40, h: 32, haut: 30 };
        } else {
            const t = Math.random();
            if (t < 0.4) o = { type: "sol", n: 1, k: 1 };
            else if (t < 0.7) o = { type: "sol", n: 1, k: 1.5 };
            else if (t < 0.9 || score < 500) o = { type: "sol", n: 2, k: 1 };
            else o = { type: "sol", n: 3, k: 1 };
            o.l = o.n * 28 * o.k + (o.n - 1) * 4;
            o.h = 28 * o.k;
            o.haut = 0;
        }
        o.x = W + 30;
        obstacles.push(o);
    }

    function mourir() {
        etat = "fin";
        tFin = performance.now();
        bip(240, 50, 0.4, "sawtooth", 0.08);
        nouveauRecord = score > record;
        if (nouveauRecord) {
            record = score;
            ecrire("dinoBugsRecord", record);
        }
        const { l, h } = dims();
        const cx = X_JOUEUR + l / 2, cy = sol - z - h / 2;
        for (let i = 0; i < 18; i++) {
            particules.push({
                x: cx, y: cy,
                vx: (Math.random() - 0.5) * 500,
                vy: -Math.random() * 500,
                t: 1,
                c: i % 2 ? "a" : "b"
            });
        }
        majBoutons();
    }

    // ---------- Mise à jour ----------
    function maj(dt) {
        if (etat !== "pause") tAnim += dt;

        // Fond (défile même à l'écran d'accueil)
        const v = etat === "jeu" ? vitesse : etat === "pret" ? 40 : 0;
        for (const g of glyphes) {
            g.x -= v * g.f * dt;
            if (g.x < -60) { g.x = W + Math.random() * 100; g.fy = Math.random(); }
        }

        // Particules
        if (etat !== "pause") {
            for (const p of particules) {
                p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 1400 * dt; p.t -= dt * 1.2;
            }
            particules = particules.filter(p => p.t > 0);
        }

        if (etat !== "jeu") return;

        distance += vitesse * dt;
        score = Math.floor(distance / 14);
        vitesse = Math.min(V_MAX, V_MIN + score * 0.3);

        const p = Math.floor(score / 500);
        if (p > palier) {
            palier = p;
            flash = 1;
            bip(760, 1000, 0.1);
            setTimeout(() => bip(1000, 1400, 0.12), 110);
        }
        flash = Math.max(0, flash - dt);

        // Joueur
        if (!auSol) {
            vz -= GRAVITE * (baisse ? 1.8 : 1) * dt;
            z += vz * dt;
            if (z <= 0) { z = 0; vz = 0; auSol = true; }
        }

        // Obstacles
        for (const o of obstacles) o.x -= vitesse * dt;
        obstacles = obstacles.filter(o => o.x + o.l > -30);
        if (distance >= prochain) {
            creerObstacle();
            prochain = distance + vitesse * (0.75 + Math.random() * 0.85);
        }

        // Collisions (hitbox un peu réduite pour rester indulgent)
        const { l, h } = dims();
        const jx = X_JOUEUR + 5, jy = sol - z - h + 5, jl = l - 10, jh = h - 10;
        for (const o of obstacles) {
            const ox = o.x + 5, oy = sol - o.haut - o.h + 5, ol = o.l - 10, oh = o.h - 10;
            if (jx < ox + ol && jx + jl > ox && jy < oy + oh && jy + jh > oy) {
                mourir();
                break;
            }
        }
    }

    // ---------- Dessin ----------
    function dessinerBugSol(x, y, k, t) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(k, k);
        const p = Math.sin(t * 22);
        ctx.strokeStyle = BUG_FONCE;
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        for (let i = 0; i < 3; i++) {
            const a = (i % 2 ? p : -p) * 2.5;
            ctx.beginPath();
            ctx.moveTo(9 + i * 6, 20);
            ctx.lineTo(7 + i * 6 + a, 28);
            ctx.stroke();
        }
        ctx.fillStyle = BUG;
        ctx.beginPath(); ctx.ellipse(16, 18, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = BUG_FONCE;
        ctx.beginPath(); ctx.arc(5, 15, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(17, 15, 2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(22, 19, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(3.5, 13.5, 1.6, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(4, 11); ctx.lineTo(0, 4);
        ctx.moveTo(7, 10.5); ctx.lineTo(9, 3);
        ctx.stroke();
        ctx.restore();
    }

    function dessinerVol(x, y, t) {
        ctx.save();
        ctx.translate(x, y);
        const b = Math.abs(Math.sin(t * 30));
        ctx.fillStyle = "rgba(255,255,255,.8)";
        ctx.strokeStyle = BUG_FONCE;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.ellipse(22, 11, 9, 3 + b * 8, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = BUG;
        ctx.beginPath(); ctx.ellipse(22, 21, 13, 8, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = BUG_FONCE;
        ctx.beginPath(); ctx.arc(8, 21, 6, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(6, 19.5, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = BUG_FONCE;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(6, 16); ctx.lineTo(1, 9);
        ctx.moveTo(10, 15.5); ctx.lineTo(11, 8);
        ctx.moveTo(35, 21); ctx.lineTo(40, 23);
        ctx.stroke();
        ctx.restore();
    }

    function dessinerJoueur(c) {
        const { l, h } = dims();
        const x = X_JOUEUR, y = sol - z - h;
        const k = Math.max(0.3, 1 - z / 160);
        ctx.fillStyle = "rgba(0,0,0,.18)";
        ctx.beginPath(); ctx.ellipse(x + l / 2, sol + 3, (l / 2) * k, 3 * k, 0, 0, Math.PI * 2); ctx.fill();

        const pas = etat === "jeu" && auSol ? Math.sin(tAnim * 20) : 0;
        ctx.fillStyle = c.texte;
        ctx.fillRect(x + 8, y + h - 10, 8, pas > 0 ? 7 : 10);
        ctx.fillRect(x + l - 16, y + h - 10, 8, pas < 0 ? 7 : 10);

        ctx.fillStyle = c.accent;
        rr(x, y, l, h - 8, 8);
        ctx.fill();

        const ex = x + l - 13, ey = y + (h > 30 ? 13 : 9);
        if (etat === "fin") {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(ex - 4, ey - 4); ctx.lineTo(ex + 4, ey + 4);
            ctx.moveTo(ex + 4, ey - 4); ctx.lineTo(ex - 4, ey + 4);
            ctx.stroke();
        } else {
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.arc(ex, ey, 6, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#111";
            ctx.beginPath(); ctx.arc(ex + 1.5, ey, 2.5, 0, Math.PI * 2); ctx.fill();
        }

        if (h > 30) {
            ctx.fillStyle = "rgba(255,255,255,.9)";
            ctx.font = `bold 12px ${POLICE}`;
            ctx.textAlign = "left";
            ctx.fillText("</>", x + 5, y + h - 14);
        }
    }

    function texteCentre(txt, y, taille, couleur, gras = false) {
        ctx.font = `${gras ? "bold " : ""}${taille}px ${POLICE}`;
        ctx.fillStyle = couleur;
        ctx.textAlign = "center";
        ctx.fillText(txt, W / 2, y);
    }

    let images = 0;
    function dessiner() {
        if (!visible) return;
        if (images++ % 30 === 0) lireCouleurs();
        const c = couleurs;
        ctx.setTransform(dpr * s, 0, 0, dpr * s, 0, 0);

        // Fond
        ctx.fillStyle = c.fond;
        ctx.fillRect(0, 0, W, H);

        // Symboles de code en arrière-plan
        ctx.fillStyle = c.sec;
        ctx.textAlign = "left";
        for (const g of glyphes) {
            ctx.globalAlpha = 0.1 + g.f * 0.5;
            ctx.font = `${12 + g.f * 40}px ${POLICE}`;
            ctx.fillText(g.t, g.x, 30 + g.fy * (sol - 110));
        }
        ctx.globalAlpha = 1;

        // Sol
        ctx.strokeStyle = c.texte;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, sol + 1); ctx.lineTo(W, sol + 1); ctx.stroke();
        ctx.fillStyle = c.sec;
        const base = Math.floor(distance / 46);
        for (let k = 0; k * 46 < W + 46; k++) {
            const idx = base + k;
            ctx.fillRect(k * 46 - (distance % 46), sol + 10 + ((idx * 5) % 3) * 8, 6 + ((idx * 7) % 4) * 5, 2);
        }

        // Obstacles
        for (const o of obstacles) {
            if (o.type === "vol") {
                dessinerVol(o.x, sol - o.haut - o.h, tAnim);
            } else {
                for (let i = 0; i < o.n; i++) {
                    dessinerBugSol(o.x + i * 32 * o.k, sol - o.h, o.k, tAnim + i);
                }
            }
        }

        dessinerJoueur(c);

        // Particules
        for (const p of particules) {
            ctx.globalAlpha = Math.max(0, p.t);
            ctx.fillStyle = p.c === "a" ? c.accent : BUG;
            ctx.fillRect(p.x, p.y, 5, 5);
        }
        ctx.globalAlpha = 1;

        // Score
        ctx.font = `bold 16px ${POLICE}`;
        ctx.textAlign = "left";
        const hi = `HI ${pad(record)}`;
        ctx.fillStyle = c.sec;
        ctx.fillText(hi, 16, 28);
        if (!(flash > 0 && Math.floor(flash * 8) % 2 === 0)) {
            ctx.fillStyle = c.texte;
            ctx.fillText(pad(score), 16 + ctx.measureText(hi + "  ").width, 28);
        }

        // Écrans de message
        if (etat !== "jeu") {
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = c.fond;
            ctx.fillRect(0, 0, W, H);
            ctx.globalAlpha = 1;
            const my = sol / 2;
            if (etat === "pret") {
                texteCentre("DINO DES BUGS", my - 12, 34, c.texte, true);
                texteCentre("Espace, ↑ ou toucher : sauter   ·   ↓ : se baisser", my + 22, 15, c.sec);
                texteCentre("F : agrandir   ·   P : pause   ·   M : son", my + 46, 13, c.sec);
            } else if (etat === "pause") {
                texteCentre("PAUSE", my - 4, 34, c.texte, true);
                texteCentre("P ou Espace pour reprendre", my + 26, 15, c.sec);
            } else {
                texteCentre("GAME OVER", my - 12, 34, BUG, true);
                texteCentre(`Score ${score}${nouveauRecord ? "  ·  Nouveau record !" : ""}`, my + 22, 16, c.texte, true);
                texteCentre("Espace ou toucher pour rejouer", my + 46, 14, c.sec);
            }
        }
    }

    // ---------- Boucle ----------
    let dernier = performance.now();
    function boucle(t) {
        const dt = Math.min((t - dernier) / 1000, 0.033);
        dernier = t;
        if (visible) maj(dt);
        dessiner();
        requestAnimationFrame(boucle);
    }

    // ---------- Contrôles ----------
    const TOUCHES_SAUT = ["Space", "ArrowUp", "KeyW"];
    const TOUCHES_BAS = ["ArrowDown", "KeyS"];

    jeu.addEventListener("keydown", e => {
        if (TOUCHES_SAUT.includes(e.code)) {
            e.preventDefault();
            if (!e.repeat) sauter();
        } else if (TOUCHES_BAS.includes(e.code)) {
            e.preventDefault();
            baisse = true;
        } else if (e.code === "KeyP") basculerPause();
        else if (e.code === "KeyF") basculerPlein();
        else if (e.code === "KeyM") basculerSon();
        else if (e.code === "Escape" && jeu.classList.contains("agrandi")) basculerPlein();
    });

    jeu.addEventListener("keyup", e => {
        if (TOUCHES_SAUT.includes(e.code)) relacherSaut();
        if (TOUCHES_BAS.includes(e.code)) baisse = false;
    });

    canvas.addEventListener("pointerdown", e => {
        e.preventDefault();
        jeu.focus();
        sauter();
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev =>
        canvas.addEventListener(ev, relacherSaut)
    );

    // Boutons tactiles
    const btnSauter = jeu.querySelector('[data-act="sauter"]');
    const btnBaisser = jeu.querySelector('[data-act="baisser"]');
    btnSauter.addEventListener("pointerdown", e => { e.preventDefault(); sauter(); });
    btnBaisser.addEventListener("pointerdown", e => { e.preventDefault(); baisse = true; });
    ["pointerup", "pointerleave", "pointercancel"].forEach(ev => {
        btnSauter.addEventListener(ev, relacherSaut);
        btnBaisser.addEventListener(ev, () => (baisse = false));
    });

    // Boutons de la barre
    jeu.querySelector(".dino-barre").addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b) return;
        if (b.dataset.act === "son") basculerSon();
        if (b.dataset.act === "pause" && (etat === "jeu" || etat === "pause")) basculerPause();
        if (b.dataset.act === "plein") basculerPlein();
        jeu.focus();
    });

    // Pause automatique : onglet caché, jeu hors écran, focus perdu
    document.addEventListener("visibilitychange", () => {
        if (document.hidden && etat === "jeu") basculerPause();
    });
    new IntersectionObserver(([entree]) => {
        visible = entree.isIntersecting;
        if (!visible && etat === "jeu") basculerPause();
    }, { threshold: 0.2 }).observe(jeu);
    jeu.addEventListener("focusout", e => {
        if (!ignorerBlur && !jeu.contains(e.relatedTarget) && etat === "jeu") basculerPause();
    });

    new ResizeObserver(redimensionner).observe(jeu);
    document.addEventListener("pointerdown", e => {
        if (jeu.classList.contains("agrandi") && !jeu.contains(e.target)) basculerPlein();
    });

    // ---------- Lancement ----------
    redimensionner();
    lireCouleurs();
    majBoutons();
    requestAnimationFrame(boucle);
})();