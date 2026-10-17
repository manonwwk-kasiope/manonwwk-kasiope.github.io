/* Même parcours dans les vraies sources VM et le bundle navigateur. Aucune écriture privée. */
export function parcours(N, S, option = {}) {
  const controles = [], trace = [];
  function verifier(nom, valeur, attendu, ok) { controles.push({ nom, valeur: JSON.parse(JSON.stringify(valeur)), attendu, ok }); }
  const copie = v => JSON.parse(JSON.stringify(v));
  const etat = () => ({ etat: N.game.etat(), joueuse: N.joueuse.etat, vague: N.dir.vague(), phase: N.dir.phase(),
    longueur: N.joueuse.len(), cartes: copie(N.cartes.prises()), armes: copie(N.arsenal.armes()), score: N.score.score, vies: N.score.vies, marque: N.score.marque?.() ?? null });
  function avancer(s) { N.game.dbg.simuler(s); }
  function tap(action) {
    const r = N.ui.finActions()[action];
    S.input.taps.push({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
    avancer(N.R.temps.h); S.input.taps.length = 0;
  }
  function mortFinale() {
    let sec = 0;
    while (N.game.etat() !== 'fin' && sec < 20) {
      if (N.joueuse.etat === 'vivant' || N.game.etat() === 'reapparition') N.joueuse.tuer('mur', { genre: 'decor', type: 'mur', id: null });
      avancer(0.25); sec += 0.25;
    }
    trace.push(etat());
    verifier('mort → fin', N.game.etat(), 'fin', N.game.etat() === 'fin');
  }
  N.intro.skip(); N.game.reset(7, { depart: 'jeu' }); N.horloge.avancer(); N.journal.actif(true);
  N.cartes.choisir('croissance'); N.cartes.choisir('canon'); N.cartes.choisir('canon'); N.cartes.choisir('bouclier');
  N.cartes.choisir('grappe');
  N.dir.demarrer(3);
  if (option.boss) N.game.dbg.boss();
  const debut = etat(); trace.push(debut);
  N.joueuse.grandir(1); // la longueur de la mort ne doit pas devenir celle de reprise
  N.score.ajouter(1234);
  mortFinale();
  if (!N.ui.finActions) return { debut, trace, controles, absence: 'N.ui.finActions', journal: N.journal.dump(), err: window.__ERR };
  const gardes = N.R.ecrans.fin.garde;
  const avantGarde = N.game.etat(); tap('continuer');
  verifier('garde : toucher précoce refusé', N.game.etat(), avantGarde, N.game.etat() === avantGarde);
  avancer(gardes);
  const rGarde = N.ui.finActions().continuer;
  S.input.taps.push({ x: rGarde.x + rGarde.w / 2, y: rGarde.y + rGarde.h / 2, t0: 0, t1: 1000 });
  avancer(N.R.temps.h); S.input.taps.length = 0;
  verifier('doigt posé avant la garde refusé', N.game.etat(), 'fin', N.game.etat() === 'fin');
  const geom = N.ui.finActions(), sf = S.view.safe, g = N.gfx;
  for (const nom of ['continuer', 'rejouer']) {
    const r = geom[nom], min = N.R.ecrans.fin.boutonPt;
    verifier(nom + ' cible pt', [r.w * g.PX, r.h * g.PX], '≥ ' + min, r.w * g.PX >= min && r.h * g.PX >= min);
    verifier(nom + ' zone sûre', r, 'dans S.view.safe', r.x >= sf.l && r.y >= sf.t && r.x + r.w <= g.W - sf.r && r.y + r.h <= g.H - sf.b);
  }
  verifier('cibles séparées', geom.continuer.x + geom.continuer.w <= geom.rejouer.x, true, geom.continuer.x + geom.continuer.w <= geom.rejouer.x);
  S.input.taps.push({ x: 0, y: 0 }); avancer(N.R.temps.h); S.input.taps.length = 0;
  verifier('hors cible : aucune relance', N.game.etat(), 'fin', N.game.etat() === 'fin');
  if (option.expiration) {
    const comptes = [N.ui.finActions().restant];
    for (let i = N.R.ecrans.fin.continuer.de; i > N.R.ecrans.fin.continuer.a; i--) { avancer(1); comptes.push(N.ui.finActions().restant); }
    verifier('décompte complet', comptes, '9 → 0', comptes.join(',') === '9,8,7,6,5,4,3,2,1,0');
    verifier('zéro encore proposé', N.ui.finActions().disponible, true, N.ui.finActions().disponible);
    avancer(1); tap('continuer');
    verifier('délai expiré : refus', N.game.etat(), 'fin', N.game.etat() === 'fin');
  } else {
    tap('continuer'); const apres = etat(); trace.push(apres);
    verifier('CONTINUER → jeu', apres.etat, option.boss ? 'boss' : 'jeu', apres.etat === (option.boss ? 'boss' : 'jeu'));
    verifier('joueuse vivante', apres.joueuse, 'vivant', apres.joueuse === 'vivant');
    verifier('longueur début de vague', apres.longueur, debut.longueur, apres.longueur === debut.longueur);
    verifier('cartes conservées', apres.cartes, debut.cartes, JSON.stringify(apres.cartes) === JSON.stringify(debut.cartes));
    verifier('armes début de vague', apres.armes, debut.armes, JSON.stringify(apres.armes) === JSON.stringify(debut.armes));
    verifier('vies', apres.vies, N.R.vies.continuer.vies, apres.vies === N.R.vies.continuer.vies);
    verifier('score', apres.score, N.R.vies.continuer.score, apres.score === N.R.vies.continuer.score);
    verifier('vague conservée', apres.vague, debut.vague, apres.vague === debut.vague);
    verifier('marque', apres.marque, 'C', apres.marque === 'C');
    N.score.ajouter(2345); mortFinale(); avancer(gardes);
    const record = N.score.classement().find(r => r.score === 2345);
    verifier('record C', record?.marque ?? null, 'C', record?.marque === 'C');
    const classeAvant = JSON.stringify(N.score.classement());
    N.score.profil.charger();
    verifier('record C persisté/rechargé', N.score.classement(), JSON.parse(classeAvant), JSON.stringify(N.score.classement()) === classeAvant);
    const profilAvant = JSON.stringify(N.score.profil.charger());
    N.score.terminer(false);
    verifier('fin idempotente', JSON.stringify(N.score.profil.charger()), profilAvant, JSON.stringify(N.score.profil.charger()) === profilAvant);
    verifier('seconde offre refusée', N.ui.finActions().disponible, false, !N.ui.finActions().disponible);
    const score = N.score.score; tap('continuer');
    verifier('second toucher refusé', etat().etat, 'fin', N.game.etat() === 'fin' && N.score.score === score);
    verifier('seconde API refusée', N.score.continuer(), false, !N.score.continuerPossible());
  }
  // R-35 : même validation que le critère officiel, REJOUER par défaut, sans briefing.
  S.input.valider = true; avancer(N.R.temps.h); S.input.valider = false;
  let relance = N.R.temps.h; const etats = [N.game.etat()];
  while ((N.game.etat() !== 'jeu' || N.joueuse.etat !== 'vivant') && relance < 2) { avancer(N.R.temps.h); relance += N.R.temps.h; etats.push(N.game.etat()); }
  verifier('R-35 relance s', relance, '< 2', relance < 2 && N.game.etat() === 'jeu' && N.joueuse.etat === 'vivant');
  verifier('R-35 sans briefing', [...new Set(etats)], 'aucun briefing/ouverture', !etats.includes('briefing') && !etats.includes('ouverture'));
  verifier('REJOUER réarme continuation', N.score.marque(), '', N.score.marque() === '');
  verifier('zéro erreur', window.__ERR.count, 0, window.__ERR.count === 0);
  return { debut, trace, controles, relance, journal: N.journal.dump(), erreurs: copie(window.__ERR), conforme: controles.every(c => c.ok) };
}
