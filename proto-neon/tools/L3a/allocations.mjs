/* tools/L3a/allocations.mjs — « aucune allocation par image » (critère Plafonds du lot 3a), mesuré par
   l'échantillonneur de tas de Chromium (CDP HeapProfiler) : 20 s de jeu pas à pas, avec le dessin de la
   joueuse, du butin et de l'arsenal à chaque image, et le robot du banc qui tourne, accélère, ramasse et boucle.
   On attribue chaque octet alloué à son module par la ligne de son cadre d'appel dans le bundle. Les
   événements (une charge par 'lasso', 'coupe', 'ramassage'…) allouent par événement, pas par image : ils
   sont comptés à part. */
import fs from 'node:fs';
import path from 'node:path';
import { navigateur, ouvrir, fermer, ICI, PROTO } from './banc.mjs';

const HARNAIS = fs.readFileSync(path.join(ICI, 'harnais.js'), 'utf8');
const html = fs.readFileSync(path.join(PROTO, 'tools', 'L3a', 'index.html'), 'utf8').split('\n');
const debut = {}; html.forEach((l, i) => { const m = l.match(/^\/\* ===== (\d\d-[a-z]+)\.js ===== \*\/$/); if (m) debut[m[1]] = i; });
const ordre = Object.entries(debut).sort((a, b) => a[1] - b[1]);
function module(ligne) { let m = '?'; for (const [n, l] of ordre) if (ligne >= l) m = n; return m; }

const nav = await navigateur();
const { page } = await ouvrir(nav, 'paysage');
await page.addScriptTag({ content: HARNAIS });
const cdp = await page.context().newCDPSession(page);
await page.evaluate(() => {
  const L = L3; L.bac({ len: 24, x: 400, y: 256, arsenal: true, ennemisVivants: true });
  __N.cartes.choisir('traversee');
  for (let i = 0; i < 3; i++) __N.arsenal.monter('canon');
  window.__ROB = function (i) {
    const P = __S.player, N = __N, w = N.world;
    if (window.__LARGUER && i % 600 === 0) for (let k = 0; k < 6; k++) N.butin.lacher(P.x + Math.cos(k) * 60, P.y + Math.sin(k) * 40, 1);
    if (P.x < w.x0 + 50 || P.x > w.x1 - 50 || P.y < w.y0 + 50 || P.y > w.y1 - 50) L.manche(Math.atan2(256 - P.y, 512 - P.x), 1);
    else L.manche(P.ang + ((i >> 7) & 1 ? 0.6 : -0.2), 0.9);
    __S.input.boost = ((i >> 8) & 3) === 0;
  };
  window.__LARGUER = true; L.pas(2400, window.__ROB); window.__LARGUER = false;   // chauffe : caches, réserves, compilation
});
await cdp.send('HeapProfiler.enable');
await cdp.send('HeapProfiler.collectGarbage');
await cdp.send('HeapProfiler.startSampling', { samplingInterval: 256 });
const n = await page.evaluate(() => {
  const L = L3, N = __N, g = N.gfx; let images = 0;
  for (let i = 0; i < 4800; i++) {
    L.pas(1, window.__ROB);
    if (i & 1) {                                                 // une image toutes les deux étapes (60 Hz)
      images++;
      g.origin(N.cam.x, N.cam.y);
      N.butin.draw(); N.arsenal.draw(); N.joueuse.draw(); N.joueuse.drawTop();
      g.origin(0, 0);
      __S.player.segs; N.joueuse.hitTest(0, 0, 2); N.joueuse.traine();
    }
  }
  return images;
});
const { profile } = await cdp.send('HeapProfiler.stopSampling');
const parModule = {}, parFonction = {};
(function marcher(nd) {
  const cf = nd.callFrame, m = module(cf.lineNumber), o = nd.selfSize || 0;
  if (o) { parModule[m] = (parModule[m] || 0) + o; const k = m + ' ' + (cf.functionName || '(anonyme)') + ':' + (cf.lineNumber - (debut[m] || 0)); parFonction[k] = (parFonction[k] || 0) + o; }
  for (const c of nd.children || []) marcher(c);
})(profile.head);
const MIENS = ['70-joueuse', '71-butin', '74-arsenal'];
const tot = MIENS.reduce((s, m) => s + (parModule[m] || 0), 0);
console.log('images', n, '— octets échantillonnés par module :', parModule);
console.log('lot 3a :', tot, 'octets en', n, 'images, soit', (tot / n).toFixed(1), 'octets par image');
const top = Object.entries(parFonction).filter(([k]) => MIENS.some(m => k.startsWith(m))).sort((a, b) => b[1] - a[1]).slice(0, 12);
console.log(top);
/* le tas stable sur 60 s : mesuré après ramasse-miettes, avant et après 60 s de jeu dessiné */
const tas = async () => { await cdp.send('HeapProfiler.collectGarbage'); return (await cdp.send('Runtime.getHeapUsage')).usedSize; };
const t0 = await tas();
await page.evaluate(() => {
  const L = L3, N = __N, g = N.gfx;
  for (let i = 0; i < 7200; i++) { L.pas(1, window.__ROB); if (i & 1) { g.origin(N.cam.x, N.cam.y); N.butin.draw(); N.arsenal.draw(); N.joueuse.draw(); N.joueuse.drawTop(); g.origin(0, 0); } }
});
const t1 = await tas();
console.log('tas après ramasse-miettes :', t0, '→', t1, 'octets sur 60 s de jeu (', t1 - t0, ')');
fs.writeFileSync(path.join(ICI, 'sortie', 'allocations.json'), JSON.stringify({ images: n, parModule, lot3a: tot, parImage: tot / n, top, tas60s: [t0, t1] }, null, 1));
await nav.close(); fermer();
