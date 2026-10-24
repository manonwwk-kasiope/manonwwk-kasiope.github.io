/* tools/arcade/banc.mjs — le banc de l'époque 1982 (src/69-arcade.js).
   Une partie complète au pilote automatique (?pilote=1, écrit dans panneau.html), sur iPhone 13 paysage et portrait
   (et le bureau avec --bureau), jusqu'à surFin : zéro erreur, couleurs du tampon (4 au plus hors du passage final),
   durée, nouveautés, explosions, notes jouées. Des captures aux moments clés.
     node build.mjs tools/arcade/index.html && node tools/arcade/banc.mjs [--sortie DOSSIER] [--url URL] [--bureau]
   Les captures ne vont pas dans le dépôt : --sortie (par défaut un dossier temporaire du système). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const URL_ESSAI = arg('--url', 'http://127.0.0.1:8133/proto-neon/tools/arcade/index.html');
const SORTIE = arg('--sortie', path.join(os.tmpdir(), 'arcade-banc'));
const GRAINE = +arg('--graine', '1982');
fs.mkdirSync(SORTIE, { recursive: true });

const iph = devices['iPhone 13'];
const PROFILS = {
  paysage: { ...iph, viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 } },
  portrait: { ...iph, viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 } },
  bureau: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
};
const NOMS = ['vide', 'nuit', 'ardoise', 'violet', 'indigo', 'magenta', 'rosePale', 'cyan', 'cyanPale', 'ambre', 'jaune', 'brasier', 'os', 'acier', 'sang', 'nuitProfonde'];

/* les moments à capturer : un nom, une condition sur l'état (évaluée dans la page) */
const MOMENTS = [
  ['01-cadre', 's.phase === "boot" && s.pt >= 0.2'],
  ['02-corde', 's.phase === "boot" && s.pt >= 1.05'],
  ['03-vague', 's.phase !== "boot" && s.vt >= 8'],
  ['04-fleche', '(s.vt >= 15.5 && s.fleches.some(f => f.etat === "vise")) || s.vt >= 21'],
  ['05-soucoupe', '(s.soucoupe && s.vt >= 33) || s.compte.grosses > 0 || s.vt >= 40'],
  ['06-explosion', 's.compte.grosses > 0 || s.vt >= 44', 20],
  ['07-or', '(s.dore && s.vt >= 45.6) || s.frenesie || s.phase === "passage"'],
  ['08-frenesie', 's.frenesie || s.phase === "passage"'],
  ['09-chaine', 's.phase === "passage" && s.pt >= 0.45'],
  ['10-palette', 's.phase === "passage" && s.pt >= 1.15'],
  ['11-affine', 's.phase === "passage" && s.pt >= 1.7'],
  ['12-1987', 's.phase === "fini" || (s.phase === "passage" && s.pt >= 3.2)']
];

async function partie(nav, profil) {
  const ctx = await nav.newContext({ ...PROFILS[profil] });
  const page = await ctx.newPage();
  const erreurs = [];
  page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
  page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));
  /* les clips de cine/ que 05-art.js cherche à côté de la page d'essai (pareil sur tools/terminal/) : comptés à part */
  const absents = [];
  page.on('response', r => { if (r.status() === 404) absents.push(r.url()); });
  await page.addInitScript(g => { window.__DT = 1 / 60; window.__SEED = g; try { localStorage.clear(); } catch (e) { } }, GRAINE);
  const t0 = Date.now();
  await page.goto(URL_ESSAI + '?pilote=1', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__N && window.__N.arcade && window.__N.arcade.actif(), null, { timeout: 30000 });
  /* un toucher, pour débloquer le son (la musique de 1982 passe par N.music.context()) */
  if (PROFILS[profil].hasTouch) await page.touchscreen.tap(20, 20); else await page.mouse.click(20, 20);
  const captures = [], instants = {};
  for (const [nom, cond, apres] of MOMENTS) {
    try {
      await page.waitForFunction(c => { const s = window.__N.arcade.state(); return window.__ARCADE_FINI || new Function('s', 'return ' + c)(s); }, cond, { polling: 'raf', timeout: 120000 });
    } catch (e) { captures.push(nom + ' : délai dépassé'); continue; }
    if (apres) { const f0 = await page.evaluate(() => window.__FRAME); await page.waitForFunction(f => window.__FRAME >= f, f0 + apres, { polling: 'raf' }); }
    const s = await page.evaluate(() => window.__N.arcade.state());
    instants[nom] = { phase: s.phase, vt: s.vt, pt: s.pt };
    const f = path.join(SORTIE, `${nom}-${profil}.png`);
    await page.screenshot({ path: f });
    captures.push(f);
  }
  await page.waitForFunction(() => window.__ARCADE_FINI === true, null, { timeout: 120000 });
  const r = await page.evaluate(() => ({ s: window.__N.arcade.state(), mes: window.__ARCADE_MES, err: window.__ERR ? window.__ERR.count : -1,
    finT: window.__ARCADE_FIN_T, W: window.__N.gfx.W, H: window.__N.gfx.H, PX: window.__N.gfx.PX }));
  const cine = absents.filter(u => /\/cine\/[^/]+\.mp4$/.test(u));
  let n404 = cine.length;
  r.erreurs = erreurs.filter(e => !(/404/.test(e) && n404-- > 0));
  r.cineAbsents = cine.map(u => u.split('/').pop());
  r.mur = (Date.now() - t0) / 1000; r.captures = captures; r.instants = instants;
  await ctx.close();
  return r;
}

