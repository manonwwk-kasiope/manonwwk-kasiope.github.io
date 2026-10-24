/* tools/L3a/criteres.mjs — les critères d'acceptation [U] du lot 3a (REFONTE.md § 8.3, LOT 3a), mesurés sur la
   page d'essai tools/L3a/index.html, pas à pas (tools/L3a/harnais.js gèle la boucle d'images et fait les pas).
     node tools/L3a/criteres.mjs [--seulement commandes,acceleration,…] [--rapide]
   Sortie : tools/L3a/sortie/criteres.json et un tableau dans la console. */
import fs from 'node:fs';
import path from 'node:path';
import { navigateur, ouvrir, capture, fermer, SORTIE, ICI } from './banc.mjs';

const argv = process.argv.slice(2);
const seul = (() => { const i = argv.indexOf('--seulement'); return i >= 0 ? argv[i + 1].split(',') : null; })();
const RAPIDE = argv.includes('--rapide');
const RES = [];
function noter(groupe, critere, seuil, mesure, ok, detail) {
  RES.push({ groupe, critere, seuil, mesure, ok: !!ok, detail });
  console.log(`${ok ? 'OK  ' : 'ÉCHEC'} [${groupe}] ${critere} — seuil : ${seuil} — mesure : ${mesure}`);
}
const HARNAIS = fs.readFileSync(path.join(ICI, 'harnais.js'), 'utf8');

const nav = await navigateur();
const { page, erreurs } = await ouvrir(nav, 'paysage');
await page.addScriptTag({ content: HARNAIS });
const ev = (fn, arg) => page.evaluate(fn, arg);
const veut = g => !seul || seul.includes(g);

/* ================================================================ commandes : J-02, J-03, J-05, J-06 */
if (veut('commandes')) {
  const r = await ev(() => {
    const L = L3, P = __S.player, out = {};
    L.bac({ ang: 0 }); L.pas(12);
    /* J-05 : le pas qui lit l'entrée tourne déjà */
    const a0 = P.ang; L.manche(Math.PI / 2, 1); L.pas(1); out.latencePas = P.ang !== a0 ? 1 : 0;
    /* J-06 : 90° en 350 ms au plus */
    let n = 1; while (Math.abs(P.ang - Math.PI / 2) > Math.PI / 180 && n < 240) { L.pas(1); n++; }
    out.quartMs = n / 120 * 1000;
    /* J-02 : doigt levé, le cap ne dérive pas */
    __S.input.mag = 0; const a1 = P.ang; let dm = 0;
    for (let i = 0; i < 240; i++) { L.pas(1); dm = Math.max(dm, Math.abs(P.ang - a1)); }
    out.deriveDeg = dm * 180 / Math.PI;
    /* J-03 : sous la zone morte, rien ne bouge */
    const a2 = P.ang; L.manche(Math.PI, 0.10); L.pas(120); out.zoneMorteDeg = Math.abs(P.ang - a2) * 180 / Math.PI;
    /* virage proportionnel : une petite poussée trace une courbe large */
    L.bac({ ang: 0 }); L.pas(12); L.manche(Math.PI / 2, 0.30); let m = 0; while (Math.abs(P.ang - Math.PI / 2) > Math.PI / 180 && m < 2400) { L.pas(1); m++; }
    out.quartLargeMs = m / 120 * 1000;
    /* la souris au bureau : au-delà de 24 px de la tête, le curseur donne le cap ; le clavier reprend la main */
    L.bac({ x: 512, y: 256, ang: 0 }); __S.input.mag = 0; const po = __S.input.pointer; po.actif = true;
    po.x = 10; po.y = 10; L.pas(1); po.x = 300; po.y = 20; L.pas(1);
    const att = Math.atan2(20 - (P.y - __N.cam.y), 300 - (P.x - __N.cam.x));
    out.souris = Math.abs(((P.angVise - att + 3 * Math.PI) % (2 * Math.PI)) - Math.PI) * 180 / Math.PI;
    __S.input.x = 0; __S.input.y = 1; __S.input.mag = 1; L.pas(1); __S.input.mag = 0; L.pas(5);
    out.sourisClavier = Math.abs(P.angVise - Math.PI / 2) * 180 / Math.PI;
    po.actif = false;
    return out;
  });
  noter('commandes', 'J-05 latence', '1 image', r.latencePas + ' pas (1/120 s)', r.latencePas === 1);
  noter('commandes', 'J-06 quart de tour', '≤ 350 ms (plan : 253 ms)', r.quartMs.toFixed(0) + ' ms', r.quartMs <= 350);
  noter('commandes', 'J-02 cap gardé doigt levé', 'dérive < 2° sur 2 s', r.deriveDeg.toFixed(3) + '°', r.deriveDeg < 2);
  noter('commandes', 'J-03 zone morte', 'cap inchangé sous 0,12 de course', r.zoneMorteDeg.toFixed(3) + '°', r.zoneMorteDeg < 0.5);
  noter('commandes', 'souris au bureau', 'le curseur donne le cap ; le clavier reprend la main', `écart au curseur ${r.souris.toFixed(2)}°, après le clavier ${r.sourisClavier.toFixed(2)}°`, r.souris < 1 && r.sourisClavier < 1);
  noter('commandes', 'déflexion proportionnelle', 'course 0,30 : virage plus large', r.quartLargeMs.toFixed(0) + ' ms pour 90°', r.quartLargeMs > r.quartMs * 2);
}

