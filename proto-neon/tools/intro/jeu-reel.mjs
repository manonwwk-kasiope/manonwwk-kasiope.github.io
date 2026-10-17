// Avec le VRAI 70-game.js : ouverture sautée au doigt, partie accélérée, pilote qui fuit le danger et
// va vers l'énergie (pour atteindre l'annonce du colosse) ; on relève S.phase, le journal de 60-intro.js,
// et on capture l'interlude tel que le joueur le verra. usage : node jeu-reel.mjs [paysage|portrait] [mourir]
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const prof = process.argv[2] || 'paysage', mourir = process.argv[3] === 'mourir';
const P = { paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 } }[prof];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await page.addInitScript((mourir) => {
  window.__DT = 1 / 60;
  window.__PH = [];
  /* pilote : vise la cellule d'énergie la plus proche en évitant les ennemis (ou fonce dedans pour mourir) */
  window.__PILOT = (d) => {
    const S = window.__S, P = d.P; if (!P) return;
    if (!mourir) P.invul = 5;                                  // test seulement : atteindre le colosse à coup sûr
    let tx = (d.AL + d.AR) / 2, ty = (d.AT + d.AB) / 2, best = 1e9;
    if (mourir) { for (const e of d.E) { const q = (e.x - P.x) ** 2 + (e.y - P.y) ** 2; if (q < best) { best = q; tx = e.x; ty = e.y; } } }
    else {
      for (const c of d.CELLS) { const q = (c.x - P.x) ** 2 + (c.y - P.y) ** 2; if (q < best) { best = q; tx = c.x; ty = c.y; } }
      let fx = 0, fy = 0; for (const e of d.E) { const dx = P.x - e.x, dy = P.y - e.y, q = dx * dx + dy * dy; if (q < 60 * 60) { fx += dx / q * 900; fy += dy / q * 900; } }
      for (const b of d.EB) { const dx = P.x - b.x, dy = P.y - b.y, q = dx * dx + dy * dy; if (q < 40 * 40) { fx += dx / q * 1400; fy += dy / q * 1400; } }
      tx += fx * 40; ty += fy * 40;
    }
    const dx = tx - P.x, dy = ty - P.y, m = Math.hypot(dx, dy) || 1;
    S.input.x = dx / m; S.input.y = dy / m; S.input.mag = 1;
  };
  (function rec() { const S = window.__S; if (S) { const l = window.__PH[window.__PH.length - 1]; if (!l || l.p !== S.phase) window.__PH.push({ p: S.phase, tb: +(S.t / 1000).toFixed(3), f: window.__FRAME }); } requestAnimationFrame(rec); })();
}, mourir);
await page.goto('http://127.0.0.1:8112/proto-neon/tools/intro/index.html');
await page.waitForFunction(() => window.__N && window.__N.intro && window.__N.art && window.__N.art.ready());
await page.waitForFunction(() => window.__N.intro.state().t > 1.0, null, { polling: 'raf' });
const cdp = await ctx.newCDPSession(page);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 400, y: 200, id: 1 }] });
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForFunction(() => window.__S.phase !== 'intro', null, { polling: 'raf' });
await page.evaluate(() => { window.__DT = 0.05; });            // trois fois plus vite (DTMAX de 90-boot.js)
const cible = mourir ? 'interlude defaite' : 'interlude boss';
const ok = await page.waitForFunction((c) => window.__N.intro.log.some(l => l.e === c), cible, { polling: 'raf', timeout: 120000 }).then(() => true, () => false);
await page.evaluate(() => { window.__DT = 1 / 60; });
let shots = [];
if (ok) for (const u of mourir ? [0.15, 0.3, 1.0] : [0.06, 0.6, 1.6, 2.5]) {
  if (mourir) await page.waitForTimeout(u * 1000); else
  await page.waitForFunction((u) => { const s = window.__N.intro.state(); if (s.t >= u || !s.mode) { window.__DT = 1e-9; return true; } return false; }, u, { polling: 'raf', timeout: 20000 });
  await page.waitForTimeout(60);
  const f = `cap/reel-${prof}-${mourir ? 'defaite' : 'boss'}-${u.toFixed(2)}.png`;
  await page.screenshot({ path: new URL(f, import.meta.url).pathname }); shots.push(f);
  await page.evaluate(() => { window.__DT = 1 / 60; });
}
if (ok && !mourir) {
  await page.waitForFunction(() => { if (window.__N.intro.state().t >= 2.98) { window.__DT = 1e-9; return true; } return false; }, null, { polling: 'raf', timeout: 10000 });
  await page.screenshot({ path: new URL(`cap/reel-${prof}-retour-avant.png`, import.meta.url).pathname });
  await page.evaluate(() => { window.__DT = 1 / 60; });
  await page.waitForFunction(() => !window.__N.intro.busy(), null, { polling: 'raf', timeout: 10000 });
  await page.waitForFunction((f) => window.__FRAME > f + 2, await page.evaluate(() => window.__FRAME), { polling: 'raf' });
  await page.evaluate(() => { window.__DT = 1e-9; });
  await page.screenshot({ path: new URL(`cap/reel-${prof}-retour-apres.png`, import.meta.url).pathname });
  await page.evaluate(() => { window.__DT = 1 / 60; });
}
await page.waitForTimeout(500);
const r = await page.evaluate(() => ({ ph: window.__PH, log: window.__N.intro.log, g: (() => { const d = window.__N.game.dbg(); return { t: +d.t.toFixed(2), st: d.st, bossPhase: d.bossPhase, bossAnnonceT: d.stats.bossAnnonceT, endT: d.stats.endT }; })(), err: window.__ERR }));
console.log('atteint :', ok, '; jeu', JSON.stringify(r.g));
console.log('phases :', r.ph.map(p => p.p + '@' + p.tb).join(' -> '));
console.log('journal :', r.log.map(l => l.e + '@' + l.tb).join(' | '));
console.log('captures :', shots.join(' '));
console.log('fond de fin dessiné par 60-intro.js ?', await page.evaluate(() => window.__N.intro.state().t > 0), '; état', JSON.stringify(await page.evaluate(() => window.__N.intro.state())));
console.log('erreurs :', errs.length, errs.slice(0, 5).join(' | '), '; __ERR', JSON.stringify(r.err));
await browser.close();
