/* tools/cosmos/banc.mjs — le banc de l'époque 2975 (src/67-cosmos.js).
   Une partie complète au pilote automatique (?pilote=1, écrit dans panneau.html) sur iPhone 13 paysage (ELLE),
   iPhone 13 portrait (LUI) et bureau 1440 × 900 (ELLE), jusqu'à surFin : zéro erreur, durée, coût de l'image du module
   (update + draw ; p95 sous 6 ms en paysage), palette fermée (aucun index hors des seize), cyan hors du serpent,
   warps, amiral, musique. Des captures à chaque moment fort.
     node build.mjs tools/cosmos/index.html && node tools/cosmos/banc.mjs [--sortie DOSSIER] [--profils paysage,portrait]
   Les captures ne vont pas dans le dépôt : --sortie (par défaut un dossier temporaire du système). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const URL_ESSAI = arg('--url', 'http://127.0.0.1:8133/proto-neon/tools/cosmos/index.html');
const SORTIE = arg('--sortie', path.join(os.tmpdir(), 'cosmos-banc'));
const GRAINE = +arg('--graine', '2975');
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
  ['01-breche', 's.phase === "entree" && s.pt >= 0.9'],
  ['02-titre', 's.phase === "entree" && s.pt >= 3.0'],
  ['03-armada', 's.phase === "voyage" && s.vt >= 11'],
  ['04-chasseurs', 's.vt >= 17'],
  ['05-annonce', 's.warp.phase === "annonce" && s.warp.n === 0', 30],
  ['06-warp', 's.warp.phase === "visee" && s.warp.verrous >= 4 || s.warp.phase === "sortie" && s.warp.n === 1'],
  ['07-salve', 's.missiles >= 3 || (s.warp.n >= 1 && s.warp.phase === "repos")'],
  ['08-debris', 's.instants.debris !== undefined && s.t >= s.instants.debris + 5'],
  ['09-warp-debris', 's.warp.n >= 2 && s.warp.phase === "visee" && s.warp.verrous >= 3 || s.instants.descente !== undefined'],
  ['10-descente', 's.descente >= 1.6 || s.instants.plan !== undefined'],
  ['11-plan', 's.instants.plan !== undefined && (s.rayons.length > 0 && s.t > s.instants.plan + 2 || s.t > s.instants.plan + 6) || s.boss'],
  ['12-warp-plan', 's.warp.n >= 3 && s.warp.phase === "visee" && s.warp.verrous >= 3 || s.boss'],
  ['13-ombre', 's.boss && s.boss.etat === "arrivee" && s.boss.pt >= 1.0'],
  ['14-amiral', 's.boss && s.boss.etat === "arrivee" && s.boss.pt >= 3.4'],
  ['15-phase1', 's.boss && s.boss.etat === "p1" && s.rayons.length > 0 || s.boss && s.boss.etat !== "arrivee" && s.boss.etat !== "p1"'],
  ['16-phase1-suite', 's.boss && s.boss.etat === "p1" && s.boss.parts.filter(p => p.mort).length >= 2 || s.boss && s.boss.etat !== "p1" && s.boss.etat !== "arrivee"'],
  ['17-ouverture', 's.boss && s.boss.etat === "transition" && s.boss.pt >= 1.2 || s.boss && (s.boss.etat === "p2" || s.boss.etat === "mort")'],
  ['18-coeur', 's.boss && s.boss.etat === "p2" && s.rayons.some(r => r.actif) || s.boss && s.boss.etat === "mort"'],
  ['19-warp-coeur', 's.boss && s.boss.etat === "p2" && s.warp.phase === "visee" && s.warp.verrous >= 2 || s.boss && s.boss.etat === "mort"'],
  ['20-chaine', 's.phase === "explosion" && s.pt >= 1.6'],
  ['21-detonation', 's.phase === "explosion" && s.detone && s.pt >= 3.55'],
  ['22-anneaux', 's.phase === "explosion" && s.pt >= 4.4'],
  ['23-epilogue', 's.phase === "epilogue" && s.pt >= 1.5']
];

function pct(v, p) { if (!v.length) return 0; const a = v.slice().sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(a.length * p))]; }

async function partie(nav, profil) {
  const P = PROFILS[profil];
  const ctx = await nav.newContext({ ...P.ctx });
  const page = await ctx.newPage();
  const erreurs = [], absents = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  page.on('response', r => { if (r.status() === 404) absents.push(r.url()); });
  await page.addInitScript(g => { window.__DT = 1 / 60; window.__SEED = g; try { localStorage.clear(); } catch (e) { } }, GRAINE);
  const t0 = Date.now();
  await page.goto(URL_ESSAI + '?pilote=1&qui=' + P.qui, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N && window.__N.cosmos && window.__N.cosmos.actif(), null, { timeout: 30000 });
  /* un toucher, pour débloquer le son (la musique de 2975 passe par N.music.context()) */
  if (P.ctx.hasTouch) await page.touchscreen.tap(20, 20); else await page.mouse.click(20, 20);
  const captures = [], instants = {};
  for (const [nom, cond, apres] of MOMENTS) {
    try {
      await page.waitForFunction(c => { const s = window.__N.cosmos.state(); return window.__COSMOS_FINI || new Function('s', 'return ' + c)(s); }, cond, { polling: 'raf', timeout: 150000 });
    } catch (e) { captures.push(nom + ' : délai dépassé'); continue; }
    if (apres) { const f0 = await page.evaluate(() => window.__FRAME); await page.waitForFunction(f => window.__FRAME >= f, f0 + apres, { polling: 'raf' }); }
    const s = await page.evaluate(() => { const s = window.__N.cosmos.state(); return { phase: s.phase, t: s.t, vt: s.vt, fini: !!window.__COSMOS_FINI }; });
    instants[nom] = s;
    if (s.fini && nom !== '23-epilogue') { captures.push(nom + ' : partie déjà finie'); continue; }
    const f = path.join(SORTIE, `${nom}-${profil}.png`);
    await page.screenshot({ path: f });
    captures.push(f);
  }
  await page.waitForFunction(() => window.__COSMOS_FINI === true, null, { timeout: 200000 });
  const r = await page.evaluate(() => ({ s: window.__N.cosmos.state(), mes: window.__COSMOS_MES, err: window.__ERR ? window.__ERR.count : -1,
    finT: window.__COSMOS_FIN_T, W: window.__N.gfx.W, H: window.__N.gfx.H, PX: window.__N.gfx.PX, perf: window.__S && window.__S.perf }));
  const cine = absents.filter(u => /\/cine\/[^/]+\.mp4$/.test(u));
  let n404 = cine.length;
  r.erreurs = erreurs.filter(e => !(/404/.test(e) && n404-- > 0));
  r.mur = (Date.now() - t0) / 1000; r.captures = captures; r.instants = instants; r.profil = profil; r.qui = P.qui;
  const c = r.mes.couts;
  r.cout = { p50: pct(c, 0.5), p95: pct(c, 0.95), p99: pct(c, 0.99), max: pct(c, 1), n: c.length, parPhase: {} };
  for (const ph in r.mes.parPhase) r.cout.parPhase[ph] = { p50: +pct(r.mes.parPhase[ph], 0.5).toFixed(2), p95: +pct(r.mes.parPhase[ph], 0.95).toFixed(2), n: r.mes.parPhase[ph].length };
  delete r.mes.couts; delete r.mes.parPhase;
  await ctx.close();
  return r;
}