/* ================================================================ l'accélération */
if (veut('acceleration')) {
  const r = await ev(() => {
    const L = L3, P = __S.player, out = { poussees: [], montee: [] };
    /* 10 poussées droit devant : l'accélération en 120 ms + 1 image ; 95 % de la vitesse en 7 images */
    for (let i = 0; i < 10; i++) {
      L.bac({ ang: 0.3 + i * 0.37, x: 512, y: 256 }); __N.game.dbg.god(true); L.pas(24);
      const a = P.ang; L.manche(a, 1.0);
      let n = 0; while (!P.boost && n < 120) { L.pas(1); n++; }
      out.poussees.push(n / 120);
      const vmax = 68 * 1.6; let k = 0; while (P.vit < 0.95 * vmax && k < 60) { L.pas(1); k++; }
      out.montee.push(k / 120);
    }
    /* le slalom serré à pleine course pendant 60 s : jamais d'accélération ; rayon de 11 px */
    L.bac({ x: 512, y: 256, ang: 70 * Math.PI / 180 }); __N.game.dbg.god(true);
    let flip = 0, cote = 1, boosts = 0, rayons = [], px = P.x, py = P.y, pa = P.ang, moy = 0;
    for (let i = 0; i < 7200; i++) {
      if (i % 40 === 0) { cote = -cote; flip++; }
      moy = 0.6 * i / 120;                                              // l'axe du slalom tourne lentement : un grand cercle
      const a = moy + cote * 70 * Math.PI / 180;
      L.manche(a, 1.0); L.pas(1);
      if (P.boost || __N.joueuse._etat().boost.poussee) boosts++;
      const da = Math.abs(((P.ang - pa + 3 * Math.PI) % (2 * Math.PI)) - Math.PI), ds = Math.hypot(P.x - px, P.y - py);
      const w = __N.world, loin = P.x > w.x0 + 8 && P.x < w.x1 - 8 && P.y > w.y0 + 8 && P.y < w.y1 - 8;
      if (loin && da > 0.98 * P.vit / 11 / 120 && ds > 0) rayons.push(ds / da);   // un pas de virage à plein taux, loin des murs
      px = P.x; py = P.y; pa = P.ang;
    }
    rayons.sort((a, b) => a - b);
    out.slalom = { boosts, n: rayons.length, min: rayons[0], med: rayons[rayons.length >> 1], max: rayons[rayons.length - 1] };
    /* la coupure en virage : au-delà de 30°, suspendue au pas même ; retour à la croisière en 4 images */
    L.bac({ ang: 0, x: 300, y: 256 }); __N.game.dbg.god(true); __S.input.boost = true; L.pas(60);
    const avant = P.boost; L.manche(50 * Math.PI / 180, 0.8); L.pas(1); const apres = P.boost;
    let k = 0; while (P.vit > 68 * 1.05 && k < 60) { L.pas(1); k++; }
    out.coupure = { avant, apres, retourImages: k / 2 };
    /* reprise sous 15° si le geste est tenu, sans événement */
    const evAvant = L.ev.filter(e => e.nom === 'boost').length; L.pas(80); out.reprise = { boost: P.boost, evenements: L.ev.filter(e => e.nom === 'boost').length - evAvant };
    __S.input.boost = false; L.pas(2);
    /* un appui tenu 8 s : au plus 2 bascules, un seul son de panne */
    L.bac({ ang: 0, x: 200, y: 256 }); __N.game.dbg.god(true); const e0 = L.ev.length;
    __S.input.boost = true; L.pas(960); __S.input.boost = false; L.pas(1);
    const evs = L.ev.slice(e0).filter(e => e.nom === 'boost').map(e => e.c.evt);
    out.tenu = { evs, bascules: evs.filter(e => e === 'on' || e === 'panne').length, pannes: evs.filter(e => e === 'panne').length };
    /* la panne se lève à 25 points, ou sur un nouvel appui dès 10 */
    L.bac({ ang: 0, x: 200, y: 256 }); __N.game.dbg.god(true); __S.input.boost = true;
    let q = 0; while (!__N.joueuse._etat().boost.panne && q < 1200) { L.pas(1); q++; }
    __S.input.boost = false; q = 0; while (__N.joueuse._etat().boost.reserve < 12 && q < 1200) { L.pas(1); q++; }
    const enPanne = __N.joueuse._etat().boost.panne;
    __S.input.boost = true; L.pas(2); out.reappui10 = { reserve: __N.joueuse._etat().boost.reserve, boost: P.boost, enPanne };
    __S.input.boost = false; L.pas(2);
    /* le clavier qui pousse à fond ne déclenche jamais l'accélération */
    L.bac({ ang: 0, x: 200, y: 256 }); __N.game.dbg.god(true); __S.input.x = 1; __S.input.y = 0; __S.input.mag = 1; L.pas(240); out.clavier = P.boost;
    return out;
  });
  const pmax = Math.max(...r.poussees), mmax = Math.max(...r.montee);
  noter('acceleration', '10 poussées droit devant', '10/10 en 120 ms + 1 image', r.poussees.filter(t => t <= 0.12 + 1 / 60 + 1e-9).length + '/10, au plus ' + (pmax * 1000).toFixed(1) + ' ms', r.poussees.every(t => t <= 0.12 + 1 / 60 + 1e-9));
  noter('acceleration', 'montée', '95 % de la vitesse en 7 images', 'au plus ' + (mmax * 60).toFixed(2) + ' images', mmax * 60 <= 7 + 1e-6);
  noter('acceleration', 'slalom serré, 60 s', '0 accélération', r.slalom.boosts + ' pas accélérés', r.slalom.boosts === 0);
  noter('acceleration', 'rayon de virage', '11 px ± 1', `médiane ${r.slalom.med.toFixed(2)} (min ${r.slalom.min.toFixed(2)}, max ${r.slalom.max.toFixed(2)}, ${r.slalom.n} pas)`, Math.abs(r.slalom.med - 11) <= 1 && r.slalom.min >= 10 && r.slalom.max <= 12);
  noter('acceleration', 'coupure au-delà de 30°', 'suspendue en 1 image', `avant ${r.coupure.avant}, pas suivant ${r.coupure.apres}`, r.coupure.avant && !r.coupure.apres);
  noter('acceleration', 'retour à la croisière', '4 images', r.coupure.retourImages.toFixed(1) + ' images', r.coupure.retourImages <= 4);
  noter('acceleration', 'reprise sous 15°, geste tenu', 'reprise sans son ni bascule', `boost ${r.reprise.boost}, ${r.reprise.evenements} événement`, r.reprise.boost && r.reprise.evenements === 0);
  noter('acceleration', 'appui tenu 8 s', '≤ 2 bascules, 1 son de panne', `${r.tenu.bascules} bascules, ${r.tenu.pannes} panne (${r.tenu.evs.join(' ')})`, r.tenu.bascules <= 2 && r.tenu.pannes === 1);
  noter('acceleration', 'nouvel appui dès 10 points', 'repart', `en panne ${r.reappui10.enPanne}, réserve ${r.reappui10.reserve.toFixed(1)}, boost ${r.reappui10.boost}`, r.reappui10.enPanne && r.reappui10.boost && r.reappui10.reserve < 25);
  noter('acceleration', 'clavier à fond', 'jamais d\'accélération au pouce', 'boost ' + r.clavier, !r.clavier);
}

/* ================================================================ la mort au mur */
if (veut('mur')) {
  const r = await ev(() => {
    const L = L3, P = __S.player, w = __N.world, out = {};
    L.bac({ x: w.x1 - 30, y: 256, ang: 0 });
    const prevu = ((w.x1 - 3) - P.x) / P.vit + 0.06;
    let n = 0, depasse = 0;
    while (P.etat !== 'mort' && n < 600) { L.pas(1); n++; if (P.x > w.x1 - 3 + 1e-6) depasse++; }
    out.droit = { prevu, mesure: n / 120, cause: __S.death && __S.death.cause, depasse, x: P.x, limite: w.x1 - 3 };
    /* dix virages vers l'intérieur pendant la grâce, en rasant le mur sous des incidences de 2° à 8° */
    out.survies = [];
    for (let i = 0; i < 10; i++) {
      const inc = (2 + i * 0.65) * Math.PI / 180;
      L.bac({ x: w.x1 - 3 - 2.5, y: 150, ang: Math.PI / 2 - inc });
      let k = 0, reagi = -1;
      while (k < 240 && P.etat !== 'mort') {
        if (reagi < 0 && __N.joueuse._etat().murT > 0) { reagi = k; L.manche(Math.PI * 0.75, 1); }
        L.pas(1); k++;
      }
      out.survies.push({ inc: inc * 180 / Math.PI, vivante: P.etat !== 'mort', reagi });
    }
    /* le témoin : même rasage, sans réaction : la mort */
    L.bac({ x: w.x1 - 3 - 2.5, y: 150, ang: Math.PI / 2 - 5 * Math.PI / 180 }); L.pas(240); out.temoin = L.compte('mort') ? 'mort' : P.etat;
    return out;
  });
  const d = r.droit;
  noter('mur', 'droit dans le mur', `mort à ${(d.prevu * 1000).toFixed(1)} ms ± 1 image`, `${(d.mesure * 1000).toFixed(1)} ms, cause ${d.cause}`, Math.abs(d.mesure - d.prevu) <= 1 / 60 + 1e-9 && d.cause === 'mur');
  noter('mur', 'la tête ne passe jamais la limite', '0 pas au-delà de 3 px', d.depasse + ' pas', d.depasse === 0);
  noter('mur', 'virage vers l\'intérieur pendant la grâce', '10 sur 10 survivent', r.survies.filter(s => s.vivante).length + '/10 (incidences 2 à 7,9°)', r.survies.every(s => s.vivante));
  noter('mur', 'témoin sans réaction', 'mort', r.temoin, r.temoin === 'mort');
}

/* ================================================================ la morsure */
if (veut('morsure')) {
  const r = await ev(() => {
    const L = L3, P = __S.player, out = {};
    L.bac({ len: 30 }); let n = 0, avant = 0;
    while (P.etat !== 'mort' && n < 2400) {
      L.manche(P.ang + Math.PI / 2, 1);
      /* « jamais avant » : aucun pas vivant avec la tête à moins de 5,5 px d'un segment mordant */
      const s = P.segs; for (let k = 6; k < P.len - 3; k++) if (Math.hypot(s[2 * k] - P.x, s[2 * k + 1] - P.y) < 5.5) avant++;
      L.pas(1); n++;
    }
    out.spirale = { cause: __S.death && __S.death.cause, k: __N.joueuse._etat().morsureK, len: 30, t: n / 120, avant };
    out.courts = [];
    for (const len of [5, 8, 9]) {
      L.bac({ len }); let m = 0;
      while (P.etat !== 'mort' && m < 3600) { L.manche(P.ang + Math.PI / 2, 1); L.pas(1); m++; }
      out.courts.push({ len, vivante: P.etat !== 'mort', s: m / 120 });
    }
    return out;
  });
  const s = r.spirale;
  noter('morsure', 'spirale serrée', 'mord un segment ≥ 6 hors des 3 derniers', `cause ${s.cause}, segment ${s.k} sur ${s.len}, à ${s.t.toFixed(2)} s`, s.cause === 'morsure' && s.k >= 6 && s.k < s.len - 3);
  noter('morsure', 'jamais avant', '0 contact mordant survécu', s.avant + ' pas', s.avant <= 1);
  noter('morsure', '9 segments ou moins', 'jamais de morsure', r.courts.map(c => `L ${c.len} : ${c.vivante ? 'vivante' : 'MORTE'} après ${c.s.toFixed(0)} s`).join(' ; '), r.courts.every(c => c.vivante));
}

