import fs from 'node:fs';
import z from 'node:zlib';
import assert from 'node:assert/strict';
import {sources,monde,hash,sauver,dateParis,ICI} from './vm.mjs';
import {raccorder} from './raccords.mjs';
assert(JSON.parse(fs.readFileSync(ICI+'/calibration.json')).conforme);
const ancien=JSON.parse(z.gunzipSync(fs.readFileSync(ICI+'/sources-avant.json.gz'))),apres=raccorder(sources()),cas=[];
for(const qui of ['elle','lui']){
 const a=monde(ancien),b=monde(apres);
 for(const m of [a,b]){m.N.pilote.arreter();m.N.game.dbg.etat('aventure');m.N.cosmos.start({qui});}
 let pas=0;
 while(!b.N.cosmos.filmActif()&&pas<14400){
  a.N.cosmos.update(a.N.R.temps.h);b.N.cosmos.update(b.N.R.temps.h);pas++;
  assert.equal(hash(a.N.cosmos.state()),hash(b.N.cosmos.state()));
 }
 assert(b.N.cosmos.filmActif());assert.equal(b.N.cosmos.phase(),'boss');assert.equal(b.N.cosmos.state().boss.etat,'arrivee');
 assert.equal(b.N.cosmos.state().journal.filter(e=>e.e==='amiral').length,1);
 const avant=hash(b.N.cosmos.state());b.N.horloge.geler(b.N.R.filmAmiral.garde);
 const gel=b.N.horloge.resteGel();b.N.game.dbg.simuler(b.N.R.filmAmiral.garde);
 assert.equal(b.N.horloge.resteGel(),gel);assert.equal(b.N.horloge.t(),0);assert.equal(hash(b.N.cosmos.state()),avant);
 assert.equal(b.c.__ERR.count,0);cas.push({cas:'arrivée naturelle',qui,pas,temps:b.N.cosmos.state().t,vt:b.N.cosmos.state().vt,identiqueJusquaArrivee:true,gelPreexistantConserve:gel,err:b.c.__ERR.count});
}
// Le candidat sans les raccords doit exposer sa limite, pas être déclaré conforme.
{
 const m=monde(sources()),{N}=m;N.pilote.arreter();N.game.dbg.etat('aventure');N.cosmos.start({qui:'elle'});N.cosmos.skip();
 const t=N.horloge.t();N.game.dbg.simuler(N.R.filmAmiral.garde);
 const delta=N.horloge.t()-t;assert(delta>0);cas.push({cas:'témoin sans raccords',deltaHorloge:delta,etat:N.game.etat(),conforme:false,attendu:'échec : confirme que les raccords sont indispensables'});
}
// Double WebAudio limité aux paramètres ; aucune mesure acoustique n'est annoncée.
{
 const m=monde(apres),{N,S}=m,gains=[];
 function param(){return {value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){},cancelScheduledValues(){},setTargetAtTime(v,t,d){this.cible={v,t,d};}};}
 function node(){return {gain:param(),frequency:param(),Q:param(),detune:param(),delayTime:param(),connect(){},start(){},stop(){},setPeriodicWave(){}};}
 const ctx={currentTime:0,sampleRate:1/N.R.temps.h,state:'running',destination:{},createGain(){const n=node();gains.push(n);return n;},createBiquadFilter:node,createConvolver:node,createDelay:node,createOscillator:node,createBufferSource:node,createPeriodicWave(){return {};},createBuffer(n,len){const a=Array.from({length:n},()=>new Float32Array(len));return {getChannelData:i=>a[i]};}};
 N.music.context=()=>ctx;N.music.mute(false);N.pilote.arreter();N.game.dbg.etat('aventure');N.cosmos.start({qui:'elle'});N.cosmos.update(N.R.temps.h);N.cosmos.skip();
 const mus=hash(N.cosmos.state().musique),notes=N.cosmos.state().musique.notes;assert.equal(gains[0].gain.cible.v,0);
 for(let i=0;i<60;i++){ctx.currentTime+=N.R.temps.h;N.game.dbg.simuler(N.R.temps.h);}
 assert.equal(hash(N.cosmos.state().musique),mus);S.input.any=true;N.game.dbg.simuler(N.R.temps.h);
 assert(!N.cosmos.filmActif());assert.equal(gains[0].gain.cible.v,N.R.filmAmiral.gainMusique);assert.equal(hash(N.cosmos.state().musique),mus);
 N.cosmos.update(N.R.temps.h);assert.equal(m.c.__ERR.count,0);assert.equal(m.erreurs.length,0);
 cas.push({cas:'paramètres WebAudio de fixture',notesGelees:notes,sortiePendantFilm:0,sortieReprise:gains[0].gain.cible,musiqueGelee:true,err:m.c.__ERR.count,limite:'Pas de rendu acoustique ; gain et ordonnanceur réels exécutés avec des AudioParams de fixture.'});
}
// Une aventure réelle reste sur 2975 pendant le film et lui rend la main ensuite.
{
 const m=monde(apres),{N,S}=m;N.pilote.arreter();N.game.dbg.etat('aventure');
 N.aventure.demarrer({qui:'lui',rattraper:false,aJouer(){}});
 for(let i=0;i<N.aventure.ETAPES.length/N.R.temps.h&&N.aventure.etape()!=='neon';i++){N.aventure.sauter();N.aventure.update(N.R.temps.h);}
 assert.equal(N.aventure.etape(),'neon');assert(N.aventure.reprendre('espace'));N.aventure.sauter();N.aventure.update(N.R.temps.h);
 assert.equal(N.aventure.etape(),'2975');N.cosmos.skip();N.game.dbg.simuler(N.R.filmAmiral.garde+N.R.temps.imageRef);
 assert.equal(N.aventure.etape(),'2975');const t=N.cosmos.state().t;S.input.any=true;N.game.dbg.simuler(N.R.temps.h);S.input.any=false;
 assert(!N.cosmos.filmActif());assert.equal(N.cosmos.state().t,t);N.game.dbg.simuler(N.R.temps.imageRef);
 assert(N.cosmos.state().t>t);assert.equal(N.aventure.etape(),'2975');assert.equal(m.c.__ERR.count,0);
 cas.push({cas:'voyage réel → 2975 → film → 2975',reprise:true,etape:N.aventure.etape(),film:N.film.state().nom,err:m.c.__ERR.count});
}
sauver('complements.json',{dateParis:dateParis(),conforme:cas.filter(c=>c.conforme!==false).every(c=>!c.err),cas});console.log('Compléments conformes ; témoin sans raccords en échec attendu.');