const nav = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const profils = arg('--profils', 'paysage,portrait,bureau').split(',');
const res = [];
if (process.argv.includes('--suite')) { for (const p of profils) res.push(await partie(nav, p)); }
else res.push(...await Promise.all(profils.map(p => partie(nav, p))));
await nav.close();

let ok = true;
const verifie = (nom, v, cond) => { console.log(`${cond ? 'ok    ' : 'ÉCHEC '} ${nom} = ${JSON.stringify(v)}`); ok = ok && cond; };
res.forEach(r => {
  const s = r.s, m = r.mes, p = r.profil;
  console.log(`\n== ${p} (${r.qui}) : tampon ${r.W}×${r.H} (px ${r.PX})`);
  verifie('surFin appelé, phase', s.phase, s.phase === 'fini');
  verifie('erreurs (__ERR + console)', [r.err, r.erreurs.slice(0, 3)], r.err === 0 && r.erreurs.length === 0);
  verifie('durée jusqu\'à surFin (s réelles de jeu)', r.finT, r.finT >= 90 && r.finT <= 125);
  verifie('coût du module, p50 / p95 / p99 / max (ms)', [r.cout.p50, r.cout.p95, r.cout.p99, r.cout.max].map(v => +v.toFixed(2)), p !== 'paysage' || r.cout.p95 < 6);
  console.log('   par phase : ' + Object.entries(r.cout.parPhase).map(([k, v]) => `${k} ${v.p50}/${v.p95}`).join(', ') + (r.perf ? ` ; image entière (S.perf) p95 ${(+r.perf.p95 || 0).toFixed(2)}` : ''));
  verifie('palette fermée (index hors des seize)', m.horsPalette, m.horsPalette === 0);
  const coul = ph => (m.couleurs[ph] || []).sort((a, b) => a - b).map(c => NOMS[c]);
  console.log('   couleurs par phase : ' + Object.keys(m.couleurs).map(ph => ph + ' ' + coul(ph).length).join(', '));
  const cy = m.cyanHors, moy = cy.length ? cy.reduce((a, b) => a + b, 0) / cy.length : 0;
  verifie('cyan hors du serpent (moyenne, max, en part d\'écran)', [+(moy * 100).toFixed(3) + ' %', +(m.cyanMax * 100).toFixed(3) + ' %'], moy < 0.005);
  verifie('warps (dont N.warp)', [s.compte.warps, s.compte.warpsExternes], s.compte.warps >= 3);
  verifie('verrous, missiles, touches', [s.compte.verrous, s.compte.missiles, s.compte.touchesMissile], s.compte.missiles > 0);
  verifie('amiral : points faibles détruits, détonation', [s.compte.faibles, s.detone], s.compte.faibles === 4 && s.detone);
  console.log(`   morts ${s.morts}, score ${s.score}, tués ${s.compte.tues}, coupes ${s.compte.coupes} (morsures ${s.compte.morsures}), cellules ${s.compte.mange}, obus ${s.compte.obus}, grosses explosions ${s.compte.grosses}, rocs ${s.compte.rocs}, touchers du pilote ${m.taps}`);
  console.log(`   instants (s réelles) : ${JSON.stringify(s.instants)}`);
  console.log(`   musique : audio ${s.audio}, mesures ${s.musique.mesure}, notes ${JSON.stringify(s.musique.notes)}`);
  console.log('   journal musique : ' + s.journal.filter(j => /musique|warp|amiral|detonation/.test(j.e)).map(j => j.t + ' ' + j.e).join(' | '));
  console.log(`   temps réel ${r.mur.toFixed(1)} s ; captures :`);
  r.captures.forEach(c => console.log('     ' + c));
});
fs.writeFileSync(path.join(SORTIE, 'resultats.json'), JSON.stringify(res, null, 1));
console.log('\n' + (ok ? 'BANC OK' : 'BANC EN ÉCHEC'));
process.exit(ok ? 0 : 1);
