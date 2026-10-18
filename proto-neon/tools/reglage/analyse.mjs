import { resumer, mediane, medianeFins, ciblesR04 } from '../mesure/parties.mjs';
export { mediane };
const plage = a => a.length ? [Math.min(...a),Math.max(...a)] : null;
export function analyser(r) {
  const resume = resumer({ok:true,raison:r.fin ? 'fin' : r.raison,journal:r.journal,echantillons:r.trace.map(p=>({t:p.t,etat:p.e,vague:p.n})),fin:{t:r.tempsJeu,score:r.score}});
  const j=r.journal;
  const v1=j.find(e=>e.type==='vague'&&e.d.evt==='entree'&&e.d.n===1),v2=j.find(e=>e.type==='vague'&&e.d.evt==='entree'&&e.d.n===2);
  const coups=j.filter(e=>e.type==='coup');
  const essais=[]; let essai=null;
  for (const e of j) {
    if(e.type==='pilote'&&e.d.evt==='lassoTente'){essai={longueur:e.d.longueur,t:e.t,pas:e.pas,reussi:false};essais.push(essai);}
    if(e.type==='lasso'&&essai)essai.reussi=true;
    if(e.type==='pilote'&&e.d.evt==='lassoFin')essai=null;
  }
  const lasso = bornes => {const a=essais.filter(e=>e.longueur>=bornes[0]&&e.longueur<=bornes[1]);return {tentatives:a.length,reussis:a.filter(e=>e.reussi).length};};
  // Le numéro de vague reste à 5 pendant le boss : ne pas y compter les ennemis du combat.
  const pics={}, premierBoss=r.trace.findIndex(p=>p.e==='boss');
  for(let k=0;k<r.trace.length&&(premierBoss<0||k<premierBoss);k++){
    const p=r.trace[k];if(p.n>=1&&p.n<=5&&['jeu','mort','reapparition'].includes(p.e))pics[p.n]=Math.max(pics[p.n]||0,p.vivants);
  }
  const respirations=[];
  for(const [n,pic] of Object.entries(pics)){
    const trace=r.trace, idx=trace.reduce((acc,p,i)=>p.n===+n&&['jeu','mort','reapparition'].includes(p.e)&&p.vivants===pic?i:acc,-1);
    if(idx<0)continue;
    // Inclure l'entrée calme de la vague suivante ; s'arrêter à son pic, au boss ou à la fin.
    const picSuivant=pics[+n+1];
    const suivant=trace.findIndex((p,i)=>i>idx&&((p.n===+n+1&&p.vivants===picSuivant&&p.e==='jeu')||p.e==='boss'||p.e==='fin'));
    const fin=suivant<0?trace.length-1:suivant;
    let debut=null,jeu=0,reel=0;
    for(let i=idx+1;i<=fin;i++){
      const p=trace[i];
      if(p.vivants < .4*pic){if(debut===null)debut=i;}
      else if(debut!==null){jeu=Math.max(jeu,p.t-trace[debut].t);reel=Math.max(reel,p.reel-trace[debut].reel);debut=null;}
    }
    if(debut!==null){jeu=Math.max(jeu,trace[fin].t-trace[debut].t);reel=Math.max(reel,trace[fin].reel-trace[debut].reel);}
    const nettoyee=j.some(e=>e.type==='vague'&&e.d.n===+n&&['nettoyee','soupape'].includes(e.d.evt));
    respirations.push({n:+n,pic,jeu,reel,complete:nettoyee,tenu:nettoyee?jeu>=8:null});
  }
  return {pilote:r.pilote,graine:r.graine,fin:r.fin,raison:r.raison,err:r.err,erreursConsole:r.erreursConsole,
    temps:r.tempsJeu,tempsCombat:r.tempsCombat,score:r.score,vague:r.vague,atteint:resume.cyclopeAtteint,battu:resume.victoire,
    combat:resume.combatCyclope,combatJusquaVictoire:resume.combatCyclopeJusquaVictoire,
    morts:resume.morts.length,mortAvant:resume.morts.some(e=>resume.entreeCyclope===null||e.t<resume.entreeCyclope),
    premiereMort:resume.premiereMort,
    coupV1:coups.some(e=>e.pas>=(v1?.pas||0)&&e.pas<(v2?.pas||Infinity)),premierCoup:coups[0]?.t??null,
    lassoCourt:lasso([8,20]),lassoLong:lasso([30,40]),
    lassos:j.filter(e=>e.type==='lasso').length,apogees:j.filter(e=>e.type==='apogee'&&e.d.evt==='debut').length,
    longueurMaxDepuis:r.longueurMaxDepuis,pics,respirations,tirsAvantV2:r.tirsAvantV2};
}
export function bilan(cas, R = {}) {
  const cibleInerte = ciblesR04(R).inerte;
  const pilotes={};
  for(const nom of [...new Set(cas.map(c=>c.pilote))]){
    const a=cas.filter(c=>c.pilote===nom),n=a.length,pred=f=>a.filter(f).length/n;
    const ratio=k=>{const reussis=a.reduce((s,c)=>s+c[k].reussis,0),tentatives=a.reduce((s,c)=>s+c[k].tentatives,0);return {reussis,tentatives,taux:tentatives?reussis/tentatives:null};};
    pilotes[nom]={n,censures:a.filter(c=>!c.fin).length,mediane:medianeFins(a.map(c=>({finie:c.fin,duree:c.temps}))),temps:plage(a.map(c=>c.temps)),score:mediane(a.map(c=>c.score)),
      atteint:pred(c=>c.atteint),battu:pred(c=>c.battu),mortAvant:pred(c=>c.mortAvant),coupV1:pred(c=>c.coupV1),
      premierCoup30:pred(c=>c.premierCoup!==null&&c.premierCoup<30),mortMur8:pred(c=>c.premiereMort?.cause==='mur'&&c.premiereMort.t<8),mortMur11:pred(c=>c.premiereMort?.cause==='mur'&&c.premiereMort.t<cibleInerte.premiereMortAvant),
      avant35:pred(c=>c.fin&&!c.battu&&c.temps<35),avant90:pred(c=>c.fin&&!c.battu&&c.temps<90),perdAvantCyclope:pred(c=>c.fin&&!c.battu&&!c.atteint),
      perdVie:pred(c=>c.morts>0),combat:plage(a.map(c=>c.combat).filter(Number.isFinite)),combatMediane:mediane(a.map(c=>c.combat)),combatsMesurables:a.filter(c=>Number.isFinite(c.combat)).length,
      lassoCourt:ratio('lassoCourt'),lassoLong:ratio('lassoLong'),lassosMin:Math.min(...a.map(c=>c.lassos)),apogeesMin:Math.min(...a.map(c=>c.apogees)),
      longueurMaxDepuis:(()=>{const b=a.map(c=>c.longueurMaxDepuis??Infinity).sort((x,y)=>x-y);const m=(b[Math.floor((b.length-1)/2)]+b[Math.ceil((b.length-1)/2)])/2;return Number.isFinite(m)?m:'non atteinte par au moins la moitié';})(),
      erreurs:a.reduce((s,c)=>s+c.err+c.erreursConsole.length,0)};
  }
  const bon=cas.filter(c=>c.pilote==='bon'),pics=[1,2,3,4,5].map(n=>{const a=bon.filter(c=>c.pics[n]!==undefined);return{n,effectif:a.length,mediane:mediane(a.map(c=>c.pics[n]))};});
  const respirations=bon.flatMap(c=>c.respirations.map(x=>({...x,graine:c.graine}))),completes=respirations.filter(r=>r.complete);
  const rythme={pics,croissants:pics.every((p,i)=>p.mediane!==null&&(!i||p.mediane>pics[i-1].mediane)),
    respirations:{complete:completes.length,tronquees:respirations.length-completes.length,minJeu:completes.length?Math.min(...completes.map(r=>r.jeu)):null,minReel:completes.length?Math.min(...completes.map(r=>r.reel)):null,echecs:completes.filter(r=>!r.tenu)},
    tirsAvantV2:bon.flatMap(c=>c.tirsAvantV2.map(x=>({...x,graine:c.graine})))};
  const B={},i={}; const between=(v,a,b)=>v!==null&&v>=a&&v<=b;
  const p=pilotes;
  if(p.inerte){B['inerte.35']=p.inerte.avant35===1;B['inerte.mur11']=p.inerte.mortMur11===1;}
  if(p.tourneur){B['tourneur.90']=p.tourneur.avant90===1;i['tourneur.score']=p.bon?p.tourneur.score<.1*p.bon.score:null;}
  if(p.maladroit){B['maladroit.mediane']=between(p.maladroit.mediane,45,150);B['maladroit.cyclope']=p.maladroit.atteint===0;i['maladroit.coup30']=p.maladroit.premierCoup30>=.8;}
  if(p.kamikaze){B['kamikaze.avant']=p.kamikaze.perdAvantCyclope>=.9;B['kamikaze.gagne']=p.kamikaze.battu<=2/50;}
  if(p.humain){B['humain.mediane']=between(p.humain.mediane,120,210);B['humain.lassoCourt']=p.humain.lassoCourt.taux===null?null:p.humain.lassoCourt.taux>=.5;B['humain.lassoLong']=p.humain.lassoLong.taux===null?null:p.humain.lassoLong.taux>=.4;
    i['humain.cyclope']=between(p.humain.atteint,.1,.35);i['humain.bat']=between(p.humain.battu,.02,.12);i['humain.coupV1']=p.humain.coupV1>=.5;}
  if(p.bon){B['bon.cyclope']=between(p.bon.atteint,.3,.6);B['bon.bat']=between(p.bon.battu,.1,.3);i['bon.mortAvant']=p.bon.mortAvant>=.7;i['bon.coupV1']=p.bon.coupV1>=.4;i['bon.longueur']=typeof p.bon.longueurMaxDepuis==='string'||p.bon.longueurMaxDepuis>=120;}
  if(p.expert){B['expert.bat']=between(p.expert.battu,.4,.7);B['expert.perdVie']=p.expert.perdVie>=.8;i['expert.cyclope']=p.expert.atteint>=.8;i['expert.lassos']=p.expert.lassosMin>=10;i['expert.apogees']=p.expert.apogeesMin>=2;}
  if(p.dieu){B['dieu.duree']=!!p.dieu.temps&&p.dieu.temps[0]>=320&&p.dieu.temps[1]<=390&&p.dieu.battu===1;B['dieu.combat']=p.dieu.combatsMesurables!==p.dieu.n?null:!!p.dieu.combat&&p.dieu.combat[0]>=55&&p.dieu.combat[1]<=90&&p.dieu.battu===1;B['dieu.erreurs']=p.dieu.erreurs===0;}
  if(p.bon){B['rythme.pics']=rythme.croissants;B['rythme.respiration']=completes.length?rythme.respirations.echecs.length===0:null;B['rythme.tirs']=!rythme.tirsAvantV2.length;i['rythme.score']=p.kamikaze?p.bon.score>=1.3*p.kamikaze.score:null;}
  // Une partie bornée n'est ni une défaite ni une victoire : aucune cible de son pilote n'est validée.
  for(const [nom,p] of Object.entries(pilotes))if(p.censures){
    for(const k of Object.keys(B))if(k.startsWith(nom+'.')||(nom==='bon'&&k.startsWith('rythme.')))B[k]=null;
    for(const k of Object.keys(i))if(k.startsWith(nom+'.')||(nom==='bon'&&k.startsWith('rythme.')))i[k]=null;
  }
  return {pilotes,rythme,B,i,nbB:Object.values(B).filter(x=>x===true).length};
}