/* ================================================================ la coupe */
if (veut('coupe')) {
  const r = await ev(() => {
    const L = L3, P = __S.player, out = [];
    for (const k of [2, 5, 10, 17]) {
      L.bac({ len: 20, x: 200, y: 256, ang: 0, ennemisVivants: true }); L.pas(150);
      const sx = P.segs[2 * k], sy = P.segs[2 * k + 1];
      __N.ennemis.tir(sx + P.vit * 0.1, sy - 12, 0, 120, { vie: 1, src: { genre: 'ennemi', type: 'tourelle', id: null } });
      let n = 0; const L0 = P.len; while (P.len === L0 && n < 120) { L.pas(1); n++; }
      const cel = __N.butin.list.filter(b => b._coupe).length, tirs = __N.ennemis.tirs.length;
      const kc = (L.ev.find(e => e.nom === 'coupe') || { c: { k: -1 } }).c.k;   // le segment réellement touché
      const pr0 = L.ev.filter(e => e.nom === 'ramassage').length;
      L.pas(Math.round(120 * 2.95)); const a29 = __N.butin.list.filter(b => b._coupe).length + L.ev.filter(e => e.nom === 'ramassage').length - pr0;
      L.pas(Math.round(120 * 0.1)); const a305 = __N.butin.list.filter(b => b._coupe).length;
      out.push({ k: kc, vise: k, len: P.len, attendu: Math.max(3, kc), cellules: cel, attenduCel: Math.floor((20 - Math.max(3, kc)) / 2), tirs, a29, a305 });
    }
    return out;
  });
  noter('coupe', 'balle au segment k', 'longueur max(3, k)', r.map(c => `k ${c.k} → ${c.len}`).join(', '), r.every(c => c.len === c.attendu && c.k >= 1));
  noter('coupe', 'cellules de la coupe', '⌊(L − k) / 2⌋', r.map(c => `${c.cellules}/${c.attenduCel}`).join(', '), r.every(c => c.cellules === c.attenduCel));
  noter('coupe', 'expiration', 'présentes à 2,95 s, parties à 3,05 s', r.map(c => `${c.a29}→${c.a305}`).join(', ') + ' (reprises comprises)', r.every(c => c.a29 === c.attenduCel && c.a305 === 0));
  noter('coupe', 'le tir qui coupe disparaît', '0 tir restant', r.map(c => c.tirs).join(', '), r.every(c => c.tirs === 0));
}

/* ================================================================ le LASSO */
if (veut('lasso')) {
  const r = await ev(() => {
    const L = L3, P = __S.player, out = {};
    /* le guidage en cercle des pilotes (pilotes.md § 4.1), sans bruit */
    function cercle(cx, cy, rl, s, n, arret) {
      for (let i = 0; i < n; i++) {
        const d = Math.hypot(cx - P.x, cy - P.y), phi = Math.atan2(cy - P.y, cx - P.x), k = Math.max(-0.7, Math.min(0.7, 1.2 * (d - rl) / rl));
        L.manche(phi - s * (Math.PI / 2 - k), 0.8); L.pas(1);
        if (P.etat === 'mort' || (arret && arret())) return i;
      }
      return n;
    }
    /* six cibles fixes, un cercle autour : toutes détruites */
    L.bac({ len: 20, x: 400, y: 260, ang: 0 });
    const cx = 450, cy = 230, T = []; for (let i = 0; i < 6; i++) T.push(L.cible('mine', cx + Math.cos(i * Math.PI / 3) * 8, cy + Math.sin(i * Math.PI / 3) * 8));
    cercle(cx, cy, 24, 1, 1200, () => L.compte('lasso') > 0);
    const lv = L.ev.find(e => e.nom === 'lasso');
    out.six = { lasso: lv ? lv.c.n : 0, tues: L.ev.filter(e => e.nom === 'kill' && e.c.src.type === 'lasso').length, vivante: P.etat, ordre: L.ev.map(e => e.nom).filter(n => n === 'kill' || n === 'lasso').join(',') };
    /* fermeture sur les trois derniers segments : L = 40, cercle de la longueur du corps */
    L.bac({ len: 40, x: 300, y: 300, ang: 0 });
    /* un premier tour consume la traînée ; au second, la tête rejoint sa queue sur le cercle */
    let nb0 = __N.joueuse._etat().fermeture.nb;
    for (let i = 0; i < 3; i++) L.cible('mine', 330 + i * 6, 270);
    cercle(330, 270, 31, 1, 2400, () => __N.joueuse._etat().fermeture.nb > nb0);
    out.queue = { genre: __N.joueuse._etat().fermeture.genre, lasso: L.compte('lasso'), etat: P.etat };
    /* le cercle tenu ne se referme pas une deuxième fois tant que la tête ne quitte pas sa queue */
    cercle(330, 270, 31, 1, 240, () => false);                           // le cercle se stabilise
    nb0 = __N.joueuse._etat().fermeture.nb; cercle(330, 270, 31, 1, 600, () => false);
    out.queue.encore = __N.joueuse._etat().fermeture.nb - nb0;
    /* fermeture sur le corps ailleurs : la mort */
    L.bac({ len: 40, x: 300, y: 300, ang: 0 });
    cercle(330, 270, 18, 1, 2400, () => false);
    out.corps = { etat: P.etat, cause: __S.death && __S.death.cause };
    /* une boucle de moins de 300 px² ne fait rien ; une de 400 px² enferme */
    L.bac({ len: 20, x: 200, y: 400, ang: 0 });
    const c1 = L.cible('mine', 600, 300), petite = [592, 292, 607, 292, 607, 307, 592, 307];
    const r1 = __N.joueuse._boucle(petite), vivant1 = c1.etat !== 'mort';
    __N.joueuse._etat(); L.pas(120);
    const grande = [590, 290, 610, 290, 610, 310, 590, 310], r2 = __N.joueuse._boucle(grande);
    out.aire = { petite: r1, cibleVivante: vivant1, grande: r2, cibleApres: c1.etat, lasso: L.compte('lasso') };
    /* la durée de la traînée : 1,2 + 0,02 L */
    out.traine = [];
    for (const len of [8, 20, 40]) { L.bac({ len, x: 120, y: 256, ang: 0 }); L.pas(Math.round(120 * (len * 5 / 68 + 2.6))); const e = __N.joueuse._etat(); out.traine.push({ len, attendu: 1.2 + 0.02 * len, mesure: e.ageTraine }); }
    /* l'annonce : à 14 px d'un point refermable, il clignote */
    L.bac({ len: 20, x: 400, y: 260, ang: 0 }); let vu = false; const nb1 = __N.joueuse._etat().fermeture.nb;
    cercle(450, 230, 24, 1, 1200, () => { if (__N.joueuse._etat().annonce) vu = true; return L.compte('lasso') > 0 || __N.joueuse._etat().fermeture.nb > nb1; });
    out.annonce = vu;
    return out;
  });
  noter('lasso', 'cercle autour de 6 cibles fixes', '6 détruites, puis \'lasso\'', `lasso ×${r.six.lasso}, ${r.six.tues} tuées au lasso, ${r.six.vivante} (${r.six.ordre})`, r.six.lasso === 6 && r.six.tues === 6 && /kill.*lasso$/.test(r.six.ordre));
  noter('lasso', 'fermeture sur les 3 derniers segments', 'un lasso', `fermeture « ${r.queue.genre} », ${r.queue.lasso} lasso, ${r.queue.etat}`, r.queue.genre === 'queue' && r.queue.lasso === 1 && r.queue.etat !== 'mort');
  noter('lasso', 'cercle tenu', 'pas de deuxième fermeture sans quitter la queue', `${r.queue.encore} fermeture en 5 s`, r.queue.encore === 0);
  noter('lasso', 'fermeture sur le corps ailleurs', 'la mort', `${r.corps.etat} (${r.corps.cause})`, r.corps.etat === 'mort' && r.corps.cause === 'morsure');
  noter('lasso', 'boucle de moins de 300 px²', 'ne fait rien', `225 px² : ${r.aire.petite}, cible ${r.aire.cibleVivante ? 'vivante' : 'morte'} ; 400 px² : ${r.aire.grande}, cible ${r.aire.cibleApres}`, !r.aire.petite && r.aire.cibleVivante && r.aire.grande && r.aire.cibleApres === 'mort' && r.aire.lasso === 1);
  noter('lasso', 'durée de la traînée', '1,2 + 0,02 L ± 1 image', r.traine.map(t => `L ${t.len} : ${t.mesure.toFixed(3)} s (${t.attendu.toFixed(2)})`).join(' ; '), r.traine.every(t => Math.abs(t.mesure - t.attendu) <= 1 / 60));
  noter('lasso', 'annonce du point refermable', 'clignote à 14 px', String(r.annonce), r.annonce);
}

