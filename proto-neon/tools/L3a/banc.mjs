/* tools/L3a/banc.mjs — le banc commun du lot 3a : un serveur statique sur la copie, Chromium, les profils,
   et quelques aides (capture du tampon d'index en PNG agrandi, attente du jeu). */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

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

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
let SERVEUR = null, PORT = 0;
export async function serveur() {
  if (SERVEUR) return PORT;
  SERVEUR = http.createServer((q, r) => {
    const p = path.join(RACINE, decodeURIComponent(q.url.split('?')[0]));
    if (!p.startsWith(RACINE) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(r);
  });
  await new Promise(ok => SERVEUR.listen(0, '127.0.0.1', ok));
  PORT = SERVEUR.address().port;
  return PORT;
}
export function fermer() { if (SERVEUR) SERVEUR.close(); SERVEUR = null; }

export async function navigateur() { return chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); }

/* une page sur la page d'essai ; erreurs de console comptées */
export async function ouvrir(nav, profil = 'paysage', requete = '') {
  const port = await serveur();
  const ctx = await nav.newContext(PROFILS[profil]);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', e => erreurs.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/proto-neon/tools/L3a/index.html${requete}`);
  await page.waitForFunction(() => window.__N && window.__N.game && window.__N.joueuse && window.__N.gfx && window.__N.gfx.buf && window.__N.gfx.buf());
  return { page, ctx, erreurs };
}

/* le tampon d'index en PNG (agrandi ×k), par le canevas du navigateur */
export async function capture(page, nom, k = 3, zone = null) {
  const b64 = await page.evaluate(([k, zone]) => {
    const N = window.__N, g = N.gfx, b0 = g.buf(), W0 = g.W, H0 = g.H, C = N.pal.C;
    let W = W0, H = H0, b = b0;
    if (zone) {
      let [zx, zy, zw, zh] = zone;
      if (zone === 'tete' || zone[0] === 'tete') { const p = __S.player, c = N.cam; zw = zone === 'tete' ? 96 : zone[1]; zh = zone === 'tete' ? 64 : zone[2]; zx = Math.round(p.x - c.x - zw / 2); zy = Math.round(p.y - c.y - zh / 2); }
      zx = Math.max(0, Math.min(W0 - zw, zx)); zy = Math.max(0, Math.min(H0 - zh, zy));
      W = zw; H = zh; b = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) b[y * W + x] = b0[(y + zy) * W0 + x + zx];
    }
    const c = document.createElement('canvas'); c.width = W * k; c.height = H * k;
    const x = c.getContext('2d'), im = x.createImageData(W * k, H * k), rgb = C.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
    for (let y = 0; y < H * k; y++) for (let xx = 0; xx < W * k; xx++) {
      const i = b[((y / k) | 0) * W + ((xx / k) | 0)], o = (y * W * k + xx) * 4, q = rgb[i] || [255, 0, 255];
      im.data[o] = q[0]; im.data[o + 1] = q[1]; im.data[o + 2] = q[2]; im.data[o + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    return c.toDataURL('image/png').split(',')[1];
  }, [k, zone]);
  const f = path.join(SORTIE, nom + '.png');
  fs.writeFileSync(f, Buffer.from(b64, 'base64'));
  return f;
}
export const attendre = ms => new Promise(ok => setTimeout(ok, ms));
