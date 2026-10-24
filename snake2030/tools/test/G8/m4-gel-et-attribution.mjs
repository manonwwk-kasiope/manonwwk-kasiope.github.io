/* G8 — contrôle du MÉDIATEUR nº 4 : les cinq valeurs de gel, comptées par une sonde à moi, et la
 * preuve que l'attribution de la bannière à useUlt fonctionne.
 *
 * (A) GEL. La spec fixe : « kill ordinaire 2, élite/boss 5, blessure 4, mort 8 », « jamais dans
 * l'image de pose ». Je ne me sers pas des compteurs des scripts d'acceptation : j'installe ma
 * propre boucle de FIN d'image (window.__MED) qui relève S.dt et fx.hitstopLeft() image par image,
 * et je compte moi-même les images consécutives à S.dt < 0,006 après l'image de la pose. Tout est
 * posé DANS l'image, depuis le crochet sur weapons.update, et c'est collide() qui frappe :
 *   kill      — balle joueur sur un traqueur à 1 point de vie ;
 *   élite     — même chose sur un traqueur élite ;
 *   blessure  — projectile ennemi de dégât 1 sur la tête ;
 *   mort MINE — ennemi suicide sur la tête, longueur 1 (hurtSnake puis killEnemy dans la MÊME
 *               image : c'est le cas qui rabattait 8 à 6 à la tentative 1) ;
 *   mort TRAQUEUR — témoin, un seul appel de gel dans l'image.
 * Les deux morts se jouent dans des pages neuves (une mort ferme la partie).
 *
 * (B) ATTRIBUTION. Le test 4 rejetait TOUT ui.banner('SURCHARGE'), là où la spec ne l'interdit
 * qu'à useUlt — et le boss du niveau 4+ porte ce nom exact. J'ai corrigé le script (attribution par
 * la pile d'appels) ; encore faut-il prouver que la pile porte bien « useUlt ». Contrôle POSITIF
 * sur la vraie fonction : on relève la pile depuis fx.flash, que useUlt appelle réellement, après
 * un ultime déclenché à la touche R. Contrôle NÉGATIF : la même pile relevée sur un flash posé
 * depuis le crochet d'armement ne doit pas porter useUlt.
 *
 * Sortie : out/G8-m4-gel-attribution.json.
 */
import { launchDesktop, startGame, finish, save, deadline, sleep } from '../lib.mjs';
import { installArena, installLab, installFrameProbe, clearProbeBufs, arm, waitFired, waitFrames, r2, r3, SEED } from './g8lib.mjs';

/* Ma sonde : boucle rAF posée après celle du jeu ; S.dt y est la valeur de l'image écoulée. */
async function installMed(page) {
  await page.evaluate(() => {
    const S = window.__S, M = window.__M;
    const A = window.__MED = { i: 0, rec: [] };
    (function tick() {
      requestAnimationFrame(tick);
      A.i++;
      A.rec.push({ i: A.i, dt: S.dt, t: S.t, ts: S.timeScale,
        hs: M.fx.hitstopLeft ? M.fx.hitstopLeft() : -1, ph: S.phase, len: S.snake ? S.snake.len : -1 });
      if (A.rec.length > 4000) A.rec.shift();
    })();
  });
}
async function medClear(page) { await page.evaluate(() => { window.__MED.rec.length = 0; }); }
/* Images consécutives à dt < seuil À PARTIR de l'image qui suit celle de la pose. La sonde G8 et la
   mienne comptent les images séparément ; on aligne sur le temps de jeu de l'action armée. */
async function medRun(page, tArm, thr = 0.006) {
  return page.evaluate(([tArm, thr]) => {
    const rec = window.__MED.rec;
    let k = -1;
    for (let i = 0; i < rec.length; i++) if (rec[i].t >= tArm) { k = i; break; }   // image de la pose
    if (k < 0) return { n: -1, serie: [] };
    let n = 0;
    for (let i = k + 1; i < rec.length; i++) { if (rec[i].dt < thr) n++; else break; }
    return { n, imagePose: rec[k].i, serie: rec.slice(Math.max(0, k - 1), k + 13).map(o => ({ dt: +o.dt.toFixed(5), hs: o.hs, ts: +o.ts.toFixed(3), ph: o.ph })) };
  }, [tArm, thr]);
}

const ACT_KILL = elite => `
  const s = S.snake;
  const e = S.enemies.find(x => x.id >= 900000 && !x.dead);
  if (!e) throw new Error('aucun ennemi de laboratoire');
  e.hp = 1; e.x = s.x + 120; e.y = s.y;
  window.__lab.bullet(e.x, e.y, 400, 0, { dmg: 5, r: 6 });
  return { elite: ${elite ? 'true' : 'false'}, eElite: !!e.elite, type: e.type, t: S.t };
`;
const ACT_HURT = `
  const s = S.snake; s.invuln = 0;
  window.__lab.ebullet(s.x + 8, s.y, 0, 0, { dmg: 1, r: 6 });
  return { t: S.t };
`;
const ACT_DEATH = `
  const s = S.snake;
  const e = S.enemies.find(x => x.id >= 900000 && !x.dead);
  if (!e) throw new Error('aucun ennemi de laboratoire');
  e.x = s.x; e.y = s.y;
  window.__G8pin = { x: s.x, y: s.y, ang: 0, speed: 0 };
  s.invuln = 0; s.ghost = 0; s.len = 1; s.hp = 1;
  return { type: e.type, suicide: !!e.suicide, t: S.t };
`;

