/* HORS BAC UNIQUEMENT : cd proto-neon && node tools/codex-p4/verifier.mjs
   Serveur sur port libre ; un seul Chromium muet ; tous les contextes en série. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { chromium, devices } from 'playwright';
import { HERE, ROOT, partie } from './vm.mjs';
const profils = {
  paysage: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
  bureau: { viewport: { width: 1440, height: 900 } }
};
const scenes = [{ phase: 1, type: 'rayon' }, { phase: 1, type: 'salve' }, { phase: 2, type: 'ciseaux' },
  { phase: 2, type: 'salve' }, { phase: 3, type: 'bond' }, { phase: 3, type: 'salve2' }, { type: 'ruche' }, { type: 'sentinelle' },
  { phase: 3, type: 'mines-contact' }, { phase: 3, type: 'mines-souffle' }];
const bundles = { avant: fs.readFileSync(path.join(HERE, 'avant.html')), apres: fs.readFileSync(path.join(ROOT, 'index.html')) };
const sonde = fs.readFileSync(path.join(HERE, 'sonde.js'), 'utf8');
const sortie = path.join(HERE, 'playwright'); fs.mkdirSync(sortie, { recursive: true });
const bilan = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
  sha256: Object.fromEntries(Object.entries(bundles).map(([k, b]) => [k, crypto.createHash('sha256').update(b).digest('hex')])),
  limite: 'Chromium avec profils iPhone ; ne qualifie pas Safari sur appareil.', scenes: [], parties: [] };
const save = () => fs.writeFileSync(path.join(sortie, 'resultats.json'), JSON.stringify(bilan, null, 2));
const server = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://local').pathname).split('/').filter(Boolean), version = parts.shift();
  if (!bundles[version]) { res.writeHead(404); return res.end(); }
  if (!parts.length || parts.join('/') === 'index.html') { res.setHeader('Content-Type', 'text/html'); return res.end(bundles[version]); }
  const fichier = path.resolve(ROOT, parts.join('/'));
  if (!fichier.startsWith(ROOT + path.sep) || !fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) { res.writeHead(404); return res.end(); }
  const mime = { '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.json': 'application/json', '.png': 'image/png' };
  res.setHeader('Content-Type', mime[path.extname(fichier)] || 'application/octet-stream'); fs.createReadStream(fichier).pipe(res);
});
let browser;
async function ouvrir(version, profil, seed) {
  const ctx = await browser.newContext(profils[profil]), page = await ctx.newPage(), erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message));
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.addInitScript(seed => { window.__SEED = seed; window.__DT = 1 / 60; window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; }, seed);
  await page.goto(`http://127.0.0.1:${server.address().port}/${version}/index.html?journal=1`, { waitUntil: 'load' });
  return { ctx, page, erreurs };
}
try {
  await new Promise((ok, ko) => { server.once('error', ko); server.listen(0, '127.0.0.1', ok); });
  browser = await chromium.launch({ args: ['--mute-audio'] }); bilan.chromium = browser.version();
  for (const version of ['avant', 'apres']) {
    for (const profil of Object.keys(profils)) for (const opts of scenes) {
      const { ctx, page, erreurs } = await ouvrir(version, profil, 7), nom = `${version}-${profil}-${opts.phase || 0}-${opts.type}`;
      try {
        await page.addScriptTag({ content: sonde });
        const r = await page.evaluate(opts => window.__P4.scene({ ...opts, pixels: true }), opts);
        fs.writeFileSync(path.join(sortie, nom + '.json.gz'), zlib.gzipSync(JSON.stringify(r)));
        const { trace, journal, creations, pixels, ...resume } = r;
        const seuil = await page.evaluate(type => type === 'ruche' || type === 'sentinelle' ? window.__N.R.criteres.R07.tele : window.__N.R.criteres.R07.cyclope, opts.type);
        const conforme = !r.borne && r.avance !== null && r.avance + 1e-9 >= seuil && !r.couverture.rates && !r.erreursSchema.length && !r.err.count && !erreurs.length && pixels.every(p => p.horsPalette === 0);
        bilan.scenes.push({ version, profil, ...resume, seuil, conforme, erreursConsole: erreurs,
          pixels: pixels.map(({ indices, ...p }) => ({ ...p, sha256: crypto.createHash('sha256').update(Buffer.from(indices)).digest('hex') })), fichier: nom + '.json.gz', images: trace.length, creations: creations.length });
        await page.screenshot({ path: path.join(sortie, nom + '.png') });
      } catch (e) { bilan.scenes.push({ version, profil, ...opts, exception: String(e.stack || e), conforme: false }); }
      finally { await ctx.close(); save(); }
    }
    for (const pilote of ['dieu', 'bon']) for (const graine of [1, 2, 3]) {
      const { ctx, page, erreurs } = await ouvrir(version, 'paysage', graine);
      try {
        const r = await page.evaluate(partie, { pilote, graine }), fichier = `${version}-${pilote}-${graine}.json.gz`;
        fs.writeFileSync(path.join(sortie, fichier), zlib.gzipSync(JSON.stringify(r)));
        const { journal, ...resume } = r; bilan.parties.push({ version, ...resume, fichier, erreursConsole: erreurs });
      } catch (e) { bilan.parties.push({ version, pilote, graine, exception: String(e.stack || e) }); }
      finally { await ctx.close(); save(); }
    }
  }
  bilan.conforme = bilan.scenes.filter(r => r.version === 'apres').length === scenes.length * Object.keys(profils).length && bilan.scenes.filter(r => r.version === 'apres').every(r => r.conforme) && bilan.parties.length === 12 && bilan.parties.every(r => r.raison === 'fin' && r.err === 0 && !r.erreursConsole?.length);
  if (!bilan.conforme) process.exitCode = 1;
} catch (e) { bilan.environnement = String(e.stack || e); process.exitCode = 1; }
finally { save(); if (browser) await browser.close(); if (server.listening) await new Promise(r => server.close(r)); }
console.log(JSON.stringify({ conforme: bilan.conforme, scenes: bilan.scenes.length, parties: bilan.parties.length, environnement: bilan.environnement }));
