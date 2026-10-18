/* Cas supplémentaires, sans rejouer les dix références déjà vérifiées. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { compiler, monde, sources } from '../codex-p21/vm.mjs';
import { latence, horlogeReelle } from '../mesure/tactile.mjs';
const validation=JSON.parse(fs.readFileSync(new URL('./vm.json',import.meta.url)));
assert.ok(validation.vmValide&&validation.validation.length>=10&&validation.validation.every(c=>c.identique),'VM de référence non validée');
const resultat={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),limite:'Handlers et frame des vraies sources ; temps VM, aucun verdict navigateur.',cas:[]};
const code=compiler(sources());
for(const [width,height] of [[844,390],[390,844],[1440,900]]){
  const {N,S,c,erreurs}=monde(code,2975,width,height),B=c.__BOOT_TEST;
  c.__now=0;N.intro.skip();N.intro.stop();N.game.reset(2975);N.game.dbg.scene('calme');N.game.dbg.god(true);S.reglages.actions='doigts';
  const A=N.outils.A;N.joueuse.force({x:(A.x0+A.x1)/2,y:(A.y0+A.y1)/2,ang:0,trace:true});
  const trace=[],touch=(type,x,y)=>B[type]({type:type==='start'?'touchstart':'touchmove',changedTouches:[{identifier:1,clientX:x,clientY:y}],touches:[{identifier:1,clientX:x,clientY:y}],cancelable:true,preventDefault(){}});
  function avancer(ms){const fin=c.__now+ms;while(c.__now<fin){c.__now=Math.min(fin,c.__now+1000/60);B.frame(c.__now);trace.push({r:c.__now,f:c.__FRAME,t:N.horloge.t(),x:S.player.x,y:S.player.y,ang:S.player.ang,vise:S.player.angVise,paused:S.paused,dtForce:true});}}
  touch('start',100,180);touch('move',130,180);avancer(500);
  const evenement={f:c.__FRAME,r:c.__now};touch('move',100,150);avancer(450);
  const mesure=latence(evenement,trace,-Math.PI/2,4*Math.PI/180),horloge=horlogeReelle(trace);
  const deplacement=trace.some(i=>Math.hypot(i.x-mesure.avant.x,i.y-mesure.avant.y)>0);
  const ok=mesure.ok&&mesure.images===N.R.criteres.R22.latenceImages&&mesure.virageMs!==null&&mesure.virageMs<=350&&deplacement&&!c.__ERR.count&&!erreurs.length;
  // Une VM impose forcément le temps : le garde navigateur DOIT la refuser.
  assert.equal(horloge.ok,false);
  resultat.cas.push({profil:[width,height],ok,mesure,deplacement,horloge,journal:N.journal.dump(),trace,err:c.__ERR.count,erreurs});
}
resultat.conforme=resultat.cas.every(c=>c.ok);
fs.writeFileSync(new URL('./direction-vm.json',import.meta.url),JSON.stringify(resultat,null,2)+'\n');
console.log(JSON.stringify(resultat.cas.map(c=>({profil:c.profil,ok:c.ok,latenceImages:c.mesure.images,virageMs:c.mesure.virageMs,err:c.err}))));
if(!resultat.conforme)process.exitCode=1;
