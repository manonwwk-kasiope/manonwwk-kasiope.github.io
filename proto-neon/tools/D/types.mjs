/* tools/D/types.mjs — lot D : fait naître chaque type (élites, modificateurs compris) à côté de la joueuse invulnérable, joue 25 s,
   puis une INVERSION de 5 s ; rend les compteurs, les erreurs. Usage : node tools/D/types.mjs [--url URL] [--capt fichier.png] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 11; window.__DT = 1 / 60; });
await page.goto(arg('--url', 'http://127.0.0.1:8131/proto-neon/index.html'));
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => window.__N.intro.skip());
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
const r = await page.evaluate(() => {
  const N = window.__N, g = N.game; g.dbg.god(true); g.dbg.vague(3); N.dir.update = () => {};            // plus de directeur : seuls nos ennemis
  const P = N.joueuse.tete, mk = (t, dx, dy, o) => N.ennemis.spawn(t, P.x + dx, P.y + dy, Object.assign({ portail: 0.3 }, o || {}));
  const L = [['fleche', 90, 0], ['dard', -90, 20], ['larve', 0, 80], ['larve', 10, 80], ['mine', 60, 60, { st: 'pose' }], ['tourelle', -120, 0], ['lame', 0, -90], ['ruche', 100, 60], ['sentinelle', -100, 60],
    ['traqueur', 130, -50, { portail: 1 }], ['fleche', 80, 50, { elite: true, mods: { blinde: true } }], ['ruche', -110, -60, { elite: true, mods: { instable: true } }], ['fleche', -60, 60, { mods: { rapide: true } }], ['rival', 90, -60, { elite: true }]];
  for (const l of L) mk(l[0], l[1], l[2], l[3]);
  const out = { types: {}, inversion: null };
  for (let s = 0; s < 25; s++) { g.dbg.input({ x: Math.cos(s * 0.5), y: Math.sin(s * 0.5), mag: 1 }); g.dbg.simuler(1); }
  out.apres25 = N.ennemis.counts(); out.tirs = N.ennemis.tirs.length;
  const avant = N.ennemis.list.length; N.ennemis.inverser(5);
  const kills0 = N.score.stats ? N.score.stats.kills : 0;
  for (let s = 0; s < 5; s++) { const q = N.ennemis.list.filter(e => e._st === 'proie').sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0]; if (q) { const a = Math.atan2(q.y - P.y, q.x - P.x); g.dbg.input({ x: Math.cos(a), y: Math.sin(a), mag: 1 }); } g.dbg.simuler(1); }
  out.inversion = { avant, apres: N.ennemis.list.length, proies: N.ennemis.list.filter(e => e._st === 'proie').length, kills: (N.score.stats ? N.score.stats.kills : 0) - kills0, restant: N.ennemis.inversion() };
  return out;
});
console.log(JSON.stringify(r));
if (arg('--capt')) await page.screenshot({ path: arg('--capt') });
const err = await page.evaluate(() => ({ count: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs).slice(0, 6) }));
console.log('ERR', JSON.stringify(err), 'console', logs.length); for (const l of logs.slice(0, 8)) console.log('  ' + l);
await browser.close();
process.exit(err.count === 0 && logs.length === 0 ? 0 : 1);
