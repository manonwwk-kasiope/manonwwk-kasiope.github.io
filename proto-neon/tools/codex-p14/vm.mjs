import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const ICI = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(ICI, '../..');
export const dateParis = () => new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
export const hash = x => crypto.createHash('sha256').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex');
export function sources(ref) {
  const git = (...a) => execFileSync('git', a, { cwd: path.dirname(ROOT), encoding: 'utf8', maxBuffer: 30e6 });
  const names = ref ? git('ls-tree', '--name-only', ref + ':proto-neon/src').trim().split('\n') : fs.readdirSync(path.join(ROOT, 'src'));
  return names.filter(f => f.endsWith('.js')).sort().map(f => [f, ref ? git('show', ref + ':proto-neon/src/' + f) : fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')]);
}
export function sauver(nom, obj) { fs.writeFileSync(path.join(ICI, nom), JSON.stringify(obj, null, 2) + '\n'); }
export function chargerAvant() { return JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI, 'sources-avant.json.gz')))); }
export function compiler(src) { return new vm.Script('(function(){var N=window.__N;\n' + src.map(([f, s]) => '/* ' + f + ' */\n' + s).join('\n') + '\n})();'); }
export function monde(src = sources(), graine = 1, width = 844, height = 390) {
  const erreurs = [], stockage = new Map(), c = vm.createContext(vm.constants.DONT_CONTEXTIFY);
  Object.assign(c, { console: { log() {}, warn() {}, error(...a) { erreurs.push(a.map(String).join(' ')); } }, URL, URLSearchParams,
    location: { search: '?journal=1' }, navigator: { maxTouchPoints: width === 1440 ? 0 : 1 }, innerWidth: width, innerHeight: height,
    requestAnimationFrame() { return 0; }, cancelAnimationFrame() {}, addEventListener() {}, matchMedia: () => ({ matches: false }),
    ART_SRC: {}, CINE_DISPO: [], MUSIQUE_BASE: 'musique/', MUSIQUE_EMBED: null, __N: {}, __SEED: graine, __DT: 1 / 60,
    localStorage: { clear() { stockage.clear(); }, getItem(k) { return stockage.get(k) ?? null; }, setItem(k, v) { stockage.set(k, String(v)); }, removeItem(k) { stockage.delete(k); } } });
  c.window = c; c.N = c.__N;
  (src instanceof vm.Script ? src : compiler(src)).runInContext(c);
  const N = c.__N, S = N.S; c.__S = S;
  N.reseed(graine); N.gfx.init(null); const r = N.gfx.resize(width, height);
  S.view.w = r.w; S.view.h = r.h; S.view.safe = { l: 0, t: 0, r: 0, b: 0 };
  N.intro.reset(); N.game.reset(S.seed);
  return { c, N, S, erreurs };
}
// Même fonction sérialisée dans la VM et Playwright. Protocole officiel, aucune séquence sautée.
export function partie({ pilote, graine, maxT = 540 }) {
  const N = window.__N, S = window.__S;
  localStorage.clear(); S.jour = 20261017;
  if (S.reglages) S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
  N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
  N.journal.actif(true); N.horloge.avancer();
  let reel = 0, stagnant = 0, last = '', raison = 'borne';
  const echantillons = [];
  while (N.horloge.t() < maxT && reel < maxT * 4) {
    if (N.game.etat() === 'fin') { raison = 'fin'; break; }
    N.game.dbg.simuler(0.25); reel += 0.25;
    echantillons.push({ t: N.horloge.t(), len: S.player.len });
    const utile = [N.game.etat(), N.horloge.t(), S.ecran?.depuis, S.vol?.t].join('|');
    stagnant = utile === last ? stagnant + 0.25 : 0; last = utile;
    if (stagnant > 10) { raison = 'bloque:' + N.game.etat(); break; }
    if (window.__ERR.count) { raison = 'erreur'; break; }
  }
  if (N.game.etat() === 'fin') raison = 'fin';
  const d = N.game.dbg(), journal = N.journal.dump();
  return { pilote, graine, raison, tempsJeu: N.horloge.t(), tempsCombat: d.t, tempsSimule: reel, pas: N.horloge.pas(), vague: d.vague, score: d.score,
    etat: N.game.etat(), morts: journal.filter(e => e.type === 'mort').map(e => e.d), cartes: journal.filter(e => e.type === 'carte').map(e => e.d),
    err: window.__ERR.count, erreurs: window.__ERR.sigs, journal, echantillons };
}
export function jouer(src, pilote, graine) {
  const m = monde(src, graine); m.c.opts = { pilote, graine };
  const r = vm.runInContext('(' + partie.toString() + ')(opts)', m.c);
  return JSON.parse(JSON.stringify({ ...r, erreursConsole: m.erreurs }));
}
if (process.argv.includes('--valider')) {
  const refs = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/pilotes/sortie.json'))).cas;
  const script = compiler(sources('e1bdc6f')), cas = [];
  for (const a of refs.filter(r => r.graine === 1 || r.graine === 2 && ['bon', 'expert'].includes(r.pilote))) {
    const r = jouer(script, a.pilote, a.graine), champs = ['tempsJeu', 'vague', 'score', 'tempsCombat', 'tempsSimule'];
    const attendu = Object.fromEntries(champs.map(k => [k, a[k]])), obtenu = Object.fromEntries(champs.map(k => [k, r[k]]));
    cas.push({ pilote: a.pilote, graine: a.graine, attendu, obtenu, identique: champs.every(k => r[k] === a[k]) && r.etat === 'fin' && !r.err && !r.erreursConsole.length });
    console.log(JSON.stringify(cas.at(-1)));
  }
  sauver('validation-vm.json', { dateParis: dateParis(), ref: 'e1bdc6f', conformite: cas.length >= 10 && cas.every(c => c.identique), cas });
  if (!cas.every(c => c.identique)) process.exitCode = 1;
}
if (process.argv.includes('--figer-avant')) {
  if (fs.existsSync(path.join(ICI, 'sources-avant.json.gz'))) throw Error('Instantané avant déjà présent');
  fs.writeFileSync(path.join(ICI, 'sources-avant.json.gz'), zlib.gzipSync(JSON.stringify(sources())));
}
