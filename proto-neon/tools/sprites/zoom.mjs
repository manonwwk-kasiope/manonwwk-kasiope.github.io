/* tools/sprites/zoom.mjs — agrandit une portion d'image au voisin le plus proche, pour la regarder.
   Usage : node tools/sprites/zoom.mjs entree.png x y w h echelle sortie.png */
import fs from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const [inp, x, y, w, h, k, outp] = process.argv.slice(2);
const b64 = fs.readFileSync(inp).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent('<html><body style="margin:0;background:#000"></body></html>');
const data = await page.evaluate(async ({ b64, x, y, w, h, k }) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = w * k; c.height = h * k;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.drawImage(img, x, y, w, h, 0, 0, w * k, h * k);
  return c.toDataURL('image/png');
}, { b64, x: +x, y: +y, w: +w, h: +h, k: +k });
fs.writeFileSync(outp, Buffer.from(data.split(',')[1], 'base64'));
await browser.close();
console.log('ok', outp);
