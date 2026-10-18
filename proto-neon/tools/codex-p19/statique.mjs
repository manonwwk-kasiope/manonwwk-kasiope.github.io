// Node/VM sans DOM. Aucun serveur, aucun Chromium. La validation historique doit
// réussir avant toute conclusion sur la logique ou les sorties caméra.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {sources,monde,ICI,PROTO} from './vm.mjs';
import {scenarioCamera,cameraAppariee,comparerCamera,ancienCalcul} from '../mesure/criteres/R-12-explosion.mjs';
const validationFichier=path.join(ICI,'validation-vm.json');
const vmSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(ICI,'vm.mjs'))).digest('hex');
const precedente=fs.existsSync(validationFichier)?JSON.parse(fs.readFileSync(validationFichier)):null;
if(precedente?.identiques<10 || precedente?.vmSha256!==vmSha256)
  execFileSync(process.execPath,[path.join(ICI,'valider-vm.mjs')],{stdio:'inherit'});
const validation=JSON.parse(fs.readFileSync(path.join(ICI,'validation-vm.json')));
assert.ok(validation.identiques>=10,'VM non validée');
const sonde=fs.readFileSync(path.join(PROTO,'tools/mesure/sonde.js'),'utf8');
const courant=sources();
const dateParis=()=>new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'});
const empreinte=src=>crypto.createHash('sha256').update(src.map(([f,s])=>f+'\n'+s).join('\n')).digest('hex');
function preparer(src,opts={}){
  const m=monde(src,{graine:2975,camera:true,...opts});
  vm.runInContext(sonde,m.c,{filename:'sonde.js'});
  return m;
}
// Cas construits : vraie N.fx.shake, vraie décroissance, vraie horloge et vrais
// pixels N.fx.draw. Caméra au repos puis suivie en mouvement dans un autre test.
function construit(amplitude,{suivi=false}={}){
  const m=preparer(courant),{N,c}=m;
  N.fx.reset(); N.journal.actif(true);
  N.cam.suit({x:N.world.W/2,y:N.world.H/2,ang:0,vit:0});
  N.cam.reset();
  if(amplitude)N.fx.shake(amplitude);
  const trace=[];
  for(let i=0;i<60;i++){
    c.__S.frame++;c.__FRAME=c.__S.frame;
    N.fx.update(N.R.temps.imageRef);
    if(suivi)N.cam.suit({x:N.world.W/2+i,y:N.world.H/2,ang:0,vit:0});
    N.cam.update(N.R.temps.imageRef);
    N.gfx.clear(0);N.fx.draw();N.gfx.present();
    trace.push({f:c.__FRAME,sh:c.__S.shake,cx:N.cam.x,cy:N.cam.y,px:0,py:0,
      pixelsNonNuls:N.gfx.buf().reduce((a,v)=>a+(v!==0),0)});
  }
  assert.equal(c.__ERR.count,0);assert.deepEqual(m.erreurs,[]);
  return {imageCoup:0,trace,err:c.__ERR,journal:N.journal.dump()};
}
const temoin=construit(0),cas=[];
for(const amplitude of [0,8,3]){
  const impact=construit(amplitude),r=cameraAppariee(impact,temoin);
  const attendu=amplitude===8;
  assert.ok(r.ok);assert.equal(r.camera>=courantSeuil(),attendu);
  if(!amplitude)assert.equal(r.camera,0);
  cas.push({amplitude,attendu:attendu?'≥ 6':'< 6',...r,impact,temoin});
}
function courantSeuil(){return preparer(courant).N.R.criteres.R12.camera;}
// Le suivi seul ne passe jamais ; un témoin agité ne doit pas être soustrait par
// son maximum global. Contre-exemple : il culmine avant l'impact, pas au même pas.
const suivi=cameraAppariee(construit(0,{suivi:true}),construit(0,{suivi:true}));assert.equal(suivi.camera,0);
const a={imageCoup:0,trace:Array.from({length:30},(_,i)=>({f:i+1,sh:i===1?8:0}))};
const b={imageCoup:0,trace:Array.from({length:30},(_,i)=>({f:i+1,sh:i===0?12:0}))};
const maximaDecales=cameraAppariee(a,b);assert.equal(maximaDecales.camera,8);
const tronque=cameraAppariee(a,{...b,trace:b.trace.slice(1)});assert.equal(tronque.ok,false);
const duplique=cameraAppariee(a,{...b,trace:b.trace.map((x,i)=>i===1?b.trace[0]:x)});assert.equal(duplique.ok,false);
const nan=cameraAppariee(a,{...b,trace:b.trace.map((x,i)=>i===1?{...x,sh:NaN}:x)});assert.equal(nan.ok,false);
fs.writeFileSync(path.join(ICI,'construits-vm.json'),JSON.stringify({dateParis:dateParis(),seuil:courantSeuil(),cas,suivi,maximaDecales,tronque,duplique,nan},null,2)+'\n');
console.log('Construits VM :',cas.map(c=>[c.amplitude,c.camera]));
const p15=path.resolve(PROTO,'../../codex-p15/proto-neon');
const p15src=fs.readdirSync(path.join(p15,'src')).filter(f=>f.endsWith('.js')).sort().map(f=>[f,fs.readFileSync(path.join(p15,'src',f),'utf8')]);
const rapport={dateParis:dateParis(),limite:'VM sans DOM : vraie frame de 90-boot, vrai tampon procédural et état public ; pas de décodage art, de sortie CRT ou de preuve Safari.',bundles:[]};
for(const [nom,src] of [['codex-p15',p15src],['integre',courant]]){
  const mesures=[];
  for(let index=0;index<4;index++){
    const m=preparer(src);m.c.options={index};
    const avec=m.run('('+scenarioCamera.toString()+')(options)');
    const impact=JSON.parse(JSON.stringify(avec[index]));
    if(!impact.tue.tues){mesures.push({index,impact,nonMesurable:'aucune mort par hit'});continue;}
    const n=preparer(src);n.c.options={index,sansCoup:true,plan:JSON.parse(JSON.stringify(avec))};
    const sans=n.run('('+scenarioCamera.toString()+')(options)');
    const temoin=JSON.parse(JSON.stringify(sans[index]));
    const camera=comparerCamera(impact,temoin),ancien=ancienCalcul(impact),seuil=m.N.R.criteres.R12.camera;
    let suite=0,imagesBrasier=0;
    for(const x of impact.trace.filter(x=>x.f>impact.imageCoup)){suite=x.br>m.N.R.criteres.R12.brasier?suite+1:0;imagesBrasier=Math.max(imagesBrasier,suite);}
    const mesure={index,cible:impact.cible,imagesBrasier,ancien,camera,seuil,verdict:!camera.ok?'non-mesurable':camera.camera>=seuil?'ok':'echec',impact,temoin,consoleImpact:m.erreurs,consoleTemoin:n.erreurs};
    mesures.push(mesure);
    console.log(nom,impact.cible.nom||impact.cible.elite,'ancien',ancien.camera,'apparié',camera.camera,camera.raison||'', 'erreurs',impact.erreurs.count,temoin.erreurs.count);
  }
  const detail={nom,sourcesSha256:empreinte(src),mesures};
  fs.writeFileSync(path.join(ICI,nom+'-vm.json'),JSON.stringify(detail,null,2)+'\n');
  rapport.bundles.push({nom,sourcesSha256:detail.sourcesSha256,mesures:mesures.map(({impact,temoin,...r})=>r)});
}
fs.writeFileSync(path.join(ICI,'statique.json'),JSON.stringify(rapport,null,2)+'\n');
await import('./ordonnanceur.mjs');
await import('./controler-recus.mjs');
