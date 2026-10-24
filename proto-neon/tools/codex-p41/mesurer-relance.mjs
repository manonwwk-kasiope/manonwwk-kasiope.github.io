import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {ICI,monde,compiler,hash,dateParis} from './vm.mjs';
import {raccorder} from './raccords.mjs';
import {relance,main} from './relance.mjs';
const save=(f,x)=>fs.writeFileSync(path.join(ICI,f),JSON.stringify(x,null,2)+'\n');
assert(JSON.parse(fs.readFileSync(path.join(ICI,'calibration.json'))).conforme,'Calibration obligatoire');
const avant=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(ICI,'sources-avant.json.gz')))),apres=raccorder(avant);
const p38=raccorder(avant,'p38'),combine=raccorder(p38);
assert.equal(hash(combine),hash(raccorder(apres,'p38')),'Commutativité p38/p41');
save('compatibilite.json',{dateParis:dateParis(),p41SurRecu:true,p41ApresP38:true,p38ApresP41:true,memesSourcesFinales:true,shaAvant:hash(avant),shaApres:hash(apres),shaP38:hash(p38),shaCombine:hash(combine)});
fs.writeFileSync(path.join(ICI,'sources-apres.json.gz'),zlib.gzipSync(JSON.stringify(apres)));
const cas=[];
for(const [version,src]of [['avant',avant],['apres',apres],['p38',p38],['p38+p41',combine]]){
 const instrument=src.map(([f,s])=>[f,f==='90-boot.js'?s+'\nwindow.__P41Image=frame;':s]);
 const script=compiler(instrument);
 for(const [profil,w,h]of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]){
  for(const mode of ['clavier','toucher']){
   const m=monde(script,1,w,h);m.c.options={mode};
   const r=vm.runInContext('('+relance.toString()+')(options)',m.c);
   const mainMonde=monde(script,1,w,h),controleMain=vm.runInContext('('+main.toString()+')()',mainMonde.c);
   const recu={version,profil,...r,controleMain,erreursConsole:[...m.erreurs,...mainMonde.erreurs]};
   const fichier=`relance-${version.replace('+','-')}-${profil}-${mode}.json.gz`;
   fs.writeFileSync(path.join(ICI,fichier),zlib.gzipSync(JSON.stringify(recu)));
   const {images,journal,...resume}=recu;
   cas.push({...resume,fichier,journalSha256:hash(journal),imagesSha256:hash(images)});
   console.log(JSON.stringify({version,profil,mode,secondes:r.secondes,etats:r.etats,err:r.err,console:m.erreurs,main:controleMain}));
   save('relance-vm.json',{dateParis:dateParis(),limite:'Frame réelle et tampon procédural sans DOM ni actifs décodés ; pas une capture navigateur/Safari.',cas});
  }
 }
}
