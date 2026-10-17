/* tools/jeu/interactions.mjs — les gestes réels, au toucher émulé (CDP), en portrait iPhone 13 :
   saut de l'ouverture, pouce fantôme, latence et durée d'un virage, cap gardé au relâcher, bouton son
   mémorisé, pause, rotation en pleine partie, mort, garde de l'écran de fin, relance. Captures dans tools/jeu/. */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const OUT = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push('pageerror: ' + e.message));
await page.addInitScript(() => { window.__SEED = 7; window.__DT = 1 / 60; });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/jeu/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
const cdp = await ctx.newCDPSession(page);
const R = {};
const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const tap = async (x, y) => { await touch('touchStart', x, y); await touch('touchEnd'); };
const frame = () => page.evaluate(() => window.__FRAME);
const waitF = async n => { const f0 = await frame(); await page.waitForFunction(k => window.__FRAME >= k, f0 + n); };
const g = () => page.evaluate(() => { const d = window.__N.game.dbg(); return { t: d.t, st: d.st, ang: d.P.ang, target: d.P.target, x: d.P.x, y: d.P.y, muted: d.muted, busy: d.busy, finT: d.finT, paused: window.__S.paused, phase: window.__S.phase, W: d.W, H: d.H, lives: d.P.lives }; });

/* 1. l'ouverture cède au premier toucher (après sa garde de 300 ms) */
await page.waitForTimeout(800);
let touches = 0;
while ((await g()).phase === 'intro' && touches < 5) { await tap(195, 400); touches++; await waitF(3); }
R.touchersPourJouer = touches;
/* 2. le pouce fantôme, au repos, dans le quart bas */
await waitF(50);
await page.screenshot({ path: OUT + 'i-fantome.png' });
R.fantomeT = +(await g()).t.toFixed(2);
/* 3. un virage au doigt : latence en images et durée d'un quart de tour */
const a0 = (await g()).ang;
await touch('touchStart', 200, 720);
await touch('touchMove', 250, 720);              // vers la droite : quart de tour depuis « haut »
const f0 = await frame();
let fStart = -1, fDone = -1;
for (let k = 0; k < 40; k++) {
  await waitF(1);
  const s = await g(), f = await frame();
  if (fStart < 0 && Math.abs(s.ang - a0) > 0.01) fStart = f - f0;
  if (fDone < 0 && Math.abs(Math.atan2(Math.sin(s.ang), Math.cos(s.ang))) < 0.06) { fDone = f - f0; break; }
}
R.virageImagesAvantDebut = fStart; R.quartDeTourImages = fDone; R.quartDeTourMs = Math.round(fDone * 1000 / 60);
/* 4. lever le doigt : le cap est gardé */
await touch('touchEnd');
const h0 = (await g()).ang; await waitF(30); const h1 = (await g()).ang;
R.derivDegresApres30Images = +((h1 - h0) * 180 / Math.PI).toFixed(2);
/* 5. bouton son : coupé, mémorisé, rendu visible */
await tap(372, 20); await waitF(4);
R.sonCoupe = (await g()).muted;
R.stockage = await page.evaluate(() => localStorage.getItem('snake2975.son'));
await page.screenshot({ path: OUT + 'i-son-coupe.png' });
await tap(372, 20); await waitF(4);
R.sonRemis = !(await g()).muted;
/* 6. pause en arrière-plan, puis reprise au toucher */
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
await waitF(3);
const tp0 = (await g()).t; await waitF(30); const tp1 = (await g()).t;
R.pause = { paused: (await g()).paused, horlogeFigee: tp0 === tp1 };
await page.screenshot({ path: OUT + 'i-pause.png' });
await page.evaluate(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
await waitF(5); R.pause.resteEnPauseSansToucher = (await g()).paused;
await tap(100, 700); await waitF(3); R.pause.repriseAuToucher = !(await g()).paused;
/* 7. rotation en pleine partie : le monde tourne, rien ne sort, pause jusqu'au toucher */
await waitF(200);
const avant = await g();
await page.setViewportSize({ width: 844, height: 390 });
await waitF(4);
const apres = await g();
const horsChamp = await page.evaluate(() => { const d = window.__N.game.dbg(); let n = 0; for (const e of d.E) if (e.x < -40 || e.x > d.W + 40 || e.y < -40 || e.y > d.H + 40) n++; for (const c of d.CELLS) if (c.x < 0 || c.x > d.W || c.y < 0 || c.y > d.H) n++; return { n, tete: d.P.x >= d.AL && d.P.x <= d.AR && d.P.y >= d.AT && d.P.y <= d.AB }; });
R.rotation = { avant: avant.W + 'x' + avant.H, apres: apres.W + 'x' + apres.H, pause: apres.paused, horsChamp: horsChamp.n, teteDansArene: horsChamp.tete, viesGardees: avant.lives === apres.lives };
await page.screenshot({ path: OUT + 'i-rotation.png' });
await tap(600, 300); await waitF(60);
R.rotation.reprise = !(await g()).paused && (await g()).t > apres.t;
await page.screenshot({ path: OUT + 'i-paysage-apres-rotation.png' });
await page.setViewportSize({ width: 390, height: 844 }); await waitF(4); await tap(195, 700); await waitF(30);
/* 8. mort avec le doigt posé : le doigt ne relance pas ; l'écran de fin vient vite ; la relance prend un toucher */
await touch('touchStart', 120, 760);
await page.evaluate(() => { const d = window.__N.game.dbg(); d.P.lives = 1; d.P.invul = 0; });
await page.waitForFunction(() => { const d = window.__N.game.dbg(); if (d.st !== 'jeu') return true; d.P.invul = 0; const e = d.E.find(x => x.k === 'fleche' && !x.dead); if (e) { e.x = d.P.x; e.y = d.P.y; } return false; }, null, { timeout: 60000, polling: 16 });
const fMort = await frame();
await page.waitForFunction(() => { const d = window.__N.game.dbg(); return d.st === 'fin' && !d.busy; }, null, { timeout: 20000, polling: 16 });
R.mortVersEcranDeFinImages = (await frame()) - fMort; R.mortVersEcranDeFinMs = Math.round(R.mortVersEcranDeFinImages * 1000 / 60);
await waitF(40);
R.doigtPoseNeRelancePas = (await g()).st === 'fin';
await touch('touchEnd'); await waitF(5);
R.leverNeRelancePas = (await g()).st === 'fin';
await page.screenshot({ path: OUT + 'i-fin.png' });
const fTap = await frame();
await tap(195, 600);
await page.waitForFunction(() => window.__N.game.dbg().st === 'jeu', null, { timeout: 5000, polling: 8 });
R.relanceImages = (await frame()) - fTap;
await waitF(20);
R.apresRelance = await g();
R.erreurs = await page.evaluate(() => window.__ERR); R.console = errs.slice(0, 5);
console.log(JSON.stringify(R, null, 1));
await browser.close();
