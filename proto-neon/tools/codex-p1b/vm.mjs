import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { registreAttendu } from './registre-attendu.mjs';
export const here = path.dirname(fileURLToPath(import.meta.url));
export const root = path.resolve(here, '../..');
export function monde({ revision, avant = false, integration = false } = {}) {
  const erreurs = [], stockage = new Map();
  const c = { console: { log() {}, warn() {}, error(...a) { erreurs.push(a.map(String).join(' ')); } }, URL, URLSearchParams,
    location: { search: '?journal=1' }, navigator: { maxTouchPoints: 1 }, innerWidth: 844, innerHeight: 390,
    requestAnimationFrame() {}, addEventListener() {}, matchMedia: () => ({ matches: false }), ART_SRC: {}, CINE_DISPO: [],
    MUSIQUE_BASE: 'musique/', MUSIQUE_EMBED: null, __N: {}, __SEED: 1, __DT: 1 / 60,
    localStorage: { getItem: k => stockage.get(k) ?? null, setItem: (k,v) => stockage.set(k,String(v)), removeItem: k => stockage.delete(k), clear: () => stockage.clear() } };
  c.window = c; c.N = c.__N; vm.createContext(c);
  const ancien = avant ? JSON.parse(fs.readFileSync(path.join(here, 'avant-sources.json'))) : {};
  const noms = revision ? execFileSync('git', ['ls-tree','--name-only',revision + ':proto-neon/src'], { cwd: path.dirname(root), encoding: 'utf8' }).trim().split('\n') : fs.readdirSync(path.join(root,'src'));
  for (const f of noms.filter(f => f.endsWith('.js')).sort()) {
    let source = revision ? execFileSync('git', ['show', revision + ':proto-neon/src/' + f], { cwd: path.dirname(root), encoding: 'utf8' }) : ancien[f] ?? fs.readFileSync(path.join(root,'src',f),'utf8');
    if (integration && f === '03-socle.js') source = registreAttendu(source);
    vm.runInContext(source,c,{filename:f});
  }
  c.__S = c.__N.S; const r = c.__N.gfx.resize(844,390);
  c.__S.view.w = r.w; c.__S.view.h = r.h;
  return { c, N:c.__N, erreurs };
}
export function partie(m, pilote, graine) {
  const { c, N } = m, S = N.S;
  N.reseed(graine); N.intro.reset(); N.game.reset(graine);
  c.localStorage.clear(); S.jour = 20261017;
  if (S.reglages) S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
  N.intro.skip(); N.game.reset(graine,{ depart:'plongee' });
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
  N.journal.actif(true); N.horloge.avancer();
  let reel = 0;
  while (N.game.etat() !== 'fin' && N.horloge.t() < 540 && reel < 2160 && !c.__ERR.count) { N.game.dbg.simuler(0.25); reel += 0.25; }
  const d=N.game.dbg();
  return { pilote,graine,tempsJeu:N.horloge.t(),vague:d.vague,score:d.score,etat:N.game.etat(),err:c.__ERR.count,console:m.erreurs };
}
