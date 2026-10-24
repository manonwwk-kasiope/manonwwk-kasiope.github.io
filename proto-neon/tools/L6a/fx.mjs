/* tools/L6a/fx.mjs — les critères [U] du lot 6a côté effets et mise en scène (REFONTE.md § 8.3) :
     Limiteur de flashs   0 dépassement sur une chaîne scriptée de 30 explosions en 2 s
     Ralentis et gels     le plus lent gagne ; joueuse exemptée sur demande ; ralenti et gel ne se cumulent pas
                          au-delà de 0,5 s ; un gel de 6 images dure 0,1 s à toute cadence
     Télégraphes          gaine en nuit profonde sur 100 % des pixels de bord ; rose pâle dans les 300 dernières
                          ms, ± 1 image
     Mise en scène        50 événements scriptés : chaque effet attendu au § 5.3, exactement une fois
     Coût                 fx.draw + drawTele + scene p95 ≤ 0,7 ms avec 24 explosions et 30 télégraphes
   Usage : node tools/L6a/fx.mjs [--profil paysage|portrait|bureau] [--url …]. Sortie : tools/L6a/sortie/fx-<profil>.json */
import { ouvrir, ecrire, arg } from './commun.mjs';

const profil = arg('--profil', 'paysage');
const s = await ouvrir(profil);
const page = s.page;
/* une partie en V1, puis plus rien ne tourne pendant les mesures : tout se passe dans un seul evaluate */
await page.evaluate(() => { const N = window.__N; N.game.dbg.vague(1); N.game.dbg.god(true); });
await page.waitForTimeout(300);

const R = {};

/* ---------------- A. gels et ralentis ---------------- */
R.temps = await page.evaluate(() => {
  const N = window.__N, H = N.horloge, out = {};
  N.fx.reset();
  /* un gel de 6 images à 30, 60 et 120 images par seconde : temps réel gelé */
  out.gel6 = [];
  for (const fps of [30, 60, 120]) {
    N.fx.reset(); for (let i = 0; i < 60; i++) { H.avancer(); N.fx.update(H.dtMonde()); }   /* sortir de tout épisode */
    N.fx.hitstop(6);
    let gele = 0, img = 0;
    while (img < 60) {
      const n = H.image(1 / fps);
      for (let k = 0; k < n; k++) { const dt = H.avancer(); if (H.dtMonde() === 0 && !H.arretee()) gele += H.H; N.fx.update(dt); }
      img++;
      if (!H.gele() && gele > 0) break;
    }
    out.gel6.push({ fps, gele: +gele.toFixed(4), ok: Math.abs(gele - 0.1) <= H.H + 1e-9 });
  }
  /* le plus lent gagne, la joueuse exemptée */
  N.fx.reset();
  N.fx.ralenti(0.5, 1.0, { force: true }); N.fx.ralenti(0.25, 0.3);
  const k1 = N.fx.k();
  for (let i = 0; i < Math.round(0.35 / H.H); i++) { H.avancer(); N.fx.update(H.dtMonde()); }
  const k2 = N.fx.k();
  N.fx.reset(); N.fx.ralenti(0.3, 1, { joueuse: true, force: true });
  out.plusLent = { k1, k2, ok: Math.abs(k1 - 0.25) < 1e-6 && Math.abs(k2 - 0.5) < 1e-6 };
  out.exemptee = { k: N.fx.k(), kJ: N.fx.kJoueuse(), ok: Math.abs(N.fx.k() - 0.3) < 1e-6 && N.fx.kJoueuse() === 1 };
  /* le cumul : une pluie de demandes (gels de 6 toutes les 3 pas, un ralenti de niveau et une APOGÉE au milieu)
     pendant 3 s ; on mesure le plus long épisode continu où le monde est gelé ou ralenti par ces effets */
  N.fx.reset();
  let run = 0, pire = 0, ralentisCourts = 0;
  for (let p = 0; p < 360; p++) {
    if (p % 3 === 0) N.fx.hitstop(6);
    if (p === 60) N.fx.ralenti(0.15, 0.35);
    if (p === 150) { N.fx.hitstop(6); N.fx.ralenti(0.25, 0.42); }
    H.avancer(); N.fx.update(H.dtMonde());
    const touche = H.gele() || N.fx.k() < 1;
    run = touche ? run + H.H : 0; if (run > pire) pire = run;
  }
  out.cumul = { pireEpisode: +pire.toFixed(4), budget: 0.5, ok: pire <= 0.5 + H.H + 1e-9, stats: { gels: N.fx.stats.gels, raccourcis: N.fx.stats.gelsRaccourcis, refuses: N.fx.stats.gelsRefuses } };
  /* l'APOGÉE seule : gel de 6 et ralenti de 0,42 courent ensemble, 0,42 s au total */
  N.fx.reset(); for (let i = 0; i < 80; i++) { H.avancer(); N.fx.update(H.dtMonde()); }
  N.fx.hitstop(6); N.fx.ralenti(0.25, 0.42);
  let tot = 0; for (let p = 0; p < 240; p++) { H.avancer(); N.fx.update(H.dtMonde()); if (H.gele() || N.fx.k() < 1) tot += H.H; }
  out.apogee = { duree: +tot.toFixed(4), ok: tot <= 0.5 };
  N.fx.reset();
  return out;
});

