/* tools/grille/banc.mjs — le banc de l'époque 1993, LA PROFONDEUR (src/66-grille.js).
   Une partie complète au pilote automatique (?pilote=1, écrit dans panneau.html) sur iPhone 13 paysage (ELLE),
   iPhone 13 portrait (LUI) et bureau 1440 × 900 (ELLE), jusqu'à surFin : zéro erreur, surFin une seule fois, durée,
   coût de l'image du module (update + draw ; p95 sous 6 ms en paysage), palette fermée (aucun index hors des seize),
   cyan hors du serpent, balises, étages, tempos, musique. Des captures à chaque moment. Puis, sur chaque profil, le
   skip() progressif : une étape par appel jusqu'à 'fini', surFin une seule fois, plus rien après.
     node build.mjs tools/grille/index.html && node tools/grille/banc.mjs [--sortie DOSSIER] [--profils paysage,portrait]
   Les captures ne vont pas dans le dépôt : --sortie (par défaut un dossier temporaire du système). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const URL_ESSAI = arg('--url', 'http://127.0.0.1:8133/proto-neon/tools/grille/index.html');
const SORTIE = arg('--sortie', path.join(os.tmpdir(), 'grille-banc'));
const GRAINE = +arg('--graine', '1993');
fs.mkdirSync(SORTIE, { recursive: true });

const iph = devices['iPhone 13'];
const PROFILS = {
  paysage: { ctx: { ...iph, viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } }, qui: 'elle' },
  portrait: { ctx: { ...iph, viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } }, qui: 'lui' },
  bureau: { ctx: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }, qui: 'elle' }
};
const NOMS = ['vide', 'nuit', 'ardoise', 'violet', 'indigo', 'magenta', 'rosePale', 'cyan', 'cyanPale', 'ambre', 'jaune', 'brasier', 'os', 'acier', 'sang', 'nuitProfonde'];

/* les moments à capturer : un nom, une condition sur l'état (évaluée dans la page), un délai en images */
const MOMENTS = [
  ['01-chute', 's.phase === "titre" && s.pt >= 1.45'],
  ['02-titre', 's.phase === "titre" && s.pt >= 3.1'],
  ['03-grille', 's.phase === "grille" && s.pt >= 3.5'],
  ['04-vise-du-profond', 's.menaces.some(m => m.k === "rayon" && !m.feu && m.reste < 0.7) || s.phase !== "grille"'],
  ['05-rayon', 's.menaces.some(m => m.k === "rayon" && m.feu) || s.phase !== "grille"'],
  ['06-annonce-tempo', 's.annonce || s.phase === "profond"', 20],
  ['07-ascenseur', 's.instants.ascenseur !== undefined && s.t >= s.instants.ascenseur + 1.2 || s.phase === "profond"'],
  ['08-descente', 's.snake.some(p => p[2] === 1) && s.snake.some(p => p[2] === 0) || s.phase === "profond" && s.pt > 0.6'],
  ['09-profond', 's.phase === "profond" && s.pt >= 4'],
  ['10-ombre-mine', 's.menaces.some(m => m.k === "mine" && !m.feu && m.reste < 0.5) || s.phase !== "profond" && s.phase !== "grille"'],
  ['11-mine', 's.menaces.some(m => m.k === "mine" && m.feu) || s.phase !== "profond" && s.phase !== "grille"'],
  ['12-remontee', 's.phase === "remontee" && s.pt >= 1.2'],
  ['13-accelere', 's.phase === "remontee" && s.tempo >= 103 || s.phase === "sortie"'],
  ['14-deux-etages', 's.phase === "remontee" && s.objectif && s.objectif.faits >= 1 || s.phase === "sortie"'],
  ['15-grille-ouverte', 's.sortie && s.instants.sortieOuverte !== undefined && s.t >= s.instants.sortieOuverte + 0.8 || s.phase === "sortie"'],
  ['16-sortie', 's.phase === "sortie" && s.pt >= 0.9'],
  ['17-dalles', 's.phase === "sortie" && s.pt >= 2.4'],
  ['18-neon', 's.phase === "sortie" && s.pt >= 4.3']
];

function pct(v, p) { if (!v.length) return 0; const a = v.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; }

async function page0(nav, profil) {
  const P = PROFILS[profil];
  const ctx = await nav.newContext({ ...P.ctx });
  const page = await ctx.newPage();
  const erreurs = [], absents = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() === 404) absents.push(r.url()); });
  await page.addInitScript(g => { window.__DT = 1 / 60; window.__SEED = g; try { localStorage.clear(); } catch (e) { } }, GRAINE);
  return { P, ctx, page, erreurs, absents };
}
function filtrer(erreurs, absents) {
  let n404 = absents.filter(u => /\/cine\/[^/]+\.mp4$/.test(u)).length;
  return erreurs.filter(e => !(/404/.test(e) && n404-- > 0));
}

