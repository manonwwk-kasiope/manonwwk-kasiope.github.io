/* tools/sprites/gris.mjs — passe une capture en niveaux de gris (luminance relative WCAG) : V-10 et G-12
   demandent que chaque objet reste reconnaissable à sa silhouette, sans la couleur.
   Usage : node tools/sprites/gris.mjs entree.png sortie.png */
import fs from 'node:fs';
import { chromium } from 'playwright';
const [inp, outp] = process.argv.slice(2);
const b64 = fs.readFileSync(inp).toString('base64');
const browser = await chromium.launch();
const page = await browser.newPage();
const url = await page.evaluate(async (b64) => {
  const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), p = d.data;
  const lin = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  for (let i = 0; i < p.length; i += 4) {
    const L = 0.2126 * lin(p[i]) + 0.7152 * lin(p[i + 1]) + 0.0722 * lin(p[i + 2]);
    const s = Math.round(255 * (L <= 0.0031308 ? 12.92 * L : 1.055 * Math.pow(L, 1 / 2.4) - 0.055));
    p[i] = p[i + 1] = p[i + 2] = s;
  }
  g.putImageData(d, 0, 0);
  return c.toDataURL('image/png');
}, b64);
fs.writeFileSync(outp, Buffer.from(url.split(',')[1], 'base64'));
await browser.close();
console.log('gris', outp);