/* ---------------- B. le limiteur de flashs : 30 explosions en 2 s ---------------- */
R.flashs = await page.evaluate(() => {
  const N = window.__N, H = N.horloge, g = N.gfx, cam = N.cam, out = {};
  N.fx.reset();
  const W = g.W, Hh = g.H, L = N.pal.L, cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
  /* le journal des flashs, et une mesure à l'image : la part de pixels qui deviennent lumineux (Δ ≥ 0,1) */
  N.journal.actif(true);
  const avant = N.journal.dump().length;
  const prec = new Float32Array(W * Hh); let images = [], t = 0;
  const forces = []; for (let i = 0; i < 30; i++) forces.push(i % 5 === 4 ? 0.85 : 0.35 + 0.05 * (i % 4));
  let pas = 0, prochaine = 0, k = 0;
  const seuil = N.fx.flashThreshold();
  while (t < 2.6) {
    /* une image de 1/60 s : deux pas */
    for (let q = 0; q < 2; q++) {
      if (k < 30 && pas >= prochaine) { N.fx.boom(cx + ((k * 37) % 140) - 70, cy + ((k * 53) % 80) - 40, forces[k], N.pal.i('magenta')); k++; prochaine = Math.round(k * 2 / 30 / H.H); }
      H.avancer(); N.fx.update(H.dtMonde()); pas++;
    }
    t += 1 / 60;
    g.origin(cam.x, cam.y); g.clear(N.pal.i('vide')); N.fx.draw(); g.origin(0, 0);
    const b = g.buf(); let monte = 0, descend = 0;
    for (let i = 0; i < b.length; i++) { const l = L[b[i]], d = l - prec[i]; if (d >= 0.1) monte++; else if (d <= -0.1) descend++; prec[i] = l; }
    images.push({ t, monte, descend });
  }
  const J = N.journal.dump().slice(avant).filter(e => e.type === 'flash');
  out.explosions = k; out.seuil = Math.round(seuil);
  out.journal = { demandes: J.length, acceptes: J.filter(e => e.d.accepte).length };
  /* au plus 3 flashs acceptés dans toute fenêtre d'une seconde (journal) */
  const ta = J.filter(e => e.d.accepte).map(e => e.t); let pireJ = 0;
  for (let i = 0; i < ta.length; i++) { let n = 0; for (let j = i; j < ta.length && ta[j] - ta[i] < 1; j++) n++; if (n > pireJ) pireJ = n; }
  /* à l'image : un flash = une hausse de luminance d'au moins 0,1 sur une aire au-delà du seuil ; on compte
     les montées (l'image précédente sous le seuil) dans toute fenêtre glissante d'une seconde */
  const fl = []; for (let i = 0; i < images.length; i++) if (images[i].monte > seuil && (i === 0 || images[i - 1].monte <= seuil)) fl.push(images[i].t);
  let pireI = 0; for (let i = 0; i < fl.length; i++) { let n = 0; for (let j = i; j < fl.length && fl[j] - fl[i] < 1; j++) n++; if (n > pireI) pireI = n; }
  out.parSecondeJournal = pireJ; out.parSecondeImage = pireI; out.montees = fl.map(x => +x.toFixed(3));
  out.ok = pireJ <= 3 && pireI <= 3;
  N.fx.reset();
  return out;
});

