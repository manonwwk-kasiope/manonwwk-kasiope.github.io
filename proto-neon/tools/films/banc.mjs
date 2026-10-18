/* tools/films/banc.mjs — les films de cine/ jouent-ils vraiment dans le jeu ?
   Le Chromium des essais ne lit pas le H.264 des films (Safari, si) : sans ce banc, les essais ne voient que les
   panneaux fixes de repli. Ce banc fait des copies VP9 de cine/*.mp4 dans tools/films/cine/ (ignoré par git),
   construit une copie du jeu qui les lit (CINE_BASE = "cine/"), puis, pour chaque film :
     - il joue (N.art.play) et l'image change au fil du temps (au moins 3 images distinctes sur 6 relevés) ;
     - la palette reste fermée (indices 0 à 15) ;
     - un film en boucle ne finit pas ; un film simple finit (N.art.ended) avant 7 s.
   Il vérifie aussi que l'écran titre joue l'affiche des deux pilotes, et capture l'écran titre.
   Usage (serveur http sur la racine du dépôt, port 8133) :
     node tools/films/banc.mjs [--seuls nom1,nom2] [--sortie DOSSIER]
   Sortie 0 si tout passe. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '../..');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 && i + 1 < process.argv.length ? process.argv[i + 1] : d; };
const SORTIE = arg('--sortie', '/tmp/films-banc');
const SEULS = arg('--seuls', '');
fs.mkdirSync(SORTIE, { recursive: true });

/* 1. les copies VP9 */
const SRC = path.join(RACINE, 'cine'), DST = path.join(ICI, 'cine');
fs.mkdirSync(DST, { recursive: true });
let noms = fs.readdirSync(SRC).filter(f => f.endsWith('.mp4')).map(f => f.slice(0, -4)).sort();
if (SEULS) noms = noms.filter(n => SEULS.split(',').includes(n));
for (const n of noms) {
  const s = path.join(SRC, n + '.mp4'), d = path.join(DST, n + '.mp4');
  if (fs.existsSync(d) && fs.statSync(d).mtimeMs >= fs.statSync(s).mtimeMs) continue;
  execFileSync('ffmpeg', ['-nostdin', '-y', '-v', 'error', '-i', s, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '34', '-row-mt', '1', '-deadline', 'realtime', '-an', d]);
  console.log(' copie VP9 ' + n);
}

/* 2. la copie du jeu qui lit tools/films/cine/ */
execFileSync('node', ['build.mjs', 'tools/films/index.html'], { cwd: RACINE });
const page = path.join(ICI, 'index.html');
fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace(/var CINE_BASE = "[^"]*"/, 'var CINE_BASE = "cine/"'));

/* 3. les relevés */
const echecs = [];
function verifie(ok, quoi) { if (!ok) echecs.push(quoi); console.log((ok ? '  ok   ' : '  ÉCHEC ') + quoi); }
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 } });
const erreurs = []; p.on('pageerror', e => erreurs.push(String(e)));
await p.goto('http://127.0.0.1:8133/proto-neon/tools/films/index.html');
await p.waitForFunction(() => window.__N && window.__N.art);
await p.evaluate(() => window.__N.art.load());
await p.waitForTimeout(1500);

for (const n of noms) {
  const r = await p.evaluate(async (n) => {
    const A = window.__N.art;
    if (!A.play(n)) return { joue: false };
    const sig = new Set(); let hors = 0, vus = 0;
    for (let k = 0; k < 6; k++) {
      await new Promise(r => setTimeout(r, 600));
      const f = A.get(n); if (!f || !f.data) continue;
      vus++; let h = 0;
      for (let i = 0; i < f.data.length; i += 61) { h = (h * 31 + f.data[i]) | 0; if (f.data[i] > 15) hors++; }
      sig.add(h);
    }
    let fini = A.ended(n), t = 3.6;
    while (!fini && t < 7.2) { await new Promise(r => setTimeout(r, 300)); t += 0.3; fini = A.ended(n); }
    A.stop(n);
    return { joue: true, images: sig.size, vus, hors, fini, t };
  }, n);
  /* les films en boucle : ceux marqués [1, …] dans CLIPS de 05-art.js */
  const boucle = /^(affiche|affiche-duo|briefing|victoire|defaite|defaite-elle|defaite-lui|pilote-elle|pilote-lui)$/.test(n);
  verifie(r.joue && r.images >= 3 && r.hors === 0 && (boucle ? !r.fini : r.fini),
    `${n} : ${r.joue ? `${r.images} images distinctes sur ${r.vus}, palette ${r.hors ? 'OUVERTE' : 'fermée'}, ${boucle ? (r.fini ? 'boucle FINIE' : 'boucle continue') : (r.fini ? 'fini à ' + r.t.toFixed(1) + ' s' : 'NE FINIT PAS')}` : 'ne joue pas'}`);
}

/* 4. l'écran titre joue l'affiche des deux pilotes */
if (noms.includes('affiche-duo')) {
  await p.evaluate(() => { const N = window.__N; N.game.update = () => N.ui.update(1 / 60); N.game.draw = () => N.ui.draw(); N.game.drawTop = () => {}; N.ui.ouvrir('titre'); });
  await p.waitForTimeout(2500); await p.screenshot({ path: path.join(SORTIE, 'titre-1.png') });
  await p.waitForTimeout(2500); await p.screenshot({ path: path.join(SORTIE, 'titre-2.png') });
  verifie(await p.evaluate(() => !window.__N.art.ended('affiche-duo')), 'écran titre : le film de l\'affiche des deux pilotes joue');
}
verifie(erreurs.length === 0, `erreurs de page ${erreurs.length}${erreurs.length ? ' : ' + erreurs.slice(0, 3).join(' | ') : ''}`);
await b.close();
console.log(`\ncaptures dans ${SORTIE}`);
console.log(echecs.length ? `\n${echecs.length} échec(s)` : '\ntout passe');
process.exit(echecs.length ? 1 : 0);
