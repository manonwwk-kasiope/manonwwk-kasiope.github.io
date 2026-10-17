/* tools/musique2/flux.mjs — enregistre le flux REEL des appels a N.music : l'ouverture entiere, puis une
   partie complete au pilote automatique de tools/jeu/pilote.js (lu, jamais modifie), boucle accelere
   et pas de temps impose (__DT = 1/60), donc deterministe a graine fixe.
   Chaque appel est journalise avec son image (__FRAME) : t = image / 60 est le temps reel qu'il aurait
   eu en jeu, c'est la ligne de temps que mesure.mjs rejoue hors ligne dans le meme moteur.
   Usage : node tools/musique2/flux.mjs [profil=paysage] [graine=7]  ->  tools/musique2/flux.json */
import fs from 'node:fs';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const [profil = 'paysage', graine = '7'] = process.argv.slice(2);
const PROF = {
  bureau: { viewport: { width: 1440, height: 900 } },
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
}[profil];
const HERE = new URL('.', import.meta.url).pathname;

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext(PROF);
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));

await page.addInitScript(({ seed }) => {
  window.__SEED = seed; window.__DT = 1 / 60; window.__MODE = 'expert';
  /* le piege : N.music est affecte UNE fois par 30-music.js ; on enveloppe chaque fonction publique */
  const N = window.__N = window.__N || {};
  const LOG = window.__MLOG = { calls: {}, sfx: [], tension: [] };
  let real = null;
  Object.defineProperty(N, 'music', {
    configurable: true, enumerable: true,
    get() { return real; },
    set(m) {
      real = {};
      for (const k of Object.keys(m)) {
        const f = m[k];
        if (typeof f !== 'function') { real[k] = f; continue; }
        real[k] = function () {
          LOG.calls[k] = (LOG.calls[k] || 0) + 1;
          const fr = window.__FRAME | 0;
          if (k === 'sfx') LOG.sfx.push({ f: fr, name: arguments[0], opts: arguments[1] ? JSON.parse(JSON.stringify(arguments[1])) : null,
            phase: window.__S ? window.__S.phase : '?' });
          if (k === 'tension' && (fr % 15) === 0) LOG.tension.push({ f: fr, v: +(+arguments[0]).toFixed(4) });
          return f.apply(this, arguments);
        };
      }
    }
  });
}, { seed: +graine });
await page.addInitScript({ path: new URL('../jeu/pilote.js', import.meta.url).pathname });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/musique2/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__S && window.__N.intro && window.__N.music);

/* l'ouverture entiere jusqu'a l'invite, puis le toucher qui lance la partie */
const t0 = Date.now();
let introFin = null;
for (;;) {
  const s = await page.evaluate(() => ({ e: window.__N.intro.state().etape, f: window.__FRAME }));
  if (s.e === 'invite') { if (introFin === null) introFin = s.f; if (s.f - introFin > 60) break; }
  if (Date.now() - t0 > 120000) { console.error('ouverture bloquee', s); break; }
  await page.waitForTimeout(30);
}
await page.evaluate(() => window.__N.intro.skip());
const gameF0 = await page.evaluate(() => window.__FRAME);
for (;;) {
  const s = await page.evaluate(() => { const d = window.__N.game.dbg(); return { held: window.__HOLD, st: d.st, finT: d.finT, busy: d.busy, t: d.t }; });
  if (s.held) { await page.evaluate(() => { window.__HOLD = false; }); continue; }
  if (s.st === 'fin' && !s.busy && s.finT > 2.5) break;
  if (Date.now() - t0 > 900000) { console.error('delai depasse', s); break; }
  await page.waitForTimeout(40);
}
const r = await page.evaluate(() => {
  const d = window.__N.game.dbg(), st = d.stats;
  return { log: window.__MLOG, frame: window.__FRAME, err: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs),
    issue: st.victoire ? 'victoire' : 'defaite', tFin: st.endT, kills: st.kills, boss: { annonce: st.bossAnnonceT, arrivee: st.bossT, mort: st.bossDeathT },
    muted: d.muted };
});
r.gameF0 = gameF0; r.introFin = introFin; r.consoleErr = errs.slice(0, 5); r.reel = ((Date.now() - t0) / 1000).toFixed(1) + ' s';
r.profil = profil; r.graine = +graine;
fs.writeFileSync(HERE + 'flux.json', JSON.stringify(r));

/* resume lisible */
const by = {};
for (const e of r.log.sfx) {
  const k = e.name + (e.phase === 'intro' ? ' (ouverture/interlude)' : '');
  by[k] = (by[k] || 0) + 1;
}
const jeu = r.log.sfx.filter(e => e.f >= gameF0);
const dur = (r.frame - gameF0) / 60;
const rate = {};
for (const e of jeu) rate[e.name] = (rate[e.name] || 0) + 1;
console.log('profil ' + profil + ', graine ' + graine + ' — ' + r.reel + ' reels, ' + r.frame + ' images ; issue ' + r.issue + ' a ' + (+r.tFin).toFixed(1) + ' s de jeu, ' + r.kills + ' kills');
console.log('fonctions de N.music appelees (nombre d appels) : ' + JSON.stringify(r.log.calls));
console.log('sons par nom et par phase : ' + JSON.stringify(by));
console.log('cadence en jeu (appels par seconde sur ' + dur.toFixed(1) + ' s) : ' + Object.entries(rate).map(([k, v]) => k + ' ' + (v / dur).toFixed(2)).join(', '));
console.log('options vues : ' + JSON.stringify([...new Set(r.log.sfx.map(e => e.name + ':' + JSON.stringify(e.opts)))].slice(0, 40)));
console.log('erreurs : __ERR ' + r.err + ' ' + JSON.stringify(r.sigs) + ' ; console ' + JSON.stringify(r.consoleErr));
await browser.close();
