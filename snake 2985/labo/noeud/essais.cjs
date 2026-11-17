'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const knot=require('./noeud.js'),demo=require('./parcours.js');
function session(mode){
  const ctx={window:{}};
  for(const f of ['../../forge.js','../moteur.js'])vm.runInNewContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx);
  const bundle=knot.install(ctx.window.SnakeArcade,ctx.window.SnakeForge,{mode});ctx.window.SnakeForge=bundle.forge;
  return {engine:bundle.engine,...bundle};
}
function until(d,stop,gesture=false){
  for(let i=0;i<1400 && d.s.status==='playing' && !stop();i++)d.tick(gesture);
}
for(const mode of ['exact','assist']) for(const gesture of [false,true]){
  test(mode+' / '+(gesture?'bascule':'sans geste'),()=>{
    const {engine}=session(mode),d=demo.create(engine,mode);
    until(d,()=>d.ready&&!!d.s.knot.preview);
    assert(d.s.knot.preview,'La polyligne doit précéder le geste');
    assert.equal(d.s.knot.preview.mode,mode);
    assert.equal(d.s.knot.closures,0);
    assert(d.s.snake.length>20);
    until(d,()=>d.s.knot.closures>0 || d.frames>45,gesture);
    if(gesture){
      assert.equal(d.s.knot.closures,1);
      assert.equal(d.s.knot.impacts,1);
      assert(d.s.novaCharge<.75);
      assert(d.s.drones.some(t=>t.id===101));assert(d.s.drones.some(t=>t.id===102));
      assert(!d.s.drones.some(t=>t.id===100));
    }else{
      assert.equal(d.s.knot.closures,0);assert.equal(d.s.kills,0);
      if(mode==='exact')assert.equal(d.s.status,'dead');
    }
  });
}
function outline(vertices){
  const out=[];
  for(let i=0;i<vertices.length;i++){
    const [x,y]=vertices[i], [nx,ny]=vertices[(i+1)%vertices.length], count=Math.abs(nx-x)+Math.abs(ny-y);
    for(let n=0;n<count;n++)out.push({x:x+Math.sign(nx-x)*n,y:y+Math.sign(ny-y)*n});
  }
  return out;
}
test('Concavité et frontières : une encoche ouverte, ses bords et ses sommets restent intacts',()=>{
  const l=outline([[0,0],[5,0],[5,2],[2,2],[2,5],[0,5]]);
  assert(knot.simple(l));assert.equal(knot.area(l),16);
  assert(knot.contains(l,{x:1,y:3}));assert(knot.contains(l,{x:4,y:1}));
  for(const p of [{x:3,y:3},{x:0,y:3},{x:2,y:2},{x:-1,y:2}])assert(!knot.contains(l,p));
});
test('Rejet des faux chemins : microboucle, segment sauté, huit et coordonnées fractionnaires',()=>{
  const tiny=outline([[0,0],[1,0],[1,1],[0,1]]);
  const eight=outline([[0,0],[2,0],[2,2],[0,2],[0,0],[-2,0],[-2,-2],[0,-2]]);
  const square=outline([[0,0],[2,0],[2,2],[0,2]]);
  assert(!knot.simple(tiny));assert(!knot.simple(eight));assert(knot.simple(square));
  assert(!knot.simple(square.slice(1)));square[1].x+=.1;assert(!knot.simple(square));
});
function ready(mode='exact'){
  const {engine}=session(mode),d=demo.create(engine,mode);
  until(d,()=>d.ready&&!!d.s.knot.preview);assert(d.s.knot.preview);
  return {d,s:d.s,engine};
}
test('Bascule en dehors de la fenêtre, vol, portail distant et charge insuffisante',()=>{
  const {s}=ready();
  s.flight={};assert.equal(knot.preview(s,'exact'),null);s.flight=null;
  s.shiftMode='portal';s.planeGates=[{x:0,y:0}];assert.equal(knot.preview(s,'exact'),null);s.shiftMode='free';
  s.novaCharge=.27;assert.equal(knot.preview(s,'exact'),null);
  s.novaCharge=1;s.planeCooldown=1;assert.equal(knot.preview(s,'exact'),null);
});
test('Changer de direction après la bascule annule le circuit et conserve sa charge',()=>{
  const {engine,s,d}=ready();assert(engine.shiftPlane(s));assert(s.knot.pending);
  assert(engine.turn(s,1,0));
  until(d,()=>!s.knot.pending);assert.equal(s.knot.closures,0);assert.equal(s.novaCharge,1);
});
test('Immunité du boss blindé et plafond à trois impacts',()=>{
  for(const shield of [false,true]){
    const {engine,s,d}=ready();s.drones=[];
    s.boss={x:16,y:11,plane:0,weak:!shield,stun:100,hp:50};
    assert(engine.shiftPlane(s));until(d,()=>s.knot.closures>0);
    assert.equal(s.knot.closures,1);assert.equal(s.boss.hp,shield?50:48);
  }
  const {s,d,engine}=ready();s.drones=[];
  for(const [i,[x,y]] of [[15,10],[16,10],[17,10],[16,11],[17,11]].entries())
    s.drones.push({x,y,id:i+100,plane:0,warmup:0,next:{x,y,plane:0},moveIn:100,moveEvery:100});
  assert(engine.shiftPlane(s));until(d,()=>s.knot.closures>0);
  assert.equal(s.knot.impacts,3);assert.equal(s.drones.length,2);
  assert.equal(s.knot.recent.length,1);
});
test('Une silhouette identique déjà récompensée ne se recharge pas en attendant',()=>{
  const {s}=ready();s.knot.recent.push(s.knot.preview.signature);
  assert.equal(knot.preview(s,'exact'),null);
});
test('Le moteur trace une vraie boucle concave et laisse intacte la cible au creux de l’encoche',()=>{
  const {engine}=session('exact'),d=demo.create(engine,'exact','concave'),s=d.s;
  until(d,()=>d.ready&&!!s.knot.preview);
  assert(s.knot.preview);
  const target={x:15,y:13,plane:0};
  s.drones.push({...target,next:target,warmup:0,moveIn:1000,moveEvery:1000,id:103});
  assert(!knot.contains(s.knot.preview.points,target));
  assert(engine.shiftPlane(s));until(d,()=>s.knot.closures>0);
  assert.equal(s.knot.impacts,1);assert(s.drones.some(d=>d.id===103));
});
test('Le mode exact refuse le raccourci à une case du segment voisin',()=>{
  const {s}=ready('assist');
  assert.equal(knot.preview(s,'exact'),null);
});
