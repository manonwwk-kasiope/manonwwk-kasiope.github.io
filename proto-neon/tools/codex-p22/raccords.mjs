// Les deux modules réservés à d'autres missions restent intacts sur disque.
// Transformations exactes, identiques aux patches livrés ; refus si la base a dérivé.
export function raccorder(src) {
  return src.map(([nom,texte])=> {
    const remplacer=(avant,apres)=> { if(!texte.includes(avant))throw new Error('Raccord périmé : '+nom);texte=texte.replace(avant,apres); };
    if(nom==='03-socle.js') remplacer("un(['travellingAnnonce', 'travelling', 'convoiAnnonce', 'convoiPasse', 'fin'])", "un(['travellingAnnonce', 'travelling', 'convoiAnnonce', 'convoiPasse', 'fin', 'battement', 'battementFin'])");
    if(nom==='79-scene.js') {
      remplacer('armeCd = 0, dangerT = 0;', 'armeCd = 0, dangerT = 0, dangerCycle = -1;');
      remplacer('  function update(dt) {', `  // Le journal suit le même état et la même phase que la vignette et music.danger.
  function journalDanger(evt) {
    if (N.arene && N.arene.battement) N.arene.battement(evt === 'battement');
  }
  function update(dt) {`);
      // Deux sorties : disparition de la joueuse et éloignement du mur.
      texte=texte.replaceAll('dangerT = 0; if (N.music', "dangerT = 0; dangerCycle = -1; journalDanger('battementFin'); if (N.music");
      remplacer('      var ang = m.pan', `      var cycle = Math.floor(dangerT * hz);
      if (cycle !== dangerCycle) { dangerCycle = cycle; journalDanger('battement'); }
      var ang = m.pan`);
      remplacer('armeCd = 0; dangerT = 0; mt = -1;', 'armeCd = 0; dangerT = 0; dangerCycle = -1; mt = -1;');
    }
    return [nom,texte];
  });
}