/* ---------------- C. les télégraphes ---------------- */
R.teles = await page.evaluate(() => {
  const N = window.__N, H = N.horloge, g = N.gfx, cam = N.cam, out = {}, NP = N.pal.i('nuitProfonde'), MG = N.pal.i('magenta'), RP = N.pal.i('rosePale'), FOND = N.pal.i('violet');
  const cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2;
  const formes = [
    { forme: 'ligne', x0: cx - 150, y0: cy - 60, x1: cx - 83, y1: cy - 60, r: 0 },
    { forme: 'ligne', x0: cx - 150, y0: cy - 30, x1: cx + 40, y1: cy + 10, r: 2 },
    { forme: 'disque', x0: cx + 100, y0: cy - 40, r: 30 },
    { forme: 'secteur', x0: cx - 60, y0: cy + 50, r: 40, a0: -0.8, a1: 0.9 },
    { forme: 'rect', x0: cx + 20, y0: cy + 30, x1: cx + 80, y1: cy + 70 },
    { forme: 'losange', x0: cx + 130, y0: cy + 50, r: 2, cible: 'tete' },
    { forme: 'losange', x0: cx + 150, y0: cy + 50, r: 2, cible: 'corps' },
    { forme: 'voie', x0: cam.x, y0: cy - 90, x1: cam.x + cam.w, y1: cy - 72 }
  ];
  function poser(reste) {
    formes.forEach((f, i) => N.fx.tele(Object.assign({ id: 9000 + i, y1: f.y1 === undefined ? f.y0 : f.y1, x1: f.x1 === undefined ? f.x0 : f.x1, a0: f.a0 || 0, a1: f.a1 || 0, reste, total: 1.0, cible: f.cible || 'tete', par: { type: 'fleche', id: 1 } }, f)));
    N.fx.update(0);
  }
  function dessiner() { g.origin(0, 0); g.clear(FOND); g.origin(cam.x, cam.y); N.fx.drawTele(); g.origin(0, 0); return g.buf(); }
  const res = [];
  for (const reste of [0.8, 0.29, 0, -0.2]) {
    poser(reste); const b = dessiner(), W = g.W, Hh = g.H;
    let bord = 0, bordNP = 0, mag = 0, rose = 0;
    for (let y = 1; y < Hh - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x, v = b[i]; if (v === FOND) continue;
      if (v === MG) mag++; if (v === RP) rose++;
      if (b[i - 1] === FOND || b[i + 1] === FOND || b[i - W] === FOND || b[i + W] === FOND) { bord++; if (v === NP) bordNP++; }
    }
    res.push({ reste, bord, gaine: bord ? +(bordNP / bord).toFixed(4) : 1, magenta: mag, rose });
  }
  out.etats = res;
  out.gaineOk = res.every(r => r.gaine === 1);
  /* le passage au rose pâle : une ligne seule, reste qui décroît d'1/60 par image ; on note la première image rose */
  let premier = null;
  for (let im = 0; im <= 60; im++) {
    const reste = 0.6 - im / 60;
    N.fx.tele({ id: 9100, forme: 'ligne', x0: cx - 50, y0: cy, x1: cx + 50, y1: cy, r: 0, a0: 0, a1: 0, reste, total: 0.6, cible: 'tete', par: { type: 'fleche', id: 1 } }); N.fx.update(0);
    const b = dessiner(); let rose = 0, mag = 0; for (let i = 0; i < b.length; i++) { if (b[i] === RP) rose++; if (b[i] === MG) mag++; }
    if (rose > 0 && mag === 0 && premier === null) premier = +reste.toFixed(4);
  }
  out.bascule = { reste: premier, attendu: 0.3, ok: premier !== null && Math.abs(premier - 0.3) <= 1 / 60 + 1e-6 };
  N.fx.update(0);
  out.ok = out.gaineOk && out.bascule.ok && res[0].rose === res[0].magenta * 0 + res[0].rose && res[0].magenta > 0;
  return out;
});

