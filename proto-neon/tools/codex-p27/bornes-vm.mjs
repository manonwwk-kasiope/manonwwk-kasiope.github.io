import fs from 'node:fs';import assert from 'node:assert/strict';
import {monde,sources,ICI}from './vm.mjs';import {raccorder}from './raccords.mjs';
const src=raccorder(sources()),cas=[];
for(const mode of ['plafond','dur','inversion','respiration','horsJeu','reprise']){
 const m=monde(src),N=m.N;N.intro.skip();N.game.reset(7,{depart:'plongee'});N.game.dbg.vague(2);N.ev.verifier(true);N.ennemis.reset();N.dir.tempsVague=()=>N.R.serpents.plan[2][0].t;
 if(mode==='dur')for(let i=0;i<N.R.secteurs[0].plafondDur.ennemis;i++)N.ennemis.spawn('fleche',0,0,{ext:true});
 if(mode==='inversion')N.ennemis.inverser(1);if(mode==='respiration')N.dir.respiration=()=>({active:true});if(mode==='horsJeu')N.game.dbg.etat('pause');
 N.serpents.pasPartie(N.R.temps.h,mode==='plafond'?0:100);
 const types=N.ennemis.list.filter(e=>['tique','voleur','miroir','brouilleur'].includes(e.type)).map(e=>e.type);
 assert.equal(types.length,mode==='reprise'?1:0);if(mode==='reprise'){assert.equal(N.ennemis.counts().regular,1);N.serpents.pas(N.R.temps.h);assert.equal(N.ennemis.list.length,1);}
 cas.push({mode,types,total:N.ennemis.count(),file:N.serpents.etat().file,err:m.c.__ERR.count});assert.equal(m.c.__ERR.count,0);
}
fs.writeFileSync(ICI+'/bornes.json',JSON.stringify({conforme:true,cas},null,2));console.log(cas.length,'bornes et reprise OK');
