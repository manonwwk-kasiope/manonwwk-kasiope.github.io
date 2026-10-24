/* Kit du jury indépendant : une partie complète au pilote, DESSINÉE (vrai frame() à rAF piloté, 60 images/s de
   temps de jeu), avec une capture toutes les N secondes et un résumé factuel tiré du journal.
   node tools/jury/partie.mjs --pilote bon --graine 7 --profil paysage --pas 6 --max 420 --sortie DOSSIER [--bundle index.html]
   Le juge regarde les captures et lit resume.json ; il n'a besoin d'aucun rapport des constructeurs. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const pilote = arg('pilote', 'bon'), graine = +arg('graine', 7), profil = arg('profil', 'paysage');
const pas = +arg('pas', 6), maxT = +arg('max', 420), out = path.resolve(arg('sortie', path.join(HERE, 'sortie', `${pilote}-${profil}-${graine}`)));
const bundle = fs.readFileSync(path.resolve(arg('bundle', path.join(ROOT, 'index.html'))));
fs.mkdirSync(out, { recursive: true });
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/index.html') { res.setHeader('Content-Type', 'text/html'); return res.end(bundle); }
  const t = path.resolve(ROOT, '.' + u);
  if (!t.startsWith(ROOT + path.sep) || !fs.existsSync(t) || !fs.statSync(t).isFile()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', t.endsWith('.json') ? 'application/json' : t.endsWith('.mp4') ? 'video/mp4' : t.endsWith('.png') ? 'image/png' : 'audio/mpeg');
  fs.createReadStream(t).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const profils = { paysage: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } }, portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }, bureau: { viewport: { width: 1440, height: 900 } } };
const browser = await chromium.launch({ args: ['--mute-audio'] });
try {
  const ctx = await browser.newContext(profils[profil]);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.addInitScript(g => {
    window.__SEED = g; window.__DT = 1 / 60;
    let id = 0, now = 0; const cbs = new Map();
    window.requestAnimationFrame = f => { cbs.set(++id, f); return id; };
    window.cancelAnimationFrame = i => cbs.delete(i);
    window.__tick = n => { for (let k = 0; k < (n || 1); k++) { now += 1000 / 60; const w = [...cbs.values()]; cbs.clear(); for (const f of w) f(now); } };
  }, graine);
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N?.game && window.__tick && window.__N.pilote);
  await page.evaluate(({ graine, pilote }) => {
    const N = window.__N;
    N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
    if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
    N.pilote.lancer(pilote);
    window.__ETATS = [];
  }, { graine, pilote });
  const captures = [];
  let t = 0, k = 0, etat = '';
  while (t < maxT) {
    const r = await page.evaluate(n => { window.__tick(n); const N = window.__N; const e = N.game.etat(); const d = N.game.dbg(); if (window.__ETATS[window.__ETATS.length - 1]?.e !== e) window.__ETATS.push({ e, t: +d.t.toFixed(1), v: d.vague }); return { e, v: d.vague, t: d.t, score: d.score }; }, pas * 60);
    t += pas; etat = r.e;
    const nom = `${String(++k).padStart(3, '0')}-t${String(Math.round(t)).padStart(4, '0')}-${r.e}-v${r.v}.png`;
    await page.screenshot({ path: path.join(out, nom), scale: 'css' });
    captures.push(nom);
    if (r.e === 'fin') { await page.evaluate(() => window.__tick(120)); await page.screenshot({ path: path.join(out, 'fin.png'), scale: 'css' }); break; }
  }
  const resume = await page.evaluate(() => {
    const N = window.__N, d = N.game.dbg(), J = N.journal && N.journal.dump ? N.journal.dump() : [];
    const compte = {}; for (const l of J) { const k = l.type || l.t || l.evt || l[1] || '?'; compte[k] = (compte[k] || 0) + 1; }
    return { etatFinal: N.game.etat(), vague: d.vague, score: d.score, kills: d.kills, morts: (d.stats && d.stats.morts) || [], etats: window.__ETATS, err: window.__ERR.count, journal: { lignes: J.length, parType: compte } };
  });
  fs.writeFileSync(path.join(out, 'resume.json'), JSON.stringify({ pilote, graine, profil, tempsSec: t, captures, ...resume, erreursConsole: erreurs }, null, 1));
  console.log(JSON.stringify({ pilote, graine, profil, tempsSec: t, etatFinal: resume.etatFinal, vague: resume.vague, score: resume.score, err: resume.err, erreursConsole: erreurs.length, captures: captures.length }));
  await ctx.close();
} finally { await browser.close(); server.close(); }
