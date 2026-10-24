// Même sonde, sans adaptation, dans la VM et dans Chromium. Aucun champ privé lu ou modifié.
export function installer(W) {
 const N=W.__N,S=N.S,g=N.gfx;
 const pas=(n=1)=>{for(let i=0;i<n;i++)W.__p32step();};
 function stats(){return {analyse:W.__MESURE.analyseCourante({gaine:true}),err:JSON.parse(JSON.stringify(W.__ERR)),etat:N.game.etat(),phase:N.colosse.phase()};}
 function r11(){N.game.dbg.masque();N.game.dbg.scene('colosse');pas(3);return {...stats(),journal:N.journal.dump()};}
 function preparer(phase){
  N.game.dbg.masque();N.game.dbg.scene(phase===3?'boss3':'colosse');N.game.dbg.god(true);N.journal.actif(true);
  let i=0;
  while(N.colosse.phase()<phase&&i++<960){
   if(phase===2&&N.colosse.phase()===1){const e=N.ennemis.list.find(e=>e.boss&&N.colosse.estOeil(e.id)&&e.etat!=='mort');if(e)N.ennemis.hit(e,N.R.colosse.pvPhase,{genre:'arme',type:'canon',id:0});}
   N.game.dbg.simuler(.25);
  }
  if(N.colosse.phase()!==phase)throw Error('phase '+phase+' non atteinte : '+N.colosse.phase());
  N.game.dbg.simuler(1); // laisser les mains naître hors champ puis réellement entrer
  return {phase:N.colosse.phase(),t:N.horloge.t()};
 }
 function construit(quartier){
  N.decor.fixer(quartier,'colosse');
  // Rendu isolé sur le vrai décor : le masque public observe les vraies écritures.
  g.clear(N.pal.i('vide'));N.outils.geom();N.outils.origineMonde();
  N.decor.drawFar();N.decor.drawPlateau();N.decor.drawFront();N.outils.origineMonde();N.colosse.draw();N.colosse.drawTop();
  const isole=stats(),b=g.buf(),m=g.mask();let cyan=0,menace=0,clair=0;
  for(let i=0;i<b.length;i++)if(m[i]===N.ids.proprietaires.ennemi){menace++;if(b[i]===N.pal.i('cyan')||b[i]===N.pal.i('cyanPale'))cyan++;if(b[i]!==N.pal.i('nuitProfonde'))clair++;}
  // Composition du jeu : les bords créés par HUD/effets sont conservés séparément.
  N.game.draw();N.fx.draw();N.game.drawTop();N.hud.draw();
  return {quartier,isole,compose:stats(),cyan,menace,clair};
 }
 W.__P32={pas,r11,preparer,construit,stats};
}
