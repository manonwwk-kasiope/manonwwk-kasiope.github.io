import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { monde,here } from './vm.mjs';
const preuve=JSON.parse(fs.readFileSync(path.join(here,'validation-vm.json')));
assert.ok(preuve.identiques>=10&&preuve.cas.every(c=>c.identique));
const {N,c,erreurs}=monde({integration:true});
vm.runInContext(fs.readFileSync(path.join(here,'scenes.js'),'utf8'),c);
const T=c.__P1B,out={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),integrationAnticipee:true,freins:[]};
for(const id of ['onde','sillage']) {
  T.preparer();for(let i=0;i<3;i++)N.cartes.choisir(id);
  const q=id==='sillage'?N.joueuse.segPos(N.joueuse.len()):{x:500,y:270};
  const e=N.ennemis.spawn('fleche',q.x,q.y);
  T.pas(id==='onde'?145:1);
  const a={x:e.x,y:e.y};
  N.ennemis.update(N.R.temps.h);const b={x:e.x,y:e.y};
  N.arsenal.update(N.R.temps.h);const d={x:e.x,y:e.y};
  const libre=Math.hypot(b.x-a.x,b.y-a.y),effectif=Math.hypot(d.x-a.x,d.y-a.y);
  const ratio=effectif/libre,attendu=N.R.armes[id].paliers[2].ralenti;
  out.freins.push({id,libre,effectif,ratio,attendu,pv:e.pv});
  assert.ok(libre>0&&Math.abs(ratio-attendu)<1e-9);
}
T.preparer();for(let i=0;i<4;i++)N.cartes.choisir('sillage');
let max=0;
for(let i=0;i<220;i++) {
  N.joueuse.force({x:300+i*2,y:250,ang:0,len:24,trace:true});T.pas(1);
  max=Math.max(max,N.arsenal.etat().sillage);
}
out.memoire={max,limite:N.R.armes.sillage.pointsMax};assert.equal(max,out.memoire.limite);
N.joueuse.force({x:200,y:250,ang:0,len:24,trace:true});T.pas(1);
out.apresTeleportation=N.arsenal.etat().sillage;assert.equal(out.apresTeleportation,1);
N.arsenal.reset();out.apresReset=N.arsenal.etat();assert.equal(out.apresReset.sillage,0);assert.equal(out.apresReset.freins,0);
out.erreurs=c.__ERR;out.console=erreurs;assert.equal(c.__ERR.count,0);assert.equal(erreurs.length,0);
fs.writeFileSync(path.join(here,'limites-vm.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify(out));