/* ================================================================ le LASSO bruité */
if (veut('bruite')) {
  const NG = RAPIDE ? 10 : 50;
  const r = await ev((NG) => {
    const L = L3, P = __S.player, out = {};
    for (const len of [8, 20, 40]) {
      let ok = 0; const echecs = [];
      for (let g = 1; g <= NG; g++) {
        L.graine = g * 7919 + len;
        const a0 = L.rnd() * Math.PI * 2;
        L.bac({ len, x: 512, y: 256, ang: a0, graine: g });
        const v = 68, T = 1.2 + 0.02 * len, rmax = 0.85 * (v * T + 5 * (len - 3)) / (2 * Math.PI);
        const rl = Math.max(14, Math.min(30, rmax)), off = a0 + (L.rnd() - 0.5) * 1.2;
        const cx = P.x + Math.cos(off) * (rl + 30), cy = P.y + Math.sin(off) * (rl + 30);
        for (let i = 0; i < 6; i++) L.cible('mine', cx + Math.cos(i * Math.PI / 3) * 6, cy + Math.sin(i * Math.PI / 3) * 6);
        /* le sens : celui dont le cap initial est le plus proche du cap réel */
        const phi0 = Math.atan2(cy - P.y, cx - P.x);
        const dif = s => Math.abs(((phi0 - s * Math.PI / 2 - P.ang + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
        const s = dif(1) < dif(-1) ? 1 : -1;
        const file = []; const R = 14; let bruit = 0, tb = 0, fini = false;
        for (let i = 0; i < 960 && !fini; i++) {
          if (i - tb >= 30 || i === 0) { tb = i; bruit = (L.rnd() * 2 - 1) * 10 * Math.PI / 180; }
          const d = Math.hypot(cx - P.x, cy - P.y), phi = Math.atan2(cy - P.y, cx - P.x), k = Math.max(-0.7, Math.min(0.7, 1.2 * (d - rl) / rl));
          file.push(phi - s * (Math.PI / 2 - k) + bruit);
          if (file.length > R) L.manche(file.shift(), 0.8); else __S.input.mag = 0;
          L.pas(1);
          if (P.etat === 'mort') { echecs.push(g + ':mort'); fini = true; }
          const lv = L.ev.find(e => e.nom === 'lasso');
          if (lv) { if (lv.c.n === 6) ok++; else echecs.push(g + ':n' + lv.c.n); fini = true; }
        }
        if (!fini) echecs.push(g + ':temps');
      }
      out[len] = { ok, n: NG, echecs: echecs.slice(0, 8) };
    }
    return out;
  }, NG);
  for (const len of [8, 20, 40]) noter('lasso bruité', `± 10°, 120 ms, L = ${len}`, '≥ 80 % des graines', `${r[len].ok}/${r[len].n}${r[len].echecs.length ? ' (' + r[len].echecs.join(' ') + ')' : ''}`, r[len].ok >= 0.8 * r[len].n);
}

/* ================================================================ la réapparition */
if (veut('reapparition')) {
  const NM = RAPIDE ? 40 : 200;
  const r = await ev((NM) => {
    const L = L3, P = __S.player, w = __N.world, out = { min: 1e9, sous48: 0, n: 0, vue: 0 };
    const types = ['fleche', 'mine', 'tourelle', 'sentinelle', 'dard', 'larve'];
    for (let i = 0; i < NM; i++) {
      L.graine = 1000 + i;
      L.bac({ x: 150 + L.rnd() * 720, y: 120 + L.rnd() * 270, ang: L.rnd() * 6.28, len: 8 + Math.floor(L.rnd() * 30), ennemisVivants: false });
      const n = 10 + Math.floor(L.rnd() * 30);
      for (let k = 0; k < n; k++) L.cible(types[k % types.length], P.x + (L.rnd() - 0.5) * 500, P.y + (L.rnd() - 0.5) * 300);
      for (let k = 0; k < 40; k++) __N.ennemis.tir(P.x + (L.rnd() - 0.5) * 500, P.y + (L.rnd() - 0.5) * 300, 0, 0, { vie: 30 });
      __N.cam.reset(P.x, P.y); L.pas(1);
      __N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null });
      __N.joueuse.reset({ reapparition: true });
      let m = 1e9;
      for (const e of __N.ennemis.list) if (e.etat !== 'mort') m = Math.min(m, Math.hypot(e.x - P.x, e.y - P.y));
      for (const t of __N.ennemis.tirs) m = Math.min(m, Math.hypot(t.x - P.x, t.y - P.y));
      out.min = Math.min(out.min, m); if (m <= 48) out.sous48++; out.n++;
      const v = __S.vue; if (P.x >= v.x && P.x <= v.x + v.w && P.y >= v.y && P.y <= v.y + v.h) out.vue++;
      if (P.x < w.x0 + 40 - 1e-6 || P.x > w.x1 - 40 + 1e-6 || P.y < w.y0 + 40 - 1e-6 || P.y > w.y1 - 40 + 1e-6) out.murs = (out.murs || 0) + 1;
    }
    /* l'invulnérabilité, par le vrai chemin : la séquence de mort de 79-jeu, puis la réapparition */
    L.bac({ x: 512, y: 256 }); __N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null });
    let k = 0; while (P.etat !== 'reapparition' && k < 600) { L.pas(1); k++; }
    out.sequence = k / 120;
    __N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null }); out.parTir = P.etat;
    k = 0; while (P.etat === 'reapparition' && k < 360) { L.pas(1); k++; }
    out.invul = k / 120;
    return out;
  }, NM);
  /* jamais contre le mur : pendant l'invulnérabilité, le mur de l'arène glisse sur la tête */
  const m = await ev(() => {
    const L = L3, P = __S.player;
    L.bac({ x: 512, y: 256 }); __N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null });
    let k = 0; while (P.etat !== 'reapparition' && k < 600) { L.pas(1); k++; }
    __N.world.arena({ x0: P.x - 5, y0: P.y - 5, x1: P.x + 5, y1: P.y + 5 }, 0.25);   // les murs se referment sur la tête
    let mortInvul = null; k = 0;
    while (P.etat !== 'mort' && k < 240) { const iv = __N.joueuse._etat().invul; L.pas(1); k++; if (P.etat === 'mort') mortInvul = iv; }
    const r = { etat: P.etat, cause: __S.death && __S.death.cause, auteur: __S.death && __S.death.auteur, invul: mortInvul };
    __N.world.reset();
    return r;
  });
  const p = await ev(() => {
    const L = L3, P = __S.player;
    L.bac({ x: 512, y: 256 }); __N.arsenal.monter('canon'); __N.arsenal.monter('canon');
    const avant = __N.arsenal.niveau('canon');
    __N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null });
    __N.joueuse.reset({ reapparition: true });
    return { avant, apres: __N.arsenal.niveau('canon'), etiquette: __N.joueuse._etiquette(), len: P.len };
  });
  noter('reapparition', 'point sûr', `> 48 px de toute menace, ${NM} morts`, `${r.n - r.sous48}/${r.n} (plus proche menace : ${r.min.toFixed(1)} px ; dans la vue : ${r.vue}/${r.n})`, r.sous48 === 0);
  noter('reapparition', 'à 40 px des murs', '100 %', `${r.n - (r.murs || 0)}/${r.n}`, !r.murs);
  noter('reapparition', 'séquence de mort', 'la joueuse revient après 1,3 s', (r.sequence * 1000).toFixed(0) + ' ms', Math.abs(r.sequence - 1.3) <= 1 / 60 + 1e-9);
  noter('reapparition', 'invulnérabilité', '1,0 s ± 1 image', (r.invul * 1000).toFixed(1) + ' ms', Math.abs(r.invul - 1) <= 1 / 60 + 1e-9);
  noter('reapparition', 'invulnérable contre un tir', 'le tir ne tue pas', r.parTir, r.parTir === 'reapparition');
  noter('reapparition', 'jamais contre le mur', 'le mur tue pendant l\'invulnérabilité', `${m.etat} (${m.cause}, ${m.auteur}) avec ${m.invul === null ? '?' : m.invul.toFixed(2)} s d'invulnérabilité restante`, m.etat === 'mort' && m.cause === 'mur' && m.invul > 0);
  noter('reapparition', 'perte de palier', 'CANON III → II, étiquette', `${p.avant} → ${p.apres}, « ${p.etiquette} »`, p.avant === 3 && p.apres === 2 && p.etiquette === 'CANON III → II');
}

