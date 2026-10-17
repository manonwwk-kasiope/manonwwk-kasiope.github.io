// Interludes : 'boss', 'victoire', 'defaite' derrière un N.game de substitution qui suit l'usage
// documenté en tête de 60-intro.js. Durées mesurées image par image, saut au doigt, captures.
// usage : node interludes.mjs <paysage|portrait|bureau>
import { chromium, devices } from 'playwright';
const prof = process.argv[2] || 'paysage';
const PAGE = 'http://127.0.0.1:8112/proto-neon/tools/intro/index.html';
const P = {
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 }, deviceScaleFactor: 1 },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 },
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
}[prof];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await page.addInitScript(() => { window.__DT = 1 / 60; });
await page.goto(PAGE);
await page.waitForFunction(() => window.__N && window.__N.intro && window.__N.art && window.__N.art.ready());
await page.evaluate(() => {
  const N = window.__N, S = window.__S;
  window.__REC = [];
  N.game = {                                                   // le mode d'emploi de 60-intro.js, à la lettre
    reset() {}, tension() { return 0.5; },
    update(dt) { this.t = (this.t || 0) + dt; },
    draw() {                                                   // un monde factice : grille, serpent, ennemis
      const g = N.gfx, W = g.W, H = g.H, t = this.t || 0, cur = N.intro.current();
      if (cur === 'victoire' || cur === 'defaite') { N.intro.draw(); return; }      // le fond de l'écran de fin
      g.clear(N.pal.i('vide'));
      for (let x = (t * 20 | 0) % 24; x < W; x += 24) g.rect(x, 0, 1, H, N.pal.i('indigo'));
      for (let y = 0; y < H; y += 24) g.rect(0, y, W, 1, N.pal.i('indigo'));
      for (let i = 0; i < 14; i++) g.circ(W / 2 - 40 + i * 6, H / 2 + Math.sin(i * 0.6 + t * 3) * 8, 3, N.pal.i(i ? 'cyan' : 'cyanPale'));
      for (let i = 0; i < 9; i++) g.circ((i * 97 + t * 30) % W, (i * 53) % H, 4, N.pal.i('magenta'));
    },
    drawTop() {
      const cur = N.intro.current(), g = N.gfx;
      if (cur === 'victoire' || cur === 'defaite') {            // l'écran de fin, par-dessus le fond
        const a = N.spr.text(cur === 'victoire' ? 'VICTOIRE' : 'DÉFAITE', { ci: cur === 'victoire' ? 'jaune' : 'magenta', echelle: 3, contour: true });
        const b = N.spr.text('SCORE 012345', { ci: 'os', echelle: 2, contour: true }), c = N.spr.text('DÉFI : ARTIFICIER ✓', { ci: 'jaune', echelle: 2, contour: true });
        g.blit(a, (g.W - a.w) >> 1, (g.H >> 1) - 50); g.blit(b, (g.W - b.w) >> 1, (g.H >> 1) - 6); g.blit(c, (g.W - c.w) >> 1, (g.H >> 1) + 18);
      }
    }
  };
  /* journal image par image, tenu ici car le jeu ne tourne pas pendant l'interlude */
  (function rec() { window.__REC.push({ f: window.__FRAME, busy: N.intro.busy(), cur: N.intro.current(), phase: S.phase, t: +N.intro.state().t.toFixed(4), tb: S.t / 1000 }); requestAnimationFrame(rec); })();
  N.intro.skip();
});
const cdp = await ctx.newCDPSession(page);
async function frames(n) { const f0 = await page.evaluate(() => window.__FRAME); await page.waitForFunction((f) => window.__FRAME >= f, f0 + n, { polling: 'raf' }); }
async function capAt(u, name) {
  await page.waitForFunction((u) => { const s = window.__N.intro.state(); if (s.t >= u || !s.mode) { window.__DT = 1e-9; return true; } return false; }, u, { polling: 'raf', timeout: 20000 });
  await page.waitForTimeout(60);
  await page.screenshot({ path: new URL(`cap/${prof}-${name}.png`, import.meta.url).pathname });
  await page.evaluate(() => { window.__DT = 1 / 60; });
}
async function touch() { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 300, y: 200, id: 7 }] }); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
function duree(rec) { const on = rec.filter(x => x.busy && x.phase === 'intro'); if (!on.length) return { images: 0, s: 0 }; return { images: on.length, s: +(on[on.length - 1].tb - on[0].tb + 1 / 60).toFixed(3) }; }

