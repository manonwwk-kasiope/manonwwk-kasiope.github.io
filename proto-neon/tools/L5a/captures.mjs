/* tools/L5a/captures.mjs — captures de la page d'essai : V1 (formations), V2 (mise en place, annonce, voyage du
   TRAVELLING, PASTILLE). La page d'essai branche N.arene.draw après N.game.draw (79-jeu ne l'appelle pas
   encore : demande n° 5 au gardien). Sortie : tools/L5a/captures/*.png (non livrées). */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
/* le tampon d'index, rendu dans la palette à l'échelle k (sans le tube), éventuellement recadré [x, y, w, h] */
async function tampon(page, fichier, k, rect) {
  const url = await page.evaluate(([k, rect]) => {
    const g = __N.gfx, b = g.buf(), W = g.W, H = g.H, r = rect || [0, 0, W, H];
    const c = document.createElement('canvas'); c.width = r[2] * k; c.height = r[3] * k;
    const x = c.getContext('2d'), im = x.createImageData(c.width, c.height), C = __N.pal.C;
    const rgb = C.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    for (let yy = 0; yy < c.height; yy++) for (let xx = 0; xx < c.width; xx++) {
      const sx = r[0] + ((xx / k) | 0), sy = r[1] + ((yy / k) | 0), ci = sx < W && sy < H ? b[sy * W + sx] : 0, o = (yy * c.width + xx) * 4;
      im.data[o] = rgb[ci][0]; im.data[o + 1] = rgb[ci][1]; im.data[o + 2] = rgb[ci][2]; im.data[o + 3] = 255;
    }
    x.putImageData(im, 0, 0); return c.toDataURL('image/png');
  }, [k, rect || null]);
  fs.writeFileSync(fichier, Buffer.from(url.split(',')[1], 'base64'));
}
const PAGE = process.argv[2] || 'http://127.0.0.1:8127/proto-neon/tools/L5a/index.html';
const DIR = new globalThis.URL('./captures/', import.meta.url).pathname;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const PROF = { paysage: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: UA },
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: UA } };
for (const f of fs.readdirSync(DIR)) if (f.endsWith('.png')) fs.unlinkSync(DIR + f);
const b = await chromium.launch();
for (const [pn, pr] of Object.entries(PROF)) {
  const page = await b.newPage(pr);
  const errs = []; page.on('pageerror', e => errs.push(String(e))); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto(PAGE); await page.waitForTimeout(500);
  await page.evaluate(() => {
    const N = __N, d = N.game.draw;
    N.game.draw = function () { d.apply(this, arguments); if (N.arene && N.arene.draw) N.arene.draw(); };
    /* place la tête à d px devant le mur arrière, cap vers l'avant, et laisse la caméra s'installer */
    window.__devantMur = (d) => {
      const s = N.arene._sens(); if (!s) return false;
      const X = s > 0 ? N.world.x0 : N.world.x1, P = __S.player;
      N.joueuse.reset({ x: X + s * d, y: P.y, ang: s > 0 ? -0.35 : Math.PI + 0.35 }); N.cam.reset();
      __S.input.x = s; __S.input.y = -0.3; __S.input.mag = 0.8; N.game.dbg.simuler(0.7); __S.input.mag = 0;
      return true;
    };
    window.__aller = (vague, sec, graine) => {
      localStorage.clear(); N.game.reset(graine || 4);
      if (vague > 1) N.game.dbg.vague(vague); else N.game.dbg.etat('jeu');
      N.game.dbg.god(true); N.pilote.niveau('bon'); N.pilote.activer(true);
      N.game.dbg.simuler(sec); N.pilote.activer(false); __S.input.mag = 0;
      __DT = 0.0000001;                                          // l'image ne bouge plus : on capture ce que le pas a laissé
    };
  });
  const prises = [['v1-formations', 1, 11.2, 0], ['v2-meute', 2, 3.4, 0], ['v2-miseEnPlace', 2, 8.4, 0], ['v2-annonce', 2, 11.2, 70],
    ['v2-voyage', 2, 26, 60], ['v2-voyage-corps', 2, 26, 14], ['v2-pastille', 2, 21.5, 0]];
  for (const [nom, v, sec, mur] of prises) {
    await page.evaluate(([v, sec, mur]) => { window.__DT = undefined; __aller(v, sec); if (mur) { __DT = undefined; __devantMur(mur); __DT = 0.0000001; } }, [v, sec, mur]);
    await page.waitForTimeout(250);
    await tampon(page, DIR + pn + '-' + nom + '.png', 2);
    const zone = await page.evaluate(() => { const w = __N.world, c = __N.cam, s = __N.arene._sens(), X = s > 0 ? w.x0 : s < 0 ? w.x1 : -1e9;
      return X > c.x - 10 && X < c.x + c.w + 10 ? [Math.max(0, Math.min(__N.gfx.W - 60, Math.round(X - c.x) - 30)), 0, 60, __N.gfx.H] : null; });
    if (zone) await tampon(page, DIR + pn + '-' + nom + '-mur.png', 4, zone);
  }
  console.log(pn, 'erreurs', errs.length, errs.slice(0, 3));
  await page.close();
}
await b.close();
