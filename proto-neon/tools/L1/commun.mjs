/* tools/L1/commun.mjs — le banc du lot 1 : profils, ouverture d'une page, doigts simulés par CDP, résultats.
   Autonome (il ne dépend pas de tools/mesure/, que l'agent des outils de mesure fait encore évoluer). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

export const ICI = path.dirname(fileURLToPath(import.meta.url));
export const SORTIE = path.join(ICI, 'sortie');
fs.mkdirSync(SORTIE, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
export const URL_ESSAI = arg('--url', 'http://127.0.0.1:8121/proto-neon/tools/L1/index.html');
export const RAPIDE = process.argv.includes('--rapide');
export const SEULEMENT = (arg('--seulement', '') || '').split(',').filter(Boolean);

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
export const PROFILS = {
  paysage: { viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA },
  portrait: { viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: UA },
  bureau: { viewport: { width: 1440, height: 900 }, screen: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
};

let NAV = null;
export async function navigateur() {
  if (!NAV) NAV = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  return NAV;
}
export async function fermerTout() { if (NAV) await NAV.close(); NAV = null; }

/* une page sur la page d'essai ; o : dt, graine, query, cpu, init (fonction injectée avant le jeu) */
export async function ouvrir(profil = 'paysage', o = {}) {
  const nav = await navigateur();
  const ctx = await nav.newContext({ ...PROFILS[profil], reducedMotion: o.reducedMotion || 'no-preference' });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  await page.addInitScript(c => { if (c.dt) window.__DT = c.dt; window.__SEED = c.graine || 7; if (c.nodraw) window.__NODRAW = true; try { localStorage.clear(); } catch (e) { } }, { dt: o.dt, graine: o.graine, nodraw: o.nodraw });
  if (o.init) await page.addInitScript(o.init);
  let cdp = null;
  if (o.cpu > 1 || o.cdp) { cdp = await ctx.newCDPSession(page); if (o.cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: o.cpu }); }
  const u = new URL(o.url || URL_ESSAI);
  for (const [k, v] of Object.entries(o.query || {})) u.searchParams.set(k, v);
  await page.goto(u.href, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N && window.__N.game && window.__N.game.dbg && window.__FRAME > 2);
  const s = {
    profil, page, ctx, erreurs,
    async cdpSession() { if (!cdp) cdp = await ctx.newCDPSession(page); return cdp; },
    eval: (f, a) => page.evaluate(f, a),
    async images(n) { const f0 = await page.evaluate(() => window.__FRAME); await page.waitForFunction(f => window.__FRAME >= f, f0 + n, { polling: 'raf', timeout: 120000 }); },
    async err() { const c = await page.evaluate(() => window.__ERR.count); return { err: c, console: erreurs.slice(0, 5), zero: c === 0 && erreurs.length === 0 }; },
    async capture(nom) { const f = path.join(SORTIE, `${nom}-${profil}.png`); await page.screenshot({ path: f }); return f; },
    async fermer() { try { await ctx.close(); } catch (e) { } }
  };
  return s;
}

/* des doigts, en points CSS, par Input.dispatchTouchEvent (tous les doigts posés à chaque envoi) */
export class Doigts {
  constructor(s) { this.s = s; this.actifs = new Map(); this.id = 1; }
  async init() { this.cdp = await this.s.cdpSession(); return this; }
  points() { return [...this.actifs.entries()].map(([id, p]) => ({ x: p.x, y: p.y, id, radiusX: 6, radiusY: 6, force: 1 })); }
  async poser(x, y) { let id = 0; while (this.actifs.has(id)) id++; this.actifs.set(id, { x, y }); await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: this.points() }); return id; }
  async bouger(id, x, y) { const p = this.actifs.get(id); if (!p) return; p.x = x; p.y = y; await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: this.points() }); }
  /* touchEnd : Chromium relâche les points LISTÉS (le doigt levé seul), il garde les autres posés */
  async lever(id) { const p = this.actifs.get(id); if (!p) return; this.actifs.delete(id); await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: p.x, y: p.y, id, radiusX: 6, radiusY: 6, force: 1 }] }); }
  async toutLever() { for (const id of [...this.actifs.keys()]) await this.lever(id); }
  attendre(ms) { return this.s.page.waitForTimeout(Math.max(0, ms)); }
  async glisser(id, x1, y1, ms) {
    const p = this.actifs.get(id), x0 = p.x, y0 = p.y, n = Math.max(1, Math.round(ms / 16)), t0 = Date.now();
    for (let k = 1; k <= n; k++) { await this.bouger(id, x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n); const reste = t0 + ms * k / n - Date.now(); if (reste > 0) await this.attendre(reste); }
  }
}

/* les résultats d'un banc */
export class Rapport {
  constructor(nom) { this.nom = nom; this.lignes = []; this.notes = []; this.captures = []; }
  verifie(critere, valeur, seuil, ok, extra = {}) { this.lignes.push({ critere, valeur, seuil, ok: !!ok, ...extra }); console.log(`${ok ? 'ok    ' : 'ÉCHEC '} ${critere} = ${JSON.stringify(valeur)} (${seuil})`); return ok; }
  note(t) { this.notes.push(t); console.log('   note : ' + t); }
  capture(f) { this.captures.push(path.relative(path.join(ICI, '..', '..'), f)); }
  ecrire() {
    const f = path.join(SORTIE, this.nom + '.json');
    fs.writeFileSync(f, JSON.stringify({ banc: this.nom, url: URL_ESSAI, date: new Date().toISOString(), tout: this.lignes.every(l => l.ok), lignes: this.lignes, notes: this.notes, captures: this.captures }, null, 1));
    return f;
  }
}
export const q = (a, p) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor((s.length - 1) * p + 0.5))]; };