/* ================================================================ le CANON */
if (veut('canon')) {
  const r = await ev(() => {
    const L = L3, P = __S.player, out = [];
    for (let niv = 1; niv <= 4; niv++) {
      L.bac({ x: 150, y: 256, ang: 0, arsenal: true });
      for (let q = 1; q < niv; q++) __N.arsenal.monter('canon');
      const e = L.cible('tourelle', P.x + 60, P.y, 1e9);
      const hit0 = __N.ennemis.hit; let dmg = 0, coups = 0;
      __N.ennemis.hit = function (x, d, s) { if (x === e) { dmg += d; coups++; return true; } return hit0(x, d, s); };
      const place = () => { e.x = P.x + 60; e.y = P.y; };
      L.pas(120, place); dmg = 0; coups = 0;
      L.pas(600, place);
      __N.ennemis.hit = hit0;
      out.push({ niv, dps: dmg / 5, coups: coups / 5 });
    }
    /* III perce : deux cibles en ligne, la même lance les touche toutes les deux */
    L.bac({ x: 150, y: 256, ang: 0, arsenal: true }); __N.arsenal.monter('canon'); __N.arsenal.monter('canon');
    const a = L.cible('tourelle', P.x + 50, P.y, 1e9), b = L.cible('tourelle', P.x + 80, P.y, 1e9);
    const h0 = __N.ennemis.hit; let na = 0, nb = 0;
    __N.ennemis.hit = function (x, d, s) { if (x === a) na++; else if (x === b) nb++; return true; };
    L.pas(240, () => { a.x = P.x + 50; a.y = P.y; b.x = P.x + 80; b.y = P.y; });
    __N.ennemis.hit = h0;
    /* le RAYON efface les tirs ennemis qu'il croise */
    L.bac({ x: 150, y: 256, ang: 0, arsenal: true, ennemisVivants: true }); for (let q = 0; q < 3; q++) __N.arsenal.monter('canon');
    L.pas(10);
    for (let k = 0; k < 6; k++) __N.ennemis.tir(P.x + 30 + k * 18, P.y - 40, 0, 120, { vie: 2 });
    L.pas(60);
    return { dps: out, perce: { na, nb }, rayonTirs: __N.ennemis.tirs.length };
  });
  const att = [65, 90, 96, 210];
  noter('canon', 'DPS sur cible fixe', '± 10 % de 65 / 90 / 96 / 210', r.dps.map((d, i) => `${['I', 'II', 'III', 'RAYON'][i]} ${d.dps.toFixed(1)}`).join(', '), r.dps.every((d, i) => Math.abs(d.dps - att[i]) <= 0.1 * att[i]));
  noter('canon', 'III perce 2', 'la lance touche deux cibles en ligne', `cible 1 : ${r.perce.na}, cible 2 : ${r.perce.nb} touchers en 2 s`, r.perce.na >= 8 && r.perce.nb >= 0.75 * r.perce.na);
  noter('canon', 'RAYON efface les tirs', '0 tir ennemi traversé', r.rayonTirs + ' tirs restants', r.rayonTirs === 0);
}

/* ================================================================ TRAVERSÉE, BOUCLIER, APOGÉE, ACTIONS AUTO */
if (veut('pouvoirs')) {
  const r = await ev(() => {
    const L = L3, P = __S.player, N = __N, out = {};
    const kill = (type, elite, src) => N.ev.emit('kill', { id: 5000 + L.ev.length, type, x: 0, y: 0, elite: !!elite, boss: false, base: 50, src: src || { genre: 'arme', type: 'canon', id: null }, distTete: 0, gen: 0 });
    /* TRAVERSÉE : un tir à la tête et un tir au corps passent ; le mur tue quand même */
    L.bac({ len: 20, x: 300, y: 256, ang: 0, ennemisVivants: true }); N.cartes.choisir('traversee'); L.pas(60);
    __S.input.pouvoir = true; L.pas(1);
    const actif = N.joueuse._etat().pouvoir.actif;
    N.ennemis.tir(P.x + 20, P.y, -150, 0, { vie: 1, src: { genre: 'ennemi', type: 'tourelle', id: null } });
    const k = 8; N.ennemis.tir(P.segs[2 * k] + 6, P.segs[2 * k + 1] - 10, 0, 100, { vie: 1, src: { genre: 'ennemi', type: 'tourelle', id: null } });
    L.pas(40);
    out.traversee = { actif, etat: P.etat, len: P.len, coupes: L.compte('coupe'), debut: L.ev.filter(e => e.nom === 'pouvoir').map(e => e.c.evt).join(',') };
    L.pas(160); out.traversee.fin = N.joueuse._etat().pouvoir; out.traversee.evts = L.ev.filter(e => e.nom === 'pouvoir').map(e => e.c.evt).join(',');
    L.bac({ len: 10, x: N.world.x1 - 20, y: 256, ang: 0 }); N.cartes.choisir('traversee'); __S.input.pouvoir = true; L.pas(60);
    out.traverseeMur = { etat: L.compte('mort') ? 'mort' : P.etat, cause: __S.death && __S.death.cause };
    /* BOUCLIER : un coup à la tête absorbé, puis la charge revient en 20 s */
    L.bac({ len: 12, x: 300, y: 256, ang: 0 }); N.cartes.choisir('bouclier');
    const a1 = N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null }), c1 = N.joueuse._etat().bouclier.charge;
    L.pas(120); const a2 = N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null });
    out.bouclier = { premier: a1, charge: c1, coupAbsorbe: L.ev.filter(e => e.nom === 'coup' && e.c.absorbe).length, second: a2, mur: null };
    L.bac({ len: 12, x: 300, y: 256, ang: 0 }); N.cartes.choisir('bouclier');
    N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null }); N.game.dbg.god(true);   // l'immortalité garde la joueuse en vie aux murs
    L.pas(Math.round(120 * 19.9)); const r199 = N.joueuse._etat().bouclier.charge;
    L.pas(Math.round(120 * 0.2)); out.bouclier.recharge = [r199, N.joueuse._etat().bouclier.charge];
    /* la jauge de l'APOGÉE : +2 ordinaire, +12 élite, +20 noyau, +3 par enfermé, +2 dévoré, rien pour l'accélération */
    L.bac({ len: 12, x: 300, y: 256, ang: 0 });
    const j = () => N.joueuse._etat().apogee.jauge, jj = [];
    kill('fleche'); jj.push(j()); kill('fleche', true); jj.push(j());
    N.ev.emit('ramassage', { type: 'noyau', x: 0, y: 0, valeur: 1 }); jj.push(j());
    N.ev.emit('lasso', { n: 3, ids: [1, 2, 3], aire: 400, x: 0, y: 0, poly: [0, 0, 10, 0, 10, 10] }); jj.push(j());
    kill('larve', false, { genre: 'joueuse', type: 'devore', id: null }); jj.push(j());
    __S.input.boost = true; L.pas(120); __S.input.boost = false; jj.push(j());
    out.jauge = jj;
    /* l'APOGÉE : 6 anneaux en 90 ms, 12 dégâts, les tirs effacés ; le monde ralenti, un gel */
    L.bac({ len: 12, x: 512, y: 256, ang: 0, ennemisVivants: false });
    for (let q = 0; q < 50; q++) kill('fleche');
    const pres = L.cible('fleche', P.x + 20, P.y), moyen = L.cible('fleche', P.x + 90, P.y + 10), loin = L.cible('fleche', P.x + 240, P.y - 40);
    for (let q = 0; q < 8; q++) N.ennemis.tir(P.x - 100 + q * 25, P.y + 60, 0, 0, { vie: 30 });
    const tirs0 = N.ennemis.tirs.length;
    L.pas(30);                                                        // les gels des kills de remplissage passent
    __S.input.apogee = true; let qq = 0; while (!N.joueuse._etat().apogee.on && qq < 30) { L.pas(1); qq++; }
    const k0 = N.fx.k(), gel = N.horloge.gele(), j0 = j();
    /* le temps actif (hors gels) entre deux anneaux */
    let anneaux = [], pas = 0, tact = 0; while (N.joueuse._etat().apogee.on && pas < 400) { L.pas(1); pas++; if (!N.horloge.gele()) tact++; const a = N.joueuse._etat().apogee.anneaux; if (a > anneaux.length + 1) anneaux.push(tact); }
    out.apogee = { ralenti: k0, gel, anneaux, pres: pres.etat, moyen: moyen.etat, loin: loin.etat, loinPv: loin.pv, tirs: [tirs0, N.ennemis.tirs.length], jauge: j0, evts: L.ev.filter(e => e.nom === 'apogee').map(e => e.c.evt).join(',') };
    /* ACTIONS AUTO : la TRAVERSÉE part seule avant un tir ; l'APOGÉE part seule, pleine, avec 8 ennemis en vue */
    L.bac({ len: 14, x: 300, y: 256, ang: 0, ennemisVivants: true, actions: 'auto' }); N.cartes.choisir('traversee'); L.pas(20);
    N.ennemis.tir(P.x + 70, P.y, -160, 0, { vie: 2, src: { genre: 'ennemi', type: 'tourelle', id: null } });
    let tAuto = -1; for (let q = 0; q < 120 && L.compte('mort') === 0; q++) { L.pas(1); if (tAuto < 0 && N.joueuse._etat().pouvoir.actif > 0) tAuto = q; }
    out.auto = { traversee: tAuto, mort: L.compte('mort') };
    L.bac({ len: 14, x: 400, y: 256, ang: 0, actions: 'auto' }); for (let q = 0; q < 50; q++) kill('fleche');
    for (let q = 0; q < 7; q++) L.cible('fleche', P.x + 60 + q * 12, P.y - 50); L.pas(5); const sept = N.joueuse._etat().apogee.on;
    L.cible('fleche', P.x + 60, P.y + 50); L.pas(2); out.auto.apogee = { sept, huit: N.joueuse._etat().apogee.on || L.ev.some(e => e.nom === 'apogee' && e.c.evt === 'debut') };
    L.bac({ len: 14, x: 400, y: 256, ang: 0, actions: 'doigts', ennemisVivants: true }); N.cartes.choisir('traversee'); L.pas(20);
    N.ennemis.tir(P.x + 70, P.y, -160, 0, { vie: 2, src: { genre: 'ennemi', type: 'tourelle', id: null } }); L.pas(80);
    out.auto.sansAuto = L.compte('mort');
    return out;
  });
  const t = r.traversee;
  noter('pouvoirs', 'TRAVERSÉE : rien ne coupe, rien ne tue', 'tir à la tête et au corps : passent', `${t.etat}, longueur ${t.len}, ${t.coupes} coupe, événements ${t.debut}`, t.actif > 1.3 && t.etat === 'vivant' && t.len === 20 && t.coupes === 0);
  noter('pouvoirs', 'TRAVERSÉE : 1,4 s puis recharge de 12 s', 'début, fin, recharge', `${t.evts}, recharge restante ${t.fin.recharge.toFixed(2)} s`, /debut,fin/.test(t.evts) && Math.abs(t.fin.recharge - (12 - (200 / 120 - 1.4 - 1 / 120))) < 0.05);
  noter('pouvoirs', 'TRAVERSÉE : sauf le mur', 'le mur tue', `${r.traverseeMur.etat} (${r.traverseeMur.cause})`, r.traverseeMur.etat === 'mort' && r.traverseeMur.cause === 'mur');
  const b = r.bouclier;
  noter('pouvoirs', 'BOUCLIER', 'un coup absorbé, puis la mort ; recharge en 20 s', `1er : ${b.premier ? 'mort' : 'absorbé'} (coup absorbé ${b.coupAbsorbe}), 2e : ${b.second ? 'mort' : 'absorbé'} ; charge à 19,9 s : ${b.recharge[0]}, à 20,1 s : ${b.recharge[1]}`, !b.premier && b.coupAbsorbe === 1 && b.second && b.recharge[0] === 0 && b.recharge[1] === 1);
  noter('pouvoirs', 'jauge de l\'APOGÉE', '+2, +12, +20, +3 n, +2, 0 en accélération', r.jauge.join(' → '), JSON.stringify(r.jauge) === JSON.stringify([2, 14, 34, 43, 45, 45]));
  const a = r.apogee, ec = a.anneaux.map((p, i) => i ? p - a.anneaux[i - 1] : 0).slice(1);
  noter('pouvoirs', 'APOGÉE : 6 anneaux toutes les 90 ms', '6 anneaux, 90 ms de temps actif (hors gels)', `${a.anneaux.length + 1} anneaux, écarts ${ec.map(x => (x * 1000 / 120).toFixed(0)).join('/')} ms`, a.anneaux.length === 5 && ec.every(x => Math.abs(x * 1000 / 120 - 90) <= 9));
  noter('pouvoirs', 'APOGÉE : dégâts et tirs effacés', '12 par anneau ; tirs effacés', `près : ${a.pres}, à 90 px : ${a.moyen}, à 243 px : ${a.loin} (${a.loinPv} PV) ; tirs ${a.tirs[0]} → ${a.tirs[1]}`, a.pres === 'mort' && a.moyen === 'mort' && a.loin !== 'mort' && a.loinPv === 8 && a.tirs[1] === 0);
  noter('pouvoirs', 'APOGÉE : ralenti et gel', 'monde à 0,25, gel', `k = ${a.ralenti}, gel ${a.gel}, jauge ${a.jauge}, ${a.evts}`, a.ralenti === 0.25 && a.gel && a.jauge === 0 && /debut,fin/.test(a.evts));
  noter('pouvoirs', 'ACTIONS AUTO : TRAVERSÉE', 'part seule avant le tir, survie', `déclenchée au pas ${r.auto.traversee}, ${r.auto.mort} mort (sans AUTO : ${r.auto.sansAuto} mort)`, r.auto.traversee >= 0 && r.auto.mort === 0 && r.auto.sansAuto === 1);
  noter('pouvoirs', 'ACTIONS AUTO : APOGÉE', 'pleine et 8 ennemis en vue', `7 ennemis : ${r.auto.apogee.sept ? 'partie' : 'attend'} ; 8 : ${r.auto.apogee.huit ? 'partie' : 'attend'}`, !r.auto.apogee.sept && r.auto.apogee.huit);
}

