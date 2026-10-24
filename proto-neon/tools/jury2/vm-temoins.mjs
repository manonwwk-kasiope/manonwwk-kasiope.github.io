/* Fonctions réelles, sans DOM, sans boot(), sans partie ni graphe Web Audio.
   Seuls les ports matériels audio et l'horloge sont injectés. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { sourceAjout } from './temoin.mjs';
import { preparerCas } from './banc.mjs';

export function chargerVM(ROOT, { sources = null, graine = 101 } = {}) {
  const disque = new Map(), erreurs = [];
  const c = { Math, Object, Array, Number, String, JSON, isFinite, isNaN, parseInt, parseFloat,
    console: { log() {}, warn() {}, error(...x) { erreurs.push(x.map(String).join(' ')); } },
    URL, URLSearchParams, location: { search: '?journal=1&auto=0' }, navigator: { maxTouchPoints: 1 },
    innerWidth: 844, innerHeight: 390, requestAnimationFrame() {}, cancelAnimationFrame() {}, addEventListener() {},
    matchMedia: () => ({ matches: false }), ART_SRC: {}, CINE_DISPO: [], MUSIQUE_BASE: 'musique/', MUSIQUE_EMBED: null,
    localStorage: { clear() { disque.clear(); }, getItem: k => disque.get(k) ?? null, setItem: (k, v) => disque.set(k, String(v)), removeItem: k => disque.delete(k) }, __N: {}, __DT: 1 / 60, __SEED: graine };
  c.window = c; c.N = c.__N; vm.createContext(c);
  sources ||= fs.readdirSync(path.join(ROOT, 'src')).filter(f => f.endsWith('.js')).sort().map(f => [f, fs.readFileSync(path.join(ROOT, 'src', f), 'utf8')]);
  vm.runInContext('(function(){var N=window.__N;' + sources.map(([f,s]) => '/* ' + f + ' */\n' + s).join('\n') + '\n})();', c);
  const N = c.N, S = N.S; c.__S = S;
  // Effets du boot nécessaires à la logique, sans DOM ni boucle de rendu.
  N.reseed(graine); N.gfx.init(null); const r = N.gfx.resize(844, 390);
  S.view.w = r.w; S.view.h = r.h; S.view.safe = { l: 0, t: 0, r: 0, b: 0 };
  N.intro.reset(); N.game.reset(S.seed);
  return { c, N, disque, erreurs };
}

export function monde(ROOT, mode = 'synchro', { ajout = sourceAjout(), preparation = preparerCas } = {}) {
  const { c, N, disque, erreurs } = chargerVM(ROOT);
  const canaux = { musique: false, effets: false };
  let t = 10.125, id = 'fixture', origine = 0;
  const transport = () => ({ id, t, source: 'audio', latence: .1 });
  Object.assign(N.music, {
    context: () => ({ state: 'running', currentTime: t + 100, baseLatency: .1, outputLatency: 0 }),
    // Le curseur externe représente une autre version : 31 utilise tr.rythme.
    transport: () => ({ id: 'original', t: t * 2 + 70, rythme: transport() }),
    beat: () => ({ phase: ((t - origine) / .5) % 1 }), tempo: () => 120,
    mute(a, b) { if (typeof a === 'string') canaux[a] = !!b; else canaux.musique = canaux.effets = !!a; },
    muted: a => canaux[a], start() {}, stop() {}, resetTempo() {}, piste: () => ({})
  });
  c.__JURY_TEMOIN_MODE = mode;
  vm.runInContext(ajout, c, { filename: '99-jury2-temoin.js' });
  function propre() { assert.equal(c.__ERR.count, 0, JSON.stringify(c.__ERR)); assert.deepEqual(erreurs, []); }
  function preparer(genre = 'audio-probe') {
    c.cas = { genre, graine: 101, pilote: 'inerte' };
    vm.runInContext('(' + preparation.toString() + ')(cas)', c); propre();
  }
  function avancer(date, morceau = id, debutTemps = origine) {
    t = date; id = morceau; origine = debutTemps;
    N.rythme.update(0, false); N.ennemis.update(N.R.temps.h); propre();
  }
  function grille() {
    N.rythme.carte({ catalogue: { morceaux: [
      { id: 'fixture', bpm: 120, barres: [0, 2, 4, 6, 8, 10, 12, 14, 16] },
      { id: 'autre', bpm: 120, barres: [.2, 2.2, 4.2, 6.2, 8.2, 10.2, 12.2, 14.2] }
    ] } });
    N.ennemis.reset(); N.rythme.reset(); avancer(10.125);
  }
  return { c, N, disque, canaux, preparer, avancer, grille, propre };
}
