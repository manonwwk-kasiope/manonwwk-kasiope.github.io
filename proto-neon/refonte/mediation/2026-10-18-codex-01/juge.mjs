// Médiateur codex-01 : mesure indépendante, dans la boucle d'images du jeu.
// node juge.mjs <bundle.html> <sortie.json> [profils séparés par des virgules]
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium, devices } from 'playwright';
const [bundlePath, outPath, profArg] = process.argv.slice(2);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), 'proto-neon');
const bundle = fs.readFileSync(bundlePath);
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/index.html') { res.setHeader('Content-Type', 'text/html'); return res.end(bundle); }
  const t = path.resolve(ROOT, '.' + u);
  if (!t.startsWith(ROOT) || !fs.existsSync(t) || !fs.statSync(t).isFile()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', t.endsWith('.json') ? 'application/json' : t.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg');
  fs.createReadStream(t).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--mute-audio'] });
const all = { paysage: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } }, portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }, bureau: { viewport: { width: 1440, height: 900 } } };
const profils = (profArg || 'paysage,portrait,bureau').split(',');
const scenarios = [['v1', 1], ['v2', 2], ['v3', 3], ['v4', 4], ['v5', 5], ['boss', 'boss']];
const out = { bundle: bundlePath, cas: [] };
for (const p of profils) for (const [nom, sc] of scenarios) {
  const ctx = await browser.newContext(all[p]);
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.addInitScript(() => {
    window.__SEED = 4242; window.__DT = 1 / 60;
    let id = 0, now = 0; const cbs = new Map();
    window.requestAnimationFrame = f => { cbs.set(++id, f); return id; };
    window.cancelAnimationFrame = i => cbs.delete(i);
    window.__tick = () => { now += 1000 / 60; const w = [...cbs.values()]; cbs.clear(); for (const f of w) f(now); };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?perf=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N?.game && window.__tick);
  const r = await page.evaluate(sc => {
    const N = window.__N, g = N.gfx;
    N.intro.skip(); N.game.reset(4242);
    if (sc === 'boss') N.game.dbg.boss(); else N.game.dbg.vague(sc);
    N.game.dbg.god(true);
    // instantané du tampon juste après le dernier plan de décor, DANS le draw() du jeu
    let snap = null, want = false;
    const front = N.decor.drawFront;
    N.decor.drawFront = function (c) { const r = front.apply(this, arguments); if (want) { snap = { buf: g.buf().slice(), cam: { x: N.cam.x | 0, y: N.cam.y | 0 }, yh: N.decor.horizon(), etat: N.game.etat() }; want = false; } return r; };
    const warm = ['jaune', 'ambre', 'brasier', 'os'].map(N.pal.i), cyan = [N.pal.i('cyan'), N.pal.i('cyanPale')];
    const samples = []; const t0 = N.game.dbg().t; let frames = 0, next = 1;
    while (N.game.dbg().t - t0 < 30 && frames++ < 2400) {
      const el = N.game.dbg().t - t0;
      if (el >= next) { want = true; next += 2; }
      window.__tick();
      if (snap) {
        const W = g.W, H = g.H, b = snap.buf, w = N.world, yh = snap.yh;
        const rx0 = Math.max(0, w.x0 - snap.cam.x), rx1 = Math.min(W - 1, w.x1 - snap.cam.x), ry0 = Math.max(0, w.y0 - snap.cam.y), ry1 = Math.min(H - 1, w.y1 - snap.cam.y);
        let sol = 0, solW = 0, solB = 0, sky = 0, skyB = 0, skyW = 0, cy = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const v = b[y * W + x];
          if (cyan.includes(v)) cy++;
          if (y < yh) { sky++; if (N.pal.L[v] > 0.1) skyB++; if (warm.includes(v)) skyW++; }
          else if (y > yh && x >= rx0 && x <= rx1 && y >= ry0 && y <= ry1) { sol++; if (warm.includes(v)) solW++; if (N.pal.L[v] > 0.25) solB++; }
        }
        samples.push({ t: +el.toFixed(1), etat: snap.etat, yh, sol, solChauds: 100 * solW / Math.max(1, sol), solLum: 100 * solB / Math.max(1, sol), cielLum: 100 * skyB / Math.max(1, sky), cielChauds: 100 * skyW / Math.max(1, sky), cyanDecor: cy });
        snap = null;
      }
    }
    N.decor.drawFront = front;
    return { samples, err: window.__ERR.count, etatFin: N.game.etat(), p95: window.__S.perf && window.__S.perf.p95 };
  }, sc);
  if (nom === 'v4' || nom === 'boss') await page.screenshot({ path: outPath.replace('.json', `-${p}-${nom}.png`), scale: 'css' });
  out.cas.push({ profil: p, scenario: nom, ...r, erreursConsole: errs });
  const s = r.samples, mx = k => Math.max(...s.map(x => x[k])).toFixed(2), mn = k => Math.min(...s.map(x => x[k])).toFixed(2);
  console.log(p, nom, 'n=' + s.length, 'etats=' + [...new Set(s.map(x => x.etat))].join('/'), 'solChauds max', mx('solChauds'), 'solLum max', mx('solLum'), 'cielLum min', mn('cielLum'), 'cielChauds max', mx('cielChauds'), 'cyan max', mx('cyanDecor'), 'err', r.err, errs.length);
  await ctx.close();
}
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
await browser.close(); server.close();
