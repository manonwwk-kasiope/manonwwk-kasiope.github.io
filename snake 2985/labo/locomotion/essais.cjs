'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {scores}=require('./mesurer.cjs'),loc=require('./locomotion.js');
for(const year of [1976,1985,1995,2185,2985]){
  test(year+' : centres, angles et liaisons pour les quatre scènes du moteur',()=>{
    for(const scene of ['virage','queue','bascule','vol']){
      const r=scores[[year,scene,'joint']],curve=scores[[year,scene,'curve']];
      assert(r.frames>0);assert.equal(r.écartTête,0);assert.equal(r.angleTête,0);
      assert.equal(r.centresHorsCase+r.liaisonsHorsCases,0);
      assert.equal(curve.centresHorsCase+curve.liaisonsHorsCases,0);
      assert(r.écartCorps<.059&&curve.écartCorps<.15);assert(r.angleCorpsMax<29);
    }
    assert(scores[[year,'queue','joint']].longueur>=150);
  });
}
const project=(cam,x,y,z)=>({x:10*x,y:10*y-8*z,k:1});
test('L’impulsion suit les vertèbres et le mode réduit fige les ornements',()=>{
  const s={snake:Array.from({length:9},(_,i)=>({x:12-i,y:5,plane:0})),direction:{x:1,y:0},flight:null,year:2985,progress:1,elapsed:1,eaten:0};
  const cam={zoom:1},pose=(time,reduced=false)=>loc.transform(s,cam,null,time,reduced,project);
  assert(pose(0).every(p=>p.pulse===0));s.eaten++;s.elapsed=1.1;assert.equal(pose(1.1)[0].pulse,1);
  s.elapsed=1.4;assert(pose(1.4)[3].pulse>.99);
  assert(pose(1.4,true).every(p=>!p.pulse&&p.scale===1));assert.deepEqual(pose(2,true),pose(99,true));
  s.flight={angle:.33};const snapshot=JSON.stringify(s);pose(7);assert.equal(JSON.stringify(s),snapshot);
});
test('Le raccord interplan suit les projections verticale et horizontale en deux traits',()=>{
  const s={snake:[{x:4,y:3,plane:1},{x:3,y:3,plane:0}],direction:{x:1,y:0},year:2985,eaten:0},cam={zoom:1};
  const points=loc.transform(s,cam,null,0,true,project);const paths=[];let p=[];
  const c={save(){},restore(){},beginPath(){p=[];},moveTo(x,y){p.push([x,y]);},lineTo(x,y){p.push([x,y]);},stroke(){paths.push(p);}};
  loc.overlay(c,s,cam,points,0,0,true,project,'links');assert(!paths.length);
  loc.overlay(c,s,cam,points,1,0,true,project,'links');assert.deepEqual(paths[0],[[30,30],[40,30],[40,22]]);
});
test('Menu et atelier se figent et le flux d’atelier atteint le segment voulu',()=>{
  assert.deepEqual(loc.displayPose('menu',1,true,3),loc.displayPose('menu',100,true,3));
  assert.equal(loc.displayPose('workshop',1,false,5).pulse,1);
});
