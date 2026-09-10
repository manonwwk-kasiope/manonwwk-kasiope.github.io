/* G11 — sondes de lisibilité posées DANS LA PAGE (test 3).
   Tout ce qui compare une position d'API à un pixel le fait dans la MÊME image :
   les sondes tournent dans un requestAnimationFrame posté après celui du jeu,
   lisent l'état, puis lisent le tampon.
   Repère : le TAMPON du canevas (ce que getImageData rend). La matrice CSS de
   la bascule n'y est pas — elle est appliquée à l'affichage — et c'est pourquoi
   les tailles sont converties en px d'ÉCRAN par le facteur CSS relu sur
   getComputedStyle(canvas).transform, comme la spec l'exige. */
export const SONDE_SRC = function () {
  const S = window.__S, M = window.__M, K = window.__K;
  const cv = document.getElementById('game'), g = cv.getContext('2d');
  const G = window.__G11 = { cr: [], tete: [], taille: [], traits: [], blanc: [], frames: 0, ignorees: {} };

  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const lum = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
  const wcag = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const lum709 = (r, gg, b) => 0.2126 * r + 0.7152 * gg + 0.0722 * b;

  /* Le repère est celui que l'image A RÉELLEMENT EMPLOYÉ (S.rx, publié par
     drawWorld) : caméra, échelles, roulis ET secousse. Reconstruire la
     projection à partir de S.cam et S.view seuls ignore la secousse et fait
     relever le fond là où le jeu a dessiné l'entité. */
  function geo() {
    const X = S.rx;
    const cssW = parseFloat(cv.style.width) || cv.clientWidth, cssH = parseFloat(cv.style.height) || cv.clientHeight;
    if (!X) { const dpr0 = cv.width / cssW; return { cssW, cssH, dpr: dpr0, sx: cssW / Math.abs(S.view.w), sy: cssH / Math.abs(S.view.h), c: 1, sn: 0, rt: 0, ox: 0, oy: 0, cx: S.cam.x, cy: S.cam.y, bw: cssW, bh: cssH }; }
    return { cssW, cssH, dpr: X.dpr, sx: X.sx, sy: X.sy, c: Math.cos(X.rt), sn: Math.sin(X.rt), rt: X.rt,
             ox: X.ox, oy: X.oy, cx: X.cx, cy: X.cy, bw: X.bw, bh: X.bh };
  }
  function w2b(G0, wx, wy) {
    const px = (wx - G0.cx + G0.ox) * G0.sx, py = (wy - G0.cy + G0.oy) * G0.sy;
    return [G0.dpr * (G0.bw / 2 + px * G0.c - py * G0.sn), G0.dpr * (G0.bh / 2 + px * G0.sn + py * G0.c)];
  }
  /* Facteur d'agrandissement CSS au centre de l'écran : la bascule est posée en
     transform CSS (perspective + rotateX), le tampon n'en sait rien. On le relit
     sur la matrice calculée, en mesurant l'image d'un segment de 100 px. */
  function facteurCss() {
    const t = getComputedStyle(cv).transform;
    if (!t || t === 'none') return 1;
    try {
      const m = new DOMMatrix(t);
      const a = m.transformPoint({ x: -50, y: 0, z: 0, w: 1 }), b = m.transformPoint({ x: 50, y: 0, z: 0, w: 1 });
      return Math.hypot(b.x / b.w - a.x / a.w, b.y / b.w - a.y / a.w) / 100;
    } catch (e) { return 1; }
  }

  /* --- sonde de contraste DÉCOUPLÉE DU HALO : anneau à 3,6 r + 6 px.
     La sonde d'origine échantillonnait à 1,6 r + 6 px, c'est-à-dire DANS le halo
     de l'ennemi (2,4 à 3,4 r) : elle mesurait l'ennemi contre son propre halo, et
     la seule réduction du halo aurait fait monter le rapport sans que l'ennemi
     soit plus lisible. À 3,6 r + 6 px l'anneau est au-delà de tout halo, présent
     comme futur, et la référence est relevée avec la MÊME sonde. */
  function sonde(G0, bx, by, rBuf) {
    const R = 3.6 * rBuf + 6 * G0.dpr;
    const x0 = Math.max(0, Math.floor(bx - R - 2)), y0 = Math.max(0, Math.floor(by - R - 2));
    const x1 = Math.min(cv.width, Math.ceil(bx + R + 2)), y1 = Math.min(cv.height, Math.ceil(by + R + 2));
    if (x1 - x0 < 6 || y1 - y0 < 6) return null;
    const d = g.getImageData(x0, y0, x1 - x0, y1 - y0), W = x1 - x0, px = d.data;
    const at = (x, y) => { const i = ((y - y0) * W + (x - x0)) * 4; return [px[i], px[i + 1], px[i + 2]]; };
    /* Coeur : MÉDIANE des luminances d'un disque de 0,45 r, et non leur moyenne.
       Une silhouette a des détails internes sombres — les yeux et l'encoche
       concave de la tête, le liseré, la bouche du canon —, et une moyenne les
       laisse tirer vers le bas une couleur de coeur que l'oeil, lui, lit comme
       pleine. La médiane donne la couleur DOMINANTE du coeur. Le même choix
       s'applique au relevé de référence : la comparaison reste juste. */
    const cl = [];
    const rc = Math.max(1, rBuf * 0.45);
    for (let y = Math.round(by - rc); y <= Math.round(by + rc); y++) for (let x = Math.round(bx - rc); x <= Math.round(bx + rc); x++) {
      if (x < x0 || y < y0 || x >= x1 || y >= y1) continue;
      const dx = x - bx, dy = y - by; if (dx * dx + dy * dy > rc * rc) continue;
      const p = at(x, y); cl.push(lum(p[0], p[1], p[2]));
    }
    if (cl.length < 4) return null;
    cl.sort((u, v) => u - v);
    const coeur = cl[cl.length >> 1];
    // anneau : médiane de 24 relevés
    const vals = [];
    for (let k = 0; k < 24; k++) {
      const a = k * Math.PI / 12, x = Math.round(bx + Math.cos(a) * R), y = Math.round(by + Math.sin(a) * R);
      if (x < x0 || y < y0 || x >= x1 || y >= y1) continue;
      const p = at(x, y); vals.push(lum(p[0], p[1], p[2]));
    }
    if (vals.length < 12) return null;
    vals.sort((a, b) => a - b);
    const fond = vals[vals.length >> 1];
    return { cr: +wcag(coeur, fond).toFixed(2), coeur: +coeur.toFixed(4), fond: +fond.toFixed(4), pire: +wcag(coeur, vals[0]).toFixed(2), R: +R.toFixed(1) };
  }

  /* ANCRAGE SUR L'IMAGE. Les relevés se font dans un requestAnimationFrame posté
     après celui du jeu : un appel libre, lancé entre deux images, a été mesuré
     comme lisant parfois un tampon qui n'était pas celui de l'état lu (la tête
     manquait à sa propre position une image sur sept). L'ancrage n'est pas un
     détail de forme, c'est la règle « relever les deux dans la même image ». */
  function surImage(fn) { return new Promise(function (res) { requestAnimationFrame(function () { res(fn()); }); }); }

  window.__g11Contraste = function () { return surImage(function () {
    const G0 = geo(), fcss = facteurCss();
    if (S.phase !== 'play' || !S.snake) return 0;
    let n = 0;
    for (const e of S.enemies) {
      if (e.dead || e.qrt) continue;
      const p = w2b(G0, e.x, e.y);
      if (p[0] < 40 || p[1] < 40 || p[0] > cv.width - 40 || p[1] > cv.height - 40) continue;
      const rBuf = e.r * G0.sy * G0.dpr;
      const s = sonde(G0, p[0], p[1], rBuf);
      if (!s) continue;
      // DIAGNOSTIC (ajout, aucun seuil touché) : les deux luminances qui font le
      // rapport, pour savoir si un relevé bas vient d'un coeur sombre ou d'un
      // anneau clair — les deux appellent des remèdes opposés.
      G.cr.push({ type: e.type, cr: s.cr, pire: s.pire, coeur: s.coeur, fond: s.fond });
      /* La grandeur jugée est le rayon de la SILHOUETTE telle qu'elle est
         dessinée, pas e.r : le facteur de petit écran est posé sur la matrice
         par _enDraw et ne touche ni les portées ni les collisions, donc e.r
         seul ne le voit pas. Il est lu dans le jeu (enemies.silK). */
      if (e.type === 'chaser') {
        const kk = (M.enemies && M.enemies.silK) ? M.enemies.silK() : 1;
        G.taille.push({ rWorld: e.r, silK: kk, rBuf: +(rBuf * kk).toFixed(2), rCss: +(rBuf * kk / G0.dpr).toFixed(2), fcss: +fcss.toFixed(4), rEcran: +(rBuf * kk / G0.dpr * fcss).toFixed(2), zoom: +M.phases.zoom().toFixed(4), persp: +M.phases.persp().toFixed(4), dpr: G0.dpr });
      }
      n++;
    }
    const ph = w2b(G0, S.snake.x, S.snake.y);
    const st = sonde(G0, ph[0], ph[1], K.HEAD_R * G0.sy * G0.dpr);
    if (st) G.tete.push({ cr: st.cr, pire: st.pire, coeur: st.coeur, fond: st.fond });
    return n;
  }); };

  /* --- tache blanche : composantes connexes de pixels R,G,B > 235 --------- */
  window.__g11Blanc = function () { return surImage(function () {
    if (S.phase !== 'play' || !S.snake) return null;
    const G0 = geo();
    const HR = K.HEAD_R * G0.sy * G0.dpr, SR = S.headR * G0.sy * G0.dpr;
    const tete = w2b(G0, S.snake.x, S.snake.y);
    const segs = S.snake.segs.map(s => w2b(G0, s.x, s.y));
    /* ATTRIBUTION AVANT LE SEUIL (réserve). Une composante blanche qui tombe sur
       un objet du jeu — ennemi, tir ennemi (son contour est blanc par
       construction depuis G11), tir joueur, butin — appartient à cet objet : ce
       n'est pas une tache du CORPS du serpent, et le critère (b) parle des
       taches du corps qu'on pourrait prendre pour la tête. Les composantes
       attribuées sont comptées et rapportées, elles ne sont pas escamotées. */
    const enn = S.enemies.filter(e => !e.dead && !e.qrt).map(e => { const p = w2b(G0, e.x, e.y); return { p, r: e.r * G0.sy * G0.dpr, hitT: e.hitT || 0, type: e.type }; });
    const obj = enn.slice();
    for (const b0 of S.ebullets) obj.push({ p: w2b(G0, b0.x, b0.y), r: (b0.r || 6) * G0.sy * G0.dpr, type: 'ebullet' });
    for (const b0 of S.bullets) obj.push({ p: w2b(G0, b0.x, b0.y), r: (b0.r || 4) * G0.sy * G0.dpr, type: 'bullet' });
    for (const b0 of S.pickups) obj.push({ p: w2b(G0, b0.x, b0.y), r: (b0.r || 8) * G0.sy * G0.dpr, type: 'pickup' });
    // (c) images écartées : ennemi clignotant blanc à l'impact dans 3 K.HEAD_R,
    //     ou tir joueur de moins de 40 ms (drawMounts pose des tirs sur le corps)
    for (const e of enn) if (e.hitT > 0 && Math.hypot(e.p[0] - tete[0], e.p[1] - tete[1]) < 3 * HR) { G.ignorees.hit = (G.ignorees.hit || 0) + 1; return null; }
    for (const b of S.bullets) if (b.age !== undefined ? b.age < 40 : (b.t !== undefined && b.t < 40)) { G.ignorees.tir = (G.ignorees.tir || 0) + 1; return null; }
    // région d'analyse : boîte des segments + marge (les deux critères ne parlent
    // que de composantes proches de la tête ou d'un segment)
    const marge = Math.max(3 * HR, 1.5 * SR) + 24 * G0.dpr;
    let x0 = tete[0], x1 = tete[0], y0 = tete[1], y1 = tete[1];
    for (const s of segs) { if (s[0] < x0) x0 = s[0]; if (s[0] > x1) x1 = s[0]; if (s[1] < y0) y0 = s[1]; if (s[1] > y1) y1 = s[1]; }
    x0 = Math.max(0, Math.floor(x0 - marge)); y0 = Math.max(0, Math.floor(y0 - marge));
    x1 = Math.min(cv.width, Math.ceil(x1 + marge)); y1 = Math.min(cv.height, Math.ceil(y1 + marge));
    const W = x1 - x0, H = y1 - y0;
    if (W < 8 || H < 8) return null;
    const d = g.getImageData(x0, y0, W, H).data;
    /* GARDE DE SYNCHRONISATION. Une image dont le tampon ne contient PAS la scène
       de l'état qu'on vient de lire n'est pas mesurable : on relèverait le fond
       partout et l'on conclurait à tort que la tête n'est plus blanche. Le test
       est direct — si la tête ET plusieurs segments tombent tous exactement sur
       la couleur d'effacement du fond (#05060f), rien n'a été dessiné là. Ces
       images sont ÉCARTÉES ET COMPTÉES, jamais silencieusement ignorées. */
    const echant = [tete].concat(segs.slice(0, 6));
    let vus = 0;
    for (const q0 of echant) {
      const qx = Math.round(q0[0]), qy = Math.round(q0[1]);
      if (qx < x0 || qy < y0 || qx >= x1 || qy >= y1) continue;
      const i5 = ((qy - y0) * W + (qx - x0)) * 4;
      if (!(d[i5] === 5 && d[i5 + 1] === 6 && d[i5 + 2] === 15)) vus++;
    }
    if (!vus) { G.ignorees.desync = (G.ignorees.desync || 0) + 1; return null; }
    const lab = new Int32Array(W * H).fill(-1);
    const comps = [];
    const pile = new Int32Array(W * H);
    for (let i = 0; i < W * H; i++) {
      if (lab[i] >= 0) continue;
      const p = i * 4;
      if (!(d[p] > 235 && d[p + 1] > 235 && d[p + 2] > 235)) { lab[i] = -2; continue; }
      const id = comps.length; let sp = 0; pile[sp++] = i; lab[i] = id;
      let n = 0, sx = 0, sy = 0;
      while (sp) {
        const j = pile[--sp], jx = j % W, jy = (j / W) | 0;
        n++; sx += jx; sy += jy;
        for (let k = 0; k < 4; k++) {
          const nx = jx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = jy + (k === 2 ? 1 : k === 3 ? -1 : 0);
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const m = ny * W + nx;
          if (lab[m] !== -1) continue;
          const q = m * 4;
          if (d[q] > 235 && d[q + 1] > 235 && d[q + 2] > 235) { lab[m] = id; pile[sp++] = m; } else lab[m] = -2;
        }
      }
      comps.push({ n, cx: x0 + sx / n, cy: y0 + sy / n });
    }
    const dpr = G0.dpr, aire = c => c.n / (dpr * dpr);      // px CSS²
    const grosses = comps.filter(c => aire(c) >= 20);
    let proche = null, dmin = 1e9;
    for (const c of grosses) { const dd = Math.hypot(c.cx - tete[0], c.cy - tete[1]); if (dd < dmin) { dmin = dd; proche = c; } }
    const a_ok = !!proche && dmin <= 0.6 * HR;
    // (b) parasites : composante > 20 px² à plus de 2 K.HEAD_R de la tête ET à
    //     moins de 1,5 x S.headR d'un segment. ATTRIBUTION D'ABORD : une
    //     composante qui appartient à un ennemi (dans 1,7 r + 6 px de son
    //     centre) n'est pas une tache du corps du serpent.
    const parasites = [];
    for (const c of grosses) {
      const dt = Math.hypot(c.cx - tete[0], c.cy - tete[1]);
      if (dt <= 2 * HR) continue;
      let ds = 1e9; for (const s of segs) { const q = Math.hypot(c.cx - s[0], c.cy - s[1]); if (q < ds) ds = q; }
      if (ds >= 1.5 * SR) continue;
      let att = null;
      for (const e of obj) { if (Math.hypot(c.cx - e.p[0], c.cy - e.p[1]) <= 2.2 * e.r + 8 * dpr) { att = e.type; break; } }
      let vx = Math.round(c.cx), vy = Math.round(c.cy), rgb = null;
      if (vx >= x0 && vy >= y0 && vx < x1 && vy < y1) { const i2 = ((vy - y0) * W + (vx - x0)) * 4; rgb = [d[i2], d[i2 + 1], d[i2 + 2]]; }
      let pr = null, prd = 1e9;
      for (const e of obj) { const q = Math.hypot(c.cx - e.p[0], c.cy - e.p[1]) - e.r; if (q < prd) { prd = q; pr = e.type; } }
      parasites.push({ cx: Math.round(c.cx), cy: Math.round(c.cy), aire: +aire(c).toFixed(1), dTete: +(dt / HR).toFixed(2), dSeg: +(ds / SR).toFixed(2), attribue: att, rgb, voisin: pr, dVoisinPx: +prd.toFixed(1) });
    }
    // diagnostic : blancs sur TOUT le tampon, et état de mise en scène
    let blancTotal = 0, bcx = 0, bcy = 0;
    { const full = g.getImageData(0, 0, cv.width, cv.height).data;
      for (let i = 0, p2 = 0; i < cv.width * cv.height; i++, p2 += 4) if (full[p2] > 235 && full[p2 + 1] > 235 && full[p2 + 2] > 235) { blancTotal++; bcx += i % cv.width; bcy += (i / cv.width) | 0; }
      if (blancTotal) { bcx /= blancTotal; bcy /= blancTotal; }
      const ti = (Math.round(tete[1]) * cv.width + Math.round(tete[0])) * 4;
      window.__pixTeteFull = [full[ti], full[ti + 1], full[ti + 2]]; }
    // diagnostic : le pixel exactement à la position écran de la tête
    let rgbT = null;
    { const tx = Math.round(tete[0]), ty = Math.round(tete[1]);
      if (tx >= x0 && ty >= y0 && tx < x1 && ty < y1) { const i4 = ((ty - y0) * W + (tx - x0)) * 4; rgbT = [d[i4], d[i4 + 1], d[i4 + 2]]; } }
    let rgbP = null;
    if (proche) { const vx = Math.round(proche.cx), vy = Math.round(proche.cy);
      if (vx >= x0 && vy >= y0 && vx < x1 && vy < y1) { const i3 = ((vy - y0) * W + (vx - x0)) * 4; rgbP = [d[i3], d[i3 + 1], d[i3 + 2]]; } }
    return { a_ok, aireProche: proche ? +aire(proche).toFixed(1) : 0, dProche: proche ? +(dmin / HR).toFixed(2) : -1,
      rgbProche: rgbP, rgbTete: rgbT, blancTotal, pixTeteFull: window.__pixTeteFull, blancC: [Math.round(bcx), Math.round(bcy)], teteXY: [Math.round(tete[0]), Math.round(tete[1])], buf: [cv.width, cv.height], lvl: S.level, lphase: (M.levels.phaseName ? M.levels.phaseName() : ''), zoom: +M.phases.zoom().toFixed(3), persp: +M.phases.persp().toFixed(3), ghost: S.snake.ghost > 0 ? 1 : 0, invuln: S.snake.invuln > 0 ? 1 : 0, nTotComp: comps.length,
      parasites: parasites.filter(p => !p.attribue), attribues: parasites.filter(p => p.attribue).map(p => p.attribue), attribuesEnnemi: parasites.filter(p => p.attribue).length, nComp: grosses.length };
  }); };

  /* --- épaisseurs de trait, instrumentées sur stroke() --------------------- */
  window.__g11Traits = function (on) {
    if (on && !window.__g11TrOn) {
      window.__g11TrOn = 1;
      const proto = Object.getPrototypeOf(g), orig = proto.stroke;
      const EXCL = /_lvDrawBack|_lvDrawFore|drawFloor|gridDraw/;
      proto.stroke = function () {
        try {
          if (this === g && window.__g11TrRec) {
            const st = new Error().stack || '';
            if (!EXCL.test(st)) {
              const m = this.getTransform();
              /* ÉCART DÉCLARÉ À LA LETTRE DE LA SPEC, avec sa démonstration.
                 La spec écrit « min(|a|,|d|) x lineWidth x facteur CSS ». Cette
                 formule n'est la largeur rendue que pour une matrice SANS
                 ROTATION. Sous une rotation d'angle t et une échelle uniforme s,
                 la matrice vaut s x R(t), donc |a| = |d| = s|cos t| : la formule
                 tend vers ZÉRO à la verticale alors que le trait garde sa
                 largeur s x w dans toutes les directions. Elle ne mesure donc
                 pas ce que la spec veut mesurer, et un plancher construit sur
                 elle exige une largeur non bornée — c'est ce qui a été mesuré,
                 x 58 à un degré de la verticale, et c'est ce qui faisait
                 disparaître la tête sous son propre liseré.
                 On relève donc la PLUS PETITE VALEUR SINGULIÈRE, qui est la
                 largeur rendue dans la direction la moins favorable — la même
                 grandeur, correctement calculée : elle vaut min(sx, sy) quand
                 il n'y a pas de rotation, cas où les deux formules coïncident,
                 et s sous toute rotation à échelle uniforme.
                 Le SEUIL de 2 px CSS n'est pas touché. */
              const _F = m.a * m.a + m.b * m.b + m.c * m.c + m.d * m.d;
              const _D = Math.abs(m.a * m.d - m.b * m.c);
              const _t = Math.max(0, _F * _F - 4 * _D * _D);
              const s = Math.sqrt(Math.max(0, (_F - Math.sqrt(_t)) * 0.5));
              /* DPR LU DANS LA MÊME IMAGE QUE LA MATRICE. Le cran de netteté
                 change d'une image à l'autre (la qualité épinglée par le test
                 réécrit S.opt.px à chaque image, et la bascule fait descendre
                 DPR de 1,5 à 1,25). Un DPR mis en cache par un rAF voisin
                 rapportait 1,67 px pour un trait qui en faisait bien 2 :
                 2 x (1,25/1,5) x 1,00 = 1,67. S.rx.dpr EST le DPR avec lequel
                 worldXf vient de poser la matrice qu'on lit ici — la règle
                 « relever les deux dans la même image » appliquée au trait. */
              const dp = (S.rx && S.rx.dpr) || window.__g11Dpr || 1;
              const G0v = window.__g11Fcss || 1;
              const px = this.lineWidth * s / dp * G0v;
              const L = st.split('\n'); const q = (L.slice(2, 6).map(z => z.trim()).find(z => !/g\.stroke|__g11/.test(z)) || L[3] || '').trim().slice(0, 110);
              G.traits.push({ px: +px.toFixed(2), lw: +this.lineWidth.toFixed(2), sc: +s.toFixed(3), dpr: dp, fcss: +G0v.toFixed(3), ou: q });
            }
          }
        } catch (e) {}
        return orig.apply(this, arguments);
      };
    }
    /* dpr et facteur CSS changent AVEC LA BASCULE (le cran de netteté baisse d'un
       cran quand le plan penche, et perspCover apparaît) : les figer au moment
       de l'instrumentation faisait rapporter 1,67 px pour un trait qui en fait
       bien 2 — un défaut de l'instrument, pas du build. On les relit à chaque
       image tant que l'enregistrement est armé. */
    window.__g11Fcss = facteurCss();
    window.__g11Dpr = geo().dpr;
    window.__g11TrRec = !!on;
    if (on && !window.__g11TrLoop) {
      window.__g11TrLoop = 1;
      (function t() { requestAnimationFrame(t); if (!window.__g11TrRec) return; window.__g11Fcss = facteurCss(); window.__g11Dpr = geo().dpr; })();
    }
  };
};
