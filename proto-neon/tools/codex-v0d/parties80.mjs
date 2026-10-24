import fs from 'node:fs';
import z from 'node:zlib';
import assert from 'node:assert/strict';
import {ICI,sources,compiler,jouer,hash,sauver,dateParis} from './vm.mjs';
import {raccorder} from './raccords.mjs';
assert(JSON.parse(fs.readFileSync(ICI+'/calibration.json')).conforme);
const avant=JSON.parse(z.gunzipSync(fs.readFileSync(ICI+'/sources-avant.json.gz'))),apres=raccorder(sources());
fs.writeFileSync(ICI+'/sources-apres-raccordees.json.gz',z.gzipSync(JSON.stringify(apres)));
const scripts={avant:compiler(avant),apres:compiler(apres)},cas=[];
fs.mkdirSync(ICI+'/parties',{recursive:true});
for(const pilote of ['inerte','tourneur','maladroit','kamikaze','humain','bon','expert','dieu'])for(let graine=1;graine<=10;graine++){
 const brut={},paire={pilote,graine};
 for(const version of ['avant','apres']){
  const r=jouer(scripts[version],pilote,graine);brut[version]=r;
  const fichier=`parties/${version}-${pilote}-${graine}.json.gz`;fs.writeFileSync(ICI+'/'+fichier,z.gzipSync(JSON.stringify(r)));
  paire[version]={raison:r.raison,tempsJeu:r.tempsJeu,vague:r.vague,score:r.score,err:r.err,erreursConsole:r.erreursConsole,journalSha256:hash(r.journal),fichier};
 }
 paire.identique=hash(brut.avant)===hash(brut.apres);cas.push(paire);
 sauver('parties80.json',{dateParis:dateParis(),sources:{avant:hash(avant),apres:hash(apres)},complete:cas.length===80,identiques:cas.filter(c=>c.identique).length,fins:cas.filter(c=>c.apres.raison==='fin').length,cas});
 console.log(JSON.stringify({pilote,graine,identique:paire.identique,...paire.apres}));
 if(global.gc)global.gc();
}
assert(cas.every(c=>c.identique&&!c.apres.err&&!c.apres.erreursConsole.length));
