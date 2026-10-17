/* tools/sprites/planche.mjs — LA PREUVE : planche de tous les sprites et de la police, dessinée DANS le vrai
   tampon du jeu (la boucle de 90-boot.js est détournée : N.game est remplacé par le dessin de la planche,
   N.intro et N.fx sont écartés), capturée à l'échelle du jeu (px = 2, comme l'iPhone 13 en paysage), puis
   le tampon d'index est agrandi ×4 au voisin le plus proche.

   Usage : node tools/sprites/planche.mjs [tout|jeu] [crt]
     tout = la planche complète ; jeu = un instantané de jeu dense, pour juger la lisibilité en situation.
     crt  = garder le post-traitement 20-crt.js dans la capture d'écran (le tampon agrandi n'en a jamais).
   Sorties dans tools/sprites/ : planche-<page>[-crt].png (capture à l'échelle) et planche-<page>-x4.png. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const page = process.argv[2] || 'tout';
const crt = process.argv[3] === 'crt';
const VW = +(process.env.VW || 844), VH = +(process.env.VH || (page === 'tout' ? 1010 : 390));

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', e => errors.push('pageerror ' + e.message));
p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('console ' + m.text()); });
await p.goto('http://127.0.0.1:8112/proto-neon/tools/sprites/index.html');
await p.waitForFunction(() => window.__N && window.__N.spr && window.__N.gfx && window.__FRAME > 2);

const info = await p.evaluate(({ page, crt }) => {
  const N = window.__N, S = window.__S, g = N.gfx, P = N.pal.i;
  if (N.crt) N.crt.off = !crt;
  N.fx = null; N.intro = null;
  S.phase = 'planche';
  const T = (s, x, y, o) => { const t = N.spr.text(s, o); g.blit(t, x, y - t.top); return t; };
  const B = (s, x, y) => { g.blit(s, x, y); return s; };
  const M = (n, f, x, y) => B(N.spr.make(n, f), x, y);
  const label = (s, x, y) => T(s, x, y, { ci: 'acier' });

  function tout() {
    let y = 4;
    T('SNAKE 2975 - PLANCHE DE 40-SPRITES.JS, CAPTUREE A PX = 2', 4, y, { ci: 'os' }); y += 12;

    label('JOUEUSE : TETE:0..15 X3, CORPS 9/7/5/3 X3, SERPENT ASSEMBLE', 4, y); y += 10;
    for (let f = 0; f < 3; f++) for (let k = 0; k < 16; k++) M('tete:' + k, f, 4 + k * 14, y + f * 14);
    const d0 = [9, 7, 5, 3];
    for (let i = 0; i < 4; i++) for (let f = 0; f < 3; f++) { const d = d0[i]; M('corps:' + d, f, 236 + f * 12 + (9 - d) / 2, y + i * 11 + (9 - d) / 2); }
    /* serpent assemblé : segments de la queue vers la tête, tête en dernier */
    { const pts = []; for (let i = 0; i < 24; i++) pts.push([410 - i * 4.4, y + 22 + Math.round(Math.sin(i * 0.42) * 9)]);
      for (let i = pts.length - 1; i >= 1; i--) { const d = i < 6 ? 9 : i < 13 ? 7 : i < 19 ? 5 : 3; N.spr.draw('corps:' + d, i, pts[i][0], pts[i][1]); }
      N.spr.draw('tete:' + N.spr.dir(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]), 0, pts[0][0], pts[0][1]); }
    y += 44;
    label('TIR:0..15 X2, CHEVRON:0..15, VIE, VIEVIDE', 4, y); y += 10;
    for (let k = 0; k < 16; k++) { M('tir:' + k, 0, 4 + k * 8, y); M('tir:' + k, 1, 136 + k * 8, y); M('chevron:' + k, 0, 268 + k * 8, y); }
    M('vie', 0, 400, y - 1); M('vieVide', 0, 410, y - 1);
    y += 12;

    label('ENNEMIS : FLECHE:0..15 X2 ; A DROITE FLECHE:12 (PLANCHE), :4, :8', 4, y); y += 10;
    for (let f = 0; f < 2; f++) for (let k = 0; k < 16; k++) M('fleche:' + k, f, 4 + k * 16, y + f * 16);
    M('fleche:12', 0, 268, y); M('fleche:12', 1, 284, y);
    M('fleche:4', 0, 268, y + 16); M('fleche:8', 0, 284, y + 16);
    y += 34;
    label('TOURELLE, :CHARGE, SENTINELLE X4, MINE, :ALERTE, TIRENNEMI', 4, y); y += 10;
    let x = 4;
    for (const [n, fr] of [['tourelle', 2], ['tourelle:charge', 2], ['sentinelle', 4], ['mine', 2], ['mine:alerte', 2]]) {
      for (let f = 0; f < fr; f++) { const s = M(n, f, x, y); x += s.w + 1; } x += 5;
    }
    for (const n of ['tirEnnemi:petit', 'tirEnnemi', 'tirEnnemi:gros']) for (let f = 0; f < 2; f++) { const s = N.spr.make(n, f); B(s, x, y + ((15 - s.h) >> 1)); x += s.w + 1; }
    y += 18;
    label('COLOSSE X2, COLOSSE:OEIL X2 ; MENACES SUR FONDS DIFFICILES', 4, y); y += 10;
    x = 4;
    for (const [n, f] of [['colosse', 0], ['colosse', 1], ['colosse:oeil', 0], ['colosse:oeil', 1]]) { const s = M(n, f, x, y); x += s.w + 2; }
    const fonds = ['brasier', 'jaune', 'magenta', 'os', 'violet'];
    for (let i = 0; i < fonds.length; i++) {
      g.rect(x + 2, y + i * 10, 214 - x + 200, 10, P(fonds[i]));
    }
    { let yy = y; const xs = x + 4;
      /* chaque menace posée À CHEVAL sur deux fonds : le contour nuit profonde doit la détacher partout */
      const L = ['fleche', 'tourelle', 'sentinelle', 'mine', 'tirEnnemi', 'tirEnnemi:gros', 'butin', 'colosse:oeil'];
      let xx = xs;
      for (let r = 0; r < 2; r++) { xx = xs; for (const n of L.slice(0, 7)) { const s = N.spr.make(n, r); B(s, xx, yy + 3 + r * 22); xx += s.w + 2; } }
    }
    y += 52;

    label('BUTIN X4 ; SON MUET PAUSE LECTURE OK KO VIE VIEVIDE :ACIER *2', 4, y); y += 10;
    x = 4;
    for (let f = 0; f < 4; f++) { const s = M('butin', f, x, y); x += s.w + 1; } x += 6;
    for (const n of ['son', 'muet', 'pause', 'lecture', 'ok', 'ko', 'vie', 'vieVide', 'son:acier', 'pause:jaune']) { const s = M(n, 0, x, y); x += s.w + 3; }
    M('pause*2', 0, x + 2, y - 1);
    y += 26;

    label('POLICE 5X7 MAISON, CHASSE FIXE : CAPITALES, CHIFFRES, SIGNES', 4, y); y += 11;
    T('ABCDEFGHIJKLMNOPQRSTUVWXYZ  0123456789', 4, y); y += 12;
    T('. , : ; ! ? - / % + \' " ( ) « » # * = < > _ ° × …  ✓ ✗ ★ ♥ ← ↑ → ↓', 4, y); y += 12;
    T('É È Ê Ë À Â Ä Ç Ù Û Ü Ô Ö Î Ï Ÿ Œ Æ', 4, y); y += 14;
    T("DÉFI RÉUSSI ✓  FRÔLEUSE : 3/10", 4, y, { ci: 'jaune', ombre: true }); T('SCORE 004250', 220, y, { ci: 'jaune', ombre: true }); T('×2', 300, y, { ci: 'ambre', ombre: true }); y += 12;
    T("à l'école des serpents, ça va ? oui ! (minuscules converties)", 4, y, { ombre: true }); y += 12;
    T('ALERTE', 4, y, { ci: 'magenta', ombre: true }); T('ÉNERGIE', 46, y, { ci: 'ambre', ombre: true }); T('VICTOIRE', 96, y, { ci: 'rosePale', ombre: true });
    T('DÉFAITE', 152, y, { ci: 'acier', ombre: true }); T('PAUSE', 200, y, { ci: 'os', ombre: true }); y += 18;
    T('ÉCHELLE 2 : ÇA TIENT', 4, y, { echelle: 2, ombre: true }); y += 24;
    /* lisibilité : ombre seule, puis contour, sur les fonds les plus durs */
    const f2 = ['brasier', 'magenta', 'os', 'violet', 'indigo', 'jaune'];
    for (let i = 0; i < f2.length; i++) {
      g.rect(4 + i * 69, y - 2, 67, 26, P(f2[i]));
      T('OMBRE', 7 + i * 69, y, { ombre: true });
      T('CONTOUR', 7 + i * 69, y + 12, { contour: true });
    }
    y += 28;
    T('BRIEFING SUR TROIS LIGNES, CENTRÉ :\nLA GRILLE EST TOMBÉE EN 2975.\nRAMÈNE L\'ÉNERGIE AU NOYAU, ÉVITE LE COLOSSE.', 4, y, { align: 'centre', ombre: true });
    return { y: y + 36 };
  }

  function jeu() {
    /* un instantané de jeu dense, à l'échelle : décor, explosion, serpent, ennemis, tirs, butin, interface */
    g.ditherRect(0, 0, g.W, g.H, P('nuit'), 0.5);
    for (let x = 0; x < g.W; x += 16) g.line(x, 0, x, g.H, P('indigo'));
    for (let y = 0; y < g.H; y += 16) g.line(0, y, g.W, y, P('indigo'));
    g.ditherCirc(250, 110, 36, P('brasier'), 0.6); g.ditherCirc(250, 110, 22, P('jaune'), 0.5); g.ditherCirc(250, 110, 10, P('os'), 0.5);
    const pts = []; for (let i = 0; i < 30; i++) pts.push([140 + i * 4.4, 150 - Math.round(Math.sin(i * 0.3) * 14)]);
    for (let i = pts.length - 1; i >= 1; i--) { const d = i < 7 ? 9 : i < 15 ? 7 : i < 23 ? 5 : 3; N.spr.draw('corps:' + d, i, pts[i][0], pts[i][1]); }
    N.spr.draw('tete:8', 0, pts[0][0] - 2, pts[0][1]);
    N.spr.draw('chevron:10', 0, pts[0][0] - 13, pts[0][1] - 5);
    for (let i = 0; i < 6; i++) N.spr.draw('tir:8', i & 1, pts[0][0] - 22 - i * 13, pts[0][1]);
    const foes = [['fleche:1', 60, 40], ['fleche:2', 92, 66], ['tourelle', 200, 52], ['sentinelle', 238, 104], ['mine', 268, 128], ['mine:alerte', 330, 60],
      ['fleche:7', 380, 150], ['sentinelle', 30, 120], ['fleche:3', 262, 90], ['tourelle:charge', 300, 160]];
    for (const [n, x, y] of foes) N.spr.draw(n, 1, x, y);
    for (let i = 0; i < 12; i++) N.spr.draw(i % 3 ? 'tirEnnemi' : 'tirEnnemi:gros', i, 196 + i * 9, 80 + (i % 4) * 9);
    for (let i = 0; i < 5; i++) N.spr.draw('butin', i, 60 + i * 20, 175);
    N.spr.draw('colosse:oeil', 1, 372, 95);
    const t1 = N.spr.text('SCORE 004250', { ci: 'jaune', contour: true }); g.blit(t1, 6, 4 - 1);
    const t2 = N.spr.text('DÉFI : FRÔLEUSE 3/10', { contour: true }); g.blit(t2, 110, 3);
    N.spr.draw('vie', 0, 6 + 4, 22); N.spr.draw('vie', 0, 16 + 4, 22); N.spr.draw('vieVide', 0, 26 + 4, 22);
    N.spr.draw('pause', 0, g.W - 12, 10); N.spr.draw('son', 0, g.W - 28, 10);
    return {};
  }

  const fn = page === 'jeu' ? jeu : tout;
  let used = null;
  N.game = { reset() {}, update() {}, draw() { used = fn(); }, drawTop() {}, tension() { return 0; } };
  return { W: g.W, H: g.H, PX: g.PX, names: N.spr.names() };
}, { page, crt });

