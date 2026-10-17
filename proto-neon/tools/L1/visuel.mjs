/* tools/L1/visuel.mjs — les captures du lot 1, à regarder : l'extinction du tube (image par image), l'affichage
   ?perf=1, le manche flottant, le réticule de la souris, la caméra au ras d'un mur, le TRAVELLING annoncé.
   Usage : node tools/L1/visuel.mjs [--url URL] → tools/L1/sortie/*.png et visuel.json */
import { ouvrir, fermerTout, Rapport, Doigts } from './commun.mjs';

const R = new Rapport('visuel');
try {
  /* l'extinction : l'image s'écrase en une ligne, puis en un point, l'écran reste noir, puis se rallume */
  {
    const s = await ouvrir('paysage', { dt: 1 / 60 });
    await s.eval(() => { __N.game.dbg.vague(1); __N.game.dbg.god(true); __N.dir.update = function () { }; __N.crt.auto(false); __N.crt.preset('riche'); });
    await s.images(30);
    await s.eval(() => { window.__L1ext = []; const f = () => { __L1ext.push(__N.crt.stats.ext); if (__L1ext.length < 400) requestAnimationFrame(f); }; f(); __N.crt.extinction(0.9); });
    for (const [i, ms] of [[1, 150], [2, 350], [3, 560], [4, 760], [5, 1100]]) { await s.page.waitForTimeout(ms - (i > 1 ? [0, 150, 350, 560, 760][i - 1] : 0)); R.capture(await s.capture('extinction-' + i)); }
    await s.eval(() => { __N.game.dbg.etat('pause'); });
    await s.page.waitForTimeout(400);
    R.capture(await s.capture('extinction-6-rallume'));
    const phases = await s.eval(() => __L1ext.filter((x, i) => i === 0 || x !== __L1ext[i - 1]));
    R.verifie('extinction : phases parcourues', phases, 'non → extinction → eteint → rallumage → non', phases.join() === 'non,extinction,eteint,rallumage,non');
    /* tube coupé : l'extinction marche aussi */
    await s.eval(() => { __N.game.dbg.vague(1); __N.crt.preset('coupe'); window.__L1ext = []; __N.crt.extinction(0.5); const f = () => { __L1ext.push(__N.crt.stats.ext); if (__L1ext.length < 80) requestAnimationFrame(f); }; f(); });
    await s.page.waitForTimeout(250);
    R.capture(await s.capture('extinction-tube-coupe'));
    await s.page.waitForTimeout(500);
    const ph2 = await s.eval(() => [...new Set(__L1ext)]);
    R.verifie('extinction, tube coupé : elle a lieu', ph2, 'extinction, eteint', ph2.includes('extinction') && ph2.includes('eteint'));
    const e = await s.err(); R.verifie('extinction : zéro erreur', e, '0', e.zero);
    await s.fermer();
  }
  /* ?perf=1 sur la scène charge, et le manche flottant */
  {
    const s = await ouvrir('paysage', { dt: 1 / 60, query: { perf: '1', scene: 'charge' }, cdp: true });
    await s.eval(() => { __N.game.dbg.god(true); __N.dir.update = function () { }; });
    await s.page.waitForTimeout(1500);
    const d = await new Doigts(s).init();
    const id = await d.poser(150, 300); await d.glisser(id, 185, 285, 120); await d.attendre(200);
    R.capture(await s.capture('perf-et-manche'));
    await d.toutLever();
    const e = await s.err(); R.verifie('?perf=1 : zéro erreur', e, '0', e.zero);
    await s.fermer();
  }
  /* bureau : le réticule, puis caché après 1,5 s d'immobilité ; la caméra au ras d'un mur */
  {
    const s = await ouvrir('bureau', { dt: 1 / 60 });
    await s.eval(() => { __N.game.dbg.vague(1); __N.game.dbg.god(true); __N.dir.update = function () { }; });
    await s.page.mouse.move(700, 300); await s.page.mouse.move(900, 250, { steps: 5 });
    await s.images(10);
    R.capture(await s.capture('reticule'));
    const vu = await s.eval(() => document.getElementById('out').style.cursor);
    await s.page.waitForTimeout(1800);
    const cache = await s.eval(() => [__N.gfx.buf().length, document.getElementById('out').style.cursor]);
    R.verifie('souris : curseur système caché pendant le jeu', { pendant: vu, apres: cache[1] }, 'none', vu === 'none');
    await s.eval(() => { const N = __N, w = N.world; N.joueuse.reset({ x: w.x1 - 40, y: w.y0 + 30, ang: -0.6 }); N.cam.reset(); __S.input.x = 1; __S.input.y = -1; __S.input.mag = 1; });
    await s.page.keyboard.down('ArrowRight'); await s.page.keyboard.down('ArrowUp'); await s.page.waitForTimeout(900);
    R.capture(await s.capture('coin'));
    await s.page.keyboard.up('ArrowRight'); await s.page.keyboard.up('ArrowUp');
    const e = await s.err(); R.verifie('bureau : zéro erreur', e, '0', e.zero);
    await s.fermer();
  }
  /* le TRAVELLING : positions annoncées dès le premier instant (dessinées par le repli du décor) */
  {
    const s = await ouvrir('paysage', { dt: 1 / 60 });
    await s.eval(() => { const N = __N; N.game.dbg.vague(2); N.game.dbg.god(true); N.dir.update = function () { }; N.world.travelling({ vx: 14, depuis: 'gauche' }); });
    await s.page.waitForTimeout(700);
    R.capture(await s.capture('travelling-mise-en-place'));
    await s.page.waitForTimeout(3500);
    R.capture(await s.capture('travelling-en-route'));
    await s.fermer();
  }
} finally { await fermerTout(); }
console.log('→ ' + R.ecrire());
