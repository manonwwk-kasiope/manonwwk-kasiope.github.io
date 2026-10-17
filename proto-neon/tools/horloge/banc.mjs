/* codex-05 : vraie boucle frame(), rAF manuel ; aucun remplacement de game.update ni des règles.
   --phase avant|apres --bundle /tmp/bundle.html --mode titre|parties|ralentis|perf|pas|tout
   --profils paysage,portrait,bureau --outdir /tmp/preuves. Chromium muet, exécution en série. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const phase = arg('--phase', 'apres'), mode = arg('--mode', 'tout'), selected = arg('--profils', 'paysage,portrait,bureau').split(',');
const OUT = path.resolve(arg('--outdir', path.join(HERE, phase))); fs.mkdirSync(OUT, { recursive: true });
const bundle = fs.readFileSync(arg('--bundle', path.join(ROOT, 'index.html')));
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]);
  if (u === '/index.html') { res.setHeader('Content-Type', 'text/html'); return res.end(bundle); }
  const file = path.resolve(ROOT, '.' + u);
  if (!file.startsWith(ROOT + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', file.endsWith('.mp4') ? 'video/mp4' : file.endsWith('.png') ? 'image/png' : file.endsWith('.json') ? 'application/json' : 'audio/mpeg'); fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const browser = await chromium.launch({ args: ['--mute-audio'] });
const profiles = { paysage: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } }, portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }, bureau: { viewport: { width: 1440, height: 900 } } };
const receipt = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), phase, mode, bundleSha256: hash(bundle), protocoleSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))), navigateur: browser.version(), cas: [] };
async function pageFor(profil) {
  const ctx = await browser.newContext(profiles[profil]), page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message)); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    window.__SEED = 2975; window.__DT = 1 / 60;
    let id = 0, now = 0; const callbacks = new Map();
    window.requestAnimationFrame = f => { callbacks.set(++id, f); return id; };
    window.cancelAnimationFrame = i => callbacks.delete(i);
    window.__tick = () => { now += 1000 / 60; const work = [...callbacks.values()]; callbacks.clear(); for (const f of work) f(now); };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?perf=1&journal=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N?.game && window.__S && window.__tick);
  return { ctx, page, errors };
}
async function one(profil, genre, repetition = 0) {
  const { ctx, page, errors } = await pageFor(profil);
  try {
    const r = await page.evaluate(({ genre }) => {
      const N = window.__N, S = window.__S, H = N.horloge.H;
      S.jour = 20261017; if (S.reglages) S.reglages.actions = 'doigts';
      const tick = n => { for (let i = 0; i < n; i++) window.__tick(); };
      const base = () => ({ etat: N.game.etat(), ecran: S.ecran, pas: N.horloge.pas(), t: N.horloge.t(), frame: S.frame, err: window.__ERR.count });
      if (genre === 'titre') {
        tick(30); const demarrage = base(); S.input.valider = true; tick(1); tick(30);
        window.__titre = N.game.etat(); return { demarrage, titre: base(), conforme: N.game.etat() === 'titre' && N.ui.ecran() === 'titre' };
      }
      N.intro.skip(); N.game.reset(2975); N.game.dbg.vague(1); N.game.dbg.god(true);
      if (genre === 'pas') {
        tick(2); const rows = [], adv = N.horloge.avancer, upd = N.game.update, draw = N.gfx.present;
        let pas = 0, updates = 0, dessins = 0, impulsions = 0;
        N.horloge.avancer = function () { pas++; return adv.apply(this, arguments); };
        N.game.update = function () { updates++; if (S.input.pouvoir) impulsions++; return upd.apply(this, arguments); };
        N.gfx.present = function () { dessins++; return draw.apply(this, arguments); };
        for (const dt of [0, 1 / 240, 1 / 240, 1 / 60, 1]) {
          S.input.pouvoir = true; window.__DT = dt; pas = updates = dessins = impulsions = 0; window.__tick();
          rows.push({ dt, pas, updates, dessins, impulsions, restePouvoir: S.input.pouvoir, sT: S.t, hT: N.horloge.t() });
        }
        return { rows, conforme: rows[0].pas === 0 && rows[0].restePouvoir && rows[1].pas === 0 && rows[2].pas === 1 && rows[3].pas === 2 && rows[4].pas === N.horloge.PAS_MAX && rows.every(r => r.updates === r.pas && r.dessins === 1 && r.impulsions <= 1 && r.sT === r.hT), ...base() };
      }
      if (genre === 'perf') {
        N.game.dbg.vague(4); N.game.dbg.god(true); tick(120);
        const vals = []; for (let i = 0; i < 900; i++) { window.__tick(); if ((i + 1) % 30 === 0) vals.push({ p95: S.perf.p95, etat: N.game.etat(), t: N.horloge.t() }); }
        const p95 = vals.map(v => v.p95).sort((a, b) => a - b); return { valeurs: vals, medianeP95: p95[p95.length >> 1], maximumP95: p95.at(-1), ...base() };
      }
      if (genre === 'parties') {
        /* Départ réel par les deux écrans, pas de dbg ni de simulation sans dessin pour cette partie. */
        N.game.reset(2975); tick(30); S.input.valider = true; tick(31); const titre = N.game.etat();
        S.input.valider = true; tick(1); N.pilote.lancer('bon');
        const vus = {}, depuis = S.frame; let frames = 0;
        while (N.game.etat() !== 'fin' && frames < 540 * 60 * 4 && !window.__ERR.count) { window.__tick(); frames++; const e = N.game.etat(); vus[e] = (vus[e] || 0) + 1; }
        return { titre, fin: N.game.etat() === 'fin', frames, depuis, etats: vus, journal: N.journal.dump(), conforme: titre === 'titre' && N.game.etat() === 'fin' && !window.__ERR.count, ...base() };
      }
      /* Déclencheurs publics, puis vrais pas rendus par frame(). Le wrapper observe sans modifier dt. */
      tick(2); const old = N.horloge.avancer, samples = [], reductions = []; let actif = '';
      N.horloge.avancer = function () {
        const k = N.fx.k(), kJ = N.fx.kJoueuse(), d = old.apply(this, arguments);
        samples.push({ cas: actif, frame: S.frame, pas: N.horloge.pas(), d, dJ: N.horloge.dtJoueuse(), k, kJ, gele: N.horloge.gele(), arret: N.horloge.arretee() }); return d;
      };
      const ancien = N.fx.ralenti; N.fx.ralenti = function (k, d, o) { reductions.push({ cas: actif, k, d, o }); return ancien.apply(this, arguments); };
      function probe(nom, f, duration) {
        N.game.reset(2975); N.game.dbg.vague(1); N.game.dbg.god(true); tick(2); samples.length = 0; actif = nom;
        const ok = f(); tick(Math.ceil((duration + 0.5) * 60));
        const list = samples.slice(), slowed = list.filter(s => s.d > 0 && s.k < 0.999), unique = [...new Set(slowed.map(s => +(s.d / H).toFixed(6)))];
        return { nom, declenche: ok, demande: reductions.filter(r => r.cas === nom), echantillons: list, secondesRalenties: slowed.length * H, facteurs: unique, horlogeAppelee: list.length > 0, facteursAppliques: list.length > 0 && list.every(s => s.arret || s.gele || Math.abs(s.d - H * s.k) < 1e-9) };
      }
      const ralenti = probe('ralenti', () => N.joueuse.equiper('ralenti') && N.joueuse.pouvoirActiver(), N.R.pouvoirs.ralenti.duree);
      const niveau = probe('niveau', () => { N.cartes.xp(N.R.xp.seuils[0]); return true; }, N.R.scene.niveau.duree);
      const cyclope = probe('cyclope', () => { N.game.dbg.boss(); N.game.dbg.god(true); return N.colosse.actif(); }, N.R.scene.cyclope.duree);
      const attentes = { ralenti: N.R.pouvoirs.ralenti, niveau: N.R.scene.niveau, cyclope: N.R.scene.cyclope };
      const probes = [ralenti, niveau, cyclope];
      for (const p of probes) { const c = attentes[p.nom]; p.attendu = { facteur: c.monde ?? c.ralenti, duree: c.duree }; p.conforme = p.declenche && p.facteursAppliques && p.facteurs.some(v => Math.abs(v - p.attendu.facteur) < 1e-5) && Math.abs(p.secondesRalenties - c.duree) <= 2 * H; }
      return { probes, conforme: probes.every(p => p.conforme), ...base() };
    }, { genre });
    r.erreursConsole = errors;
    if (r.journal) { r.journalSha256 = hash(JSON.stringify(r.journal)); fs.writeFileSync(path.join(OUT, `${genre}-${profil}-${repetition}-journal.json`), JSON.stringify(r.journal)); r.evenements = r.journal.length; delete r.journal; }
    const image = `${genre}-${profil}-${repetition}.png`; await page.screenshot({ path: path.join(OUT, image), scale: 'css' }); r.capture = image;
    receipt.cas.push({ profil, genre, repetition, ...r }); fs.writeFileSync(path.join(OUT, `${mode}.json`), JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify({ profil, genre, repetition, conforme: r.conforme, fin: r.fin, frames: r.frames, err: r.err, p95: r.medianeP95, journal: r.journalSha256, probes: r.probes?.map(p => ({ nom: p.nom, conforme: p.conforme, secondes: p.secondesRalenties })) }));
  } finally { await ctx.close(); }
}
try {
  for (const profil of selected) for (const genre of (mode === 'tout' ? ['titre', 'pas', 'ralentis', 'perf', 'parties'] : [mode])) {
    await one(profil, genre); if (genre === 'parties' && profil === 'paysage') await one(profil, genre, 1);
  }
  const runs = receipt.cas.filter(c => c.genre === 'parties' && c.profil === 'paysage');
  receipt.determinisme = runs.length === 2 ? runs[0].journalSha256 === runs[1].journalSha256 : null;
  receipt.conforme = receipt.cas.every(c => c.conforme !== false && !c.err && !c.erreursConsole?.length) && receipt.determinisme !== false;
  if (!receipt.conforme) process.exitCode = 1;
} finally { fs.writeFileSync(path.join(OUT, `${mode}.json`), JSON.stringify(receipt, null, 2)); await browser.close(); await new Promise(r => server.close(r)); }
