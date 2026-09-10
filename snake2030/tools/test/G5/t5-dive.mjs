// G5 test 5 — caméra bornée en bascule 3D (reprise de scratchpad dive-head.mjs sur le harnais commun).
// Position réelle de la tête à l'écran : projection monde → canvas puis transformation CSS du canvas (calque DOM
// jumeau, getBoundingClientRect), à chaque image. Pas de temps fixe 1/60.
// (A) iPhone 13 paysage (manche au doigt CDP) et bureau 1440×900 (flèches) : phase dive forcée, arène vide, depuis
//     (2300,1450) puis (300,150), 4 directions diagonales × 2,2 s (132 images) : 100 % des images (bascule installée,
//     persp > 20°) avec fx ∈ [0,10 ; 0,90] et fy ∈ [0,10 ; 0,90].
// (B) iPhone : partie au bot (doigt) de 60 s, mode dieu : 0 image (phase play) avec la tête hors écran (fx ou fy ∉ [0 ; 1]).
import { launchDesktop, launchPhone, installProbe, installInvuln, installGod, startGame, playFor, touch, waitFrames, sleep, save, finish, deadline } from '../lib.mjs';
import { SEED, emptyArena, setSnake, installToScreen, installHeadTracker, pullHead, waitUntil } from './g5lib.mjs';
deadline(420, 5);
const THRESH = 'dive forcée, 2 départs × 4 directions × 2,2 s : 100 % des images avec tête ∈ [0,10;0,90] des deux axes (iPhone et 1440×900) ; partie bot iPhone 60 s : 0 image tête hors [0;1]';
const m = {};
const DIRS = [[1, -1], [1, 1], [-1, 1], [-1, -1]];

async function drive(ctx, label) {
  const { page, cdp } = ctx;
  const r = {};
  await installProbe(page);
  await installInvuln(page);
  await startGame(ctx, { seed: SEED });
  await emptyArena(page);
  await installToScreen(page);
  await installHeadTracker(page);
  await page.evaluate(() => window.__M.phases.forcePhase(3));
  await setSnake(page, 2300, 1450, -Math.PI / 4);
  const ok = await waitUntil(page, () => window.__M.phases.persp() * 180 / Math.PI >= 27, 8000);
  r.perspReached = ok;
  r.perspDeg = await page.evaluate(() => +(window.__M.phases.persp() * 180 / Math.PI).toFixed(1));
  r.cssTransform = await page.evaluate(() => document.getElementById('game').style.transform);
  if (!ok) throw new Error('bascule non installée (persp ' + r.perspDeg + '°)');
  const T = touch(cdp);
  const joy = ctx.kind === 'touch' ? await page.evaluate(() => JSON.parse(JSON.stringify(window.__M.ui.joyHome()))) : null;
  const runs = [];
  let shot = 0;
  for (const [sx, sy] of [[2300, 1450], [300, 150]]) {
    await setSnake(page, sx, sy, null);
    await waitFrames(page, 2);
    for (const [dx, dy] of DIRS) {
      await pullHead(page);
      if (ctx.kind === 'touch') { await T.start([{ x: joy.x + dx * 48, y: joy.y + dy * 48, id: 1 }]); await waitFrames(page, 132); await T.end([]); }
      else { const keys = [dx > 0 ? 'ArrowRight' : 'ArrowLeft', dy > 0 ? 'ArrowDown' : 'ArrowUp']; for (const k of keys) await page.keyboard.down(k); await waitFrames(page, 132); for (const k of keys) await page.keyboard.up(k); }
      const hs = await pullHead(page);
      const inDive = hs.filter(h => h.persp > 20);
      const okF = inDive.filter(h => h.fx >= 0.10 && h.fx <= 0.90 && h.fy >= 0.10 && h.fy <= 0.90).length;
      const last = hs[hs.length - 1] || {};
      runs.push({ from: [sx, sy], dir: [dx, dy], frames: hs.length, inDive: inDive.length, inBounds: okF, fxMin: +Math.min(...inDive.map(h => h.fx)).toFixed(3), fxMax: +Math.max(...inDive.map(h => h.fx)).toFixed(3), fyMin: +Math.min(...inDive.map(h => h.fy)).toFixed(3), fyMax: +Math.max(...inDive.map(h => h.fy)).toFixed(3), end: [last.wx, last.wy] });
      if (shot < 2) { await page.screenshot({ path: new URL('../out/g5-t5-' + label + '-' + shot + '.png', import.meta.url).pathname }); shot++; }
    }
  }
  r.runs = runs;
  r.framesInDive = runs.reduce((a, x) => a + x.inDive, 0);
  r.framesInBounds = runs.reduce((a, x) => a + x.inBounds, 0);
  r.pctInBounds = r.framesInDive ? +(100 * r.framesInBounds / r.framesInDive).toFixed(2) : null;
  r.fxRange = [Math.min(...runs.map(x => x.fxMin)), Math.max(...runs.map(x => x.fxMax))];
  r.fyRange = [Math.min(...runs.map(x => x.fyMin)), Math.max(...runs.map(x => x.fyMax))];
  r.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  return r;
}

