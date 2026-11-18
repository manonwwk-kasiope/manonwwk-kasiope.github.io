'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),doigts=require('./doigts.cjs');
const controls=require('../commandes/commandes.js');
test('CDP conserve le pouce gauche tandis que le droit arrive puis repart',async()=>{
  const actions=[];const t=doigts(async(method,p)=>{assert.equal(method,'Input.dispatchTouchEvent');actions.push([p.type,p.touchPoints.map(v=>v.id)]);});
  await t.down(1,32,90);await t.move(1,48,90);await t.tap(2,{x:210,y:80});await t.move(1,30,65);await t.cancel();await t.tap(3,{x:20,y:30});
  assert.deepEqual(actions,[['touchStart',[1]],['touchMove',[1]],['touchMove',[1,2]],['touchMove',[1]],['touchMove',[1]],['touchCancel',[]],['touchStart',[3]],['touchEnd',[]]]);
});
test('contrôleur réel, cap analogique dans huit directions',()=>{
  const received=[],ctl=controls.createInput(v=>received.push(v));ctl.configure({flying:true});
  ctl.route({phase:'down',x:0,y:0,id:1,zone:'pilot',t:0});
  for(let n=0;n<8;n++){
    const a=n*Math.PI/4;ctl.route({phase:'move',x:22*Math.cos(a),y:22*Math.sin(a),id:1,zone:'pilot',t:10*n+1});
    const d=received.at(-1).angle-a;assert(Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))<1e-8);
  }
  ctl.route({phase:'cancel',id:1,t:100,zone:'pilot'});const n=received.length;
  ctl.route({phase:'move',id:1,x:40,y:50,t:120,zone:'pilot'});assert.equal(received.length,n);
});
test('bouton secondaire, click natif dédoublonné, glissade et clavier',()=>{
  const handlers={},button={addEventListener:(k,fn)=>handlers[k]=fn,getBoundingClientRect:()=>({left:0,top:0,right:44,bottom:44})};
  let calls=0;require('./actions.js').bind(button,()=>calls++);
  const event=(k,v={})=>handlers[k]({pointerType:'touch',pointerId:7,isPrimary:false,clientX:20,clientY:20,timeStamp:20,detail:1,...v});
  event('pointerdown');event('pointerup');event('click',{timeStamp:25});assert.equal(calls,1);
  event('pointerdown');event('pointermove',{clientX:40});event('pointerup');event('click');assert.equal(calls,1);
  event('pointerdown');event('pointercancel');assert.equal(calls,1);
  event('click',{detail:0});assert.equal(calls,2);
  event('pointerdown',{isPrimary:true});event('pointerup',{isPrimary:true});event('click');assert.equal(calls,3);
  event('pointerdown',{clientX:42});event('pointerup',{clientX:48});assert.equal(calls,4);
  event('pointerdown',{clientX:42});event('pointerup',{clientX:54});assert.equal(calls,4);
});
