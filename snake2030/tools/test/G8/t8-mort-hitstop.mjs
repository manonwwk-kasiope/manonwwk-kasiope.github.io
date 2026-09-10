/* G8 — contrôle du médiateur : la mort gèle-t-elle bien 8 images ?
 *
 * Spécification (« quoi ») : « valeurs : kill ordinaire 2, élite/boss 5, blessure 4, mort 8 ».
 * Aucun des sept tests d'acceptation ne mesure la mort. L'exécuteur a signalé, EN LISANT, que
 * _fxHitstop (src/20-fx.js) rabat au plafond de 6 une demande de 8 déjà posée dès qu'une demande
 * plus petite suit, sans trouver de chemin de jeu qui l'atteigne. Il y en a un, dans collide()
 * (src/10-core.js) : le contact d'un ennemi « suicide » (la MINE) appelle hurtSnake() PUIS
 * killEnemy() dans la MÊME image. Si le coup est mortel, die() pose 8 et le kill qui suit pose 2
 * — le gel de mort retomberait alors à 6. Ce script mesure lequel des deux se produit.
 *
 * PROTOCOLE. La mort est provoquée DANS l'image, par le chemin du jeu : l'action armée (crochet
 * sur weapons.update) remet l'invulnérabilité à zéro et la longueur à 2, l'ennemi est posé sur la
 * tête, et c'est collide() qui appelle hurtSnake() → die(). Deux cas, chacun dans une page NEUVE
 * (une mort ferme la partie) : contact d'une MINE (suicide) et contact d'un TRAQUEUR (témoin).
 * On compte les images consécutives à S.dt < 0,006 à partir de l'image SUIVANT la pose, comme
 * le test 1.
 *
 * Sortie : out/G8-t8-mort-hitstop.json. Code 0 si les deux cas gèlent 8 images.
 */
import { launchDesktop, startGame, finish, save, deadline } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, installSpies, readProbe, readSpies,
         clearProbeBufs, arm, waitFired, waitFrames, runBelow, SEED } from './g8lib.mjs';

const ACT = `
  const s = S.snake;
  const e = S.enemies.find(x => x.id >= 900000 && !x.dead);
  if (!e) throw new Error('aucun ennemi de laboratoire');
  e.x = s.x; e.y = s.y;
  window.__G8pin = { x: s.x, y: s.y, ang: 0, speed: 0 };   // ni len ni invuln : la mort doit pouvoir arriver
  s.invuln = 0; s.ghost = 0; s.len = 2; s.hp = 2;
  return { type: e.type, suicide: !!e.suicide, dmg: e.dmg, len: s.len, phase: S.phase };
`;

async function one(type) {
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });
  try {
    const { page } = ctx;
    await startGame(ctx, { seed: SEED });
    await installArena(page, { onlyLab: true, noFire: true, keepEB: true, dt: 1 / 60 });
    await installLab(page);
    await installFrameProbe(page, { cap: 4000 });
    await installSpies(page, {});
    await page.evaluate((t) => {
      const S = window.__S, K = window.__K;
      try { window.__M.phases.forcePhase(0); } catch (e) {}
      window.__G8pin = { x: K.ARENA_W / 2, y: K.ARENA_H / 2, ang: 0, speed: 0, len: 30, invuln: 1e9, ghost: 0 };
      S.up = {}; S.combo = 0; S.mult = 1; S.snake.shield = 0;
      window.__lab.spawn(t, 0, 0, null);
    }, type);
    await waitFrames(page, 24);
    await clearProbeBufs(page);
    await readSpies(page, true);
    await arm(page, ACT);
    const fired = await waitFired(page);
    await waitFrames(page, 30);
    const p = await readProbe(page, true);
    const sp = await readSpies(page, true);
    const F = fired.fi;
    const gel = runBelow(p.rec, F + 1, 0.006);
    const around = p.rec.filter(r => r.fi >= F - 1 && r.fi <= F + 12)
      .map(r => ({ d: r.fi - F, dt: +(+r.dt).toFixed(5), hs: r.hs, ph: r.ph, len: r.len }));
    const mort = p.rec.some(r => r.fi >= F && r.fi <= F + 3 && r.ph === 'dead');
    return { type, info: fired.info || fired.error || null, gel, mort,
      sfx: sp.sfx.filter(o => o.fi >= F && o.fi <= F + 2).map(o => o.name),
      pageErrors: ctx.pageErrors.length, around };
  } finally { await ctx.close(); }
}

(async () => {
  deadline(420, 'G8-t8-mort-hitstop');
  const r = { test: 'G8-t8-mort-hitstop', seed: SEED, cible: 8 };
  try {
    r.cas = [];
    r.cas.push(await one('chaser'));   // témoin : aucun kill dans l'image de la mort
    r.cas.push(await one('mine'));     // suicide : killEnemy suit hurtSnake dans l'image
    const ok = r.cas.every(c => c.mort && c.gel === 8 && c.pageErrors === 0);
    r.pass = ok;
    r.measured = {
      gelParCas: r.cas.map(c => c.type + (c.info && c.info.suicide ? ' (suicide)' : '') + ' : ' + c.gel +
        ' image(s)' + (c.mort ? '' : ' — MORT NON SURVENUE')),
      morts: r.cas.map(c => c.mort), pageErrors: r.cas.map(c => c.pageErrors)
    };
    r.threshold = 'images consécutives à S.dt < 0,006 après l\'image de la mort = 8, que l\'ennemi soit suicide ou non';
    save('G8-t8-mort-hitstop.json', r);
    finish('G8-t8-mort-hitstop', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-t8-mort-hitstop.json', r);
    finish('G8-t8-mort-hitstop', r);
  }
})();
