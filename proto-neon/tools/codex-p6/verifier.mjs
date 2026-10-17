/* Depuis proto-neon/ : node tools/codex-p6/verifier.mjs
   Navigateur : à lancer HORS DU BAC ; HTTP sur port libre, un Chromium muet, trois profils en série.
   Ici, utiliser seulement --statique (vraies sources en VM, sans DOM, serveur ni navigateur).
   --qualifier-vm --statique refait les dix références du commit e1bdc6f avant tout verdict de la VM. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
import { monde, partie, ROOT } from './vm.mjs';
import { relever } from './observations.mjs';
import { valider } from './controles.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const dateParis = () => new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
const profils = [
  ['paysage', { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 }, hasTouch: true }],
  ['portrait', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 }, hasTouch: true }],
  ['bureau', { viewport: { width: 1440, height: 900 } }]
];
const fichierValidation = path.join(HERE, 'validation-vm.json');
const reference = fs.readFileSync(path.join(ROOT, 'tools/pilotes/sortie.json'));
const protocoleVM = sha(fs.readFileSync(path.join(HERE, 'vm.mjs')));
if (process.argv.includes('--qualifier-vm')) {
  const refs = JSON.parse(reference).cas, cas = [];
  const paires = [['inerte', 1], ['tourneur', 1], ['maladroit', 1], ['kamikaze', 1], ['humain', 1], ['bon', 1], ['expert', 1], ['dieu', 1], ['inerte', 2], ['bon', 2]];
  for (const [pilote, graine] of paires) {
    const reel = partie(monde({ ref: 'e1bdc6f' }), pilote, graine);
    const ref = refs.find(r => r.pilote === pilote && r.graine === graine);
    const attendu = { tempsJeu: ref.tempsJeu, vague: ref.vague, score: ref.score };
    const identique = Object.keys(attendu).every(k => reel[k] === attendu[k]);
    cas.push({ reel, reference: attendu, identique });
    console.log(`${pilote}/${graine} : ${identique ? 'identique' : 'DIVERGE'}`);
  }
  fs.writeFileSync(fichierValidation, JSON.stringify({ dateParis: dateParis(), ref: 'e1bdc6f', protocoleVM, referenceSha256: sha(reference), cas, valide: cas.every(c => c.identique) }, null, 2) + '\n');
}

function archive(r, nom) {
  fs.writeFileSync(path.join(HERE, nom + '.json.gz'), zlib.gzipSync(JSON.stringify(r)));
  for (const s of [...r.scenes, r.calme]) {
    const pixels = Uint8Array.from(s.pixels), masque = Uint8Array.from(s.masque);
    s.pixelsSha256 = sha(pixels); s.masqueSha256 = sha(masque);
    s.proprietaires = Array.from({ length: 10 }, (_, c) => masque.reduce((n, v) => n + (v === c), 0));
    delete s.pixels; delete s.masque;
    if (s.journal) { s.journalSha256 = sha(JSON.stringify(s.journal)); s.evenements = s.journal.length; delete s.journal; }
  }
  return r;
}

if (process.argv.includes('--statique')) {
  const qualification = JSON.parse(fs.readFileSync(fichierValidation));
  assert.equal(qualification.valide, true, 'VM divergente, aucun verdict permis');
  assert.ok(qualification.cas.length >= 10 && qualification.cas.every(c => c.identique));
  assert.equal(qualification.protocoleVM, protocoleVM, 'refaire --qualifier-vm : protocole changé');
  assert.equal(qualification.referenceSha256, sha(reference), 'références changées');
  const resultat = { dateParis: dateParis(), limite: 'VM Node sans DOM ; aucune qualification Safari, capture ou performance navigateur.', qualification: 'validation-vm.json', profils: [] };
  // État de départ de la mission, en lecture seule depuis Git ; aucune source du worktree écrasée.
  const base = monde({ ref: '3883b2a94b07f50810f538f7061545fd22915e5e' });
  const avant = JSON.parse(JSON.stringify(vm.runInContext('(' + relever.toString() + ')()', base.c)));
  resultat.avant = archive(avant, 'avant-paysage');
  for (const [nom, p] of profils) {
    const m = monde({ width: p.viewport.width, height: p.viewport.height });
    const r = JSON.parse(JSON.stringify(vm.runInContext('(' + relever.toString() + ')()', m.c)));
    r.erreurs.console = m.erreurs;
    try { valider(r); r.conforme = true; } catch (e) { r.conforme = false; r.echec = String(e.stack); process.exitCode = 1; }
    resultat.profils.push({ nom, ...archive(r, 'vm-' + nom) });
    console.log(`${nom} : ${r.conforme ? 'conforme en VM' : r.echec}`);
  }
  // Propriété réelle des primitives : recouvrement transparent, effacement, écritures directes identiques.
  const { N } = monde(), g = N.gfx, P = N.ids.proprietaires;
  g.resize(844, 390); g.masque(true); g.owner(P.corps); g.clear(0);
  assert.ok(g.mask().every(v => v === P.aucun));
  g.owner(P.tete); g.rect(0, 0, 2, 1, N.pal.i('cyan'));
  g.owner(P.decor); g.layer({ w: 2, h: 1, data: Uint8Array.of(0, N.pal.i('ambre')) }, { x: 0, y: 0 });
  assert.deepEqual([...g.mask().slice(0, 2)], [P.tete, P.decor]);
  g.owner(P.tete); g.rect(0, 0, 2, 1, N.pal.i('cyan'));
  g.owner(P.decor); g.layer({ w: 2, h: 1, data: Uint8Array.of(0, N.pal.i('ambre')) }, { wrapX: true });
  assert.deepEqual([...g.mask().slice(0, 2)], [P.tete, P.decor]);
  g.suivre(P.effet, () => { const b = g.buf(); b[0] = b[0]; }, null, []);
  assert.equal(g.mask()[0], P.effet);
  assert.equal(ArrayBuffer.isView(g.buf()), true, 'buf public reste un Uint8Array');
  const copie = g.copyTo(); g.owner(P.butin); g.rect(0, 0, 2, 1, 0); g.mixBayer(copie, 1);
  assert.deepEqual([...g.mask().slice(0, 2)], [P.effet, P.decor]);
  g.resize(390, 844); assert.equal(g.mask().length, g.W * g.H);
  g.masque(false); assert.equal(g.mask(), null);
  resultat.primitives = 'recouvrement transparent (bouclé et simple), clear, écriture identique directe, copie/fondu, rotation, désactivation : réussis';
  // Aucune instrumentation installée tant qu'aucun test ne la demande ; rendu avant/après strictement égal.
  const originel = monde({ ref: '3883b2a94b07f50810f538f7061545fd22915e5e' }), courant = monde();
  const render = m => { const n = m.N; n.intro.skip(); n.game.reset(7); n.game.dbg.scene('calme'); n.gfx.clear(0); n.game.draw(); n.fx.draw(); n.game.drawTop(); return Buffer.from(n.gfx.buf()); };
  assert.deepEqual(render(courant), render(originel));
  assert.equal(courant.N.gfx.mask(), null);
  const sans = monde(), avec = monde();
  const dessinerOriginal = avec.N.joueuse.drawTop;
  avec.N.game.dbg.masque(true);
  const a = render(sans), b = render(avec); assert.deepEqual(a, b);
  avec.N.game.dbg.masque(false);
  assert.equal(avec.N.joueuse.drawTop, dessinerOriginal);
  assert.equal(avec.N.gfx.mask(), null);
  resultat.nonRegression = { pixelsCalmeIdentiquesAvantApres: true, pixelsIdentiquesAvecSansMasque: true, masqueAbsentSansDemande: true };
  const cout = masque => {
    const m = monde(), n = m.N, C = n.R.tests.mesureVM;
    n.intro.skip(); n.game.reset(7); n.game.dbg.scene('calme');
    if (masque) n.game.dbg.masque(true);
    const dessin = () => { n.gfx.clear(0); n.game.draw(); n.fx.draw(); n.game.drawTop(); n.gfx.origin(0, 0); n.hud.draw(); };
    for (let i = 0; i < C.chauffe; i++) dessin();
    const ms = [];
    for (let i = 0; i < C.images; i++) { const t = process.hrtime.bigint(); dessin(); ms.push(Number(process.hrtime.bigint() - t) / 1e6); }
    const sorted = [...ms].sort((a, b) => a - b);
    return { images: ms.length, moyenneMs: ms.reduce((a, b) => a + b) / ms.length, p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1], brutMs: ms };
  };
  resultat.coutVM = { limite: 'Coût de dessin Node/VM à scène et horloge fixes ; ni frame navigateur, ni Safari, ni seuil R-20.', sansMasque: cout(false), avecMasque: cout(true) };
  fs.writeFileSync(path.join(HERE, 'statique.json'), JSON.stringify(resultat, null, 2) + '\n');
} else {
  const serveur = http.createServer((req, res) => {
    try {
      const rel = decodeURIComponent(new URL(req.url, 'http://local').pathname);
      const file = path.resolve(ROOT, '.' + (rel === '/' ? '/index.html' : rel));
      if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
      const types = { '.html': 'text/html', '.json': 'application/json', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
      res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
    } catch { res.writeHead(400); res.end(); }
  });
  let browser;
  const sortie = { dateParis: dateParis(), bundleSha256: sha(fs.readFileSync(path.join(ROOT, 'index.html'))), profils: [] };
  try {
    await new Promise((ok, ko) => { serveur.once('error', ko); serveur.listen(0, '127.0.0.1', ok); });
    browser = await chromium.launch({ args: ['--mute-audio'] }); sortie.chromium = browser.version();
    for (const [nom, options] of profils) {
      const ctx = await browser.newContext(options), page = await ctx.newPage(), erreurs = [];
      try {
        page.on('pageerror', e => erreurs.push(e.message));
        page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
        await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; });
        await page.goto(`http://127.0.0.1:${serveur.address().port}/index.html?journal=1`, { waitUntil: 'load' });
        const r = await page.evaluate(relever);
        // Les tableaux pixels/masque sont relevés dans une seule évaluation synchrone, sans image intercalée.
        r.erreurs.console = erreurs;
        try { valider(r); r.conforme = true; } catch (e) { r.conforme = false; r.echec = String(e.stack); process.exitCode = 1; }
        await page.screenshot({ path: path.join(HERE, 'playwright-' + nom + '.png') });
        sortie.profils.push({ nom, ...archive(r, 'playwright-' + nom) });
      } finally { await ctx.close(); }
    }
  } catch (e) { sortie.environnement = String(e.stack); process.exitCode = 1; }
  finally {
    if (browser) await browser.close();
    if (serveur.listening) await new Promise(r => serveur.close(r));
    fs.writeFileSync(path.join(HERE, 'playwright.json'), JSON.stringify(sortie, null, 2) + '\n');
  }
}
