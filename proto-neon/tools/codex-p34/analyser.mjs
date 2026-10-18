// Lecture seule des reçus. Aucun nouveau calcul du jeu ni de seuil.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {resumer} from '../mesure/parties.mjs';
import {mediane,bilan} from '../reglage/analyse.mjs';
const HERE=path.dirname(new URL(import.meta.url).pathname),ROOT=path.resolve(HERE,'../..');
const lire=f=>JSON.parse(fs.readFileSync(path.join(HERE,f))),save=(f,x)=>fs.writeFileSync(path.join(HERE,f),JSON.stringify(x,null,2)+'\n');
const hash=x=>crypto.createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const date=()=>new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
const plage=a=>a.length?[Math.min(...a),Math.max(...a)]:null;
const csv=(f,headers,rows)=>fs.writeFileSync(path.join(HERE,f),[headers,...rows].map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n');
function serie(nom){
 const s=lire(nom+'.json'),raw=s.cas.map(c=>JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE,c.recu)))));
 const cas=raw.map(r=>{
  const p=resumer({ok:true,raison:r.raison,fin:{t:r.tempsJeu,score:r.score},params:{pilote:r.pilote,graine:r.graine},journal:r.journal,echantillons:r.echantillons,erreurs:{zero:!r.err&&!r.erreursConsole.length}});
  const victoire=r.journal.find(e=>e.type==='section'&&e.d.nom==='victoire'),entree=r.journal.find(e=>e.type==='phase'&&e.d.evt==='entree'),arrivee=r.journal.find(e=>e.type==='phase'&&e.d.evt==='arrivee');
  const essais=[];let essai=null;
  for(const e of r.journal){if(e.type==='pilote'&&e.d.evt==='lassoTente'){essai={len:e.d.longueur,n:e.d.n,reussi:false};essais.push(essai);}if(e.type==='lasso'&&essai)essai.reussi=true;if(e.type==='pilote'&&e.d.evt==='lassoFin')essai=null;}
  const tranches={court:essais.filter(e=>e.len<=20),long:essais.filter(e=>e.len>=30&&e.len<=40)};
  return {pilote:r.pilote,graine:r.graine,raison:r.raison,fin:r.fin,temps:r.tempsJeu,gameOverR04:p.gameOver,score:r.score,vague:r.vague,
   atteintR04:p.cyclopeAtteint,atteintPhase:!!arrivee,victoireR04:p.victoire,victoireSection:!!victoire,entree:entree?.t??null,arrivee:arrivee?.t??null,
   combatR04:p.combatCyclope,combatSection:victoire&&entree?victoire.t-entree.t:null,sectionVictoire:victoire?.t??null,
   horsCombat:victoire&&entree?r.tempsJeu-(victoire.t-entree.t):null,
   morts:p.morts.length,coupV1R04:p.coupsV1>0,mortAvantR04:p.morts.some(m=>p.entreeCyclope===null||m.t<p.entreeCyclope),
   premiereMort:p.premiereMort,premiereMortHorloge:r.journal.find(e=>e.type==='mort')?.t??null,lassos:p.lassos.length,apogeesDebut:r.journal.filter(e=>e.type==='apogee'&&e.d.evt==='debut').length,apogeesR04:p.apogees,
   lassoCourt:{tentatives:tranches.court.length,reussis:tranches.court.filter(e=>e.reussi).length},lassoLong:{tentatives:tranches.long.length,reussis:tranches.long.filter(e=>e.reussi).length},
   groupesLasso:plage(essais.map(e=>e.n)),groupesSous4:essais.filter(e=>e.n<4).length,tentatives:essais.length,
   pouvoirsPilote:r.journal.filter(e=>e.type==='pilote'&&e.d.evt==='pouvoir').length,apogeesPilote:r.journal.filter(e=>e.type==='pilote'&&e.d.evt==='apogee').length,
   err:r.err,erreursConsole:r.erreursConsole,recu:s.cas.find(c=>c.pilote===r.pilote&&c.graine===r.graine).recu};
 });
 const pilotes={};for(const pilote of [...new Set(cas.map(c=>c.pilote))]){
  const a=cas.filter(c=>c.pilote===pilote),n=a.length,part=f=>a.filter(f).length/n;
  const lasso=k=>{const tentatives=a.reduce((s,c)=>s+c[k].tentatives,0),reussis=a.reduce((s,c)=>s+c[k].reussis,0);return{tentatives,reussis,taux:tentatives?reussis/tentatives:null};};
  pilotes[pilote]={n,censures:a.filter(c=>!c.fin).length,medianeToutesFins:mediane(a.filter(c=>c.fin).map(c=>c.temps)),plageFins:plage(a.filter(c=>c.fin).map(c=>c.temps)),
   nombreDefaites:a.filter(c=>c.gameOverR04!==null).length,medianeGameOverR04:mediane(a.map(c=>c.gameOverR04)),atteintR04:part(c=>c.atteintR04),atteintPhase:part(c=>c.atteintPhase),victoireR04:part(c=>c.victoireR04),victoireSection:part(c=>c.victoireSection),
   coupV1R04:part(c=>c.coupV1R04),mortAvantR04:part(c=>c.mortAvantR04),perdVie:part(c=>c.morts>0),scoreMediane:mediane(a.map(c=>c.score)),
   lassoCourt:lasso('lassoCourt'),lassoLong:lasso('lassoLong'),lassosMediane:mediane(a.map(c=>c.lassos)),apogeesDebutMediane:mediane(a.map(c=>c.apogeesDebut)),apogeesR04Mediane:mediane(a.map(c=>c.apogeesR04)),
   groupesSous4:a.reduce((s,c)=>s+c.groupesSous4,0),tentatives:a.reduce((s,c)=>s+c.tentatives,0),pouvoirsPilote:a.reduce((s,c)=>s+c.pouvoirsPilote,0),apogeesPilote:a.reduce((s,c)=>s+c.apogeesPilote,0),
   combatR04:plage(a.map(c=>c.combatR04).filter(Number.isFinite)),combatSection:plage(a.map(c=>c.combatSection).filter(Number.isFinite)),horsCombat:plage(a.map(c=>c.horsCombat).filter(Number.isFinite)),
   erreurs:a.reduce((s,c)=>s+c.err+c.erreursConsole.length,0)};
 }
 return {nom,sourceSha256:s.sourceSha256,cas,pilotes,bancP5:s.resume};
}
const actuel=serie('actuel'),avant=serie('avant-p14');
const ecarts=avant.cas.map(a=>{const b=actuel.cas.find(b=>b.pilote===a.pilote&&b.graine===a.graine);return {pilote:a.pilote,graine:a.graine,avant:a,apres:b,deltaTemps:b.temps-a.temps,deltaScore:b.score-a.score};});
const B={...actuel.bancP5.B};
// Définition officielle de la médiane ; ni remplacement des seuils, ni assimilation victoire=game over.
const m=actuel.pilotes.humain.medianeGameOverR04;B['humain.mediane']=m===null?null:m>=120&&m<=210;
const ds=actuel.cas.filter(c=>c.pilote==='dieu'),combats=ds.map(c=>c.combatR04).filter(Number.isFinite);
B['dieu.combat']=combats.length===ds.length?combats.every(t=>t>=55&&t<=90):null;
const nums=Object.keys(B).map((k,i)=>({id:String(i+1).padStart(2,'0'),cle:k,observe:B[k],p5:actuel.bancP5.B[k]}));
const paires=[];
for(let i=0;i<nums.length;i++)for(let j=i+1;j<nums.length;j++){
 const a=nums[i],b=nums[j],keys=[a.cle,b.cle];
 const observation=keys.some(k=>B[k]===false)?'echec observe':keys.some(k=>B[k]===null)?'a verifier':'deux cibles tenues sur 10 graines';
 let relation='Pilotes ou observables distincts ; aucune contradiction logique necessaire';
 if(a.cle.split('.')[0]===b.cle.split('.')[0])relation='Meme pilote ; contraintes conjointes satisfaisables dans le temoin abstrait, realisation par ce jeu non prouvee';
 if(keys.includes('bon.cyclope')&&keys.includes('bon.bat'))relation='Victoire implique acces ; [10,30]% <= [30,60]% : intersection non vide';
 if(keys.includes('expert.bat')&&keys.includes('expert.perdVie'))relation='Intersection victoire et perte de vie >= P(victoire)+P(perte)-1 ; minimum requis 20% si victoire=40% et perte=80%, possible';
 if(keys.includes('dieu.duree')&&keys.includes('dieu.combat'))relation='T=O+C ; faisable si et seulement si O est dans [230,335] pour chaque graine ; voir durees.json';
 if(keys.includes('humain.mediane')&&keys.some(k=>k.startsWith('dieu.')))relation='Game over R04 conditionne aux defaites humaines ; dieu a une autre politique et une autre distribution. Aucune borne universelle de duree humaine ne suit';
 paires.push({a:a.id,b:b.id,cibleA:a.cle,cibleB:b.cle,logique:'Compatible dans le temoin abstrait ; aucune preuve de realisabilite avec les pilotes figes',etatFixe:observation,obstacleGeometrique:keys.includes('inerte.mur8'),relation});
}
save('synthese.json',{dateParis:date(),limite:'10 graines, analyse exploratoire. Pas de qualification 50 graines ni Safari.',actuel,avantP14:avant,ecarts,BdefinitionsR04EtP5:B,cibles:nums,paires});
csv('paires.csv',['idA','idB','cibleA','cibleB','compatibiliteLogique','etatFixe','obstacleGeometrique','demonstration'],paires.map(p=>[p.a,p.b,p.cibleA,p.cibleB,p.logique,p.etatFixe,p.obstacleGeometrique,p.relation]));
csv('parties.csv',['serie','pilote','graine','tempsToutesFins','gameOverR04','score','cyclopeAtteint','victoire','combatR04','combatSection','horsCombat','morts','lassos','apogeesDebut','raison','recu'],[actuel,avant].flatMap(s=>s.cas.map(c=>[s.nom,c.pilote,c.graine,c.temps,c.gameOverR04,c.score,c.atteintR04,c.victoireR04,c.combatR04,c.combatSection,c.horsCombat,c.morts,c.lassos,c.apogeesDebut,c.raison,c.recu])));
save('durees.json',ds.map(c=>{const O=c.horsCombat;return {graine:c.graine,temps:c.temps,combatR04:c.combatR04,combatSection:c.combatSection,horsCombat:O,intersectionSiOConserve:O===null?null:[Math.max(55,320-O),Math.min(90,390-O)],compatibleSiOConserve:O===null?null:O>=230&&O<=335,recu:c.recu};}));
const matrix=['| B | '+nums.map(x=>x.id).join(' | ')+' |','|---|'+nums.map(()=>'---').join('|')+'|'];
for(const a of nums)matrix.push('| '+a.id+' | '+nums.map(b=>a.id===b.id?'—':B[a.cle]===false||B[b.cle]===false?'E':B[a.cle]===null||B[b.cle]===null?'?':'+').join(' | ')+' |');
fs.writeFileSync(path.join(HERE,'compatibilite.md'),'Matrice des 190 paires sur les sources reçues, dix graines ; aucune projection à cinquante. + = les deux cibles tenues sur ce lot, E = au moins un échec mesuré, ? = au moins une mesure indéterminée sans échec déjà établi. E ne démontre pas une impossibilité de réglage. Dans le témoin abstrait, toutes les paires sont compatibles. Les paires contenant 02 échouent notamment sur la géométrie actuelle.\n\n'+matrix.join('\n')+'\n\n'+nums.map(n=>n.id+' : '+n.cle+' ('+(n.observe===null?'à vérifier':n.observe?'tenue':'échec')+')').join('  \n')+'\n');
save('temoin-abstrait.json',{avertissement:'Construction mathematique, PAS des parties jouees. Prouve la non-contradiction des cibles numeriques seules, PAS leur realisabilite par le jeu.',graines:50,
 inerte:{premiereMort:7,fin:30},tourneur:{fin:60},maladroit:{fin:90,atteint:0},kamikaze:{fin:90,atteint:0,victoires:0},
 humain:{defaitesAvantCyclope:40,tempsDefaitesAvantCyclope:150,defaitesCyclope:5,tempsDefaitesCyclope:300,victoires:5,tempsVictoires:350,lassoCourt:{reussis:50,tentatives:100},lassoLong:{reussis:40,tentatives:100}},
 bon:{atteint:25,victoires:10,perdVieAvantCyclope:35},expert:{atteint:45,victoires:30,perdVie:45},dieu:{tousGagnent:true,temps:350,combat:70,horsCombat:280,erreurs:0},rythme:{pics:[6,10,14,18,22],respiration:8,tirsV1:0}});
