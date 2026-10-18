import fs from 'node:fs';
import {HERE,read,snap,save,hash,date} from './mesurer.mjs';
const mediane=a=>{const s=a.filter(Number.isFinite).sort((a,b)=>a-b);return s.length?(s[Math.floor((s.length-1)/2)]+s[Math.ceil((s.length-1)/2)])/2:null;};
function analyser(c){
 const r=snap(c.recu),j=r.journal,of=t=>j.filter(e=>e.type===t),p=of('pilote');
 const arrivees=of('phase').filter(e=>e.d.evt==='arrivee'),entrees=of('phase').filter(e=>e.d.evt==='entree');
 const victoires=of('section').filter(e=>e.d.nom==='victoire'),mortsBoss=of('phase').filter(e=>e.d.evt==='mort');
 const v1=of('vague').find(e=>e.d.evt==='entree'&&e.d.n===1),v2=of('vague').find(e=>e.d.evt==='entree'&&e.d.n===2);
 const coupsV1=of('coup').filter(e=>e.pas>=(v1?.pas??0)&&e.pas<(v2?.pas??Infinity));
 const essais=[];let actif=null;
 for(const e of j){
  if(e.type==='pilote'&&e.d.evt==='lassoTente'){
   if(actif)actif.fin=actif.fin??e.t;
   actif={pas:e.pas,t:e.t,...e.d,fin:null,raison:null};essais.push(actif);
  }
  if(e.type==='pilote'&&e.d.evt==='lassoFin'&&actif){actif.fin=e.t;actif.raison=e.d.raison;actif=null;}
 }
 const captures=of('lasso');
 for(let i=0;i<essais.length;i++){
  const e=essais[i],limite=(e.fin??r.tempsJeu)+0.3;
  e.captures=captures.filter(x=>x.pas>=e.pas&&x.t<=limite).map(x=>({t:x.t,pas:x.pas,n:x.d.n}));e.reussi=!!e.captures.length;
 }
 const victoire=!!victoires.length||!!mortsBoss.length;
 return {...c,arrivee:arrivees[0]?.t??null,entree:entrees[0]?.t??null,arrivees,entrees,victoires,mortsBoss,
  victoire,coupsV1,coupV1:!!coupsV1.length,gameOver:r.etat==='fin'&&!victoire?r.tempsJeu:null,
  morts:of('mort').map(e=>({tHorloge:e.t,pas:e.pas,charge:e.d})),
  essais,lassos:captures.length,pouvoirsReels:of('pouvoir').filter(e=>e.d.evt==='debut').length,
  apogeesReelles:of('apogee').filter(e=>e.d.evt==='debut').length,
  pouvoirsPilote:p.filter(e=>e.d.evt==='pouvoir').length,apogeesPilote:p.filter(e=>e.d.evt==='apogee').length,
  sorties:r.sorties,bruits:p.filter(e=>e.d.evt==='cap').map(e=>e.d.bruit),
  premiereEntree:j[0],partiePresente:j.some(e=>e.type==='partie'),nombreEvenements:j.length};
}
const avant=read('avant.json'),apres=read('apres.json');
if(!avant.complete||!apres.complete)throw Error('Série incomplète');
const champs=['raison','etat','tempsJeu','tempsCombat','tempsSimule','pas','vague','score','err','erreurs','erreursConsole','journalSha256','sortiesSha256'];
const paires=avant.cas.filter(c=>c.pilote!=='humain').map(a=>{const b=apres.cas.find(c=>c.pilote===a.pilote&&c.graine===a.graine);const differences=champs.filter(k=>JSON.stringify(a[k])!==JSON.stringify(b[k]));return {pilote:a.pilote,graine:a.graine,identique:!differences.length,differences,avant:a.recu,apres:b.recu,journalSha256:a.journalSha256};});
save('paires-70.json',{dateParis:date(),champs,conforme:paires.length===70&&paires.every(c=>c.identique),paires});
function bilan(cas){
 const essais=cas.flatMap(c=>c.essais),lasso=(min,max)=>{const a=essais.filter(e=>e.longueur>=min&&e.longueur<=max);return {tentatives:a.length,reussies:a.filter(e=>e.reussi).length,taux:a.length?a.filter(e=>e.reussi).length/a.length:null};};
 const bruits=cas.flatMap(c=>c.bruits),mean=bruits.reduce((s,b)=>s+b,0)/bruits.length;
 return {n:cas.length,terminees:cas.filter(c=>c.etat==='fin').length,censures:cas.filter(c=>c.raison==='borne').length,
  defaites:cas.filter(c=>c.gameOver!==null).length,medianeGameOver:mediane(cas.map(c=>c.gameOver)),medianeToutesFins:mediane(cas.filter(c=>c.etat==='fin').map(c=>c.tempsJeu)),
  arrivees:cas.filter(c=>c.arrivee!==null).length,entreesCombat:cas.filter(c=>c.entree!==null).length,victoires:cas.filter(c=>c.victoire).length,coupV1:cas.filter(c=>c.coupV1).length,
  lassos:{tentatives:essais.length,moinsDeQuatre:essais.filter(e=>e.n<4).length,reussies:essais.filter(e=>e.reussi).length,captures:cas.reduce((s,c)=>s+c.lassos,0),court:lasso(8,20),long:lasso(30,40)},
  pouvoirsPilote:cas.reduce((s,c)=>s+c.pouvoirsPilote,0),apogeesPilote:cas.reduce((s,c)=>s+c.apogeesPilote,0),
  impulsionsPouvoir:cas.reduce((s,c)=>s+c.sorties.pouvoir.length,0),impulsionsApogee:cas.reduce((s,c)=>s+c.sorties.apogee.length,0),pasBoost:cas.reduce((s,c)=>s+c.sorties.boost.length,0),
  pouvoirsReels:cas.reduce((s,c)=>s+c.pouvoirsReels,0),apogeesReelles:cas.reduce((s,c)=>s+c.apogeesReelles,0),
  bruit:{n:bruits.length,minDeg:Math.min(...bruits)*180/Math.PI,maxDeg:Math.max(...bruits)*180/Math.PI,moyenneDeg:mean*180/Math.PI,ecartTypeDeg:Math.sqrt(bruits.reduce((s,b)=>s+(b-mean)**2,0)/bruits.length)*180/Math.PI},
  erreurs:cas.reduce((s,c)=>s+c.err+c.erreursConsole.length,0),journauxTronques:cas.filter(c=>!c.partiePresente).length};
}
const bruts={avant:avant.cas.filter(c=>c.pilote==='humain').map(analyser),apres:apres.cas.filter(c=>c.pilote==='humain').map(analyser)};
save('humain-bruts.json',bruts);
const A=bilan(bruts.avant),B=bilan(bruts.apres),entre=(v,a,b)=>v!==null&&v>=a&&v<=b;
const resultat={dateParis:date(),avant:A,apres:B,cibles:{mediane:[120,210],arrivee:[.1,.35],victoire:[.02,.12],lassoCourt:.5,lassoLong:.4},
 verdictCiblesApres:{medianeGameOver:entre(B.medianeGameOver,120,210),arrivee:entre(B.arrivees/B.n,.1,.35),victoire:entre(B.victoires/B.n,.02,.12),coupV1:B.coupV1/B.n>=.5,lassoCourt:B.lassos.court.taux===null?null:B.lassos.court.taux>=.5,lassoLong:B.lassos.long.taux===null?null:B.lassos.long.taux>=.4},
 conformiteGestesHumain:B.impulsionsPouvoir===0&&B.impulsionsApogee===0&&B.pasBoost===0&&B.lassos.moinsDeQuatre===0,
 autres70Identiques:paires.every(p=>p.identique),sourceAvantSha256:avant.sourceSha256,sourceApresSha256:apres.sourceSha256};
save('synthese.json',resultat);
const colonnes=['serie','graine','tempsJeu','tempsCombat','tempsSimule','gameOver','arrivee','entree','victoire','vague','score','lassoTentatives','lassoReussies','lassoMoins4','impulsionsPouvoir','impulsionsApogee','pouvoirsReels','apogeesReelles','erreurs'];
const lignes=[colonnes.join(',')];for(const [serie,cas]of Object.entries(bruts))for(const c of cas)lignes.push([serie,c.graine,c.tempsJeu,c.tempsCombat,c.tempsSimule,c.gameOver,c.arrivee,c.entree,c.victoire,c.vague,c.score,c.essais.length,c.essais.filter(e=>e.reussi).length,c.essais.filter(e=>e.n<4).length,c.sorties.pouvoir.length,c.sorties.apogee.length,c.pouvoirsReels,c.apogeesReelles,c.err+c.erreursConsole.length].map(v=>v??'').join(','));
fs.writeFileSync(HERE+'/humain-100.csv',lignes.join('\n')+'\n');
console.log(JSON.stringify(resultat,null,2));
