/* tools/L1/doigts.mjs — les critères [U] du lot 1 qui demandent des doigts, un clavier, une souris, une manette :
     gestes       20 touchers → 20 pouvoirs, 0 APOGÉE, 0 accélération ; 20 glissés → 20 APOGÉE ; 20 appuis de 0,5 s →
                  20 accélérations de 0,32 s ± 1 image (second doigt, pouce tenu sur le manche)
     recentrage   120 s de pouce levé et reposé toutes les 0,5 à 3 s, dont 30 % de reposés de moins de 200 ms sans
                  mouvement et 10 % où un autre doigt se pose moins de 150 ms après : 0 pouvoir, 0 APOGÉE, 0 accélération
     systeme      50 balayages partant à moins de 10 px de chaque bord, et des pincements : 0 navigation, 0 zoom,
                  0 sélection, 0 défilement, tous les touchers retenus (preventDefault) ; origines du manche à 20 pt
                  au moins des bords gauche, droit et bas
     latence      1 image entre l'événement tactile et le changement de cap (CDP)
     parite       clavier, souris, manette : chaque action du § 2.15 est déclenchée et journalisée
   Les doigts passent par CDP (Input.dispatchTouchEvent), en points CSS, en temps réel.
   Usage : node tools/L1/doigts.mjs [--url URL] [--seulement a,b] [--rapide] → tools/L1/sortie/doigts.json */
import { ouvrir, fermerTout, Rapport, Doigts, SEULEMENT, RAPIDE, q } from './commun.mjs';

const R = new Rapport('doigts');
const fait = n => !SEULEMENT.length || SEULEMENT.includes(n);

/* une partie en jeu, invulnérable, directeur au repos (l'horloge ne s'arrête pas aux cartes), journal complet */
async function enJeu(s) {
  await s.eval(() => {
    const N = __N; N.journal.actif(true); N.game.dbg.vague(1); N.game.dbg.god(true); N.dir.update = function () { };
    /* un échantillonneur par image : l'accélération demandée, en temps réel */
    window.__L1im = []; const raf = () => { window.__L1im.push([performance.now(), __S.input.boost ? 1 : 0]); if (window.__L1im.length > 200000) window.__L1im.length = 0; requestAnimationFrame(raf); }; requestAnimationFrame(raf);
  });
  await s.images(10);
}
async function lireActions(s) {
  return s.eval(() => {
    const J = __N.journal.dump({ vider: true }), g = J.filter(x => x.type === 'geste').map(x => x.d);
    const c = { pouvoir: 0, apogee: 0, boost: 0, aucune: 0 }, genres = {};
    for (const x of g) if (x.doigt === 'action') { c[x.action]++; genres[x.genre] = (genres[x.genre] || 0) + 1; }
    const act = g.filter(x => x.doigt === 'action');
    return { c, genres, tenus: g.filter(x => x.genre === 'tenu').map(x => x.duree), manches: g.filter(x => x.doigt === 'manche').length,
      bizarres: act.map((x, i) => [i, x.genre, +x.duree.toFixed(3), +x.deplacement.toFixed(1)]).filter(x => x[1] === 'tenu' || x[1] === 'autre'), durees: act.map(x => +x.duree.toFixed(3)) };
  });
}
/* les accélérations : suites d'images où S.input.boost est vrai, depuis l'instant t0 (ms réels) */
async function accelerations(s, t0) {
  return s.eval(t => { const I = window.__L1im.filter(x => x[0] >= t), runs = []; let deb = null; for (const [r, b] of I) { if (b && deb === null) deb = r; if (!b && deb !== null) { runs.push((r - deb) / 1000); deb = null; } } const dts = []; for (let i = 1; i < I.length; i++) dts.push(I[i][0] - I[i - 1][0]); dts.sort((a, b) => a - b); return { runs, image: dts.length ? dts[dts.length >> 1] / 1000 : 1 / 60 }; }, t0);
}

