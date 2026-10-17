/* tools/mesure/parties.mjs — les parties des pilotes (§ 4.10, refonte/lots/pilotes.md § 6), en mode simulé.
   Une partie = profil (paysage par défaut), __DT = 1/60, graine, pilote (et variante), profil vierge,
   S.jour = 20261017, N.game.reset(graine, {depart:'plongee'}), puis __N.game.dbg.simuler par tranches de
   0,25 s jusqu'au premier passage en `fin` ou 9 minutes de jeu. Le journal complet (N.journal.dump) et un
   échantillon par tranche sont gardés en cache dans sortie/parties/, par empreinte du bundle : les critères
   R-04, R-05, R-06, R-07, R-08, R-15, R-16, R-23, R-31, R-32, R-34, R-35 lisent les mêmes parties.

   partie(banc, {pilote, variante, graine, profil, actions, god, maxT}) -> {ok, raison, journal, echantillons, parPas, fin}
   lot(banc, pilote, graines, opts) -> [parties]           (une page par lot ; rechargée entre deux parties)
   resumer(partie) -> le résumé chiffré décrit dans LISEZMOI.md */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

export const INTERFACES_PARTIE = ['N.game.reset', 'N.game.etat', 'N.game.dbg.simuler', 'N.journal.dump', 'N.pilote.niveau', 'N.pilote.activer'];
export const PILOTES = ['inerte', 'tourneur', 'maladroit', 'kamikaze', 'humain', 'bon', 'expert', 'dieu'];
export const JOUR = 20261017;

function cle(banc, o) {
  return [banc.empreinte, o.profil || 'paysage', o.pilote, o.variante || '-', o.graine, o.actions || '-', o.god ? 'god' : '-', o.maxT || 540, o.jour || JOUR, o.reducedMotion ? 'reduit' : '-'].join('_');
}
function fichierCache(banc, o) { return path.join(banc.sortie, 'parties', cle(banc, o) + '.json.gz'); }

/* vérifie une fois par page que le banc des pilotes est possible ; rend la liste des absents */
export async function absentsPartie(session, o = {}) {
  const l = INTERFACES_PARTIE.slice();
  if (o.god) l.push('N.game.dbg.god');
  return session.absents(l);
}

async function jouerDans(session, o) {
  return session.eval(x => {
    try { return window.__MESURE.simulerPartie(x); }
    catch (e) { return { ok: false, raison: 'exception : ' + (e && e.message || e) }; }
  }, { pilote: o.pilote, variante: o.variante, graine: o.graine, actions: o.actions, god: o.god, maxT: o.maxT || 540, jour: o.jour || JOUR, pas: o.pas || 0.25, echantillon: o.echantillon });
}

export async function partie(banc, o, sessionPartagee = null) {
  const f = fichierCache(banc, o);
  if (banc.o.cache && !o.echantillon && fs.existsSync(f)) {
    try { return JSON.parse(zlib.gunzipSync(fs.readFileSync(f)).toString('utf8')); } catch (e) { /* cache abîmé : on rejoue */ }
  }
  const s = sessionPartagee || await banc.ouvrir(o.profil || 'paysage', { dt: 1 / 60, graine: o.graine, nodraw: true, query: { nodraw: '1' }, garderStockage: o.garderStockage, reducedMotion: o.reducedMotion });
  try {
    const abs = await absentsPartie(s, o);
    if (abs.length) return { ok: false, raison: 'interface ' + abs.join(', ') + ' absente', absents: abs };
    const r = await jouerDans(s, o);
    r.erreurs = await s.bilanErreurs();
    r.params = { ...o, empreinte: banc.empreinte };
    if (r.ok && banc.o.cache && !o.echantillon) {
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, zlib.gzipSync(JSON.stringify(r)));
    }
    return r;
  } finally { if (!sessionPartagee) await s.fermer(); }
}

/* un lot de parties d'un pilote ; s'arrête au premier « non mesurable » (interface absente) */
export async function lot(banc, pilote, graines, o = {}) {
  const out = [];
  for (const g of graines) {
    const r = await partie(banc, { ...o, pilote, graine: g });
    out.push(r);
    if (!r.ok && r.absents) break;
    if (banc.o.bavard) console.log(`   ${pilote}${o.variante ? '/' + o.variante : ''} graine ${g} : ${r.ok ? r.raison + ' à ' + (r.fin && r.fin.t || 0).toFixed(1) + ' s' : r.raison}`);
  }
  return out;
}

