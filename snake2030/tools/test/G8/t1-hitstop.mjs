/* G8 — test 1 : le hitstop se compte en IMAGES, et le compte ne dépend pas de la cadence.
 *
 * Spécification : « après un kill réel de traqueur, exactement 2 images consécutives avec S.dt < 0,006
 * (aujourd'hui 0) ; élite 5 ; hurtSnake 4 ; à 30 im/s simulées (throttle CDP) mêmes nombres d'images. »
 *
 * PROTOCOLE. Le déclenchement est posé DANS l'image, depuis un crochet sur S2030.weapons.update
 * (appelé par frame() avant collide) : un projectile JOUEUR est déposé sur l'ennemi, et c'est
 * collide() → damageEnemy() → killEnemy() qui tue, dans la même image, par le chemin du jeu. Poser le
 * kill depuis Node (page.evaluate) le placerait ENTRE deux images et décalerait le compte.
 * La grandeur relevée est S.dt (le pas de temps du JEU), lue en fin d'image par une boucle
 * requestAnimationFrame posée après celle du jeu — jamais l'écart entre images d'affichage, qui reste
 * à 16,7 ms pendant un ralenti et ne dit rien du gel.
 * L'image de la pose est exclue du compte : la spécification demande que le décompte n'ait jamais
 * lieu dans l'image de pose, donc la suite gelée commence à l'image suivante.
 *
 * DEUX RÉGIMES. A : 30 im/s ← window.__DT = 1/30 (pas de temps du jeu de 33,3 ms) ET bridage CPU par
 * CDP (Emulation.setCPUThrottlingRate), pour que la cadence RÉELLE tombe aussi. B : 60 im/s.
 * Un hitstop compté en images doit rendre le même nombre dans les deux.
 *
 * Sortie : out/G8-t1-hitstop.json. Code 0 si les trois comptes valent 2 / 5 / 4 dans les deux régimes.
 */
import { launchDesktop, startGame, finish, save, deadline, sleep } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, installSpies, readProbe, readSpies, clearProbeBufs,
         arm, waitFired, waitFrames, pin, runBelow, SEED } from './g8lib.mjs';

const TARGET = { kill: 2, elite: 5, hurt: 4 };
const REPS = +(process.env.S2030_G8T1_REPS || 3);

/* Actions armées : corps d'une fonction (S, M, K, G). Elles tournent au milieu de l'image. */
const ACT_KILL = `
  const e = S.enemies.find(x => x.id >= 900000 && !x.dead);
  if (!e) throw new Error('aucun ennemi de laboratoire');
  const a = 0;                                  // vecteur du tir : vers +x
  window.__lab.bullet(e.x, e.y, Math.cos(a) * 300, Math.sin(a) * 300, { dmg: 9999, r: 5 });
  return { ex: e.x, ey: e.y, elite: !!e.elite, type: e.type, hp: e.hp, kills: S.kills };
`;
const ACT_HURT = `
  const s = S.snake;
  s.invuln = 0;
  window.__lab.ebullet(s.x + 8, s.y, 0, 0, { dmg: 1, r: 6 });
  return { hx: s.x + 8, hy: s.y, len: s.len, kills: S.kills };
`;

async function quiet(page, frames = 14) {
  await clearProbeBufs(page);
  await readSpies(page, true);
  await waitFrames(page, frames);
  const p = await readProbe(page, true);
  const tail = p.rec.slice(-8);
  return { calm: tail.every(r => r.dt >= 0.006 && r.hs <= 0), dts: tail.map(r => +r.dt.toFixed(5)), hs: tail.map(r => r.hs) };
}

async function one(ctx, kind) {
  const { page } = ctx;
  const before = await quiet(page);
  await arm(page, kind === 'hurt' ? ACT_HURT : ACT_KILL);
  const fired = await waitFired(page);
  await waitFrames(page, 26);
  const p = await readProbe(page, true);
  const sp = await readSpies(page, true);
  const F = fired.fi;
  const run = runBelow(p.rec, F + 1, 0.006);
  const around = p.rec.filter(r => r.fi >= F - 2 && r.fi <= F + 12)
    .map(r => ({ d: +r.fi - F, dt: +r.dt.toFixed(5), hs: +(+r.hs).toFixed(2), ts: r.ts, k: r.kills, len: r.len }));
  const kAfter = p.rec.length ? p.rec[p.rec.length - 1].kills : -1;
  const win = o => o.fi >= F - 1 && o.fi <= F + 2;
  /* Preuve que l'événement a bien eu lieu par le chemin du jeu : le son et le nombre de kills pour un
     kill, le son 'hurt' ou la perte d'un anneau dans l'image pour une blessure (le serpent est
     ré-allongé à l'image suivante par l'épinglage, la preuve se lit donc DANS la fenêtre). */
  const sfxWin = sp.sfx.filter(win).map(s => s.name);
  const lens = p.rec.filter(r => r.fi >= F && r.fi <= F + 2).map(r => r.len);
  const happened = kind === 'hurt'
    ? (sfxWin.indexOf('hurt') >= 0 || lens.some(v => v >= 0 && v < 30))
    : (fired.info && kAfter > fired.info.kills);
  return { kind, calmBefore: before.calm, fired: fired.info || fired.error || null, run, happened,
    killsBefore: fired.info ? fired.info.kills : null, killsAfter: kAfter, lensInWindow: lens,
    sfx: sfxWin, flash: sp.flash.filter(win), around, err: p.err };
}

