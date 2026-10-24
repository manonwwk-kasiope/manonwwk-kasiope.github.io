import fs from 'node:fs';import assert from 'node:assert/strict';
import {sources,monde} from './vm.mjs';import {installer} from './sonde.mjs';
const {c,N,S}=monde(sources());N.gfx.resize(1440,900);N.journal.actif(true);N.journal.vider();N.fx.setFlash(true);
const a=N.fx.flashThreshold();
N.fx.flashGate(1,{type:'petit',ci:N.pal.i('os')});
N.fx.flashGate(a*2,{type:'grand',ci:N.pal.i('os')});
N.fx.flashGate(a*2,{type:'grand',ci:N.pal.i('os')});
S.frame++;N.fx.flashGate(a*2);S.frame++;N.fx.flashGate(a*2);S.frame++;
N.fx.boom(100,100,0.6,N.pal.i('brasier'));
N.fx.flashGate(a*2);
N.fx.setFlash(false);S.frame++;N.fx.flashGate(a*2);N.fx.setFlash(true);
const journal=N.journal.lire('flash'),issues=[...new Set(journal.map(e=>e.d._issue))];
for(const issue of ['sous-seuil','plein','rafale','reduit','budget','reglage'])assert.ok(issues.includes(issue),issue);
for(const e of journal){assert.deepEqual(Array.from(N.ids.valider('journal:flash',e)),[]);assert.equal(e.image,e.d._image);assert.ok('_luminance'in e.d&&'_rouge'in e.d&&e.d._type);}
installer(c);const t=c.__P10.tetes();assert.equal(t.completes,48);assert.ok(t.cas.every(x=>x.w===13&&x.h===13&&x.cx===6&&x.cy===6));
// Le détecteur doit réellement refuser une gaine percée : mutation limitée au monde de test.
const s=N.spr.get('tete',0,0),i=s.data.findIndex(v=>v===15),old=s.data[i];s.data[i]=0;const fautif=c.__P10.tetes();s.data[i]=old;assert.ok(fautif.completes<48);
assert.equal(c.__ERR.count,0);
fs.writeFileSync(new URL('journal-et-tetes.json',import.meta.url),JSON.stringify({issues,journal,tetes:t,instrument:{gainePerceeCompletes:fautif.completes},err:c.__ERR},null,2)+'\n');
console.log(issues.join(', '),'48/48 gaines ; trou détecté',fautif.completes+'/48');
