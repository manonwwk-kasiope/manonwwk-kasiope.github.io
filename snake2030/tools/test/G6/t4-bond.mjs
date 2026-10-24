// G6 test 4 — annonce du bond du traqueur (chaser) : ≥ 450 ms, mod RAPIDE compris.
// Laboratoire bureau 1440×900, arène vide (seuls les traqueurs du laboratoire vivent), tête figée et
// invulnérable, pas de temps imposé 1/60 s, graine imposée. Huit traqueurs sont posés en anneau à 150 u :
// ils enchaînent annonce (st 0→1) puis bond (st 1→2) ; on mesure la durée annonce → attaque en temps de JEU
// pour chaque bond, d'abord sans mod, puis avec le mod 'fast' (RAPIDE).
// Seuil (spec G6) : p10 ≥ 450 ms pour le traqueur rapide (183 ms aujourd'hui) ET pour le nominal (317 ms).
// « 20 sims » est lu comme 20 mesures d'annonce par variante : c'est la même population, mesurée au banc.
import { launchDesktop, startGame, save, finish, deadline, sleep } from '../lib.mjs';
import { SEED, emptyArena, installLab } from './g6lib.mjs';
import { PROBE_SRC, pct } from '../enprobe.mjs';

deadline(420, 4);
const THRESH = 'durée annonce → bond du traqueur : p10 ≥ 450 ms, nominal et mod RAPIDE, sur ≥ 20 bonds par variante';
const WANT = +(process.env.S2030_G6T4_N || 20);
const m = { variantes: {} };
let code = 1;

const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
try {
  await startGame(ctx, { seed: SEED });
  await emptyArena(page, { noFire: true, onlyLab: true });
  await installLab(page);
  await page.evaluate(PROBE_SRC);
  // tête figée, invulnérable et immobile : les traqueurs restent à portée de bond et rien ne les tue
  await page.evaluate(() => {
    const S = window.__S;
    window.__pin = { x: 1600, y: 900, ang: 0 };
    if (!window.__pinOn) {
      window.__pinOn = true;
      (function g() { requestAnimationFrame(g); const p = window.__pin, s = S.snake; if (!p || !s) return; s.x = p.x; s.y = p.y; s.ang = p.ang; s.aim = p.ang; s.speed = 0; s.invuln = 1e9; s.ghost = 1e9; S.cam.x = p.x; S.cam.y = p.y; })();
    }
  });
  await sleep(500);

  const api = await page.evaluate(() => {
    const d = window.__M.enemies.defs.chaser, mods = window.__M.enemies.mods;
    return { chaser: !!d, lungeWind: d ? d.lungeWind : null, fastMod: !!(mods && mods.fast) };
  });
  m.api = api;
  if (!api.chaser || !api.fastMod) { m.pourquoi = 'defs.chaser ou mods.fast absent'; code = 2; }
  else {
    for (const variante of ['nominal', 'fast']) {
      await page.evaluate((v) => {
        const S = window.__S;
        S.enemies.length = 0;
        window.__EP.reset();
        for (let i = 0; i < 8; i++) {
          const a = i * Math.PI * 2 / 8;
          window.__lab.spawn('chaser', Math.cos(a) * 150, Math.sin(a) * 150, v === 'fast' ? { mod: 'fast' } : null);
        }
      }, variante);
      // on laisse tourner jusqu'à WANT bonds mesurés, plafond 70 s de temps de jeu
      const t0 = await page.evaluate(() => window.__S.t);
      let ann = [];
      for (let k = 0; k < 160; k++) {
        ann = await page.evaluate(() => window.__EP.L.tele.filter(e => e.kind === 'attack' && e.type === 'chaser' && e.announce != null).map(e => e.announce));
        const t = await page.evaluate(() => window.__S.t);
        if (ann.length >= WANT || t - t0 > 70000) break;
        // les traqueurs poussés au loin par leur bond sont ramenés à portée
        await page.evaluate(() => {
          const S = window.__S, s = S.snake;
          for (const e of S.enemies) {
            const d = Math.hypot(e.x - s.x, e.y - s.y);
            if (d > 340) { const a = Math.atan2(e.y - s.y, e.x - s.x); e.x = s.x + Math.cos(a) * 150; e.y = s.y + Math.sin(a) * 150; }
          }
        });
        await sleep(250);
      }
      const sorted = [...ann].sort((a, b) => a - b);
      m.variantes[variante] = { n: ann.length, p10: pct(ann, 0.10), p50: pct(ann, 0.5), min: sorted[0] ?? null,
        max: sorted[sorted.length - 1] ?? null, moyenne: ann.length ? +(ann.reduce((a, b) => a + b, 0) / ann.length).toFixed(0) : null,
        valeurs: sorted.slice(0, 30) };
    }
    const N = m.variantes.nominal, F = m.variantes.fast;
    if (!N || !F || N.n < WANT || F.n < WANT) {
      m.pourquoi = 'moins de ' + WANT + ' bonds mesurés (nominal ' + (N ? N.n : 0) + ', rapide ' + (F ? F.n : 0) + ')';
      code = 2;
    } else code = (N.p10 >= 450 && F.p10 >= 450) ? 0 : 1;
  }
  m.erreursPage = ctx.pageErrors.slice(0, 4).concat(ctx.consoleErrors.slice(0, 4));
} catch (e) {
  m.erreur = String(e && e.stack || e).slice(0, 500);
  code = 2;
} finally {
  await ctx.close();
}
save('G6-t4-bond.json', m);
finish(4, { pass: code === 0, code, measured: m, threshold: THRESH });
