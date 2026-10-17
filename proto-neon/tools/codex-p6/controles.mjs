import assert from 'node:assert/strict';
export function valider(r) {
  assert.equal(r.sansOptions, 'demarrage');
  for (const d of r.departs) {
    assert.equal(d.ok, true, d.depart); assert.equal(d.etat, d.depart, d.depart);
    assert.equal(d.apresPremierPas, d.depart, d.depart + ' reste réel au premier pas');
    if (!['demarrage', 'ouverture'].includes(d.depart)) assert.equal(d.phase, 'play', d.depart + ' sans ouverture');
  }
  assert.equal(r.departInvalide.retour, false); assert.equal(r.departInvalide.inchange, true);
  const C = r.regles.scenes;
  for (const s of r.scenes) {
    assert.equal(s.ok, true, s.nom); assert.equal(s.longueur, s.longueurPubliee, s.nom + ' S.player');
    assert.equal(s.masque.length, s.W * s.H); assert.ok(s.masque.some(v => v > 0), s.nom + ' masque');
    if (s.nom === 'charge' || s.nom === 'boss3') {
      assert.equal(s.phase, C.boss.phase); assert.ok(s.boss.some(e => e.partie === 'oeil' && e.pv > 0));
      assert.ok(s.journal.some(e => e.type === 'phase' && e.d.n === C.boss.phase && e.d.evt === 'entree'));
    }
    if (s.nom === 'charge') { assert.equal(s.ennemis, C.charge.ennemis); assert.equal(s.tirs, C.charge.tirs); assert.deepEqual(s.decor, { quartier: 'coeur', etat: 'chaos' }); }
    if (s.nom === 'v5') { assert.equal(s.vague, 5); assert.equal(s.ennemis, 32); assert.equal(s.arene.tv, 'marche'); assert.equal(s.arene.cv, 'annonce'); }
    if (s.nom === 'v5' || s.nom === 'charge') assert.ok(Object.values(s.armes).every(n => n === 4));
    if (s.nom === 'lasso6') { assert.equal(s.ennemis, C.lasso6.cibles); assert.equal(s.longueur, C.lasso6.longueur); assert.equal(s.ciblesFixes, true); assert.equal(s.tuesParLasso, C.lasso6.cibles); }
    if (s.nom === 'inversion') { assert.equal(s.proies, C.inversion.proies); assert.equal(s.inversion.actif, true); }
    if (s.nom === 'convoi') { assert.equal(s.arene.cv, 'passage'); assert.equal(s.ennemis, C.convoi.cibles); assert.ok(s.cibles.every(e => e.y === (s.voie[0].y0 + s.voie[0].y1) / 2)); }
    if (s.nom === 'travelling') { assert.equal(s.vague, C.travelling.vague); assert.equal(s.arene.tv, 'marche'); assert.equal(Math.round(s.queueMur), C.travelling.queueMur); }
  }
  assert.equal(r.calme.taille, r.calme.W * r.calme.H);
  assert.ok(r.calme.cyan > 0); assert.equal(r.calme.cyanHors, 0); assert.equal(r.calme.partCorrecte, 1);
  assert.equal(r.erreurs.count, 0); assert.deepEqual(r.erreurs.console, []);
}