await frames(10);
// --- boss, jusqu'au bout, avec une explosion en cours au moment de l'annonce
await page.evaluate(() => { const N = window.__N; if (N.fx && N.fx.boom) N.fx.boom(N.gfx.W * 0.3, N.gfx.H * 0.5, 0.9, N.pal.i('magenta')); window.__REC.length = 0; window.__F0 = window.__FRAME; N.intro.transition('boss'); });
for (const u of [0.06, 0.5, 1.0, 1.35, 1.7, 2.2, 2.9]) await capAt(u, 'boss-' + u.toFixed(2));
await page.waitForFunction(() => !window.__N.intro.busy(), null, { polling: 'raf' }); await frames(3);
let rec = await page.evaluate(() => window.__REC);
const dBoss = duree(rec);
const apres = rec[rec.length - 1], phases = [...new Set(rec.map(r => r.phase))];
console.log('boss complet : gelé (S.phase = intro)', dBoss.s, 's d\'horloge de jeu ; phases vues', phases.join(' -> '), '; après :', JSON.stringify(apres), '; journal', JSON.stringify(await page.evaluate(() => window.__N.intro.log.slice(-4))));
// --- boss sauté : un toucher à 0,15 s (garde : ignoré) puis à 1,5 s
await page.evaluate(() => { window.__REC.length = 0; window.__N.intro.transition('boss'); });
await page.waitForFunction(() => window.__N.intro.state().t >= 0.15, null, { polling: 'raf' }); await touch(); await frames(4);
const encore = await page.evaluate(() => window.__N.intro.busy());
await page.waitForFunction(() => window.__N.intro.state().t >= 1.5, null, { polling: 'raf' });
await page.evaluate(() => { window.__evF = undefined; window.addEventListener('touchstart', () => { if (window.__evF === undefined) window.__evF = window.__FRAME; }, { capture: true, once: true }); });
await touch(); await frames(3);
const s2 = await page.evaluate(() => ({ busy: window.__N.intro.busy(), cur: window.__N.intro.current(), log: window.__N.intro.log.slice(-1)[0], evF: window.__evF }));
console.log('boss sauté : toucher à 0,15 s -> toujours gelé :', encore, '; toucher à 1,5 s -> busy', s2.busy, 'current', s2.cur, ', latence', s2.log.f - s2.evF, 'image(s) ;', JSON.stringify(s2.log));
// --- victoire puis défaite
for (const nom of ['victoire', 'defaite']) {
  await page.evaluate((nom) => { const N = window.__N; if (N.fx && N.fx.boom) N.fx.boom(N.gfx.W * 0.6, N.gfx.H * 0.4, 0.7, N.pal.i('cyan')); window.__REC.length = 0; N.intro.transition(nom); }, nom);
  for (const u of [0.2, 0.45, 2.5]) await capAt(u, nom + '-' + u.toFixed(2));
  rec = await page.evaluate(() => window.__REC);
  const last = rec[rec.length - 1], ph = [...new Set(rec.map(r => r.phase))];
  console.log(nom, ': phases vues', ph.join(' -> '), '; busy jamais vrai :', !rec.some(r => r.busy), '; à', last.t, 's : current', last.cur);
  await page.evaluate(() => window.__N.intro.stop()); await frames(2);
  console.log('   après stop() : current', await page.evaluate(() => window.__N.intro.current()));
}
console.log('erreurs :', errs.length, errs.slice(0, 4).join(' | '), '; __ERR', JSON.stringify(await page.evaluate(() => window.__ERR)));
await browser.close();
