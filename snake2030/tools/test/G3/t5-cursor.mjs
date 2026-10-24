// G3 test 5 — curseur et survols, bureau 1440×900 en jeu (temps réel) : un mousemove sur #app puis 2 s sans mousemove →
// getComputedStyle(#game).cursor === 'none' ; mousemove → cursor commence par 'url(' en ≤ 100 ms (scrutation 5 ms) ;
// pause (Escape) et survol de REPRENDRE → filter !== 'none' ; reprise, S.lvlUps = 1 → écran de cartes, animation d'entrée
// finie (1,2 s), survol d'une .s2card → transform !== 'none', cursor 'pointer' ET translation verticale rendue ≤ −5,5 px
// (translateY(−6px) du « quoi » ; l'animation d'entrée en fill both laisse déjà matrix(1,0,0,1,0,0) ≠ 'none' sans survol).
import { launchDesktop, installInvuln, startGame, sleep, save, finish, deadline } from '../lib.mjs';
import { mouseTo, waitUntil } from './g3lib.mjs';
deadline(120, 5);
const THRESH = "2 s sans mousemove → #game cursor 'none' ; mousemove → 'url(' ≤ 100 ms ; REPRENDRE survolé → filter ≠ 'none' ; .s2card survolée → transform ≠ 'none', translateY ≤ −5,5 px, cursor 'pointer'";
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = {};
let code = 1;
const cursor = () => page.evaluate(() => getComputedStyle(document.getElementById('game')).cursor);
const ty = tf => { if (!tf || tf === 'none') return 0; const v = tf.replace(/^matrix(3d)?\(|\)$/g, '').split(',').map(Number); return v.length === 16 ? v[13] : v.length === 6 ? v[5] : NaN; };
try {
  await installInvuln(page);
  await startGame(ctx, { seed: 2030 });
  await sleep(300);
  await page.evaluate(() => { const M = window.__M; if (M.phases && M.phases.forcePhase) M.phases.forcePhase(1); });
  m.env = await page.evaluate(() => ({ desktop: window.__S.desktop, phase: window.__S.phase }));
  await mouseTo(page, 720, 450);
  await sleep(50);
  m.cursorAfterMove = await cursor();
  await sleep(2000);
  m.cursorIdle2s = await cursor();
  await page.mouse.move(730, 455);
  m.wake = await page.evaluate(() => new Promise(res => {
    const el = document.getElementById('game'), t0 = performance.now();
    (function q() { const c = getComputedStyle(el).cursor, ms = performance.now() - t0; if (c.indexOf('url(') === 0) return res({ ms: +ms.toFixed(1), cursor: c.slice(0, 40) }); if (ms > 400) return res({ ms: null, cursor: c.slice(0, 40) }); setTimeout(q, 5); })();
  }));
  // pause : souris garée hors des boutons, puis survol de REPRENDRE
  await page.mouse.move(100, 100);
  await sleep(100);
  await page.keyboard.press('Escape');
  await sleep(300);
  m.pauseScreen = await page.evaluate(() => window.__M.ui.screen());
  const btn = page.locator('#ui button:visible', { hasText: /^REPRENDRE$/ }).first();
  const nb = await btn.count();
  if (!nb) { code = 2; throw new Error('bouton REPRENDRE absent'); }
  m.resumeBefore = await btn.evaluate(el => ({ filter: getComputedStyle(el).filter, cursor: getComputedStyle(el).cursor }));
  const bb = await btn.boundingBox();
  await page.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await sleep(250);
  m.resumeHover = await btn.evaluate(el => ({ filter: getComputedStyle(el).filter, cursor: getComputedStyle(el).cursor, matches: el.matches(':hover') }));
  await page.mouse.move(100, 100);
  await page.keyboard.press('Escape');
  await sleep(300);
  m.resumed = await page.evaluate(() => ({ paused: window.__S.paused, screen: window.__M.ui.screen() }));
  // cartes : S.lvlUps = 1 → openCards() à l'image suivante
  await page.evaluate(() => { window.__S.lvlUps = 1; });
  const gotCards = await waitUntil(page, () => window.__S.phase === 'cards' && window.__M.ui.screen() === 'cards', 5000);
  if (!gotCards) { code = 2; throw new Error('écran de cartes non ouvert (S.lvlUps = 1)'); }
  await sleep(1200);                                            // animation d'entrée s2cardIn (0,34 s + délais) terminée
  const card = page.locator('.s2card:visible').first();
  if (!(await card.count())) { code = 2; throw new Error('.s2card absente'); }
  m.cardBefore = await card.evaluate(el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return { transform: cs.transform, cursor: cs.cursor, top: +r.top.toFixed(2), anim: cs.animationName }; });
  const cb = await card.boundingBox();
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await sleep(250);
  m.cardHover = await card.evaluate(el => { const cs = getComputedStyle(el), r = el.getBoundingClientRect(); return { transform: cs.transform, cursor: cs.cursor, top: +r.top.toFixed(2), border: cs.borderColor, matches: el.matches(':hover') }; });
  m.cardHover.ty = +ty(m.cardHover.transform).toFixed(2);
  m.cardHover.topShift = +(m.cardHover.top - m.cardBefore.top).toFixed(2);
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  const checks = {
    idleNone: m.cursorIdle2s === 'none',
    wakeUrl100ms: m.wake.ms != null && m.wake.ms <= 100,
    resumeFilter: m.resumeHover.filter !== 'none',
    cardTransform: m.cardHover.transform !== 'none' && (m.cardHover.ty <= -5.5 || m.cardHover.topShift <= -5.5),
    cardPointer: m.cardHover.cursor === 'pointer',
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g3-t5.json', m);
  finish(5, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g3-t5.json', m);
  finish(5, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}
