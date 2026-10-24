/* tools/musique2/partie.mjs — une partie ENTIERE avec le son reel : l'ouverture complete (ses sons), puis
   le jeu au pilote automatique de tools/jeu/pilote.js (lu, jamais modifie) jusqu'a l'ecran de fin.
     mode 'reel'   : la boucle d'images native, donc le temps reel ; N.music.rms() est releve toutes les
                     100 ms et moyenne par tranches de 20 s de jeu (critere 6 en conditions reelles) ;
     mode 'rapide' : la boucle acceleree du pilote ; le son, lui, reste en temps reel, donc les appels se
                     bousculent : c'est l'epreuve de charge des gardes (fusion, plafond, usure).
   Le son est lance au chargement (N.music.init + start, permis par --autoplay-policy) pour que
   l'ouverture joue ses propres sons ; le toucher qui suit ne fait plus que sauter l'invite.
   Usage : node tools/musique2/partie.mjs [paysage|portrait|bureau] [reel|rapide] [graine=7] */
import { chromium, devices } from 'playwright';

const [profil = 'paysage', mode = 'reel', graine = '7'] = process.argv.slice(2);
const PROF = {
  bureau: { viewport: { width: 1440, height: 900 } },
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
}[profil];
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext(PROF);
const page = await ctx.newPage();
const errs = [], res404 = [];
page.on('console', m => { if (m.type() === 'error') { if (/404|Failed to load resource/.test(m.text())) res404.push(m.text()); else errs.push(m.text()); } });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.addInitScript(({ seed }) => { window.__SEED = seed; window.__DT = 1 / 60; window.__MODE = 'expert'; window.__RAF0 = window.requestAnimationFrame; }, { seed: +graine });
await page.addInitScript({ path: new URL('../jeu/pilote.js', import.meta.url).pathname });
if (mode === 'reel') await page.addInitScript(() => { window.requestAnimationFrame = window.__RAF0; });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/musique2/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__S && window.__N.intro && window.__N.music);
await page.evaluate(() => { window.__N.music.init(); window.__N.music.start(); });
const t0 = Date.now();

/* releve en direct : rms() de la musique, rmsOut() de la sortie, toutes les 100 ms */
await page.evaluate(() => {
  window.__REL = [];
  setInterval(() => {
    const d = window.__N.game.dbg ? window.__N.game.dbg() : null, M = window.__N.music;
    window.__REL.push({ ph: window.__S.phase, st: d ? d.st : null, t: d ? d.t : 0, busy: d ? d.busy : false, rms: M.rms(), out: M.rmsOut(), ten: window.__S.tension });
  }, 100);
});
/* l'ouverture jusqu'a l'invite, puis le toucher */
let invite = null;
for (;;) {
  const s = await page.evaluate(() => ({ e: window.__N.intro.state().etape, f: window.__FRAME }));
  if (s.e === 'invite') { if (invite === null) invite = Date.now(); if (Date.now() - invite > 800) break; }
  if (Date.now() - t0 > 60000) { console.error('ouverture bloquee', s); break; }
  await page.waitForTimeout(50);
}
const introJ = await page.evaluate(() => JSON.parse(JSON.stringify(window.__N.music.journal())));
await page.evaluate(() => window.__N.intro.skip());
for (;;) {
  const s = await page.evaluate(() => { const d = window.__N.game.dbg(); return { held: window.__HOLD, st: d.st, finT: d.finT, busy: d.busy }; });
  if (s.held) { await page.evaluate(() => { window.__HOLD = false; }); continue; }
  if (s.st === 'fin' && !s.busy && s.finT > 3) break;
  if (Date.now() - t0 > 600000) { console.error('delai depasse', s); break; }
  await page.waitForTimeout(100);
}
const r = await page.evaluate(() => {
  const d = window.__N.game.dbg(), st = d.stats, rel = window.__REL;
  /* tranches de 20 s de JEU, hors interludes et hors ecran de fin */
  const tr = [];
  for (const x of rel) {
    if (x.st !== 'jeu' || x.busy || x.ph === 'intro') continue;
    const k = Math.floor(x.t / 20); if (k > 5) continue;
    (tr[k] = tr[k] || { n: 0, s: 0, ten: 0 }); tr[k].n++; tr[k].s += x.rms * x.rms; tr[k].ten += x.ten;
  }
  const slices = tr.map((x, k) => x ? { tranche: k * 20 + '-' + (k * 20 + 20) + ' s', releves: x.n, tension: +(x.ten / x.n).toFixed(3), rmsDB: +(20 * Math.log10(Math.sqrt(x.s / x.n) + 1e-12)).toFixed(2) } : null);
  return { issue: st.victoire ? 'victoire' : 'defaite', tFin: +(+st.endT).toFixed(1), kills: st.kills, defi: d.defi.etat,
    journal: window.__N.music.journal(), info: window.__N.music.info(), slices, err: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs) };
});
r.profil = profil; r.mode = mode; r.graine = +graine; r.reel = ((Date.now() - t0) / 1000).toFixed(1) + ' s';
r.journalOuverture = introJ; r.consoleErr = errs.slice(0, 5); r.ressources404 = res404.length;
const full = r.slices.filter(Boolean).filter(x => x.releves >= 50);
let mono = true; for (let i = 1; i < full.length; i++) if (full[i].rmsDB <= full[i - 1].rmsDB) mono = false;
r.monotone = mono;
console.log(JSON.stringify(r, null, 1));
await browser.close();
process.exit(r.err === 0 && errs.length === 0 ? 0 : 1);
