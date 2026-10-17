/* Ordre 4 / codex-01b :
   node tools/lisibilite/banc-01b.mjs --phase avant|apres --bundle /chemin/bundle.html
   6 cas × 3 profils × 15 relevés dans draw(), après drawFront, avant les acteurs.
   3 cas DÉFILÉ supplémentaires vérifient l'état nouvellement couvert (par dbg.etat).
   Les résultats d'origine sont conservés. Retour 1 si un seuil courant échoue. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..'), DEFAULT_OUT = path.join(HERE, '01b');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i < 0 ? d : process.argv[i + 1]; };
const OUT = path.resolve(arg('--outdir', DEFAULT_OUT));
const phase = arg('--phase', 'apres');
const onlyScenarios = arg('--scenarios', '').split(',').filter(Boolean);
const ambianceA = process.argv.includes('--ambiance-a');
const onlyProfiles = arg('--profils', '').split(',').filter(Boolean);
const reprendre = process.argv.includes('--reprendre');
const garder = process.argv.includes('--garder-mesures');
if (garder && !reprendre) throw Error('--garder-mesures exige --reprendre et le même SHA de bundle');
if (!['avant', 'apres'].includes(phase)) throw Error('--phase avant|apres');
const bundle = fs.readFileSync(arg('--bundle', path.join(ROOT, 'index.html')));
const hash = crypto.createHash('sha256').update(bundle).digest('hex');
fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/index.html') { res.setHeader('Content-Type', 'text/html'); return res.end(bundle); }
  const t = path.resolve(ROOT, '.' + u);
  if (!t.startsWith(ROOT + path.sep) || !fs.existsSync(t) || !fs.statSync(t).isFile()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', t.endsWith('.json') ? 'application/json' : t.endsWith('.mp4') ? 'video/mp4' : 'audio/mpeg');
  fs.createReadStream(t).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--mute-audio'] });
const profiles = { paysage: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } }, portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }, bureau: { viewport: { width: 1440, height: 900 } } };
const scenarios = ['v1', 'v2', 'v3', 'v4', 'v5', 'boss', 'defile'];
const result = { phase, dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), graine: 4242, navigateur: browser.version(), bundleSha256: hash, methode: 'Tampon pris dans draw() après drawFront ; 30 s de jeu ; relevés à 2, 4, …, 30 s ; 270 relevés demandés + 45 DÉFILÉ. Chromium émulé sur Mac, pas un iPhone réel.', cas: [] };
if (reprendre) {
  const previous = JSON.parse(fs.readFileSync(path.join(OUT, `${phase}.json`), 'utf8'));
  if (previous.bundleSha256 !== hash) throw Error('Reprise interdite : le bundle a changé');
  result.cas = previous.cas; result.dateParis = previous.dateParis; result.misAJourParis = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  result.reprises = [...(previous.reprises || []), { profils: onlyProfiles, raison: garder ? 'complément du corpus, cas complets déjà mesurés conservés (même bundle)' : 'mesure paysage en série, après fin confirmée de la collecte avant' }];
}
const save = () => fs.writeFileSync(path.join(OUT, `${phase}.json`), JSON.stringify(result, null, 2) + '\n');
try {
  for (const [profil, opts] of Object.entries(profiles)) for (const scenario of scenarios) {
    if (onlyProfiles.length && !onlyProfiles.includes(profil)) continue;
    if (onlyScenarios.length && !onlyScenarios.includes(scenario)) continue;
    if (garder && result.cas.some(c => c.profil === profil && c.scenario === scenario && c.samples.length === 15 && c.elapsed >= 30)) continue;
    const ctx = await browser.newContext(opts), page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.__SEED = 4242; window.__DT = 1 / 60;
      let id = 0, now = 0; const callbacks = new Map();
      window.requestAnimationFrame = f => { callbacks.set(++id, f); return id; };
      window.cancelAnimationFrame = i => callbacks.delete(i);
      window.__tick = () => { now += 1000 / 60; const work = [...callbacks.values()]; callbacks.clear(); for (const f of work) f(now); };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/index.html?perf=1`, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__N?.game && window.__tick);
    const r = await page.evaluate(scenario => {
      const N = window.__N, g = N.gfx;
      N.intro.skip(); N.game.reset(4242);
      if (scenario === 'boss') N.game.dbg.boss();
      else { N.game.dbg.vague(scenario === 'defile' ? 4 : +scenario.slice(1)); if (scenario === 'defile') N.game.dbg.etat('defile'); }
      N.game.dbg.god(true);
      let snap = null, want = false;
      const front = N.decor.drawFront;
      N.decor.drawFront = function () {
        const r = front.apply(this, arguments);
        if (want) {
          const w = N.world;
          snap = { b: g.buf().slice(), W: g.W, H: g.H, cam: { x: N.cam.x | 0, y: N.cam.y | 0 }, world: { x0: w.x0, y0: w.y0, x1: w.x1, y1: w.y1 }, yh: N.decor.horizon(), etat: N.game.etat(), decor: N.decor.etat(), quartier: N.decor.quartier(), elapsed: N.game.dbg().t - t0 };
          want = false;
        }
        return r;
      };
      const warm = ['jaune', 'ambre', 'brasier', 'os'].map(N.pal.i), cyan = [N.pal.i('cyan'), N.pal.i('cyanPale')];
      const samples = [], t0 = N.game.dbg().t; let frames = 0, next = 2;
      while (samples.length < 15 && frames++ < 12000) {
        if (N.game.dbg().t - t0 + 1e-9 >= next) want = true;
        window.__tick();
        if (!snap) continue;
        const { W, H, b, world: w, cam, yh } = snap;
        const sol = { pixels: 0, chauds: 0, lumineux: 0, histogramme: Array(16).fill(0) };
        const hors = { pixels: 0, chauds: 0, lumineux: 0 }, plateau = { pixels: 0, chauds: 0, lumineux: 0 };
        const ciel = { pixels: 0, chauds: 0, lumineux: 0, empreinte: 2166136261 };
        let cy = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const v = b[y * W + x], chaud = warm.includes(v), lum = N.pal.L[v];
          if (cyan.includes(v)) cy++;
          if (y < yh) { ciel.pixels++; if (chaud) ciel.chauds++; if (lum > 0.1) ciel.lumineux++; ciel.empreinte = Math.imul(ciel.empreinte ^ v, 16777619); }
          if (y <= yh) continue;
          sol.pixels++; sol.histogramme[v]++; if (chaud) sol.chauds++; if (lum > 0.25) sol.lumineux++;
          const inPlateau = x >= w.x0 - cam.x && x <= w.x1 - cam.x && y >= w.y0 - cam.y && y <= w.y1 - cam.y;
          const a = inPlateau ? plateau : hors; a.pixels++; if (chaud) a.chauds++; if (lum > 0.25) a.lumineux++;
        }
        for (const a of [sol, hors, plateau, ciel]) { a.chaudsPct = 100 * a.chauds / Math.max(1, a.pixels); a.lumineuxPct = 100 * a.lumineux / Math.max(1, a.pixels); }
        ciel.empreinte = (ciel.empreinte >>> 0).toString(16);
        const eclipse = snap.decor === 'colosse' && snap.quartier === 'eclipse';
        const minCiel = eclipse ? 8 : 12; // Exception écrite de Claude Mac dans l'ordre 3, 18 octobre.
        samples.push({ tCible: next, elapsed: snap.elapsed, etat: snap.etat, decor: snap.decor, quartier: snap.quartier, camera: cam, monde: w, tampon: [W, H], horizon: yh, sol, hors, plateau, ciel, cyanDecor: cy, seuils: { solChaud: sol.chaudsPct <= 3, solLum: sol.lumineuxPct <= 8, cielLum: ciel.lumineuxPct >= minCiel, cielChaud: ciel.chaudsPct <= 12, cyan: cy === 0 }, minCiel });
        next += 2; snap = null;
      }
      N.decor.drawFront = front;
      return { samples, elapsed: N.game.dbg().t - t0, frames, err: window.__ERR.count, erreursJeu: window.__ERR.sigs, etatFin: N.game.etat(), p95: window.__S.perf.p95 };
    }, scenario);
    const captures = [];
    if (profil === 'paysage' && scenario === 'v4') {
      for (const crop of [false, true]) {
        const name = `${phase}-${crop ? 'bord-droit-' : ''}paysage-v4.png`;
        await page.screenshot({ path: path.join(OUT, name), scale: 'css', ...(crop ? { clip: { x: 684, y: 0, width: 160, height: 390 } } : {}) }); captures.push(name);
      }
    }
    if (profil === 'portrait' && scenario === 'boss') { const name = `${phase}-portrait-boss.png`; await page.screenshot({ path: path.join(OUT, name), scale: 'css' }); captures.push(name); }
    if (profil === 'bureau' && scenario === 'v5') { const name = `${phase}-bureau-v5.png`; await page.screenshot({ path: path.join(OUT, name), scale: 'css' }); captures.push(name); }
    const horsJeu = await page.evaluate(() => {
      const N = window.__N, g = N.gfx, etat = N.game.etat, hashes = {};
      for (const e of ['ouverture', 'titre', 'vol', 'victoire', 'cartes', 'attraction']) {
        N.game.etat = () => e;
        g.origin(0, 0); g.clear(0); N.decor.drawFar(N.cam); g.origin(N.cam.x, N.cam.y); N.decor.drawPlateau(N.cam); N.decor.drawFront(N.cam); g.origin(0, 0);
        let h = 2166136261; for (const v of g.buf()) h = Math.imul(h ^ v, 16777619); hashes[e] = (h >>> 0).toString(16);
      }
      N.game.etat = etat; return hashes;
    });
    const row = { profil, scenario, viewport: opts.viewport, ...r, captures, horsJeu, erreursConsole: errors };
    result.cas = result.cas.filter(c => c.profil !== profil || c.scenario !== scenario);
    result.cas.push(row); save();
    const max = k => Math.max(...r.samples.map(s => s.sol[k])).toFixed(2), minCiel = Math.min(...r.samples.map(s => s.ciel.lumineuxPct)).toFixed(2);
    console.log(JSON.stringify({ profil, scenario, releves: r.samples.length, solChaudMax: max('chaudsPct'), solLumMax: max('lumineuxPct'), cielLumMin: minCiel, p95: r.p95, erreurs: r.err, seuils: r.samples.every(s => Object.values(s.seuils).every(Boolean)) }));
    await ctx.close();
  }
  result.cas.sort((a, b) => Object.keys(profiles).indexOf(a.profil) - Object.keys(profiles).indexOf(b.profil) || scenarios.indexOf(a.scenario) - scenarios.indexOf(b.scenario));
  if (phase === 'apres' && fs.existsSync(path.join(OUT, 'avant.json'))) {
    const before = JSON.parse(fs.readFileSync(path.join(OUT, 'avant.json'), 'utf8'));
    for (const row of result.cas) {
      const ref = before.cas.find(c => c.profil === row.profil && c.scenario === row.scenario);
      if (!ref) continue;
      row.horsJeuIdentique = Object.keys(ref.horsJeu).every(k => row.horsJeu[k] === ref.horsJeu[k]);
      // L'ajout de defile applique l'ambiance existante à cet état ; les six cas d'origine doivent garder leur ciel.
      row.cielIdentique = row.scenario === 'defile' ? null : row.samples.every((s, i) => s.ciel.empreinte === ref.samples[i]?.ciel.empreinte);
      if (row.profil === 'paysage') { row.deltaP95 = row.p95 - ref.p95; row.performanceConforme = row.deltaP95 <= 0.5; }
    }
  }
  result.collecteComplete = result.cas.length === 21 && result.cas.every(c => c.samples.length === 15 && c.elapsed >= 30);
  result.conforme = result.collecteComplete && result.cas.every(c => c.samples.every(s => Object.values(s.seuils).every(Boolean)) && c.err === 0 && !c.erreursConsole.length && c.horsJeuIdentique !== false && (ambianceA || c.cielIdentique !== false) && c.performanceConforme !== false);
  save(); if (!result.conforme) process.exitCode = 1;
} finally { save(); await browser.close(); await new Promise(r => server.close(r)); }
