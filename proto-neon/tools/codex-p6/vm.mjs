import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export function monde({ ref, width = 844, height = 390 } = {}) {
  const erreurs = [], stockage = new Map();
  const c = { console: { log() {}, warn() {}, error(...a) { erreurs.push(a.map(String).join(' ')); } },
    URL, URLSearchParams, location: { search: '?journal=1' }, navigator: { maxTouchPoints: 1 },
    innerWidth: width, innerHeight: height, requestAnimationFrame() {}, cancelAnimationFrame() {},
    addEventListener() {}, matchMedia: () => ({ matches: false }), ART_SRC: {}, CINE_DISPO: [],
    MUSIQUE_BASE: 'musique/', MUSIQUE_EMBED: null, __N: {},
    localStorage: { getItem: k => stockage.get(k) ?? null, setItem: (k, v) => stockage.set(k, String(v)), clear: () => stockage.clear() } };
  c.window = c; c.N = c.__N; vm.createContext(c);
  const files = ref ? execFileSync('git', ['ls-tree', '--name-only', ref + ':proto-neon/src'], { cwd: path.dirname(ROOT), encoding: 'utf8' }).trim().split('\n')
    : fs.readdirSync(path.join(ROOT, 'src'));
  for (const f of files.filter(f => f.endsWith('.js')).sort()) {
    const source = ref ? execFileSync('git', ['show', ref + ':proto-neon/src/' + f], { cwd: path.dirname(ROOT), encoding: 'utf8' }) : fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
    vm.runInContext(source, c, { filename: f });
  }
  const N = c.__N, S = N.S;
  c.__S = S;
  N.gfx.resize(width, height); S.view.w = N.gfx.W; S.view.h = N.gfx.H;
  N.intro.reset(); N.game.reset(2084);
  return { c, N, S, erreurs };
}

export function partie(m, pilote, graine, maxT = 540) {
  const { c, N, S } = m;
  c.localStorage.clear(); S.jour = 20261017;
  if (S.reglages) S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
  N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
  N.journal.actif(true); N.horloge.avancer();
  let reel = 0;
  while (N.game.etat() !== 'fin' && N.horloge.t() < maxT && reel < maxT * 4 && !c.__ERR.count) {
    N.game.dbg.simuler(0.25); reel += 0.25;
  }
  const d = N.game.dbg();
  return { pilote, graine, tempsJeu: N.horloge.t(), vague: d.vague, score: d.score, etat: N.game.etat(), err: c.__ERR.count };
}
