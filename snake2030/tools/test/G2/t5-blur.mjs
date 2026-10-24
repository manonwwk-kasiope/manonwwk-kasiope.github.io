// G2 test 5 — bureau 1440×900 : keyboard.down('ArrowLeft') + down('Space') puis dispatch window 'blur' → en ≤ 100 ms :
// S.paused === true, S.input.jactive === false, S.input.jmag === 0, S.input.boost === false, S.snake.boosting === false ;
// dispatch 'focus' puis press 'Escape' → paused false et |ΔS.snake.ang| < 0,01 rad sur 500 ms sans touche enfoncée
// (les keyup des touches maintenues ne sont jamais envoyés à la page : c'est la touche « collée » après un blur).
// Toute la séquence tient dans les 2 premières secondes de jeu, avant l'arrivée du premier treillis (2 s + 1,4 s d'avertissement).
import { launchDesktop, startGame, sleep, save, finish, deadline } from '../lib.mjs';
import { dispatchAndPoll, inputState } from '../lifecycle.mjs';
deadline(120, 5);
const THRESH = "blur → ≤ 100 ms : paused, !jactive, jmag 0, !boost, !boosting ; focus + Escape → !paused et |Δang| < 0,01 rad sur 500 ms sans touche";
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
try {
  await startGame(ctx);
  await sleep(350);
  await page.keyboard.down('ArrowLeft');
  await page.keyboard.down('Space');
  await sleep(150);
  m.held = await inputState(page);
  const PRED = "S.paused === true && S.input.jactive === false && S.input.jmag === 0 && S.input.boost === false && S.snake.boosting === false";
  m.blur = await dispatchAndPoll(page, 'window', 'blur', PRED, 100, 3);
  m.at100 = await inputState(page);
  m.banner = await page.evaluate(() => ({ pauseBlur: !!document.querySelector('.s2pause-blur'), screen: window.__M.ui.screen() }));
  // retour au premier plan puis reprise volontaire ; les touches restent « enfoncées » côté navigateur (aucun keyup envoyé)
  await page.evaluate(() => { window.dispatchEvent(new Event('focus')); });
  await sleep(120);
  m.afterFocus = await inputState(page);
  await page.keyboard.press('Escape');
  await sleep(120);
  const a0 = await inputState(page);
  await sleep(500);
  const a1 = await inputState(page);
  const d = Math.atan2(Math.sin(a1.ang - a0.ang), Math.cos(a1.ang - a0.ang));
  m.resume = { pausedAfterEscape: a0.paused, ang0: +a0.ang.toFixed(4), ang1: +a1.ang.toFixed(4), dAng: +Math.abs(d).toFixed(4), dt: +(a1.t - a0.t).toFixed(0), jactive1: a1.jactive, boost1: a1.boost,
    railed: await page.evaluate(() => { const st = window.__M.phases.state(); return { railed: st.railed, kind: st.phase }; }) };
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  const checks = { heldRegistered: m.held.jactive === true && m.held.boost === true, blurIn100ms: m.blur.ok, pausedAt100: m.at100.paused === true,
    jactive: m.at100.jactive === false, jmag: m.at100.jmag === 0, boost: m.at100.boost === false, boosting: m.at100.boosting === false,
    resumed: a0.paused === false, angStable: Math.abs(d) < 0.01 };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g2-t5.json', m);
  finish(5, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g2-t5.json', m);
  finish(5, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}
