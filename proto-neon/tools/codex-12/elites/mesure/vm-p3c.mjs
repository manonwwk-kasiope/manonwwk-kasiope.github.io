/* codex-p3b : Node/VM sans DOM. Validation préalable sur e1bdc6f obligatoire. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '../..');
const git = (...args) => execFileSync('git', args, { cwd: path.dirname(ROOT), encoding: 'utf8', maxBuffer: 30 * 1024 * 1024 });
export function sources(ref) {
  const names = ref ? git('ls-tree', '--name-only', ref + ':proto-neon/src').trim().split('\n') : fs.readdirSync(path.join(ROOT, 'src'));
  return names.filter(n => n.endsWith('.js')).sort().map(n => [n, ref ? git('show', ref + ':proto-neon/src/' + n) : fs.readFileSync(path.join(ROOT, 'src', n), 'utf8')]);
}
export function monde(src, graine = 1) {
  const stockage = new Map(), erreurs = [];
  const c = { console: { log() {}, warn() {}, error(...a) { erreurs.push(a.map(String).join(' ')); } }, URL, URLSearchParams,
    location: { search: '?journal=1' }, navigator: { maxTouchPoints: 1 }, innerWidth: 844, innerHeight: 390,
    requestAnimationFrame() {}, addEventListener() {}, matchMedia: () => ({ matches: false }), ART_SRC: {}, CINE_DISPO: [],
    MUSIQUE_BASE: 'musique/', MUSIQUE_EMBED: null, __N: {}, __SEED: graine, __DT: 1 / 60,
    localStorage: { getItem: k => stockage.get(k) ?? null, setItem: (k,v) => stockage.set(k,String(v)), removeItem: k => stockage.delete(k), clear: () => stockage.clear() } };
  c.window = c; c.N = c.__N; vm.createContext(c);
  for (const [f, code] of src) vm.runInContext(code, c, { filename: f });
  c.__S = c.__N.S; c.__N.gfx.resize(844, 390);
  c.__S.view.w = c.__N.gfx.W; c.__S.view.h = c.__N.gfx.H;
  c.__N.reseed(graine); c.__N.intro.reset(); c.__N.game.reset(c.__S.seed);
  return { c, N: c.__N, S: c.__S, erreurs };
}
export function partie(src, pilote, graine) {
  const {c,N,S,erreurs} = monde(src, graine);
  c.localStorage.clear(); S.jour = 20261017; S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
  N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
  N.journal.actif(true); N.horloge.avancer();
  let reel = 0, stagnant = 0, last = '', raison = 'borne';
  while (N.horloge.t() < 540 && reel < 2160) {
    if (N.game.etat() === 'fin') { raison = 'fin'; break; }
    N.game.dbg.simuler(0.25); reel += 0.25;
    const utile = [N.game.etat(), N.horloge.t(), S.ecran?.depuis, S.vol?.t].join('|');
    stagnant = utile === last ? stagnant + 0.25 : 0; last = utile;
    if (stagnant > 10) { raison = 'bloque:' + N.game.etat(); break; }
    if (c.__ERR.count) { raison = 'erreur'; break; }
  }
  if (N.game.etat() === 'fin') raison = 'fin';
  const d = N.game.dbg();
  return { pilote, graine, tempsJeu: N.horloge.t(), tempsCombat: d.t, vague: d.vague, score: d.score, raison, err: c.__ERR.count, erreursConsole: erreurs,
    journal: N.journal.dump(), journalSha256: crypto.createHash('sha256').update(JSON.stringify(N.journal.dump())).digest('hex') };
}
