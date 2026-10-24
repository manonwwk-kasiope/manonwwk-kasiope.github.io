import fs from 'node:fs';import assert from 'node:assert/strict';import {ICI,sources,compiler,monde,dateParis,hash} from './vm.mjs';import {raccorder}from './raccords.mjs';
assert(JSON.parse(fs.readFileSync(ICI+'/calibration.json')).conforme);
const cas=[];
for(const[profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(const texte of [1,2]){
 const{N,c,erreurs}=monde(compiler(raccorder(sources())),2975,w,h);N.game.dbg.scene('calme');N.score.profil.reglages({texte});N.journal.actif(true);N.journal.vider();N.hud.reset();N.hud.banniere('PRÊTE');N.gfx.clear(0);N.hud.draw();
 const b=N.journal.dump().filter(e=>e.type==='hudBanniere').at(-1)?.d;cas.push({profil,texte,banniere:b,pixelsSha256:hash(Array.from(N.gfx.buf())),err:c.__ERR.count,console:erreurs});
}
const conforme=cas.every(c=>c.banniere&&!c.err&&!c.console.length)&&['paysage','portrait','bureau'].every(p=>cas.find(c=>c.profil===p&&c.texte===2).banniere.echelle>cas.find(c=>c.profil===p&&c.texte===1).banniere.echelle);
fs.writeFileSync(ICI+'/texte.json',JSON.stringify({dateParis:dateParis(),conforme,cas},null,2)+'\n');console.log(conforme,cas.map(c=>[c.profil,c.texte,c.banniere?.echelle]));if(!conforme)process.exitCode=1;
