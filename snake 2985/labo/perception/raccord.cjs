'use strict';
const assert=require('node:assert/strict'),{drawDiscovery}=require('./marquage.js');
const pt=(x,y,plane=0)=>({x,y,plane}),head=pt(10,8),other=pt(12,9),preferred=pt(10,11);
const s={status:'playing',year:1976,plane:0,width:36,height:18,snake:[head],cells:[other,preferred,pt(11,11,1)],drones:[],aide:{shape:'diamond',at:preferred},
  initiation:{prepared:false,stage:'cellule'},boss:{attack:{phase:'active',plane:0,danger:new Set([8*36+11]),tiles:[pt(11,8)]}}};
let sprites=[],strokes=0;
global.SnakeSprites={draw(ctx,role,y,o){sprites.push([role,o.x,o.y]);}};
const c={save(){},restore(){},beginPath(){},ellipse(){},fill(){},moveTo(){},lineTo(){},stroke(){strokes++;}};
const run=()=>drawDiscovery(c,s,{time:1,reduced:false,zoom:1},(cam,x,y)=>({x,y,k:1}));
const before=JSON.stringify(s.cells);run();assert.deepEqual(sprites,[]);
s.initiation.prepared=true;run();assert.deepEqual(sprites,[['cell',10,11]]);assert.equal(strokes,1);assert.equal(JSON.stringify(s.cells),before);
s.initiation.stage='virage';run();s.initiation.stage='croissance';s.flight={};run();
s.flight=null;s.aide.shape='gate';run();s.aide.shape='diamond';s.aide.at=pt(1,1);run();
assert.equal(sprites.length,1);assert.equal(strokes,1);
console.log('Raccord découverte : socle seul, cible du guide conservée, autres cellules intactes, aucun trait de frontière.');
