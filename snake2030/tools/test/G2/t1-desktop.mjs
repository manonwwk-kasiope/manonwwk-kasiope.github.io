// G2 test 1 — bureau 1440×900 sans tactile, après clic JOUER : getComputedStyle('.s2ctl').display === 'none' ;
// document.fullscreenElement === null ; aucun .s2opt visible /Manche|Main directrice|Écart du bord|Vibrations/
// (réglages ouverts depuis la pause) ; au repos (zc.mode 0) S.view.w ∈ [1150 ; 1250] et S.view.h ∈ [700 ; 780].
// navigator.vibrate est retiré avant le chargement (bureau sans API de vibration, comme Safari macOS) : la ligne
// « Vibrations » doit alors être masquée (« si !navigator.vibrate »).
import { launchDesktop, startGame, hasButton, clickButton, sleep, save, finish, deadline } from '../lib.mjs';
import { viewAtRest } from '../lifecycle.mjs';
deadline(150, 1);
const THRESH = "getComputedStyle('.s2ctl').display === 'none' ; fullscreenElement === null ; 0 .s2opt visible /Manche|Main directrice|Écart du bord|Vibrations/ (écran réglages affiché) ; au repos S.view.w ∈ [1150;1250] et S.view.h ∈ [700;780]";
const RX = 'Manche|Main directrice|Écart du bord|Vibrations';
const NO_VIBRATE = 'try { Object.defineProperty(navigator, "vibrate", { configurable: true, value: undefined }); } catch (e) {} try { delete Navigator.prototype.vibrate; } catch (e) {}';

const ctx = await launchDesktop(1440, 900, { init: [NO_VIBRATE] });
const { page } = ctx;
const m = {};
let code = 1;
try {
  m.env = await page.evaluate(() => ({ vibrate: typeof navigator.vibrate, maxTouchPoints: navigator.maxTouchPoints, coarse: matchMedia('(pointer:coarse)').matches, innerW: innerWidth, innerH: innerHeight }));
  if (!(await hasButton(page, 'JOUER'))) { m.jouer = false; code = 2; throw new Error('bouton JOUER absent'); }
  await startGame(ctx);
  await sleep(800);
  m.desktopFlag = await page.evaluate(() => window.__S.desktop);
  m.ctl = await page.evaluate(() => { const el = document.querySelector('.s2ctl'); if (!el) return null; const cs = getComputedStyle(el); return { display: cs.display, opacity: cs.opacity, on: el.classList.contains('on') }; });
  m.fullscreenElement = await page.evaluate(() => document.fullscreenElement ? document.fullscreenElement.tagName : null);
  m.view = await viewAtRest(page, 6000);
  await page.screenshot({ path: new URL('../out/g2-t1-play.png', import.meta.url).pathname });

  // réglages ouverts depuis la pause (Escape = pause dans les deux builds)
  await page.keyboard.press('Escape'); await sleep(250);
  m.pausedByEscape = await page.evaluate(() => window.__S.paused);
  if (!(await hasButton(page, 'RÉGLAGES'))) { m.reglages = false; code = 2; throw new Error('bouton RÉGLAGES absent'); }
  await clickButton(ctx, 'RÉGLAGES'); await sleep(350);
  m.screen = await page.evaluate(() => window.__M.ui.screen());
  m.rows = await page.evaluate((rxSrc) => {
    const rx = new RegExp(rxSrc);
    const vis = el => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; };
    const all = Array.from(document.querySelectorAll('.s2opt'));
    const match = all.filter(el => rx.test(el.textContent));
    return { totalOpt: all.length, visibleOther: all.filter(el => !rx.test(el.textContent) && vis(el)).length, matching: match.length,
      matchingHiddenAttr: match.filter(el => el.hidden).length, visible: match.filter(vis).map(el => el.textContent.trim().slice(0, 26)) };
  }, RX);
  await page.screenshot({ path: new URL('../out/g2-t1-settings.png', import.meta.url).pathname });
  m.fsbText = await page.evaluate(() => { const b = document.getElementById('fsb'); return b ? b.textContent : null; });
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
  if (!m.ctl) { code = 2; throw new Error('.s2ctl absent'); }
  if (m.screen !== 'settings' || m.rows.visibleOther === 0) { code = 2; throw new Error('écran réglages non affiché'); }
  if (!m.view.rest) { code = 2; throw new Error('vue au repos non observée'); }
  const checks = {
    ctlNone: m.ctl.display === 'none',
    noFullscreen: m.fullscreenElement === null,
    noTouchRows: m.rows.visible.length === 0,
    viewW: m.view.w >= 1150 && m.view.w <= 1250,
    viewH: m.view.h >= 700 && m.view.h <= 780,
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g2-t1.json', m);
  finish(1, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g2-t1.json', m);
  finish(1, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}