for (const [label, launch] of [['iphone', () => launchPhone()], ['desk1440', () => launchDesktop(1440, 900)]]) {
  const ctx = await launch();
  try { m[label] = await drive(ctx, label); }
  catch (e) { m[label] = { ...(m[label] || {}), error: String(e && e.stack || e).slice(0, 400) }; }
  finally { await ctx.close(); }
}

/* ---- B : partie bot iPhone 60 s ---- */
{
  const ctx = await launchPhone();
  const { page } = ctx;
  try {
    const r = {};
    await installProbe(page);
    await installGod(page);
    await startGame(ctx, { seed: SEED });
    await installToScreen(page);
    await installHeadTracker(page);
    await page.evaluate(() => { window.__DT = 1 / 60; });
    const res = await playFor(ctx, 60, { god: true, restart: true, period: 60 });
    const hs = await pullHead(page);
    const off = hs.filter(h => h.fx < 0 || h.fx > 1 || h.fy < 0 || h.fy > 1);
    const dive = hs.filter(h => h.persp > 20);
    r.frames = hs.length; r.framesOff = off.length; r.pctOff = hs.length ? +(100 * off.length / hs.length).toFixed(2) : null;
    r.framesDive = dive.length; r.framesDiveOff = dive.filter(h => h.fx < 0 || h.fx > 1 || h.fy < 0 || h.fy > 1).length;
    r.framesOutside10_90 = hs.filter(h => h.fx < 0.10 || h.fx > 0.90 || h.fy < 0.10 || h.fy > 0.90).length;
    r.firstOff = off.slice(0, 5).map(h => ({ t: +h.t.toFixed(0), fx: h.fx, fy: h.fy, persp: h.persp }));
    r.play = { deadAt: res.deadAt, restarts: res.restarts, played: +res.played.toFixed(1), kills: await page.evaluate(() => window.__S.kills), gameT: await page.evaluate(() => +window.__S.t.toFixed(0)) };
    r.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
    m.bot = r;
  } catch (e) { m.bot = { ...(m.bot || {}), error: String(e && e.stack || e).slice(0, 400) }; }
  finally { await ctx.close(); }
}

const checks = {
  iphoneAllInBounds: m.iphone && m.iphone.pctInBounds != null ? m.iphone.pctInBounds === 100 : null,
  deskAllInBounds: m.desk1440 && m.desk1440.pctInBounds != null ? m.desk1440.pctInBounds === 100 : null,
  botNoFrameOff: m.bot && m.bot.framesOff != null ? m.bot.framesOff === 0 : null,
};
m.checks = checks;
const vals = Object.values(checks);
const pass = vals.every(v => v === true);
const code = pass ? 0 : (vals.some(v => v === false) ? 1 : 2);
save('g5-t5.json', m);
const brief = k => { const r = m[k] || {}; return { ...r, runs: (r.runs || []).map(x => [x.dir.join(','), x.inDive, x.inBounds, x.fxMin, x.fxMax, x.fyMin, x.fyMax]) }; };
finish(5, { pass, measured: { iphone: brief('iphone'), desk1440: brief('desk1440'), bot: m.bot, checks }, threshold: THRESH, code });
