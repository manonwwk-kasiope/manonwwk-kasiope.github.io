// Mesure le prélèvement RÉEL de longueur, pas seulement le minuteur d'une annonce.
import fs from 'node:fs';import assert from 'node:assert/strict';
import {monde,sources,ICI,PROTO}from './vm.mjs';import {schemas,raccorder}from './raccords.mjs';
const avant=process.argv.includes('--avant'),src=avant?schemas(JSON.parse(fs.readFileSync(ICI+'/recu-sources.json'))):raccorder(sources());
const banc=fs.readFileSync(PROTO+'/tools/serpents/banc.mjs','utf8'),aides=banc.slice(banc.indexOf('function aides()'),banc.indexOf('async function entrerNeon'));
const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),cas:[]};
for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(const type of ['tique','voleur']){
 const m=monde(src,{w,h});m.run('('+aides+')()');
 m.c.typeCas=type;const r=m.run(`(function(){
  const N=window.__N,B=window.__B,h=N.R.temps.h;
  N.horloge.avancer();N.ev.verifier(true);N.game.dbg.etat('titre');N.game.dbg.simuler(.25);N.S.input.valider=true;N.game.dbg.simuler(.025);N.S.input.valider=false;
  for(let i=0;i<500&&N.aventure.etape()!=='neon';i++){N.aventure.sauter();N.game.dbg.simuler(.05);}
  B.scene();B.tirs(false);N.serpents.remiseStats();N.journal.actif(true);N.journal.vider();
  const e=N.serpents.forcer(typeCas);if(!e)return {erreur:'pas de naissance'};
  B.sim(14,()=>typeCas==='tique'?e._st==='accroche':e.etat!=='portail'&&B.vu(e)&&e._pretSerpent!==false);
  B.statique(true,e);let debut=null,fin=null,len0=N.joueuse.len();
  for(let i=0;i<1200;i++){
   B.sim(h);if(debut===null&&(e._st==='mord'||e._st==='arrache'))debut=N.horloge.t();
   if(N.joueuse.len()<len0){fin=N.horloge.t();break;}
  }
  const r={type:typeCas,preavisReel:debut===null||fin===null?null:fin-debut,perdu:len0-N.joueuse.len(),debut,fin,journal:N.journal.dump(),err:window.__ERR.count};
  B.finScene();return r;
 })()`);
 sortie.cas.push({profil,...r,console:m.erreurs});console.log(profil,type,r.preavisReel,r.perdu,r.err);
}
 sortie.conforme=sortie.cas.length===6&&sortie.cas.every(c=>c.preavisReel>=(c.type==='tique'?.9:(avant?.6:.8))-1e-6&&c.perdu===(c.type==='tique'?1:2)&&!c.err&&!c.console.length);
 fs.writeFileSync(ICI+'/morsures-'+(avant?'avant':'apres')+'.json',JSON.stringify(sortie,null,2));assert.ok(sortie.conforme);