async function partie(nav, profil) {
  const { P, ctx, page, erreurs, absents } = await page0(nav, profil);
  const t0 = Date.now();
  await page.goto(URL_ESSAI + '?pilote=1&qui=' + P.qui, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N && window.__N.grille && window.__N.grille.actif(), null, { timeout: 30000 });
  if (P.ctx.hasTouch) await page.touchscreen.tap(20, 20); else await page.mouse.click(20, 20);
  const captures = [];
  for (const [nom, cond, apres] of MOMENTS) {
    try {
      await page.waitForFunction(c => { const s = window.__N.grille.state(); return window.__GRILLE_FINI || new Function('s', 'return ' + c)(s); }, cond, { polling: 'raf', timeout: 150000 });
    } catch (e) { captures.push(nom + ' : délai dépassé'); continue; }
    if (apres) { const f0 = await page.evaluate(() => window.__FRAME); await page.waitForFunction(f => window.__FRAME >= f, f0 + apres, { polling: 'raf' }); }
    const fini = await page.evaluate(() => !!window.__GRILLE_FINI);
    if (fini) { captures.push(nom + ' : partie déjà finie'); continue; }
    const f = path.join(SORTIE, `${nom}-${profil}.png`);
    await page.screenshot({ path: f });
    captures.push(f);
  }
  await page.waitForFunction(() => window.__GRILLE_FINI >= 1, null, { timeout: 200000 });
  await page.waitForTimeout(400);
  const r = await page.evaluate(() => ({ s: window.__N.grille.state(), mes: window.__GRILLE_MES, err: window.__ERR ? window.__ERR.count : -1,
    fins: window.__GRILLE_FINI, finT: window.__GRILLE_FIN_T, W: window.__N.gfx.W, H: window.__N.gfx.H, PX: window.__N.gfx.PX,
    skipApres: window.__N.grille.skip() }));
  r.erreurs = filtrer(erreurs, absents);
  r.mur = (Date.now() - t0) / 1000; r.captures = captures; r.profil = profil; r.qui = P.qui;
  const c = r.mes.couts;
  r.cout = { p50: pct(c, 0.5), p95: pct(c, 0.95), p99: pct(c, 0.99), max: pct(c, 1), n: c.length, parPhase: {} };
  for (const ph in r.mes.parPhase) r.cout.parPhase[ph] = { p50: +pct(r.mes.parPhase[ph], 0.5).toFixed(2), p95: +pct(r.mes.parPhase[ph], 0.95).toFixed(2), n: r.mes.parPhase[ph].length };
  delete r.mes.couts; delete r.mes.parPhase;
  await ctx.close();
  return r;
}

/* le skip() progressif : une étape par appel, toutes les 300 ms, jusqu'à 'fini' ; surFin une seule fois */
async function sauts(nav, profil) {
  const { P, ctx, page, erreurs, absents } = await page0(nav, profil);
  await page.goto(URL_ESSAI + '?qui=' + P.qui, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N && window.__N.grille && window.__N.grille.actif(), null, { timeout: 30000 });
  const phases = [await page.evaluate(() => window.__N.grille.phase())], retours = [];
  for (let k = 0; k < 12; k++) {
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const v = window.__N.grille.skip(); return { v, ph: window.__N.grille.phase(), fins: window.__GRILLE_FINI || 0 }; });
    retours.push(r.v); phases.push(r.ph);
    if (r.ph === 'fini') break;
  }
  await page.waitForTimeout(300);
  const fin = await page.evaluate(() => ({ apres: [window.__N.grille.skip(), window.__N.grille.skip()], fins: window.__GRILLE_FINI || 0, actif: window.__N.grille.actif() }));
  const f = path.join(SORTIE, `skip-${profil}.png`); await page.screenshot({ path: f });
  const errs = filtrer(erreurs, absents);
  await ctx.close();
  return { phases, retours, fin, erreurs: errs };
}

const nav = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const profils = arg('--profils', 'paysage,portrait,bureau').split(',');
const res = [], sk = {};
if (process.argv.includes('--suite')) { for (const p of profils) res.push(await partie(nav, p)); }
else res.push(...await Promise.all(profils.map(p => partie(nav, p))));
for (const p of profils) sk[p] = await sauts(nav, p);
await nav.close();

