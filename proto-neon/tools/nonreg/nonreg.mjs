/* tools/nonreg/nonreg.mjs — la batterie de non-régression (REFONTE.md § 8.6), lancée APRÈS CHAQUE
   INTÉGRATION ; un échec bloque l'intégration suivante. Elle tient en moins de 10 minutes.
     1. node build.mjs                              le bundle se construit
     2. interdits                                   Math.random ; N.rnd et ses cousins dans le code ; couleurs
                                                    littérales hors de 00-pal.js ; Date.now, performance.now et
                                                    new Date hors de 90-boot.js (commentaires exclus)
     3. tests de contrat                            tools/contrat/socle.mjs, puis contrat.mjs sur 3 profils
     4. états                                       tools/jeu/etats.mjs (parcours complet, 3 profils)
     5. fumée                                       60 s de jeu sur 3 profils, zéro erreur (tools/jeu/fumee.mjs)
     6. R-01, R-02, R-03                            pixels carrés, palette fermée (tube coupé), cyan réservé
                                                    (masque de propriété) sur 6 états de jeu
     7. R-21                                        5 graines, 60 s simulées chacune avec le pilote, zéro erreur
     8. coût de la scène 'charge'                   p95 de l'image, au plus 0,5 ms de plus que la référence
     9. cadence                                     tools/jeu/cadence.mjs (J-29)
   Usage : node tools/nonreg/nonreg.mjs [--url URL] [--sans etape,etape] [--reference]
     --reference : écrit la mesure de coût comme nouvelle référence (tools/nonreg/reference.json).
   Sortie : un résumé par étape, puis NONREG : OK | ÉCHEC (code 0 | 1). */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const PN = path.join(ICI, '..', '..');
const NODE = process.execPath;
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const URL_JEU = arg('--url', 'http://127.0.0.1:8112/proto-neon/index.html');
const SANS = (arg('--sans', '') || '').split(',').filter(Boolean);
const REF = path.join(ICI, 'reference.json');
const t0 = Date.now();
const res = [];
function note(nom, ok, detail) { res.push({ nom, ok, detail }); console.log(`${ok ? 'ok    ' : 'ÉCHEC '} ${nom}${detail ? ' — ' + detail : ''}`); }
function lancer(script, args, maxMs) {
  const r = spawnSync(NODE, [path.join(PN, script)].concat(args || []), { cwd: PN, encoding: 'utf8', timeout: maxMs || 300000 });
  const sortie = (r.stdout || '') + (r.stderr || '');
  return { ok: r.status === 0, sortie, derniere: sortie.trim().split('\n').slice(-1)[0] };
}
const etape = (n) => !SANS.includes(n);

/* 1. construction */
if (etape('build')) { const b = lancer('build.mjs'); note('build', b.ok, b.sortie.split('\n')[0]); if (!b.ok) { console.log('NONREG : ÉCHEC'); process.exit(1); } }

/* 2. interdits, commentaires retirés */
if (etape('interdits')) {
  const SRC = path.join(PN, 'src'), fautes = [];
  /* les deux tables de secours de la palette (démo, gardées) : 90-boot.js et 05-art.js, tant que 00-pal.js manque */
  const PERMIS_COULEUR = ['90-boot.js', '05-art.js'];
  for (const f of fs.readdirSync(SRC).filter(x => x.endsWith('.js')).sort()) {
    const code = fs.readFileSync(path.join(SRC, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\\])\/\/.*$/gm, '$1');
    if (/Math\.random/.test(code)) fautes.push(f + ' : Math.random');
    if (f !== '90-boot.js' && /\bN\.rnd[RI]?\b/.test(code)) fautes.push(f + ' : N.rnd');
    if (f !== '90-boot.js' && /Date\.now|performance\.now|new Date\b/.test(code)) fautes.push(f + ' : horloge murale');
    if (f !== '00-pal.js' && !PERMIS_COULEUR.includes(f) && /#[0-9a-fA-F]{6}\b|\brgba?\(/.test(code)) fautes.push(f + ' : couleur littérale');
  }
  note('interdits', fautes.length === 0, fautes.join(' ; ') || 'aucun');
}

