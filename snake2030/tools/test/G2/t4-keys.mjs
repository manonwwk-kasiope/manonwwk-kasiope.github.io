// G2 test 4 — clavier en jeu (bureau 1440×900) : 'p' → S.paused true ; 'Enter' → false ; 'Escape' → true ; 'Escape' → false ;
// 'f' → document.fullscreenElement === document.documentElement ; 'f' → null ; S.ult = S.ultMax puis keydown {key:'r', metaKey}
// → S.ult inchangé, keydown {key:'r'} → S.ult === 0 ; document.exitFullscreen() en partie plein écran → S.paused === true ≤ 100 ms.
import { launchDesktop, startGame, sleep, save, finish, deadline } from '../lib.mjs';
deadline(150, 4);
const THRESH = "p→paused ; Enter→reprise ; Escape→paused ; Escape→reprise ; f→fullscreenElement === documentElement ; f→null ; keydown r+meta : ult inchangé ; keydown r : ult === 0 ; exitFullscreen() en jeu → paused ≤ 100 ms";
const ctx = await launchDesktop(1440, 900);
const { page } = ctx;
const m = { steps: [] };
let code = 1;
const paused = () => page.evaluate(() => window.__S.paused);
const fsEl = () => page.evaluate(() => document.fullscreenElement ? (document.fullscreenElement === document.documentElement ? 'documentElement' : document.fullscreenElement.tagName) : null);
async function press(key, wait = 220) { await page.keyboard.press(key); await sleep(wait); }
async function ensureUnpaused(label) {
  if (await paused()) { m.steps.push({ note: 'reprise par Escape avant ' + label }); await press('Escape', 250); }
  return !(await paused());
}
try {
  m.env = await page.evaluate(() => ({ fullscreenEnabled: document.fullscreenEnabled, desktop: window.__S.desktop }));
  await startGame(ctx);
  await sleep(600);
  m.fsAfterPlay = await fsEl();
  if (m.fsAfterPlay) { m.steps.push({ note: 'plein écran posé au clic JOUER : sortie par exitFullscreen() avant la séquence clavier' }); await page.evaluate(() => document.exitFullscreen().catch(() => {})); await sleep(400); await ensureUnpaused('séquence'); }

  await press('p'); m.p = await paused();
  await press('Enter'); m.enter = await paused();
  await press('Escape'); m.esc1 = await paused();
  await press('Escape'); m.esc2 = await paused();

  await press('f', 500); m.f1 = await fsEl(); m.f1paused = await paused();
  await press('f', 500); m.f2 = await fsEl(); m.f2paused = await paused();

  // ultime : Cmd/Ctrl+R ignoré, R seul consommé
  await ensureUnpaused('ultime');
  m.ult = await page.evaluate(() => {
    const S = window.__S; S.ult = S.ultMax;
    const before = S.ult;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', metaKey: true, bubbles: true, cancelable: true }));
    const afterMeta = S.ult;
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'r', code: 'KeyR', metaKey: true, bubbles: true, cancelable: true }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', code: 'KeyR', bubbles: true, cancelable: true }));
    const afterPlain = S.ult;
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'r', code: 'KeyR', bubbles: true, cancelable: true }));
    return { max: S.ultMax, before, afterMeta, afterPlain, phase: S.phase, paused: S.paused };
  });
  await sleep(300);

  // sortie de plein écran par l'API pendant une partie non pausée → pause ≤ 100 ms
  await ensureUnpaused('exitFullscreen');
  if (!(await fsEl())) await press('f', 500);
  m.fsBeforeExit = await fsEl(); m.pausedBeforeExit = await paused();
  if (m.fsBeforeExit === 'documentElement' && !m.pausedBeforeExit) {
    m.exit = await page.evaluate(() => new Promise(res => {
      const S = window.__S; const t0 = performance.now();
      document.exitFullscreen().catch(e => { window.__exitErr = String(e); });
      (function q() { const ms = performance.now() - t0; if (S.paused) return res({ ok: true, ms: +ms.toFixed(1) }); if (ms > 600) return res({ ok: false, ms: +ms.toFixed(1), fs: !!document.fullscreenElement }); setTimeout(q, 3); })();
    }));
    m.exit.fsAfter = await fsEl();
  } else m.exit = { ok: false, why: 'partie plein écran non pausée non obtenue', fs: m.fsBeforeExit, paused: m.pausedBeforeExit };
  m.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };

  const checks = {
    p: m.p === true, enter: m.enter === false, esc1: m.esc1 === true, esc2: m.esc2 === false,
    f1: m.f1 === 'documentElement', f2: m.f2 === null,
    ultMeta: m.ult.afterMeta === m.ult.max, ultPlain: m.ult.afterPlain === 0,
    exitPause: !!(m.exit && m.exit.ok && m.exit.ms <= 100),
  };
  m.checks = checks;
  const pass = Object.values(checks).every(Boolean);
  code = pass ? 0 : 1;
  save('g2-t4.json', m);
  finish(4, { pass, measured: m, threshold: THRESH, code });
} catch (e) {
  m.error = String(e && e.message || e).slice(0, 200);
  save('g2-t4.json', m);
  finish(4, { pass: false, measured: m, threshold: THRESH, code });
} finally {
  await ctx.close();
}
