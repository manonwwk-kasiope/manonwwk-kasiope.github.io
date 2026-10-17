/* tools/D/boss.mjs — lot D : lance LE CYCLOPE (dbg.boss), joueuse invulnérable, inflige des dégâts à l'œil et aux mains, journal par seconde :
   phase, PV, état du jeu, tirs, lasers, mur ; capture à la seconde --cap-t. Usage : node tools/D/boss.mjs [--url URL] [--cap fichier.png] [--cap-t 12] [--degats 120] [--profil paysage|portrait|bureau] */
import { chromium, devices } from 'playwright';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const PROFIL = arg('--profil', 'paysage'), DEG = +arg('--degats', '120'), CAPT = +arg('--cap-t', '12');
const P = { bureau: { viewport: { width: 1440, height: 900 } }, paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } }, portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } } }[PROFIL];
const browser = await chromium.launch();
const ctx = await browser.newContext(P);
const page = await ctx.newPage();
const logs = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 5; window.__DT = 1 / 60; });
await page.goto(arg('--url', 'http://127.0.0.1:8131/proto-neon/index.html'));
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
await page.evaluate(() => window.__N.intro.skip());
await page.waitForFunction(() => window.__N.game.etat() !== 'demarrage', null, { timeout: 20000 });
await page.evaluate(() => { const g = window.__N.game; g.dbg.god(true); g.dbg.boss(); window.__PH = []; });
let capDone = false, last = '';
for (let s = 0; s < 170; s++) {
  const r = await page.evaluate((deg) => {
    const N = window.__N, g = N.game, C = N.colosse;
    const P = N.joueuse.tete, m = N.joueuse.distMur(P.x, P.y);
    const eye = C && C.oeil && C.oeil();
    if (eye && (Math.abs(P.x - eye.x) > 220 || Math.abs(P.y - eye.y) > 120)) N.joueuse.force({ x: eye.x - 100, y: eye.y + 30, ang: 0, len: 14 });
    let a = P.ang + 0.35;
    if (eye) { const d = Math.hypot(eye.x - P.x, eye.y - P.y), t = Math.atan2(eye.y - P.y, eye.x - P.x); a = d > 130 ? t : t + Math.PI / 2; }
    g.dbg.input(m.d < 40 ? { x: m.nx, y: m.ny, mag: 1 } : { x: Math.cos(a), y: Math.sin(a), mag: 1 });
    let n = 0;
    for (const e of N.ennemis.list) if (e.boss && !e._dead) { N.ennemis.hit(e, e.partie === 'main' ? 40 : deg / 6, { genre: 'arme', type: 'canon', id: -1 }); n++; }
    g.dbg.simuler(1);
    return { etat: g.etat(), actif: C && C.actif && C.actif(), phase: C && C.phase && C.phase(), pv: C && C.pv && +C.pv().toFixed(3), mort: C && C.mort && C.mort(), eye: eye && [Math.round(eye.x), Math.round(eye.y)], tirs: N.ennemis.tirs.length, lasers: N.ennemis.lasers.length, boss: N.ennemis.list.filter(e => e.boss).length, mur: [Math.round(N.world.x0), Math.round(N.world.y0), Math.round(N.world.x1), Math.round(N.world.y1)] };
  }, DEG);
  const k = JSON.stringify([r.etat, r.phase, r.actif, r.boss]);
  if (s % 5 === 0 || k !== last) console.log(s, JSON.stringify(r));
  last = k;
  if (!capDone && s === CAPT && arg('--cap')) { console.log('CAM', JSON.stringify(await page.evaluate(() => { const N = window.__N; return { cam: [N.cam.x, N.cam.y, N.cam.w, N.cam.h], mur: N.world.rect(), P: [Math.round(N.joueuse.tete.x), Math.round(N.joueuse.tete.y)], eye: N.colosse.oeil(), mode: 'boss' }; }))); const f0 = await page.evaluate(() => window.__FRAME); await page.waitForTimeout(3000); console.log('FRAMES', f0, JSON.stringify(await page.evaluate(() => [window.__FRAME, window.__N.game.etat(), window.__S.paused, window.__N.cam.x, window.__N.cam.y]))); await page.screenshot({ path: arg('--cap') }); capDone = true; }
  if (r.etat === 'victoire' || r.etat === 'fin') { console.log('FIN à', s, 's'); break; }
}
const err = await page.evaluate(() => ({ count: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs).slice(0, 6) }));
console.log('ERR', JSON.stringify(err), 'console', logs.length); for (const l of logs.slice(0, 8)) console.log('  ' + l);
await browser.close();
process.exit(err.count === 0 && logs.length === 0 ? 0 : 1);