/* ================================================================ le butin et la PASTILLE */
if (veut('butin')) {
  const r = await ev(() => {
    const L = L3, P = __S.player, N = __N, B = N.butin, out = {};
    /* l'aimant : 28 px, puis 48 avec AIMANT ; vol vers la tête à 220 px/s ; prise à 8 px */
    function aimant(d) {
      L.bac({ len: 8, x: 400, y: 256, ang: 0 }); __S.input.mag = 0;
      B.lacher(P.x + 2, P.y + d, 1); const c = B.list[0]; L.pas(Math.round(0.13 * 120));   // allumage
      const x0 = c.x, y0 = c.y; L.pas(6); const v = Math.hypot(c.x - x0, c.y - y0) / (6 / 120);
      return { tire: Math.hypot(c.x - x0, c.y - (y0)) > 0.5, v };
    }
    out.a27 = aimant(26); out.a30 = aimant(31);
    L.bac({ len: 8 }); N.cartes.choisir('aimant'); const m1 = N.cartes.mods.aimant;
    B.lacher(P.x + 2, P.y + 46, 1); const c46 = B.list[0]; L.pas(18); const y46 = c46.y; L.pas(4); out.aimant48 = { mods: m1, tire: Math.abs(c46.y - y46) > 1 };
    /* la prise, et l'événement */
    L.bac({ len: 8, x: 400, y: 256, ang: 0 }); B.lacher(P.x + 30, P.y, 1); L.pas(60);
    out.prise = { ramasse: L.compte('ramassage'), len: P.len };
    /* le noyau : +2 segments, +20 APOGÉE */
    L.bac({ len: 8, x: 400, y: 256, ang: 0 }); B.lacher(P.x + 30, P.y, 1, { type: 'noyau' }); L.pas(60);
    out.noyau = { len: P.len, apogee: N.joueuse._etat().apogee.jauge, type: (L.ev.find(e => e.nom === 'ramassage') || { c: {} }).c.type };
    /* la PASTILLE : jamais aimantée ; prise à 8 px ; expire en 12 s, clignote les 2 dernières */
    L.bac({ len: 8, x: 400, y: 256, ang: 0 }); __S.input.mag = 0; B.lacher(P.x - 20, P.y + 12, 1, { type: 'pastille' }); const pa = B.list[0]; L.pas(30);
    const px0 = pa.x, py0 = pa.y; L.pas(60); out.pastille = { bouge: Math.hypot(pa.x - px0, pa.y - py0), vie: pa.vie };
    L.bac({ len: 8, x: 400, y: 256, ang: 0 }); B.lacher(P.x + 40, P.y, 1, { type: 'pastille' }); L.pas(90);
    out.pastille.prise = (L.ev.find(e => e.nom === 'ramassage') || { c: {} }).c.type;
    L.bac({ len: 8, x: 200, y: 100, ang: 0, god: true }); B.lacher(600, 400, 1, { type: 'pastille' }); L.pas(Math.round(120 * 11.9)); const v119 = B.list.length;
    L.pas(Math.round(120 * 0.3)); out.pastille.expire = [v119, B.list.length];
    /* expiration : cellules et noyaux en 9 s */
    L.bac({ len: 8, x: 200, y: 100, ang: 0, god: true }); B.lacher(600, 400, 1); B.lacher(650, 420, 1, { type: 'noyau' }); L.pas(Math.round(120 * 9.0)); const e9 = B.list.length; L.pas(Math.round(120 * 0.3));
    out.expire9 = [e9, B.list.length];
    /* la fusion : trois cellules à moins de 10 px n'en font qu'une, de valeur 3 ; la prise fait grandir de 3 */
    L.bac({ len: 8, x: 200, y: 100, ang: 0 }); B.lacher(600, 400, 1); B.lacher(605, 403, 1); B.lacher(602, 407, 1); L.pas(60);
    out.fusion = { n: B.list.length, valeur: B.list[0] && B.list[0].valeur };
    L.bac({ len: 8, x: 400, y: 256, ang: 0 }); B.lacher(P.x + 40, P.y, 1); B.lacher(P.x + 44, P.y + 3, 1); B.lacher(P.x + 42, P.y - 4, 1); L.pas(90);
    out.fusion.len = P.len; out.fusion.evts = L.compte('ramassage');
    /* le mur qui avance emporte le butin qu'il dépasse */
    L.bac({ len: 8, x: 300, y: 256, ang: 0, god: true }); B.lacher(N.world.x0 + 30, 300, 1); B.lacher(N.world.x0 + 400, 300, 1);
    N.world.travelling({ largeur: 576, vx: 60, depuis: N.world.x0 }); L.pas(120);
    out.mur = { reste: B.list.length, perdu: L.compte('ramassage') };
    N.world.reset();
    /* les largages : 45 % ordinaire, 20 % larve, 6 cellules et un noyau pour une élite, rien pour le mur */
    L.bac({ len: 8, x: 200, y: 100 }); __S.input.mag = 0;
    const kill = (type, elite, src) => { N.ev.nouveauPas(); N.ev.emit('kill', { id: 1, type, x: 600, y: 400, elite: !!elite, boss: false, base: 50, src: src || { genre: 'arme', type: 'canon', id: null }, distTete: 100, gen: 0 }); };
    let cnt = 0; B.list.length = 0; for (let i = 0; i < 2000; i++) { const a = B.list.length; kill('fleche'); cnt += B.list.length - a; if (B.list.length > 100) B.list.length = 0; }
    out.taux = cnt / 2000;
    cnt = 0; B.list.length = 0; for (let i = 0; i < 2000; i++) { const a = B.list.length; kill('larve'); cnt += B.list.length - a; if (B.list.length > 100) B.list.length = 0; }
    out.tauxLarve = cnt / 2000;
    B.list.length = 0; kill('fleche', true); out.elite = { cellules: B.list.filter(b => b.type === 'cellule').length, noyaux: B.list.filter(b => b.type === 'noyau').length };
    B.list.length = 0; kill('fleche', false, { genre: 'decor', type: 'mur', id: null }); out.parMur = B.list.length;
    B.list.length = 0; kill('fleche', false, { genre: 'arme', type: 'lasso', id: null }); out.parLasso = B.list.length;
    return out;
  });
  noter('butin', 'aimant à 28 px', 'tirée à 26 px, pas à 31 px', `26 px : ${r.a27.tire ? 'tirée' : 'immobile'} ; 31 px : ${r.a30.tire ? 'tirée' : 'immobile'}`, r.a27.tire && !r.a30.tire);
  noter('butin', 'vol vers la tête', '220 px/s', r.a27.v.toFixed(0) + ' px/s', Math.abs(r.a27.v - 220) <= 12);
  noter('butin', 'AIMANT', '48 px', `mods.aimant ${r.aimant48.mods}, cellule à 46 px ${r.aimant48.tire ? 'tirée' : 'immobile'}`, r.aimant48.mods === 48 && r.aimant48.tire);
  noter('butin', 'prise', '\'ramassage\' et +1 segment', `${r.prise.ramasse} événement, longueur ${r.prise.len}`, r.prise.ramasse === 1 && r.prise.len === 9);
  noter('butin', 'noyau', '+2 segments, +20 APOGÉE', `longueur ${r.noyau.len}, jauge ${r.noyau.apogee} (${r.noyau.type})`, r.noyau.len === 10 && r.noyau.apogee === 20 && r.noyau.type === 'noyau');
  noter('butin', 'PASTILLE', 'jamais aimantée ; prise à 8 px ; expire en 12 s', `bouge de ${r.pastille.bouge.toFixed(2)} px à 23 px de la tête ; prise : ${r.pastille.prise} ; 11,9 s : ${r.pastille.expire[0]}, 12,2 s : ${r.pastille.expire[1]}`, r.pastille.bouge < 0.01 && r.pastille.prise === 'pastille' && r.pastille.expire[0] === 1 && r.pastille.expire[1] === 0);
  noter('butin', 'expiration', 'cellule et noyau en 9 s', `${r.expire9[0]} à 9 s, ${r.expire9[1]} à 9,3 s`, r.expire9[0] === 2 && r.expire9[1] === 0);
  noter('butin', 'fusion', '3 cellules à moins de 10 px → 1, valeur 3', `${r.fusion.n} objet, valeur ${r.fusion.valeur} ; prise : longueur ${r.fusion.len}, ${r.fusion.evts} événement`, r.fusion.n === 1 && r.fusion.valeur === 3 && r.fusion.len === 11 && r.fusion.evts === 1);
  noter('butin', 'le mur qui avance', 'le butin dépassé est perdu', `${r.mur.reste} restant sur 2, ${r.mur.perdu} ramassé`, r.mur.reste === 1 && r.mur.perdu === 0);
  noter('butin', 'largages', '45 % ordinaire, 20 % larve', `${(r.taux * 100).toFixed(1)} %, ${(r.tauxLarve * 100).toFixed(1)} % sur 2 000`, Math.abs(r.taux - 0.45) < 0.035 && Math.abs(r.tauxLarve - 0.2) < 0.03);
  noter('butin', 'élite', '6 cellules et un noyau', `${r.elite.cellules} et ${r.elite.noyaux}`, r.elite.cellules === 6 && r.elite.noyaux === 1);
  noter('butin', 'dépassé par le mur', 'ni butin', r.parMur + ' objet', r.parMur === 0);
  noter('butin', 'enfermé par un LASSO', 'une cellule', r.parLasso + ' objet', r.parLasso === 1);
}

