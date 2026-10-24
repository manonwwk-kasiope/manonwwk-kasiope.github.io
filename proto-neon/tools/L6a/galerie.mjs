/* tools/L6a/galerie.mjs — captures des temps forts du lot 6a, sur la page d'essai, jeu en marche (décor et
   modules des autres lots en replis) : explosions et chaîne, télégraphes, lasso, coupe, mort (gel, cause,
   désintégration), palier ×5, APOGÉE, WARNING, feu d'artifice d'écran. Tampon d'index agrandi ×3, avant le tube.
   Usage : node tools/L6a/galerie.mjs [--profil paysage]. Sorties : tools/L6a/sortie/g-*.png */
import { ouvrir, capture, arg } from './commun.mjs';

const profil = arg('--profil', 'paysage');
const s = await ouvrir(profil, { init: () => { window.__DT = 1e-9; } });
const p = s.page;
/* le temps n'avance que pendant images(n) : entre deux appels, __DT presque nul gèle la boucle (le dessin continue) */
const images = n => p.evaluate(k => new Promise(r => { window.__DT = 1 / 60; let i = 0; const f = () => (++i >= k ? (window.__DT = 1e-9, r()) : requestAnimationFrame(f)); requestAnimationFrame(f); }), n);
async function partie() {
  await p.evaluate(() => { const N = window.__N; N.game.dbg.vague(1); N.game.dbg.god(true); N.fx.reset(); });
  await images(20);
}
const pres = (dx, dy) => p.evaluate(([a, b]) => { const P = window.__S.player; return [P.x + a, P.y + b]; }, [dx, dy]);

