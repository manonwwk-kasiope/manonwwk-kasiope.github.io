/* tools/sons/mesure.mjs — le banc de la banque de sons.
   Ouvre tools/sons/ecoute.html dans Chromium (Playwright), qui rend chaque son hors ligne
   (OfflineAudioContext, 48 kHz) et le mesure : crete, RMS sur 100 ms, duree, parts d'energie
   au-dessus de 400 Hz et de 4 kHz, centroide, niveau en simulation de haut-parleur de telephone,
   emergence au-dessus de la piste de la proprietaire (bloc PLATEAU ramene a -14 dBFS RMS).
   Usage :
     node proto-neon/tools/sons/mesure.mjs              mesure -> tools/sons/mesures.json
     node proto-neon/tools/sons/mesure.mjs --calibrer   calcule CALIBRAGE (crete sur `niveau`), reecrit
                                                       le bloc de sons/banque.js, puis remesure
   Code de sortie : 0 si tous les criteres tiennent, 1 sinon. */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ICI = path.dirname(new URL(import.meta.url).pathname);
const RACINE = path.resolve(ICI, '../../..');               /* la racine du depot */
const BANQUE = path.resolve(ICI, '../../sons/banque.js');
const calibrer = process.argv.includes('--calibrer');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const serveur = http.createServer((req, res) => {
  const p = path.join(RACINE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(RACINE) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => serveur.listen(0, '127.0.0.1', r));
const URL_PAGE = `http://127.0.0.1:${serveur.address().port}/proto-neon/tools/sons/ecoute.html`;

const navigateur = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await navigateur.newPage({ viewport: { width: 1280, height: 900 } });
const erreurs = [];
page.on('console', m => { if (m.type() === 'error') erreurs.push(m.text()); });
page.on('pageerror', e => erreurs.push('pageerror: ' + e.message));

async function mesurer() {
  await page.goto(URL_PAGE, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__SONS && window.__SONS.rapport, null, { timeout: 120000 });
  return page.evaluate(() => { const r = window.__SONS.rapport; return JSON.parse(JSON.stringify(r)); });
}

let rapport = await mesurer();

if (calibrer) {
  const src = fs.readFileSync(BANQUE, 'utf8');
  const actuel = await page.evaluate(() => window.SONS_2975.calibrage);
  const cal = {};
  for (const s of rapport.sons) {
    if (!s.base) continue;
    const k = (actuel[s.cle] || 1) * Math.pow(10, (s.niveauVise - s.crete) / 20);
    cal[s.cle] = +k.toPrecision(4);
  }
  const lignes = Object.keys(cal).map(k => `    ${JSON.stringify(k)}: ${cal[k]}`).join(',\n');
  const bloc = `/* CALIBRAGE-DEBUT */\n  var CALIBRAGE = {\n${lignes}\n  };\n  /* CALIBRAGE-FIN */`;
  const neuf = src.replace(/\/\* CALIBRAGE-DEBUT \*\/[\s\S]*?\/\* CALIBRAGE-FIN \*\//, bloc);
  fs.writeFileSync(BANQUE, neuf);
  console.log(`calibrage ecrit : ${Object.keys(cal).length} facteurs`);
  rapport = await mesurer();
}

/* l'ecoute : chaque bouton de la page est presse (sons, variantes, sequences, telephone, musique) */
const avantClics = erreurs.length;
const nClics = await page.evaluate(async () => {
  const attendre = ms => new Promise(r => setTimeout(r, ms));
  const bs = [...document.querySelectorAll('button.jouer, #demos button, #tel, #mus button, #pans button')];
  for (const b of bs) { b.click(); await attendre(40); }
  await attendre(1500);
  return bs.length;
});
rapport.ecoute = { boutons: nClics, erreurs: erreurs.length - avantClics };
console.log(`ecoute : ${nClics} boutons presses, ${erreurs.length - avantClics} erreur(s)`);

rapport.date = new Date().toISOString();
rapport.erreursPage = erreurs;
fs.writeFileSync(path.join(ICI, 'mesures.json'), JSON.stringify(rapport, null, 1) + '\n');

const pad = (s, n) => String(s).padEnd(n);
console.log(pad('son', 22) + pad('crete', 8) + pad('visee', 7) + pad('rms100', 8) + pad('tel', 8) + pad('duree', 7) + pad('>400', 6) + pad('>4k', 6) + pad('centr', 7) + 'noeuds');
for (const s of rapport.sons) {
  console.log(pad(s.cle, 22) + pad(s.crete, 8) + pad(s.niveauVise, 7) + pad(s.rms100, 8) + pad(s.rms100Tel, 8) + pad(s.duree, 7) +
    pad(Math.round(s.p400 * 100) + '%', 6) + pad(Math.round(s.p4k * 100) + '%', 6) + pad(s.centroide, 7) + s.noeuds + (s.echecs.length ? '   x ' + s.echecs.join(' ; ') : ''));
}
console.log('\nmusique de reference :', JSON.stringify(rapport.musique));
console.log('global :', JSON.stringify(rapport.global));
for (const e of rapport.echecs) console.log('ECHEC  ' + e);
for (const a of rapport.avertissements) console.log('proches ' + a);
if (erreurs.length) console.log('erreurs de la page :', erreurs);
console.log(`\n${rapport.sons.length} rendus, ${rapport.echecs.length} echec(s), ${rapport.avertissements.length} paire(s) proches`);

await navigateur.close();
serveur.close();
process.exit(rapport.echecs.length || erreurs.length ? 1 : 0);
