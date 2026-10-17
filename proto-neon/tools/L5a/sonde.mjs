// Sonde rapide : charge la page d'essai, lance une partie simulée, imprime un résumé du journal.
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const URL = process.argv[2] || 'http://127.0.0.1:8127/proto-neon/tools/L5a/index.html';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
await p.goto(URL + '?seed=3'); await p.waitForTimeout(800);
const r = await p.evaluate(() => {
  const N = __N, S = __S;
  N.game.reset(3); N.game.dbg.etat('jeu'); N.game.dbg.god(true); N.pilote.niveau('bon'); N.pilote.activer(true);
  const J = N.game.dbg.simuler(80);
  const out = [];
  for (const x of J) if (['vague', 'arene', 'inversion', 'mort'].includes(x.type) || (x.type === 'ramassage' && x.d.type === 'pastille')) out.push([x.t.toFixed(2), x.type, JSON.stringify(x.d)]);
  const nApp = J.filter(x => x.type === 'apparition').length, nPor = J.filter(x => x.type === 'portail').length;
  return { out, nApp, nPor, etat: N.game.etat(), err: __ERR.count };
});
console.log(JSON.stringify(r, null, 1)); console.log('erreurs', errs.slice(0, 5));
await b.close();
