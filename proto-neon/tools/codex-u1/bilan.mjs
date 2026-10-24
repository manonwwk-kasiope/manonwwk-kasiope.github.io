import fs from 'node:fs';import zlib from 'node:zlib';import assert from 'node:assert/strict';
import {ICI,hash,dateParis}from './vm.mjs';
const lire=n=>JSON.parse(fs.readFileSync(ICI+'/'+n+'.json')),a=lire('avant'),b=lire('apres'),c=lire('hors-score');
assert([a,b,c].every(x=>x.complete&&x.cas.length===80),'Attendre les trois campagnes complètes');
const brut=r=>JSON.parse(zlib.gunzipSync(fs.readFileSync(ICI+'/'+r.fichier)));
const cas=a.cas.map((x,i)=>{
 const y=b.cas[i],z=c.cas[i];assert(x.pilote===y.pilote&&x.graine===y.graine&&x.pilote===z.pilote&&x.graine===z.graine);
 const X=brut(x),Y=brut(y),Z=brut(z),combat=r=>r.journal.filter(e=>!['defi','hudBanniere','hudBanniereAdmise'].includes(e.type));
 let premierEcart=null;for(let k=0;k<Math.max(X.journal.length,Y.journal.length);k++)if(JSON.stringify(X.journal[k])!==JSON.stringify(Y.journal[k])){premierEcart={i:k,avant:X.journal[k],apres:Y.journal[k]};break;}
 return{pilote:x.pilote,graine:x.graine,tempsAvant:x.tempsJeu,tempsApres:y.tempsJeu,scoreAvant:x.score,scoreApres:y.score,deltaScore:y.score-x.score,vagueAvant:x.vague,vagueApres:y.vague,raisonAvant:x.raison,raisonApres:y.raison,
  resumeIdentique:['tempsJeu','tempsCombat','tempsSimule','pas','vague','score','raison'].every(k=>x[k]===y[k]),
  trajectoireIdentique:['tempsJeu','tempsCombat','tempsSimule','pas','vague','raison','echantillonsSha256'].every(k=>x[k]===y[k])&&hash(x.morts)===hash(y.morts)&&hash(x.cartes)===hash(y.cartes),
  journalIdentique:x.journalSha256===y.journalSha256,combatIdentique:hash(combat(X))===hash(combat(Y)),
  horsScoreStrictIdentique:hash(X)===hash(Z),errAvant:x.err,errApres:y.err,errHorsScore:z.err,consoleAvant:x.erreursConsole,consoleApres:y.erreursConsole,consoleHorsScore:z.erreursConsole,premierEcart};
});
const r={dateParis:dateParis(),cas,complete:true,mesures:{resumesIdentiques:cas.filter(c=>c.resumeIdentique).length,trajectoiresIdentiques:cas.filter(c=>c.trajectoireIdentique).length,journauxIdentiques:cas.filter(c=>c.journalIdentique).length,combatIdentique:cas.filter(c=>c.combatIdentique).length,horsScoreStrictIdentiques:cas.filter(c=>c.horsScoreStrictIdentique).length,erreurs:cas.reduce((n,c)=>n+c.errAvant+c.errApres+c.errHorsScore,0)},bornes:cas.filter(c=>c.raisonAvant!=='fin'||c.raisonApres!=='fin')};
fs.writeFileSync(ICI+'/comparaison80.json',JSON.stringify(r,null,2)+'\n');console.log(r.mesures,r.bornes.map(c=>[c.pilote,c.graine,c.tempsAvant,c.tempsApres]));
assert(cas.every(c=>c.trajectoireIdentique&&c.horsScoreStrictIdentique&&!c.errAvant&&!c.errApres&&!c.errHorsScore&&!c.consoleAvant.length&&!c.consoleApres.length&&!c.consoleHorsScore.length),'Écart non expliqué : publier la valeur, ne pas assouplir ce verdict');
