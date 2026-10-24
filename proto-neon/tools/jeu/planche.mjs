/* tools/jeu/planche.mjs — planche des sprites de N.spr telle que le jeu les emploie, agrandie x6.
   Usage : node tools/jeu/planche.mjs sortie.png */
import { chromium } from 'playwright';
const out = process.argv[2] || 'tools/jeu/planche.png';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
await page.goto('http://127.0.0.1:8112/proto-neon/tools/jeu/index.html');
await page.waitForFunction(() => window.__N && window.__N.spr);
const data = await page.evaluate(() => {
  const N = window.__N, C = N.pal.C;
  const names = ['tete:0', 'tete:4', 'tete:12', 'corps', 'corps:7', 'corps:5', 'corps:3', 'tir:0', 'chevron:0',
    'fleche', 'fleche:0', 'tourelle', 'tourelle:charge', 'sentinelle', 'mine', 'mine:alerte', 'colosse', 'colosse:oeil',
    'tirEnnemi', 'tirEnnemi:gros', 'butin', 'son', 'muet', 'son:acier', 'pause', 'lecture'];
  const k = 6, pad = 4;
  const sp = names.map(n => ({ n, s: N.spr.make(n, 0) }));
  const W = 1180, cv = document.createElement('canvas'); cv.width = W; cv.height = 860;
  const g = cv.getContext('2d'); g.fillStyle = C[0]; g.fillRect(0, 0, W, 860);
  let x = 4, y = 14, rowH = 0; const info = [];
  for (const { n, s } of sp) {
    const w = s.w * k, h = s.h * k;
    if (x + w > W - 4) { x = 4; y += rowH + 22; rowH = 0; }
    for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) { const v = s.data[j * s.w + i]; if (v) { g.fillStyle = C[v]; g.fillRect(x + i * k, y + j * k, k, k); } }
    g.fillStyle = C[13]; g.font = '11px monospace'; g.fillText(n + ' ' + s.w + 'x' + s.h, x, y - 3);
    info.push(n + ' ' + s.w + 'x' + s.h + ' c=' + s.cx + ',' + s.cy);
    x += w + 16; rowH = Math.max(rowH, h);
  }
  const t = N.spr.text('DÉFI RÉUSSI 0123 ✓ ✗', { ci: 'jaune', contour: true, ombre: false });
  y += rowH + 30;
  for (let j = 0; j < t.h; j++) for (let i = 0; i < t.w; i++) { const v = t.data[j * t.w + i]; if (v) { g.fillStyle = C[v]; g.fillRect(4 + i * 4, y + j * 4, 4, 4); } }
  info.push('texte ' + t.w + 'x' + t.h + ' top=' + t.top + ' cap=' + t.cap);
  return { url: cv.toDataURL('image/png'), info };
});
const fs = await import('node:fs');
fs.writeFileSync(out, Buffer.from(data.url.split(',')[1], 'base64'));
console.log(data.info.join('\n'));
await browser.close();
