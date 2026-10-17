/* La même fonction tourne sur les vraies sources en VM et dans la page Playwright. */
export function relever() {
  const N = window.__N, S = window.__S, g = N.gfx;
  const resultat = { departs: [], scenes: [], regles: N.R.tests || null };
  N.game.reset(7);
  resultat.sansOptions = N.game.etat();
  for (const depart of ['demarrage', 'ouverture', 'titre', 'briefing', 'plongee', 'jeu']) {
    N.intro.reset();
    const ok = N.game.reset(7, { depart });
    const d = { depart, ok, etat: N.game.etat(), phase: S.phase,
      intro: N.intro.current(), vague: N.dir.vague(), joueuse: N.joueuse.etat };
    N.game.update(N.R.temps.h); d.apresPremierPas = N.game.etat();
    resultat.departs.push(d);
  }
  const avantInvalide = JSON.stringify([N.game.etat(), N.game.dbg().seed, N.horloge.t(), N.score.score]);
  resultat.departInvalide = { retour: N.game.reset(99, { depart: 'inconnu' }),
    inchange: avantInvalide === JSON.stringify([N.game.etat(), N.game.dbg().seed, N.horloge.t(), N.score.score]) };
  const dessin = () => {
    g.origin(0, 0); g.clear(0); N.game.draw(); N.fx.draw(); N.game.drawTop();
    g.origin(0, 0); N.hud.draw(); if (N.ui.actif()) N.ui.draw();
    g.present();
  };
  for (const nom of ['charge', 'v5', 'lasso6', 'inversion', 'convoi', 'travelling', 'boss3']) {
    N.intro.skip(); N.game.reset(7);
    const ok = N.game.dbg.scene(nom);
    N.game.dbg.masque(true); dessin();
    const E = N.ennemis.list.filter(e => e.etat !== 'mort');
    const mur = N.arene.murArriere(), queue = N.joueuse.segPos(N.joueuse.len());
    const scene = { nom, ok, etat: N.game.etat(), vague: N.dir.vague(), phase: N.colosse.phase(),
      ennemis: N.ennemis.count(), tirs: N.ennemis.tirs.length, longueur: N.joueuse.len(), longueurPubliee: S.player.len,
      proies: E.filter(e => e.etat === 'proie').length, inversion: N.joueuse.inversion(),
      boss: E.filter(e => e.boss).map(e => ({ type: e.type, partie: e.partie, pv: e.pv })),
      armes: Object.fromEntries(N.ids.armes.map(a => [a, N.arsenal.niveau(a)])),
      arene: N.arene.etat(), voie: N.arene.voies().map(v => ({ ...v })),
      queueMur: mur ? (queue.x - mur.x) * mur.sens : null,
      decor: { quartier: N.decor.quartier(), etat: N.decor.etat() },
      cibles: E.filter(e => !e.boss).map(e => ({ id: e.id, type: e.type, x: e.x, y: e.y, etat: e.etat, pv: e.pv })),
      journal: N.journal.dump(), pixels: Array.from(g.buf()), masque: Array.from(N.game.dbg.masque()), W: g.W, H: g.H };
    if (nom === 'lasso6' && ok) {
      const positions = scene.cibles;
      N.ennemis.update(N.R.temps.imageRef);
      scene.ciblesFixes = positions.every(p => {
        const e = N.ennemis.list.find(e => e.id === p.id); return e && e.x === p.x && e.y === p.y;
      });
      // Leur destruction utilise la vraie hitbox et le vrai hit() du LASSO, pas un événement fabriqué.
      const c = N.R.tests?.scenes.lasso6, centre = positions.reduce((p, e) => ({ x: p.x + e.x / positions.length, y: p.y + e.y / positions.length }), { x: 0, y: 0 });
      const rayon = c ? c.ecart * c.colonnes : N.R.lasso.annonce;
      const poly = [centre.x - rayon, centre.y - rayon, centre.x + rayon, centre.y - rayon,
        centre.x + rayon, centre.y + rayon, centre.x - rayon, centre.y + rayon];
      const dedans = N.ennemis.dans(poly);
      for (const e of dedans) N.ennemis.hit(e, N.R.f.degatsLasso(N.joueuse.len(), 0), { genre: 'arme', type: 'lasso', id: 0 });
      scene.tuesParLasso = N.journal.dump().filter(e => e.type === 'kill' && e.d.src?.type === 'lasso').length;
    }
    resultat.scenes.push(scene);
  }
  // Contrôle calme sur une partie vierge ; les données viennent de la même image, sans pas intermédiaire.
  N.intro.skip(); N.game.reset(7, { depart: 'jeu' }); N.game.dbg.scene('calme');
  N.game.dbg.masque(true); dessin();
  const buf = g.buf(), masque = N.game.dbg.masque();
  let cyan = 0, cyanHors = 0;
  for (let i = 0; i < buf.length; i++) if (buf[i] === N.pal.i('cyan') || buf[i] === N.pal.i('cyanPale')) {
    cyan++; if (![N.ids.proprietaires.tete, N.ids.proprietaires.corps, N.ids.proprietaires.arsenal].includes(masque[i])) cyanHors++;
  }
  resultat.calme = { W: g.W, H: g.H, taille: masque.length, codes: [...new Set(masque)], cyan, cyanHors,
    partCorrecte: cyan ? (cyan - cyanHors) / cyan : null, pixels: Array.from(buf), masque: Array.from(masque) };
  resultat.erreurs = { ...window.__ERR, console: [] };
  N.game.dbg.masque(false);
  return resultat;
}
