import fs from 'node:fs';import vm from 'node:vm';import zlib from 'node:zlib';import assert from 'node:assert/strict';
import { ICI, sources, compiler, monde, dateParis, hash } from './vm.mjs';
import { raccorder } from './raccords.mjs';import { ecran, toucherUI, entreeRetour } from './scenarios.mjs';import { png } from './png.mjs';
assert(JSON.parse(fs.readFileSync(ICI+'/calibration.json')).conforme,'Calibration indispensable');
const avant=JSON.parse(zlib.gunzipSync(fs.readFileSync(ICI+'/sources-avant.json.gz'))),apres=raccorder(sources());
fs.writeFileSync(ICI+'/sources-candidat.json.gz',zlib.gzipSync(JSON.stringify(apres)));
const bilan={dateParis:dateParis(),captures:[],reglages:[],retours:[],primes:[],limite:'VM sans DOM ; aucune preuve Safari/Chromium.'};
fs.mkdirSync(ICI+'/captures-vm',{recursive:true});
for(const [version,src]of [['avant',avant],['apres',apres]])for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
 const m=monde(compiler(src),2975,w,h),run=(f,...a)=>vm.runInContext('('+f.toString()+')('+a.map(x=>JSON.stringify(x)).join(',')+')',m.c);
 for(const nom of ['demarrage','titre','reglages','fin']){
  if(version==='avant'&&nom==='reglages')continue;
  const r=run(ecran,nom),f=`captures-vm/${version}-${profil}-${nom}.png`;
  png(ICI+'/'+f,r.w,r.h,r.buf,r.palette,r.px);fs.writeFileSync(ICI+'/'+f.replace('.png','.bin'),Buffer.from(r.buf));
  const{buf,palette,journal,...reste}=r;bilan.captures.push({version,profil,fichier:f,...reste,pixelsSha256:hash(buf),journalSha256:hash(journal)});
 }
 if(version==='apres'){
  run(ecran,'titre');const b=m.N.ui.boutonReglages();run(toucherUI,b.x+b.w/2,b.y+b.h/2);
  const initial=JSON.parse(JSON.stringify(m.S.reglages)),modifies=[];
  while(modifies.length<8){
   const modele=m.N.ui.modeleReglages();
   const b=modele.boutons.find(b=>!modifies.includes(b.id));
   if(b){run(toucherUI,b.x+b.w/2,b.y+b.h/2);modifies.push(b.id);}
   else{const r=m.N.ui.modeleReglages();if(r.pages>1)run(toucherUI,r.suite.x+r.suite.w/2,r.suite.y+r.suite.h/2);else throw Error('Option inaccessible');}
  }
  const g=JSON.parse(JSON.stringify(m.S.reglages));m.c.__BOOT_TEST.appliquer();
  const applique={rayon:m.S.input.stick.r,fx:m.N.fx.options(),ecran:m.N.crt.niveau(),musiqueCoupee:m.N.music.muted('musique'),effetsCoupes:m.N.music.muted('effets')};
  m.N.score.profil.charger();const recharge=JSON.parse(JSON.stringify(m.S.reglages));
  bilan.reglages.push({profil,initial,modifies,g,recharge,memorises:JSON.stringify(g)===JSON.stringify(recharge),applique,err:m.c.__ERR.count,console:m.erreurs});
  // Un retour complet depuis le démarrage, première traversée déclarée via l'API de profil.
  m.N.score.profil.epoquesVues(true);bilan.retours.push({profil,...run(entreeRetour)});
 }
}
// Cas construits : mêmes événements publics, aucun champ privé d'un module.
for(const [nom,kills,prises,source]of [['inerte',0,0,'joueuse'],['4 ramassages',0,4,'joueuse'],['5 ramassages',0,5,'joueuse'],['1 ennemi',1,0,'joueuse'],['purge',1,0,'decor']]){
 const m=monde(compiler(apres)),N=m.N;N.score.reset();N.ev.emit('vague',{n:1,evt:'entree'});
 for(let k=0;k<kills;k++)N.ev.emit('kill',{id:k,type:'fleche',base:100,x:100,y:100,src:{genre:source,type:source==='decor'?'purge':'tete'}});
 for(let k=0;k<prises;k++)N.ev.emit('ramassage',{type:'cellule',x:100,y:100});
 const avantScore=N.score.score;N.ev.emit('vague',{n:1,evt:'nettoyee'});
 bilan.primes.push({nom,delta:N.score.score-avantScore,err:m.c.__ERR.count});
}
const s=compiler(apres);bilan.defisV1=[];for(let graine=1;graine<=80;graine++){const{N}=monde(s,graine);bilan.defisV1.push({graine,id:N.score.apercuVague(1)?.id});}
bilan.conforme=bilan.captures.filter(c=>c.version==='apres').every(c=>!c.err&&!c.chevauchements.length&&!c.debordements.length&&c.titreLargeur<c.largeurSure)&&bilan.reglages.every(c=>c.memorises&&!c.err&&!c.console.length)&&bilan.retours.every(c=>c.touchers<=3&&c.t<=12&&c.etat!=='aventure'&&!c.err);
fs.writeFileSync(ICI+'/mesures.json',JSON.stringify(bilan,null,2)+'\n');
console.log(JSON.stringify({conforme:bilan.conforme,captures:bilan.captures.map(c=>({v:c.version,p:c.profil,n:c.nom,overlap:c.chevauchements.length,deborde:c.debordements,err:c.err})),reglages:bilan.reglages,retours:bilan.retours.map(c=>({profil:c.profil,t:c.t,etat:c.etat,etape:c.etape,err:c.err})),primes:bilan.primes},null,2));
if(!bilan.conforme)process.exitCode=1;
