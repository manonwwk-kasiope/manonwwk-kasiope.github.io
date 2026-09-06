// G2 test 3 — iPhone 13 paysage hasTouch:true : .s2ctl.on présent en jeu ; contexte 390×844 (portrait) →
// #rotate display 'flex' ; S.view.w au repos ∈ [1200 ; 1260] (1316 aujourd'hui, +5 % de taille des entités).
import { launchPhone, startGame, sleep, save, finish, deadline } from '../lib.mjs';
import { viewAtRest } from '../lifecycle.mjs';
deadline(150, 3);
const THRESH = "iPhone paysage : .s2ctl.on en jeu ; portrait 390×844 : #rotate display 'flex' ; S.view.w au repos ∈ [1200;1260]";
const m = {};

/* ---- paysage 844×390 ---- */
{
  const ctx = await launchPhone();
  const { page } = ctx;
  try {
    const r = {};
    r.env = await page.evaluate(() => ({ maxTouchPoints: navigator.maxTouchPoints, coarse: matchMedia('(pointer:coarse)').matches, innerW: innerWidth, innerH: innerHeight, desktop: window.__S.desktop }));
    await startGame(ctx);
    await sleep(800);
    r.ctl = await page.evaluate(() => { const el = document.querySelector('.s2ctl'); if (!el) return null; const cs = getComputedStyle(el); return { on: el.classList.contains('on'), display: cs.display, opacity: cs.opacity }; });
    r.desktopFlagInGame = await page.evaluate(() => window.__S.desktop);
    r.view = await viewAtRest(page, 6000);
    await page.screenshot({ path: new URL('../out/g2-t3-landscape.png', import.meta.url).pathname });
    r.errors = { page: ctx.pageErrors.length, console: ctx.consoleErrors.length };
    m.landscape = r;
  } catch (e) { m.landscape = { ...(m.landscape || {}), error: String(e && e.message || e).slice(0, 200) }; }
  finally { await ctx.close(); }
}

/* ---- portrait 390×844 (même descripteur iPhone 13, viewport portrait) ---- */
{
  const ctx = await launchPhone({ ctx: { viewport: { width: 390, height: 844 } }, profile: 'iphone-portrait' });
  const { page } = ctx;
  try {
    const r = {};
    await sleep(400);
    r.inner = await page.evaluate(() => ({ w: innerWidth, h: innerHeight }));
    r.rotate = await page.evaluate(() => { const el = document.getElementById('rotate'); return el ? getComputedStyle(el).display : null; });
    r.portraitClass = await page.evaluate(() => document.body.classList.contains('portrait'));
    await page.screenshot({ path: new URL('../out/g2-t3-portrait.png', import.meta.url).pathname });
    m.portrait = r;
  } catch (e) { m.portrait = { ...(m.portrait || {}), error: String(e && e.message || e).slice(0, 200) }; }
  finally { await ctx.close(); }
}

const L = m.landscape || {}, P = m.portrait || {};
// null = non mesurable (sélecteur absent, vue au repos jamais observée) ; false = mesuré et faux
const checks = {
  ctlOn: L.ctl ? L.ctl.on === true : null,
  rotateFlexPortrait: P.rotate != null ? P.rotate === 'flex' : null,
  viewW: (L.view && L.view.rest) ? (L.view.w >= 1200 && L.view.w <= 1260) : null,
};
m.checks = checks;
const vals = Object.values(checks);
const pass = vals.every(v => v === true);
const measuredFalse = vals.some(v => v === false);
save('g2-t3.json', m);
finish(3, { pass, measured: m, threshold: THRESH, code: pass ? 0 : (measuredFalse ? 1 : 2) });
