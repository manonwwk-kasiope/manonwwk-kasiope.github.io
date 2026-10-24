/* tools/voyage/banc.mjs — les deux voyages dans le VRAI jeu (index.html), de bout en bout, comme la propriétaire.
   1. ELLE : titre → JOUER → choix (toucher à gauche) → 1976 → 1982 → film 1987 → néon → victoire (raccourcie par
      dbg.etat) → films profondeur, warp, espace → 2975 (sauté) → fin → « LE PILOTE T'ATTEND » → écran de fin ;
   2. REJOUER (le vrai bouton) → titre → JOUER → choix (à droite) → LUI, même voyage → retrouvailles → teaser
      SNAKE 3019 → À SUIVRE → écran de fin ; profil : les deux finis.
   Films, 1976, 1982 et 2975 sont sautés ; le banc vérifie l'enchaînement, les films joués et zéro erreur.
   Usage : serveur http sur la racine du dépôt (port 8133), node build.mjs, puis node tools/voyage/banc.mjs [--sortie DOSSIER].
   Sortie 0 si tout passe. */
import fs from 'fs';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const SORTIE = arg('--sortie', '/tmp/voyage-banc'); fs.mkdirSync(SORTIE, { recursive: true });
const echecs = [];
function verifie(ok, quoi) { if (!ok) echecs.push(quoi); console.log((ok ? '  ok   ' : '  ÉCHEC ') + quoi); }
import { chromium, devices } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ ...devices['iPhone 13'], viewport: { width: 844, height: 390 } })).newPage();
const logs = []; page.on('pageerror', e => logs.push(e.message));
await page.addInitScript(() => { if (!sessionStorage.getItem('deja')) { localStorage.removeItem('snake2975.pilotes'); sessionStorage.setItem('deja', '1'); } });
await page.goto('http://127.0.0.1:8133/proto-neon/index.html');
await page.waitForFunction(() => window.__N && window.__N.game && window.__N.aventure);
const st = () => page.evaluate(() => ({ jeu: window.__N.game.etat(), etape: window.__N.aventure.etape ? window.__N.aventure.etape() : null }));
async function voyage(x, nom) {
  const journal = []; const note = async () => { const s = await st(); const k = s.jeu + '/' + s.etape; if (journal[journal.length - 1] !== k) journal.push(k); return s; };
  for (let i = 0; i < 160; i++) { const s = await note(); if (s.jeu === 'aventure') break;
    await page.evaluate(() => { const N = window.__N; if (N.intro && N.intro.skip) N.intro.skip(); });
    await page.touchscreen.tap(600, 200); await page.waitForTimeout(250); }
  for (let i = 0; i < 400; i++) { const s = await note(); if (s.jeu !== 'aventure') break;
    if (s.etape === 'choix') { await page.waitForTimeout(700); await page.screenshot({ path: `${SORTIE}/choix-${nom}.png` }); await page.touchscreen.tap(x, 200); await page.waitForTimeout(300); continue; }
    await page.evaluate(() => { const N = window.__N, et = N.aventure.etape();
      if (et === '1976' && N.terminal.actif()) N.terminal.skip(); else if (et === '1982' && N.arcade && N.arcade.actif()) N.arcade.skip(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); });
    await page.waitForTimeout(200); }
  await page.evaluate(() => window.__N.game.dbg.etat('victoire'));
  for (let i = 0; i < 700; i++) { const s = await note();
    if (s.etape === 'retrouvailles' || s.etape === 'teaser') { await page.waitForTimeout(1500); await page.screenshot({ path: `${SORTIE}/${s.etape}.png` }); }
    if (s.jeu === 'fin' || s.jeu === 'titre') break;
    await page.evaluate(() => { const N = window.__N, et = N.aventure.etape && N.aventure.etape();
      if (N.intro && N.intro.current && N.intro.current()) N.intro.skip();
      if (et === '2975') N.aventure.sauter(); else if (N.film && N.film.actif && N.film.actif()) N.film.sauter(); });
    await page.waitForTimeout(250); }
  const joues = await page.evaluate(() => window.__N.aventure.state().joues);
  console.log(nom, ':', journal.join(' | ')); console.log('  films :', joues.join(', '));
  return { journal, joues };
}
const v1 = await voyage(200, 'ELLE');
verifie(JSON.stringify(v1.joues) === JSON.stringify(['connexion-elle', 'fissure-elle', 'neon-elle', 'profondeur-elle', 'warp-elle', 'espace-elle', 'fin-elle', 'pilote-lui']), 'ELLE : films du voyage');
verifie(v1.journal.includes('aventure/2975') && v1.journal[v1.journal.length - 1] === 'fin/null', 'ELLE : 2975 puis l\'écran de fin');
/* REJOUER → titre → JOUER → choix (ELLE finie) → LUI */
await page.waitForTimeout(1500);
const fa = await page.evaluate(() => { const a = window.__N.ui.finActions(), r = window.__N.gfx.canvas().getBoundingClientRect(), p = window.__N.gfx.PX;
  return { disponible: a.disponible, pret: a.pret, x: r.left + (a.rejouer.x + a.rejouer.w / 2) * p, y: r.top + (a.rejouer.y + a.rejouer.h / 2) * p }; });
console.log('écran de fin :', JSON.stringify(fa)); await page.screenshot({ path: `${SORTIE}/fin-elle.png` });
for (let i = 0; i < 20 && (await st()).jeu === 'fin'; i++) { await page.touchscreen.tap(fa.x, fa.y); await page.waitForTimeout(400); }
const ap = await st(); verifie(!fa.disponible && ap.jeu === 'titre', `après le voyage : pas de CONTINUER, REJOUER mène au titre (${ap.jeu})`);
const v2 = await voyage(650, 'LUI');
verifie(JSON.stringify(v2.joues) === JSON.stringify(['connexion-lui', 'fissure-lui', 'neon-lui', 'profondeur-lui', 'warp-lui', 'espace-lui', 'fin-lui', 'retrouvailles', 'teaser-3019', 'asuivre']), 'LUI : films du voyage, retrouvailles, teaser, À SUIVRE');
const pr = await page.evaluate(() => window.__N.choix.profil());
verifie(pr.elle.fini && pr.lui.fini, `profil : les deux pilotes finis ${JSON.stringify(pr)}`);
const nerr = await page.evaluate(() => window.__ERR ? window.__ERR.count : 0);
verifie(nerr === 0 && logs.length === 0, `erreurs : __ERR ${nerr}, page ${logs.length}${logs.length ? ' : ' + logs.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\ntout passe');
process.exit(echecs.length ? 1 : 0);
