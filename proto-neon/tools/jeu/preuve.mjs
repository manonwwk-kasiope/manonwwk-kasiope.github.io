/* tools/jeu/preuve.mjs — une partie complète au pilote automatique, déterministe (__SEED, __DT = 1/60).
   Usage : node tools/jeu/preuve.mjs profil pilote graine [prefixe-captures]
     profil : paysage | portrait | bureau ; pilote : expert | simple | inerte
   Rend un JSON : ennemis vivants et tension par tranches de 20 s, kills, apparitions dans le champ,
   explosion du colosse (part de brasier, secousse), score, issue ; et des captures aux instants clés. */
import fs from 'node:fs';
import { chromium, devices } from 'playwright';
const [profil = 'paysage', mode = 'expert', graine = '7', pre = ''] = process.argv.slice(2);
const PROF = {
  bureau: { viewport: { width: 1440, height: 900 } },
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
}[profil];
const CHECK = pre ? [
  { t: 3.5, name: 'debut' }, { t: 38, name: 'minute1' }, { t: 72, name: 'minute2' },
  { ev: 'bosstele', name: 'telegraphe' }, { ev: 'boss', name: 'colosse' }, { ev: 'bossmort', f: 3, name: 'explosion' },
  { t: 116, name: 'chaos' },
] : [];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext(PROF);
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.addInitScript(({ seed, mode, check }) => { window.__SEED = seed; window.__DT = 1 / 60; window.__MODE = mode; window.__CHECK = check; }, { seed: +graine, mode, check: CHECK });
await page.addInitScript({ path: new URL('./pilote.js', import.meta.url).pathname });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/jeu/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__S && window.__N.intro);
await page.evaluate(() => window.__N.intro.skip());
const t0 = Date.now(), shots = [];
for (;;) {
  const s = await page.evaluate(() => ({ held: window.__HOLD ? window.__LOG.held : null, st: window.__N.game.dbg().st, finT: window.__N.game.dbg().finT, busy: window.__N.game.dbg().busy, t: window.__N.game.dbg().t }));
  if (s.held) {
    if (pre) { const f = `${pre}-${s.held}.png`; await page.screenshot({ path: f }); shots.push(f); }
    await page.evaluate(() => { window.__HOLD = false; });
    continue;
  }
  if (s.st === 'fin' && !s.busy && s.finT > 0.7) break;
  if (Date.now() - t0 > 900000) { console.error('délai dépassé', s); break; }
  await page.waitForTimeout(40);
}
if (pre) { const f = `${pre}-fin.png`; await page.screenshot({ path: f }); shots.push(f); }
const r = await page.evaluate(() => {
  const d = window.__N.game.dbg(), s = d.stats;
  const slices = s.slices.map((x, i) => ({ tranche: (i * 20) + '-' + (i * 20 + 20) + ' s', vivants: x.n ? +(x.alive / x.n).toFixed(2) : null, tension: x.n ? +(x.tension / x.n).toFixed(3) : null, kills: x.kills }));
  const sp = s.spawns, horsChamp = sp.filter(z => !z.inView).length, tele = sp.filter(z => z.inView && z.tele >= 0.6).length;
  return { W: d.W, H: d.H, px: window.__N.gfx.PX, issue: s.victoire ? 'victoire' : 'defaite', tFin: +s.endT.toFixed(2), mortT: s.deathT, score: d.score, kills: s.kills, killsBy: s.killsBy,
    touches: s.hits, degats: s.hitLog, defi: d.defi.etat, defiT: s.defiT, meilleureChaine: d.defi.meilleur, premierEnnemi: s.firstEnemyT, virage: s.turnT,
    colosse: { annonce: s.bossAnnonceT, arrivee: s.bossT, mort: s.bossDeathT }, slices, apparitions: sp.length, horsChamp, dansLeChampTelegraphiees: tele,
    dansLeChampSansTelegraphe: s.inView, distMinTete: s.minDistSpawn, distMinTeteTelegraphe: s.minDistTele, maxVivants: s.maxAlive, longueur: d.P.len,
    explosion: window.__LOG.boom, cyan: window.__LOG.cyan ? { horsSerpentMoyen: +(window.__LOG.cyan.sum1 / window.__LOG.cyan.n * 100).toFixed(3) + ' %', horsSerpentMax: +(window.__LOG.cyan.max1 * 100).toFixed(3) + ' %', horsSerpentEtTirsMoyen: +(window.__LOG.cyan.sum2 / window.__LOG.cyan.n * 100).toFixed(3) + ' %', horsSerpentEtTirsMax: +(window.__LOG.cyan.max2 * 100).toFixed(3) + ' %', mesures: window.__LOG.cyan.n } : null, err: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs) };
});
r.reel = ((Date.now() - t0) / 1000).toFixed(1) + ' s'; r.consoleErr = errs.slice(0, 5); r.captures = shots;
console.log(JSON.stringify(r, null, 1));
await browser.close();
