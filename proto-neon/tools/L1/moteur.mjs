/* tools/L1/moteur.mjs — les critères [U] du lot 1 qui se vérifient dans la page, sans doigts :
     origine        un blit à l'origine (100, 50) est décalé de (−100, −50) ; un plan bouclé se raccorde sans couture
     masque         le masque de propriété : codes posés, coût nul hors mesure, mémoire préallouée
     travelling     l'arène avance à vx ± 1 %, positions annoncées dès le premier instant, arrêt au bord du monde
     cadre          tête entre 15 et 85 % de la zone sûre (72 % en portrait), et trajet visible devant ≥ min(1,2 s × v,
                    d_mur + 16) en croisière, ≥ min(0,8 s × v, d_mur + 16) en accélération, sur 100 % des pas d'un
                    parcours qui longe les quatre murs à V5, avec accélérations ; paysage, portrait, bureau, et paysage
                    avec une zone sûre d'iPhone (encoche et barre d'accueil)
     monotonie      600 images : la caméra entière n'a jamais un pixel de recul quand elle avance, ni aucun plan
     rotation       cinq rotations laissent l'état du monde identique (empreinte de S) ; zéro erreur
     pasfixe        à __DT 1/30, 1/60 et 1/120 : distance par seconde et horaires de la partie à moins de 1 %
     simule         une partie de 6 min simulée en moins de 15 s ; journal identique dessiné / simulé
   Usage : node tools/L1/moteur.mjs [--url URL] [--seulement a,b] [--rapide] → tools/L1/sortie/moteur.json */
import { ouvrir, fermerTout, Rapport, SEULEMENT, RAPIDE } from './commun.mjs';

const R = new Rapport('moteur');
const fait = n => !SEULEMENT.length || SEULEMENT.includes(n);

/* le pas fixe, appelé dans la page comme 90-boot.js le fait (sans dessin) */
const PAS = `window.__L1pas = function (n, chaque) {
  var N = __N, S = __S;
  for (var k = 0; k < n; k++) {
    var dt = N.horloge.avancer(); S.t = N.horloge.t(); S.dt = dt;
    N.game.update(dt); if (N.fx && N.fx.update) N.fx.update(dt); N.cam.update(dt);
    var inp = S.input; inp.pouvoir = inp.apogee = inp.pause = inp.valider = inp.retour = false; inp.chiffre = 0; inp.car = ''; inp.any = false; inp.taps.length = 0; inp.gestes.length = 0;
    if (chaque && chaque(k) === false) return k;
  }
  return n;
};`;

