/* tools/G/planche.mjs — la planche de tous les sprites du lot G (catalogue de N.spr), en vraies couleurs et en niveaux de gris,
   plus les silhouettes deux à deux (intersection sur union des masques binaires centrés, critère < 0,6 du lot 6a).
   Usage : node tools/G/planche.mjs [--url URL] [--out DOSSIER]
   Sortie : planche.png (couleurs), planche-gris.png, iou.json */
import { chromium } from 'playwright';
import fs from 'node:fs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8134/proto-neon/index.html');
const OUT = arg('--out', '/tmp/claude-501/lotG');
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', e => logs.push('pageerror: ' + e.message));
await page.goto(URL_JEU);
await page.waitForFunction(() => window.__N && window.__N.spr && window.__N.spr.catalogue);
const res = await page.evaluate(() => {
  const N = window.__N, cat = N.spr.catalogue(), K = 4;
  const rows = [];
  for (const c of cat) {
    const imgs = [];
    const n = Math.min(c.images, 4);
    for (let i = 0; i < n; i++) imgs.push(N.spr.get(c.nom, c.dirs ? 12 : undefined, i));
    if (c.dirs) for (const d of [0, 4, 8]) imgs.push(N.spr.get(c.nom, d, 0));
    rows.push({ nom: c.nom, imgs });
  }
  /* mise en page : une étiquette (police du jeu) puis les images côte à côte, sur fond de la palette */
  const pad = 3, lh = 20, W = 880;
  let x = pad, y = pad, rowH = 0, items = [];
  for (const r of rows) {
    const lw = r.nom.length * 6 + 4, w = Math.max(lw, r.imgs.reduce((a, s) => a + s.w + 4, 0) + 4), h = Math.max(...r.imgs.map(s => s.h)) + 12;
    if (x + w > W / K * 1 - 0 && x > pad) { x = pad; y += rowH + 2; rowH = 0; }
    items.push({ r, x, y }); x += w + 6; if (h > rowH) rowH = h;
  }
  const H = y + rowH + pad;
  const mk = (gris) => {
    const cv = document.createElement('canvas'); cv.width = Math.ceil(W / K) * K; cv.height = H * K;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.fillStyle = N.pal.css(N.pal.i('nuit')); g.fillRect(0, 0, cv.width, cv.height);
    const px = (X, Y, ci) => {
      let col = N.pal.css(ci);
      if (gris) { const l = Math.round(N.pal.LUM[ci] * 255); col = `rgb(${l},${l},${l})`; }
      g.fillStyle = col; g.fillRect(X * K, Y * K, K, K);
    };
    for (const it of items) {
      let xx = it.x + 2;
      /* étiquette */
      const t = N.spr.text(it.r.nom.toUpperCase().replace(/[^A-Z0-9:\/<>]/g, ''), { ci: N.pal.i('acier'), echelle: 1 });
      for (let j = 0; j < t.h; j++) for (let i = 0; i < t.w; i++) { const v = t.data[j * t.w + i]; if (v) px(it.x + i, it.y + j, v); }
      for (const s of it.r.imgs) {
        for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) { const v = s.data[j * s.w + i]; if (v) px(xx + i, it.y + 10 + j, v); }
        xx += s.w + 4;
      }
    }
    return cv.toDataURL('image/png');
  };
  /* intersection sur union des masques binaires centrés, les types ennemis deux à deux (critère du lot 6a : < 0,6) */
  const types = ['fleche', 'dard', 'larve', 'mine', 'tourelle', 'lame', 'ruche:p1', 'sentinelle', 'rival', 'planeur', 'traqueur'];
  const mask = (nom) => { const s = N.spr.get(nom, nom.startsWith('fleche') || nom === 'dard' || nom === 'rival' ? 12 : undefined, 0); return s; };
  const iou = [];
  for (let a = 0; a < types.length; a++) for (let b = a + 1; b < types.length; b++) {
    const A = mask(types[a]), B = mask(types[b]), S = 31; let inter = 0, uni = 0;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const ax = x - (S >> 1) + A.cx, ay = y - (S >> 1) + A.cy, bx = x - (S >> 1) + B.cx, by = y - (S >> 1) + B.cy;
      const va = ax >= 0 && ay >= 0 && ax < A.w && ay < A.h && A.data[ay * A.w + ax] ? 1 : 0, vb = bx >= 0 && by >= 0 && bx < B.w && by < B.h && B.data[by * B.w + bx] ? 1 : 0;
      inter += va & vb; uni += va | vb;
    }
    iou.push({ a: types[a], b: types[b], iou: +(inter / uni).toFixed(3) });
  }
  /* aucun cyan dans un sprite ennemi, palette 100 % */
  const cyan = {};
  for (const r of rows) {
    const e = /fleche|dard|larve|^mine:?|tourelle:|^lame|ruche|sentinelle|rival|perle|planeur|traqueur|colosse|cyclope|tirEnnemi|^mini/i.test(r.nom) && !/tourelleJ/i.test(r.nom);
    if (!e) continue;
    let n = 0; for (const s of r.imgs) for (const v of s.data) if (v === N.pal.i('cyan') || v === N.pal.i('cyanPale')) n++;
    if (n) cyan[r.nom] = n;
  }
  const tailles = {}; for (const c of cat) tailles[c.nom] = c.w + 'x' + c.h;
  return { color: mk(false), gris: mk(true), iou, cyan, tailles };
});
fs.writeFileSync(OUT + '/planche.png', Buffer.from(res.color.split(',')[1], 'base64'));
fs.writeFileSync(OUT + '/planche-gris.png', Buffer.from(res.gris.split(',')[1], 'base64'));
fs.writeFileSync(OUT + '/iou.json', JSON.stringify({ iou: res.iou, cyan: res.cyan, tailles: res.tailles }, null, 1));
const pire = res.iou.slice().sort((a, b) => b.iou - a.iou).slice(0, 3);
console.log('planche : ' + OUT + '/planche.png');
console.log('IoU le plus haut : ' + pire.map(p => p.a + '/' + p.b + ' ' + p.iou).join(' ; ') + ' (seuil 0,6)');
console.log('cyan dans un sprite ennemi : ' + (Object.keys(res.cyan).length ? JSON.stringify(res.cyan) : 'aucun'));
const err = await page.evaluate(() => window.__ERR.count);
console.log('__ERR.count = ' + err + ' ; console : ' + logs.length);
await browser.close();
const ok = pire[0].iou < 0.6 && !Object.keys(res.cyan).length && err === 0 && logs.length === 0;
console.log(ok ? 'PLANCHE : OK' : 'PLANCHE : À REVOIR');
process.exit(ok ? 0 : 1);
