/* tools/L4a/outils.mjs — le socle des bancs du lot 4a : serveur statique sur la copie, navigateur, profils,
   ouverture d'une page d'essai en jeu (graine, pas fixe), capture du tampon d'index en PNG, erreurs. */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { encodeIndex } from '../mesure/png.mjs';

export const ICI = path.dirname(fileURLToPath(import.meta.url));
export const PROTO = path.resolve(ICI, '..', '..');
export const RACINE = path.resolve(PROTO, '..');
export const SORTIE = path.join(ICI, 'sortie');
fs.mkdirSync(SORTIE, { recursive: true });

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
export const PROFILS = {
  paysage: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA },
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA },
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
};

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
let SERV = null, PORT = 0;
export async function serveur() {
  if (SERV) return PORT;
  SERV = http.createServer((req, res) => {
    const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let f = path.join(RACINE, p);
    if (!f.startsWith(RACINE)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end('absent'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(ok => SERV.listen(0, '127.0.0.1', ok));
  PORT = SERV.address().port;
  return PORT;
}
export function arreterServeur() { if (SERV) { SERV.close(); SERV = null; } }

let NAV = null;
export async function navigateur() { if (!NAV) NAV = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] }); return NAV; }
export async function fermer() { if (NAV) await NAV.close(); NAV = null; arreterServeur(); }

/* ouvre une page d'essai ; opts : page ('index.html' | 'bestiaire.html'), graine, dt (pas imposé), profil */
export async function ouvrir(opts = {}) {
  const port = await serveur(), nav = await navigateur();
  const ctx = await nav.newContext(PROFILS[opts.profil || 'paysage']);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  await page.addInitScript(({ graine, dt, manuel }) => {
    window.__SEED = graine; if (dt) window.__DT = dt;
    try { localStorage.clear(); } catch (e) { }
    /* mode manuel : la boucle d'images n'avance que quand le banc le demande (window.__pas(n)), image par image,
       chaque image passant par la vraie boucle de 90-boot.js (mise à jour, dessin, tube) */
    if (manuel) {
      window.__rafQ = []; window.__rafT = 0;
      window.requestAnimationFrame = function (cb) { window.__rafQ.push(cb); return window.__rafQ.length; };
      window.cancelAnimationFrame = function () { };
      window.__pas = function (n) {
        for (var i = 0; i < (n || 1); i++) {
          if (window.__chaqueImage) window.__chaqueImage();
          var q = window.__rafQ; window.__rafQ = []; window.__rafT += 1000 / 60;
          for (var k = 0; k < q.length; k++) q[k](window.__rafT);
        }
      };
    }
  }, { graine: opts.graine || 1, dt: opts.dt === undefined ? 1 / 60 : opts.dt, manuel: !!opts.manuel });
  await page.goto(opts.url || `http://127.0.0.1:${port}/proto-neon/tools/L4a/${opts.page || 'index.html'}`);
  if (opts.manuel) await page.waitForFunction(() => { if (window.__pas) window.__pas(1); return window.__N && window.__N.game && window.__N.ennemis && window.__S && window.__N.gfx && window.__N.gfx.buf && window.__N.gfx.buf(); }, null, { timeout: 20000, polling: 50 });
  else await page.waitForFunction(() => window.__N && window.__N.game && window.__N.ennemis && window.__S && window.__N.gfx && window.__N.gfx.buf && window.__N.gfx.buf(), null, { timeout: 20000 });
  return { page, ctx, erreurs, async fin() { await ctx.close(); } };
}

/* le tampon d'index courant -> PNG agrandi (pixels de jeu, palette exacte) */
export async function capture(page, fichier, echelle = 3) {
  const r = await page.evaluate(() => {
    const N = window.__N, b = N.gfx.buf();
    return { W: N.gfx.W, H: N.gfx.H, d: Array.from(b), pal: Array.from({ length: 16 }, (_, k) => [N.pal.R[k], N.pal.G[k], N.pal.B[k]]) };
  });
  const pal = r.pal;
  fs.writeFileSync(fichier, encodeIndex(r.W, r.H, Uint8Array.from(r.d), pal, echelle));
  return r;
}

/* le tampon brut (pour composer des planches) */
export async function tampon(page) {
  return page.evaluate(() => {
    const N = window.__N, b = N.gfx.buf();
    return { W: N.gfx.W, H: N.gfx.H, d: Array.from(b), pal: Array.from({ length: 16 }, (_, k) => [N.pal.R[k], N.pal.G[k], N.pal.B[k]]) };
  });
}
/* une planche : des tampons côte à côte (colonnes), recadrés (cadre {x,y,w,h} en px de jeu), séparés d'un filet */
export function planche(tampons, fichier, cadre, colonnes = 5, echelle = 3) {
  const T0 = tampons[0], c = cadre || { x: 0, y: 0, w: T0.W, h: T0.H }, n = tampons.length, col = Math.min(colonnes, n), lig = Math.ceil(n / col);
  const W = col * (c.w + 2), H = lig * (c.h + 2), out = new Uint8Array(W * H).fill(13);
  tampons.forEach((t, k) => {
    const ox = (k % col) * (c.w + 2), oy = ((k / col) | 0) * (c.h + 2);
    for (let y = 0; y < c.h; y++) for (let x = 0; x < c.w; x++) {
      const sx = c.x + x, sy = c.y + y;
      out[(oy + y) * W + ox + x] = sx >= 0 && sy >= 0 && sx < t.W && sy < t.H ? t.d[sy * t.W + sx] : 0;
    }
  });
  fs.writeFileSync(fichier, encodeIndex(W, H, out, T0.pal, echelle));
}

export function ecrireJSON(nom, obj) { fs.writeFileSync(path.join(SORTIE, nom), JSON.stringify(obj, null, 1)); }
