import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {sources,monde} from './vm.mjs';
import {scenario} from './scenarios.mjs';
import {retourValide,sondeRetour} from '../mesure/criteres/R-36-raison-de-revenir.mjs';
const w=monde(sources());w.c.opts={nom:'fin',stade:'tout',profil:'paysage'};
const r=vm.runInContext('('+scenario.toString()+')({N:N,S:__S,...opts})',w.c);
w.N.game.dbg.etat('fin');w.N.ui.ouvrir('fin',{victoire:true});
const preuve=vm.runInContext('(function(){var S=__S;'+sondeRetour+'})()',w.c);
const fin={energie:w.N.score.energie,prochain:w.N.score.prochain()};
const controles=[
 ['acquisition réelle du dernier palier',r.resume.debloques.includes(r.catalogue.at(-1))],
 ['terminal réel avec pixels',retourValide(fin,preuve)],
 ['prochain requis quand incomplet',!retourValide({energie:0,prochain:null},{...preuve,acquis:preuve.acquis.slice(0,-1)})],
 ['texte seul insuffisant',!retourValide({energie:0,prochain:null},{...preuve,catalogue:[]})],
 ['aucune encre insuffisante',!retourValide(fin,{...preuve,toutVisible:false})],
 ['prochain ordinaire accepté',retourValide({energie:0,prochain:{id:'ralenti'}},null)],
 ['énergie absente refusée',!retourValide({prochain:null},preuve)],
 ['seuils conservés',JSON.stringify(w.N.R.defis.retour.seuils)==='[25,180,350,550,800]']
];
fs.writeFileSync(new URL('r36.json',import.meta.url),JSON.stringify({fin,preuve,controles,journal:w.N.journal.dump(),err:w.c.__ERR},null,2));
console.log(controles);assert.ok(controles.every(c=>c[1]));assert.equal(w.c.__ERR.count,0);
