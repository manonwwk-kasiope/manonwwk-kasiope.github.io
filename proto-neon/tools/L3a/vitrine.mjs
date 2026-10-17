/* tools/L3a/vitrine.mjs — les captures du lot 3a (tampon d'index agrandi), pour les regarder : le serpent et ses
   signes, le LASSO qui se referme, la mort image par image, la coupe, l'APOGÉE, le butin, la TRAVERSÉE, la
   réapparition, le CANON à ses quatre paliers. Puis 30 s de jeu réel (boucle d'images normale) sur les trois
   profils, pour le zéro erreur.   node tools/L3a/vitrine.mjs [--profil paysage] [--sans-jeu] */
import fs from 'node:fs';
import path from 'node:path';
import { navigateur, ouvrir, capture, fermer, ICI, attendre } from './banc.mjs';

const argv = process.argv.slice(2);
const profils = (() => { const i = argv.indexOf('--profil'); return i >= 0 ? argv[i + 1].split(',') : ['paysage', 'portrait', 'bureau']; })();
const HARNAIS = fs.readFileSync(path.join(ICI, 'harnais.js'), 'utf8');
const nav = await navigateur();
const bilan = [];

for (const prof of profils) {
  const { page, erreurs } = await ouvrir(nav, prof);
  await page.addScriptTag({ content: HARNAIS });
  const ev = (fn, a) => page.evaluate(fn, a);
  const cap = async (nom, zone, k) => { await attendre(60); return capture(page, `${prof}-${nom}`, k || (zone ? 5 : 3), zone || null); };
  const vu = [];

  /* le serpent et ses signes : jauge entamée, pouvoir prêt, APOGÉE pleine, traînée */
  await ev(() => {
    const L = L3, P = __S.player;
    L.bac({ len: 22, x: 420, y: 260, ang: 0 }); __N.cartes.choisir('traversee'); __N.cartes.choisir('bouclier');
    __S.input.boost = true; L.pas(120); __S.input.boost = false;
    for (let i = 0; i < 140; i++) { L.manche(P.ang + (i < 70 ? 0.5 : -0.5), 0.9); L.pas(1); }
    __N.joueuse.grandir(0); L.ev.length = 0;
    for (let q = 0; q < 50; q++) __N.ev.emit('kill', { id: 900 + q, type: 'fleche', x: 0, y: 0, elite: false, boss: false, base: 50, src: { genre: 'arme', type: 'canon', id: null }, distTete: 0, gen: 0 });
    L.pas(2);
  });
  vu.push(await cap('serpent', 'tete', 6)); vu.push(await cap('serpent-large'));

  /* le LASSO qui se referme sur six cibles */
  await ev(() => {
    const L = L3, P = __S.player;
    L.bac({ len: 20, x: 400, y: 260, ang: 0 });
    const cx = 450, cy = 230; for (let i = 0; i < 6; i++) L.cible('mine', cx + Math.cos(i * Math.PI / 3) * 9, cy + Math.sin(i * Math.PI / 3) * 9);
    for (let i = 0; i < 1200 && !L.compte('lasso'); i++) {
      const d = Math.hypot(cx - P.x, cy - P.y), phi = Math.atan2(cy - P.y, cx - P.x), k = Math.max(-0.7, Math.min(0.7, 1.2 * (d - 24) / 24));
      L.manche(phi - (Math.PI / 2 - k), 0.8); L.pas(1);
      if (i === 300) window.__annonce = 1;
    }
    L.pas(4);
  });
  vu.push(await cap('lasso', ['tete', 140, 90], 5));
  await ev(() => L3.pas(30)); vu.push(await cap('lasso-apres', ['tete', 140, 90], 5));

  /* la mort, image par image (le monde remappé, la joueuse par-dessus) */
  await ev(() => {
    const L = L3, P = __S.player;
    L.bac({ len: 26, x: 420, y: 260, ang: 0.3, ennemisVivants: true });
    for (let i = 0; i < 100; i++) { L.manche(P.ang + 0.4, 0.9); L.pas(1); }
    L.cible('tourelle', P.x + 40, P.y - 20);
    __N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: __N.ennemis.list[0].id });
  });
  for (const [t, nom] of [[0.05, 'mort-a'], [0.25, 'mort-b'], [0.45, 'mort-c'], [0.7, 'mort-d']]) {
    await ev(t => { const L = L3; const now = __N.game.dbg.etat().t; L.pas(Math.max(0, Math.round((t - now) * 120))); }, t);
    vu.push(await cap(nom, 'tete', 5));
  }
  vu.push(await cap('mort-large'));

  /* la coupe */
  await ev(() => {
    const L = L3, P = __S.player;
    L.bac({ len: 24, x: 300, y: 256, ang: 0, ennemisVivants: true }); L.pas(180);
    const k = 9, sx = P.segs[2 * k], sy = P.segs[2 * k + 1];
    __N.ennemis.tir(sx + P.vit * 0.1, sy - 12, 0, 120, { vie: 1, src: { genre: 'ennemi', type: 'tourelle', id: null } });
    let n = 0; const L0 = P.len; while (P.len === L0 && n < 120) { L.pas(1); n++; }
    L.pas(6);
  });
  vu.push(await cap('coupe', 'tete', 4));

  /* l'APOGÉE */
  await ev(() => {
    const L = L3, P = __S.player;
    L.bac({ len: 18, x: 512, y: 256, ang: 0 });
    for (let q = 0; q < 50; q++) __N.ev.emit('kill', { id: 900 + q, type: 'fleche', x: 0, y: 0, elite: false, boss: false, base: 50, src: { genre: 'arme', type: 'canon', id: null }, distTete: 0, gen: 0 });
    for (let q = 0; q < 10; q++) L.cible('fleche', P.x + Math.cos(q) * (40 + q * 12), P.y + Math.sin(q) * (30 + q * 6));
    __S.input.apogee = true; L.pas(14);
  });
  vu.push(await cap('apogee-a'));
  await ev(() => L3.pas(28)); vu.push(await cap('apogee-b'));

  /* le butin : cellules, cellule fusionnée, noyau, PASTILLE */
  await ev(() => {
    const L = L3, P = __S.player;
    L.bac({ len: 10, x: 360, y: 256, ang: Math.PI });
    const B = __N.butin;
    B.lacher(P.x + 40, P.y - 10, 1); B.lacher(P.x + 42, P.y - 8, 1); B.lacher(P.x + 44, P.y - 10, 1);
    B.lacher(P.x + 70, P.y + 20, 1, { type: 'noyau' }); B.lacher(P.x + 100, P.y - 20, 1, { type: 'pastille' });
    B.lacher(P.x + 60, P.y - 30, 1); B.lacher(P.x + 90, P.y + 30, 1);
    L.pas(60);
  });
  vu.push(await cap('butin', ['tete', 260, 110], 4));

  /* la TRAVERSÉE */
  await ev(() => { const L = L3; L.bac({ len: 18, x: 420, y: 256, ang: 0 }); __N.cartes.choisir('traversee'); L.pas(30); __S.input.pouvoir = true; L.pas(20); });
  vu.push(await cap('traversee', 'tete', 6));

  /* la réapparition : le contour qui clignote */
  await ev(() => { const L = L3, P = __S.player; L.bac({ len: 20, x: 420, y: 256 }); __N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: null }); let k = 0; while (P.etat !== 'reapparition' && k < 600) { L.pas(1); k++; } L.pas(3); });
  vu.push(await cap('reapparition', 'tete', 6));

  /* le CANON, palier par palier */
  for (let niv = 1; niv <= 4; niv++) {
    await ev(niv => { const L = L3; L.bac({ len: 12, x: 300, y: 256, ang: -0.25, arsenal: true }); for (let q = 1; q < niv; q++) __N.arsenal.monter('canon'); L.pas(200); }, niv);
    vu.push(await cap('canon-' + niv, ['tete', 220, 100], 4));
  }

  /* 30 s de jeu réel : la boucle d'images normale, le robot du banc, le directeur */
  if (!argv.includes('--sans-jeu')) {
    await ev(() => {
      const L = L3; L.reveiller(); window.__DT = undefined;
      __N.game.reset(17, { etat: 'jeu' }); __N.cartes.choisir('traversee');
      window.__ROBOT = setInterval(() => {
        const P = __S.player, N = __N; if (!P || N.game.etat() === 'fin' || N.game.etat() === 'initiales') { N.game.reset(18, { etat: 'jeu' }); return; }
        if (N.game.etat() === 'cartes') { __S.input.chiffre = 1; return; }
        const w = N.world, m = 45;
        if (P.x < w.x0 + m || P.x > w.x1 - m || P.y < w.y0 + m || P.y > w.y1 - m) L.manche(Math.atan2((w.y0 + w.y1) / 2 - P.y, (w.x0 + w.x1) / 2 - P.x), 1);
        else L.manche(P.ang + (L.rnd() - 0.45) * 1.2, 0.85);
        __S.input.boost = L.rnd() < 0.25;
        if (L.rnd() < 0.03) __S.input.pouvoir = true;
        if (L.rnd() < 0.03) __S.input.apogee = true;
      }, 120);
    });
    await attendre(30000);
    vu.push(await cap('jeu-30s'));
    await ev(() => clearInterval(window.__ROBOT));
  }
  const e = await ev(() => ({ n: __ERR.count, sigs: __ERR.sigs }));
  bilan.push({ profil: prof, erreurs: e.n, console: erreurs.length, sigs: e.sigs, captures: vu.length });
  console.log(prof, 'erreurs', e.n, 'console', erreurs.length, JSON.stringify(e.sigs).slice(0, 300), erreurs.slice(0, 3));
  await page.context().close();
}
fs.writeFileSync(path.join(ICI, 'sortie', 'vitrine.json'), JSON.stringify(bilan, null, 1));
await nav.close(); fermer();
