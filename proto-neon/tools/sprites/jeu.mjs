/* tools/sprites/jeu.mjs — le VRAI bundle (ouverture et jeu des autres agents) avec 40-sprites.js : captures
   à l'échelle de l'iPhone 13 en paysage et en portrait, à plusieurs instants, et le relevé des erreurs.
   Usage : node tools/sprites/jeu.mjs   (après node build.mjs tools/sprites/index.html) */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const [nom, prof] of [['paysage', { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } }], ['portrait', { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } }]]) {
  const ctx = await browser.newContext(prof);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console ' + m.text()); });
  await p.addInitScript(() => { window.__SEED = 2975; });
  await p.goto('http://127.0.0.1:8112/proto-neon/tools/sprites/index.html');
  await p.waitForFunction(() => window.__FRAME > 5);
  await p.waitForTimeout(2500);
  await p.screenshot({ path: path.join(HERE, `jeu-${nom}-ouverture.png`) });
  /* passer l'ouverture d'une touche, puis jouer quelques secondes */
  await p.mouse.click(200, 200); await p.waitForTimeout(300); await p.keyboard.press('Space'); await p.waitForTimeout(400); await p.keyboard.press('Enter');
  await p.waitForTimeout(6000);
  await p.screenshot({ path: path.join(HERE, `jeu-${nom}-partie.png`) });
  const st = await p.evaluate(() => ({ phase: window.__S && window.__S.phase, err: window.__ERR, unknown: window.__N.spr && window.__N.spr.unknown, frame: window.__FRAME }));
  console.log(nom, JSON.stringify(st), errors.slice(0, 5));
  await ctx.close();
}
await browser.close();
