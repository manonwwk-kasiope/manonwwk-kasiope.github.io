/* À lancer hors bac à sable : node proto-neon/tools/codex-p29/verifier.mjs
   Un seul Chromium muet. Aucune connexion extérieure autorisée par les pages. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { chromium, devices } from 'playwright';
import { HERE, ROOT, git } from './vm.mjs';
import { partie } from './vm.mjs';
const refs = process.argv.slice(2).length ? process.argv.slice(2) : ['8f55a91', '318ce61'];
for (const ref of refs) if (!/^[a-f0-9]{7,40}$/.test(ref)) throw Error('Référence Git attendue');
const bundles = new Map(refs.map(ref => [ref, git('show', `${ref}:proto-neon/index.html`)]));
for (const [ref, html] of bundles) {
  for (const file of git('ls-tree', '-r', '--name-only', ref, 'proto-neon/src').trim().split('\n').filter(f => f.endsWith('.js'))) {
    if (!html.includes(`/* ===== ${path.basename(file)} ===== */\n` + git('show', `${ref}:${file}`))) throw Error(`${ref} : bundle historique périmé pour ${file} ; reconstruire dans une copie isolée avant la vérification navigateur`);
  }
}
const out = path.join(HERE, 'navigateur'); fs.mkdirSync(out, { recursive: true });
const profils = {
  paysage: { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
  bureau: { viewport: { width: 1440, height: 900 } }
};
const types = { '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const [ref, ...parts] = decodeURIComponent(new URL(req.url, 'http://local').pathname).split('/').filter(Boolean);
  if (!bundles.has(ref)) { res.writeHead(404); return res.end(); }
  const rel = parts.join('/') || 'index.html';
  if (rel === 'index.html') { res.setHeader('Content-Type', 'text/html'); return res.end(bundles.get(ref)); }
  const file = path.resolve(ROOT, 'proto-neon', rel), base = path.join(ROOT, 'proto-neon') + path.sep;
  if (!file.startsWith(base) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); fs.createReadStream(file).pipe(res);
});
let browser;
const result = { dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), parties: [], profils: [] };
try {
  await new Promise((ok, ko) => { server.once('error', ko); server.listen(0, '127.0.0.1', ok); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ args: ['--mute-audio'] });
  for (const ref of refs) for (const [profil, opts] of Object.entries(profils)) {
    const cas = profil === 'paysage' ? ['bon', 'humain', 'expert', 'maladroit'].flatMap(pilote => [1, 2, 3, 4, 5].map(graine => ({ pilote, graine }))) : [{ pilote: 'bon', graine: 1 }];
    for (const { pilote, graine } of cas) {
      const ctx = await browser.newContext(opts), page = await ctx.newPage(), erreurs = [];
      page.on('pageerror', e => erreurs.push(e.message));
      await ctx.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
      await page.addInitScript(g => { window.__SEED = g; window.__DT = 1 / 60; window.requestAnimationFrame = () => 0; window.cancelAnimationFrame = () => {}; }, graine);
      await page.goto(`${origin}/${ref}/index.html?journal=1&nodraw=1`);
      const r = await page.evaluate(partie, { pilote, graine, protocole: 'batterie' });
      const name = `${ref}-${profil}-${pilote}-${graine}`;
      fs.writeFileSync(path.join(out, name + '.json.gz'), zlib.gzipSync(JSON.stringify(r)));
      result.parties.push({ ref, profil, pilote, graine, raison: r.raison, t: r.tempsJeu, morts: r.morts, err: r.err, erreurs });
      if (pilote === 'bon' && graine === 1) {
        const pixels = await page.evaluate(() => {
          const N = window.__N; N.game.dbg.scene('calme'); N.gfx.clear(0); N.game.draw(); N.fx.draw(); N.game.drawTop();
          return { etat: N.game.etat(), W: N.gfx.W, H: N.gfx.H, pixels: Array.from(N.gfx.buf()), journal: N.journal.dump(), err: window.__ERR };
        });
        const buf = Buffer.from(pixels.pixels);
        fs.writeFileSync(path.join(out, name + '.pixels.gz'), zlib.gzipSync(buf));
        result.profils.push({ ref, profil, W: pixels.W, H: pixels.H, etat: pixels.etat, sha256: crypto.createHash('sha256').update(buf).digest('hex'), nonVides: buf.filter(x => x !== 0).length, couleurs: [...new Set(buf)], journal: pixels.journal, err: pixels.err });
      }
      await ctx.close();
      fs.writeFileSync(path.join(out, 'resultats.json'), JSON.stringify(result, null, 2));
    }
  }
  result.R08 = refs.map(ref => {
    const morts = result.parties.filter(p => p.ref === ref && p.profil === 'paysage').flatMap(p => p.morts).filter(m => !['mur', 'morsure', 'traine'].includes(m.cause));
    const justes = morts.filter(m => m.visibleDepuis >= 0.6 - 1e-6).length;
    return { ref, morts: morts.length, justes, part: justes / morts.length, ok: justes / morts.length >= 0.95 };
  });
  if (result.parties.some(r => r.err.count || r.erreurs.length || r.raison !== 'fin') || result.profils.some(p => p.err.count || !p.nonVides || p.couleurs.some(c => c > 15))) process.exitCode = 1;
} catch (e) { result.erreur = String(e.stack || e); process.exitCode = 1; }
finally {
  fs.writeFileSync(path.join(out, 'resultats.json'), JSON.stringify(result, null, 2));
  if (browser) await browser.close();
  if (server.listening) await new Promise(r => server.close(r));
}
console.log(JSON.stringify({ R08: result.R08, erreur: result.erreur, sortie: out }));