async function origine() {
  const s = await ouvrir('paysage', { dt: 1 / 60 });
  const r = await s.eval(() => {
    const N = __N, G = N.gfx, W = G.W, H = G.H, b = G.buf();
    const save = new Uint8Array(b);
    const spr = { w: 5, h: 4, data: new Uint8Array(20) }; for (let i = 0; i < 20; i++) spr.data[i] = 1 + (i % 15);
    G.clear(0); G.origin(100, 50); G.blit(spr, 110, 60); G.origin(0, 0);
    let ok = true; for (let y = 0; y < 4; y++) for (let x = 0; x < 5; x++) if (b[(10 + y) * W + 10 + x] !== spr.data[y * 5 + x]) ok = false;
    let reste = 0; for (let i = 0; i < b.length; i++) if (b[i]) reste++;
    /* un plan bouclé, à toutes les positions de -300 à 300, avec origine : raccord exact, colonne par colonne */
    const iw = 37, ih = 6, d = new Uint8Array(iw * ih); for (let y = 0; y < ih; y++) for (let x = 0; x < iw; x++) d[y * iw + x] = ((x * 7 + y * 3) % 15) + 1;
    let coutures = 0, essais = 0;
    for (let x = -300; x <= 300; x += 7) for (const ox of [0, 13, -29]) {
      G.clear(0); G.origin(ox, 0); G.layer({ w: iw, h: ih, data: d }, { x, y: 20, wrapX: true, opaque: true }); G.origin(0, 0);
      for (let ty = 20; ty < 26; ty++) for (let tx = 0; tx < W; tx++) { let sx = (tx + ox - x) % iw; if (sx < 0) sx += iw; essais++; if (b[ty * W + tx] !== d[(ty - 20) * iw + sx]) coutures++; }
    }
    /* table de couleurs et transparence */
    const lut = new Uint8Array(16); for (let i = 0; i < 16; i++) lut[i] = 15 - i;
    G.clear(3); const d2 = new Uint8Array(iw * ih); d2[0] = 0; d2[1] = 5;
    G.layer({ w: iw, h: ih, data: d2 }, { x: 0, y: 0, lut });
    const lutOk = b[0] === 3 && b[1] === 10;
    /* non bouclé, coupé aux bords */
    G.clear(0); G.layer({ w: iw, h: ih, data: d }, { x: -5, y: -2, opaque: true });
    let coupe = b[0] === d[2 * iw + 5] && b[W * 3 + 31] === d[5 * iw + 36] && b[32] === 0;
    /* remappage */
    G.clear(4); G.remap(lut, { x: 2, y: 2, w: 3, h: 3 }); const rm = b[2 * W + 2] === 11 && b[0] === 4;
    b.set(save);
    return { ok, reste, coutures, essais, lutOk, coupe, rm, K: G.K, PX: G.PX };
  });
  R.verifie('origine : blit à l’origine (100, 50) décalé de (−100, −50)', { pose: r.ok, pixelsEnTrop: r.reste - 20 }, 'exact', r.ok && r.reste === 20);
  R.verifie('plan bouclé : pixels hors raccord, 258 positions × 3 origines', { coutures: r.coutures, essais: r.essais }, '0', r.coutures === 0);
  R.verifie('plan : table de couleurs, transparence, découpe aux bords ; remappage par rectangle', { lut: r.lutOk, coupe: r.coupe, remap: r.rm }, 'vrai', r.lutOk && r.coupe && r.rm);
  const e = await s.err(); R.verifie('origine : zéro erreur', e, '0', e.zero);
  await s.fermer();
  /* la toile de sortie au bureau : K divise PX, largeur ≤ 1 280 */
  for (const prof of ['bureau', 'paysage', 'portrait']) {
    const b = await ouvrir(prof, { dt: 1 / 60 });
    const t = await b.eval(() => ({ W: __N.gfx.W, H: __N.gfx.H, PX: __N.gfx.PX, K: __N.gfx.K, toile: [__N.gfx.canvas().width, __N.gfx.canvas().height], css: [__N.gfx.canvas().style.width, __N.gfx.canvas().style.height] }));
    R.verifie(`toile de sortie ${prof} : tampon × K, K divise PX, ≤ 1 280 de large`, t, 'K | PX, W·K ≤ 1280, CSS = W·PX', t.PX % t.K === 0 && t.toile[0] === t.W * t.K && t.toile[0] <= 1280 && t.css[0] === (t.W * t.PX) + 'px');
    await b.fermer();
  }
}

async function masque() {
  const s = await ouvrir('paysage', { dt: 1 / 60 });
  const r = await s.eval(() => {
    const G = __N.gfx;
    const avant = G.masque();                         // null hors mesure
    G.masque(true); G.owner(5); G.clear(0); G.owner(1); G.rect(10, 10, 4, 4, 7); G.owner(8); G.layer({ w: 2, h: 2, data: new Uint8Array([1, 1, 1, 1]) }, { x: 0, y: 0 });
    const m = G.masque(false);
    const ok = m[10 * G.W + 10] === 1 && m[0] === 8 && m[5 * G.W + 5] === 5;
    const m1 = (G.masque(true), G.masque()); G.masque(false); const m2 = (G.masque(true), G.masque()); G.masque(false);
    return { horsMesure: avant === null, ok, memoire: m1 === m2 };
  });
  R.verifie('masque : codes posés par owner(), nul hors mesure, mémoire préallouée', r, 'vrai', r.horsMesure && r.ok && r.memoire);
  await s.fermer();
}

