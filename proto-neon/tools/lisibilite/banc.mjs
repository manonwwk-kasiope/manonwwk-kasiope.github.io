/* codex-01 : node tools/lisibilite/banc.mjs --phase avant|apres [--bundle /chemin/index.html]
   Chromium/Playwright, rAF piloté à 60 Hz, graine 2975. Le vrai frame() mesure son coût mur via __S.perf.
   Le serveur lit un bundle figé ; aucun module du jeu n'est remplacé par le banc.
   Sortie 1 si un seuil échoue (le reçu est conservé), même si la collecte est complète. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const phase = arg('--phase', 'apres');
const scenes = process.argv.includes('--scenes');
const OUT = path.resolve(arg('--outdir', HERE)); fs.mkdirSync(OUT, { recursive: true });
const cases = scenes ? [{ vague: 1, scene: 'calme' }, { vague: 5, scene: 'chaos' }, { vague: 4, scene: 'inversion' }, { vague: 5, scene: 'cyclope' }] : [2, 4, 5].map(vague => ({ vague, scene: null }));
if (!['avant', 'apres'].includes(phase)) throw Error('--phase avant|apres');
const bundle = fs.readFileSync(arg('--bundle', path.join(ROOT, 'index.html')));
const server = http.createServer((req, res) => {
  if (req.url.split('?')[0] === '/index.html') { res.setHeader('Content-Type', 'text/html'); return res.end(bundle); }
  const target = path.resolve(ROOT, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!target.startsWith(ROOT + path.sep) || !fs.existsSync(target) || !fs.statSync(target).isFile()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', target.endsWith('.json') ? 'application/json' : target.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg');
  fs.createReadStream(target).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--mute-audio'] });
const profiles = { paysage: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } }, portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }, bureau: { viewport: { width: 1440, height: 900 } } };
const receipt = { phase, dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), graine: 2975, navigateur: browser.version(), bundleSha256: crypto.createHash('sha256').update(bundle).digest('hex'), methode: 'Vrai frame() à rAF contrôlé, dt=1/60, cinq secondes de jeu, pas de bridage CPU ; émulation Chromium, pas un iPhone physique.', cas: [] };
try {
  for (const [profil, options] of Object.entries(profiles)) for (const cas of cases) {
    const { vague, scene } = cas;
    const ctx = await browser.newContext(options);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.__SEED = 2975; window.__DT = 1 / 60;
      let id = 0, now = 0; const callbacks = new Map();
      window.requestAnimationFrame = f => { callbacks.set(++id, f); return id; };
      window.cancelAnimationFrame = i => callbacks.delete(i);
      window.__tick = () => { now += 1000 / 60; const work = [...callbacks.values()]; callbacks.clear(); for (const f of work) f(now); };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?perf=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__N?.game && window.__S && window.__tick);
    const play = await page.evaluate(({ vague: v, scene }) => {
      const N = window.__N;
      N.intro.skip(); N.game.reset(2975); N.game.dbg.vague(v); N.game.dbg.god(true);
      // dbg.vague lance une nouvelle partie : armer god après cette remise à zéro.
      const start = N.game.dbg().t; let frames = 0;
      while (N.game.dbg().t - start < 5 && frames++ < 900) window.__tick();
      if (scene === 'inversion') { N.joueuse.inversionDebut(); for (let i = 0; i < 60; i++) window.__tick(); }
      if (scene === 'cyclope') { N.game.dbg.boss(); for (let i = 0; i < 300; i++) window.__tick(); }
      const d = N.game.dbg();
      return { decor: N.decor.etat(), quartier: N.decor.quartier(), elapsed: d.t - start, frames, etat: N.game.etat(), vague: d.vague, perf: { ...window.__S.perf }, err: window.__ERR.count };
    }, cas);
    if (play.elapsed < 5 || play.vague !== vague) throw Error('Jeu non mesuré : ' + JSON.stringify(play));
    const capture = `${phase}-${profil}-${scene || ('v' + vague)}.png`;
    await page.screenshot({ path: path.join(OUT, capture), scale: 'css' });
    const metrics = await page.evaluate(() => {
      const N = window.__N, g = N.gfx, cam = N.cam, world = N.world;
      function draw() {
        g.origin(0, 0); g.clear(0); N.decor.drawFar(cam);
        g.origin(cam.x, cam.y); N.decor.drawPlateau(cam); N.decor.drawFront(cam); g.origin(0, 0);
      }
      function hash() { let h = 2166136261; for (const v of g.buf()) h = Math.imul(h ^ v, 16777619); return (h >>> 0).toString(16); }
      draw();
      const W = g.W, H = g.H, b = g.buf(), yh = N.decor.horizon();
      const rect = { x0: Math.max(0, world.x0 - cam.x), y0: Math.max(0, world.y0 - cam.y), x1: Math.min(W - 1, world.x1 - cam.x), y1: Math.min(H - 1, world.y1 - cam.y) };
      const histogram = Array(16).fill(0), warm = ['jaune', 'ambre', 'brasier', 'os'].map(N.pal.i);
      let count = 0, bright = 0, hot = 0, sky = 0, skyCount = 0, skyHot = 0, solCount = 0, solHot = 0, solBright = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const v = b[y * W + x];
        if (y < yh) { skyCount++; if (N.pal.L[v] > 0.1) sky++; if (warm.includes(v)) skyHot++; }
        if (x < rect.x0 || x > rect.x1 || y < rect.y0 || y > rect.y1) continue;
        if (y > yh) { solCount++; if (warm.includes(v)) solHot++; if (N.pal.L[v] > 0.25) solBright++; }
        histogram[v]++; count++; if (warm.includes(v)) hot++; if (N.pal.L[v] > 0.25) bright++;
      }
      const r = { tampon: [W, H], camera: { x: cam.x, y: cam.y }, plateau: rect, horizon: yh, pixels: count, chaudsPct: 100 * hot / count, lumineuxPlateauPct: 100 * bright / count, lumineuxCielPct: 100 * sky / skyCount, chaudsCielPct: 100 * skyHot / skyCount, histogramme: histogram, sousHorizon: { pixels: solCount, chaudsPct: 100 * solHot / solCount, lumineuxPct: 100 * solBright / solCount } };
      r.seuilsOrigine = { chauds: r.chaudsPct <= 3, plateau: r.lumineuxPlateauPct <= 8, ciel: r.lumineuxCielPct >= 25 };
      // Correction explicite de Claude du 18 octobre, pas un ajustement décidé par le banc.
      r.seuils = { chauds: r.sousHorizon.chaudsPct <= 3, plateau: r.sousHorizon.lumineuxPct <= 8, ciel: r.lumineuxCielPct >= 12, cielChaud: r.chaudsCielPct <= 12 };
      // Hors jeu : mêmes données et horloge, seul le nom d'état change. Empreintes avant/après.
      const state = N.game.etat, states = {};
      for (const s of ['ouverture', 'titre', 'vol', 'victoire', 'cartes', 'jeu', 'nettoyage', 'alerte', 'boss', 'reapparition', 'mort']) { N.game.etat = () => s; draw(); states[s] = hash(); }
      N.game.etat = state; draw();
      return { ...r, empreintesEtats: states, err: window.__ERR.count };
    });
    const row = { profil, scene, viewport: options.viewport, deviceScaleFactor: options.deviceScaleFactor || 1, vague, capture, ...play, ...metrics, erreursConsole: errors };
    if (scenes && phase === 'apres') row.seuils.evenements = row.decor === (scene === 'cyclope' ? 'colosse' : scene);
    receipt.cas.push(row);
    console.log(JSON.stringify(row));
    await ctx.close();
  }
} finally {
  if (phase === 'apres' && fs.existsSync(path.join(OUT, 'avant.json'))) {
    const before = JSON.parse(fs.readFileSync(path.join(OUT, 'avant.json'), 'utf8'));
    for (const row of receipt.cas) {
      const ref = before.cas.find(c => c.profil === row.profil && c.vague === row.vague && c.scene === row.scene);
      if (!ref) continue;
      row.horsJeuIdentique = ['ouverture', 'titre', 'vol', 'victoire', 'cartes'].every(s => row.empreintesEtats[s] === ref.empreintesEtats[s]);
      if (!scenes) row.seuils.horsJeu = row.horsJeuIdentique; // En scènes : contexte décor différent avant branchement des événements.
      if (row.profil === 'paysage') { row.deltaP95 = row.perf.p95 - ref.perf.p95; row.seuils.performance = row.deltaP95 <= 0.5; }
    }
  }
  receipt.collecteComplete = receipt.cas.length === cases.length * Object.keys(profiles).length;
  receipt.conforme = receipt.collecteComplete && receipt.cas.every(c => Object.values(c.seuils).every(Boolean) && c.err === 0 && c.erreursConsole.length === 0);
  if (!receipt.conforme) process.exitCode = 1;
  fs.writeFileSync(path.join(OUT, `${phase}.json`), JSON.stringify(receipt, null, 2) + '\n');
  await browser.close(); await new Promise(r => server.close(r));
}