const nav = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const profils = ['paysage', 'portrait'].concat(process.argv.includes('--bureau') ? ['bureau'] : []);
const res = await Promise.all(profils.map(p => partie(nav, p)));
await nav.close();

let ok = true;
const verifie = (nom, v, cond) => { console.log(`${cond ? 'ok    ' : 'ÉCHEC '} ${nom} = ${JSON.stringify(v)}`); ok = ok && cond; };
res.forEach((r, i) => {
  const p = profils[i], s = r.s, m = r.mes;
  console.log(`\n== ${p} : tampon ${r.W}×${r.H} (px ${r.PX}), arène 1982 ${s.arene.x1 - s.arene.x0}×${s.arene.y1 - s.arene.y0} pixels de 1982`);
  verifie('surFin appelé, phase', s.phase, s.phase === 'fini');
  if (r.cineAbsents.length) console.log('   note : 404 hors module (05-art.js, clips cine/ absents de tools/arcade/) : ' + r.cineAbsents.join(', '));
  verifie('erreurs (__ERR + console)', [r.err, r.erreurs.slice(0, 3)], r.err === 0 && r.erreurs.length === 0);
  verifie('durée de jeu jusqu\'à surFin (s)', r.finT, r.finT >= 40 && r.finT <= 70);
  verifie('temps de vague (s)', s.vt, s.vt >= 40);
  const coul = ph => (m.couleurs[ph] || []).sort((a, b) => a - b).map(c => NOMS[c]);
  verifie('couleurs max hors passage', { boot: m.max.boot, jeu: m.max.jeu, mort: m.max.mort || 0 }, (m.max.boot || 0) <= 4 && (m.max.jeu || 0) <= 4 && (m.max.mort || 0) <= 4);
  verifie('échantillons > 4 couleurs hors passage', m.hors4, m.hors4 === 0);
  console.log('   couleurs jeu : ' + coul('jeu').join(', ') + ' ; boot : ' + coul('boot').join(', '));
  console.log('   couleurs passage : ' + coul('passage').length + ' (' + coul('passage').join(', ') + ')');
  verifie('nouveautés (section, temps de vague)', s.nouveautes.map(n => n.n + '@' + n.t), s.nouveautes.length === 3);
  verifie('première grosse explosion (vt)', s.premiereExplosion, s.premiereExplosion > 0);
  console.log(`   morts ${s.morts}, score ${s.score}, tués ${s.compte.tues}, cellules ${s.compte.mange}, coupes ${s.compte.coupes}, tirs ${s.compte.tirs}, formations ${s.compte.formations}, grosses explosions ${s.compte.grosses}`);
  console.log(`   musique : audio ${s.audio}, pas ${s.musique.pas}, notes ${JSON.stringify(s.musique.notes)}`);
  console.log('   journal : ' + s.journal.filter(j => /nouveaute|soucoupe|mort|dore|passage|grosse|fin|formation/.test(j.e)).map(j => j.t + ' ' + j.e).join(' | '));
  console.log(`   temps réel ${r.mur.toFixed(1)} s ; captures :`);
  r.captures.forEach(c => console.log('     ' + c));
});
fs.writeFileSync(path.join(SORTIE, 'resultats.json'), JSON.stringify(res.map((r, i) => ({ profil: profils[i], ...r, s: { ...r.s, journal: r.s.journal } })), null, 1));
console.log('\n' + (ok ? 'BANC OK' : 'BANC EN ÉCHEC'));
process.exit(ok ? 0 : 1);
