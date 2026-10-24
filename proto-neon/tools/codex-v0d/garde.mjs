import assert from 'node:assert/strict';
import {sources,monde,sauver,dateParis} from './vm.mjs';
import {raccorder} from './raccords.mjs';
const cas=[];
for(const entree of ['touche','toucher']){
 const {N,S,c,erreurs}=monde(raccorder(sources()));N.pilote.arreter();N.game.dbg.etat('aventure');N.cosmos.start({qui:'elle'});N.cosmos.skip();
 const h=N.R.temps.h,g=N.R.filmAmiral.garde;
 N.game.dbg.simuler(g-h);assert(N.film.actif());const avant=N.film.state().t;
 if(entree==='touche')S.input.any=true;else S.input.taps.push({x:0,y:0});
 N.game.dbg.simuler(h);assert(!N.film.actif());assert(N.film.state().saute);assert.equal(N.film.state().t,g);assert.equal(c.__ERR.count,0);assert.equal(erreurs.length,0);
 cas.push({entree,avant,accepte:N.film.state().t,err:c.__ERR.count});
}
sauver('garde.json',{dateParis:dateParis(),conforme:true,cas});console.log('Saut accepté à 300 ms pour les deux entrées.');
