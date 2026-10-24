// Exécuté sans adaptation dans la VM calibrée et dans Playwright.
export function installerLot(W){
 const N=W.__N,S=N.S;
 const step=()=>W.__p23step();
 function r28(){
  N.game.dbg.scene('v5');N.game.dbg.god(true);N.journal.actif(true);
  for(let i=0;i<30;i++)step();
  const p=S.player,e=N.ennemis.spawn('fleche',N.cam.x+N.cam.w/2,N.cam.y+N.cam.h/2,{elite:'flecheBlindee'});
  const cible=N.ennemis.list.find(a=>a.id===e?.id&&a.etat!=='mort');
  if(cible){cible.x=N.cam.x+N.cam.w/2;cible.y=N.cam.y+N.cam.h/2;}
  if(cible)for(let i=0;i<50&&cible.etat!=='mort';i++)N.ennemis.hit(cible,(cible.pvMax||1)*4,{genre:'arme',type:'canon',id:0});
  let prev=null,images=0,paires=0,max=0,shake=0,camMax=0,pire=null;
  for(let i=0;i<40;i++){
   step();const b=N.gfx.buf().slice(),gele=N.horloge.gele(),cam=[N.cam.x,N.cam.y];shake=Math.max(shake,S.shake);
   if(gele){images++;if(prev?.gele){paires++;let n=0;for(let k=0;k<b.length;k++)if(b[k]!==prev.b[k])n++;const part=n/b.length;camMax=Math.max(camMax,Math.hypot(cam[0]-prev.cam[0],cam[1]-prev.cam[1]));if(!pire||part>max){max=part;pire={image:i,t:N.horloge.t(),cam,dt:S.dt};}}}prev={b,gele,cam};
  }
  return {cible:!!cible,morte:!!cible&&N.journal.lire('kill').some(j=>j.d.id===cible.id),images,paires,max,shake,camMax,pire,ok:!!cible&&N.journal.lire('kill').some(j=>j.d.id===cible.id)&&paires>0&&max<=N.R.decor.lumiere.reduit&&shake===0&&camMax<=.5,err:W.__ERR,journal:N.journal.dump()};
 }
 function r11(scene){
  N.game.dbg.masque();N.game.dbg.scene(scene);for(let i=0;i<3;i++)step();
  const analyse=W.__MESURE.analyseCourante({gaine:true});let dirigee=null;
  if(!analyse.gaine?.bord){N.game.dbg.god(true);const v=N.cam,e=N.ennemis.spawn('fleche',v.x+v.w*N.R.camera.cadre.min,v.y+v.h*N.R.camera.cadre.max,{});if(e){e.x=v.x+v.w*N.R.camera.cadre.min;e.y=v.y+v.h*N.R.camera.cadre.max;}for(let i=0;i<3;i++)step();dirigee={id:e?.id,gaine:W.__MESURE.analyseCourante({gaine:true}).gaine};}
  return {scene,analyse,dirigee,err:W.__ERR,journal:N.journal.dump()};
 }
 W.__P23={r28,r11};
}