async function lab(fn) {
  const ctx = await launchDesktop(1440, 900, { init: ['window.__DT = 1/60;'] });
  try {
    const { page } = ctx;
    await startGame(ctx, { seed: SEED });
    await installArena(page, { onlyLab: true, noFire: true, keepEB: true, dt: 1 / 60 });
    await installLab(page);
    await installFrameProbe(page, { cap: 4000 });
    await installMed(page);
    await page.evaluate(() => {
      const K = window.__K;
      window.__G8pin = { x: K.ARENA_W / 2, y: K.ARENA_H / 2, ang: 0, speed: 0, len: 30, invuln: 1e9, ghost: 0 };
      window.__G8freeze = 1;
    });
    await waitFrames(page, 40);
    const out = await fn(page, ctx);
    out.pageErrors = ctx.pageErrors.slice(0, 5);
    out.errCount = await page.evaluate(() => window.__ERR ? window.__ERR.count : null);
    await ctx.close();
    return out;
  } catch (e) { await ctx.close(); throw e; }
}

async function mesureGel(page, act, spawn) {
  await page.evaluate((sp) => { window.__lab.clear(); window.__lab.spawn(sp.type, 200, 0, sp.mods || null); }, spawn);
  await waitFrames(page, 20);
  await clearProbeBufs(page); await medClear(page);
  await arm(page, act);
  const f = await waitFired(page);
  await waitFrames(page, 30);
  const run = await medRun(page, f.info.t);
  return { info: f.info, gel: run.n, imagePose: run.imagePose, serie: run.serie };
}

(async () => {
  deadline(900, 'G8-m4-gel-attribution');
  const r = { test: 'G8-m4-gel-attribution', seed: SEED };
  try {
    /* --- page 1 : kill, élite, blessure, et l'attribution de la bannière --- */
    r.vivant = await lab(async (page, ctx) => {
      const o = {};
      o.kill = await mesureGel(page, ACT_KILL(false), { type: 'chaser' });
      o.elite = await mesureGel(page, ACT_KILL(true), { type: 'chaser', mods: { elite: true } });
      await page.evaluate(() => { window.__G8pin.invuln = 0; });
      o.blessure = await mesureGel(page, ACT_HURT, { type: 'chaser' });
      await page.evaluate(() => { window.__G8pin.invuln = 1e9; });

      /* (B) attribution : pile relevée depuis fx.flash, que useUlt appelle réellement */
      await page.evaluate(() => {
        const M = window.__M;
        window.__MEDstk = [];
        const oF = M.fx.flash;
        M.fx.flash = function () {
          let st = ''; try { st = String(new Error().stack || ''); } catch (e) {}
          window.__MEDstk.push({ a: arguments[1], mode: arguments[2] || '',
            useUlt: /\buseUlt\b/.test(st), pile: st.split('\n').slice(1, 6).map(s => s.trim()).join(' | ') });
          return oF.apply(this, arguments);
        };
        window.__S.ult = window.__S.ultMax;
      });
      await waitFrames(page, 5);
      await page.keyboard.press('r');
      await waitFrames(page, 20);
      const stkUlt = await page.evaluate(() => { const a = window.__MEDstk.slice(); window.__MEDstk.length = 0; return a; });
      /* contrôle négatif : un flash posé depuis le crochet d'armement */
      await arm(page, `M.fx.flash('#ffffff', 0.9, null, null, 100); return { t: S.t };`);
      await waitFired(page);
      await waitFrames(page, 5);
      const stkAutre = await page.evaluate(() => window.__MEDstk.slice());
      o.attribution = {
        flashsPendantUltime: stkUlt.length,
        controlePositif: stkUlt.some(s => s.useUlt),
        pilesUltime: stkUlt.slice(0, 3),
        controleNegatif: stkAutre.length ? stkAutre.every(s => !s.useUlt) : null,
        pilesAutre: stkAutre.slice(0, 2)
      };
      return o;
    });

    /* --- pages neuves : les deux morts (une mort ferme la partie) --- */
    r.mortMine = await lab(async (page) => ({ m: await mesureGel(page, ACT_DEATH, { type: 'mine' }) }));
    r.mortTraqueur = await lab(async (page) => ({ m: await mesureGel(page, ACT_DEATH, { type: 'chaser' }) }));

    const G = {
      kill: r.vivant.kill.gel, elite: r.vivant.elite.gel, blessure: r.vivant.blessure.gel,
      mortMine: r.mortMine.m.gel, mortTraqueur: r.mortTraqueur.m.gel
    };
    const cibles = { kill: 2, elite: 5, blessure: 4, mortMine: 8, mortTraqueur: 8 };
    r.gel = G; r.cibles = cibles;
    r.ecarts = Object.keys(cibles).filter(k => G[k] !== cibles[k]);
    const pe = (r.vivant.pageErrors || []).length + (r.mortMine.pageErrors || []).length + (r.mortTraqueur.pageErrors || []).length;
    r.pageErrorsTotal = pe;
    r.attribution = r.vivant.attribution;
    r.pass = r.ecarts.length === 0 && pe === 0 && r.attribution.controlePositif === true && r.attribution.controleNegatif !== false;
    r.measured = { gelMesure: G, cibles, ecarts: r.ecarts, pageErrors: pe,
      attributionUseUlt: { positif: r.attribution.controlePositif, negatif: r.attribution.controleNegatif, flashs: r.attribution.flashsPendantUltime } };
    r.threshold = 'gel en images : kill 2, élite 5, blessure 4, mort 8 (mine ET traqueur) ; la pile d\'un flash posé par useUlt porte « useUlt »';
    save('G8-m4-gel-attribution.json', r);
    finish('G8-m4-gel-attribution', r);
  } catch (e) {
    r.pass = false; r.code = 2; r.error = String(e && e.stack || e);
    r.measured = { erreur: String(e && e.message || e) };
    r.threshold = 'mesure impossible';
    save('G8-m4-gel-attribution.json', r);
    finish('G8-m4-gel-attribution', r);
  }
})();