async function travelling() {
  const s = await ouvrir('paysage', { dt: 1 / 60 });
  await s.eval(PAS);
  const r = await s.eval(() => {
    const N = __N, S = __S, w = N.world;
    N.game.dbg.vague(1); N.game.dbg.god(true);
    S.input.mag = 0;
    /* le monde seul, au pas fixe : la machine d'états (nettoyage, cartes) ne l'arrête pas pendant l'essai */
    const pas = (n, f) => { for (let k = 0; k < n; k++) { w.update(1 / 120); if (f && f(k) === false) return k; } return n; };
    const out = {};
    /* une arène qui glisse : annoncée dès le premier instant, 2 s au moins */
    w.reset(); w.arena({ x0: 200, y0: 100, x1: 800, y1: 400 }, 0.5);
    out.arenaAnnonce = JSON.stringify(w.mursAnnonces()) === JSON.stringify([[200, 100, 800, 400]]) && JSON.stringify(S.monde.annonce) === JSON.stringify([[200, 100, 800, 400]]);
    let n = 0; pas(1200, () => { n++; if (!w.enMouvement()) return false; });
    out.arenaDuree = n / 120; out.arenaArrivee = [w.x0, w.y0, w.x1, w.y1];
    /* le TRAVELLING : mise en place, puis voyage à 12 px/s vers la droite */
    w.reset(); S.player.x = 300;
    w.travelling({ vx: 12, depuis: 'gauche' });
    const ann0 = w.mursAnnonces().map(a => a.slice());
    out.annonceDesLeDebut = ann0.length >= 1 && ann0[ann0.length - 1][2] === 1021;
    let place = 0; pas(1200, () => { place++; if (S.monde.vx > 0 && Math.abs(S.monde.vx - 12) < 1e-6 && w.x1 - w.x0 === 576) return false; });
    out.miseEnPlace = place / 120;
    const x0 = w.x0;
    pas(1200);
    out.vitesse = (w.x0 - x0) / (1200 / 120);
    let fin = 0; pas(120 * 120, () => { fin++; if (!w.enMouvement()) return false; });
    out.arret = { x0: w.x0, x1: w.x1, enMouvement: w.enMouvement(), annonces: w.mursAnnonces().length };
    out.dm = (() => { const d = w.distMur(w.x0 + 5, 256); return { pan: d.pan, mobile: d.mobile }; })();
    /* vers la gauche, sans mise en place (murs déjà là), avec attente */
    w.travelling({ vx: -8, depuis: w.x0, miseEnPlace: 0, attente: 1 });
    const xa = w.x0; pas(119); const pendantAttente = w.x0 === xa;
    pas(120 * 5); const v2 = (w.x0 - xa) / (599 / 120);
    const dm2 = w.distMur(w.x1 - 2, 256);
    out.gauche = { pendantAttente, v: v2, panDroiteMobile: dm2.pan === 'droite' && dm2.mobile };
    return out;
  });
  R.verifie('arène qui glisse : annoncée dès le premier instant, glissement de 2 s au moins', { annonce: r.arenaAnnonce, duree: r.arenaDuree, arrivee: r.arenaArrivee }, '≥ 2 s', r.arenaAnnonce && r.arenaDuree >= 2 && r.arenaArrivee.join() === '200,100,800,400');
  R.verifie('TRAVELLING : position finale annoncée dès le premier instant', r.annonceDesLeDebut, 'vrai', r.annonceDesLeDebut);
  R.verifie('TRAVELLING : vitesse mesurée sur 10 s', +r.vitesse.toFixed(4), '12 ± 1 %', Math.abs(r.vitesse - 12) <= 0.12, { miseEnPlace: r.miseEnPlace });
  R.verifie('TRAVELLING : arrêt au bord du monde', r.arret, 'x1 = 1021, immobile', r.arret.x1 === 1021 && !r.arret.enMouvement && r.arret.annonces === 0);
  R.verifie('TRAVELLING vers la gauche : attente, puis 8 px/s ; pan arrière mobile', r.gauche, '−8 ± 1 %', r.gauche.pendantAttente && Math.abs(r.gauche.v + 8) <= 0.08 && r.gauche.panDroiteMobile);
  const e = await s.err(); R.verifie('travelling : zéro erreur', e, '0', e.zero);
  await s.fermer();
}

