import { chromium, devices } from 'playwright';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const phase = process.argv[2] || 'apres';
const out = path.join(here, phase);
await fs.mkdir(out, { recursive: true });
const server = http.createServer(async (req, res) => {
  const name = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
  if (!name.startsWith(root + '/') && name !== root) { res.writeHead(403).end(); return; }
  try {
    const data = await fs.readFile(name === root ? path.join(root, 'index.html') : name);
    res.setHeader('Content-Type', name.endsWith('.mp4') ? 'video/mp4' : name.endsWith('.mp3') ? 'audio/mpeg' : name.endsWith('.json') ? 'application/json' : 'text/html');
    res.end(data);
  } catch { res.writeHead(404).end(); }
});
try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
} catch (error) {
  await fs.writeFile(path.join(out, 'blocage.json'), JSON.stringify({ phase, etape: 'serveur HTTP', erreur: String(error), code: error.code }, null, 2));
  console.error(error); process.exit(1);
}
let browser;
try { browser = await chromium.launch({ headless: true, args: ['--mute-audio'] }); }
catch (error) {
  await fs.writeFile(path.join(out, 'blocage.json'), JSON.stringify({ phase, etape: 'Chromium', erreur: String(error) }, null, 2));
  server.close(); console.error(error); process.exit(1);
}
const results = { phase, publication: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), profils: [] };
try {
  for (const [nom, viewport, mobile] of [
    ['paysage', { width: 844, height: 390 }, true],
    ['portrait', { width: 390, height: 844 }, true],
    ['bureau', { width: 1440, height: 900 }, false]
  ]) {
    const context = await browser.newContext({ ...(mobile ? devices['iPhone 13'] : {}), viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.__SEED = 2975;
      window.__DT = 1 / 60;
      let callback, now = 0;
      window.requestAnimationFrame = cb => { callback = cb; return 1; };
      window.__stepFrame = () => { now += 1000 / 60; callback(now); };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/?journal=1&tube=coupe`);
    await page.waitForFunction(() => !!window.__N?.art?.ready());
    await page.evaluate(() => {
      const N = window.__N;
      window.__prepare = () => {
        N.game.reset(2975); N.game.dbg.etat('jeu'); window.__S.phase = 'play';
        N.joueuse.force({ x: N.outils.VUE.x + N.gfx.W / 2, y: N.outils.VUE.y + N.gfx.H / 2, ang: 0, len: 8, trace: true });
        N.hud.reset(); N.journal.actif(true); N.journal.vider(); N.gfx.masque(true);
      };
      window.__render = () => {
        N.gfx.origin(0, 0); N.gfx.clear(0); N.game.draw(); N.fx.draw(); N.game.drawTop(); N.gfx.present();
      };
      window.__pixels = () => {
        const b = N.gfx.buf(), mask = N.gfx.mask(), cyan = [N.pal.i('cyan'), N.pal.i('cyanPale')];
        let n = 0, horsCorps = 0, horsAutorise = 0, assigned = 0;
        for (let i = 0; i < b.length; i++) {
          if (mask[i]) assigned++;
          if (!cyan.includes(b[i])) continue;
          n++; if (mask[i] !== 1 && mask[i] !== 2) horsCorps++;
          if (!(mask[i] >= 1 && mask[i] <= 4)) horsAutorise++;
        }
        return { w: N.gfx.W, h: N.gfx.H, px: N.gfx.PX, cyan: n, horsCorps, horsAutorise, masqueAttribue: assigned,
          couleurs: [...new Set(b)].sort((a, b) => a - b), sang: b.reduce((n, c) => n + (c === N.pal.i('sang')), 0),
          etat: N.game.etat(), vies: N.score.vies, mult: N.score.mult(), erreurs: window.__ERR.count, safe: N.outils.geo.safe,
          bannieres: N.journal.dump().filter(r => r.type === 'hudBanniere') };
      };
    });
    const profil = { nom, captures: {}, console: errors };
    for (const element of ['vague', 'defi', 'carte', 'cyclope', 'multiplicateur', 'derniere-vie']) {
      const measure = await page.evaluate(element => {
        const N = window.__N; window.__prepare();
        if (element === 'vague') N.hud.banniere(['VAGUE 3', 'LE RETOURNEMENT'], { c: 'jaune' });
        if (element === 'defi') N.hud.banniere(['DÉFI RÉUSSI', 'DIX KILLS EN CHAÎNE', '+5000  TIR SURCHARGÉ  +1 ♥'], { c: 'jaune', icone: '✓' });
        if (element === 'carte') N.hud.banniere(['CARTE', 'CANON II'], { c: 'jaune' });
        if (element === 'cyclope') N.hud.banniere("LE CYCLOPE S'EMBALLE", { c: 'magenta', clignote: true });
        if (element === 'multiplicateur') {
          for (let i = 0; i < N.R.score.mult.pas; i++) {
            const e = N.ennemis.spawn('fleche', N.joueuse.tete.x + 60, N.joueuse.tete.y + 40);
            N.ennemis.hit(e, 1e6, { genre: 'joueuse', type: 'canon' });
          }
        }
        if (element === 'derniere-vie') {
          for (let i = 0; i < N.R.vies.depart - 1; i++) {
            N.joueuse.tuer('mur', { genre: 'decor', type: 'mur' }); N.joueuse.reapparaitre();
          }
          N.game.dbg.etat('jeu'); N.hud.reset(); N.fx.reset();
        }
        N.hud.update(1 / 60); window.__render();
        return window.__pixels();
      }, element);
      await page.screenshot({ path: path.join(out, `${nom}-${element}.png`) });
      profil.captures[element] = measure;
    }
    if (phase !== 'avant') {
      profil.protection = await page.evaluate(() => {
        const N = window.__N; window.__prepare();
        // Place the head deliberately in the HUD to exercise the protection, not just normal camera placement.
        N.joueuse.force({ x: N.outils.VUE.x + 40, y: N.outils.VUE.y + 10, ang: 0, len: 8, trace: true });
        N.gfx.clear(0); N.outils.origineMonde(); N.joueuse.drawTop(); N.gfx.origin(0, 0);
        const before = new Uint8Array(N.gfx.buf()), points = [N.joueuse.tete, N.joueuse.segPos(1), N.joueuse.segPos(2)];
        N.hud.banniere('LE CYCLOPE', { c: 'magenta' }); N.hud.draw();
        let diff = 0, examines = 0;
        for (const [k, p] of points.entries()) for (let y = Math.round(p.y - N.outils.VUE.y) - (k ? 6 : 9); y <= Math.round(p.y - N.outils.VUE.y) + (k ? 6 : 9); y++)
          for (let x = Math.round(p.x - N.outils.VUE.x) - (k ? 6 : 9); x <= Math.round(p.x - N.outils.VUE.x) + (k ? 6 : 9); x++) {
            if (x < 0 || y < 0 || x >= N.gfx.W || y >= N.gfx.H) continue;
            const i = y * N.gfx.W + x; examines++; if (before[i] !== N.gfx.buf()[i]) diff++;
          }
        return { diff, examines };
      });
      profil.alarme = await page.evaluate(() => {
        const N = window.__N; window.__prepare();
        for (let i = 0; i < N.R.vies.depart - 1; i++) { N.joueuse.tuer('mur', { genre: 'decor', type: 'mur' }); N.joueuse.reapparaitre(); }
        N.game.dbg.etat('jeu'); N.hud.reset(); N.fx.reset();
        const sang = [];
        for (let i = 0; i < 120; i++) {
          N.hud.update(1 / 60); N.gfx.clear(0); N.gfx.origin(0, 0); N.hud.draw();
          sang.push(window.__pixels().sang);
        }
        return { sang, erreurs: window.__ERR.count };
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      profil.reduit = await page.evaluate(() => {
        const N = window.__N, sums = [];
        for (let i = 0; i < 60; i++) {
          N.hud.update(1 / 60); N.gfx.clear(0); N.hud.draw();
          sums.push(window.__pixels().sang);
        }
        return { minSang: Math.min(...sums), maxSang: Math.max(...sums) };
      });
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      // A genuine pilot run: no god mode, no automatic card choice added by this verifier.
      await page.evaluate(() => { window.__prepare(); window.__N.pilote.niveau('bon'); window.__N.pilote.activer(true); });
      for (let chunk = 0; chunk < 12; chunk++) await page.evaluate(() => { for (let f = 0; f < 600; f++) window.__stepFrame(); });
      profil.pilote = await page.evaluate(() => ({ ...window.__pixels(), tJeu: window.__N.outils.T.t, frames: window.__FRAME,
        bannieres: window.__N.journal.dump().filter(r => r.type === 'hudBanniere'), journal: window.__N.journal.dump() }));
      await page.screenshot({ path: path.join(out, `${nom}-pilote-120s.png`) });
    }
    results.profils.push(profil);
    await context.close();
    console.log(`${phase} ${nom}: ${Object.keys(profil.captures).length} captures, erreurs ${errors.length}`);
  }
} finally {
  await browser.close(); server.close();
  await fs.writeFile(path.join(out, 'mesures.json'), JSON.stringify(results, null, 2));
}
