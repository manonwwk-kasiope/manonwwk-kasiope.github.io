/* codex-06 : effets de commandes dans le vrai frame(), événements DOM clavier/souris/tactile.
   Manette standard injectée dans navigator.getGamepads ; aucun effet du jeu n'est simulé.
   --bundle /tmp/candidat.html --phase avant|apres --outdir /tmp/preuves ; --profils bureau,paysage */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const arg = (n, d) => { const i = process.argv.indexOf(n); return i < 0 ? d : process.argv[i + 1]; };
const phase = arg('--phase', 'apres'), selected = arg('--profils', 'bureau,paysage').split(',');
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
const receipt = { phase, dateParis: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }), bundleSha256: hash(bundle), protocoleSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))), navigateur: browser.version(), cas: [], erreurs: [] };
const save = () => fs.writeFileSync(path.join(OUT, 'sortie.json'), JSON.stringify(receipt, null, 2));
async function test(nom, fn) {
  const filtre = arg('--cas', ''); if (filtre && !new RegExp(filtre).test(nom)) return;
  let r; try { r = await fn(); } catch (e) { r = { conforme: false, exception: String(e) }; }
  receipt.cas.push({ nom, ...r }); save(); console.log(JSON.stringify({ nom, conforme: r.conforme, exception: r.exception }));
}
async function context(profil) {
  const ctx = await browser.newContext(profil === 'bureau' ? { viewport: { width: 1440, height: 900 } } : { ...devices['iPhone 13 landscape'], viewport: { width: 844, height: 390 } });
  const page = await ctx.newPage();
  page.on('pageerror', e => receipt.erreurs.push(e.message)); page.on('console', m => { if (m.type() === 'error') receipt.erreurs.push(m.text()); });
  const instant = new Date('2026-10-18T00:00:00Z');
  await page.clock.install({ time: instant }); await page.clock.pauseAt(instant);
  await page.addInitScript(() => {
    window.__SEED = 2975; window.__DT = 1 / 60;
    let id = 0, now = 0; const callbacks = new Map();
    window.requestAnimationFrame = f => { callbacks.set(++id, f); return id; }; window.cancelAnimationFrame = i => callbacks.delete(i);
    window.__tick = n => { for (let k = 0; k < (n || 1); k++) { now += 1000 / 60; const work = [...callbacks.values()]; callbacks.clear(); for (const f of work) f(now); } };
    window.__pads = []; window.__padLectures = 0;
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => { window.__padLectures++; return window.__pads; } });
    window.__pad = (buttons = [], axes = [0, 0]) => { window.__pads = [{ connected: true, mapping: 'standard', axes, buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })) }]; };
    window.__touchTemps = [];
    window.__touch = (type, points, changed) => {
      window.__touchTemps.push({ type, t: performance.now(), changed });
      const el = document.getElementById('app'), touch = p => new Touch({ identifier: p[0], target: el, clientX: p[1], clientY: p[2], pageX: p[1], pageY: p[2], screenX: p[1], screenY: p[2] });
      el.dispatchEvent(new TouchEvent(type, { bubbles: true, cancelable: true, touches: points.map(touch), targetTouches: points.map(touch), changedTouches: changed.map(touch) }));
    };
  });
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?journal=1`, { waitUntil: 'load' });
  await page.evaluate(() => {
    const N = window.__N, S = window.__S;
    window.__setup = () => { N.intro.skip(); N.intro.stop(); N.game.reset(2975); N.game.dbg.vague(1); N.game.dbg.god(true); if (S.reglages) S.reglages.actions = 'doigts'; N.joueuse.force({ x: 512, y: 256, ang: 0, trace: true }); window.__pads = []; S.input.x = 0; S.input.y = 0; S.input.mag = 0; S.input.boost = false; S.input.fire = false; S.input.pouvoir = false; S.input.apogee = false; S.jour = 20261017; N.journal.vider(); window.__tick(2); };
    window.__etat = () => ({ boost: N.joueuse.boost, reserve: N.joueuse.reserve(), pouvoir: { ...N.joueuse.pouvoir }, apogee: N.joueuse.apogee, etat: N.game.etat(), cible: S.player.angVise, ang: S.player.ang, input: { x: S.input.x, y: S.input.y, mag: S.input.mag, fire: S.input.fire, boost: S.input.boost, pouvoir: S.input.pouvoir, apogee: S.input.apogee, stick: { ...S.input.stick }, pointer: { ...S.input.pointer }, manette: { ...S.input.manette } }, journal: N.journal.dump().filter(e => ['boost', 'pouvoir', 'apogee'].includes(e.type)), err: window.__ERR.count });
    window.__setup();
  });
  return { ctx, page };
}
try {
  if (selected.includes('bureau')) {
    const { ctx, page } = await context('bureau');
    const tick = n => page.evaluate(n => window.__tick(n), n);
    const state = () => page.evaluate(() => window.__etat());
    const setup = () => page.evaluate(() => window.__setup());
    for (const key of ['Space', 'ShiftLeft', 'ShiftRight']) await test('clavier-boost-' + key, async () => {
      await setup(); const avant = await state(); await page.keyboard.down(key); await tick(12); const tenu = await state(); await page.keyboard.up(key); await tick(2); const fin = await state();
      return { avant, tenu, fin, conforme: tenu.boost && tenu.reserve < avant.reserve && !tenu.input.fire && !fin.boost && tenu.journal.some(e => e.type === 'boost' && e.d.evt === 'on') };
    });
    await test('clavier-E-pouvoir', async () => {
      await setup(); await page.evaluate(() => window.__N.joueuse.equiper('repli')); await page.keyboard.down('KeyE'); await tick(4); const tenu = await state(); await page.keyboard.up('KeyE');
      return { tenu, conforme: tenu.pouvoir.id === 'repli' && tenu.pouvoir.etat === 'actif' && !tenu.input.pouvoir && tenu.journal.filter(e => e.type === 'pouvoir' && e.d.evt === 'debut').length === 1 };
    });
    await test('clavier-R-apogee', async () => {
      await setup(); await page.evaluate(() => window.__N.joueuse.apogeeAjouter(100)); await page.keyboard.down('KeyR'); await tick(4); const tenu = await state(); await page.keyboard.up('KeyR');
      return { tenu, conforme: tenu.apogee === 0 && !tenu.input.apogee && tenu.journal.filter(e => e.type === 'apogee' && e.d.evt === 'debut').length === 1 };
    });
    for (const key of ['KeyP', 'Escape']) await test('clavier-pause-' + key, async () => {
      await setup(); await page.keyboard.press(key); await tick(2); const pause = await state(); await tick(20); const stable = await state(); await page.keyboard.press(key); await tick(2); const reprise = await state();
      return { pause, stable, reprise, conforme: pause.etat === 'pause' && stable.etat === 'pause' && reprise.etat === 'jeu' };
    });
    for (const [key, attendu] of [['ArrowRight', 0], ['KeyD', 0], ['ArrowDown', Math.PI / 2], ['KeyS', Math.PI / 2], ['ArrowLeft', Math.PI], ['KeyA', Math.PI], ['KeyQ', Math.PI], ['ArrowUp', -Math.PI / 2], ['KeyW', -Math.PI / 2], ['KeyZ', -Math.PI / 2]]) await test('direction-' + key, async () => {
      await setup(); await page.keyboard.down(key); await tick(2); const r = await state(); await page.keyboard.up(key); await tick(1);
      return { attendu, cible: r.cible, input: r.input, conforme: Math.abs(Math.atan2(Math.sin(r.cible - attendu), Math.cos(r.cible - attendu))) < 0.01 };
    });
    async function pointeur(dx, dy) {
      const pt = await page.evaluate(({ dx, dy }) => { const N = window.__N, r = document.getElementById('out').getBoundingClientRect(); return { x: r.left + (window.__S.player.x - N.cam.x) * N.gfx.PX + dx, y: r.top + (window.__S.player.y - N.cam.y) * N.gfx.PX + dy }; }, { dx, dy });
      await page.mouse.move(pt.x, pt.y); return pt;
    }
    await test('souris-direction-et-zone-morte', async () => {
      await setup(); await pointeur(0, 100); await tick(2); const loin = await state(); await pointeur(12, 0); await tick(1); const proche = await state();
      return { loin, proche, conforme: loin.input.y > 0.9 && Math.abs(loin.cible - Math.atan2(loin.input.y, loin.input.x)) < 0.03 && proche.input.mag === 0 };
    });
    await test('souris-boost-gauche', async () => {
      await setup(); await pointeur(140, 0); const avant = await state(); await page.mouse.down({ button: 'left' }); await tick(12); const tenu = await state(); await page.mouse.up({ button: 'left' }); await tick(2); const fin = await state();
      return { avant, tenu, fin, conforme: tenu.boost && tenu.reserve < avant.reserve && !fin.boost };
    });
    await test('souris-pouvoir-droit', async () => {
      await setup(); await pointeur(140, 0); await page.evaluate(() => window.__N.joueuse.equiper('repli')); await page.mouse.down({ button: 'right' }); await tick(4); const r = await state(); await page.mouse.up({ button: 'right' });
      return { r, conforme: r.pouvoir.etat === 'actif' && r.journal.filter(e => e.type === 'pouvoir' && e.d.evt === 'debut').length === 1 };
    });
    await test('souris-apogee-molette', async () => {
      await setup(); await pointeur(140, 0); await page.evaluate(() => window.__N.joueuse.apogeeAjouter(100)); await page.mouse.wheel(0, 120); await tick(2); const r = await state();
      return { r, conforme: r.apogee === 0 && r.journal.filter(e => e.type === 'apogee' && e.d.evt === 'debut').length === 1 };
    });
    await test('souris-curseur-1500ms', async () => {
      await pointeur(100, 0); await page.clock.fastForward(1490); await tick(1); const avant = await page.locator('#out').evaluate(e => e.style.cursor);
      await page.clock.fastForward(11); await tick(1); const cache = await page.locator('#out').evaluate(e => e.style.cursor); await pointeur(110, 0); await tick(1); const retour = await page.locator('#out').evaluate(e => e.style.cursor);
      return { avant, cache, retour, conforme: avant !== 'none' && cache === 'none' && retour !== 'none' };
    });
    await test('manette-direction-et-poll-unique', async () => {
      await setup(); const debut = await page.evaluate(() => window.__padLectures); await page.evaluate(() => window.__pad([], [0, -0.6])); await tick(10); const r = await state(); const lectures = await page.evaluate(() => window.__padLectures);
      return { r, lectures: lectures - debut, images: 10, conforme: lectures - debut === 10 && r.input.manette.connectee && Math.abs(r.cible + Math.PI / 2) < 0.01 };
    });
    await test('manette-A-boost', async () => {
      await setup(); const avant = await state(); await page.evaluate(() => window.__pad([0])); await tick(12); const tenu = await state(); await page.evaluate(() => window.__pad([])); await tick(2); const fin = await state();
      return { avant, tenu, fin, conforme: tenu.boost && tenu.reserve < avant.reserve && !fin.boost };
    });
    await test('manette-X-pouvoir', async () => {
      await setup(); await page.evaluate(() => { window.__N.joueuse.equiper('repli'); window.__pad([2]); }); await tick(10); const r = await state();
      return { r, conforme: r.pouvoir.etat === 'actif' && r.journal.filter(e => e.type === 'pouvoir' && e.d.evt === 'debut').length === 1 && !r.input.pouvoir };
    });
    await test('manette-Y-apogee', async () => {
      await setup(); await page.evaluate(() => { window.__N.joueuse.apogeeAjouter(100); window.__pad([3]); }); await tick(10); const r = await state();
      return { r, conforme: r.apogee === 0 && r.journal.filter(e => e.type === 'apogee' && e.d.evt === 'debut').length === 1 && !r.input.apogee };
    });
    await test('manette-Start-pause', async () => {
      await setup(); await page.evaluate(() => window.__pad([9])); await tick(12); const pause = await state(); await page.evaluate(() => window.__pad([])); await tick(1); await page.evaluate(() => window.__pad([9])); await tick(1); const reprise = await state();
      return { pause, reprise, conforme: pause.etat === 'pause' && reprise.etat === 'jeu' };
    });
    await page.screenshot({ path: path.join(OUT, 'bureau.png'), scale: 'css' });
    receipt.erreurs.push(...await page.evaluate(() => window.__ERR.count ? [JSON.stringify(window.__ERR)] : [])); await ctx.close();
  }
  if (selected.includes('paysage')) {
    const { ctx, page } = await context('paysage');
    const sansConflits = process.argv.includes('--sans-conflits');
    await test(sansConflits ? 'iphone-gestes-seuls' : 'iphone-manche-second-doigt', async () => {
      await page.evaluate(() => { window.__setup(); window.__touch('touchstart', [[1,220,230]], [[1,220,230]]); window.__touch('touchmove', [[1,242,230]], [[1,242,230]]); window.__tick(2); });
      const manche = await page.evaluate(() => window.__etat());
      await page.clock.fastForward(160); await page.evaluate(() => window.__touch('touchstart', [[1,242,230],[2,650,230]], [[2,650,230]]));
      await page.clock.fastForward(181); await page.evaluate(() => window.__tick(12)); const tenu = await page.evaluate(() => window.__etat());
      // Une manette tenue, une souris et une touche de direction ne doivent pas voler le manche.
      if (!sansConflits) { await page.evaluate(() => window.__pad([0,2,3], [0,-1])); await page.mouse.move(50,50); await page.keyboard.down('ArrowLeft'); await page.keyboard.press('KeyE'); await page.keyboard.press('KeyR'); }
      await page.evaluate(() => window.__tick(2)); const priorite = await page.evaluate(() => window.__etat()); if (!sansConflits) await page.keyboard.up('ArrowLeft');
      await page.evaluate(() => window.__touch('touchend', [[1,242,230]], [[2,650,230]])); await page.evaluate(() => { window.__pads = []; window.__tick(2); }); const finBoost = await page.evaluate(() => window.__etat());
      await page.evaluate(() => { window.__N.joueuse.equiper('repli'); window.__touch('touchstart', [[1,242,230],[3,650,230]], [[3,650,230]]); });
      await page.clock.fastForward(50); await page.evaluate(() => { window.__touch('touchend', [[1,242,230]], [[3,650,230]]); window.__tick(2); }); const toucher = await page.evaluate(() => window.__etat());
      await page.evaluate(() => { window.__N.joueuse.apogeeAjouter(100); window.__touch('touchstart', [[1,242,230],[4,650,230]], [[4,650,230]]); });
      await page.clock.fastForward(40); await page.evaluate(() => { window.__touch('touchmove', [[1,242,230],[4,685,230]], [[4,685,230]]); window.__tick(2); }); const glisse = await page.evaluate(() => window.__etat());
      await page.evaluate(() => window.__touch('touchend', [], [[1,242,230],[4,685,230]]));
      const horodatages = await page.evaluate(() => window.__touchTemps);
      return { horodatages, manche, tenu, priorite, finBoost, toucher, glisse, conforme: manche.input.stick.active && manche.input.x === 1 && manche.input.y === 0 && tenu.boost && !finBoost.boost && priorite.input.x === 1 && priorite.input.y === 0 && priorite.input.mag === manche.input.mag && !priorite.journal.some(e => e.type === 'pouvoir' && e.d.evt === 'debut') && toucher.pouvoir.etat === 'actif' && glisse.apogee === 0 && glisse.journal.some(e => e.type === 'apogee' && e.d.evt === 'debut') };
    });
    await page.screenshot({ path: path.join(OUT, 'iphone.png'), scale: 'css' }); receipt.erreurs.push(...await page.evaluate(() => window.__ERR.count ? [JSON.stringify(window.__ERR)] : [])); await ctx.close();
  }
  receipt.conforme = receipt.cas.length > 0 && receipt.cas.every(r => r.conforme) && !receipt.erreurs.length;
  if (!receipt.conforme) process.exitCode = 1;
} finally { save(); await browser.close(); await new Promise(r => server.close(r)); }
