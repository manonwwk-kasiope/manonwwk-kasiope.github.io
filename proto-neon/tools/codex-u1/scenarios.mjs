// Fonctions sérialisables : mêmes sources en VM et dans Chromium.
export function ecran(nom) {
 const N=window.__N,S=window.__S;
 N.intro.skip();N.intro.stop();N.pilote.stop?.();N.outils.geom();
 if(nom==='fin') {
  N.score.reset();S.death={cause:'ennemi',auteur:'traqueur',vague:2};N.score.terminer(false);
 }
 N.ui.ouvrir(nom);N.outils.taps.length=0;N.ui.update(1);N.gfx.origin(0,0);N.gfx.clear(0);N.ui.draw();
 const g=N.gfx,b=Array.from(g.buf()),sf=N.outils.geo.safe;
 const titre=N.ui.tailleTitre?N.ui.tailleTitre():4;
 let boites=[];
 if(nom==='fin') {
  boites=N.ui.retourModele('fin').lignes.map(l=>{
   const s=N.spr.text(l.texte,{ci:l.encre,echelle:l.echelle,contour:false,ombre:false});
   let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity,pixels=0;
   for(let y=0;y<s.h;y++)for(let x=0;x<s.w;x++)if(s.data[y*s.w+x]){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);pixels++;}
   return{texte:l.texte,x0:l.x+x0,y0:l.y-s.top+y0,x1:l.x+x1,y1:l.y-s.top+y1,pixels};
  });
 }
 const chevauchements=[];for(let a=0;a<boites.length;a++)for(let z=a+1;z<boites.length;z++){
  const A=boites[a],B=boites[z];if(A.x0<=B.x1&&B.x0<=A.x1&&A.y0<=B.y1&&B.y0<=A.y1)chevauchements.push([a,z]);
 }
 const modele=nom==='fin'?N.ui.retourModele('fin'):null;
 return {nom,w:g.W,h:g.H,px:g.PX,buf:b,palette:N.pal.C,titreEchelle:titre,titreLargeur:N.outils.textW('SNAKE 2975',titre),largeurSure:g.W-sf.l-sf.r,
  boites,chevauchements,debordements:boites.filter(b=>b.x0<sf.l||b.x1>=g.W-sf.r||b.y0<sf.t||b.y1>modele.bas).map(b=>b.texte),
  reglages:S.ecran?.reglages,fin:modele,err:window.__ERR.count,journal:N.journal.dump()};
}
export function toucherUI(x,y,key=null) {
 const N=window.__N;N.outils.taps.length=0;N.outils.taps.push({x,y,key});N.ui.update(0.25);N.outils.taps.length=0;N.gfx.clear(0);N.ui.draw();
 return {ecran:N.ui.ecran(),sortie:N.ui.sortie(),reglages:N.S.reglages,modele:N.S.ecran?.reglages};
}
export function entreeRetour() {
 const N=window.__N,S=window.__S;
 const vues=N.score.profil.epoquesVues?.();
 N.intro.skip();N.intro.stop();N.game.reset(2975);N.horloge.avancer();
 let t=0,touchers=0;const trace=[];
 function avancer(s){for(let i=0;i<Math.ceil(s*60);i++){N.game.dbg.simuler(1/60);t+=1/60;}}
 function tap(x,y){S.input.taps.push({x,y});S.input.any=true;N.game.dbg.simuler(1/60);t+=1/60;S.input.taps.length=0;S.input.any=false;touchers++;trace.push({t,etat:N.game.etat(),etape:N.aventure.etape()});}
 avancer(0.5);tap(N.gfx.W/2,N.gfx.H/2);avancer(0.5);tap(N.gfx.W/2,N.gfx.H/2);
 avancer(1);N.aventure.draw();const zone=N.choix.state().zones.elle;tap(zone.x+zone.w/2,zone.y+zone.h/2);
 while(t<12&&N.game.etat()!=='jeu')avancer(0.25);
 return {vues,t,touchers,etat:N.game.etat(),etape:N.aventure.etape(),aventure:N.aventure.state(),journal:N.journal.dump(),err:window.__ERR.count,trace};
}
