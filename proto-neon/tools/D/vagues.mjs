/* tools/D/vagues.mjs — lot D : joue chaque vague (dbg.vague(n)) en mode simulé avec un pilote simple, rend par vague :
   apparitions, hors champ, pic d'ennemis, morts de la joueuse (sans dieu), erreurs ; capture facultative d'une scène.
   Usage : node tools/D/vagues.mjs [--url URL] [--profil paysage|portrait|bureau] [--vagues 1,2,3,4,5] [--dieu 0|1] [--cap n:t:fichier]
   (--cap 2:22:/tmp/x.png : capture à t s dans la vague n) */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8131/proto-neon/index.html');
const PROFIL = arg('--profil', 'paysage');
const VAGUES = arg('--vagues', '1,2,3,4,5').split(',').map(Number);
const DIEU = arg('--dieu', '1') === '1';
const CAPS = process.argv.map((a, i) => a === '--cap' ? process.argv[i + 1] : null).filter(Boolean).map(s => { const [n, t, f] = s.split(':'); return { n: +n, t: +t, f }; });
const P = { bureau: { viewport: { width: 1440, height: 900 } }, paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } }, portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } }[PROFIL];
const browser = await chromium.launch();
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; });
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => window.__N.intro.skip());
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
const out = [];
for (const n of VAGUES) {
  await page.evaluate(({ n, dieu }) => { const g = window.__N.game; g.dbg.god(dieu); g.dbg.vague(n); }, { n, dieu: DIEU });
  const res = { n, t: 0, maxAlive: 0, morts: 0, kills: 0, spawns0: 0, types: {}, arene: [], etat: '' };
  const cap = CAPS.find(c => c.n === n);
  let capDone = false;
  for (let s = 0; s < 75; s++) {
    const r = await page.evaluate(() => {
      const N = window.__N, g = N.game;
      const P = N.joueuse.tete, m = N.joueuse.distMur(P.x, P.y);
      let cib = null, dm = 1e9;
      for (const q of N.ennemis.list) { if (q.etat === 'portail') continue; const d = Math.hypot(q.x - P.x, q.y - P.y); if (d < dm) { dm = d; cib = q; } }
      for (const q of N.butin.list) { const d = Math.hypot(q.x - P.x, q.y - P.y) + 30; if (d < dm) { dm = d; cib = q; } }
      const a = cib ? Math.atan2(cib.y - P.y, cib.x - P.x) : P.ang + 0.4;
      g.dbg.input(m.d < 36 ? { x: m.nx, y: m.ny, mag: 1 } : { x: Math.cos(a), y: Math.sin(a), mag: 1 });
      return g.etat();
    });
    await page.evaluate(() => window.__N.game.dbg.simuler(1));
    const info = await page.evaluate(() => {
      const N = window.__N, d = N.game.dbg(), c = N.ennemis.counts();
      const w = N.world.voyage ? N.world.voyage() : {};
      return { etat: N.game.etat(), t: N.dir.tempsVague(), alive: c.regular, c, st: d.stats, morts: d.stats.morts.length, kills: d.kills, vague: N.dir.vague(), trav: w.actif, arene: N.arene && N.arene.actif ? N.arene.actif() : false, voies: N.arene && N.arene.voies ? N.arene.voies().length : 0, wx: [Math.round(N.world.x0), Math.round(N.world.x1)] };
    });
    res.t = info.t; res.maxAlive = Math.max(res.maxAlive, info.alive); res.morts = info.morts; res.kills = info.kills; res.etat = info.etat;
    res.sp = info.st.spawns.length; res.inView = info.st.inView; res.minDist = info.st.minDistSpawn; res.types = info.c;
    if (info.trav) res.arene.push('T' + s + ':' + info.wx.join('-'));
    if (info.voies) res.arene.push('V' + s);
    if (cap && !capDone && info.t >= cap.t) { await page.waitForTimeout(400); await page.screenshot({ path: cap.f }); capDone = true; }
    if (info.etat !== 'jeu' && info.etat !== 'plongee') break;
    if (info.vague !== n) break;
  }
  res.arene = res.arene.slice(0, 6).concat(res.arene.length > 6 ? ['…' + res.arene.length] : []);
  out.push(res);
}
const err = await page.evaluate(() => ({ count: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs).slice(0, 6) }));
for (const r of out) console.log(JSON.stringify(r));
console.log('ERR', JSON.stringify(err), 'console', logs.length);
for (const l of logs.slice(0, 8)) console.log('  ' + l);
await browser.close();
process.exit(err.count === 0 && logs.length === 0 ? 0 : 1);