/* 3. tests de contrat */
if (etape('contrat')) {
  const s = lancer('tools/contrat/socle.mjs'); note('contrat (socle, Node)', s.ok, s.derniere);
  const c = lancer('tools/contrat/contrat.mjs', ['--url', URL_JEU], 400000); note('contrat (3 profils)', c.ok, c.derniere);
}
/* 4. le parcours des états */
if (etape('etats')) { const e = lancer('tools/jeu/etats.mjs', ['--url', URL_JEU], 400000); note('états (3 profils)', e.ok, e.derniere); }
/* 5. fumée */
if (etape('fumee')) for (const p of ['paysage', 'portrait', 'bureau']) {
  const f = lancer('tools/jeu/fumee.mjs', [p, '60', path.join(ICI, 'fumee-' + p + '.png'), URL_JEU], 300000);
  const m = /"err":\{"count":(\d+)/.exec(f.sortie);
  note('fumée ' + p, f.ok, m ? '__ERR.count = ' + m[1] : f.derniere);
}

/* 6 à 8 : dans Chromium */
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
async function page(prof, init) {
  const ctx = await browser.newContext(prof);
  const pg = await ctx.newPage();
  const cons = [];
  pg.on('pageerror', e => cons.push(e.message));
  pg.on('console', m => { if (m.type() === 'error') cons.push(m.text()); });
  await pg.addInitScript(init || (() => { window.__SEED = 2975; }));
  return { ctx, pg, cons };
}
if (etape('pixels')) {
  const { ctx, pg, cons } = await page({ ...devices['iPhone 13 landscape'] });
  await pg.goto(URL_JEU);
  await pg.waitForFunction(() => window.__N && window.__N.game && window.__N.game.dbg);
  const ETATS = ['calme', 'montee', 'chaos', 'colosse', 'vol', 'cartes'];
  const out = [];
  for (const sc of ETATS) {
    await pg.evaluate(s => { window.__N.crt.preset('coupe'); window.__N.game.dbg.scene(s); }, sc);
    await pg.waitForTimeout(400);
    const r = await pg.evaluate(() => {
      const N = window.__N, g = N.gfx, b = g.buf(), m = N.game.dbg.masque(), cy = N.pal.i('cyan'), cp = N.pal.i('cyanPale');
      let horsPal = 0, cyanHors = 0;
      for (let i = 0; i < b.length; i++) { if (b[i] > 15) horsPal++; if ((b[i] === cy || b[i] === cp) && !(m[i] >= 1 && m[i] <= 4)) cyanHors++; }
      const c = g.canvas();
      return { horsPal, cyanPart: cyanHors / b.length, carre: c.width === g.W * g.PX && c.height === g.H * g.PX, px: g.PX, w: c.width, h: c.height };
    });
    /* R-01 et R-02 sur l'image réellement affichée : chaque bloc PX × PX est uni, et dans la palette */
    const shot = await pg.evaluate(() => {
      const c = window.__N.gfx.canvas(), x = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, P = window.__N.gfx.PX;
      const pal = new Set(window.__N.pal.C.map(h => h.toLowerCase()));
      let hors = 0, bloc = 0, n = 0;
      for (let y = 0; y + P <= c.height; y += P * 3) for (let xx = 0; xx + P <= c.width; xx += P * 3) {
        const i0 = (y * c.width + xx) * 4, hex = '#' + [x[i0], x[i0 + 1], x[i0 + 2]].map(v => v.toString(16).padStart(2, '0')).join('');
        n++; if (!pal.has(hex)) hors++;
        for (let dy = 0; dy < P; dy++) for (let dx = 0; dx < P; dx++) { const j = ((y + dy) * c.width + xx + dx) * 4; if (x[j] !== x[i0] || x[j + 1] !== x[i0 + 1] || x[j + 2] !== x[i0 + 2]) { bloc++; dy = P; break; } }
      }
      return { hors, bloc, n };
    });
    out.push(Object.assign({ scene: sc }, r, shot));
  }
  await pg.evaluate(() => window.__N.crt.preset('riche'));
  const r01 = out.every(o => o.carre && o.bloc === 0), r02 = out.every(o => o.horsPal === 0 && o.hors === 0), r03 = out.every(o => o.cyanPart < 0.005);
  note('R-01 pixels carrés', r01, out.map(o => o.scene + ':' + (o.carre ? o.bloc : 'taille')).join(' '));
  note('R-02 palette fermée', r02, out.map(o => o.scene + ':' + o.hors).join(' '));
  note('R-03 cyan réservé', r03, out.map(o => o.scene + ':' + (o.cyanPart * 100).toFixed(2) + '%').join(' '));
  note('pixels : zéro erreur', cons.length === 0 && (await pg.evaluate(() => window.__ERR.count)) === 0, cons.slice(0, 3).join(' | '));
  await ctx.close();
}
if (etape('r21')) {
  const { ctx, pg, cons } = await page({ ...devices['iPhone 13 landscape'] });
  await pg.goto(URL_JEU);
  await pg.waitForFunction(() => window.__N && window.__N.game && window.__N.game.dbg);
  const r = await pg.evaluate(() => {
    const N = window.__N, out = [];
    N.ev.verifier(true);
    for (const g of [1, 2, 3, 4, 5]) {
      N.game.reset(g); N.game.dbg.vague(1); N.pilote.niveau('bon'); N.pilote.activer(true);
      N.game.dbg.simuler(60);
      out.push({ graine: g, etat: N.game.etat(), t: +N.horloge.t().toFixed(1), err: window.__ERR.count });
    }
    N.pilote.activer(false);
    return out;
  });
  note('R-21 (5 graines × 60 s simulées, bus vérifié)', r.every(x => x.err === 0) && cons.length === 0, r.map(x => x.graine + ':' + x.etat + '@' + x.t + 's').join(' ') + (cons.length ? ' ; ' + cons[0] : ''));
  await ctx.close();
}
if (etape('cout')) {
  const { ctx, pg } = await page({ ...devices['iPhone 13 landscape'] });
  await pg.goto(URL_JEU + (URL_JEU.includes('?') ? '&' : '?') + 'scene=charge');
  await pg.waitForFunction(() => window.__N && window.__S && window.__S.frame > 30);
  await pg.waitForTimeout(4000);
  const p95 = await pg.evaluate(() => window.__S.perf.p95);
  let ref = null; try { ref = JSON.parse(fs.readFileSync(REF, 'utf8')); } catch (e) { ref = null; }
  if (process.argv.includes('--reference') || !ref) { fs.writeFileSync(REF, JSON.stringify({ charge_p95: p95, date: new Date().toISOString() }, null, 1) + '\n'); }
  const base = ref ? ref.charge_p95 : p95;
  note('coût p95 de la scène charge', p95 <= base + 0.5, p95.toFixed(2) + ' ms (référence ' + base.toFixed(2) + ' ms)');
  await ctx.close();
}
await browser.close();

/* 9. cadence */
if (etape('cadence')) { const c = lancer('tools/jeu/cadence.mjs', [URL_JEU]); note('cadence (J-29)', c.ok, c.sortie.trim().split('\n')[0]); }

const ok = res.every(r => r.ok);
console.log(`durée : ${((Date.now() - t0) / 1000).toFixed(0)} s`);
console.log(ok ? 'NONREG : OK' : 'NONREG : ÉCHEC');
process.exit(ok ? 0 : 1);