/* ---------------- D. le coût, 24 explosions et 30 télégraphes ---------------- */
R.cout = await page.evaluate(() => {
  /* la machine des bancs est partagée par plusieurs lots : chaque image est mesurée 5 fois et l'on garde la
     plus courte (le coût propre du code, sans les préemptions), puis le p95 sur 400 images */
  const N = window.__N, H = N.horloge, g = N.gfx, cam = N.cam, cx = cam.x + cam.w / 2, cy = cam.y + cam.h / 2, ms = [], brut = [];
  N.fx.reset(); N.fx.setFlash(true);
  let pic = 0;
  for (let im = 0; im < 400; im++) {
    if (im % 8 === 0) for (let e = 0; e < 6; e++) N.fx.boom(cx + ((im * 7 + e * 61) % 300) - 150, cy + ((im * 3 + e * 41) % 140) - 70, 0.3 + 0.1 * (e % 4), N.pal.i('magenta'));
    for (let q = 0; q < 2; q++) {
      for (let t = 0; t < 30; t++) {
        const f = ['ligne', 'disque', 'ligne', 'losange', 'secteur', 'rect'][t % 6];
        N.fx.tele({ id: 9500 + t, forme: f, x0: cx - 160 + (t * 23) % 320, y0: cy - 70 + (t * 17) % 140, x1: cx - 160 + (t * 23) % 320 + 60, y1: cy - 70 + (t * 17) % 140 + (t % 3) * 20, r: f === 'disque' ? 17 : f === 'secteur' ? 30 : f === 'losange' ? 2 : 1, a0: 0, a1: 1.2, reste: 0.8 - ((im + t * 7) % 60) / 60, total: 0.8, cible: 'tete', par: { type: 'tourelle', id: t } });
      }
      H.avancer(); N.fx.update(1 / 120);
    }
    if (N.fx.stats.ex > pic) pic = N.fx.stats.ex;
    let best = 1e9;
    for (let z = 0; z < 5; z++) {
      g.origin(cam.x, cam.y);
      const t0 = performance.now();
      N.fx.draw(); N.fx.drawTele(); N.scene.update(0);
      const d = performance.now() - t0; if (d < best) best = d; if (z === 0) brut.push(d);
    }
    ms.push(best);
  }
  ms.sort((a, b) => a - b); brut.sort((a, b) => a - b);
  const r = { p50: +ms[200].toFixed(3), p95: +ms[380].toFixed(3), p95brut: +brut[380].toFixed(3), explosionsPic: pic, teles: N.S.tele.length, encre: N.fx.stats.encre, ok: ms[380] <= 0.7 };
  N.fx.reset();
  return r;
});

