'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),epi=require('./epilogue.js');
test('le rechargement conserve seulement les escales jouées et les gestes acquis dans cet onglet',()=>{
  const map=new Map(),db={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
  const first=epi.create(db),old={year:1976,status:'playing'};epi.start(first,old);
  epi.observe(first,old,[{type:'knotClosed'}]);
  const second=epi.create(db,true);epi.observe(second,old,[{type:'ecoAbsorb'}]);
  const last={year:2985,status:'playing',difficulty:10,score:1650};epi.start(second,last);last.status='won';
  const end=epi.finish(second,last,{year:2985,status:'won',score:1650,id:'ici'},{list:()=>[]});
  assert.deepEqual(end.route,[1976,2985]);assert.deepEqual(end.gestures,[{year:1976,text:'Circuit de queue fermé'}]);
  epi.create(db);assert.deepEqual(epi.create(db,true).route,[]);
  map.set('snake2985.traversee.v1','{"route":[2002,2985],"gestures":[{"text":"inconnue","year":2985}]}');
  assert.deepEqual(epi.create(db,true).route,[2985]);assert.deepEqual(epi.create(db,true).gestures,[]);
});