const temoin=lire('temoin-abstrait.json'),ctx={window:{__N:{}}};
vm.runInNewContext(fs.readFileSync(path.join(ROOT,'src/02-regles.js'),'utf8'),ctx);
const P=ctx.window.__N.R.pilotes,t=temoin,n=t.graines,dans=(v,b)=>v>=b[0]&&v<=b[1];
const w={
 'inerte.35':t.inerte.fin<P.inerte.perdAvant,'inerte.mur8':t.inerte.premiereMort<P.inerte.premiereMortAvant,'tourneur.90':t.tourneur.fin<P.tourneur.perdAvant,
 'maladroit.mediane':dans(t.maladroit.fin,P.maladroit.medianeGameOver),'maladroit.cyclope':t.maladroit.atteint===P.maladroit.cyclope,
 'kamikaze.avant':1-t.kamikaze.atteint/n>=P.kamikaze.perdAvantCyclope,'kamikaze.gagne':t.kamikaze.victoires<=P.kamikaze.gagneMax,
 'humain.mediane':dans(t.humain.tempsDefaitesAvantCyclope,P.humain.medianeGameOver),'humain.lassoCourt':t.humain.lassoCourt.reussis/t.humain.lassoCourt.tentatives>=P.humain.lasso.court,'humain.lassoLong':t.humain.lassoLong.reussis/t.humain.lassoLong.tentatives>=P.humain.lasso.long,
 'bon.cyclope':dans(t.bon.atteint/n,P.bon.cyclope),'bon.bat':dans(t.bon.victoires/n,P.bon.bat),'expert.bat':dans(t.expert.victoires/n,P.expert.bat),'expert.perdVie':t.expert.perdVie/n>=P.expert.perdVie,
 'dieu.duree':t.dieu.tousGagnent&&dans(t.dieu.temps,P.dieu.duree),'dieu.combat':dans(t.dieu.combat,P.dieu.combat),'dieu.erreurs':!t.dieu.erreurs,
 'rythme.pics':t.rythme.pics.every((v,i,a)=>!i||v>a[i-1]),'rythme.respiration':t.rythme.respiration>=ctx.window.__N.R.secteurs[0].respiration.duree,'rythme.tirs':!t.rythme.tirsV1};
