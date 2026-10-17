/* À lancer hors bac : cd proto-neon && node tools/codex-p7/verifier.mjs
   Sources copiées, raccord appliqué exclusivement dans /tmp, puis build. Aucun commit.
   Un seul Chromium muet, trois profils en série ; ensuite critères officiels R-18/R-35 en série. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { chromium, devices } from 'playwright';
import { ROOT } from './vm.mjs';
import { preparer } from './preparer.mjs';
import { parcours } from './parcours.mjs';
import { encodeIndex } from '../mesure/png.mjs';
import { Banc, options, mesurerCritere } from '../mesure/commun.mjs';
import * as R18 from '../mesure/criteres/R-18-ecran-de-fin.mjs';
import * as R35 from '../mesure/criteres/R-35-relance.mjs';
const out = path.join(ROOT, 'tools/codex-p7/navigateur'); fs.mkdirSync(out, { recursive: true });
const tmp = preparer(), resultat = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
  limite: 'Chromium émulant iPhone ; ne remplace pas une recette Safari sur appareil.',
  bundleSha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(tmp.proto, 'index.html'))).digest('hex'), profils: [], criteres: [] };
const types = { '.html': 'text/html; charset=utf-8', '.png': 'image/png', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.resolve(tmp.proto, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!f.startsWith(tmp.proto + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404); return res.end(); }
  const size = fs.statSync(f).size, range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
  if (range) {
    const start = +range[1] || 0, end = Math.min(range[2] ? +range[2] : size - 1, size - 1);
    res.writeHead(206, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes' });
    return fs.createReadStream(f, { start, end }).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' });
  fs.createReadStream(f).pipe(res);
});
let browser;
try {
  await new Promise((ok, ko) => { server.once('error', ko); server.listen(0, '127.0.0.1', ok); });
  const url = `http://127.0.0.1:${server.address().port}/index.html`;
  browser = await chromium.launch({ args: ['--mute-audio'] }); resultat.chromium = browser.version();
  const profils = [
    ['paysage', { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } }],
    ['portrait', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }],
    ['bureau', { viewport: { width: 1440, height: 900 } }]
  ];
  for (const [nom, profil] of profils) {
    const ctx = await browser.newContext(profil), page = await ctx.newPage(), erreurs = [];
    page.on('pageerror', e => erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
    await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; });
    try {
      await page.goto(url + '?journal=1', { waitUntil: 'load' });
      const fin = await page.evaluate(() => {
        const N = window.__N, S = window.__S;
        localStorage.clear(); S.jour = 20261017; N.intro.skip(); N.game.reset(7, { depart: 'jeu' }); N.horloge.avancer();
        N.game.dbg.vague(3);
        for (let i = 0; i < 100 && N.game.etat() !== 'fin'; i++) {
          if (N.joueuse.etat === 'vivant' || N.game.etat() === 'reapparition') N.joueuse.tuer('mur', { genre: 'decor', type: 'mur', id: null });
          N.game.dbg.simuler(0.25);
        }
        N.game.dbg.simuler(N.R.ecrans.fin.garde);
        N.gfx.clear(N.pal.i('vide')); N.game.draw(); N.game.drawTop(); N.outils.origine(0, 0); N.ui.draw(); N.gfx.present();
        const a = N.ui.finActions(), b = N.gfx.buf(), W = N.gfx.W;
        const libelles = ['CONTINUER ? ' + a.restant, 'REJOUER'].map((label, i) => {
          const r = a[i ? 'rejouer' : 'continuer'], couleur = N.pal.i('os');
          const s = N.spr.text(label, { ci: couleur, contour: false, ombre: false, echelle: 1 });
          const x0 = Math.round(r.x + r.w / 2 - N.outils.textW(label, 1) / 2), y0 = r.y + Math.floor((r.h - N.R.ecrans.fin.actions.texteH) / 2) - s.top;
          let attendus = 0, visibles = 0, dansCible = true;
          for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.data[y * s.w + x] === couleur) {
            attendus++; const xx = x0 + x, yy = y0 + y;
            if (b[yy * W + xx] === couleur) visibles++;
            if (xx < r.x || xx >= r.x + r.w || yy < r.y || yy >= r.y + r.h) dansCible = false;
          }
          return { label, attendus, visibles, dansCible, ok: attendus > 0 && visibles === attendus && dansCible };
        });
        return { etat: N.game.etat(), actions: a, safe: S.view.safe, W, H: N.gfx.H, PX: N.gfx.PX,
          palette: N.pal.C.map((_, i) => [N.pal.R[i], N.pal.G[i], N.pal.B[i]]), pixels: Array.from(b), libelles, erreurs: window.__ERR, journal: N.journal.dump() };
      });
      await page.screenshot({ path: path.join(out, `fin-${nom}.png`) });
      fs.writeFileSync(path.join(out, `fin-${nom}-tampon.png`), encodeIndex(fin.W, fin.H, fin.pixels, fin.palette, fin.PX));
      const { pixels, palette, ...mesureFin } = fin;
      await page.evaluate(() => {
        const N = window.__N;
        N.game.dbg.simuler(2.5);
        N.gfx.clear(N.pal.i('vide')); N.game.draw(); N.game.drawTop(); N.outils.origine(0, 0); N.ui.draw(); N.gfx.present();
      });
      await page.screenshot({ path: path.join(out, `fin-bilan-${nom}.png`) });
      const point = await page.evaluate(() => {
        const N = window.__N, r = N.ui.finActions().continuer, c = document.getElementById('out').getBoundingClientRect();
        return { x: c.left + (r.x + r.w / 2) * N.gfx.PX, y: c.top + (r.y + r.h / 2) * N.gfx.PX };
      });
      if (profil.hasTouch) await page.touchscreen.tap(point.x, point.y); else await page.mouse.click(point.x, point.y);
      const interaction = await page.evaluate(() => {
        const N = window.__N;
        N.game.dbg.simuler(N.R.temps.h); window.__S.input.taps.length = 0;
        return { etat: N.game.etat(), marque: N.score.marque(), score: N.score.score, vies: N.score.vies,
          ok: N.game.etat() === 'jeu' && N.score.marque() === 'C' && N.score.score === N.R.vies.continuer.score && N.score.vies === N.R.vies.continuer.vies };
      });
      const cas = [];
      for (const option of [{}, { boss: true }, { expiration: true }]) {
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'load' });
        // Le parcours teste lui-même les cartes, la longueur, le journal, le refus et la relance.
        const r = await page.evaluate(({ code, option }) => (0, eval)('(' + code + ')')(window.__N, window.__S, option), { code: parcours.toString(), option });
        cas.push({ option, ...r });
      }
      resultat.profils.push({ nom, profil, fin: mesureFin, interaction, cas, erreursConsole: erreurs });
      console.log(nom, cas.map(c => c.conforme), mesureFin.libelles);
    } finally { await ctx.close(); }
  }
  await browser.close(); browser = null; // le banc officiel peut maintenant ouvrir SON Chromium.
  const banc = new Banc({ ...options(process.argv.slice(2)), url, sortie: path.join(out, 'criteres') });
  try {
    await banc.demarrer();
    for (const mod of [R18, R35]) resultat.criteres.push(await mesurerCritere(banc, mod));
  } finally { await banc.fermer(); }
  resultat.conforme = resultat.profils.every(p => p.interaction.ok && p.fin.libelles.every(l => l.ok) && !p.fin.erreurs.count && !p.erreursConsole.length && p.cas.every(c => c.conforme)) && resultat.criteres.every(c => c.statut === 'ok');
} catch (e) { resultat.erreur = String(e.stack || e); resultat.conforme = false; }
finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise(r => server.close(r));
  tmp.nettoyer();
  fs.writeFileSync(path.join(out, 'sortie.json'), JSON.stringify(resultat, null, 2));
}
if (!resultat.conforme) process.exitCode = 1;