/* ================================================================ le dessin : paliers distincts, couleurs, dessus */
if (veut('dessin')) {
  const r = await ev(() => {
    const L = L3, P = __S.player, N = __N, g = N.gfx, out = { paliers: [] };
    const masques = [];
    for (let niv = 1; niv <= 4; niv++) {
      L.bac({ x: 300, y: 256, ang: -0.2, arsenal: true, len: 14 }); for (let q = 1; q < niv; q++) N.arsenal.monter('canon');
      L.pas(240);
      const m = N.game.dbg.masque(), b = g.buf(), set = new Set();
      for (let i = 0; i < m.length; i++) if (m[i] === 3) set.add(i);
      masques.push(set);
    }
    for (let i = 1; i < 4; i++) {
      const a = masques[i - 1], b = masques[i]; let diff = 0; const u = new Set([...a, ...b]);
      for (const p of u) if (!(a.has(p) && b.has(p))) diff++;
      out.paliers.push({ de: i, a: i + 1, diff: diff / Math.max(1, u.size), pixels: b.size });
    }
    /* les couleurs de la joueuse, et la tête au-dessus d'une explosion */
    L.bac({ x: 400, y: 256, ang: 0.4, len: 24 }); L.manche(1.4, 0.9); L.pas(50);
    const m0 = N.game.dbg.masque();                                   // l'empreinte de la joueuse, sans effet
    N.fx.boom(P.x, P.y, 0.6, N.pal.i('magenta')); N.fx.update(1 / 120);
    const m = N.game.dbg.masque(), b = g.buf(), C = N.pal;
    const ok = new Set(['cyan', 'cyanPale', 'os', 'nuitProfonde'].map(n => C.i(n)));
    let horsPalette = 0, teteEncre = 0, teteMauvaise = 0, tete = 0, corps = 0;
    for (let i = 0; i < m.length; i++) {
      if (m[i] === 1 || m[i] === 2) { if (!ok.has(b[i])) horsPalette++; if (m[i] === 1) tete++; else corps++; }
      if (m[i] === 1 && b[i] !== C.i('nuitProfonde')) { teteEncre++; if (b[i] !== C.i('cyan') && b[i] !== C.i('cyanPale')) teteMauvaise++; }
    }
    /* l'empreinte de la tête (rayon 6) et de ses deux premiers segments : à la joueuse, malgré l'explosion */
    const W = g.W; let foot = 0, footJ = 0;
    const pts = [[P.x, P.y, 7]]; for (let k = 1; k <= 2; k++) pts.push([P.segs[2 * k], P.segs[2 * k + 1], 6]);
    for (const [x, y, rr] of pts) {
      const sx = Math.round(x - N.cam.x), sy = Math.round(y - N.cam.y);
      for (let dy = -rr; dy <= rr; dy++) for (let dx = -rr; dx <= rr; dx++) {
        const q = (sy + dy) * W + sx + dx; if (m0[q] !== 1 && m0[q] !== 2) continue;
        foot++; if (m[q] === 1 || m[q] === 2) footJ++;
      }
    }
    out.couleurs = { horsPalette, tete, corps, teteEncre, teteMauvaise, foot, footJ };
    /* la gaine : chaque pixel de la joueuse qui touche le fond touche d'abord de la nuit profonde */
    let bord = 0, bordGaine = 0;
    for (let y = 1; y < g.H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x; if (m[i] !== 2) continue;
      const v = [i - 1, i + 1, i - W, i + W];
      if (v.some(j => m[j] !== 1 && m[j] !== 2)) { bord++; if (b[i] === C.i('nuitProfonde')) bordGaine++; }
    }
    out.gaine = { bord, bordGaine };
    /* le silence de la tête : aucun pixel de l'arsenal à moins de 3 px de son contour (rayon 6) */
    L.bac({ x: 300, y: 256, ang: 0.3, arsenal: true }); for (let q = 0; q < 3; q++) N.arsenal.monter('canon'); L.pas(60);
    let pres = 0; const m2 = N.game.dbg.masque(), hx = P.x - N.cam.x, hy = P.y - N.cam.y;
    for (let i = 0; i < m2.length; i++) if (m2[i] === 3) { const x = i % W, y = (i / W) | 0; if (Math.hypot(x - hx, y - hy) < 9) pres++; }
    L.bac({ x: 300, y: 256, ang: 0.3, arsenal: true }); L.pas(60);
    const m3 = N.game.dbg.masque(); for (let i = 0; i < m3.length; i++) if (m3[i] === 3) { const x = i % W, y = (i / W) | 0; if (Math.hypot(x - hx, y - hy) < 9) pres++; }
    out.silence = pres;
    return out;
  });
  noter('dessin', 'CANON : 4 paliers au dessin distinct', '≥ 10 % des pixels de l\'arsenal d\'un palier au suivant', r.paliers.map(p => `${p.de}→${p.a} : ${(p.diff * 100).toFixed(0)} %`).join(', '), r.paliers.every(p => p.diff >= 0.1));
  const c = r.couleurs;
  noter('dessin', 'joueuse en cyan, cyan pâle, os, gaine', '100 % des pixels', `${c.horsPalette} pixel hors de ces encres sur ${c.tete + c.corps}`, c.horsPalette === 0);
  noter('dessin', 'tête : encre cyan ou cyan pâle (G-11)', '100 % hors image de dégât', `${c.teteEncre - c.teteMauvaise}/${c.teteEncre}`, c.teteMauvaise === 0 && c.teteEncre > 0);
  noter('dessin', 'tête et 2 segments au-dessus d\'une explosion', '100 % de leur empreinte', `${c.footJ}/${c.foot}`, c.footJ === c.foot);
  noter('dessin', 'gaine de nuit profonde', '100 % des pixels de bord du corps', `${r.gaine.bordGaine}/${r.gaine.bord}`, r.gaine.bordGaine === r.gaine.bord);
  noter('dessin', 'silence de la tête', '0 pixel de l\'arsenal à moins de 3 px du contour', r.silence + ' pixel', r.silence === 0);
}