/* le parcours qui longe les quatre murs, à V5, avec accélérations ; contrôle à chaque pas */
const PARCOURS = (o) => {
  const N = __N, S = __S, w = N.world;
  N.game.dbg.vague(5); N.game.dbg.god(true);
  /* le directeur est mis au repos pendant le parcours : la vague ne se nettoie pas, l'horloge ne s'arrête pas */
  window.__L1pas(2);
  N.dir.update = function () { };
  if (o.safe) { S.view.safe.l = o.safe.l; S.view.safe.t = o.safe.t; S.view.safe.r = o.safe.r; S.view.safe.b = o.safe.b; }
  N.cam.reset();
  const m = 22, X0 = w.x0 + m, X1 = w.x1 - m, Y0 = w.y0 + m, Y1 = w.y1 - m, cx = (w.x0 + w.x1) / 2, cy = (w.y0 + w.y1) / 2;
  /* tours dans les deux sens, coins, foncer dans chaque mur (retenue par god), demi-tours au ras du mur */
  const pts = [[X1, Y0], [X1, Y1], [X0, Y1], [X0, Y0], [X1, Y0], [cx, cy], [X0, Y0], [X0, Y1], [X1, Y1], [X1, Y0], [X0, Y0],
    [w.x1 + 60, cy, 1.2], [cx, cy], [w.x0 - 60, cy, 1.2], [cx, cy], [cx, w.y0 - 60, 1.2], [cx, cy], [cx, w.y1 + 60, 1.2], [cx, cy],
    [X1, cy], [X1 - 60, cy], [X1, cy + 40], [X0, cy + 40], [X0 + 60, cy + 40], [X0, cy - 40], [cx, Y0], [cx, Y0 + 60], [cx + 40, Y0], [cx + 40, Y1], [cx - 40, Y1 - 60], [cx - 40, Y1]];
  let SAUTES = []; let i = 0, tSeg = 0, n = 0, malCadre = 0, malDevant = 0, boostPas = 0, pire = { cadre: 1, devant: 1e9, ex: null };
  const Z = N.cam._zone();
  const portrait = Z.portrait, ymax = portrait ? 0.72 : 0.85;
  const lim = o.pas || 120 * 200;
  for (let k = 0; k < lim && i < pts.length; k++) {
    const p = S.player, P = pts[i];
    const dx = P[0] - p.x, dy = P[1] - p.y, d = Math.hypot(dx, dy);
    tSeg += 1 / 120;
    if ((P[2] ? tSeg > P[2] : d < 20) || tSeg > 8) { if (!P[2] && d >= 20) SAUTES.push(i); i++; tSeg = 0; continue; }
    S.input.x = dx / (d || 1); S.input.y = dy / (d || 1); S.input.mag = 1;
    /* accélération par bouffées, tant que la réserve le permet */
    S.input.boost = (Math.floor(k / 240) % 2 === 0) && p.reserve > 25;
    window.__L1pas(1);
    if (p.etat !== 'vivant') continue;
    n++;
    if (p.boost) boostPas++;
    const v = S.vue, fx = (p.x - v.x - Z.l) / Z.w, fy = (p.y - v.y - Z.t) / Z.h;
    const okC = fx >= 0.15 && fx <= 0.85 && fy >= 0.15 && fy <= ymax;
    if (!okC) malCadre++;
    const marge = Math.min(fx - 0.15, 0.85 - fx, fy - 0.15, ymax - fy); if (marge < pire.cadre) pire.cadre = marge;
    /* le trajet visible devant, recalculé ici sans N.cam : rayon le long du cap jusqu'au bord de la zone sûre */
    const c = Math.cos(p.ang), s = Math.sin(p.ang), ray = (ax0, ay0, ax1, ay1) => { let t = 1e9; if (c > 1e-6) t = Math.min(t, (ax1 - p.x) / c); else if (c < -1e-6) t = Math.min(t, (ax0 - p.x) / c); if (s > 1e-6) t = Math.min(t, (ay1 - p.y) / s); else if (s < -1e-6) t = Math.min(t, (ay0 - p.y) / s); return Math.max(0, t); };
    const vu = ray(v.x + Z.l, v.y + Z.t, v.x + Z.l + Z.w, v.y + Z.t + Z.h);
    const M = S.monde, dmur = ray(M.x0, M.y0, M.x1, M.y1);
    const exige = Math.min((p.boost ? 0.8 : 1.2) * p.vit, dmur + 16);
    if (vu < exige - 1e-6) malDevant++;
    if (vu - exige < pire.devant) { pire.devant = vu - exige; pire.ex = { vu: +vu.toFixed(2), exige: +exige.toFixed(2), boost: p.boost, v: p.vit }; }
  }
  return { pas: n, boostPas, points: i, total: pts.length, sautes: SAUTES, malCadre, malDevant, pire, Z: { l: Z.l, t: Z.t, w: Z.w, h: Z.h }, vitesse: S.player.vit, vague: S.vague && S.vague.n };
};

