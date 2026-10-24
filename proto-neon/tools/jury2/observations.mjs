/* Observations publiques ; aucune mention du rôle, du patch ou de la clé aveugle.
   Une réservation n'est comptée que si l'objet est ensuite présent après rendu. */
import { sync } from './analyse.mjs';
import { recalculerEvenements } from './grille-sync.mjs';
export function observations(d,regles) {
  const evenements=recalculerEvenements(d,regles);
  const apparitions=evenements.filter(e=>e.type==='apparition');
  const reservations=evenements.filter(e=>e.type==='reservation').map(e=>({w:e.w,t:e.tempsJeu,type:e.d.type,
    demande:e.d.demande,objets:e.d.objets.map(o=>{const a=apparitions.find(a=>a.d?.id===o.id);return {...o,
      apparition:a?{w:a.w,t:a.tempsJeu,apresRendu:a.preuve?.apresRendu===true,etat:a.preuve?.etat}:null};})}));
  const frames=d.frames||[],muettes=frames.filter(f=>f.musiqueMuette===true).length;
  const demandes=reservations.filter(r=>r.objets.some(o=>o.apparition?.apresRendu)),objets=demandes.flatMap(r=>r.objets.filter(o=>o.apparition?.apresRendu));
  return {version:1,grille:regles,horloges:'w = s_reel ; t = s_jeu',
    audio:{frames:frames.length,muettes,statutConnu:frames.filter(f=>typeof f.musiqueMuette==='boolean').length,
      note:'Le drapeau public de la porte mute prouve la coupure demandée. Le RMS moteur avant mute ne prouve pas la sortie ; effets possibles dans rmsSortie.'},
    synchronisation:sync(evenements),
    reservations:{disponibles:reservations.length>0,demandesAvecSortie:demandes.length,objetsApparusApresRendu:objets.length,
      excedent:objets.length-demandes.length,details:reservations,
      limite:'Pas de déduction depuis la durée de survie ou le nombre brut d’ennemis. Absence de réservation dans un brut ancien = doublons non attribuables.'},
    evenements:evenements.filter(e=>(['apparition','tir-ennemi'].includes(e.type)||e.type==='vague'&&e.d?.evt==='entree')).map(e=>({w:e.w,t:e.tempsJeu,type:e.type,
      objet:e.d,preuve:e.preuve,beat:e.beat,bpm:e.bpm,subdivisions:e.subdivisions,ecartAudioMs:e.ecartAudioMs,
      audioRunning:e.audioRunning,musiqueMuette:e.musiqueMuette,rmsMusique:e.rmsMusique})),
    limites:['Objets publics présents après rendu : cela ne prouve pas à lui seul la lisibilité des pixels ni une mort injuste.']};
}
