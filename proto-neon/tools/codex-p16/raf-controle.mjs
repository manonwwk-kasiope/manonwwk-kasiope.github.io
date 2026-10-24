// Même contrôleur dans le navigateur et dans les diagnostics VM. Aucun pas avant la mesure.
export function installerRAF() {
  let id = 0, file = new Map();
  window.requestAnimationFrame = cb => { const k = ++id; file.set(k, cb); return k; };
  window.cancelAnimationFrame = k => file.delete(k);
  window.__R30RAF = { avancer(ts) { const lot = [...file.values()]; file.clear(); for (const cb of lot) cb(ts); return lot.length; } };
}
// Protocole public des pilotes ; aucun champ privé d'un module ni RNG consommé par le banc.
export function amorcerPartie({graine, pilote = 'bon'}) {
  const N = window.__N, S = window.__S;
  localStorage.clear(); S.jour = 20261017;
  S.reglages.actions = pilote === 'humain' ? 'auto' : 'doigts';
  // Avant même le reset : aucune vidéo ne doit entrer dans la mesure contrôlée.
  N.art.play = () => false;
  N.intro.skip(); N.journal.dump({vider:true});
  N.game.reset(graine, {depart:'plongee'});
  if (N.game.etat() === 'demarrage') N.game.dbg.etat('plongee');
  N.pilote.lancer(pilote); N.journal.actif(true); N.horloge.avancer();
  // Les films ont une horloge murale : ce banc de rejeu compare les panneaux fixes du jeu.
  for (const n of N.art.names()) N.art.stop(n);
  return {etat:N.game.etat(), image:S.frame, pas:N.horloge.pas(), temps:N.horloge.t()};
}
export function jouerControle({T, dessiner = true, simulation = false}) {
  const N = window.__N, S = window.__S, J = [];
  let images = 0;
  const borne = Math.ceil(T * N.R.perf.rejeuP16.facteurBorne / window.__DT);
  while (N.horloge.t() < T && N.game.etat() !== 'fin' && images < borne) {
    if (simulation) N.game.dbg.simuler(N.R.perf.rejeuP16.tranche);
    else window.__R30RAF.avancer(images * N.R.gestes.msParSeconde * window.__DT);
    images++;
    J.push(...N.journal.dump({vider:true}));
    if (window.__ERR.count) break;
  }
  return {ok:N.horloge.t() >= T || N.game.etat() === 'fin',
    raison:window.__ERR.count ? 'erreur de jeu' : (images >= borne ? 'borne du rejeu atteinte' : null), journal:J, images, dessiner, simulation,
    fin:{etat:N.game.etat(), t:N.horloge.t(), pas:N.horloge.pas(), image:S.frame, score:N.score.score, vague:N.dir.vague()}, err:window.__ERR};
}
