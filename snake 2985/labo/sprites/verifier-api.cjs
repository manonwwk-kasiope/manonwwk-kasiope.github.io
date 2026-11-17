'use strict';
const assert=require('node:assert/strict');
const art=require('./sprites.js');
let uploads=0,draws=0,rotations=0,saveDepth=0;
global.OffscreenCanvas=class {
  getContext(){return {createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:()=>uploads++};}
};
const ctx={canvas:{clientWidth:568},save(){saveDepth++;},restore(){saveDepth--;},translate(){},rotate(a){assert.ok(Number.isFinite(a));rotations++;},
  scale(x,y){assert.ok(x===y&&x>0);},drawImage(){draws++;},beginPath(){},moveTo(){},lineTo(){},stroke(){}};
for(const repeat of [0,1]){
  const baseline=uploads;
  for(const year of art.years)for(const type of ['head','body','cell','drone','mid','final'])for(const plane of [0,1]){
    const role=['mid','final'].includes(type)?'boss':type;
    for(const time of [0,.4,1.4])for(const reduced of [true,false])for(let i=0;i<16;i++){
      art.draw(ctx,role,year,{x:150,y:100,plane,angle:i*Math.PI/8,unit:.4,time,reduced,kind:type});
      assert.equal(saveDepth,0);
    }
    art.link(ctx,year,{x:0,y:10},{x:22,y:10},.85);
  }
  if(repeat)assert.equal(uploads,baseline);
}
assert.equal(draws,11520);assert.equal(rotations,draws);
console.log(JSON.stringify({draws,uploads,repeatUploads:0,rotations,saveDepth}));