async function gestes() {
  for (const prof of ['paysage', 'portrait']) {
    const s = await ouvrir(prof, { dt: 1 / 60, cdp: true });
    await enJeu(s);
    const d = await new Doigts(s).init(), V = s.page.viewportSize();
    const pouce = await d.poser(V.width * 0.2, V.height * 0.7);
    await d.glisser(pouce, V.width * 0.2 + 20, V.height * 0.7 - 6, 80);
    await d.attendre(250);
    await lireActions(s);
    const lieu = k => [V.width * (0.55 + 0.3 * ((k * 7) % 5) / 5), V.height * (0.25 + 0.4 * ((k * 3) % 5) / 5)];
    /* 20 touchers */
    let t0 = await s.eval(() => performance.now());
    for (let k = 0; k < 20; k++) { const [x, y] = lieu(k); const id = await d.poser(x, y); await d.attendre(60 + (k % 4) * 15); await d.lever(id); await d.attendre(220); }
    let a = await lireActions(s), acc = await accelerations(s, t0);
    R.verifie(`touchers du second doigt, ${prof} : pouvoirs / APOGÉE / accélérations`, { ...a.c, accelerationsVues: acc.runs.length, dureesMax: Math.max(...a.durees), bizarres: a.bizarres }, '20 / 0 / 0', a.c.pouvoir === 20 && a.c.apogee === 0 && a.c.boost === 0 && acc.runs.length === 0);
    /* 20 glissés */
    t0 = await s.eval(() => performance.now());
    for (let k = 0; k < 20; k++) { const [x, y] = lieu(k); const id = await d.poser(x, y), ux = (k % 3) - 1 || 1, uy = (k % 2) ? 0.6 : -0.6; for (let i = 1; i <= 4; i++) await d.bouger(id, x + ux * 16 * i, y + uy * 16 * i); await d.lever(id); await d.attendre(220); }
    a = await lireActions(s); acc = await accelerations(s, t0);
    R.verifie(`glissés du second doigt, ${prof} : APOGÉE / pouvoirs / accélérations`, { ...a.c, accelerationsVues: acc.runs.length, bizarres: a.bizarres }, '20 / 0 / 0', a.c.apogee === 20 && a.c.pouvoir === 0 && a.c.boost === 0 && acc.runs.length === 0);
    /* 20 appuis de 0,5 s */
    t0 = await s.eval(() => performance.now());
    for (let k = 0; k < 20; k++) { const [x, y] = lieu(k); const id = await d.poser(x, y); await d.attendre(485); await d.lever(id); await d.attendre(250); }
    a = await lireActions(s); acc = await accelerations(s, t0);
    /* CDP livre les doigts avec quelques ms de retard : l'appui réellement tenu est celui que le jeu a horodaté
       (journal 'geste', durée) ; l'accélération attendue est cet appui moins N.R.gestes.tenu.duree (0,18 s), soit
       0,32 s pour un appui de 0,5 s */
    const im = acc.image, ecarts = acc.runs.map((r, i) => r - (a.tenus[i] - 0.18)), hors = ecarts.filter(x => Math.abs(x) > im + 0.004);   // 1 image, plus 4 ms de gigue des horodatages d'image
    R.verifie(`appuis de 0,5 s du second doigt, ${prof} : accélérations de (appui − 0,18 s) ± 1 image`, { boost: a.c.boost, pouvoir: a.c.pouvoir, apogee: a.c.apogee, accelerations: acc.runs.map(r => +r.toFixed(3)), appuis: a.tenus.map(x => +x.toFixed(3)), ecartMax: +Math.max(...ecarts.map(Math.abs)).toFixed(4), image: +im.toFixed(4) }, '20 × (appui − 0,18) ± 1 image', a.c.boost === 20 && a.c.pouvoir === 0 && a.c.apogee === 0 && acc.runs.length === 20 && hors.length === 0);
    await d.toutLever();
    const e = await s.err(); R.verifie(`gestes ${prof} : zéro erreur`, e, '0', e.zero);
    await s.fermer();
  }
}

