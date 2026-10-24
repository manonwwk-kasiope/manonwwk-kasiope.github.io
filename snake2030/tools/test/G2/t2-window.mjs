// G2 test 2 — bureau 960×1040 sans tactile (demi-écran ancré) : getComputedStyle('#rotate').display === 'none' ;
// clic JOUER → S.phase === 'play' en ≤ 500 ms et S.paused === false après 2 s ; au repos S.view.w ≥ 900 et
// S.view.w / S.view.h ≥ 0,85. Bureau 3440×1440 : S.view.w ≤ 1550 au repos.
import { launchDesktop, startGame, sleep, save, finish, deadline } from '../lib.mjs';
import { viewAtRest } from '../lifecycle.mjs';
deadline(180, 2);
const THRESH = "960×1040 : #rotate display 'none' ; JOUER → phase 'play' ≤ 500 ms ; paused === false après 2 s ; S.view.w ≥ 900 et w/h ≥ 0,85 ; 3440×1440 : S.view.w ≤ 1550 au repos";
const m = {};
let code = 1;

/* ---- 960 × 1040 ---- */
{
  const ctx = await launchDesktop(960, 1040);
  const { page } = ctx;
  try {
    const r = {};
    r.rotate = await page.evaluate(() => { const el = document.getElementById('rotate'); return el ? getComputedStyle(el).display : null; });
    r.portraitClass = await page.evaluate(() => document.body.classList.contains('portrait'));
    r.desktopFlag = await page.evaluate(() => window.__S.desktop);
    const b = page.locator('#ui button.s2big:visible', { hasText: /^JOUER$/ }).first();
    await b.waitFor({ state: 'visible', timeout: 8000 });
    const box = await b.boundingBox();
    if (!box) { r.jouer = false; m.d960 = r; code = 2; throw new Error('JOUER sans boîte'); }
    r.jouer = true;
    // l'instant du clic est pris côté page (pointerdown en capture), la scrutation aussi
    await page.evaluate(() => { window.__clickAt = null; addEventListener('pointerdown', () => { window.__clickAt = performance.now(); }, { capture: true, once: true }); });
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const p = await page.evaluate(() => new Promise(res => {
      const S = window.__S; const t0 = window.__clickAt != null ? window.__clickAt : performance.now();
      (function q() { const ms = performance.now() - t0; if (S.phase === 'play') return res({ ok: true, ms: +ms.toFixed(1) }); if (ms > 1500) return res({ ok: false, ms: +ms.toFixed(1), phase: S.phase }); setTimeout(q, 4); })();
    }));
    r.playAfterClick = p;
    r.elementAtClick = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); return el ? (el.id || el.className || el.tagName) : null; }, [box.x + box.width / 2, box.y + box.height / 2]);
    await sleep(2000);
    r.pausedAfter2s = await page.evaluate(() => window.__S.paused);
    r.screenAfter2s = await page.evaluate(() => window.__M.ui.screen());
    r.view = await viewAtRest(page, 6000);
    await page.screenshot({ path: new URL('../out/g2-t2-960x1040.png', import.meta.url).pathname });
    r.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
    m.d960 = r;
  } catch (e) { m.d960 = { ...(m.d960 || {}), error: String(e && e.message || e).slice(0, 200) }; }
  finally { await ctx.close(); }
}

/* ---- 3440 × 1440 ---- */
{
  const ctx = await launchDesktop(3440, 1440);
  const { page } = ctx;
  try {
    const r = {};
    await startGame(ctx);
    await sleep(800);
    r.view = await viewAtRest(page, 6000);
    r.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
    m.d3440 = r;
  } catch (e) { m.d3440 = { ...(m.d3440 || {}), error: String(e && e.message || e).slice(0, 200) }; }
  finally { await ctx.close(); }
}

const a = m.d960 || {}, b = m.d3440 || {};
if (a.jouer === false || a.rotate == null) { save('g2-t2.json', m); finish(2, { pass: false, measured: m, threshold: THRESH, code: 2 }); }
const va = a.view && a.view.rest, vb = b.view && b.view.rest;
// null = non mesurable (vue au repos jamais observée, p. ex. partie jamais lancée) ; false = mesuré et faux
const checks = {
  rotateNone: a.rotate === 'none',
  playIn500ms: !!(a.playAfterClick && a.playAfterClick.ok && a.playAfterClick.ms <= 500),
  notPausedAfter2s: a.pausedAfter2s === false,
  viewW900: va ? a.view.w >= 900 : null,
  ratio085: va ? a.view.w / a.view.h >= 0.85 : null,
  wide1550: vb ? b.view.w <= 1550 : null,
};
m.checks = checks;
const vals = Object.values(checks);
const pass = vals.every(v => v === true);
const measuredFalse = vals.some(v => v === false);
save('g2-t2.json', m);
finish(2, { pass, measured: m, threshold: THRESH, code: pass ? 0 : (measuredFalse ? 1 : 2) });
