// G5 test 1 — rails ortho réactifs : (A) rail2.mjs (bureau 1440×900, 20 virages de 90° à positions tirées par graine,
// 150 u/s, treillis ortho puis diag) : p90 ≤ 40 images, max ≤ 45, 0 demande > 700 ms, diag 20/20 détectés ;
// (B) indicateur : phases.pending() non nul à l'image qui suit le keydown, et luminance (Rec. 709) d'une fenêtre de
// 20 u (±10 u) autour du nœud (nx, ny) ≥ +8 points par rapport à la même position monde 12 images plus tôt —
// captures d'écran réelles à l'image près (horloge factice), tête à mi-cellule pour que le nœud soit à ~½ pas devant.
import { launchDesktop, startGame, clockPause, clockStep, clockResume, sleep, save, finish, deadline } from '../lib.mjs';
import { shotClip, meanRect } from '../px.mjs';
import { run as rail2 } from '../rail2.mjs';
import { SEED, emptyArena, setSnake, installToScreen, advanceToMidCell } from './g5lib.mjs';
deadline(900, 1);                                     // rail2 seul prend 6 à 8 min sur une machine chargée
const THRESH = 'rail2 ortho : p90 ≤ 40 images, max ≤ 45, 0 demande > 700 ms (images × 16,7 ms) ; diag n = 20/20 ; pending() ≠ null à keydown+1 ; ΔL(fenêtre 20 u autour du nœud, keydown+1 vs 12 images plus tôt) ≥ +8';
const m = {};
let code = 1;

/* ---- A : rail2 (latences) ---- */
const PART = process.env.S2030_T1_PART || 'AB';          // mise au point : 'A' ou 'B' pour ne jouer qu'une partie
if (PART.includes('A')) try {
  const r = await rail2();
  const o = r.measured.ortho || {}, d = r.measured.diag || {};
  const over700 = (o.all || []).filter(v => v >= 0 && v * 1000 / 60 > 700).length;
  m.rail2 = { code: r.code, orthoN: o.n, orthoMed: o.med, orthoP90: o.p90, orthoMax: o.max, orthoOver700ms: over700, orthoOver500msWall: o.over500ms, orthoAll: o.all, diagN: d.n, diagMed: d.med, diagP90: d.p90, diagMax: d.max, spacing: r.measured.spacing, fixedDt: r.measured.fixedDt };
} catch (e) { m.rail2 = { error: String(e && e.message || e).slice(0, 300) }; }