/* un hasard reproductible pour les séries « humaines » */
function hasard(g) { let a = g >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

async function recentrage() {
  const SEC = RAPIDE ? 40 : 120;
  for (const prof of RAPIDE ? ['paysage'] : ['paysage', 'portrait']) {
    const s = await ouvrir(prof, { dt: 1 / 60, cdp: true });
    await enJeu(s);
    await lireActions(s);
    const d = await new Doigts(s).init(), V = s.page.viewportSize(), h = hasard(prof === 'paysage' ? 17 : 23);
    const t0 = await s.eval(() => performance.now()), fin = Date.now() + SEC * 1000;
    let n = 0, courts = 0, autres = 0;
    const bx = V.width * 0.18, by = V.height * 0.72;
    while (Date.now() < fin) {
      n++;
      /* la répartition demandée, tenue exactement : 1 pose sur 10 avec un autre doigt, 3 sur 10 courtes */
      const x = bx + (h() - 0.5) * 60, y = by + (h() - 0.5) * 50, r10 = n % 10, u = r10 === 0 ? 0.05 : (r10 === 3 || r10 === 6 || r10 === 9) ? 0.2 : 0.7;
      const id = await d.poser(x, y);
      if (u < 0.10) {
        /* un autre doigt (l'autre pouce, la paume) se pose moins de 150 ms après, puis se lève */
        autres++;
        await d.attendre(20 + h() * 110);
        const x2 = V.width * (0.5 + h() * 0.4), y2 = V.height * (0.3 + h() * 0.5), id2 = await d.poser(x2, y2);
        await d.attendre(60 + h() * 400);
        if (h() < 0.5) { await d.lever(id); await d.attendre(30 + h() * 300); await d.lever(id2); }
        else { await d.lever(id2); await d.attendre(200 + h() * 800); await d.lever(id); }
      } else if (u < 0.40) {
        /* un reposé de moins de 200 ms, sans mouvement */
        courts++;
        await d.attendre(30 + h() * 160); await d.lever(id);
      } else {
        /* le pouce dirige 0,5 à 3 s : petits arcs, puis il se lève */
        const dur = 500 + h() * 2500, a0 = h() * 6.28, t1 = Date.now();
        while (Date.now() - t1 < dur) { const a = a0 + (Date.now() - t1) / 400; await d.bouger(id, x + Math.cos(a) * 28, y + Math.sin(a) * 22); await d.attendre(30); }
        await d.lever(id);
      }
      await d.attendre(40 + h() * 220);
    }
    const a = await lireActions(s), acc = await accelerations(s, t0);
    R.verifie(`recentrages humains, ${prof} (${SEC} s, ${n} poses, ${courts} courtes, ${autres} avec un autre doigt) : pouvoir / APOGÉE / accélération`, { ...a.c, accelerationsVues: acc.runs.length, genres: a.genres }, '0 / 0 / 0', a.c.pouvoir === 0 && a.c.apogee === 0 && a.c.boost === 0 && acc.runs.length === 0 && courts >= 0.2 * n && autres >= 0.05 * n);
    const e = await s.err(); R.verifie(`recentrages ${prof} : zéro erreur`, e, '0', e.zero);
    await s.fermer();
  }
}

async function systeme() {
  for (const prof of ['paysage', 'portrait']) {
    const s = await ouvrir(prof, { dt: 1 / 60, cdp: true });
    await enJeu(s);
    await s.eval(() => {
      window.__L1sys = { libres: 0, total: 0, origines: [] };
      for (const t of ['touchstart', 'touchmove', 'touchend']) window.addEventListener(t, e => { __L1sys.total++; if (!e.defaultPrevented) __L1sys.libres++; if (t === 'touchstart') { const st = __S.input.stick; if (st.active) __L1sys.origines.push([st.ox, st.oy]); } });
    });
    const avant = await s.eval(() => ({ href: location.href, hist: history.length }));
    const d = await new Doigts(s).init(), V = s.page.viewportSize();
    const bords = { gauche: (k) => [2 + (k % 8), V.height * (0.2 + 0.6 * (k / 50)), 1, 0], droite: (k) => [V.width - 2 - (k % 8), V.height * (0.25 + 0.6 * (k / 50)), -1, 0],
      haut: (k) => [V.width * (0.1 + 0.6 * (k / 50)), 2 + (k % 8), 0, 1], bas: (k) => [V.width * (0.1 + 0.8 * (k / 50)), V.height - 2 - (k % 8), 0, -1] };
    for (const [nom, f] of Object.entries(bords)) {
      for (let k = 0; k < 50; k++) {
        const [x, y, ux, uy] = f(k), id = await d.poser(x, y);
        await d.glisser(id, x + ux * 140, y + uy * 140, 120);
        await d.lever(id);
      }
    }
    /* des pincements et des doubles touchers */
    for (let k = 0; k < 10; k++) {
      const a = await d.poser(V.width * 0.4, V.height * 0.5), b = await d.poser(V.width * 0.6, V.height * 0.5);
      await d.attendre(200);
      for (let i = 1; i <= 6; i++) { await d.bouger(a, V.width * (0.4 - 0.03 * i), V.height * 0.5); await d.bouger(b, V.width * (0.6 + 0.03 * i), V.height * 0.5); }
      await d.lever(b); await d.lever(a);
      const c = await d.poser(V.width * 0.5, V.height * 0.4); await d.lever(c); const c2 = await d.poser(V.width * 0.5, V.height * 0.4); await d.lever(c2);
    }
    await d.attendre(200);
    const r = await s.eval(() => ({ href: location.href, hist: history.length, zoom: window.visualViewport ? window.visualViewport.scale : 1, sel: String(window.getSelection ? window.getSelection() : ''), scroll: [window.scrollX, window.scrollY], sys: window.__L1sys, W: innerWidth, H: innerHeight }));
    const b = 20, mauvaises = r.sys.origines.filter(([x, y]) => x < b - 0.01 || x > r.W - b + 0.01 || y > r.H - b + 0.01);
    R.verifie(`gestes du système, ${prof} : 200 balayages depuis les bords, 10 pincements`, { navigation: r.href !== avant.href || r.hist !== avant.hist, zoom: r.zoom, selection: r.sel.length, defilement: r.scroll, touchersLaissesAuSysteme: r.sys.libres, touchers: r.sys.total }, '0 navigation, zoom 1, 0 sélection', r.href === avant.href && r.hist === avant.hist && r.zoom === 1 && r.sel.length === 0 && r.scroll[0] === 0 && r.scroll[1] === 0 && r.sys.libres === 0 && r.sys.total > 1000);
    R.verifie(`origines du manche, ${prof} : à 20 pt au moins des bords gauche, droit et bas`, { origines: r.sys.origines.length, troPres: mauvaises.length }, '0', mauvaises.length === 0 && r.sys.origines.length >= 150);
    const e = await s.err(); R.verifie(`gestes du système ${prof} : zéro erreur`, e, '0', e.zero);
    await s.fermer();
  }
  R.note('mode « web app » (écran d’accueil) : non émulable par Chromium ; les écouteurs non passifs et les styles touch-action, overscroll-behavior, user-select et touch-callout sont les mêmes dans les deux modes. À vérifier sur l’iPhone de la propriétaire au JALON A.');
}

async function latence() {
  const s = await ouvrir('paysage', { cdp: true });
  await enJeu(s);
  await s.eval(() => {
    const N = __N, S = __S, up = N.game.update;
    window.__L1lat = { ev: [], ch: [], dernier: null };
    window.addEventListener('touchmove', () => { __L1lat.ev.push(window.__FRAME); }, true);
    N.game.update = function (dt) { up(dt); const a = S.player ? S.player.angVise : null; if (a !== null && __L1lat.dernier !== null && Math.abs(a - __L1lat.dernier) > 0.3) __L1lat.ch.push(window.__FRAME); __L1lat.dernier = a; };
  });
  const d = await new Doigts(s).init(), V = s.page.viewportSize();
  const x = V.width * 0.25, y = V.height * 0.55, id = await d.poser(x, y);
  await d.bouger(id, x + 30, y); await d.attendre(300);
  for (let k = 0; k < 20; k++) {
    await s.eval(() => { __L1lat.ev.length = 0; __L1lat.ch.length = 0; });
    const a = (k % 2) ? 0 : Math.PI / 2 + (k % 4) * 0.5;
    await d.bouger(id, x + Math.cos(a) * 30, y + Math.sin(a) * 30);
    await d.attendre(120);
    const r = await s.eval(() => ({ ev: __L1lat.ev.slice(), ch: __L1lat.ch.slice() }));
    R.lignes.push(null); R.lignes.pop();
    (latence.series || (latence.series = [])).push(r.ev.length && r.ch.length ? r.ch[0] - r.ev[0] : null);
  }
  const L = latence.series;
  R.verifie('latence tactile : images entre l’événement et le changement de cap (20 essais)', L, '1 image', L.every(v => v === 1));
  const e = await s.err(); R.verifie('latence : zéro erreur', e, '0', e.zero);
  await s.fermer();
}

async function parite() {
  /* une manette simulée, branchée avant le jeu */
  const init = () => {
    window.__PAD = { connected: true, id: 'banc', index: 0, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })) };
    navigator.getGamepads = () => [window.__PAD];
  };
  const s = await ouvrir('bureau', { dt: 1 / 60, init });
  await enJeu(s);
  /* chaque pas, ce que S.input porte avant que les modules ne le consomment */
  await s.eval(() => {
    const N = __N, S = __S, up = N.game.update;
    window.__L1vu = {};
    N.game.update = function (dt) { const i = S.input, v = window.__L1vu; for (const k of ['boost', 'pouvoir', 'apogee', 'pause', 'valider', 'retour', 'any']) if (i[k]) v[k] = true; if (i.chiffre) v.chiffre = i.chiffre; if (i.car) v.car = (v.car || '') + i.car; if (i.taps.length) v.taps = (v.taps || 0) + i.taps.length; if (i.mag > 0.5) v.dir = [+i.x.toFixed(2), +i.y.toFixed(2)]; up(dt); };
  });
  const vu = async (fn) => { await s.eval(() => { window.__L1vu = {}; __N.journal.dump({ vider: true }); if (__N.game.etat() !== 'jeu') { __N.game.dbg.vague(1); __N.game.dbg.god(true); __N.dir.update = function () { }; } }); await fn(); await s.images(4); return s.eval(() => ({ v: window.__L1vu, j: __N.journal.dump({ vider: true }).filter(x => x.type === 'geste').map(x => x.d.action) })); };
  const kb = s.page.keyboard, ms = s.page.mouse, res = {};
  /* le clavier */
  res['clavier diriger'] = await vu(async () => { await kb.down('ArrowUp'); await s.images(3); await kb.up('ArrowUp'); });
  res['clavier ZQSD'] = await vu(async () => { await kb.down('KeyQ'); await s.images(3); await kb.up('KeyQ'); });
  res['clavier accélérer (Espace)'] = await vu(async () => { await kb.down('Space'); await s.images(4); await kb.up('Space'); });
  res['clavier pouvoir (E)'] = await vu(() => kb.press('KeyE'));
  res['clavier APOGÉE (R)'] = await vu(() => kb.press('KeyR'));
  res['clavier valider (Entrée)'] = await vu(() => kb.press('Enter'));
  res['clavier chiffre (3)'] = await vu(() => kb.press('Digit3'));
  res['clavier retour (Retour arrière)'] = await vu(() => kb.press('Backspace'));
  res['clavier lettres'] = await vu(() => kb.type('abc'));
  res['clavier pause (P)'] = await vu(() => kb.press('KeyP'));
  /* la souris : le cap suit le curseur au-delà de 24 px de la tête */
  res['souris diriger'] = await vu(async () => {
    const p = await s.eval(() => { const P = __S.player, o = __N.cam.toScreen(P.x, P.y, {}); return [o.x * __N.gfx.PX, o.y * __N.gfx.PX]; });
    await ms.move(p[0] + 5, p[1] - 200, { steps: 4 });
  });
  res['souris accélérer (clic gauche tenu)'] = await vu(async () => { await ms.down({ button: 'left' }); await s.images(4); await ms.up({ button: 'left' }); });
  res['souris pouvoir (clic droit)'] = await vu(async () => { await ms.down({ button: 'right' }); await ms.up({ button: 'right' }); });
  res['souris APOGÉE (clic du milieu)'] = await vu(async () => { await ms.down({ button: 'middle' }); await ms.up({ button: 'middle' }); });
  /* la manette */
  const bouton = (b) => async () => { await s.eval(i => { __PAD.buttons[i].pressed = true; }, b); await s.images(4); await s.eval(i => { __PAD.buttons[i].pressed = false; }, b); await s.images(2); };
  res['manette diriger (stick)'] = await vu(async () => { await s.eval(() => { __PAD.axes[0] = 0; __PAD.axes[1] = 0.9; }); await s.images(4); await s.eval(() => { __PAD.axes[1] = 0; }); });
  res['manette croix'] = await vu(bouton(14));
  res['manette accélérer (A)'] = await vu(bouton(0));
  res['manette accélérer (gâchette)'] = await vu(bouton(7));
  res['manette pouvoir (X)'] = await vu(bouton(2));
  res['manette APOGÉE (Y)'] = await vu(bouton(3));
  res['manette retour (B)'] = await vu(bouton(1));
  res['manette pause (Start)'] = await vu(bouton(9));
  const attendu = {
    'clavier diriger': r => r.v.dir && r.v.dir[1] === -1, 'clavier ZQSD': r => r.v.dir && r.v.dir[0] === -1,
    'clavier accélérer (Espace)': r => r.v.boost && r.j.includes('boost'), 'clavier pouvoir (E)': r => r.v.pouvoir && r.j.includes('pouvoir'),
    'clavier APOGÉE (R)': r => r.v.apogee && r.j.includes('apogee'), 'clavier valider (Entrée)': r => r.v.valider, 'clavier chiffre (3)': r => r.v.chiffre === 3,
    'clavier retour (Retour arrière)': r => r.v.retour, 'clavier lettres': r => r.v.car === 'ABC', 'clavier pause (P)': r => r.v.pause,
    'souris diriger': r => r.v.dir && r.v.dir[1] < -0.9, 'souris accélérer (clic gauche tenu)': r => r.v.boost && r.j.includes('boost') && r.v.taps >= 1,
    'souris pouvoir (clic droit)': r => r.v.pouvoir && r.j.includes('pouvoir'), 'souris APOGÉE (clic du milieu)': r => r.v.apogee && r.j.includes('apogee'),
    'manette diriger (stick)': r => r.v.dir && r.v.dir[1] === 1, 'manette croix': r => r.v.dir && r.v.dir[0] === -1,
    'manette accélérer (A)': r => r.v.boost && r.v.valider && r.j.includes('boost'), 'manette accélérer (gâchette)': r => r.v.boost && r.j.includes('boost'),
    'manette pouvoir (X)': r => r.v.pouvoir && r.j.includes('pouvoir'), 'manette APOGÉE (Y)': r => r.v.apogee && r.j.includes('apogee'),
    'manette retour (B)': r => r.v.retour, 'manette pause (Start)': r => r.v.pause
  };
  for (const [k, f] of Object.entries(attendu)) R.verifie('parité : ' + k, res[k], 'déclenchée' + (/pouvoir|APOGÉE|accélérer/.test(k) ? ' et journalisée' : ''), !!f(res[k]));
  const e = await s.err(); R.verifie('parité : zéro erreur', e, '0', e.zero);
  await s.fermer();
}

const T = { gestes, recentrage, systeme, latence, parite };
try {
  for (const [n, f] of Object.entries(T)) if (fait(n)) { console.log('== ' + n); try { await f(); } catch (e) { R.verifie(n + ' : exception', String(e && e.stack || e).slice(0, 500), 'aucune', false); } }
} finally { await fermerTout(); }
console.log('→ ' + R.ecrire());
process.exit(R.lignes.every(l => l.ok) ? 0 : 1);
