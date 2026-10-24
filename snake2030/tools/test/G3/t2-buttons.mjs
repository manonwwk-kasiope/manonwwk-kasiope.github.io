// G3 test 2 — bureau 1440×900 en jeu, souris active sur #app : mouse.down (gauche) → S.input.boost === true ;
// mouse.up → false ; clic droit → compteur posé sur __M.phases.use incrémenté de 1 et aucun menu contextuel
// (contextmenu defaultPrevented, lu après la fin de la distribution) ; S.ult = S.ultMax puis mouse.wheel(0, 120) →
// S.ult === 0 et window.scrollY === 0. Le preventDefault de la molette est relevé à titre indicatif.
import { launchDesktop, waitFrames, save, finish, deadline } from '../lib.mjs';
import { prepPlay, mouseTo, readInput, pickInput } from './g3lib.mjs';
deadline(120, 2);
const THRESH = 'mouse.down → boost true ; mouse.up → boost false ; clic droit → phases.use +1 et contextmenu defaultPrevented ; molette (0, 120) avec ult plein → S.ult === 0 et scrollY === 0';
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
try {
  m.env = await prepPlay(ctx);
  await page.evaluate(() => {
    const M = window.__M; window.__useN = 0; window.__cm = []; window.__wh = [];
    const o = M.phases.use; M.phases.use = function () { window.__useN++; return o.apply(this, arguments); };
    // defaultPrevented lu après la distribution complète (robuste à un stopPropagation du gestionnaire du jeu)
    addEventListener('contextmenu', e => { setTimeout(() => window.__cm.push({ dp: e.defaultPrevented, tgt: e.target && e.target.id || e.target && e.target.tagName, btn: e.button }), 0); }, true);
    addEventListener('wheel', e => { setTimeout(() => window.__wh.push({ dy: e.deltaY, dp: e.defaultPrevented }), 0); }, true);
  });
  const cx = 720, cy = 450;                                     // centre du viewport : sur #app/#game en jeu
  await mouseTo(page, cx, cy);
  m.afterMove = pickInput(await readInput(page, 1));
  await page.mouse.down();
  const d = await readInput(page, 1); m.boostDown = d.boost;
  await page.mouse.up();
  const u = await readInput(page, 1); m.boostUp = u.boost;
  const n0 = await page.evaluate(() => window.__useN);
  await page.mouse.click(cx, cy, { button: 'right' });
  await waitFrames(page, 3);
  const after = await page.evaluate(() => ({ n: window.__useN, cm: window.__cm.slice(), phase: window.__S.phase }));
  m.rightClick = { useBefore: n0, useAfter: after.n, useDelta: after.n - n0, contextmenu: after.cm, phase: after.phase };
  await page.evaluate(() => { const S = window.__S; S.ult = S.ultMax; });
  const ult0 = await page.evaluate(() => ({ ult: window.__S.ult, max: window.__S.ultMax }));
  await page.mouse.wheel(0, 120);
  await waitFrames(page, 3);
  m.wheel = { ...ult0, ...(await page.evaluate(() => ({ ultAfter: window.__S.ult, scrollY: window.scrollY, events: window.__wh.slice(), timeScale: window.__S.timeScale }))) };
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  const checks = {
    boostDown: m.boostDown === true,
    boostUp: m.boostUp === false,
    useDelta1: m.rightClick.useDelta === 1,
    noContextMenu: m.rightClick.contextmenu.length >= 1 && m.rightClick.contextmenu.every(c => c.dp === true),
    ultUsed: m.wheel.ultAfter === 0,
    noScroll: m.wheel.scrollY === 0,
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g3-t2.json', m);
  finish(2, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g3-t2.json', m);
  finish(2, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}
