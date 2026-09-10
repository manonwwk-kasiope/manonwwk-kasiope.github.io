// Batterie de non-régression SNAKE 2030.
//   NODE_PATH=/opt/node22/lib/node_modules /opt/node22/bin/node tools/test/run.mjs nr
// « nr » lance banc.mjs, diag.mjs, son-ios.mjs et rail2.mjs (serveur http-server -p 8112 lancé si absent),
// écrit tools/test/baseline.json à la première exécution et sort avec un code non nul si un seuil échoue.
//
// CE QUI EST MESURÉ, ET POURQUOI
// - Performance : banc.mjs, une scène FIGÉE (population d'ennemis, longueur du serpent, position, résolution,
//   zoom et phase imposés), en quatre régimes et sur deux profils, sans limiteur de cadence. Le build de
//   référence est tiré de l'historique git (dernier commit) et mesuré DANS LA MÊME FENÊTRE que le build
//   courant, en alternance, parce que le coût absolu d'une image dépend de la machine et de son état.
//   Seuils : courant ≤ 1,10 × référence (p50) et ≤ 1,15 × référence (p95), régime par régime ; scène
//   identique exigée (clé de scène) ; sur iPhone, p95 ≤ 16,7 ms (60 images par seconde tenues).
// - Erreurs : banc et diag exigent 0 pageerror, 0 console.error et window.__ERR.count === 0.
// - Pilotage : rail2.mjs — latence de virage sur treillis ortho p90 ≤ 40 images, max ≤ 45, aucune demande
//   au-delà de 700 ms de jeu, 20/20 virages en ortho et en diagonale, médiane ≤ référence.
// - Son : son-ios.mjs — lecture effective et reprise après mise en arrière-plan.
//
// CE QUI N'EST PLUS UN SEUIL. diag.mjs joue une vraie partie avec un pilote automatique ; sa part d'images
// longues dépend de la façon dont le jeu se joue, donc elle bouge dès qu'un objectif change le jeu, sans
// qu'aucun pixel ne coûte plus cher. Mesuré sur G5 : le pilote tourne 2,6 fois plus, tue moins, laisse deux
// fois plus d'ennemis vivants, et la part passe de 5 % à 14 % alors qu'à scène identique le build rend
// aussi vite. diag reste dans la batterie pour les erreurs et comme relevé de suivi, sans seuil bloquant.
//
// Variables : S2030_URL (URL de base), S2030_BASELINE (chemin de la référence, défaut tools/test/baseline.json).
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const ROOT = path.resolve(HERE, '..', '..', '..');                       // racine du dépôt (le serveur sert /snake2030/index.html)
const BASE_URL = process.env.S2030_URL || 'http://127.0.0.1:8112/snake2030/index.html';
const BASELINE = process.env.S2030_BASELINE || path.join(HERE, 'baseline.json');
const HTTP_SERVER = '/opt/node22/lib/node_modules/http-server/bin/http-server';
const sleep = ms => new Promise(r => setTimeout(r, ms));
try { fs.mkdirSync(OUT, { recursive: true }); } catch (e) {}

async function up(url) { try { const r = await fetch(url, { signal: AbortSignal.timeout(3000) }); return r.ok; } catch (e) { return false; } }
async function ensureServer() {
  if (await up(BASE_URL)) return 'déjà actif';
  const u = new globalThis.URL(BASE_URL);
  if (!/^(127\.0\.0\.1|localhost)$/.test(u.hostname)) throw new Error('serveur injoignable : ' + BASE_URL);
  const port = u.port || '80';
  const child = spawn(process.execPath, [HTTP_SERVER, '-p', port, '-s'], { cwd: ROOT, detached: true, stdio: 'ignore', env: process.env });
  child.unref();
  for (let k = 0; k < 20; k++) { await sleep(400); if (await up(BASE_URL)) return 'lancé sur le port ' + port; }
  throw new Error('http-server ne répond pas sur ' + BASE_URL);
}

function runScript(name) {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(HERE, name)], { encoding: 'utf8', env: { ...process.env, S2030_URL: BASE_URL }, maxBuffer: 256 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
  const out = (r.stdout || '') + (r.stderr ? '\n[stderr]\n' + r.stderr : '');
  fs.writeFileSync(path.join(OUT, name.replace(/\.mjs$/, '') + '.log'), out);
  const lines = (r.stdout || '').trim().split('\n');
  let json = null;
  for (let i = lines.length - 1; i >= 0 && !json; i--) { const l = lines[i].trim(); if (l.startsWith('{')) { try { json = JSON.parse(l); } catch (e) {} } }
  console.log(`[run] ${name} → code ${r.status} en ${((Date.now() - t0) / 1000).toFixed(0)} s${json ? '' : ' (pas de JSON final)'}`);
  if (!json && r.stderr) console.log(r.stderr.slice(-800));
  return { code: r.status, json, secs: (Date.now() - t0) / 1000 };
}