await p.waitForTimeout(400);
const shot = path.join(HERE, `planche-${page}${crt ? '-crt' : ''}.png`);
await p.screenshot({ path: shot });
/* le tampon d'index agrandi ×4 : la vérité du rendu, avant tout post-traitement ; et l'histogramme */
const big = await p.evaluate(() => {
  const N = window.__N, g = N.gfx, b = g.buf(), C = N.pal.C, k = 4;
  const c = document.createElement('canvas'); c.width = g.W * k; c.height = g.H * k;
  const x = c.getContext('2d');
  for (let y = 0; y < g.H; y++) for (let i = 0; i < g.W; i++) { x.fillStyle = C[b[y * g.W + i]]; x.fillRect(i * k, y * k, k, k); }
  const hist = new Array(16).fill(0); for (let i = 0; i < b.length; i++) hist[b[i]]++;
  return { url: c.toDataURL('image/png'), hist, n: b.length };
});
fs.writeFileSync(path.join(HERE, `planche-${page}-x4.png`), Buffer.from(big.url.split(',')[1], 'base64'));
/* contrôle de la sortie à l'échelle : tous les pixels de la capture (sans CRT) sont-ils dans la table des seize ? */
let horsTable = null;
if (!crt) horsTable = await p.evaluate(() => {
  const N = window.__N, cv = N.gfx.canvas(), cx = cv.getContext('2d'), d = cx.getImageData(0, 0, cv.width, cv.height).data;
  const ok = new Set(N.pal.C.map(h => parseInt(h.slice(1), 16)));
  let hors = 0; for (let i = 0; i < d.length; i += 4) if (!ok.has((d[i] << 16) | (d[i + 1] << 8) | d[i + 2])) hors++;
  return { hors, total: d.length / 4 };
});
console.log(JSON.stringify({ page, W: info.W, H: info.H, PX: info.PX, horsTable, errors, err: await p.evaluate(() => window.__ERR) }));
await browser.close();
