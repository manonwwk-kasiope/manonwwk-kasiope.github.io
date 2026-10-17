/* tools/jeu/son.mjs — la coupure du son mémorisée : coupée, rechargement, toujours coupée avant tout geste
   (N.music.mute vaut avant la création du contexte), puis remise, rechargement, active. */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } });
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const etat = () => page.evaluate(() => ({ jeu: window.__N.game.dbg().muted, musique: window.__N.music.muted ? window.__N.music.muted() : null, stockage: localStorage.getItem('snake2975.son'), S: window.__S.muted }));
const R = {};
await page.goto('http://127.0.0.1:8112/proto-neon/tools/jeu/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__S && window.__N.game.dbg().P);
await page.evaluate(() => localStorage.setItem('snake2975.son', '0'));
await page.reload();
await page.waitForFunction(() => window.__N && window.__N.game && window.__S && window.__N.game.dbg().P);
await page.waitForTimeout(300);
R.apresRechargementCoupe = await etat();
await page.keyboard.press('Space'); await page.waitForTimeout(600);      // le geste crée le contexte : la coupure doit tenir
R.apresGeste = await etat();
await page.keyboard.press('KeyM'); await page.waitForTimeout(200);
R.remis = await etat();
await page.reload();
await page.waitForFunction(() => window.__N && window.__N.game && window.__S && window.__N.game.dbg().P);
await page.waitForTimeout(300);
R.apresRechargementActif = await etat();
R.erreurs = errs;
console.log(JSON.stringify(R));
await browser.close();