function nr() {
  /* invariants.mjs garde les promesses faites à la joueuse — bouton et notice de plein écran (impossible
     sur iOS autrement), manche tactile, zoom de base, musique en flux, réglages persistés, difficulté,
     message de rotation en portrait, et sur bureau ni manche ni plein écran imposé. Elles étaient jusqu'ici
     relues à la main par le médiateur de chaque objectif ; une vérification qui dépend de quelqu'un qui
     pense à la faire est un rappel, pas une vérification. Son échec est rapporté à part, préfixé
     « invariants : », pour qu'on distingue une promesse rompue d'une régression de performance. */
  const R = { banc: runScript('banc.mjs'), diag: runScript('diag.mjs'), sonIos: runScript('son-ios.mjs'), rail2: runScript('rail2.mjs'), invariants: runScript('invariants.mjs') };
  const d = R.diag.json && R.diag.json.measured, s = R.sonIos.json, r2 = R.rail2.json && R.rail2.json.measured;
  const bc = R.banc.json && R.banc.json.measured;
  const fails = [], notes = [];
  if (!d) fails.push('diag sans résultat'); if (!s) fails.push('son-ios sans résultat'); if (!r2) fails.push('rail2 sans résultat');
  if (!bc) fails.push('banc sans résultat');
  // le banc est la mesure de performance qui fait foi (contenu constant) ; diag reste dans la batterie
  // pour les erreurs et pour un relevé indicatif de ce que devient une vraie partie
  const bancCur = {};
  if (bc && bc.profils) for (const [prof, P] of Object.entries(bc.profils)) {
    bancCur[prof] = {};
    for (const [id, m] of Object.entries(P.regimes)) bancCur[prof][id] = { ref: m.ref.p50, cur: m.cur.p50, ratio50: m.ratio50, ratio95: m.ratio95, sceneIdentique: m.sceneIdentique, cle: m.cur.cle };
  }
  const cur = {
    banc: bancCur,
    desk1440: d ? { pct33: d.desk1440.pct33, p99: d.desk1440.p99, p50: d.desk1440.p50, p95: d.desk1440.p95, n: d.desk1440.n } : null,
    iphone: d ? { pct33: d.iphone.pct33, p99: d.iphone.p99, p50: d.iphone.p50, p95: d.iphone.p95, n: d.iphone.n } : null,
    rail2: r2 ? { orthoMed: r2.ortho && r2.ortho.med, orthoN: r2.ortho && r2.ortho.n, diagMed: r2.diag && r2.diag.med, diagN: r2.diag && r2.diag.n } : null,
  };
  // seuils absolus
  if (d) for (const k of ['desk1440', 'iphone']) {
    const m = d[k];
    if (m.pageErrors !== 0) fails.push(`${k} pageErrors=${m.pageErrors} (${m.firstPageError})`);
    if (m.consoleErrors !== 0) fails.push(`${k} consoleErrors=${m.consoleErrors} (${m.firstConsoleError})`);
    if (m.errCount !== 0) fails.push(`${k} __ERR.count=${m.errCount}`);
  }
  /* SEUIL ABSOLU DE LA PARTIE PILOTÉE (G13) : diag.mjs juge désormais son p99 sur lui-même — bureau
     1440×900 comme iPhone, p99 ≤ 33 ms — au lieu de le comparer à baseline.json, c'est-à-dire à une
     autre machine à un autre instant. Ce verdict est celui de diag.mjs et il est rapporté ici ; la
     porte de performance de nr reste le banc, seule mesure à contenu constant : la partie pilotée
     change avec la façon dont le jeu se joue, et un objectif qui change le jeu déplacerait sa part
     d'images longues sans qu'un seul pixel ne coûte plus cher (mesuré sur G5 : 5 % → 14 %). */
  if (bc && Array.isArray(bc.fails)) for (const f of bc.fails) fails.push('banc ' + f);
  if (s && !s.pass) fails.push('son-ios : ' + JSON.stringify(s.measured && s.measured.checks));
  const inv = R.invariants.json;
  if (!inv) fails.push('invariants sans résultat');
  else if (!inv.pass) for (const f of ((inv.measured && inv.measured.fails) || ['échec sans détail'])) fails.push('invariants : ' + f);
  if (r2 && !(r2.ortho && r2.ortho.n >= 10)) fails.push('rail2 ortho non mesurable');
  // seuils G5 (rails réactifs) : latence de virage sur treillis ortho p90 ≤ 40 images, max ≤ 45, aucune demande au-delà
  // de 700 ms de jeu (42 images à 1/60 s) ; 20/20 virages détectés en ortho et en diagonale
  if (r2 && r2.ortho && r2.ortho.n) {
    if (!(r2.ortho.n === 20)) fails.push(`rail2 ortho n=${r2.ortho.n}/20`);
    if (!(r2.ortho.p90 <= 40)) fails.push(`rail2 ortho p90=${r2.ortho.p90} images > 40`);
    if (!(r2.ortho.max <= 45)) fails.push(`rail2 ortho max=${r2.ortho.max} images > 45`);
    const over = (r2.ortho.all || []).filter(v => v > 42).length;
    if (over) fails.push(`rail2 ortho : ${over} demande(s) > 700 ms de jeu (42 images)`);
    if (!(r2.diag && r2.diag.n === 20)) fails.push(`rail2 diag n=${r2.diag ? r2.diag.n : 0}/20`);
  }
  // référence
  let base = null, wroteBaseline = false;
  if (fs.existsSync(BASELINE)) {
    try { base = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch (e) { fails.push('baseline.json illisible'); }
  }
  // performance : le banc contre la référence, régime par régime et profil par profil. La scène doit être
  // la même des deux côtés (clé), sinon les chiffres ne sont pas comparables et on le signale.
  if (bc && bc.refCommit) notes.push(`banc : référence = build du commit ${bc.refCommit}, mesurée dans la même fenêtre que le build courant`);
  // la partie jouée par le pilote reste mesurée, mais sans seuil : elle dépend de la façon dont le jeu se
  // joue, qui change à chaque objectif. Elle est conservée comme relevé de suivi.
  if (d && base && base.desk1440) notes.push(`partie pilotée : bureau part>33ms ${d.desk1440.pct33} (réf ${base.desk1440.pct33}), p99 ${d.desk1440.p99} ; iPhone part ${d.iphone.pct33}, p99 ${d.iphone.p99}`);
  if (base && cur.rail2 && base.rail2 && base.rail2.orthoMed != null) {
    if (!(cur.rail2.orthoMed <= base.rail2.orthoMed)) fails.push(`rail2 ortho médiane=${cur.rail2.orthoMed} > base ${base.rail2.orthoMed}`);
  }
  if (!base && d && r2 && s) {
    const bl = { createdAt: new Date().toISOString(), url: BASE_URL, banc: bancCur, desk1440: cur.desk1440, iphone: cur.iphone, rail2: cur.rail2 };
    fs.writeFileSync(BASELINE, JSON.stringify(bl, null, 1));
    wroteBaseline = true; notes.push('baseline écrite : ' + BASELINE);
  }
  const unmeasurable = [R.banc, R.diag, R.sonIos, R.rail2].some(x => x.code === 2);
  const pass = fails.length === 0;
  const result = { pass, measured: { current: cur, baseline: base && { desk1440: base.desk1440, iphone: base.iphone, rail2: base.rail2 }, wroteBaseline, fails, notes,
    sonIos: s && s.measured && { playingAtMs: s.measured.playingAtMs, rms3to6: s.measured.rms3to6, resume: s.measured.resume && { runningAtMs: s.measured.resume.runningAtMs, okAtMs: s.measured.resume.okAtMs }, checks: s.measured.checks },
    codes: { banc: R.banc.code, diag: R.diag.code, sonIos: R.sonIos.code, rail2: R.rail2.code }, secs: +(R.banc.secs + R.diag.secs + R.sonIos.secs + R.rail2.secs).toFixed(0) },
    threshold: '0 pageerror, 0 console.error, __ERR.count === 0 ; banc (scène à contenu constant, référence = dernier commit mesuré dans la même fenêtre) : p50 ≤ 1,10 × référence et p95 ≤ 1,15 × référence par régime et par profil, scène identique, iPhone p95 ≤ 16,7 ms ; rail2 ortho médiane ≤ base, p90 ≤ 40, max ≤ 45, 0 > 42 images, ortho et diag 20/20 ; son-ios OK ; partie pilotée relevée et jugée par diag.mjs (p99 ≤ 33 ms sur bureau 1440×900 comme sur iPhone, seuil absolu depuis G13), le banc restant la porte de performance de nr' };
  fs.writeFileSync(path.join(OUT, 'nr-last.json'), JSON.stringify({ result, raw: R }, null, 1));
  for (const f of fails) console.log('[run] ÉCHEC :', f);
  for (const n of notes) console.log('[run]', n);
  console.log(JSON.stringify({ test: 'nr', ...result }));
  process.exit(pass ? 0 : (unmeasurable ? 2 : 1));
}

const mode = process.argv[2] || 'nr';
if (mode !== 'nr') { console.log('usage : run.mjs nr'); process.exit(2); }
console.log('[run] serveur :', await ensureServer(), BASE_URL);
nr();