async function regime(ctx, name, dt, throttle) {
  const { page, cdp } = ctx;
  if (throttle) { try { await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle }); } catch (e) {} }
  else { try { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); } catch (e) {} }
  await page.evaluate(d => { window.__DT = d; window.__G8arena.dt = d; }, dt);
  await sleep(200);

  const out = { name, dtImposed: dt, throttle: throttle || 1, cases: {} };
  for (const kind of ['kill', 'elite', 'hurt']) {
    const runs = [];
    for (let i = 0; i < REPS; i++) {
      // scène propre pour chaque répétition
      await page.evaluate((k) => {
        const S = window.__S, M = window.__M;
        window.__lab.clear();
        S.ult = 0; S.combo = 0; S.mult = 1; S.multT = 0;
        window.__G8arena.clearAll = (k === 'hurt');
        window.__G8arena.onlyLab = (k !== 'hurt');
        window.__G8pin = { x: window.__K.ARENA_W / 2, y: window.__K.ARENA_H / 2, ang: 0, speed: 0,
          len: 30, invuln: k === 'hurt' ? 0 : 1e9, ghost: k === 'hurt' ? 0 : 1e9 };
        if (k !== 'hurt') window.__lab.spawn('chaser', 260, 0, k === 'elite' ? { elite: true } : null);
      }, kind);
      await waitFrames(page, 6);
      runs.push(await one(ctx, kind));
    }
    const vals = runs.map(r => r.run);
    out.cases[kind] = { target: TARGET[kind], runs: vals, ok: vals.length > 0 && vals.every(v => v === TARGET[kind]), detail: runs };
  }
  // cadence réelle observée dans ce régime (pour prouver que le bridage agit)
  await clearProbeBufs(page);
  await waitFrames(page, 40);
  const p = await readProbe(page, true);
  const gaps = [];
  for (let i = 1; i < p.rec.length; i++) gaps.push(p.rec[i].now - p.rec[i - 1].now);
  gaps.sort((a, b) => a - b);
  out.rafMedianMs = gaps.length ? +gaps[gaps.length >> 1].toFixed(2) : null;
  return out;
}

(async () => {
  deadline(600, 'G8-t1-hitstop');
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });   // pas de temps imposé dès le chargement
  const r = { test: 'G8-t1-hitstop', url: process.env.S2030_URL || null, seed: SEED, reps: REPS };
  try {
    const { page } = ctx;
    await startGame(ctx, { seed: SEED });
    // ORDRE IMPOSÉ : l'arène remplace weapons.update (noFire) ; la sonde doit l'envelopper ENSUITE,
    // sinon son crochet d'armement serait écrasé.
    await installArena(page, { onlyLab: true, noFire: true, keepEB: true, dt: 1 / 60 });
    await installLab(page);
    await installFrameProbe(page, { cap: 4000 });
    await installSpies(page, {});
    await page.evaluate(() => { try { window.__M.phases.forcePhase(0); } catch (e) {} });   // ortho : rien ne bouge sous la mesure
    await pin(page, { x: 0, y: 0, ang: 0, speed: 0, len: 30, invuln: 1e9, ghost: 1e9 });
    await page.evaluate(() => {
      const K = window.__K;
      window.__G8pin.x = K.ARENA_W / 2; window.__G8pin.y = K.ARENA_H / 2;
    });
    await waitFrames(page, 30);

    r.regimes = [];
    r.regimes.push(await regime(ctx, '60 im/s', 1 / 60, 0));
    r.regimes.push(await regime(ctx, '30 im/s (DT 1/30 + bridage CPU ×4)', 1 / 30, 4));

    r.pageErrors = ctx.pageErrors.slice(0, 5);
    r.consoleErrors = ctx.consoleErrors.slice(0, 5);
    r.errCount = await page.evaluate(() => window.__ERR ? window.__ERR.count : null);

    const cases = ['kill', 'elite', 'hurt'];
    const meas = {};
    for (const c of cases) meas[c] = r.regimes.map(g => g.cases[c].runs);
    const events = {};
    for (const c of cases) events[c] = r.regimes.every(g => g.cases[c].detail.every(d => d.happened));
    r.eventsHappened = events;
    const allEvents = cases.every(c => events[c]);
    const pass = r.regimes.every(g => cases.every(c => g.cases[c].ok)) && allEvents && ctx.pageErrors.length === 0;
    r.pass = pass;
    r.measured = {
      resume: cases.map(c => c + ' : ' + r.regimes.map(g => '[' + g.cases[c].runs.join(',') + ']').join(' / ') + ' (cible ' + TARGET[c] + ')').join(' ; '),
      parCas: meas, cadenceRafMs: r.regimes.map(g => g.rafMedianMs), evenementsReels: events, pageErrors: ctx.pageErrors.length
    };
    r.threshold = 'images consécutives à S.dt < 0,006 après la pose, dans l\'image : kill ordinaire = 2, élite = 5, hurtSnake = 4 ; identiques à 60 et à 30 im/s';
    save('G8-t1-hitstop.json', r);
    await ctx.close();
    finish('G8-t1-hitstop', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-t1-hitstop.json', r);
    await ctx.close();
    finish('G8-t1-hitstop', r);
  }
})();