/* ---- B : indicateur du nœud d'attente (pixels : pas d'invulnérabilité de test, elle fait clignoter la tête) ---- */
const ctx = PART.includes('B') ? await launchDesktop(1440, 900, { clock: true }) : null;
const page = ctx && ctx.page;
if (ctx) try {
  const B = {};
  await startGame(ctx, { seed: SEED });
  await emptyArena(page, { noFire: true });
  await installToScreen(page);
  B.api = await page.evaluate(() => { const P = window.__M.phases; return { pending: typeof P.pending === 'function', forceGrid: typeof P.forceGrid === 'function', spacing: P.railSpacing }; });
  await page.evaluate(() => window.__M.phases.forceGrid('ortho'));
  await setSnake(page, 700, 800, 0);
  await sleep(1500);                                          // mise sur rail (RAIL_EASE 0,5 s) et caméra posée
  const SP = B.api.spacing || 330;
  await clockPause(ctx);
  // avance jusqu'à mi-cellule : le prochain nœud est à ≈ SP/2 devant (à 150 u/s, 2,5 u par image)
  const mc = await advanceToMidCell(ctx, SP);
  const st = { x: mc.x, y: mc.y, ang: mc.ang, railed: mc.railed };
  B.start = { x: +st.x.toFixed(1), y: +st.y.toFixed(1), angDeg: +(st.ang * 180 / Math.PI).toFixed(1), railed: st.railed, spacing: SP };
  const predNode = { nx: Math.ceil(st.x / SP) * SP, ny: Math.round(st.y / SP) * SP };
  B.predictedNode = predNode;
  B.pendingBefore = B.api.pending ? await page.evaluate(() => { const p = window.__M.phases.pending(); return p ? JSON.parse(JSON.stringify(p)) : null; }) : undefined;
  // capture A (référence) autour du nœud prévu : 300×300 px CSS
  async function capture(node) {
    const ms = await page.evaluate(() => window.__mapState());
    const p = await page.evaluate(([x, y]) => window.__toScreen(x, y), [node.nx, node.ny]);
    const clip = { x: Math.round(p.x - 150), y: Math.round(p.y - 150), width: 300, height: 300 };
    const img = await shotClip(ctx, clip);
    return { img, ms, p, clip, fi: await page.evaluate(() => window.__S.t) };
  }
  const A = await capture(predNode);
  await clockStep(ctx, 11);
  await page.keyboard.down('ArrowUp');
  await clockStep(ctx, 1);
  const pend = B.api.pending ? await page.evaluate(() => { const p = window.__M.phases.pending(); return p ? JSON.parse(JSON.stringify(p)) : null; }) : null;
  B.pending = pend;
  const node = (pend && Number.isFinite(pend.nx) && Number.isFinite(pend.ny)) ? { nx: pend.nx, ny: pend.ny } : predNode;
  B.nodeUsed = node;
  const Bc = await capture(node);
  B.headAtB = await page.evaluate(() => { const s = window.__S.snake; return { x: +s.x.toFixed(1), y: +s.y.toFixed(1), angDeg: +(s.ang * 180 / Math.PI).toFixed(1) }; });
  await clockStep(ctx, 1);
  const Bc2 = await capture(node);                         // keydown+2 (information)
  await page.keyboard.up('ArrowUp');
  await clockResume(ctx);
  // luminance de la fenêtre 20 u (±10 u monde) autour du nœud, dans chaque capture avec sa propre projection
  function win(c) {
    const st = c.ms, pr = c.img.pr, hx = 10 * st.sx * pr, hy = 10 * st.sy * pr;
    const cx = (c.p.x - c.clip.x) * pr, cy = (c.p.y - c.clip.y) * pr;
    const r = meanRect(c.img, cx - hx, cy - hy, cx + hx, cy + hy);
    return { l: r.l, rgb: [r.r, r.g, r.b], n: r.n, center: [+cx.toFixed(1), +cy.toFixed(1)], halfPx: [+hx.toFixed(1), +hy.toFixed(1)] };
  }
  B.lumA = win(A); B.lumB = win(Bc); B.lumB2 = win(Bc2);
  B.deltaL = +(B.lumB.l - B.lumA.l).toFixed(2); B.deltaL2 = +(B.lumB2.l - B.lumA.l).toFixed(2);
  B.tA = A.fi; B.tB = Bc.fi; B.framesBetween = Math.round((Bc.fi - A.fi) / (1000 / 60));
  B.nodeInClipA = A.p.x >= 0 && A.p.y >= 0 && A.p.x < 1440 && A.p.y < 900;
  B.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  m.indicator = B;
  // trace : capture pleine de l'écran à keydown+2 (le nœud est au centre de la fenêtre lue)
  await page.screenshot({ path: new URL('../out/g5-t1-node.png', import.meta.url).pathname });
} catch (e) { m.indicator = { ...(m.indicator || {}), error: String(e && e.stack || e).slice(0, 400) }; }
finally { await ctx.close(); }

const R = m.rail2 || {}, I = m.indicator || {};
const checks = {
  orthoP90: R.orthoP90 != null ? R.orthoP90 <= 40 : null,
  orthoMax: R.orthoMax != null ? R.orthoMax <= 45 : null,
  orthoOver700ms: R.orthoOver700ms != null ? R.orthoOver700ms === 0 : null,
  orthoN20: R.orthoN != null ? R.orthoN === 20 : null,
  diagN20: R.diagN != null ? R.diagN === 20 : null,
  // API phases.pending() absente → non mesurable (null, code 2 si rien d'autre n'échoue), jamais « pass »
  pendingApi: I.api ? (I.api.pending === true ? true : null) : null,
  pendingAfterKeydown: I.api && I.api.pending ? !!(I.pending && Number.isFinite(I.pending.nx) && Number.isFinite(I.pending.ny) && Number.isFinite(I.pending.ang) && Number.isFinite(I.pending.dist)) : null,
  lumDelta8: I.deltaL != null ? I.deltaL >= 8 : null,
};
m.checks = checks;
const vals = Object.values(checks);
const pass = vals.every(v => v === true);
code = pass ? 0 : (vals.some(v => v === false) ? 1 : 2);
save('g5-t1.json', m);
finish(1, { pass, measured: { rail2: { ...R, orthoAll: undefined }, indicator: { ...I, lumA: I.lumA && I.lumA.l, lumB: I.lumB && I.lumB.l, lumB2: I.lumB2 && I.lumB2.l }, checks }, threshold: THRESH, code });
