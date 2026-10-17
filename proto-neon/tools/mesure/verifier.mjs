/* Vérifie l'instrument. --statique : Node/VM sans DOM, ne vaut PAS une mesure Playwright.
   Sans option : contrôle des quatre vrais critères sur le bundle et des copies fautives temporaires.
   Un seul Chromium est ouvert à la fois, toujours muet. */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { Banc, options, PROTO, ICI, PROFILS, mesurerCritere, dateParis } from './commun.mjs';
import { cle, comparer } from './criteres/R-30-rejouabilite.mjs';

const sortie = path.join(ICI, 'verification');
fs.mkdirSync(sortie, { recursive: true });
const preuves = { dateParis: dateParis(), limite: 'Node/VM sans DOM : états et sonde seulement, aucune qualification Safari ni capture navigateur.', controles: [] };
function controler(nom, fn) { fn(); preuves.controles.push({ nom, ok: true }); }
function monde() {
  const erreurs = [];
  const c = { console: { log() {}, warn() {}, error(...args) { erreurs.push(args.map(String).join(' ')); } }, URL, URLSearchParams,
    location: { search: '?journal=1' }, navigator: { maxTouchPoints: 1 }, innerWidth: 844, innerHeight: 390,
    requestAnimationFrame() {}, addEventListener() {}, matchMedia: () => ({ matches: false }), ART_SRC: {}, CINE_DISPO: [],
    MUSIQUE_BASE: 'musique/', MUSIQUE_EMBED: null, __N: {} };
  c.window = c; c.N = c.__N; vm.createContext(c);
  for (const f of fs.readdirSync(path.join(PROTO, 'src')).filter(f => f.endsWith('.js')).sort())
    vm.runInContext(fs.readFileSync(path.join(PROTO, 'src', f), 'utf8'), c, { filename: f });
  c.__S = c.__N.S;
  c.__N.gfx.resize(PROFILS.paysage.viewport.width, PROFILS.paysage.viewport.height);
  vm.runInContext(fs.readFileSync(path.join(ICI, 'sonde.js'), 'utf8'), c, { filename: 'sonde.js' });
  return { c, N: c.__N, M: c.__MESURE, erreurs };
}
const { c, N, M, erreurs } = monde();
controler('Playwright résolu via node_modules et profils iPhone/bureau', () => {
  assert.ok(chromium); assert.ok(devices['iPhone 13']);
  assert.deepEqual(Object.values(PROFILS).map(p => [p.viewport.width, p.viewport.height]), [[844, 390], [390, 844], [1440, 900]]);
});
controler('dbg fonction portant des méthodes, sans appel à son instantané', () => { assert.equal(typeof N.game.dbg, 'function'); assert.equal(M.dbg(), N.game.dbg); assert.equal(typeof M.dbg().scene, 'function'); });
const demarrage = M.demarrer({ graine: 7 });
preuves.depart = demarrage;
preuves.avantApres = { resolutionDbg: { avant: typeof N.game.dbg === 'object' ? 'objet accepté' : null, apres: typeof M.dbg() }, depart: { avant: 'demarrage (constat fourni)', apres: demarrage.etat, contournement: false } };
controler('aucun contournement si reset reste en demarrage', () => { assert.equal(demarrage.ok, false); assert.equal(N.game.etat(), 'demarrage'); assert.match(demarrage.raison, /aucun écran contourné/); });
preuves.scenes = {};
for (const scene of [...N.ids.scenes]) {
  try { N.game.reset(7); const ok = M.dbg().scene(scene); preuves.scenes[scene] = { ok, etat: N.game.etat() }; }
  catch (e) { preuves.scenes[scene] = { erreur: String(e) }; }
}
N.game.reset(7); N.game.dbg.scene('calme');
const avant = N.horloge.t(); N.game.dbg.simuler(N.R.temps.imageRef);
preuves.simulation = { avant, apres: N.horloge.t(), etat: N.game.etat(), pas: N.horloge.pas() };
preuves.masque = { taille: N.game.dbg.masque().length, proprietaires: [...new Set(N.game.dbg.masque())] };
controler('masque sans propriétaires refusé, aucune réussite par masque nul', () => { assert.equal(M.masque(), null); assert.match(M.raisonMasque, /tous les codes à 0/); });
controler('pilote public lancer', () => { N.pilote.lancer('bon'); assert.equal(N.pilote.nom(), 'bon'); N.pilote.arreter(); });
controler('R-02 : analyse réelle du tampon, index fautif détecté', () => {
  N.gfx.clear(0); let a = M.analyseCourante({ masque: false }); assert.equal(a.horsPalette, 0);
  N.gfx.buf()[0] = N.pal.C.length; a = M.analyseCourante({ masque: false }); assert.equal(a.horsPalette, 1);
});
controler('R-03 : cyan appartenant au décor refusé', () => {
  N.gfx.clear(N.pal.i('cyan')); const b = N.gfx.buf(), mk = new Uint8Array(b.length).fill(N.ids.proprietaires.decor ?? 8);
  const a = M.analyse(b, N.gfx.W, N.gfx.H, mk); assert.ok(a.cyanHorsMasque >= N.R.criteres.R03.cyanHorsMasque);
});
controler('R-21 : défaut dans __ERR détecté par la sonde', () => {
  assert.equal(M.erreurs().count, 0); c.__ERR.count++; assert.equal(M.erreurs().count, 1);
});
controler('R-30 : même journal accepté, journal altéré et troncature refusés', () => {
  const x = monde().N, y = monde().N;
  x.game.reset(7); const a = cle(x.journal.dump(), 0); assert.ok(a.length);
  y.game.reset(7); const b = cle(y.journal.dump(), 0); assert.equal(comparer(a, b).egaux, true);
  const fautif = JSON.parse(JSON.stringify(y.journal.dump())); fautif[0].d.graine++;
  assert.equal(comparer(a, cle(fautif, 0)).egaux, false); assert.equal(comparer(a, []).egaux, false);
});
// Importer les 38 modules vérifie aussi les imports ESM, sans ouvrir Chromium.
preuves.criteres = [];
for (const f of fs.readdirSync(path.join(ICI, 'criteres')).filter(f => /^R-\d\d-.*\.mjs$/.test(f)).sort()) {
  const mod = await import(new URL('./criteres/' + f, import.meta.url));
  preuves.criteres.push({ id: mod.meta.id, titre: mod.meta.titre });
}
assert.equal(preuves.criteres.length, 38);
preuves.consoleVM = erreurs;
fs.writeFileSync(path.join(sortie, 'statique.json'), JSON.stringify(preuves, null, 2));
console.log(`${preuves.controles.length} contrôles Node/VM réussis ; 38 modules importés. Ceci ne valide pas Playwright.`);
if (process.argv.includes('--statique')) process.exit(0);