/* 1. une chaîne de kills autour de la tête */
await partie();
await p.evaluate(() => {
  const N = window.__N, P = N.S.player, src = { genre: 'arme', type: 'canon', id: null };
  [[50, -20, 'fleche'], [70, 25, 'tourelle'], [-40, 30, 'dard'], [90, -35, 'larve']].forEach((k, i) =>
    N.ev.emit('kill', { id: 900 + i, type: k[2], x: P.x + k[0], y: P.y + k[1], elite: false, boss: false, base: 50, src, distTete: 50, gen: 0 }));
});
await images(4); await capture(p, 'g-kills-a');
await images(10); await capture(p, 'g-kills-b');
/* 2. une élite */
await partie();
await p.evaluate(() => { const N = window.__N, P = N.S.player; N.ev.emit('kill', { id: 950, type: 'fleche', x: P.x + 60, y: P.y, elite: true, boss: false, base: 250, src: { genre: 'arme', type: 'canon', id: null }, distTete: 60, gen: 0 }); });
await images(8); await capture(p, 'g-elite');
/* 3. les télégraphes, posés à chaque pas pendant 40 images */
await partie();
await p.evaluate(() => {
  const N = window.__N, P = N.S.player, T = [];
  T.push({ forme: 'ligne', x0: P.x + 40, y0: P.y - 40, x1: P.x + 40 + 67, y1: P.y - 40, r: 0, reste: 0.5 });
  T.push({ forme: 'ligne', x0: P.x - 120, y0: P.y + 20, x1: P.x + 60, y1: P.y + 60, r: 2, reste: 0.2 });
  T.push({ forme: 'disque', x0: P.x - 70, y0: P.y - 30, r: 30, reste: 0.4 });
  T.push({ forme: 'secteur', x0: P.x + 120, y0: P.y + 30, r: 40, a0: 2.4, a1: 3.9, reste: 0.7 });
  T.push({ forme: 'losange', x0: P.x + 20, y0: P.y + 5, r: 2, reste: 0.3, cible: 'tete' });
  T.push({ forme: 'losange', x0: P.x - 20, y0: P.y + 8, r: 2, reste: 0.3, cible: 'corps' });
  T.push({ forme: 'voie', x0: N.cam.x, y0: P.y - 80, x1: N.cam.x + N.cam.w, y1: P.y - 62, reste: 0.9 });
  T.push({ forme: 'ligne', x0: P.x - 150, y0: P.y - 10, x1: P.x - 40, y1: P.y - 10, r: 1, reste: -0.1 });
  window.__TT = T.map((t, i) => Object.assign({ id: 7000 + i, x1: t.x0, y1: t.y0, a0: 0, a1: 0, total: 1, cible: 'tete', par: { type: 'fleche', id: 1 } }, t));
  const f = N.fx.update;
  N.fx.update = function (dt) { for (const t of window.__TT) N.fx.tele(t); return f.call(N.fx, dt); };
  window.__FU = f;
});
await images(6); await capture(p, 'g-teles');
await p.evaluate(() => { window.__N.fx.update = window.__FU; });
/* 4. le lasso */
await partie();
await p.evaluate(() => {
  const N = window.__N, P = N.S.player, poly = [];
  for (let k = 0; k < 24; k++) { const a = k / 24 * 6.2832; poly.push(P.x + 70 + Math.cos(a) * 40, P.y + Math.sin(a) * 28); }
  N.ev.emit('lasso', { n: 5, ids: [1, 2, 3, 4, 5], aire: 3500, x: P.x + 70, y: P.y, poly });
});
await images(2); await capture(p, 'g-lasso-a');
/* R-03 sur le lasso : le cyan hors du masque joueuse + arsenal + icônes de vie (codes 1 à 4) */
console.log('lasso, cyan hors masque :', await p.evaluate(() => {
  const N = window.__N, m = N.game.dbg.masque(), b = N.gfx.buf(), C = N.pal.i('cyan'), CP = N.pal.i('cyanPale'); let n = 0, cy = 0;
  for (let i = 0; i < b.length; i++) if (b[i] === C || b[i] === CP) { cy++; if (!(m[i] >= 1 && m[i] <= 4)) n++; }
  return { cyan: cy, horsMasque: n, part: +(n / b.length * 100).toFixed(3) + ' %' };
}));
await images(5); await capture(p, 'g-lasso-b');
/* 5. une coupe du corps */
await partie();
await p.evaluate(() => { const N = window.__N, P = N.S.player; N.ev.emit('coupe', { k: 5, perdus: 3, cause: 'tir', auteur: 'tourelle', x: P.x - 25, y: P.y + 4 }); });
await images(3); await capture(p, 'g-coupe');
/* 6. le palier ×5 */
await partie();
await p.evaluate(() => { const N = window.__N; N.fx.texte('×5', 'jaune', 0.4); const P = N.S.player; N.fx.onde(P.x - N.cam.x, P.y - N.cam.y, 6, N.gfx.W * 1.2, 'jaune', 0.55, { ecran: true, epais: 3 }); });
await images(8); await capture(p, 'g-palier');
/* 7. l'APOGÉE */
await partie();
await p.evaluate(() => { window.__N.ev.emit('apogee', { id: 'apogee', evt: 'debut' }); });
await images(24); await capture(p, 'g-apogee');
/* 8. WARNING et feu d'artifice d'écran */
await partie();
await p.evaluate(() => { const N = window.__N, g = N.gfx; N.fx.bandes(3); N.fx.boom(g.W * 0.3, g.H * 0.5, 0.9, 'jaune', { ecran: true }); N.fx.boom(g.W * 0.7, g.H * 0.4, 0.5, 'ambre', { ecran: true }); });
await images(10); await capture(p, 'g-warning');
/* 9. la mort : une tourelle tire, la tête meurt */
await partie();
await p.evaluate(() => {
  const N = window.__N, P = N.S.player; N.game.dbg.god(false);
  if (N.score) N.score.vies = 2;
  const e = N.ennemis.spawn('tourelle', P.x + 60, P.y - 20, {});
  N.joueuse.tuer('tir', { genre: 'ennemi', type: 'tourelle', id: e ? e.id : null });
});
const etat = () => p.evaluate(() => [window.__N.game.etat(), window.__N.fx.desintegres(), window.__N.fx.stats.ex, +window.__N.horloge.reel().toFixed(3), window.__S.player.len]);
console.log('mort', JSON.stringify(await etat()));
await images(4); await capture(p, 'g-mort-a'); console.log('mort a', JSON.stringify(await etat()));
await images(26); await capture(p, 'g-mort-b'); console.log('mort b', JSON.stringify(await etat()));
await images(30); await capture(p, 'g-mort-c'); console.log('mort c', JSON.stringify(await etat()));
const e = await s.err();
console.log('galerie :', JSON.stringify(e));
await s.fermer();
