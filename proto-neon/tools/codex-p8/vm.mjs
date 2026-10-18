import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function sources(revision) {
  const files = revision ? execFileSync('git', ['ls-tree', '--name-only', revision + ':proto-neon/src'], { cwd: path.dirname(ROOT), encoding: 'utf8' }).trim().split('\n') : fs.readdirSync(path.join(ROOT, 'src'));
  return Object.fromEntries(files.filter(f => f.endsWith('.js')).sort().map(f => [f, revision ? execFileSync('git', ['show', revision + ':proto-neon/src/' + f], { cwd: path.dirname(ROOT), encoding: 'utf8' }) : fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')]));
}
export function monde(src, width = 844, height = 390, reduced = false) {
  const erreurs = [], stockage = new Map(), media = { matches: reduced };
  const c = { console: { log() {}, warn() {}, error(...a) { erreurs.push(a.map(String).join(' ')); } }, URL, URLSearchParams,
    location: { search: '?journal=1' }, navigator: { maxTouchPoints: width === 1440 ? 0 : 1 }, innerWidth: width, innerHeight: height,
    requestAnimationFrame() {}, addEventListener() {}, matchMedia: () => media, ART_SRC: {}, CINE_DISPO: [],
    MUSIQUE_BASE: 'musique/', MUSIQUE_EMBED: null, __N: {},
    localStorage: { getItem: k => stockage.get(k) ?? null, setItem: (k, v) => stockage.set(k, v), clear: () => stockage.clear() } };
  c.window = c; c.N = c.__N; vm.createContext(c);
  for (const [f, code] of Object.entries(src)) vm.runInContext(code, c, { filename: f });
  c.__S = c.__N.S;
  const dim = c.N.gfx.resize(width, height);
  c.N.S.view.w = dim.w; c.N.S.view.h = dim.h; c.N.S.phase = "play";
  return { c, N: c.N, S: c.N.S, erreurs, stockage };
}
export function partie(m, pilote, graine, maxT = 540) {
  const { c, N, S } = m;
  N.reseed(graine); N.game.reset(graine); // amorçage boot, avant le protocole des parties
  c.localStorage.clear(); S.jour = 20261017;
  if (S.reglages) S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
  N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
  N.journal.actif(true); N.horloge.avancer();
  let reel = 0, stagnant = 0, last = '', raison = 'borne', temps = 0;
  while (temps < maxT && reel < maxT * 4) {
    if (N.game.etat() === 'fin') { raison = 'fin'; break; }
    N.game.dbg.simuler(0.25); reel += 0.25; temps = N.horloge.t();
    const e = N.game.etat(), utile = [e, temps, S.ecran?.depuis, S.vol?.t].join('|');
    stagnant = utile === last ? stagnant + 0.25 : 0; last = utile;
    if (stagnant > 10) { raison = 'bloque:' + e; break; }
    if (c.__ERR.count) { raison = 'erreur'; break; }
  }
  if (N.game.etat() === 'fin') raison = 'fin';
  return { pilote, graine, raison, tempsJeu: N.horloge.t(), vague: N.dir.vague(), score: N.score.score, err: c.__ERR.count };
}