/* les parties enchaînées sur un même profil (R-36) : stockage gardé, une seule page */
export async function enchainees(banc, pilote, n, o = {}) {
  const s = await banc.ouvrir(o.profil || 'paysage', { dt: 1 / 60, graine: 1, nodraw: true, query: { nodraw: '1' }, garderStockage: true, viderStockage: true });
  const out = [];
  try {
    const abs = await absentsPartie(s, o);
    if (abs.length) return [{ ok: false, raison: 'interface ' + abs.join(', ') + ' absente', absents: abs }];
    await s.eval(() => { try { localStorage.clear(); } catch (e) { } });
    for (let i = 1; i <= n; i++) {
      const r = await jouerDans(s, { ...o, pilote, graine: i });
      r.numero = i; out.push(r);
      if (!r.ok) break;
    }
  } finally { await s.fermer(); }
  return out;
}

/* ---------------------------------------------------------------- le résumé d'une partie */
const ETATS_CYCLOPE = ['alerte', 'panneau', 'boss'];
export function resumer(p) {
  if (!p || !p.ok) return null;
  const J = p.journal || [], E = p.echantillons || [];
  const de = (type) => J.filter(x => x.type === type);
  const d = x => x.d || x;
  const vagues = de('vague').map(x => ({ t: x.t, ...d(x) }));
  const phases = de('phase').map(x => ({ t: x.t, ...d(x) }));
  const morts = de('mort').map(x => ({ t: x.t, ...d(x) }));
  const coups = de('coup').map(x => ({ t: x.t, ...d(x) }));
  const entreeCyclope = phases.find(x => x.evt === 'entree') || (E.find(x => ETATS_CYCLOPE.includes(x.etat)) ? { t: E.find(x => ETATS_CYCLOPE.includes(x.etat)).t } : null);
  const mortCyclope = phases.find(x => x.evt === 'mort');
  const victoire = !!mortCyclope || E.some(x => x.etat === 'victoire');
  const duree = p.fin ? p.fin.t : (E.length ? E[E.length - 1].t : 0);
  const finie = p.raison === 'fin';
  /* la vague en cours à l'instant t : d'après les entrées de vague du journal, sinon l'échantillon */
  const vagueA = t => { let v = 0; for (const x of vagues) if (x.evt === 'entree' && x.t <= t) v = x.n; if (!v) { const e = E.find(y => y.t >= t); v = e && e.vague || 0; } return v; };
  const entreeV = n => { const x = vagues.find(y => y.n === n && y.evt === 'entree'); return x ? x.t : null; };
  const nettoyeeV = n => { const x = vagues.find(y => y.n === n && y.evt === 'nettoyee'); return x ? x.t : null; };
  /* pics de vivants par vague (échantillons) */
  const pics = {};
  for (const e of E) if (e.vague) pics[e.vague] = Math.max(pics[e.vague] || 0, e.vivants || 0);
  const pilote = de('pilote').map(x => ({ t: x.t, ...d(x) }));
  return {
    graine: p.params && p.params.graine, pilote: p.params && p.params.pilote, variante: p.params && p.params.variante,
    raison: p.raison, finie, duree, victoire, defaite: finie && !victoire,
    gameOver: finie && !victoire ? duree : null,
    morts, premiereMort: morts[0] || null, coups,
    coupsV1: coups.filter(x => vagueA(x.t) <= 1).length + morts.filter(x => vagueA(x.t) <= 1).length,
    cyclopeAtteint: !!entreeCyclope, cyclopeBattu: !!mortCyclope,
    combatCyclope: entreeCyclope && mortCyclope ? mortCyclope.t - entreeCyclope.t : null,
    entreeCyclope: entreeCyclope ? entreeCyclope.t : null,
    vagues, phases, pics, entreeV, nettoyeeV, vagueA,
    cartes: de('carte').map(x => ({ t: x.t, ...d(x) })),
    lassos: de('lasso').map(x => ({ t: x.t, ...d(x) })),
    apogees: de('apogee').length, vols: de('vol').map(x => ({ t: x.t, ...d(x) })),
    arene: de('arene').map(x => ({ t: x.t, ...d(x) })),
    apparitions: de('apparition').map(x => ({ t: x.t, ...d(x) })),
    pilote, piloteConforme: pilote.some(x => x.evt === 'cap'), appels: p.appels || {},
    transitions: p.parPas ? p.parPas.transitions : [],
    score: p.fin ? p.fin.score : null, fin: p.fin, echantillons: E, parPas: p.parPas, erreurs: p.erreurs
  };
}

/* agrège la disponibilité d'un lot : {ok, raison, parties, resumes} */
export function bilanLot(l) {
  const ok = l.filter(p => p.ok);
  if (!ok.length) return { ok: false, raison: (l[0] && l[0].raison) || 'aucune partie jouée', parties: l, resumes: [] };
  return { ok: true, parties: ok, resumes: ok.map(resumer) };
}