async function cadre() {
  const cas = [['paysage', null], ['portrait', null], ['bureau', null], ['paysage', { l: 24, t: 0, r: 24, b: 11 }], ['portrait', { l: 0, t: 24, r: 0, b: 17 }]];
  for (const [prof, safe] of cas) {
    const s = await ouvrir(prof, { dt: 1 / 60 });
    await s.eval(PAS);
    const r = await s.eval(PARCOURS, { safe });
    const nom = prof + (safe ? ' (zone sûre d’iPhone)' : '');
    R.verifie(`tête dans le cadre, ${nom} : pas hors de 15-85 % (${prof === 'portrait' ? '72 % en bas' : '85 %'})`, { horsCadre: r.malCadre, pas: r.pas, margeMin: +r.pire.cadre.toFixed(4), points: r.points + '/' + r.total, sautes: r.sautes }, '0 sur 100 %', r.malCadre === 0 && r.pas > 3000 && r.points === r.total);
    R.verifie(`trajet visible devant, ${nom} : pas sous min(1,2 s·v | 0,8 s·v, d_mur + 16)`, { sous: r.malDevant, pas: r.pas, pasEnAcceleration: r.boostPas, pire: r.pire.ex }, '0', r.malDevant === 0 && r.boostPas > 300);
    if (!safe) { const f = await s.capture('cadre'); R.capture(f); }
    const e = await s.err(); R.verifie(`cadre ${nom} : zéro erreur`, e, '0', e.zero);
    await s.fermer();
  }
}

async function monotonie() {
  for (const prof of ['paysage', 'bureau']) {
    const s = await ouvrir(prof, { dt: 1 / 60 });
    await s.eval(() => { const N = __N, S = __S; N.game.dbg.vague(2); N.game.dbg.god(true); N.joueuse.reset({ x: 120, y: 256, ang: 0 }); N.cam.reset(); S.input.x = 1; S.input.y = 0; S.input.mag = 1; });
    const r = await s.eval(() => new Promise(res => {
      const N = __N, S = __S, F = [0.02, 0.03, 0.05, 0.08, 0.2, 0.35, 0.4, 0.6, 1, 1.4], X = [];
      let n = 0;
      function f() { S.input.x = 1; S.input.y = 0; S.input.mag = 1; S.input.boost = (n % 200) > 150 && S.player.reserve > 30; X.push(N.cam.x); if (++n < 600) requestAnimationFrame(f); else res(X); }
      requestAnimationFrame(f);
    }));
    let recul = 0, entier = true, plans = 0;
    for (let i = 1; i < r.length; i++) { if (r[i] < r[i - 1]) recul++; if (!Number.isInteger(r[i])) entier = false; for (const f of [0.02, 0.03, 0.05, 0.08, 0.2, 0.35, 0.4, 0.6, 1, 1.4]) if (Math.floor(r[i] * f) < Math.floor(r[i - 1] * f)) plans++; }
    R.verifie(`caméra entière, ${prof} : reculs sur 600 images d'avancée (caméra et 10 plans de facteur 0,02 à 1,4)`, { reculsCamera: recul, reculsPlans: plans, entiere: entier, parcours: r[r.length - 1] - r[0] }, '0', recul === 0 && plans === 0 && entier && r[r.length - 1] - r[0] > 400);
    await s.fermer();
  }
}