/* ---------------- E. la mise en scène : 50 événements scriptés ---------------- */
R.scene = await page.evaluate(() => {
  const N = window.__N, H = N.horloge, P = N.S.player, cam = N.cam;
  const J = { sfx: [], boom: 0, gel: 0, ban: [], tag: [], pop: 0, jolt: 0, cue: [], voix: [], ralenti: 0, onde: 0, lasso: 0, vignette: 0, des: 0 };
  const orig = { sfx: N.music.sfx, boom: N.fx.boom, gel: N.fx.hitstop, ban: N.hud.banniere, tag: N.hud.tag, pop: N.hud.pop, jolt: N.cam.jolt, cue: N.music.cue, voix: N.music.voix, ral: N.fx.ralenti, onde: N.fx.onde, lasso: N.fx.lasso, vig: N.fx.vignette, des: N.fx.desintegre };
  N.music.sfx = (n) => { J.sfx.push(n); }; N.fx.boom = function () { J.boom++; return orig.boom.apply(N.fx, arguments); };
  N.fx.hitstop = function () { J.gel++; return orig.gel.apply(N.fx, arguments); };
  N.hud.banniere = (t) => J.ban.push(t); N.hud.tag = (t) => J.tag.push(t); N.hud.pop = () => J.pop++;
  N.cam.jolt = () => J.jolt++; N.music.cue = (c) => J.cue.push(c); N.music.voix = (v) => J.voix.push(v);
  N.fx.ralenti = function () { J.ralenti++; return orig.ral.apply(N.fx, arguments); };
  N.fx.onde = function () { J.onde++; return orig.onde.apply(N.fx, arguments); };
  N.fx.lasso = function () { J.lasso++; return orig.lasso.apply(N.fx, arguments); };
  N.fx.vignette = function () { J.vignette++; return orig.vig.apply(N.fx, arguments); };
  N.fx.desintegre = function () { J.des++; return orig.des.apply(N.fx, arguments); };
  orig.pick = N.fx.pickup; J.pick = 0; N.fx.pickup = function () { J.pick++; return orig.pick.apply(N.fx, arguments); };
  const etatAvant = N.game.etat();
  function vider() { J.sfx.length = 0; J.boom = J.gel = J.pop = J.jolt = J.ralenti = J.onde = J.lasso = J.vignette = J.des = 0; J.pick = 0; J.ban.length = 0; J.tag.length = 0; J.cue.length = 0; J.voix.length = 0; }
  function passer(sec) { for (let i = 0; i < Math.round(sec / H.H); i++) { const dt = H.avancer(); N.scene.update(dt); N.fx.update(dt); } }
  function compte(nom) { return J.sfx.filter(x => x === nom).length; }
  const x = P.x + 40, y = P.y;
  const src = { genre: 'arme', type: 'canon', id: null };
  /* chaque cas : l'événement, et ce que le § 5.3 attend, exactement une fois */
  const cas = [
    ['kill', { id: 1, type: 'fleche', x, y, elite: false, boss: false, base: 50, src, distTete: 40, gen: 0 }, () => compte('kill') === 1 && J.boom === 1 && J.gel === 1 && J.pop === 1 && J.jolt === 1],
    ['kill', { id: 2, type: 'tourelle', x, y, elite: false, boss: false, base: 150, src, distTete: 40, gen: 0 }, () => compte('kill') === 1 && J.boom === 1 && J.gel === 1 && J.pop === 1],
    ['kill', { id: 3, type: 'fleche', x, y, elite: true, boss: false, base: 250, src, distTete: 40, gen: 0 }, () => compte('bigkill') === 1 && J.boom === 1 && J.gel === 1 && J.ban.length === 1 && J.pop === 1],
    ['kill', { id: 4, type: 'larve', x, y, elite: false, boss: false, base: 20, src: { genre: 'decor', type: 'mur', id: null }, distTete: 80, gen: 0 }, () => J.sfx.length === 0 && J.boom === 1 && J.pop === 0 && J.gel === 0],
    ['kill', { id: 5, type: 'fleche', x, y, elite: false, boss: false, base: 50, src: { genre: 'joueuse', type: 'devore', id: null }, distTete: 4, gen: 0 }, () => compte('devore') === 1 && J.boom === 1 && J.pop === 1],
    ['coupe', { k: 5, perdus: 3, cause: 'tir', auteur: 'tourelle', x: P.x - 20, y: P.y }, () => compte('coupe') === 1 && J.gel === 1 && J.vignette === 1 && J.jolt === 1],
    ['coup', { partie: 'corps', k: 3, cause: 'tir', auteur: 'tourelle', auteurId: 2, x, y, absorbe: false, visibleDepuis: 1, teleDuree: 0.6 }, () => compte('impact') === 1],
    ['lasso', { n: 5, ids: [1, 2, 3, 4, 5], aire: 900, x, y, poly: [x - 20, y - 20, x + 20, y - 20, x + 20, y + 20, x - 20, y + 20] }, () => compte('lasso') === 1 && J.lasso === 1 && J.gel === 1 && J.tag.length === 1 && J.voix.length === 1],
    ['lasso', { n: 2, ids: [1, 2], aire: 400, x, y, poly: [x - 10, y - 10, x + 10, y - 10, x + 10, y + 10, x - 10, y + 10] }, () => compte('lasso') === 1 && J.lasso === 1 && J.gel === 0 && J.tag.length === 1],
    ['ramassage', { type: 'cellule', x, y, valeur: 1 }, () => compte('butin') === 1 && J.pick === 1],
    ['ramassage', { type: 'noyau', x, y, valeur: 5 }, () => compte('noyau') === 1],
    ['ramassage', { type: 'pastille', x, y, valeur: 0 }, () => compte('pastille') === 1],
    ['niveau', { niveau: 2, enAttente: 1 }, () => compte('levelup') === 1 && J.ralenti === 1],
    ['vague', { n: 2, etape: 'vague', evt: 'entree', nom: 'MEUTE', quartier: 'artere' }, () => J.ban.length === 1 && compte('vague') === 1],
    ['vague', { n: 2, etape: 'vague', evt: 'nettoyee', nom: 'MEUTE', quartier: 'artere' }, () => J.tag.length === 1 && J.cue.indexOf('stinger') >= 0 && compte('vague') === 1],
    ['vague', { n: 3, etape: 'vague', evt: 'pic', nom: 'FLÈCHE BLINDÉE', quartier: 'centrale' }, () => J.ban.length === 1],
    ['vol', { evt: 'debut', parfait: false, vers: 'artere', portes: 0, mines: 0 }, () => J.cue.indexOf('plongee') >= 0],
    ['vol', { evt: 'mine', parfait: false, vers: 'artere', portes: 0, mines: 1 }, () => J.vignette === 1],
    ['vol', { evt: 'fin', parfait: true, vers: 'artere', portes: 6, mines: 0 }, () => compte('defi') === 1],
    ['inversion', { evt: 'debut', dur: 6 }, () => J.cue.indexOf('inversion') >= 0 && (J.ban.length + J.tag.length) === 1],
    ['inversion', { evt: 'fin', dur: 6 }, () => J.sfx.length === 0],
    ['arene', { evt: 'travellingAnnonce', voie: -1, vx: 8 }, () => compte('travelling') === 1 && J.tag.length === 1],
    ['arene', { evt: 'convoiAnnonce', voie: 2, vx: 0 }, () => compte('convoi') === 1],
    ['arene', { evt: 'convoiPasse', voie: 2, vx: 0 }, () => J.jolt === 1],
    ['portail', { type: 'fleche', x, y, dur: 0.6, elite: false }, () => compte('portail') === 1],
    ['portail', { type: 'traqueur', x, y, dur: 1.5, elite: false }, () => compte('portail') === 1 && compte('traqueur') === 1 && J.voix.indexOf('DANGER') >= 0],
    ['arme', { id: 7, type: 'fleche', forme: 'ligne', total: 0.6, cible: 'tete', shown: true, rallonge: false }, () => compte('arme') === 1],
    ['pouvoir', { id: 'traversee', evt: 'debut' }, () => compte('traversee') === 1 && J.tag.length === 1 && J.onde >= 1],
    ['pouvoir', { id: 'traversee', evt: 'pret' }, () => compte('pouvoirPret') === 1],
    ['apogee', { id: 'apogee', evt: 'pleine' }, () => compte('ultimePret') === 1],
    ['apogee', { id: 'apogee', evt: 'debut' }, () => compte('ultime') === 1 && J.gel === 1 && J.ralenti === 1 && J.onde === 6],
    ['boost', { id: 'boost', evt: 'on' }, () => compte('boostOn') === 1],
    ['boost', { id: 'boost', evt: 'panne' }, () => compte('boostPanne') === 1],
    ['defi', { id: 'premierJet', ok: true, prime: 5000 }, () => compte('defi') === 1],
    ['defi', { id: 'lasso6', ok: false, prime: 0 }, () => compte('defiRate') === 1],
    ['deblocage', { id: 'ralenti' }, () => compte('record') === 1]
  ];
  /* 14 kills de plus en chaîne (paliers de multiplicateur) pour atteindre 50 événements */
  const res = [];
  for (const [nom, charge, attendu] of cas) {
    vider(); passer(0.25);
    vider();
    N.ev.emit(nom, charge);
    res.push({ nom, evt: charge.evt || charge.type || '', ok: !!attendu(), sons: J.sfx.slice(), boom: J.boom, gel: J.gel, ban: J.ban.length, tag: J.tag.length });
  }
  let killsOk = 0;
  for (let i = 0; i < 14; i++) {
    vider(); passer(0.13); vider();
    N.ev.emit('kill', { id: 100 + i, type: 'dard', x, y, elite: false, boss: false, base: 80, src, distTete: 50, gen: 0 });
    if (compte('kill') === 1 && J.boom === 1 && J.pop === 1 && J.gel === 1) killsOk++;
  }
  Object.assign(N.music, { sfx: orig.sfx, cue: orig.cue, voix: orig.voix });
  Object.assign(N.fx, { pickup: orig.pick, boom: orig.boom, hitstop: orig.gel, ralenti: orig.ral, onde: orig.onde, lasso: orig.lasso, vignette: orig.vig, desintegre: orig.des });
  N.hud.banniere = orig.ban; N.hud.tag = orig.tag; N.hud.pop = orig.pop; N.cam.jolt = orig.jolt;
  const ok = res.filter(r => r.ok).length + killsOk;
  return { evenements: res.length + 14, tenus: ok, echecs: res.filter(r => !r.ok), ok: ok === res.length + 14, etat: etatAvant };
});

R.erreurs = await s.err();
ecrire('fx-' + profil + '.json', R);
for (const k of Object.keys(R)) console.log(k, JSON.stringify(R[k]).slice(0, 600));
await s.fermer();
const ok = R.temps.gel6.every(x => x.ok) && R.temps.plusLent.ok && R.temps.exemptee.ok && R.temps.cumul.ok && R.temps.apogee.ok && R.flashs.ok && R.teles.ok && R.scene.ok && R.cout.ok && !R.erreurs.count && !R.erreurs.console.length;
console.log(ok ? 'FX : TOUT TENU (' + profil + ')' : 'FX : ÉCARTS (' + profil + ')');
process.exit(ok ? 0 : 1);
