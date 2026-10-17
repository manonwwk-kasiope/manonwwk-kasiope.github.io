/* tools/L4a/voir.mjs — les planches de regard du lot 4a : le bestiaire en jeu, capturé dans le tampon d'index.
     node tools/L4a/voir.mjs [--page bestiaire.html|index.html] [--profil paysage] [--scene tous|isoles|inversion|groupe]
   La boucle d'images avance image par image (mode manuel d'outils.mjs) : les captures sont reproductibles.
   L'arsenal et le directeur se taisent (le banc place les ennemis lui-même), la tête est protégée et tourne
   lentement en rond. Sortie : tools/L4a/sortie/*.png (×3). */
import path from 'node:path';
import { ouvrir, capture, fermer, SORTIE, tampon, planche } from './outils.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PAGE = arg('--page', 'bestiaire.html'), PROFIL = arg('--profil', 'paysage'), SCENE = arg('--scene', 'tous');
const pre = (arg('--url', null) ? 'integ-' : PAGE.startsWith('index') ? 'repli-' : '') + (PROFIL !== 'paysage' ? PROFIL + '-' : '');

export async function preparer(page, o = {}) {
  await page.evaluate((o) => {
    const N = window.__N, S = window.__S;
    if (!window.__orig) window.__orig = { joueuse: N.joueuse.update, arsenal: N.arsenal.update };
    N.joueuse.update = window.__orig.joueuse; N.arsenal.update = window.__orig.arsenal;
    N.game.dbg.vague(o.vague || 2);
    N.game.dbg.god(o.god !== false);
    N.dir.update = function () { };                      // le directeur se tait : le banc place lui-même
    if (o.arsenal !== true) N.arsenal.update = function () { };
    N.ennemis.reset();
    const w = N.world;
    N.joueuse.reset({ x: o.x || (w.x0 + w.x1) / 2, y: o.y || (w.y0 + w.y1) / 2, ang: o.ang || 0, len: o.len || 14 });
    let a = o.ang || 0;
    window.__chaqueImage = function () { a += o.tour || 0; N.game.dbg.input({ x: Math.cos(a), y: Math.sin(a), mag: o.mag === undefined ? 0.5 : o.mag }); };
    if (N.cam && N.cam.reset) N.cam.reset(S.player.x, S.player.y);
  }, o);
  /* la tête figée : le serpent trace d'abord sa courbe, puis ne bouge plus (les ennemis jouent autour) */
  if (o.fige) {
    await images(page, o.fige);
    await page.evaluate(() => { const N = window.__N; N.joueuse.update = function () { }; window.__chaqueImage = null; });
  }
}
export async function images(page, n) { await page.evaluate((n) => window.__pas(n), n); }
export async function spawn(page, liste) {
  return page.evaluate((L) => {
    const N = window.__N, p = window.__S.player;
    return L.map(([t, dx, dy, o]) => { const e = N.ennemis.spawn(t, p.x + dx, p.y + dy, o || {}); return e ? e.id : null; });
  }, liste);
}

async function principal() {
  const s = await ouvrir({ page: PAGE, profil: PROFIL, graine: 7, manuel: true, url: arg('--url', null) });
  const { page } = s;
  try {
    if (SCENE === 'tous' || SCENE === 'isoles') {
      /* chaque type, isolé, aux images où son caractère se lit (en images de 1/60 s) */
      const cas = [
        ['fleche', [['fleche', 95, 25]], [40, 75, 95, 108, 125], {}],
        ['dard', [['dard', 60, -70]], [50, 90, 105, 125, 140], {}],
        ['larve', [['larve', -95, 30], ['larve', -110, 0], ['larve', -100, 45]], [40, 90, 130, 160, 200], { tour: 0.004 }],
        ['mine', [['mine', 75, 14], ['mine', 120, -26], ['mine', 160, 30]], [30, 55, 75, 95, 110], { fige: 0, tour: 0, mag: 0.3 }],
        ['tourelle', [['tourelle', 100, -50]], [70, 110, 130, 150, 175], { fige: 0, tour: 0.004 }],
        ['sentinelle', [['sentinelle', 70, -40]], [100, 150, 175, 185, 195], {}],
        ['traqueur', [['traqueur', -100, 10]], [20, 60, 100, 140, 180], {}]
      ];
      for (const [nom, L, temps, o] of cas) {
        await preparer(page, Object.assign({ ang: 0, mag: 0.35, tour: 0.012, fige: 80 }, o));
        await spawn(page, L);
        let t0 = 0; const T = [];
        for (let k = 0; k < temps.length; k++) {
          await images(page, temps[k] - t0); t0 = temps[k];
          T.push(await tampon(page));
          if (k === 2) await capture(page, path.join(SORTIE, `${pre}${nom}.png`));
        }
        planche(T, path.join(SORTIE, `${pre}planche-${nom}.png`), { x: 40, y: 10, w: 340, h: 175 }, 2, 2);
      }
    }
    if (SCENE === 'tous' || SCENE === 'groupe') {
      await preparer(page, { ang: 0, mag: 0.4, len: 20, tour: 0.012 });
      await spawn(page, [['fleche', 100, 30], ['fleche', 110, -10], ['fleche', 120, 50], ['dard', 70, -60], ['dard', 60, 70],
        ['larve', -50, 20], ['larve', -60, 0], ['larve', -40, 30], ['larve', -70, 40], ['mine', 60, -20], ['mine', 140, 0],
        ['tourelle', 120, -60], ['sentinelle', -80, -50], ['traqueur', -120, 60], ['fleche', 90, 10, { mods: { rapide: true } }]]);
      const T = [];
      for (let k = 0; k < 6; k++) { await images(page, 27); T.push(await tampon(page)); if (k === 3) await capture(page, path.join(SORTIE, `${pre}groupe.png`)); }
      planche(T, path.join(SORTIE, `${pre}planche-groupe.png`), null, 2, 2);
    }
    if (SCENE === 'tous' || SCENE === 'inversion') {
      await preparer(page, { ang: 0, mag: 0.4, len: 16, tour: 0.01 });
      await spawn(page, [['fleche', 60, 30], ['fleche', 80, -30], ['dard', 70, -50], ['larve', -40, 20], ['larve', -50, -10], ['mine', 50, 0],
        ['tourelle', 100, -40], ['sentinelle', -70, -40], ['traqueur', -90, 30]]);
      await images(page, 55);
      await page.evaluate(() => window.__N.ennemis.inverser(5));
      const T = [8, 30, 60, 120, 250, 268];
      let t0 = 0;
      const B = [];
      for (let k = 0; k < T.length; k++) { await images(page, T[k] - t0); t0 = T[k]; B.push(await tampon(page)); if (k === 1) await capture(page, path.join(SORTIE, `${pre}inversion.png`)); }
      planche(B, path.join(SORTIE, `${pre}planche-inversion.png`), null, 2, 2);
    }
    const err = await page.evaluate(() => window.__ERR && window.__ERR.count);
    console.log('erreurs :', err, s.erreurs.slice(0, 5));
  } finally { await s.fin(); await fermer(); }
}
if (import.meta.url === 'file://' + process.argv[1]) await principal();
