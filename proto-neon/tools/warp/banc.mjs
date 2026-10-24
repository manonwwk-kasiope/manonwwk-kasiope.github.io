/* tools/warp/banc.mjs — banc du WARP (78-warp.js) sur la page d'essai tools/warp/index.html.
   iPhone 13 paysage : au moins trois warps (un sur deux au TOUCHER simulé, l'autre TENU puis relâché), mesure du facteur
   de temps effectif (déplacement moyen d'un ennemi par image au creux du warp / hors warp, et avance du temps de jeu),
   des verrous et des ennemis touchés et tués par arme ; puis portrait et bureau, un warp chacun. Captures pendant la
   visée et à la salve, hors du dépôt. Sortie 0 si zéro erreur, au moins 3 warps et un facteur effectif entre 0,1 et 0,2.
   Usage : node tools/warp/banc.mjs [--url URL] [--out dossier] [--warps n] */
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_ = arg('--url', 'http://127.0.0.1:8133/proto-neon/tools/warp/index.html');
const OUT = arg('--out', '/tmp/claude-0/-home-user-manonwwk-kasiope-github-io/7b0d9e92-8e26-5f74-a679-fd3a5e906236/scratchpad/warp');
const WARPS = +arg('--warps', '4');
fs.mkdirSync(OUT, { recursive: true });

const PROFILS = {
  paysage: { ...devices['iPhone 13'], viewport: { width: 844, height: 390 } },
  portrait: { ...devices['iPhone 13'], viewport: { width: 390, height: 844 } },
  bureau: { viewport: { width: 1440, height: 900 } }
};
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });

async function session(nom, warps, captures) {
  const ctx = await browser.newContext(PROFILS[nom]);
  const page = await ctx.newPage();
  const logs = [];
  /* les clips de cine/ manquent sous tools/<lot>/ (chemin relatif, vrai pour toutes les pages d'essai) : hors du warp */
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) logs.push(m.text()); });
  page.on('response', r => { if (r.status() >= 400 && !/\/cine\/[^/]+\.mp4$/.test(r.url())) logs.push(r.status() + ' ' + r.url()); });
  page.on('pageerror', e => logs.push('pageerror: ' + e.message));
  await page.addInitScript(() => { window.__SEED = 2001; window.__DT = 1 / 60; });
  await page.goto(URL_);
  await page.waitForFunction(() => window.__WARP && window.__WARP.pret, null, { timeout: 30000 });
  const caps = [];
  for (let k = 1; k <= warps; k++) {
    await page.waitForFunction(k => window.__WARP.cycle >= k && window.__N.warp.state().phase === 'visee' && window.__N.warp.state().pt >= 1.7, k, { timeout: 60000, polling: 'raf' });
    if (captures) { const f = path.join(OUT, `${nom}-warp${k}-visee.png`); await page.screenshot({ path: f }); caps.push(f); }
    await page.waitForFunction(() => { const s = window.__N.warp.state(); return s.phase === 'sortie' && s.tirs.missile + s.tirs.bombe + s.tirs.mine + s.tirs.laser > 0 || s.phase === 'repos'; }, null, { timeout: 60000, polling: 'raf' });
    if (captures && k <= 2) { const f = path.join(OUT, `${nom}-warp${k}-salve.png`); await page.screenshot({ path: f }); caps.push(f); }
  }
  await page.waitForFunction(() => window.__N.warp.state().phase === 'repos' && window.__N.warp.state().file === 0, null, { timeout: 30000, polling: 100 });
  await page.waitForTimeout(1500);
  const r = await page.evaluate(() => {
    const W = window.__WARP, M = W.mesure, s = window.__N.warp.state();
    const vc = M.creux.d / Math.max(1, M.creux.n), vp = M.plein.d / Math.max(1, M.plein.n);
    return {
      warps: s.stats.warps, salves: s.stats.salves, verrous: s.stats.verrous, verrousParWarp: W.verrousParWarp,
      lances: s.stats.lances, touches: s.stats.touches, tues: s.stats.tues,
      facteurEnnemis: +(vc / vp).toFixed(3), pxParImage: { creux: +vc.toFixed(3), plein: +vp.toFixed(3), echantillons: [M.creux.n, M.plein.n] },
      facteurTempsJeu: +((M.creux.tt / Math.max(1e-6, M.creux.dt)) / (M.plein.tt / Math.max(1e-6, M.plein.dt))).toFixed(3),
      etat: window.__N.game.etat(), W: window.__N.gfx.W, H: window.__N.gfx.H, PX: window.__N.gfx.PX,
      err: window.__ERR.count, sigs: Object.keys(window.__ERR.sigs).slice(0, 6), journal: s.journal.slice(-12).map(j => j.t + ' ' + j.e)
    };
  });
  r.console = logs.slice(0, 6); r.captures = caps;
  await ctx.close();
  return r;
}

const res = {};
res.paysage = await session('paysage', WARPS, true);
res.portrait = await session('portrait', 1, true);
res.bureau = await session('bureau', 1, true);
console.log(JSON.stringify(res, null, 1));
await browser.close();
const p = res.paysage;
const ok = p.warps >= 3 && p.facteurEnnemis > 0.1 && p.facteurEnnemis < 0.2
  && [res.paysage, res.portrait, res.bureau].every(x => x.err === 0 && x.console.length === 0);
console.log(ok ? 'BANC WARP : OK' : 'BANC WARP : ÉCHEC');
process.exit(ok ? 0 : 1);
