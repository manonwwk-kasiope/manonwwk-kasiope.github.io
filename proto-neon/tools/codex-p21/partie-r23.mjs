// Fonction partagée navigateur/VM. Un pouce virtuel porte réellement le manche ; aucune action ajoutée au pilote.
export function partiePouce({graine,variante,maxT=540,pouce=true}){
 const N=window.__N,S=window.__S;localStorage.clear();S.jour=20261017;
 S.reglages.actions=variante==='auto'?'auto':'doigts';
 N.intro.skip();N.game.reset(graine,{depart:'plongee'});if(N.game.etat()==='demarrage')N.game.dbg.etat('plongee');
 N.pilote.lancer('expert',{variante});
 if(pouce)S.input.stick.active=true;
 N.journal.actif(true);N.horloge.avancer();let reel=0,stagnant=0,last='',raison='borne',victoire=false;
 while(N.horloge.t()<maxT&&reel<maxT*4){
  if(N.game.etat()==='fin'){raison='fin';break;}
  N.game.dbg.simuler(0.25);reel+=0.25;
  const etat=N.game.etat();if(etat==='victoire')victoire=true;
  const utile=[etat,N.horloge.t(),S.ecran?.depuis,S.vol?.t].join('|');stagnant=utile===last?stagnant+0.25:0;last=utile;
  if(stagnant>10){raison='bloque:'+etat;break;}if(window.__ERR.count){raison='erreur';break;}
 }
 if(N.game.etat()==='fin')raison='fin';
 const journal=N.journal.dump(),d=N.game.dbg();victoire=victoire||journal.some(e=>e.type==='phase'&&e.d.evt==='mort');
 return {graine,variante,raison,fin:N.game.etat()==='fin',tempsJeu:N.horloge.t(),tempsCombat:d.t,score:d.score,vague:d.vague,victoire,err:window.__ERR.count,
  manche:!!S.input.stick.active,impulsions:journal.filter(e=>e.type==='pilote'&&(['pouvoir','apogee'].includes(e.d.evt)||e.d.evt==='boost'&&e.d.on)).length,
  piloteConforme:journal.some(e=>e.type==='pilote'&&e.d.evt==='cap'),journal};
}