/* ================================================================ les événements : une fois par occurrence, 10 minutes */
if (veut('evenements')) {
  const MIN = RAPIDE ? 2 : 10;
  const r = await ev((MIN) => {
    const L = L3, P = __S.player, N = __N;
    L.bac({ directeur: true, ennemisVivants: true, arsenal: true, graine: 11 });
    N.cartes.choisir('traversee');
    const couper0 = N.joueuse.couper; let coupesOk = 0;
    N.joueuse.couper = function (k, src) { const r = couper0(k, src); if (r) coupesOk++; return r; };
    let etat0 = P.etat, len0 = P.len, morts = 0, coupes = 0, lassoPas = {}, doublons = 0, prises = 0, tuesIds = new Set(), killsDoubles = 0, parties = 1;
    let butin0 = new Map(N.butin.list.map(b => [b.id, b])), mode = 0, modeT = 0, cible = 0, nbFerme = N.joueuse._etat().fermeture.nb, fermes = 0;
    const evAvant = () => L.ev.length;
    for (let pas = 0; pas < MIN * 60 * 120; pas++) {
      const e = N.game.etat();
      if (e === 'fin' || e === 'initiales') { L.bac({ directeur: true, ennemisVivants: true, arsenal: true, graine: 11 + parties }); N.cartes.choisir('traversee'); parties++; butin0 = new Map(); len0 = P.len; etat0 = P.etat; tuesIds = new Set(); continue; }
      const n0 = evAvant();
      L.pas(1, () => {
        if (N.game.etat() === 'cartes') { __S.input.chiffre = 1; return; }
        /* le robot : murs, butin, cercles autour des groupes, accélération, pouvoir, APOGÉE */
        modeT -= 1 / 120;
        const w = N.world, m = 45;
        if (P.x < w.x0 + m || P.x > w.x1 - m || P.y < w.y0 + m || P.y > w.y1 - m) { L.manche(Math.atan2((w.y0 + w.y1) / 2 - P.y, (w.x0 + w.x1) / 2 - P.x), 1); return; }
        if (modeT <= 0) { mode = L.rnd() < 0.3 ? 1 : 0; modeT = 1 + L.rnd() * 2.5; cible = L.rnd() * 6.28; __S.input.boost = L.rnd() < 0.2; }
        if (L.rnd() < 0.004 && P.len > 6) { const k = 2 + Math.floor(L.rnd() * (P.len - 3)); N.ennemis.tir(P.segs[2 * k] + 4, P.segs[2 * k + 1] - 12, 0, 120, { vie: 0.5, src: { genre: 'ennemi', type: 'tourelle', id: null } }); }
        if (L.rnd() < 0.002) __S.input.pouvoir = true;
        if (L.rnd() < 0.002) __S.input.apogee = true;
        if (mode === 1) { L.manche(P.ang + 1.2, 0.9); return; }
        let best = null, bd = 1e9;
        for (const b of __S.butin) { const d = Math.hypot(b.x - P.x, b.y - P.y); if (d < bd) { bd = d; best = b; } }
        if (best && bd < 160) L.manche(Math.atan2(best.y - P.y, best.x - P.x), 0.9); else L.manche(cible, 0.7);
      });
      /* les observations, indépendantes des événements */
      const evs = L.ev.slice(n0);
      if (etat0 !== 'mort' && P.etat === 'mort') morts++;
      if (P.etat === etat0 && P.etat !== 'mort' && P.len < len0) coupes++;
      const nl = evs.filter(x => x.nom === 'lasso').length; if (nl > 1) doublons++;
      const nf = N.joueuse._etat().fermeture; if (nf.nb > nbFerme) { if (nf.n > 0) fermes++; nbFerme = nf.nb; }
      for (const x of evs) if (x.nom === 'kill') { if (tuesIds.has(x.c.id)) killsDoubles++; tuesIds.add(x.c.id); }
      if (N.horloge.pas() < 3) tuesIds = new Set();                     // une partie neuve : les identifiants repartent de 1
      const ids = new Map(N.butin.list.map(b => [b.id, b])), w = N.world;
      for (const [id, b] of butin0) if (!ids.has(id) && b.vie > 1 / 120 + 1e-6 && b.x >= w.x0 - 3 && b.x <= w.x1 + 3 && b.y >= w.y0 - 3 && b.y <= w.y1 + 3) prises++;
      butin0 = ids; etat0 = P.etat; len0 = P.len;
      if (L.ev.length > 20000) L.ev.splice(0, 10000);
      L.ev.cpt = L.ev.cpt || {}; for (const x of evs) L.ev.cpt[x.nom] = (L.ev.cpt[x.nom] || 0) + 1;
    }
    N.joueuse.couper = couper0;
    return { morts, coupes: coupesOk, doublons, fermes, prises, killsDoubles, parties, cpt: L.ev.cpt };
  }, MIN);
  const c = r.cpt;
  noter('evenements', `'mort' (${MIN} min, ${r.parties} parties)`, 'une fois par mort observée', `${c.mort || 0} événements / ${r.morts} morts`, (c.mort || 0) === r.morts && r.morts > 0);
  noter('evenements', `'coupe'`, 'une fois par coupe réussie (couper rend true)', `${c.coupe || 0} / ${r.coupes}`, (c.coupe || 0) === r.coupes);
  noter('evenements', `'lasso'`, 'une fois par boucle qui enferme', `${c.lasso || 0} / ${r.fermes}, ${r.doublons} pas à deux lassos`, (c.lasso || 0) === r.fermes && r.doublons === 0 && r.fermes > 0);
  noter('evenements', `'ramassage'`, 'une fois par objet pris', `${c.ramassage || 0} / ${r.prises}`, (c.ramassage || 0) === r.prises && r.prises > 0);
  noter('evenements', `'kill'`, 'une fois par ennemi', `${c.kill || 0} kills, ${r.killsDoubles} doublon`, r.killsDoubles === 0);
}

const e = await page.evaluate(() => ({ n: __ERR.count, sigs: __ERR.sigs }));
noter('erreurs', 'zéro erreur (bancs)', '__ERR = 0, console vide', `${e.n} erreur, ${erreurs.length} message`, e.n === 0 && erreurs.length === 0, { sigs: e.sigs, console: erreurs.slice(0, 5) });
fs.writeFileSync(path.join(SORTIE, 'criteres' + (seul ? '-' + seul.join('-') : '') + '.json'), JSON.stringify(RES, null, 1));
console.log(`\n${RES.filter(r => r.ok).length}/${RES.length} critères tenus`);
await nav.close(); fermer();
