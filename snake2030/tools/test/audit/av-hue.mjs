// Empreinte chromatique de captures PNG : part de pixels par famille (noir, blanc, cyan, magenta/rose, orange/ambre, violet, vert, autre).
import fs from 'node:fs';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const files = process.argv.slice(2);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setContent('<canvas id=c></canvas>');
for (const f of files) {
  const b64 = fs.readFileSync(f).toString('base64');
  const r = await page.evaluate(async (b64) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.getElementById('c'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data; const n = d.length / 4; const cnt = { noir: 0, blanc: 0, cyan: 0, magenta: 0, orange: 0, violet: 0, vert: 0, bleu: 0, autre: 0 }; let lum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i] / 255, G = d[i + 1] / 255, B = d[i + 2] / 255; const mx = Math.max(R, G, B), mn = Math.min(R, G, B); const v = mx, s = mx ? (mx - mn) / mx : 0; lum += 0.2126 * R + 0.7152 * G + 0.0722 * B;
      if (v < 0.09) { cnt.noir++; continue; } if (s < 0.18 && v > 0.6) { cnt.blanc++; continue; }
      let h = 0; if (mx === mn) h = 0; else if (mx === R) h = 60 * (((G - B) / (mx - mn)) % 6); else if (mx === G) h = 60 * ((B - R) / (mx - mn) + 2); else h = 60 * ((R - G) / (mx - mn) + 4); if (h < 0) h += 360;
      if (s < 0.18) { cnt.autre++; continue; }
      if (h >= 165 && h < 200) cnt.cyan++; else if (h >= 200 && h < 250) cnt.bleu++; else if (h >= 250 && h < 300) cnt.violet++; else if (h >= 300 || h < 12) cnt.magenta++; else if (h >= 12 && h < 60) cnt.orange++; else if (h >= 60 && h < 165) cnt.vert++; else cnt.autre++;
    }
    const pct = {}; for (const k in cnt) pct[k] = +(100 * cnt[k] / n).toFixed(1); pct.lum = +(255 * lum / n).toFixed(1); return pct;
  }, b64);
  console.log(f.split('/').pop().padEnd(28), JSON.stringify(r));
}
await browser.close();
