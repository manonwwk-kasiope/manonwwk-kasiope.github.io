// Instrument sans DOM : vraies sources dans l'ordre de build.mjs ; seul boot() n'est pas appelé.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../..');
export function monde(ref = null, width = 844, height = 390) {
  const html = ref ? execFileSync('git', ['show', `${ref}:proto-neon/index.html`], { cwd: ROOT, maxBuffer: 16000000 }).toString() : fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const bundle = html.match(/<script>([\s\S]*)<\/script>/)[1];
  const files = ref ? execFileSync('git', ['ls-tree', '-r', '--name-only', ref, 'proto-neon/src'], { cwd: path.resolve(ROOT, '..') }).toString().trim().split('\n').filter(f => f.endsWith('.js')).sort()
    : fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).sort().map(f => 'proto-neon/src/' + f);
  const sources = files.map(f => {
    const source = ref ? execFileSync('git', ['show', `${ref}:${f}`], { cwd: ROOT, maxBuffer: 9000000 }).toString() : fs.readFileSync(path.join(ROOT, '../', f), 'utf8');
    if (!bundle.includes(source)) throw Error(`Le bundle ne contient pas la source exacte : ${f}`);
    return `/* ===== ${path.basename(f)} ===== */\n` + source;
  });
  const script = bundle.slice(0, bundle.indexOf('/* ===== 00-pal.js ===== */')) + sources.join('\n') + '\n})();';
  const erreurs = [], storage = new Map();
  const c = { console: { log() {}, warn() {}, error(...xs) { erreurs.push(xs.map(String).join(' ')); } }, URL, URLSearchParams,
    location: { search: '?journal=1' }, navigator: { maxTouchPoints: 1 }, innerWidth: width, innerHeight: height,
    requestAnimationFrame() {}, cancelAnimationFrame() {}, addEventListener() {}, matchMedia: () => ({ matches: false }),
    localStorage: { clear() { storage.clear(); }, getItem(k) { return storage.get(k) ?? null; }, setItem(k, v) { storage.set(k, String(v)); } }, __N: {}, __DT: 1 / 60, __SEED: 1 };
  c.window = c; vm.createContext(c); vm.runInContext(script, c, { filename: ref || 'index.html' });
  c.__S = c.__N.S;
  const N = c.__N, S = N.S, size = N.gfx.resize(width, height);
  S.view.w = size.w; S.view.h = size.h;
  // boot() fait ce reset après le redimensionnement, avant la première rAF (coupée au banc).
  N.game.reset(1);
  return { c, N, S, erreurs };
}
// Fonction autonome, partagée par VM et Playwright ; protocole de tools/pilotes/parties.mjs.
export function partie({ pilote, graine, maxT = 540 }) {
  const N = window.__N, S = window.__S;
  localStorage.clear(); S.jour = 20261017;
  if (S.reglages) S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
  N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
  N.journal.actif(true); N.horloge.avancer();
  let reel = 0, temps = 0, stagnant = 0, last = '', raison = 'borne', bossVu = false;
  while (temps < maxT && reel < maxT * 4) {
    if (N.game.etat() === 'fin') { raison = 'fin'; break; }
    N.game.dbg.simuler(0.25); reel += 0.25; temps = N.horloge.t();
    bossVu ||= N.game.etat() === 'boss';
    const utile = [N.game.etat(), temps, S.ecran?.depuis, S.vol?.t].join('|');
    stagnant = utile === last ? stagnant + 0.25 : 0; last = utile;
    if (stagnant > 10) { raison = 'bloque:' + N.game.etat(); break; }
    if (window.__ERR.count) { raison = 'erreur'; break; }
  }
  if (N.game.etat() === 'fin') raison = 'fin';
  const d = N.game.dbg(), journal = N.journal.dump();
  const morts = journal.filter(e => e.type === 'mort').map(e => e.d);
  return { pilote, graine, raison, tempsJeu: N.horloge.t(), vague: d.vague, score: d.score,
    bossVu, morts, mortsCyclope: morts.filter(m => m.auteur === 'cyclope').length,
    err: window.__ERR.count, erreurs: window.__ERR.sigs, journal };
}
export function jouerVM(ref, pilote, graine) {
  const m = monde(ref); m.c.args = { pilote, graine };
  const r = vm.runInContext(`(${partie.toString()})(args)`, m.c);
  return { ...JSON.parse(JSON.stringify(r)), erreursConsole: m.erreurs };
}
export function jouerIsole(ref, pilote, graine) {
  return JSON.parse(execFileSync(process.execPath, [fileURLToPath(import.meta.url), '--partie', ref || 'courant', pilote, String(graine)], { maxBuffer: 32000000 }).toString());
}
if (process.argv.includes('--partie')) {
  const i = process.argv.indexOf('--partie');
  const [ref, pilote, graine] = process.argv.slice(i + 1);
  console.log(JSON.stringify(jouerVM(ref === 'courant' ? null : ref, pilote, +graine)));
}
if (process.argv.includes('--valider')) {
  const attendu = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/pilotes/sortie.json')));
  const controles = [];
  for (const cas of attendu.cas.filter(c => c.pilote === 'inerte').slice(0, 10)) {
    const r = jouerIsole('e1bdc6f', cas.pilote, cas.graine);
    const identique = ['tempsJeu', 'vague', 'score'].every(k => r[k] === cas[k]);
    controles.push({ pilote: cas.pilote, graine: cas.graine, identique,
      attendu: [cas.tempsJeu, cas.vague, cas.score], mesure: [r.tempsJeu, r.vague, r.score], err: r.err, erreursConsole: r.erreursConsole });
    console.log(JSON.stringify(controles.at(-1)));
  }
  fs.writeFileSync(path.join(HERE, 'validation-vm.json'), JSON.stringify({ reference: 'e1bdc6f', controles }, null, 2));
  if (controles.length < 10 || controles.some(c => !c.identique || c.err || c.erreursConsole.length)) process.exitCode = 1;
}
