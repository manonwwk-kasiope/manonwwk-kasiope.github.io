/* Hors bac uniquement : cd proto-neon && node tools/codex-p14/verifier.mjs
   Un Chromium muet, contextes en série. --graines 20 (paysage), --autres 5.
   Aucun contournement de sandbox ; ce script n'est jamais lancé par le banc VM. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { chromium, devices } from 'playwright';
import { ROOT, ICI, partie, chargerAvant, sources, hash, dateParis } from './vm.mjs';
import { casConstruit } from './cas.mjs';
import { bilan } from './mesurer.mjs';
const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : +process.argv[i + 1]; };
const graines = arg('--graines', 20), autres = arg('--autres', 5), OUT = path.join(ICI, 'playwright');
fs.mkdirSync(OUT, { recursive: true });
const apres = sources(), avant = chargerAvant(), final = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
// Contrôle que le bundle reconstruit contient bien la candidate mesurée.
for (const f of ['02-regles.js', '85-pilote.js']) if (!final.includes(apres.find(([n]) => n === f)[1])) throw Error('Bundle périmé : node build.mjs requis');
let initial = final;
for (let i = 0; i < apres.length; i++) {
  const [f, s] = apres[i], ancien = avant.find(([n]) => n === f)?.[1];
  if (ancien === undefined) throw Error('Module ajouté depuis réception : comparaison à reconstruire');
  if (s === ancien) continue;
  if (!['02-regles.js', '85-pilote.js'].includes(f)) throw Error('État tiers changé depuis réception : ' + f);
  const marque = '/* ===== ' + f + ' ===== */\n', suivant = '/* ===== ' + apres[i + 1][0] + ' ===== */\n';
  const a = initial.indexOf(marque), b = initial.indexOf(suivant, a);
  if (a < 0 || b < 0) throw Error('Marqueur de bundle absent : ' + f);
  initial = initial.slice(0, a + marque.length) + ancien + '\n' + initial.slice(b);
}
const profils = {
  paysage: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
  bureau: { viewport: { width: 1440, height: 900 }, hasTouch: false }
};
const resultats = { dateParis: dateParis(), limite: 'Chromium émulé : ne qualifie pas Safari physique.', sourcesAvant: hash(avant), sourcesApres: hash(apres), bundle: hash(final), cas: [], parties: [], erreurs: [] };
const save = () => fs.writeFileSync(path.join(OUT, 'resultats.json'), JSON.stringify(resultats, null, 2) + '\n');
const serveur = http.createServer((req, res) => {
  let u;
  try { u = decodeURIComponent(new URL(req.url, 'http://local').pathname); } catch { res.writeHead(400); return res.end(); }
  if (u === '/avant.html' || u === '/index.html') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(u === '/avant.html' ? initial : final); }
  const f = path.resolve(ROOT, '.' + u);
  if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  const types = { '.png': 'image/png', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.json': 'application/json' };
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
let browser;
async function pagePour(profil, version, seed, fn) {
  const ctx = await browser.newContext(profils[profil]), page = await ctx.newPage(), erreurs = [];
  page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  await page.addInitScript(graine => {
    window.__SEED = graine; window.__DT = 1 / 60;
    window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {};
  }, seed);
  try {
    await page.goto(`http://127.0.0.1:${serveur.address().port}/${version === 'avant' ? 'avant' : 'index'}.html?journal=1`, { waitUntil: 'load' });
    return await fn(page, erreurs);
  } finally { await ctx.close(); }
}
// Photographier le tampon lui-même, indépendant du post-traitement cathodique.
async function pixels(page, nom, isole = false) {
  const r = await page.evaluate(isole => {
    const N = window.__N, g = N.gfx;
    if (isole) {
      g.clear(0); g.origin(500 - g.W / 2, 256 - g.H / 2);
      N.ennemis.draw(); N.joueuse.draw(); N.joueuse.drawTop(); g.origin(0, 0);
    } else { N.game.draw(); N.fx.draw(); N.game.drawTop(); }
    const b = Array.from(g.buf()), histogramme = new Array(N.pal.C.length).fill(0);
    let horsPalette = 0;
    for (const c of b) { if (c < histogramme.length) histogramme[c]++; else horsPalette++; }
    return { w: g.W, h: g.H, px: g.PX, palette: N.pal.C, histogramme, horsPalette, tampon: b, err: window.__ERR, etat: N.game.etat(), journal: N.journal.dump() };
  }, isole);
  const file = nom + '.json.gz'; fs.writeFileSync(path.join(OUT, file), zlib.gzipSync(JSON.stringify(r)));
  // Capture exportable des vrais indices, sans interpolation.
  const png = await page.evaluate(({ tampon, w, h, palette }) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), im = x.createImageData(w, h);
    tampon.forEach((v, i) => { const rgb = parseInt(palette[v].slice(1), 16); im.data[i * 4] = rgb >> 16; im.data[i * 4 + 1] = rgb >> 8 & 255; im.data[i * 4 + 2] = rgb & 255; im.data[i * 4 + 3] = 255; });
    x.putImageData(im, 0, 0); return c.toDataURL('image/png').split(',')[1];
  }, r);
  fs.writeFileSync(path.join(OUT, nom + '.png'), Buffer.from(png, 'base64'));
  return { w: r.w, h: r.h, histogramme: r.histogramme, horsPalette: r.horsPalette, nonVides: r.tampon.length - r.histogramme[0], err: r.err, tampon: file, capture: nom + '.png' };
}
try {
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok); });
  browser = await chromium.launch({ args: ['--mute-audio'] }); resultats.chromium = browser.version();
  for (const profil of Object.keys(profils)) {
    for (const version of ['avant', 'apres']) {
      for (const longueur of [8, 20, 40]) for (const mobile of [false, true]) for (const ecart of [0, 1, 3, 6, 10]) {
        await pagePour(profil, version, 7, async (page, erreurs) => {
          const rayon = (longueur * 5 + 68 * (1.2 + 0.02 * longueur) * 0.55) / (2 * Math.PI);
          // Fixture isolée : remettre l'horloge à zéro empêche le dt de la dernière
          // image du boot de remplacer le dt imposé de la trajectoire construite.
          await page.evaluate(() => window.__N.horloge.reset());
          const r = await page.evaluate(({ fn, opts }) => (0, eval)('(' + fn + ')')(opts), { fn: casConstruit.toString(), opts: { longueur, rayon, mobile, ecart, forme: 'carre' } });
          const nom = `${profil}-${version}-cas-L${longueur}-m${+mobile}-e${ecart}`, px = await pixels(page, nom, true);
          const ok = !r.err && !erreurs.length && !px.horsPalette && px.nonVides > 0 && (ecart < 7 ? r.lassos.length > 0 && r.pvApres < r.pvAvant : r.lassos.length === 0 && r.pvApres === r.pvAvant);
          resultats.cas.push({ profil, version, ...r, pixels: px, erreursConsole: erreurs, ok }); save();
        });
      }
      const n = profil === 'paysage' ? graines : autres;
      for (const pilote of ['humain', 'expert', 'bon']) for (let graine = 1; graine <= n; graine++) {
        await pagePour(profil, version, graine, async (page, erreurs) => {
          const r = await page.evaluate(({ fn, opts }) => (0, eval)('(' + fn + ')')(opts), { fn: partie.toString(), opts: { pilote, graine } });
          const nom = `${profil}-${version}-${pilote}-${graine}`, px = await pixels(page, nom);
          fs.writeFileSync(path.join(OUT, nom + '-partie.json.gz'), zlib.gzipSync(JSON.stringify(r)));
          resultats.parties.push({ profil, version, pilote, graine, tempsJeu: r.tempsJeu, vague: r.vague, score: r.score, raison: r.raison, err: r.err,
            lassos: r.journal.filter(e => e.type === 'lasso' && e.d.n > 0).length, apogees: r.journal.filter(e => e.type === 'apogee' && e.d.evt === 'debut').length,
            tranches: bilan([r])[pilote].tranches, journalSha256: hash(r.journal), recu: nom + '-partie.json.gz', pixels: px, erreursConsole: erreurs }); save();
        });
      }
    }
  }
  resultats.bilans = [];
  const mediane = arr => { arr.sort((a,b) => a-b); return (arr[Math.floor((arr.length-1)/2)] + arr[Math.floor(arr.length/2)])/2; };
  for (const profil of Object.keys(profils)) for (const version of ['avant', 'apres']) for (const pilote of ['humain','expert','bon']) {
    const jeux = resultats.parties.filter(p => p.profil === profil && p.version === version && p.pilote === pilote), tranches = {};
    for (const cle of ['8-20','21-29','30-40']) {
      const t = jeux.reduce((a,p) => ({ n:a.n+p.tranches[cle].n, ok:a.ok+p.tranches[cle].ok, temps:a.temps+p.tranches[cle].temps }), {n:0,ok:0,temps:0});
      t.reussite = t.n ? t.ok/t.n : null; t.parMinute = t.temps ? t.ok*60/t.temps : null; tranches[cle] = t;
    }
    resultats.bilans.push({profil, version, pilote, n:jeux.length, tranches, lassosMediane:mediane(jeux.map(j=>j.lassos)), apogeesMediane:mediane(jeux.map(j=>j.apogees))});
  }
  resultats.conformiteTechnique = resultats.cas.every(c => c.ok) && resultats.parties.every(p => p.raison === 'fin' && !p.err && !p.erreursConsole.length && !p.pixels.horsPalette && !p.pixels.err.count && p.pixels.nonVides > 0);
  if (!resultats.conformiteTechnique) process.exitCode = 1;
} catch (e) { resultats.erreurs.push(String(e.stack || e)); process.exitCode = 1; }
finally { save(); if (browser) await browser.close(); if (serveur.listening) await new Promise(r => serveur.close(r)); }
console.log(path.join(OUT, 'resultats.json'));
