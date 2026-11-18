'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {state,record,kinds}=require('./captures.cjs');
for(const year of [1976,1985,1995,2185,2985]){
  test(year+' · dix silhouettes et impacts issus du moteur',()=>{
    const silhouettes=new Set();
    for(const kind of kinds){
      const s=state(year,kind),frame=record(s);
      assert(frame.length>0,kind);
      assert.equal(record(s,1).length,0);
      assert.deepEqual(record(s,0,true,0),record(s,0,true,10));
      const geom=frame.map(p=>p.points.map(([x,y])=>[Math.round(x*20),Math.round(y*20)]));
      silhouettes.add(JSON.stringify(geom));
      if(['well','blast','nova'].includes(kind)){
        const p=kind==='well'?s.forge.projectiles[0]:kind==='blast'?s.forge.effects[0]:s.effects[0];
        const r=p.radius;
        assert(frame.some(shape=>shape.points.length>=20&&shape.points.every(([x,y])=>Math.abs(Math.hypot(x-p.x,y-p.y)-r)<1e-7)),kind+' : rayon centré');
      }
      if(kind==='rail'||kind==='arc'){
        const p=s.shots[0];
        assert(frame.some(path=>path.points[0][0]===p.x&&path.points[0][1]===p.y&&path.points.at(-1)[0]===p.toX&&path.points.at(-1)[1]===p.toY));
      }
    }
    assert.equal(silhouettes.size,10);
  });
}
test('Charge extrême : chemins bornés malgré mille objets sur chaque couche',()=>{
  const s=state(2985,'well'),p=s.forge.projectiles[0];s.forge.projectiles=Array(1000).fill(p);
  s.forge.effects=Array(1000).fill({ ...p,kind:'blast' });
  s.forge.orbits=Array(1000).fill({...p,kind:'orbit',angle:.5});
  s.shots=Array(1000).fill({...p,kind:'rail',toX:25,toY:10});
  s.effects=Array(1000).fill({...p,kind:'nova'});
  assert(record(s).length<250);
});
