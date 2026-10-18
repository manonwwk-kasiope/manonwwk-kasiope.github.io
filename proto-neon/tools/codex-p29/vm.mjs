// Diagnostic local seulement. Aucune source du jeu n'est modifiée.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../../..');
export const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const caches = new Map();
export function sources(ref) {
  if (!caches.has(ref)) {
    const files = git('ls-tree', '-r', '--name-only', ref, 'proto-neon/src').trim().split('\n').filter(f => f.endsWith('.js')).sort();
    const text = files.map(f => `// ${f}\n` + git('show', `${ref}:${f}`)).join('\n');
    caches.set(ref, new vm.Script(`'use strict'; (function(){ var N=window.__N; var ART_SRC={}, CINE_DISPO=[], CINE_BASE='cine/', MUSIQUE_BASE='musique/', MUSIQUE_EMBED=null;\n${text}\nwindow.__S=N.S; })();`, { filename: `${ref}.sources.js` }));
  }
  return caches.get(ref);
}
export function monde(ref, graine = 1) {
  const storage = new Map(), erreurs = [];
  const c = vm.createContext(vm.constants.DONT_CONTEXTIFY);
  Object.assign(c, { console: { log() {}, warn() {}, error(...a) { erreurs.push(a.map(String).join(' ')); } }, URL, URLSearchParams,
    location: { search: '?journal=1&nodraw=1' }, navigator: { maxTouchPoints: 1 }, innerWidth: 844, innerHeight: 390,
    requestAnimationFrame() {}, cancelAnimationFrame() {}, addEventListener() {}, matchMedia: () => ({ matches: false }),
    localStorage: { getItem: k => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, String(v)), removeItem: k => storage.delete(k), clear: () => storage.clear() },
    __N: {}, __SEED: graine, __DT: 1 / 60 });
  c.window = c; sources(ref).runInContext(c);
  const N = c.__N, S = N.S;
  const r = N.gfx.resize(844, 390); S.view.w = r.w; S.view.h = r.h;
  S.phase = 'play'; N.reseed(graine); N.game.reset(graine);
  return { c, N, S, erreurs };
}
// Fonction sérialisable, utilisée aussi dans le vérifieur Playwright.
export function partie({ pilote, graine, protocole = 'pilotes', diagnostic = false }) {
  const N = window.__N, S = window.__S;
  localStorage.clear(); S.jour = 20261017;
  if (S.reglages) S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
  N.intro.skip(); N.game.reset(graine, { depart: 'plongee' });
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
  N.journal.actif(true);
  const traces = [];
  if (diagnostic && window.__P29observer) window.__P29observer(N, S, traces);
  // La batterie arrête le pilote au premier passage fin/initiales.
  let fini = false;
  if (protocole === 'batterie') {
    const original = N.cam.update;
    N.cam.update = function (...a) {
      const r = original.apply(this, a), e = N.game.etat();
      if (!fini && (e === 'fin' || e === 'initiales')) { fini = true; N.pilote.arreter(); }
      return r;
    };
  }
  N.horloge.avancer();
  let reel = 0, stagnant = 0, last = '', raison = 'borne';
  const journal = [];
  while (N.horloge.t() < 540 && reel < 2160) {
    if (N.game.etat() === 'fin' || (protocole === 'batterie' && fini)) { raison = 'fin'; break; }
    N.game.dbg.simuler(0.25); reel += 0.25;
    // Vidage pour éviter la limite du journal : les événements sont tous conservés ici.
    journal.push(...N.journal.dump({ vider: true }));
    const utile = [N.game.etat(), N.horloge.t(), S.ecran?.depuis, S.vol?.t].join('|');
    stagnant = utile === last ? stagnant + 0.25 : 0; last = utile;
    if (stagnant > 10) { raison = 'bloque:' + N.game.etat(); break; }
    if (window.__ERR.count) { raison = 'erreur'; break; }
  }
  if (N.game.etat() === 'fin' || (protocole === 'batterie' && fini)) raison = 'fin';
  const d = N.game.dbg();
  return { pilote, graine, raison, tempsJeu: N.horloge.t(), tempsCombat: d.t, vague: d.vague, score: d.score, err: window.__ERR, morts: journal.filter(e => e.type === 'mort').map(e => ({ journalT: e.t, ...e.d })), journal, traces };
}
export function jouer(ref, pilote, graine, opts = {}) {
  const { c, erreurs } = monde(ref, graine);
  if (opts.diagnostic) vm.runInContext(fs.readFileSync(path.join(HERE, 'observer.js'), 'utf8'), c);
  c.__args = { pilote, graine, ...opts };
  const r = vm.runInContext(`(${partie.toString()})(__args)`, c);
  return JSON.parse(JSON.stringify({ ...r, erreurs }));
}