let ok = true;
const verifie = (nom, v, cond) => { console.log(`${cond ? 'ok    ' : 'ÉCHEC '} ${nom} = ${JSON.stringify(v)}`); ok = ok && cond; };
res.forEach(r => {
  const s = r.s, m = r.mes, p = r.profil, inst = s.instants;
  console.log(`\n== ${p} (${r.qui}) : tampon ${r.W}×${r.H} (px ${r.PX}), grille ${s.C}×${s.R}`);
  verifie('surFin appelé une seule fois, phase', [r.fins, s.phase], r.fins === 1 && s.phase === 'fini');
  verifie('skip() après la fin', r.skipApres, r.skipApres === false);
  verifie('erreurs (__ERR + console)', [r.err, r.erreurs.slice(0, 3)], r.err === 0 && r.erreurs.length === 0);
  verifie('durée jusqu\'à surFin (s de jeu)', r.finT, r.finT >= 55 && r.finT <= 100);
  verifie('coût du module, p50 / p95 / p99 / max (ms)', [r.cout.p50, r.cout.p95, r.cout.p99, r.cout.max].map(v => +v.toFixed(2)), p !== 'paysage' || r.cout.p95 < 6);
  console.log('   par phase : ' + Object.entries(r.cout.parPhase).map(([k, v]) => `${k} ${v.p50}/${v.p95}`).join(', '));
  verifie('palette fermée (index hors des seize)', m.horsPalette, m.horsPalette === 0);
  const coul = ph => (m.couleurs[ph] || []).sort((a, b) => a - b).map(c => NOMS[c]);
  console.log('   couleurs par phase : ' + Object.keys(m.couleurs).map(ph => ph + ' ' + coul(ph).length).join(', '));
  const cy = m.cyanHors, moy = cy.length ? cy.reduce((a, b) => a + b, 0) / cy.length : 0;
  verifie('cyan hors du serpent (moyenne, max, en part d\'écran)', [+(moy * 100).toFixed(3) + ' %', +(m.cyanMax * 100).toFixed(3) + ' %'], moy < 0.005);
  verifie('balises allumées', s.compte.balises, s.compte.balises === 14);
  verifie('étages : descente par l\'ascenseur, remontée', [inst.etage1_grille, inst.remontee, inst.sortie], inst.etage1_grille !== undefined && inst.sortie !== undefined);
  verifie('ascenseurs pris, sauts d\'étage', [s.compte.ascenseurs, s.compte.plongees], s.compte.ascenseurs + s.compte.plongees >= 2);
  verifie('changements de tempo du jeu (annonce, 76, puis 76 → 104)', [inst.annonce2, inst.tempo2, inst.annonce3, inst.tempo3], inst.annonce2 !== undefined && inst.tempo2 !== undefined && inst.tempo3 !== undefined && inst.tempo2 > inst.annonce2);
  verifie('menaces de l\'autre étage (rayons, mines)', [s.compte.rayons, s.compte.mines], s.compte.rayons > 0 && s.compte.mines > 0);
  console.log(`   morts ${s.morts}, score ${s.score}, coupes ${s.compte.coupes} (morsures ${s.compte.morsures}), cellules ${s.compte.mange}, boucliers ${s.compte.boucliers}, régénérations ${s.compte.regens}, ennemis détruits ${s.compte.detruits}, aides ${s.compte.aides}, décisions du pilote ${m.decisions}`);
  console.log(`   instants (s de jeu) : ${JSON.stringify(inst)}`);
  const jm = s.journal.filter(j => /musique|tempo/.test(j.e));
  console.log(`   musique : audio ${s.audio}, mesures ${s.musique.mesure}, notes ${JSON.stringify(s.musique.notes)}`);
  console.log('   journal tempo / musique : ' + jm.map(j => j.t + ' ' + j.e).join(' | '));
  if (s.audio) verifie('la musique annonce puis change de tempo', jm.filter(j => /musique (annonce|section)/.test(j.e)).length, jm.some(j => /musique annonce 2/.test(j.e)) && jm.some(j => /musique section 2 tempo 76/.test(j.e)) && jm.some(j => /musique section 3/.test(j.e)));
  console.log(`   temps réel ${r.mur.toFixed(1)} s ; captures :`);
  r.captures.forEach(c => console.log('     ' + c));
});
for (const p of profils) {
  const k = sk[p];
  console.log(`\n== skip() progressif, ${p}`);
  verifie('phases traversées', k.phases, JSON.stringify(k.phases) === JSON.stringify(['titre', 'grille', 'profond', 'remontee', 'sortie', 'fini']));
  verifie('retours de skip()', k.retours, k.retours.every(v => v === true));
  verifie('après la fin : skip(), surFin, actif', k.fin, k.fin.fins === 1 && k.fin.apres.every(v => v === false) && !k.fin.actif);
  verifie('erreurs', k.erreurs.slice(0, 3), k.erreurs.length === 0);
}
fs.writeFileSync(path.join(SORTIE, 'resultats.json'), JSON.stringify({ res, sk }, null, 1));
console.log('\n' + (ok ? 'BANC OK' : 'BANC EN ÉCHEC'));
process.exit(ok ? 0 : 1);
