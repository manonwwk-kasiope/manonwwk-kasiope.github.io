'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
for(const mode of ['exact','assist'])for(const choice of ['shift','skip']){
  test('Scène réelle aux commandes DOM : '+mode+' / '+choice,()=>{
    const el={};
    for(const name of ['arena','mode','status','start','shift','skip'])el[name]={};
    el.mode.value=mode;el.arena.width=864;el.arena.height=432;
    const strokes=[];
    el.arena.getContext=()=>new Proxy({stroke:()=>strokes.push(true)},{get:(obj,key)=>obj[key]??(()=>{})});
    const ctx={document:{getElementById:id=>el[id]},requestAnimationFrame:f=>{ctx.frame=f;}};
    ctx.window=ctx;
    const html=fs.readFileSync(path.join(__dirname,'demo.html'),'utf8');
    for(const [,src] of html.matchAll(/<script src="([^"]+)"/g))
      vm.runInNewContext(fs.readFileSync(path.join(__dirname,src),'utf8'),ctx);
    el.start.onclick();let t=0;
    while(el.shift.disabled&&t<20000)ctx.frame(t+=17);
    assert(!el.shift.disabled);assert(strokes.length);
    const before=el.status.textContent;
    for(let n=0;n<160;n++)ctx.frame(t+=17);
    assert.equal(el.status.textContent,before);
    el[choice].onclick();
    for(let n=0;n<160;n++)ctx.frame(t+=17);
    assert.match(el.status.textContent,choice==='shift'?/Boucle fermée/:mode==='exact'?/Collision/:/passe à côté/);
  });
}
