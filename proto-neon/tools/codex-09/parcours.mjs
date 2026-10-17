// Même scénario dans Node et dans la page Playwright : aucune règle ni module remplacé.
export function parcours(N, S, rendre = () => { N.gfx.clear(0); N.game.draw(); N.game.drawTop(); }) {
  const controles = [], etats = [], films = [], mesures = [];
  const check = (nom, ok, valeur) => controles.push({ nom, ok: !!ok, valeur });
  const cle = () => [N.game.etat(), N.aventure.etape(), N.intro.current()].join('|');
  let dernier = '';
  function noter() {
    const k = cle(); if (k === dernier) return; dernier = k;
    etats.push({ etat: N.game.etat(), etape: N.aventure.etape(), film: N.intro.current(), horloge: N.horloge.t() });
  }
  function step() {
    const dt = N.horloge.avancer();
    N.game.update(dt === 0 && N.horloge.arretee() ? N.horloge.H : dt);
    N.fx.update(dt); N.cam.update(dt);
    S.input.any = false; S.input.taps.length = 0; S.input.valider = false; S.input.chiffre = 0;
    noter();
  }
  function avancer(sec) { for (let i = 0; i < Math.ceil(sec / N.horloge.H); i++) step(); }
  function attendre(fn, max = 90) { let i = 0; while (!fn() && i++ < Math.ceil(max / N.horloge.H)) step(); return fn(); }
  function toucher(x = N.gfx.W / 2, y = N.gfx.H / 2) {
    S.input.any = true; S.input.taps.push({ x, y }); step();
  }
  function capture(nom) {
    avancer(N.R.ecrans.ouverture.garde + N.horloge.H);
    rendre(); const b = N.gfx.buf(), couleurs = {}, info = N.music.info();
    let hash = 2166136261; for (const v of b) { couleurs[v] = (couleurs[v] || 0) + 1; hash = Math.imul(hash ^ v, 16777619) >>> 0; }
    mesures.push({ nom, etat: N.game.etat(), etape: N.aventure.etape(), pixels: b.length, empreinte: hash, couleurs, musique: info });
    check(nom + ' tampon non vide et palette', Object.keys(couleurs).length > 1 && Object.keys(couleurs).every(c => +c < N.pal.C.length), couleurs);
  }
  function sauterFilm() {
    const avant = N.aventure.etape(), nom = N.film.state().nom;
    avancer(N.R.ecrans.ouverture.garde + N.horloge.H);
    const st = N.film.state(); toucher();
    const sorti = N.aventure.etape() !== avant || !N.film.actif();
    const saute = sorti && st.t + N.horloge.H < st.duree;
    check('film sauté ' + avant, saute, { avant: st, apres: N.film.state(), etapeApres: N.aventure.etape() });
    films.push({ etape: avant, nom, tempsAvantToucher: st.t, duree: st.duree, etapeApres: N.aventure.etape(), saute });
    step();
  }
  N.reseed(1); N.game.reset(1); N.journal.actif(true); N.horloge.avancer();
  for (const qui of ['elle', 'lui']) {
    if (qui === 'elle') N.game.aller('titre');
    else {
      avancer(N.R.ecrans.fin.garde + N.horloge.H);
      const r = N.ui.finActions().rejouer; toucher(r.x + r.w / 2, r.y + r.h / 2);
      check('REJOUER gagné revient au titre', N.game.etat() === 'titre', N.game.etat());
    }
    avancer(N.R.ecrans.ouverture.garde); capture('titre-' + qui);
    toucher(); check('JOUER → choix ' + qui, N.game.etat() === 'aventure' && N.aventure.etape() === 'choix', cle());
    avancer(N.R.ecrans.ouverture.garde); capture('choix-' + qui);
    const z = N.choix.state().zones[qui]; toucher(z.x + z.w / 2, z.y + z.h / 2);
    check('choix ' + qui, attendre(() => N.aventure.etape() === 'connexion', 3) && N.choix.personnage() === qui, N.choix.state());
    // Un toucher trop tôt est refusé, puis un nouveau toucher saute le film.
    toucher(); check('garde 300 ms ' + qui, N.aventure.etape() === 'connexion', N.film.state().t);
    capture('connexion-' + qui); sauterFilm();
    check('entrée 1976 ' + qui, N.aventure.etape() === '1976', cle()); capture('1976-' + qui);
    // Vraies époques jouées jusqu'à leur sortie naturelle ; sans direction, le mur tue.
    S.input.x = 0; S.input.y = 0; S.input.mag = 0;
    check('sortie naturelle 1976 ' + qui, attendre(() => N.aventure.etape() !== '1976'), N.terminal.state());
    capture('fissure-' + qui); sauterFilm();
    check('entrée 1982 ' + qui, N.aventure.etape() === '1982', cle()); capture('1982-' + qui);
    check('sortie naturelle 1982 ' + qui, attendre(() => N.aventure.etape() !== '1982'), N.arcade.state());
    capture('eclat-' + qui); sauterFilm();
    check('néon ' + qui, N.game.etat() === 'plongee' && N.aventure.etape() === 'neon', cle());
    N.game.dbg.god(true); avancer(1); capture('neon-' + qui);
    N.game.dbg.etat('victoire');
    check('apothéose ' + qui, attendre(() => N.game.etat() === 'panneau', 10), cle());
    // Même garde pour les intermèdes historiques de N.intro.
    toucher(); check('garde apothéose ' + qui, N.intro.busy(), N.intro.state());
    capture('apotheose-' + qui);
    avancer(N.R.ecrans.ouverture.garde + N.horloge.H); toucher(); step();
    check('victoire → aventure ' + qui, N.game.etat() === 'aventure' && N.aventure.etape() === 'profondeur', cle());
    let borne = 0;
    while (N.game.etat() === 'aventure' && borne++ < N.aventure.ETAPES.length) {
      if (N.film.actif()) { capture(N.aventure.etape() + '-' + qui); sauterFilm(); } else step();
    }
    const a = N.aventure.state();
    check('fin aventure ' + qui, N.game.etat() === 'fin' && !N.aventure.enCours() && N.score.resume().victoire, { jeu: N.game.etat(), aventure: a });
    check('films sans répétition ' + qui, new Set(a.joues).size === a.joues.length, a.joues);
    check('film de fin propre au personnage ' + qui, a.joues.includes('fin-' + qui), a.joues);
    check('pilote marqué fini ' + qui, N.choix.profil()[qui].fini, N.choix.profil());
    if (qui === 'lui') check('retrouvailles et teaser', a.deux && ['retrouvailles', 'teaser', 'asuivre'].every(e => a.vus.includes(e)), a.vus);
    capture('fin-' + qui);
  }
  // Abandon et reset ne doivent laisser ni époque ni aventure actives.
  N.game.aller('titre'); avancer(1); toucher(); avancer(1);
  N.game.aller('titre');
  check('retour titre stoppe aventure', !N.aventure.enCours() && !N.choix.actif() && !N.film.actif(), N.aventure.state());
  const explicites = [];
  for (const depart of ['demarrage', 'ouverture', 'titre', 'briefing', 'plongee', 'jeu']) {
    const accepte = N.game.reset(7, { depart });
    explicites.push({ depart, accepte, etat: N.game.etat(), aventure: N.aventure.enCours() });
  }
  check('départs explicites préservés', explicites.every(x => x.accepte && x.etat === x.depart && !x.aventure), explicites);
  const etat = N.game.etat(); check('départ invalide sans mutation', N.game.reset(8, { depart: 'inconnu' }) === false && N.game.etat() === etat, N.game.etat());
  return { controles, etats, films, mesures, journal: N.journal.dump(), conforme: controles.every(c => c.ok) };
}
