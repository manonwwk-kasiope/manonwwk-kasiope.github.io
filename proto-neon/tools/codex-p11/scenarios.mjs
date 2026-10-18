import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { sources, monde } from './vm.mjs';
const phase=process.argv[2]||'apres', src=sources(phase==='avant'?'HEAD':undefined);
const sortie={dateParis:new Date().toLocaleString('fr-FR',{timeZone:'Europe/Paris'}),phase,profils:[]};
for(const [nom,w,h] of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]]) {
 const {c,N,S,stockage,erreurs}=monde(src,w,h);let now=0;c.performance={now:()=>now};
 N.game.reset(7,{depart:'titre'});N.horloge.avancer();
 const disque=JSON.stringify([...stockage]);
 let entree=null;
 for(let temps=0;temps<25;temps+=N.R.temps.h) {N.game.dbg.simuler(N.R.temps.h);if(N.game.etat()==='attraction'){entree=temps+N.R.temps.h;break;}}
 const etat=N.game.etat(), debut={x:S.player.x,y:S.player.y};
 if(entree!==null) N.game.dbg.simuler(3);
 const mouvement=Math.hypot(S.player.x-debut.x,S.player.y-debut.y);
 const silence=N.music.muted('musique')&&N.music.muted('effets');
 if(entree!==null) {S.input.any=true;N.game.update(N.R.temps.h);}
 const sortieDemo=N.game.etat();
 const persistanceIntacte=disque===JSON.stringify([...stockage]);
 // Contrôle unitaire de geste() : la journalisationUnitaire tactile complète exige le navigateur.
 N.journal.vider();
 for(const genre of ['toucher','glisse','tenu'])for(let i=0;i<6;i++){
   c.__genre=genre;c.__doigt={t0:now,x0:250,y0:120,x:genre==='glisse'?290:250,y:120};now+=genre==='tenu'?190:50;c.__t1=now;
   vm.runInContext('geste(__genre,__doigt,__t1)',c);now+=250;
 }
 const gestes=N.journal.lire('geste'), journalisationUnitaire=Object.fromEntries(['toucher','glisse','tenu'].map(g=>[g,gestes.filter(e=>e.d.genre===g).length]));
 const schemas=gestes.map(e=>N.ids.valider('journal:geste',e));
 N.entree?.annuler();S.input.any=false;N.game.reset(7,{depart:'titre'});N.horloge.avancer();N.game.dbg.simuler(0.5);
 S.input.any=true;S.input.taps.push({x:N.gfx.W/2,y:N.gfx.H/2});N.game.update(N.R.temps.h);const aventure=N.game.etat();
 const r={nom,entree,etat,mouvement,silence,sortieDemo,persistanceIntacte,journalisationUnitaire,gestes,schemas,aventure,registre:N.ids.tableEtats.aventure,err:c.__ERR,erreurs};sortie.profils.push(r);
 if(phase==='apres') {assert.ok(entree>=14&&entree<=16);assert.ok(mouvement>0);assert.ok(silence);assert.equal(sortieDemo,'titre');assert.ok(persistanceIntacte);assert.equal(aventure,'aventure');assert.deepEqual(journalisationUnitaire,{toucher:6,glisse:6,tenu:6});assert.equal(c.__ERR.count,0);}
}
fs.writeFileSync(new URL(`./scenarios-${phase}.json`,import.meta.url),JSON.stringify(sortie,null,2));
console.log(JSON.stringify(sortie.profils.map(({gestes,schemas,...r})=>r),null,2));
