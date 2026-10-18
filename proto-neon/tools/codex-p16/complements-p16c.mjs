import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {sources,monde} from './vm-bundle-natif.mjs';
import {amorcerPartie,jouerControle} from './raf-controle.mjs';
import {cle,comparer} from '../mesure/criteres/R-30-rejouabilite.mjs';
import {cameraSimulation,gelSimulation} from './raccords.mjs';
const lire=n=>JSON.parse(fs.readFileSync(new URL(n,import.meta.url)));
const d=lire('diagnostic-p16c.json');assert.ok(d.calibration.length>=10&&d.calibration.every(c=>c.identique));
const final=sources(), recu=lire('sources-recues-p16c.json');
function simuler(src,graine=7) {
  const m=monde({...src,'02-regles.js':final['02-regles.js']}),{c,N}=m;c.__DT=1/60;
  N.reseed(graine);N.game.reset(graine);
  const ralentis=[];const ancien=N.fx.ralenti;
  N.fx.ralenti=function(...args){ralentis.push({t:N.horloge.t(),pas:N.horloge.pas(),demande:args,hitstopLeft:N.fx.hitstopLeft(),horloge:N.horloge.etat()});return ancien.apply(this,args);};
  c.cfg={graine};vm.runInContext('('+amorcerPartie.toString()+')(cfg)',c);
  c.cfg={T:60,simulation:true,dessiner:false};const r=vm.runInContext('('+jouerControle.toString()+')(cfg)',c);
  return {...JSON.parse(JSON.stringify(r)),ralentis,console:m.erreurs};
}
const out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),mesures:{}};
for(const[phase,src]of Object.entries({avant:recu,apres:final})) {
  const bis=simuler(src),autre=simuler(src,8),a=d.r30[phase].essais.simule;
  function initial(){const {N}=monde(src);N.reseed(7);N.game.reset(7);N.journal.actif(true);N.game.reset(7,{depart:'plongee',mode:'banc'});return N.journal.dump();}
  const pa=J=>J.filter(x=>x.type==='apparition'||(x.type==='arene'&&x.d.voie!==undefined)).map(x=>JSON.stringify([x.type,Math.round(x.d.x),Math.round(x.d.y),x.d.voie]));
  out.mesures[phase]={initial:comparer(cle(initial(),0),cle(initial(),0)),simuleRepete:comparer(cle(a.journal,60),cle(bis.journal,60)),
    graineDifferente:{different:JSON.stringify(pa(a.journal))!==JSON.stringify(pa(autre.journal)),apparitions:[pa(a.journal).length,pa(autre.journal).length]},
    dessineRepete:d.r30[phase].dessineRepete,framesSansDessin:d.r30[phase].framesSansDessin,dessineSimule:d.r30[phase].dessineSimule,
    erreurs:[a.err,bis.err,autre.err],essais:{bis,autre}};
}
const camera={...final,'79-jeu.js':cameraSimulation(final['79-jeu.js'])};
const original=simuler(camera);
const motif='var gl = hitstopLeft() / 60;';assert.ok(camera['50-fx.js'].includes(motif));
// Diagnostic seulement, aucun fichier réservé écrit. Tester la cause, pas déclarer ce raccord validé.
const essai=simuler({...camera,'50-fx.js':gelSimulation(camera['50-fx.js'])});
const sp=l=>l.map(s=>s.replace(/^\[\d+,/,'['));
out.suiteCamera={preuve:'hitstopLeft reste fondé sur S.frame, que dbg.simuler ne fait jamais avancer ; ralenti borne sa durée avec cette valeur',
  ralentisOriginaux:original.ralentis,ralentisAvecHorloge:essai.ralentis,
  comparaison:comparer(sp(cle(d.r30.apres.essais.dessineRaccord.journal,60,true)),sp(cle(essai.journal,60,true))),
  err:essai.err,fin:essai.fin,journal:essai.journal};
fs.writeFileSync(new URL('complements-p16c.json',import.meta.url),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({...out,mesures:Object.fromEntries(Object.entries(out.mesures).map(([k,v])=>[k,{...v,essais:undefined}])),suiteCamera:{...out.suiteCamera,journal:undefined}},null,2));
assert.ok(Object.values(out.mesures).every(m=>m.initial.egaux&&m.simuleRepete.egaux&&m.graineDifferente.different&&m.erreurs.every(e=>!e.count)));
