/* tools/C/fumee.mjs — test de fumée du lot C : zéro erreur (__ERR.count = 0, console vide) sur iPhone 13 paysage,
   portrait et bureau, sur index.html ET sur la page d'essai ; la piste démarre, change de section, se coupe à la
   mort, et le jeu survit sans fichier de piste (repli).
   Usage : node proto-neon/tools/C/fumee.mjs [port=8123]
   Prérequis : `python3 -m http.server <port> --bind 127.0.0.1` lancé depuis la racine de la copie, et les deux
   pages construites (`node proto-neon/build.mjs` et `node proto-neon/build.mjs proto-neon/tools/C/index.html`).
   Chromium sans interface, son coupé (--mute-audio) : rien ne sort sur les haut-parleurs. */
import { chromium, devices } from 'playwright';

const port = process.argv[2] || '8123';
const PROFILS = {
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
  bureau: { viewport: { width: 1440, height: 900 } }
};
const PAGES = { jeu: '/proto-neon/index.html', essai: '/proto-neon/tools/C/index.html' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let echecs = 0;
const dit = (ok, msg) => { if (!ok) echecs++; console.log((ok ? '  ok  ' : '  ECHEC ') + msg); };

for (const [pn, prof] of Object.entries(PROFILS)) {
  for (const [qn, url] of Object.entries(PAGES)) {
    const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'] });
    const ctx = await b.newContext(prof);
    const p = await ctx.newPage();
    const errs = [];
    p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    await p.goto('http://127.0.0.1:' + port + url, { waitUntil: 'load' });
    await p.waitForFunction(() => window.__N && window.__N.music && window.__ERR !== undefined, null, { timeout: 8000 }).catch(() => {});
    await sleep(1200);
    const e0 = await p.evaluate(() => window.__ERR ? window.__ERR.count : -1);
    dit(e0 === 0, pn + ' / ' + qn + ' : __ERR.count = ' + e0 + ' au chargement');
    /* le premier geste : démarre le contexte audio et la partition */
    await p.evaluate(() => { const m = window.__N.music; m.init(); m.start(); });
    await sleep(500);
    const st = await p.evaluate(() => ({ ctx: window.__N.music.info() && window.__N.music.info().state, piste: window.__N.music.piste() }));
    dit(st.ctx === 'running', pn + ' / ' + qn + ' : contexte audio ' + st.ctx);
    if (qn === 'essai' && pn === 'bureau') {                         // le scénario complet, une fois
      const suite = [['jeu', 3000], ['repit', 2500], ['alerte', 2500], ['boss', 2500], ['victoire', 2000], ['titre', 1500]];
      for (const [s, ms] of suite) {
        await p.evaluate(s => window.__N.music.section(s), s);
        await sleep(ms);
        const r = await p.evaluate(() => window.__N.music.piste());
        console.log('     section ' + s.padEnd(9) + JSON.stringify(r));
      }
      await p.evaluate(() => { const m = window.__N.music; m.section('jeu'); });
      await sleep(2500);
      await p.evaluate(() => window.__N.music.cue('mort'));
      await sleep(300);
      const apresMort = await p.evaluate(() => ({ rms: window.__N.music.rms(), piste: window.__N.music.piste() }));
      dit(apresMort.rms < 0.01, pn + ' / ' + qn + ' : musique coupée à la mort (rms ' + apresMort.rms.toFixed(4) + ')');
      await p.evaluate(() => window.__N.music.section('jeu'));
      await sleep(3500);
      console.log('     après la mort : ' + JSON.stringify(await p.evaluate(() => window.__N.music.piste())));
      const tousLesSons = await p.evaluate(() => {
        const noms = window.__N.ids.sons.concat(window.__N.ids.sonsAnciens, ['inconnu', 'zzz']);
        let erreurs = 0;
        for (const n of noms) { try { window.__N.music.sfx(n, { pan: 0.4, pitch: 3, type: 'laser' }); } catch (e) { erreurs++; } }
        return { noms: noms.length, erreurs };
      });
      dit(tousLesSons.erreurs === 0, pn + ' / ' + qn + ' : ' + tousLesSons.noms + ' sons demandés (dont inconnus), ' + tousLesSons.erreurs + ' erreur');
      await sleep(800);
    } else await sleep(2500);
    const e1 = await p.evaluate(() => window.__ERR ? window.__ERR.count : -1);
    dit(e1 === 0 && errs.length === 0, pn + ' / ' + qn + ' : __ERR.count = ' + e1 + ', console ' + (errs.length ? JSON.stringify(errs.slice(0, 3)) : 'vide'));
    await b.close();
  }
}
console.log(echecs ? '\n' + echecs + ' ECHEC(S)' : '\ntout est vert');
process.exit(echecs ? 1 : 0);