async function rotation() {
  const s = await ouvrir('paysage', { dt: 1 / 60 });
  await s.eval(() => { __N.game.dbg.vague(2); __N.game.dbg.god(true); __N.pilote.niveau('bon'); __N.pilote.activer(true); });
  await s.images(120);
  const empreinte = () => s.eval(() => {
    const S = __S, ign = { view: 1, vue: 1, perf: 1, input: 1, frame: 1, tension: 1, ecran: 1 };   /* la fenêtre et l'interface (l'écran de pause s'anime en temps réel) */
    const o = {}; for (const k of Object.keys(S)) if (!ign[k]) o[k] = S[k];
    return JSON.stringify(o, (k, v) => (v instanceof Float32Array ? Array.from(v) : (typeof v === 'number' ? +v.toFixed(6) : v)));
  });
  /* horloge arrêtée (arrière-plan) : rien ne doit bouger pendant les rotations */
  await s.eval(() => { __S.paused = true; });
  await s.images(5);
  const a = await empreinte();
  const tailles = [[390, 844], [844, 390], [390, 844], [844, 390], [390, 844]], vues = [];
  for (const [w, h] of tailles) { await s.page.setViewportSize({ width: w, height: h }); await s.images(8); vues.push(await s.eval(() => [__N.gfx.W, __N.gfx.H])); }
  const b = await empreinte();
  R.verifie('rotation : cinq rotations, état du monde identique (empreinte de S hors fenêtre)', { identique: a === b, octets: a.length, vues }, 'identique', a === b && vues[0][0] === 195);
  /* en jouant : la tête reste dans le cadre après chaque rotation, zéro erreur */
  await s.eval(() => { __S.paused = false; if (__N.ui && __N.ui.actif()) __N.ui.fermer(); __N.game.dbg.etat('jeu', { reprise: true }); });
  const cad = [];
  for (const [w, h] of [[844, 390], [390, 844], [844, 390], [390, 844], [844, 390]]) {
    await s.page.setViewportSize({ width: w, height: h }); await s.images(30);
    cad.push(await s.eval(() => { const p = __S.player, v = __S.vue, Z = __N.cam._zone(); return [+((p.x - v.x - Z.l) / Z.w).toFixed(3), +((p.y - v.y - Z.t) / Z.h).toFixed(3), __N.game.etat()]; }));
  }
  const ok = cad.every(c => c[2] === 'jeu' && c[0] >= 0.15 && c[0] <= 0.85 && c[1] >= 0.15 && c[1] <= 0.85);
  R.verifie('rotation en jeu : tête dans le cadre après chaque rotation', cad, '15-85 %', ok);
  const e = await s.err(); R.verifie('rotation : zéro erreur', e, '0', e.zero);
  await s.fermer();
}