save('verification-temoin.json',{avertissement:'Verification algebrique uniquement, aucune partie simulee',cibles:w,conforme:Object.keys(w).length===20&&Object.values(w).every(Boolean),paires:190});
if(!Object.values(w).every(Boolean))throw Error('Temoin abstrait invalide');
const R04='/Users/manonwojciechowski/Projets/wt-snake/recus/batterie-318ce61/R-04.json';fs.copyFileSync(R04,path.join(HERE,'R-04-318ce61.json'));
const files=['CONTRAT.md','DIRECTION.md','REFONTE.md','refonte/couverture-snake2030.md','refonte/VISION-PROGRESSION.md','refonte/lots/pilotes.md','tools/pilotes/parties.mjs','tools/pilotes/sortie.json','tools/reglage/banc.mjs','tools/reglage/protocole.mjs','tools/reglage/vm.mjs','tools/reglage/analyse.mjs','tools/reglage/rapport.md','tools/mesure/parties.mjs','tools/mesure/criteres/R-04-difficulte.mjs','tools/mesure/criteres/R-15-rythme.mjs','tools/mesure/criteres/R-34-lasso.mjs','tools/codex-p14/rapport.md','tools/codex-p14/avant-src/85-pilote.js','tools/codex-11/rapport.md','refonte/mediation/2026-10-18-codex-11.md'];
const src=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(HERE,'sources-recues.json.gz'))));
save('sources-manifest.json',{dateParis:date(),sourceHead:lire('actuel.json').head,sourceSha256:hash(src),sourcesToujoursIdentiques:src.every(([f,s])=>fs.readFileSync(path.join(ROOT,'src',f),'utf8')===s),indexSha256:hash(fs.readFileSync(path.join(ROOT,'index.html'))),instruments:['mesurer.mjs','analyser.mjs','relire-318.mjs','verifier.mjs','rapport.mjs','auditer.mjs'].map(f=>({fichier:f,sha256:hash(fs.readFileSync(path.join(HERE,f)))})),entrees:files.map(f=>({fichier:f,sha256:hash(fs.readFileSync(path.join(ROOT,f)))})),R04archiveSha256:hash(fs.readFileSync(R04))});
console.log(JSON.stringify({paires:paires.length,pilotes:actuel.pilotes,Bp5:actuel.bancP5.nbB,BavecDefinitionsR04:Object.values(B).filter(x=>x===true).length,Binconnues:Object.entries(B).filter(([,v])=>v===null),avant:avant.pilotes},null,2));
