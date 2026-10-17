/* tools/L5a/cout.mjs — le coût par image de N.dir.update + N.arene.update (deux pas) + N.arene.draw, en V2
   (TRAVELLING en marche, plafond), iPhone 13 paysage, mode dessiné, __DT = 1/60. Budget du § 7.11 pour
   « butin, directeur, arène, colosse » : 0,3 ms au p95. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const PAGE = process.argv[2] || 'http://127.0.0.1:8127/proto-neon/tools/L5a/index.html';
const b = await chromium.launch({ args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
await p.goto(PAGE); await p.waitForTimeout(500);
await p.evaluate(() => {
  const N = __N; localStorage.clear(); N.game.reset(4); N.game.dbg.vague(2); N.game.dbg.god(true); N.pilote.niveau('bon'); N.pilote.activer(true);
  window.__DT = 1 / 60;
  const C = window.__COUT = { acc: 0, images: [], f: -1 };
  const w = (o, k) => { const f = o[k]; o[k] = function () { const t0 = performance.now(); const r = f.apply(this, arguments); C.acc += performance.now() - t0; return r; }; };
  w(N.dir, 'update'); w(N.arene, 'update'); w(N.arene, 'draw');
  const d = N.game.draw; N.game.draw = function () { d.apply(this, arguments); N.arene.draw(); if (__FRAME !== C.f) { C.images.push(C.acc); C.acc = 0; C.f = __FRAME; } };
});
await p.waitForFunction(() => __N.horloge.t() > 34, null, { timeout: 120000 });
const r = await p.evaluate(() => { const a = __COUT.images.slice(30).sort((x, y) => x - y), q = k => a[Math.min(a.length - 1, Math.floor(k * a.length))];
  return { images: a.length, p50: +q(0.5).toFixed(3), p95: +q(0.95).toFixed(3), max: +a[a.length - 1].toFixed(3), err: __ERR.count, mobile: __S.monde.mobile }; });
console.log(JSON.stringify(r));
await b.close();