async function pasfixe() {
  const res = {};
  for (const fps of [30, 60, 120]) {
    const s = await ouvrir('paysage', { dt: 1 / fps, graine: 11 });
    await s.eval(() => { __N.journal.actif(true); __N.game.dbg.vague(1); __N.game.dbg.god(true); __N.pilote.niveau('bon'); __N.pilote.activer(true); __N.journal.dump({ vider: true }); });
    await s.eval(() => new Promise(r => { const f = () => (__N.horloge.t() >= 20 ? r() : requestAnimationFrame(f)); f(); }));
    res[fps] = await s.eval(() => {
      const J = __N.journal.dump(), d = x => x.d || x;
      const kills = J.filter(x => x.type === 'kill'), vagues = J.filter(x => x.type === 'vague');
      const p = __S.player;
      return { t: __N.horloge.t(), pas: __N.horloge.pas(), kills: kills.length, kill1: kills[0] ? kills[0].t : null, vague: vagues.map(v => d(v).evt + '@' + v.t.toFixed(3)), x: p.x, y: p.y, distance: null };
    });
    /* distance par seconde, en ligne droite, en temps de jeu */
    res[fps].distance = await s.eval(() => new Promise(r => {
      const N = __N, S = __S; N.pilote.activer(false); N.game.dbg.vague(1); N.game.dbg.god(true); N.joueuse.reset({ x: 200, y: 256, ang: 0 });
      S.input.x = 1; S.input.y = 0; S.input.mag = 1;
      const x0 = S.player.x, t0 = N.horloge.t();
      const f = () => { S.input.x = 1; S.input.y = 0; S.input.mag = 1; if (N.horloge.t() - t0 >= 3) r((S.player.x - x0) / (N.horloge.t() - t0)); else requestAnimationFrame(f); };
      f();
    }));
    await s.fermer();
  }
  const d = [30, 60, 120].map(f => res[f].distance), k = [30, 60, 120].map(f => res[f].kill1);
  const ecart = (a) => (Math.max(...a) - Math.min(...a)) / Math.min(...a);
  R.verifie('pas fixe : distance par seconde à 30, 60 et 120 images/s', d.map(x => +x.toFixed(3)), 'écart < 1 %', ecart(d) < 0.01);
  R.verifie('pas fixe : horaire de la partie (premier kill, vagues) à 30, 60 et 120 images/s', { premierKill: k, vagues: [30, 60, 120].map(f => res[f].vague.join(' ')) }, 'écart < 1 %', k.every(x => x !== null) && ecart(k) < 0.01);
}

async function simule() {
  /* 6 minutes de partie simulée, avec le pilote et dbg.god, chronométrées */
  const s = await ouvrir('paysage', { dt: 1 / 60, nodraw: true, query: { nodraw: '1' } });
  const r = await s.eval(() => {
    const N = __N; N.game.dbg.vague(1); N.game.dbg.god(true); N.pilote.niveau('bon'); N.pilote.activer(true);
    const t0 = performance.now(); const J = N.game.dbg.simuler(360); const ms = performance.now() - t0;
    return { ms, t: N.horloge.t(), entrees: J.length, etat: N.game.etat(), err: __ERR.count };
  });
  R.verifie('mode simulé : 6 min de partie (pilote, god)', { secondes: +(r.ms / 1000).toFixed(2), tJeu: +r.t.toFixed(1), entrees: r.entrees, etat: r.etat }, '< 15 s', r.ms < 15000 && r.err === 0);
  await s.fermer();
  /* le même début de partie, dessiné puis simulé : journaux identiques */
  const SEC = RAPIDE ? 15 : 40;
  const prep = () => { const N = __N; N.journal.actif(true); N.game.dbg.vague(1); N.pilote.niveau('bon'); N.pilote.activer(true); N.journal.dump({ vider: true }); };
  const a = await ouvrir('paysage', { dt: 1 / 60, graine: 5 });
  await a.eval(prep);
  await a.eval(sec => new Promise(r => { const f = () => (__N.horloge.t() >= sec ? r() : requestAnimationFrame(f)); f(); }), SEC);
  const Ja = await a.eval(() => __N.journal.dump());
  await a.fermer();
  const b = await ouvrir('paysage', { dt: 1 / 60, graine: 5, nodraw: true, query: { nodraw: '1' } });
  const Jb = await b.eval((sec) => { const N = __N; N.journal.actif(true); N.game.dbg.vague(1); N.pilote.niveau('bon'); N.pilote.activer(true); N.journal.dump({ vider: true }); return N.game.dbg.simuler(sec + 2); }, SEC);
  await b.fermer();
  const ignore = new Set(['perf', 'geste', 'section', 'bloc', 'sfx']);
  const norm = J => J.filter(x => !ignore.has(x.type)).map(x => JSON.stringify({ pas: x.pas, t: x.t, type: x.type, d: x.d }));
  const pasMax = Math.min(Ja[Ja.length - 1].pas, Jb[Jb.length - 1].pas);
  const A = norm(Ja.filter(x => x.pas <= pasMax)), B = norm(Jb.filter(x => x.pas <= pasMax));
  let diff = -1; for (let i = 0; i < Math.max(A.length, B.length); i++) if (A[i] !== B[i]) { diff = i; break; }
  const types = {}; for (const x of Ja) types[x.type] = (types[x.type] || 0) + 1;
  R.verifie(`mode simulé : journal identique au mode dessiné (${SEC} s de jeu, graine 5, pilote)`, { entrees: A.length, premiereDifference: diff, types, exemple: diff >= 0 ? [A[diff], B[diff]] : null }, 'identique', diff < 0 && A.length > 50);
}


