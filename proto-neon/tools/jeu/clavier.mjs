/* tools/jeu/clavier.mjs — bureau 1440 x 900 sans écran tactile : l'ouverture cède à Espace, l'indice clavier
   remplace le pouce fantôme, les flèches dirigent, M coupe le son, Espace relance depuis l'écran de fin. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const OUT = new URL('.', import.meta.url).pathname;
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/404/.test(m.text())) errs.push(m.text()); });
await page.addInitScript(() => { window.__SEED = 5; window.__DT = 1 / 60; });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/jeu/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__S);
const g = () => page.evaluate(() => { const d = window.__N.game.dbg(); return { t: +d.t.toFixed(2), st: d.st, ang: +d.P.ang.toFixed(3), muted: d.muted, phase: window.__S.phase, px: window.__N.gfx.PX, W: d.W, H: d.H }; });
const R = {};
await page.waitForTimeout(700);
let n = 0; while ((await g()).phase === 'intro' && n < 5) { await page.keyboard.press('Space'); n++; await page.waitForTimeout(150); }
R.touchesPourJouer = n;
await page.waitForTimeout(900);
await page.screenshot({ path: OUT + 'k-indice-clavier.png' });
const a0 = (await g()).ang;
await page.keyboard.down('ArrowDown'); await page.waitForTimeout(400); await page.keyboard.up('ArrowDown');
R.flecheBas = { avant: a0, apres: (await g()).ang };
await page.keyboard.press('KeyM'); await page.waitForTimeout(120);
R.toucheM = (await g()).muted;
await page.keyboard.press('KeyM'); await page.waitForTimeout(120);
R.toucheMencore = (await g()).muted;
/* clic de souris sur le bouton son : coin haut droit de la zone sûre */
const sb = await page.evaluate(() => { const d = window.__N.game.dbg(), p = window.__N.gfx.PX, r = window.__N.gfx.canvas().getBoundingClientRect(); return { x: r.left + (d.SB.x + d.SB.w / 2) * p, y: r.top + (d.SB.y + d.SB.h / 2) * p }; });
await page.mouse.click(sb.x, sb.y); await page.waitForTimeout(120);
R.clicSouris = (await g()).muted;
await page.mouse.click(sb.x, sb.y); await page.waitForTimeout(120);
await page.screenshot({ path: OUT + 'k-jeu.png' });
await page.evaluate(() => { const d = window.__N.game.dbg(); d.P.lives = 1; d.P.invul = 0; });
await page.waitForFunction(() => { const d = window.__N.game.dbg(); if (d.st !== 'jeu') return true; d.P.invul = 0; const e = d.E.find(x => !x.dead && x.k !== 'colosse'); if (e) { e.x = d.P.x; e.y = d.P.y; } return false; }, null, { timeout: 60000, polling: 16 });
await page.waitForFunction(() => window.__N.game.dbg().st === 'fin' && window.__N.game.dbg().finT > 0.6, null, { timeout: 20000 });
await page.screenshot({ path: OUT + 'k-fin.png' });
await page.keyboard.press('Space'); await page.waitForTimeout(150);
R.espaceRelance = (await g()).st;
R.err = await page.evaluate(() => window.__ERR.count); R.console = errs.slice(0, 3); R.ecran = await g();
console.log(JSON.stringify(R, null, 1));
await browser.close();
