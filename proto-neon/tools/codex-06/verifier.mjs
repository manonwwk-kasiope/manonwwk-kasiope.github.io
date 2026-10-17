import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const stage = process.argv[2] || 'apres';
const server = http.createServer(async (req, res) => {
  const file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const data = await fs.readFile(file);
    res.setHeader('Content-Type', file.endsWith('.html') ? 'text/html' : file.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
const modeFichier = process.argv.includes('--file');
if (!modeFichier) await new Promise((r, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', r); });
const browser = await chromium.launch({ headless: true, args: ['--mute-audio'] });
const results = { stage, dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), profils: [] };
try {
  for (const [nom, viewport, mobile] of [
    ['iphone-paysage', { width: 844, height: 390 }, true],
    ['iphone-portrait', { width: 390, height: 844 }, true],
    ['bureau', { width: 1440, height: 900 }, false]
  ]) {
    const ctx = await browser.newContext({ ...(mobile ? devices['iPhone 13'] : {}), viewport, hasTouch: mobile });
    const page = await ctx.newPage();
    const erreurs = [];
    page.on('pageerror', e => erreurs.push(String(e)));
    page.on('console', e => { if (e.type() === 'error') erreurs.push(e.text()); });
    // Horloge entièrement pilotée ; aucune image réelle ne s'intercale dans les scènes.
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; window.__SEED = 2975; window.__DT = 1 / 120; });
    await page.goto(modeFichier ? `file://${root}/index.html?journal=1` : `http://127.0.0.1:${server.address().port}/index.html?journal=1`);
    await page.waitForFunction(() => window.__N?.game && window.__S);
    const data = await page.evaluate(() => {
      const N = window.__N;
      function neuf(seed = 2975) {
        N.pilote.arreter(); N.game.reset(seed); N.game.dbg.etat('jeu'); N.intro.stop(); N.game.dbg.god(false);
        N.ennemis.reset(); N.journal.actif(true); N.journal.vider(); N.ev.nouveauPas();
        N.joueuse.force({ x: 400, y: 240, ang: 0, len: 24, trace: true });
      }
      function dessiner() {
        N.gfx.clear(0); N.outils.origineMonde(); N.game.draw(); N.fx.draw(); N.game.drawTop();
        const buf = N.gfx.buf(), hist = Array(16).fill(0);
        let invalides = 0, hash = 2166136261;
        for (const v of buf) { if (v > 15) invalides++; else hist[v]++; hash = Math.imul(hash ^ v, 16777619); }
        return { w: N.gfx.W, h: N.gfx.H, hist, invalides, hash: hash >>> 0 };
      }
      neuf(); N.cartes.choisir('grappe'); N.cartes.choisir('grappe');
      const groupe = [0, 20, 40, 60, 80].map(dx => N.ennemis.spawn('fleche', 520 + dx, 240));
      N.ennemis.hit(groupe[0], groupe[0].pv, { genre: 'arme', type: 'canon', id: -1 });
      for (let i = 0; i < 60; i++) { N.ev.nouveauPas(); N.arsenal.update(1 / 120); N.fx.update(1 / 120); }
      const grappe = { pv: groupe.map(e => e.pv), morts: groupe.filter(e => e.etat === 'mort').length,
        journal: N.journal.dump().filter(e => e.type === 'kill'), pixels: dessiner() };

      neuf(); N.cartes.choisir('eperon'); N.game.dbg.input({ x: 1, y: 0, mag: 0.8, boost: true });
      const cible = N.ennemis.spawn('fleche', 426, 240);
      for (let i = 0; i < 60 && N.joueuse.etat !== 'mort'; i++) {
        N.ev.nouveauPas(); N.joueuse.update(1 / 120); N.arsenal.update(1 / 120);
      }
      const eperon = { pv: cible.pv, ennemi: cible.etat, joueuse: N.joueuse.etat, reserve: N.joueuse.reserve(), journal: N.journal.dump().filter(e => ['kill', 'mort'].includes(e.type)) };
      // Le raccord public seul est mesuré séparément du raccord de collision encore à intégrer.
      neuf(); N.cartes.choisir('eperon'); N.game.dbg.input({ x: 1, y: 0, mag: 0.8, boost: true }); N.joueuse.update(1 / 120);
      const contact = N.ennemis.spawn('fleche', N.joueuse.tete.x, N.joueuse.tete.y);
      const raccord = N.arsenal.percuter ? N.arsenal.percuter(contact) : null;
      eperon.raccord = { resultat: raccord, pv: contact.pv, journal: N.journal.dump().filter(e => e.type === 'kill') };

      function essaiBraise(niveau) {
        neuf(); for (let i = 0; i < niveau; i++) N.cartes.choisir('braise');
        N.game.dbg.god(true); N.game.dbg.input({ x: 1, y: 0, mag: 0.8, boost: false });
        let e;
        for (let i = 0; i < 300; i++) {
          N.ev.nouveauPas(); N.joueuse.update(1 / 120); N.arsenal.update(1 / 120);
          if (i === 0) { const q = N.joueuse.segPos(N.joueuse.len()); e = N.ennemis.spawn('ruche', q.x, q.y); }
        }
        const pixels = dessiner();
        const q = N.joueuse.segPos(N.joueuse.len());
        N.gfx.clear(0); N.gfx.origin(q.x - N.gfx.W / 2, q.y - N.gfx.H / 2); N.arsenal.draw();
        return { pv: e.pv, pvMax: e.pvMax, degats: e.pvMax - e.pv, pixels,
          pixelsAmbreArsenal: [...N.gfx.buf()].filter(v => v === N.pal.i('ambre')).length };
      }
      const braise = [essaiBraise(0), essaiBraise(1), essaiBraise(2)];

      neuf(); N.cartes.choisir('bouclier');
      N.joueuse.update(1 / 120);
      // Décharger le bouclier puis mesurer deux vraies coupes, sans confondre absorption et répit.
      const src = { genre: 'ennemi', type: 'tourelle', id: -1 };
      const absorption = N.joueuse.couper(20, src, 'tir');
      const c1 = N.joueuse.couper(16, src, 'tir');
      const c2 = N.joueuse.couper(8, src, 'tir');
      const repit = { absorption, premiere: c1, seconde: c2, len: N.joueuse.len(), journal: N.journal.dump().filter(e => e.type === 'coupe') };
      if (N.cartes.apresCoupe) { N.cartes.apresCoupe(); repit.raccordActif = N.cartes.repitActif('tir'); repit.murProtege = N.cartes.repitActif('mur'); }
      if (N.cartes.repitActif) { N.outils.T.t += N.R.passifs.effets.repit.duree; repit.expire = !N.cartes.repitActif('tir'); }

      neuf(); N.cartes.choisir('grappe'); N.cartes.choisir('grappe'); N.ev.verifier(true);
      const masse = [];
      for (let i = 0; i < 128; i++) { N.ev.nouveauPas(); masse.push(N.ennemis.spawn('fleche', 520, 240)); }
      N.ev.nouveauPas(); N.ennemis.hit(masse[0], masse[0].pv, { genre: 'arme', type: 'canon', id: -1 });
      let maxKillsPas = 0, maxFile = 0;
      for (let i = 0; i < 120; i++) {
        N.ev.nouveauPas(); const avant = masse.filter(e => e.etat === 'mort').length;
        N.arsenal.update(1 / 120); N.fx.update(1 / 120);
        maxKillsPas = Math.max(maxKillsPas, masse.filter(e => e.etat === 'mort').length - avant);
        maxFile = Math.max(maxFile, N.arsenal.etat().grappes || 0);
      }
      const stress = { morts: masse.filter(e => e.etat === 'mort').length, maxKillsPas, maxFile,
        arsenal: N.arsenal.etat(), perdusBus: N.ev.stats().perdus, erreurs: window.__ERR.count };
      N.ev.verifier(false);

      neuf(); N.cartes.choisir('grappe');
      const purge = [N.ennemis.spawn('fleche', 520, 240), N.ennemis.spawn('fleche', 530, 240)];
      N.ennemis.hit(purge[0], purge[0].pv, { genre: 'decor', type: 'purge', id: null }); N.arsenal.update(1 / 120);
      const sansPropagationPurge = purge[1].pv === purge[1].pvMax;
      neuf(); N.joueuse.tuer('mur', { genre: 'decor', type: 'mur', id: null });
      const invariants = { sansPropagationPurge, murTue: N.joueuse.etat === 'mort', morsure: N.R.mort.morsure.effet };

      const pilotes = [];
      for (const seed of [2975, 2030, 1976]) {
        neuf(seed); N.game.dbg.god(false); N.pilote.lancer('bon');
        const journal = N.game.dbg.simuler(60);
        pilotes.push({ seed, etat: N.game.etat(), tJeu: N.outils.T.t, score: N.score.score, len: N.joueuse.len(),
          kills: journal.filter(e => e.type === 'kill').length, coupes: journal.filter(e => e.type === 'coupe').length,
          morts: journal.filter(e => e.type === 'mort').length, choix: journal.filter(e => e.type === 'pilote' && e.d.evt === 'carte').length,
          prises: { ...N.cartes.prises() }, erreurs: window.__ERR.count });
      }
      return { grappe, eperon, braise, repit, stress, invariants, pilotes, erreurs: window.__ERR };
    });
    // Soak : une minute de combat calculé, carte par carte ; pilote et invulnérabilité explicitement signalés.
    const soak = await page.evaluate(() => {
      const N = window.__N, out = [];
      for (const carte of ['grappe', 'eperon', 'braise', 'bouclier']) {
        N.pilote.arreter(); N.game.reset(2975); N.game.dbg.etat('jeu'); N.game.dbg.god(true);
        N.cartes.choisir(carte); N.pilote.lancer('bon');
        N.journal.vider(); N.journal.actif(false);
        let interruptions = 0, combat = 0, ms = [], maxEnnemis = 0;
        // Le pilote brut est mesuré ci-dessus. Ici, retour explicite en combat si un écran le bloque.
        for (let i = 0; i < 60 * 120; i++) {
          if (N.game.etat() === 'cartes' || N.game.etat() === 'panneau' || N.game.etat() === 'vol') {
            N.intro.stop(); N.game.dbg.etat('jeu'); interruptions++;
          }
          const t = N.outils.T.t, start = performance.now();
          N.game.dbg.simuler(1 / 120); ms.push(performance.now() - start);
          if (N.outils.T.t > t) combat += N.outils.T.t - t;
          maxEnnemis = Math.max(maxEnnemis, N.ennemis.count());
          if (i % 120 === 0) { N.gfx.clear(0); N.game.draw(); N.fx.draw(); N.game.drawTop(); }
        }
        ms.sort((a, b) => a - b);
        const buf = N.gfx.buf();
        out.push({ carte, secondesDemandees: 60, secondesCombat: combat, etat: N.game.etat(), interruptions,
          god: true, prises: { ...N.cartes.prises() }, maxEnnemis, erreurs: window.__ERR.count,
          pixelsHorsPalette: [...buf].filter(x => x > 15).length, coutPasP95: ms[Math.floor(ms.length * .95)],
          kills: N.journal.dump().filter(e => e.type === 'kill').length });
      }
      return out;
    });
    results.profils.push({ nom, viewport, ...data, soak, erreursConsole: erreurs });
    await fs.writeFile(path.join(here, `${stage}.json`), JSON.stringify(results, null, 2));
    console.log(nom, JSON.stringify({ grappe: data.grappe.morts, eperon: data.eperon.joueuse, braise: data.braise.map(x => x.degats), repit: data.repit.seconde, pilotes: data.pilotes.map(x => [x.seed, x.etat, x.tJeu]), erreurs: data.erreurs.count, soak }));
    await ctx.close();
  }
} finally { await browser.close(); if (server.listening) await new Promise(r => server.close(r)); }
