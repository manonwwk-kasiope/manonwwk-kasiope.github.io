// Fonction sérialisable commune VM / Playwright ; protocole parties.mjs, sans dessin pendant le jeu.
export function partie({pilote, graine, maxT = 540, observer = true}) {
  const N = window.__N, S = window.__S;
  localStorage.clear(); S.jour = 20261017;
  if (S.reglages) S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
  N.intro.skip(); N.game.reset(graine, {depart:'plongee'});
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote); if (pilote === 'dieu') N.game.dbg.god(true);
  N.journal.actif(true);
  let reel = 0, stagnant = 0, last = '', raison = 'borne', temps = 0;
  const trace = [], tirsAvantV2 = [], pics = {};
  let longueurMax = 0, longueurMaxDepuis = null;
  const relever = (force = false) => {
    const n = N.dir.vague(), e = N.game.etat();
    const vivants = N.ennemis.list.filter(x => x.etat !== 'mort' && x.pv > 0 && x.type !== 'planeur').length;
    const tirs = N.ennemis.tirs.length;
    const t = N.horloge.t();
    const precedent = trace[trace.length-1], reelPas = N.horloge.reel();
    if (force || !precedent || precedent.n!==n || precedent.e!==e || precedent.vivants!==vivants || precedent.tirs!==tirs)
      trace.push({t, reel:reelPas, n, e, vivants, tirs});
    if (n === 1 && tirs && !tirsAvantV2.length) tirsAvantV2.push({t, reel:reelPas, tirs});
    if (['jeu','reapparition','mort'].includes(e) && n >= 1 && n <= 5) pics[n] = Math.max(pics[n] || 0, vivants);
    longueurMax = Math.max(longueurMax, S.player?.len || 0);
    if (longueurMaxDepuis === null && S.player?.len >= N.R.longueur.max) longueurMaxDepuis=t;
  };
  // Enveloppe d'observation publique : simulation originale intacte, mesures APRÈS chaque vrai pas.
  const update = N.game.update;
  if (observer) N.game.update = function(...args) { const r=update.apply(this,args); relever(); return r; };
  N.horloge.avancer();
  while (temps < maxT && reel < maxT * 4) {
    if (N.game.etat() === 'fin') { raison = 'fin'; break; }
    N.game.dbg.simuler(0.25); reel += 0.25; temps = N.horloge.t();
    const e = N.game.etat(), utile = [e, temps, S.ecran?.depuis, S.vol?.t].join('|');
    stagnant = utile === last ? stagnant + 0.25 : 0; last = utile;
    if (stagnant > 10) { raison = 'bloque:' + e; break; }
    if (window.__ERR.count) { raison = 'erreur'; break; }
  }
  if (observer) { relever(true); N.game.update=update; }
  if (N.game.etat() === 'fin') raison = 'fin';
  const d = N.game.dbg(), journal = N.journal.dump();
  return {pilote, graine, raison, fin:N.game.etat()==='fin', tempsJeu:N.horloge.t(), tempsCombat:d.t,
    tempsSimule:reel, vague:d.vague, score:d.score, morts:journal.filter(e=>e.type==='mort').map(e=>e.d),
    cartes:journal.filter(e=>e.type==='carte').map(e=>e.d), err:window.__ERR.count, erreurs:window.__ERR.sigs,
    journal, trace, pics, tirsAvantV2, longueurMax, longueurMaxDepuis};
}
