import fs from 'node:fs';import assert from 'node:assert/strict';import vm from 'node:vm';
import { ICI, sources, compiler, monde, dateParis } from './vm.mjs';import { raccorder } from './raccords.mjs';import { toucherUI } from './scenarios.mjs';import { png } from './png.mjs';
assert(JSON.parse(fs.readFileSync(ICI+'/calibration.json')).conforme);
const script=compiler(raccorder(sources())),bilan={dateParis:dateParis(),cas:[]};
for(const[profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const m=monde(script,2975,w,h),{N,S,c}=m,B=c.__BOOT_TEST;let now=0;
 const frames=n=>{for(let i=0;i<n;i++){now+=1000/60;c.__now=now;B.frame(now);}};
 const touche=(code)=>{B.key({code,key:code==='KeyP'?'p':code==='KeyR'?'r':'',preventDefault(){}},true);frames(1);B.key({code,preventDefault(){}},false);};
 const tap=(b)=>{S.input.taps.push({x:b.x+b.w/2,y:b.y+b.h/2});frames(1);N.ui.draw();};
 frames(40);N.game.dbg.etat('titre');frames(40);tap(N.ui.boutonReglages());frames(30);
 const titreReglages=N.ui.ecran();frames(60*20);const apresAttente={jeu:N.game.etat(),ui:N.ui.ecran()};
 const boutons=[];
 for(const texte of N.R.reglagesValeurs.texte){
  N.score.profil.reglages({texte});N.ui.ouvrir('reglages');N.outils.taps.length=0;N.ui.update(1);N.ui.draw();
  let modele=N.ui.modeleReglages();
  for(let p=0;p<modele.pages;p++){
   for(const b of modele.boutons)boutons.push({texte,id:b.id,wPt:b.w*N.gfx.PX,hPt:b.h*N.gfx.PX,dansVue:b.x>=0&&b.x+b.w<=N.gfx.W&&b.y>=0&&b.y+b.h<=modele.retour.y,police:b.echelle});
   png(`${ICI}/captures-vm/apres-${profil}-reglages-texte${texte}-page${p+1}.png`,N.gfx.W,N.gfx.H,N.gfx.buf(),N.pal.C,N.gfx.PX);
   const b=modele.suite;c.args=[b.x+b.w/2,b.y+b.h/2];vm.runInContext('('+toucherUI.toString()+')(...args)',c);modele=N.ui.modeleReglages();
  }
 }
 // Effet du rayon réel sur le vecteur d'entrée, pas seulement sur le dessin du manche.
 const manches=[];for(const manche of N.R.reglagesValeurs.manche){
  N.score.profil.reglages({manche});B.appliquer();
  const event=(type,x)=>({type,changedTouches:[{identifier:1,clientX:x,clientY:100}],cancelable:true,preventDefault(){}});
  B.start(event('touchstart',100));B.move(event('touchmove',100+N.R.joueuse.courseCSS/2));
  manches.push({manche,r:S.input.stick.r,mag:S.input.mag,attendu:1/(2*manche)});B.end(event('touchend',100+N.R.joueuse.courseCSS/2));B.fin();
 }
 N.score.profil.reglages({actions:'doigts'});N.gfx.resize(h,w);N.score.profil.charger();const expliciteApresRotation=S.reglages.actions;N.gfx.resize(w,h);
 // La pause garde le jeu gelé et rend la main au même état après les réglages.
 N.game.dbg.scene('calme');N.game.dbg.god(true);frames(1);touche('KeyP');frames(40);const pause=N.game.etat();tap(N.ui.boutonReglages());frames(30);
 const avant={ui:N.ui.ecran(),t:N.horloge.t(),x:N.joueuse.tete.x,y:N.joueuse.tete.y};frames(60);
 const apres={ui:N.ui.ecran(),t:N.horloge.t(),x:N.joueuse.tete.x,y:N.joueuse.tete.y};tap(N.ui.modeleReglages().retour);frames(30);touche('KeyP');const reprise=N.game.etat();
 // Premier passage : aucun raccourci avant la première arrivée au néon ; ensuite persistance du droit de retour.
 const frais=monde(script,2975,w,h);let voyage=null;frais.N.aventure.demarrer({qui:'elle',aJouer:info=>voyage=info});const etapes=[];
 for(let i=0;i<20&&!voyage;i++){
  etapes.push(frais.N.aventure.etape());frais.N.aventure.sauter();
  // skip() lance une transition, pas un téléporteur : laisser le vrai module la terminer.
  for(let pas=0;pas<600&&!voyage;pas++){
   frais.N.aventure.update(1/60);const e=frais.N.aventure.etape();if(etapes.at(-1)!==e)etapes.push(e);
  }
 }
 const vues=frais.N.score.profil.epoquesVues();frais.N.score.profil.charger();const vuesRecharge=frais.N.score.profil.epoquesVues();frais.N.aventure.stop();frais.N.aventure.demarrer({qui:'elle',aJouer:()=>{}});const retour=frais.N.aventure.etape();
 const r={profil,titreReglages,apresAttente,boutons,manches,expliciteApresRotation,pause,avant,apres,reprise,etapes,vues,vuesRecharge,retour,err:c.__ERR.count,console:m.erreurs};
 r.conforme=titreReglages==='reglages'&&apresAttente.ui==='reglages'&&boutons.length===16&&boutons.every(b=>b.wPt>=44&&b.hPt>=44&&b.dansVue)&&manches.every(b=>Math.abs(b.mag-b.attendu)<Number.EPSILON*10)&&expliciteApresRotation==='doigts'&&pause==='pause'&&JSON.stringify(avant)===JSON.stringify(apres)&&reprise==='jeu'&&etapes.includes('1976')&&etapes.includes('1982')&&vues&&vuesRecharge&&retour==='neon'&&!r.err&&!r.console.length;
 bilan.cas.push(r);
}
bilan.conforme=bilan.cas.every(c=>c.conforme);fs.writeFileSync(ICI+'/controles.json',JSON.stringify(bilan,null,2)+'\n');console.log(bilan.conforme,bilan.cas.map(c=>[c.profil,c.conforme,c.err,c.console]));if(!bilan.conforme)process.exitCode=1;
