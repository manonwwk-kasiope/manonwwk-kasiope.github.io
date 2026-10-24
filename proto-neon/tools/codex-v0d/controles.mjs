import fs from 'node:fs';
import z from 'node:zlib';
import assert from 'node:assert/strict';
import {sources,monde,hash,sauver,dateParis,ICI} from './vm.mjs';
import {raccorder} from './raccords.mjs';
assert(JSON.parse(fs.readFileSync(ICI+'/calibration.json')).conforme);
const ancien=JSON.parse(z.gunzipSync(fs.readFileSync(ICI+'/sources-avant.json.gz'))),actuel=raccorder(sources()),cas=[];
function fixture(src,qui='elle',video=true,w=844,h=390){
 const m=monde(src,2975,w,h),{N,S}=m;
 N.pilote.arreter();N.intro.skip(); N.game.dbg.etat('aventure');
 // Le seul double est le décodeur DOM absent en VM. Panneau et images décodées
 // synthétiques sont explicitement des fixtures, jamais une preuve du MP4.
 let on=false; const panneau={w:384,h:216,data:new Uint8Array(384*216).fill(N.pal.i('magenta'))};
 const art=N.art;N.art={...art,play(nom){if(nom.startsWith('amiral-')){on=video;return video;}return false;},get(nom){return nom?.startsWith('amiral-')?panneau:null;},stop(){on=false;},ended(){return !on;}};
 N.cosmos.start({qui,graine:2975});N.cosmos.draw();N.cosmos.skip();
 return m;
}
function clone(x){return JSON.parse(JSON.stringify(x));}
for(const [profil,w,h] of [['paysage',844,390],['portrait',390,844],['bureau',1440,900]])for(const qui of ['elle','lui'])for(const video of [true,false]){
 const m=fixture(actuel,qui,video,w,h),a=fixture(ancien,qui,video,w,h),{N,S,c}=m;
 assert(N.cosmos.filmActif()); assert.equal(N.film.state().nom,'amiral-'+qui);
 assert.equal(N.film.state().clip,video);assert.equal(N.film.state().panneau,true);assert.equal(N.game.etat(),'panneau');
 const depart=clone(N.cosmos.state()),t=N.horloge.t(),journal=hash(N.journal.dump()),n=N.film.state().n;
 assert.deepEqual(depart,clone(a.N.cosmos.state()));
 // Pas fixe comme le boot : le premier pas réel est 1/120. .28s de film,
 // puis tentative trop précoce ; un seul pas suffit à traiter ce geste.
 N.game.dbg.simuler(0.28);S.input.any=true;N.game.dbg.simuler(N.R.temps.h);
 assert(N.cosmos.filmActif());const gardeRefusee=N.film.state().t;
 S.input.any=false; S.input.taps.length=0;
 N.game.dbg.simuler(0.1);N.cosmos.draw();
 const pixels=N.gfx.buf(),pixelHash=hash([...pixels]),couleurs=[...new Set(pixels)];
 assert(pixels.some(v=>v===N.pal.i('magenta')));assert(couleurs.every(v=>v>=0&&v<16));
 assert.deepEqual(clone(N.cosmos.state()),depart);assert.equal(N.horloge.t(),t);assert.equal(hash(N.journal.dump()),journal);
 S.input.any=true;N.game.dbg.simuler(N.R.temps.h);
 assert(!N.cosmos.filmActif());assert(N.film.state().saute);assert.deepEqual(clone(N.cosmos.state()),depart);
 S.input.any=false;S.input.taps.length=0;
 // Même état complet et même tampon à chaque pas après le film, contre le vrai
 // module reçu sans film. Inclut warp, positions, PV, compteurs et journal cosmos.
 for(let i=0;i<240;i++){
  N.cosmos.update(N.R.temps.h);a.N.cosmos.update(a.N.R.temps.h);
  assert.deepEqual(clone(N.cosmos.state()),clone(a.N.cosmos.state()));
 }
 N.cosmos.draw();a.N.cosmos.draw();assert.equal(hash([...N.gfx.buf()]),hash([...a.N.gfx.buf()]));
 assert.equal(N.film.state().n,n);assert.equal(c.__ERR.count,0);assert.equal(m.erreurs.length,0);
 cas.push({profil,qui,video,film:N.film.state().nom,guardRefusee:gardeRefusee,guardAcceptee:N.film.state().t,deltaHorlogeFilm:N.horloge.t()-t,etatEtJournalIdentiques:true,pasRepriseIdentiques:240,pixelsRepriseIdentiques:true,pixelsFilm:{sha256:pixelHash,couleurs},err:c.__ERR.count});
}
// Fin naturelle, annulation/reset et politique des pilotes.
for(const mode of ['fin','stop','reset','pilote']){
 const m=monde(actuel),{N}=m;N.pilote.arreter();N.game.dbg.etat('aventure');
 if(mode==='pilote')N.pilote.lancer('bon');
 N.cosmos.start({qui:'elle'});N.cosmos.skip();
 if(mode==='fin'){N.game.dbg.simuler(5);assert(!N.cosmos.filmActif());assert(!N.film.actif());}
 if(mode==='stop'){N.cosmos.stop();assert(!N.film.actif());assert(!N.cosmos.filmActif());}
 if(mode==='reset'){N.game.reset(1);assert(!N.film.actif());assert(!N.cosmos.filmActif());}
 if(mode==='pilote'){assert(!N.cosmos.filmActif());assert(!N.film.actif());assert.equal(N.cosmos.phase(),'boss');}
 assert.equal(m.c.__ERR.count,0);cas.push({mode,conforme:true,err:0});
}
sauver('controles.json',{dateParis:dateParis(),conforme:true,limite:'VM sans DOM ; images de fixture, aucun décodage MP4 mesuré. Raccords 79 et 50 appliqués uniquement en mémoire.',cas});console.log(cas.length+' contrôles conformes.');