const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'snake-mesure-'));
const html = fs.readFileSync(path.join(PROTO, 'index.html'), 'utf8');
const mutations = {
  'R-02': `const g=window.__N.gfx, p=g.present; g.present=function(){g.buf().fill(window.__N.pal.C.length);return p.apply(this,arguments)};`,
  'R-03': `const N=window.__N,g=N.gfx,p=g.present;g.present=function(){g.buf().fill(N.pal.i('cyan'));return p.apply(this,arguments)};N.game.dbg.masque=function(){return new Uint8Array(g.W*g.H).fill(8)};`,
  'R-21': `queueMicrotask(()=>{throw new Error('DÉFAUT VOLONTAIRE R-21')});`,
  'R-30': `const j=window.__N.journal, d=j.dump;j.dump=function(){const r=d.apply(this,arguments);for(const x of r)if(x.type==='partie')x.d.defautVolontaire=crypto.randomUUID();return r};`
};
for (const [id, js] of Object.entries(mutations)) fs.writeFileSync(path.join(racine, id + '.html'), html.replace('</body>', `<script>${js}</script></body>`));
const serveur = http.createServer((req, res) => {
  const parts = decodeURIComponent(new URL(req.url, 'http://local').pathname).split('/').filter(Boolean);
  const id = parts.shift(), rel = parts.join('/') || 'index.html';
  const fichier = rel === 'index.html' && mutations[id] ? path.join(racine, id + '.html') : path.resolve(PROTO, rel);
  if (!fichier.startsWith(PROTO + path.sep) && !fichier.startsWith(racine + path.sep)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) { res.writeHead(404); return res.end(); }
  const types = { '.html': 'text/html', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': types[path.extname(fichier)] || 'application/octet-stream' }); fs.createReadStream(fichier).pipe(res);
});
const navigateur = { dateParis: dateParis(), profils: [], controles: [], environnement: null };
try {
  await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok); });
  const fumee = new Banc({ ...options(['--rapide']), url: `http://127.0.0.1:${serveur.address().port}/jeu/index.html`, sortie: path.join(sortie, 'profils') });
  try {
    await fumee.demarrer();
    for (const profil of Object.keys(PROFILS)) {
      const s = await fumee.ouvrir(profil, { dt: 1 / 60, graine: 7 });
      const scene = await s.scene('calme');
      const analyse = await s.analyse({ masque: false });
      const journal = await s.journal();
      const erreurs = await s.bilanErreurs();
      const capture = await s.captureTampon('calme');
      navigateur.profils.push({ profil, scene, analyse, journal, erreurs, capture });
      await s.fermer();
    }
  } finally { await fumee.fermer(); }
  for (const id of Object.keys(mutations)) {
    const f = preuves.criteres.find(c => c.id === id);
    const nom = fs.readdirSync(path.join(ICI, 'criteres')).find(n => n.startsWith(id + '-'));
    const mod = await import(new URL('./criteres/' + nom, import.meta.url));
    const bilans = {};
    for (const variante of ['jeu', id]) {
      const opts = { ...options(['--rapide', '--sans-cache']), url: `http://127.0.0.1:${serveur.address().port}/${variante}/index.html`, sortie: path.join(sortie, id, variante) };
      const banc = new Banc(opts);
      try { await banc.demarrer(); bilans[variante] = await mesurerCritere(banc, mod); }
      finally { await banc.fermer(); }
    }
    navigateur.controles.push({ id: f.id, jeu: bilans.jeu, fautif: bilans[id] });
    assert.equal(bilans[id].statut, 'echec', id + ' doit refuser son bundle fautif');
  }
} catch (e) { navigateur.environnement = String(e.stack || e); process.exitCode = 1; }
finally { serveur.close(); fs.rmSync(racine, { recursive: true, force: true }); }
fs.writeFileSync(path.join(sortie, 'playwright.json'), JSON.stringify(navigateur, null, 2));
console.log(navigateur.environnement || 'Quatre bundles fautifs refusés. Résultats réels du jeu dans verification/playwright.json.');
