/* tools/L6a/commun.mjs — ouvrir la page d'essai du lot 6a dans Chromium, sur un profil, et relever les erreurs.
   La page se sert par « bash tools/lots/worktree.sh servir L6a » (port 8129) ; --url la remplace. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { encodeIndex } from '../mesure/png.mjs';

export const ICI = path.dirname(fileURLToPath(import.meta.url));
export const SORTIE = path.join(ICI, 'sortie');
fs.mkdirSync(SORTIE, { recursive: true });

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
export const PROFILS = {
  paysage: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA },
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA },
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
};
export function arg(k, d) { const a = process.argv, i = a.indexOf(k); return i >= 0 && i + 1 < a.length ? a[i + 1] : d; }
export const URL0 = arg('--url', 'http://127.0.0.1:8129/proto-neon/tools/L6a/index.html');

export async function ouvrir(profil = 'paysage', opts = {}) {
  const nav = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await nav.newContext(PROFILS[profil]);
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  if (opts.init) await page.addInitScript(opts.init);
  await page.goto(URL0 + (opts.q || ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N && window.__N.spr && window.__N.fx && window.__N.game, null, { timeout: 15000 });
  return {
    nav, page, erreurs,
    async err() { const e = await page.evaluate(() => (window.__ERR && window.__ERR.count) | 0); return { count: e, console: erreurs.slice() }; },
    async fermer() { await nav.close(); }
  };
}

/* palette du jeu, lue dans la page : [[r,g,b]…] */
export async function palette(page) {
  return page.evaluate(() => { const P = window.__N.pal, o = []; for (let i = 0; i < 16; i++) o.push([P.R[i], P.G[i], P.B[i]]); return o; });
}
/* capture du tampon d'index (avant le tube), écrite en PNG agrandi */
export async function capture(page, nom, k = 3) {
  const r = await page.evaluate(() => { const g = window.__N.gfx; return { w: g.W, h: g.H, d: Array.from(g.buf()) }; });
  const pal = await palette(page);
  fs.writeFileSync(path.join(SORTIE, nom + '.png'), encodeIndex(r.w, r.h, Uint8Array.from(r.d), pal, k));
  return r;
}
export function ecrire(nom, obj) { fs.writeFileSync(path.join(SORTIE, nom), typeof obj === 'string' ? obj : JSON.stringify(obj, null, 1)); }
export function png(nom, W, H, idx, pal, k) { fs.writeFileSync(path.join(SORTIE, nom + '.png'), encodeIndex(W, H, idx, pal, k)); }