/* le masque sur la scène charge : chaque pixel que la joueuse, l'arsenal et les icônes de vie posent porte son code.
   On dessine l'image deux fois : complète (masque armé), puis sans le module (sa fonction de dessin neutralisée) ;
   les pixels qui changent sont les siens, ils doivent porter ses codes. */
async function masqueCharge() {
  const s = await ouvrir('paysage', { dt: 1 / 60 });
  const r = await s.eval(() => {
    const N = __N, G = N.gfx;
    N.game.dbg.scene('charge'); N.game.dbg.god(true);
    N.game.dbg.simuler(1.5);                                  /* le canon a tiré */
    for (let k = 0; k < 60 && !(N.arsenal.tirs && N.arsenal.tirs.some(b => N.cam.visible(b.x, b.y, -2))); k++) N.game.dbg.simuler(0.03);
    const passe = () => { const m = N.game.dbg.masque(); return { m, b: new Uint8Array(G.buf()) }; };
    const ref = passe(), out = {};
    const essai = (nom, objs, codes) => {
      const sv = objs.map(([o, f]) => [o, f, o[f]]);
      for (const [o, f] of sv) o[f] = function () { };
      const sans = passe();
      for (const [o, f, v] of sv) o[f] = v;
      let n = 0, bons = 0; const vus = {};
      for (let i = 0; i < ref.b.length; i++) if (ref.b[i] !== sans.b[i]) { n++; const c = ref.m[i]; vus[c] = (vus[c] || 0) + 1; if (codes.includes(c)) bons++; }
      out[nom] = { pixels: n, avecLeurCode: bons, codes: vus };
    };
    essai('joueuse', [[N.joueuse, 'draw'], [N.joueuse, 'drawTop']], [1, 2]);
    essai('arsenal', [[N.arsenal, 'draw']], [3]);
    /* les icônes de vie : 2 vies en réserve, puis 0 */
    const v0 = N.score.vies; N.score.vies = 3; const a = passe(); N.score.vies = 0; const b = passe(); N.score.vies = v0;
    /* les icônes sont des têtes cyan : les pixels cyan qui apparaissent avec les vies */
    const cy = [N.pal.i('cyan'), N.pal.i('cyanPale')];
    let n = 0, bons = 0; for (let i = 0; i < a.b.length; i++) if (a.b[i] !== b.b[i] && cy.includes(a.b[i])) { n++; if (a.m[i] === 4) bons++; }
    out.vies = { pixels: n, avecLeurCode: bons };
    const comptes = {}; for (const c of ref.m) comptes[c] = (comptes[c] || 0) + 1;
    out.codes = comptes;
    return out;
  });
  for (const k of ['joueuse', 'arsenal', 'vies']) R.verifie(`masque, scène charge : pixels de ${k} portant leur code`, r[k], '100 %', r[k].pixels > 0 && r[k].avecLeurCode === r[k].pixels);
  R.note('codes du masque sur la scène charge : ' + JSON.stringify(r.codes));
  await s.fermer();
}

const T = { origine, masque, masqueCharge, travelling, cadre, monotonie, rotation, pasfixe, simule };
try {
  for (const [n, f] of Object.entries(T)) if (fait(n)) { console.log('== ' + n); try { await f(); } catch (e) { R.verifie(n + ' : exception', String(e && e.stack || e).slice(0, 400), 'aucune', false); } }
} finally { await fermerTout(); }
console.log('→ ' + R.ecrire());
process.exit(R.lignes.every(l => l.ok) ? 0 : 1);
